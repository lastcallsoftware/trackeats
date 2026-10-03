import os
from email.utils import formataddr
from typing import Protocol, cast

import boto3
from botocore.exceptions import BotoCoreError, ClientError

AWS_ACCESS_KEY_ID_KEY = "AWS_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY_KEY = "AWS_SECRET_ACCESS_KEY"
AWS_REGION_KEY = "AWS_REGION"
DEFAULT_AWS_REGION = "us-east-1"


class _SesV2Client(Protocol):
    def send_email(self, **request: object) -> object: ...


# The email address of the sender.  This address must be verified by AWS.
EMAIL_SENDER_ADDRESS = 'support@trackeats.com'
EMAIL_SENDER_NAME = 'TrackEats'

# The subject line of the email.
VERIFY_EMAIL_SUBJECT = 'TrackEats Email Verification'

# The email body for recipients with non-HTML email clients.
VERIFY_EMAIL_TEMPLATE_TEXT = (
    "TrackEats Email Verification\r\n"
    "Enter this link in a browser to verify your email address and complete registration of the TrackEats app:\r\n"
    "{link}\r\n"
    )

# The HTML body of the email.
VERIFY_EMAIL_TEMPLATE_HTML = (
    "<html>"
    "   <head></head>"
    "   <body>"
    "       <h1>TrackEats Email Verification</h1>"
    "       <p>Click on this link to verify your email address and complete registration of the TrackEats app:</p>"
    "       <a href='{link}'>{link}</a>"
    "   </body>"
    "</html>"
    )

# The subject line of the reset email
RESET_EMAIL_SUBJECT = "TrackEats Password Reset Request"

# The email body for recipients with non-HTML email clients.
RESET_EMAIL_TEMPLATE_TEXT = (
    "TrackEats Password Reset Requested\r\n"
    "Hi,\r\n"
    "We received a request to reset the password for the account associated with this email address.\r\n"
    "If you made this request, you can set a new password by clicking the link below:\r\n"
    "{link}\r\n"
    "For security reasons, this link will expire shortly. If you need to request another reset, you can do so from the login page.\r\n"
    "If you did not request a password reset, you can safely ignore this email -- your account will remain unchanged.\r\n"
    "If you have any questions or need assistance, feel free to contact our support team at:\r\n"
    "{support_email_addr}\r\n"
    "Thanks,\r\n"
    "The TrackEats Support Team\r\n"
    )

# The HTML body of the email.
RESET_EMAIL_TEMPLATE_HTML = (
    "<html>"
    "   <head></head>"
    "   <body>"
    "       <h1>TrackEats Password Reset Requested</h1>"
    "       <p>Hi,</p>"
    "       <p>We received a request to reset the password for the account associated with this email address.</p>"
    "       <p>If you made this request, you can set a new password by clicking the link below:</p>"
    "       <a href='{link}'>{link}</a></p>"
    "       <p>For security reasons, this link will expire shortly. If you need to request another reset, you can do so from the login page.</p>"
    "       <p>If you did not request a password reset, you can safely ignore this email -- your account will remain unchanged.</p>"
    "       <p>If you have any questions or need assistance, feel free to contact our support team at:</p>"
    "       <p>{support_email_addr}</p>"
    "       <p>Thanks,</p>"
    "       <p>The TrackEats Support Team</p>"
    "   </body>"
    "</html>"
    )

CONTACT_EMAIL_SUBJECT_TEMPLATE = "Portfolio Contact: {subject}"

CONTACT_EMAIL_TEMPLATE_TEXT = (
    "Portfolio contact form submission\r\n"
    "Name: {name}\r\n"
    "Email: {email}\r\n"
    "Subject: {subject}\r\n"
    "\r\n"
    "Message:\r\n"
    "{message}\r\n"
)

CONTACT_EMAIL_TEMPLATE_HTML = (
    "<html>"
    "   <head></head>"
    "   <body>"
    "       <h1>Portfolio Contact Form Submission</h1>"
    "       <p><b>Name:</b> {name}</p>"
    "       <p><b>Email:</b> {email}</p>"
    "       <p><b>Subject:</b> {subject}</p>"
    "       <p><b>Message:</b></p>"
    "       <p>{message_html}</p>"
    "   </body>"
    "</html>"
)


