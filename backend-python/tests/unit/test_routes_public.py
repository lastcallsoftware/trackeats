from types import SimpleNamespace, TracebackType
from datetime import datetime, timedelta
from typing import Any

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


def _mock_session(monkeypatch: pytest.MonkeyPatch, execute_side_effect: BaseException | None = None) -> SimpleNamespace:
    def _execute(*args: object, **kwargs: object) -> None:
        if execute_side_effect is not None:
            raise execute_side_effect
        return None

    session = SimpleNamespace(begin=lambda: _DummyTxn(), execute=_execute)
    monkeypatch.setattr(routes.db, "session", session, raising=False)
    return session


@pytest.fixture
def client() -> FlaskClient:
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(routes.bp)
    return app.test_client()


def test_health_ok(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    resp = client.get("/api/health")

    assert resp.status_code == 200
    assert resp.get_json()["msg"] == "Server OK"


def test_health_db_failure_returns_500(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch, execute_side_effect=RuntimeError("db down"))

    resp = client.get("/api/health")

    assert resp.status_code == 500
    assert "Health check failed" in resp.get_json()["msg"]


def test_register_non_json_returns_401(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    resp = client.post("/api/register", data="not-json", content_type="text/plain")

    assert resp.status_code == 401
    assert "Invalid request - not JSON" in resp.get_json()["msg"]


def test_register_success(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    created_user = SimpleNamespace(username="newuser", confirmation_sent_at=None)

    def _token() -> str:
        return "token-123"

    def _add_user(payload: dict[str, Any]) -> SimpleNamespace:
        return created_user

    def _send_confirmation(username: str, token: str, email: str) -> None:
        return None

    monkeypatch.setattr(routes.Crypto, "generate_url_token", staticmethod(_token))
    monkeypatch.setattr(routes.User, "add", staticmethod(_add_user))
    monkeypatch.setattr(routes.Sendmail, "send_confirmation_email", staticmethod(_send_confirmation))

    resp = client.post(
        "/api/register",
        json={
            "username": "newuser",
            "password": "password12345",
            "email": "newuser@example.com",
            "seed_requested": False,
        },
    )

    assert resp.status_code == 200
    assert "User newuser registered" in resp.get_json()["msg"]
    assert created_user.confirmation_sent_at is not None


def test_register_resend_token_path(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    user = SimpleNamespace(username="user1", email=b"enc-email", confirmation_token="old")

    def _get_by_token(token: str) -> SimpleNamespace:
        return user

    def _decrypt(data: bytes) -> str:
        return "user1@example.com"

    def _token() -> str:
        return "new-token"

    monkeypatch.setattr(routes.User, "get_by_token", staticmethod(_get_by_token))
    monkeypatch.setattr(routes.Crypto, "decrypt", staticmethod(_decrypt))
    monkeypatch.setattr(routes.Crypto, "generate_url_token", staticmethod(_token))

    captured: dict[str, str] = {}

    def _send(username: str, token: str, email: str) -> None:
        captured["username"] = username
        captured["token"] = token
        captured["email"] = email

    monkeypatch.setattr(routes.Sendmail, "send_confirmation_email", staticmethod(_send))

    resp = client.post("/api/register", json={"token": "expired-token"})

    assert resp.status_code == 200
    assert user.confirmation_token == "new-token"
    assert captured == {"username": "user1", "token": "new-token", "email": "user1@example.com"}


def test_confirm_missing_token_returns_400(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    resp = client.get("/api/confirm")

    assert resp.status_code == 400
    assert "Missing required parameter 'token'" in resp.get_json()["msg"]


def test_confirm_expired_token_returns_403(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    user = SimpleNamespace(
        username="user1",
        confirmation_token="abc",
        confirmation_sent_at=datetime.now() - timedelta(hours=5),
        status=None,
    )

    def _get_by_token(token: str) -> SimpleNamespace:
        return user

    monkeypatch.setattr(routes.User, "get_by_token", staticmethod(_get_by_token))

    resp = client.get("/api/confirm?token=abc")

    assert resp.status_code == 403
    assert "Confirmation token expired" in resp.get_json()["msg"]


def test_confirm_success_sets_status_confirmed(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    user = SimpleNamespace(
        username="user1",
        confirmation_token="abc",
        confirmation_sent_at=datetime.now() - timedelta(minutes=5),
        status=None,
    )

    def _get_by_token(token: str) -> SimpleNamespace:
        return user

    monkeypatch.setattr(routes.User, "get_by_token", staticmethod(_get_by_token))

    resp = client.get("/api/confirm?token=abc")

    assert resp.status_code == 200
    assert user.status == routes.UserStatus.confirmed
    assert "User user1 confirmed" in resp.get_json()["msg"]
