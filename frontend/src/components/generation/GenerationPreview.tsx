'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GenerationPreviewScenario } from '@/types';

interface GenerationPreviewProps {
  scenario: GenerationPreviewScenario;
  onScenarioChange: (s: GenerationPreviewScenario) => void;
}

export function GenerationPreview({
  scenario,
  onScenarioChange,
}: GenerationPreviewProps) {
  return (
    <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
      <div className="space-y-1">
        <Label htmlFor="gen-scenario-name">
          シナリオ名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="gen-scenario-name"
          value={scenario.name}
          onChange={(e) => onScenarioChange({ ...scenario, name: e.target.value })}
          maxLength={200}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="gen-scenario-desc">説明</Label>
        <Textarea
          id="gen-scenario-desc"
          value={scenario.description ?? ''}
          onChange={(e) =>
            onScenarioChange({ ...scenario, description: e.target.value })
          }
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="gen-scenario-situation">
          シチュエーション <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="gen-scenario-situation"
          value={scenario.situation}
          onChange={(e) =>
            onScenarioChange({ ...scenario, situation: e.target.value })
          }
          rows={4}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="gen-scenario-goal">会話の目標</Label>
        <Textarea
          id="gen-scenario-goal"
          value={scenario.goal ?? ''}
          onChange={(e) => onScenarioChange({ ...scenario, goal: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="gen-scenario-eval">評価基準</Label>
        <Textarea
          id="gen-scenario-eval"
          value={scenario.evaluation_criteria ?? ''}
          onChange={(e) =>
            onScenarioChange({ ...scenario, evaluation_criteria: e.target.value })
          }
          rows={2}
        />
      </div>
    </div>
  );
}
