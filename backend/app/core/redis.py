"""Redisクライアント"""

import redis.asyncio as redis

from app.core.config import get_settings


class RedisClient:
    """Redisクライアントラッパー"""

    def __init__(self) -> None:
        self._client: redis.Redis | None = None

    async def connect(self) -> None:
        """Redisサーバーに接続"""
        settings = get_settings()
        self._client = redis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True
        )

    async def disconnect(self) -> None:
        """Redisサーバーから切断"""
        if self._client:
            await self._client.close()

    @property
    def client(self) -> redis.Redis:
        """Redisクライアントを取得"""
        if not self._client:
            raise RuntimeError("Redis not connected")
        return self._client


redis_client = RedisClient()


async def get_redis() -> redis.Redis:
    """FastAPI依存性注入用"""
    return redis_client.client
