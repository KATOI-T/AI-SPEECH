from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.animation_model import AnimationModel
from app.schemas.animation import AnimationModelCreate, AnimationModelUpdate


class AnimationModelRepository:
    """アニメーションモデルリポジトリ"""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, model_id: int) -> AnimationModel | None:
        """IDでアニメーションモデルを取得"""
        return (
            self.db.query(AnimationModel)
            .filter(AnimationModel.id == model_id)
            .first()
        )

    def get_by_name(self, name: str) -> AnimationModel | None:
        """名前でアニメーションモデルを取得"""
        return (
            self.db.query(AnimationModel)
            .filter(AnimationModel.name == name)
            .first()
        )

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
    ) -> list[AnimationModel]:
        """アニメーションモデル一覧を取得"""
        query = self.db.query(AnimationModel)
        if active_only:
            query = query.filter(AnimationModel.is_active == True)  # noqa: E712
        return query.order_by(AnimationModel.id).offset(skip).limit(limit).all()

    def count(self, active_only: bool = True) -> int:
        """アニメーションモデル数を取得"""
        query = self.db.query(func.count(AnimationModel.id))
        if active_only:
            query = query.filter(AnimationModel.is_active == True)  # noqa: E712
        return query.scalar()

    def create(self, data: AnimationModelCreate) -> AnimationModel:
        """アニメーションモデルを作成"""
        model_data = data.model_dump()
        if model_data.get("animation_config"):
            model_data["animation_config"] = data.animation_config.model_dump()

        # is_default=True の場合、既存のデフォルトを解除
        if model_data.get("is_default"):
            self._clear_default()

        model = AnimationModel(**model_data)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def update(
        self, model_id: int, data: AnimationModelUpdate
    ) -> AnimationModel | None:
        """アニメーションモデルを更新"""
        model = self.get_by_id(model_id)
        if not model:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # animation_config を dict に変換
        if "animation_config" in update_data and update_data["animation_config"]:
            update_data["animation_config"] = data.animation_config.model_dump()

        # is_default=True の場合、既存のデフォルトを解除
        if update_data.get("is_default"):
            self._clear_default(exclude_id=model_id)

        for key, value in update_data.items():
            setattr(model, key, value)

        self.db.commit()
        self.db.refresh(model)
        return model

    def delete(self, model_id: int) -> bool:
        """アニメーションモデルを削除（論理削除）"""
        model = self.get_by_id(model_id)
        if not model:
            return False

        model.is_active = False
        self.db.commit()
        return True

    def _clear_default(self, exclude_id: int | None = None) -> None:
        """既存のデフォルトフラグを解除"""
        query = self.db.query(AnimationModel).filter(
            AnimationModel.is_default == True  # noqa: E712
        )
        if exclude_id is not None:
            query = query.filter(AnimationModel.id != exclude_id)
        query.update({"is_default": False})
