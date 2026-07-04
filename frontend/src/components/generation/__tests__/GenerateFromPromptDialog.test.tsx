import { render, screen } from '@testing-library/react';
import { GenerateFromPromptDialog } from '../GenerateFromPromptDialog';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/lib/api/generation', () => ({
  generateScenarioCharacter: jest.fn(),
}));

jest.mock('@/lib/api/scenarios', () => ({
  createScenario: jest.fn(),
}));

jest.mock('@/lib/api/characters', () => ({
  createCharacter: jest.fn(),
}));

jest.mock('@/components/generation/GenerationPreview', () => ({
  GenerationPreview: () => <div data-testid="generation-preview" />,
}));

describe('GenerateFromPromptDialog', () => {
  const defaultProps = {
    open: false,
    onOpenChange: jest.fn(),
    redirectTo: '/admin/scenarios',
  };

  it('open=true のとき「生成」ボタンが表示される', () => {
    render(<GenerateFromPromptDialog {...defaultProps} open={true} />);
    expect(screen.getByRole('button', { name: /生成/ })).toBeInTheDocument();
  });

  it('open=false のとき「生成」ボタンが表示されない', () => {
    render(<GenerateFromPromptDialog {...defaultProps} open={false} />);
    expect(screen.queryByRole('button', { name: /^生成$/ })).not.toBeInTheDocument();
  });
});
