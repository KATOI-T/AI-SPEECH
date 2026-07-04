"""Model storage API endpoints"""

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import get_settings
from app.schemas.model_storage import (
    ModelFile,
    ModelListResponse,
    ModelUploadResponse,
    SignedUrlResponse,
)
from app.services.storage.base import StorageBase
from app.services.storage.local_storage import LocalStorage

logger = logging.getLogger(__name__)
router = APIRouter()


def get_storage_service() -> StorageBase:
    """設定に応じたストレージサービスを返す"""
    settings = get_settings()
    if settings.storage_backend == "s3":
        from app.services.storage.s3_storage import S3Storage

        return S3Storage()
    return LocalStorage()


@router.post("/upload", response_model=ModelUploadResponse)
async def upload_model(file: UploadFile = File(...)) -> ModelUploadResponse:
    """
    3Dモデルファイルをアップロード

    Args:
        file: VRM または GLB ファイル（最大50MB）

    Returns:
        ModelUploadResponse: アップロード結果

    Raises:
        HTTPException: アップロードに失敗した場合
    """
    logger.info(f"Uploading model: {file.filename}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    storage = get_storage_service()

    try:
        # ファイルアップロード
        file_path = await storage.upload(file.file, file.filename)

        # ファイルサイズを取得
        file.file.seek(0, 2)
        file_size = file.file.tell()

        # 拡張子取得
        ext = file.filename.rsplit(".", 1)[-1].lower()

        logger.info(
            f"Upload successful: {file_path} ({file_size} bytes)"
        )

        return ModelUploadResponse(
            file_path=file_path,
            file_name=file.filename,
            file_size=file_size,
            model_type=ext,  # type: ignore
        )
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail="Upload failed")


@router.get("", response_model=ModelListResponse)
async def list_models() -> ModelListResponse:
    """
    保存済みモデル一覧を取得

    Returns:
        ModelListResponse: モデルファイル一覧
    """
    storage = get_storage_service()
    files = await storage.list_files()

    return ModelListResponse(
        models=[ModelFile(**f) for f in files],
        total=len(files),
    )


@router.delete("/{filename}", status_code=204)
async def delete_model(filename: str) -> None:
    """
    モデルファイルを削除

    Args:
        filename: ファイル名

    Raises:
        HTTPException: 削除に失敗した場合
    """
    storage = get_storage_service()
    settings = get_settings()

    # ストレージバックエンドに応じてパスを構築
    file_path = (
        f"s3://{settings.s3_upload_prefix}/{filename}"
        if settings.storage_backend == "s3"
        else f"/models/uploads/{filename}"
    )

    try:
        if not await storage.delete(file_path):
            raise HTTPException(status_code=404, detail="File not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Delete failed")
        raise HTTPException(status_code=500, detail="Delete failed")


@router.get("/signed-url/{filename}", response_model=SignedUrlResponse)
async def get_signed_url(filename: str) -> SignedUrlResponse:
    """モデルファイルの署名付きURLを取得"""
    storage = get_storage_service()
    settings = get_settings()

    file_path = (
        f"s3://{settings.s3_upload_prefix}/{filename}"
        if settings.storage_backend == "s3"
        else f"/models/uploads/{filename}"
    )

    try:
        url = storage.get_public_url(file_path)
    except Exception:
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    expires_in = settings.s3_presigned_url_expiry if settings.storage_backend == "s3" else None

    return SignedUrlResponse(url=url, expires_in=expires_in)
