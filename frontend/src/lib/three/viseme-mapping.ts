/**
 * F-002: リップシンク機能 - Viseme マッピング
 * Azure Speech Viseme → VRM BlendShape マッピング
 * @see https://learn.microsoft.com/azure/ai-services/speech-service/how-to-speech-synthesis-viseme
 */

/**
 * Azure Speech Viseme → VRM BlendShape マッピング
 *
 * VRM標準のBlendShape名（VRM 1.0仕様）:
 * - aa: 「あ」（口を大きく開ける）
 * - ih: 「い」（口を横に広げる）
 * - ou: 「う」（口をすぼめる）
 * - ee: 「え」（口を少し開ける）
 * - oh: 「お」（口を丸く開ける）
 * - neutral: 無音（口を閉じる）
 *
 * Azure Viseme ID マッピング:
 * - 0: sil (silence)
 * - 1-5: 母音 (aa, ee, ih, oh, ou)
 * - 6-21: 子音 (PP, FF, TH, DD, kk, CH, SS, nn, RR, EE, ER, W)
 */
export const VISEME_TO_BLENDSHAPE: Record<string, string> = {
  // 無音
  sil: "neutral",

  // 母音（VRM BlendShape に直接マッピング）
  aa: "aa",       // あ（開口）
  ih: "ih",       // い（横に広がる）
  ou: "ou",       // う（すぼめる）
  ee: "ee",       // え（やや開口）
  oh: "oh",       // お（丸める）

  // 子音（口の形状に基づいて母音にマッピング）
  PP: "neutral",  // p, b, m - 唇を閉じる
  FF: "ih",       // f, v - 下唇を噛む → い系
  TH: "ee",       // th - 舌を出す → え系
  DD: "ee",       // d, t, n - 舌を上顎に → え系
  kk: "oh",       // k, g - 喉から → お系
  CH: "ih",       // ch, sh, j - 口を横に → い系
  SS: "ih",       // s, z - 歯を閉じる → い系
  nn: "neutral",  // n, ng - 鼻音 → 閉じる
  RR: "oh",       // r - 口を丸く → お系
  EE: "ee",       // e (強調) → え
  ER: "oh",       // er - 口を丸く → お系
  W: "ou",        // w - 口をすぼめる → う系
};

/**
 * サポートされているViseme一覧
 */
export const SUPPORTED_VISEMES = Object.keys(VISEME_TO_BLENDSHAPE);

/**
 * BlendShape名の一覧（重複除去）
 */
export const BLENDSHAPE_NAMES = Array.from(new Set(Object.values(VISEME_TO_BLENDSHAPE)));

/**
 * VRM 0.x と VRM 1.0 の BlendShape 名のマッピング
 * VRM 0.x: A, I, U, E, O
 * VRM 1.0: aa, ih, ou, ee, oh
 */
export const BLENDSHAPE_ALIASES: Record<string, string[]> = {
  aa: ["aa", "A", "a", "Fcl_MTH_A"],       // あ
  ih: ["ih", "I", "i", "Fcl_MTH_I"],       // い
  ou: ["ou", "U", "u", "Fcl_MTH_U"],       // う
  ee: ["ee", "E", "e", "Fcl_MTH_E"],       // え
  oh: ["oh", "O", "o", "Fcl_MTH_O"],       // お
  neutral: ["neutral", "Neutral", ""],     // ニュートラル
};

/**
 * VRM の expressionManager から利用可能な expression 名を検出し、
 * 実際に使用する BlendShape 名のマッピングを生成する
 *
 * @param availableExpressions - VRM モデルで利用可能な expression 名の配列
 * @returns 標準名 → 実際の expression 名のマッピング
 */
export function detectBlendShapeNames(
  availableExpressions: string[]
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const availableSet = new Set(availableExpressions);

  for (const [standardName, aliases] of Object.entries(BLENDSHAPE_ALIASES)) {
    // エイリアスの中から、実際に存在するものを探す
    const found = aliases.find((alias) => availableSet.has(alias));
    result[standardName] = found ?? null;
  }

  return result;
}

/**
 * スムーズ補間関数（線形補間: lerp）
 *
 * @param start - 開始値
 * @param end - 終了値
 * @param t - 補間係数（0-1）
 * @returns 補間された値
 *
 * @example
 * lerp(0, 1, 0.5) // => 0.5
 * lerp(0, 100, 0.3) // => 30
 */
export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

/**
 * 値を範囲内にクランプする
 *
 * @param value - クランプする値
 * @param min - 最小値
 * @param max - 最大値
 * @returns クランプされた値
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
