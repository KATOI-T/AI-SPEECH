/**
 * F-006: AI会話生成 - useChatフック
 * F-009: セッション永続化・復元機能
 */

import { useState, useCallback } from 'react';
import { ChatSession, ChatMessage, Viseme, SessionInfo } from '@/types';
import {
  createChatSession,
  sendChatMessage,
  endChatSession,
  getSessionInfo,
  getSessionHistory,
  updateMessage as updateMessageApi,
  CreateSessionParams,
} from '@/lib/api/chat';

/**
 * useChatフックのオプション
 */
interface UseChatOptions {
  /** 音声準備完了時のコールバック */
  onAudioReady?: (audioBase64: string, visemes: Viseme[]) => void;
  /** エラー発生時のコールバック */
  onError?: (error: string) => void;
  /** 感情変更時のコールバック */
  onEmotionChange?: (emotion: string) => void;
}

/**
 * 復元されたメッセージ（音声なし）
 */
interface RestoredMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * useChatフックの戻り値
 */
interface UseChatReturn {
  /** 現在のセッション情報 */
  session: ChatSession | null;
  /** 会話履歴（ユーザー+AI応答のペア） */
  messages: ChatMessage[];
  /** 復元された会話履歴（音声なし、テキストのみ） */
  restoredMessages: RestoredMessage[];
  /** ローディング状態 */
  isLoading: boolean;
  /** セッション復元中フラグ */
  isRestoring: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** セッションを開始する */
  startSession: (params: CreateSessionParams) => Promise<void>;
  /** メッセージを送信する */
  sendMessage: (content: string) => Promise<void>;
  /** セッションを終了する */
  endSession: () => Promise<void>;
  /** 既存セッションを復元する */
  restoreSession: (sessionId: string) => Promise<boolean>;
  /** メッセージを更新する */
  updateMessage: (messageIndex: number, content: string) => Promise<boolean>;
}

/**
 * チャット会話を管理するカスタムフック
 *
 * セッションの作成、メッセージの送受信、セッションの終了を管理し、
 * 音声データとVisemeデータをコールバックで通知する。
 *
 * @param options - フックオプション
 * @returns セッション管理関数と状態
 *
 * @example
 * ```tsx
 * const { session, messages, isLoading, startSession, sendMessage } = useChat({
 *   onAudioReady: (audioBase64, visemes) => {
 *     // 音声を再生し、リップシンクを適用
 *     playAudio(audioBase64);
 *     applyLipSync(visemes);
 *   },
 *   onError: (error) => {
 *     console.error('Chat error:', error);
 *   },
 * });
 *
 * // セッション開始
 * await startSession({ scenario_id: 1, character_id: 1 });
 *
 * // メッセージ送信
 * await sendMessage('コーヒーをください');
 * ```
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [restoredMessages, setRestoredMessages] = useState<RestoredMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onAudioReady, onError, onEmotionChange } = options;

  /**
   * セッションを開始する
   *
   * シナリオとキャラクターを指定してセッションを作成し、
   * 初期メッセージの音声を通知する。
   */
  const startSession = useCallback(
    async (params: CreateSessionParams) => {
      setIsLoading(true);
      setError(null);
      setRestoredMessages([]);

      try {
        const sessionData = await createChatSession(params);
        setSession(sessionData);
        setMessages([]);

        // 初期メッセージの感情を通知
        if (sessionData.initial_message) {
          onEmotionChange?.(sessionData.initial_message.emotion);
        }

        // 初期メッセージの音声を通知
        if (onAudioReady && sessionData.initial_message) {
          onAudioReady(
            sessionData.initial_message.audio_base64,
            sessionData.initial_message.visemes
          );
        }
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : 'セッション開始に失敗しました';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [onAudioReady, onError, onEmotionChange]
  );

  /**
   * 既存セッションを復元する
   *
   * セッションIDから既存のセッションと会話履歴を取得し、
   * 状態を復元する。音声データは含まれない。
   *
   * @param sessionId - 復元するセッションID
   * @returns 復元成功したらtrue、失敗したらfalse
   */
  const restoreSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      setIsRestoring(true);
      setError(null);

      try {
        // 1. セッション情報を取得
        const sessionInfo: SessionInfo = await getSessionInfo(sessionId);

        // 2. ステータスチェック（active/paused以外は復元不可）
        if (sessionInfo.status !== 'active' && sessionInfo.status !== 'paused') {
          return false;
        }

        // 3. 会話履歴を取得
        const history = await getSessionHistory(sessionId);

        // 4. 状態に反映（音声なしでテキストのみ復元）
        // 最小限のセッション情報をセット（initial_messageはダミー）
        setSession({
          session_id: sessionId,
          scenario: { id: sessionInfo.scenario_id } as ChatSession['scenario'],
          character: { id: sessionInfo.character_id } as ChatSession['character'],
          initial_message: {
            content: '',
            emotion: 'neutral',
            audio_base64: '',
            visemes: [],
          },
          created_at: sessionInfo.created_at,
          expires_at: sessionInfo.expires_at,
        });

        // 復元されたメッセージを設定（音声なし）
        setRestoredMessages(history.messages);
        setMessages([]);

        return true;
      } catch (e) {
        // 復元失敗（セッションが見つからない、期限切れなど）
        const errorMessage =
          e instanceof Error ? e.message : 'セッション復元に失敗しました';
        console.warn('Session restore failed:', errorMessage);
        return false;
      } finally {
        setIsRestoring(false);
      }
    },
    []
  );

  /**
   * メッセージを送信する
   *
   * ユーザーメッセージを送信し、AI応答を受け取る。
   * AI応答の音声データをコールバックで通知する。
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!session) {
        const errorMessage = 'セッションが開始されていません';
        setError(errorMessage);
        onError?.(errorMessage);
        return;
      }

      setIsLoading(true);
      setError(null);
      onEmotionChange?.("thinking");

      try {
        const response = await sendChatMessage(session.session_id, {
          content,
          content_type: 'text',
        });

        setMessages((prev) => [...prev, response]);

        // 感情を通知
        onEmotionChange?.(response.response.emotion);

        // 音声を通知
        if (onAudioReady) {
          onAudioReady(
            response.response.audio_base64,
            response.response.visemes
          );
        }
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : 'メッセージ送信に失敗しました';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [session, onAudioReady, onError, onEmotionChange]
  );

  /**
   * セッションを終了する
   *
   * サーバー側のセッションを削除し、状態をリセットする。
   */
  const endSession = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);

    try {
      await endChatSession(session.session_id);
      setSession(null);
      setMessages([]);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'セッション終了に失敗しました';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [session, onError]);

  /**
   * メッセージを更新する
   *
   * @param messageIndex - 会話履歴内のメッセージインデックス
   * @param content - 新しいメッセージ内容
   * @returns 更新成功したらtrue
   */
  const updateMessage = useCallback(
    async (messageIndex: number, content: string): Promise<boolean> => {
      if (!session) {
        const errorMessage = 'セッションが開始されていません';
        setError(errorMessage);
        onError?.(errorMessage);
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        await updateMessageApi(session.session_id, messageIndex, { content });

        // ローカル状態も更新（復元メッセージの場合）
        setRestoredMessages((prev) => {
          const updated = [...prev];
          if (messageIndex < updated.length) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              content,
            };
          }
          return updated;
        });

        return true;
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : 'メッセージ更新に失敗しました';
        setError(errorMessage);
        onError?.(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [session, onError]
  );

  return {
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
  };
}
