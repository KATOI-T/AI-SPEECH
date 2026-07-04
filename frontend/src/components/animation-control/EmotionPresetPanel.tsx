/**
 * 感情プリセット一括適用パネル
 * ボディ+表情を感情に合わせて一括設定
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EmotionType } from "@/types";
import { DEFAULT_EMOTION_MAP } from "@/lib/three/animation-constants";

const PRESETS: { emotion: EmotionType; label: string; description: string }[] = [
  { emotion: "neutral", label: "普通", description: "relaxed 0.2" },
  { emotion: "happy", label: "喜び", description: "happy 0.8" },
  { emotion: "sad", label: "悲しみ", description: "sad 0.8" },
  { emotion: "surprised", label: "驚き", description: "surprised 0.9" },
  { emotion: "angry", label: "怒り", description: "angry 0.8" },
];

interface EmotionPresetPanelProps {
  currentEmotion: EmotionType;
  onPresetApply: (emotion: EmotionType) => void;
  disabled?: boolean;
}

export function EmotionPresetPanel({
  currentEmotion,
  onPresetApply,
  disabled = false,
}: EmotionPresetPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        感情プリセットで表情+ボディを一括適用
      </p>
      <div className="space-y-2">
        {PRESETS.map(({ emotion, label, description }) => {
          const mapping = DEFAULT_EMOTION_MAP[emotion];
          return (
            <Button
              key={emotion}
              onClick={() => onPresetApply(emotion)}
              variant={currentEmotion === emotion ? "default" : "outline"}
              disabled={disabled}
              size="sm"
              className="w-full justify-between"
            >
              <span>{label}</span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {mapping.expression}: {mapping.config.normal}
              </Badge>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
