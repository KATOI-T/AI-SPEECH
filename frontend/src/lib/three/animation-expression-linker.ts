/**
 * F-011: AnimationExpressionLinker
 *
 * ボディアニメーション状態に連動して表情を自動適用する。
 * 例: greeting 中に目を瞑る（blink = 1.0）
 *
 * ANIMATION_EXPRESSION_MAP の定義に基づき、タイムライン制御で
 * フェードイン/フェードアウト付きの表情適用を行う。
 */

import type { AnimationState, AnimationExpressionDef } from "@/types";
import type { ExpressionController } from "./expression-controller";
import { ANIMATION_EXPRESSION_MAP } from "./animation-constants";

type LinkerPhase = 'inactive' | 'delay_in' | 'fade_in' | 'active' | 'delay_out' | 'fade_out';

interface ActiveExpression {
  def: AnimationExpressionDef;
  phase: LinkerPhase;
  /** 現在フェーズ内の経過時間 */
  phaseElapsed: number;
  /** アニメーション開始からの総経過時間 */
  totalElapsed: number;
  /** 現在の weight */
  currentWeight: number;
}

export class AnimationExpressionLinker {
  private expressionCtrl: ExpressionController;
  private activeExpressions: ActiveExpression[] = [];
  private currentState: AnimationState | null = null;

  constructor(expressionCtrl: ExpressionController) {
    this.expressionCtrl = expressionCtrl;
  }

  /**
   * アニメーション状態変更時に呼び出す
   */
  onStateChange(newState: AnimationState): void {
    // 前の状態の表情をクリーンアップ
    this.cleanup();

    this.currentState = newState;

    // 新しい状態の連動表情を取得
    const defs = ANIMATION_EXPRESSION_MAP[newState];
    if (!defs || defs.length === 0) return;

    // 各表情定義をアクティブ化
    for (const def of defs) {
      this.activeExpressions.push({
        def,
        phase: 'delay_in',
        phaseElapsed: 0,
        totalElapsed: 0,
        currentWeight: 0,
      });

      // 自動瞬き抑制
      if (def.suppressBlink) {
        this.expressionCtrl.setBlinkSuppressed(true);
      }
    }
  }

  /**
   * 毎フレーム更新
   */
  update(delta: number): void {
    if (this.activeExpressions.length === 0) return;

    for (const active of this.activeExpressions) {
      active.totalElapsed += delta;
      active.phaseElapsed += delta;

      // 大きな delta で複数フェーズをまたぐ場合があるためループで処理
      let settled = false;
      while (!settled) {
        settled = true; // デフォルトはループ終了

        switch (active.phase) {
          case 'delay_in':
            if (active.totalElapsed >= active.def.delayIn) {
              active.phase = 'fade_in';
              active.phaseElapsed = active.totalElapsed - active.def.delayIn;
              settled = false; // 次のフェーズも処理
            }
            break;

          case 'fade_in': {
            const progress = Math.min(1, active.phaseElapsed / active.def.fadeIn);
            active.currentWeight = progress * active.def.weight;
            this.expressionCtrl.setExpression(active.def.expression, active.currentWeight);

            if (progress >= 1) {
              active.phase = 'active';
              active.phaseElapsed = 0;
              settled = false;
            }
            break;
          }

          case 'active':
            active.currentWeight = active.def.weight;
            this.expressionCtrl.setExpression(active.def.expression, active.currentWeight);

            if (active.totalElapsed >= active.def.delayOut) {
              active.phase = 'fade_out';
              active.phaseElapsed = active.totalElapsed - active.def.delayOut;
              settled = false;
            }
            break;

          case 'fade_out': {
            const progress = Math.min(1, active.phaseElapsed / active.def.fadeOut);
            active.currentWeight = active.def.weight * (1 - progress);
            this.expressionCtrl.setExpression(active.def.expression, active.currentWeight);

            if (progress >= 1) {
              active.phase = 'inactive';
              active.currentWeight = 0;
              this.expressionCtrl.setExpression(active.def.expression, 0);

              if (active.def.suppressBlink) {
                this.expressionCtrl.setBlinkSuppressed(false);
              }
            }
            break;
          }

          case 'inactive':
            break;
        }
      }
    }

    // 完了した表情を除去
    this.activeExpressions = this.activeExpressions.filter(
      (a) => a.phase !== 'inactive'
    );
  }

  /**
   * 現在のアクティブ表情をクリーンアップ
   */
  private cleanup(): void {
    for (const active of this.activeExpressions) {
      // weight をリセット
      this.expressionCtrl.setExpression(active.def.expression, 0);

      // 自動瞬き抑制を解除
      if (active.def.suppressBlink) {
        this.expressionCtrl.setBlinkSuppressed(false);
      }
    }
    this.activeExpressions = [];
  }

  /**
   * 現在の状態を取得（デバッグ用）
   */
  getActiveExpressions(): Array<{ expression: string; phase: LinkerPhase; weight: number }> {
    return this.activeExpressions.map((a) => ({
      expression: a.def.expression,
      phase: a.phase,
      weight: a.currentWeight,
    }));
  }

  dispose(): void {
    this.cleanup();
    this.currentState = null;
  }
}
