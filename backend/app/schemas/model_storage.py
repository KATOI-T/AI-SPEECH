"""Model storage schemas"""

from typing import Literal

from pydantic import BaseModel, Field


class ModelFile(BaseModel):
    """モデルファイル情報"""

    file_path: str = Field(..., description="ファイルパス")
    file_name: str = Field(..., description="ファイル名")
    file_size: int = Field(..., description="ファイルサイズ（バイト）")
    model_type: Literal["vrm", "glb"] = Field(..., description="モデル形式")
    uploaded_at: str = Field(..., description="アップロード日時")


class ModelUploadResponse(BaseModel):
    """アップロードレスポンス"""

    file_path: str = Field(..., description="保存先パス")
    file_name: str = Field(..., description="元ファイル名")
    file_size: int = Field(..., description="ファイルサイズ")
    model_type: Literal["vrm", "glb"] = Field(..., description="モデル形式")


class ModelListResponse(BaseModel):
    """モデル一覧レスポンス"""

    models: list[ModelFile] = Field(..., description="モデル一覧")
    total: int = Field(..., description="総件数")


class SignedUrlResponse(BaseModel):
    """署名付きURLレスポンス"""

    url: str = Field(..., description="ダウンロードURL")
    expires_in: int | None = Field(None, description="URL有効期限（秒）。ローカルの場合はnull")
