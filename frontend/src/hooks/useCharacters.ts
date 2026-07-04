/**
 * キャラクター一覧取得フック
 */

import useSWR from 'swr';
import { getCharacters } from '@/lib/api/characters';

export function useCharacters(options?: {
  skip?: number;
  limit?: number;
  activeOnly?: boolean;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    ['characters', options],
    () => getCharacters(options)
  );

  return {
    characters: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}
