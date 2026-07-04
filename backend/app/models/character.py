from datetime import datetime
from enum import Enum

from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy import Enum as SQLEnum

from app.core.database import Base


class ModelType(str, Enum):
    """3Dモデル形式"""

    vrm = "vrm"
    glb = "glb"


class Character(Base):
    """キャラクターモデル"""

    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    persona = Column(Text, nullable=False)
    speaking_style = Column(Text, nullable=True)
    system_prompt = Column(Text, nullable=False)
    model_path = Column(String(255), nullable=False)
    model_type = Column(SQLEnum(ModelType), nullable=False, default=ModelType.vrm)
    voice_config = Column(JSON, nullable=True)
    animation_config = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<Character(id={self.id}, name='{self.name}')>"
