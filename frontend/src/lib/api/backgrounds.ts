/**
 * Background image API client
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface BackgroundUploadResponse {
  file_path: string;
  file_name: string;
  url: string;
}

export interface BackgroundUrlResponse {
  url: string;
  expires_in: number;
}

/**
 * 背景画像をアップロード
 */
export async function uploadBackgroundImage(
  file: File
): Promise<BackgroundUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/v1/backgrounds/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Upload failed");
  }

  return response.json();
}

/**
 * 背景画像を削除
 */
export async function deleteBackgroundImage(filePath: string): Promise<void> {
  // s3://backgrounds/xxx.png -> xxx.png
  const filename = filePath.split("/").pop();
  if (!filename) {
    throw new Error(`Invalid file path: ${filePath}`);
  }

  const response = await fetch(
    `${API_URL}/api/v1/backgrounds/${filename}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Delete failed");
  }
}

/**
 * 背景画像の署名付きURLを取得
 */
export async function getBackgroundUrl(
  filePath: string
): Promise<BackgroundUrlResponse> {
  const response = await fetch(
    `${API_URL}/api/v1/backgrounds/url?file_path=${encodeURIComponent(filePath)}`
  );

  if (!response.ok) {
    throw new Error("Failed to get background URL");
  }

  return response.json();
}

/**
 * 背景画像のS3パスを署名付きURLに解決
 */
export async function resolveBackgroundUrl(
  imagePath: string | null | undefined
): Promise<string | null> {
  if (!imagePath) return null;

  if (!imagePath.startsWith("s3://")) {
    return imagePath;
  }

  try {
    const { url } = await getBackgroundUrl(imagePath);
    return url;
  } catch {
    console.warn("Failed to resolve background URL:", imagePath);
    return null;
  }
}

/**
 * 背景画像のプロキシURL（バックエンド経由、CORS対応）
 * Three.js TextureLoaderで使用する場合はこちらを使用
 */
export function getBackgroundImageProxyUrl(
  imagePath: string
): string {
  return `${API_URL}/api/v1/backgrounds/image?file_path=${encodeURIComponent(imagePath)}`;
}

/**
 * 複数の背景画像パスを署名付きURLに一括解決
 */
export async function resolveBackgroundUrls(
  imagePaths: string[]
): Promise<(string | null)[]> {
  return Promise.all(imagePaths.map((path) => resolveBackgroundUrl(path)));
}
