"use client";

import { useState, useEffect } from "react";
import { VRMViewer } from "@/components/three/VRMViewer";
import { resolveModelUrl } from "@/lib/api/models";

interface ModelPreviewProps {
  modelPath: string;
  modelType?: "vrm" | "glb";
}

export function ModelPreview({ modelPath, modelType = "vrm" }: ModelPreviewProps) {
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!modelPath) return;
    resolveModelUrl(modelPath)
      .then(setResolvedPath)
      .catch((err) => console.error("Failed to resolve model URL:", err));
  }, [modelPath]);

  if (!modelPath) {
    return (
      <div className="flex h-64 items-center justify-center bg-bg-tertiary text-text-muted">
        モデルを選択してください
      </div>
    );
  }

  if (!resolvedPath) {
    return (
      <div className="flex h-64 items-center justify-center bg-bg-tertiary text-text-muted">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="h-64 rounded-lg overflow-hidden border border-border-primary">
      <VRMViewer
        modelPath={resolvedPath}
        modelType={modelType}
        enableControls={true}
        backgroundColor="#1f2937"
        className="w-full h-full"
        onError={(error) => {
          console.error("Model preview error:", error);
        }}
      />
    </div>
  );
}
