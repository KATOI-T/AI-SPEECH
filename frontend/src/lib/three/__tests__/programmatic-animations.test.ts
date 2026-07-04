/**
 * F-011: プロシージャルアニメーション テスト
 */

import * as THREE from "three";
import { generateProceduralClips, PROCEDURAL_OVERRIDE_STATES } from "../programmatic-animations";

// VRM モック — humanoid.getNormalizedBoneNode() を提供
const BONE_NAMES = [
  "hips", "spine", "chest", "neck", "head",
  "leftUpperArm", "leftLowerArm", "rightUpperArm", "rightLowerArm",
  "leftUpperLeg", "rightUpperLeg",
];

const createMockVRM = () => {
  const nodes: Record<string, THREE.Object3D> = {};
  for (const name of BONE_NAMES) {
    const obj = new THREE.Object3D();
    obj.name = `bone_${name}`;
    nodes[name] = obj;
  }

  return {
    humanoid: {
      getNormalizedBoneNode: jest.fn((boneName: string) => nodes[boneName] ?? null),
    },
  } as any;
};

describe("generateProceduralClips", () => {
  let mockVRM: any;
  let clips: THREE.AnimationClip[];

  beforeEach(() => {
    mockVRM = createMockVRM();
    clips = generateProceduralClips(mockVRM);
  });

  it("should generate clips for all 12 animation states", () => {
    const expectedStates = [
      "idle", "greeting", "happy", "talking", "sad", "surprised",
      "angry", "thinking", "present", "shoot", "spin", "exercise",
    ];
    const clipNames = clips.map((c) => c.name);
    for (const state of expectedStates) {
      expect(clipNames).toContain(state);
    }
  });

  it("should return AnimationClip instances", () => {
    for (const clip of clips) {
      expect(clip).toBeInstanceOf(THREE.AnimationClip);
    }
  });

  describe("greeting clip (F-011-001: 合掌ポーズ)", () => {
    let greetingClip: THREE.AnimationClip;

    beforeEach(() => {
      greetingClip = clips.find((c) => c.name === "greeting")!;
    });

    it("should exist", () => {
      expect(greetingClip).toBeDefined();
    });

    it("should have duration of 3.5 seconds", () => {
      expect(greetingClip.duration).toBe(3.5);
    });

    it("should include torso bones (spine, chest, head)", () => {
      const trackNames = greetingClip.tracks.map((t) => t.name);
      expect(trackNames).toContainEqual(expect.stringContaining("bone_spine"));
      expect(trackNames).toContainEqual(expect.stringContaining("bone_chest"));
      expect(trackNames).toContainEqual(expect.stringContaining("bone_head"));
    });

    it("should have 3 bone tracks total", () => {
      expect(greetingClip.tracks.length).toBe(3);
    });

    it("should use quaternion keyframe tracks", () => {
      for (const track of greetingClip.tracks) {
        expect(track).toBeInstanceOf(THREE.QuaternionKeyframeTrack);
      }
    });
  });

  describe("idle clip (F-011-004: chest 追加 + F-011-006: hips 横揺れ)", () => {
    let idleClip: THREE.AnimationClip;

    beforeEach(() => {
      idleClip = clips.find((c) => c.name === "idle")!;
    });

    it("should exist", () => {
      expect(idleClip).toBeDefined();
    });

    it("should have duration of 8 seconds (v3.0.2: slower body motion)", () => {
      expect(idleClip.duration).toBe(8);
    });

    it("should include chest bone for breathing", () => {
      const trackNames = idleClip.tracks.map((t) => t.name);
      expect(trackNames).toContainEqual(expect.stringContaining("bone_chest"));
    });

    // F-011-017 (v3.0.4): hips track は削除。体幹の横揺れは spine/chest で表現
    it("should NOT include hips track (v3.0.4: lower body stationary)", () => {
      const trackNames = idleClip.tracks.map((t) => t.name);
      expect(trackNames).not.toContainEqual(expect.stringContaining("bone_hips"));
    });

    it("should include upper arm bones for A-pose rest (arms lowered)", () => {
      const trackNames = idleClip.tracks.map((t) => t.name);
      expect(trackNames).toContainEqual(expect.stringContaining("bone_leftUpperArm"));
      expect(trackNames).toContainEqual(expect.stringContaining("bone_rightUpperArm"));
    });

    it("should have 5 bone tracks (spine, chest, head, leftUpperArm, rightUpperArm)", () => {
      expect(idleClip.tracks.length).toBe(5);
    });

    it("should produce valid unit quaternions for spine sway (F-011-017)", () => {
      const spineTrack = idleClip.tracks.find((t) => t.name.includes("bone_spine"));
      expect(spineTrack).toBeDefined();
      const values = spineTrack!.values;
      for (let i = 0; i < values.length; i += 4) {
        const magnitude = Math.sqrt(
          values[i] ** 2 + values[i + 1] ** 2 + values[i + 2] ** 2 + values[i + 3] ** 2
        );
        expect(magnitude).toBeCloseTo(1.0, 4);
      }
    });
  });

  describe("talking clip (F-011-010 / F-011-013: ARM_REST baseline + hips sway)", () => {
    let talkingClip: THREE.AnimationClip;

    beforeEach(() => {
      talkingClip = clips.find((c) => c.name === "talking")!;
    });

    it("should exist with 4s duration (v3.0.2: slower body motion)", () => {
      expect(talkingClip).toBeDefined();
      expect(talkingClip.duration).toBe(4);
    });

    // F-011-017 (v3.0.4): hips track は削除（下半身静止）。横揺れは spine/chest で表現
    it("should NOT include hips track (v3.0.4: lower body stationary)", () => {
      const trackNames = talkingClip.tracks.map((t) => t.name);
      expect(trackNames).not.toContainEqual(expect.stringContaining("bone_hips"));
    });

    it("should include leftUpperArm rest track to keep left hand down", () => {
      const trackNames = talkingClip.tracks.map((t) => t.name);
      expect(trackNames).toContainEqual(expect.stringContaining("bone_leftUpperArm"));
    });

    it("should include rightUpperArm track starting and ending at ARM_REST_RIGHT_Z", () => {
      const rightArmTrack = talkingClip.tracks.find((t) =>
        t.name.includes("bone_rightUpperArm")
      );
      expect(rightArmTrack).toBeDefined();
      // QuaternionKeyframeTrack の values は [x,y,z,w, x,y,z,w, ...] の順
      // 最初のキー [0,0,-72°] と最後のキー [0,0,-72°] が一致することを quaternion 同士で比較
      const values = rightArmTrack!.values;
      const firstQuat = [values[0], values[1], values[2], values[3]];
      const lastIdx = values.length - 4;
      const lastQuat = [values[lastIdx], values[lastIdx + 1], values[lastIdx + 2], values[lastIdx + 3]];
      for (let i = 0; i < 4; i++) {
        expect(lastQuat[i]).toBeCloseTo(firstQuat[i], 4);
      }
    });

    // F-011-014 (v3.0.1): 会話中の右腕スイングは削除され、全キーフレームで rest に固定されている
    it("should keep rightUpperArm at rest across all keyframes (no swing during talking)", () => {
      const rightArmTrack = talkingClip.tracks.find((t) =>
        t.name.includes("bone_rightUpperArm")
      );
      expect(rightArmTrack).toBeDefined();
      const values = rightArmTrack!.values;
      // すべてのキーフレームで quaternion が同一であれば腕は完全に静止
      const baseQuat = [values[0], values[1], values[2], values[3]];
      for (let i = 0; i < values.length; i += 4) {
        for (let j = 0; j < 4; j++) {
          expect(values[i + j]).toBeCloseTo(baseQuat[j], 4);
        }
      }
    });

    // F-011-016 (v3.0.3): body sway — spine/chest にも Z 軸横揺れ成分を追加
    it("should include spine track for torso sway (F-011-016)", () => {
      const trackNames = talkingClip.tracks.map((t) => t.name);
      expect(trackNames).toContainEqual(expect.stringContaining("bone_spine"));
    });

    it("should include chest track for torso sway (F-011-016)", () => {
      const trackNames = talkingClip.tracks.map((t) => t.name);
      expect(trackNames).toContainEqual(expect.stringContaining("bone_chest"));
    });
  });

  describe("thinking clip (F-011-010 / F-011-013: ARM_REST baseline + hips sway)", () => {
    let thinkingClip: THREE.AnimationClip;

    beforeEach(() => {
      thinkingClip = clips.find((c) => c.name === "thinking")!;
    });

    it("should exist with 6s duration (v3.0.2: slower body motion)", () => {
      expect(thinkingClip).toBeDefined();
      expect(thinkingClip.duration).toBe(6);
    });

    // F-011-017 (v3.0.4): hips track は削除（下半身静止）。横揺れは spine/chest で表現
    it("should NOT include hips track (v3.0.4: lower body stationary)", () => {
      const trackNames = thinkingClip.tracks.map((t) => t.name);
      expect(trackNames).not.toContainEqual(expect.stringContaining("bone_hips"));
    });

    it("should include leftUpperArm rest track (left hand stays down)", () => {
      const trackNames = thinkingClip.tracks.map((t) => t.name);
      expect(trackNames).toContainEqual(expect.stringContaining("bone_leftUpperArm"));
    });

    it("should have rightUpperArm start and end at ARM_REST_RIGHT_Z (hand returns down)", () => {
      const rightArmTrack = thinkingClip.tracks.find((t) =>
        t.name.includes("bone_rightUpperArm")
      );
      expect(rightArmTrack).toBeDefined();
      const values = rightArmTrack!.values;
      const firstQuat = [values[0], values[1], values[2], values[3]];
      const lastIdx = values.length - 4;
      const lastQuat = [values[lastIdx], values[lastIdx + 1], values[lastIdx + 2], values[lastIdx + 3]];
      for (let i = 0; i < 4; i++) {
        expect(lastQuat[i]).toBeCloseTo(firstQuat[i], 4);
      }
    });

    // F-011-016 (v3.0.3): body sway — spine/chest にも Z 軸横揺れ成分を追加
    it("should include spine track for torso sway (F-011-016)", () => {
      const trackNames = thinkingClip.tracks.map((t) => t.name);
      expect(trackNames).toContainEqual(expect.stringContaining("bone_spine"));
    });

    it("should include chest track for torso sway (F-011-016)", () => {
      const trackNames = thinkingClip.tracks.map((t) => t.name);
      expect(trackNames).toContainEqual(expect.stringContaining("bone_chest"));
    });
  });

  describe("PROCEDURAL_OVERRIDE_STATES (F-011-006)", () => {
    it("should include idle to enforce hips sway override", () => {
      expect(PROCEDURAL_OVERRIDE_STATES.has("idle")).toBe(true);
    });

    it("should include conversation body states (talking, thinking, emotions)", () => {
      expect(PROCEDURAL_OVERRIDE_STATES.has("talking")).toBe(true);
      expect(PROCEDURAL_OVERRIDE_STATES.has("thinking")).toBe(true);
      expect(PROCEDURAL_OVERRIDE_STATES.has("happy")).toBe(true);
      expect(PROCEDURAL_OVERRIDE_STATES.has("sad")).toBe(true);
      expect(PROCEDURAL_OVERRIDE_STATES.has("surprised")).toBe(true);
      expect(PROCEDURAL_OVERRIDE_STATES.has("angry")).toBe(true);
    });

    it("should NOT include special-action states (greeting/present/spin/exercise/shoot)", () => {
      // これらは VRMA を優先（より表現力の高いモーションを使う）
      expect(PROCEDURAL_OVERRIDE_STATES.has("greeting")).toBe(false);
      expect(PROCEDURAL_OVERRIDE_STATES.has("present")).toBe(false);
      expect(PROCEDURAL_OVERRIDE_STATES.has("spin")).toBe(false);
      expect(PROCEDURAL_OVERRIDE_STATES.has("exercise")).toBe(false);
      expect(PROCEDURAL_OVERRIDE_STATES.has("shoot")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should skip bones that do not exist in VRM", () => {
      const limitedVRM = {
        humanoid: {
          getNormalizedBoneNode: jest.fn((boneName: string) => {
            if (boneName === "spine") {
              const obj = new THREE.Object3D();
              obj.name = "bone_spine";
              return obj;
            }
            return null;
          }),
        },
      } as any;

      const limitedClips = generateProceduralClips(limitedVRM);
      // Should still generate clips, but with fewer tracks
      expect(limitedClips.length).toBeGreaterThan(0);

      // Clips with only spine should have 1 track
      const idleClip = limitedClips.find((c) => c.name === "idle");
      expect(idleClip).toBeDefined();
      expect(idleClip!.tracks.length).toBe(1);
    });

    it("should return empty array if no bones exist", () => {
      const emptyVRM = {
        humanoid: {
          getNormalizedBoneNode: jest.fn(() => null),
        },
      } as any;

      const emptyClips = generateProceduralClips(emptyVRM);
      expect(emptyClips).toEqual([]);
    });

    it("should produce valid quaternion values (unit quaternions)", () => {
      const greetingClip = clips.find((c) => c.name === "greeting")!;
      for (const track of greetingClip.tracks) {
        const values = track.values;
        // Every 4 values is a quaternion [x, y, z, w]
        for (let i = 0; i < values.length; i += 4) {
          const magnitude = Math.sqrt(
            values[i] ** 2 + values[i + 1] ** 2 + values[i + 2] ** 2 + values[i + 3] ** 2
          );
          expect(magnitude).toBeCloseTo(1.0, 4);
        }
      }
    });
  });
});
