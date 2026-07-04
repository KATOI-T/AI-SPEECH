/**
 * F-010: ExpressionController
 * VRM BlendShape制御（Layer 2: 表情 + Layer 3: 瞬き）
 *
 * LipSync（口）とは競合しない — 目・眉・頬のみ制御
 */

import type { VRM } from "@pixiv/three-vrm";
import type { EmotionType, ExpressionConfig } from "@/types";
import { DEFAULT_EMOTION_MAP } from "./animation-constants";

/** 瞬き設定（F-011-007: 1〜3 秒ランダム） */
const BLINK_MIN_INTERVAL = 1; // 秒
const BLINK_MAX_INTERVAL = 3; // 秒
const BLINK_DURATION = 0.15; // 秒

/** 補間速度 */
const EXPRESSION_LERP_SPEED = 5; // 1秒あたりの補間係数

export class ExpressionController {
  private vrm: VRM;

  // 現在の表情状態
  private currentWeights: Record<string, number> = {};
  private targetWeights: Record<string, number> = {};

  // 瞬き状態
  private blinkEnabled = true;
  private blinkTimer = 0;
  private nextBlinkTime: number;
  private isBlinking = false;
  private blinkProgress = 0;
  private blinkInterval = 2; // デフォルト中央値（1〜3 秒範囲の中央）

  // 瞬き抑制（外部から目を瞑る制御用）
  private blinkSuppressed = false;

