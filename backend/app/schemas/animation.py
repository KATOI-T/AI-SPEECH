from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AnimationConfig(BaseModel):
    """
    アニメーション設定

    VRMモデルのアニメーションクリップ名を定義します。
    各感情状態に対応するアニメーション名を設定できます。
    """

    idle: str = Field(
        default="idle_01",
        description="待機時のアニメーション",
        min_length=1,
        max_length=50,
    )
    talking: str = Field(
        default="talking_01",
        description="会話時のアニメーション",
        min_length=1,
        max_length=50,
    )
    happy: str | None = Field(
        default="happy_01",
        description="喜び感情のアニメーション",
        min_length=1,
        max_length=50,
    )
    sad: str | None = Field(
        default="sad_01",
        description="悲しみ感情のアニメーション",
        min_length=1,
        max_length=50,
    )
    surprised: str | None = Field(
        default=None,
        description="驚き感情のアニメーション",
        min_length=1,
        max_length=50,
    )
    angry: str | None = Field(
        default=None,
        description="怒り感情のアニメーション",
        min_length=1,
        max_length=50,
    )
    thinking: str | None = Field(
        default=None,
        description="考え中のアニメーション",
        min_length=1,
        max_length=50,
    )

    @field_validator(
        "idle", "talking", "happy", "sad", "surprised", "angry", "thinking"
    )
    @classmethod
    def validate_animation_name(cls, v: str | None) -> str | None:
        """
        アニメーション名のフォーマット検証

        - 英数字、アンダースコア、ハイフンのみ許可
        - 空白文字を含まない
        """
        if v is None:
            return v

        # 空白文字チェック
        if " " in v or "\t" in v or "\n" in v:
            raise ValueError("Animation name cannot contain whitespace")

        # 許可文字チェック（英数字、アンダースコア、ハイフン）
        if not all(c.isalnum() or c in ["_", "-"] for c in v):
            raise ValueError(
                "Animation name can only contain alphanumeric characters, "
                "underscores, and hyphens"
            )

        return v


class AnimationDefaultsResponse(BaseModel):
    """デフォルトアニメーション設定レスポンス"""

    config: AnimationConfig
    description: str = "Default animation configuration for VRM models"


class AnimationValidationRequest(BaseModel):
    """アニメーション設定検証リクエスト"""

    config: AnimationConfig


class AnimationValidationResponse(BaseModel):
    """アニメーション設定検証レスポンス"""

    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class EmotionAnimationRequest(BaseModel):
    """感情からアニメーション取得リクエスト"""

    emotion: Literal["neutral", "happy", "sad", "surprised", "angry", "thinking"]
    config: AnimationConfig


class EmotionAnimationResponse(BaseModel):
    """感情からアニメーション取得レスポンス"""

    emotion: str
    animation_name: str
    fallback_used: bool = False


# --- AnimationModel CRUD スキーマ ---


class AnimationModelCreate(BaseModel):
    """アニメーションモデル作成スキーマ"""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    animation_config: AnimationConfig
    is_default: bool = False


class AnimationModelUpdate(BaseModel):
    """アニメーションモデル更新スキーマ"""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    animation_config: AnimationConfig | None = None
    is_default: bool | None = None
    is_active: bool | None = None


class AnimationModelResponse(BaseModel):
    """アニメーションモデルレスポンススキーマ"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    animation_config: AnimationConfig
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AnimationModelListResponse(BaseModel):
    """アニメーションモデル一覧レスポンス"""

    items: list[AnimationModelResponse]
    total: int
