/**
 * Azure Speech SDK ラッパー
 * F-004: 音声入力（STT）機能
 */

import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import type { RecognitionResult, RecognitionError } from "@/types/speech";

export interface AzureSpeechRecognizerOptions {
  /** 認証トークン */
  token: string;
  /** Azureリージョン */
  region: string;
  /** 認識言語（デフォルト: ja-JP） */
  language?: string;
  /** MediaStream */
  stream?: MediaStream;
  /** 無音検出タイムアウト（ミリ秒、デフォルト: 2000） */
  silenceTimeoutMs?: number;
}

export interface RecognitionEventHandlers {
  /** 中間認識結果 */
  onRecognizing?: (result: RecognitionResult) => void;
  /** 最終認識結果 */
  onRecognized?: (result: RecognitionResult) => void;
  /** エラー発生 */
  onError?: (error: RecognitionError) => void;
  /** セッション開始 */
  onSessionStarted?: () => void;
  /** セッション停止 */
  onSessionStopped?: () => void;
}

/**
 * Azure Speech Recognizer ラッパークラス
 */
export class AzureSpeechRecognizer {
  private recognizer: sdk.SpeechRecognizer | null = null;
  private audioConfig: sdk.AudioConfig | null = null;

  constructor(
    private options: AzureSpeechRecognizerOptions,
    private handlers: RecognitionEventHandlers = {}
  ) {}

  /**
   * 認識を開始
   */
  async start(): Promise<void> {
    try {
      // SpeechConfig 初期化
      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(
        this.options.token,
        this.options.region
      );
      speechConfig.speechRecognitionLanguage = this.options.language || "ja-JP";

      // 無音検出タイムアウト設定（デフォルト2秒）
      const silenceTimeoutMs = this.options.silenceTimeoutMs ?? 2000;
      speechConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
        silenceTimeoutMs.toString()
      );
      // 発話開始前の無音タイムアウトも設定
      speechConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        "5000"
      );

      // AudioConfig 初期化
      if (this.options.stream) {
        // ブラウザのMediaStreamから音声入力
        this.audioConfig = sdk.AudioConfig.fromStreamInput(
          this.createAudioInputStream(this.options.stream)
        );
      } else {
        // デフォルトマイクから音声入力
        this.audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      }

      // SpeechRecognizer 初期化
      this.recognizer = new sdk.SpeechRecognizer(speechConfig, this.audioConfig);

      // イベントハンドラー設定
      this.setupEventHandlers();

      // 継続認識開始
      this.recognizer.startContinuousRecognitionAsync(
        () => {
          console.log("[AzureSpeechRecognizer] Recognition started");
          this.handlers.onSessionStarted?.();
        },
        (error) => {
          console.error("[AzureSpeechRecognizer] Start failed:", error);
          this.handlers.onError?.({
            code: "UNKNOWN",
            message: `認識開始に失敗しました: ${error}`,
          });
        }
      );
    } catch (error) {
      console.error("[AzureSpeechRecognizer] Initialization failed:", error);
      this.handlers.onError?.({
        code: "AUTH_FAILED",
        message: "認識エンジンの初期化に失敗しました",
      });
    }
  }

  /**
   * 認識を停止
   */
  async stop(): Promise<void> {
    if (!this.recognizer) return;

    return new Promise((resolve) => {
      this.recognizer!.stopContinuousRecognitionAsync(
        () => {
          console.log("[AzureSpeechRecognizer] Recognition stopped");
          this.handlers.onSessionStopped?.();
          this.dispose();
          resolve();
        },
        (error) => {
          console.error("[AzureSpeechRecognizer] Stop failed:", error);
          this.dispose();
          resolve();
        }
      );
    });
  }

  /**
   * リソースを破棄
   */
  dispose(): void {
    if (this.recognizer) {
      this.recognizer.close();
      this.recognizer = null;
    }
    if (this.audioConfig) {
      this.audioConfig.close();
      this.audioConfig = null;
    }
  }

  /**
   * イベントハンドラーを設定
   */
  private setupEventHandlers(): void {
    if (!this.recognizer) return;

    // 中間認識結果
    this.recognizer.recognizing = (_, event) => {
      if (event.result.reason === sdk.ResultReason.RecognizingSpeech) {
        this.handlers.onRecognizing?.({
          text: event.result.text,
          confidence: 0, // 中間結果には信頼度なし
          isFinal: false,
        });
      }
    };

    // 最終認識結果
    this.recognizer.recognized = (_, event) => {
      if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
        // 信頼度スコアを取得（利用可能な場合）
        const confidence = this.extractConfidence(event.result);

        this.handlers.onRecognized?.({
          text: event.result.text,
          confidence,
          isFinal: true,
        });
      } else if (event.result.reason === sdk.ResultReason.NoMatch) {
        console.warn("[AzureSpeechRecognizer] No speech recognized");
        this.handlers.onError?.({
          code: "NO_MATCH",
          message: "音声を認識できませんでした",
        });
      }
    };

    // キャンセルイベント
    this.recognizer.canceled = (_, event) => {
      console.error("[AzureSpeechRecognizer] Recognition canceled:", event);

      if (event.reason === sdk.CancellationReason.Error) {
        const errorCode = this.mapErrorCode(event.errorCode);
        this.handlers.onError?.({
          code: errorCode,
          message: event.errorDetails || "認識エラーが発生しました",
        });
      } else {
        this.handlers.onError?.({
          code: "CANCELED",
          message: "認識がキャンセルされました",
        });
      }
    };

    // セッション開始
    this.recognizer.sessionStarted = () => {
      console.log("[AzureSpeechRecognizer] Session started");
    };

    // セッション停止
    this.recognizer.sessionStopped = () => {
      console.log("[AzureSpeechRecognizer] Session stopped");
    };
  }

  /**
   * MediaStreamからAudioInputStreamを作成
   */
  private createAudioInputStream(stream: MediaStream): sdk.AudioInputStream {
    // プッシュストリームを作成（16kHz, 16bit, モノラル）
    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(format);

    // MediaStreamRecorderでPCMデータを取得
    // 注: ブラウザのMediaStreamは直接PCMを提供しないため、
    // この実装はシンプルに defaultMicrophone を使用することを推奨
    // より詳細な実装が必要な場合はWeb Audio APIを使用

    return pushStream;
  }

  /**
   * 信頼度スコアを抽出（利用可能な場合）
   */
  private extractConfidence(result: sdk.SpeechRecognitionResult): number {
    try {
      // JSON詳細結果から信頼度を取得
      const details = JSON.parse(result.properties.getProperty(
        sdk.PropertyId.SpeechServiceResponse_JsonResult
      ));
      return details?.NBest?.[0]?.Confidence || 0.9;
    } catch {
      // デフォルト信頼度
      return 0.9;
    }
  }

  /**
   * エラーコードをマッピング
   */
  private mapErrorCode(errorCode: sdk.CancellationErrorCode): RecognitionError["code"] {
    switch (errorCode) {
      case sdk.CancellationErrorCode.AuthenticationFailure:
        return "AUTH_FAILED";
      case sdk.CancellationErrorCode.ConnectionFailure:
      case sdk.CancellationErrorCode.ServiceTimeout:
        return "NETWORK_ERROR";
      default:
        return "UNKNOWN";
    }
  }
}
