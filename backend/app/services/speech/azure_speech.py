"""Azure Speech Services を使用した TTS/STT 実装"""

import html
import io
import logging
import wave
from datetime import datetime, timedelta, timezone
from typing import Any

import azure.cognitiveservices.speech as speechsdk
import httpx

from app.core.config import get_settings
from app.services.speech.base import (
    SpeechToken,
    STTResult,
    STTServiceBase,
    TTSResult,
    TTSServiceBase,
    VisemeEvent,
)

logger = logging.getLogger(__name__)


def _build_ssml(
    text: str,
    voice_name: str,
    rate: float | None = None,
    pitch: float | None = None,
) -> str:
    """
    SSMLを生成する

    Args:
        text: 合成するテキスト
        voice_name: 音声名
        rate: 音声速度（0.5-2.0）
        pitch: 音声ピッチ（-50 to +50）

    Returns:
        SSML文字列
    """
    # テキストをエスケープ
    escaped_text = html.escape(text)

    # prosody タグの属性を構築
    prosody_attrs = []
    if rate is not None:
        # rate は 0.5 → "50%" or 2.0 → "200%" の形式
        rate_percent = int(rate * 100)
        prosody_attrs.append(f'rate="{rate_percent}%"')
    if pitch is not None:
        # pitch は -50 → "-50%" or +50 → "+50%" の形式
        sign = "+" if pitch >= 0 else ""
        prosody_attrs.append(f'pitch="{sign}{int(pitch)}%"')

    # prosody 属性がある場合はタグで囲む
    if prosody_attrs:
        prosody_attr_str = " ".join(prosody_attrs)
        content = f"<prosody {prosody_attr_str}>{escaped_text}</prosody>"
    else:
        content = escaped_text

    ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
    <voice name="{voice_name}">
        {content}
    </voice>
