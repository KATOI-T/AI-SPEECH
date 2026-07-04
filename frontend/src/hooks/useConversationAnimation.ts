/**
 * F-010 / F-013 / F-011-009: 会話アニメーション統合Hook
 *
 * 会話フェーズ×感情に基づくボディアニメーション + 表情制御を統合する
 * 唯一のステートソース。呼び出し側は必ず戻り値の `animationState` を
 * VRMViewer に渡し、ローカルで body state を保持してはならない（F-013）。
 *
 * controllerはuseRefで管理し、phase/emotion変更はコールバック内で即時反映する。
 * useStateだとVRMロード後にcontrollerが利用可能になるまで1〜2レンダーサイクルの
 * 遅延が生じ、その間のphase/emotion変更が無視されるため。
 *
 * F-011-009: `playSpecial(state)` で VRMA 特別動作を割り込み再生できる。
 * 特別動作は「fire-and-forget」で、後続の phase/emotion 変化が来たら
 * 即座に通常 body 状態へ復帰する（リップシンク・表情更新と競合しない）。
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VRM } from "@pixiv/three-vrm";
import type { AnimationState, ConversationPhase, EmotionType } from "@/types";
import { ExpressionController } from "@/lib/three/expression-controller";
import { AnimationExpressionLinker } from "@/lib/three/animation-expression-linker";
import { SpecialActionTrigger } from "@/lib/three/special-action-trigger";
import {
  PHASE_BODY_ANIMATION,
  EMOTION_BODY_OVERRIDE,
  ENABLE_SPECIAL_ACTIONS,
} from "@/lib/three/animation-constants";

/**
 * F-011-009: 特別動作の最大再生時間（ミリ秒）。
 * 経過後に phase/emotion 由来の body 状態へ自動復帰する。
 * VRMA クリップの最長が ~3.5s（greeting）のため同値に設定。
 */
const SPECIAL_AUTO_RETURN_MS = 3500;

interface UseConversationAnimationOptions {
  vrm: VRM | null;
  enabled?: boolean;
  /**
   * F-011-009: 長時間 IDLE 検知を有効化するか。
   * F-011-012 (v3.0): デフォルトを `ENABLE_SPECIAL_ACTIONS` に連動。
   * flag が false の間は long-idle 発火が無効化される。
   */
  enableLongIdleTrigger?: boolean;
}

interface UseConversationAnimationReturn {
  // 会話フェーズ制御
  phase: ConversationPhase;
  setPhase: (phase: ConversationPhase) => void;

  // 感情制御
  emotion: EmotionType;
  setEmotion: (emotion: EmotionType) => void;

  // ボディアニメーション（VRMViewerに渡す）
  animationState: AnimationState;

  // ExpressionController
  expressionController: ExpressionController | null;

  // F-011-009: 特別動作（VRMA one-shot）
  /**
   * 特別動作（VRMA one-shot）を発火する。fire-and-forget 方式で、
   * 後続の phase/emotion 変化が animationState を即座に上書きする。
   * 再生時間経過（~3.5s）で phase/emotion 由来の状態に自動復帰する。
   */
  playSpecial: (state: AnimationState) => void;
  /**
   * 特別動作終了通知（VRMViewer の finished イベント経由）。
   * 自動復帰タイマーをキャンセルして phase/emotion から即座に再計算する。
   */
  notifySpecialEnded: () => void;
  /** SpecialActionTrigger（sessionStart/sessionEnd/goalAchieved 発火用） */
  specialActionTrigger: SpecialActionTrigger | null;
}

/**
 * フェーズ×感情からボディアニメーション状態を解決
 */
function resolveBodyAnimation(
  phase: ConversationPhase,
  emotion: EmotionType
): AnimationState {
  const base = PHASE_BODY_ANIMATION[phase];

  // SPEAKING時のみ感情による上書きを適用
  if (phase === 'SPEAKING') {
    const override = EMOTION_BODY_OVERRIDE[emotion];
    if (override) return override;
  }

  return base;
}

/**
 * ExpressionControllerにphase/emotionを即時反映するヘルパー
 */
function applyToController(
  controller: ExpressionController | null,
  linker: AnimationExpressionLinker | null,
  phase: ConversationPhase,
  emotion: EmotionType,
): AnimationState {
  const newState = resolveBodyAnimation(phase, emotion);
  const isSpeaking = phase === 'SPEAKING';

  controller?.setEmotion(emotion, isSpeaking);
  controller?.setSpeaking(isSpeaking);
  linker?.onStateChange(newState);

  return newState;
}

