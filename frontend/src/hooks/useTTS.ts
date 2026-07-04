/**
 * F-005: 音声出力（TTS）- TTS フック
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { ttsApi } from "@/lib/api/tts";
import { useAudioPlayer } from "./useAudioPlayer";
import type { TTSRequest, TTSState, TTSError } from "@/types/tts";
import type { Viseme } from "@/types/lipsync";

/**
 * useTTS フックのオプション
 */
export interface UseTTSOptions {
  /** デフォルトの音声名 */
  defaultVoiceName?: string;
  /** デフォルトの音声速度（0.5-2.0） */
  defaultRate?: number;
  /** デフォルトの音声ピッチ（-50 to +50） */
  defaultPitch?: number;
  /** 合成完了後に自動再生するか */
  autoPlay?: boolean;
  /** 再生終了時のコールバック */
  onEnded?: () => void;
  /** エラー発生時のコールバック */
  onError?: (error: TTSError) => void;
}

/**
 * useTTS フックの戻り値
 */
export interface UseTTSReturn {
  /** 現在の状態 */
  state: TTSState;
  /** 音声要素（F-002 リップシンク連携用） */
  audioElement: HTMLAudioElement | null;
  /** Viseme データ（F-002 リップシンク連携用） */
  visemes: Viseme[];
  /** エラー情報 */
  error: TTSError | null;
  /** 再生中フラグ */
  isPlaying: boolean;
  /** 合成中フラグ */
  isSynthesizing: boolean;
  /** 音声合成を実行 */
  synthesize: (
    text: string,
    options?: Partial<Omit<TTSRequest, "text">>
  ) => Promise<void>;
  /** 再生 */
  play: () => Promise<void>;
  /** 一時停止 */
  pause: () => void;
  /** 停止（再生位置をリセット） */
  stop: () => void;
  /** リセット（状態を初期化） */
  reset: () => void;
}

/**
 * TTS（音声合成）を管理するカスタムフック
 *
 * Azure Speech Services を使用してテキストから音声を合成し、
 * F-002（リップシンク）と連携するための audioElement と visemes を提供する。
 *
 * @param options - フックオプション
 * @returns TTS 制御
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   audioElement,
 *   visemes,
 *   error,
 *   synthesize,
 *   play,
 *   pause,
 *   stop,
 * } = useTTS({
 *   defaultVoiceName: "ja-JP-NanamiNeural",
 *   autoPlay: true,
 *   onEnded: () => console.log("再生終了"),
 * });
 *
 * // 音声合成を実行
 * await synthesize("こんにちは");
 *
 * // F-002 リップシンクと連携
 * <VRMViewer
 *   enableLipSync={true}
 *   audioElement={audioElement}
 *   visemes={visemes}
 * />
 * ```
 */
export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const {
    defaultVoiceName,
    defaultRate,
    defaultPitch,
    autoPlay = false,
    onEnded,
    onError,
  } = options;

  const [state, setState] = useState<TTSState>("idle");
  const [visemes, setVisemes] = useState<Viseme[]>([]);
  const [error, setError] = useState<TTSError | null>(null);

  // 自動再生のためのフラグ
  const shouldAutoPlayRef = useRef(false);

  /**
   * 音声プレイヤー
   */
  const {
    audioRef,
    isPlaying,
    setAudioSource,
    play: audioPlay,
    pause: audioPause,
    stop: audioStop,
  } = useAudioPlayer({
    onPlay: () => {
      setState("playing");
    },
    onPause: () => {
      setState("paused");
    },
    onEnded: () => {
      setState("ended");
      setVisemes([]); // 再生終了時に Viseme をクリア
      onEnded?.();
    },
    onError: (err) => {
      const ttsError: TTSError = {
        message: err.message,
        code: "AUDIO_ERROR",
      };
      setError(ttsError);
      onError?.(ttsError);
    },
  });

  /**
   * 音声合成を実行
   */
  const synthesize = useCallback(
    async (
      text: string,
      requestOptions?: Partial<Omit<TTSRequest, "text">>
    ): Promise<void> => {
      if (!text.trim()) {
        const ttsError: TTSError = {
          message: "テキストを入力してください",
          code: "EMPTY_TEXT",
        };
        setError(ttsError);
        onError?.(ttsError);
        return;
      }

      // 状態をリセット
      setError(null);
      setState("synthesizing");

      try {
        // TTS API を呼び出し
        const response = await ttsApi.synthesize({
          text,
          voice_name: requestOptions?.voice_name ?? defaultVoiceName,
          rate: requestOptions?.rate ?? defaultRate,
          pitch: requestOptions?.pitch ?? defaultPitch,
        });

        // 音声ソースを設定
        const audio = setAudioSource(response.audio_base64, response.format);

        // Viseme データを設定
        setVisemes(response.visemes);

        // 状態を更新
        setState("ready");

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[useTTS] Synthesis complete: visemes=${response.visemes.length}`
          );
        }

        // 自動再生
        if (autoPlay) {
          shouldAutoPlayRef.current = true;
        }

        // audio が読み込まれたら自動再生
        if (autoPlay) {
          audio.oncanplaythrough = () => {
            if (shouldAutoPlayRef.current) {
              shouldAutoPlayRef.current = false;
              audio.play().catch((err) => {
                console.error("[useTTS] Auto-play failed:", err);
              });
            }
          };
        }
      } catch (err) {
        const ttsError: TTSError = {
          message:
            err instanceof Error ? err.message : "音声合成に失敗しました",
          code: "SYNTHESIS_ERROR",
        };
        setError(ttsError);
        setState("idle");
        onError?.(ttsError);
      }
    },
    [
      defaultVoiceName,
      defaultRate,
      defaultPitch,
      autoPlay,
      setAudioSource,
      onError,
    ]
  );

  /**
   * 再生
   */
  const play = useCallback(async (): Promise<void> => {
    if (state === "idle" || state === "synthesizing") {
      console.warn("[useTTS] Cannot play: no audio ready");
      return;
    }
    await audioPlay();
  }, [state, audioPlay]);

  /**
   * 一時停止
   */
  const pause = useCallback(() => {
    audioPause();
  }, [audioPause]);

  /**
   * 停止（再生位置をリセット）
   */
  const stop = useCallback(() => {
    audioStop();
    setState("ready");
  }, [audioStop]);

  /**
   * リセット（状態を初期化）
   */
  const reset = useCallback(() => {
    audioStop();
    setVisemes([]);
    setError(null);
    setState("idle");
  }, [audioStop]);

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      shouldAutoPlayRef.current = false;
    };
  }, []);

  return {
    state,
    audioElement: audioRef.current,
    visemes,
    error,
    isPlaying,
    isSynthesizing: state === "synthesizing",
    synthesize,
    play,
    pause,
    stop,
    reset,
  };
}
