/**
 * F-002: リップシンク機能 - Viseme マッピングテスト
 */

import {
  VISEME_TO_BLENDSHAPE,
  SUPPORTED_VISEMES,
  BLENDSHAPE_NAMES,
  lerp,
  clamp,
} from "../viseme-mapping";

describe("viseme-mapping", () => {
  describe("VISEME_TO_BLENDSHAPE", () => {
    it("should have correct mapping for vowels", () => {
      expect(VISEME_TO_BLENDSHAPE.sil).toBe("neutral");
      expect(VISEME_TO_BLENDSHAPE.aa).toBe("aa");
      expect(VISEME_TO_BLENDSHAPE.ih).toBe("ih");
      expect(VISEME_TO_BLENDSHAPE.ou).toBe("ou");
      expect(VISEME_TO_BLENDSHAPE.ee).toBe("ee");
      expect(VISEME_TO_BLENDSHAPE.oh).toBe("oh");
    });

    it("should have correct mapping for consonants", () => {
      expect(VISEME_TO_BLENDSHAPE.PP).toBe("neutral");
      expect(VISEME_TO_BLENDSHAPE.FF).toBe("ih");
      expect(VISEME_TO_BLENDSHAPE.TH).toBe("ee");
      expect(VISEME_TO_BLENDSHAPE.DD).toBe("ee");
      expect(VISEME_TO_BLENDSHAPE.kk).toBe("oh");
      expect(VISEME_TO_BLENDSHAPE.CH).toBe("ih");
      expect(VISEME_TO_BLENDSHAPE.SS).toBe("ih");
      expect(VISEME_TO_BLENDSHAPE.nn).toBe("neutral");
      expect(VISEME_TO_BLENDSHAPE.RR).toBe("oh");
      expect(VISEME_TO_BLENDSHAPE.EE).toBe("ee");
      expect(VISEME_TO_BLENDSHAPE.ER).toBe("oh");
      expect(VISEME_TO_BLENDSHAPE.W).toBe("ou");
    });

    it("should map sil to neutral", () => {
      expect(VISEME_TO_BLENDSHAPE.sil).toBe("neutral");
    });

    it("should map aa to aa", () => {
      expect(VISEME_TO_BLENDSHAPE.aa).toBe("aa");
    });
  });

  describe("SUPPORTED_VISEMES", () => {
    it("should contain all vowel viseme keys", () => {
      expect(SUPPORTED_VISEMES).toContain("sil");
      expect(SUPPORTED_VISEMES).toContain("aa");
      expect(SUPPORTED_VISEMES).toContain("ih");
      expect(SUPPORTED_VISEMES).toContain("ou");
      expect(SUPPORTED_VISEMES).toContain("ee");
      expect(SUPPORTED_VISEMES).toContain("oh");
    });

    it("should contain all consonant viseme keys", () => {
      expect(SUPPORTED_VISEMES).toContain("PP");
      expect(SUPPORTED_VISEMES).toContain("FF");
      expect(SUPPORTED_VISEMES).toContain("TH");
      expect(SUPPORTED_VISEMES).toContain("DD");
      expect(SUPPORTED_VISEMES).toContain("kk");
      expect(SUPPORTED_VISEMES).toContain("CH");
      expect(SUPPORTED_VISEMES).toContain("SS");
      expect(SUPPORTED_VISEMES).toContain("nn");
      expect(SUPPORTED_VISEMES).toContain("RR");
      expect(SUPPORTED_VISEMES).toContain("EE");
      expect(SUPPORTED_VISEMES).toContain("ER");
      expect(SUPPORTED_VISEMES).toContain("W");
    });

    it("should have 18 visemes (6 vowels + 12 consonants)", () => {
      expect(SUPPORTED_VISEMES).toHaveLength(18);
    });
  });

  describe("BLENDSHAPE_NAMES", () => {
    it("should contain all unique blend shape names", () => {
      expect(BLENDSHAPE_NAMES).toContain("neutral");
      expect(BLENDSHAPE_NAMES).toContain("aa");
      expect(BLENDSHAPE_NAMES).toContain("ih");
      expect(BLENDSHAPE_NAMES).toContain("ou");
      expect(BLENDSHAPE_NAMES).toContain("ee");
      expect(BLENDSHAPE_NAMES).toContain("oh");
    });

    it("should have 6 unique blend shapes (duplicates removed)", () => {
      expect(BLENDSHAPE_NAMES).toHaveLength(6);
    });

    it("should not contain duplicates", () => {
      const uniqueNames = [...new Set(BLENDSHAPE_NAMES)];
      expect(BLENDSHAPE_NAMES).toHaveLength(uniqueNames.length);
    });
  });

  describe("lerp", () => {
    it("should interpolate correctly at t=0", () => {
      expect(lerp(0, 100, 0)).toBe(0);
    });

    it("should interpolate correctly at t=1", () => {
      expect(lerp(0, 100, 1)).toBe(100);
    });

    it("should interpolate correctly at t=0.5", () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it("should interpolate correctly at t=0.3", () => {
      expect(lerp(0, 100, 0.3)).toBe(30);
    });

    it("should handle negative values", () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });

    it("should handle decimal values", () => {
      expect(lerp(0, 1, 0.25)).toBe(0.25);
    });

    it("should handle inverse range", () => {
      expect(lerp(100, 0, 0.5)).toBe(50);
    });
  });

  describe("clamp", () => {
    it("should clamp value below min", () => {
      expect(clamp(-10, 0, 100)).toBe(0);
    });

    it("should clamp value above max", () => {
      expect(clamp(150, 0, 100)).toBe(100);
    });

    it("should not clamp value within range", () => {
      expect(clamp(50, 0, 100)).toBe(50);
    });

    it("should handle edge case at min", () => {
      expect(clamp(0, 0, 100)).toBe(0);
    });

    it("should handle edge case at max", () => {
      expect(clamp(100, 0, 100)).toBe(100);
    });

    it("should handle 0-1 range", () => {
      expect(clamp(1.5, 0, 1)).toBe(1);
      expect(clamp(-0.5, 0, 1)).toBe(0);
      expect(clamp(0.5, 0, 1)).toBe(0.5);
    });
  });
});
