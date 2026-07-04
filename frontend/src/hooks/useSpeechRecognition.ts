/**
 * 音声認識制御カスタムフック
 * F-004: 音声入力（STT）機能
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  RecognitionState,
  RecognitionResult,
  RecognitionError,
  SpeechToken,
} from "@/types/speech";
import { AzureSpeechRecognizer } from "@/lib/speech/azure-stt";

export interface UseSpeechRecognitionOptions {
  /** 認識言語 */
  language?: string;
  /** 継続認識モード（デフォルト: true） */
  continuous?: boolean;
  /** 中間認識結果を受け取るか */
  interimResults?: boolean;
  /** 無音検出タイムアウト（ミリ秒、デフォルト: 2000） */
  silenceTimeoutMs?: number;
  /** 認識完了後に自動停止するか（デフォルト: true） */
  autoStopOnRecognized?: boolean;
  /**
   * MediaStream（useMicrophoneから取得）
   * @deprecated Azure SDKが直接マイクにアクセスするため不要。将来のバージョンで削除予定。
   */
  stream?: MediaStream | null;
}

export interface UseSpeechRecognitionReturn {
  /** 認識状態 */
  state: RecognitionState;
  /** 中間認識結果 */
  interimText: string;
  /** 最終認識結果 */
  finalText: string;
  /** 認識結果履歴 */
  results: RecognitionResult[];
  /** エラー情報 */
  error: RecognitionError | null;
  /** 認識開始 */
  start: () => Promise<void>;
  /** 認識停止 */
  stop: () => void;
  /** 結果をクリア */
  clearResults: () => void;
  /** トークン事前取得（ウォームアップ） */
  warmup: () => Promise<void>;
  /** ウォームアップ済みか */
  isWarmedUp: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * 音声認識の状態管理を行うカスタムフック
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn {
  const {
    language = "ja-JP",
    // continuous = true, // 現在未使用
    interimResults = true,
    silenceTimeoutMs = 2000,
    autoStopOnRecognized = false, // デフォルトfalse: 無音検出のみで終了判定
    // stream は非推奨 - Azure SDKが直接マイクにアクセス
  } = options;

  const [state, setState] = useState<RecognitionState>("idle");
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [error, setError] = useState<RecognitionError | null>(null);

  const recognizerRef = useRef<AzureSpeechRecognizer | null>(null);
  const tokenRef = useRef<SpeechToken | null>(null);
  const [isWarmedUp, setIsWarmedUp] = useState(false);
  const isWarmingUpRef = useRef(false);

  /**
   * 認証トークンを取得
   */
  const fetchToken = useCallback(async (): Promise<SpeechToken> => {
    try {
      const response = await fetch(`${API_URL}/api/v1/speech/token`);

      if (!response.ok) {
        throw new Error(`Token fetch failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        token: data.token,
        region: data.region,
        expiresAt: new Date(data.expires_at),
      };
    } catch (err) {
      console.error("[useSpeechRecognition] Token fetch failed:", err);
      throw new Error("認証トークンの取得に失敗しました");
    }
  }, []);

  /**
   * トークンが有効か確認
   */
  const isTokenValid = useCallback((): boolean => {
    if (!tokenRef.current) return false;

    const now = new Date();
    const expiresAt = tokenRef.current.expiresAt;

    // 有効期限の1分前までを有効とする
    return now.getTime() < expiresAt.getTime() - 60000;
  }, []);

  /**
   * 認識を開始
   * Note: Azure SDKがdefaultMicrophoneInputを使用するため、streamは不要
   */
  const start = useCallback(async () => {
    // 既に開始中または認識中の場合は何もしない
    if (state === "starting" || state === "listening") {
      console.log("[useSpeechRecognition] Already starting or listening, ignoring");
      return;
    }

    setState("starting");
    setError(null);
    setInterimText("");

    try {
      console.log("[useSpeechRecognition] Starting recognition");

      // トークン取得（必要に応じて更新）
      if (!isTokenValid()) {
        console.log("[useSpeechRecognition] Fetching new token");
        tokenRef.current = await fetchToken();
      }

      const token = tokenRef.current!;

      // Recognizer初期化
      // Note: streamを渡さずにdefaultMicrophoneInputを使用
      // MediaStreamからPushStreamへの変換は複雑なため、Azure SDKのデフォルトマイク機能を利用
      recognizerRef.current = new AzureSpeechRecognizer(
        {
          token: token.token,
          region: token.region,
          language,
          silenceTimeoutMs,
          // stream は渡さない - Azure SDK が直接マイクにアクセス
        },
        {
          onRecognizing: (result) => {
            if (interimResults) {
              setInterimText(result.text);
            }
          },
          onRecognized: (result) => {
            console.log("[useSpeechRecognition] Recognized:", result.text);

            setInterimText("");
            setFinalText(result.text);
            setResults((prev) => [...prev, result]);

            // 認識完了後に自動停止
            if (autoStopOnRecognized && recognizerRef.current) {
              console.log("[useSpeechRecognition] Auto-stopping after recognition");
              recognizerRef.current.stop();
            }
          },
          onError: (err) => {
            console.error("[useSpeechRecognition] Recognition error:", err);
            setError(err);
            setState("error");
          },
          onSessionStarted: () => {
            console.log("[useSpeechRecognition] Session started");
            setState("listening");
          },
          onSessionStopped: () => {
            console.log("[useSpeechRecognition] Session stopped");
            setState("stopped");
          },
        }
      );

      // 認識開始
      await recognizerRef.current.start();
    } catch (err) {
      console.error("[useSpeechRecognition] Start failed:", err);

      setError({
        code: "AUTH_FAILED",
        message: err instanceof Error ? err.message : "認識の開始に失敗しました",
      });
      setState("error");
    }
  }, [state, language, interimResults, silenceTimeoutMs, autoStopOnRecognized, fetchToken, isTokenValid]);

  /**
   * 認識を停止
   */
  const stop = useCallback(async () => {
    if (!recognizerRef.current) return;

    console.log("[useSpeechRecognition] Stopping recognition");

    setState("processing");

    try {
      await recognizerRef.current.stop();
      setState("stopped");
    } catch (err) {
      console.error("[useSpeechRecognition] Stop failed:", err);
      setState("error");
    }
  }, []);

  /**
   * 結果をクリア
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setFinalText("");
    setInterimText("");
    setError(null);
  }, []);

  /**
   * トークン事前取得（ウォームアップ）
   * コンポーネントマウント時に呼び出すことで、認識開始を高速化
   */
  const warmup = useCallback(async () => {
    if (isWarmedUp || tokenRef.current || isWarmingUpRef.current) return;

    isWarmingUpRef.current = true;
    try {
      console.log("[useSpeechRecognition] Warming up - fetching token");
      tokenRef.current = await fetchToken();
      setIsWarmedUp(true);
      console.log("[useSpeechRecognition] Warmup complete");
    } catch (err) {
      console.warn("[useSpeechRecognition] Warmup failed:", err);
      // ウォームアップ失敗は致命的ではないので、エラー状態にはしない
    } finally {
      isWarmingUpRef.current = false;
    }
  }, [isWarmedUp, fetchToken]);

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.dispose();
        recognizerRef.current = null;
      }
    };
  }, []);

  return {
    state,
    interimText,
    finalText,
    results,
    error,
    start,
    stop,
    clearResults,
    warmup,
    isWarmedUp,
  };
}
