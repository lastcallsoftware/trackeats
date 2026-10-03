from botocore.exceptions import ClientError

import pytest

from sendmail import Sendmail


def test_send_confirmation_email_builds_link_and_calls_ses(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    def fake_sendmail_ses(email_address: str, email_subject: str, email_body_text: str, email_body_html: str) -> None:
        captured["email"] = email_address
        captured["subject"] = email_subject
        captured["text"] = email_body_text
        captured["html"] = email_body_html

    monkeypatch.setenv("CONFIRM_LINK_BASE_URL", "http://localhost:5000")
    monkeypatch.setattr(Sendmail, "sendmail_ses", staticmethod(fake_sendmail_ses))

    Sendmail.send_confirmation_email("user1", "abc123", "user1@example.com")

    assert captured["email"] == "user1@example.com"
    assert "http://localhost:5000/api/confirm?token=abc123" in captured["text"]
    assert "http://localhost:5000/api/confirm?token=abc123" in captured["html"]


def test_send_confirmation_email_adds_mobile_source_to_link(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    def _send(email: str, subject: str, text: str, html: str) -> None:
        captured["text"] = text
        captured["html"] = html

    monkeypatch.setenv("CONFIRM_LINK_BASE_URL", "https://example.trycloudflare.com")
    monkeypatch.setattr(Sendmail, "sendmail_ses", staticmethod(_send))

    Sendmail.send_confirmation_email("user1", "abc123", "user1@example.com", "mobile")

    assert "https://example.trycloudflare.com/api/confirm?token=abc123&source=mobile" in captured["text"]
    assert "https://example.trycloudflare.com/api/confirm?token=abc123&source=mobile" in captured["html"]


def test_send_confirmation_email_normalizes_trailing_slash_in_confirm_link_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    def fake_sendmail_ses(email_address: str, email_subject: str, email_body_text: str, email_body_html: str) -> None:
        captured["email"] = email_address
        captured["subject"] = email_subject
        captured["text"] = email_body_text
        captured["html"] = email_body_html

    monkeypatch.setenv("CONFIRM_LINK_BASE_URL", "https://trackeats.com/")
    monkeypatch.setattr(Sendmail, "sendmail_ses", staticmethod(fake_sendmail_ses))

    Sendmail.send_confirmation_email("user1", "abc123", "user1@example.com")

    assert captured["email"] == "user1@example.com"
    assert "https://trackeats.com/api/confirm?token=abc123" in captured["text"]
    assert "https://trackeats.com/api/confirm?token=abc123" in captured["html"]
    assert "https://trackeats.com//api/confirm?token=abc123" not in captured["text"]
    assert "https://trackeats.com//api/confirm?token=abc123" not in captured["html"]


def test_send_confirmation_email_falls_back_to_backend_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CONFIRM_LINK_BASE_URL", raising=False)
    monkeypatch.setenv("BACKEND_BASE_URL", "https://trackeats.com")

    captured: dict[str, str] = {}

    def fake_sendmail_ses(email_address: str, email_subject: str, email_body_text: str, email_body_html: str) -> None:
        captured["email"] = email_address
        captured["subject"] = email_subject
        captured["text"] = email_body_text
        captured["html"] = email_body_html

    monkeypatch.setattr(Sendmail, "sendmail_ses", staticmethod(fake_sendmail_ses))

    Sendmail.send_confirmation_email("user1", "abc123", "user1@example.com")

    assert captured["email"] == "user1@example.com"
    assert "https://trackeats.com/api/confirm?token=abc123" in captured["text"]
    assert "https://trackeats.com/api/confirm?token=abc123" in captured["html"]


def test_send_confirmation_email_requires_confirm_or_backend_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CONFIRM_LINK_BASE_URL", raising=False)
    monkeypatch.delenv("BACKEND_BASE_URL", raising=False)

    with pytest.raises(ValueError, match="CONFIRM_LINK_BASE_URL or BACKEND_BASE_URL must be configured"):
        Sendmail.send_confirmation_email("user1", "abc123", "user1@example.com")


def test_send_contact_email_uses_ses_and_sets_reply_to(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    def fake_sendmail_ses(
        email_address: str,
        email_subject: str,
        email_body_text: str,
        email_body_html: str,
        reply_to: str | None = None,
    ) -> None:
        captured["email"] = email_address
        captured["subject"] = email_subject
        captured["text"] = email_body_text
        captured["html"] = email_body_html
        captured["reply_to"] = reply_to or ""

    monkeypatch.setenv("CONTACT_RECIPIENT_EMAIL", "contact@example.com")
    monkeypatch.setattr(Sendmail, "sendmail_ses", staticmethod(fake_sendmail_ses))

    Sendmail.send_contact_email(
        "Visitor",
        "visitor@example.com",
        "Question",
        "Hello <there>",
    )

    assert captured["email"] == "contact@example.com"
    assert captured["subject"] == "Portfolio Contact: Question"
    text = captured["text"]
    html = captured["html"]
    assert isinstance(text, str)
    assert isinstance(html, str)
    assert "Hello <there>" in text
    assert "Hello &lt;there&gt;" in html
    assert captured["reply_to"] == "visitor@example.com"


def test_sendmail_ses_uses_ses_api_and_preserves_reply_to(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    class _FakeSesClient:
        def send_email(self, **request: object) -> None:
            captured["request"] = request

    def fake_boto3_client(
        service_name: str,
        **kwargs: str,
    ) -> _FakeSesClient:
        captured["service_name"] = service_name
        captured["client_kwargs"] = kwargs
        return _FakeSesClient()

    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "access-key")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "secret-key")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setattr("sendmail.boto3.client", fake_boto3_client)

    Sendmail.sendmail_ses(
        "recipient@example.com",
        "subject",
        "plain message",
        "<p>html message</p>",
        reply_to="reply@example.com",
    )

    assert captured["service_name"] == "sesv2"
    assert captured["client_kwargs"] == {
        "region_name": "us-east-1",
        "aws_access_key_id": "access-key",
        "aws_secret_access_key": "secret-key",
    }
    request = captured["request"]
    assert isinstance(request, dict)
    assert request["Destination"] == {"ToAddresses": ["recipient@example.com"]}
    assert request["ReplyToAddresses"] == ["reply@example.com"]
    assert request["Content"] == {
        "Simple": {
            "Subject": {"Data": "subject", "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": "plain message", "Charset": "UTF-8"},
                "Html": {"Data": "<p>html message</p>", "Charset": "UTF-8"},
            },
        }
    }


def test_sendmail_ses_requires_api_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)

    with pytest.raises(ValueError, match="AWS_ACCESS_KEY_ID must be configured"):
        Sendmail.sendmail_ses("a@b.com", "subject", "txt", "<p>txt</p>")


def test_sendmail_ses_wraps_aws_api_error(monkeypatch: pytest.MonkeyPatch) -> None:
    class _FailingSesClient:
        def send_email(self, **request: object) -> None:
            raise ClientError(
                {"Error": {"Code": "MessageRejected", "Message": "Email address not verified"}},
                "SendEmail",
            )

    def fake_boto3_client(service_name: str, **kwargs: str) -> _FailingSesClient:
        return _FailingSesClient()

    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "access-key")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "secret-key")
    monkeypatch.setattr("sendmail.boto3.client", fake_boto3_client)

    with pytest.raises(RuntimeError, match="Amazon SES API request failed"):
        Sendmail.sendmail_ses("a@b.com", "subject", "txt", "<p>txt</p>")
