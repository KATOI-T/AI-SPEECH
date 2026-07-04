/**
 * シナリオAPI
 */

import { apiClient } from './client';
import { Scenario, ScenarioCreate } from '@/types';

interface ScenarioListResponse {
  items: Scenario[];
  total: number;
}

/**
 * シナリオ一覧を取得
 */
export async function getScenarios(activeOnly: boolean = true): Promise<Scenario[]> {
  const response = await apiClient.get<ScenarioListResponse>(
    `/api/v1/scenarios?active_only=${activeOnly}`
  );
  return response.items;
}

/**
 * シナリオを取得
 */
export async function getScenario(id: number): Promise<Scenario> {
  return apiClient.get<Scenario>(`/api/v1/scenarios/${id}`);
}

/**
 * シナリオを作成
 */
export async function createScenario(data: ScenarioCreate): Promise<Scenario> {
  return apiClient.post<Scenario>('/api/v1/scenarios', data);
}

/**
 * シナリオを更新
 */
export async function updateScenario(
  id: number,
  data: Partial<ScenarioCreate> & { is_active?: boolean }
): Promise<Scenario> {
  return apiClient.put<Scenario>(`/api/v1/scenarios/${id}`, data);
}

/**
 * シナリオを削除（論理削除）
 */
export async function deleteScenario(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/scenarios/${id}`);
}
