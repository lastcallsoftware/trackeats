from types import SimpleNamespace

import pytest

import models


def test_guest_verify_allows_blank_password(monkeypatch: pytest.MonkeyPatch) -> None:
    guest_user = SimpleNamespace(
        username="guest",
        status=models.UserStatus.confirmed,
        password_hash=None,
    )

    monkeypatch.setattr(models.User, "get_by_email", staticmethod(lambda email: guest_user))

    assert models.User.verify("guest@lastcallsoftware.com", "") is guest_user


def test_non_guest_verify_still_requires_password(monkeypatch: pytest.MonkeyPatch) -> None:
    user = SimpleNamespace(
        username="testuser",
        status=models.UserStatus.confirmed,
        password_hash="hash",
    )

    monkeypatch.setattr(models.User, "get_by_email", staticmethod(lambda email: user))

    with pytest.raises(ValueError, match="Password is required"):
        models.User.verify("testuser@lastcallsoftware.com", "")


def test_guest_verify_rejects_password(monkeypatch: pytest.MonkeyPatch) -> None:
    guest_user = SimpleNamespace(
        username="guest",
        status=models.UserStatus.confirmed,
        password_hash="hash",
    )

    monkeypatch.setattr(models.User, "get_by_email", staticmethod(lambda email: guest_user))

    with pytest.raises(ValueError, match="Password is not required for guest"):
        models.User.verify("guest@lastcallsoftware.com", "Guest*123")