# AI Speech — AI ロールプレイ会話システム

3Dアバター（VRM）と音声で対話できる、AIロールプレイ会話アプリケーションです。
ユーザーの発話を音声認識（STT）し、LLM が応答を生成、音声合成（TTS）とリップシンクで
アバターが自然に話します。シナリオやキャラクターを管理し、目的別の会話練習に利用できます。

---

## 主な機能

- 🗣️ **音声対話** — マイク入力を STT で文字化し、AI が応答、TTS で読み上げ
- 🧑‍🎤 **3Dアバター** — VRM モデルの表示・アニメーション・リップシンク（Three.js）
- 🧠 **AI 会話生成** — OpenAI (GPT-4o-mini) + LangChain による文脈を踏まえた応答
- 📋 **シナリオ管理** — 会話設定・ロールプレイシナリオの作成と切り替え
- 👤 **キャラクター管理** — アバターと人格設定の登録・編集
- 💾 **セッション管理** — Redis による会話状態の保持

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js / React / TypeScript / Three.js / shadcn/ui + Tailwind CSS |
| バックエンド | FastAPI / Python / LangChain / SQLAlchemy + Alembic |
| データストア | MySQL 8.0（マスタ） / Redis 7（セッション） |
| 外部サービス | OpenAI API / Azure Speech (STT・TTS・Viseme) / AWS S3（任意・モデル保管） |
| 実行環境 | Docker / Docker Compose |

---

## 必要要件

- [Docker](https://www.docker.com/) / Docker Compose v2
- 各種 API キー
  - **OpenAI API キー**（会話生成に必須）
  - **Azure Speech キー + リージョン**（音声認識・合成に必須）
  - AWS 認証情報（モデルを S3 に保管する場合のみ）

---

## セットアップ

```bash
# 1. リポジトリを取得
git clone <このリポジトリのURL>
cd ai_speech

# 2. 環境変数ファイルを作成し、API キーを設定
cp .env.example .env
#   → .env を開き、OPENAI_API_KEY / AZURE_SPEECH_KEY / AZURE_SPEECH_REGION などを入力

# 3. 起動（イメージのビルド + DB 含む一式を起動）
make up-build
```

起動後、以下にアクセスできます。

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:3000 |
| バックエンド API | http://localhost:8000 |
| API ドキュメント (Swagger) | http://localhost:8000/docs |

> **Note**: `.env` は `.gitignore` 済みで、リポジトリには含まれません。API キーなどの機密情報は必ず `.env` にのみ記載してください。

> **DB マイグレーション**: `make up` / `make up-build` では、バックエンド起動時に DB マイグレーション（`alembic upgrade head`）が自動適用されます。手動で再適用したい場合は `make migrate` を実行してください。
> なお、`make up` / `make up-build`（ローカル DB）では `.env` の `DB_HOST=db` を、`make up-no-db`（外部 DB 接続）では外部 DB のコンテナ名（例: `ai_speech-db-1`）を設定します。

---

## 使い方

1. ブラウザで http://localhost:3000 を開く
2. シナリオ／キャラクターを選択（または新規作成）
3. マイクの使用を許可し、話しかける
4. アバターが音声で応答します

---

## よく使うコマンド

Docker 経由の操作は `Makefile` にまとめています。

```bash
make up            # 開発環境を起動（DB 含む）
make up-build      # ビルドしてから起動
make down          # 停止
make logs          # ログを確認（make logs-backend / logs-frontend も可）
make rebuild       # キャッシュなしで完全再ビルド
make migrate       # DB マイグレーション適用（alembic upgrade head）
make clean         # コンテナ・イメージ削除（永続データは残す）
make reset-data    # 永続データ（DB/Redis/アップロード）も含め完全消去
```

### テスト / Lint

```bash
make test-backend                    # バックエンド（pytest）
make test-frontend                   # フロントエンド（jest）
cd frontend && npx playwright test   # E2E（Playwright）
cd backend  && ruff check .          # Python Lint
cd frontend && npm run lint          # ESLint
```

---

## 環境変数

`.env.example` をテンプレートとしてコピーし、`.env` に値を設定します。主な項目は次のとおりです。

| 変数 | 説明 | 必須 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI API キー（会話生成） | ✅ |
| `AZURE_SPEECH_KEY` | Azure Speech キー（STT/TTS） | ✅ |
| `AZURE_SPEECH_REGION` | Azure Speech のリージョン | ✅ |
| `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | MySQL 接続情報 | ✅ |
| `MYSQL_ROOT_PASSWORD` | MySQL root パスワード | ✅ |
| `STORAGE_BACKEND` | モデル保管先（`local` / `s3`、既定 `local`） | – |
| `S3_BUCKET_NAME` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | S3 利用時のみ | – |
| `FRONTEND_PORT` / `BACKEND_PORT` / `MYSQL_PORT` / `REDIS_PORT` | 各サービスの公開ポート（既定 3000/8000/3306/6379） | – |

---

## ディレクトリ構成

```
ai_speech/
├── frontend/          # Next.js フロントエンド
├── backend/           # FastAPI バックエンド
├── docker/            # Dockerfile・永続データ（bind mount）
├── docs/              # 設計・要件ドキュメント
├── docker-compose.yml
├── Makefile
└── .env.example       # 環境変数テンプレート
```

---

## ライセンス

本リポジトリのライセンスは [LICENSE](LICENSE) を参照してください。
