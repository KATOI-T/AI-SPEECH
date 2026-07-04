/**
 * 音声処理ユーティリティ
 * F-004: 音声入力（STT）機能
 */

/**
 * マイクデバイス一覧を取得
 */
export async function getMicrophoneDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "audioinput");
  } catch (error) {
    console.error("[audio-utils] Failed to enumerate devices:", error);
    return [];
  }
}

/**
 * デフォルトのマイク制約を取得
 */
export function getDefaultMicrophoneConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000, // Azure Speech推奨サンプリングレート
  };
}

/**
 * MediaStreamを停止する
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    track.stop();
    console.log("[audio-utils] Stopped track:", track.label);
  });
}

/**
 * ブラウザがMediaDevicesをサポートしているか確認
 */
export function isMediaDevicesSupported(): boolean {
  return !!(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  );
}

/**
 * HTTPSまたはlocalhostであることを確認（マイク権限に必要）
 */
export function isSecureContext(): boolean {
  return window.isSecureContext;
}

/**
 * マイク権限の状態を表す型
 */
export type MicrophonePermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * マイク権限の状態を確認する
 *
 * @returns 権限の状態
 * - 'granted': マイクへのアクセスが許可されている
 * - 'denied': マイクへのアクセスが拒否されている
 * - 'prompt': ユーザーにまだ確認していない
 * - 'unsupported': ブラウザがPermissions APIをサポートしていない
 */
export async function checkMicrophonePermission(): Promise<MicrophonePermissionStatus> {
  // MediaDevicesがサポートされていない場合
  if (!isMediaDevicesSupported()) {
    return 'unsupported';
  }

  // Permissions APIをサポートしている場合
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state as MicrophonePermissionStatus;
    } catch (error) {
      // Safari など一部ブラウザではmicrophoneクエリが失敗する
      console.warn('[audio-utils] Permissions API query failed:', error);
    }
  }

  // Permissions APIが使えない場合はgetUserMediaで確認
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stopMediaStream(stream);
    return 'granted';
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return 'denied';
      }
    }
    // その他のエラー（デバイスなしなど）も denied として扱う
    return 'denied';
  }
}

/**
 * マイク権限をリクエストする
 *
 * @returns 権限が付与されたかどうか
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (!isMediaDevicesSupported()) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stopMediaStream(stream);
    return true;
  } catch (error) {
    console.warn('[audio-utils] Microphone permission request failed:', error);
    return false;
  }
}
