"use client";

import { CharacterForm } from "@/components/characters/CharacterForm";

export default function NewCharacterPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">キャラクター作成</h1>
      <CharacterForm mode="create" />
    </div>
  );
}
