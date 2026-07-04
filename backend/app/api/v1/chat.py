"""チャットAPIエンドポイント"""

import logging
from datetime import datetime

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import (
    InvalidStateTransitionError,
    SessionError,
    SessionNotFoundError,
)
from app.core.redis import get_redis
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionEndResponse,
    ChatSessionInfoResponse,
    ChatSessionResponse,
    ConversationMessage,
    MessageUpdateRequest,
    MessageUpdateResponse,
    SessionExtendRequest,
    SessionExtendResponse,
    SessionHistoryResponse,
    SessionPauseResponse,
    SessionResumeResponse,
)
from app.services.chat.chat_service import ChatService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


def get_chat_service(
    db: Session = Depends(get_db), redis_client: redis.Redis = Depends(get_redis)
) -> ChatService:
    """ChatServiceの依存性注入"""
    return ChatService(db, redis_client)


@router.post(
    "/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED
)
async def create_session(
    request: ChatSessionCreate, service: ChatService = Depends(get_chat_service)
):
    """
    会話セッションを開始する

    - **scenario_id**: シナリオID
    - **character_id**: キャラクターID
    """
    try:
        return await service.create_session(
            scenario_id=request.scenario_id, character_id=request.character_id
        )
    except ValueError as e:
        logger.warning(f"Session creation failed: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Session creation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}",
        )


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def send_message(
    session_id: str,
    request: ChatMessageRequest,
    service: ChatService = Depends(get_chat_service),
):
    """
    メッセージを送信してAI応答を取得する

    - **session_id**: セッションID
    - **content**: ユーザーメッセージ
    """
    try:
        return await service.send_message(session_id=session_id, content=request.content)
    except ValueError as e:
        logger.warning(f"Message send failed: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Message processing error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}",
        )


@router.delete("/sessions/{session_id}", response_model=ChatSessionEndResponse)
async def end_session(
    session_id: str, service: ChatService = Depends(get_chat_service)
):
    """
    会話セッションを終了する

    - **session_id**: セッションID
    """
    try:
        return await service.end_session(session_id)
    except ValueError as e:
        logger.warning(f"Session end failed: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/sessions/{session_id}", response_model=ChatSessionInfoResponse)
async def get_session_info(
    session_id: str, service: ChatService = Depends(get_chat_service)
):
    """
    セッション情報を取得する

    - **session_id**: セッションID
    """
    try:
        return await service.get_session_info(session_id)
    except (ValueError, SessionNotFoundError) as e:
        logger.warning(f"Get session info failed: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/sessions/{session_id}/history", response_model=SessionHistoryResponse)
async def get_session_history(
    session_id: str, service: ChatService = Depends(get_chat_service)
):
    """
    セッションの会話履歴を取得する

    - **session_id**: セッションID
    """
    try:
        history = await service.get_conversation_history(session_id)
        return SessionHistoryResponse(
            session_id=session_id,
            messages=[ConversationMessage(**msg) for msg in history],
        )
    except ValueError as e:
        logger.warning(f"Get session history failed: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/sessions/{session_id}/pause", response_model=SessionPauseResponse)
async def pause_session(
    session_id: str, service: ChatService = Depends(get_chat_service)
):
    """
    セッションを一時停止する

    - **session_id**: セッションID
    """
    try:
        result = await service.pause_session(session_id)
        return SessionPauseResponse(
            session_id=result["session_id"],
            status="paused",
            paused_at=datetime.fromisoformat(result["paused_at"]),
            expires_at=datetime.fromisoformat(result["expires_at"]),
            message="セッションを一時停止しました。1時間以内に再開してください。",
        )
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": e.code.value, "message": e.detail},
        )
    except InvalidStateTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": e.code.value, "message": e.detail},
        )


@router.post("/sessions/{session_id}/resume", response_model=SessionResumeResponse)
async def resume_session(
    session_id: str, service: ChatService = Depends(get_chat_service)
):
    """
    一時停止中のセッションを再開する

    - **session_id**: セッションID
    """
    try:
        result = await service.resume_session(session_id)
        return SessionResumeResponse(
            session_id=result["session_id"],
            status="active",
            resumed_at=datetime.fromisoformat(result["last_activity_at"]),
            expires_at=datetime.fromisoformat(result["expires_at"]),
            turn_count=result["turn_count"],
            message="セッションを再開しました。",
        )
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": e.code.value, "message": e.detail},
        )
    except InvalidStateTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": e.code.value, "message": e.detail},
        )


@router.post("/sessions/{session_id}/extend", response_model=SessionExtendResponse)
async def extend_session(
    session_id: str,
    request: SessionExtendRequest,
    service: ChatService = Depends(get_chat_service),
):
    """
    セッションのタイムアウトを延長する

    - **session_id**: セッションID
    - **extension_minutes**: 延長時間（分）、デフォルト30、最大60
    """
    try:
        result = await service.extend_session(session_id, request.extension_minutes)
        return SessionExtendResponse(
            session_id=result["session_id"],
            status=result["status"],
            previous_expires_at=datetime.fromisoformat(result["previous_expires_at"]),
            expires_at=datetime.fromisoformat(result["expires_at"]),
            extended_minutes=result["extended_minutes"],
            message=f"セッションを{result['extended_minutes']}分延長しました。",
        )
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": e.code.value, "message": e.detail},
        )
    except InvalidStateTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": e.code.value, "message": e.detail},
        )
    except SessionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code.value, "message": e.detail or str(e)},
        )


@router.put(
    "/sessions/{session_id}/messages/{message_index}",
    response_model=MessageUpdateResponse,
)
async def update_message(
    session_id: str,
    message_index: int,
    request: MessageUpdateRequest,
    service: ChatService = Depends(get_chat_service),
):
    """
    メッセージを更新する

    - **session_id**: セッションID
    - **message_index**: 会話履歴内のメッセージインデックス
    - **content**: 新しいメッセージ内容
    """
    try:
        result = await service.update_message(
            session_id=session_id,
            message_index=message_index,
            content=request.content,
        )
        return MessageUpdateResponse(
            message_id=f"{session_id}:{result['message_index']}",
            content=result["content"],
            updated_at=datetime.fromisoformat(result["updated_at"]),
        )
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": e.code.value, "message": e.detail},
        )
    except ValueError as e:
        logger.warning(f"Message update failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
