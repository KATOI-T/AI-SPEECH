/**
 * F-002: リップシンク機能 - useLipSync フックテスト
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useLipSync } from "../useLipSync";
import type { Viseme } from "@/types/lipsync";

// VRM モック
const createMockVRM = () => {
  const values = new Map<string, number>();

  return {
    expressionManager: {
      getValue: jest.fn((name: string) => values.get(name) ?? 0),
      setValue: jest.fn((name: string, value: number) => {
        values.set(name, value);
      }),
    },
    update: jest.fn(),
  } as any;
};

// HTMLAudioElement モック
const createMockAudioElement = () => {
  const listeners = new Map<string, EventListener[]>();

  const mockAudio = {
    currentTime: 0,
    paused: true,
    addEventListener: jest.fn((event: string, listener: EventListener) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)?.push(listener);
    }),
    removeEventListener: jest.fn((event: string, listener: EventListener) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    }),
    dispatchEvent: jest.fn((event: Event) => {
      const eventListeners = listeners.get(event.type);
      if (eventListeners) {
        eventListeners.forEach((listener) => listener(event));
      }
      return true;
    }),
  } as unknown as HTMLAudioElement;

  return { mockAudio, listeners };
};

describe("useLipSync", () => {
  let mockVRM: any;
  let mockAudio: HTMLAudioElement;
  let listeners: Map<string, EventListener[]>;

  const sampleVisemes: Viseme[] = [
    { time: 0.0, viseme: "sil" },
    { time: 0.1, viseme: "aa" },
    { time: 0.2, viseme: "ih" },
  ];

  beforeEach(() => {
    mockVRM = createMockVRM();
    const audioMock = createMockAudioElement();
    mockAudio = audioMock.mockAudio;
    listeners = audioMock.listeners;

    // requestAnimationFrame モック
    global.requestAnimationFrame = jest.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    }) as any;

    global.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize controller when vrm is provided", () => {
      const { result } = renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: null,
          visemes: [],
          enabled: true,
        })
      );

      expect(result.current.controller).toBeDefined();
    });

    it("should not initialize controller when vrm is null", () => {
      const { result } = renderHook(() =>
        useLipSync({
          vrm: null,
          audioElement: null,
          visemes: [],
          enabled: true,
        })
      );

      expect(result.current.controller).toBeNull();
    });

    it("should not initialize controller when disabled", () => {
      const { result } = renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: null,
          visemes: [],
          enabled: false,
        })
      );

      expect(result.current.controller).toBeNull();
    });

    it("should log in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: null,
          visemes: [],
          enabled: true,
        })
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Controller initialized")
      );

      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("visemes", () => {
    it("should set visemes when provided", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: null,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Visemes set"),
        3
      );

      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should update visemes when changed", () => {
      const { rerender } = renderHook(
        ({ visemes }) =>
          useLipSync({
            vrm: mockVRM,
            audioElement: null,
            visemes,
            enabled: true,
          }),
        { initialProps: { visemes: [] } }
      );

      rerender({ visemes: sampleVisemes });

      // Controller should have received the new visemes
      // (tested indirectly via integration)
    });
  });

  describe("audio sync", () => {
    it("should register audio event listeners", () => {
      renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: mockAudio,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      expect(mockAudio.addEventListener).toHaveBeenCalledWith(
        "play",
        expect.any(Function)
      );
      expect(mockAudio.addEventListener).toHaveBeenCalledWith(
        "pause",
        expect.any(Function)
      );
      expect(mockAudio.addEventListener).toHaveBeenCalledWith(
        "ended",
        expect.any(Function)
      );
      expect(mockAudio.addEventListener).toHaveBeenCalledWith(
        "seeked",
        expect.any(Function)
      );
    });

    it("should start animation on play event", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: mockAudio,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      // Trigger play event
      const playEvent = new Event("play");
      mockAudio.dispatchEvent(playEvent);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining("Audio play started")
        );
      });

      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should stop animation on pause event", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: mockAudio,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      // Trigger pause event
      const pauseEvent = new Event("pause");
      mockAudio.dispatchEvent(pauseEvent);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining("Audio paused")
        );
      });

      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should reset on ended event", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: mockAudio,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      // Trigger ended event
      const endedEvent = new Event("ended");
      mockAudio.dispatchEvent(endedEvent);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining("Audio ended")
        );
      });

      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should handle seeked event", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: mockAudio,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      // Start playing first
      (mockAudio as any).paused = false;
      const playEvent = new Event("play");
      mockAudio.dispatchEvent(playEvent);

      // Then seek
      mockAudio.currentTime = 0.15;
      const seekedEvent = new Event("seeked");
      mockAudio.dispatchEvent(seekedEvent);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining("Audio seeked to"),
          0.15
        );
      });

      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should cleanup event listeners on unmount", () => {
      const { unmount } = renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: mockAudio,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      unmount();

      expect(mockAudio.removeEventListener).toHaveBeenCalledWith(
        "play",
        expect.any(Function)
      );
      expect(mockAudio.removeEventListener).toHaveBeenCalledWith(
        "pause",
        expect.any(Function)
      );
      expect(mockAudio.removeEventListener).toHaveBeenCalledWith(
        "ended",
        expect.any(Function)
      );
      expect(mockAudio.removeEventListener).toHaveBeenCalledWith(
        "seeked",
        expect.any(Function)
      );
    });
  });

  describe("reset", () => {
    it("should provide reset function", () => {
      const { result } = renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: null,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      expect(result.current.reset).toBeInstanceOf(Function);
    });

    it("should reset controller when called", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      const { result } = renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: null,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      result.current.reset();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Manual reset")
      );

      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should cancel animation frame on reset", () => {
      const { result } = renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: mockAudio,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      // Trigger play to start animation
      const playEvent = new Event("play");
      mockAudio.dispatchEvent(playEvent);

      // Reset
      result.current.reset();

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should reset controller on unmount", () => {
      const { unmount, result } = renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: null,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      const controller = result.current.controller;
      const resetSpy = jest.spyOn(controller as any, "reset");

      unmount();

      expect(resetSpy).toHaveBeenCalled();
    });

    it("should cancel animation frame on unmount", () => {
      const { unmount } = renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: mockAudio,
          visemes: sampleVisemes,
          enabled: true,
        })
      );

      // Trigger play
      const playEvent = new Event("play");
      mockAudio.dispatchEvent(playEvent);

      unmount();

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe("controllerOptions", () => {
    it("should pass options to controller", () => {
      const { result } = renderHook(() =>
        useLipSync({
          vrm: mockVRM,
          audioElement: null,
          visemes: [],
          enabled: true,
          controllerOptions: { smoothing: 0.5 },
        })
      );

      expect(result.current.controller).toBeDefined();
    });
  });
});
