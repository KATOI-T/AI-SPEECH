/**
 * F-004: 音声入力設定フック
 * localStorageを使用して音声入力の設定を永続化する（ユーザー単位）
 * micPermissionCheckedのみsessionStorageで管理（セッション単位）
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'voice_input_settings';
const MIC_PERMISSION_KEY = 'mic_permission_checked';

export interface VoiceInputSettings {
  /** 音声認識完了時に自動送信するか */
  autoSend: boolean;
  /** 音声入力を有効にするか */
  voiceInputEnabled: boolean;
  /** 初回マイク権限確認が済んでいるか（セッション単位） */
  micPermissionChecked: boolean;
}

interface StoredSettings {
  voiceInputEnabled: boolean;
  autoSend: boolean;
}

const DEFAULT_SETTINGS: StoredSettings = {
  autoSend: true,
  voiceInputEnabled: false,
};

export interface UseVoiceInputSettingsReturn {
  /** 現在の設定 */
  settings: VoiceInputSettings;
  /** 設定を読み込み中かどうか */
  isLoading: boolean;
  /** 自動送信設定を切り替える */
  toggleAutoSend: () => void;
  /** 音声入力設定を切り替える */
  toggleVoiceInputEnabled: () => void;
  /** 設定を更新する */
  updateSettings: (updates: Partial<VoiceInputSettings>) => void;
}

/**
 * localStorageから設定を読み込む
 */
function loadFromLocalStorage(): StoredSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        voiceInputEnabled: parsed.voiceInputEnabled ?? false,
        autoSend: parsed.autoSend ?? true,
      };
    }
  } catch (error) {
    console.warn('[useVoiceInputSettings] Failed to load from localStorage:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * localStorageに設定を保存する
 */
function saveToLocalStorage(settings: StoredSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[useVoiceInputSettings] Failed to save to localStorage:', error);
  }
}

/**
 * sessionStorageからマイク権限確認状態を読み込む
 */
function loadMicPermissionChecked(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return sessionStorage.getItem(MIC_PERMISSION_KEY) === 'true';
  } catch (error) {
    console.warn('[useVoiceInputSettings] Failed to load micPermissionChecked:', error);
  }
  return false;
}

/**
 * sessionStorageにマイク権限確認状態を保存する
 */
function saveMicPermissionChecked(checked: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(MIC_PERMISSION_KEY, String(checked));
  } catch (error) {
    console.warn('[useVoiceInputSettings] Failed to save micPermissionChecked:', error);
  }
}

/**
 * 音声入力設定を管理するカスタムフック
 *
 * ユーザー設定（voiceInputEnabled, autoSend）はlocalStorageに永続化され、
 * セッションを跨いで維持される。
 * micPermissionCheckedのみsessionStorageで管理され、タブ/ウィンドウ単位でリセットされる。
 *
 * @returns 設定と更新関数
 *
 * @example
 * ```tsx
 * const { settings, isLoading, toggleAutoSend, toggleVoiceInputEnabled } = useVoiceInputSettings();
 *
 * if (isLoading) return <Loading />;
 *
 * // 自動送信のON/OFF
 * console.log(settings.autoSend); // true (デフォルト)
 * toggleAutoSend(); // false に切り替え
 *
 * // 音声入力のON/OFF
 * console.log(settings.voiceInputEnabled); // false (デフォルト)
 * toggleVoiceInputEnabled(); // true に切り替え
 * ```
 */
export function useVoiceInputSettings(): UseVoiceInputSettingsReturn {
  const [settings, setSettings] = useState<StoredSettings>(DEFAULT_SETTINGS);
  const [micPermissionChecked, setMicPermissionChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  // 初期化時に設定を読み込み
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // localStorageからユーザー設定を読み込み
    const storedSettings = loadFromLocalStorage();
    setSettings(storedSettings);

    // sessionStorageからマイク権限確認状態を読み込み
    const micChecked = loadMicPermissionChecked();
    setMicPermissionChecked(micChecked);

    setIsLoading(false);
  }, []);

  /**
   * ユーザー設定を更新してlocalStorageに保存
   */
  const updateStoredSettings = useCallback((updates: Partial<StoredSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      saveToLocalStorage(newSettings);
      return newSettings;
    });
  }, []);

  /**
   * マイク権限確認状態を更新してsessionStorageに保存
   */
  const updateMicPermissionChecked = useCallback((checked: boolean) => {
    setMicPermissionChecked(checked);
    saveMicPermissionChecked(checked);
  }, []);

  /**
   * 設定を更新する（micPermissionCheckedとユーザー設定を分離して処理）
   */
  const updateSettingsCallback = useCallback(
    (updates: Partial<VoiceInputSettings>) => {
      const { micPermissionChecked: mic, ...rest } = updates;

      // micPermissionCheckedはsessionStorageに保存
      if (mic !== undefined) {
        updateMicPermissionChecked(mic);
      }

      // ユーザー設定はlocalStorageに保存
      // 明示的に StoredSettings のフィールドを抽出（型安全性を確保）
      const storedUpdates: Partial<StoredSettings> = {};
      if ('voiceInputEnabled' in rest && rest.voiceInputEnabled !== undefined) {
        storedUpdates.voiceInputEnabled = rest.voiceInputEnabled;
      }
      if ('autoSend' in rest && rest.autoSend !== undefined) {
        storedUpdates.autoSend = rest.autoSend;
      }

      if (Object.keys(storedUpdates).length > 0) {
        updateStoredSettings(storedUpdates);
      }
    },
    [updateMicPermissionChecked, updateStoredSettings]
  );

  /**
   * 自動送信設定を切り替える
   */
  const toggleAutoSend = useCallback(() => {
    updateStoredSettings({ autoSend: !settings.autoSend });
  }, [settings.autoSend, updateStoredSettings]);

  /**
   * 音声入力設定を切り替える
   */
  const toggleVoiceInputEnabled = useCallback(() => {
    updateStoredSettings({ voiceInputEnabled: !settings.voiceInputEnabled });
  }, [settings.voiceInputEnabled, updateStoredSettings]);

  return {
    settings: {
      ...settings,
      micPermissionChecked,
    },
    isLoading,
    toggleAutoSend,
    toggleVoiceInputEnabled,
    updateSettings: updateSettingsCallback,
  };
}
