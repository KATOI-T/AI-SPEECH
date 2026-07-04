'use client';

import { useState, useEffect } from 'react';
import { ScenarioList } from '@/components/admin/scenarios/ScenarioList';
import { ScenarioFormDialog } from '@/components/admin/scenarios/ScenarioFormDialog';
import { ScenarioDeleteDialog } from '@/components/admin/scenarios/ScenarioDeleteDialog';
import { GenerateFromPromptDialog } from '@/components/generation/GenerateFromPromptDialog';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { Scenario, ScenarioCreate } from '@/types';
import {
  getScenarios,
  createScenario,
  updateScenario,
  deleteScenario,
} from '@/lib/api/scenarios';
import { useToast } from '@/hooks/useToast';

export default function ScenarioListPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [deletingScenario, setDeletingScenario] = useState<Scenario | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadScenarios();
  }, []);

  async function loadScenarios() {
    setIsLoading(true);
    try {
      // active_only=true で有効なシナリオのみ取得（論理削除されたものは除外）
      const data = await getScenarios(true);
      setScenarios(data);
      setError(null);
    } catch (e) {
      setError('シナリオの取得に失敗しました');
      console.error('Failed to load scenarios:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(data: ScenarioCreate) {
    try {
      if (editingScenario) {
        await updateScenario(editingScenario.id, data);
        toast({ title: '更新完了', description: 'シナリオを更新しました。' });
      } else {
        await createScenario(data);
        toast({ title: '作成完了', description: 'シナリオを作成しました。' });
      }
      setIsFormOpen(false);
      setEditingScenario(null);
      await loadScenarios();
    } catch (e) {
      console.error('Failed to save scenario:', e);
      toast({
        title: '保存失敗',
        description: 'シナリオの保存に失敗しました。',
        variant: 'destructive',
      });
      throw e;
    }
  }

  async function handleDelete() {
    if (deletingScenario) {
      try {
        await deleteScenario(deletingScenario.id);
        toast({ title: '削除完了', description: `「${deletingScenario.name}」を削除しました。` });
        setIsDeleteOpen(false);
        setDeletingScenario(null);
        await loadScenarios();
      } catch (e) {
        console.error('Failed to delete scenario:', e);
        toast({
          title: '削除失敗',
          description: 'シナリオの削除に失敗しました。',
          variant: 'destructive',
        });
      }
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">シナリオ管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI で生成
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <ScenarioList
        scenarios={scenarios}
        isLoading={isLoading}
        onEdit={(scenario) => {
          setEditingScenario(scenario);
          setIsFormOpen(true);
        }}
        onDelete={(scenario) => {
          setDeletingScenario(scenario);
          setIsDeleteOpen(true);
        }}
      />

      <ScenarioFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        scenario={editingScenario}
        onSave={handleSave}
      />

      <ScenarioDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        scenario={deletingScenario}
        onConfirm={handleDelete}
      />

      <GenerateFromPromptDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        redirectTo="/admin/scenarios"
        onSaved={loadScenarios}
      />
    </div>
  );
}
