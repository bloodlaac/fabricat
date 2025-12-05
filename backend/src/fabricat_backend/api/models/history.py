"""Pydantic models for game history queries."""

from datetime import datetime

from pydantic import BaseModel, Field


class PlayerGameStats(BaseModel):
    """Flattened view of a player's stats in a single session."""

    session_code: str = Field(examples=["abc12345"])
    finished_at: datetime
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


class PlayerGameStatsList(BaseModel):
    """Paginated list wrapper for player game stats."""

    items: list[PlayerGameStats]


__all__ = ["PlayerGameStats", "PlayerGameStatsList"]
