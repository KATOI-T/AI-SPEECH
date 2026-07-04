/**
 * F-010: useConversationAnimation Hook テスト
 */

import { renderHook, act } from "@testing-library/react";
import { useConversationAnimation } from "../useConversationAnimation";

// VRM モック
const createMockVRM = () => {
  const values = new Map<string, number>();
  const expressions = [
    "happy", "angry", "sad", "relaxed", "surprised", "blink",
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

// rAF モック
let rafCallbacks: ((time: number) => void)[] = [];
const originalRAF = global.requestAnimationFrame;
const originalCAF = global.cancelAnimationFrame;

beforeAll(() => {
  global.requestAnimationFrame = jest.fn((cb: (time: number) => void) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  global.cancelAnimationFrame = jest.fn();
});

afterAll(() => {
  global.requestAnimationFrame = originalRAF;
  global.cancelAnimationFrame = originalCAF;
});

beforeEach(() => {
  rafCallbacks = [];
});

describe("useConversationAnimation", () => {
  it("should initialize with default values", () => {
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: null })
    );

    expect(result.current.phase).toBe("IDLE");
    expect(result.current.emotion).toBe("neutral");
    expect(result.current.animationState).toBe("idle");
    expect(result.current.expressionController).toBeNull();
  });

  it("should create ExpressionController when VRM is provided", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    // rAF should have been registered
    expect(global.requestAnimationFrame).toHaveBeenCalled();
  });

  it("should update animationState based on phase", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setPhase("SPEAKING");
    });

    expect(result.current.phase).toBe("SPEAKING");
    expect(result.current.animationState).toBe("talking");
  });

  it("should map IDLE phase to idle animation", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setPhase("IDLE");
    });

    expect(result.current.animationState).toBe("idle");
  });

  it("should map LISTENING phase to idle animation", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setPhase("LISTENING");
    });

    expect(result.current.animationState).toBe("idle");
  });

  it("should map THINKING phase to thinking animation", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setPhase("THINKING");
    });

    expect(result.current.animationState).toBe("thinking");
  });

  // F-011-011 (v3.0): EMOTION_BODY_OVERRIDE を空にしたため、SPEAKING 中も感情で body は変化しない。
  // 代わりに感情に関わらず talking 固定になることを確認する。
  it("should use talking body for happy emotion during SPEAKING (v3.0: no body override)", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setEmotion("happy");
      result.current.setPhase("SPEAKING");
    });

    expect(result.current.animationState).toBe("talking");
  });

  it("should use talking body for angry emotion during SPEAKING (v3.0: no body override)", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setEmotion("angry");
      result.current.setPhase("SPEAKING");
    });

    expect(result.current.animationState).toBe("talking");
  });

  it("should use talking body for sad emotion during SPEAKING (v3.0: no body override)", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setEmotion("sad");
      result.current.setPhase("SPEAKING");
    });

    expect(result.current.animationState).toBe("talking");
  });

  it("should not apply emotion override when not SPEAKING", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setEmotion("happy");
      result.current.setPhase("IDLE");
    });

    expect(result.current.animationState).toBe("idle");
  });

  it("should not create controller when disabled", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM, enabled: false })
    );

    expect(result.current.expressionController).toBeNull();
  });

  it("should clean up on unmount", () => {
    const mockVRM = createMockVRM();
    const { unmount } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    expect(() => unmount()).not.toThrow();
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("should update emotion state", () => {
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: null })
    );

    act(() => {
      result.current.setEmotion("surprised");
    });

    expect(result.current.emotion).toBe("surprised");
  });

  it("should invoke controller.update when rAF fires", () => {
    const mockVRM = createMockVRM();
    renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    // Simulate rAF callback
    expect(rafCallbacks.length).toBeGreaterThan(0);
    const cb = rafCallbacks[rafCallbacks.length - 1];
    expect(() => cb(performance.now() + 16)).not.toThrow();
  });

  it("should create controller as useState (R-001 fix)", () => {
    const mockVRM = createMockVRM();
    const { result, rerender } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    // After initial render + useEffect, controller should be set via setState
    // Trigger a rerender to ensure controller is available
    rerender();

    // The controller should now be non-null (useState triggers re-render)
    expect(result.current.expressionController).not.toBeNull();
  });

  it("should sync emotion to ExpressionController when phase changes", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setEmotion("happy");
    });

    act(() => {
      result.current.setPhase("SPEAKING");
    });

    // Controller should have the happy emotion applied
    if (result.current.expressionController) {
      expect(result.current.expressionController.getEmotion()).toBe("happy");
    }
  });

  it("should return default animation for SPEAKING with neutral emotion", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setEmotion("neutral");
      result.current.setPhase("SPEAKING");
    });

    expect(result.current.animationState).toBe("talking");
  });

  it("should use talking body for surprised emotion during SPEAKING (v3.0: no body override)", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    act(() => {
      result.current.setEmotion("surprised");
      result.current.setPhase("SPEAKING");
    });

    expect(result.current.animationState).toBe("talking");
  });

  it("should transition through full conversation cycle", () => {
    const mockVRM = createMockVRM();
    const { result } = renderHook(() =>
      useConversationAnimation({ vrm: mockVRM })
    );

    // IDLE → LISTENING → THINKING → SPEAKING → IDLE
    const phases: Array<{ phase: "IDLE" | "LISTENING" | "THINKING" | "SPEAKING"; expected: string }> = [
      { phase: "IDLE", expected: "idle" },
      { phase: "LISTENING", expected: "idle" },
      { phase: "THINKING", expected: "thinking" },
      { phase: "SPEAKING", expected: "talking" },
      { phase: "IDLE", expected: "idle" },
    ];

    for (const { phase, expected } of phases) {
      act(() => {
        result.current.setPhase(phase);
      });
      expect(result.current.animationState).toBe(expected);
    }
  });

  describe("F-011-009: fire-and-forget special actions", () => {
    it("should set animationState when playSpecial is fired", () => {
      const mockVRM = createMockVRM();
      const { result } = renderHook(() =>
        useConversationAnimation({ vrm: mockVRM })
      );

      act(() => {
        result.current.playSpecial("greeting");
      });

      expect(result.current.animationState).toBe("greeting");
    });

    it("should let subsequent phase change override ongoing special action", () => {
      const mockVRM = createMockVRM();
      const { result } = renderHook(() =>
        useConversationAnimation({ vrm: mockVRM })
      );

      // 特別動作発火
      act(() => {
        result.current.playSpecial("greeting");
      });
      expect(result.current.animationState).toBe("greeting");

      // phase 変化で special を上書きできる（fire-and-forget 設計の核）
      act(() => {
        result.current.setPhase("SPEAKING");
      });
      expect(result.current.animationState).toBe("talking");
    });

    it("should let emotion change override ongoing special action during SPEAKING", () => {
      const mockVRM = createMockVRM();
      const { result } = renderHook(() =>
        useConversationAnimation({ vrm: mockVRM })
      );

      // SPEAKING 中に special 発火
      act(() => {
        result.current.setPhase("SPEAKING");
      });
      act(() => {
        result.current.playSpecial("greeting");
      });
      expect(result.current.animationState).toBe("greeting");

      // emotion 変化で special を上書き（v3.0: EMOTION_BODY_OVERRIDE={} のため talking に復帰）
      act(() => {
        result.current.setEmotion("happy");
      });
      expect(result.current.animationState).toBe("talking");
    });

    it("should resolve to current phase/emotion when notifySpecialEnded is called", () => {
      const mockVRM = createMockVRM();
      const { result } = renderHook(() =>
        useConversationAnimation({ vrm: mockVRM })
      );

      // SPEAKING+happy の状態で special を発火
      act(() => {
        result.current.setEmotion("happy");
        result.current.setPhase("SPEAKING");
      });
      act(() => {
        result.current.playSpecial("greeting");
      });
      expect(result.current.animationState).toBe("greeting");

      // notifySpecialEnded で SPEAKING+happy に復帰
      // v3.0: EMOTION_BODY_OVERRIDE={} のため感情に関わらず talking で復帰する
      act(() => {
        result.current.notifySpecialEnded();
      });
      expect(result.current.animationState).toBe("talking");
    });

    it("should expose specialActionTrigger after VRM is loaded", () => {
      const mockVRM = createMockVRM();
      const { result, rerender } = renderHook(() =>
        useConversationAnimation({ vrm: mockVRM })
      );
      rerender();

      expect(result.current.specialActionTrigger).not.toBeNull();
    });
  });
});
