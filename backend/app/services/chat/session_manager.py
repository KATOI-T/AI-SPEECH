"""会話セッション管理"""

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import redis.asyncio as redis

from app.core.config import get_settings
from app.core.exceptions import (
    InvalidStateTransitionError,
    SessionError,
    SessionErrorCode,
    SessionNotFoundError,
)

logger = logging.getLogger(__name__)


class SessionManager:
    """会話セッション管理"""

    KEY_PREFIX = "chat:session:"
    MAX_HISTORY_TURNS = 10  # 最大10ターン(20メッセージ)
    MAX_EXTENSIONS = 3  # 最大延長回数
    PAUSED_TTL_MINUTES = 60  # 一時停止時のTTL

    # 状態遷移の許可マップ
    ALLOWED_TRANSITIONS = {
        "active": ["paused", "ended"],
        "paused": ["active", "ended"],
        "ended": [],
        "expired": [],
    }

    def __init__(self, redis_client: redis.Redis) -> None:
        self._redis = redis_client
        self._settings = get_settings()

    async def create_session(
        self, scenario_id: int, character_id: int, system_prompt: str
    ) -> dict[str, Any]:
        """
        新しいセッションを作成

        Args:
            scenario_id: シナリオID
            character_id: キャラクターID
            system_prompt: システムプロンプト

        Returns:
            dict[str, Any]: セッションデータ
        """
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        ttl = self._settings.session_timeout_minutes * 60

        session_data = {
            "session_id": session_id,
            "scenario_id": scenario_id,
            "character_id": character_id,
            "status": "active",
            "system_prompt": system_prompt,
            "conversation_history": [],
            "turn_count": 0,
            "created_at": now.isoformat(),
            "last_activity_at": now.isoformat(),
            "expires_at": (now + timedelta(seconds=ttl)).isoformat(),
            "paused_at": None,
            "extension_count": 0,
        }

        key = f"{self.KEY_PREFIX}{session_id}"
        await self._redis.setex(key, ttl, json.dumps(session_data))

        logger.info(f"Session created: {session_id}, TTL: {ttl}s")
        return session_data

    async def get_session(self, session_id: str) -> dict[str, Any] | None:
        """
        セッションを取得

        Args:
            session_id: セッションID

        Returns:
            dict[str, Any] | None: セッションデータ、存在しない場合はNone
        """
        key = f"{self.KEY_PREFIX}{session_id}"
        data = await self._redis.get(key)
        if data:
            return json.loads(data)
        return None

    async def add_message(
        self, session_id: str, role: str, content: str
    ) -> dict[str, Any] | None:
        """
        メッセージを追加

        Args:
            session_id: セッションID
            role: メッセージロール(user/assistant)
            content: メッセージ内容

        Returns:
            dict[str, Any] | None: 更新されたセッションデータ、存在しない場合はNone
        """
        session = await self.get_session(session_id)
        if not session:
            logger.warning(f"Session not found: {session_id}")
            return None

        now = datetime.now(timezone.utc)
        message = {"role": role, "content": content, "timestamp": now.isoformat()}

        session["conversation_history"].append(message)

        # ターンカウント更新(user + assistant で1ターン)
        if role == "assistant":
            session["turn_count"] += 1

        # 履歴制限
        max_messages = self.MAX_HISTORY_TURNS * 2
        if len(session["conversation_history"]) > max_messages:
            session["conversation_history"] = session["conversation_history"][
                -max_messages:
            ]

        session["last_activity_at"] = now.isoformat()

        # TTL更新して保存
        key = f"{self.KEY_PREFIX}{session_id}"
        ttl = self._settings.session_timeout_minutes * 60
        await self._redis.setex(key, ttl, json.dumps(session))

        logger.info(
            f"Message added to session {session_id}: role={role}, "
            f"turn_count={session['turn_count']}"
        )
        return session

    async def end_session(self, session_id: str) -> dict[str, Any] | None:
        """
        セッションを終了

        Args:
            session_id: セッションID

        Returns:
            dict[str, Any] | None: 終了情報、存在しない場合はNone
        """
        session = await self.get_session(session_id)
        if not session:
            logger.warning(f"Session not found for end: {session_id}")
            return None

        now = datetime.now(timezone.utc)
        created_at = datetime.fromisoformat(session["created_at"])
        duration = int((now - created_at).total_seconds())

        result = {
            "session_id": session_id,
            "status": "ended",
            "total_turns": session["turn_count"],
            "duration_seconds": duration,
            "ended_at": now.isoformat(),
        }

        # セッション削除
        key = f"{self.KEY_PREFIX}{session_id}"
        await self._redis.delete(key)

        logger.info(
            f"Session ended: {session_id}, turns={result['total_turns']}, "
            f"duration={duration}s"
        )
        return result

    async def get_conversation_history(
        self, session_id: str
    ) -> list[dict[str, str]]:
        """
        会話履歴を取得

        Args:
            session_id: セッションID

        Returns:
            list[dict[str, str]]: 会話履歴(role, contentのみ)
        """
        session = await self.get_session(session_id)
        if not session:
            return []

        return [
            {"role": msg["role"], "content": msg["content"]}
            for msg in session["conversation_history"]
        ]

    async def pause_session(self, session_id: str) -> dict[str, Any]:
        """
        セッションを一時停止

        Args:
            session_id: セッションID

        Returns:
            一時停止されたセッション情報

        Raises:
            SessionNotFoundError: セッションが見つからない
            InvalidStateTransitionError: 一時停止できない状態
        """
        session = await self.get_session(session_id)
        if not session:
            raise SessionNotFoundError(session_id)

        if session["status"] != "active":
            raise InvalidStateTransitionError(session["status"], "paused")

        now = datetime.now(timezone.utc)
        ttl = self.PAUSED_TTL_MINUTES * 60

        session["status"] = "paused"
        session["paused_at"] = now.isoformat()
        session["last_activity_at"] = now.isoformat()
        session["expires_at"] = (now + timedelta(seconds=ttl)).isoformat()

        key = f"{self.KEY_PREFIX}{session_id}"
        await self._redis.setex(key, ttl, json.dumps(session))

        logger.info(f"Session paused: {session_id}")
        return session

    async def resume_session(self, session_id: str) -> dict[str, Any]:
        """
        セッションを再開

        Args:
            session_id: セッションID

        Returns:
            再開されたセッション情報

        Raises:
            SessionNotFoundError: セッションが見つからない
            InvalidStateTransitionError: 再開できない状態
        """
        session = await self.get_session(session_id)
        if not session:
            raise SessionNotFoundError(session_id)

        if session["status"] != "paused":
            raise InvalidStateTransitionError(session["status"], "active")

        now = datetime.now(timezone.utc)
        ttl = self._settings.session_timeout_minutes * 60

        session["status"] = "active"
        session["paused_at"] = None
        session["last_activity_at"] = now.isoformat()
        session["expires_at"] = (now + timedelta(seconds=ttl)).isoformat()

        key = f"{self.KEY_PREFIX}{session_id}"
        await self._redis.setex(key, ttl, json.dumps(session))

        logger.info(f"Session resumed: {session_id}")
        return session

    async def extend_session(
        self, session_id: str, extension_minutes: int = 30
    ) -> dict[str, Any]:
        """
        セッションを延長

        Args:
            session_id: セッションID
            extension_minutes: 延長時間（分）

        Returns:
            延長されたセッション情報

        Raises:
            SessionNotFoundError: セッションが見つからない
            InvalidStateTransitionError: 延長できない状態
            SessionError: 最大延長回数超過
        """
        session = await self.get_session(session_id)
        if not session:
            raise SessionNotFoundError(session_id)

        if session["status"] not in ["active", "paused"]:
            raise InvalidStateTransitionError(session["status"], "extended")

        # 延長回数チェック
        extension_count = session.get("extension_count", 0)
        if extension_count >= self.MAX_EXTENSIONS:
            raise SessionError(
                code=SessionErrorCode.MAX_EXTENSIONS_REACHED,
                message="Maximum extensions reached",
                detail=f"セッションは最大{self.MAX_EXTENSIONS}回まで延長できます。",
            )

        now = datetime.now(timezone.utc)
        previous_expires_at = session["expires_at"]
        new_expires_at = now + timedelta(minutes=extension_minutes)
        ttl = int((new_expires_at - now).total_seconds())

        session["expires_at"] = new_expires_at.isoformat()
        session["last_activity_at"] = now.isoformat()
        session["extension_count"] = extension_count + 1

        key = f"{self.KEY_PREFIX}{session_id}"
        await self._redis.setex(key, ttl, json.dumps(session))

        logger.info(
            f"Session extended: {session_id}, "
            f"+{extension_minutes}min, count={extension_count + 1}"
        )

        return {
            **session,
            "previous_expires_at": previous_expires_at,
            "extended_minutes": extension_minutes,
        }

    async def get_session_info(self, session_id: str) -> dict[str, Any]:
        """
        セッション情報を取得（残り時間計算付き）

        Args:
            session_id: セッションID

        Returns:
            セッション情報

        Raises:
            SessionNotFoundError: セッションが見つからない
        """
        session = await self.get_session(session_id)
        if not session:
            raise SessionNotFoundError(session_id)

        now = datetime.now(timezone.utc)
        expires_at = datetime.fromisoformat(session["expires_at"])
        remaining_seconds = max(0, int((expires_at - now).total_seconds()))

        extension_count = session.get("extension_count", 0)
        can_extend = (
            session["status"] in ["active", "paused"]
            and extension_count < self.MAX_EXTENSIONS
        )

        return {
            **session,
            "remaining_seconds": remaining_seconds,
            "can_extend": can_extend,
        }

    async def update_message(
        self, session_id: str, message_index: int, content: str
    ) -> dict[str, Any] | None:
        """
        メッセージを更新

        Args:
            session_id: セッションID
            message_index: 会話履歴内のメッセージインデックス
            content: 新しいメッセージ内容

        Returns:
            dict[str, Any] | None: 更新されたメッセージ情報、存在しない場合はNone

        Raises:
            SessionNotFoundError: セッションが見つからない
            ValueError: メッセージが見つからない、またはユーザーメッセージでない
        """
        session = await self.get_session(session_id)
        if not session:
            raise SessionNotFoundError(session_id)

        history = session.get("conversation_history", [])
        if message_index < 0 or message_index >= len(history):
            raise ValueError(f"Message not found at index: {message_index}")

        message = history[message_index]
        if message["role"] != "user":
            raise ValueError("Only user messages can be edited")

        now = datetime.now(timezone.utc)
        history[message_index]["content"] = content
        history[message_index]["updated_at"] = now.isoformat()
        session["conversation_history"] = history
        session["last_activity_at"] = now.isoformat()

        # TTL更新して保存
        key = f"{self.KEY_PREFIX}{session_id}"
        ttl = self._settings.session_timeout_minutes * 60
        await self._redis.setex(key, ttl, json.dumps(session))

        logger.info(f"Message updated in session {session_id}: index={message_index}")
        return {
            "message_index": message_index,
            "content": content,
            "updated_at": now.isoformat(),
        }
