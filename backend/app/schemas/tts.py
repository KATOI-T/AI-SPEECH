"""TTS API スキーマ"""

from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    """TTS 音声合成リクエスト"""

    text: str = Field(..., min_length=1, max_length=5000, description="合成するテキスト")
    voice_name: str | None = Field(
        default=None,
        description="使用する音声名（省略時: ja-JP-NanamiNeural）",
        examples=["ja-JP-NanamiNeural", "ja-JP-KeitaNeural"],
    )
    rate: float | None = Field(
        default=None,
        ge=0.5,
        le=2.0,
        description="音声速度（0.5-2.0、デフォルト: 1.0）",
    )
    pitch: float | None = Field(
        default=None,
        ge=-50.0,
        le=50.0,
        description="音声ピッチ（-50 to +50、デフォルト: 0）",
    )


class VisemeData(BaseModel):
    """Viseme 情報"""

    time: float = Field(..., description="タイムスタンプ（秒単位）", ge=0.0)
    viseme: str = Field(..., description="音素文字列（例: sil, aa, ee, ih, oh, ou）")


class TTSResponse(BaseModel):
    """TTS 音声合成レスポンス"""

    audio_base64: str = Field(..., description="音声データ（base64エンコード）")
    visemes: list[VisemeData] = Field(..., description="Viseme タイムライン")
    format: str = Field(default="wav", description="音声フォーマット")


class VoiceListResponse(BaseModel):
    """利用可能な音声リスト"""

    voices: list[str] = Field(..., description="音声名のリスト")
