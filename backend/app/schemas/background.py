"""Background image schemas"""

from pydantic import BaseModel, Field


class BackgroundUploadResponse(BaseModel):
    """背景画像アップロードレスポンス"""

    file_path: str = Field(..., description="S3パス")
    file_name: str = Field(..., description="ファイル名")
    url: str = Field(..., description="署名付きURL")


class BackgroundDeleteResponse(BaseModel):
    """背景画像削除レスポンス"""

    deleted: bool


class BackgroundUrlResponse(BaseModel):
    """背景画像URL取得レスポンス"""

    url: str = Field(..., description="署名付きURL")
    expires_in: int = Field(..., description="URL有効期限（秒）")
