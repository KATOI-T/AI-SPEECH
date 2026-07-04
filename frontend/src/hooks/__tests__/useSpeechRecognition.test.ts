/**
 * F-004: 音声入力（STT）機能 - useSpeechRecognition フックテスト
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useSpeechRecognition } from "../useSpeechRecognition";
import { AzureSpeechRecognizer } from "@/lib/speech/azure-stt";

// モック
jest.mock("@/lib/speech/azure-stt");

describe("useSpeechRecognition", () => {
  let mockStream: MediaStream;
  let mockFetch: jest.Mock;
  let mockRecognizer: any;

  beforeEach(() => {
    // MediaStream モック
    mockStream = {
      getTracks: jest.fn(() => []),
    } as any;

    // Recognizer モック
    mockRecognizer = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn(),
    };

    (AzureSpeechRecognizer as jest.Mock).mockImplementation(
      (options, handlers) => {
        // ハンドラーを保存
        mockRecognizer.handlers = handlers;
        return mockRecognizer;
      }
    );

    // fetch モック
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "test-token",
        region: "japaneast",
        expires_at: new Date(Date.now() + 600000).toISOString(),
      }),
    });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("初期状態", () => {
    it("初期状態が idle であること", () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: null })
      );

      expect(result.current.state).toBe("idle");
      expect(result.current.interimText).toBe("");
      expect(result.current.finalText).toBe("");
      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe("start", () => {
    it("認識を開始できること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
        // onSessionStartedをシミュレート
        mockRecognizer.handlers.onSessionStarted();
      });

      expect(result.current.state).toBe("listening");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/speech/token")
      );
      expect(AzureSpeechRecognizer).toHaveBeenCalled();
      expect(mockRecognizer.start).toHaveBeenCalled();
    });

    it("ストリームがなくても認識を開始できること（Azure SDKがdefaultMicrophoneInputを使用）", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: null })
      );

      await act(async () => {
        await result.current.start();
      });

      // streamがなくても認識を開始できる（Azure SDKが直接マイクにアクセス）
      expect(result.current.state).toBe("starting");
      expect(mockRecognizer.start).toHaveBeenCalled();
    });

    it("トークン取得に失敗した場合、エラーになること", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error?.code).toBe("AUTH_FAILED");
    });

    it("カスタム言語で開始できること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream, language: "en-US" })
      );

      await act(async () => {
        await result.current.start();
      });

      await waitFor(() => {
        expect(AzureSpeechRecognizer).toHaveBeenCalledWith(
          expect.objectContaining({
            language: "en-US",
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe("認識イベント", () => {
    it("中間認識結果を受け取れること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({
          stream: mockStream,
          interimResults: true,
        })
      );

      await act(async () => {
        await result.current.start();
      });

      // 中間認識結果をシミュレート
      act(() => {
        mockRecognizer.handlers.onRecognizing({
          text: "こんにち",
          confidence: 0,
          isFinal: false,
        });
      });

      expect(result.current.interimText).toBe("こんにち");
    });

    it("最終認識結果を受け取れること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      // 最終認識結果をシミュレート
      act(() => {
        mockRecognizer.handlers.onRecognized({
          text: "こんにちは",
          confidence: 0.95,
          isFinal: true,
        });
      });

      expect(result.current.finalText).toBe("こんにちは");
      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0]).toEqual({
        text: "こんにちは",
        confidence: 0.95,
        isFinal: true,
      });
      expect(result.current.interimText).toBe("");
    });

    it("複数の認識結果を蓄積できること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        mockRecognizer.handlers.onRecognized({
          text: "こんにちは",
          confidence: 0.95,
          isFinal: true,
        });
      });

      act(() => {
        mockRecognizer.handlers.onRecognized({
          text: "お元気ですか",
          confidence: 0.92,
          isFinal: true,
        });
      });

      expect(result.current.results).toHaveLength(2);
      expect(result.current.results[1].text).toBe("お元気ですか");
    });

    it("認識エラーを受け取れること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        mockRecognizer.handlers.onError({
          code: "NETWORK_ERROR",
          message: "ネットワークエラー",
        });
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error).toEqual({
        code: "NETWORK_ERROR",
        message: "ネットワークエラー",
      });
    });

    it("セッション開始イベントを処理できること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        mockRecognizer.handlers.onSessionStarted();
      });

      expect(result.current.state).toBe("listening");
    });

    it("セッション停止イベントを処理できること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        mockRecognizer.handlers.onSessionStopped();
      });

      expect(result.current.state).toBe("stopped");
    });
  });

  describe("stop", () => {
    it("認識を停止できること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        await result.current.stop();
      });

      expect(mockRecognizer.stop).toHaveBeenCalled();
      expect(result.current.state).toBe("stopped");
    });

    it("開始前に停止しても例外が発生しないこと", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.stop();
      });

      expect(mockRecognizer.stop).not.toHaveBeenCalled();
    });
  });

  describe("clearResults", () => {
    it("認識結果をクリアできること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        mockRecognizer.handlers.onRecognized({
          text: "テスト",
          confidence: 0.9,
          isFinal: true,
        });
      });

      expect(result.current.results).toHaveLength(1);

      act(() => {
        result.current.clearResults();
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.finalText).toBe("");
      expect(result.current.interimText).toBe("");
      expect(result.current.error).toBeNull();
    });
  });

  describe("トークン管理", () => {
    it("トークンをキャッシュすること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        await result.current.stop();
      });

      // 2回目の開始
      await act(async () => {
        await result.current.start();
      });

      // トークンは1回だけ取得される（キャッシュされる）
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("期限切れトークンを再取得すること", async () => {
      // 1回目の呼び出し: 有効なトークン（ただし1分未満で期限切れ）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "soon-expiring-token",
          region: "japaneast",
          // 30秒後に期限切れ（1分未満なので次回取得時に再取得される）
          expires_at: new Date(Date.now() + 30000).toISOString(),
        }),
      });

      // 2回目の呼び出し: 新しいトークン
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "new-token",
          region: "japaneast",
          expires_at: new Date(Date.now() + 600000).toISOString(),
        }),
      });

      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      // 1回目の開始
      await act(async () => {
        await result.current.start();
        mockRecognizer.handlers.onSessionStarted();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 停止
      await act(async () => {
        await result.current.stop();
      });

      // 2回目の開始（トークンが1分未満で期限切れなので再取得）
      await act(async () => {
        await result.current.start();
        mockRecognizer.handlers.onSessionStarted();
      });

      // トークンが2回取得される
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にリソースを破棄すること", async () => {
      const { result, unmount } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      await act(async () => {
        await result.current.start();
      });

      unmount();

      expect(mockRecognizer.dispose).toHaveBeenCalled();
    });
  });

  describe("interimResults オプション", () => {
    it("interimResults が false の場合、中間結果を無視すること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({
          stream: mockStream,
          interimResults: false,
        })
      );

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        mockRecognizer.handlers.onRecognizing({
          text: "中間結果",
          confidence: 0,
          isFinal: false,
        });
      });

      expect(result.current.interimText).toBe("");
    });
  });

  describe("warmup 機能", () => {
    it("warmup を呼び出すとトークンを事前取得すること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      expect(result.current.isWarmedUp).toBe(false);

      await act(async () => {
        await result.current.warmup();
      });

      await waitFor(() => {
        expect(result.current.isWarmedUp).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/speech/token")
      );
    });

    it("warmup が完了済みの場合、重複実行しないこと", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      // 1回目の warmup
      await act(async () => {
        await result.current.warmup();
      });

      await waitFor(() => {
        expect(result.current.isWarmedUp).toBe(true);
      });

      const fetchCallCount = mockFetch.mock.calls.length;

      // 2回目の warmup（重複実行）
      await act(async () => {
        await result.current.warmup();
      });

      // fetch が追加で呼ばれていないことを確認
      expect(mockFetch.mock.calls.length).toBe(fetchCallCount);
    });

    it("warmup が並列に呼び出されても重複実行しないこと（race condition対策）", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      // 複数の warmup を並列に実行
      await act(async () => {
        await Promise.all([
          result.current.warmup(),
          result.current.warmup(),
          result.current.warmup(),
        ]);
      });

      // fetch が1回だけ呼ばれることを確認
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.isWarmedUp).toBe(true);
    });

    it("warmup が失敗してもエラー状態にならないこと", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await act(async () => {
        await result.current.warmup();
      });

      expect(result.current.isWarmedUp).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe("idle");
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("warmup 後に start を呼び出すとキャッシュされたトークンを使用すること", async () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ stream: mockStream })
      );

      // warmup でトークンを取得
      await act(async () => {
        await result.current.warmup();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // start を呼び出す
      await act(async () => {
        await result.current.start();
        mockRecognizer.handlers.onSessionStarted();
      });

      // トークンは再取得されない（warmupでキャッシュされたものを使用）
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe("listening");
    });
  });
});
