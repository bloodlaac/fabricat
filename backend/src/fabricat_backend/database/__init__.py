"""Database connectivity helpers and configuration objects."""

from fabricat_backend.database.base import BaseSchema
from fabricat_backend.database.dependencies import get_database, get_session
from fabricat_backend.database.repositories import (
    GameHistoryRepository,
    PlayerStatsRecord,
    UserRepository,
)
from fabricat_backend.database.schemas import (
    GamePlayerStatsSchema,
    GameSessionSchema,
    UserSchema,
)
from fabricat_backend.database.service import DatabaseService
from fabricat_backend.settings import BackendSettings, get_settings

__all__ = [
    "BackendSettings",
    "BaseSchema",
    "DatabaseService",
    "GameHistoryRepository",
    "GamePlayerStatsSchema",
    "GameSessionSchema",
    "PlayerStatsRecord",
    "UserRepository",
    "UserSchema",
    "get_database",
    "get_session",
    "get_settings",
]
