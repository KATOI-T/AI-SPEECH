/**
 * AnimationController - アニメーション制御クラス
 * F-003: アニメーション機能
 *
 * VRM/GLB両モデル対応: VRMインスタンスではなくTHREE.Object3D (scene) を使用
 */

import * as THREE from "three";
import type { AnimationState, AnimationConfig } from "@/types";

export interface AnimationControllerOptions {
  /** デフォルトアニメーション状態 */
  defaultState?: AnimationState;
  /** クロスフェード時間（秒） */
  blendDuration?: number;
  /** ループする状態のリスト */
  loopStates?: AnimationState[];
  /** F-011-009: one-shot アニメーション終了時のコールバック（idle に自動復帰する直前に発火） */
  onOneShotFinished?: (finishedState: AnimationState) => void;
}

/**
 * VRM/GLBモデルのアニメーションを制御するクラス
 */
export class AnimationController {
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Map<AnimationState, THREE.AnimationAction> = new Map();
  private currentState: AnimationState;
  private blendDuration: number;
  private loopStates: Set<AnimationState>;
  private scene: THREE.Object3D | null = null;
  private animationConfig: AnimationConfig | null = null;
  private pendingFinishedListener: (() => void) | null = null;
  private onOneShotFinished: ((finishedState: AnimationState) => void) | undefined;

  constructor(options: AnimationControllerOptions = {}) {
    this.currentState = options.defaultState || "idle";
    this.blendDuration = options.blendDuration ?? 0.3;
    const defaultLoopStates: AnimationState[] = ["idle", "greeting"];
    this.loopStates = new Set<AnimationState>(
      options.loopStates || defaultLoopStates
    );
    this.onOneShotFinished = options.onOneShotFinished;
  }

  /** 外部から渡されたアニメーションクリップ */
  private externalAnimations: THREE.AnimationClip[] = [];

  /**
   * モデルとアニメーション設定で初期化
   * @param scene THREE.Object3D（VRM.sceneまたはgltf.scene）
   * @param animationConfig アニメーション設定
   * @param animations GLTFから取得したアニメーションクリップ（オプション）
   */
  initialize(scene: THREE.Object3D, animationConfig: AnimationConfig, animations?: THREE.AnimationClip[]): void {
    this.scene = scene;
    this.animationConfig = animationConfig;
    this.externalAnimations = animations || [];
    this.mixer = new THREE.AnimationMixer(scene);

    // アニメーションクリップを読み込んでActionを作成
    this.loadAnimationClips();

    // 初期状態のアニメーションを再生
    this.playState(this.currentState, true);
  }

  /**
   * アニメーションクリップを読み込み
   */
  private loadAnimationClips(): void {
    if (!this.scene || !this.animationConfig || !this.mixer) {
      console.warn("[AnimationController] Scene or config not initialized");
      return;
    }

    // アニメーションクリップを取得（外部から渡されたものを優先、なければsceneから取得）
    const animations = this.externalAnimations.length > 0
      ? this.externalAnimations
      : (this.scene.animations || []);
    console.log("[AnimationController] Available animations:", animations.length, "clips");

    // animationConfigの全エントリに対してアクションを作成
    const configEntries = Object.entries(this.animationConfig) as [AnimationState, string][];

    for (const [state, clipName] of configEntries) {
      if (!clipName) continue;

      // クリップ名はstate名で設定されている（VRMViewerでclip.name = stateNameとしている）
      // configの値（ファイルパス）ではなく、state名で検索する
      const clip = animations.find((a) => a.name === state);
      if (clip) {
        const action = this.mixer.clipAction(clip);

        // ループ設定
        if (this.loopStates.has(state)) {
          action.setLoop(THREE.LoopRepeat, Infinity);
        } else {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }

        this.actions.set(state, action);
      } else {
        console.warn(`[AnimationController] Animation clip not found: ${clipName} for state ${state}`);
      }
    }

    console.log(`[AnimationController] Loaded ${this.actions.size} actions`);

    // デフォルトアニメーションがない場合は警告
    if (!this.actions.has("idle")) {
      console.warn("[AnimationController] No idle animation found, using fallback");
    }
  }

  /**
   * 状態を変更（クロスフェード付き）
   */
  setState(newState: AnimationState): void {
    if (newState === this.currentState) {
      return;
    }

    const newAction = this.actions.get(newState);
    if (!newAction) {
      console.warn(`[AnimationController] No action for state: ${newState}`);
      return;
    }

    // 新しいアクション以外を全てフェードアウト（連続切替時の干渉を防止）
    for (const [state, action] of this.actions) {
      if (state !== newState && action.getEffectiveWeight() > 0) {
        action.fadeOut(this.blendDuration);
      }
    }

    // 新しいアクションをフェードイン
    newAction.reset();
    newAction.setEffectiveWeight(1);
    newAction.fadeIn(this.blendDuration);
    newAction.play();

    console.log(`[AnimationController] Transition: ${this.currentState} -> ${newState}`);
    this.currentState = newState;

    // 前のfinishedリスナーをクリア（蓄積防止）
    if (this.pendingFinishedListener && this.mixer) {
      this.mixer.removeEventListener("finished", this.pendingFinishedListener);
      this.pendingFinishedListener = null;
    }

    // ループしない状態の場合、終了時にidleに戻る
    if (!this.loopStates.has(newState)) {
      this.setupAutoReturnToIdle(newAction);
    }
  }

  /**
   * 指定した状態のアニメーションを再生
   */
  private playState(state: AnimationState, reset: boolean = false): void {
    const action = this.actions.get(state);
    if (action) {
      if (reset) {
        action.reset();
      }
      action.play();
      console.log(`[AnimationController] Playing state: ${state}`);
    } else {
      console.warn(`[AnimationController] No action for state: ${state}`);
    }
  }

  /**
   * ループしないアニメーション終了時にidleに戻る設定
   */
  private setupAutoReturnToIdle(_action: THREE.AnimationAction): void {
    if (!this.mixer) return;

    const finishedState = this.currentState;
    const onFinished = () => {
      if (this.currentState !== "idle") {
        console.log("[AnimationController] Animation finished, returning to idle");
        this.setState("idle");
      }
      // F-011-009: one-shot 終了を親に通知（idle 復帰直後）
      this.onOneShotFinished?.(finishedState);
      this.pendingFinishedListener = null;
    };

    this.pendingFinishedListener = onFinished;
    this.mixer.addEventListener("finished", onFinished);
  }

  /**
   * 現在の状態を取得
   */
  getCurrentState(): AnimationState {
    return this.currentState;
  }

  /**
   * 利用可能な状態一覧を取得
   */
  getAvailableStates(): AnimationState[] {
    return Array.from(this.actions.keys());
  }

  /**
   * アニメーションを更新（毎フレーム呼び出す）
   */
  update(deltaTime: number): void {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  /**
   * リソースを破棄
   */
  dispose(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
    }
    this.actions.clear();
    this.mixer = null;
    this.scene = null;
    this.animationConfig = null;
  }
}
