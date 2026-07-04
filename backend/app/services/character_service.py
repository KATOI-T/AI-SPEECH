from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.schemas.voice import ModelUploadResponse, VoiceInfo


class CharacterService:
    """キャラクター関連ビジネスロジック"""

    async def upload_model(self, file: UploadFile) -> ModelUploadResponse:
        """
        3Dモデルファイルをアップロード

        Args:
            file: アップロードファイル

        Returns:
            ModelUploadResponse: アップロード結果

        Raises:
            HTTPException: ファイル形式エラー、サイズ超過エラー
        """
        from app.api.v1.models import get_storage_service

        file_name = file.filename or "model"
        storage = get_storage_service()

        try:
            file_path = await storage.upload(file.file, file_name)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
            )

        file.file.seek(0, 2)
        file_size = file.file.tell()
        ext = Path(file_name).suffix.lower().lstrip(".")

        return ModelUploadResponse(
            file_path=file_path,
            file_name=file_name,
            file_size=file_size,
            model_type=ext,
        )

    def get_available_voices(
        self, provider: str | None = None, language: str = "ja-JP"
    ) -> list[VoiceInfo]:
        """
        利用可能な音声一覧を取得

        Args:
            provider: プロバイダー指定（azure/aws/google）
            language: 言語コード（デフォルト: ja-JP）

        Returns:
            list[VoiceInfo]: 音声情報リスト
        """
        # 各プロバイダーの日本語音声リスト（ハードコード、将来的にはAPI取得）
        all_voices = [
            # Azure
            VoiceInfo(
                provider="azure",
                voice_name="ja-JP-NanamiNeural",
                display_name="Nanami（女性）",
                gender="female",
                language="ja-JP",
                style_list=["cheerful", "sad", "angry", "fearful"],
            ),
            VoiceInfo(
                provider="azure",
                voice_name="ja-JP-KeitaNeural",
                display_name="Keita（男性）",
                gender="male",
                language="ja-JP",
                style_list=[],
            ),
            VoiceInfo(
                provider="azure",
                voice_name="ja-JP-AoiNeural",
                display_name="Aoi（女性）",
                gender="female",
                language="ja-JP",
                style_list=[],
            ),
            VoiceInfo(
                provider="azure",
                voice_name="ja-JP-DaichiNeural",
                display_name="Daichi（男性）",
                gender="male",
                language="ja-JP",
                style_list=[],
            ),
            # AWS
            VoiceInfo(
                provider="aws",
                voice_name="Mizuki",
                display_name="Mizuki（女性）",
                gender="female",
                language="ja-JP",
                style_list=[],
            ),
            VoiceInfo(
                provider="aws",
                voice_name="Takumi",
                display_name="Takumi（男性）",
                gender="male",
                language="ja-JP",
                style_list=[],
            ),
            # Google
            VoiceInfo(
                provider="google",
                voice_name="ja-JP-Neural2-B",
                display_name="Neural2-B（女性）",
                gender="female",
                language="ja-JP",
                style_list=[],
            ),
            VoiceInfo(
                provider="google",
                voice_name="ja-JP-Neural2-C",
                display_name="Neural2-C（男性）",
                gender="male",
                language="ja-JP",
                style_list=[],
            ),
            VoiceInfo(
                provider="google",
                voice_name="ja-JP-Neural2-D",
                display_name="Neural2-D（男性）",
                gender="male",
                language="ja-JP",
                style_list=[],
            ),
        ]

        # フィルタリング
        filtered = all_voices
        if provider:
            filtered = [v for v in filtered if v.provider == provider]
        if language:
            filtered = [v for v in filtered if v.language == language]

        return filtered
