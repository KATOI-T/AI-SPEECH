"""S3 storage implementation for model uploads"""

import asyncio
import uuid
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings

from .base import StorageBase


class S3Storage(StorageBase):
    """モデルファイルのS3ストレージ"""

    def __init__(self):
        settings = get_settings()
        self.bucket_name = settings.s3_bucket_name
        self.prefix = settings.s3_upload_prefix
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
        self._ensure_cors()

    def _ensure_cors(self) -> None:
        """S3バケットにCORS設定を適用（冪等）"""
        try:
            self.client.put_bucket_cors(
                Bucket=self.bucket_name,
                CORSConfiguration={
                    "CORSRules": [
                        {
                            "AllowedOrigins": ["*"],
                            "AllowedMethods": ["GET", "HEAD"],
                            "AllowedHeaders": ["*"],
                            "MaxAgeSeconds": 86400,
                        }
                    ]
                },
            )
        except ClientError:
            pass

    def _make_key(self, filename: str) -> str:
        """S3オブジェクトキーを生成"""
        return f"{self.prefix}/{filename}"

    async def upload(self, file: BinaryIO, filename: str) -> str:
        """S3にファイルをアップロード"""
        ext, _ = self.validate_file(file, filename)

        unique_id = uuid.uuid4().hex[:8]
        safe_name = Path(filename).stem
        new_filename = f"{unique_id}_{safe_name}{ext}"
        key = self._make_key(new_filename)

        content_type = "model/gltf-binary"
        body = file.read()

        await asyncio.to_thread(
            self.client.put_object,
            Bucket=self.bucket_name,
            Key=key,
            Body=body,
            ContentType=content_type,
        )

        return f"s3://{self.prefix}/{new_filename}"

    async def delete(self, file_path: str) -> bool:
        """S3からファイルを削除"""
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

    async def list_files(self) -> list[dict]:
        """S3オブジェクト一覧を取得（paginator使用で1000件超対応）"""
        paginator = self.client.get_paginator("list_objects_v2")

        files = []

        def _list_pages() -> list[dict]:
            result = []
            for page in paginator.paginate(
                Bucket=self.bucket_name, Prefix=f"{self.prefix}/"
            ):
                for obj in page.get("Contents", []):
                    key = obj["Key"]
                    filename = key.split("/")[-1]
                    ext = Path(filename).suffix.lower()

                    if ext not in self.ALLOWED_EXTENSIONS:
                        continue

                    result.append({
                        "file_path": f"s3://{key}",
                        "file_name": filename,
                        "file_size": obj["Size"],
                        "model_type": ext.lstrip("."),
                        "uploaded_at": obj["LastModified"].isoformat(),
                    })
            return result

        files = await asyncio.to_thread(_list_pages)

        return sorted(files, key=lambda x: x["uploaded_at"], reverse=True)

    def get_public_url(self, file_path: str) -> str:
        """署名付きURLを生成"""
        key = self._resolve_key(file_path)

        url = self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=self.presigned_url_expiry,
        )
        return url

    def _resolve_key(self, file_path: str) -> str:
        """
        file_path をS3キーに変換

        "s3://uploads/abc_model.vrm" → "uploads/abc_model.vrm"
        "/models/uploads/abc_model.vrm" → "uploads/abc_model.vrm"
        """
        if file_path.startswith("s3://"):
            return file_path[5:]
        # ローカルパス形式の後方互換
        filename = Path(file_path).name
        return self._make_key(filename)
