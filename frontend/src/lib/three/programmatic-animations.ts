/**
 * プロシージャルボディアニメーション生成
 *
 * VRMAファイルが存在しない場合のフォールバックとして、
 * VRM humanoid ボーンの回転キーフレームからアニメーションクリップを生成する。
 */

import * as THREE from "three";
import type { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import type { AnimationState } from "@/types";

// --- 型定義 ---

interface BoneKeyframeDef {
  /** VRM humanoid ボーン名 (e.g. "head", "spine") */
  bone: string;
  /** キーフレーム時刻（秒） */
  times: number[];
  /** 各キーフレームの回転角度 [xDeg, yDeg, zDeg] */
  rotationsDeg: number[][];
}

interface AnimationDef {
  duration: number;
  bones: BoneKeyframeDef[];
}

// --- ヘルパー ---

const DEG2RAD = Math.PI / 180;

/** Euler 角度配列を flat Quaternion 配列 [x,y,z,w, ...] に変換 */
function degreesToQuaternionArray(rotationsDeg: number[][]): number[] {
  const result: number[] = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const [xd, yd, zd] of rotationsDeg) {
    e.set(xd * DEG2RAD, yd * DEG2RAD, zd * DEG2RAD, "XYZ");
    q.setFromEuler(e);
    result.push(q.x, q.y, q.z, q.w);
  }
  return result;
}

/** VRM ボーンノード名を解決してクリップを生成 */
function buildClip(
  name: string,
  def: AnimationDef,
  vrm: VRM,
): THREE.AnimationClip | null {
  const tracks: THREE.KeyframeTrack[] = [];

  for (const boneDef of def.bones) {
    const node = vrm.humanoid?.getNormalizedBoneNode(boneDef.bone as VRMHumanBoneName);
    if (!node) continue;

    const values = degreesToQuaternionArray(boneDef.rotationsDeg);
    const track = new THREE.QuaternionKeyframeTrack(
      `${node.name}.quaternion`,
      boneDef.times,
      values,
    );
    tracks.push(track);
  }

  if (tracks.length === 0) return null;
  return new THREE.AnimationClip(name, def.duration, tracks);
}

// --- アニメーション定義 ---
//
// VRM normalized bones 座標系（モデル本来）:
//   体幹 (hips/spine/chest/neck/head): +X前傾, -X後傾, +Y左回転, -Y右回転, +Z左傾, -Z右傾
//   右腕 (rightUpperArm/rightLowerArm): +X前振り, -X後振り, +Z上げ(体から離す)
//   左腕 (leftUpperArm/leftLowerArm): +X前振り, -X後振り, -Z上げ(体から離す)
//   脚 (upperLeg): +X前振り(膝を上げる)
//
// ※ モデルがY軸180度回転しているため、実際の視覚効果はX軸・Z軸が反転:
//   体幹: -X=前傾(視覚), +X=後傾(視覚), -Z=左傾(視覚), +Z=右傾(視覚)
//   腕・脚も同様にX・Z反転。Y軸は不変。
//
// 腕のデフォルト姿勢（A-pose / 自然に下ろした姿勢）:
//   T-pose([0,0,0]) だと腕が横に伸びて見えるため、rest 時は Z 軸回転で下ろす。
//   - leftUpperArm:  Z=+72°（+Z が体に寄せる方向）
//   - rightUpperArm: Z=-72°（-Z が体に寄せる方向）
const ARM_REST_LEFT_Z = 72;
const ARM_REST_RIGHT_Z = -72;

