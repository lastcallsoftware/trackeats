from types import TracebackType
from smtplib import SMTPException

import pytest

from sendmail import Sendmail


def test_send_confirmation_email_builds_link_and_calls_smtp(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    def fake_sendmail_smtp(email_address: str, email_subject: str, email_body_text: str, email_body_html: str) -> None:
        captured["email"] = email_address
        captured["subject"] = email_subject
        captured["text"] = email_body_text
        captured["html"] = email_body_html

    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:5173")
    monkeypatch.setattr(Sendmail, "sendmail_smtp", staticmethod(fake_sendmail_smtp))

    Sendmail.send_confirmation_email("user1", "abc123", "user1@example.com")

    assert captured["email"] == "user1@example.com"
    assert "/confirm?token=abc123" in captured["text"]
    assert "/confirm?token=abc123" in captured["html"]


def test_sendmail_smtp_requires_env_vars(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SMTP_HOSTNAME", raising=False)
    monkeypatch.delenv("SMTP_USERNAME", raising=False)
    monkeypatch.delenv("SMTP_PASSWORD", raising=False)

    with pytest.raises(ValueError, match="SMTP Hostname may not be None"):
        Sendmail.sendmail_smtp("a@b.com", "subject", "txt", "<p>txt</p>")


class _FailingSMTP:
    def __init__(self, hostname: str, port: int) -> None:
        self.hostname = hostname
        self.port = port

    def __enter__(self) -> "_FailingSMTP":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> bool:
        return False

    def login(self, username: str, password: str) -> None:
        raise SMTPException("boom")

    def sendmail(self, sender: str, to: str, message: str) -> dict[str, tuple[int, bytes]]:
        return {}


def test_sendmail_smtp_wraps_smtp_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SMTP_HOSTNAME", "smtp.example.com")
    monkeypatch.setenv("SMTP_USERNAME", "user")
    monkeypatch.setenv("SMTP_PASSWORD", "password")
    monkeypatch.setattr("sendmail.SMTP_SSL", _FailingSMTP)

    with pytest.raises(RuntimeError, match="SMTP server"):
        Sendmail.sendmail_smtp("a@b.com", "subject", "txt", "<p>txt</p>")
