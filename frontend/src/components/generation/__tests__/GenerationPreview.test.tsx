import { render, screen, fireEvent } from '@testing-library/react';
import { GenerationPreview } from '../GenerationPreview';
import { GenerationPreviewScenario } from '@/types';

const mockScenario: GenerationPreviewScenario = {
  name: 'テストシナリオ',
  description: 'テスト説明',
  situation: 'テスト状況',
  goal: 'テスト目標',
  evaluation_criteria: 'テスト基準',
};

describe('GenerationPreview', () => {
  const mockOnScenarioChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders scenario fields as editable inputs', () => {
    render(
      <GenerationPreview
        scenario={mockScenario}
        onScenarioChange={mockOnScenarioChange}
      />
    );

    const nameInput = screen.getByDisplayValue('テストシナリオ');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput.tagName).toBe('INPUT');
  });

  it('calls onScenarioChange when scenario name is edited', () => {
    render(
      <GenerationPreview
        scenario={mockScenario}
        onScenarioChange={mockOnScenarioChange}
      />
    );

    const nameInput = screen.getByDisplayValue('テストシナリオ');
    fireEvent.change(nameInput, { target: { value: '新しいシナリオ名' } });

    expect(mockOnScenarioChange).toHaveBeenCalledWith({
      ...mockScenario,
      name: '新しいシナリオ名',
    });
  });

  it('renders optional scenario fields even when source value is null', () => {
    render(
      <GenerationPreview
        scenario={{
          ...mockScenario,
          description: null,
          goal: null,
          evaluation_criteria: null,
        }}
        onScenarioChange={mockOnScenarioChange}
      />
    );

    // 値が null でも controlled textarea として表示される (空文字で表示)
    expect(screen.getByDisplayValue('テスト状況')).toBeInTheDocument();
  });
});
