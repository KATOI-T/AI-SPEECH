/**
 * アニメーションモデル管理ページ
 *
 * アニメーションモデル（プリセット）の一覧表示、作成、編集、削除を行う
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { AnimationModel, AnimationModelCreate, AnimationModelUpdate, AnimationConfig } from "@/types";
import {
  getAnimationModels,
  createAnimationModel,
  updateAnimationModel,
  deleteAnimationModel,
} from "@/lib/api/animations";

const ANIMATION_FIELDS: { key: keyof AnimationConfig; label: string; required: boolean }[] = [
  { key: "idle", label: "待機 (idle)", required: true },
  { key: "talking", label: "会話中 (talking)", required: true },
  { key: "happy", label: "喜び (happy)", required: false },
  { key: "sad", label: "悲しみ (sad)", required: false },
  { key: "surprised", label: "驚き (surprised)", required: false },
  { key: "angry", label: "怒り (angry)", required: false },
  { key: "thinking", label: "考え中 (thinking)", required: false },
  { key: "greeting", label: "挨拶 (greeting)", required: false },
  { key: "present", label: "全身表示 (present)", required: false },
  { key: "shoot", label: "撃つ (shoot)", required: false },
  { key: "spin", label: "回る (spin)", required: false },
  { key: "exercise", label: "屈伸運動 (exercise)", required: false },
];

const EMPTY_CONFIG: AnimationConfig = {
  idle: "idle_01",
  talking: "talking_01",
};

export default function AnimationModelsPage() {
  const [models, setModels] = useState<AnimationModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnimationModel | null>(null);
  const [editingModel, setEditingModel] = useState<AnimationModel | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formConfig, setFormConfig] = useState<AnimationConfig>({ ...EMPTY_CONFIG });
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAnimationModels({ activeOnly: true });
      setModels(res.items);
      setError(null);
    } catch {
      setError("モデル一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormDescription("");
    setFormConfig({ ...EMPTY_CONFIG });
    setFormIsDefault(false);
    setEditingModel(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((model: AnimationModel) => {
    setEditingModel(model);
    setFormName(model.name);
    setFormDescription(model.description || "");
    setFormConfig({ ...model.animation_config });
    setFormIsDefault(model.is_default);
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formName.trim()) return;

    setFormSubmitting(true);
    try {
      if (editingModel) {
        const data: AnimationModelUpdate = {
          name: formName,
          description: formDescription || undefined,
          animation_config: formConfig,
          is_default: formIsDefault,
        };
        await updateAnimationModel(editingModel.id, data);
      } else {
        const data: AnimationModelCreate = {
          name: formName,
          description: formDescription || undefined,
          animation_config: formConfig,
          is_default: formIsDefault,
        };
        await createAnimationModel(data);
      }
      setFormOpen(false);
      resetForm();
      await fetchModels();
    } catch {
      setError(editingModel ? "更新に失敗しました" : "作成に失敗しました");
    } finally {
      setFormSubmitting(false);
    }
  }, [editingModel, formName, formDescription, formConfig, formIsDefault, resetForm, fetchModels]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteAnimationModel(deleteTarget.id);
      setDeleteTarget(null);
      await fetchModels();
    } catch {
      setError("削除に失敗しました");
    }
  }, [deleteTarget, fetchModels]);

  const handleConfigChange = useCallback((key: string, value: string) => {
    setFormConfig((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              アニメーションモデル管理
            </h1>
            <p className="text-sm text-text-secondary">
              アニメーションプリセットの作成・編集・削除
            </p>
          </div>
          <Button onClick={openCreateDialog}>新規作成</Button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              閉じる
            </button>
          </div>
        )}

        {/* Model List */}
        {loading ? (
          <div className="text-text-secondary text-center py-8">読み込み中...</div>
        ) : models.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-text-secondary">
              アニメーションモデルがありません。「新規作成」ボタンから作成してください。
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <Card key={model.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{model.name}</CardTitle>
                    <div className="flex gap-1">
                      {model.is_default && (
                        <Badge variant="default" className="text-xs">
                          デフォルト
                        </Badge>
                      )}
                    </div>
                  </div>
                  {model.description && (
                    <p className="text-xs text-text-secondary">{model.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 mb-3">
                    {Object.entries(model.animation_config)
                      .filter(([, v]) => v)
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-text-secondary">{key}</span>
                          <span className="text-text-primary font-mono">{value}</span>
                        </div>
                      ))}
                    {Object.entries(model.animation_config).filter(([, v]) => v).length > 4 && (
                      <p className="text-xs text-text-muted">
                        +{Object.entries(model.animation_config).filter(([, v]) => v).length - 4} more
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(model)}
                    >
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(model)}
                      className="text-red-600 hover:text-red-700"
                    >
                      削除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); resetForm(); } }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? "アニメーションモデルを編集" : "アニメーションモデルを作成"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-name">モデル名 *</Label>
                <Input
                  id="model-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: default_preset"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-desc">説明</Label>
                <Textarea
                  id="model-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="モデルの説明"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="model-default"
                  checked={formIsDefault}
                  onCheckedChange={setFormIsDefault}
                />
                <Label htmlFor="model-default">デフォルトに設定</Label>
              </div>
              <div className="space-y-2">
                <Label>アニメーション設定</Label>
                <div className="space-y-2">
                  {ANIMATION_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <Label className="w-40 text-xs shrink-0">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        value={(formConfig[field.key] as string) || ""}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        placeholder={field.required ? "必須" : "未設定"}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setFormOpen(false); resetForm(); }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formName.trim() || formSubmitting}
              >
                {formSubmitting ? "保存中..." : editingModel ? "更新" : "作成"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>モデルを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                「{deleteTarget?.name}」を削除します。この操作は論理削除です。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
