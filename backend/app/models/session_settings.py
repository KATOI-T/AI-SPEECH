"""Session settings model for voice input preferences"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.mysql import BIGINT

from app.core.database import Base


class SessionSettings(Base):
    """セッション設定モデル（音声入力設定）"""

    __tablename__ = "session_settings"

    id = Column(BIGINT, primary_key=True, autoincrement=True)
    session_id = Column(String(36), unique=True, nullable=False, index=True)
    voice_input_enabled = Column(Boolean, nullable=False, default=False)
    auto_send = Column(Boolean, nullable=False, default=True)
    mic_permission_checked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<SessionSettings(session_id='{self.session_id}', voice_input_enabled={self.voice_input_enabled})>"
