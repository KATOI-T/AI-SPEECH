"""Image storage service for background images"""

import asyncio
import uuid
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings


class ImageStorage:
    """背景画像用ストレージサービス"""

    ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    PREFIX = "backgrounds"
    CONTENT_TYPE_MAP = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }

    def __init__(self) -> None:
        settings = get_settings()
        self.bucket_name = settings.s3_bucket_name
        self.presigned_url_expiry = settings.s3_presigned_url_expiry
        region = settings.aws_region or "ap-northeast-1"

        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=region,
            endpoint_url=f"https://s3.{region}.amazonaws.com",
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
            ),
        )

    def validate_file(self, file: BinaryIO, filename: str) -> tuple[str, int]:
        """ファイルのバリデーション"""
        ext = Path(filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Invalid file extension: {ext}. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}"
            )

        file.seek(0, 2)
        size = file.tell()
        file.seek(0)

        if size > self.MAX_FILE_SIZE:
            raise ValueError(
                f"File too large: {size} bytes (max: {self.MAX_FILE_SIZE})"
            )

        if size == 0:
            raise ValueError("File is empty")

        return ext, size

    def _make_key(self, filename: str) -> str:
        """S3オブジェクトキーを生成"""
        return f"{self.PREFIX}/{filename}"

    async def upload(self, file: BinaryIO, filename: str) -> str:
        """S3に画像をアップロード"""
        ext, _ = self.validate_file(file, filename)

        unique_id = uuid.uuid4().hex[:8]
        safe_name = Path(filename).stem
        new_filename = f"{unique_id}_{safe_name}{ext}"
        key = self._make_key(new_filename)

        content_type = self.CONTENT_TYPE_MAP.get(ext, "application/octet-stream")
        body = file.read()

        await asyncio.to_thread(
            self.client.put_object,
            Bucket=self.bucket_name,
            Key=key,
            Body=body,
            ContentType=content_type,
        )

        return f"s3://{self.PREFIX}/{new_filename}"

    async def delete(self, file_path: str) -> bool:
        """S3から画像を削除"""
        key = self._resolve_key(file_path)

        try:
            await asyncio.to_thread(
                self.client.head_object, Bucket=self.bucket_name, Key=key
            )
        except ClientError:
            return False

        await asyncio.to_thread(
            self.client.delete_object, Bucket=self.bucket_name, Key=key
        )
        return True

    def get_public_url(self, file_path: str) -> str:
        """署名付きURLを生成"""
        key = self._resolve_key(file_path)

        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=self.presigned_url_expiry,
        )

    def _resolve_key(self, file_path: str) -> str:
        """file_path をS3キーに変換"""
        if file_path.startswith("s3://"):
            return file_path[5:]
        filename = Path(file_path).name
        return self._make_key(filename)
