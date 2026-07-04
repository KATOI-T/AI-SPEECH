/**
 * F-005: 音声出力（TTS）- 音声再生フック
 */

import { useRef, useState, useCallback, useEffect } from "react";

/**
 * useAudioPlayer フックのオプション
 */
export interface UseAudioPlayerOptions {
  /** 再生開始時のコールバック */
  onPlay?: () => void;
  /** 一時停止時のコールバック */
  onPause?: () => void;
  /** 再生終了時のコールバック */
  onEnded?: () => void;
  /** エラー発生時のコールバック */
  onError?: (error: Error) => void;
  /** 時間更新時のコールバック */
  onTimeUpdate?: (currentTime: number) => void;
}

/**
 * useAudioPlayer フックの戻り値
 */
export interface UseAudioPlayerReturn {
  /** HTMLAudioElement への参照 */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** 再生中フラグ */
  isPlaying: boolean;
  /** 現在の再生時間（秒） */
  currentTime: number;
  /** 音声の長さ（秒） */
  duration: number;
  /** 音声ソースを設定（base64） */
  setAudioSource: (base64: string, format?: string) => HTMLAudioElement;
  /** 再生 */
  play: () => Promise<void>;
  /** 一時停止 */
  pause: () => void;
  /** 停止（再生位置をリセット） */
  stop: () => void;
  /** シーク */
  seek: (time: number) => void;
}

/**
 * HTML5 Audio API を使用した音声再生フック
 *
 * @param options - フックオプション
 * @returns 音声プレイヤー制御
 *
 * @example
 * ```tsx
 * const { audioRef, setAudioSource, play, pause, stop, isPlaying } = useAudioPlayer({
 *   onPlay: () => console.log("Playing"),
 *   onEnded: () => console.log("Ended"),
 * });
 *
 * // 音声ソースを設定
 * setAudioSource(base64Data, "wav");
 *
 * // 再生
 * await play();
 * ```
 */
export function useAudioPlayer(
  options: UseAudioPlayerOptions = {}
): UseAudioPlayerReturn {
  const { onPlay, onPause, onEnded, onError, onTimeUpdate } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  /**
   * イベントリスナーをセットアップ
   */
  const setupEventListeners = useCallback(
    (audio: HTMLAudioElement) => {
      const handlePlay = () => {
        setIsPlaying(true);
        onPlay?.();
      };

      const handlePause = () => {
        setIsPlaying(false);
        onPause?.();
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onEnded?.();
      };

      const handleError = () => {
        setIsPlaying(false);
        const error = new Error(
          audio.error?.message || "Audio playback error"
        );
        onError?.(error);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      };

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    },
    [onPlay, onPause, onEnded, onError, onTimeUpdate]
  );

  /**
   * 音声ソースを設定（base64）
   */
  const setAudioSource = useCallback(
    (base64: string, format: string = "wav"): HTMLAudioElement => {
      // 既存の音声を停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      // 新しい音声要素を作成
      const audio = new Audio(`data:audio/${format};base64,${base64}`);
      audioRef.current = audio;

      // イベントリスナーをセットアップ
      setupEventListeners(audio);

      // 状態をリセット
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);

      return audio;
    },
    [setupEventListeners]
  );

  /**
   * 再生
   */
  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current) {
      throw new Error("No audio source set");
    }

    try {
      await audioRef.current.play();
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Failed to play audio");
      onError?.(err);
      throw err;
    }
  }, [onError]);

  /**
   * 一時停止
   */
  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  /**
   * 停止（再生位置をリセット）
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, []);

  /**
   * シーク
   */
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(time, audioRef.current.duration || 0)
      );
    }
  }, []);

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    setAudioSource,
    play,
    pause,
    stop,
    seek,
  };
}
