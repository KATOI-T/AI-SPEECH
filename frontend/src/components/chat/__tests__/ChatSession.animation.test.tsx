/**
 * F-013: 会話アニメーション反映の信頼性改善
 *
 * ChatSession が useChat からの感情イベントを phase / emotion に
 * 正しく振り分けることを検証する。特に:
 *
 *   1. 'thinking' 到着時は phase('THINKING') のみ呼ばれ emotion は触らない
 *   2. 通常感情到着時は emotion(emotion) のみ呼ばれ phase は変更しない
 *   3. 音声再生開始時に phase('SPEAKING') が呼ばれる（onAnimationStateChange は使わない）
 *   4. 音声再生終了時に phase('IDLE') が呼ばれる
 *
 * 根本原因の再発を防ぐため、onAnimationStateChange 経由での body animation
 * 直接制御が消えていることを型レベル + 呼び出しレベルで確認する。
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { ChatSession } from '../ChatSession';
import * as useChatHook from '@/hooks/useChat';
import * as useLipSyncHook from '@/hooks/useLipSync';
import * as useSessionPersistenceHook from '@/hooks/useSessionPersistence';
import type { Scenario, Character } from '@/types';

jest.mock('@/hooks/useChat');
jest.mock('@/hooks/useLipSync');
jest.mock('@/hooks/useSessionPersistence');

const mockUseChat = useChatHook.useChat as jest.MockedFunction<
  typeof useChatHook.useChat
>;
const mockUseLipSync = useLipSyncHook.useLipSync as jest.MockedFunction<
  typeof useLipSyncHook.useLipSync
>;
const mockUseSessionPersistence =
  useSessionPersistenceHook.useSessionPersistence as jest.MockedFunction<
    typeof useSessionPersistenceHook.useSessionPersistence
  >;

const mockScenario: Scenario = {
  id: 1,
  name: 'S',
  description: '',
  situation: '',
  goal: '',
  evaluation_criteria: null,
  background_image_paths: [],
  is_active: true,
  created_at: '2026-04-11T00:00:00Z',
  updated_at: '2026-04-11T00:00:00Z',
};

const mockCharacter: Character = {
  id: 1,
  name: 'C',
  persona: '',
  speaking_style: '',
  system_prompt: '',
  model_path: '/m.vrm',
  model_type: 'vrm',
  voice_config: null,
  animation_config: null,
  is_active: true,
  created_at: '2026-04-11T00:00:00Z',
  updated_at: '2026-04-11T00:00:00Z',
};

type FakeAudio = {
  play: jest.Mock;
  pause: jest.Mock;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  onended: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
};

let lastAudio: FakeAudio | null = null;

beforeEach(() => {
  jest.clearAllMocks();

  mockUseLipSync.mockReturnValue({ controller: null, reset: jest.fn() } as any);
  mockUseSessionPersistence.mockReturnValue({
    savedSessionId: null,
    saveSessionId: jest.fn(),
    clearSessionId: jest.fn(),
  });

  lastAudio = null;
  global.Audio = jest.fn().mockImplementation(() => {
    const audio: FakeAudio = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      onended: null,
      onerror: null,
    };
    lastAudio = audio;
    return audio;
  }) as any;
});

/**
 * useChat のオプションを捕獲するヘルパー。
 * テスト側から onEmotionChange / onAudioReady を任意タイミングで発火できる。
 */
type CapturedUseChatOptions = {
  onAudioReady?: (audioBase64: string, visemes: unknown[]) => void;
  onError?: (err: string) => void;
  onEmotionChange?: (emotion: string) => void;
};

function mockUseChatCapture() {
  let captured: CapturedUseChatOptions | null = null;
  mockUseChat.mockImplementation((opts: any) => {
    captured = opts;
    return {
      session: null,
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
    } as any;
  });
  return {
    get options() {
      return captured;
    },
  };
}

function renderWithCallbacks() {
  const onPhaseChange = jest.fn();
  const onEmotionChange = jest.fn();
  const capture = mockUseChatCapture();

  render(
    <ChatSession
      scenario={mockScenario}
      character={mockCharacter}
      vrm={null}
      onPhaseChange={onPhaseChange}
      onEmotionChange={onEmotionChange}
    />
  );

  return { onPhaseChange, onEmotionChange, capture };
}

