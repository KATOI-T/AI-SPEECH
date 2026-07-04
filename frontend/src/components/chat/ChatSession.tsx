/**
 * F-006: AI会話生成 - チャットセッションコンポーネント
 * F-009: セッション永続化・復元機能
 * F-004: 音声入力（STT）機能統合
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VRM } from '@pixiv/three-vrm';
import { useChat } from '@/hooks/useChat';
import { useLipSync } from '@/hooks/useLipSync';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceInputSettings } from '@/hooks/useVoiceInputSettings';
import { Viseme, Character, Scenario, ConversationPhase, EmotionType } from '@/types';
import { MessageDisplay } from './MessageDisplay';
import { ChatInputArea } from './ChatInputArea';
import { VoiceInputDialog } from './VoiceInputDialog';
import { SessionStatusBar } from './SessionStatusBar';
import { TimeoutWarning } from '@/components/session/TimeoutWarning';
import { Button } from '@/components/ui/button';
import { X, Play, RotateCcw, Clock, MessageSquare, Maximize2, Minimize2, History, Settings, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkMicrophonePermission, requestMicrophonePermission } from '@/lib/speech/audio-utils';

/**
 * ChatSessionコンポーネントのプロパティ
 */
interface ChatSessionProps {
  /** シナリオ情報 */
  scenario: Scenario;
  /** キャラクター情報 */
  character: Character;
  /** VRMモデル（リップシンク用） */
  vrm: VRM | null;
  /** セッション終了時のコールバック */
  onEnd?: () => void;
  /** 全体表示モードかどうか */
  isFullscreen?: boolean;
  /** 全体表示モード切り替えコールバック */
  onToggleFullscreen?: () => void;
  /**
   * 会話フェーズ変更コールバック（F-010 / F-013）
   * ボディアニメーション・表情の唯一の入口。`useConversationAnimation.setPhase` を渡すこと。
   */
  onPhaseChange?: (phase: ConversationPhase) => void;
  /**
   * 感情変更コールバック（F-010 / F-013）
   * 表情レイヤーおよび SPEAKING 時のボディアニメ上書きに反映される。
   * `useConversationAnimation.setEmotion` を渡すこと。
   */
  onEmotionChange?: (emotion: EmotionType) => void;
}

/**
 * チャット会話セッションを管理するコンポーネント
 *
 * セッションの開始、メッセージの送受信、音声再生、リップシンクを統合的に管理する。
 *
 * @example
 * ```tsx
 * <ChatSession
 *   scenario={selectedScenario}
 *   character={selectedCharacter}
 *   vrm={vrmModel}
 *   onEnd={() => console.log('Session ended')}
 * />
 * ```
 */
/**
 * バックエンドから返される感情のうち、EmotionType として有効な値の集合。
 * `'thinking'` は感情ではなくフェーズとして扱うため含めない（F-013-003）。
 */
const VALID_EMOTIONS: ReadonlySet<EmotionType> = new Set<EmotionType>([
  'neutral',
  'happy',
  'sad',
  'surprised',
  'angry',
]);

