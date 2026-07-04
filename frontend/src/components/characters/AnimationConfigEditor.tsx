"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { AnimationConfig } from "@/types";

interface AnimationConfigEditorProps {
  value: AnimationConfig | null;
  onChange: (config: AnimationConfig | null) => void;
}

const animationStates = [
  { key: "idle", label: "待機 (idle)", required: true },
  { key: "talking", label: "会話中 (talking)", required: true },
  { key: "happy", label: "喜び (happy)", required: false },
  { key: "sad", label: "悲しみ (sad)", required: false },
  { key: "surprised", label: "驚き (surprised)", required: false },
  { key: "angry", label: "怒り (angry)", required: false },
  { key: "thinking", label: "考え中 (thinking)", required: false },
] as const;

export function AnimationConfigEditor({
  value,
  onChange,
}: AnimationConfigEditorProps) {
  const [config, setConfig] = useState<AnimationConfig>(value ?? {});

  useEffect(() => {
    onChange(config);
  }, [config, onChange]);

  const handleChange = (key: string, animationValue: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: animationValue || undefined,
    }));
  };

  return (
    <div className="space-y-4">
      {animationStates.map(({ key, label, required }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`anim-${key}`}>
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={`anim-${key}`}
            value={(config as Record<string, string | undefined>)[key] ?? ""}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={`例: ${key}_01`}
            required={required}
            pattern="[a-zA-Z0-9_-]*"
            title="英数字、アンダースコア、ハイフンのみ使用できます"
          />
        </div>
      ))}
    </div>
  );
}
