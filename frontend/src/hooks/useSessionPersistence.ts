/**
 * F-009: セッション永続化フック
 *
 * sessionStorageを使用してセッションIDを永続化し、
 * ページ再ロード時にセッションを復元できるようにする。
 */

const SESSION_STORAGE_KEY = 'chat_session_id';

/**
 * useSessionPersistenceフックの戻り値
 */
interface UseSessionPersistenceReturn {
  /** 保存されているセッションID（なければnull） */
  savedSessionId: string | null;
  /** セッションIDを保存する */
  saveSessionId: (sessionId: string) => void;
  /** セッションIDをクリアする */
  clearSessionId: () => void;
}

/**
 * セッションIDの永続化を管理するカスタムフック
 *
 * sessionStorageを使用してセッションIDを保存・取得・削除する。
 * タブを閉じると自動的にクリアされ、複数タブで独立したセッションを維持できる。
 *
 * @returns セッションID管理関数と保存済みセッションID
 *
 * @example
 * ```tsx
 * const { savedSessionId, saveSessionId, clearSessionId } = useSessionPersistence();
 *
 * // セッション作成時にIDを保存
 * useEffect(() => {
 *   if (session?.session_id) {
 *     saveSessionId(session.session_id);
 *   }
 * }, [session?.session_id]);
 *
 * // セッション終了時にIDをクリア
 * const handleEnd = () => {
 *   clearSessionId();
 *   onEnd?.();
 * };
 * ```
 */
export function useSessionPersistence(): UseSessionPersistenceReturn {
  /**
   * 保存されているセッションIDを取得
   */
  const getSavedSessionId = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  };

  /**
   * セッションIDを保存
   */
  const saveSessionId = (sessionId: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  };

  /**
   * セッションIDをクリア
   */
  const clearSessionId = (): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  return {
    savedSessionId: getSavedSessionId(),
    saveSessionId,
    clearSessionId,
  };
}
