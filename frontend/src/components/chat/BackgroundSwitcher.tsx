'use client';

import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface BackgroundSwitcherProps {
  /** 解決済みの背景画像URL一覧 */
  backgroundUrls: (string | null)[];
  /** 現在選択中のインデックス（nullは背景なし） */
  activeIndex: number | null;
  /** 選択変更時のコールバック */
  onSelect: (index: number | null) => void;
}

export function BackgroundSwitcher({
  backgroundUrls,
  activeIndex,
  onSelect,
}: BackgroundSwitcherProps) {
  if (backgroundUrls.every((url) => url === null)) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* 背景なしボタン */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'w-10 h-7 rounded border flex items-center justify-center transition-all',
          activeIndex === null
            ? 'border-blue-500 ring-1 ring-blue-500/50'
            : 'border-slate-600 hover:border-slate-400'
        )}
        title="背景なし"
      >
        <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {/* 背景画像サムネイル */}
      {backgroundUrls.map((url, index) => {
        if (!url) return null;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              'w-10 h-7 rounded border overflow-hidden transition-all',
              activeIndex === index
                ? 'border-blue-500 ring-1 ring-blue-500/50'
                : 'border-slate-600 hover:border-slate-400'
            )}
            title={`背景 ${index + 1}`}
          >
            <img
              src={url}
              alt={`背景 ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}
