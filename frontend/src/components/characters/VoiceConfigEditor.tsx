"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoicePreview } from "./VoicePreview";
import { useVoices } from "@/hooks/useVoices";
import type { VoiceConfig } from "@/types";

interface VoiceConfigEditorProps {
  value: VoiceConfig | null;
  onChange: (config: VoiceConfig | null) => void;
}

export function VoiceConfigEditor({ value, onChange }: VoiceConfigEditorProps) {
  const [provider, setProvider] = useState<"azure" | "aws" | "google">(
    value?.provider ?? "azure"
  );
  const [voiceName, setVoiceName] = useState(value?.voice_name ?? "");
  const [pitch, setPitch] = useState(value?.pitch ?? 0);
  const [rate, setRate] = useState(value?.rate ?? 1.0);

  const { voices, isLoading } = useVoices(provider);

  // プロバイダー変更時に音声名をリセット
  useEffect(() => {
    if (voices.length > 0 && !voices.find((v) => v.voice_name === voiceName)) {
      setVoiceName(voices[0].voice_name);
    }
  }, [voices, voiceName]);

  // 値が変更されたら親に通知
  useEffect(() => {
    if (voiceName) {
      onChange({
        provider,
        voice_name: voiceName,
        pitch,
        rate,
      });
    }
  }, [provider, voiceName, pitch, rate, onChange]);

  return (
    <div className="space-y-4">
      {/* プロバイダー選択 */}
      <div className="space-y-2">
        <Label>プロバイダー</Label>
        <Select
          value={provider}
          onValueChange={(value) => setProvider(value as "azure" | "aws" | "google")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="azure">Azure Speech Services</SelectItem>
            <SelectItem value="aws">AWS Polly</SelectItem>
            <SelectItem value="google">Google Text-to-Speech</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 音声選択 */}
      <div className="space-y-2">
        <Label>音声</Label>
        <Select
          value={voiceName}
          onValueChange={setVoiceName}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? "読み込み中..." : "音声を選択"} />
          </SelectTrigger>
          <SelectContent>
            {voices.map((voice) => (
              <SelectItem key={voice.voice_name} value={voice.voice_name}>
                {voice.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ピッチ調整 */}
      <div className="space-y-2">
        <Label>ピッチ: {pitch > 0 ? `+${pitch}` : pitch}</Label>
        <input
          type="range"
          min={-50}
          max={50}
          step={5}
          value={pitch}
          onChange={(e) => setPitch(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-text-muted">
          <span>-50（低い）</span>
          <span>0（標準）</span>
          <span>+50（高い）</span>
        </div>
      </div>

      {/* 速度調整 */}
      <div className="space-y-2">
        <Label>速度: {rate.toFixed(1)}</Label>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.1}
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-text-muted">
          <span>0.5（遅い）</span>
          <span>2.0（速い）</span>
        </div>
      </div>

      {/* 音声プレビュー */}
      {voiceName && (
        <VoicePreview
          voiceConfig={{
            provider,
            voice_name: voiceName,
            pitch,
            rate,
          }}
        />
      )}
    </div>
  );
}
