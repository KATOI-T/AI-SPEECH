# Three.js Animation System

F-003: アニメーション機能の実装

## ファイル構成

```
frontend/src/
├── lib/three/
│   ├── animation-controller.ts  # AnimationController クラス
│   ├── types.ts                 # Three.js関連の型定義
│   └── README.md                # このファイル
├── hooks/
│   └── useAnimation.ts          # アニメーション管理フック
├── components/three/
│   └── VRMViewer.tsx            # VRMビューア（アニメーション統合済み）
└── app/test/animation/
    └── page.tsx                 # アニメーションテストページ
```

## 使い方

### 1. AnimationController クラス

VRMモデルのアニメーションを制御するクラスです。

```typescript
import { AnimationController } from "@/lib/three/animation-controller";

const controller = new AnimationController({
  defaultState: "idle",
  blendDuration: 0.3,
  loopStates: ["idle", "talking"],
});

// VRMモデルとアニメーション設定で初期化
controller.initialize(vrm, animationConfig);

// 状態を変更（クロスフェード付き）
controller.setState("happy");

// 毎フレーム更新（アニメーションループ内で呼び出す）
controller.update(deltaTime);

// リソース破棄
controller.dispose();
```

### 2. useAnimation フック

Reactコンポーネントでアニメーションを管理するフックです。

```typescript
import { useAnimation } from "@/hooks/useAnimation";

const { currentState, setState, availableStates, isInitialized } = useAnimation(
  vrmInstance,
  {
    animationConfig: {
      idle: "idle_01",
      talking: "talking_01",
      happy: "happy_01",
      sad: "sad_01",
    },
    defaultState: "idle",
    blendDuration: 0.3,
    loopStates: ["idle", "talking"],
    onStateChange: (state) => {
      console.log("State changed:", state);
    },
  }
);

// ボタンクリックで状態変更
<Button onClick={() => setState("happy")}>Happy</Button>
```

### 3. VRMViewer コンポーネント

アニメーション機能統合済みのVRMビューアです。

```typescript
import { VRMViewer } from "@/components/three/VRMViewer";

<VRMViewer
  modelPath="/models/character.vrm"
  modelType="vrm"
  animationConfig={{
    idle: "idle_01",
    talking: "talking_01",
    happy: "happy_01",
    sad: "sad_01",
  }}
  initialAnimationState="idle"
  onLoad={(vrm) => console.log("Loaded:", vrm)}
  onError={(error) => console.error("Error:", error)}
/>
```

## アニメーション設定

### AnimationConfig

```typescript
export interface AnimationConfig {
  idle: string;      // 待機アニメーションクリップ名
  talking: string;   // 会話中アニメーションクリップ名
  happy: string;     // 喜びアニメーションクリップ名
  sad: string;       // 悲しみアニメーションクリップ名
  surprised?: string; // 驚きアニメーションクリップ名（オプション）
}
```

### AnimationState

```typescript
export type AnimationState = "idle" | "talking" | "happy" | "sad" | "surprised";
```

## 機能詳細

### クロスフェード

状態遷移時に自動的にクロスフェードアニメーションが適用されます。
デフォルトのブレンド時間は0.3秒で、カスタマイズ可能です。

```typescript
const controller = new AnimationController({
  blendDuration: 0.5, // 0.5秒でクロスフェード
});
```

### ループ制御

**デフォルトの動作（v2.0+）**:
- **全アニメーション状態がループ**: idle, greeting, happy, sad, surprised, angry, thinking, talking, present, shoot, spin, exercise
- ユーザーが選択したアニメーションは、別のアニメーションを選択するまで継続再生されます
- これにより、キャラクタープレビューでユーザーの意図した状態が維持されます

```typescript
// デフォルト: 全アニメーションがループ
const controller = new AnimationController({
  // loopStates はデフォルトで全状態を含む
});
```

**旧動作（ワンショットアニメーション）への切り替え**:

一部のアニメーションを再生後にidleに戻したい場合は、`enableAutoReturnToIdle` と `loopStates` を設定します。

```typescript
const controller = new AnimationController({
  loopStates: ["idle", "talking"], // これらのみループ
  enableAutoReturnToIdle: true,    // 非ループアニメーション終了時にidleへ戻る
});
// → happy, sad などは再生完了後に自動的にidleに戻る
```

### エラーハンドリング

アニメーションクリップが見つからない場合でも graceful degradation します。

```typescript
// VRMファイルに対応するクリップがない場合
// → 警告をログ出力し、そのアニメーションはスキップ
controller.setState("happy"); // クリップがない場合はidleのまま
```

## テストページ

`/test/animation` でアニメーション機能をテストできます。

アクセス: http://localhost:3000/test/animation

機能:
- モデルの読み込み状態表示
- アニメーション状態の切り替え
- 利用可能な状態の一覧表示
- VRM情報のデバッグ表示

## 実装のポイント

1. **Three.js AnimationMixer を使用**
   - VRMのアニメーションクリップを管理
   - クロスフェードによる滑らかな遷移

2. **状態管理**
   - AnimationState型で型安全に状態を管理
   - AnimationConfigでクリップ名をマッピング

3. **ライフサイクル管理**
   - Reactのクリーンアップでリソースを適切に破棄
   - メモリリークを防止

4. **拡張性**
   - 新しい状態を追加しやすい設計
   - animation_configで柔軟に設定可能

## 今後の拡張

- [ ] リップシンク機能との統合（F-002）
- [ ] 感情に応じた自動状態遷移
- [ ] カスタムアニメーションクリップの動的読み込み
- [ ] アニメーションブレンドの高度な制御
- [ ] パフォーマンス最適化（LOD対応）
