/**
 * F-006: AI会話生成 - チャットAPI関数
 */

import { ApiClient } from './client';
import {
  ChatSession,
  ChatMessage,
  SessionInfo,
  SessionPauseResponse,
  SessionResumeResponse,
  SessionExtendResponse,
} from '@/types';

const api = new ApiClient();

/**
 * セッション作成パラメータ
 */
export interface CreateSessionParams {
  scenario_id: number;
  character_id: number;
}

/**
 * メッセージ送信パラメータ
 */
export interface SendMessageParams {
  content: string;
  content_type?: 'text';
}

/**
 * セッション終了レスポンス
 */
export interface SessionEndResponse {
  session_id: string;
  status: 'ended';
  total_turns: number;
  duration_seconds: number;
  ended_at: string;
}

/**
 * 会話セッションを開始する
 *
 * @param params - シナリオIDとキャラクターID
 * @returns セッション情報と初期メッセージ
 *
 * @example
 * ```ts
 * const session = await createChatSession({
 *   scenario_id: 1,
 *   character_id: 1,
 * });
 * ```
 */
export async function createChatSession(
  params: CreateSessionParams
): Promise<ChatSession> {
  return api.post<ChatSession>('/api/v1/chat/sessions', params);
}

/**
 * メッセージを送信してAI応答を取得する
 *
 * @param sessionId - セッションID
 * @param params - メッセージ内容
 * @returns ユーザーメッセージとAI応答
 *
 * @example
 * ```ts
 * const message = await sendChatMessage(sessionId, {
 *   content: 'コーヒーをください',
 *   content_type: 'text',
 * });
 * ```
 */
export async function sendChatMessage(
  sessionId: string,
  params: SendMessageParams
): Promise<ChatMessage> {
  return api.post<ChatMessage>(
    `/api/v1/chat/sessions/${sessionId}/messages`,
    params
  );
}

/**
 * 会話セッションを終了する
 *
 * @param sessionId - セッションID
 * @returns セッション統計情報
 *
 * @example
 * ```ts
 * const result = await endChatSession(sessionId);
 * console.log(`Total turns: ${result.total_turns}`);
 * ```
 */
export async function endChatSession(
  sessionId: string
): Promise<SessionEndResponse> {
  return api.delete<SessionEndResponse>(
    `/api/v1/chat/sessions/${sessionId}`
  );
}

/**
 * セッション情報を取得する
 *
 * @param sessionId - セッションID
 * @returns セッション情報（残り時間、延長可否を含む）
 *
 * @example
 * ```ts
 * const info = await getSessionInfo(sessionId);
 * console.log(`Remaining: ${info.remaining_seconds}s`);
 * ```
 */
export async function getSessionInfo(
  sessionId: string
): Promise<SessionInfo> {
  return api.get<SessionInfo>(
    `/api/v1/chat/sessions/${sessionId}`
  );
}

/**
 * セッションを一時停止する
 *
 * @param sessionId - セッションID
 * @returns 一時停止レスポンス
 *
 * @example
 * ```ts
 * const result = await pauseSession(sessionId);
 * console.log(result.message);
 * ```
 */
export async function pauseSession(
  sessionId: string
): Promise<SessionPauseResponse> {
  return api.post<SessionPauseResponse>(
    `/api/v1/chat/sessions/${sessionId}/pause`
  );
}

/**
 * セッションを再開する
 *
 * @param sessionId - セッションID
 * @returns 再開レスポンス
 *
 * @example
 * ```ts
 * const result = await resumeSession(sessionId);
 * console.log(result.message);
 * ```
 */
export async function resumeSession(
  sessionId: string
): Promise<SessionResumeResponse> {
  return api.post<SessionResumeResponse>(
    `/api/v1/chat/sessions/${sessionId}/resume`
  );
}

/**
 * セッションを延長する
 *
 * @param sessionId - セッションID
 * @param extensionMinutes - 延長時間（分、デフォルト30、最大60）
 * @returns 延長レスポンス
 *
 * @example
 * ```ts
 * const result = await extendSession(sessionId, 30);
 * console.log(`Extended by ${result.extended_minutes} minutes`);
 * ```
 */
export async function extendSession(
  sessionId: string,
  extensionMinutes: number = 30
): Promise<SessionExtendResponse> {
  return api.post<SessionExtendResponse>(
    `/api/v1/chat/sessions/${sessionId}/extend`,
    { extension_minutes: extensionMinutes }
  );
}

/**
 * 会話履歴メッセージ
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * セッション会話履歴レスポンス
 */
export interface SessionHistoryResponse {
  session_id: string;
  messages: ConversationMessage[];
}

/**
 * セッションの会話履歴を取得する
 *
 * @param sessionId - セッションID
 * @returns 会話履歴
 *
 * @example
 * ```ts
 * const history = await getSessionHistory(sessionId);
 * console.log(`Messages: ${history.messages.length}`);
 * ```
 */
export async function getSessionHistory(
  sessionId: string
): Promise<SessionHistoryResponse> {
  return api.get<SessionHistoryResponse>(
    `/api/v1/chat/sessions/${sessionId}/history`
  );
}

/**
 * メッセージ更新パラメータ
 */
export interface UpdateMessageParams {
  content: string;
}

/**
 * メッセージ更新レスポンス
 */
export interface MessageUpdateResponse {
  message_id: string;
  content: string;
  updated_at: string;
}

/**
 * メッセージを更新する
 *
 * @param sessionId - セッションID
 * @param messageIndex - 会話履歴内のメッセージインデックス
 * @param params - 更新内容
 * @returns 更新結果
 *
 * @example
 * ```ts
 * const result = await updateMessage(sessionId, 2, { content: '修正後のメッセージ' });
 * console.log(`Updated: ${result.updated_at}`);
 * ```
 */
export async function updateMessage(
  sessionId: string,
  messageIndex: number,
  params: UpdateMessageParams
): Promise<MessageUpdateResponse> {
  return api.put<MessageUpdateResponse>(
    `/api/v1/chat/sessions/${sessionId}/messages/${messageIndex}`,
    params
  );
}
