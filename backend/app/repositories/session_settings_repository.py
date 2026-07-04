"""Session settings repository for voice input preferences"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.session_settings import SessionSettings


class SessionSettingsRepository:
    """セッション設定リポジトリ"""

    def __init__(self, db: Session):
        self.db = db

    def get_by_session_id(self, session_id: str) -> SessionSettings | None:
        """セッションIDで設定を取得"""
        return (
            self.db.query(SessionSettings)
            .filter(SessionSettings.session_id == session_id)
            .first()
        )

    def create_or_update(
        self,
        session_id: str,
        voice_input_enabled: bool,
        auto_send: bool,
        mic_permission_checked: bool,
    ) -> SessionSettings:
        """設定を作成または更新"""
        settings = self.get_by_session_id(session_id)

        if settings:
            # Update existing
            settings.voice_input_enabled = voice_input_enabled
            settings.auto_send = auto_send
            settings.mic_permission_checked = mic_permission_checked
            settings.updated_at = datetime.utcnow()
        else:
            # Create new
            settings = SessionSettings(
                session_id=session_id,
                voice_input_enabled=voice_input_enabled,
                auto_send=auto_send,
                mic_permission_checked=mic_permission_checked,
            )
            self.db.add(settings)

        self.db.commit()
        self.db.refresh(settings)
        return settings
