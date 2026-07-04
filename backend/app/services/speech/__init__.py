"""音声サービスモジュール"""

from app.core.config import get_settings
from app.services.speech.azure_speech import AzureSpeechService, AzureTTSService
from app.services.speech.base import STTServiceBase, TTSServiceBase


def get_tts_service() -> TTSServiceBase:
    """
    設定に基づいて適切な TTS サービスを取得

    Returns:
        TTSServiceBase: TTS サービスインスタンス
    """
    settings = get_settings()

    if settings.speech_provider == "azure":
        return AzureTTSService()
    # 将来的に AWS, Google も対応可能
    # elif settings.speech_provider == "aws":
    #     return AWSTTSService()
    # elif settings.speech_provider == "google":
    #     return GoogleTTSService()
    else:
        # デフォルトは Azure
        return AzureTTSService()


def get_speech_service() -> AzureSpeechService:
    """
    設定に基づいて適切な Speech サービス（STT+TTS）を取得

    Returns:
        AzureSpeechService: Speech サービスインスタンス
    """
    settings = get_settings()

    if settings.speech_provider == "azure":
        return AzureSpeechService()
    # 将来的に AWS, Google も対応可能
    else:
        # デフォルトは Azure
        return AzureSpeechService()


__all__ = [
    "get_tts_service",
    "get_speech_service",
    "TTSServiceBase",
    "STTServiceBase",
    "AzureTTSService",
    "AzureSpeechService",
]
