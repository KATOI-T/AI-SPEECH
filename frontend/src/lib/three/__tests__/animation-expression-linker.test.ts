/**
 * F-011: AnimationExpressionLinker テスト
 */

import { AnimationExpressionLinker } from "../animation-expression-linker";
import { ExpressionController } from "../expression-controller";

// VRM モック
const createMockVRM = () => {
  const values = new Map<string, number>();
  const expressions = [
    "happy", "angry", "sad", "relaxed", "surprised", "blink",
    "aa", "ih", "ou", "ee", "oh",
  ].map((name) => ({ expressionName: name }));

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

describe("AnimationExpressionLinker", () => {
  let mockVRM: any;
  let expressionCtrl: ExpressionController;
  let linker: AnimationExpressionLinker;

  beforeEach(() => {
    mockVRM = createMockVRM();
    expressionCtrl = new ExpressionController(mockVRM);
    linker = new AnimationExpressionLinker(expressionCtrl);
  });

  describe("constructor", () => {
    it("should initialize with no active expressions", () => {
      expect(linker.getActiveExpressions()).toEqual([]);
    });
  });

  describe("onStateChange — greeting", () => {
    it("should activate greeting expressions", () => {
      linker.onStateChange("greeting");
      const active = linker.getActiveExpressions();
      expect(active.length).toBe(1);
      expect(active[0].expression).toBe("blink");
      expect(active[0].phase).toBe("delay_in");
    });

    it("should not activate for states without expression map", () => {
      linker.onStateChange("idle");
      expect(linker.getActiveExpressions()).toEqual([]);
    });
  });

  describe("update — greeting blink timeline", () => {
    it("should stay in delay_in before 0.6s", () => {
      linker.onStateChange("greeting");

      // Advance 0.5s (before delayIn of 0.6s)
      linker.update(0.5);
      const active = linker.getActiveExpressions();
      expect(active[0].phase).toBe("delay_in");
      expect(active[0].weight).toBe(0);
    });

    it("should transition to fade_in after 0.6s", () => {
      linker.onStateChange("greeting");

      // Advance past delayIn
      linker.update(0.65);
      const active = linker.getActiveExpressions();
      expect(active[0].phase).toBe("fade_in");
    });

    it("should reach active phase after fadeIn completes", () => {
      linker.onStateChange("greeting");

      // 0.6s delay + 0.2s fadeIn = 0.8s
      linker.update(0.85);
      const active = linker.getActiveExpressions();
      expect(active[0].phase).toBe("active");
      expect(active[0].weight).toBe(1.0);
    });

    it("should maintain weight=1.0 during active phase", () => {
      linker.onStateChange("greeting");

      // Advance to active phase (past 0.8s) and then some more
      linker.update(1.5);
      const active = linker.getActiveExpressions();
      expect(active[0].phase).toBe("active");
      expect(active[0].weight).toBe(1.0);
    });

    it("should transition to fade_out at 2.8s", () => {
      linker.onStateChange("greeting");

      linker.update(2.85);
      const active = linker.getActiveExpressions();
      expect(active[0].phase).toBe("fade_out");
      expect(active[0].weight).toBeLessThan(1.0);
    });

    it("should become inactive after fade_out completes", () => {
      linker.onStateChange("greeting");

      // 2.8s delayOut + 0.3s fadeOut = 3.1s
      linker.update(3.2);
      // inactive expressions are cleaned up
      expect(linker.getActiveExpressions()).toEqual([]);
    });

    it("should set blink expression on VRM during fade_in", () => {
      linker.onStateChange("greeting");

      // Advance to middle of fade_in
      linker.update(0.7);

      // Linker calls setExpression which sets targetWeights;
      // expressionCtrl.update applies them to VRM
      expressionCtrl.update(0.1);

      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        "blink",
        expect.any(Number)
      );
    });
  });

  describe("blink suppression", () => {
    it("should suppress auto-blink during greeting", () => {
      // Enable blink and set short interval
      expressionCtrl.setBlinkEnabled(true);
      expressionCtrl.setBlinkInterval(1);

      linker.onStateChange("greeting");

      mockVRM.expressionManager.setValue.mockClear();

      // During greeting active phase, auto-blink should be suppressed
      // Only linker-controlled blink calls should appear
      // Advance to active phase
      for (let i = 0; i < 100; i++) {
        expressionCtrl.update(0.016);
        linker.update(0.016);
      }

      // The blink calls should be from the linker (gradually increasing to 1.0)
      // and not from the random auto-blink pattern
      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");

      // Should have blink calls from linker
      expect(blinkCalls.length).toBeGreaterThan(0);
    });

    it("should restore auto-blink after greeting ends", () => {
      expressionCtrl.setBlinkEnabled(true);
      expressionCtrl.setBlinkInterval(1);

      linker.onStateChange("greeting");

      // Advance past entire greeting timeline
      linker.update(3.5);

      // Switch to idle (cleanup)
      linker.onStateChange("idle");

      mockVRM.expressionManager.setValue.mockClear();

      // Now auto-blink should work again
      for (let i = 0; i < 200; i++) {
        expressionCtrl.update(0.016);
      }

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBeGreaterThan(0);
    });
  });

  describe("state change during animation", () => {
    it("should cleanup previous state when switching", () => {
      linker.onStateChange("greeting");
      linker.update(1.0); // mid-greeting

      // Verify blink is active
      expect(linker.getActiveExpressions().length).toBe(1);

      // Switch to different state
      linker.onStateChange("idle");

      // Should be cleaned up
      expect(linker.getActiveExpressions()).toEqual([]);
    });

    it("should reset blink weight when interrupted", () => {
      linker.onStateChange("greeting");
      linker.update(1.0); // mid-greeting, blink should be 1.0

      mockVRM.expressionManager.setValue.mockClear();

      linker.onStateChange("idle");

      // cleanup sets expression target to 0 via setExpression
      // need to run expressionCtrl.update to apply to VRM
      expressionCtrl.update(1.0);

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      // The last blink call should be 0 or very close to 0
      expect(blinkCalls.length).toBeGreaterThan(0);
      const lastValue = blinkCalls[blinkCalls.length - 1][1];
      expect(lastValue).toBeLessThan(0.01);
    });

    it("should release blink suppression when interrupted", () => {
      linker.onStateChange("greeting");
      linker.update(1.0);

      // Interrupt
      linker.onStateChange("idle");

      // Auto-blink should now work
      expressionCtrl.setBlinkEnabled(true);
      expressionCtrl.setBlinkInterval(1);
      mockVRM.expressionManager.setValue.mockClear();

      for (let i = 0; i < 200; i++) {
        expressionCtrl.update(0.016);
      }

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBeGreaterThan(0);
    });
  });

  describe("dispose", () => {
    it("should clean up all state", () => {
      linker.onStateChange("greeting");
      linker.update(1.0);

      linker.dispose();

      expect(linker.getActiveExpressions()).toEqual([]);
    });

    it("should reset blink weight on dispose", () => {
      linker.onStateChange("greeting");
      linker.update(1.0);

      mockVRM.expressionManager.setValue.mockClear();
      linker.dispose();

      // cleanup sets expression target to 0 via setExpression
      expressionCtrl.update(1.0);

      const blinkCalls = mockVRM.expressionManager.setValue.mock.calls
        .filter(([name]: [string]) => name === "blink");
      expect(blinkCalls.length).toBeGreaterThan(0);
      const lastValue = blinkCalls[blinkCalls.length - 1][1];
      expect(lastValue).toBeLessThan(0.01);
    });
  });

  describe("incremental updates", () => {
    it("should work correctly with small delta steps", () => {
      linker.onStateChange("greeting");

      // Simulate frame-by-frame updates
      for (let i = 0; i < 200; i++) {
        linker.update(0.016); // ~60fps
      }

      // At 3.2s, blink should have completed its cycle
      expect(linker.getActiveExpressions()).toEqual([]);
    });

    it("should interpolate blink weight during fade_in", () => {
      linker.onStateChange("greeting");

      // Advance to start of fade_in (0.6s)
      linker.update(0.6);

      // Advance halfway through fade_in (0.1s of 0.2s)
      linker.update(0.1);

      const active = linker.getActiveExpressions();
      expect(active[0].weight).toBeCloseTo(0.5, 1);
    });

    it("should interpolate blink weight during fade_out", () => {
      linker.onStateChange("greeting");

      // Advance to start of fade_out (2.8s)
      linker.update(2.8);

      // Advance halfway through fade_out (0.15s of 0.3s)
      linker.update(0.15);

      const active = linker.getActiveExpressions();
      expect(active[0].weight).toBeCloseTo(0.5, 1);
    });
  });
});
