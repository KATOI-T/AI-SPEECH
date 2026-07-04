"""Session settings schemas for voice input preferences"""

from pydantic import BaseModel, ConfigDict


class SessionSettingsBase(BaseModel):
    """セッション設定基本スキーマ"""

    voice_input_enabled: bool = False
    auto_send: bool = True
    mic_permission_checked: bool = False


class SessionSettingsUpdate(SessionSettingsBase):
    """セッション設定更新スキーマ"""

    pass


class SessionSettingsResponse(SessionSettingsBase):
    """セッション設定レスポンススキーマ"""

    model_config = ConfigDict(from_attributes=True)

    session_id: str
