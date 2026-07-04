/**
 * F-011-009: SpecialActionTrigger
 *
 * 会話イベント（セッション開始/終了、長時間 IDLE、ゴール達成）を購読し、
 * 適切な VRMA 特別動作を `playSpecial(state)` で発火するディスパッチャ。
 *
 * トリガー種別:
 * - sessionStart  → greeting
 * - sessionEnd    → greeting
 * - longIdle(30s) → LONG_IDLE_ACTIONS からランダム（present/spin/exercise）
 * - goalAchieved  → happy
 */

import type { AnimationState, ConversationPhase } from "@/types";
import { LONG_IDLE_ACTIONS, LONG_IDLE_THRESHOLD_SEC } from "./animation-constants";

export interface SpecialActionTriggerOptions {
  /** special state を発火するコールバック（useConversationAnimation.playSpecial を想定） */
  onTrigger: (state: AnimationState) => void;
  /** 長時間 IDLE 判定閾値（秒）。省略時は `LONG_IDLE_THRESHOLD_SEC` */
  longIdleThresholdSec?: number;
  /** ランダム選択に使う乱数（テスト用注入可）。省略時 Math.random */
  random?: () => number;
  /** 長時間 IDLE の候補プール（テスト用注入可） */
  longIdlePool?: AnimationState[];
}

export class SpecialActionTrigger {
  private onTrigger: (state: AnimationState) => void;
  private longIdleThresholdSec: number;
  private random: () => number;
  private longIdlePool: AnimationState[];

  private idleElapsedSec = 0;
  private currentPhase: ConversationPhase = 'IDLE';
  private isPlayingSpecial = false;
  private disposed = false;

  constructor(options: SpecialActionTriggerOptions) {
    this.onTrigger = options.onTrigger;
    this.longIdleThresholdSec = options.longIdleThresholdSec ?? LONG_IDLE_THRESHOLD_SEC;
    this.random = options.random ?? Math.random;
    this.longIdlePool = options.longIdlePool ?? LONG_IDLE_ACTIONS;
  }

  /**
   * セッション開始時に呼び出し、挨拶を発火する
   */
  sessionStart(): void {
    if (this.disposed) return;
    this.fire('greeting');
  }

  /**
   * セッション終了時に呼び出し、別れのお辞儀を発火する
   */
  sessionEnd(): void {
    if (this.disposed) return;
    this.fire('greeting');
  }

  /**
   * ゴール達成時に呼び出し、V サイン（happy）を発火する
   */
  goalAchieved(): void {
    if (this.disposed) return;
    this.fire('happy');
  }

  /**
   * 現在の会話フェーズを通知。IDLE 以外では long-idle タイマーをリセットする
   */
  setPhase(phase: ConversationPhase): void {
    if (phase !== 'IDLE') {
      this.idleElapsedSec = 0;
    }
    this.currentPhase = phase;
  }

  /**
   * 特別動作の再生中フラグを通知。再生中は long-idle タイマーを停止する
   */
  setPlayingSpecial(isPlaying: boolean): void {
    this.isPlayingSpecial = isPlaying;
    if (isPlaying) {
      this.idleElapsedSec = 0;
    }
  }

  /**
   * 毎フレーム呼び出し（秒単位 delta）。IDLE 継続時間を計測し閾値超過で long-idle を発火
   */
  update(deltaSec: number): void {
    if (this.disposed) return;
    if (this.isPlayingSpecial) return;
    if (this.currentPhase !== 'IDLE') return;

    this.idleElapsedSec += deltaSec;
    if (this.idleElapsedSec >= this.longIdleThresholdSec) {
      this.idleElapsedSec = 0;
      const pick = this.pickLongIdleAction();
      if (pick) this.fire(pick);
    }
  }

  /**
   * 現在の IDLE 経過秒（テスト/デバッグ用）
   */
  getIdleElapsedSec(): number {
    return this.idleElapsedSec;
  }

  dispose(): void {
    this.disposed = true;
  }

  private pickLongIdleAction(): AnimationState | null {
    if (this.longIdlePool.length === 0) return null;
    const idx = Math.floor(this.random() * this.longIdlePool.length);
    return this.longIdlePool[Math.min(idx, this.longIdlePool.length - 1)];
  }

  private fire(state: AnimationState): void {
    this.idleElapsedSec = 0;
    this.onTrigger(state);
  }
}
