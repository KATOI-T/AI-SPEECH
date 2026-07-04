/**
 * キャラクターAPI
 */

import { apiClient } from './client';
import { Character, CharacterCreate, VoiceInfo, ModelUploadResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CharacterListResponse {
  items: Character[];
  total: number;
}

interface VoiceListResponse {
  voices: VoiceInfo[];
}

/**
 * キャラクター一覧を取得
 */
export async function getCharacters(options?: {
  skip?: number;
  limit?: number;
  activeOnly?: boolean;
}): Promise<CharacterListResponse> {
  const params = new URLSearchParams();
  if (options?.skip !== undefined) params.set('skip', String(options.skip));
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.activeOnly !== undefined) params.set('active_only', String(options.activeOnly));

  const query = params.toString();
  return apiClient.get<CharacterListResponse>(
    `/api/v1/characters${query ? `?${query}` : ''}`
  );
}

/**
 * キャラクターを取得
 */
export async function getCharacter(id: number): Promise<Character> {
  return apiClient.get<Character>(`/api/v1/characters/${id}`);
}

/**
 * キャラクターを作成
 */
export async function createCharacter(data: CharacterCreate): Promise<Character> {
  return apiClient.post<Character>('/api/v1/characters', data);
}

/**
 * キャラクターを更新
 */
export async function updateCharacter(
  id: number,
  data: Partial<CharacterCreate>
): Promise<Character> {
  return apiClient.put<Character>(`/api/v1/characters/${id}`, data);
}

/**
 * キャラクターを削除（論理削除）
 */
export async function deleteCharacter(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/characters/${id}`);
}

/**
 * 3Dモデルをアップロード
 */
export async function uploadModel(file: File): Promise<ModelUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/characters/upload-model`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

/**
 * 利用可能な音声一覧を取得
 */
export async function getVoices(provider?: string): Promise<VoiceInfo[]> {
  const params = provider ? `?provider=${provider}` : '';
  const response = await apiClient.get<VoiceListResponse>(
    `/api/v1/characters/voices${params}`
  );
  return response.voices;
}
