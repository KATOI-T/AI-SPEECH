'use client';

import { useState, useCallback } from 'react';
import { GenerationPreviewResponse, GenerationPreviewScenario } from '@/types';
import { generateScenario } from '@/lib/api/generation';

export type GenerationState =
  | 'input'
  | 'loading'
  | 'preview'
  | 'error'
  | 'saving'
  | 'done';

interface UseGenerationReturn {
  state: GenerationState;
  preview: GenerationPreviewResponse | null;
  error: string | null;
  description: string;
  editedScenario: GenerationPreviewScenario | null;
  setDescription: (desc: string) => void;
  openDialog: () => void;
  closeDialog: () => void;
  generate: () => Promise<void>;
  regenerate: () => Promise<void>;
  setEditedScenario: (s: GenerationPreviewScenario) => void;
  setSaving: () => void;
  setDone: () => void;
  setSaveError: (msg: string) => void;
}

export function useGeneration(): UseGenerationReturn {
  const [state, setState] = useState<GenerationState>('input');
  const [preview, setPreview] = useState<GenerationPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [editedScenario, setEditedScenario] =
    useState<GenerationPreviewScenario | null>(null);

  const openDialog = useCallback(() => {
    setState('input');
    setError(null);
    setPreview(null);
    setDescription('');
    setEditedScenario(null);
  }, []);

  const closeDialog = useCallback(() => {
    setState('input');
    setError(null);
    setPreview(null);
    setDescription('');
    setEditedScenario(null);
  }, []);

  const runGeneration = useCallback(async (desc: string) => {
    setState('loading');
    setError(null);
    try {
      const result = await generateScenario({ description: desc, locale: 'ja' });
      setPreview(result);
      setEditedScenario({ ...result.scenario });
      setState('preview');
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      setError(`生成に失敗しました: ${detail}`);
      setState('error');
    }
  }, []);

  const generate = useCallback(async () => {
    await runGeneration(description);
  }, [description, runGeneration]);

  const regenerate = useCallback(async () => {
    await runGeneration(description);
  }, [description, runGeneration]);

  const setSaving = useCallback(() => {
    setState('saving');
    setError(null);
  }, []);

  const setDone = useCallback(() => {
    setState('done');
  }, []);

  const setSaveError = useCallback((msg: string) => {
    setError(msg);
    setState('preview');
  }, []);

  return {
    state,
    preview,
    error,
    description,
    editedScenario,
    setDescription,
    openDialog,
    closeDialog,
    generate,
    regenerate,
    setEditedScenario,
    setSaving,
    setDone,
    setSaveError,
  };
}
