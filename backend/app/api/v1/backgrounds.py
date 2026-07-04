"""Background image API endpoints"""

import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.core.config import get_settings
from app.schemas.background import (
    BackgroundDeleteResponse,
    BackgroundUploadResponse,
    BackgroundUrlResponse,
)
from app.services.storage.image_storage import ImageStorage

logger = logging.getLogger(__name__)
router = APIRouter()


def get_image_storage() -> ImageStorage:
    """ImageStorageインスタンスを取得"""
    return ImageStorage()


@router.post("/upload", response_model=BackgroundUploadResponse)
async def upload_background(
    file: UploadFile = File(...),
) -> BackgroundUploadResponse:
    """背景画像をS3にアップロード"""
    logger.info(f"Uploading background image: {file.filename}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    storage = get_image_storage()

    try:
        file_path = await storage.upload(file.file, file.filename)
        url = storage.get_public_url(file_path)
        file_name = Path(file_path).name

        logger.info(f"Background upload successful: {file_path}")

        return BackgroundUploadResponse(
            file_path=file_path,
            file_name=file_name,
            url=url,
        )
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Background upload failed")
        raise HTTPException(status_code=500, detail="Upload failed")


@router.delete("/{filename}", response_model=BackgroundDeleteResponse)
async def delete_background(filename: str) -> BackgroundDeleteResponse:
    """背景画像をS3から削除"""
    storage = get_image_storage()

    # ファイル名のみ受け付け、パス区切りを拒否
    if "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    # 拡張子ホワイトリストチェック
    ext = Path(filename).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension: {ext}",
        )

    file_path = f"s3://backgrounds/{filename}"

    try:
        deleted = await storage.delete(file_path)
        if not deleted:
            raise HTTPException(status_code=404, detail="File not found")
        return BackgroundDeleteResponse(deleted=True)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Background delete failed")
        raise HTTPException(status_code=500, detail="Delete failed")


@router.get("/image")
async def get_background_image(
    file_path: str = Query(..., description="S3パス"),
) -> Response:
    """背景画像のバイナリデータを返す（CORS対応プロキシ）"""
    storage = get_image_storage()

    if not file_path.startswith("s3://backgrounds/"):
        raise HTTPException(status_code=400, detail="Invalid file path")

    key = file_path[5:]  # "s3://" を除去
    ext = Path(key).suffix.lower()
    content_type = ImageStorage.CONTENT_TYPE_MAP.get(ext, "image/jpeg")

    try:
        import asyncio

        obj = await asyncio.to_thread(
            storage.client.get_object,
            Bucket=storage.bucket_name,
            Key=key,
        )
        body = obj["Body"].read()
        return Response(
            content=body,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except Exception:
        logger.exception("Failed to get background image")
        raise HTTPException(status_code=404, detail="Image not found")


@router.get("/url", response_model=BackgroundUrlResponse)
async def get_background_url(
    file_path: str = Query(..., description="S3パス"),
) -> BackgroundUrlResponse:
    """背景画像の署名付きURLを取得"""
    storage = get_image_storage()
    settings = get_settings()

    try:
        url = storage.get_public_url(file_path)
        return BackgroundUrlResponse(
            url=url,
            expires_in=settings.s3_presigned_url_expiry,
        )
    except Exception:
        logger.exception("Failed to get background URL")
        raise HTTPException(status_code=404, detail="File not found")
