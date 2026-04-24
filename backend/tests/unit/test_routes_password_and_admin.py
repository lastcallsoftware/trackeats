from datetime import datetime, timedelta, timezone
from types import SimpleNamespace, TracebackType
from typing import Any, Callable, cast

import pytest
from flask import Flask, Response
from flask.testing import FlaskClient
from werkzeug.exceptions import Forbidden

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


def _mock_session(monkeypatch: pytest.MonkeyPatch, deleted: list[object] | None = None) -> None:
    def _delete(obj: object) -> None:
        if deleted is not None:
            deleted.append(obj)

    session = SimpleNamespace(begin=lambda: _DummyTxn(), delete=_delete)
    monkeypatch.setattr(routes.db, "session", session, raising=False)


def _set_admin_claims(monkeypatch: pytest.MonkeyPatch, is_admin: bool) -> None:
    monkeypatch.setattr(routes, "verify_jwt_in_request", lambda: None)
    monkeypatch.setattr(routes, "get_jwt", lambda: {"is_admin": is_admin})


def _unwrap(func: Any) -> Callable[..., tuple[Response, int]]:
    return cast(Callable[..., tuple[Response, int]], getattr(func, "__wrapped__", func))


def _as_response_status(result: object) -> tuple[Response, int]:
    if isinstance(result, tuple):
        tuple_result = cast(tuple[object, object], result)
        resp, status = tuple_result
        return cast(Response, resp), cast(int, status)

    resp = cast(Response, result)
    return resp, resp.status_code


@pytest.fixture
def client() -> FlaskClient:
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(routes.bp)
    return app.test_client()


