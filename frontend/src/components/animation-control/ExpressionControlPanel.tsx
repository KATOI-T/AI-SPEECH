/**
 * 表情BlendShape制御パネル
 * スライダーで個別のBlendShape weightを調整
 */

"use client";

import React from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { ExpressionController } from "@/lib/three/expression-controller";

/** VRM標準の表情（口以外） */
const EXPRESSION_NAMES = [
  { name: "happy", label: "喜び" },
  { name: "angry", label: "怒り" },
  { name: "sad", label: "悲しみ" },
  { name: "relaxed", label: "リラックス" },
  { name: "surprised", label: "驚き" },
];

interface ExpressionControlPanelProps {
  controller: ExpressionController | null;
  weights: Record<string, number>;
  onWeightChange: (name: string, weight: number) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ExpressionControlPanel({
  controller,
  weights,
  onWeightChange,
  onReset,
  disabled = false,
}: ExpressionControlPanelProps) {
  const availableExpressions = controller?.getAvailableExpressions() ?? [];

  // 利用可能な表情のみフィルタ
  const expressions = EXPRESSION_NAMES.filter(
    (e) => availableExpressions.includes(e.name)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          BlendShape Weight（口以外）
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={disabled}
        >
          リセット
        </Button>
      </div>

      {disabled && (
        <p className="text-xs text-text-muted">
          VRMモデルを読み込むと表情制御が有効になります
        </p>
      )}

      {!disabled && expressions.length === 0 && (
        <p className="text-xs text-text-muted">
          利用可能な表情BlendShapeがありません（GLBモデルは非対応）
        </p>
      )}

      <div className="space-y-3">
        {expressions.map(({ name, label }) => (
          <div key={name} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">
                {label}
              </label>
              <span className="text-xs font-mono text-text-muted">
                {(weights[name] ?? 0).toFixed(2)}
              </span>
            </div>
            <Slider
              value={[weights[name] ?? 0]}
              onValueChange={([value]) => onWeightChange(name, value)}
              min={0}
              max={1}
              step={0.01}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
