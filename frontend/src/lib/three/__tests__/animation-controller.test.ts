/**
 * AnimationController のユニットテスト
 * F-003: アニメーション機能
 *
 * VRM/GLB両モデル対応: sceneベースでテスト
 */

import { AnimationController } from "../animation-controller";
import type { AnimationConfig } from "@/types";
import * as THREE from "three";

// モックシーンとアニメーションクリップを作成
const createMockScene = (): THREE.Scene => {
  const scene = new THREE.Scene();

  // モックアニメーションクリップ
  const idleClip = new THREE.AnimationClip("idle", 1, []);
  const talkingClip = new THREE.AnimationClip("talking", 1, []);
  const happyClip = new THREE.AnimationClip("happy", 1, []);

  scene.animations = [idleClip, talkingClip, happyClip];

  return scene;
};

const mockAnimationConfig: AnimationConfig = {
  idle: "idle",
  talking: "talking",
  happy: "happy",
  sad: "sad", // クリップが存在しない
};

describe("AnimationController", () => {
  let controller: AnimationController;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    controller = new AnimationController({
      defaultState: "idle",
      blendDuration: 0.3,
      loopStates: ["idle", "talking"],
    });
    mockScene = createMockScene();
  });

  describe("初期化", () => {
    it("シーンとアニメーション設定で初期化できる", () => {
      expect(() => {
        controller.initialize(mockScene, mockAnimationConfig);
      }).not.toThrow();
    });

    it("初期状態がidleである", () => {
      controller.initialize(mockScene, mockAnimationConfig);
      expect(controller.getCurrentState()).toBe("idle");
    });

    it("利用可能な状態を取得できる", () => {
      controller.initialize(mockScene, mockAnimationConfig);
      const states = controller.getAvailableStates();

      // idle, talking, happyが利用可能（sadはクリップがないため除外）
      expect(states).toContain("idle");
      expect(states).toContain("talking");
      expect(states).toContain("happy");
    });
  });

  describe("状態変更", () => {
    beforeEach(() => {
      controller.initialize(mockScene, mockAnimationConfig);
    });

    it("状態を変更できる", () => {
      controller.setState("talking");
      expect(controller.getCurrentState()).toBe("talking");
    });

    it("同じ状態に変更しても何も起こらない", () => {
      const initialState = controller.getCurrentState();
      controller.setState("idle");
      expect(controller.getCurrentState()).toBe(initialState);
    });

    it("存在しないクリップの状態に変更しても警告のみ", () => {
      const consoleSpy = jest.spyOn(console, "warn");
      controller.setState("sad"); // クリップが存在しない
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("アニメーション更新", () => {
    beforeEach(() => {
      controller.initialize(mockScene, mockAnimationConfig);
    });

    it("updateメソッドを呼び出せる", () => {
      expect(() => {
        controller.update(0.016); // 16ms (60fps)
      }).not.toThrow();
    });
  });

  describe("リソース破棄", () => {
    beforeEach(() => {
      controller.initialize(mockScene, mockAnimationConfig);
    });

    it("disposeメソッドでリソースを破棄できる", () => {
      expect(() => {
        controller.dispose();
      }).not.toThrow();
    });

    it("dispose後は状態が取得できない", () => {
      controller.dispose();
      const states = controller.getAvailableStates();
      expect(states).toHaveLength(0);
    });
  });
});
