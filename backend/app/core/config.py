from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定"""

    # App
    app_name: str = "AI Speech API"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database
    database_url: str = "mysql+pymysql://user:password@localhost:3306/ai_speech"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # OpenAI
    openai_api_key: str = ""

    # Azure Speech Services
    azure_speech_key: str = ""
    azure_speech_region: str = "japaneast"

    # AWS Speech Services
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-northeast-1"

    # Google Cloud Speech Services
    google_application_credentials: str = ""

    # Speech Provider
    speech_provider: Literal["azure", "aws", "google"] = "azure"

    # Storage
    storage_backend: Literal["local", "s3"] = "local"
    s3_bucket_name: str = ""
    s3_presigned_url_expiry: int = 3600
    s3_upload_prefix: str = "uploads"

    # CORS (ports 3000-3200)
    cors_origins: list[str] = [
        f"http://localhost:{port}" for port in range(3000, 3201)
    ]

    # Session
    session_timeout_minutes: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Docker環境の環境変数（MYSQL_*, REDIS_HOSTなど）を許容
        # アプリケーションで使用しない環境変数を無視する
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを取得"""
    return Settings()
