/**
 * F-004: 音声入力（STT）機能 - azure-stt テスト
 */

// Azure Speech SDK モック - インポート前に定義
jest.mock("microsoft-cognitiveservices-speech-sdk", () => ({
  SpeechConfig: {
    fromAuthorizationToken: jest.fn(),
  },
  AudioConfig: {
    fromDefaultMicrophoneInput: jest.fn(),
    fromStreamInput: jest.fn(),
  },
  SpeechRecognizer: jest.fn(),
  AudioInputStream: {
    createPushStream: jest.fn(),
  },
  AudioStreamFormat: {
    getWaveFormatPCM: jest.fn(),
  },
  ResultReason: {
    RecognizingSpeech: 1,
    RecognizedSpeech: 3,
    NoMatch: 5,
  },
  CancellationReason: {
    Error: 1,
    EndOfStream: 2,
  },
  CancellationErrorCode: {
    NoError: 0,
    AuthenticationFailure: 1,
    ConnectionFailure: 6,
  },
  PropertyId: {
    SpeechServiceResponse_JsonResult: 0,
  },
}));

import { AzureSpeechRecognizer } from "../azure-stt";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

describe("AzureSpeechRecognizer", () => {
  let mockRecognizer: any;
  let mockSpeechConfig: any;
  let mockAudioConfig: any;
  let mockStream: MediaStream;
  let eventHandlers: {
    recognizing: ((sender: any, event: any) => void) | null;
    recognized: ((sender: any, event: any) => void) | null;
    canceled: ((sender: any, event: any) => void) | null;
    sessionStarted: (() => void) | null;
    sessionStopped: (() => void) | null;
  };

  beforeEach(() => {
    // イベントハンドラーを保存する構造
    eventHandlers = {
      recognizing: null,
      recognized: null,
      canceled: null,
      sessionStarted: null,
      sessionStopped: null,
    };

    // モックの初期化
    mockRecognizer = {
      startContinuousRecognitionAsync: jest.fn((success) => {
        success();
      }),
      stopContinuousRecognitionAsync: jest.fn((success) => {
        success();
      }),
      close: jest.fn(),
      // セッターとして動作するプロパティ
      set recognizing(handler: any) {
        eventHandlers.recognizing = handler;
      },
      set recognized(handler: any) {
        eventHandlers.recognized = handler;
      },
      set canceled(handler: any) {
        eventHandlers.canceled = handler;
      },
      set sessionStarted(handler: any) {
        eventHandlers.sessionStarted = handler;
      },
      set sessionStopped(handler: any) {
        eventHandlers.sessionStopped = handler;
      },
    };

    mockSpeechConfig = {
      speechRecognitionLanguage: "",
    };

    mockAudioConfig = {
      close: jest.fn(),
    };

    mockStream = {
      getTracks: jest.fn(() => []),
    } as any;

    // SDK モックの設定
    (sdk.SpeechConfig.fromAuthorizationToken as jest.Mock).mockReturnValue(
      mockSpeechConfig
    );
    (sdk.AudioConfig.fromDefaultMicrophoneInput as jest.Mock).mockReturnValue(
      mockAudioConfig
    );
    (sdk.AudioConfig.fromStreamInput as jest.Mock).mockReturnValue(
      mockAudioConfig
    );
    (sdk.SpeechRecognizer as unknown as jest.Mock).mockReturnValue(
      mockRecognizer
    );
    (sdk.AudioInputStream.createPushStream as jest.Mock).mockReturnValue({});
    (sdk.AudioStreamFormat.getWaveFormatPCM as jest.Mock).mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("初期化", () => {
    it("トークンとリージョンで初期化できること", () => {
      const recognizer = new AzureSpeechRecognizer({
        token: "test-token",
        region: "japaneast",
      });

      expect(recognizer).toBeInstanceOf(AzureSpeechRecognizer);
    });

    it("カスタム言語を設定できること", () => {
      const recognizer = new AzureSpeechRecognizer({
        token: "test-token",
        region: "japaneast",
        language: "en-US",
      });

      expect(recognizer).toBeInstanceOf(AzureSpeechRecognizer);
    });
  });

  describe("start", () => {
    it("認識を開始できること", async () => {
      const onSessionStarted = jest.fn();

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onSessionStarted,
        }
      );

      await recognizer.start();

      expect(sdk.SpeechConfig.fromAuthorizationToken).toHaveBeenCalledWith(
        "test-token",
        "japaneast"
      );
      expect(mockSpeechConfig.speechRecognitionLanguage).toBe("ja-JP");
      expect(sdk.SpeechRecognizer).toHaveBeenCalled();
      expect(
        mockRecognizer.startContinuousRecognitionAsync
      ).toHaveBeenCalled();
      expect(onSessionStarted).toHaveBeenCalled();
    });

    it("カスタム言語で認識を開始できること", async () => {
      const recognizer = new AzureSpeechRecognizer({
        token: "test-token",
        region: "japaneast",
        language: "en-US",
      });

      await recognizer.start();

      expect(mockSpeechConfig.speechRecognitionLanguage).toBe("en-US");
    });

    it("開始エラーを処理できること", async () => {
      const onError = jest.fn();

      mockRecognizer.startContinuousRecognitionAsync = jest.fn(
        (success, error) => {
          error("Start failed");
        }
      );

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onError,
        }
      );

      await recognizer.start();

      expect(onError).toHaveBeenCalledWith({
        code: "UNKNOWN",
        message: expect.stringContaining("認識開始に失敗しました"),
      });
    });
  });

  describe("stop", () => {
    it("認識を停止できること", async () => {
      const onSessionStopped = jest.fn();

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onSessionStopped,
        }
      );

      await recognizer.start();
      await recognizer.stop();

      expect(mockRecognizer.stopContinuousRecognitionAsync).toHaveBeenCalled();
      expect(onSessionStopped).toHaveBeenCalled();
      expect(mockRecognizer.close).toHaveBeenCalled();
    });

    it("開始前に停止しても例外が発生しないこと", async () => {
      const recognizer = new AzureSpeechRecognizer({
        token: "test-token",
        region: "japaneast",
      });

      await expect(recognizer.stop()).resolves.toBeUndefined();
    });

    it("停止エラーを処理できること", async () => {
      mockRecognizer.stopContinuousRecognitionAsync = jest.fn(
        (success, error) => {
          error("Stop failed");
        }
      );

      const recognizer = new AzureSpeechRecognizer({
        token: "test-token",
        region: "japaneast",
      });

      await recognizer.start();
      await recognizer.stop();

      // エラーが発生しても dispose が呼ばれること
      expect(mockRecognizer.close).toHaveBeenCalled();
    });
  });

  describe("イベントハンドラー", () => {
    it("recognizing イベントを処理できること", async () => {
      const onRecognizing = jest.fn();

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onRecognizing,
        }
      );

      await recognizer.start();

      // recognizing イベントをシミュレート
      const mockEvent = {
        result: {
          reason: sdk.ResultReason.RecognizingSpeech,
          text: "こんにちは",
        },
      };

      eventHandlers.recognizing!(null, mockEvent);

      expect(onRecognizing).toHaveBeenCalledWith({
        text: "こんにちは",
        confidence: 0,
        isFinal: false,
      });
    });

    it("recognized イベントを処理できること", async () => {
      const onRecognized = jest.fn();

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onRecognized,
        }
      );

      await recognizer.start();

      // recognized イベントをシミュレート
      const mockEvent = {
        result: {
          reason: sdk.ResultReason.RecognizedSpeech,
          text: "こんにちは",
          properties: {
            getProperty: jest.fn(() => JSON.stringify({
              NBest: [{ Confidence: 0.95 }]
            })),
          },
        },
      };

      eventHandlers.recognized!(null, mockEvent);

      expect(onRecognized).toHaveBeenCalledWith({
        text: "こんにちは",
        confidence: 0.95,
        isFinal: true,
      });
    });

    it("NoMatch を処理できること", async () => {
      const onError = jest.fn();

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onError,
        }
      );

      await recognizer.start();

      const mockEvent = {
        result: {
          reason: sdk.ResultReason.NoMatch,
        },
      };

      eventHandlers.recognized!(null, mockEvent);

      expect(onError).toHaveBeenCalledWith({
        code: "NO_MATCH",
        message: "音声を認識できませんでした",
      });
    });

    it("canceled イベントを処理できること", async () => {
      const onError = jest.fn();

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onError,
        }
      );

      await recognizer.start();

      const mockEvent = {
        reason: sdk.CancellationReason.Error,
        errorCode: sdk.CancellationErrorCode.AuthenticationFailure,
        errorDetails: "認証に失敗しました",
      };

      eventHandlers.canceled!(null, mockEvent);

      expect(onError).toHaveBeenCalledWith({
        code: "AUTH_FAILED",
        message: "認証に失敗しました",
      });
    });

    it("ネットワークエラーをマッピングできること", async () => {
      const onError = jest.fn();

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onError,
        }
      );

      await recognizer.start();

      const mockEvent = {
        reason: sdk.CancellationReason.Error,
        errorCode: sdk.CancellationErrorCode.ConnectionFailure,
        errorDetails: "接続エラー",
      };

      eventHandlers.canceled!(null, mockEvent);

      expect(onError).toHaveBeenCalledWith({
        code: "NETWORK_ERROR",
        message: "接続エラー",
      });
    });
  });

  describe("dispose", () => {
    it("リソースを破棄できること", async () => {
      const recognizer = new AzureSpeechRecognizer({
        token: "test-token",
        region: "japaneast",
      });

      await recognizer.start();
      recognizer.dispose();

      expect(mockRecognizer.close).toHaveBeenCalled();
      expect(mockAudioConfig.close).toHaveBeenCalled();
    });

    it("未初期化状態で dispose しても例外が発生しないこと", () => {
      const recognizer = new AzureSpeechRecognizer({
        token: "test-token",
        region: "japaneast",
      });

      expect(() => recognizer.dispose()).not.toThrow();
    });
  });

  describe("信頼度スコア", () => {
    it("JSON結果から信頼度を抽出できること", async () => {
      const onRecognized = jest.fn();

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onRecognized,
        }
      );

      await recognizer.start();

      const mockEvent = {
        result: {
          reason: sdk.ResultReason.RecognizedSpeech,
          text: "テスト",
          properties: {
            getProperty: jest.fn(() => JSON.stringify({
              NBest: [{ Confidence: 0.85 }]
            })),
          },
        },
      };

      eventHandlers.recognized!(null, mockEvent);

      expect(onRecognized).toHaveBeenCalledWith(
        expect.objectContaining({
          confidence: 0.85,
        })
      );
    });

    it("信頼度が取得できない場合、デフォルト値を使用すること", async () => {
      const onRecognized = jest.fn();

      const recognizer = new AzureSpeechRecognizer(
        {
          token: "test-token",
          region: "japaneast",
        },
        {
          onRecognized,
        }
      );

      await recognizer.start();

      const mockEvent = {
        result: {
          reason: sdk.ResultReason.RecognizedSpeech,
          text: "テスト",
          properties: {
            getProperty: jest.fn(() => "invalid json"),
          },
        },
      };

      eventHandlers.recognized!(null, mockEvent);

      expect(onRecognized).toHaveBeenCalledWith(
        expect.objectContaining({
          confidence: 0.9,
        })
      );
    });
  });
});
