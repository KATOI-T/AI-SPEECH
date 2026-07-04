import { renderHook, act } from '@testing-library/react';
import { useGeneration } from '../useGeneration';
import * as generationApi from '@/lib/api/generation';
import { GenerationPreviewResponse } from '@/types';

jest.mock('@/lib/api/generation');

const mockPreview: GenerationPreviewResponse = {
  scenario: {
    name: 'テストシナリオ',
    description: 'テスト説明',
    situation: 'テスト状況',
    goal: 'テスト目標',
    evaluation_criteria: 'テスト基準',
  },
  warnings: [],
};

describe('useGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in input state so the Generate button is visible on first render', () => {
    const { result } = renderHook(() => useGeneration());
    expect(result.current.state).toBe('input');
    expect(result.current.preview).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('openDialog resets description and stays in input state', () => {
    const { result } = renderHook(() => useGeneration());
    act(() => {
      result.current.setDescription('stale text');
      result.current.openDialog();
    });
    expect(result.current.state).toBe('input');
    expect(result.current.description).toBe('');
  });

  it('transitions input → loading → preview on successful generate', async () => {
    (generationApi.generateScenario as jest.Mock).mockResolvedValue(mockPreview);

    const { result } = renderHook(() => useGeneration());

    act(() => {
      result.current.openDialog();
      result.current.setDescription('テスト説明文');
    });

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.state).toBe('preview');
    expect(result.current.preview).toEqual(mockPreview);
    expect(result.current.editedScenario?.name).toBe('テストシナリオ');
  });

  it('transitions to error state on API failure', async () => {
    (generationApi.generateScenario as jest.Mock).mockRejectedValue(
      new Error('生成サービスに接続できません')
    );

    const { result } = renderHook(() => useGeneration());

    act(() => {
      result.current.openDialog();
      result.current.setDescription('テスト説明文');
    });

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('生成サービスに接続できません');
  });

  it('resets state on closeDialog', () => {
    const { result } = renderHook(() => useGeneration());

    act(() => {
      result.current.openDialog();
      result.current.setDescription('テスト');
    });

    act(() => {
      result.current.closeDialog();
    });

    expect(result.current.state).toBe('input');
    expect(result.current.description).toBe('');
    expect(result.current.preview).toBeNull();
  });
});