  // 現在の感情
  private currentEmotion: EmotionType = 'neutral';
  private isSpeaking = false;

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.nextBlinkTime = this.randomBlinkInterval();
  }

  /**
   * 個別のBlendShape weight設定
   */
  setExpression(name: string, weight: number): void {
    this.targetWeights[name] = Math.max(0, Math.min(1, weight));
  }

  /**
   * 感情プリセット適用
   */
  setEmotion(emotion: EmotionType, isSpeaking = false): void {
    this.currentEmotion = emotion;
    this.isSpeaking = isSpeaking;

    // 既存の感情表情をクリア
    for (const emo of Object.values(DEFAULT_EMOTION_MAP)) {
      this.targetWeights[emo.expression] = 0;
    }

    // 新しい感情を適用
    const mapping = DEFAULT_EMOTION_MAP[emotion];
    if (mapping) {
      const weight = isSpeaking ? mapping.config.speaking : mapping.config.normal;
      this.targetWeights[mapping.expression] = weight;
    }
  }

  /**
   * 発話状態の更新
   */
  setSpeaking(isSpeaking: boolean): void {
    this.isSpeaking = isSpeaking;
    // 現在の感情を発話状態に合わせて再適用
    this.setEmotion(this.currentEmotion, isSpeaking);
  }

  /**
   * 瞬きの有効/無効切替
   */
  setBlinkEnabled(enabled: boolean): void {
    this.blinkEnabled = enabled;
    if (!enabled) {
      this.isBlinking = false;
      this.blinkProgress = 0;
    }
  }

  /**
   * 外部からの瞬き抑制（greeting等で目を瞑る間、自動瞬きを止める）
   */
  setBlinkSuppressed(suppressed: boolean): void {
    this.blinkSuppressed = suppressed;
  }

  /**
   * 瞬き間隔の設定（秒）
   */
  setBlinkInterval(interval: number): void {
    this.blinkInterval = Math.max(BLINK_MIN_INTERVAL, Math.min(BLINK_MAX_INTERVAL, interval));
  }

  /**
   * 全表情weightのリセット
   */
  resetExpressions(): void {
    this.targetWeights = {};
    this.currentWeights = {};
    this.currentEmotion = 'neutral';
    this.isSpeaking = false;

    if (!this.vrm.expressionManager) return;
    const expressions = this.vrm.expressionManager.expressions;
    for (const expr of expressions) {
      // 口関連（LipSync管轄）はスキップ
      if (this.isMouthExpression(expr.expressionName)) continue;
      this.vrm.expressionManager.setValue(expr.expressionName, 0);
    }
  }

  /**
   * フレーム更新（rAFから呼び出し）
   */
  update(delta: number): void {
    if (!this.vrm.expressionManager) return;

    // 瞬き処理
    this.updateBlink(delta);

    // 表情の補間適用
    this.applyExpressions(delta);
  }

  /**
   * 現在の全weight取得（デバッグ用）
   */
  getWeights(): Record<string, number> {
    return { ...this.currentWeights };
  }

  /**
   * 現在の感情取得
   */
  getEmotion(): EmotionType {
    return this.currentEmotion;
  }

  /**
   * 瞬き状態取得
   */
  getBlinkState(): { enabled: boolean; interval: number } {
    return { enabled: this.blinkEnabled, interval: this.blinkInterval };
  }

  /**
   * VRMで利用可能な表情名一覧取得
   */
  getAvailableExpressions(): string[] {
    if (!this.vrm.expressionManager) return [];
    return this.vrm.expressionManager.expressions
      .map(e => e.expressionName)
      .filter(name => !this.isMouthExpression(name));
  }

  // --- Private ---

  private updateBlink(delta: number): void {
    if (!this.blinkEnabled || this.blinkSuppressed) return;

    // surprised時は瞬き抑制
    if (this.currentEmotion === 'surprised') return;

    if (this.isBlinking) {
      this.blinkProgress += delta;
      const halfDuration = BLINK_DURATION / 2;

      let blinkWeight: number;
      if (this.blinkProgress < halfDuration) {
        // 閉じる
        blinkWeight = this.blinkProgress / halfDuration;
      } else if (this.blinkProgress < BLINK_DURATION) {
        // 開く
        blinkWeight = 1 - (this.blinkProgress - halfDuration) / halfDuration;
      } else {
        // 完了
        blinkWeight = 0;
        this.isBlinking = false;
        this.blinkProgress = 0;
        this.blinkTimer = 0;
        this.nextBlinkTime = this.randomBlinkInterval();
      }

      this.vrm.expressionManager?.setValue('blink', blinkWeight);
    } else {
      this.blinkTimer += delta;
      if (this.blinkTimer >= this.nextBlinkTime) {
        this.isBlinking = true;
        this.blinkProgress = 0;
      }
    }
  }

  private applyExpressions(delta: number): void {
    const lerpFactor = Math.min(1, EXPRESSION_LERP_SPEED * delta);

    for (const [name, target] of Object.entries(this.targetWeights)) {
      // 口関連はスキップ
      if (this.isMouthExpression(name)) continue;

      const current = this.currentWeights[name] ?? 0;
      const newValue = current + (target - current) * lerpFactor;
      this.currentWeights[name] = newValue;

      this.vrm.expressionManager?.setValue(name, newValue);
    }

    // targetに存在しないがcurrentにある表情は0に向かう
    for (const name of Object.keys(this.currentWeights)) {
      if (name in this.targetWeights) continue;
      if (this.isMouthExpression(name)) continue;

      const current = this.currentWeights[name];
      if (current > 0.001) {
        const newValue = current * (1 - lerpFactor);
        this.currentWeights[name] = newValue;
        this.vrm.expressionManager?.setValue(name, newValue);
      } else {
        this.vrm.expressionManager?.setValue(name, 0);
        delete this.currentWeights[name];
      }
    }
  }

  private randomBlinkInterval(): number {
    const jitter = 1.0; // ±1秒のランダム変動
    const base = this.blinkInterval;
    const result = base + (Math.random() * 2 - 1) * jitter;
    return Math.max(0.5, result);
  }

  /** 口関連のBlendShape名かどうか（LipSync管轄） */
  private isMouthExpression(name: string): boolean {
    const mouthNames = ['aa', 'ih', 'ou', 'ee', 'oh', 'A', 'I', 'U', 'E', 'O'];
    return mouthNames.includes(name);
  }

  dispose(): void {
    this.resetExpressions();
  }
}
