#!/bin/sh
set -e

# DB が起動するまで alembic upgrade をリトライ
# （db は外部ネットワーク上にいて depends_on の healthcheck 待ちができないため）
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "[entrypoint] Waiting for database and applying migrations..."
i=1
while [ "$i" -le "$MAX_RETRIES" ]; do
  if alembic upgrade head; then
    echo "[entrypoint] Migrations applied successfully."
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "[entrypoint] Database not reachable after $MAX_RETRIES attempts. Aborting."
    exit 1
  fi
  echo "[entrypoint] DB not ready (attempt $i/$MAX_RETRIES). Retrying in ${RETRY_INTERVAL}s..."
  i=$((i + 1))
  sleep "$RETRY_INTERVAL"
done

echo "[entrypoint] Starting application: $*"
exec "$@"
