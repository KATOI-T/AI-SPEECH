"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadModel } from "@/lib/api/characters";
import { uploadModelLocal } from "@/lib/api/models";
import { Upload } from "lucide-react";

interface ModelUploaderProps {
  currentPath?: string;
  onUploaded: (path: string, type: "vrm" | "glb") => void;
  storageMode?: "legacy" | "local"; // legacy: existing API, local: new local storage API
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function ModelUploader({ currentPath, onUploaded, storageMode = "legacy" }: ModelUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイル形式チェック
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["vrm", "glb"].includes(ext)) {
      setError("VRMまたはGLBファイルを選択してください。");
      return;
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      setError(`ファイルサイズが大きすぎます。最大${MAX_FILE_SIZE / (1024 * 1024)}MBまでです。`);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const response = storageMode === "local"
        ? await uploadModelLocal(file)
        : await uploadModel(file);
      onUploaded(response.file_path, response.model_type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>モデルファイル</Label>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".vrm,.glb"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id="model-upload"
        />
        <label
          htmlFor="model-upload"
          className="flex-1 cursor-pointer rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {currentPath ? currentPath.split("/").pop() : "ファイルを選択"}
        </label>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? "アップロード中..." : "選択"}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-text-muted">
        VRMまたはGLB形式のファイルをアップロードしてください。最大50MBまで。
      </p>
    </div>
  );
}
