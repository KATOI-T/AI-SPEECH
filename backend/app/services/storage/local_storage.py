"""Local storage implementation for model uploads"""

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import BinaryIO

from .base import StorageBase


class LocalStorage(StorageBase):
    """モデルファイルのローカルストレージ"""

    def __init__(self):
        # 環境変数からパスを取得（Docker環境対応）
        # Docker: MODEL_UPLOADS_DIR=/uploads (共有ボリューム)
        # ローカル: frontend/public/models/uploads
        env_path = os.environ.get("MODEL_UPLOADS_DIR")
        if env_path:
            self.upload_dir = Path(env_path)
        else:
            # ローカル開発環境用のデフォルトパス
            self.upload_dir = (
                Path(__file__).parent.parent.parent.parent.parent
                / "frontend"
                / "public"
                / "models"
                / "uploads"
            )
        # ディレクトリが存在しない場合は作成
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def upload(self, file: BinaryIO, filename: str) -> str:
        """
        ファイルをアップロード

        Args:
            file: ファイルオブジェクト
            filename: 元のファイル名

        Returns:
            str: 保存先パス (/models/uploads/{filename})

        Raises:
            ValueError: ファイルが無効な場合
        """
        ext, _ = self.validate_file(file, filename)

        # ユニークなファイル名生成
        unique_id = uuid.uuid4().hex[:8]
        safe_name = Path(filename).stem
        new_filename = f"{unique_id}_{safe_name}{ext}"

        # ファイル保存
        file_path = self.upload_dir / new_filename
        with open(file_path, "wb") as f:
            f.write(file.read())

        return f"/models/uploads/{new_filename}"

    async def delete(self, file_path: str) -> bool:
        """
        ファイルを削除

        Args:
            file_path: ファイルパス (/models/uploads/{filename})

        Returns:
            bool: 削除成功したかどうか
        """
        # パスからファイル名を抽出
        filename = Path(file_path).name
        full_path = self.upload_dir / filename

        if not full_path.exists():
            return False

        # uploadsディレクトリ内のファイルのみ削除可能
        if not str(full_path).startswith(str(self.upload_dir)):
            raise ValueError("Cannot delete files outside uploads directory")

        os.remove(full_path)
        return True

    async def list_files(self) -> list[dict]:
        """
        ファイル一覧を取得

        Returns:
            list[dict]: ファイル情報のリスト
        """
        files = []
        if not self.upload_dir.exists():
            return files

        for f in self.upload_dir.iterdir():
            if f.is_file() and f.suffix.lower() in self.ALLOWED_EXTENSIONS:
                stat = f.stat()
                files.append(
                    {
                        "file_path": f"/models/uploads/{f.name}",
                        "file_name": f.name,
                        "file_size": stat.st_size,
                        "model_type": f.suffix.lower().lstrip("."),
                        "uploaded_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    }
                )
        return sorted(files, key=lambda x: x["uploaded_at"], reverse=True)

    def get_public_url(self, file_path: str) -> str:
        """
        公開URLを取得

        Args:
            file_path: ファイルパス

        Returns:
            str: 公開URL（Next.jsの静的ファイル配信を使用）
        """
        return file_path
