/**
 * 認識状態表示コンポーネント
 * F-004: 音声入力（STT）機能
 */

"use client";

import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecognitionState, RecognitionError } from "@/types/speech";

export interface RecognitionStatusProps {
  /** 認識状態 */
  state: RecognitionState;
  /** 中間認識テキスト */
  interimText?: string;
  /** エラー情報 */
  error?: RecognitionError | null;
  /** 追加クラス */
  className?: string;
}

/**
 * 認識状態表示コンポーネント
 */
export function RecognitionStatus({
  state,
  interimText = "",
  error = null,
  className,
}: RecognitionStatusProps) {
  // 状態に応じたメッセージとアイコン
  const getStatusContent = () => {
    switch (state) {
      case "idle":
        return {
          icon: null,
          message: "マイクボタンを押して話しかけてください",
          className: "text-text-muted",
        };

      case "starting":
        return {
          icon: <Loader2 className="animate-spin" size={20} />,
          message: "認識エンジンを起動中...",
          className: "text-text-secondary",
        };

      case "listening":
        return {
          icon: <Loader2 className="animate-spin text-accent-primary" size={20} />,
          message: interimText || "聞き取り中...",
          className: interimText ? "text-text-primary font-medium" : "text-text-secondary",
        };

      case "processing":
        return {
          icon: <Loader2 className="animate-spin" size={20} />,
          message: "処理中...",
          className: "text-text-secondary",
        };

      case "stopped":
        return {
          icon: <CheckCircle className="text-status-success" size={20} />,
          message: "認識を停止しました",
          className: "text-status-success",
        };

      case "error":
        return {
          icon: <AlertCircle className="text-status-error" size={20} />,
          message: error?.message || "エラーが発生しました",
          className: "text-status-error",
        };

      default:
        return {
          icon: null,
          message: "",
          className: "",
        };
    }
  };

  const { icon, message, className: statusClassName } = getStatusContent();

  if (!message) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 min-h-[2rem] px-4 py-2 rounded-lg bg-bg-secondary",
        className
      )}
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <p className={cn("text-sm", statusClassName)}>{message}</p>
    </div>
  );
}
