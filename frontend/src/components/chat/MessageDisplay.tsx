/**
 * F-006: AI会話生成 - メッセージ表示コンポーネント
 * F-004: 音声入力後のメッセージ編集機能
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';

/**
 * MessageDisplayコンポーネントのプロパティ
 */
interface MessageDisplayProps {
  /** メッセージ送信者（ユーザーまたはアシスタント） */
  role: 'user' | 'assistant';
  /** メッセージ内容 */
  content: string;
  /** 感情（assistantの場合のみ） */
  emotion?: string;
  /** キャラクター名（assistantの場合のみ） */
  characterName?: string;
  /** 編集可能フラグ（ユーザーメッセージのみ） */
  editable?: boolean;
  /** 編集保存ハンドラー */
  onSaveEdit?: (newContent: string) => Promise<boolean>;
  /** 編集中フラグ（外部制御用） */
  isEditing?: boolean;
  /** フルスクリーンモードかどうか */
  isFullscreen?: boolean;
}

/**
 * 感情ラベルのマッピング
 */
const emotionLabels: Record<string, string> = {
  neutral: '普通',
  happy: '嬉しい',
  sad: '悲しい',
  surprised: '驚き',
  angry: '怒り',
};

const emotionColors: Record<string, string> = {
  neutral: 'bg-gray-500/20 text-gray-300',
  happy: 'bg-green-500/20 text-green-300',
  sad: 'bg-blue-500/20 text-blue-300',
  surprised: 'bg-yellow-500/20 text-yellow-300',
  angry: 'bg-red-500/20 text-red-300',
  thinking: 'bg-blue-500/20 text-blue-300',
};

/**
 * メッセージを表示するコンポーネント
 *
 * ユーザーメッセージとアシスタントメッセージを区別して表示する。
 * アシスタントメッセージには感情バッジを表示できる。
 * ユーザーメッセージは編集可能にできる。
 *
 * @example
 * ```tsx
 * <MessageDisplay
 *   role="assistant"
 *   content="いらっしゃいませ！ご注文はお決まりですか？"
 *   emotion="happy"
 *   characterName="ミク"
 * />
 *
 * <MessageDisplay
 *   role="user"
 *   content="コーヒーをください"
 *   editable
 *   onSaveEdit={async (newContent) => { ... }}
 * />
 * ```
 */
export function MessageDisplay({
  role,
  content,
  emotion,
  characterName,
  editable = false,
  onSaveEdit,
  isFullscreen = false,
}: MessageDisplayProps) {
  const isUser = role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 編集モード開始時にフォーカス
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // content更新時にeditContentも更新
  useEffect(() => {
    setEditContent(content);
  }, [content]);

  /**
   * 編集モードを開始
   */
  const handleStartEdit = useCallback(() => {
    setEditContent(content);
    setIsEditing(true);
  }, [content]);

  /**
   * 編集をキャンセル
   */
  const handleCancelEdit = useCallback(() => {
    setEditContent(content);
    setIsEditing(false);
  }, [content]);

  /**
   * 編集を保存
   */
  const handleSaveEdit = useCallback(async () => {
    if (!onSaveEdit || editContent.trim() === content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSaveEdit(editContent.trim());
      if (success) {
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [editContent, content, onSaveEdit]);

  /**
   * キーボードショートカット
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  if (!isFullscreen) {
    // 非フルスクリーン: ダークテーマ、アバター付きレイアウト
    return (
      <div className={cn('mb-6 group', isUser ? 'text-right' : 'text-left')}>
        {/* 名前 + 感情バッジ */}
        <div className={cn(
          'flex items-center gap-2 mb-1.5',
          isUser ? 'justify-end' : 'justify-start'
        )}>
          {!isUser && (
            <>
              <div className="size-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-xs">
                {characterName?.charAt(0) || 'A'}
              </div>
              <span className="text-sm font-semibold text-slate-200">{characterName}</span>
              {emotion && emotion !== 'neutral' && (
                <span className={cn(
                  'text-[11px] px-2 py-0.5 rounded font-medium',
                  emotionColors[emotion] || emotionColors.neutral
                )}>
                  {emotionLabels[emotion] || emotion}
                </span>
              )}
            </>
          )}
          {isUser && (
            <span className="text-sm font-semibold text-slate-200">あなた</span>
          )}
        </div>

        {/* メッセージバブル */}
        <div className={cn(
          isUser ? 'flex justify-end' : 'flex justify-start',
        )}>
          <div
            className={cn(
              'max-w-[85%] rounded-xl px-4 py-3 relative',
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-200'
            )}
          >
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSaving}
                  className={cn(
                    'w-full min-h-[60px] p-2 rounded',
                    'bg-slate-700 text-slate-100',
                    'border border-slate-600 focus:border-blue-500',
                    'focus:outline-none resize-none',
                    'disabled:opacity-50'
                  )}
                  data-testid="message-edit-textarea"
                />
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isSaving} className="text-slate-300 hover:text-white hover:bg-slate-600">
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleSaveEdit} disabled={isSaving || !editContent.trim()} className="text-slate-300 hover:text-white hover:bg-slate-600">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="whitespace-pre-wrap flex-1 text-[15px] leading-relaxed">{content}</p>
                {isUser && editable && onSaveEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStartEdit}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white hover:bg-white/20"
                    data-testid="message-edit-button"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* タイムスタンプ */}
        <div className={cn('mt-1 px-1', isUser ? 'text-right' : 'text-left')}>
          <span className="text-[11px] text-slate-500">
            {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  // フルスクリーン: グラスモーフィズムレイアウト
  return (
    <div
      className={cn(
        'flex flex-col gap-2 group',
        isUser ? 'items-end' : 'items-start',
        isUser ? 'ml-auto' : 'mr-auto',
        'max-w-[90%]'
      )}
    >
      {/* 名前 + タイムスタンプ */}
      <div className={cn(
        'flex items-center gap-2 px-1',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
        {!isUser && characterName && (
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest drop-shadow-md">
            {characterName}
          </span>
        )}
        {isUser && (
          <span className="text-[11px] font-bold text-slate-100 uppercase tracking-widest drop-shadow-md">You</span>
        )}
        <span className="text-[10px] text-slate-300/80">
          {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {!isUser && emotion && emotion !== 'neutral' && (
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-medium',
            emotionColors[emotion] || emotionColors.neutral
          )}>
            {emotionLabels[emotion] || emotion}
          </span>
        )}
      </div>

      {/* メッセージバブル */}
      <div
        className={cn(
          'p-4 relative shadow-xl',
          isUser
            ? 'bg-blue-600/30 backdrop-blur-md rounded-2xl rounded-tr-none border border-blue-500/20 text-white'
            : 'bg-black/20 backdrop-blur-md rounded-2xl rounded-tl-none border border-white/10 text-slate-100'
        )}
      >
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className={cn(
                'w-full min-h-[60px] p-2 rounded',
                'bg-white/20 text-white placeholder:text-white/70',
                'border border-white/30 focus:border-white/50',
                'focus:outline-none resize-none',
                'disabled:opacity-50'
              )}
              data-testid="message-edit-textarea"
            />
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSaveEdit}
                disabled={isSaving || !editContent.trim()}
                className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/20"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="whitespace-pre-wrap flex-1 leading-relaxed text-sm">{content}</p>
            {isUser && editable && onSaveEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStartEdit}
                className={cn(
                  'h-6 w-6 p-0 opacity-0 group-hover:opacity-100',
                  'text-white/60 hover:text-white hover:bg-white/20',
                  'transition-opacity'
                )}
                data-testid="message-edit-button"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
