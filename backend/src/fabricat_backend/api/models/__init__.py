"""Models used for API request and response payloads."""

from fabricat_backend.api.models.auth import (
    AuthTokenResponse,
    UserLoginRequest,
    UserLoginResponse,
    UserRegisterRequest,
    UserRegisterResponse,
    UserResponse,
)
from fabricat_backend.api.models.history import (
    PlayerGameStats,
    PlayerGameStatsList,
)

__all__ = [
    "AuthTokenResponse",
    "UserLoginRequest",
    "UserLoginResponse",
    "UserRegisterRequest",
    "UserRegisterResponse",
    "UserResponse",
    "PlayerGameStats",
    "PlayerGameStatsList",
]