export function useConversationAnimation({
  vrm,
  enabled = true,
  enableLongIdleTrigger = ENABLE_SPECIAL_ACTIONS,
}: UseConversationAnimationOptions): UseConversationAnimationReturn {
  // animationState のみ useState（VRMViewer への re-render トリガー用）
  const [animationState, setAnimationState] = useState<AnimationState>('idle');

  // phase/emotion/controller は ref で即時反映
  const phaseRef = useRef<ConversationPhase>('IDLE');
  const emotionRef = useRef<EmotionType>('neutral');
  const controllerRef = useRef<ExpressionController | null>(null);
  const linkerRef = useRef<AnimationExpressionLinker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // F-011-009: 特別動作トリガー（イベント駆動 VRMA 発火用）
  const specialTriggerRef = useRef<SpecialActionTrigger | null>(null);
  const enterSpecialRef = useRef<((state: AnimationState) => void) | null>(null);
  const releaseSpecialRef = useRef<(() => void) | null>(null);
  const specialAutoReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [specialTriggerState, setSpecialTriggerState] = useState<SpecialActionTrigger | null>(null);

  // re-render 用の state（phase/emotion を外部から読み取る場合向け）
  const [phaseState, setPhaseState] = useState<ConversationPhase>('IDLE');
  const [emotionState, setEmotionState] = useState<EmotionType>('neutral');

  // ExpressionController の生成/破棄
  useEffect(() => {
    if (!vrm || !enabled) {
      return;
    }

    const newController = new ExpressionController(vrm);
    const newLinker = new AnimationExpressionLinker(newController);
    controllerRef.current = newController;
    linkerRef.current = newLinker;

    // F-011-009: 特別動作の発火・解除（fire-and-forget）。
    // 後続の phase/emotion 変化は通常通り animationState を上書きするため、
    // ブロッキング不要。リップシンク・表情更新と一切競合しない。
    // 一定時間後に自動で phase/emotion 由来の状態へ戻す（無限ループ防止）。
    const releaseSpecial = () => {
      if (specialAutoReturnTimerRef.current) {
        clearTimeout(specialAutoReturnTimerRef.current);
        specialAutoReturnTimerRef.current = null;
      }
      specialTriggerRef.current?.setPlayingSpecial(false);
      const resolved = resolveBodyAnimation(phaseRef.current, emotionRef.current);
      setAnimationState(resolved);
    };
    const enterSpecial = (state: AnimationState) => {
      specialTriggerRef.current?.setPlayingSpecial(true);
      setAnimationState(state);

      if (specialAutoReturnTimerRef.current) {
        clearTimeout(specialAutoReturnTimerRef.current);
      }
      specialAutoReturnTimerRef.current = setTimeout(releaseSpecial, SPECIAL_AUTO_RETURN_MS);
    };
    enterSpecialRef.current = enterSpecial;
    releaseSpecialRef.current = releaseSpecial;

    // F-011-009: SpecialActionTrigger を生成（onTrigger は enterSpecial に委譲）
    const trigger = new SpecialActionTrigger({
      onTrigger: enterSpecial,
    });
    specialTriggerRef.current = trigger;
    setSpecialTriggerState(trigger);

    // controller 生成時に現在の phase/emotion を即時反映
    const newState = applyToController(
      newController, newLinker,
      phaseRef.current, emotionRef.current,
    );
    setAnimationState(newState);

    // rAFループ開始
    lastTimeRef.current = performance.now();
    const animate = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      newController.update(delta);
      newLinker.update(delta);
      // F-011-009: 長時間 IDLE 検知
      if (enableLongIdleTrigger) {
        trigger.update(delta);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (specialAutoReturnTimerRef.current) {
        clearTimeout(specialAutoReturnTimerRef.current);
        specialAutoReturnTimerRef.current = null;
      }
      newLinker.dispose();
      linkerRef.current = null;
      newController.dispose();
      controllerRef.current = null;
      trigger.dispose();
      specialTriggerRef.current = null;
      enterSpecialRef.current = null;
      releaseSpecialRef.current = null;
      setSpecialTriggerState(null);
    };
  }, [vrm, enabled, enableLongIdleTrigger]);

  // setPhase: ref 更新 + controller 即時反映 + animationState 更新
  // F-011-009: phase 変化は special 再生中でも常に animationState を更新する
  // （特別動作は fire-and-forget。phase/emotion が単一ソースのまま）
  const setPhase = useCallback((newPhase: ConversationPhase) => {
    phaseRef.current = newPhase;
    setPhaseState(newPhase);
    specialTriggerRef.current?.setPhase(newPhase);

    const newState = applyToController(
      controllerRef.current, linkerRef.current,
      newPhase, emotionRef.current,
    );
    setAnimationState(newState);
  }, []);

  // setEmotion: ref 更新 + controller 即時反映 + animationState 更新
  const setEmotion = useCallback((newEmotion: EmotionType) => {
    emotionRef.current = newEmotion;
    setEmotionState(newEmotion);

    const newState = applyToController(
      controllerRef.current, linkerRef.current,
      phaseRef.current, newEmotion,
    );
    setAnimationState(newState);
  }, []);

  // F-011-009: 特別動作発火（内部 enterSpecial に委譲）
  const playSpecial = useCallback((state: AnimationState) => {
    enterSpecialRef.current?.(state);
  }, []);

  // F-011-009: 特別動作終了通知（VRMViewer の finished イベント経由）
  // fire-and-forget 設計のため、終了時は phase/emotion から再計算して body を復帰
  const notifySpecialEnded = useCallback(() => {
    releaseSpecialRef.current?.();
  }, []);

  return {
    phase: phaseState,
    setPhase,
    emotion: emotionState,
    setEmotion,
    animationState,
    expressionController: controllerRef.current,
    playSpecial,
    notifySpecialEnded,
    specialActionTrigger: specialTriggerState,
  };
}
