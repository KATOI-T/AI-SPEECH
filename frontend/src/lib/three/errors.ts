/**
 * Three.js関連のエラーメッセージ定義
 * F-001: 3Dモデル表示機能
 */

export const ERROR_MESSAGES = {
  FILE_NOT_FOUND:
    "3Dモデルファイルが見つかりません。管理者にお問い合わせください。",
  INVALID_FORMAT:
    "3Dモデルの形式が不正です。VRMまたはGLB形式のファイルを使用してください。",
  WEBGL_NOT_SUPPORTED:
    "お使いのブラウザはWebGLに対応していません。Chrome、Firefox、またはEdgeの最新版をご利用ください。",
  MEMORY_ERROR:
    "モデルの読み込みに必要なメモリが不足しています。ブラウザを再起動してお試しください。",
  NETWORK_ERROR:
    "ネットワークエラーが発生しました。接続を確認してから再試行してください。",
  UNKNOWN_ERROR: "予期しないエラーが発生しました。ページを再読み込みしてください。",
} as const;

/**
 * エラーをカテゴリ別に分類する
 *
 * @param error - エラーオブジェクト
 * @returns ユーザーフレンドリーなエラーメッセージ
 */
export function categorizeError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes("404") || message.includes("not found")) {
    return ERROR_MESSAGES.FILE_NOT_FOUND;
  }

  if (
    message.includes("invalid") ||
    message.includes("parse") ||
    message.includes("format")
  ) {
    return ERROR_MESSAGES.INVALID_FORMAT;
  }

  if (message.includes("webgl") || message.includes("context")) {
    return ERROR_MESSAGES.WEBGL_NOT_SUPPORTED;
  }

  if (message.includes("memory") || message.includes("heap")) {
    return ERROR_MESSAGES.MEMORY_ERROR;
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
}