export function ChatSession({
  scenario,
  character,
  vrm,
  onEnd,
  isFullscreen = false,
  onToggleFullscreen,
  onPhaseChange,
  onEmotionChange,
}: ChatSessionProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<{ audioBase64: string; visemes: Viseme[] }[]>([]);
  const isPlayingRef = useRef(false);
  const sessionInitializedRef = useRef(false);
  const [currentVisemes, setCurrentVisemes] = useState<Viseme[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [isRestoredSession, setIsRestoredSession] = useState(false);
  const [showVoiceInputDialog, setShowVoiceInputDialog] = useState(false);

  // オーディオクリーンアップ（unmount時）
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      audioQueueRef.current = [];
      isPlayingRef.current = false;
    };
  }, []);

  // セッション永続化フック
  const { savedSessionId, saveSessionId, clearSessionId } = useSessionPersistence();

  // 音声入力設定フック（ユーザー単位でlocalStorageに永続化）
  const {
    settings: voiceSettings,
    isLoading: isLoadingSettings,
    toggleAutoSend,
    toggleVoiceInputEnabled,
    updateSettings,
  } = useVoiceInputSettings();

  // 音声認識フック
  const {
    state: recognitionState,
    interimText,
    finalText,
    error: recognitionError,
    start: startRecognition,
    stop: stopRecognition,
    clearResults: clearRecognitionResults,
    warmup: warmupRecognition,
  } = useSpeechRecognition({
    language: 'ja-JP',
    interimResults: true,
  });

  // 音声認識完了時の処理用ref（最新のstate参照用）
  const autoSendRef = useRef(voiceSettings.autoSend);
  autoSendRef.current = voiceSettings.autoSend;

  /**
   * キューから次の音声を再生する
   */
  const playNextAudio = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    const next = audioQueueRef.current.shift();
    if (!next) return;

    isPlayingRef.current = true;
    setIsPlaying(true);

    const audio = new Audio(`data:audio/wav;base64,${next.audioBase64}`);
    audioRef.current = audio;
    setCurrentVisemes(next.visemes);

    // Safety timeout to prevent stuck state (60 seconds max)
    const playbackTimeout = setTimeout(() => {
      if (isPlayingRef.current) {
        console.warn('[ChatSession] Audio playback timed out, forcing cleanup');
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentVisemes([]);
        playNextAudio();
      }
    }, 60000);

    const cleanup = () => {
      clearTimeout(playbackTimeout);
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentVisemes([]);
      // F-013: phase を IDLE に戻すだけ。body animation は useConversationAnimation が算出する。
      onPhaseChange?.('IDLE');
      // 次の音声があれば再生
      playNextAudio();
    };

    // F-013: SPEAKING 遷移は phase 更新のみで行う。
    // emotion は先行して到着済みのため、SPEAKING + emotion の組み合わせで
    // useConversationAnimation が body animation (e.g. happy_talk) を導出する。
    onPhaseChange?.('SPEAKING');

    audio.onended = cleanup;

    audio.onerror = (err) => {
      console.error('[ChatSession] Audio play error:', err);
      cleanup();
    };

    audio.play().catch((err) => {
      console.error('[ChatSession] Audio play error:', err);
      cleanup();
    });
  };

  const {
    session,
    messages,
    restoredMessages,
    isLoading,
    isRestoring,
    error,
    startSession,
    sendMessage,
    endSession,
    restoreSession,
    updateMessage,
  } = useChat({
    onAudioReady: (audioBase64, visemes) => {
      // キューに追加
      audioQueueRef.current.push({ audioBase64, visemes });
      // 再生中でなければ再生開始
      playNextAudio();
    },
    onEmotionChange: (emotion) => {
      // F-013: useChat からのイベントを phase / emotion の 2 系統に振り分ける。
      // - 'thinking' はフェーズ遷移。emotion は変更しない。
      // - それ以外は感情更新のみ。SPEAKING 遷移は playNextAudio 側で行う。
      // これにより「感情 → 音声開始 → 音声終了」のシーケンスが決定論的になり、
      // ボディアニメーションの上書き競合（F-013 根本原因）を排除する。
      if (emotion === 'thinking') {
        onPhaseChange?.('THINKING');
        return;
      }
      if (VALID_EMOTIONS.has(emotion as EmotionType)) {
        onEmotionChange?.(emotion as EmotionType);
      } else {
        onEmotionChange?.('neutral');
      }
    },
    onError: (err) => {
      console.error('Chat error:', err);
    },
  });

  // セッション管理
  const {
    sessionInfo,
    status,
    remainingSeconds,
    isLoading: sessionLoading,
    pause,
    resume,
    extend,
  } = useSessionManager({
    sessionId: session?.session_id ?? null,
    onWarning: (remaining) => {
      // 5分または1分で警告表示
      if (remaining <= 300) {
        setShowTimeoutWarning(true);
      }
    },
    onTimeout: () => {
      // タイムアウト時の処理
      onEnd?.();
    },
    onError: (err) => {
      console.error('Session error:', err);
    },
  });

  // リップシンク連携
  useLipSync({
    vrm,
    audioElement: audioRef.current,
    visemes: currentVisemes,
    enabled: isPlaying,
  });

  // セッション初期化（復元または新規作成）
  useEffect(() => {
    if (sessionInitializedRef.current) return;
    sessionInitializedRef.current = true;

    const initializeSession = async () => {
      // 1. 保存済みセッションIDがあれば復元を試みる
      if (savedSessionId) {
        const restored = await restoreSession(savedSessionId);
        if (restored) {
          setIsRestoredSession(true);
          return; // 復元成功
        }
        // 復元失敗時はIDをクリア
        clearSessionId();
      }

      // 2. 新規セッション作成
      await startSession({
        scenario_id: scenario.id,
        character_id: character.id,
      });
    };

    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // セッション作成成功時にIDを保存
  useEffect(() => {
    if (session?.session_id && !isRestoredSession) {
      saveSessionId(session.session_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.session_id]);

  // セッション変更時に状態をリセット（前のセッションの状態が残らないように）
  useEffect(() => {
    if (session?.session_id) {
      // Clear any stuck busy states from previous session
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentVisemes([]);

      console.log('[ChatSession] Session initialized, states reset');
    }
  }, [session?.session_id]);

  /**
   * メッセージ送信ハンドラー
   */
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const text = inputText;
    setInputText('');
    clearRecognitionResults();
    await sendMessage(text);
  }, [inputText, isLoading, clearRecognitionResults, sendMessage]);

  /**
   * 音声認識完了時のハンドラー
   */
  useEffect(() => {
    if (!finalText) return;

    if (autoSendRef.current) {
      // 自動送信モード: 直接送信
      setInputText('');
      clearRecognitionResults();
      sendMessage(finalText);
    } else {
      // 手動送信モード: 入力欄にセット
      setInputText(finalText);
      clearRecognitionResults();
    }
  }, [finalText, clearRecognitionResults, sendMessage]);

  /**
   * 音声認識の開始ハンドラー
   */
  const handleStartRecognition = useCallback(() => {
    if (isPlaying || status === 'paused') return;
    startRecognition();
  }, [isPlaying, status, startRecognition]);

  /**
   * 音声認識の停止ハンドラー
   */
  const handleStopRecognition = useCallback(() => {
    stopRecognition();
  }, [stopRecognition]);

  /**
   * 音声認識トークンのウォームアップ
   */
  useEffect(() => {
    warmupRecognition();
  }, [warmupRecognition]);

  /**
   * 初回マイク権限確認フロー
   * micPermissionChecked が false の場合のみ実行
   * 設定の読み込みが完了してから実行
   */
  useEffect(() => {
    // 設定の読み込み中はスキップ
    if (isLoadingSettings) return;

    // 既に確認済みの場合はスキップ
    if (voiceSettings.micPermissionChecked) return;

    const checkPermission = async () => {
      try {
        const status = await checkMicrophonePermission();
        console.log('[ChatSession] Microphone permission status:', status);

        if (status === 'granted') {
          // 権限があれば確認ダイアログを表示
          setShowVoiceInputDialog(true);
        } else if (status === 'prompt') {
          // まだ確認していない場合は権限リクエストを行う
          const granted = await requestMicrophonePermission();
          console.log('[ChatSession] Permission request result:', granted);
          if (granted) {
            setShowVoiceInputDialog(true);
          } else {
            // 拒否された場合は音声入力を無効化
            console.warn('[ChatSession] Microphone permission denied');
            updateSettings({
              voiceInputEnabled: false,
              micPermissionChecked: true,
            });
          }
        } else {
          // 拒否済みまたはサポートされていない場合は無効化
          console.warn('[ChatSession] Microphone permission not available:', status);
          updateSettings({
            voiceInputEnabled: false,
            micPermissionChecked: true,
          });
        }
      } catch (error) {
        console.error('[ChatSession] Permission check failed:', error);
        updateSettings({
          voiceInputEnabled: false,
          micPermissionChecked: true,
        });
      }
    };

    checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingSettings, voiceSettings.micPermissionChecked]);

  /**
   * 音声入力有効化ハンドラー
   */
  const handleEnableVoiceInput = useCallback(() => {
    updateSettings({
      voiceInputEnabled: true,
      micPermissionChecked: true,
    });
    setShowVoiceInputDialog(false);
  }, [updateSettings]);

  /**
   * 音声入力スキップハンドラー
   */
  const handleSkipVoiceInput = useCallback(() => {
    updateSettings({
      voiceInputEnabled: false,
      micPermissionChecked: true,
    });
    setShowVoiceInputDialog(false);
  }, [updateSettings]);

  /**
   * セッション終了ハンドラー
   */
  const handleEndSession = async () => {
    await endSession();
    clearSessionId();
    onEnd?.();
  };

  /**
   * セッション延長ハンドラー
   */
  const handleExtend = async () => {
    await extend(30);
    setShowTimeoutWarning(false);
  };

  // 復元中の表示
  if (isRestoring) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-center">
          <RotateCcw className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-lg text-slate-100">セッションを復元しています...</p>
          <p className="text-sm text-slate-400 mt-2">しばらくお待ちください</p>
        </div>
      </div>
    );
  }

  // 共通のメッセージリストとダイアログ
  const renderMessages = (fullscreen: boolean) => (
    <>
      {/* 初期メッセージ */}
      {session?.initial_message && session.initial_message.content && (
        <MessageDisplay
          role="assistant"
          content={session.initial_message.content}
          emotion={session.initial_message.emotion}
          characterName={character.name}
          isFullscreen={fullscreen}
        />
      )}

      {/* 復元されたメッセージ */}
      {isRestoredSession && restoredMessages.map((msg, index) => (
        <MessageDisplay
          key={`restored-${index}`}
          role={msg.role}
          content={msg.content}
          characterName={msg.role === 'assistant' ? character.name : undefined}
          editable={msg.role === 'user'}
          onSaveEdit={msg.role === 'user' ? async (newContent) => {
            return await updateMessage(index, newContent);
          } : undefined}
          isFullscreen={fullscreen}
        />
      ))}

      {/* 復元後の通知 */}
      {isRestoredSession && restoredMessages.length > 0 && (
        <div className={cn(
          "text-center text-sm py-2 mt-2 border-t",
          fullscreen ? "text-slate-400 border-white/10" : "text-slate-500 border-slate-800"
        )}>
          ↑ 復元されたメッセージ（音声なし）
        </div>
      )}

      {/* 会話履歴 */}
      {messages.map((msg) => (
        <React.Fragment key={msg.message_id}>
          <MessageDisplay
            role="user"
            content={msg.user_message.content}
            isFullscreen={fullscreen}
          />
          <MessageDisplay
            role="assistant"
            content={msg.response.content}
            emotion={msg.response.emotion}
            characterName={character.name}
            isFullscreen={fullscreen}
          />
        </React.Fragment>
      ))}
    </>
  );

  const renderDialogs = () => (
    <>
      <TimeoutWarning
        open={showTimeoutWarning}
        remainingSeconds={remainingSeconds}
        canExtend={sessionInfo?.can_extend ?? false}
        onExtend={handleExtend}
        onDismiss={() => setShowTimeoutWarning(false)}
      />
      <VoiceInputDialog
        open={showVoiceInputDialog}
        onEnable={handleEnableVoiceInput}
        onSkip={handleSkipVoiceInput}
      />
    </>
  );

  const renderChatInput = (fullscreen: boolean) => (
    <ChatInputArea
      inputText={inputText}
      onInputChange={setInputText}
      onSend={handleSendMessage}
      disabled={status === 'paused'}
      isSending={isLoading}
      isPlaying={isPlaying}
      error={error}
      recognitionState={recognitionState}
      interimText={interimText}
      onStartRecognition={handleStartRecognition}
      onStopRecognition={handleStopRecognition}
      recognitionError={recognitionError}
      autoSend={voiceSettings.autoSend}
      onToggleAutoSend={toggleAutoSend}
      voiceInputEnabled={voiceSettings.voiceInputEnabled}
      onToggleVoiceInputEnabled={toggleVoiceInputEnabled}
      characterName={character.name}
      isFullscreen={fullscreen}
    />
  );

  // 非フルスクリーン: ダークテーマレイアウト
  if (!isFullscreen) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        {/* ヘッダー */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-slate-700 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-100 leading-tight">
                {scenario.name}
              </h1>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                SESSION #{session?.session_id ? String(session.session_id).slice(-4) : '----'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {session && sessionInfo && (
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span>{String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-green-400" />
                  <span>{sessionInfo.turn_count}/20</span>
                </div>
              </div>
            )}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="flex items-center justify-center size-9 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                aria-label="全体表示"
              >
                <Maximize2 className="h-4 w-4 text-slate-300" />
              </button>
            )}
          </div>
        </header>

        {/* ステータスバー（一時停止・延長時のみ） */}
        {session && sessionInfo && (status === 'paused' || remainingSeconds <= 300) && (
          <SessionStatusBar
            status={status ?? 'active'}
            remainingSeconds={remainingSeconds}
            turnCount={sessionInfo.turn_count}
            canExtend={sessionInfo.can_extend}
            isPaused={status === 'paused'}
            onPause={pause}
            onResume={resume}
            onExtend={handleExtend}
            disabled={isLoading || sessionLoading || isPlaying}
            isFullscreen={false}
          />
        )}

        {/* メッセージ表示エリア */}
        <div className="flex-1 overflow-y-auto px-5 py-4 relative">
          {/* 一時停止中のオーバーレイ */}
          {status === 'paused' && (
            <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-10" data-testid="paused-overlay">
              <div className="text-center">
                <p className="text-lg text-slate-100 mb-4">
                  セッションは一時停止中です
                </p>
                <Button onClick={resume} disabled={sessionLoading}>
                  <Play className="h-4 w-4 mr-2" />
                  再開する
                </Button>
              </div>
            </div>
          )}

          {renderMessages(false)}

          {/* ローディング表示（Thinking indicator） */}
          {isLoading && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="size-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-xs">
                  {character.name.charAt(0)}
                </div>
                <span className="text-sm font-semibold text-slate-200">{character.name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-blue-500/20 text-blue-300">
                  考え中
                </span>
              </div>
              <div className="inline-flex items-center bg-slate-800 rounded-xl px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="size-2 rounded-full bg-slate-500 animate-bounce" />
                  <span className="size-2 rounded-full bg-slate-500 animate-bounce [animation-delay:0.15s]" />
                  <span className="size-2 rounded-full bg-slate-500 animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 入力エリア */}
        {renderChatInput(false)}
        {renderDialogs()}
      </div>
    );
  }

  // フルスクリーン: 各セクションを独立配置（pointer-events-none の入れ子を回避）
  return (
    <>
      {/* ヘッダー（グラスモーフィズム） — 上部固定 */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {character.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 leading-none">
              {character.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {session && sessionInfo && (
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>{sessionInfo.turn_count} Messages</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="flex items-center justify-center rounded-lg h-10 w-10 bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="履歴"
            >
              <History className="h-5 w-5 text-white" />
            </button>
            <button
              type="button"
              className="flex items-center justify-center rounded-lg h-10 w-10 bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="設定"
            >
              <Settings className="h-5 w-5 text-white" />
            </button>
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="flex items-center justify-center rounded-lg h-10 w-10 bg-blue-600 hover:bg-blue-500 transition-colors"
                aria-label="通常表示に戻す"
              >
                <Minimize2 className="h-5 w-5 text-white" />
              </button>
            )}
            <button
              type="button"
              onClick={handleEndSession}
              disabled={isLoading}
              className="flex items-center justify-center rounded-lg h-10 w-10 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              aria-label="終了"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* ステータスバー */}
      {session && sessionInfo && (status === 'paused' || remainingSeconds <= 300) && (
        <div className="absolute top-[65px] left-0 right-0 z-20">
          <SessionStatusBar
            status={status ?? 'active'}
            remainingSeconds={remainingSeconds}
            turnCount={sessionInfo.turn_count}
            canExtend={sessionInfo.can_extend}
            isPaused={status === 'paused'}
            onPause={pause}
            onResume={resume}
            onExtend={handleExtend}
            disabled={isLoading || sessionLoading || isPlaying}
            isFullscreen={true}
          />
        </div>
      )}

      {/* メッセージ表示エリア — 右側パネル */}
      <div className="absolute right-4 top-[72px] bottom-[140px] z-10 w-full max-w-[400px] flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-hide">
          {/* 一時停止中のオーバーレイ */}
          {status === 'paused' && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-30" data-testid="paused-overlay">
              <div className="text-center">
                <p className="text-lg text-slate-100 mb-4">
                  セッションは一時停止中です
                </p>
                <Button onClick={resume} disabled={sessionLoading}>
                  <Play className="h-4 w-4 mr-2" />
                  再開する
                </Button>
              </div>
            </div>
          )}

          {renderMessages(true)}

          {/* ローディング表示（Thinking indicator） */}
          {isLoading && (
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest drop-shadow-md">{character.name}</span>
              </div>
              <div className="bg-black/20 backdrop-blur-md rounded-2xl rounded-tl-none p-3 border border-white/5 flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span className="size-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="size-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <p className="text-slate-400 text-xs italic">{character.name} is thinking...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 入力エリア — 下部固定 */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {renderChatInput(true)}
      </div>
      {renderDialogs()}
    </>
  );
}
