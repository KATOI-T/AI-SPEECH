/**
 * F-006: AI会話生成 - ChatSessionコンポーネントのテスト
 * F-009: セッション永続化・復元機能対応
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatSession } from '../ChatSession';
import * as useChatHook from '@/hooks/useChat';
import * as useLipSyncHook from '@/hooks/useLipSync';
import * as useSessionPersistenceHook from '@/hooks/useSessionPersistence';
import { Scenario, Character } from '@/types';

// フックのモック
jest.mock('@/hooks/useChat');
jest.mock('@/hooks/useLipSync');
jest.mock('@/hooks/useSessionPersistence');

const mockUseChat = useChatHook.useChat as jest.MockedFunction<
  typeof useChatHook.useChat
>;
const mockUseLipSync = useLipSyncHook.useLipSync as jest.MockedFunction<
  typeof useLipSyncHook.useLipSync
>;
const mockUseSessionPersistence = useSessionPersistenceHook.useSessionPersistence as jest.MockedFunction<
  typeof useSessionPersistenceHook.useSessionPersistence
>;

describe('ChatSession', () => {
  const mockScenario: Scenario = {
    id: 1,
    name: 'Cafe Service',
    description: 'Practice cafe service',
    situation: 'You are a cafe staff member',
    goal: 'Provide excellent service',
    evaluation_criteria: null,
    background_image_paths: [],
    is_active: true,
    created_at: '2026-03-08T00:00:00Z',
    updated_at: '2026-03-08T00:00:00Z',
  };

  const mockCharacter: Character = {
    id: 1,
    name: 'Miku',
    persona: 'Cheerful cafe staff',
    speaking_style: 'Polite',
    system_prompt: 'You are Miku',
    model_path: '/models/miku.vrm',
    model_type: 'vrm',
    voice_config: null,
    animation_config: null,
    is_active: true,
    created_at: '2026-03-08T00:00:00Z',
    updated_at: '2026-03-08T00:00:00Z',
  };

  const mockSession = {
    session_id: 'test-session',
    scenario: mockScenario,
    character: mockCharacter,
    initial_message: {
      content: 'Welcome to our cafe!',
      emotion: 'happy',
      audio_base64: 'base64data',
      visemes: [],
    },
    created_at: '2026-03-08T00:00:00Z',
    expires_at: '2026-03-08T00:30:00Z',
  };

  const defaultMockUseChat = {
    session: mockSession,
    messages: [],
    restoredMessages: [],
    isLoading: false,
    isRestoring: false,
    error: null,
    startSession: jest.fn(),
    sendMessage: jest.fn(),
    endSession: jest.fn(),
    restoreSession: jest.fn().mockResolvedValue(false),
    updateMessage: jest.fn(),
  };

  const defaultMockUseLipSync = {
    controller: null,
    reset: jest.fn(),
  };

  const defaultMockUseSessionPersistence = {
    savedSessionId: null,
    saveSessionId: jest.fn(),
    clearSessionId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChat.mockReturnValue(defaultMockUseChat);
    mockUseLipSync.mockReturnValue(defaultMockUseLipSync);
    mockUseSessionPersistence.mockReturnValue(defaultMockUseSessionPersistence);

    // Audio要素のモック
    global.Audio = jest.fn().mockImplementation(() => ({
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      onended: null,
    })) as any;
  });

  describe('Rendering', () => {
    it('should render session header with scenario and character names', () => {
      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      expect(screen.getByText('Cafe Service')).toBeInTheDocument();
      expect(screen.getByText(/SESSION #/)).toBeInTheDocument();
    });

    it('should render initial message when session exists', () => {
      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      expect(screen.getByText('Welcome to our cafe!')).toBeInTheDocument();
    });

    it('should render message input', () => {
      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      const input = screen.getByPlaceholderText('メッセージを入力してください...');
      expect(input).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      const button = screen.getByRole('button', { name: '送信' });
      expect(button).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(
        (btn) => btn.querySelector('svg') !== null
      );
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Session initialization', () => {
    it('should start session on mount', () => {
      const startSession = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        startSession,
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      expect(startSession).toHaveBeenCalledWith({
        scenario_id: 1,
        character_id: 1,
      });
    });
  });

  describe('Message sending', () => {
    it('should send message when send button is clicked', async () => {
      const sendMessage = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        sendMessage,
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      const input = screen.getByPlaceholderText('メッセージを入力してください...') as HTMLInputElement;
      const button = screen.getByRole('button', { name: '送信' });

      fireEvent.change(input, { target: { value: 'I want coffee' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('I want coffee');
      });
      expect(input).toHaveValue('');
    });

    it('should send message when Enter key is pressed', async () => {
      const sendMessage = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        sendMessage,
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      const input = screen.getByPlaceholderText('メッセージを入力してください...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'I want coffee' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('I want coffee');
      });
    });

    it('should not send message when Shift+Enter is pressed', async () => {
      const sendMessage = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        sendMessage,
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      const input = screen.getByPlaceholderText('メッセージを入力してください...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'I want coffee' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should not send empty message', async () => {
      const sendMessage = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        sendMessage,
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      const button = screen.getByRole('button', { name: '送信' });
      fireEvent.click(button);

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should disable input when loading', () => {
      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        isLoading: true,
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      const input = screen.getByTestId('message-input');
      expect(input).toBeDisabled();
    });
  });

  describe('Session ending', () => {
    it('should end session when close button is clicked (fullscreen mode)', async () => {
      const endSession = jest.fn();
      const onEnd = jest.fn();

      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        endSession,
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
          onEnd={onEnd}
          isFullscreen={true}
        />
      );

      const closeButton = screen.getByRole('button', { name: '終了' });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(endSession).toHaveBeenCalled();
        expect(onEnd).toHaveBeenCalled();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator when loading', () => {
      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        isLoading: true,
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      expect(screen.getByText('Mikuが考えています...')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should display error message when error exists', () => {
      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        error: 'Failed to send message',
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      expect(screen.getByText('Failed to send message')).toBeInTheDocument();
    });
  });

  describe('Message history', () => {
    it('should render conversation history', () => {
      const messages = [
        {
          message_id: 'msg-1',
          user_message: {
            content: 'I want coffee',
            timestamp: '2026-03-08T00:01:00Z',
          },
          response: {
            content: 'Sure! Hot or iced?',
            emotion: 'happy',
            audio_base64: 'base64',
            visemes: [],
          },
          turn_count: 1,
          timestamp: '2026-03-08T00:01:01Z',
        },
      ];

      mockUseChat.mockReturnValue({
        ...defaultMockUseChat,
        messages,
      });

      render(
        <ChatSession
          scenario={mockScenario}
          character={mockCharacter}
          vrm={null}
        />
      );

      expect(screen.getByText('I want coffee')).toBeInTheDocument();
      expect(screen.getByText('Sure! Hot or iced?')).toBeInTheDocument();
    });
  });
});
