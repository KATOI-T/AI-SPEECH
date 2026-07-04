"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterDetail } from "@/components/characters/CharacterDetail";
import { useCharacter } from "@/hooks/useCharacter";
import { deleteCharacter } from "@/lib/api/characters";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";

export function CharacterDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { character, isLoading, error } = useCharacter(parseInt(id, 10));
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!character) return;

    setIsDeleting(true);
    try {
      await deleteCharacter(character.id);
      toast({
        title: "削除完了",
        description: `「${character.name}」を削除しました。`,
      });
      router.push("/admin/characters");
    } catch (err) {
      toast({
        title: "削除失敗",
        description: err instanceof Error ? err.message : "削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

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
    <>
      <CharacterDetail
        character={character}
        onDelete={() => setShowDeleteDialog(true)}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>キャラクター削除</DialogTitle>
            <DialogDescription>
              「{character.name}」を削除しますか？
              <br />
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
