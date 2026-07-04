"""カスタム例外クラス"""

from enum import Enum


class SessionErrorCode(str, Enum):
    """セッションエラーコード"""

    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION"
    INVALID_EXTENSION_TIME = "INVALID_EXTENSION_TIME"
    MAX_EXTENSIONS_REACHED = "MAX_EXTENSIONS_REACHED"


class SessionError(Exception):
    """セッション関連エラーの基底クラス"""

    def __init__(
        self, code: SessionErrorCode, message: str, detail: str | None = None
    ) -> None:
        self.code = code
        self.message = message
        self.detail = detail
        super().__init__(message)


class SessionNotFoundError(SessionError):
    """セッションが見つからない"""

    def __init__(self, session_id: str) -> None:
        super().__init__(
            code=SessionErrorCode.SESSION_NOT_FOUND,
            message=f"Session not found: {session_id}",
            detail="セッションが見つかりません。新しいセッションを開始してください。",
        )


class InvalidStateTransitionError(SessionError):
    """不正な状態遷移"""

    def __init__(self, current_status: str, target_status: str) -> None:
        super().__init__(
            code=SessionErrorCode.INVALID_STATE_TRANSITION,
            message=f"Cannot transition from {current_status} to {target_status}",
            detail=f"現在の状態（{current_status}）では、この操作を実行できません。",
        )
