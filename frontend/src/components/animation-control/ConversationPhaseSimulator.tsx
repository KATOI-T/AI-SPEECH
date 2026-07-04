/**
 * 会話フェーズシミュレーション
 * 手動でフェーズ切替 + 自動再生サイクル
 */

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ConversationPhase, EmotionType } from "@/types";

const PHASES: { phase: ConversationPhase; label: string }[] = [
  { phase: "IDLE", label: "待機" },
  { phase: "LISTENING", label: "聴取中" },
  { phase: "THINKING", label: "思考中" },
  { phase: "SPEAKING", label: "発話中" },
];

const EMOTIONS: { emotion: EmotionType; label: string }[] = [
  { emotion: "neutral", label: "普通" },
  { emotion: "happy", label: "喜び" },
  { emotion: "sad", label: "悲しみ" },
  { emotion: "surprised", label: "驚き" },
  { emotion: "angry", label: "怒り" },
];

/** 自動再生のデフォルト持続時間（秒） */
const AUTO_PHASE_DURATIONS: Record<ConversationPhase, number> = {
  IDLE: 1,
  LISTENING: 2,
  THINKING: 3,
  SPEAKING: 4,
};

const PHASE_ORDER: ConversationPhase[] = ['IDLE', 'LISTENING', 'THINKING', 'SPEAKING'];

interface ConversationPhaseSimulatorProps {
  currentPhase: ConversationPhase;
  currentEmotion: EmotionType;
  onPhaseChange: (phase: ConversationPhase) => void;
  onEmotionChange: (emotion: EmotionType) => void;
  disabled?: boolean;
}

export function ConversationPhaseSimulator({
  currentPhase,
  currentEmotion,
  onPhaseChange,
  onEmotionChange,
  disabled = false,
}: ConversationPhaseSimulatorProps) {
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseIndexRef = useRef(0);
  const onPhaseChangeRef = useRef(onPhaseChange);
  const speedRef = useRef(speed);
  const currentPhaseRef = useRef(currentPhase);

  onPhaseChangeRef.current = onPhaseChange;
  speedRef.current = speed;
  currentPhaseRef.current = currentPhase;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 自動再生ループ
  useEffect(() => {
    if (!autoPlay || disabled) {
      clearTimer();
      return;
    }

    const advancePhase = () => {
      const nextIndex = (phaseIndexRef.current + 1) % PHASE_ORDER.length;
      phaseIndexRef.current = nextIndex;
      const nextPhase = PHASE_ORDER[nextIndex];
      onPhaseChangeRef.current(nextPhase);

      const duration = AUTO_PHASE_DURATIONS[nextPhase] / speedRef.current;
      timerRef.current = setTimeout(advancePhase, duration * 1000);
    };

    const currentIdx = PHASE_ORDER.indexOf(currentPhaseRef.current);
    phaseIndexRef.current = currentIdx >= 0 ? currentIdx : 0;
    const currentDuration = AUTO_PHASE_DURATIONS[PHASE_ORDER[phaseIndexRef.current]] / speedRef.current;
    timerRef.current = setTimeout(advancePhase, currentDuration * 1000);

    return clearTimer;
  }, [autoPlay, disabled, clearTimer]);

  const handleAutoPlayToggle = (checked: boolean) => {
    if (checked) {
      phaseIndexRef.current = PHASE_ORDER.indexOf(currentPhase);
    }
    setAutoPlay(checked);
  };

  return (
    <div className="space-y-4">
      {/* フェーズ選択 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">会話フェーズ</Label>
        <div className="grid grid-cols-2 gap-2">
          {PHASES.map(({ phase, label }) => (
            <Button
              key={phase}
              onClick={() => {
                onPhaseChange(phase);
                if (autoPlay) setAutoPlay(false);
              }}
              variant={currentPhase === phase ? "default" : "outline"}
              disabled={disabled}
              size="sm"
              className="text-xs"
            >
              {label}
              {currentPhase === phase && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                  Active
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* 感情選択 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">感情</Label>
        <div className="grid grid-cols-3 gap-2">
          {EMOTIONS.map(({ emotion, label }) => (
            <Button
              key={emotion}
              onClick={() => onEmotionChange(emotion)}
              variant={currentEmotion === emotion ? "default" : "outline"}
              disabled={disabled}
              size="sm"
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* 自動再生 */}
      <div className="border-t border-border-primary pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-play" className="text-sm font-medium">
            自動再生
          </Label>
          <Switch
            id="auto-play"
            checked={autoPlay}
            onCheckedChange={handleAutoPlayToggle}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-text-secondary">速度</Label>
            <span className="text-xs font-mono text-text-muted">
              x{speed.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[speed]}
            onValueChange={([value]) => setSpeed(value)}
            min={0.5}
            max={3.0}
            step={0.5}
            disabled={disabled || !autoPlay}
          />
        </div>
      </div>
    </div>
  );
}
