"""Service that persists completed game sessions and player stats."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from fabricat_backend.database import GameHistoryRepository, PlayerStatsRecord
from fabricat_backend.database.service import DatabaseService
from fabricat_backend.game_logic.session import PlayerFinalStats


@dataclass(slots=True)
class PlayerHistoryPayload:
    """End-of-game stats paired with the user that controlled the player."""

    user_id: UUID | None
    stats: PlayerFinalStats


class GameHistoryRecorder:
    """Facade that writes gameplay statistics to the database."""

    def __init__(self, *, database: DatabaseService) -> None:
        self._database = database

    def record(
        self,
        *,
        session_code: str,
        finished_at: datetime,
        stats: list[PlayerHistoryPayload],
    ) -> None:
        """Persist the final state of a completed session."""
        with self._database.session() as session:
            repository = GameHistoryRepository(session)
            repository.record_session(
                session_code=session_code,
                finished_at=finished_at,
                player_stats=[
                    PlayerStatsRecord(
                        user_id=payload.user_id,
                        player_slot_id=payload.stats.player_id,
                        capital=payload.stats.capital,
                        place=payload.stats.place,
                        is_bankrupt=payload.stats.is_bankrupt,
                        is_top1=payload.stats.is_top1,
                        has_debt=payload.stats.has_debt,
                        total_debt=payload.stats.total_debt,
                        factories_basic=payload.stats.factories_basic,
                        factories_auto=payload.stats.factories_auto,
                        factories_builds_basic=payload.stats.factories_builds_basic,
                        factories_builds_auto=payload.stats.factories_builds_auto,
                        factories_upgrades=payload.stats.factories_upgrades,
                    )
                    for payload in stats
                ],
            )


__all__ = ["GameHistoryRecorder", "PlayerHistoryPayload"]
