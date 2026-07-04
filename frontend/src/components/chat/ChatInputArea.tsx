/**
 * F-004/F-006: チャット入力エリアコンポーネント
 * テキスト入力、音声入力、送信ボタンを統合した入力エリア
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Loader2, History } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RecognitionState, RecognitionError } from '@/types/speech';

export interface ChatInputAreaProps {
  /** 入力テキスト */
  inputText: string;
  /** 入力テキスト変更ハンドラー */
  onInputChange: (text: string) => void;
  /** 送信ハンドラー */
  onSend: () => void;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 送信中フラグ（AI応答生成中） */
  isSending?: boolean;
  /** AI発言中フラグ（音声再生中） */
  isPlaying?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** 音声認識状態 */
  recognitionState: RecognitionState;
  /** 中間認識結果 */
  interimText: string;
  /** 音声認識開始ハンドラー */
  onStartRecognition: () => void;
  /** 音声認識停止ハンドラー */
  onStopRecognition: () => void;
  /** 音声認識エラー */
  recognitionError?: RecognitionError | null;
  /** 自動送信モード */
  autoSend: boolean;
  /** 自動送信モード切り替えハンドラー */
  onToggleAutoSend: () => void;
  /** 音声入力が有効か */
  voiceInputEnabled: boolean;
  /** 音声入力の有効/無効切り替えハンドラー */
  onToggleVoiceInputEnabled: () => void;
  /** プレースホルダー */
  placeholder?: string;
  /** キャラクター名（発言中表示用） */
  characterName?: string;
  /** フルスクリーンモードかどうか */
  isFullscreen?: boolean;
}

/**
 * チャット入力エリアコンポーネント
 *
 * テキスト入力と音声入力を統合し、自動送信/手動送信モードの切り替えをサポートする。
 *
 * @example
 * ```tsx
 * <ChatInputArea
 *   inputText={inputText}
 *   onInputChange={setInputText}
 *   onSend={handleSend}
 *   recognitionState={state}
 *   interimText={interimText}
 *   onStartRecognition={start}
 *   onStopRecognition={stop}
 *   autoSend={settings.autoSend}
 *   onToggleAutoSend={toggleAutoSend}
 * />
 * ```
 */
