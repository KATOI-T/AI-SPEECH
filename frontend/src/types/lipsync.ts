/**
 * F-002: リップシンク機能 - 型定義
 */

/**
 * Viseme データ構造（バックエンドAPI互換）
 */
export interface Viseme {
  /** 秒単位のタイムスタンプ */
  time: number;
  /** Viseme ID（sil, aa, ih, ou, ee, oh） */
  viseme: string;
}

/**
 * リップシンクモード
 */
export type LipSyncMode =
  | "viseme"   // Viseme ベースの精密な口形状制御
  | "volume";  // 音量ベースの簡易口パク（将来拡張用）

/**
 * リップシンク設定
 */
export interface LipSyncConfig {
  /** リップシンクモード */
  mode: LipSyncMode;
  /** スムーズ補間係数（0-1、デフォルト: 0.3） */
  smoothing?: number;
  /** 音量閾値（volume モード用、デフォルト: 0.01） */
  threshold?: number;
}

/**
 * リップシンクコントローラーオプション
 */
export interface LipSyncControllerOptions {
  /** スムーズ補間係数（0-1、デフォルト: 0.3） */
  smoothing?: number;
}
