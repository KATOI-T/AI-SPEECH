"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VoiceConfigEditor } from "./VoiceConfigEditor";
import { AnimationConfigEditor } from "./AnimationConfigEditor";
import { ModelUploader } from "./ModelUploader";
import { ModelPreview } from "./ModelPreview";
import { createCharacter, updateCharacter } from "@/lib/api/characters";
import { useToast } from "@/hooks/useToast";
import type { Character, CharacterCreate, VoiceConfig, AnimationConfig } from "@/types";

interface CharacterFormProps {
  character?: Character;
  mode: "create" | "edit";
}

export function CharacterForm({ character, mode }: CharacterFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [name, setName] = useState(character?.name ?? "");
  const [persona, setPersona] = useState(character?.persona ?? "");
  const [speakingStyle, setSpeakingStyle] = useState(character?.speaking_style ?? "");
  const [systemPrompt, setSystemPrompt] = useState(character?.system_prompt ?? "");
  const [modelPath, setModelPath] = useState(character?.model_path ?? "");
  const [modelType, setModelType] = useState<"vrm" | "glb">(character?.model_type ?? "vrm");
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(
    character?.voice_config ?? null
  );
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig | null>(
    character?.animation_config ?? null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data: CharacterCreate = {
        name,
        persona,
        speaking_style: speakingStyle || undefined,
        system_prompt: systemPrompt,
        model_path: modelPath,
        model_type: modelType,
        voice_config: voiceConfig ?? undefined,
        animation_config: animationConfig ?? undefined,
      };

      if (mode === "create") {
        await createCharacter(data);
        toast({
          title: "作成完了",
          description: `「${name}」を作成しました。`,
        });
      } else if (character) {
        await updateCharacter(character.id, data);
        toast({
          title: "更新完了",
          description: `「${name}」を更新しました。`,
        });
      }

      router.push("/admin/characters");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModelUploaded = (path: string, type: "vrm" | "glb") => {
    setModelPath(path);
    setModelType(type);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左カラム: 基本情報 */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">基本情報</h2>

          <div className="space-y-2">
            <Label htmlFor="name">
              キャラクター名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="例: ミク"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona">
              ペルソナ設定 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="persona"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              required
              rows={4}
              placeholder="明るく元気な女の子。歌うことが大好き。"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="speakingStyle">口調・話し方</Label>
            <Textarea
              id="speakingStyle"
              value={speakingStyle}
              onChange={(e) => setSpeakingStyle(e.target.value)}
              rows={2}
              placeholder='「〜だよ！」「〜なの♪」'
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">
              システムプロンプト <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              required
              rows={6}
              placeholder="あなたは「ミク」という名前のバーチャルシンガーです。"
            />
          </div>
        </Card>

        {/* 右カラム: モデル設定 */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">3Dモデル</h2>

          {/* モデルプレビュー */}
          <ModelPreview modelPath={modelPath} modelType={modelType} />

          {/* モデルアップローダー */}
          <ModelUploader
            currentPath={modelPath}
            onUploaded={handleModelUploaded}
          />

          {/* モデル形式 */}
          <div className="space-y-2">
            <Label>モデル形式</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modelType"
                  value="vrm"
                  checked={modelType === "vrm"}
                  onChange={() => setModelType("vrm")}
                  className="h-4 w-4"
                />
                <span className="text-sm text-text-primary">VRM</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modelType"
                  value="glb"
                  checked={modelType === "glb"}
                  onChange={() => setModelType("glb")}
                  className="h-4 w-4"
                />
                <span className="text-sm text-text-primary">GLB</span>
              </label>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 音声設定 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">音声設定</h2>
          <VoiceConfigEditor value={voiceConfig} onChange={setVoiceConfig} />
        </Card>

        {/* アニメーション設定 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            アニメーション設定
          </h2>
          <AnimationConfigEditor
            value={animationConfig}
            onChange={setAnimationConfig}
          />
        </Card>
      </div>

      {/* 送信ボタン */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : mode === "create" ? "作成" : "更新"}
        </Button>
      </div>
    </form>
  );
}
