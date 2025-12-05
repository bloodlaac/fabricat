"""Repository for recording finished game sessions and player stats."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from fabricat_backend.database.schemas import GamePlayerStatsSchema, GameSessionSchema


@dataclass(slots=True)
class PlayerStatsRecord:
    """Normalized payload describing a player's final state."""

    user_id: UUID | None
    player_slot_id: int
    capital: float
    place: int
    is_bankrupt: bool
    is_top1: bool
    has_debt: bool
    total_debt: float
    factories_basic: int
    factories_auto: int
    factories_builds_basic: int
    factories_builds_auto: int
    factories_upgrades: int


class GameHistoryRepository:
    """Persist game completion metadata."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def record_session(
        self,
        *,
        session_code: str,
        player_stats: Sequence[PlayerStatsRecord],
        finished_at: datetime | None = None,
    ) -> GameSessionSchema:
        """Create a session record with attached player stats."""
        finished = finished_at or datetime.now(tz=UTC)
        session_row = GameSessionSchema(
            session_code=session_code,
            finished_at=finished,
        )
        self._session.add(session_row)
        self._session.flush()

        stats_rows = [
            GamePlayerStatsSchema(
                session_id=session_row.id,
                user_id=stat.user_id,
                player_slot_id=stat.player_slot_id,
                capital=stat.capital,
                place=stat.place,
                is_bankrupt=stat.is_bankrupt,
                is_top1=stat.is_top1,
                has_debt=stat.has_debt,
                total_debt=stat.total_debt,
                factories_basic=stat.factories_basic,
                factories_auto=stat.factories_auto,
                factories_builds_basic=stat.factories_builds_basic,
                factories_builds_auto=stat.factories_builds_auto,
                factories_upgrades=stat.factories_upgrades,
            )
            for stat in player_stats
        ]
        self._session.add_all(stats_rows)
        self._session.flush()
        return session_row

    def get_player_stats_for_session(
        self,
        *,
        user_id: UUID,
        session_code: str,
    ) -> tuple[GameSessionSchema, GamePlayerStatsSchema] | None:
        """Return the stats row for a user's participation in a session."""
        stmt = (
            select(GameSessionSchema, GamePlayerStatsSchema)
            .join(
                GamePlayerStatsSchema,
                GamePlayerStatsSchema.session_id == GameSessionSchema.id,
            )
            .where(GamePlayerStatsSchema.user_id == user_id)
            .where(GameSessionSchema.session_code == session_code)
        )
        result = self._session.execute(stmt).first()
        if result is None:
            return None
        return result

    def get_recent_player_stats(
        self,
        *,
        user_id: UUID,
        limit: int,
    ) -> list[tuple[GameSessionSchema, GamePlayerStatsSchema]]:
        """Return the most recent session stats for the user."""
        stmt = (
            select(GameSessionSchema, GamePlayerStatsSchema)
            .join(
                GamePlayerStatsSchema,
                GamePlayerStatsSchema.session_id == GameSessionSchema.id,
            )
            .where(GamePlayerStatsSchema.user_id == user_id)
            .order_by(GameSessionSchema.finished_at.desc())
            .limit(limit)
        )
        result = self._session.execute(stmt).all()
        return list(result)


__all__ = ["GameHistoryRepository", "PlayerStatsRecord"]