const ANIMATION_DEFS: Record<string, AnimationDef> = {
  // F-011-015 (v3.0.2): 横揺れを含む全体動作をゆっくりに。duration を 4s → 8s に延長
  // F-011-016 (v3.0.3): hips を Y軸(ヨー)→Z軸(ロール)に変更し、spine/chest にも Z 成分を追加
  // F-011-017 (v3.0.4): hips 回転は下半身も剛体として回転させてしまい不自然（人形感）だったため削除。
  // 横揺れは spine/chest のみで表現（下半身は静止し、上半身だけが左右にゆるく傾く）
  idle: {
    duration: 8,
    bones: [
      // spine: 呼吸の前傾 + Z 軸横揺れ（振幅を ±1.5° に引き上げて上半身の揺れを主役化）
      {
        bone: "spine",
        times: [0, 3, 6, 8],
        rotationsDeg: [[0, 0, 0], [-3, 0, 1.5], [-1, 0, -1.5], [0, 0, 0]],
      },
      // chest: 呼吸の前傾 + Z 軸横揺れ（spine に重ねてやや小さい振幅）
      {
        bone: "chest",
        times: [0, 3, 6, 8],
        rotationsDeg: [[0, 0, 0], [-1.5, 0, 0.7], [-0.5, 0, -0.7], [0, 0, 0]],
      },
      {
        bone: "head",
        times: [0, 3, 6, 8],
        rotationsDeg: [[0, 0, 0], [-4, 0, -1], [1, 0, 1], [0, 0, 0]],
      },
      // 腕を自然に下ろした A-pose で保持（デフォルト姿勢）
      {
        bone: "leftUpperArm",
        times: [0, 8],
        rotationsDeg: [[0, 0, ARM_REST_LEFT_Z], [0, 0, ARM_REST_LEFT_Z]],
      },
      {
        bone: "rightUpperArm",
        times: [0, 8],
        rotationsDeg: [[0, 0, ARM_REST_RIGHT_Z], [0, 0, ARM_REST_RIGHT_Z]],
      },
    ],
  },

  greeting: {
    // VRMAフォールバック用: シンプルなお辞儀（VRMAファイルが優先される）
    duration: 3.5,
    bones: [
      {
        bone: "spine",
        times: [0, 0.8, 1.2, 2.0, 2.8, 3.5],
        rotationsDeg: [[0, 0, 0], [-20, 0, 0], [-20, 0, 0], [-20, 0, 0], [-5, 0, 0], [0, 0, 0]],
      },
      {
        bone: "chest",
        times: [0, 0.8, 1.2, 2.0, 2.8, 3.5],
        rotationsDeg: [[0, 0, 0], [-10, 0, 0], [-10, 0, 0], [-10, 0, 0], [-3, 0, 0], [0, 0, 0]],
      },
      {
        bone: "head",
        times: [0, 0.8, 1.2, 2.0, 2.8, 3.5],
        rotationsDeg: [[0, 0, 0], [-5, 0, 0], [-5, 0, 0], [-5, 0, 0], [-2, 0, 0], [0, 0, 0]],
      },
    ],
  },

  happy: {
    duration: 2,
    bones: [
      {
        bone: "spine",
        times: [0, 0.3, 0.6, 0.9, 1.2, 1.5, 2.0],
        rotationsDeg: [
          [3, 0, 0], [0, 0, 0], [3, 0, 0], [0, 0, 0],
          [3, 0, 0], [0, 0, 0], [3, 0, 0],
        ],
      },
      {
        bone: "head",
        times: [0, 0.5, 1.0, 1.5, 2.0],
        rotationsDeg: [[5, 0, -3], [0, 0, 0], [5, 0, 3], [0, 0, 0], [5, 0, -3]],
      },
      {
        bone: "leftUpperArm",
        times: [0, 0.5, 1.0, 1.5, 2.0],
        rotationsDeg: [[0, 0, 0], [-20, 0, 30], [0, 0, 0], [-20, 0, 30], [0, 0, 0]],
      },
      {
        bone: "rightUpperArm",
        times: [0, 0.5, 1.0, 1.5, 2.0],
        rotationsDeg: [[0, 0, 0], [-20, 0, -30], [0, 0, 0], [-20, 0, -30], [0, 0, 0]],
      },
    ],
  },

  // F-011-010 (v3.0): 腕は ARM_REST baseline を起点にし、手を下げたまま動作するよう修正
  // F-011-013 (v3.0): hips 軽い横揺れトラックを追加し、SPEAKING 中も棒立ちにならないようにする
  // F-011-015 (v3.0.2): 横揺れ・頭振りともに動作をゆっくりに。duration 2s → 4s に延長
  // F-011-016 (v3.0.3): hips を Y軸→Z軸に変更し、spine/chest にも Z 成分を追加
  // F-011-017 (v3.0.4): hips track を削除（下半身静止）。横揺れは spine/chest のみで表現
  talking: {
    duration: 4,
    bones: [
      {
        bone: "head",
        times: [0, 1.0, 2.0, 3.0, 4.0],
        rotationsDeg: [[0, 0, 0], [-8, 0, 5], [0, 0, 0], [-8, 0, -5], [0, 0, 0]],
      },
      {
        bone: "neck",
        times: [0, 1.0, 2.0, 3.0, 4.0],
        rotationsDeg: [[0, 0, 0], [-3, 0, 2], [0, 0, 0], [-3, 0, -2], [0, 0, 0]],
      },
      // spine Z 軸横揺れ（振幅 ±1.5°、上半身の揺れの主役）
      {
        bone: "spine",
        times: [0, 1.0, 2.0, 3.0, 4.0],
        rotationsDeg: [[0, 0, 0], [0, 0, 1.5], [0, 0, 0], [0, 0, -1.5], [0, 0, 0]],
      },
      // chest Z 軸横揺れ（spine に重ねてやや小さい振幅）
      {
        bone: "chest",
        times: [0, 1.0, 2.0, 3.0, 4.0],
        rotationsDeg: [[0, 0, 0], [0, 0, 0.7], [0, 0, 0], [0, 0, -0.7], [0, 0, 0]],
      },
      // F-011-014 (v3.0.1): 両腕とも rest で完全固定（会話中の腕振りは余計と判断されたため削除）
      {
        bone: "leftUpperArm",
        times: [0, 4.0],
        rotationsDeg: [[0, 0, ARM_REST_LEFT_Z], [0, 0, ARM_REST_LEFT_Z]],
      },
      {
        bone: "rightUpperArm",
        times: [0, 4.0],
        rotationsDeg: [[0, 0, ARM_REST_RIGHT_Z], [0, 0, ARM_REST_RIGHT_Z]],
      },
    ],
  },

  sad: {
    duration: 4,
    bones: [
      {
        bone: "head",
        times: [0, 1.5, 3, 4],
        rotationsDeg: [[0, 0, 0], [-25, 0, 3], [-20, 0, -3], [0, 0, 0]],
      },
      {
        bone: "spine",
        times: [0, 1.5, 3, 4],
        rotationsDeg: [[0, 0, 0], [-15, 0, 0], [-12, 0, 0], [0, 0, 0]],
      },
      {
        bone: "leftUpperArm",
        times: [0, 1.5, 3, 4],
        rotationsDeg: [[0, 0, 0], [-5, 0, -5], [-3, 0, -3], [0, 0, 0]],
      },
      {
        bone: "rightUpperArm",
        times: [0, 1.5, 3, 4],
        rotationsDeg: [[0, 0, 0], [-5, 0, 5], [-3, 0, 3], [0, 0, 0]],
      },
    ],
  },

  surprised: {
    duration: 2,
    bones: [
      {
        bone: "head",
        times: [0, 0.3, 0.6, 2.0],
        rotationsDeg: [[0, 0, 0], [20, 0, 0], [12, 0, 0], [0, 0, 0]],
      },
      {
        bone: "spine",
        times: [0, 0.3, 0.6, 2.0],
        rotationsDeg: [[0, 0, 0], [10, 0, 0], [6, 0, 0], [0, 0, 0]],
      },
      {
        bone: "leftUpperArm",
        times: [0, 0.3, 0.8, 2.0],
        rotationsDeg: [[0, 0, 0], [-15, 0, 35], [-10, 0, 25], [0, 0, 0]],
      },
      {
        bone: "rightUpperArm",
        times: [0, 0.3, 0.8, 2.0],
        rotationsDeg: [[0, 0, 0], [-15, 0, -35], [-10, 0, -25], [0, 0, 0]],
      },
    ],
  },

  angry: {
    duration: 2,
    bones: [
      {
        bone: "head",
        times: [0, 0.3, 0.8, 1.3, 2.0],
        rotationsDeg: [[0, 0, 0], [-12, 0, 0], [-8, 0, 0], [-12, 0, 0], [0, 0, 0]],
      },
      {
        bone: "spine",
        times: [0, 0.3, 1.0, 2.0],
        rotationsDeg: [[0, 0, 0], [-10, 0, 0], [-8, 0, 0], [0, 0, 0]],
      },
      {
        bone: "leftUpperArm",
        times: [0, 0.3, 1.2, 2.0],
        rotationsDeg: [[0, 0, 0], [-15, 20, -10], [-10, 15, -8], [0, 0, 0]],
      },
      {
        bone: "rightUpperArm",
        times: [0, 0.3, 1.2, 2.0],
        rotationsDeg: [[0, 0, 0], [-15, -20, 10], [-10, -15, 8], [0, 0, 0]],
      },
    ],
  },

  // F-011-010 (v3.0): 右手を顎へ運ぶ仕草を ARM_REST baseline から起動するよう修正
  // 左腕は rest で固定（下げたまま維持）、hips 軽い横揺れを追加（F-011-013）
  // F-011-015 (v3.0.2): 横揺れと腕の動きをゆっくりに。duration 3s → 6s に延長
  // F-011-016 (v3.0.3): hips を Y軸→Z軸に変更し、spine/chest にも Z 成分を追加
  // F-011-017 (v3.0.4): hips track を削除（下半身静止）。横揺れは spine/chest のみで表現
  thinking: {
    duration: 6,
    bones: [
      {
        bone: "head",
        times: [0, 1.6, 4.4, 6.0],
        rotationsDeg: [[0, 0, 0], [-10, -10, 12], [-8, -8, 10], [0, 0, 0]],
      },
      // spine Z 軸横揺れ（振幅 ±1.5°、上半身の揺れの主役）
      {
        bone: "spine",
        times: [0, 2.0, 4.0, 6.0],
        rotationsDeg: [[0, 0, 0], [0, 0, 1.5], [0, 0, -1.5], [0, 0, 0]],
      },
      // chest Z 軸横揺れ（spine に重ねてやや小さい振幅）
      {
        bone: "chest",
        times: [0, 2.0, 4.0, 6.0],
        rotationsDeg: [[0, 0, 0], [0, 0, 0.7], [0, 0, -0.7], [0, 0, 0]],
      },
      // 右腕: rest(Z=-72°) を起点に、顎へ運ぶ間だけ Z を上げて腕を体前方に持ち上げる
      // 中間キーの Z 合成値はモデル依存。VRM-A1 Mikoで顎付近に収まる値として採用（要実機微調整）
      {
        bone: "rightUpperArm",
        times: [0, 1.6, 4.4, 6.0],
        rotationsDeg: [
          [0, 0, ARM_REST_RIGHT_Z],
          [-60, -30, ARM_REST_RIGHT_Z + 32],
          [-55, -25, ARM_REST_RIGHT_Z + 37],
          [0, 0, ARM_REST_RIGHT_Z],
        ],
      },
      {
        bone: "rightLowerArm",
        times: [0, 1.6, 4.4, 6.0],
        rotationsDeg: [[0, 0, 0], [0, -90, 0], [0, -85, 0], [0, 0, 0]],
      },
      // 左腕は rest で固定（手を下げたまま）
      {
        bone: "leftUpperArm",
        times: [0, 6.0],
        rotationsDeg: [[0, 0, ARM_REST_LEFT_Z], [0, 0, ARM_REST_LEFT_Z]],
      },
    ],
  },

  present: {
    duration: 3,
    bones: [
      {
        bone: "leftUpperArm",
        times: [0, 1.0, 2.0, 3.0],
        rotationsDeg: [[0, 0, 0], [-20, 0, 60], [-15, 0, 55], [0, 0, 0]],
      },
      {
        bone: "rightUpperArm",
        times: [0, 1.0, 2.0, 3.0],
        rotationsDeg: [[0, 0, 0], [-20, 0, -60], [-15, 0, -55], [0, 0, 0]],
      },
      {
        bone: "spine",
        times: [0, 1.0, 2.0, 3.0],
        rotationsDeg: [[0, 0, 0], [5, 0, 0], [3, 0, 0], [0, 0, 0]],
      },
    ],
  },

  shoot: {
    duration: 2,
    bones: [
      {
        bone: "rightUpperArm",
        times: [0, 0.4, 0.7, 1.2, 2.0],
        rotationsDeg: [[0, 0, 0], [-70, 0, -50], [-65, 5, -55], [-70, 0, -50], [0, 0, 0]],
      },
      {
        bone: "rightLowerArm",
        times: [0, 0.4, 0.7, 2.0],
        rotationsDeg: [[0, 0, 0], [0, -30, 0], [0, -25, 0], [0, 0, 0]],
      },
      {
        bone: "spine",
        times: [0, 0.4, 1.2, 2.0],
        rotationsDeg: [[0, 0, 0], [0, -10, 0], [0, -8, 0], [0, 0, 0]],
      },
    ],
  },

  spin: {
    duration: 2,
    bones: [
      {
        bone: "hips",
        times: [0, 0.5, 1.0, 1.5, 2.0],
        rotationsDeg: [[0, 0, 0], [0, 90, 0], [0, 180, 0], [0, 270, 0], [0, 360, 0]],
      },
    ],
  },

  exercise: {
    duration: 2,
    bones: [
      {
        bone: "spine",
        times: [0, 0.5, 1.0, 1.5, 2.0],
        rotationsDeg: [[0, 0, 0], [-20, 0, 0], [0, 0, 0], [-20, 0, 0], [0, 0, 0]],
      },
      {
        bone: "leftUpperLeg",
        times: [0, 0.5, 1.0, 1.5, 2.0],
        rotationsDeg: [[0, 0, 0], [-40, 0, 0], [0, 0, 0], [-40, 0, 0], [0, 0, 0]],
      },
      {
        bone: "rightUpperLeg",
        times: [0, 0.5, 1.0, 1.5, 2.0],
        rotationsDeg: [[0, 0, 0], [-40, 0, 0], [0, 0, 0], [-40, 0, 0], [0, 0, 0]],
      },
    ],
  },
};

// --- 上書き対象の状態（VRMAがあってもプロシージャルクリップを優先） ---
// F-011-006: idle は procedural 版の hips 微横揺れが必須のため VRMA を上書き
// F-010: talking/thinking と 4 感情（happy/sad/surprised/angry）は会話演出用に
// procedural を用いる（手振り・頭動き等の表現が VRMA より豊か）
export const PROCEDURAL_OVERRIDE_STATES = new Set<string>([
  "idle",
  "talking",
  "thinking",
  "happy",
  "sad",
  "surprised",
  "angry",
]);

// --- メインエクスポート ---

/**
 * VRM モデルのボーン構造からプロシージャルアニメーションクリップを生成する。
 * 各クリップの `.name` は AnimationState 文字列と一致する。
 */
export function generateProceduralClips(vrm: VRM): THREE.AnimationClip[] {
  const clips: THREE.AnimationClip[] = [];

  for (const [stateName, def] of Object.entries(ANIMATION_DEFS)) {
    const clip = buildClip(stateName as AnimationState, def, vrm);
    if (clip) {
      clips.push(clip);
    }
  }

  return clips;
}
