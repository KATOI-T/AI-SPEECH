"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play } from "lucide-react";
import type { VoiceConfig } from "@/types";

interface VoicePreviewProps {
  voiceConfig: VoiceConfig;
}

export function VoicePreview({ voiceConfig }: VoicePreviewProps) {
  const [testText, setTestText] = useState("こんにちは！");
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlay = async () => {
    if (!testText.trim()) {
      setError("テストテキストを入力してください");
      return;
    }

    setError(null);
    setIsPlaying(true);

    try {
      // TTS API呼び出し
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/tts/synthesize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: testText,
            voice_name: voiceConfig.voice_name,
            rate: voiceConfig.rate,
            pitch: voiceConfig.pitch,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("音声合成に失敗しました");
      }

      const data = await response.json();

      // Base64音声データを再生
      if (data.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setError("音声の再生に失敗しました");
          setIsPlaying(false);
        };
        await audio.play();
      } else {
        throw new Error("音声データが取得できませんでした");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "音声テストに失敗しました");
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>音声テスト</Label>
      <Textarea
        value={testText}
        onChange={(e) => setTestText(e.target.value)}
        placeholder="テストテキストを入力"
        rows={2}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handlePlay}
        disabled={isPlaying}
        className="w-full"
      >
        <Play className="mr-2 h-4 w-4" />
        {isPlaying ? "再生中..." : "音声テスト"}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
