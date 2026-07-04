from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.animation_model_repository import AnimationModelRepository
from app.schemas.animation import (
    AnimationDefaultsResponse,
    AnimationModelCreate,
    AnimationModelListResponse,
    AnimationModelResponse,
    AnimationModelUpdate,
    AnimationValidationRequest,
    AnimationValidationResponse,
    EmotionAnimationRequest,
    EmotionAnimationResponse,
)
from app.services.animation_service import AnimationService

router = APIRouter()


@router.get("/defaults", response_model=AnimationDefaultsResponse)
async def get_default_animations() -> AnimationDefaultsResponse:
    """
    デフォルトアニメーション設定を取得

    VRMモデル用の推奨デフォルトアニメーション設定を返します。
    キャラクター作成時の参考値として使用できます。

    Returns:
        AnimationDefaultsResponse: デフォルト設定とその説明
    """
    config = AnimationService.get_default_config()
    return AnimationDefaultsResponse(
        config=config,
        description="Default animation configuration for VRM models",
    )


@router.post("/validate", response_model=AnimationValidationResponse)
async def validate_animation_config(
    request: AnimationValidationRequest,
) -> AnimationValidationResponse:
    """
    アニメーション設定の妥当性を検証

    アニメーション設定が有効かどうかをチェックし、
    エラーや警告があれば返します。

    Args:
        request: 検証リクエスト

    Returns:
        AnimationValidationResponse: 検証結果
    """
    is_valid, errors, warnings = AnimationService.validate_config(request.config)

    return AnimationValidationResponse(
        valid=is_valid,
        errors=errors,
        warnings=warnings,
    )


@router.post("/emotion-mapping", response_model=EmotionAnimationResponse)
async def get_animation_for_emotion(
    request: EmotionAnimationRequest,
) -> EmotionAnimationResponse:
    """
    感情からアニメーション名を取得

    指定された感情に対応するアニメーション名を返します。
    感情に対応するアニメーションが設定されていない場合は、
    フォールバック（idle）を使用します。

    Args:
        request: 感情とアニメーション設定

    Returns:
        EmotionAnimationResponse: アニメーション名とフォールバック使用フラグ
    """
    animation_name, fallback_used = AnimationService.get_animation_for_emotion(
        request.emotion, request.config
    )

    return EmotionAnimationResponse(
        emotion=request.emotion,
        animation_name=animation_name,
        fallback_used=fallback_used,
    )


# --- AnimationModel CRUD エンドポイント ---


@router.get("/models", response_model=AnimationModelListResponse)
async def list_animation_models(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
) -> AnimationModelListResponse:
    """
    アニメーションモデル一覧を取得

    - **skip**: スキップ数
    - **limit**: 取得件数
    - **active_only**: 有効なモデルのみ取得
    """
    repo = AnimationModelRepository(db)
    items = repo.get_all(skip=skip, limit=limit, active_only=active_only)
    total = repo.count(active_only=active_only)
    return AnimationModelListResponse(
        items=[AnimationModelResponse.model_validate(item) for item in items],
        total=total,
    )


@router.post(
    "/models",
    response_model=AnimationModelResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_animation_model(
    data: AnimationModelCreate,
    db: Session = Depends(get_db),
) -> AnimationModelResponse:
    """
    アニメーションモデルを作成

    - **name**: モデル名（必須、ユニーク）
    - **description**: 説明
    - **animation_config**: アニメーション設定
    - **is_default**: デフォルトフラグ
    """
    repo = AnimationModelRepository(db)

    # 名前の重複チェック
    existing = repo.get_by_name(data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Animation model with name '{data.name}' already exists",
        )

    model = repo.create(data)
    return AnimationModelResponse.model_validate(model)


@router.get("/models/{model_id}", response_model=AnimationModelResponse)
async def get_animation_model(
    model_id: int,
    db: Session = Depends(get_db),
) -> AnimationModelResponse:
    """
    アニメーションモデルを取得

    - **model_id**: モデルID
    """
    repo = AnimationModelRepository(db)
    model = repo.get_by_id(model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Animation model with id {model_id} not found",
        )
    return AnimationModelResponse.model_validate(model)


@router.put("/models/{model_id}", response_model=AnimationModelResponse)
async def update_animation_model(
    model_id: int,
    data: AnimationModelUpdate,
    db: Session = Depends(get_db),
) -> AnimationModelResponse:
    """
    アニメーションモデルを更新

    - **model_id**: モデルID
    """
    repo = AnimationModelRepository(db)

    # 名前の重複チェック（変更される場合のみ）
    if data.name is not None:
        existing = repo.get_by_name(data.name)
        if existing and existing.id != model_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Animation model with name '{data.name}' already exists",
            )

    model = repo.update(model_id, data)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Animation model with id {model_id} not found",
        )
    return AnimationModelResponse.model_validate(model)


@router.delete(
    "/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_animation_model(
    model_id: int,
    db: Session = Depends(get_db),
) -> None:
    """
    アニメーションモデルを削除（論理削除）

    - **model_id**: モデルID
    """
    repo = AnimationModelRepository(db)
    if not repo.delete(model_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Animation model with id {model_id} not found",
        )
