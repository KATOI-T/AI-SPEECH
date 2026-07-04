/**
 * 認識テキスト表示コンポーネント
 * F-004: 音声入力（STT）機能
 */

"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecognitionResult } from "@/types/speech";

export interface TranscriptDisplayProps {
  /** 認識結果一覧 */
  results: RecognitionResult[];
  /** 中間認識テキスト */
  interimText?: string;
  /** クリアボタン表示 */
  showClear?: boolean;
  /** クリアコールバック */
  onClear?: () => void;
  /** 追加クラス */
  className?: string;
}

/**
 * 認識テキスト表示コンポーネント
 */
export function TranscriptDisplay({
  results,
  interimText = "",
  showClear = true,
  onClear,
  className,
}: TranscriptDisplayProps) {
  const hasResults = results.length > 0 || interimText;

  if (!hasResults) {
    return (
      <div
        className={cn(
          "flex items-center justify-center min-h-[200px] p-6 rounded-lg bg-bg-secondary border border-border-primary",
          className
        )}
      >
        <p className="text-text-muted text-sm">認識結果がここに表示されます</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col min-h-[200px] max-h-[400px] p-6 rounded-lg bg-bg-secondary border border-border-primary",
        className
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">認識結果</h3>
        {showClear && onClear && results.length > 0 && (
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="結果をクリア"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {/* 認識結果一覧 */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {results.map((result, index) => (
          <div
            key={index}
            className={cn(
              "p-3 rounded-md bg-bg-primary",
              result.isFinal ? "border-l-4 border-accent-primary" : "opacity-70"
            )}
          >
            <p className="text-sm text-text-primary">{result.text}</p>
            {result.confidence > 0 && (
              <p className="mt-1 text-xs text-text-muted">
                信頼度: {(result.confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        ))}

        {/* 中間認識テキスト */}
        {interimText && (
          <div className="p-3 rounded-md bg-bg-primary opacity-70 border-l-4 border-text-muted">
            <p className="text-sm text-text-secondary italic">{interimText}</p>
            <p className="mt-1 text-xs text-text-muted">認識中...</p>
          </div>
        )}
      </div>
    </div>
  );
}
