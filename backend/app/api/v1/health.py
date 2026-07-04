from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""

    status: str
    version: str
    database: str
    redis: str


class HealthDetailResponse(BaseModel):
    """詳細ヘルスチェックレスポンス"""

    status: str
    version: str
    database: dict
    redis: dict
    services: dict


@router.get("", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    """
    基本ヘルスチェック

    サービスの稼働状態を確認します。
    """
    # Database check
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    # Redis check (簡易)
    redis_status = "healthy"
    # TODO: Redis接続チェックを実装

    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        version=settings.app_version,
        database=db_status,
        redis=redis_status,
    )


@router.get("/ready")
async def readiness_check(db: Session = Depends(get_db)) -> dict:
    """
    Readiness チェック

    サービスがリクエストを受け付ける準備ができているか確認します。
    """
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        return {"status": "not_ready", "error": str(e)}


@router.get("/live")
async def liveness_check() -> dict:
    """
    Liveness チェック

    サービスが生存しているか確認します。
    """
    return {"status": "alive"}
