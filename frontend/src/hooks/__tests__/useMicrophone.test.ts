/**
 * F-004: 音声入力（STT）機能 - useMicrophone フックテスト
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useMicrophone } from "../useMicrophone";

// モック
jest.mock("@/lib/speech/audio-utils", () => ({
  getDefaultMicrophoneConstraints: jest.fn(() => ({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
  })),
  stopMediaStream: jest.fn((stream) => {
    if (stream) {
      stream.getTracks().forEach((track: any) => track.stop());
    }
  }),
  isMediaDevicesSupported: jest.fn(() => true),
  isSecureContext: jest.fn(() => true),
}));

describe("useMicrophone", () => {
  let mockGetUserMedia: jest.Mock;
  let mockStream: MediaStream;
  let mockTrack: MediaStreamTrack;

  beforeEach(() => {
    // MediaStreamTrack モック
    mockTrack = {
      stop: jest.fn(),
      label: "Mock Microphone",
      kind: "audio",
    } as any;

    // MediaStream モック
    mockStream = {
      getTracks: jest.fn(() => [mockTrack]),
      getAudioTracks: jest.fn(() => [mockTrack]),
    } as any;

    // getUserMedia モック
    mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);

    global.navigator.mediaDevices = {
      getUserMedia: mockGetUserMedia,
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("初期状態", () => {
    it("初期状態が idle であること", () => {
      const { result } = renderHook(() => useMicrophone());

      expect(result.current.state).toBe("idle");
      expect(result.current.stream).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe("requestPermission", () => {
    it("マイク権限を取得できること", async () => {
      const { result } = renderHook(() => useMicrophone());

      expect(result.current.state).toBe("idle");

      await act(async () => {
        await result.current.requestPermission();
      });

      await waitFor(() => {
        expect(result.current.state).toBe("ready");
      });

      expect(result.current.stream).toBe(mockStream);
      expect(result.current.error).toBeNull();
      expect(result.current.isAvailable).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
        video: false,
      });
    });

    it("requesting 状態を経由すること", async () => {
      const { result } = renderHook(() => useMicrophone());

      let requestingCaptured = false;

      const promise = act(async () => {
        const permissionPromise = result.current.requestPermission();

        // requesting 状態を確認
        await waitFor(() => {
          if (result.current.state === "requesting") {
            requestingCaptured = true;
          }
        }, { timeout: 100 });

        await permissionPromise;
      });

      await promise;

      expect(requestingCaptured).toBe(true);
    });

    it("権限拒否エラーを処理できること", async () => {
      const notAllowedError = new DOMException(
        "Permission denied",
        "NotAllowedError"
      );
      mockGetUserMedia.mockRejectedValue(notAllowedError);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.requestPermission();
      });

      await waitFor(() => {
        expect(result.current.state).toBe("error");
      });

      expect(result.current.error).toEqual({
        code: "NOT_ALLOWED",
        message: "マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。",
      });
      expect(result.current.stream).toBeNull();
    });

    it("デバイス未検出エラーを処理できること", async () => {
      const notFoundError = new DOMException(
        "Device not found",
        "NotFoundError"
      );
      mockGetUserMedia.mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.requestPermission();
      });

      await waitFor(() => {
        expect(result.current.state).toBe("error");
      });

      expect(result.current.error).toEqual({
        code: "NOT_FOUND",
        message: "マイクが見つかりません。マイクを接続してください。",
      });
    });

    it("デバイス使用中エラーを処理できること", async () => {
      const notReadableError = new DOMException(
        "Device in use",
        "NotReadableError"
      );
      mockGetUserMedia.mockRejectedValue(notReadableError);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.requestPermission();
      });

      await waitFor(() => {
        expect(result.current.state).toBe("error");
      });

      expect(result.current.error).toEqual({
        code: "NOT_READABLE",
        message: "マイクが他のアプリで使用中です。",
      });
    });

    it("重複リクエストを防止できること", async () => {
      const { result } = renderHook(() => useMicrophone());

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // 2つ同時にリクエスト
      await act(async () => {
        const promise1 = result.current.requestPermission();
        const promise2 = result.current.requestPermission();
        await Promise.all([promise1, promise2]);
      });

      // 1回だけ呼ばれること
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[useMicrophone] Request already in progress"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("stopStream", () => {
    it("ストリームを停止できること", async () => {
      const { result } = renderHook(() => useMicrophone());

      // 権限取得
      await act(async () => {
        await result.current.requestPermission();
      });

      await waitFor(() => {
        expect(result.current.state).toBe("ready");
      });

      // ストリーム停止
      act(() => {
        result.current.stopStream();
      });

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(result.current.stream).toBeNull();
      expect(result.current.state).toBe("idle");
      expect(result.current.error).toBeNull();
    });

    it("ストリームが null の場合も安全に動作すること", () => {
      const { result } = renderHook(() => useMicrophone());

      expect(() => {
        act(() => {
          result.current.stopStream();
        });
      }).not.toThrow();
    });
  });

  describe("autoRequest", () => {
    it("autoRequest が true の場合、自動的に権限を要求すること", async () => {
      const { result } = renderHook(() =>
        useMicrophone({ autoRequest: true })
      );

      await waitFor(() => {
        expect(result.current.state).toBe("ready");
      });

      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(result.current.stream).toBe(mockStream);
    });

    it("autoRequest が false の場合、自動要求しないこと", async () => {
      renderHook(() => useMicrophone({ autoRequest: false }));

      // 少し待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });
  });

  describe("カスタム制約", () => {
    it("カスタム制約を使用できること", async () => {
      const customConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        sampleRate: 48000,
      };

      const { result } = renderHook(() =>
        useMicrophone({ constraints: customConstraints })
      );

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: customConstraints,
        video: false,
      });
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にストリームを停止すること", async () => {
      const { result, unmount } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.requestPermission();
      });

      await waitFor(() => {
        expect(result.current.state).toBe("ready");
      });

      unmount();

      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });

  describe("ブラウザサポート確認", () => {
    it("MediaDevices 未サポート時にエラーを返すこと", async () => {
      const utils = require("@/lib/speech/audio-utils");
      utils.isMediaDevicesSupported.mockReturnValue(false);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error).toEqual({
        code: "UNKNOWN",
        message: "このブラウザはマイク機能をサポートしていません",
      });
    });

    it("非セキュアコンテキスト時にエラーを返すこと", async () => {
      const utils = require("@/lib/speech/audio-utils");
      utils.isSecureContext.mockReturnValue(false);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error).toEqual({
        code: "UNKNOWN",
        message: "HTTPSまたはlocalhostでのみマイクを使用できます",
      });
    });
  });
});
