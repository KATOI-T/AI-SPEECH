/**
 * VRMモデル状態管理カスタムフック
 * F-001: 3Dモデル表示機能
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { VRM } from "@pixiv/three-vrm";
import type { Object3D } from "three";
import { loadModel, disposeVRM } from "@/lib/three/model-loader";
import { categorizeError } from "@/lib/three/errors";

interface UseVRMOptions {
  /** モデルファイルパス */
  modelPath: string;
  /** モデル形式 */
  modelType: "vrm" | "glb";
  /** 自動読み込み（デフォルト: true） */
  autoLoad?: boolean;
}

interface UseVRMReturn {
  /** VRMインスタンス（VRMの場合） */
  vrm: VRM | null;
  /** Three.js Object3D */
  model: Object3D | null;
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** エラー情報 */
  error: Error | null;
  /** 読み込み進捗（0-100） */
  progress: number;
  /** 手動読み込み */
  load: () => Promise<void>;
  /** リソース解放 */
  dispose: () => void;
}

/**
 * VRMモデルの状態管理を行うカスタムフック
 *
 * @param options - フックオプション
 * @returns VRM状態とメソッド
 */
export function useVRM(options: UseVRMOptions): UseVRMReturn {
  const { modelPath, modelType, autoLoad = true } = options;

  const [vrm, setVrm] = useState<VRM | null>(null);
  const [model, setModel] = useState<Object3D | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  // 読み込み中フラグ（重複読み込み防止）
  const isLoadingRef = useRef(false);

  /**
   * モデルを読み込む
   */
  const load = useCallback(async () => {
    // 重複読み込み防止
    if (isLoadingRef.current) {
      console.warn("[useVRM] Load already in progress");
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    setProgress(0);

    const startTime = performance.now();

    try {
      console.log("[useVRM] Loading model:", { modelPath, modelType });

      const result = await loadModel({
        modelPath,
        modelType,
        onProgress: (p) => setProgress(p),
        onError: (err) => {
          console.error("[useVRM] Model load failed:", err);
          setError(err);
        },
      });

      setVrm(result.vrm);
      setModel(result.model);
      setProgress(100);

      const loadTime = performance.now() - startTime;

      // 開発環境でのパフォーマンスログ
      if (process.env.NODE_ENV === "development") {
        console.log("[useVRM] Performance:", {
          loadTime: `${loadTime.toFixed(2)}ms`,
          modelType,
          hasVRM: !!result.vrm,
        });
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Unknown error occurred");
      const userMessage = categorizeError(error);

      console.error("[useVRM] Model load failed:", {
        modelPath,
        modelType,
        error: error.message,
        stack: error.stack,
      });

      setError(new Error(userMessage));
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [modelPath, modelType]);

  /**
   * リソースを破棄する
   */
  const dispose = useCallback(() => {
    console.log("[useVRM] Disposing resources");

    if (vrm) {
      disposeVRM(vrm);
    }

    setVrm(null);
    setModel(null);
    setProgress(0);
    setError(null);
  }, [vrm]);

  /**
   * 自動読み込み
   */
  useEffect(() => {
    if (autoLoad && !model && !error && !isLoading) {
      load();
    }
  }, [autoLoad, model, error, isLoading, load]);

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (vrm) {
        disposeVRM(vrm);
      }
    };
  }, [vrm]);

  return {
    vrm,
    model,
    isLoading,
    error,
    progress,
    load,
    dispose,
  };
}
