import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScenarioDeleteDialog } from '../ScenarioDeleteDialog';
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

describe('ScenarioDeleteDialog', () => {
  const mockOnConfirm = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnOpenChange.mockClear();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  it('renders delete confirmation dialog', () => {
    render(
      <ScenarioDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={mockScenario}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('シナリオの削除')).toBeInTheDocument();
    expect(screen.getByText('テストシナリオ')).toBeInTheDocument();
    expect(screen.getByText(/この操作は取り消せません/)).toBeInTheDocument();
  });

  it('returns null when scenario is null', () => {
    const { container } = render(
      <ScenarioDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={null}
        onConfirm={mockOnConfirm}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('calls onConfirm when delete button clicked', async () => {
    render(
      <ScenarioDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={mockScenario}
        onConfirm={mockOnConfirm}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /削除/ });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onOpenChange when cancel button clicked', () => {
    render(
      <ScenarioDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={mockScenario}
        onConfirm={mockOnConfirm}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading state during deletion', async () => {
    let resolveConfirm: () => void;
    const confirmPromise = new Promise<void>((resolve) => {
      resolveConfirm = resolve;
    });
    mockOnConfirm.mockReturnValue(confirmPromise);

    render(
      <ScenarioDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        scenario={mockScenario}
        onConfirm={mockOnConfirm}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /削除/ });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteButton).toBeDisabled();
    });

    resolveConfirm!();

    await waitFor(() => {
      expect(deleteButton).not.toBeDisabled();
    });
  });
});
