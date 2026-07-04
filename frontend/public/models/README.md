# 3Dモデルファイル配置ガイド

このディレクトリには、VRM/GLB形式の3Dモデルファイルを配置します。

## サポートされるファイル形式

- **VRM (.vrm)**: VRoid Hub などで作成されたアバターモデル
- **GLB (.glb)**: GLTF 2.0 バイナリ形式の汎用3Dモデル

## サンプルモデルの取得方法

### VRoid Hub からダウンロード

1. [VRoid Hub](https://hub.vroid.com/) にアクセス
2. 「ダウンロード可能」フィルターを適用
3. 利用規約を確認し、商用利用可能なモデルを選択
4. VRMファイルをダウンロード
5. このディレクトリに配置

### 推奨サンプルモデル

- **VRoid Hub 公式サンプル**
  - https://hub.vroid.com/characters/286598187372732577/models/6537798989836305045

### 注意事項

- ファイルサイズは10MB以下を推奨（パフォーマンス最適化のため）
- モデルの利用規約を必ず確認してください
- 商用利用の可否、改変の可否、クレジット表記の必要性などを確認
- このプロジェクトはAIロープレ会話システムのため、キャラクターモデルが適しています

## 配置例

```
frontend/public/models/
├── README.md           # このファイル
├── hanako.vrm          # キャラクター「花子」のモデル
├── taro.vrm            # キャラクター「太郎」のモデル
└── robot.glb           # ロボットキャラクターのモデル
```

## アニメーション（モーション）ファイル

アバターの動作には VRMA 形式のモーションファイルを使用します。
`motion/` ディレクトリに配置してください。**モーションファイルはリポジトリに含まれません。**
利用者が各自のライセンスで用意し、下記のパスに配置する前提です。

コードが参照するデフォルトパスと感情/状態の対応は次のとおりです（`frontend/src/lib/three/animation-constants.ts`）。

| 状態 | パス |
|------|------|
| present | `/models/motion/VRMA_01.vrma` |
| greeting / talking | `/models/motion/VRMA_02.vrma` |
| happy / surprised | `/models/motion/VRMA_03.vrma` |
| shoot / angry | `/models/motion/VRMA_04.vrma` |
| spin | `/models/motion/VRMA_05.vrma` |
| idle / sad / thinking | `/models/motion/VRMA_06.vrma` |
| exercise | `/models/motion/VRMA_07.vrma` |

> 別のファイル名を使う場合は、`characters` テーブルの `animation_config`、
> または `animation-constants.ts` のパス定義を変更してください。
> 各モーションデータの利用規約（商用可否・クレジット表記など）は必ず確認してください。

## データベース設定

モデルファイルを配置したら、`characters` テーブルの `model_path` と `model_type` を更新してください。

```sql
UPDATE characters
SET model_path = '/models/hanako.vrm',
    model_type = 'vrm'
WHERE id = 1;
```

## ファイル命名規則

- 小文字・数字・ハイフンのみ使用
- スペースや日本語は使用しない
- 例: `character-hanako.vrm`, `robot-01.glb`

## 静的ファイル配信

このディレクトリのファイルは Next.js の静的ファイル配信により、以下のURLでアクセス可能です:

```
frontend/public/models/hanako.vrm
↓
https://example.com/models/hanako.vrm
```

CDNキャッシュにより高速配信が可能です。
