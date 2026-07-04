from pydantic import BaseModel, Field


class GenerationRequest(BaseModel):
    """生成リクエストスキーマ"""

    description: str = Field(..., min_length=1, max_length=500)
    locale: str = Field(default="ja", pattern="^(ja|en)$")


class ScenarioGenerationOutput(BaseModel):
    """LLM生成シナリオ出力 (構造化出力用)"""

    name: str
    description: str | None = None
    situation: str
    goal: str | None = None
    evaluation_criteria: str | None = None


class GenerationPreviewResponse(BaseModel):
    """生成プレビューレスポンス (シナリオのみ)"""

    scenario: ScenarioGenerationOutput
    warnings: list[str] = Field(default_factory=list)
