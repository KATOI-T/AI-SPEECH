/**
 * F-009: セッション操作コントロール
 * 一時停止、再開、終了ボタンのグループ
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, X } from 'lucide-react';
import { SessionStatus } from '@/types';

interface SessionControlsProps {
  status: SessionStatus;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  disabled?: boolean;
}

/**
 * セッション操作コントロールコンポーネント
 *
 * @example
 * ```tsx
 * <SessionControls
 *   status="active"
 *   onPause={handlePause}
 *   onResume={handleResume}
 *   onEnd={handleEnd}
 * />
 * ```
 */
export function SessionControls({
  status,
  onPause,
  onResume,
  onEnd,
  disabled = false,
}: SessionControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {status === 'active' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPause}
          disabled={disabled}
          data-testid="session-pause-button"
        >
          <Pause className="h-4 w-4 mr-1" />
          一時停止
        </Button>
      )}
      {status === 'paused' && (
        <Button
          variant="default"
          size="sm"
          onClick={onResume}
          disabled={disabled}
          data-testid="session-resume-button"
        >
          <Play className="h-4 w-4 mr-1" />
          再開
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onEnd}
        disabled={disabled}
        data-testid="session-end-button"
      >
        <X className="h-4 w-4 mr-1" />
        終了
      </Button>
    </div>
  );
}
