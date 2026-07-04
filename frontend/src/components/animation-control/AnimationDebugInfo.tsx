/**
 * アニメーションデバッグ情報表示
 */

"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { AnimationState, ConversationPhase, EmotionType } from "@/types";
import type { ExpressionController } from "@/lib/three/expression-controller";

interface AnimationDebugInfoProps {
  isModelLoaded: boolean;
  animationState: AnimationState;
  conversationPhase: ConversationPhase;
  emotion: EmotionType;
  controlMode: "manual" | "conversation";
  expressionController: ExpressionController | null;
  clipCount: number;
  active?: boolean;
}

export function AnimationDebugInfo({
  isModelLoaded,
  animationState,
  conversationPhase,
  emotion,
  controlMode,
  expressionController,
  clipCount,
  active = true,
}: AnimationDebugInfoProps) {
  const [fps, setFps] = useState(0);
  const [weights, setWeights] = useState<Record<string, number>>({});

  // FPS計測（アクティブ時のみ）
  useEffect(() => {
    if (!active) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const measure = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(measure);
    };
    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  // Expression weights 定期取得（アクティブ時のみ）
  useEffect(() => {
    if (!expressionController || !active) return;

    const interval = setInterval(() => {
      setWeights(expressionController.getWeights());
    }, 200);

    return () => clearInterval(interval);
  }, [expressionController, active]);

  const activeWeights = Object.entries(weights).filter(([, v]) => v > 0.01);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">モデル</span>
          <Badge variant={isModelLoaded ? "default" : "secondary"}>
            {isModelLoaded ? "読込済" : "未読込"}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">FPS</span>
          <Badge variant="secondary" className="font-mono">{fps}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">ボディ</span>
          <Badge variant="outline" className="font-mono">{animationState}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">クリップ数</span>
          <Badge variant="secondary">{clipCount}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">フェーズ</span>
          <Badge variant="outline" className="font-mono">{conversationPhase}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">感情</span>
          <Badge variant="outline" className="font-mono">{emotion}</Badge>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-text-secondary">制御モード</span>
          <Badge variant="secondary">{controlMode === 'manual' ? '手動' : '会話シミュレーション'}</Badge>
        </div>
      </div>

      {activeWeights.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-text-secondary">アクティブ表情</p>
          <div className="flex flex-wrap gap-1">
            {activeWeights.map(([name, value]) => (
              <Badge key={name} variant="outline" className="text-[10px] font-mono">
                {name}: {value.toFixed(2)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
