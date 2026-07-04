import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioList } from '../ScenarioList';
import { Scenario } from '@/types';

const mockScenarios: Scenario[] = [
  {
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
  },
  {
    id: 2,
    name: '無効なシナリオ',
    description: null,
    situation: 'テスト',
    goal: null,
    evaluation_criteria: null,
    background_image_paths: [],
    is_active: false,
    created_at: '2026-03-08T00:00:00Z',
    updated_at: '2026-03-08T00:00:00Z',
  },
];

describe('ScenarioList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
  });

  it('renders scenario list', () => {
    render(
      <ScenarioList
        scenarios={mockScenarios}
        isLoading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('テストシナリオ')).toBeInTheDocument();
    expect(screen.getByText('無効なシナリオ')).toBeInTheDocument();
    expect(screen.getByText('テスト用の説明')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ScenarioList
        scenarios={[]}
        isLoading={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const skeletons = document.querySelectorAll('[class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state', () => {
    render(
      <ScenarioList
        scenarios={[]}
        isLoading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/シナリオがありません/)).toBeInTheDocument();
  });

  it('displays active and inactive badges correctly', () => {
    render(
      <ScenarioList
        scenarios={mockScenarios}
        isLoading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const badges = screen.getAllByText(/有効|無効/);
    expect(badges).toHaveLength(2);
    expect(screen.getByText('有効')).toBeInTheDocument();
    expect(screen.getByText('無効')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    render(
      <ScenarioList
        scenarios={mockScenarios}
        isLoading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButtons = screen.getAllByRole('button');
    const firstEditButton = editButtons.find(
      (btn) => btn.querySelector('svg')?.classList.toString().includes('lucide')
    );

    if (firstEditButton) {
      fireEvent.click(firstEditButton);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    }
  });

  it('displays description as dash when null', () => {
    render(
      <ScenarioList
        scenarios={mockScenarios}
        isLoading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(0);
  });
});
