"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { getModels, deleteModel, type ModelFile } from "@/lib/api/models";
import { File as FileIcon, Trash2, RefreshCw, AlertCircle } from "lucide-react";

export function ModelList() {
  const [models, setModels] = useState<ModelFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModelFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getModels();
      setModels(response.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : "モデル一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const filename = deleteTarget.file_path.split("/").pop();
      if (!filename) throw new Error("Invalid filename");

      await deleteModel(filename);
      await loadModels(); // リロード
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-text-muted" />
          <span className="ml-2 text-text-muted">読み込み中...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (models.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <FileIcon className="mx-auto h-12 w-12 text-text-muted mb-4" />
          <p className="text-text-muted">
            アップロード済みのモデルがありません
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            アップロード済みモデル ({models.length})
          </h3>
          <Button variant="outline" size="sm" onClick={loadModels}>
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
        </div>

        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={model.file_path}
              className="flex items-center justify-between p-3 border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileIcon className="h-5 w-5 text-text-muted" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {model.file_name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {model.model_type.toUpperCase()} •{" "}
                    {(model.file_size / (1024 * 1024)).toFixed(2)} MB •{" "}
                    {new Date(model.uploaded_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(model)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>モデルファイルの削除</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.file_name}</span>{" "}
              を削除してもよろしいですか？
              <br />
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
