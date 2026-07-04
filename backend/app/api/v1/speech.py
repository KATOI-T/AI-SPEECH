"""Speech API エンドポイント（STT統合）"""

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.stt import (
    ProvidersResponse,
    SpeechProviderInfo,
    SpeechTokenResponse,
    STTResponse,
)
from app.services.speech import get_speech_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/token", response_model=SpeechTokenResponse)
async def get_speech_token() -> SpeechTokenResponse:
    """
    Azure Speech認証トークンを取得

    フロントエンドがAzure Speech SDKで使用する認証トークンを発行します。

    Returns:
        SpeechTokenResponse: 認証トークン、リージョン、有効期限

    Raises:
        HTTPException: トークン取得に失敗した場合
    """
    logger.info("Speech token request received")

    try:
        # STTサービスを取得
        speech_service = get_speech_service()

        # 認証トークンを取得
        token_info = speech_service.get_auth_token()

        logger.info(
            f"Speech token generated successfully. "
            f"Region: {token_info.region}, Expires: {token_info.expires_at}"
        )

        return SpeechTokenResponse(
            token=token_info.token,
            region=token_info.region,
            expires_at=token_info.expires_at,
        )

    except RuntimeError as e:
        logger.error(f"Failed to get speech token: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unexpected error during token generation")
        raise HTTPException(
            status_code=500, detail="Internal server error during token generation"
        ) from e


@router.post("/recognize", response_model=STTResponse)
async def recognize_speech(
    audio: UploadFile = File(..., description="音声ファイル（WAV/WebM/MP3、最大10MB）"),
    language: str = Form("ja-JP", description="認識言語"),
) -> STTResponse:
    """
    音声ファイルからテキストを認識（バッチ処理用）

    Args:
        audio: 音声ファイル
        language: 認識言語（デフォルト: ja-JP）

    Returns:
        STTResponse: 認識結果

    Raises:
        HTTPException: 認識処理に失敗した場合
    """
    logger.info(
        f"Speech recognition request: filename={audio.filename}, language={language}"
    )

    # ファイルサイズチェック（10MB）
    max_file_size = 10 * 1024 * 1024
    audio_data = await audio.read()

    if len(audio_data) > max_file_size:
        raise HTTPException(
            status_code=400, detail="File size exceeds 10MB limit"
        )

    if len(audio_data) == 0:
        raise HTTPException(
            status_code=400, detail="Audio file is empty"
        )

    # ファイル形式チェック（簡易）
    allowed_extensions = [".wav", ".webm", ".mp3"]
    if audio.filename and not any(
        audio.filename.lower().endswith(ext) for ext in allowed_extensions
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}",
        )

    try:
        # STTサービスを取得
        speech_service = get_speech_service()

        # 音声認識実行
        result = await speech_service.recognize(audio_data=audio_data, language=language)

        logger.info(
            f"Speech recognition completed: text_length={len(result.text)}, "
            f"confidence={result.confidence:.2f}, duration={result.duration:.2f}s"
        )

        return STTResponse(
            text=result.text,
            confidence=result.confidence,
            language=result.language,
            duration=result.duration,
            provider=result.provider,
        )

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        logger.error(f"Speech recognition error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unexpected error during speech recognition")
        raise HTTPException(
            status_code=500, detail="Internal server error during speech recognition"
        ) from e


@router.get("/providers", response_model=ProvidersResponse)
async def get_speech_providers() -> ProvidersResponse:
    """
    利用可能な音声サービスプロバイダーの一覧を取得

    Returns:
        ProvidersResponse: プロバイダー一覧と現在のプロバイダー

    Raises:
        HTTPException: プロバイダー情報取得に失敗した場合
    """
    try:
        # 現在はAzureのみサポート
        providers = [
            SpeechProviderInfo(
                id="azure",
                name="Azure Speech Services",
                stt_enabled=True,
                tts_enabled=True,
                languages=["ja-JP", "en-US"],
            )
        ]

        return ProvidersResponse(
            providers=providers,
            current_provider="azure",
        )

    except Exception as e:
        logger.exception("Error getting speech providers")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve speech providers"
        ) from e
