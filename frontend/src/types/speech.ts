/**
 * Speech-to-Text 型定義
 * F-004: 音声入力（STT）機能
 */

/** マイクの状態 */
export type MicrophoneState =
  | "idle"        // 待機中
  | "requesting"  // 権限要求中
  | "ready"       // 準備完了
  | "recording"   // 録音中
  | "error";      // エラー

/** 認識の状態 */
export type RecognitionState =
  | "idle"         // 待機中
  | "starting"     // 開始中
  | "listening"    // 聞き取り中
  | "processing"   // 処理中
  | "stopped"      // 停止
  | "error";       // エラー

/** マイクエラー */
export interface MicrophoneError {
  code: "NOT_ALLOWED" | "NOT_FOUND" | "NOT_READABLE" | "UNKNOWN";
  message: string;
}

/** 認識結果 */
export interface RecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

/** 認識エラー */
export interface RecognitionError {
  code: "AUTH_FAILED" | "NETWORK_ERROR" | "NO_MATCH" | "CANCELED" | "UNKNOWN";
  message: string;
}

/** 認証トークン */
export interface SpeechToken {
  token: string;
  region: string;
  expiresAt: Date;
}
