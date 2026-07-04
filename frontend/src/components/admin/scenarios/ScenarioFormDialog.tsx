'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scenario, ScenarioCreate } from '@/types';
import { Loader2 } from 'lucide-react';
import { BackgroundImageUploader } from './BackgroundImageUploader';

interface ScenarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: Scenario | null;
  onSave: (data: ScenarioCreate) => Promise<void>;
}

export function ScenarioFormDialog({
  open,
  onOpenChange,
  scenario,
  onSave,
}: ScenarioFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ScenarioCreate>({
    name: '',
    description: '',
    situation: '',
    goal: '',
    evaluation_criteria: '',
    background_image_paths: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = scenario !== null;

  useEffect(() => {
    if (scenario) {
      setFormData({
        name: scenario.name,
        description: scenario.description || '',
        situation: scenario.situation,
        goal: scenario.goal || '',
        evaluation_criteria: scenario.evaluation_criteria || '',
        background_image_paths: scenario.background_image_paths || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        situation: '',
        goal: '',
        evaluation_criteria: '',
        background_image_paths: [],
      });
    }
    setErrors({});
  }, [scenario, open]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'シナリオ名は必須です';
    }
    if (!formData.situation.trim()) {
      newErrors.situation = 'シチュエーション設定は必須です';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'シナリオ編集' : '新規シナリオ作成'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              シナリオ名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例: カフェ接客練習"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="シナリオの概要を入力"
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="situation">
              シチュエーション設定 <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="situation"
              value={formData.situation}
              onChange={(e) =>
                setFormData({ ...formData, situation: e.target.value })
              }
              placeholder="例: あなたはカフェの店員です。お客様が来店しました。"
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
            {errors.situation && (
              <p className="text-sm text-red-500">{errors.situation}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">会話の目標</Label>
            <textarea
              id="goal"
              value={formData.goal}
              onChange={(e) =>
                setFormData({ ...formData, goal: e.target.value })
              }
              placeholder="例: お客様に満足していただける接客を行う"
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="evaluation_criteria">評価基準</Label>
            <textarea
              id="evaluation_criteria"
              value={formData.evaluation_criteria}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  evaluation_criteria: e.target.value,
                })
              }
              placeholder="例: 挨拶、商品説明、注文確認が適切に行えたか"
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
          </div>

          <BackgroundImageUploader
            currentImagePaths={formData.background_image_paths || []}
            onUpdate={(paths) =>
              setFormData({ ...formData, background_image_paths: paths })
            }
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isEditing ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
