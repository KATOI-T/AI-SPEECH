# アーキテクチャ

AI Speech は、3Dアバターと音声で対話する AI ロールプレイ会話システムです。
本ドキュメントはシステム全体の構成を要約します。

## システム構成

```
┌───────────────────────────────────────────────┐
│  クライアント（Next.js + React）               │
│   3Dビューア(Three.js) / 音声入出力(Web Audio) │
│   / 管理画面(shadcn/ui)                        │
└───────────────────────┬───────────────────────┘
                        │ HTTP / REST
┌───────────────────────▼───────────────────────┐
│  サーバー（FastAPI）                           │
│   会話API / 音声API / シナリオAPI / キャラAPI  │
│   サービス層: LLM / STT / TTS / Session        │
└──────┬───────────────┬───────────────┬─────────┘
       │               │               │
   ┌───▼───┐      ┌────▼────┐    ┌─────▼──────┐
   │ MySQL │      │  Redis  │    │ 外部サービス │
   │(マスタ)│      │(セッション)│  │ OpenAI /   │
   └───────┘      └─────────┘    │ Azure Speech│
                                 └────────────┘
```

## コンポーネント

| レイヤー | 主な責務 | 技術 |
|---------|---------|------|
| フロントエンド | アバター描画、音声入出力、UI | Next.js / React / TypeScript / Three.js(VRM) / shadcn/ui + Tailwind |
| バックエンド | API 提供、会話・音声処理 | FastAPI / Python / LangChain |
| サービス層 | LLM・STT・TTS・セッション制御を抽象化 | LLMService / STTService / TTSService / SessionService |
| 永続化 | シナリオ・キャラクター等のマスタ | MySQL 8.0 + SQLAlchemy / Alembic |
| セッション | 会話状態・履歴の一時保持 | Redis 7 |
| 外部サービス | 会話生成・音声認識/合成 | OpenAI (GPT-4o-mini) / Azure Speech（AWS Polly 代替可） |

## API 一覧

| 分類 | メソッド | エンドポイント | 説明 |
|------|---------|---------------|------|
| 会話 | POST | `/api/v1/chat/sessions` | セッション開始 |
| 会話 | POST | `/api/v1/chat/sessions/{id}/messages` | メッセージ送信 |
| 会話 | DELETE | `/api/v1/chat/sessions/{id}` | セッション終了 |
| 音声 | POST | `/api/v1/speech/recognize` | 音声認識（STT） |
| 音声 | POST | `/api/v1/speech/synthesize` | 音声合成（TTS） |
| 音声 | GET | `/api/v1/speech/providers` | 利用可能プロバイダー一覧 |
| シナリオ | GET/POST/PUT/DELETE | `/api/v1/scenarios[/{id}]` | シナリオ CRUD |
| キャラクター | GET/POST/PUT/DELETE | `/api/v1/characters[/{id}]` | キャラクター CRUD |
| キャラクター | POST | `/api/v1/characters/upload-model` | 3Dモデルアップロード |

> API の詳細スキーマは起動後の Swagger UI（`http://localhost:8000/docs`）で確認できます。

## 画面一覧

| 画面 | URL | 説明 |
|------|-----|------|
| ロープレ画面 | `/` | メイン会話画面（アバター + 音声対話） |
| シナリオ選択 | `/select` | シナリオ・キャラクター選択 |
| シナリオ管理 | `/admin/scenarios` | シナリオ CRUD |
| キャラクター管理 | `/admin/characters` | キャラクター CRUD |

## 会話データフロー

1. ユーザーの発話をマイクで取得し `/speech/recognize`（STT）で文字化
2. `/chat/sessions/{id}/messages` にテキストを送信
3. バックエンドが会話履歴（Redis）を踏まえて LLM で応答と感情を生成
4. `/speech/synthesize`（TTS）で音声と Viseme（口形素）を生成
5. フロントエンドが音声を再生し、Viseme を BlendShape に変換してリップシンク・感情アニメーションを反映

## 音声・3D 設計の要点

- **音声プロバイダー抽象化**: STT/TTS は共通インターフェースで抽象化し、Azure Speech を標準、AWS/Google を代替として切替可能
- **リップシンク**: Azure の Viseme を VRM の BlendShape にマッピングして口の動きを同期
- **アニメーション**: LLM が返す感情（neutral/happy/sad/surprised/angry）を複数レイヤーで合成し自然な動きを生成

## セキュリティ・インフラ

- API キー等の機密情報は環境変数（`.env`）で管理し、リポジトリには含めない
- Docker Compose で frontend / backend / MySQL / Redis を一括起動
- モデルアップロードはローカル保存、または S3（任意）に切替可能
