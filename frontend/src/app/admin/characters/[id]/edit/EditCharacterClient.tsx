"use client";

import { CharacterForm } from "@/components/characters/CharacterForm";
import { useCharacter } from "@/hooks/useCharacter";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditCharacterClientProps {
  id: string;
}

export function EditCharacterClient({ id }: EditCharacterClientProps) {
  const { character, isLoading, error } = useCharacter(parseInt(id, 10));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !character) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          キャラクターの取得に失敗しました。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">キャラクター編集</h1>
      <CharacterForm mode="edit" character={character} />
    </div>
  );
}
