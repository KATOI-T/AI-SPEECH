/**
 * F-005: 音声出力（TTS）- 型定義
 */

import type { Viseme } from "./lipsync";

/**
 * TTS 音声合成リクエスト
 */
export interface TTSRequest {
  /** 合成するテキスト（1-5000文字） */
  text: string;
  /** 使用する音声名（省略時: ja-JP-NanamiNeural） */
  voice_name?: string;
  /** 音声速度（0.5-2.0、デフォルト: 1.0） */
  rate?: number;
  /** 音声ピッチ（-50 to +50、デフォルト: 0） */
  pitch?: number;
}

/**
 * TTS 音声合成レスポンス
 */
export interface TTSResponse {
  /** 音声データ（base64エンコード） */
  audio_base64: string;
  /** Viseme タイムライン */
  visemes: Viseme[];
  /** 音声フォーマット（デフォルト: wav） */
  format: string;
}

/**
 * 利用可能な音声リスト
 */
export interface VoiceListResponse {
  /** 音声名のリスト */
  voices: string[];
}

/**
 * TTS の状態
 */
export type TTSState =
  | "idle" // 待機中
  | "synthesizing" // 合成中
  | "ready" // 合成完了、再生待ち
  | "playing" // 再生中
  | "paused" // 一時停止中
  | "ended"; // 再生終了

/**
 * TTS エラー
 */
export interface TTSError {
  /** エラーメッセージ */
  message: string;
  /** エラーコード */
  code?: string;
}
