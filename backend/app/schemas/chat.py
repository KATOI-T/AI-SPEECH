"""チャット関連スキーマ"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.character import CharacterResponse
from app.schemas.scenario import ScenarioResponse


class Viseme(BaseModel):
    """Visemeデータ"""

    time: float
    viseme: str


class ChatSessionCreate(BaseModel):
    """セッション作成リクエスト"""

    scenario_id: int = Field(..., gt=0)
    character_id: int = Field(..., gt=0)


class InitialMessage(BaseModel):
    """初期メッセージ"""

    content: str
    emotion: str
    audio_base64: str
    visemes: list[Viseme]


class ChatSessionResponse(BaseModel):
    """セッション作成レスポンス"""

    session_id: str
    scenario: ScenarioResponse
    character: CharacterResponse
    initial_message: InitialMessage
    created_at: datetime
    expires_at: datetime


class ChatMessageRequest(BaseModel):
    """メッセージ送信リクエスト"""

    content: str = Field(..., min_length=1, max_length=2000)
    content_type: Literal["text"] = "text"


class UserMessage(BaseModel):
    """ユーザーメッセージ"""

    content: str
    timestamp: datetime


class AIResponse(BaseModel):
    """AI応答"""

    content: str
    emotion: str
    audio_base64: str
    visemes: list[Viseme]


class ChatMessageResponse(BaseModel):
    """メッセージ送信レスポンス"""

    message_id: str
    user_message: UserMessage
    response: AIResponse
    turn_count: int
    timestamp: datetime


class ChatSessionEndResponse(BaseModel):
    """セッション終了レスポンス"""

    session_id: str
    status: Literal["ended"]
    total_turns: int
    duration_seconds: int
    ended_at: datetime


class ChatSessionInfoResponse(BaseModel):
    """セッション情報レスポンス"""

    session_id: str
    scenario_id: int
    character_id: int
    status: Literal["active", "paused", "ended", "expired"]
    turn_count: int
    created_at: datetime
    expires_at: datetime
    last_activity_at: datetime
    paused_at: datetime | None = None
    remaining_seconds: int
    can_extend: bool


class SessionPauseResponse(BaseModel):
    """セッション一時停止レスポンス"""

    session_id: str
    status: Literal["paused"]
    paused_at: datetime
    expires_at: datetime
    message: str


class SessionResumeResponse(BaseModel):
    """セッション再開レスポンス"""

    session_id: str
    status: Literal["active"]
    resumed_at: datetime
    expires_at: datetime
    turn_count: int
    message: str


class SessionExtendRequest(BaseModel):
    """セッション延長リクエスト"""

    extension_minutes: int = Field(default=30, ge=1, le=60)


class SessionExtendResponse(BaseModel):
    """セッション延長レスポンス"""

    session_id: str
    status: str
    previous_expires_at: datetime
    expires_at: datetime
    extended_minutes: int
    message: str


class ConversationMessage(BaseModel):
    """会話履歴メッセージ"""

    role: Literal["user", "assistant"]
    content: str
    timestamp: str


class SessionHistoryResponse(BaseModel):
    """セッション会話履歴レスポンス"""

    session_id: str
    messages: list[ConversationMessage]


class MessageUpdateRequest(BaseModel):
    """メッセージ更新リクエスト"""

    content: str = Field(..., min_length=1, max_length=2000)


class MessageUpdateResponse(BaseModel):
    """メッセージ更新レスポンス"""

    message_id: str
    content: str
    updated_at: datetime
