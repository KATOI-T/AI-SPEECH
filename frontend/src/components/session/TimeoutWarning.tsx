/**
 * F-009: タイムアウト警告ダイアログ
 * セッションタイムアウト前の警告と延長オプション提示
 */

'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface TimeoutWarningProps {
  open: boolean;
  remainingSeconds: number;
  canExtend: boolean;
  onExtend: () => void;
  onDismiss: () => void;
}

/**
 * タイムアウト警告ダイアログ
 *
 * @example
 * ```tsx
 * <TimeoutWarning
 *   open={showTimeoutWarning}
 *   remainingSeconds={remainingSeconds}
 *   canExtend={sessionInfo?.can_extend ?? false}
 *   onExtend={handleExtend}
 *   onDismiss={() => setShowTimeoutWarning(false)}
 * />
 * ```
 */
export function TimeoutWarning({
  open,
  remainingSeconds,
  canExtend,
  onExtend,
  onDismiss,
}: TimeoutWarningProps) {
  const minutes = Math.ceil(remainingSeconds / 60);

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            セッションタイムアウト警告
          </AlertDialogTitle>
          <AlertDialogDescription>
            セッションがあと約{minutes}分でタイムアウトします。
            {canExtend
              ? '延長しますか?'
              : '延長回数の上限に達しています。'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss}>
            後で
          </AlertDialogCancel>
          {canExtend && (
            <AlertDialogAction onClick={onExtend}>
              30分延長する
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
