/**
 * F-004: 音声入力（STT）機能 - audio-utils テスト
 */

import {
  getMicrophoneDevices,
  getDefaultMicrophoneConstraints,
  stopMediaStream,
  isMediaDevicesSupported,
  isSecureContext,
} from "../audio-utils";

describe("audio-utils", () => {
  describe("getMicrophoneDevices", () => {
    it("マイクデバイス一覧を取得できること", async () => {
      // モックデバイス
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: "mic1",
          kind: "audioinput",
          label: "マイク1",
          groupId: "group1",
          toJSON: () => ({}),
        },
        {
          deviceId: "cam1",
          kind: "videoinput",
          label: "カメラ1",
          groupId: "group1",
          toJSON: () => ({}),
        },
        {
          deviceId: "mic2",
          kind: "audioinput",
          label: "マイク2",
          groupId: "group2",
          toJSON: () => ({}),
        },
      ];

      // navigator.mediaDevices.enumerateDevices をモック
      global.navigator.mediaDevices = {
        enumerateDevices: jest.fn().mockResolvedValue(mockDevices),
      } as any;

      const devices = await getMicrophoneDevices();

      expect(devices).toHaveLength(2);
      expect(devices[0].kind).toBe("audioinput");
      expect(devices[1].kind).toBe("audioinput");
    });

    it("デバイス取得エラー時に空配列を返すこと", async () => {
      global.navigator.mediaDevices = {
        enumerateDevices: jest
          .fn()
          .mockRejectedValue(new Error("Permission denied")),
      } as any;

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const devices = await getMicrophoneDevices();

      expect(devices).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("getDefaultMicrophoneConstraints", () => {
    it("デフォルトのマイク制約を取得できること", () => {
      const constraints = getDefaultMicrophoneConstraints();

      expect(constraints).toEqual({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
      });
    });

    it("制約が固定値であること", () => {
      const constraints1 = getDefaultMicrophoneConstraints();
      const constraints2 = getDefaultMicrophoneConstraints();

      expect(constraints1).toEqual(constraints2);
    });
  });

  describe("stopMediaStream", () => {
    it("MediaStreamの全トラックを停止できること", () => {
      // モックトラック
      const mockTrack1 = {
        stop: jest.fn(),
        label: "Track 1",
      } as any;

      const mockTrack2 = {
        stop: jest.fn(),
        label: "Track 2",
      } as any;

      const mockStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack1, mockTrack2]),
      } as any;

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      stopMediaStream(mockStream);

      expect(mockTrack1.stop).toHaveBeenCalled();
      expect(mockTrack2.stop).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it("null のストリームを渡しても例外が発生しないこと", () => {
      expect(() => stopMediaStream(null)).not.toThrow();
    });
  });

  describe("isMediaDevicesSupported", () => {
    it("navigator.mediaDevices がサポートされている場合 true を返すこと", () => {
      global.navigator.mediaDevices = {
        getUserMedia: jest.fn(),
      } as any;

      expect(isMediaDevicesSupported()).toBe(true);
    });

    it("navigator.mediaDevices が存在しない場合 false を返すこと", () => {
      const original = global.navigator.mediaDevices;
      (global.navigator as any).mediaDevices = undefined;

      expect(isMediaDevicesSupported()).toBe(false);

      global.navigator.mediaDevices = original;
    });

    it("getUserMedia が存在しない場合 false を返すこと", () => {
      global.navigator.mediaDevices = {} as any;

      expect(isMediaDevicesSupported()).toBe(false);
    });
  });

  describe("isSecureContext", () => {
    it("window.isSecureContext の値を返すこと", () => {
      // セキュアコンテキスト
      Object.defineProperty(window, "isSecureContext", {
        writable: true,
        value: true,
      });

      expect(isSecureContext()).toBe(true);

      // 非セキュアコンテキスト
      Object.defineProperty(window, "isSecureContext", {
        writable: true,
        value: false,
      });

      expect(isSecureContext()).toBe(false);
    });
  });
});
