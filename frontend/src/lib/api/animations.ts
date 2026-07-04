/**
 * アニメーションモデルAPI
 */

import { apiClient } from './client';
import type { AnimationModel, AnimationModelCreate, AnimationModelUpdate } from '@/types';

interface AnimationModelListResponse {
  items: AnimationModel[];
  total: number;
}

/**
 * アニメーションモデル一覧を取得
 */
export async function getAnimationModels(options?: {
  skip?: number;
  limit?: number;
  activeOnly?: boolean;
}): Promise<AnimationModelListResponse> {
  const params = new URLSearchParams();
  if (options?.skip !== undefined) params.set('skip', String(options.skip));
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.activeOnly !== undefined) params.set('active_only', String(options.activeOnly));

  const query = params.toString();
  return apiClient.get<AnimationModelListResponse>(
    `/api/v1/animations/models${query ? `?${query}` : ''}`
  );
}

/**
 * アニメーションモデルを取得
 */
export async function getAnimationModel(id: number): Promise<AnimationModel> {
  return apiClient.get<AnimationModel>(`/api/v1/animations/models/${id}`);
}

/**
 * アニメーションモデルを作成
 */
export async function createAnimationModel(data: AnimationModelCreate): Promise<AnimationModel> {
  return apiClient.post<AnimationModel>('/api/v1/animations/models', data);
}

/**
 * アニメーションモデルを更新
 */
export async function updateAnimationModel(
  id: number,
  data: AnimationModelUpdate
): Promise<AnimationModel> {
  return apiClient.put<AnimationModel>(`/api/v1/animations/models/${id}`, data);
}

/**
 * アニメーションモデルを削除（論理削除）
 */
export async function deleteAnimationModel(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/animations/models/${id}`);
}
