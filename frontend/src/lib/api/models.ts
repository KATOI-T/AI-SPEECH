/**
 * Model storage API client
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ModelFile {
  file_path: string;
  file_name: string;
  file_size: number;
  model_type: "vrm" | "glb";
  uploaded_at: string;
}

export interface ModelUploadResponse {
  file_path: string;
  file_name: string;
  file_size: number;
  model_type: "vrm" | "glb";
}

export interface ModelListResponse {
  models: ModelFile[];
  total: number;
}

/**
 * Upload 3D model file to local storage
 */
export async function uploadModelLocal(file: File): Promise<ModelUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/v1/models/upload`, {
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
 * Get list of uploaded models
 */
export async function getModels(): Promise<ModelListResponse> {
  const response = await fetch(`${API_URL}/api/v1/models`);

  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }

  return response.json();
}

/**
 * Delete a model file
 */
export async function deleteModel(filename: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/models/${filename}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Delete failed");
  }
}

export interface SignedUrlResponse {
  url: string;
  expires_in: number | null;
}

/**
 * Get signed URL for model file download
 */
export async function getSignedUrl(filename: string): Promise<SignedUrlResponse> {
  const response = await fetch(`${API_URL}/api/v1/models/signed-url/${filename}`);

  if (!response.ok) {
    throw new Error("Failed to get signed URL");
  }

  return response.json();
}

/**
 * Resolve model path to a loadable URL
 *
 * - Local paths ("/models/uploads/...") are returned as-is
 * - S3 paths ("s3://...") are resolved via signed URL API
 */
export async function resolveModelUrl(modelPath: string): Promise<string> {
  if (!modelPath.startsWith("s3://")) {
    return modelPath;
  }

  // Extract filename from "s3://uploads/abc12345_miku.vrm"
  const filename = modelPath.split("/").pop();
  if (!filename) {
    throw new Error(`Invalid S3 path: ${modelPath}`);
  }

  const { url } = await getSignedUrl(filename);
  return url;
}
