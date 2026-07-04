/**
 * 音声一覧取得フック
 */

import useSWR from 'swr';
import { getVoices } from '@/lib/api/characters';

export function useVoices(provider?: string) {
  const { data, error, isLoading } = useSWR(
    ['voices', provider],
    () => getVoices(provider)
  );

  return {
    voices: data ?? [],
    isLoading,
    error,
  };
}
