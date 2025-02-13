import os
from email.utils import formataddr
from smtplib import SMTP_SSL, SMTPException
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging

# Amazon SES SMTP credentials.
# This is the name of the key under which the actual value is stored in
# os.environ.
SMTP_HOSTNAME_KEY = "SMTP_HOSTNAME"
SMTP_USERNAME_KEY = "SMTP_USERNAME"
SMTP_PASSWORD_KEY = "SMTP_PASSWORD"

# The normal SMTP port is 587.  When using SSL (which we are) it's port 465.
SMTP_PORT = 465

# (Optional) the name of a configuration set to use for this message.
# If you comment out this line, you also need to remove or comment out
# the "X-SES-CONFIGURATION-SET:" header below.
# CONFIGURATION_SET = "ConfigSet"

# The email address of the sender.  This address must be verified by AWS.
EMAIL_SENDER_ADDRESS = 'admin@lastcallsw.com'
EMAIL_SENDER_NAME = 'Trackeats'

# The subject line of the email.
VERIFY_EMAIL_SUBJECT = 'Trackeats Email Verification'

# The email body for recipients with non-HTML email clients.
VERIFY_EMAIL_TEMPLATE_TEXT = (
    "Trackeats Email Verificaton\r\n" +
    "Enter this link in a browser to verify your email address and complete registation of the Trackeats app:\r\n"
    "{link}"
    )

# The HTML body of the email.
VERIFY_EMAIL_TEMPLATE_HTML = (
    "<html>"
    "   <head></head>"
    "   <body>"
    "       <h1>Trackeats Email Verification</h1>"
    "       <p>Click on this link to verify your email address and complete registration of the Trackeats app:</p>"
    "       <a href='{link1}'>{link2}</a>"
    "   </body>"
    "</html>"
    )


# Send an email to a user to verify their email address.
def send_confirmation_email(username: str, token:str, email_address: str) -> None:
    # Create the link they'll use to confirm.
    base_url = os.environ.get("BACKEND_BASE_URL")
    link = f"{base_url}/confirm?username={username}&token={token}"
    logging.info(link)
    email_body_text = VERIFY_EMAIL_TEMPLATE_TEXT.format(link=link)
    email_body_html = VERIFY_EMAIL_TEMPLATE_HTML.format(link1=link, link2=link)
    #logging.info("email_body_text: " + email_body_text)
    #logging.info("email_body_html: " + email_body_html)
    
    sendmail_smtp(email_address, VERIFY_EMAIL_SUBJECT, email_body_text, email_body_html)


# Send an email using the standard Python SMTP library.
# We use an Amazon SMTP server and credentials obtained from the AWS website.
def sendmail_smtp(email_address: str, email_subject: str, email_body_text, email_body_html) -> None:
    smtp_hostname = os.environ.get(SMTP_HOSTNAME_KEY)
    smtp_username = os.environ.get(SMTP_USERNAME_KEY)
    smtp_password = os.environ.get(SMTP_PASSWORD_KEY)

    # Create message container - the correct MIME type is multipart/alternative.
    email_msg = MIMEMultipart('alternative')
    email_msg['Subject'] = email_subject
    email_msg['From'] = formataddr((EMAIL_SENDER_NAME, EMAIL_SENDER_ADDRESS))
    email_msg['To'] = email_address
    # Comment or delete the next line if you are not using a configuration set
    # msg.add_header('X-SES-CONFIGURATION-SET',CONFIGURATION_SET)

    # Record the MIME types of both parts - text/plain and text/html.
    part1 = MIMEText(email_body_text, 'plain')
    part2 = MIMEText(email_body_html, 'html')

    # Attach parts into message container.
    # According to RFC 2046, the last part of a multipart message, in this case
    # the HTML message, is best and preferred.
    email_msg.attach(part1)
    email_msg.attach(part2)

    # Try to send the message.
    try:
        # There are apparently two ways to call an SMTP server using the SSL/TLS
        # protocol (which you absolutely do want/need to do).  One is to use the
        # SMTP object and call its starttls() API, and the other is to use the 
        # SMTP_SSL object, which handles it automatically.  I'm using the latter
        # because anything "automatic"seems inherently more reliable, but
        # # honestly I have no idea if that's true or if either way is better.
        #with SMTP(AWS_SMTP_ENDPOINT) as smtp:
        #    smtp.starttls()
        with SMTP_SSL(smtp_hostname, SMTP_PORT) as smtp:
            smtp.login(smtp_username, smtp_password)
            response = smtp.sendmail(EMAIL_SENDER_ADDRESS, email_address, email_msg.as_string())
            if (len(response) > 0):
                err_code, err_msg = next(iter(response.values()))
                raise SMTPException(f"Unable to send email to one or more particular recipients: {err_code} {err_msg}")

    except SMTPException as e:
        raise RuntimeError(f"An error occurred on the SMTP server: {repr(e)}")

    except Exception as e:
        raise RuntimeError(f"Unexpected server error: {repr(e)}")


# -------------------------------------------
# Send an email using Amazon's boto3 library.
#
# boto3 is the Amazon SDK for Python, which provides support for all AWS 
# services.  I had intended to use it to access Amazon's Simple Email Service
# (SES), but that turned out to be way more trouble than it's worth.
# To use it, you first have to create a session and log on using the library's
# SSO APIs, and use a complicated (and poorly documented) JSON format for the
# message and its recipients.
#
# Here's an example:
#
#   {
#   	"Subject": {
# 	    	"Data": "Test email sent using AWS CLI",
# 		    "Charset": "UTF-8"
# 	    },
# 	    "Body": {
# 		    "Text": {
# 			    "Data": "This is the message body in text format.",
#    			"Charset": "UTF-8"
# 	    	},
# 		    "Html": {
# 			    "Data": "This message body contains <b>HTML formatting</b>.",
# 			    "Charset": "UTF-8"
# 		    }
# 	    }
#   }
#
# NO THANKS!  There is a MUCH simpler way to use AWS's email servers to send
# emails, which is to just use the standard Python SMTP library and feed it the 
# AWS SMTP server credentials (i.e., what I actually implemented above).  I'm
# just keeping the boto3 crap here but commented out in the highly unlikely 
# event I'll want to use it again for some reason.
# Note that this isn't a complete implementation, either -- I gave up when I
# learned I needed to create a session first, so that bit isn't written yet.
#
# import boto3
# from botocore.exceptions import ClientError, WaiterError
# ------------------------------------------
# def sendmail_boto3(email_address: str):
#     sender_email_address = "admin@lastcallsw.com"
#     message_subject = "Trackeats User Verification"
#     message_text = "Hello from Trackeats!"
#     message_html = "<p>Hello from <b>Trackeats!</b></p>"
#
#     send_args = {
#         "Source": sender_email_address,
#         "Destination": {"ToAddresses": [email_address]},
#         "Message": {
#             "Subject": {"Data": message_subject},
#             "Body": {"Text": {"Data": message_text}, "Html": {"Data": message_html}}
#         },
#     }
#
#     msg = None
#     try:
#         ses_client = boto3.client("ses")
#         response = ses_client.send_email(**send_args)
#         message_id = response["MessageId"]
#     except ClientError:
#         msg = f"Couldn't send email from {sender_email_address} to {email_address}"
#     else:
#         msg = f"Email {message_id} sent from {sender_email_address} to {email_address}"
#
#     return msg
