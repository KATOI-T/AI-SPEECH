from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

MAX_BACKGROUND_IMAGES = 3


class ScenarioBase(BaseModel):
    """シナリオ基本スキーマ"""

    name: str
    description: str | None = None
    situation: str
    goal: str | None = None
    evaluation_criteria: str | None = None
    background_image_paths: list[str] = Field(
        default=[], max_length=MAX_BACKGROUND_IMAGES
    )


class ScenarioCreate(ScenarioBase):
    """シナリオ作成スキーマ"""

    pass


class ScenarioUpdate(BaseModel):
    """シナリオ更新スキーマ"""

    name: str | None = None
    description: str | None = None
    situation: str | None = None
    goal: str | None = None
    evaluation_criteria: str | None = None
    background_image_paths: list[str] | None = Field(
        default=None, max_length=MAX_BACKGROUND_IMAGES
    )
    is_active: bool | None = None


class ScenarioResponse(ScenarioBase):
    """シナリオレスポンススキーマ"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ScenarioListResponse(BaseModel):
    """シナリオ一覧レスポンス"""

    items: list[ScenarioResponse]
    total: int
