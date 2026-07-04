from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.scenario import Scenario
from app.schemas.scenario import ScenarioCreate, ScenarioUpdate


class ScenarioRepository:
    """シナリオリポジトリ"""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, scenario_id: int) -> Scenario | None:
        """IDでシナリオを取得"""
        return self.db.query(Scenario).filter(Scenario.id == scenario_id).first()

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
    ) -> list[Scenario]:
        """シナリオ一覧を取得"""
        query = self.db.query(Scenario)
        if active_only:
            query = query.filter(Scenario.is_active == True)  # noqa: E712
        return query.offset(skip).limit(limit).all()

    def count(self, active_only: bool = True) -> int:
        """シナリオ数を取得"""
        query = self.db.query(func.count(Scenario.id))
        if active_only:
            query = query.filter(Scenario.is_active == True)  # noqa: E712
        return query.scalar()

    def create(self, scenario_data: ScenarioCreate) -> Scenario:
        """シナリオを作成"""
        scenario = Scenario(**scenario_data.model_dump())
        self.db.add(scenario)
        self.db.commit()
        self.db.refresh(scenario)
        return scenario

    def update(self, scenario_id: int, scenario_data: ScenarioUpdate) -> Scenario | None:
        """シナリオを更新"""
        scenario = self.get_by_id(scenario_id)
        if not scenario:
            return None

        update_data = scenario_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(scenario, key, value)

        self.db.commit()
        self.db.refresh(scenario)
        return scenario

    def delete(self, scenario_id: int) -> bool:
        """シナリオを削除（論理削除）"""
        scenario = self.get_by_id(scenario_id)
        if not scenario:
            return False

        scenario.is_active = False
        self.db.commit()
        return True

    def hard_delete(self, scenario_id: int) -> bool:
        """シナリオを物理削除"""
        scenario = self.get_by_id(scenario_id)
        if not scenario:
            return False

        self.db.delete(scenario)
        self.db.commit()
        return True
