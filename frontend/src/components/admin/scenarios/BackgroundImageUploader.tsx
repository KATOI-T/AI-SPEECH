'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  uploadBackgroundImage,
  resolveBackgroundUrl,
} from '@/lib/api/backgrounds';
import { ImagePlus, Trash2, Loader2, Replace } from 'lucide-react';

const ALLOWED_TYPES = ['image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 3;

type UploadMode = 'add' | 'replace';

interface BackgroundImageUploaderProps {
  currentImagePaths: string[];
  onUpdate: (paths: string[]) => void;
}

export function BackgroundImageUploader({
  currentImagePaths,
  onUpdate,
}: BackgroundImageUploaderProps) {
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetSlotRef = useRef<number>(0);
  const uploadModeRef = useRef<UploadMode>('add');

  // 既存画像のプレビューを読み込み
  useEffect(() => {
    if (currentImagePaths.length === 0) {
      setPreviewUrls([]);
      return;
    }

    let cancelled = false;
    setIsLoadingPreviews(true);

    Promise.all(currentImagePaths.map((path) => resolveBackgroundUrl(path))).then(
      (urls) => {
        if (!cancelled) {
          setPreviewUrls(urls);
          setIsLoadingPreviews(false);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [currentImagePaths]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('PNG, JPG, JPEG形式のみ対応しています');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('ファイルサイズは10MB以下にしてください');
      return;
    }

    const mode = uploadModeRef.current;
    const slotIndex = targetSlotRef.current;

    // ローカルプレビュー表示
    const localPreview = URL.createObjectURL(file);
    setPreviewUrls((prev) => {
      const next = [...prev];
      if (mode === 'replace' && next[slotIndex]?.startsWith('blob:')) {
        URL.revokeObjectURL(next[slotIndex]!);
      }
      if (mode === 'add') {
        next.push(localPreview);
      } else {
        next[slotIndex] = localPreview;
      }
      return next;
    });

    const displayIndex = mode === 'add' ? currentImagePaths.length : slotIndex;
    setUploadingIndex(displayIndex);

    try {
      const result = await uploadBackgroundImage(file);
      URL.revokeObjectURL(localPreview);

      setPreviewUrls((prev) => {
        const next = [...prev];
        next[displayIndex] = result.url;
        return next;
      });

      if (mode === 'add') {
        onUpdate([...currentImagePaths, result.file_path]);
      } else {
        const newPaths = [...currentImagePaths];
        newPaths[slotIndex] = result.file_path;
        onUpdate(newPaths);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'アップロードに失敗しました'
      );
      setPreviewUrls((prev) => {
        if (mode === 'add') {
          return prev.slice(0, -1);
        }
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
    } finally {
      setUploadingIndex(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const newPaths = currentImagePaths.filter((_, i) => i !== index);
    onUpdate(newPaths);

    setPreviewUrls((prev) => {
      const url = prev[index];
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      return prev.filter((_, i) => i !== index);
    });
    setError(null);
  };

  const handleReplaceClick = (index: number) => {
    uploadModeRef.current = 'replace';
    targetSlotRef.current = index;
    fileInputRef.current?.click();
  };

  const handleAddClick = () => {
    uploadModeRef.current = 'add';
    targetSlotRef.current = currentImagePaths.length;
    fileInputRef.current?.click();
  };

  const canAdd = currentImagePaths.length < MAX_IMAGES;

  return (
    <div className="space-y-2">
      <Label>背景画像（最大{MAX_IMAGES}枚）</Label>

      <div className="flex gap-3 flex-wrap">
        {/* 登録済み画像 */}
        {currentImagePaths.map((_, slotIndex) => {
          const previewUrl = previewUrls[slotIndex];
          const isUploading = uploadingIndex === slotIndex;

          return (
            <div key={slotIndex} className="flex flex-col items-center gap-1">
              <div className="w-[120px] h-[80px] rounded-md border border-border-primary bg-bg-secondary flex items-center justify-center overflow-hidden">
                {isLoadingPreviews ? (
                  <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`背景画像 ${slotIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleReplaceClick(slotIndex)}
                  disabled={isUploading || uploadingIndex !== null}
                  title="差し替え"
                >
                  {isUploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Replace className="h-3 w-3" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                  onClick={() => handleRemove(slotIndex)}
                  disabled={uploadingIndex !== null}
                  title="削除"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* 追加スロット */}
        {canAdd && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleAddClick}
              disabled={uploadingIndex !== null}
              className="w-[120px] h-[80px] rounded-md border-2 border-dashed border-border-primary bg-bg-secondary flex flex-col items-center justify-center gap-1 hover:border-border-focus transition-colors disabled:opacity-50"
            >
              {uploadingIndex === currentImagePaths.length ? (
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5 text-text-muted" />
                  <span className="text-[10px] text-text-muted">追加</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-text-muted">
        PNG, JPG, JPEG（最大10MB）
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