describe('F-013: ChatSession animation event routing', () => {
  it("routes 'thinking' emotion to phase THINKING only (emotion untouched)", async () => {
    const { onPhaseChange, onEmotionChange, capture } = renderWithCallbacks();

    await waitFor(() => expect(capture.options).not.toBeNull());

    act(() => {
      capture.options!.onEmotionChange?.('thinking');
    });

    expect(onPhaseChange).toHaveBeenCalledWith('THINKING');
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
    // thinking 時は emotion を触らない（F-013-003）
    expect(onEmotionChange).not.toHaveBeenCalled();
  });

  it('routes a regular emotion to onEmotionChange only (phase untouched)', async () => {
    const { onPhaseChange, onEmotionChange, capture } = renderWithCallbacks();

    await waitFor(() => expect(capture.options).not.toBeNull());

    act(() => {
      capture.options!.onEmotionChange?.('happy');
    });

    expect(onEmotionChange).toHaveBeenCalledWith('happy');
    expect(onEmotionChange).toHaveBeenCalledTimes(1);
    // SPEAKING 遷移は音声開始時にまとめて行う（F-013-004）
    expect(onPhaseChange).not.toHaveBeenCalled();
  });

  it('coerces unknown emotions to neutral', async () => {
    const { onEmotionChange, capture } = renderWithCallbacks();

    await waitFor(() => expect(capture.options).not.toBeNull());

    act(() => {
      capture.options!.onEmotionChange?.('confused'); // 未知
    });

    expect(onEmotionChange).toHaveBeenCalledWith('neutral');
  });

  it('emits SPEAKING phase when audio playback starts', async () => {
    const { onPhaseChange, capture } = renderWithCallbacks();

    await waitFor(() => expect(capture.options).not.toBeNull());

    act(() => {
      capture.options!.onAudioReady?.('base64data', []);
    });

    expect(onPhaseChange).toHaveBeenCalledWith('SPEAKING');
    expect(lastAudio).not.toBeNull();
  });

  it('emits IDLE phase when audio playback ends', async () => {
    const { onPhaseChange, capture } = renderWithCallbacks();

    await waitFor(() => expect(capture.options).not.toBeNull());

    act(() => {
      capture.options!.onAudioReady?.('base64data', []);
    });

    // audio.onended を発火
    await waitFor(() => expect(lastAudio).not.toBeNull());
    act(() => {
      lastAudio!.onended?.();
    });

    const idleCalls = onPhaseChange.mock.calls.filter((c) => c[0] === 'IDLE');
    expect(idleCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('executes the full deterministic sequence: thinking → emotion → speaking → idle', async () => {
    const { onPhaseChange, onEmotionChange, capture } = renderWithCallbacks();

    await waitFor(() => expect(capture.options).not.toBeNull());

    // 1. ユーザー送信 → useChat が 'thinking' を送ってくる
    act(() => {
      capture.options!.onEmotionChange?.('thinking');
    });
    // 2. 感情チャンク到着
    act(() => {
      capture.options!.onEmotionChange?.('happy');
    });
    // 3. 音声再生開始
    act(() => {
      capture.options!.onAudioReady?.('base64data', []);
    });
    // 4. 音声再生終了
    await waitFor(() => expect(lastAudio).not.toBeNull());
    act(() => {
      lastAudio!.onended?.();
    });

    // phase の呼び出し順: THINKING → SPEAKING → IDLE
    const phaseOrder = onPhaseChange.mock.calls.map((c) => c[0]);
    expect(phaseOrder).toEqual(['THINKING', 'SPEAKING', 'IDLE']);

    // emotion の呼び出し順: happy のみ（neutral リセットは音声終了時に行わない）
    const emotionOrder = onEmotionChange.mock.calls.map((c) => c[0]);
    expect(emotionOrder).toEqual(['happy']);
  });

  it('does not crash when audio playback errors out and still returns to IDLE', async () => {
    const { onPhaseChange, capture } = renderWithCallbacks();

    await waitFor(() => expect(capture.options).not.toBeNull());

    act(() => {
      capture.options!.onAudioReady?.('base64data', []);
    });

    await waitFor(() => expect(lastAudio).not.toBeNull());
    act(() => {
      lastAudio!.onerror?.(new Error('fail'));
    });

    const idleCalls = onPhaseChange.mock.calls.filter((c) => c[0] === 'IDLE');
    expect(idleCalls.length).toBeGreaterThanOrEqual(1);
  });
});
