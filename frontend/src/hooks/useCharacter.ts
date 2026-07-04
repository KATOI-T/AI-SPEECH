/**
 * キャラクター詳細取得フック
 */

import useSWR from 'swr';
import { getCharacter } from '@/lib/api/characters';

export function useCharacter(id: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ['character', id] : null,
    () => (id ? getCharacter(id) : null)
  );

  return {
    character: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
