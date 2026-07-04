from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.character_repository import CharacterRepository
from app.schemas.character import (
    CharacterCreate,
    CharacterListResponse,
    CharacterResponse,
    CharacterUpdate,
)
from app.schemas.voice import ModelUploadResponse, VoiceListResponse
from app.services.character_service import CharacterService

router = APIRouter()


@router.get("", response_model=CharacterListResponse)
async def list_characters(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
) -> CharacterListResponse:
    """
    キャラクター一覧を取得

    - **skip**: スキップ数
    - **limit**: 取得件数
    - **active_only**: 有効なキャラクターのみ取得
    """
    repo = CharacterRepository(db)
    items = repo.get_all(skip=skip, limit=limit, active_only=active_only)
    total = repo.count(active_only=active_only)
    return CharacterListResponse(
        items=[CharacterResponse.model_validate(item) for item in items],
        total=total,
    )


@router.post("", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(
    character_data: CharacterCreate,
    db: Session = Depends(get_db),
) -> CharacterResponse:
    """
    キャラクターを作成

    - **name**: キャラクター名（必須）
    - **persona**: ペルソナ設定（必須）
    - **system_prompt**: システムプロンプト（必須）
    - **model_path**: 3Dモデルパス（必須）
    - **model_type**: モデル形式（vrm/glb）
    - **speaking_style**: 口調・話し方
    - **voice_config**: 音声設定
    - **animation_config**: アニメーション設定
    """
    repo = CharacterRepository(db)
    character = repo.create(character_data)
    return CharacterResponse.model_validate(character)


@router.post("/upload-model", response_model=ModelUploadResponse)
async def upload_model(file: UploadFile = File(...)) -> ModelUploadResponse:
    """
    3Dモデルファイルをアップロード

    - **file**: VRM/GLBファイル（最大50MB）
    """
    service = CharacterService()
    return await service.upload_model(file)


@router.get("/voices", response_model=VoiceListResponse)
async def get_available_voices(
    provider: str | None = None, language: str = "ja-JP"
) -> VoiceListResponse:
    """
    利用可能な音声一覧を取得

    - **provider**: プロバイダー指定（azure/aws/google）
    - **language**: 言語コード（デフォルト: ja-JP）
    """
    service = CharacterService()
    voices = service.get_available_voices(provider=provider, language=language)
    return VoiceListResponse(voices=voices)


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    character_id: int,
    db: Session = Depends(get_db),
) -> CharacterResponse:
    """
    キャラクターを取得

    - **character_id**: キャラクターID
    """
    repo = CharacterRepository(db)
    character = repo.get_by_id(character_id)
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character with id {character_id} not found",
        )
    return CharacterResponse.model_validate(character)


@router.put("/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: int,
    character_data: CharacterUpdate,
    db: Session = Depends(get_db),
) -> CharacterResponse:
    """
    キャラクターを更新

    - **character_id**: キャラクターID
    """
    repo = CharacterRepository(db)
    character = repo.update(character_id, character_data)
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character with id {character_id} not found",
        )
    return CharacterResponse.model_validate(character)


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: int,
    db: Session = Depends(get_db),
) -> None:
    """
    キャラクターを削除（論理削除）

    - **character_id**: キャラクターID
    """
    repo = CharacterRepository(db)
    if not repo.delete(character_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character with id {character_id} not found",
        )
