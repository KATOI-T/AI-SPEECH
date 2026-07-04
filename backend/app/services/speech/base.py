"""TTS/STT サービスの基底クラス"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class VisemeEvent:
    """Viseme イベントデータ"""

    time: float  # 秒単位
    viseme: str  # 音素文字列 (sil, aa, ee, ih, oh, ou, etc.)


@dataclass
class TTSResult:
    """TTS 実行結果"""

    audio_data: bytes  # 音声データ（WAV形式）
    visemes: list[VisemeEvent]  # Viseme タイムライン
    format: str = "wav"  # 音声フォーマット


@dataclass
class SpeechToken:
    """音声サービス認証トークン"""

    token: str  # 認証トークン
    region: str  # サービスリージョン
    expires_at: datetime  # 有効期限


@dataclass
class STTResult:
    """STT 実行結果"""

    text: str  # 認識されたテキスト
    confidence: float  # 信頼度スコア (0.0-1.0)
    language: str  # 認識言語
    duration: float  # 音声の長さ（秒）
    provider: str  # 使用した音声サービス


class TTSServiceBase(ABC):
    """TTS サービスの抽象基底クラス"""

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice_name: str | None = None,
        rate: float | None = None,
        pitch: float | None = None,
    ) -> TTSResult:
        """
        テキストから音声を合成し、Viseme情報と共に返す

        Args:
            text: 合成するテキスト
            voice_name: 使用する音声名（オプション）
            rate: 音声速度（0.5-2.0、デフォルト: 1.0）
            pitch: 音声ピッチ（-50 to +50、デフォルト: 0）

        Returns:
            TTSResult: 音声データと Viseme タイムライン

        Raises:
            ValueError: テキストが空の場合
            RuntimeError: 音声合成に失敗した場合
        """
        pass

    @abstractmethod
    def get_available_voices(self) -> list[str]:
        """
        利用可能な音声名のリストを取得

        Returns:
            list[str]: 音声名のリスト
        """
        pass


class STTServiceBase(ABC):
    """STT サービスの抽象基底クラス"""

    @abstractmethod
    async def recognize(self, audio_data: bytes, language: str = "ja-JP") -> STTResult:
        """
        音声データからテキストを認識

        Args:
            audio_data: 音声データ (WAV/WebM/MP3形式)
            language: 認識言語 (デフォルト: ja-JP)

        Returns:
            STTResult: 認識結果

        Raises:
            ValueError: 音声データが不正な場合
            RuntimeError: 音声認識に失敗した場合
        """
        pass

    @abstractmethod
    def get_auth_token(self) -> SpeechToken:
        """
        フロントエンド用の認証トークンを取得

        Returns:
            SpeechToken: 認証トークン情報

        Raises:
            RuntimeError: トークン取得に失敗した場合
        """
        pass
