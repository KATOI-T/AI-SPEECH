from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.character import Character
from app.schemas.character import CharacterCreate, CharacterUpdate


class CharacterRepository:
    """キャラクターリポジトリ"""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, character_id: int) -> Character | None:
        """IDでキャラクターを取得"""
        return self.db.query(Character).filter(Character.id == character_id).first()

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
    ) -> list[Character]:
        """キャラクター一覧を取得"""
        query = self.db.query(Character)
        if active_only:
            query = query.filter(Character.is_active == True)  # noqa: E712
        return query.offset(skip).limit(limit).all()

    def count(self, active_only: bool = True) -> int:
        """キャラクター数を取得"""
        query = self.db.query(func.count(Character.id))
        if active_only:
            query = query.filter(Character.is_active == True)  # noqa: E712
        return query.scalar()

    def create(self, character_data: CharacterCreate) -> Character:
        """キャラクターを作成"""
        # voice_config と animation_config を dict に変換
        data = character_data.model_dump()
        if data.get("voice_config"):
            data["voice_config"] = character_data.voice_config.model_dump()
        if data.get("animation_config"):
            data["animation_config"] = character_data.animation_config.model_dump()

        character = Character(**data)
        self.db.add(character)
        self.db.commit()
        self.db.refresh(character)
        return character

    def update(
        self, character_id: int, character_data: CharacterUpdate
    ) -> Character | None:
        """キャラクターを更新"""
        character = self.get_by_id(character_id)
        if not character:
            return None

        update_data = character_data.model_dump(exclude_unset=True)

        # voice_config と animation_config を dict に変換
        if "voice_config" in update_data and update_data["voice_config"]:
            update_data["voice_config"] = character_data.voice_config.model_dump()
        if "animation_config" in update_data and update_data["animation_config"]:
            update_data["animation_config"] = character_data.animation_config.model_dump()

        for key, value in update_data.items():
            setattr(character, key, value)

        self.db.commit()
        self.db.refresh(character)
        return character

    def delete(self, character_id: int) -> bool:
        """キャラクターを削除（論理削除）"""
        character = self.get_by_id(character_id)
        if not character:
            return False

        character.is_active = False
        self.db.commit()
        return True

    def hard_delete(self, character_id: int) -> bool:
        """キャラクターを物理削除"""
        character = self.get_by_id(character_id)
        if not character:
            return False

        self.db.delete(character)
        self.db.commit()
        return True
