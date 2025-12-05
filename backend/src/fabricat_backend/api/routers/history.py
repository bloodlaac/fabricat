"""HTTP endpoints for querying game history."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from fabricat_backend.api.dependencies import get_current_user
from fabricat_backend.api.models.history import PlayerGameStats, PlayerGameStatsList
from fabricat_backend.database import GameHistoryRepository, get_session
from fabricat_backend.database.schemas import UserSchema

router = APIRouter(prefix="/history", tags=["history"])


def get_history_repository(
    session: Annotated[Session, Depends(get_session)],
) -> GameHistoryRepository:
    """Resolve a GameHistoryRepository bound to the current session."""

    return GameHistoryRepository(session)


def _to_model(row: tuple) -> PlayerGameStats:
    session_row, stats_row = row
    return PlayerGameStats(
        session_code=session_row.session_code,
        finished_at=session_row.finished_at,
        capital=stats_row.capital,
        place=stats_row.place,
        is_bankrupt=stats_row.is_bankrupt,
        is_top1=stats_row.is_top1,
        has_debt=stats_row.has_debt,
        total_debt=stats_row.total_debt,
        factories_basic=stats_row.factories_basic,
        factories_auto=stats_row.factories_auto,
        factories_builds_basic=stats_row.factories_builds_basic,
        factories_builds_auto=stats_row.factories_builds_auto,
        factories_upgrades=stats_row.factories_upgrades,
    )


@router.get(
    "/games/{session_code}/me",
    response_model=PlayerGameStats,
    status_code=status.HTTP_200_OK,
)
def get_my_game_stats(
    session_code: str,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    repository: Annotated[GameHistoryRepository, Depends(get_history_repository)],
) -> PlayerGameStats:
    """Return the current user's stats for the specified session code."""

    row = repository.get_player_stats_for_session(
        user_id=current_user.id,
        session_code=session_code,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _to_model(row)


@router.get(
    "/games/me",
    response_model=PlayerGameStatsList,
    status_code=status.HTTP_200_OK,
)
def get_recent_my_games(
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    repository: Annotated[GameHistoryRepository, Depends(get_history_repository)],
    limit: int = Query(10, ge=1, le=100),
) -> PlayerGameStatsList:
    """Return the most recent games for the current user."""

    rows = repository.get_recent_player_stats(user_id=current_user.id, limit=limit)
    return PlayerGameStatsList(items=[_to_model(row) for row in rows])


__all__ = ["router"]
