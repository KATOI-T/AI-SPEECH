"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VRMViewer } from "@/components/three/VRMViewer";
import { Play, Pause } from "lucide-react";
import type { AnimationConfig, AnimationState } from "@/types";
import {
  ANIMATION_LABELS,
  resolveAnimationPaths,
} from "@/lib/three/animation-constants";
import { resolveModelUrl } from "@/lib/api/models";

interface AnimationPreviewProps {
  /** 3Dモデルパス */
  modelPath: string;
  /** モデル形式 */
  modelType: "vrm" | "glb";
  /** アニメーション設定 */
  animationConfig: AnimationConfig | null;
}

/**
 * AnimationPreview - アニメーションプレビューコンポーネント
 *
 * キャラクター詳細画面でアニメーションのモーション動作を確認できる機能
 */
export function AnimationPreview({
  modelPath,
  modelType,
  animationConfig,
}: AnimationPreviewProps) {
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationState>("idle");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!modelPath) return;
    resolveModelUrl(modelPath)
      .then(setResolvedPath)
      .catch((err) => console.error("Failed to resolve model URL:", err));
  }, [modelPath]);

  // 設定されているアニメーション状態のみを抽出（useMemoで最適化）
  // フックルールに従い、早期リターンの前に呼び出す
  const availableAnimations = useMemo(() => {
    if (!animationConfig) return [];
    return (Object.entries(animationConfig) as [AnimationState, string][])
      .filter(([_, path]) => path)
      .map(([state]) => state);
  }, [animationConfig]);

  // animationConfigのクリップ名をVRMAファイルパスに変換（useMemoで最適化）
  const animationPaths = useMemo(
    () => resolveAnimationPaths(animationConfig),
    [animationConfig]
  );

  const handlePlayAnimation = (state: AnimationState) => {
    setCurrentAnimation(state);
    setIsPlaying(true);
  };

  const handleStopAnimation = () => {
    setCurrentAnimation("idle");
    setIsPlaying(false);
  };

  // 早期リターンはフックの後
  if (!animationConfig) {
    return (
      <div className="text-sm text-text-muted">
        アニメーション設定がありません
      </div>
    );
  }

  if (availableAnimations.length === 0) {
    return (
      <div className="text-sm text-text-muted">
        アニメーションファイルが設定されていません
      </div>
    );
  }

  if (!resolvedPath) {
    return (
      <div className="text-sm text-text-muted">
        モデルを読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text-primary">
        アニメーションプレビュー
      </h3>

      {/* 3Dモデルプレビュー */}
      <Card className="p-4 bg-bg-secondary">
        <div className="aspect-video bg-bg-tertiary rounded-lg overflow-hidden">
          <VRMViewer
            modelPath={resolvedPath}
            modelType={modelType}
            animationConfig={animationConfig}
            animationPaths={animationPaths}
            initialAnimationState="idle"
            animationState={currentAnimation}
            cameraPosition={[0, 1.2, 3]}
            enableControls={true}
            className="w-full h-full"
          />
        </div>
        <div className="mt-2 text-center text-sm text-text-muted">
          現在のモーション: <span className="font-medium text-text-primary">
            {ANIMATION_LABELS[currentAnimation]}
          </span>
        </div>
      </Card>

      {/* アニメーション選択ボタン */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {availableAnimations.map((state) => (
          <Button
            key={state}
            variant={currentAnimation === state ? "default" : "outline"}
            size="sm"
            onClick={() => handlePlayAnimation(state)}
            className="w-full"
          >
            {currentAnimation === state && isPlaying ? (
              <Pause className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {ANIMATION_LABELS[state]}
          </Button>
        ))}
      </div>

      {/* 操作ボタン */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleStopAnimation}
          className="flex-1"
        >
          停止（待機に戻る）
        </Button>
      </div>
    </div>
  );
}
