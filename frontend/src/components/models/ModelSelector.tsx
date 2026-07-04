"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getModels, type ModelFile } from "@/lib/api/models";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ModelSelectorProps {
  value?: string;
  onChange: (path: string, type: "vrm" | "glb") => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const response = await getModels();
      setModels(response.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : "モデル一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (filePath: string) => {
    const model = models.find((m) => m.file_path === filePath);
    if (model) {
      onChange(model.file_path, model.model_type);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <Label>既存のモデルから選択</Label>
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={isLoading || models.length === 0}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              isLoading
                ? "読み込み中..."
                : models.length === 0
                ? "アップロード済みモデルがありません"
                : "モデルを選択"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.file_path} value={model.file_path}>
              <div className="flex flex-col">
                <span className="font-medium">{model.file_name}</span>
                <span className="text-xs text-text-muted">
                  {model.model_type.toUpperCase()} •{" "}
                  {(model.file_size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {models.length > 0 && (
        <p className="text-xs text-text-muted">
          {models.length}個のモデルが利用可能です
        </p>
      )}
    </div>
  );
}
