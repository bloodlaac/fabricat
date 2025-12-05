from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from fabricat_backend.api import create_api
from fabricat_backend.api.dependencies import get_current_user
from fabricat_backend.api.routers import history as history_router


class _DummyUser:
    def __init__(self) -> None:
        self.id = uuid4()


class _SessionRow:
    def __init__(self, code: str, finished_at: datetime) -> None:
        self.session_code = code
        self.finished_at = finished_at


class _StatsRow:
    def __init__(self, *, place: int) -> None:
        self.capital = 12_345.0
        self.place = place
        self.is_bankrupt = False
        self.is_top1 = place == 1
        self.has_debt = True
        self.total_debt = 1_000.0
        self.factories_basic = 2
        self.factories_auto = 1
        self.factories_builds_basic = 0
        self.factories_builds_auto = 0
        self.factories_upgrades = 1


class _FakeHistoryRepo:
    def __init__(self, *, session_row: _SessionRow | None) -> None:
        self._session_row = session_row
        self.requested_limit: int | None = None

    def get_player_stats_for_session(self, *, user_id: UUID, session_code: str):
        if self._session_row is None or self._session_row.session_code != session_code:
            return None
        return self._session_row, _StatsRow(place=1)

    def get_recent_player_stats(self, *, user_id: UUID, limit: int):
        self.requested_limit = limit
        base_time = datetime.now(tz=UTC)
        rows = []
        for idx in range(limit):
            session_row = _SessionRow(
                code=f"code-{idx}", finished_at=base_time - timedelta(days=idx)
            )
            rows.append((session_row, _StatsRow(place=idx + 1)))
        return rows


@pytest.fixture
def client() -> TestClient:
    app = create_api()
    dummy_user = _DummyUser()
    repo = _FakeHistoryRepo(session_row=_SessionRow("abc123", datetime.now(tz=UTC)))

    app.dependency_overrides[get_current_user] = lambda: dummy_user
    app.dependency_overrides[history_router.get_history_repository] = lambda: repo

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_get_my_game_stats_returns_payload(client: TestClient) -> None:
    response = client.get("/history/games/abc123/me")
    assert response.status_code == 200
    payload = response.json()
    assert payload["session_code"] == "abc123"
    assert payload["capital"] == 12_345.0
    assert payload["place"] == 1
    assert payload["is_top1"] is True


def test_get_my_game_stats_returns_404_for_missing(client: TestClient) -> None:
    response = client.get("/history/games/unknown/me")
    assert response.status_code == 404


def test_get_recent_games_honors_limit(client: TestClient) -> None:
    response = client.get("/history/games/me", params={"limit": 2})
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 2
    assert payload["items"][0]["session_code"] == "code-0"
