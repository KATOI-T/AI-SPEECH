import { apiClient } from './client';
import { GenerationRequest, GenerationPreviewResponse } from '@/types';

/**
 * 1行説明からシナリオを自動生成する。
 * キャラクターは生成対象外 (手動で別途登録する)。
 */
export async function generateScenario(
  data: GenerationRequest
): Promise<GenerationPreviewResponse> {
  return apiClient.post<GenerationPreviewResponse>(
    '/api/v1/generation/scenario',
    data
  );
}
