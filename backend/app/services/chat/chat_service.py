"""チャットサービス"""

import base64
import logging
import uuid
from datetime import datetime, timezone

import redis.asyncio as redis
from sqlalchemy.orm import Session

from app.models.character import Character
from app.models.scenario import Scenario
from app.repositories.character_repository import CharacterRepository
from app.repositories.scenario_repository import ScenarioRepository
from app.schemas.chat import (
    AIResponse,
    ChatMessageResponse,
    ChatSessionEndResponse,
    ChatSessionInfoResponse,
    ChatSessionResponse,
    InitialMessage,
    UserMessage,
    Viseme,
)
from app.services.chat.session_manager import SessionManager
from app.services.llm import get_llm_service
from app.services.speech import get_tts_service

logger = logging.getLogger(__name__)


class ChatService:
    """チャットサービス"""

    def __init__(self, db: Session, redis_client: redis.Redis) -> None:
        self._db = db
        self._session_manager = SessionManager(redis_client)
        self._llm_service = get_llm_service()
        self._scenario_repo = ScenarioRepository(db)
        self._character_repo = CharacterRepository(db)

    async def create_session(
        self, scenario_id: int, character_id: int
    ) -> ChatSessionResponse:
        """
        新しいセッションを作成

        Args:
            scenario_id: シナリオID
            character_id: キャラクターID

        Returns:
            ChatSessionResponse: セッション情報

        Raises:
            ValueError: シナリオまたはキャラクターが見つからない場合
        """
        # シナリオ・キャラクター取得
        scenario = self._scenario_repo.get_by_id(scenario_id)
        if not scenario:
            raise ValueError(f"Scenario not found: {scenario_id}")

        character = self._character_repo.get_by_id(character_id)
        if not character:
            raise ValueError(f"Character not found: {character_id}")

        # システムプロンプト構築
        system_prompt = self._build_system_prompt(scenario, character)

        # セッション作成
        session_data = await self._session_manager.create_session(
            scenario_id=scenario_id,
            character_id=character_id,
            system_prompt=system_prompt,
        )

        # 初期メッセージ生成
        llm_response = await self._llm_service.generate_initial_message(system_prompt)

        # TTS合成
        tts_result = await self._synthesize_speech(
            llm_response["content"], character.voice_config
        )

        # 初期メッセージを履歴に追加
        await self._session_manager.add_message(
            session_data["session_id"], "assistant", llm_response["content"]
        )

        return ChatSessionResponse(
            session_id=session_data["session_id"],
            scenario=scenario,
            character=character,
            initial_message=InitialMessage(
                content=llm_response["content"],
                emotion=llm_response["emotion"],
                audio_base64=tts_result["audio_base64"],
                visemes=[Viseme(**v) for v in tts_result["visemes"]],
            ),
            created_at=datetime.fromisoformat(session_data["created_at"]),
            expires_at=datetime.fromisoformat(session_data["expires_at"]),
        )

    async def send_message(
        self, session_id: str, content: str
    ) -> ChatMessageResponse:
        """
        メッセージを送信してAI応答を取得

        Args:
            session_id: セッションID
            content: ユーザーメッセージ

        Returns:
            ChatMessageResponse: AI応答

        Raises:
            ValueError: セッションが見つからない場合
        """
        # セッション取得
        session = await self._session_manager.get_session(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        # ユーザーメッセージを履歴に追加
        await self._session_manager.add_message(session_id, "user", content)

        # 会話履歴取得
        history = await self._session_manager.get_conversation_history(session_id)

        # LLM応答生成
        llm_response = await self._llm_service.generate_response(
            system_prompt=session["system_prompt"],
            messages=history[:-1],  # 最後のユーザーメッセージは除く
            user_input=content,
        )

        # アシスタントメッセージを履歴に追加
        updated_session = await self._session_manager.add_message(
            session_id, "assistant", llm_response["content"]
        )

        # キャラクター取得してTTS合成
        character = self._character_repo.get_by_id(session["character_id"])
        tts_result = await self._synthesize_speech(
            llm_response["content"], character.voice_config if character else None
        )

        now = datetime.now(timezone.utc)

        return ChatMessageResponse(
            message_id=str(uuid.uuid4()),
            user_message=UserMessage(content=content, timestamp=now),
            response=AIResponse(
                content=llm_response["content"],
                emotion=llm_response["emotion"],
                audio_base64=tts_result["audio_base64"],
                visemes=[Viseme(**v) for v in tts_result["visemes"]],
            ),
            turn_count=updated_session["turn_count"] if updated_session else 0,
            timestamp=now,
        )

    async def end_session(self, session_id: str) -> ChatSessionEndResponse:
        """
        セッションを終了

        Args:
            session_id: セッションID

        Returns:
            ChatSessionEndResponse: 終了情報

        Raises:
            ValueError: セッションが見つからない場合
        """
        result = await self._session_manager.end_session(session_id)
        if not result:
            raise ValueError(f"Session not found: {session_id}")

        return ChatSessionEndResponse(
            session_id=result["session_id"],
            status="ended",
            total_turns=result["total_turns"],
            duration_seconds=result["duration_seconds"],
            ended_at=datetime.fromisoformat(result["ended_at"]),
        )

    async def get_session_info(self, session_id: str) -> ChatSessionInfoResponse:
        """
        セッション情報を取得

        Args:
            session_id: セッションID

        Returns:
            ChatSessionInfoResponse: セッション情報

        Raises:
            ValueError: セッションが見つからない場合
        """
        session_info = await self._session_manager.get_session_info(session_id)

        return ChatSessionInfoResponse(
            session_id=session_info["session_id"],
            scenario_id=session_info["scenario_id"],
            character_id=session_info["character_id"],
            status=session_info["status"],
            turn_count=session_info["turn_count"],
            created_at=datetime.fromisoformat(session_info["created_at"]),
            expires_at=datetime.fromisoformat(session_info["expires_at"]),
            last_activity_at=datetime.fromisoformat(session_info["last_activity_at"]),
            paused_at=(
                datetime.fromisoformat(session_info["paused_at"])
                if session_info.get("paused_at")
                else None
            ),
            remaining_seconds=session_info["remaining_seconds"],
            can_extend=session_info["can_extend"],
        )

    async def pause_session(self, session_id: str) -> dict:
        """
        セッションを一時停止

        Args:
            session_id: セッションID

        Returns:
            dict: 一時停止されたセッション情報
        """
        return await self._session_manager.pause_session(session_id)

    async def resume_session(self, session_id: str) -> dict:
        """
        セッションを再開

        Args:
            session_id: セッションID

        Returns:
            dict: 再開されたセッション情報
        """
        return await self._session_manager.resume_session(session_id)

    async def extend_session(
        self, session_id: str, extension_minutes: int = 30
    ) -> dict:
        """
        セッションを延長

        Args:
            session_id: セッションID
            extension_minutes: 延長時間（分）

        Returns:
            dict: 延長されたセッション情報
        """
        return await self._session_manager.extend_session(
            session_id, extension_minutes
        )

    async def get_conversation_history(
        self, session_id: str
    ) -> list[dict[str, str]]:
        """
        セッションの会話履歴を取得

        Args:
            session_id: セッションID

        Returns:
            list[dict[str, str]]: 会話履歴（role, content, timestampを含む）

        Raises:
            ValueError: セッションが見つからない場合
        """
        session = await self._session_manager.get_session(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        return session.get("conversation_history", [])

    async def update_message(
        self, session_id: str, message_index: int, content: str
    ) -> dict:
        """
        メッセージを更新

        Args:
            session_id: セッションID
            message_index: 会話履歴内のメッセージインデックス
            content: 新しいメッセージ内容

        Returns:
            dict: 更新されたメッセージ情報

        Raises:
            ValueError: セッションまたはメッセージが見つからない場合
        """
        result = await self._session_manager.update_message(
            session_id, message_index, content
        )
        if not result:
            raise ValueError(f"Failed to update message in session: {session_id}")
        return result

    def _build_system_prompt(self, scenario: Scenario, character: Character) -> str:
        """システムプロンプトを構築"""
        parts = [character.system_prompt]

        if character.persona:
            parts.append(f"\n【ペルソナ】\n{character.persona}")

        if character.speaking_style:
            parts.append(f"\n【話し方】\n{character.speaking_style}")

        parts.append(f"\n【シチュエーション】\n{scenario.situation}")

        if scenario.goal:
            parts.append(f"\n【目標】\n{scenario.goal}")

        return "\n".join(parts)

    async def _synthesize_speech(
        self, text: str, voice_config: dict | None
    ) -> dict:
        """
        音声合成を実行

        Args:
            text: 合成するテキスト
            voice_config: 音声設定

        Returns:
            dict: audio_base64, visemes
        """
        tts_service = get_tts_service()

        voice_name = None
        if voice_config and "voice_name" in voice_config:
            voice_name = voice_config["voice_name"]

        result = await tts_service.synthesize(text, voice_name)

        return {
            "audio_base64": base64.b64encode(result.audio_data).decode("utf-8"),
            "visemes": [{"time": v.time, "viseme": v.viseme} for v in result.visemes],
        }
