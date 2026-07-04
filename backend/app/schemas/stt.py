"""STT API スキーマ"""

from datetime import datetime

from pydantic import BaseModel, Field


class SpeechTokenResponse(BaseModel):
    """認証トークンレスポンス"""

    token: str = Field(..., description="Azure Speech認証トークン（有効期限10分）")
    region: str = Field(..., description="Azureリージョン")
    expires_at: datetime = Field(..., description="トークン有効期限（ISO 8601）")


class STTRequest(BaseModel):
    """音声認識リクエスト"""

    language: str = Field(
        default="ja-JP",
        description="認識言語",
        examples=["ja-JP", "en-US"],
    )


class STTResponse(BaseModel):
    """音声認識レスポンス"""

    text: str = Field(..., description="認識されたテキスト")
    confidence: float = Field(
        ..., description="信頼度スコア（0.0-1.0）", ge=0.0, le=1.0
    )
    language: str = Field(..., description="認識言語")
    duration: float = Field(..., description="音声の長さ（秒）", ge=0.0)
    provider: str = Field(..., description="使用した音声サービス")


class SpeechProviderInfo(BaseModel):
    """プロバイダー情報"""

    id: str = Field(..., description="プロバイダーID")
    name: str = Field(..., description="プロバイダー名")
    stt_enabled: bool = Field(..., description="STT機能の有効状態")
    tts_enabled: bool = Field(..., description="TTS機能の有効状態")
    languages: list[str] = Field(..., description="サポート言語リスト")


class ProvidersResponse(BaseModel):
    """プロバイダー一覧レスポンス"""

    providers: list[SpeechProviderInfo] = Field(..., description="プロバイダーリスト")
    current_provider: str = Field(..., description="現在使用中のプロバイダーID")
