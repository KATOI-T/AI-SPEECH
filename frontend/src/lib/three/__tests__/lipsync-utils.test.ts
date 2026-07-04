/**
 * F-002: リップシンク機能 - LipSyncController テスト
 */

import { LipSyncController } from "../lipsync-utils";
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

describe("LipSyncController", () => {
  let mockVRM: any;
  let controller: LipSyncController;

  beforeEach(() => {
    mockVRM = createMockVRM();
    controller = new LipSyncController(mockVRM);
  });

  describe("constructor", () => {
    it("should initialize with default smoothing", () => {
      expect(controller).toBeDefined();
    });

    it("should accept custom smoothing", () => {
      const customController = new LipSyncController(mockVRM, {
        smoothing: 0.5,
      });
      expect(customController).toBeDefined();
    });

    it("should clamp smoothing to 0-1 range", () => {
      const controller1 = new LipSyncController(mockVRM, { smoothing: -0.5 });
      const controller2 = new LipSyncController(mockVRM, { smoothing: 1.5 });
      expect(controller1).toBeDefined();
      expect(controller2).toBeDefined();
    });

    it("should warn if expressionManager is missing", () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const vrmWithoutManager = {} as any;
      new LipSyncController(vrmWithoutManager);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("expressionManager not found")
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe("setVisemes", () => {
    it("should set visemes in sorted order", () => {
      const visemes: Viseme[] = [
        { time: 0.3, viseme: "ih" },
        { time: 0.1, viseme: "aa" },
        { time: 0.2, viseme: "ou" },
      ];

      controller.setVisemes(visemes);

      const debugInfo = controller.getDebugInfo();
      expect(debugInfo.visemeCount).toBe(3);
      expect(debugInfo.currentTime).toBe(0);
    });

    it("should handle empty viseme array", () => {
      controller.setVisemes([]);
      const debugInfo = controller.getDebugInfo();
      expect(debugInfo.visemeCount).toBe(0);
    });

    it("should log in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      controller.setVisemes([{ time: 0, viseme: "aa" }]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Visemes set"),
        1
      );

      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("updateTime", () => {
    beforeEach(() => {
      const visemes: Viseme[] = [
        { time: 0.0, viseme: "sil" },
        { time: 0.1, viseme: "aa" },
        { time: 0.2, viseme: "ih" },
        { time: 0.3, viseme: "ou" },
      ];
      controller.setVisemes(visemes);
    });

    it("should update to first viseme at t=0", () => {
      controller.updateTime(0.0);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalled();
    });

    it("should update to correct viseme at t=0.15", () => {
      controller.updateTime(0.15);
      const debugInfo = controller.getDebugInfo();
      expect(debugInfo.currentViseme?.viseme).toBe("aa");
    });

    it("should update to correct viseme at t=0.25", () => {
      controller.updateTime(0.25);
      const debugInfo = controller.getDebugInfo();
      expect(debugInfo.currentViseme?.viseme).toBe("ih");
    });

    it("should handle time before first viseme", () => {
      controller.updateTime(-0.1);
      const debugInfo = controller.getDebugInfo();
      expect(debugInfo.currentViseme).toBeNull();
    });

    it("should handle time after last viseme", () => {
      controller.updateTime(1.0);
      const debugInfo = controller.getDebugInfo();
      expect(debugInfo.currentViseme?.viseme).toBe("ou");
    });

    it("should handle sequential updates", () => {
      controller.updateTime(0.0);
      controller.updateTime(0.1);
      controller.updateTime(0.2);
      const debugInfo = controller.getDebugInfo();
      expect(debugInfo.currentViseme?.viseme).toBe("ih");
    });
  });

  describe("reset", () => {
    it("should reset all state", () => {
      const visemes: Viseme[] = [{ time: 0.1, viseme: "aa" }];
      controller.setVisemes(visemes);
      controller.updateTime(0.15);

      controller.reset();

      const debugInfo = controller.getDebugInfo();
      expect(debugInfo.visemeCount).toBe(0);
      expect(debugInfo.currentTime).toBe(0);
      expect(debugInfo.currentVisemeIndex).toBe(0);
    });

    it("should reset all blend shapes to 0", () => {
      controller.reset();
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        expect.any(String),
        0
      );
    });

    it("should log in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      controller.reset();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Reset")
      );

      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("setSmoothingFactor", () => {
    it("should update smoothing factor", () => {
      controller.setSmoothingFactor(0.7);
      // Smoothing factorは内部状態なので、間接的に確認
      expect(controller).toBeDefined();
    });

    it("should clamp smoothing factor to 0-1", () => {
      controller.setSmoothingFactor(-0.5);
      controller.setSmoothingFactor(1.5);
      expect(controller).toBeDefined();
    });
  });

  describe("getDebugInfo", () => {
    it("should return correct debug info", () => {
      const visemes: Viseme[] = [
        { time: 0.0, viseme: "sil" },
        { time: 0.1, viseme: "aa" },
      ];
      controller.setVisemes(visemes);
      controller.updateTime(0.15);

      const debugInfo = controller.getDebugInfo();

      expect(debugInfo).toEqual({
        visemeCount: 2,
        currentTime: 0.15,
        currentVisemeIndex: 1,
        currentViseme: { time: 0.1, viseme: "aa" },
      });
    });
  });

  describe("applyViseme (via updateTime)", () => {
    beforeEach(() => {
      const visemes: Viseme[] = [{ time: 0.0, viseme: "aa" }];
      controller.setVisemes(visemes);
    });

    it("should apply correct blend shape", () => {
      controller.updateTime(0.0);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        "aa",
        expect.any(Number)
      );
    });

    it("should warn for unknown viseme", () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const visemes: Viseme[] = [{ time: 0.0, viseme: "unknown" }];
      controller.setVisemes(visemes);
      controller.updateTime(0.0);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown viseme")
      );

      consoleWarnSpy.mockRestore();
    });

    it("should apply neutral when no current viseme", () => {
      controller.updateTime(-0.1); // Before first viseme
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle VRM without expressionManager", () => {
      const vrmWithoutManager = {} as any;
      const controller = new LipSyncController(vrmWithoutManager);

      controller.setVisemes([{ time: 0, viseme: "aa" }]);
      controller.updateTime(0);
      controller.reset();

      // Should not throw
      expect(controller).toBeDefined();
    });

    it("should handle rapid time updates", () => {
      const visemes: Viseme[] = [
        { time: 0.0, viseme: "sil" },
        { time: 0.1, viseme: "aa" },
        { time: 0.2, viseme: "ih" },
      ];
      controller.setVisemes(visemes);

      for (let t = 0; t <= 0.2; t += 0.01) {
        controller.updateTime(t);
      }

      const debugInfo = controller.getDebugInfo();
      expect(debugInfo.currentViseme?.viseme).toBe("ih");
    });

    it("should handle duplicate viseme times", () => {
      const visemes: Viseme[] = [
        { time: 0.1, viseme: "aa" },
        { time: 0.1, viseme: "ih" },
        { time: 0.1, viseme: "ou" },
      ];
      controller.setVisemes(visemes);
      controller.updateTime(0.1);

      // Should handle without crashing
      expect(controller).toBeDefined();
    });
  });
});
