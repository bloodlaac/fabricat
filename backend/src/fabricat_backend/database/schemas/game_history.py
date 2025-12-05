"""Database schemas for completed game sessions and player stats."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fabricat_backend.database.base import BaseSchema


class GameSessionSchema(BaseSchema):
    """Represents a finished game session."""

    __tablename__ = "game_sessions"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    session_code: Mapped[str] = mapped_column(String(32), nullable=False)
    finished_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    player_stats: Mapped[list["GamePlayerStatsSchema"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )


class GamePlayerStatsSchema(BaseSchema):
    """Stores per-player statistics for a completed session."""

    __tablename__ = "game_player_stats"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    session_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("game_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    player_slot_id: Mapped[int] = mapped_column(Integer, nullable=False)

    capital: Mapped[float] = mapped_column(Float, nullable=False)
    place: Mapped[int] = mapped_column(Integer, nullable=False)
    is_bankrupt: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_top1: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_debt: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    total_debt: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    factories_basic: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    factories_auto: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    factories_builds_basic: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    factories_builds_auto: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    factories_upgrades: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped[GameSessionSchema] = relationship(back_populates="player_stats")


__all__ = ["GamePlayerStatsSchema", "GameSessionSchema"]
