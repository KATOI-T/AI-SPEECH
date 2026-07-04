import logging

from fastapi import HTTPException, status
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.schemas.generation import (
    GenerationPreviewResponse,
    GenerationRequest,
    ScenarioGenerationOutput,
)
from app.services.generation.prompts import GENERATION_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class GenerationService:
    """シナリオ自動生成サービス

    キャラクター/VRM の自動選定は対応しない。
    キャラクターは従来通り手動で登録・選択する。
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._model = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=settings.openai_api_key,
        )

    async def generate(self, request: GenerationRequest) -> GenerationPreviewResponse:
        user_message = f"説明: {request.description}\nロケール: {request.locale}"

        try:
            structured_llm = self._model.with_structured_output(
                ScenarioGenerationOutput
            )
            messages = [
                SystemMessage(content=GENERATION_SYSTEM_PROMPT),
                HumanMessage(content=user_message),
            ]
            scenario: ScenarioGenerationOutput = await structured_llm.ainvoke(messages)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM service unavailable",
            ) from e

        return GenerationPreviewResponse(scenario=scenario, warnings=[])
