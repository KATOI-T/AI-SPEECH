/**
 * ボディアニメーション制御パネル
 * 12種類のアニメーション状態を切り替え
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import type { AnimationState } from "@/types";
import { ANIMATION_LABELS } from "@/lib/three/animation-constants";

const ALL_STATES: AnimationState[] = [
  "idle", "greeting", "happy", "present", "shoot", "spin",
  "exercise", "talking", "sad", "surprised", "angry", "thinking",
];

interface BodyAnimationPanelProps {
  currentState: AnimationState;
  onStateChange: (state: AnimationState) => void;
  disabled?: boolean;
}

export function BodyAnimationPanel({
  currentState,
  onStateChange,
  disabled = false,
}: BodyAnimationPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        ボディアニメーション状態を直接切り替えます（全{ALL_STATES.length}種類）
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ALL_STATES.map((state) => (
          <Button
            key={state}
            onClick={() => onStateChange(state)}
            variant={currentState === state ? "default" : "outline"}
            disabled={disabled}
            size="sm"
            className="text-xs"
          >
            {ANIMATION_LABELS[state]}
          </Button>
        ))}
      </div>
    </div>
  );
}
