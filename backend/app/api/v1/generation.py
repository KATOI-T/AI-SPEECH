from fastapi import APIRouter

from app.schemas.generation import GenerationPreviewResponse, GenerationRequest
from app.services.generation import GenerationService

router = APIRouter()


@router.post("", response_model=GenerationPreviewResponse)
async def generate_scenario(
    request: GenerationRequest,
) -> GenerationPreviewResponse:
    """
    1行説明からシナリオを自動生成する。

    - **description**: 1〜500文字の説明文
    - **locale**: 言語設定 (ja/en)

    キャラクターは生成対象外。キャラクターは従来通り手動で登録・選択する。
    """
    service = GenerationService()
    return await service.generate(request)
