"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModelPreview } from "./ModelPreview";
import { AnimationPreview } from "./AnimationPreview";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { Character } from "@/types";

interface CharacterDetailProps {
  character: Character;
  onDelete?: () => void;
}

export function CharacterDetail({ character, onDelete }: CharacterDetailProps) {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          キャラクター詳細
        </h1>
        <div className="flex gap-2">
          <Link href="/admin/characters">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              一覧へ
            </Button>
          </Link>
          <Link href={`/admin/characters/${character.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
          {onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左カラム: 基本情報 */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary border-b border-border-primary pb-2">
            基本情報
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-text-muted">ID:</span>{" "}
              <span className="text-text-primary font-medium">
                {character.id}
              </span>
            </div>
            <div>
              <span className="text-text-muted">名前:</span>{" "}
              <span className="text-text-primary font-medium">
                {character.name}
              </span>
            </div>
            <div>
              <span className="text-text-muted">状態:</span>{" "}
              <Badge variant={character.is_active ? "default" : "outline"}>
                {character.is_active ? "有効" : "無効"}
              </Badge>
            </div>
            <div>
              <span className="text-text-muted">作成日:</span>{" "}
              <span className="text-text-primary">
                {formatDate(character.created_at)}
              </span>
            </div>
            <div>
              <span className="text-text-muted">更新日:</span>{" "}
              <span className="text-text-primary">
                {formatDate(character.updated_at)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text-primary">ペルソナ:</h3>
            <p className="text-sm text-text-primary whitespace-pre-wrap">
              {character.persona}
            </p>
          </div>

          {character.speaking_style && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-primary">口調:</h3>
              <p className="text-sm text-text-primary whitespace-pre-wrap">
                {character.speaking_style}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text-primary">
              システムプロンプト:
            </h3>
            <p className="text-sm text-text-primary whitespace-pre-wrap">
              {character.system_prompt}
            </p>
          </div>
        </Card>

        {/* 右カラム: モデル設定 */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary border-b border-border-primary pb-2">
            3Dモデル
          </h2>

          <ModelPreview
            modelPath={character.model_path}
            modelType={character.model_type}
          />

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-text-muted">モデルパス:</span>{" "}
              <span className="text-text-primary font-mono text-xs">
                {character.model_path}
              </span>
            </div>
            <div>
              <span className="text-text-muted">モデル形式:</span>{" "}
              <Badge variant="outline">
                {character.model_type.toUpperCase()}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 音声設定 */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary border-b border-border-primary pb-2">
            音声設定
          </h2>

          {character.voice_config ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-text-muted">プロバイダー:</span>{" "}
                <span className="text-text-primary font-medium">
                  {character.voice_config.provider.charAt(0).toUpperCase() +
                    character.voice_config.provider.slice(1)}
                </span>
              </div>
              <div>
                <span className="text-text-muted">音声名:</span>{" "}
                <span className="text-text-primary font-mono text-xs">
                  {character.voice_config.voice_name}
                </span>
              </div>
              <div>
                <span className="text-text-muted">ピッチ:</span>{" "}
                <span className="text-text-primary">
                  {character.voice_config.pitch > 0
                    ? `+${character.voice_config.pitch}`
                    : character.voice_config.pitch}
                </span>
              </div>
              <div>
                <span className="text-text-muted">速度:</span>{" "}
                <span className="text-text-primary">
                  {character.voice_config.rate.toFixed(1)}x
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted">設定なし</p>
          )}
        </Card>

        {/* アニメーション設定 */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary border-b border-border-primary pb-2">
            アニメーション設定
          </h2>

          {character.animation_config ? (
            <div className="space-y-2 text-sm">
              {Object.entries(character.animation_config).map(
                ([key, value]) =>
                  value && (
                    <div key={key}>
                      <span className="text-text-muted">{key}:</span>{" "}
                      <span className="text-text-primary font-mono text-xs">
                        {value}
                      </span>
                    </div>
                  )
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">設定なし</p>
          )}
        </Card>
      </div>

      {/* アニメーションプレビュー */}
      {character.animation_config && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary border-b border-border-primary pb-2">
            モーションプレビュー
          </h2>
          <AnimationPreview
            modelPath={character.model_path}
            modelType={character.model_type}
            animationConfig={character.animation_config}
          />
        </Card>
      )}
    </div>
  );
}
