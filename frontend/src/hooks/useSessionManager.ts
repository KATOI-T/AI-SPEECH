/**
 * F-009: セッション管理フック
 * セッションの状態管理、一時停止/再開/延長、タイムアウト監視
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SessionInfo,
  SessionStatus,
} from '@/types';
import {
  getSessionInfo,
  pauseSession,
  resumeSession,
  extendSession,
} from '@/lib/api/chat';

interface UseSessionManagerOptions {
  sessionId: string | null;
  onWarning?: (remainingSeconds: number) => void;
  onTimeout?: () => void;
  onError?: (error: string) => void;
  warningThresholds?: number[];  // 警告を出す残り秒数
}

interface UseSessionManagerReturn {
  sessionInfo: SessionInfo | null;
  status: SessionStatus | null;
  remainingSeconds: number;
  isLoading: boolean;
  error: string | null;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  extend: (minutes?: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_WARNING_THRESHOLDS = [300, 60];  // 5分、1分

/**
 * セッション管理フック
 *
 * @param options - オプション設定
 * @returns セッション管理関数と状態
 *
 * @example
 * ```tsx
 * const {
 *   sessionInfo,
 *   status,
 *   remainingSeconds,
 *   pause,
 *   resume,
 *   extend,
 * } = useSessionManager({
 *   sessionId: session?.session_id ?? null,
 *   onWarning: (remaining) => {
 *     if (remaining <= 300) {
 *       setShowTimeoutWarning(true);
 *     }
 *   },
 *   onTimeout: () => {
 *     onEnd?.();
 *   },
 *   onError: (err) => {
 *     console.error('Session error:', err);
 *   },
 * });
 * ```
 */
export function useSessionManager(
  options: UseSessionManagerOptions
): UseSessionManagerReturn {
  const {
    sessionId,
    onWarning,
    onTimeout,
    onError,
    warningThresholds = DEFAULT_WARNING_THRESHOLDS,
  } = options;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const warningsShown = useRef<Set<number>>(new Set());

  // セッション情報を取得
  const refresh = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const info = await getSessionInfo(sessionId);
      setSessionInfo(info);
      setRemainingSeconds(info.remaining_seconds);
      warningsShown.current.clear();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '情報取得に失敗しました';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, onError]);

  // 一時停止
  const pause = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await pauseSession(sessionId);
      setSessionInfo((prev) => prev ? {
        ...prev,
        status: 'paused',
        paused_at: result.paused_at,
        expires_at: result.expires_at,
      } : null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '一時停止に失敗しました';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, onError]);

  // 再開
  const resume = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await resumeSession(sessionId);
      setSessionInfo((prev) => prev ? {
        ...prev,
        status: 'active',
        paused_at: null,
        expires_at: result.expires_at,
        turn_count: result.turn_count,
      } : null);
      await refresh();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '再開に失敗しました';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, onError, refresh]);

  // 延長
  const extend = useCallback(async (minutes: number = 30) => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await extendSession(sessionId, minutes);
      setSessionInfo((prev) => prev ? {
        ...prev,
        expires_at: result.expires_at,
      } : null);
      warningsShown.current.clear();
      await refresh();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '延長に失敗しました';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, onError, refresh]);

  // カウントダウンタイマー
  useEffect(() => {
    if (!sessionInfo || sessionInfo.status !== 'active') return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1);

        // 警告チェック
        for (const threshold of warningThresholds) {
          if (next <= threshold && !warningsShown.current.has(threshold)) {
            warningsShown.current.add(threshold);
            onWarning?.(next);
          }
        }

        // タイムアウト
        if (next === 0) {
          onTimeout?.();
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionInfo, warningThresholds, onWarning, onTimeout]);

  // 初回読み込み（sessionIdが変更されたときのみ実行）
  useEffect(() => {
    if (!sessionId) return;

    const fetchInfo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const info = await getSessionInfo(sessionId);
        setSessionInfo(info);
        setRemainingSeconds(info.remaining_seconds);
        warningsShown.current.clear();
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : '情報取得に失敗しました';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return {
    sessionInfo,
    status: sessionInfo?.status ?? null,
    remainingSeconds,
    isLoading,
    error,
    pause,
    resume,
    extend,
    refresh,
  };
}
