/**
 * F-002: リップシンク機能 - BlendShape 制御ユーティリティ
 */

import type { VRM } from "@pixiv/three-vrm";
import type { Viseme, LipSyncControllerOptions } from "@/types/lipsync";
import {
  VISEME_TO_BLENDSHAPE,
  BLENDSHAPE_NAMES,
  lerp,
  clamp,
  detectBlendShapeNames,
} from "./viseme-mapping";

/**
 * リップシンクコントローラー
 *
 * VRMモデルのBlendShapeを制御してリップシンクを実現する。
 * Visemeデータのタイムラインに基づき、音声再生位置に応じて口形状を変化させる。
 */
export class LipSyncController {
  private vrm: VRM;
  private visemes: Viseme[] = [];
  private currentTime = 0;
  private smoothing: number;
  private currentVisemeIndex = 0; // パフォーマンス最適化用
  private blendShapeMap: Record<string, string | null> = {}; // 標準名 → 実際の名前

  /**
   * コンストラクタ
   *
   * @param vrm - VRMインスタンス
   * @param options - オプション設定
   */
  constructor(vrm: VRM, options: LipSyncControllerOptions = {}) {
    this.vrm = vrm;
    this.smoothing = clamp(options.smoothing ?? 0.3, 0, 1);

    // 初期化時にVRMのexpressionManagerが存在することを確認
    if (!this.vrm.expressionManager) {
      console.warn(
        "[LipSyncController] VRM expressionManager not found. LipSync will not work."
      );
    } else {
      // VRM モデルから利用可能な expression 名を検出
      const expressions = this.vrm.expressionManager.expressions;
      const expressionNames = expressions.map((e) => e.expressionName);

      // 動的に BlendShape 名をマッピング
      this.blendShapeMap = detectBlendShapeNames(expressionNames);

      console.log("[LipSyncController] Available expressions:", expressionNames);
      console.log("[LipSyncController] BlendShape mapping:", this.blendShapeMap);
    }
  }

  /**
   * Viseme データを設定
   *
   * @param visemes - Visemeデータ配列（時系列順にソート済みを想定）
   */
  setVisemes(visemes: Viseme[]): void {
    // 時系列順にソート（念のため）
    this.visemes = [...visemes].sort((a, b) => a.time - b.time);
    this.currentTime = 0;
    this.currentVisemeIndex = 0;

    if (process.env.NODE_ENV === "development") {
      console.log("[LipSyncController] Visemes set:", this.visemes.length);
    }
  }

  /**
   * 音声再生位置を更新してBlendShapeを適用
   *
   * @param currentTime - 現在の音声再生位置（秒）
   */
  updateTime(currentTime: number): void {
    this.currentTime = currentTime;

    const currentViseme = this.getCurrentViseme();
    if (currentViseme) {
      this.applyViseme(currentViseme);
    } else {
      // Visemeがない場合はニュートラルに戻す
      this.applyNeutral();
    }
  }

  /**
   * 現在時刻に対応する Viseme を取得
   *
   * パフォーマンス最適化: 前回のインデックスから順次検索
   * （音声は必ず前進するため、バイナリサーチより効率的）
   *
   * @returns 現在時刻に対応するViseme、または null
   */
  private getCurrentViseme(): Viseme | null {
    if (this.visemes.length === 0) return null;

    // 前回のインデックスから順次検索
    while (
      this.currentVisemeIndex < this.visemes.length - 1 &&
      this.visemes[this.currentVisemeIndex + 1].time <= this.currentTime
    ) {
      this.currentVisemeIndex++;
    }

    // 先頭のVisemeより前の場合
    if (this.currentTime < this.visemes[0].time) {
      return null;
    }

    return this.visemes[this.currentVisemeIndex] || null;
  }

  /**
   * Viseme を VRM BlendShape に適用
   *
   * スムーズ補間を使用して自然な口の動きを実現
   *
   * @param viseme - 適用するViseme
   */
  private applyViseme(viseme: Viseme): void {
    // 標準名に変換（aa, ih, ou, ee, oh, neutral）
    const standardName = VISEME_TO_BLENDSHAPE[viseme.viseme];

    if (!standardName) {
      console.warn(
        `[LipSyncController] Unknown viseme: ${viseme.viseme}`
      );
      return;
    }

    if (!this.vrm.expressionManager) return;

    // 実際の expression 名を取得
    const actualName = this.blendShapeMap[standardName];

    // デバッグログ（最初の数回のみ）
    if (this.currentVisemeIndex < 3) {
      console.log(`[LipSyncController] Applying viseme: ${viseme.viseme} -> ${standardName} -> ${actualName}`);
    }

    if (!actualName) {
      // 対応する expression が存在しない場合はスキップ
      return;
    }

    // 全ての口関連 BlendShape をスムーズに 0 に近づけ、目標のみ 1 に
    for (const [standard, actual] of Object.entries(this.blendShapeMap)) {
      if (!actual) continue;

      const currentValue =
        this.vrm.expressionManager?.getValue(actual) ?? 0;
      const targetValue = standard === standardName ? 1 : 0;
      const newValue = lerp(currentValue, targetValue, this.smoothing);

      this.vrm.expressionManager?.setValue(actual, newValue);
    }
  }

  /**
   * ニュートラル状態（口を閉じる）に戻す
   */
  private applyNeutral(): void {
    if (!this.vrm.expressionManager) return;

    // 全ての口関連 BlendShape を 0 に近づける
    for (const [standard, actual] of Object.entries(this.blendShapeMap)) {
      if (!actual) continue;

      const currentValue =
        this.vrm.expressionManager?.getValue(actual) ?? 0;
      // neutral のみを 1 に、他は 0 に
      const targetValue = standard === "neutral" ? 1 : 0;
      const newValue = lerp(currentValue, targetValue, this.smoothing);

      this.vrm.expressionManager?.setValue(actual, newValue);
    }
  }

  /**
   * リセット（全BlendShapeを0に戻す）
   */
  reset(): void {
    if (!this.vrm.expressionManager) return;

    this.visemes = [];
    this.currentTime = 0;
    this.currentVisemeIndex = 0;

    // 動的に検出した BlendShape 名を使用
    for (const actual of Object.values(this.blendShapeMap)) {
      if (!actual) continue;
      this.vrm.expressionManager?.setValue(actual, 0);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[LipSyncController] Reset");
    }
  }

  /**
   * スムーズ係数を更新
   *
   * @param smoothing - 新しいスムーズ係数（0-1）
   */
  setSmoothingFactor(smoothing: number): void {
    this.smoothing = clamp(smoothing, 0, 1);
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    visemeCount: number;
    currentTime: number;
    currentVisemeIndex: number;
    currentViseme: Viseme | null;
  } {
    return {
      visemeCount: this.visemes.length,
      currentTime: this.currentTime,
      currentVisemeIndex: this.currentVisemeIndex,
      currentViseme: this.getCurrentViseme(),
    };
  }
}
