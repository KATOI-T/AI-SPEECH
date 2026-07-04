/**
 * F-002: リップシンク機能 - カスタムフック
 */

import { useEffect, useRef, useCallback } from "react";
import type { VRM } from "@pixiv/three-vrm";
import { LipSyncController } from "@/lib/three/lipsync-utils";
import type { Viseme, LipSyncControllerOptions } from "@/types/lipsync";

/**
 * useLipSync フックのオプション
 */
export interface UseLipSyncOptions {
  /** VRMインスタンス */
  vrm: VRM | null;
  /** 音声要素 */
  audioElement: HTMLAudioElement | null;
  /** Visemeデータ */
  visemes: Viseme[];
  /** リップシンク有効化フラグ（デフォルト: true） */
  enabled?: boolean;
  /** コントローラーオプション */
  controllerOptions?: LipSyncControllerOptions;
}

/**
 * useLipSync フックの戻り値
 */
export interface UseLipSyncReturn {
  /** コントローラーインスタンス */
  controller: LipSyncController | null;
  /** 手動リセット */
  reset: () => void;
}

/**
 * リップシンクを管理するカスタムフック
 *
 * VRMモデルと音声要素を連携し、Visemeデータに基づいてリアルタイムにリップシンクを実行する。
 *
 * @param options - フックオプション
 * @returns コントローラーとリセット関数
 *
 * @example
 * ```tsx
 * const { controller, reset } = useLipSync({
 *   vrm,
 *   audioElement,
 *   visemes: [
 *     { time: 0.0, viseme: 'sil' },
 *     { time: 0.1, viseme: 'aa' },
 *     { time: 0.3, viseme: 'ih' },
 *   ],
 *   enabled: true,
 * });
 * ```
 */
export function useLipSync({
  vrm,
  audioElement,
  visemes,
  enabled = true,
  controllerOptions,
}: UseLipSyncOptions): UseLipSyncReturn {
  const controllerRef = useRef<LipSyncController | null>(null);
  const animationFrameRef = useRef<number>();

  /**
   * コントローラー初期化
   */
  useEffect(() => {
    if (!vrm || !enabled) {
      controllerRef.current = null;
      return;
    }

    controllerRef.current = new LipSyncController(vrm, controllerOptions);

    if (process.env.NODE_ENV === "development") {
      console.log("[useLipSync] Controller initialized");
    }

    return () => {
      controllerRef.current?.reset();
      controllerRef.current = null;
    };
  }, [vrm, enabled, controllerOptions]);

  /**
   * Viseme データ設定
   */
  useEffect(() => {
    if (controllerRef.current && visemes.length > 0) {
      controllerRef.current.setVisemes(visemes);

      if (process.env.NODE_ENV === "development") {
        console.log("[useLipSync] Visemes set:", visemes.length);
      }
    }
  }, [visemes]);

  /**
   * 音声再生と同期
   */
  useEffect(() => {
    if (!audioElement || !controllerRef.current || !enabled) return;

    let isPlaying = false;

    /**
     * アニメーションフレームごとにリップシンクを更新
     */
    const updateLipSync = () => {
      if (!isPlaying || !audioElement || !controllerRef.current) return;

      const currentTime = audioElement.currentTime;
      controllerRef.current.updateTime(currentTime);

      animationFrameRef.current = requestAnimationFrame(updateLipSync);
    };

    /**
     * 音声再生開始時
     */
    const handlePlay = () => {
      isPlaying = true;

      if (process.env.NODE_ENV === "development") {
        console.log("[useLipSync] Audio play started");
      }

      updateLipSync();
    };

    /**
     * 音声一時停止時
     */
    const handlePause = () => {
      isPlaying = false;

      if (process.env.NODE_ENV === "development") {
        console.log("[useLipSync] Audio paused");
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    /**
     * 音声再生終了時
     */
    const handleEnded = () => {
      isPlaying = false;

      if (process.env.NODE_ENV === "development") {
        console.log("[useLipSync] Audio ended");
      }

      controllerRef.current?.reset();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    /**
     * シーク時
     */
    const handleSeeked = () => {
      if (isPlaying && controllerRef.current) {
        const currentTime = audioElement.currentTime;
        controllerRef.current.updateTime(currentTime);

        if (process.env.NODE_ENV === "development") {
          console.log("[useLipSync] Audio seeked to:", currentTime);
        }
      }
    };

    // イベントリスナー登録
    audioElement.addEventListener("play", handlePlay);
    audioElement.addEventListener("pause", handlePause);
    audioElement.addEventListener("ended", handleEnded);
    audioElement.addEventListener("seeked", handleSeeked);

    // 既に再生中の場合は開始
    if (!audioElement.paused) {
      handlePlay();
    }

    // クリーンアップ
    return () => {
      isPlaying = false;

      audioElement.removeEventListener("play", handlePlay);
      audioElement.removeEventListener("pause", handlePause);
      audioElement.removeEventListener("ended", handleEnded);
      audioElement.removeEventListener("seeked", handleSeeked);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioElement, enabled]);

  /**
   * 手動リセット
   */
  const reset = useCallback(() => {
    controllerRef.current?.reset();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[useLipSync] Manual reset");
    }
  }, []);

  return {
    controller: controllerRef.current,
    reset,
  };
}
