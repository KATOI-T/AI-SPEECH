import {
  resolveAnimationPaths,
  DEFAULT_VRMA_PATHS,
  ANIMATION_LABELS,
  EMOTION_BODY_OVERRIDE,
  ENABLE_SPECIAL_ACTIONS,
} from "../animation-constants";

describe("animation-constants", () => {
  describe("ANIMATION_LABELS", () => {
    it("should have labels for all standard states", () => {
      expect(ANIMATION_LABELS.idle).toBe("待機");
      expect(ANIMATION_LABELS.happy).toBe("喜び");
      expect(ANIMATION_LABELS.thinking).toBe("考え中");
    });
  });

  describe("EMOTION_BODY_OVERRIDE (F-011-011)", () => {
    it("should be empty — v3.0 unifies SPEAKING body to talking regardless of emotion", () => {
      expect(Object.keys(EMOTION_BODY_OVERRIDE)).toHaveLength(0);
    });
  });

  describe("ENABLE_SPECIAL_ACTIONS (F-011-012)", () => {
    it("should be false — v3.0 gates session greeting and long-idle triggers", () => {
      expect(ENABLE_SPECIAL_ACTIONS).toBe(false);
    });
  });

  describe("DEFAULT_VRMA_PATHS", () => {
    it("should map states to VRMA file paths", () => {
      expect(DEFAULT_VRMA_PATHS.idle).toMatch(/\.vrma$/);
      expect(DEFAULT_VRMA_PATHS.happy).toMatch(/\.vrma$/);
    });
  });

  describe("resolveAnimationPaths", () => {
    it("should return empty object for null config", () => {
      expect(resolveAnimationPaths(null)).toEqual({});
    });

    it("should return empty object for undefined config", () => {
      expect(resolveAnimationPaths(undefined)).toEqual({});
    });

    it("should convert clip names to DEFAULT_VRMA_PATHS", () => {
      const config = { idle: "idle_01", happy: "happy_wave" };
      const result = resolveAnimationPaths(config);
      expect(result.idle).toBe(DEFAULT_VRMA_PATHS.idle);
      expect(result.happy).toBe(DEFAULT_VRMA_PATHS.happy);
    });

    it("should pass through values starting with /", () => {
      const config = { idle: "/custom/path/idle.vrma" };
      const result = resolveAnimationPaths(config);
      expect(result.idle).toBe("/custom/path/idle.vrma");
    });

    it("should filter out empty string values", () => {
      const config = { idle: "idle_01", happy: "" };
      const result = resolveAnimationPaths(config);
      expect(result.idle).toBe(DEFAULT_VRMA_PATHS.idle);
      expect(result.happy).toBeUndefined();
    });

    it("should handle mixed clip names and file paths", () => {
      const config = {
        idle: "idle_01",
        happy: "/custom/happy.vrma",
        sad: "sad_clip",
        angry: "",
      };
      const result = resolveAnimationPaths(config);
      expect(result.idle).toBe(DEFAULT_VRMA_PATHS.idle);
      expect(result.happy).toBe("/custom/happy.vrma");
      expect(result.sad).toBe(DEFAULT_VRMA_PATHS.sad);
      expect(result.angry).toBeUndefined();
    });

    it("should return empty object for empty config", () => {
      const result = resolveAnimationPaths({});
      expect(result).toEqual({});
    });

    it("should not include unknown states without DEFAULT_VRMA_PATHS entry", () => {
      // Simulates a state key that doesn't exist in DEFAULT_VRMA_PATHS
      const config = { unknownState: "some_clip" } as Record<string, string>;
      const result = resolveAnimationPaths(config);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should handle all known animation states", () => {
      const allStates = {
        idle: "clip1",
        greeting: "clip2",
        happy: "clip3",
        present: "clip4",
        shoot: "clip5",
        spin: "clip6",
        exercise: "clip7",
        talking: "clip8",
        sad: "clip9",
        surprised: "clip10",
        angry: "clip11",
        thinking: "clip12",
      };
      const result = resolveAnimationPaths(allStates);
      expect(Object.keys(result)).toHaveLength(12);
      for (const key of Object.keys(result)) {
        expect(result[key as keyof typeof result]).toMatch(/^\/models\/motion\/VRMA_\d+\.vrma$/);
      }
    });
  });
});
