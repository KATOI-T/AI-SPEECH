from fastapi import APIRouter

from app.api.v1 import (
    animations,
    backgrounds,
    characters,
    chat,
    generation,
    health,
    models,
    scenarios,
    session_settings,
    speech,
    tts,
)

api_router = APIRouter()

# Health check endpoints
api_router.include_router(health.router, prefix="/health", tags=["health"])

# Scenario endpoints
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["scenarios"])

# Character endpoints
api_router.include_router(characters.router, prefix="/characters", tags=["characters"])

# Animation endpoints
api_router.include_router(animations.router, prefix="/animations", tags=["animations"])

# Model storage endpoints
api_router.include_router(models.router, prefix="/models", tags=["models"])

# Background image endpoints
api_router.include_router(
    backgrounds.router, prefix="/backgrounds", tags=["backgrounds"]
)

# TTS endpoints
api_router.include_router(tts.router, prefix="/tts", tags=["tts"])

# Speech endpoints (STT + TTS統合)
api_router.include_router(speech.router, prefix="/speech", tags=["speech"])

# Chat endpoints
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

# Session settings endpoints
api_router.include_router(
    session_settings.router, prefix="/session-settings", tags=["session-settings"]
)

# Generation endpoints (scenario auto-generation only)
api_router.include_router(
    generation.router,
    prefix="/generation/scenario",
    tags=["generation"],
)