class Sendmail:
    @staticmethod
    def send_confirmation_email(username: str, token: str, email_address: str, source: str = "web") -> None:
        """
        Send an email to a user to verify their email address.
        """
        link_base_url = os.environ.get("CONFIRM_LINK_BASE_URL") or os.environ.get("BACKEND_BASE_URL")
        if not link_base_url:
            raise ValueError("CONFIRM_LINK_BASE_URL or BACKEND_BASE_URL must be configured")

        link_base_url = link_base_url.rstrip("/")
        link = f"{link_base_url}/api/confirm?token={token}"
        if source == "mobile":
            link = f"{link}&source=mobile"

        email_body_text = VERIFY_EMAIL_TEMPLATE_TEXT.format(link=link)
        email_body_html = VERIFY_EMAIL_TEMPLATE_HTML.format(link=link)
        #logging.info("email_body_text: " + email_body_text)
        #logging.info("email_body_html: " + email_body_html)
        
        Sendmail.sendmail_ses(email_address, VERIFY_EMAIL_SUBJECT, email_body_text, email_body_html)


    @staticmethod
    def send_reset_password_email(username: str, token: str, email_address: str) -> None:
        """
        Send an email to the user to reset their password
        """
        base_url = os.environ.get("FRONTEND_BASE_URL")
        if not base_url:
            raise ValueError("FRONTEND_BASE_URL must be configured")
        base_url = base_url.rstrip("/")
        link = f"{base_url}/reset_password?token={token}"

        email_body_text = RESET_EMAIL_TEMPLATE_TEXT.format(link=link, support_email_addr=EMAIL_SENDER_ADDRESS)
        email_body_html = RESET_EMAIL_TEMPLATE_HTML.format(link=link, support_email_addr=EMAIL_SENDER_ADDRESS)

        Sendmail.sendmail_ses(email_address, RESET_EMAIL_SUBJECT, email_body_text, email_body_html)

    @staticmethod
    def send_contact_email(name: str, email_address: str, subject: str, message: str) -> None:
        """
        Send a portfolio contact-form message to the configured recipient.
        """
        recipient_email_address = os.environ.get("CONTACT_RECIPIENT_EMAIL", EMAIL_SENDER_ADDRESS).strip()
        if not recipient_email_address:
            raise ValueError("CONTACT_RECIPIENT_EMAIL may not be empty")

        email_subject = CONTACT_EMAIL_SUBJECT_TEMPLATE.format(subject=subject)
        message_html = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
        email_body_text = CONTACT_EMAIL_TEMPLATE_TEXT.format(
            name=name,
            email=email_address,
            subject=subject,
            message=message,
        )
        email_body_html = CONTACT_EMAIL_TEMPLATE_HTML.format(
            name=name,
            email=email_address,
            subject=subject,
            message_html=message_html,
        )

        Sendmail.sendmail_ses(
            recipient_email_address,
            email_subject,
            email_body_text,
            email_body_html,
            reply_to=email_address,
        )

    @staticmethod
    def sendmail_ses(
        email_address: str,
        email_subject: str,
        email_body_text: str,
        email_body_html: str,
        reply_to: str | None = None,
    ) -> None:
        """
        Send an email through the Amazon SES HTTPS API.
        """
        aws_access_key_id = os.environ.get(AWS_ACCESS_KEY_ID_KEY)
        aws_secret_access_key = os.environ.get(AWS_SECRET_ACCESS_KEY_KEY)
        if not aws_access_key_id:
            raise ValueError("AWS_ACCESS_KEY_ID must be configured")
        if not aws_secret_access_key:
            raise ValueError("AWS_SECRET_ACCESS_KEY must be configured")

        region = os.environ.get(AWS_REGION_KEY, DEFAULT_AWS_REGION)
        ses_client = boto3.client(
            "sesv2",
            region_name=region,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
        )
        content = {
            "Simple": {
                "Subject": {"Data": email_subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": email_body_text, "Charset": "UTF-8"},
                    "Html": {"Data": email_body_html, "Charset": "UTF-8"},
                },
            }
        }
        request: dict[str, object] = {
            "FromEmailAddress": formataddr((EMAIL_SENDER_NAME, EMAIL_SENDER_ADDRESS)),
            "Destination": {"ToAddresses": [email_address]},
            "Content": content,
        }
        if reply_to:
            request["ReplyToAddresses"] = [reply_to]

        try:
            ses_client = cast(
                _SesV2Client,
                boto3.client(
                    "sesv2",
                    region_name=region,
                    aws_access_key_id=aws_access_key_id,
                    aws_secret_access_key=aws_secret_access_key,
                ),
            )
            ses_client.send_email(**request)
        except (BotoCoreError, ClientError) as e:
            raise RuntimeError(f"Amazon SES API request failed: {e}") from e
