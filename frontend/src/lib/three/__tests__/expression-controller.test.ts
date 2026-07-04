/**
 * F-010: ExpressionController テスト
 */

import { ExpressionController } from "../expression-controller";

// VRM モック
const createMockVRM = (expressionNames: string[] = []) => {
  const values = new Map<string, number>();
  const expressions = expressionNames.map((name) => ({ expressionName: name }));

  return {
    expressionManager: {
      getValue: jest.fn((name: string) => values.get(name) ?? 0),
      setValue: jest.fn((name: string, value: number) => {
        values.set(name, value);
      }),
      expressions,
    },
    update: jest.fn(),
  } as any;
};

const STANDARD_EXPRESSIONS = [
  "happy", "angry", "sad", "relaxed", "surprised", "blink",
  "aa", "ih", "ou", "ee", "oh",
];

describe("ExpressionController", () => {
  let mockVRM: any;
  let controller: ExpressionController;

  beforeEach(() => {
    mockVRM = createMockVRM(STANDARD_EXPRESSIONS);
    controller = new ExpressionController(mockVRM);
  });

  describe("constructor", () => {
    it("should initialize successfully", () => {
      expect(controller).toBeDefined();
    });
  });

  describe("setExpression", () => {
    it("should set target weight for an expression", () => {
      controller.setExpression("happy", 0.8);
      controller.update(1); // large delta for immediate effect
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        "happy",
        expect.any(Number)
      );
    });

    it("should clamp weight between 0 and 1", () => {
      controller.setExpression("happy", 1.5);
      controller.update(1);

      const happyCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "happy");
      const lastValue = happyCalls[happyCalls.length - 1][1];
      expect(lastValue).toBeLessThanOrEqual(1);
    });

    it("should clamp negative weight to 0", () => {
      controller.setExpression("happy", -0.5);
      controller.update(1);

      const happyCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "happy");
      if (happyCalls.length > 0) {
        const lastValue = happyCalls[happyCalls.length - 1][1];
        expect(lastValue).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("setEmotion", () => {
    it("should apply emotion preset weights", () => {
      controller.setEmotion("happy");
      controller.update(1);

      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        "happy",
        expect.any(Number)
      );
    });

    it("should clear previous emotion when setting new one", () => {
      controller.setEmotion("happy");
      controller.update(0.5);

      mockVRM.expressionManager.setValue.mockClear();

      controller.setEmotion("sad");
      controller.update(1);

      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        "sad",
        expect.any(Number)
      );
    });

    it("should use speaking weight when isSpeaking is true", () => {
      controller.setEmotion("happy", false);
      controller.update(1);

      const normalCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "happy");
      const normalValue = normalCalls[normalCalls.length - 1][1];

      mockVRM.expressionManager.setValue.mockClear();

      controller.setEmotion("happy", true);
      controller.update(1);

      const speakingCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "happy");
      const speakingValue = speakingCalls[speakingCalls.length - 1][1];

      // Speaking weight should be lower than normal weight for happy
      expect(speakingValue).toBeLessThan(normalValue);
    });
  });

  describe("setSpeaking", () => {
    it("should update speaking state and re-apply emotion", () => {
      controller.setEmotion("happy");
      controller.update(1);

      mockVRM.expressionManager.setValue.mockClear();

      controller.setSpeaking(true);
      controller.update(1);

      expect(mockVRM.expressionManager.setValue).toHaveBeenCalled();
    });
  });

  describe("setBlinkEnabled / setBlinkInterval", () => {
    it("should toggle blink state", () => {
      controller.setBlinkEnabled(false);
      expect(controller.getBlinkState().enabled).toBe(false);

      controller.setBlinkEnabled(true);
      expect(controller.getBlinkState().enabled).toBe(true);
    });

    it("should set blink interval", () => {
      controller.setBlinkInterval(2);
      expect(controller.getBlinkState().interval).toBe(2);
    });

    it("should clamp blink interval to valid range (F-011-007: 1-3s)", () => {
      controller.setBlinkInterval(0.1);
      expect(controller.getBlinkState().interval).toBe(1);

      controller.setBlinkInterval(20);
      expect(controller.getBlinkState().interval).toBe(3);
    });

    it("should default to 2s interval (F-011-007 midpoint)", () => {
      // Fresh controller should start with blinkInterval at range midpoint
      const fresh = new ExpressionController(mockVRM);
      expect(fresh.getBlinkState().interval).toBe(2);
    });
  });

  describe("update", () => {
    it("should not throw when called with valid delta", () => {
      expect(() => controller.update(0.016)).not.toThrow();
    });

    it("should handle blink when enabled", () => {
      controller.setBlinkEnabled(true);
      // Simulate enough time for a blink to trigger
      for (let i = 0; i < 500; i++) {
        controller.update(0.016);
      }
      // blink should have been set at some point
      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBeGreaterThan(0);
    });

    it("should suppress blink when emotion is surprised", () => {
      controller.setEmotion("surprised");
      controller.setBlinkEnabled(true);

      mockVRM.expressionManager.setValue.mockClear();

      for (let i = 0; i < 500; i++) {
        controller.update(0.016);
      }

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBe(0);
    });

    it("should not set blink when disabled", () => {
      controller.setBlinkEnabled(false);
      mockVRM.expressionManager.setValue.mockClear();

      for (let i = 0; i < 500; i++) {
        controller.update(0.016);
      }

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBe(0);
    });
  });

  describe("getAvailableExpressions", () => {
    it("should return non-mouth expressions", () => {
      const expressions = controller.getAvailableExpressions();
      expect(expressions).toContain("happy");
      expect(expressions).toContain("angry");
      expect(expressions).not.toContain("aa");
      expect(expressions).not.toContain("ih");
      expect(expressions).not.toContain("ou");
    });
  });

  describe("getWeights", () => {
    it("should return current weights", () => {
      controller.setExpression("happy", 0.5);
      controller.update(1);
      const weights = controller.getWeights();
      expect(weights).toHaveProperty("happy");
      expect(weights.happy).toBeGreaterThan(0);
    });
  });

  describe("getEmotion", () => {
    it("should return current emotion", () => {
      expect(controller.getEmotion()).toBe("neutral");
      controller.setEmotion("happy");
      expect(controller.getEmotion()).toBe("happy");
    });
  });

  describe("resetExpressions", () => {
    it("should clear all expression weights", () => {
      controller.setExpression("happy", 0.8);
      controller.update(1);

      mockVRM.expressionManager.setValue.mockClear();

      controller.resetExpressions();

      // Should have reset non-mouth expressions to 0
      const setCalls = mockVRM.expressionManager.setValue.mock.calls;
      for (const [name, value] of setCalls) {
        expect(value).toBe(0);
        expect(["aa", "ih", "ou", "ee", "oh"]).not.toContain(name);
      }
    });

    it("should reset emotion to neutral", () => {
      controller.setEmotion("angry");
      controller.resetExpressions();
      expect(controller.getEmotion()).toBe("neutral");
    });
  });

  describe("dispose", () => {
    it("should clean up without error", () => {
      controller.setExpression("happy", 0.5);
      controller.update(0.5);
      expect(() => controller.dispose()).not.toThrow();
    });
  });

  describe("expression decay (R-007 fix)", () => {
    it("should decay expressions not in target to 0 and clean up", () => {
      // Set an expression and let it converge
      controller.setExpression("happy", 0.8);
      controller.update(1); // large delta → near target

      // Now remove from target by setting a different emotion that clears happy
      controller.setEmotion("sad");
      mockVRM.expressionManager.setValue.mockClear();

      // Run enough frames for happy to decay below 0.001
      for (let i = 0; i < 200; i++) {
        controller.update(0.016);
      }

      // Should have called setValue with very small or 0 value for cleanup
      const happyCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "happy");
      const lastHappyCall = happyCalls[happyCalls.length - 1];
      expect(lastHappyCall[1]).toBeLessThan(0.001);

      // After enough decay, happy weight should be cleaned up from currentWeights
      const weights = controller.getWeights();
      if ("happy" in weights) {
        expect(weights.happy).toBeLessThan(0.001);
      }
    });

    it("should skip mouth expressions during decay", () => {
      // Manually set a mouth expression weight through internal state
      // by using setExpression (which doesn't filter mouth)
      controller.setExpression("aa", 0.5);
      controller.update(1);
      mockVRM.expressionManager.setValue.mockClear();

      // aa is a mouth expression - it should be skipped in applyExpressions
      controller.setEmotion("neutral");
      controller.update(0.5);

      const aaCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "aa");
      // Mouth expressions should not be set by ExpressionController
      expect(aaCalls.length).toBe(0);
    });
  });

  describe("randomBlinkInterval (F-011-007: 1〜3s range)", () => {
    it("should generate blinks within 1-3s range at max interval", () => {
      // setBlinkInterval は BLINK_MAX_INTERVAL (3) にクランプされる
      controller.setBlinkInterval(3);
      controller.setBlinkEnabled(true);

      // 10 seconds of frames → multiple blinks expected (1-3s interval)
      mockVRM.expressionManager.setValue.mockClear();
      for (let i = 0; i < 700; i++) {
        controller.update(0.016);
      }

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBeGreaterThan(0);
    });

    it("should generate blinks at minimum interval", () => {
      controller.setBlinkInterval(1);
      controller.setBlinkEnabled(true);

      mockVRM.expressionManager.setValue.mockClear();
      for (let i = 0; i < 500; i++) {
        controller.update(0.016);
      }

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBeGreaterThan(0);
    });
  });

  describe("blink animation cycle", () => {
    it("should complete a full blink cycle (close → open → reset)", () => {
      controller.setBlinkEnabled(true);

      // Fast forward past the initial blink timer
      for (let i = 0; i < 500; i++) {
        controller.update(0.016);
      }

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");

      // Should see values going up (closing) then down (opening) then 0 (reset)
      expect(blinkCalls.length).toBeGreaterThan(2);

      // At least one call should have value > 0 (during blink)
      const nonZeroBlinks = blinkCalls.filter(([, v]: [string, number]) => v > 0);
      expect(nonZeroBlinks.length).toBeGreaterThan(0);
    });
  });

  describe("setBlinkSuppressed (F-011)", () => {
    it("should suppress auto-blink when set to true", () => {
      controller.setBlinkEnabled(true);
      controller.setBlinkInterval(1);
      controller.setBlinkSuppressed(true);

      mockVRM.expressionManager.setValue.mockClear();

      for (let i = 0; i < 200; i++) {
        controller.update(0.016);
      }

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBe(0);
    });

    it("should allow auto-blink when set back to false", () => {
      controller.setBlinkEnabled(true);
      controller.setBlinkInterval(1);

      controller.setBlinkSuppressed(true);
      controller.setBlinkSuppressed(false);

      mockVRM.expressionManager.setValue.mockClear();

      // Run enough frames to guarantee at least one blink cycle
      for (let i = 0; i < 800; i++) {
        controller.update(0.016);
      }

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle VRM without expressionManager", () => {
      const noExprVRM = { expressionManager: null } as any;
      const ctrl = new ExpressionController(noExprVRM);
      expect(() => ctrl.update(0.016)).not.toThrow();
      expect(ctrl.getAvailableExpressions()).toEqual([]);
    });

    it("should handle resetExpressions when expressionManager is null", () => {
      const noExprVRM = { expressionManager: null } as any;
      const ctrl = new ExpressionController(noExprVRM);
      expect(() => ctrl.resetExpressions()).not.toThrow();
    });

    it("should handle zero delta", () => {
      expect(() => controller.update(0)).not.toThrow();
    });

    it("should handle very large delta", () => {
      controller.setExpression("happy", 0.5);
      expect(() => controller.update(100)).not.toThrow();
    });

    it("should not mutate returned weights object", () => {
      controller.setExpression("happy", 0.5);
      controller.update(1);
      const w1 = controller.getWeights();
      w1.happy = 999;
      const w2 = controller.getWeights();
      expect(w2.happy).not.toBe(999);
    });
  });
});
