"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCharacters } from "@/hooks/useCharacters";
import { deleteCharacter } from "@/lib/api/characters";
import { useToast } from "@/hooks/useToast";
import { Pencil, Trash2, Eye, Plus } from "lucide-react";
import type { Character } from "@/types";

const ITEMS_PER_PAGE = 10;

export function CharacterList() {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { characters, total, isLoading, error, refresh } = useCharacters({
    skip: (page - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
    activeOnly: !showInactive,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteCharacter(deleteTarget.id);
      toast({
        title: "削除完了",
        description: `「${deleteTarget.name}」を削除しました。`,
      });
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast({
        title: "削除失敗",
        description: err instanceof Error ? err.message : "削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          キャラクター一覧の取得に失敗しました。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          キャラクター管理
        </h1>
        <Button onClick={() => router.push("/admin/characters/new")}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="showInactive"
          checked={showInactive}
          onCheckedChange={(checked) => {
            setShowInactive(checked as boolean);
            setPage(1);
          }}
        />
        <Label htmlFor="showInactive" className="text-sm text-text-primary">
          無効なキャラクターも表示
        </Label>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : characters.length === 0 ? (
        <Alert>
          <AlertDescription>
            キャラクターが登録されていません。
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>モデル形式</TableHead>
                <TableHead>音声</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {characters.map((character) => (
                <TableRow key={character.id}>
                  <TableCell className="font-medium">{character.id}</TableCell>
                  <TableCell>{character.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {character.model_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {character.voice_config?.provider
                      ? character.voice_config.provider.charAt(0).toUpperCase() +
                        character.voice_config.provider.slice(1)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={character.is_active ? "default" : "outline"}>
                      {character.is_active ? "有効" : "無効"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/characters/${character.id}`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/characters/${character.id}/edit`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(character)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">
                表示: {ITEMS_PER_PAGE}件/ページ
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  前へ
                </Button>
                <span className="text-sm text-text-primary">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>キャラクター削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.name}」を削除しますか？
              <br />
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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
    </div>
  );
}
