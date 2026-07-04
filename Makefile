.PHONY: up up-no-db up-no-db-build down build rebuild logs clean reset-data ensure-network

# Docker Compose コマンド（v2対応）
DOCKER_COMPOSE := docker compose

# 外部ネットワークが存在しない場合は作成
ensure-network:
	@docker network inspect shared_db_network >/dev/null 2>&1 || docker network create shared_db_network

# 開発環境の起動（DB含む）
up: ensure-network
	$(DOCKER_COMPOSE) --profile with-db up -d

# 開発環境の起動（DB含む、ビルド付き）
up-build: ensure-network
	$(DOCKER_COMPOSE) --profile with-db up -d --build

# 開発環境の起動（DB以外 - 外部DBに接続）
up-no-db: ensure-network
	$(DOCKER_COMPOSE) up -d

# 開発環境の起動（DB以外、ビルド付き）
up-no-db-build: ensure-network
	$(DOCKER_COMPOSE) up -d --build

# 開発環境の停止
down:
	$(DOCKER_COMPOSE) down

# イメージのビルド
build:
	$(DOCKER_COMPOSE) build

# イメージの完全再ビルド（キャッシュなし）
rebuild:
	$(DOCKER_COMPOSE) build --no-cache

# ログの確認
logs:
	$(DOCKER_COMPOSE) logs -f

# 特定サービスのログ
logs-frontend:
	$(DOCKER_COMPOSE) logs -f frontend

logs-backend:
	$(DOCKER_COMPOSE) logs -f backend

logs-db:
	$(DOCKER_COMPOSE) logs -f db

# コンテナ内でコマンド実行
backend-shell:
	$(DOCKER_COMPOSE) exec backend bash

frontend-shell:
	$(DOCKER_COMPOSE) exec frontend sh

# テスト実行
test-backend:
	$(DOCKER_COMPOSE) exec backend pytest

test-frontend:
	$(DOCKER_COMPOSE) exec frontend npm test

# マイグレーション
migrate:
	$(DOCKER_COMPOSE) exec backend alembic upgrade head

migrate-create:
	$(DOCKER_COMPOSE) exec backend alembic revision --autogenerate -m "$(m)"

# クリーンアップ（コンテナ・イメージのみ削除。永続データは docker/ 配下に残る）
clean:
	$(DOCKER_COMPOSE) down --rmi local

# 永続データも含めた完全消去（DB・Redis・アップロードを全削除）
reset-data:
	$(DOCKER_COMPOSE) down
	rm -rf docker/mysql/data/* docker/redis/data/* docker/uploads/*