# -------------------------
# Password reset endpoints
# -------------------------
def test_request_reset_password_missing_email_returns_401(
    client: FlaskClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_session(monkeypatch)

    resp = client.post("/api/request_reset_password", json={})

    assert resp.status_code == 401
    assert "Missing required parameter 'email'" in resp.get_json()["msg"]


def test_request_reset_password_unknown_email_still_returns_generic_success(
    client: FlaskClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_session(monkeypatch)

    def _get_by_email(email: str) -> None:
        _ = email
        return None

    monkeypatch.setattr(routes.User, "get_by_email", staticmethod(_get_by_email))

    called = {"send": False}

    def _send(username: str, token: str, email: str) -> None:
        called["send"] = True

    monkeypatch.setattr(routes.Sendmail, "send_reset_password_email", staticmethod(_send))

    resp = client.post("/api/request_reset_password?email=missing@example.com", json={})

    assert resp.status_code == 200
    assert "Check your inbox" in resp.get_json()["msg"]
    assert called["send"] is False


def test_request_reset_password_known_email_sets_token_and_sends_mail(
    client: FlaskClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_session(monkeypatch)

    user = SimpleNamespace(username="user1", reset_token=None, reset_email_sent_at=None)

    def _get_by_email(email: str) -> SimpleNamespace:
        _ = email
        return user

    def _generate_url_token() -> str:
        return "token-123"

    monkeypatch.setattr(routes.User, "get_by_email", staticmethod(_get_by_email))
    monkeypatch.setattr(routes.Crypto, "generate_url_token", staticmethod(_generate_url_token))

    captured: dict[str, str] = {}

    def _send(username: str, token: str, email: str) -> None:
        captured["username"] = username
        captured["token"] = token
        captured["email"] = email

    monkeypatch.setattr(routes.Sendmail, "send_reset_password_email", staticmethod(_send))

    resp = client.post("/api/request_reset_password?email=user1@example.com", json={})

    assert resp.status_code == 200
    assert user.reset_token == "token-123"
    assert captured == {"username": "user1", "token": "token-123", "email": "user1@example.com"}


def test_reset_password_missing_token_returns_400(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    resp = client.post("/api/reset_password?password=pw", json={})

    assert resp.status_code == 400
    assert "Missing required parameter 'token'" in resp.get_json()["msg"]


def test_reset_password_missing_password_returns_400(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    resp = client.post("/api/reset_password?token=tkn", json={})

    assert resp.status_code == 400
    assert "Missing required parameter 'password'" in resp.get_json()["msg"]


def test_reset_password_invalid_token_returns_400(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    def _get_by_reset_token(token: str) -> None:
        _ = token
        return None

    monkeypatch.setattr(routes.User, "get_by_reset_token", staticmethod(_get_by_reset_token))

    resp = client.post("/api/reset_password?token=bad&password=newpw", json={})

    assert resp.status_code == 400
    assert "Invalid token" in resp.get_json()["msg"]


def test_reset_password_expired_token_returns_400(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    user = SimpleNamespace(reset_email_sent_at=datetime.now(timezone.utc) - timedelta(minutes=16))

    def _get_by_reset_token(token: str) -> SimpleNamespace:
        _ = token
        return user

    monkeypatch.setattr(routes.User, "get_by_reset_token", staticmethod(_get_by_reset_token))

    resp = client.post("/api/reset_password?token=ok&password=newpw", json={})

    assert resp.status_code == 400
    assert "Token has expired" in resp.get_json()["msg"]


def test_reset_password_valid_token_sets_password(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)

    called: dict[str, str] = {}
    user = SimpleNamespace(reset_email_sent_at=datetime.now(timezone.utc) - timedelta(minutes=5))

    def _set_password(password: str) -> None:
        called["password"] = password

    user.set_password = _set_password  # type: ignore[attr-defined]
    def _get_by_reset_token(token: str) -> SimpleNamespace:
        _ = token
        return user

    monkeypatch.setattr(routes.User, "get_by_reset_token", staticmethod(_get_by_reset_token))

    resp = client.post("/api/reset_password?token=ok&password=newpw", json={})

    assert resp.status_code == 200
    assert called["password"] == "newpw"


def test_change_password_missing_old_password_returns_400(
    bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "user1@example.com")

    def _get_by_email(email: str) -> SimpleNamespace:
        _ = email
        return SimpleNamespace()

    monkeypatch.setattr(routes.User, "get_by_email", staticmethod(_get_by_email))

    with bare_flask_app.test_request_context("/api/change_password?new_password=new", method="POST", json={}):
        resp, status = _as_response_status(_unwrap(routes.change_password)())

    assert status == 400
    assert "old_password" in resp.get_json()["msg"]


def test_change_password_invalid_credentials_returns_400(
    bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "user1@example.com")

    def _get_by_email(email: str) -> SimpleNamespace:
        _ = email
        return SimpleNamespace()

    def _verify(email: str, password: str) -> None:
        _ = email
        _ = password
        return None

    monkeypatch.setattr(routes.User, "get_by_email", staticmethod(_get_by_email))
    monkeypatch.setattr(routes.User, "verify", staticmethod(_verify))

    with bare_flask_app.test_request_context(
        "/api/change_password?old_password=wrong&new_password=new",
        method="POST",
        json={},
    ):
        resp, status = _as_response_status(_unwrap(routes.change_password)())

    assert status == 400
    assert "Invalid email or password" in resp.get_json()["msg"]


def test_change_password_success_sets_password(
    bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "user1@example.com")

    def _get_by_email(email: str) -> SimpleNamespace:
        _ = email
        return SimpleNamespace()

    monkeypatch.setattr(routes.User, "get_by_email", staticmethod(_get_by_email))

    called: dict[str, str] = {}

    verified_user = SimpleNamespace()

    def _set_password(password: str) -> None:
        called["password"] = password

    verified_user.set_password = _set_password  # type: ignore[attr-defined]

    def _verify(email: str, password: str) -> SimpleNamespace:
        _ = email
        _ = password
        return verified_user

    monkeypatch.setattr(routes.User, "verify", staticmethod(_verify))

    with bare_flask_app.test_request_context(
        "/api/change_password?old_password=oldpw&new_password=newpw",
        method="POST",
        json={},
    ):
        _, status = _as_response_status(_unwrap(routes.change_password)())

    assert status == 200
    assert called["password"] == "newpw"


# -------------------------
# Admin-only endpoints
# -------------------------
@pytest.mark.parametrize(
    ("func", "path", "method"),
    [
        (routes.db_init, "/api/db/init", "GET"),
        (routes.db_purge, "/api/db/purge", "GET"),
        (routes.db_load, "/api/db/load", "GET"),
        (routes.db_export, "/api/db/export", "GET"),
        (routes.sendmail, "/api/sendmail", "GET"),
        (routes.delete_user, "/api/user", "DELETE"),
    ],
)
def test_admin_only_endpoints_forbid_non_admin(
    bare_flask_app: Flask,
    monkeypatch: pytest.MonkeyPatch,
    func: Callable[..., Any],
    path: str,
    method: str,
) -> None:
    _mock_session(monkeypatch)
    _set_admin_claims(monkeypatch, False)

    with bare_flask_app.test_request_context(path, method=method):
        with pytest.raises(Forbidden):
            func()


def test_db_init_admin_happy_path(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    _set_admin_claims(monkeypatch, True)

    called: dict[str, bool] = {}

    def _init_db(override: bool) -> None:
        called["override"] = override

    monkeypatch.setattr(routes.Data, "init_db", staticmethod(_init_db))

    with bare_flask_app.test_request_context("/api/db/init?override=true", method="GET"):
        resp, status = cast(tuple[dict[str, str], int], routes.db_init())

    assert status == 200
    assert called["override"] is True
    assert resp["msg"] == "Initialization complete"


def test_db_purge_admin_happy_path(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    _set_admin_claims(monkeypatch, True)

    called: dict[str, int | None] = {}

    def _get_id(username: str) -> int:
        _ = username
        return 3

    monkeypatch.setattr(routes.User, "get_id", staticmethod(_get_id))
    monkeypatch.setattr(routes.User, "get_id_by_email", staticmethod(_get_id))

    def _purge_data(user_id: int, for_user_id: int | None) -> None:
        called["user_id"] = user_id
        called["for_user_id"] = for_user_id

    monkeypatch.setattr(routes.Data, "purge_data", staticmethod(_purge_data))

    with bare_flask_app.test_request_context("/api/db/purge?username=alice&for_user_id=9", method="GET"):
        resp, status = cast(tuple[dict[str, str], int], routes.db_purge())

    assert status == 200
    assert called == {"user_id": 3, "for_user_id": 9}
    assert resp["msg"] == "Data purge complete"


def test_db_load_admin_happy_path(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    _set_admin_claims(monkeypatch, True)

    called: dict[str, int] = {}

    def _get_id(username: str) -> int:
        _ = username
        return 4

    monkeypatch.setattr(routes.User, "get_id", staticmethod(_get_id))
    monkeypatch.setattr(routes.User, "get_id_by_email", staticmethod(_get_id))

    def _load(user_id: int) -> None:
        called["user_id"] = user_id

    monkeypatch.setattr(routes.Data, "load", staticmethod(_load))

    with bare_flask_app.test_request_context("/api/db/load?username=alice", method="GET"):
        resp, status = cast(tuple[dict[str, str], int], routes.db_load())

    assert status == 200
    assert called == {"user_id": 4}
    assert resp["msg"] == "Data load complete"


def test_db_export_admin_happy_path(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    _set_admin_claims(monkeypatch, True)

    called: dict[str, int] = {}

    def _get_id(username: str) -> int:
        _ = username
        return 5

    monkeypatch.setattr(routes.User, "get_id", staticmethod(_get_id))
    monkeypatch.setattr(routes.User, "get_id_by_email", staticmethod(_get_id))

    def _export(user_id: int) -> None:
        called["user_id"] = user_id

    monkeypatch.setattr(routes.Data, "export", staticmethod(_export))

    with bare_flask_app.test_request_context("/api/db/export?username=alice", method="GET"):
        resp, status = cast(tuple[dict[str, str], int], routes.db_export())

    assert status == 200
    assert called == {"user_id": 5}
    assert resp["msg"] == "Data export complete"


def test_sendmail_admin_happy_path(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    _set_admin_claims(monkeypatch, True)

    def _generate_url_token(length: int = 32) -> str:
        _ = length
        return "token-abc"

    monkeypatch.setattr(routes.Crypto, "generate_url_token", staticmethod(_generate_url_token))

    captured: dict[str, str] = {}

    def _send_confirmation(username: str, token: str, email: str) -> None:
        captured["username"] = username
        captured["token"] = token
        captured["email"] = email

    monkeypatch.setattr(routes.Sendmail, "send_confirmation_email", staticmethod(_send_confirmation))

    with bare_flask_app.test_request_context("/api/sendmail?username=user1&addr=user1@example.com", method="GET"):
        _, status = _as_response_status(routes.sendmail())

    assert status == 200
    assert captured == {"username": "user1", "token": "token-abc", "email": "user1@example.com"}


def test_delete_user_admin_happy_path(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    deleted: list[object] = []
    _mock_session(monkeypatch, deleted=deleted)
    _set_admin_claims(monkeypatch, True)

    user_dao = SimpleNamespace(id=42, username="alice")
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "alice@example.com")

    def _get_by_email(email: str) -> SimpleNamespace:
        _ = email
        return user_dao

    monkeypatch.setattr(routes.User, "get_by_email", staticmethod(_get_by_email))

    calls: dict[str, int] = {}

    def _delete_recipes(user_id: int) -> None:
        calls["recipe"] = user_id

    def _delete_foods(user_id: int) -> None:
        calls["food"] = user_id

    monkeypatch.setattr(routes.Recipe, "delete_all_for_user", staticmethod(_delete_recipes))
    monkeypatch.setattr(routes.Food, "delete_all_for_user", staticmethod(_delete_foods))

    with bare_flask_app.test_request_context("/api/user", method="DELETE"):
        _, status = _as_response_status(routes.delete_user())

    assert status == 200
    assert calls == {"recipe": 42, "food": 42}
    assert deleted == [user_dao]
