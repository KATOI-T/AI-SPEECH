import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScenarioFormDialog } from '../ScenarioFormDialog';
import { Scenario } from '@/types';

const mockScenario: Scenario = {
  id: 1,
  name: 'テストシナリオ',
  description: 'テスト用の説明',
  situation: 'テスト用のシチュエーション',
  goal: 'テスト目標',
  evaluation_criteria: 'テスト評価基準',
  background_image_paths: [],
  is_active: true,
  created_at: '2026-03-09T00:00:00Z',
  updated_at: '2026-03-09T00:00:00Z',
};

describe('ScenarioFormDialog', () => {
  const mockOnSave = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnOpenChange.mockClear();
    mockOnSave.mockResolvedValue(undefined);
  });

  it('renders create form when scenario is null', () => {
    render(
      <ScenarioFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('新規シナリオ作成')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /作成/ })).toBeInTheDocument();
  });

  it('renders edit form when scenario is provided', () => {
    render(
      <ScenarioFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={mockScenario}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('シナリオ編集')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /更新/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue('テストシナリオ')).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    render(
      <ScenarioFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={null}
        onSave={mockOnSave}
      />
    );

    const submitButton = screen.getByRole('button', { name: /作成/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('シナリオ名は必須です')).toBeInTheDocument();
      expect(screen.getByText('シチュエーション設定は必須です')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with form data when valid', async () => {
    render(
      <ScenarioFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={null}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByLabelText(/シナリオ名/);
    const situationInput = screen.getByLabelText(/シチュエーション設定/);

    fireEvent.change(nameInput, { target: { value: '新規シナリオ' } });
    fireEvent.change(situationInput, { target: { value: 'テストシチュエーション' } });

    const submitButton = screen.getByRole('button', { name: /作成/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新規シナリオ',
          situation: 'テストシチュエーション',
        })
      );
    });
  });

  it('calls onOpenChange when cancel button clicked', () => {
    render(
      <ScenarioFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={null}
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('resets form when dialog closes and opens again', () => {
    const { rerender } = render(
      <ScenarioFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={mockScenario}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByDisplayValue('テストシナリオ')).toBeInTheDocument();

    rerender(
      <ScenarioFormDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        scenario={mockScenario}
        onSave={mockOnSave}
      />
    );

    rerender(
      <ScenarioFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={null}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByLabelText(/シナリオ名/) as HTMLInputElement;
    expect(nameInput.value).toBe('');
  });
});
