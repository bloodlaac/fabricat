"""Factory for constructing the FastAPI application."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fabricat_backend.api.routers import auth_router, history_router, session_router


def create_api() -> FastAPI:
    """Instantiate and configure the FastAPI application."""
    app = FastAPI(title="Fabricat API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router)
    app.include_router(history_router)
    app.include_router(session_router)
    return app


app = create_api()
