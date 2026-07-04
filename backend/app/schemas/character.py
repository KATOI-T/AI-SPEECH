from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.animation import AnimationConfig


class VoiceConfig(BaseModel):
    """音声設定"""

    provider: Literal["azure", "aws", "google"]
    voice_name: str
    pitch: float = 0
    rate: float = 1.0


class CharacterBase(BaseModel):
    """キャラクター基本スキーマ"""

    name: str = Field(..., max_length=100)
    persona: str
    speaking_style: str | None = None
    system_prompt: str
    model_path: str
    model_type: Literal["vrm", "glb"] = "vrm"
    voice_config: VoiceConfig | None = None
    animation_config: AnimationConfig | None = None


class CharacterCreate(CharacterBase):
    """キャラクター作成スキーマ"""

    pass


class CharacterUpdate(BaseModel):
    """キャラクター更新スキーマ"""

    name: str | None = Field(default=None, max_length=100)
    persona: str | None = None
    speaking_style: str | None = None
    system_prompt: str | None = None
    model_path: str | None = None
    model_type: Literal["vrm", "glb"] | None = None
    voice_config: VoiceConfig | None = None
    animation_config: AnimationConfig | None = None
    is_active: bool | None = None


class CharacterResponse(CharacterBase):
    """キャラクターレスポンススキーマ"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CharacterListResponse(BaseModel):
    """キャラクター一覧レスポンス"""

    items: list[CharacterResponse]
    total: int
