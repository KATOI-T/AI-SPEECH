import type { AnimationConfig, AnimationState, AnimationExpressionDef, ConversationPhase, EmotionType, EmotionExpressionMap } from "@/types";

/**
 * アニメーション状態の日本語ラベル
 */
export const ANIMATION_LABELS: Record<AnimationState, string> = {
  idle: "待機",
  greeting: "挨拶",
  happy: "喜び",
  present: "全身表示",
  shoot: "撃つ",
  spin: "回る",
  exercise: "屈伸運動",
  talking: "会話中",
  sad: "悲しみ",
  surprised: "驚き",
  angry: "怒り",
  thinking: "考え中",
};

/**
 * デフォルトのVRMAファイルパスマッピング
 * 各状態に対応するVRMAファイルのパス
 */
export const DEFAULT_VRMA_PATHS: Partial<Record<AnimationState, string>> = {
  idle: "/models/motion/VRMA_06.vrma",
  greeting: "/models/motion/VRMA_02.vrma",
  happy: "/models/motion/VRMA_03.vrma",
  present: "/models/motion/VRMA_01.vrma",
  shoot: "/models/motion/VRMA_04.vrma",
  spin: "/models/motion/VRMA_05.vrma",
  exercise: "/models/motion/VRMA_07.vrma",
  talking: "/models/motion/VRMA_02.vrma",
  sad: "/models/motion/VRMA_06.vrma",
  surprised: "/models/motion/VRMA_03.vrma",
  angry: "/models/motion/VRMA_04.vrma",
  thinking: "/models/motion/VRMA_06.vrma",
};

/**
 * 会話フェーズ → ボディアニメーション状態マッピング（F-010）
 */
export const PHASE_BODY_ANIMATION: Record<ConversationPhase, AnimationState> = {
  IDLE: 'idle',
  LISTENING: 'idle',
  THINKING: 'thinking',
  SPEAKING: 'talking',
};

/**
 * 感情 → ボディアニメーション上書き（SPEAKING時のみ適用）
 *
 * F-011-011 (v3.0): 空オブジェクトに変更し、SPEAKING では感情に関わらず
 * `talking` 固定にする。顔の表情（DEFAULT_EMOTION_MAP）は従来通り感情で変化する。
 * Phase 4 再有効化時はこのオブジェクトに値を戻す（overlay/replace 方式は再設計）。
 */
export const EMOTION_BODY_OVERRIDE: Partial<Record<EmotionType, AnimationState>> = {};

/**
 * F-011-012 (v3.0): 特別動作 feature flag。
 *
 * false の間はセッション開始/終了お辞儀・long-idle 発火を全て無効化する。
 * SpecialActionTrigger クラスや greeting/present/spin/exercise クリップは
 * 保持しているため、true に戻すだけで再有効化できる（Phase 4）。
 */
export const ENABLE_SPECIAL_ACTIONS = false;

/**
 * F-011-009: 長時間 IDLE 時のランダム再生プール
 */
export const LONG_IDLE_ACTIONS: AnimationState[] = ['present', 'spin', 'exercise'];

/**
 * F-011-009: 長時間 IDLE 判定閾値（秒）
 */
export const LONG_IDLE_THRESHOLD_SEC = 30;

/**
 * デフォルト感情 → 表情マッピング（F-010）
 */
export const DEFAULT_EMOTION_MAP: EmotionExpressionMap = {
  neutral:   { expression: 'relaxed',   config: { normal: 0.2, speaking: 0.1 } },
  happy:     { expression: 'happy',     config: { normal: 0.8, speaking: 0.4 } },
  sad:       { expression: 'sad',       config: { normal: 0.8, speaking: 0.4 } },
  surprised: { expression: 'surprised', config: { normal: 0.9, speaking: 0.5 } },
  angry:     { expression: 'angry',     config: { normal: 0.8, speaking: 0.4 } },
};

/**
 * ボディアニメーション状態に連動する表情定義（F-011）
 * 特定のアニメーション再生中に自動で表情を適用する
 */
export const ANIMATION_EXPRESSION_MAP: Partial<Record<AnimationState, AnimationExpressionDef[]>> = {
  greeting: [
    {
      expression: 'blink',
      delayIn: 0.6,       // お辞儀に入る直前に目を閉じ始める
      fadeIn: 0.2,        // 0.2秒で目を瞑る
      weight: 1.0,
      delayOut: 2.8,      // 起き上がり開始時に目を開け始める
      fadeOut: 0.3,        // 0.3秒で目を開く
      suppressBlink: true, // お辞儀中は自動瞬きを抑制
    },
  ],
};

/**
 * animation_config のクリップ名を VRMA ファイルパスに変換する
 *
 * - null/undefined → 空オブジェクト
 * - 値が "/" で始まる → そのまま使用（既にファイルパス）
 * - 値が空文字 → フィルタ（除外）
 * - それ以外 → DEFAULT_VRMA_PATHS のパスにフォールバック
 */
export function resolveAnimationPaths(
  animationConfig: AnimationConfig | null | undefined
): Partial<Record<AnimationState, string>> {
  if (!animationConfig) return {};

  const paths: Partial<Record<AnimationState, string>> = {};
  for (const [key, value] of Object.entries(animationConfig) as [AnimationState, string][]) {
    if (!value) continue;
    if (value.startsWith("/")) {
      paths[key] = value;
    } else {
      const fallback = DEFAULT_VRMA_PATHS[key];
      if (fallback) {
        paths[key] = fallback;
      }
    }
  }
  return paths;
}
