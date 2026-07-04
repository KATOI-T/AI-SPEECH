'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { GenerationPreview } from './GenerationPreview';
import { useGeneration } from '@/hooks/useGeneration';
import { createScenario } from '@/lib/api/scenarios';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';

interface GenerateFromPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo: string;
  /**
   * 保存完了後、親側でシナリオ一覧を再取得するためのコールバック。
   * 省略可 (省略時は router.refresh() のみ)。
   */
  onSaved?: () => Promise<void> | void;
}

export function GenerateFromPromptDialog({
  open,
  onOpenChange,
  redirectTo,
  onSaved,
}: GenerateFromPromptDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    state,
    preview,
    error,
    description,
    editedScenario,
    setDescription,
    openDialog,
    closeDialog,
    generate,
    regenerate,
    setEditedScenario,
    setSaving,
    setDone,
    setSaveError,
  } = useGeneration();

  useEffect(() => {
    if (open) {
      openDialog();
    } else {
      closeDialog();
    }
  }, [open, openDialog, closeDialog]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    await generate();
  };

  const handleSave = async () => {
    if (!editedScenario) return;

    setSaving();
    try {
      const savedScenario = await createScenario({
        name: editedScenario.name,
        description: editedScenario.description || undefined,
        situation: editedScenario.situation,
        goal: editedScenario.goal || undefined,
        evaluation_criteria: editedScenario.evaluation_criteria || undefined,
      });

      toast({
        title: '作成完了',
        description: `シナリオ「${savedScenario.name}」を作成しました。`,
      });
      setDone();
      onOpenChange(false);
      // 親側に最新データの再取得を依頼してから遷移 (リスト即時反映)
      if (onSaved) {
        await onSaved();
      }
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      const msg = `シナリオの保存に失敗しました: ${detail}`;
      setSaveError(msg);
      toast({ title: '保存失敗', description: msg, variant: 'destructive' });
    }
  };

  const isPreviewValid =
    editedScenario?.name?.trim() && editedScenario?.situation?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI でシナリオを生成
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              1 行でシナリオのイメージを入力してください（最大 500 文字）
            </p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 放課後の図書室で悩み相談に乗ってくれる先輩との会話"
              rows={2}
              maxLength={500}
              disabled={state === 'loading' || state === 'saving'}
              autoFocus
            />
            <p className="text-xs text-text-muted text-right">
              {description.length} / 500
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {state === 'loading' && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
              <p className="text-sm text-text-secondary">
                少々お待ちください（5〜15 秒）...
              </p>
            </div>
          )}

          {(state === 'preview' || state === 'saving') && editedScenario && (
            <GenerationPreview
              scenario={editedScenario}
              onScenarioChange={setEditedScenario}
            />
          )}

          {state === 'preview' && preview && preview.warnings.length > 0 && (
            <Alert>
              <AlertDescription>
                {preview.warnings.map((w, i) => (
                  <p key={i} className="text-xs">
                    {w}
                  </p>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          {state === 'error' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              disabled={!description.trim()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </Button>
          )}
          {(state === 'preview' || state === 'saving') && (
            <Button
              type="button"
              variant="outline"
              onClick={regenerate}
              disabled={state === 'saving'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              再生成
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={state === 'loading' || state === 'saving'}
          >
            キャンセル
          </Button>
          {(state === 'input' || state === 'error') && (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!description.trim()}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              生成
            </Button>
          )}
          {(state === 'preview' || state === 'saving') && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isPreviewValid || state === 'saving'}
            >
              {state === 'saving' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              この内容で保存
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
