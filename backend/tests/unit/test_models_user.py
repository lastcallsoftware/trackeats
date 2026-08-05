from types import SimpleNamespace

import pytest

import models


def _make_guest_user() -> SimpleNamespace:
    return SimpleNamespace(
        username="guest",
        status=models.UserStatus.confirmed,
        password_hash=None,
    )


def _make_non_guest_user() -> SimpleNamespace:
    return SimpleNamespace(
        username="testuser",
        status=models.UserStatus.confirmed,
        password_hash="hash",
    )


def _make_guest_user_with_password() -> SimpleNamespace:
    return SimpleNamespace(
        username="guest",
        status=models.UserStatus.confirmed,
        password_hash="hash",
    )


def _stub_get_by_email(monkeypatch: pytest.MonkeyPatch, user: SimpleNamespace) -> None:
    def _get_by_email(email: str) -> SimpleNamespace:
        return user

    monkeypatch.setattr(models.User, "get_by_email", staticmethod(_get_by_email))


def test_guest_verify_allows_blank_password(monkeypatch: pytest.MonkeyPatch) -> None:
    guest_user = _make_guest_user()
    _stub_get_by_email(monkeypatch, guest_user)

    assert models.User.verify("guest@lastcallsoftware.com", "") is guest_user


def test_non_guest_verify_still_requires_password(monkeypatch: pytest.MonkeyPatch) -> None:
    user = _make_non_guest_user()
    _stub_get_by_email(monkeypatch, user)

    with pytest.raises(ValueError, match="Password is required"):
        models.User.verify("testuser@lastcallsoftware.com", "")


def test_guest_verify_rejects_password(monkeypatch: pytest.MonkeyPatch) -> None:
    guest_user = _make_guest_user_with_password()
    _stub_get_by_email(monkeypatch, guest_user)

    with pytest.raises(ValueError, match="Password is not required for guest"):
        models.User.verify("guest@lastcallsoftware.com", "Guest*123")