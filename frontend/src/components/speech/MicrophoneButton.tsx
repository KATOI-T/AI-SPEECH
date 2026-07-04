/**
 * マイクボタンコンポーネント
 * F-004: 音声入力（STT）機能
 */

"use client";

import { Mic, MicOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MicrophoneError } from "@/types/speech";

export interface MicrophoneButtonProps {
  /** 録音中かどうか */
  isRecording: boolean;
  /** 録音開始/停止トグル */
  onToggle: () => void;
  /** 無効化 */
  disabled?: boolean;
  /** エラー状態 */
  error?: MicrophoneError | null;
  /** サイズ */
  size?: "sm" | "md" | "lg";
  /** 追加クラス */
  className?: string;
}

/**
 * マイクボタンコンポーネント
 */
export function MicrophoneButton({
  isRecording,
  onToggle,
  disabled = false,
  error = null,
  size = "md",
  className,
}: MicrophoneButtonProps) {
  const hasError = !!error;

  // サイズマッピング
  const sizeMap = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-20 w-20",
  };

  const iconSizeMap = {
    sm: 20,
    md: 28,
    lg: 36,
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <Button
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "rounded-full transition-all duration-200",
          sizeMap[size],
          // 通常状態
          !isRecording && !hasError && "bg-bg-secondary hover:bg-bg-tertiary text-text-primary",
          // 録音中: 緑色で固定表示
          isRecording && "bg-status-success hover:bg-status-success/90 text-white",
          // エラー状態
          hasError && "bg-status-warning hover:bg-status-warning/90 text-white",
          className
        )}
        size="icon"
        aria-label={isRecording ? "録音を停止" : "録音を開始"}
      >
        {hasError ? (
          <AlertCircle size={iconSizeMap[size]} />
        ) : isRecording ? (
          <Mic size={iconSizeMap[size]} />
        ) : (
          <MicOff size={iconSizeMap[size]} />
        )}
      </Button>

      {/* 録音中のリングインジケーター（点滅なし） */}
      {isRecording && (
        <div className="absolute inset-0 rounded-full bg-status-success opacity-30 pointer-events-none" />
      )}

      {/* エラーメッセージ */}
      {hasError && error && (
        <div className="absolute top-full mt-2 w-64 text-sm text-status-error text-center">
          {error.message}
        </div>
      )}
    </div>
  );
}