export function ChatInputArea({
  inputText,
  onInputChange,
  onSend,
  disabled = false,
  isSending = false,
  isPlaying = false,
  error,
  recognitionState,
  interimText,
  onStartRecognition,
  onStopRecognition,
  recognitionError,
  autoSend,
  onToggleAutoSend,
  voiceInputEnabled,
  onToggleVoiceInputEnabled,
  placeholder = 'メッセージを入力...',
  characterName,
  isFullscreen = false,
}: ChatInputAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isListening = recognitionState === 'listening';
  const isStarting = recognitionState === 'starting';
  const isProcessing = recognitionState === 'processing';
  const isRecognitionActive = isListening || isStarting || isProcessing;

  // AI応答中または発言中は入力を無効化
  const isAIBusy = isSending || isPlaying;

  /**
   * マイクボタンクリックハンドラー
   */
  const handleMicToggle = useCallback(() => {
    if (isRecognitionActive) {
      onStopRecognition();
    } else {
      onStartRecognition();
    }
  }, [isRecognitionActive, onStartRecognition, onStopRecognition]);

  /**
   * Enterキー送信ハンドラー
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !isRecognitionActive) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend, isRecognitionActive]
  );

  /**
   * 送信ボタン有効/無効判定
   */
  const canSend = inputText.trim().length > 0 && !disabled && !isAIBusy && !isRecognitionActive;

  /**
   * 音声認識ボタン有効/無効判定
   * 音声入力が無効、AI応答中、または発言中は音声入力を無効化
   */
  const canRecord = voiceInputEnabled && !disabled && !isAIBusy;

  // Debug logging for microphone button state
  useEffect(() => {
    if (voiceInputEnabled && !canRecord) {
      console.log('[ChatInputArea] Mic disabled - state:', {
        voiceInputEnabled,
        disabled,
        isSending,
        isPlaying,
        isAIBusy,
        canRecord,
        recognitionState,
      });
    }
  }, [voiceInputEnabled, disabled, isSending, isPlaying, isAIBusy, canRecord, recognitionState]);

  /**
   * マイクボタン無効理由を取得
   */
  const getMicDisabledReason = (): string => {
    if (!voiceInputEnabled) return '音声入力が無効です';
    if (disabled) return 'セッションが一時停止中です';
    if (isAIBusy) return 'AI応答中は音声入力できません';
    return isRecognitionActive ? '録音を停止' : '音声入力を開始';
  };

  /**
   * マイクボタンアイコン
   */
  const MicIcon = isListening ? Mic : MicOff;

  /**
   * 認識中にフォーカスをinputから外さない
   */
  useEffect(() => {
    if (!isRecognitionActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRecognitionActive, inputText]);

  if (!isFullscreen) {
    // 非フルスクリーン: ダークテーマレイアウト
    return (
      <div className="px-5 py-4 border-t border-slate-800 space-y-3">
        {/* 設定トグル行 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Switch
                id="voice-input"
                checked={voiceInputEnabled}
                onCheckedChange={onToggleVoiceInputEnabled}
                disabled={disabled || isRecognitionActive}
                className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-700"
              />
              <Label htmlFor="voice-input" className="text-sm text-slate-400 cursor-pointer">
                音声入力
              </Label>
            </div>
            {voiceInputEnabled && (
              <div className="flex items-center gap-1.5">
                <Switch
                  id="auto-send"
                  checked={autoSend}
                  onCheckedChange={onToggleAutoSend}
                  disabled={disabled || isRecognitionActive}
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-700"
                />
                <Label htmlFor="auto-send" className="text-sm text-slate-400 cursor-pointer">
                  自動送信
                </Label>
              </div>
            )}
          </div>
          <button type="button" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors">
            <History className="h-4 w-4" />
            <span>履歴を見る</span>
          </button>
        </div>

        {/* エラー表示 */}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {recognitionError && <p className="text-sm text-red-500">{recognitionError.message}</p>}

        {/* 状態表示エリア */}
        {(isSending || isPlaying) && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 text-slate-400 text-sm"
            data-testid="ai-status"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span>{characterName ? `${characterName}が考えています...` : 'AIが考えています...'}</span>
              </>
            ) : isPlaying ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span>{characterName ? `${characterName}が話しています...` : 'AIが話しています...'}</span>
              </>
            ) : null}
          </div>
        )}

        {/* 入力バー */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex items-center bg-slate-800 rounded-xl border border-slate-700 px-4">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening ? '音声認識中...' : isAIBusy ? '応答をお待ちください...' : 'メッセージを入力してください...'
              }
              disabled={disabled || isRecognitionActive || isAIBusy}
              data-testid="message-input"
              className={cn(
                'flex-1 bg-transparent py-3 text-sm',
                'text-slate-100 placeholder:text-slate-500',
                'focus:outline-none border-none focus:ring-0',
                'disabled:opacity-50'
              )}
            />

            {/* マイクボタン */}
            {voiceInputEnabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      disabled={!canRecord}
                      data-testid="mic-button"
                      className={cn(
                        'p-1.5 ml-1 transition-colors',
                        isListening ? 'text-green-400' : 'text-slate-500 hover:text-slate-300',
                        !canRecord && 'opacity-30 cursor-not-allowed'
                      )}
                      aria-label={isRecognitionActive ? '音声認識を停止' : '音声認識を開始'}
                    >
                      {isStarting || isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MicIcon className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{getMicDisabledReason()}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* 送信ボタン */}
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            data-testid="send-button"
            aria-label="送信"
            className={cn(
              'flex items-center justify-center size-11 rounded-xl',
              'bg-blue-600 text-white hover:bg-blue-500',
              'transition-all',
              'disabled:opacity-30'
            )}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* クイックリプライボタン */}
        <div className="flex flex-wrap gap-2">
          {['店内利用で', 'テイクアウトで', 'メニューを見せて'].map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onInputChange(action)}
              disabled={disabled || isAIBusy}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm',
                'bg-transparent border border-slate-700 text-slate-400',
                'hover:bg-slate-800 hover:text-slate-300 transition-colors',
                'disabled:opacity-30',
              )}
            >
              {action}
            </button>
          ))}
        </div>

        {/* 中間認識結果表示 */}
        {voiceInputEnabled && (isListening || interimText) && (
          <div
            className="px-3 py-2 rounded-lg bg-slate-800/60 text-slate-400 text-sm"
            data-testid="interim-text"
          >
            <div className="flex items-center gap-2">
              <span className="text-green-400 animate-pulse">●</span>
              <span>{interimText || '発話を待っています...'}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // フルスクリーン: グラスモーフィズムレイアウト
  return (
    <div className="bg-black/40 backdrop-blur-md border-t border-white/10 rounded-t-3xl pt-6 pb-5 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] space-y-4 pointer-events-auto">
      {/* 設定トグル行 */}
      <div className="flex items-center gap-4 justify-center">
        <div className="flex items-center gap-1.5">
          <Switch
            id="voice-input"
            checked={voiceInputEnabled}
            onCheckedChange={onToggleVoiceInputEnabled}
            disabled={disabled || isRecognitionActive}
            className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-700"
          />
          <Label
            htmlFor="voice-input"
            className={cn(
              'text-xs cursor-pointer',
              disabled || isRecognitionActive ? 'text-slate-600' : 'text-slate-400'
            )}
          >
            音声入力
          </Label>
        </div>
        {voiceInputEnabled && (
          <div className="flex items-center gap-1.5">
            <Switch
              id="auto-send"
              checked={autoSend}
              onCheckedChange={onToggleAutoSend}
              disabled={disabled || isRecognitionActive}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-700"
            />
            <Label
              htmlFor="auto-send"
              className={cn(
                'text-xs cursor-pointer',
                disabled || isRecognitionActive ? 'text-slate-600' : 'text-slate-400'
              )}
            >
              自動送信
            </Label>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      {recognitionError && (
        <p className="text-xs text-red-500 text-center">{recognitionError.message}</p>
      )}

      {/* 状態表示エリア */}
      {(isSending || isPlaying) && (
        <div
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
            'bg-white/[0.04] border border-white/[0.06]',
            'text-slate-400 text-xs'
          )}
          data-testid="ai-status"
        >
          {isSending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
              <span>{characterName ? `${characterName}が考えています...` : 'AIが考えています...'}</span>
            </>
          ) : isPlaying ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-success" />
              </span>
              <span>{characterName ? `${characterName}が話しています...` : 'AIが話しています...'}</span>
            </>
          ) : null}
        </div>
      )}

      {/* クイックリプライボタン */}
      <div className="flex flex-wrap gap-2 justify-center">
        {['店内利用で', 'テイクアウトで', 'メニューを見る'].map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => {
              onInputChange(action);
            }}
            disabled={disabled || isAIBusy}
            className={cn(
              'px-4 py-1 rounded-full text-[11px] font-medium',
              'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300',
              'transition-all backdrop-blur-sm',
              'disabled:opacity-30',
            )}
          >
            {action}
          </button>
        ))}
      </div>

      {/* 入力バー */}
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 pl-6 shadow-2xl">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? '音声認識中...'
                : isAIBusy
                  ? '応答をお待ちください...'
                  : characterName
                    ? `${characterName}にメッセージを送る...`
                    : placeholder
            }
            disabled={disabled || isRecognitionActive || isAIBusy}
            data-testid="message-input"
            className={cn(
              'flex-1 bg-transparent border-none focus:ring-0',
              'text-slate-100 text-sm py-3',
              'placeholder:text-slate-400',
              'focus:outline-none',
              'disabled:opacity-50'
            )}
          />

          <div className="flex items-center gap-2 pr-2">
            {/* マイクボタン */}
            {voiceInputEnabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      disabled={!canRecord}
                      data-testid="mic-button"
                      className={cn(
                        'p-2 transition-colors',
                        isListening ? 'text-green-400 hover:text-green-300' : 'text-slate-400 hover:text-white',
                        isStarting && 'animate-pulse',
                        !canRecord && 'opacity-30 cursor-not-allowed'
                      )}
                      aria-label={isRecognitionActive ? '音声認識を停止' : '音声認識を開始'}
                    >
                      {isStarting || isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <MicIcon className="h-5 w-5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {getMicDisabledReason()}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* 送信ボタン */}
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              data-testid="send-button"
              aria-label="送信"
              className={cn(
                'flex items-center justify-center size-11 rounded-xl',
                'bg-blue-600 text-white hover:bg-blue-500',
                'transition-all shadow-lg shadow-blue-600/40',
                'disabled:opacity-30 disabled:shadow-none'
              )}
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 中間認識結果表示 */}
      {voiceInputEnabled && (isListening || interimText) && (
        <div
          className={cn(
            'px-4 py-2 rounded-lg text-center',
            'bg-white/[0.04] border border-white/[0.06]',
            'text-slate-400 text-xs'
          )}
          data-testid="interim-text"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400 animate-pulse">●</span>
            <span>{interimText || '発話を待っています...'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
