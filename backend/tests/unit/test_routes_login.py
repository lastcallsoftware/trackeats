from types import SimpleNamespace, TracebackType

import pytest
from flask import Flask
from flask.testing import FlaskClient

import routes


class _DummyTxn:
    def __enter__(self) -> "_DummyTxn":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> bool:
        return False


def _mock_session(monkeypatch: pytest.MonkeyPatch) -> None:
    session = SimpleNamespace(begin=lambda: _DummyTxn())
    monkeypatch.setattr(routes.db, "session", session, raising=False)


@pytest.fixture
def client() -> FlaskClient:
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(routes.bp)
    return app.test_client()


def test_login_non_json_returns_401(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    resp = client.post("/api/login", data="not-json", content_type="text/plain")

    assert resp.status_code == 401
    assert "Invalid request - not JSON" in resp.get_json()["msg"]


def test_login_success_returns_access_token(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setenv("ACCESS_TOKEN_DURATION", "120")

    verified_user = SimpleNamespace(seed_requested=False, seeded_at=None, username="testuser")

    def _verify(email: str, password: str) -> SimpleNamespace:
        return verified_user

    def _create_access_token(identity: str, expires_delta: object, additional_claims: object) -> str:
        return "token-123"

    monkeypatch.setattr(routes.User, "verify", staticmethod(_verify))
    monkeypatch.setattr(routes, "create_access_token", _create_access_token)

    resp = client.post("/api/login", json={"email": "user1@example.com", "password": "pw"})

    assert resp.status_code == 200
    assert resp.get_json()["access_token"] == "token-123"


def test_login_seeds_when_requested(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setenv("ACCESS_TOKEN_DURATION", "120")

    verified_user = SimpleNamespace(seed_requested=True, seeded_at=None, username="testuser")

    def _verify(email: str, password: str) -> SimpleNamespace:
        return verified_user

    seeded = {"called": False}

    def _seed(user: object) -> None:
        seeded["called"] = True

    def _create_access_token(identity: str, expires_delta: object, additional_claims: object) -> str:
        return "token-123"

    monkeypatch.setattr(routes.User, "verify", staticmethod(_verify))
    monkeypatch.setattr(routes.Data, "seed_database", staticmethod(_seed))
    monkeypatch.setattr(routes, "create_access_token", _create_access_token)

    resp = client.post("/api/login", json={"email": "user1@example.com", "password": "pw"})

    assert resp.status_code == 200
    assert seeded["called"] is True
