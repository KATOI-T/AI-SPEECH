"""Session settings API endpoints for voice input preferences"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.session_settings_repository import SessionSettingsRepository
from app.schemas.session_settings import SessionSettingsResponse, SessionSettingsUpdate

router = APIRouter()


@router.get("/{session_id}", response_model=SessionSettingsResponse)
def get_session_settings(
    session_id: str,
    db: Session = Depends(get_db),
) -> SessionSettingsResponse:
    """セッションの音声入力設定を取得する

    Args:
        session_id: セッションID

    Returns:
        セッション設定（存在しない場合はデフォルト値を返す）
    """
    repo = SessionSettingsRepository(db)
    settings = repo.get_by_session_id(session_id)

    if not settings:
        # Return default settings if not found
        return SessionSettingsResponse(
            session_id=session_id,
            voice_input_enabled=False,
            auto_send=True,
            mic_permission_checked=False,
        )

    return SessionSettingsResponse.model_validate(settings)


@router.put("/{session_id}", response_model=SessionSettingsResponse)
def update_session_settings(
    session_id: str,
    settings_update: SessionSettingsUpdate,
    db: Session = Depends(get_db),
) -> SessionSettingsResponse:
    """セッションの音声入力設定を更新する

    Args:
        session_id: セッションID
        settings_update: 更新する設定

    Returns:
        更新後のセッション設定
    """
    repo = SessionSettingsRepository(db)
    settings = repo.create_or_update(
        session_id=session_id,
        voice_input_enabled=settings_update.voice_input_enabled,
        auto_send=settings_update.auto_send,
        mic_permission_checked=settings_update.mic_permission_checked,
    )

    return SessionSettingsResponse.model_validate(settings)
