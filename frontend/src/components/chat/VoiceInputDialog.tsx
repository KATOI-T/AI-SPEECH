/**
 * F-004: 音声入力確認ダイアログ
 * 初回起動時にマイク使用の確認を行う
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface VoiceInputDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 「有効にする」が選択された時のコールバック */
  onEnable: () => void;
  /** 「今は使わない」が選択された時のコールバック */
  onSkip: () => void;
}

/**
 * 音声入力確認ダイアログ
 *
 * 初回起動時にマイク権限がある場合に表示し、
 * ユーザーに音声入力を有効にするか確認する。
 */
export function VoiceInputDialog({
  open,
  onEnable,
  onSkip,
}: VoiceInputDialogProps) {
  // 有効化ボタンが押されたかを追跡（onOpenChange の競合を防ぐ）
  const [isEnabling, setIsEnabling] = useState(false);

  // ダイアログが開くたびにリセット
  useEffect(() => {
    if (open) {
      setIsEnabling(false);
    }
  }, [open]);

  const handleEnable = () => {
    setIsEnabling(true); // 有効化フラグを立てる
    onEnable(); // 親コンポーネントのハンドラを呼ぶ
  };

  const handleOpenChange = (isOpen: boolean) => {
    // ダイアログが閉じられた かつ 有効化ボタンが押されていない場合のみ onSkip()
    if (!isOpen && !isEnabling) {
      onSkip();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/10">
              <Mic className="h-5 w-5 text-accent-primary" />
            </div>
            <DialogTitle>音声入力を有効にしますか?</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            マイクを使って音声で入力できます。
            話しかけるだけでメッセージを送信でき、より自然な会話が可能です。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onSkip}
          >
            今は使わない
          </Button>
          <Button
            onClick={handleEnable}
          >
            有効にする
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
