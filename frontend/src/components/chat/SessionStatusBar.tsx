/**
 * F-009: セッションステータスバー
 * セッション状態、残り時間、ターン数の表示と操作ボタン
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pause, Play, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionStatus } from '@/types';

interface SessionStatusBarProps {
  status: SessionStatus;
  remainingSeconds: number;
  turnCount: number;
  canExtend: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onExtend: () => void;
  disabled?: boolean;
  className?: string;
  isFullscreen?: boolean;
}

const statusConfig: Record<SessionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: '会話中', variant: 'default' },
  paused: { label: '一時停止', variant: 'secondary' },
  ended: { label: '終了', variant: 'outline' },
  expired: { label: 'タイムアウト', variant: 'destructive' },
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * セッションステータスバーコンポーネント
 *
 * @example
 * ```tsx
 * <SessionStatusBar
 *   status="active"
 *   remainingSeconds={900}
 *   turnCount={3}
 *   canExtend={true}
 *   isPaused={false}
 *   onPause={handlePause}
 *   onResume={handleResume}
 *   onExtend={handleExtend}
 * />
 * ```
 */
export function SessionStatusBar({
  status,
  remainingSeconds,
  turnCount,
  canExtend,
  isPaused,
  onPause,
  onResume,
  onExtend,
  disabled = false,
  className,
  isFullscreen = false,
}: SessionStatusBarProps) {
  const isWarning = remainingSeconds <= 300 && remainingSeconds > 60;
  const isCritical = remainingSeconds <= 60;
  const config = statusConfig[status];

  return (
    <div className={cn(
      "flex items-center justify-between",
      isFullscreen
        ? "px-5 py-2 bg-white/[0.03] border-b border-white/[0.06]"
        : "px-5 py-2 bg-slate-800/50 border-b border-slate-800",
      className
    )}>
      <div className="flex items-center gap-3">
        {/* ステータスバッジ */}
        <Badge variant={config.variant} className={isFullscreen ? "text-[10px] px-2 py-0.5" : ""} data-testid="status-badge">
          {config.label}
        </Badge>

        {/* 残り時間 */}
        <div
          className={cn(
            "flex items-center gap-1",
            isFullscreen ? "text-xs" : "text-sm",
            isCritical && "text-red-500 font-bold",
            isWarning && !isCritical && "text-yellow-500",
            !isWarning && !isCritical && "text-slate-400"
          )}
          data-testid="remaining-time"
        >
          {(isWarning || isCritical) && (
            <AlertTriangle className={isFullscreen ? "h-3 w-3" : "h-4 w-4"} />
          )}
          <Clock className={isFullscreen ? "h-3 w-3" : "h-4 w-4"} />
          <span>{formatTime(remainingSeconds)}</span>
        </div>

        {/* ターン数（非フルスクリーンのみ） */}
        {!isFullscreen && (
          <span className="text-sm text-slate-400">
            {turnCount} ターン
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* 延長ボタン */}
        {canExtend && remainingSeconds <= 300 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExtend}
            disabled={disabled}
            className={isFullscreen ? "h-7 text-xs px-2" : ""}
            data-testid="extend-button"
          >
            延長
          </Button>
        )}

        {/* 一時停止/再開ボタン */}
        {status === 'active' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPause}
            disabled={disabled}
            className={isFullscreen ? "h-7 text-xs px-2" : ""}
            data-testid="pause-button"
          >
            <Pause className={cn(isFullscreen ? "h-3 w-3" : "h-4 w-4", "mr-1")} />
            一時停止
          </Button>
        )}
        {status === 'paused' && (
          <Button
            variant="default"
            size="sm"
            onClick={onResume}
            disabled={disabled}
            className={isFullscreen ? "h-7 text-xs px-2" : ""}
            data-testid="resume-button"
          >
            <Play className={cn(isFullscreen ? "h-3 w-3" : "h-4 w-4", "mr-1")} />
            再開
          </Button>
        )}
      </div>
    </div>
  );
}
