from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.redis import redis_client

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # Startup
    print(f"Starting {settings.app_name} v{settings.app_version}")
    await redis_client.connect()
    print("Redis connected")
    yield
    # Shutdown
    await redis_client.disconnect()
    print(f"Shutting down {settings.app_name}")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AIロープレ会話システム - 3Dキャラクターと音声対話を行うWebアプリケーション",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }
