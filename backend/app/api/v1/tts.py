"""TTS API エンドポイント"""

import base64
import logging

from fastapi import APIRouter, HTTPException

from app.schemas.tts import TTSRequest, TTSResponse, VisemeData, VoiceListResponse
from app.services.speech import get_tts_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(request: TTSRequest) -> TTSResponse:
    """
    テキストから音声を合成し、Viseme情報と共に返す

    Args:
        request: TTS リクエスト（text, voice_name）

    Returns:
        TTSResponse: 音声データ（base64）と Viseme タイムライン

    Raises:
        HTTPException: 音声合成に失敗した場合
    """
    logger.info(
        f"TTS synthesis request: text_length={len(request.text)}, "
        f"voice={request.voice_name or 'default'}, "
        f"rate={request.rate}, pitch={request.pitch}"
    )

    try:
        # TTS サービスを取得
        tts_service = get_tts_service()

        # 音声合成実行
        result = await tts_service.synthesize(
            text=request.text,
            voice_name=request.voice_name,
            rate=request.rate,
            pitch=request.pitch,
        )

        # 音声データを base64 エンコード
        audio_base64 = base64.b64encode(result.audio_data).decode("utf-8")

        # Viseme データに変換
        visemes = [
            VisemeData(time=v.time, viseme=v.viseme) for v in result.visemes
        ]

        logger.info(
            f"TTS synthesis completed: audio_size={len(result.audio_data)} bytes, "
            f"visemes={len(visemes)}"
        )

        return TTSResponse(
            audio_base64=audio_base64, visemes=visemes, format=result.format
        )

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        logger.error(f"TTS synthesis error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unexpected error during TTS synthesis")
        raise HTTPException(
            status_code=500, detail="Internal server error during speech synthesis"
        ) from e


@router.get("/voices", response_model=VoiceListResponse)
async def get_available_voices() -> VoiceListResponse:
    """
    利用可能な音声名のリストを取得

    Returns:
        VoiceListResponse: 音声名のリスト
    """
    try:
        tts_service = get_tts_service()
        voices = tts_service.get_available_voices()
        return VoiceListResponse(voices=voices)
    except Exception as e:
        logger.exception("Error getting available voices")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve available voices"
        ) from e
