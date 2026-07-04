/**
 * Session settings API functions for voice input preferences
 */

import { ApiClient } from './client';

const api = new ApiClient();

/**
 * セッション設定（バックエンドレスポンス形式）
 */
export interface SessionSettingsResponse {
  session_id: string;
  voice_input_enabled: boolean;
  auto_send: boolean;
  mic_permission_checked: boolean;
}

/**
 * セッション設定（フロントエンド形式）
 */
export interface SessionSettings {
  voiceInputEnabled: boolean;
  autoSend: boolean;
  micPermissionChecked: boolean;
}

/**
 * セッション設定更新リクエスト
 */
interface SessionSettingsUpdateRequest {
  voice_input_enabled: boolean;
  auto_send: boolean;
  mic_permission_checked: boolean;
}

/**
 * セッションの音声入力設定を取得する
 *
 * @param sessionId - セッションID
 * @returns セッション設定（camelCase形式）
 *
 * @example
 * ```ts
 * const settings = await getSessionSettings('abc-123');
 * console.log(settings.voiceInputEnabled);
 * ```
 */
export async function getSessionSettings(
  sessionId: string
): Promise<SessionSettings> {
  const response = await api.get<SessionSettingsResponse>(
    `/api/v1/session-settings/${sessionId}`
  );

  // Convert snake_case to camelCase
  return {
    voiceInputEnabled: response.voice_input_enabled,
    autoSend: response.auto_send,
    micPermissionChecked: response.mic_permission_checked,
  };
}

/**
 * セッションの音声入力設定を更新する
 *
 * @param sessionId - セッションID
 * @param settings - 更新する設定（camelCase形式）
 * @returns 更新後の設定（camelCase形式）
 *
 * @example
 * ```ts
 * const updated = await updateSessionSettings('abc-123', {
 *   voiceInputEnabled: true,
 *   autoSend: true,
 *   micPermissionChecked: true,
 * });
 * ```
 */
export async function updateSessionSettings(
  sessionId: string,
  settings: SessionSettings
): Promise<SessionSettings> {
  const request: SessionSettingsUpdateRequest = {
    voice_input_enabled: settings.voiceInputEnabled,
    auto_send: settings.autoSend,
    mic_permission_checked: settings.micPermissionChecked,
  };

  const response = await api.put<SessionSettingsResponse>(
    `/api/v1/session-settings/${sessionId}`,
    request
  );

  return {
    voiceInputEnabled: response.voice_input_enabled,
    autoSend: response.auto_send,
    micPermissionChecked: response.mic_permission_checked,
  };
}
