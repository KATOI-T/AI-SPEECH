/**
 * F-009: useSessionManager フックのテスト
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionManager } from '../useSessionManager';
import * as chatApi from '@/lib/api/chat';

// APIモック
jest.mock('@/lib/api/chat');

describe('useSessionManager', () => {
  const mockSessionInfo = {
    session_id: 'test-session-id',
    scenario_id: 1,
    character_id: 1,
    status: 'active' as const,
    turn_count: 3,
    created_at: '2026-03-09T12:00:00Z',
    expires_at: '2026-03-09T12:30:00Z',
    last_activity_at: '2026-03-09T12:15:00Z',
    paused_at: null,
    remaining_seconds: 900,
    can_extend: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('初期化', () => {
    it('セッション情報を取得する', async () => {
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(mockSessionInfo);

      const { result } = renderHook(() =>
        useSessionManager({ sessionId: 'test-session-id' })
      );

      await waitFor(() => {
        expect(result.current.sessionInfo).toEqual(mockSessionInfo);
      });

      expect(chatApi.getSessionInfo).toHaveBeenCalledWith('test-session-id');
      expect(result.current.status).toBe('active');
      expect(result.current.remainingSeconds).toBe(900);
    });

    it('sessionIdがnullの場合は何もしない', () => {
      const { result } = renderHook(() =>
        useSessionManager({ sessionId: null })
      );

      expect(result.current.sessionInfo).toBeNull();
      expect(chatApi.getSessionInfo).not.toHaveBeenCalled();
    });
  });

  describe('一時停止', () => {
    it('セッションを一時停止できる', async () => {
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(mockSessionInfo);
      (chatApi.pauseSession as jest.Mock).mockResolvedValue({
        session_id: 'test-session-id',
        status: 'paused',
        paused_at: '2026-03-09T12:20:00Z',
        expires_at: '2026-03-09T13:20:00Z',
        message: 'セッションを一時停止しました',
      });

      const { result } = renderHook(() =>
        useSessionManager({ sessionId: 'test-session-id' })
      );

      await waitFor(() => {
        expect(result.current.sessionInfo).not.toBeNull();
      });

      await act(async () => {
        await result.current.pause();
      });

      expect(chatApi.pauseSession).toHaveBeenCalledWith('test-session-id');
      expect(result.current.sessionInfo?.status).toBe('paused');
    });

    it('一時停止エラーを処理する', async () => {
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(mockSessionInfo);
      (chatApi.pauseSession as jest.Mock).mockRejectedValue(
        new Error('一時停止に失敗しました')
      );

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useSessionManager({ sessionId: 'test-session-id', onError })
      );

      await waitFor(() => {
        expect(result.current.sessionInfo).not.toBeNull();
      });

      await act(async () => {
        await result.current.pause();
      });

      expect(result.current.error).toBe('一時停止に失敗しました');
      expect(onError).toHaveBeenCalledWith('一時停止に失敗しました');
    });
  });

  describe('再開', () => {
    it('セッションを再開できる', async () => {
      const pausedSessionInfo = { ...mockSessionInfo, status: 'paused' as const };
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(pausedSessionInfo);
      (chatApi.resumeSession as jest.Mock).mockResolvedValue({
        session_id: 'test-session-id',
        status: 'active',
        resumed_at: '2026-03-09T12:30:00Z',
        expires_at: '2026-03-09T13:00:00Z',
        turn_count: 3,
        message: 'セッションを再開しました',
      });

      const { result } = renderHook(() =>
        useSessionManager({ sessionId: 'test-session-id' })
      );

      await waitFor(() => {
        expect(result.current.sessionInfo).not.toBeNull();
      });

      await act(async () => {
        await result.current.resume();
      });

      expect(chatApi.resumeSession).toHaveBeenCalledWith('test-session-id');
    });
  });

  describe('延長', () => {
    it('セッションを延長できる', async () => {
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(mockSessionInfo);
      (chatApi.extendSession as jest.Mock).mockResolvedValue({
        session_id: 'test-session-id',
        status: 'active',
        previous_expires_at: '2026-03-09T12:30:00Z',
        expires_at: '2026-03-09T13:00:00Z',
        extended_minutes: 30,
        message: 'セッションを30分延長しました',
      });

      const { result } = renderHook(() =>
        useSessionManager({ sessionId: 'test-session-id' })
      );

      await waitFor(() => {
        expect(result.current.sessionInfo).not.toBeNull();
      });

      await act(async () => {
        await result.current.extend(30);
      });

      expect(chatApi.extendSession).toHaveBeenCalledWith('test-session-id', 30);
    });
  });

  describe('タイマー', () => {
    it('残り時間をカウントダウンする', async () => {
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(mockSessionInfo);

      const { result } = renderHook(() =>
        useSessionManager({ sessionId: 'test-session-id' })
      );

      await waitFor(() => {
        expect(result.current.sessionInfo).not.toBeNull();
      });

      const initialRemaining = result.current.remainingSeconds;

      // 3秒進める
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.remainingSeconds).toBe(initialRemaining - 3);
    });

    it('警告閾値で警告コールバックを呼ぶ', async () => {
      const sessionWithLowTime = {
        ...mockSessionInfo,
        remaining_seconds: 301,
      };
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(sessionWithLowTime);

      const onWarning = jest.fn();
      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'test-session-id',
          onWarning,
          warningThresholds: [300, 60],
        })
      );

      await waitFor(() => {
        expect(result.current.sessionInfo).not.toBeNull();
      });

      // 2秒進めて300秒以下にする
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onWarning).toHaveBeenCalled();
    });

    it.skip('タイムアウト時にコールバックを呼ぶ', async () => {
      const sessionWithLowTime = {
        ...mockSessionInfo,
        remaining_seconds: 2,
      };
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(sessionWithLowTime);

      const onTimeout = jest.fn();
      renderHook(() =>
        useSessionManager({
          sessionId: 'test-session-id',
          onTimeout,
        })
      );

      // セッション情報が読み込まれるまで待つ
      await waitFor(() => {
        expect(onTimeout).not.toHaveBeenCalled();
      });

      // 3秒進めて0秒にする
      await act(async () => {
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      // onTimeoutが呼ばれるまで待つ
      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalled();
      });
    });

    it('paused状態ではタイマーを停止する', async () => {
      const pausedSessionInfo = {
        ...mockSessionInfo,
        status: 'paused' as const,
      };
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(pausedSessionInfo);

      const { result } = renderHook(() =>
        useSessionManager({ sessionId: 'test-session-id' })
      );

      await waitFor(() => {
        expect(result.current.sessionInfo).not.toBeNull();
      });

      const initialRemaining = result.current.remainingSeconds;

      // 3秒進める
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // paused状態ではカウントダウンしない
      expect(result.current.remainingSeconds).toBe(initialRemaining);
    });
  });

  describe('refresh', () => {
    it('セッション情報を再取得する', async () => {
      (chatApi.getSessionInfo as jest.Mock).mockResolvedValue(mockSessionInfo);

      const { result } = renderHook(() =>
        useSessionManager({ sessionId: 'test-session-id' })
      );

      await waitFor(() => {
        expect(result.current.sessionInfo).not.toBeNull();
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.refresh();
      });

      expect(chatApi.getSessionInfo).toHaveBeenCalledWith('test-session-id');
    });
  });
});
