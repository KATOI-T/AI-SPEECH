/**
 * F-004: 音声入力設定フックのテスト
 * Phase 0: localStorage/sessionStorageベースの実装
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceInputSettings } from '../useVoiceInputSettings';

// localStorageモック
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

// sessionStorageモック
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('useVoiceInputSettings', () => {
  const STORAGE_KEY = 'voice_input_settings';
  const MIC_PERMISSION_KEY = 'mic_permission_checked';

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  describe('初期化', () => {
    it('localStorageから設定を読み込む', async () => {
      mockLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          voiceInputEnabled: true,
          autoSend: false,
        })
      );
      mockSessionStorage.setItem(MIC_PERMISSION_KEY, 'true');

      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.voiceInputEnabled).toBe(true);
      expect(result.current.settings.autoSend).toBe(false);
      expect(result.current.settings.micPermissionChecked).toBe(true);
    });

    it('localStorageが空の場合はデフォルト値を使用', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.voiceInputEnabled).toBe(false);
      expect(result.current.settings.autoSend).toBe(true);
      expect(result.current.settings.micPermissionChecked).toBe(false);
    });

    it('localStorageが破損している場合はデフォルト値を使用', async () => {
      mockLocalStorage.setItem(STORAGE_KEY, 'invalid-json');

      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.voiceInputEnabled).toBe(false);
      expect(result.current.settings.autoSend).toBe(true);
    });
  });

  describe('設定の更新', () => {
    it('updateSettingsでlocalStorageに保存される', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSettings({ voiceInputEnabled: true });
      });

      const storedValue = JSON.parse(
        mockLocalStorage.getItem(STORAGE_KEY) || '{}'
      );
      expect(storedValue.voiceInputEnabled).toBe(true);
    });

    it('micPermissionCheckedはsessionStorageに保存される', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSettings({ micPermissionChecked: true });
      });

      expect(mockSessionStorage.getItem(MIC_PERMISSION_KEY)).toBe('true');
      // localStorageには保存されない
      const storedValue = JSON.parse(
        mockLocalStorage.getItem(STORAGE_KEY) || '{}'
      );
      expect(storedValue.micPermissionChecked).toBeUndefined();
    });

    it('複数の設定を同時に更新できる', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSettings({
          voiceInputEnabled: true,
          autoSend: false,
          micPermissionChecked: true,
        });
      });

      expect(result.current.settings.voiceInputEnabled).toBe(true);
      expect(result.current.settings.autoSend).toBe(false);
      expect(result.current.settings.micPermissionChecked).toBe(true);

      // localStorage確認
      const storedValue = JSON.parse(
        mockLocalStorage.getItem(STORAGE_KEY) || '{}'
      );
      expect(storedValue.voiceInputEnabled).toBe(true);
      expect(storedValue.autoSend).toBe(false);

      // sessionStorage確認
      expect(mockSessionStorage.getItem(MIC_PERMISSION_KEY)).toBe('true');
    });
  });

  describe('トグル関数', () => {
    it('toggleAutoSendで自動送信設定を切り替え', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.autoSend).toBe(true); // デフォルト

      act(() => {
        result.current.toggleAutoSend();
      });

      expect(result.current.settings.autoSend).toBe(false);

      act(() => {
        result.current.toggleAutoSend();
      });

      expect(result.current.settings.autoSend).toBe(true);
    });

    it('toggleVoiceInputEnabledで音声入力設定を切り替え', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.voiceInputEnabled).toBe(false); // デフォルト

      act(() => {
        result.current.toggleVoiceInputEnabled();
      });

      expect(result.current.settings.voiceInputEnabled).toBe(true);

      act(() => {
        result.current.toggleVoiceInputEnabled();
      });

      expect(result.current.settings.voiceInputEnabled).toBe(false);
    });
  });

  describe('永続化の検証', () => {
    it('設定変更がlocalStorageに即座に反映される', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.toggleVoiceInputEnabled();
      });

      // 即座にlocalStorageに保存される
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"voiceInputEnabled":true')
      );
    });

    it('フックの再マウント時にlocalStorageから設定を復元', async () => {
      // 最初のフックで設定を変更
      const { result: result1, unmount } = renderHook(() =>
        useVoiceInputSettings()
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      act(() => {
        result1.current.updateSettings({
          voiceInputEnabled: true,
          autoSend: false,
        });
      });

      unmount();

      // 新しいフックをマウント
      const { result: result2 } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      // 設定が復元されている
      expect(result2.current.settings.voiceInputEnabled).toBe(true);
      expect(result2.current.settings.autoSend).toBe(false);
    });
  });

  describe('セッション単位の設定', () => {
    it('micPermissionCheckedはsessionStorageで管理', async () => {
      mockSessionStorage.setItem(MIC_PERMISSION_KEY, 'true');

      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.micPermissionChecked).toBe(true);
    });

    it('micPermissionCheckedのデフォルトはfalse', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.micPermissionChecked).toBe(false);
    });
  });

  describe('バグ修正検証: 音声入力有効化ダイアログシナリオ', () => {
    it('voiceInputEnabledとmicPermissionCheckedを同時にtrueに更新（ダイアログ「有効にする」ボタン）', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 初期状態確認
      expect(result.current.settings.voiceInputEnabled).toBe(false);
      expect(result.current.settings.micPermissionChecked).toBe(false);

      // ダイアログで「有効にする」をクリックした時の動作をシミュレート
      act(() => {
        result.current.updateSettings({
          voiceInputEnabled: true,
          micPermissionChecked: true,
        });
      });

      // 状態が更新されていることを確認
      expect(result.current.settings.voiceInputEnabled).toBe(true);
      expect(result.current.settings.micPermissionChecked).toBe(true);

      // localStorage確認（voiceInputEnabledのみ保存）
      const storedValue = JSON.parse(
        mockLocalStorage.getItem(STORAGE_KEY) || '{}'
      );
      expect(storedValue.voiceInputEnabled).toBe(true);
      expect(storedValue.micPermissionChecked).toBeUndefined();

      // sessionStorage確認（micPermissionCheckedのみ保存）
      expect(mockSessionStorage.getItem(MIC_PERMISSION_KEY)).toBe('true');
    });

    it('voiceInputEnabledのみをtrueに更新（部分的な更新）', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSettings({
          voiceInputEnabled: true,
        });
      });

      // voiceInputEnabledのみ更新される
      expect(result.current.settings.voiceInputEnabled).toBe(true);
      expect(result.current.settings.micPermissionChecked).toBe(false);

      // localStorage確認
      const storedValue = JSON.parse(
        mockLocalStorage.getItem(STORAGE_KEY) || '{}'
      );
      expect(storedValue.voiceInputEnabled).toBe(true);
    });

    it('明示的な型変換が正しく機能することを確認（undefinedフィールド）', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // micPermissionCheckedのみ更新（voiceInputEnabledはundefined）
      act(() => {
        result.current.updateSettings({
          micPermissionChecked: true,
        });
      });

      // micPermissionCheckedのみ更新される
      expect(result.current.settings.micPermissionChecked).toBe(true);
      expect(result.current.settings.voiceInputEnabled).toBe(false); // 変更なし

      // sessionStorageのみ更新
      expect(mockSessionStorage.getItem(MIC_PERMISSION_KEY)).toBe('true');

      // localStorageは更新されない（デフォルト値のまま）
      const storedValue = JSON.parse(
        mockLocalStorage.getItem(STORAGE_KEY) || '{}'
      );
      expect(Object.keys(storedValue).length).toBe(0); // 空のまま
    });

    it('autoSendとvoiceInputEnabledを同時に更新', async () => {
      const { result } = renderHook(() => useVoiceInputSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSettings({
          voiceInputEnabled: true,
          autoSend: false,
        });
      });

      // 両方の設定が更新される
      expect(result.current.settings.voiceInputEnabled).toBe(true);
      expect(result.current.settings.autoSend).toBe(false);

      // localStorage確認（両方保存）
      const storedValue = JSON.parse(
        mockLocalStorage.getItem(STORAGE_KEY) || '{}'
      );
      expect(storedValue.voiceInputEnabled).toBe(true);
      expect(storedValue.autoSend).toBe(false);
    });
  });
});
