/**
 * 瞬き制御パネル
 * 自動瞬きのON/OFF + 間隔調整
 */

"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface BlinkControlPanelProps {
  enabled: boolean;
  interval: number;
  onEnabledChange: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
  disabled?: boolean;
}

export function BlinkControlPanel({
  enabled,
  interval,
  onEnabledChange,
  onIntervalChange,
  disabled = false,
}: BlinkControlPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="blink-toggle" className="text-sm font-medium">
          自動瞬き
        </Label>
        <Switch
          id="blink-toggle"
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-text-secondary">
            瞬き間隔
          </Label>
          <span className="text-xs font-mono text-text-muted">
            {interval.toFixed(1)}秒
          </span>
        </div>
        <Slider
          value={[interval]}
          onValueChange={([value]) => onIntervalChange(value)}
          min={1}
          max={10}
          step={0.5}
          disabled={disabled || !enabled}
        />
        <div className="flex justify-between text-xs text-text-muted">
          <span>1秒</span>
          <span>10秒</span>
        </div>
      </div>
    </div>
  );
}
