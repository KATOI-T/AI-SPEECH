/**
 * マイク制御カスタムフック
 * F-004: 音声入力（STT）機能
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { MicrophoneState, MicrophoneError } from "@/types/speech";
import {
  getDefaultMicrophoneConstraints,
  stopMediaStream,
  isMediaDevicesSupported,
  isSecureContext,
} from "@/lib/speech/audio-utils";

export interface UseMicrophoneOptions {
  /** 自動的に権限要求を開始するか */
  autoRequest?: boolean;
  /** オーディオ制約 */
  constraints?: MediaTrackConstraints;
}

export interface UseMicrophoneReturn {
  /** マイクの状態 */
  state: MicrophoneState;
  /** MediaStream */
  stream: MediaStream | null;
  /** エラー情報 */
  error: MicrophoneError | null;
  /** マイク権限を要求 */
  requestPermission: () => Promise<void>;
  /** ストリームを停止 */
  stopStream: () => void;
  /** マイクが利用可能か */
  isAvailable: boolean;
}

/**
 * マイクの状態管理を行うカスタムフック
 */
export function useMicrophone(
  options: UseMicrophoneOptions = {}
): UseMicrophoneReturn {
  const { autoRequest = false, constraints } = options;

  const [state, setState] = useState<MicrophoneState>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<MicrophoneError | null>(null);

  const isRequestingRef = useRef(false);

  /**
   * マイク権限を要求してストリームを取得
   */
  const requestPermission = useCallback(async () => {
    // 重複リクエスト防止
    if (isRequestingRef.current) {
      console.warn("[useMicrophone] Request already in progress");
      return;
    }

    // ブラウザサポート確認
    if (!isMediaDevicesSupported()) {
      setError({
        code: "UNKNOWN",
        message: "このブラウザはマイク機能をサポートしていません",
      });
      setState("error");
      return;
    }

    // セキュアコンテキスト確認
    if (!isSecureContext()) {
      setError({
        code: "UNKNOWN",
        message: "HTTPSまたはlocalhostでのみマイクを使用できます",
      });
      setState("error");
      return;
    }

    isRequestingRef.current = true;
    setState("requesting");
    setError(null);

    try {
      console.log("[useMicrophone] Requesting microphone permission");

      const audioConstraints = constraints || getDefaultMicrophoneConstraints();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      console.log("[useMicrophone] Microphone permission granted");

      setStream(mediaStream);
      setState("ready");
    } catch (err) {
      console.error("[useMicrophone] Permission request failed:", err);

      const micError = mapMicrophoneError(err);
      setError(micError);
      setState("error");
    } finally {
      isRequestingRef.current = false;
    }
  }, [constraints]);

  /**
   * ストリームを停止
   */
  const stopStream = useCallback(() => {
    console.log("[useMicrophone] Stopping stream");

    stopMediaStream(stream);
    setStream(null);
    setState("idle");
    setError(null);
  }, [stream]);

  /**
   * マイクが利用可能か
   */
  const isAvailable = state === "ready" || state === "recording";

  /**
   * 自動リクエスト
   */
  useEffect(() => {
    if (autoRequest && state === "idle" && !stream && !error) {
      requestPermission();
    }
  }, [autoRequest, state, stream, error, requestPermission]);

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (stream) {
        stopMediaStream(stream);
      }
    };
  }, [stream]);

  return {
    state,
    stream,
    error,
    requestPermission,
    stopStream,
    isAvailable,
  };
}

/**
 * マイクエラーをマッピング
 */
function mapMicrophoneError(err: unknown): MicrophoneError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return {
          code: "NOT_ALLOWED",
          message: "マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。",
        };
      case "NotFoundError":
      case "DevicesNotFoundError":
        return {
          code: "NOT_FOUND",
          message: "マイクが見つかりません。マイクを接続してください。",
        };
      case "NotReadableError":
      case "TrackStartError":
        return {
          code: "NOT_READABLE",
          message: "マイクが他のアプリで使用中です。",
        };
      default:
        return {
          code: "UNKNOWN",
          message: `マイクエラー: ${err.message}`,
        };
    }
  }

  return {
    code: "UNKNOWN",
    message: "マイクの初期化に失敗しました。",
  };
}
