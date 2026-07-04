from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.scenario_repository import ScenarioRepository
from app.schemas.scenario import (
    ScenarioCreate,
    ScenarioListResponse,
    ScenarioResponse,
    ScenarioUpdate,
)

router = APIRouter()


@router.get("", response_model=ScenarioListResponse)
async def list_scenarios(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
) -> ScenarioListResponse:
    """
    シナリオ一覧を取得

    - **skip**: スキップ数
    - **limit**: 取得件数
    - **active_only**: 有効なシナリオのみ取得
    """
    repo = ScenarioRepository(db)
    items = repo.get_all(skip=skip, limit=limit, active_only=active_only)
    total = repo.count(active_only=active_only)
    return ScenarioListResponse(
        items=[ScenarioResponse.model_validate(item) for item in items],
        total=total,
    )


@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    scenario_data: ScenarioCreate,
    db: Session = Depends(get_db),
) -> ScenarioResponse:
    """
    シナリオを作成

    - **name**: シナリオ名（必須）
    - **situation**: シチュエーション設定（必須）
    - **description**: 説明
    - **goal**: 会話の目標
    - **evaluation_criteria**: 評価基準
    """
    repo = ScenarioRepository(db)
    scenario = repo.create(scenario_data)
    return ScenarioResponse.model_validate(scenario)


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
) -> ScenarioResponse:
    """
    シナリオを取得

    - **scenario_id**: シナリオID
    """
    repo = ScenarioRepository(db)
    scenario = repo.get_by_id(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with id {scenario_id} not found",
        )
    return ScenarioResponse.model_validate(scenario)


@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: int,
    scenario_data: ScenarioUpdate,
    db: Session = Depends(get_db),
) -> ScenarioResponse:
    """
    シナリオを更新

    - **scenario_id**: シナリオID
    """
    repo = ScenarioRepository(db)
    scenario = repo.update(scenario_id, scenario_data)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with id {scenario_id} not found",
        )
    return ScenarioResponse.model_validate(scenario)


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
) -> None:
    """
    シナリオを削除（論理削除）

    - **scenario_id**: シナリオID
    """
    repo = ScenarioRepository(db)
    if not repo.delete(scenario_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with id {scenario_id} not found",
        )
