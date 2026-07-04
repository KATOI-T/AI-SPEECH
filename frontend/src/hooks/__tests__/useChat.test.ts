/**
 * F-006: AI会話生成 - useChatフックのテスト
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../useChat';
import * as chatApi from '@/lib/api/chat';
import { ChatSession, ChatMessage } from '@/types';

// APIモック
jest.mock('@/lib/api/chat');

const mockCreateChatSession = chatApi.createChatSession as jest.MockedFunction<
  typeof chatApi.createChatSession
>;
const mockSendChatMessage = chatApi.sendChatMessage as jest.MockedFunction<
  typeof chatApi.sendChatMessage
>;
const mockEndChatSession = chatApi.endChatSession as jest.MockedFunction<
  typeof chatApi.endChatSession
>;

describe('useChat', () => {
  const mockSession: ChatSession = {
    session_id: 'test-session-id',
    scenario: {
      id: 1,
      name: 'Test Scenario',
      description: 'Test Description',
      situation: 'Test Situation',
      goal: 'Test Goal',
      evaluation_criteria: null,
      background_image_paths: [],
      is_active: true,
      created_at: '2026-03-08T00:00:00Z',
      updated_at: '2026-03-08T00:00:00Z',
    },
    character: {
      id: 1,
      name: 'Test Character',
      persona: 'Test Persona',
      speaking_style: 'Test Style',
      system_prompt: 'Test Prompt',
      model_path: '/models/test.vrm',
      model_type: 'vrm',
      voice_config: null,
      animation_config: null,
      is_active: true,
      created_at: '2026-03-08T00:00:00Z',
      updated_at: '2026-03-08T00:00:00Z',
    },
    initial_message: {
      content: 'Hello!',
      emotion: 'happy',
      audio_base64: 'base64data',
      visemes: [],
    },
    created_at: '2026-03-08T00:00:00Z',
    expires_at: '2026-03-08T00:30:00Z',
  };

  const mockMessage: ChatMessage = {
    message_id: 'msg-1',
    user_message: {
      content: 'User message',
      timestamp: '2026-03-08T00:01:00Z',
    },
    response: {
      content: 'AI response',
      emotion: 'neutral',
      audio_base64: 'base64data',
      visemes: [],
    },
    turn_count: 1,
    timestamp: '2026-03-08T00:01:01Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('should start a session successfully', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);

      const onAudioReady = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onAudioReady })
      );

      expect(result.current.session).toBeNull();
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(onAudioReady).toHaveBeenCalledWith(
        'base64data',
        []
      );
    });

    it('should handle errors when starting session', async () => {
      mockCreateChatSession.mockRejectedValue(
        new Error('Failed to create session')
      );

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onError })
      );

      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBe('Failed to create session');
      expect(onError).toHaveBeenCalledWith('Failed to create session');
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);
      mockSendChatMessage.mockResolvedValue(mockMessage);

      const onAudioReady = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onAudioReady })
      );

      // Start session first
      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      onAudioReady.mockClear();

      // Send message
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(mockMessage);
      expect(onAudioReady).toHaveBeenCalledWith(
        'base64data',
        []
      );
    });

    it('should handle error when session is not started', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onError })
      );

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.error).toBe('セッションが開始されていません');
      expect(onError).toHaveBeenCalledWith('セッションが開始されていません');
    });

    it('should handle API error when sending message', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);
      mockSendChatMessage.mockRejectedValue(
        new Error('Failed to send message')
      );

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onError })
      );

      // Start session first
      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      // Send message
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.error).toBe('Failed to send message');
      expect(onError).toHaveBeenCalledWith('Failed to send message');
    });
  });

  describe('onEmotionChange', () => {
    it('should call onEmotionChange with initial message emotion on startSession', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);

      const onEmotionChange = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onEmotionChange })
      );

      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      expect(onEmotionChange).toHaveBeenCalledWith('happy');
    });

    it('should call onEmotionChange with "thinking" when sending message', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);
      mockSendChatMessage.mockResolvedValue(mockMessage);

      const onEmotionChange = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onEmotionChange })
      );

      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      onEmotionChange.mockClear();

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(onEmotionChange).toHaveBeenCalledWith('thinking');
    });

    it('should call onEmotionChange with response emotion after receiving message', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);
      mockSendChatMessage.mockResolvedValue(mockMessage);

      const onEmotionChange = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onEmotionChange })
      );

      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      onEmotionChange.mockClear();

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(onEmotionChange).toHaveBeenCalledWith('neutral');
    });

    it('should call onEmotionChange in order: thinking then response emotion', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);
      mockSendChatMessage.mockResolvedValue(mockMessage);

      const onEmotionChange = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onEmotionChange })
      );

      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      onEmotionChange.mockClear();

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(onEmotionChange.mock.calls).toEqual([
        ['thinking'],
        ['neutral'],
      ]);
    });

    it('should not throw when onEmotionChange is not provided', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);
      mockSendChatMessage.mockResolvedValue(mockMessage);

      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.messages).toHaveLength(1);
    });

    it('should call onEmotionChange with "thinking" but not response emotion on API error', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);
      mockSendChatMessage.mockRejectedValue(new Error('API error'));

      const onEmotionChange = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onEmotionChange })
      );

      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      onEmotionChange.mockClear();

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(onEmotionChange).toHaveBeenCalledTimes(1);
      expect(onEmotionChange).toHaveBeenCalledWith('thinking');
    });
  });

  describe('endSession', () => {
    it('should end a session successfully', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);
      mockEndChatSession.mockResolvedValue({
        session_id: 'test-session-id',
        status: 'ended',
        total_turns: 1,
        duration_seconds: 60,
        ended_at: '2026-03-08T00:01:00Z',
      });

      const { result } = renderHook(() => useChat());

      // Start session first
      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      expect(result.current.session).not.toBeNull();

      // End session
      await act(async () => {
        await result.current.endSession();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.messages).toHaveLength(0);
    });

    it('should handle error when ending session', async () => {
      mockCreateChatSession.mockResolvedValue(mockSession);
      mockEndChatSession.mockRejectedValue(
        new Error('Failed to end session')
      );

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useChat({ onError })
      );

      // Start session first
      await act(async () => {
        await result.current.startSession({
          scenario_id: 1,
          character_id: 1,
        });
      });

      // End session
      await act(async () => {
        await result.current.endSession();
      });

      expect(result.current.error).toBe('Failed to end session');
      expect(onError).toHaveBeenCalledWith('Failed to end session');
    });
  });
});
