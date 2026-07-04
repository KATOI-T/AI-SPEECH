"""Storage service abstract base class"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO


class StorageBase(ABC):
    """ストレージサービスの抽象基底クラス"""

    ALLOWED_EXTENSIONS = {".vrm", ".glb"}
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

    def validate_file(self, file: BinaryIO, filename: str) -> tuple[str, int]:
        """
        ファイルのバリデーション

        Args:
            file: ファイルオブジェクト
            filename: ファイル名

        Returns:
            tuple[str, int]: (拡張子, ファイルサイズ)

        Raises:
            ValueError: バリデーションエラー
        """
        ext = Path(filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Invalid file extension: {ext}. Allowed: {self.ALLOWED_EXTENSIONS}"
            )

        file.seek(0, 2)
        size = file.tell()
        file.seek(0)

        if size > self.MAX_FILE_SIZE:
            raise ValueError(f"File too large: {size} bytes (max: {self.MAX_FILE_SIZE})")

        if size == 0:
            raise ValueError("File is empty")

        return ext, size

    @abstractmethod
    async def upload(self, file: BinaryIO, filename: str) -> str:
        """
        ファイルをアップロードし、パスを返す

        Args:
            file: ファイルオブジェクト
            filename: 元のファイル名

        Returns:
            str: 保存先パス

        Raises:
            ValueError: ファイルが無効な場合
        """
        pass

    @abstractmethod
    async def delete(self, file_path: str) -> bool:
        """
        ファイルを削除

        Args:
            file_path: ファイルパス

        Returns:
            bool: 削除成功したかどうか
        """
        pass

    @abstractmethod
    async def list_files(self) -> list[dict]:
        """
        ファイル一覧を取得

        Returns:
            list[dict]: ファイル情報のリスト
        """
        pass

    @abstractmethod
    def get_public_url(self, file_path: str) -> str:
        """
        公開URLを取得

        Args:
            file_path: ファイルパス

        Returns:
            str: 公開URL
        """
        pass
