"""Authentication endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from fabricat_backend.api.dependencies import get_auth_service
from fabricat_backend.api.models import (
    AuthTokenResponse,
    UserLoginRequest,
    UserLoginResponse,
    UserRegisterRequest,
    UserRegisterResponse,
    UserResponse,
)
from fabricat_backend.api.services import (
    AuthService,
    InvalidCredentialsError,
    UserAlreadyExistsError,
)
from fabricat_backend.database import get_session

router = APIRouter(prefix="/auth", tags=["auth"])
_security = HTTPBearer(auto_error=False)


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    payload: UserRegisterRequest,
    session: Annotated[Session, Depends(get_session)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> UserRegisterResponse:
    """Register a new user and issue an access token."""
    try:
        user, token = auth_service.register_user(
            session=session,
            nickname=payload.nickname,
            password=payload.password,
            icon=payload.icon,
        )
    except UserAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="User already exists"
        ) from exc

    user_model = UserResponse.model_validate(user, from_attributes=True)
    token_model = AuthTokenResponse(access_token=token)
    return UserRegisterResponse(user=user_model, token=token_model)


@router.post("/login")
def login_user(
    payload: UserLoginRequest,
    session: Annotated[Session, Depends(get_session)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> UserLoginResponse:
    """Authenticate an existing user using nickname and password."""
    try:
        user, token = auth_service.authenticate_user(
            session=session, nickname=payload.nickname, password=payload.password
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        ) from exc

    user_model = UserResponse.model_validate(user, from_attributes=True)
    token_model = AuthTokenResponse(access_token=token)
    return UserLoginResponse(user=user_model, token=token_model)


@router.post("/refresh", response_model=AuthTokenResponse)
def refresh_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_security)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> AuthTokenResponse:
    """Issue a new access token from a valid bearer token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials"
        )
    try:
        token = auth_service.refresh_access_token(credentials.credentials)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc
    return AuthTokenResponse(access_token=token)
