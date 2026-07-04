from typing import Literal

from pydantic import BaseModel


class VoiceInfo(BaseModel):
    """音声情報"""

    provider: Literal["azure", "aws", "google"]
    voice_name: str
    display_name: str
    gender: Literal["male", "female", "neutral"]
    language: str
    style_list: list[str] = []


class VoiceListResponse(BaseModel):
    """音声一覧レスポンス"""

    voices: list[VoiceInfo]


class ModelUploadResponse(BaseModel):
    """モデルアップロードレスポンス"""

    file_path: str
    file_name: str
    file_size: int
    model_type: Literal["vrm", "glb"]