</speak>"""

    return ssml

# Azure Viseme ID → 文字列マッピング
VISEME_ID_TO_STRING: dict[int, str] = {
    0: "sil",  # silence
    1: "aa",  # あ (open)
    2: "ee",  # え (slightly open)
    3: "ih",  # い (closed, spread)
    4: "oh",  # お (rounded)
    5: "ou",  # う (very rounded)
    6: "PP",  # p, b, m
    7: "FF",  # f, v
    8: "TH",  # th
    9: "DD",  # d, t, n
    10: "kk",  # k, g
    11: "CH",  # ch, sh, j
    12: "SS",  # s, z
    13: "nn",  # n, ng
    14: "RR",  # r
    15: "aa",  # a (repeated for backward compat)
    16: "EE",  # e
    17: "ih",  # i (repeated)
    18: "oh",  # o (repeated)
    19: "ou",  # u (repeated)
    20: "ER",  # er
    21: "W",  # w
}


class AzureSpeechService(TTSServiceBase, STTServiceBase):
    """Azure Speech Services を使用した TTS/STT サービス"""

    def __init__(self) -> None:
        """サービスを初期化"""
        settings = get_settings()
        self.speech_key = settings.azure_speech_key
        self.speech_region = settings.azure_speech_region
        self.default_voice = "ja-JP-NanamiNeural"
        self.provider = "azure"

        if not self.speech_key or not self.speech_region:
            logger.warning(
                "Azure Speech credentials not configured. "
                "Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION."
            )

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
            voice_name: 使用する音声名（デフォルト: ja-JP-NanamiNeural）
            rate: 音声速度（0.5-2.0、デフォルト: 1.0）
            pitch: 音声ピッチ（-50 to +50、デフォルト: 0）

        Returns:
            TTSResult: 音声データと Viseme タイムライン

        Raises:
            ValueError: テキストが空の場合
            RuntimeError: Azure Speech 設定が不正、または音声合成に失敗した場合
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        if not self.speech_key or not self.speech_region:
            raise RuntimeError(
                "Azure Speech Services is not configured. "
                "Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION."
            )

        voice = voice_name or self.default_voice
        use_ssml = rate is not None or pitch is not None
        logger.info(
            f"Synthesizing text with voice: {voice}, "
            f"rate: {rate}, pitch: {pitch}, use_ssml: {use_ssml}"
        )

        # Azure Speech 設定
        speech_config = speechsdk.SpeechConfig(
            subscription=self.speech_key, region=self.speech_region
        )
        speech_config.speech_synthesis_voice_name = voice
        speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm
        )

        # シンセサイザーを作成（audio_config=Noneでメモリに出力）
        # result.audio_data から音声データを取得する
        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config, audio_config=None
        )

        # Viseme イベントを収集
        visemes: list[dict[str, Any]] = []

        def viseme_received(evt: speechsdk.SpeechSynthesisVisemeEventArgs) -> None:
            """Viseme イベントハンドラー"""
            # audio_offset は 100ns 単位 → ms に変換 → 秒に変換
            timestamp_ms = evt.audio_offset / 10000
            timestamp_sec = timestamp_ms / 1000.0
            viseme_id = evt.viseme_id
            viseme_str = VISEME_ID_TO_STRING.get(viseme_id, "sil")

            visemes.append(
                {"time": timestamp_sec, "viseme": viseme_str, "id": viseme_id}
            )
            logger.debug(
                f"Viseme: time={timestamp_sec:.3f}s, "
                f"id={viseme_id}, viseme={viseme_str}"
            )

        synthesizer.viseme_received.connect(viseme_received)

        # 音声合成実行
        try:
            if use_ssml:
                # rate/pitch が指定された場合は SSML を使用
                ssml = _build_ssml(text, voice, rate, pitch)
                logger.info(f"Using SSML with rate={rate}, pitch={pitch}")
                logger.debug(f"SSML content: {ssml}")
                result = synthesizer.speak_ssml_async(ssml).get()
            else:
                # 通常のテキスト合成
                result = synthesizer.speak_text_async(text).get()
        except Exception as e:
            logger.error(f"Speech synthesis failed: {e}")
            raise RuntimeError(f"Speech synthesis failed: {e}") from e

        # 結果チェック
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            logger.info(
                f"Speech synthesis completed. "
                f"Audio size: {len(result.audio_data)} bytes, "
                f"Visemes: {len(visemes)}"
            )

            # VisemeEvent リストに変換
            viseme_events = [
                VisemeEvent(time=v["time"], viseme=v["viseme"]) for v in visemes
            ]

            return TTSResult(
                audio_data=result.audio_data,
                visemes=viseme_events,
                format="wav",
            )
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            error_msg = (
                f"Speech synthesis canceled: {cancellation.reason}. "
                f"Error details: {cancellation.error_details}"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        else:
            error_msg = f"Unexpected result reason: {result.reason}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def get_available_voices(self) -> list[str]:
        """
        利用可能な日本語音声名のリストを取得

        Returns:
            list[str]: 日本語 Neural Voice のリスト
        """
        # 主要な日本語 Neural Voice
        return [
            "ja-JP-NanamiNeural",  # 女性
            "ja-JP-KeitaNeural",  # 男性
            "ja-JP-AoiNeural",  # 女性
            "ja-JP-DaichiNeural",  # 男性
            "ja-JP-MayuNeural",  # 女性
            "ja-JP-NaokiNeural",  # 男性
            "ja-JP-ShioriNeural",  # 女性
        ]

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
            RuntimeError: Azure Speech 設定が不正、または音声認識に失敗した場合
        """
        if not audio_data:
            raise ValueError("Audio data cannot be empty")

        if not self.speech_key or not self.speech_region:
            raise RuntimeError(
                "Azure Speech Services is not configured. "
                "Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION."
            )

        logger.info(f"Recognizing audio with language: {language}")

        # Azure Speech 設定
        speech_config = speechsdk.SpeechConfig(
            subscription=self.speech_key, region=self.speech_region
        )
        speech_config.speech_recognition_language = language

        # 音声データから AudioConfig を作成
        # Azure SDK は WAV ストリームを期待する
        try:
            audio_stream = speechsdk.audio.PushAudioInputStream()
            audio_config = speechsdk.audio.AudioConfig(stream=audio_stream)

            # 音声認識器を作成
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=speech_config, audio_config=audio_config
            )

            # 音声データを送信
            audio_stream.write(audio_data)
            audio_stream.close()

            # 認識実行（単発認識）
            result = recognizer.recognize_once()

            # 音声の長さを計算（WAVヘッダーから読み取り）
            duration = self._get_audio_duration(audio_data)

        except Exception as e:
            logger.error(f"Speech recognition failed: {e}")
            raise RuntimeError(f"Speech recognition failed: {e}") from e

        # 結果チェック
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            # 信頼度スコアを取得（Azure SDKでは直接取得できないため0.95を仮定）
            confidence = 0.95

            logger.info(
                f"Speech recognition completed. Text: '{result.text}', "
                f"Confidence: {confidence}, Duration: {duration}s"
            )

            return STTResult(
                text=result.text,
                confidence=confidence,
                language=language,
                duration=duration,
                provider=self.provider,
            )
        elif result.reason == speechsdk.ResultReason.NoMatch:
            logger.warning("No speech could be recognized")
            return STTResult(
                text="",
                confidence=0.0,
                language=language,
                duration=duration,
                provider=self.provider,
            )
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            error_msg = (
                f"Speech recognition canceled: {cancellation.reason}. "
                f"Error details: {cancellation.error_details}"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        else:
            error_msg = f"Unexpected result reason: {result.reason}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def get_auth_token(self) -> SpeechToken:
        """
        フロントエンド用の認証トークンを取得

        Azure Token Service に対してサブスクリプションキーを送信し、
        認証トークンを取得します。このトークンはフロントエンドで
        SpeechConfig.fromAuthorizationToken() に使用できます。

        Returns:
            SpeechToken: 認証トークン情報

        Raises:
            RuntimeError: トークン取得に失敗した場合
        """
        if not self.speech_key or not self.speech_region:
            raise RuntimeError(
                "Azure Speech Services is not configured. "
                "Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION."
            )

        try:
            # Azure Token Service から認証トークンを取得
            token_url = (
                f"https://{self.speech_region}.api.cognitive.microsoft.com"
                "/sts/v1.0/issueToken"
            )

            with httpx.Client(timeout=10.0) as client:
                response = client.post(
                    token_url,
                    headers={
                        "Ocp-Apim-Subscription-Key": self.speech_key,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                )
                response.raise_for_status()
                token = response.text

            # トークンの有効期限は10分
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

            logger.info(f"Auth token generated, expires at: {expires_at}")

            return SpeechToken(
                token=token, region=self.speech_region, expires_at=expires_at
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to get auth token: HTTP {e.response.status_code}")
            raise RuntimeError(
                f"Failed to get auth token: HTTP {e.response.status_code}"
            ) from e
        except Exception as e:
            logger.error(f"Failed to get auth token: {e}")
            raise RuntimeError(f"Failed to get auth token: {e}") from e

    def _get_audio_duration(self, audio_data: bytes) -> float:
        """
        音声データの長さを取得（WAVヘッダーから計算）

        Args:
            audio_data: 音声データ

        Returns:
            float: 音声の長さ（秒）
        """
        try:
            with io.BytesIO(audio_data) as audio_io:
                with wave.open(audio_io, "rb") as wav_file:
                    frames = wav_file.getnframes()
                    rate = wav_file.getframerate()
                    duration = frames / float(rate)
                    return duration
        except Exception as e:
            logger.warning(f"Failed to get audio duration: {e}. Returning 0.0")
            return 0.0


# 後方互換性のためのエイリアス
AzureTTSService = AzureSpeechService
