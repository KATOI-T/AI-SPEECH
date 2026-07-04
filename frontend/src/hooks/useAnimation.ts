/**
 * useAnimation - アニメーション管理フック
 * F-003: アニメーション機能
 *
 * VRM/GLB両モデル対応: VRMインスタンスではなくTHREE.Object3D (scene) を使用
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Object3D, AnimationClip } from "three";
import { AnimationController } from "@/lib/three/animation-controller";
import type { AnimationState, AnimationConfig } from "@/types";

export interface UseAnimationOptions {
  /** アニメーション設定 */
  animationConfig?: AnimationConfig | null;
  /** アニメーションクリップ（GLTFから取得したもの） */
  animations?: AnimationClip[];
  /** デフォルトアニメーション状態 */
  defaultState?: AnimationState;
  /** クロスフェード時間（秒） */
  blendDuration?: number;
  /** ループする状態のリスト */
  loopStates?: AnimationState[];
  /** 状態変更時のコールバック */
  onStateChange?: (state: AnimationState) => void;
}

export interface UseAnimationReturn {
  /** 現在のアニメーション状態 */
  currentState: AnimationState;
  /** 状態を変更 */
  setState: (state: AnimationState) => void;
  /** 利用可能な状態一覧 */
  availableStates: AnimationState[];
  /** 初期化済みかどうか */
  isInitialized: boolean;
  /** AnimationControllerインスタンス（内部使用） */
  controller: AnimationController | null;
}

/**
 * アニメーション管理フック
 * @param scene THREE.Object3D（VRM.scene または gltf.scene）
 * @param options アニメーションオプション
 */
// デフォルトのloopStates（外部定義で参照安定化）
const DEFAULT_LOOP_STATES: AnimationState[] = ["idle", "greeting"];

export function useAnimation(
  scene: Object3D | null,
  options: UseAnimationOptions = {}
): UseAnimationReturn {
  const {
    animationConfig,
    animations,
    defaultState = "idle",
    blendDuration = 0.3,
    loopStates = DEFAULT_LOOP_STATES,
    onStateChange,
  } = options;

  const [currentState, setCurrentState] = useState<AnimationState>(defaultState);
  const [availableStates, setAvailableStates] = useState<AnimationState[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const controllerRef = useRef<AnimationController | null>(null);

  // animationConfigをJSON文字列化して依存配列を安定化
  const animationConfigKey = useMemo(
    () => (animationConfig ? JSON.stringify(animationConfig) : null),
    [animationConfig]
  );
  const animationConfigRef = useRef(animationConfig);
  useEffect(() => {
    animationConfigRef.current = animationConfig;
  }, [animationConfig]);

  // loopStatesを安定化
  const loopStatesKey = useMemo(
    () => JSON.stringify(loopStates),
    [loopStates]
  );
  const loopStatesRef = useRef(loopStates);
  useEffect(() => {
    loopStatesRef.current = loopStates;
  }, [loopStates]);

  // animationsを安定化（長さで変更を検出）
  const animationsLength = animations?.length ?? 0;
  const animationsRef = useRef(animations);
  useEffect(() => {
    animationsRef.current = animations;
  }, [animations]);

  // AnimationControllerの初期化
  useEffect(() => {
    const currentAnimConfig = animationConfigRef.current;
    const currentLoopStates = loopStatesRef.current;

    if (!scene || !currentAnimConfig) {
      setIsInitialized(false);
      return;
    }

    // コントローラーを作成
    const controller = new AnimationController({
      defaultState,
      blendDuration,
      loopStates: currentLoopStates,
    });

    try {
      controller.initialize(scene, currentAnimConfig, animationsRef.current);
      controllerRef.current = controller;
      setCurrentState(controller.getCurrentState());
      setAvailableStates(controller.getAvailableStates());
      setIsInitialized(true);
      console.log("[useAnimation] Controller initialized with scene");
    } catch (error) {
      console.error("[useAnimation] Initialization error:", error);
      setIsInitialized(false);
    }

    // クリーンアップ
    return () => {
      if (controllerRef.current) {
        controllerRef.current.dispose();
        controllerRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [scene, animationConfigKey, defaultState, blendDuration, loopStatesKey, animationsLength]);

  // onStateChangeをrefで保持（依存配列から除外）
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  // 状態変更
  const setState = useCallback(
    (newState: AnimationState) => {
      if (!controllerRef.current || !isInitialized) {
        console.warn("[useAnimation] Controller not initialized");
        return;
      }

      controllerRef.current.setState(newState);
      setCurrentState(newState);
      onStateChangeRef.current?.(newState);
    },
    [isInitialized]
  );

  return {
    currentState,
    setState,
    availableStates,
    isInitialized,
    controller: controllerRef.current,
  };
}
