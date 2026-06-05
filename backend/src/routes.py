import os
import logging
from functools import wraps
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, ParamSpec, TypeVar, cast
from flask import Blueprint, abort, jsonify, make_response, redirect, request
from flask_jwt_extended import (
    jwt_required,  # type:ignore
    create_access_token,  # type:ignore
    get_jwt_identity,  # type:ignore
    verify_jwt_in_request, # type:ignore
    get_jwt  # type:ignore
)
from pydantic import ValidationError
from sendmail import Sendmail
from models import db, User, Preferences, UserStatus, Food, Recipe, Ingredient, DailyLogItem
from schemas import (
    RegistrationRequest, ResendConfirmationRequest, LoginRequest, SocialLoginRequest, SocialIdentityClaims,
    FoodRequest, RecipeRequest,
    DailyLogItemRequest, DailyLogItemUpdateRequest, PreferencesRequest
)
from crypto import Crypto
from data import Data
from sqlalchemy.sql import text
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as grequests
import requests as req

from usda_fdc_importer import USDAFdcImporter, USDAFdcImporterError, USDA_SOURCE


RESET_TOKEN_EXPIRATION_SECONDS = 900  # 15 minutes

bp = Blueprint("auth", __name__)


##############################
# CUSTOM EXCEPTIONS
##############################
class ExpiredToken(Exception):
    pass
class InvalidToken(Exception):
    pass
class UserAlreadyConfirmed(Exception):
    pass
class EmailDeliveryFailed(Exception):
    pass


##############################
# CUSTOM DECORATORS
##############################
F = TypeVar("F", bound=Callable[..., Any])
R = TypeVar("R")
P = ParamSpec("P")


def _roles_from_claims(claims: dict[str, Any]) -> set[str]:
    """
    Normalize JWT role claims into a set of role names.

    During migration, we still accept legacy tokens that only include
    "is_admin" by mapping them to the admin role.
    """
    raw_roles = claims.get("roles", [])
    roles: set[str] = set()

    if isinstance(raw_roles, list):
        role_values = cast(list[Any], raw_roles)
        roles = {str(role) for role in role_values if role}

    if bool(claims.get("is_admin", False)):
        roles.add(Data.ROLE_ADMIN)

    return roles


def _get_roles_for_user(user: User) -> list[str]:
    """
    Assign roles when issuing tokens.

    Username checks are intentionally limited to this auth boundary so the rest
    of the app can rely on role checks instead of user-name checks.
    """
    if user.username == Data.ADMIN_USER_NAME:
        return [Data.ROLE_ADMIN]
    if user.username == Data.GUEST_USER_NAME:
        return [Data.ROLE_READONLY]
    return [Data.ROLE_USER]


def role_required(*allowed_roles: str) -> Callable[[F], F]:
    """
    Require at least one of the specified roles in the JWT claims.
    """
    allowed = set(allowed_roles)

    def decorator(f: F) -> F:
        @wraps(f)
        def decorated(*args: Any, **kwargs: Any) -> Any:
            verify_jwt_in_request()
            claims = cast(dict[str, Any], get_jwt())
            roles = _roles_from_claims(claims)
            if not roles.intersection(allowed):
                abort(403, description="Forbidden: insufficient role")
            return f(*args, **kwargs)
        return cast(F, decorated)

    return decorator


def write_required(f: F) -> F:
    """
    Allow authenticated writes for all roles except readonly.
    """
    @wraps(f)
    def decorated(*args: Any, **kwargs: Any) -> Any:
        verify_jwt_in_request()
        claims = cast(dict[str, Any], get_jwt())
        roles = _roles_from_claims(claims)
        if Data.ROLE_READONLY in roles:
            abort(403, description="Forbidden: readonly role cannot modify data")
        return f(*args, **kwargs)
    return cast(F, decorated)

def admin_required(f: F) -> F:
    return role_required(Data.ROLE_ADMIN)(f)


def log_route(f: F) -> F:
    @wraps(f)
    def decorated(*args: Any, **kwargs: Any) -> Any:
        logging.info(f"{request.path} [{request.method}]")
        return f(*args, **kwargs)
    return cast(F, decorated)


limiter = cast(Any, Limiter(key_func=get_remote_address))

def rate_limited(limit_value: str) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Typed wrapper around slowapi's untyped limiter decorator.
    """
    return cast(Callable[[Callable[P, R]], Callable[P, R]], limiter.limit(limit_value))


##############################
# MESSAGE FORMATTER
##############################
def _format_validation_error_message(error: ValidationError) -> str:
    """Build a concise, user-facing message from Pydantic validation errors."""
    details: list[str] = []
    for err in error.errors(include_context=False):
        loc = err["loc"]
        field = ".".join(str(part) for part in loc) if loc else "field"

        message = str(err.get("msg", "Invalid value"))
        details.append(f"{field}: {message}")

    if not details:
        return "Invalid request"

    return "Invalid request: " + "; ".join(details)


def _confirmation_redirect_url(status: str) -> str:
    base_url = os.environ.get("MOBILE_CONFIRM_REDIRECT_URL", "trackeats://confirm").rstrip("?&")
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}status={status}"


def _get_importer() -> USDAFdcImporter:
    api_key = os.environ.get("USDA_FDC_API_KEY", "")
    timeout_seconds = int(os.environ.get("USDA_FDC_TIMEOUT_SECONDS", "10"))
    return USDAFdcImporter(api_key=api_key, timeout=timeout_seconds)


def _get_importer_user_id() -> int:
    importer_user_id = User.get_id(Data.IMPORTER_USER_NAME)
    if not importer_user_id:
        Data.add_users()
        importer_user_id = User.get_id(Data.IMPORTER_USER_NAME)
    if not importer_user_id:
        raise ValueError("Could not retrieve importer user")
    return importer_user_id


def _get_json_payload() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if isinstance(payload, dict):
        return cast(dict[str, Any], payload)
    return {}


def _parse_fdc_ids(raw_fdc_ids: Any) -> list[int]:
    if not isinstance(raw_fdc_ids, list):
        raise ValueError("'fdc_ids' must be a non-empty array")

    values = cast(list[Any], raw_fdc_ids)
    parsed: list[int] = []
    for value in values:
        try:
            food_id = int(value)
        except (TypeError, ValueError):
            raise ValueError("All 'fdc_ids' values must be numeric")
        if food_id > 0:
            parsed.append(food_id)

    deduped = list(dict.fromkeys(parsed))
    if len(deduped) == 0:
        raise ValueError("'fdc_ids' must include at least one positive integer")
    return deduped


def _parse_fdc_data_types(raw_value: str | None) -> list[str]:
    if raw_value is None:
        return ["Branded", "Foundation"]

    cleaned = raw_value.strip().lower()
    if cleaned in {"", "both", "all"}:
        return ["Branded", "Foundation"]
    if cleaned == "branded":
        return ["Branded"]
    if cleaned == "foundation":
        return ["Foundation"]

    raise ValueError("dataType must be one of: both, Branded, Foundation")


##############################
# HEALTH
##############################
@bp.route("/api/health", methods = ["GET"])
#@log_route
def health():
    """
    Check the app's health.
    """
    try:
        with db.session.begin():
            db.session.execute(text("SELECT 1"))
    except Exception as e:
        msg = "Health check failed: " + str(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Server OK"
        #logging.info(msg)
        return {"msg": msg}, 200


##############################
# EMAIL
##############################
@bp.route("/api/sendmail", methods=["GET"])
@admin_required
@log_route
def sendmail():
    """
    SENDMAIL (Admin only) - Sends a test email to the specified user.  This is used 
    exclusively for testing that the app's email mechanism works.
    """
    username = None
    email_addr = None
    token = None
    try:
        # Get request parameters from URL
        username = request.args.get("username")
        if username is None:
            raise ValueError("Missing required parameter 'username'")

        email_addr = request.args.get("addr")
        if email_addr is None:
            raise ValueError("Missing required parameter 'addr'")

        # Generate an auth token
        token = Crypto.generate_url_token(32)

        # Send the confirmation email.
        Sendmail.send_confirmation_email(username, token, email_addr)
    except Exception as e:
        if email_addr:
            msg = f"Couldn't send email to {email_addr}: {str(e)}"
        else:
            msg = f"Couldn't send email: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Email sent successfully to {email_addr}."
        logging.info(msg)
        return jsonify({"msg": msg}), 200


def verify_turnstile(token: str, ip: str) -> bool:
    res = req.post(
        "https://challenges.cloudflare.com/turnstile/v1/siteverify",
        data={
            "secret": os.environ.get("TURNSTILE_SECRET_KEY"),
            "response": token,
            "remoteip": ip,
        },
    )
    return res.json().get("success", False)


@bp.route("/api/contact", methods=["POST"])
@rate_limited("3/hour")
def contact():
    """
    CONTACT - Send an email to admin
    """
    #data = request.get_json()
    return jsonify({"msg": "test"}), 200


##############################
# DATABASE ADMIN ACTIONS
##############################
@bp.route("/api/db/init", methods=["GET"])
@admin_required
@log_route
def db_init():
    """
    INIT (Admin only) - Wipe the database and recreate all the tables using the ORM classes in 
    models.py.  Note that the tables will be EMPTY!
    """
    try:
        with db.session.begin():
            override_str = str(request.args.get("override", "false"))
            override = override_str.lower() == 'true'

            Data.init_db(override)
    except Exception as e:
        msg = "Initialization failed: " + str(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Initialization complete"
        logging.info(msg)
        return {"msg": msg}, 200


@bp.route("/api/db/purge", methods=["GET"])
@admin_required
@log_route
def db_purge():
    """
    PURGE (Admin only) - Delete all data for a specified user
    """
    try:
        with db.session.begin():
            username = request.args.get("username")
            if not username:
                raise ValueError("Missing required parameter 'username'")

            user_id = User.get_id(username)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for username '{username}'")

            for_user_id_str = request.args.get("for_user_id")
            for_user_id = int(for_user_id_str) if for_user_id_str else None

            Data.purge_data(user_id, for_user_id)
    except Exception as e:
        msg = "Data purge failed: " + str(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Data purge complete"
        logging.info(msg)
        return {"msg": msg}, 200


@bp.route("/api/db/load", methods=["GET"])
@admin_required
@log_route
def db_load():
    """
    LOAD (Admin only) - Populate the (presumably newly created) database with test data.
    Be aware that this API first deletes the contents of tables it populates!
    """
    try:
        with db.session.begin():
            username = request.args.get("username")
            if not username:
                raise ValueError("Missing required parameter 'username'")

            user_id = User.get_id(username)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for username '{username}'")
        
            Data.load(user_id)
    except Exception as e:
        msg = "Data load failed: " + str(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Data load complete"
        logging.info(msg)
        return {"msg": msg}, 200


@bp.route("/api/db/export", methods=["GET"])
@admin_required
@log_route
def db_export():
    """
    EXPORT (Admin only) - Export selected data to JSON files for long-term storage
    and reloading purposes.
    """
    try:
        with db.session.begin():
            username = request.args.get("username")
            if not username:
                raise ValueError("Missing required parameter 'username'")

            user_id = User.get_id(username)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for username '{username}'")

            Data.export(user_id)
    except Exception as e:
        msg = "Data export failed: " + str(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Data export complete"
        logging.info(msg)
        return {"msg": msg}, 200


##############################
# REGISTRATION ^& LOGIN
##############################
def _verify_google_token(token: str, platform: str) -> dict[str, Any]:
    """
    Verify a Google token and return identity claims.

    platform must be one of: "web", "android", "ios"

    Each platform maps to exactly one backend client ID env var:
    - "web"     → GOOGLE_WEB_CLIENT_ID     (access token, web implicit flow)
    - "android" → GOOGLE_ANDROID_CLIENT_ID (ID token, native SDK)
    - "ios"     → GOOGLE_IOS_CLIENT_ID     (ID token, native SDK)
    """
    import requests as req  # type: ignore

    if platform == "android":
        #env_var = "GOOGLE_ANDROID_CLIENT_ID"
        env_var = "GOOGLE_WEB_CLIENT_ID"
    elif platform == "ios":
        env_var = "GOOGLE_IOS_CLIENT_ID"
    elif platform in ("web", "expo"):
        env_var = "GOOGLE_WEB_CLIENT_ID"
    else:
        raise ValueError(f"Unknown platform for Google login: {platform!r}")

    client_id = os.environ.get(env_var, "").strip()
    if not client_id:
        raise ValueError(f"{env_var} is not configured")

    # Heuristic: ID tokens are JWTs (three Base64url segments separated by dots)
    is_id_token = token.count('.') == 2

    if is_id_token:
        verified = cast(Any, google_id_token).verify_oauth2_token(
            token,
            cast(Any, grequests).Request(),
            client_id,
        )
        return cast(dict[str, Any], verified)
    else:
        # Access token path — only valid from the web client
        if platform != "web":
            raise ValueError("Access tokens are only accepted from web clients")
        resp = req.get(
            "https://www.googleapis.com/oauth2/v3/tokeninfo",
            params={"access_token": token},
            timeout=10,
        )
        resp.raise_for_status()
        info = resp.json()
        if info.get("error"):
            raise ValueError(f"Google token invalid: {info['error']}")
        token_aud = info.get("aud")
        token_azp = info.get("azp")
        if token_aud != client_id and token_azp != client_id:
            raise ValueError("Google token was not issued for this app")

        userinfo_resp = req.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        userinfo_resp.raise_for_status()
        userinfo = userinfo_resp.json()

        # Normalize to the same shape as an ID token payload
        return {
            "sub": info.get("sub"),
            "email": userinfo.get("email") or info.get("email"),
            "name": userinfo.get("name") or info.get("name"),
            "given_name": userinfo.get("given_name"),
            "family_name": userinfo.get("family_name"),
            "email_verified": info.get("email_verified"),
        }


def _verify_facebook_token(access_token: str) -> dict[str, Any]:
    """Verify a Facebook access token via the graph API debug endpoint."""
    import requests as req  # type: ignore
    app_id = os.environ.get("FACEBOOK_APP_ID")
    app_secret = os.environ.get("FACEBOOK_APP_SECRET")
    if not app_id or not app_secret:
        raise ValueError("FACEBOOK_APP_ID / FACEBOOK_APP_SECRET are not configured")
    app_token = f"{app_id}|{app_secret}"
    resp = req.get(
        "https://graph.facebook.com/debug_token",
        params={"input_token": access_token, "access_token": app_token},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json().get("data", {})
    if not data.get("is_valid"):
        raise ValueError(f"Invalid Facebook token: {data.get('error', {}).get('message', 'unknown')}")
    if data.get("app_id") != app_id:
        raise ValueError("Facebook token was not issued for this app")
    # Fetch name and email from the graph API using the user token
    me_resp = req.get(
        "https://graph.facebook.com/me",
        params={"fields": "id,name,email", "access_token": access_token},
        timeout=10,
    )
    me_resp.raise_for_status()
    me_data = me_resp.json()
    return {
        "sub": me_data.get("id"),
        "name": me_data.get("name"),
        "email": me_data.get("email"),
    }


def _verify_apple_token(identity_token: str) -> dict[str, Any]:
    """Verify an Apple Sign-In identity token."""
    import jwt as pyjwt  # type: ignore
    import requests as req  # type: ignore
    pyjwt_module = cast(Any, pyjwt)
    # Fetch Apple's public keys
    resp = req.get("https://appleid.apple.com/auth/keys", timeout=10)
    resp.raise_for_status()
    jwks = resp.json()
    # Decode header to find key id
    header = cast(dict[str, Any], pyjwt_module.get_unverified_header(identity_token))
    kid = header.get("kid")
    # Find matching public key
    public_key: Any = None
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            from jwt.algorithms import RSAAlgorithm  # type: ignore
            import json
            public_key = cast(Any, RSAAlgorithm).from_jwk(json.dumps(key_data))
            break
    if public_key is None:
        raise ValueError("Apple public key not found for kid: " + str(kid))
    apple_bundle_id = os.environ.get("APPLE_BUNDLE_ID")
    if not apple_bundle_id:
        raise ValueError("APPLE_BUNDLE_ID is not configured")
    payload = pyjwt_module.decode(
        identity_token,
        public_key,
        algorithms=["RS256"],
        audience=apple_bundle_id,
        issuer="https://appleid.apple.com",
    )
    return cast(dict[str, Any], payload)


@bp.route("/api/register", methods=["POST"])
@log_route
def register():
    """
    REGISTER - Begin the user registeration process by retrieving the user's credentials
    from the request body, validating them, adding a record to the database, and sending
    an email to their specified email address.
    """
    try:
        with db.session.begin():
            # If it's not even JSON, don't bother checking anything else
            if not request.is_json:
                raise ValueError("Invalid request - not JSON.")

            # Validate registration request
            reg_data = RegistrationRequest.model_validate(request.json)

            username = reg_data.username
            password = reg_data.password
            email_addr = reg_data.email
            seed_requested = reg_data.seed_requested
            source = reg_data.source

            # Ensure no user with this email already exists
            # UPDATE: This check is already performed in User.add
            #existing_user = User.get_by_email(email_addr)
            #if existing_user:
            #    raise ValueError("A user with that email address already exists")

            # Generate a verification token
            token = Crypto.generate_url_token()

            # Add the user to the database in "pending" state
            user = User.add({
                "username": username,
                "password": password,
                "email": email_addr, 
                "status": UserStatus.pending, 
                "token": token,
                "seed_requested": seed_requested})
            logging.info(f"New user added to database: {username} at {email_addr}")

            # Send the confirmation email
            error_msg = Sendmail.send_confirmation_email(username, token, email_addr, source)
            if error_msg is not None:
                raise RuntimeError(f"Couldn't send email to {email_addr}: {error_msg}.")
            else:
                logging.info(f"Email successfully sent to {email_addr}.")

            user.confirmation_email_sent_at = datetime.now()

    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 401
    else:
        msg = f"User {username} registered."
        logging.info(msg)
        return jsonify({"msg": msg}), 200


@bp.route("/api/resend_confirmation", methods=["POST"])
@log_route
def resend_confirmation():
    """
    RESEND CONFIRMATION - Generate a new confirmation token for an existing pending
    user and resend their confirmation email.
    """
    try:
        with db.session.begin():
            if not request.is_json:
                raise ValueError("Invalid request - not JSON.")

            resend_data = ResendConfirmationRequest.model_validate(request.json)
            expired_token = resend_data.token

            user = cast(User | None, User.get_by_confirmation_token(expired_token))
            if user is None:
                raise InvalidToken("Invalid confirmation token")
            if user.status == UserStatus.confirmed:
                raise UserAlreadyConfirmed(f"User '{user.username}' has already been confirmed")
            username = user.username
            encrypted_email_addr = user.encrypted_email_addr
            if encrypted_email_addr is None:
                raise RuntimeError("Email address missing from User record")
            email_addr = Crypto.decrypt(encrypted_email_addr)

            token = Crypto.generate_url_token()

            # Only the most recent confirmation token remains valid.
            user.confirmation_token = token

            error_msg = Sendmail.send_confirmation_email(username, token, email_addr)
            if error_msg is not None:
                raise EmailDeliveryFailed(f"Couldn't send email to {email_addr}: {error_msg}.")

            logging.info(f"Email successfully resent to {email_addr}.")
            user.confirmation_email_sent_at = datetime.now()

    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except ValueError as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    except InvalidToken as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 404
    except UserAlreadyConfirmed as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 409
    except EmailDeliveryFailed as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 503
    except Exception as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"Confirmation email resent to {email_addr}."
        logging.info(msg)
        return jsonify({"msg": msg}), 200


@bp.route("/api/confirm", methods = ["GET"])
@log_route
def confirm():
    """
    Confirm the user by matching the token in the confirmation email with
    the token stored in the user's User record.
    """
    try:
        with db.session.begin():
            confirmation_token = request.args.get("token")
            if confirmation_token is None:
                raise ValueError("Missing required parameter 'token'")

            # Retrieve the User record from the database.
            user = User.get_by_confirmation_token(confirmation_token)

            # Decrypt email for display
            email_addr = Crypto.decrypt(user.encrypted_email_addr) if user.encrypted_email_addr else None

            # Check whether the confirmation token is correct.
            if (confirmation_token != user.confirmation_token):
                raise InvalidToken(f"Invalid confirmation token for '{email_addr}'")

            # Make sure we have a time for when the token was sent.  Shouldn't be possible for us
            # to match the token but not have a send time for it, but we have to check anyway.
            if not user.confirmation_email_sent_at:
                raise InvalidToken(f"Missing send time for confirmation token sent to '{email_addr}'")

            # Check whether the confirmation token has expired.
            expired_time = user.confirmation_email_sent_at + timedelta(hours=4)
            if datetime.now() > expired_time:
                raise ExpiredToken(f"Confirmation token expired for '{email_addr}'")

            # Check whether the user is already confirmed
            #if user.status == UserStatus.confirmed:
            #    raise UserAlreadyConfirmed(f"User '{email_addr}' has already been confirmed")

            # The user is confirmed.  Update their status.
            user.status = UserStatus.confirmed
  
    except ValueError as e: # malformed request (missing token)
        msg = f"Unable to confirm user: {str(e)}."
        return_data = { "username": None, "msg": msg }
        logging.error(msg)
        return jsonify(return_data), 400
    except InvalidToken as e:
        msg = f"Unable to confirm user: {str(e)}."
        return_data = { "username": None, "msg": msg }
        logging.error(msg)
        return jsonify(return_data), 401
    except ExpiredToken as e:
        msg = f"Unable to confirm user: {str(e)}."
        return_data = { "username": None, "msg": msg }
        logging.error(msg)
        return jsonify(return_data), 403
    except UserAlreadyConfirmed as e:
        msg = str(e)
        return_data = { "username": user.username, "msg": msg } # type: ignore
        logging.error(msg)
        return jsonify(return_data), 409
    except Exception as e:
        msg = f"Unexpected server error: {str(e)}."
        return_data = { "username": None,  "msg": msg }
        logging.error(msg)
        return jsonify(return_data), 500
    else:
        email_addr = Crypto.decrypt(user.encrypted_email_addr) if user.encrypted_email_addr else None
        msg = f"User {email_addr} confirmed"
        return_data: dict[str,Any] = { "username": user.username, "msg": msg }
        logging.info(msg)
        if request.args.get("source") == "mobile":
            redirect_url = _confirmation_redirect_url("confirmed")
            logging.info(f"Redirecting confirmed mobile registration to {redirect_url}")
            return redirect(redirect_url, code=302)
        return jsonify(return_data), 200


@bp.route("/api/login", methods = ["POST"])
@log_route
def login():
    """
    Log in the user by retrieving their credentials from the request body, 
    verfifying them against the database, and if valid, generating and
    returning a JWT token.
    """
    try:
        with db.session.begin():
            # If it's not even JSON, don't bother checking anything else
            if not request.is_json:
                raise ValueError("Invalid request - not JSON")

            # Validate login request
            login_data = LoginRequest.model_validate(request.json)

            email = login_data.email
            password = login_data.password

            # Verify that the user's credentials are valid
            user = User.verify(email, password)

            # If requested, do the database seeding
            if user.seed_requested and user.seeded_at is None:
                Data.seed_database(user)

            # Generate a JWT token with role claims so all downstream auth checks
            # can be role-based instead of username-based.
            token_duration = int(os.environ.get("ACCESS_TOKEN_DURATION", 120))
            roles = _get_roles_for_user(user)
            access_token = create_access_token(
                identity=email,
                expires_delta=timedelta(minutes=token_duration),
                additional_claims={
                    "roles": roles,
                    # Keep legacy claim during migration.
                    "is_admin": Data.ROLE_ADMIN in roles,
                },
            )

    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 401
    else:
        msg = f"User {email} authenticated, returning token"
        logging.info(msg)
        return jsonify(access_token=access_token, username=user.username), 200


@bp.route("/api/social_login", methods=["POST"])
@log_route
def social_login():
    """
    Social login (Google, Facebook, Apple).

    Accepts a provider-specific token, verifies it server-side, then finds or
    creates a User record and issues an app JWT — exactly like /api/login.

    Request body:
      {
        "provider": "google" | "facebook" | "apple",
        "token":    "<id_token or access_token from the provider>",
        "platform": "web" | "android" | "ios" | "expo"   (required for Google only)
      }

    For Apple, the client may also send a one-time "name" field (only present
    on the very first sign-in):
      {
        "provider": "apple",
        "token":    "...",
        "name":     "Jane Smith"
      }
    """
    provider_for_log = "unknown"

    try:
        with db.session.begin():
            if not request.is_json:
                raise ValueError("Invalid request - not JSON")

            social_data = SocialLoginRequest.model_validate(request.json)
            provider = social_data.provider
            provider_for_log = provider
            token = social_data.token
            seed_requested = social_data.seed_requested

            # Verify the token with the provider and extract identity claims
            if provider == "google":
                platform = cast(str, social_data.platform)
                claims = _verify_google_token(token, platform)
                typed_claims = SocialIdentityClaims.model_validate(claims)
                oauth_id = typed_claims.sub
                email = typed_claims.email
                display_name = typed_claims.name
            elif provider == "facebook":
                claims = _verify_facebook_token(token)
                typed_claims = SocialIdentityClaims.model_validate(claims)
                oauth_id = typed_claims.sub
                email = typed_claims.email
                display_name = typed_claims.name
            else:  # apple
                claims = _verify_apple_token(token)
                typed_claims = SocialIdentityClaims.model_validate(claims)
                oauth_id = typed_claims.sub
                email = typed_claims.email
                # Apple only sends name on the very first sign-in; the client forwards it
                display_name = social_data.name

            # Find or create a user for this OAuth identity
            user = User.get_or_create_oauth_user(
                provider=provider,
                oauth_id=oauth_id,
                email=email,
                display_name=display_name,
                seed_requested=seed_requested,
            )

            # Seed database for brand-new users who requested it
            if user.seed_requested and user.seeded_at is None:
                Data.seed_database(user)

            # Determine the JWT identity (email if available, else provider:oauth_id)
            if user.encrypted_email_addr:
                identity = Crypto.decrypt(user.encrypted_email_addr)
            else:
                identity = f"{provider}:{oauth_id}"

            token_duration = int(os.environ.get("ACCESS_TOKEN_DURATION", 120))
            roles = _get_roles_for_user(user)
            access_token = create_access_token(
                identity=identity,
                expires_delta=timedelta(minutes=token_duration),
                additional_claims={
                    "roles": roles,
                    # Keep legacy claim during migration.
                    "is_admin": Data.ROLE_ADMIN in roles,
                },
            )

    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(f"Social login validation failed for provider={provider_for_log}: {msg}")
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = str(e)
        logging.error(f"Social login failed for provider={provider_for_log}: {msg}")
        return jsonify({"msg": msg}), 401
    else:
        logging.info(f"Social login succeeded: provider={provider}, oauth_id={oauth_id}, user={user.id}")
        return jsonify(access_token=access_token, username=user.username), 200


@bp.route("/api/request_reset_password", methods=["POST"])
@log_route
def request_reset_password():
    """
    The user has clicked the "forgot your password?" link on the logon screen
    and sent their email address using the ensuing screen.
    """
    try:
        with db.session.begin():
            email_addr = request.args.get("email")
            if not email_addr:
                raise ValueError("Missing required parameter 'email'")

            # From this point, whether we succeed or fail, always send the same 
            # generic message to avoid security leaks.
            try:
                user = User.get_by_email(email_addr)
                if not user:
                    logging.error(f"Unable retrieve user for {email_addr}")
                else:
                    # Generate a token to be included in the email.  This token will be used
                    # to verify the identity of the user that clicks it, AND to put a time
                    # limit on its use
                    token = Crypto.generate_url_token()

                    # Send the email
                    Sendmail.send_reset_password_email(user.username, token, email_addr)

                    # Update the database with the token and the time it was sent
                    user.reset_token = token
                    user.reset_email_sent_at 
            except Exception as e:
                logging.error(e)

    except ValidationError as e:
        # Don't return an error if the email was invalid, that just gives hackers more info
        pass
    except Exception as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 401

    msg = f"Check your inbox.  If that email address is registered you should receive a reset link there shortly.  You can close this screen."
    #logging.info(msg)
    return jsonify({"msg": msg}), 200


@bp.route("/api/reset_password", methods=["POST"])
@log_route
def reset_password():
    """
    Set the user's password to the specified value.  This also requires a token sent
    to the user via email by the request_reset_password endpoint.
    """
    try:
        with db.session.begin():
            reset_token = request.args.get("token")
            if not reset_token:
                raise ValueError("Missing required parameter 'token'")

            password = request.args.get("password")
            if not password:
                raise ValueError("Missing required parameter 'password'")

            # Get the user via the token provided
            user = User.get_by_reset_token(reset_token)
            if not user:
                raise ValueError("Invalid token")

            # Check that the token is not more than 15 minutes old
            if user.reset_email_sent_at is None:
                raise ValueError("Invalid token")
            token_age = datetime.now(timezone.utc) - user.reset_email_sent_at
            if token_age.total_seconds() > RESET_TOKEN_EXPIRATION_SECONDS:
                raise ValueError("Token has expired")

            user.set_password(password)

    except Exception as e:
        msg = f"Couldn't reset password: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Your password has been reset."
        logging.info(msg)
        return jsonify({"msg": msg}), 200


@bp.route("/api/change_password", methods=["POST"])
@write_required
@log_route
def change_password():
    """
    Change the user's password to the specified value.
    """
    try:
        with db.session.begin():
            # If it's not even JSON, don't bother checking anything else
            if not request.is_json:
                raise ValueError("Invalid request - not JSON")

            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user = User.get_by_email(email)

            old_password = request.args.get("old_password")
            if not old_password:
                raise ValueError("Missing required parameter 'old_password'")

            new_password = request.args.get("new_password")
            if not new_password:
                raise ValueError("Missing required parameter 'new_password'")

            user = User.verify(email, old_password)
            if not user:
                raise ValueError("Invalid email or password")

            user.set_password(new_password)

    except Exception as e:
        msg = f"Couldn't update password: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Your password has been updated."
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# USER
##############################
@bp.route("/api/user", methods = ["GET"])
@jwt_required()
@log_route
def get_users():
    """
    GET ALL USERS - Return the list of all Users
    """
    users: list[Any] = []
    try:
        with db.session.begin():
            longform = (request.args.get("long") is not None)

            user_daos = User.get_all()
            for user_dao in user_daos:
                if longform:
                    users.append(str(user_dao))
                else:
                    users.append(user_dao.json())
    except Exception as e:
        msg = f"User records could not be retrieved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = "User records retrieved"
        logging.info(msg)
        return jsonify(users), 200


@bp.route("/api/user/<string:username>", methods = ["GET"])
@jwt_required()
@log_route
def get_user(username: str):
    """
    GET USER - Get a particular User by username
    """
    try:
        with db.session.begin():
            user_dao = User.get(username)
            if not user_dao:
                raise ValueError(f"Could not retrieve user record for username '{username}'")
    except Exception as e:
        msg = f"User record could not be retrieved for {username}: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"User record retrieved for {username}"
        logging.info(user_dao)
        return jsonify(user_dao.json()), 200


@bp.route("/api/user", methods = ["DELETE"])
@write_required
@log_route
def delete_user():
    """
    DELETE SELF - Delete the User's own account and ALL THEIR DATA
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_dao = User.get_by_email(email)
            if not user_dao:
                raise ValueError(f"Could not retrieve user record for email '{email}'")
            user_id = user_dao.id

            if user_dao.id in (Data.GUEST_USER_ID, Data.ADMIN_USER_ID, Data.TEST_USER_ID):
                raise ValueError(f"The account '{user_dao.username}' may not be deleted.")
            
            Recipe.delete_all_for_user(user_id)
            Food.delete_all_for_user(user_id)
            db.session.delete(user_dao)

    except Exception as e:
        msg = f"User deletion failed: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"User record deleted for user {user_id} '{email}'"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


@bp.route("/api/user/<string:username>", methods = ["DELETE"])
@admin_required
@log_route
def admin_delete_user(username: str):
    """
    DELETE USER (Admin only) - Delete any user account and ALL THEIR DATA by username.
    The same protected usernames prohibited from self-deletion apply here.
    """
    try:
        with db.session.begin():
            user_dao = User.get(username)
            if not user_dao:
                raise ValueError(f"Could not retrieve user record for username '{username}'")
            user_id = user_dao.id

            if user_id in (Data.GUEST_USER_ID, Data.ADMIN_USER_ID, Data.TEST_USER_ID):
                raise ValueError(f"The account '{username}' may not be deleted.")

            Recipe.delete_all_for_user(user_id)
            Food.delete_all_for_user(user_id)
            db.session.delete(user_dao)

    except Exception as e:
        msg = f"User deletion failed: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"Admin deleted user {user_id} '{username}'"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# PREFERENCES
##############################
@bp.route("/api/preferences/<string:context>", methods = ["GET"])
@jwt_required()
@log_route
def get_preferences(context: str):
    """
    Return the list of all Users
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            prefs = Preferences.get(user_id, context) or {}
    except Exception as e:
        msg = f"Preference records could not be retrieved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = "Preferences retrieved"
        logging.info(msg)
        return jsonify({"context": context, "preferences": prefs}), 200


@bp.route("/api/preferences/<string:context>", methods = ["PUT"])
@write_required
@log_route
def save_preferences(context: str):
    """
    Return the list of all Users
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Validate preferences request (just ensure it's valid JSON)
            prefs_data = PreferencesRequest.model_validate(request.json)
            prefs = prefs_data.model_dump()
            
            Preferences.save(user_id, context, prefs)
    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = f"Preference records could not be saved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = "Preferences stored"
        logging.info(msg)
        return jsonify(msg), 200


##############################
# WHOAMI
##############################
@bp.route('/api/whoami', methods=['GET'])
@jwt_required()
@log_route
def whoami():
    """
    # This is a test API call intended to test token protection without involving 
    # any database or other API calls.
    # It retrieves the identity of the current user from the JWT token.
    """
    try:
        email = get_jwt_identity()
    except Exception as e:
        msg = f"Unable to identify user: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"User identified as: {email}"
        logging.info(msg)
        return jsonify(logged_in_as=email), 200


##############################
# FOOD
##############################
@bp.route("/api/food", methods = ["GET"])
@jwt_required()
@log_route
def get_foods():
    """
    Get all Foods for this user
    """
    foods: list[Any] = []
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Get all the Foods associated with that user_id
            food_daos = Food.get_all_for_user(user_id)
            for food_dao in food_daos:
                foods.append(food_dao.json())
    except Exception as e:
        msg = f"Food records could not be retrieved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Food records retrieved"
        logging.info(msg)
        return jsonify(foods), 200


@bp.route("/api/food/<int:food_id>", methods = ["GET"])
@jwt_required()
@log_route
def get_food(food_id:int):
    """
    Get one particular Food
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            food_dao = Food.get(user_id, food_id)
            food = food_dao.json()
    except Exception as e:
        msg = f"Food record could not be retrieved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Food record retrieved"
        logging.info(msg)
        return jsonify(food), 200


@bp.route("/api/food", methods = ["POST"])
@write_required
@log_route
def add_food():
    """
    Add a new Food
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Validate food request
            food_data = FoodRequest.model_validate(request.json)

            # Add the food to the database
            new_food_dao = Food.add(user_id, food_data)
            food_id = new_food_dao.id
            new_food = new_food_dao.json()
    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = f"Food record could not be added: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Food record {food_id} added"
        logging.info(msg)
        resp = make_response(jsonify(new_food), 201)
        resp.headers["Location"] = f"/food/{food_id}"
        return resp


@bp.route("/api/food", methods = ["PUT"])
@write_required
@log_route
def update_food():
    """
    Update an existing Food
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Validate food request
            food_data = FoodRequest.model_validate(request.json)

            # Replace the database's record with the data in the request
            updated_food_dao = Food.update(user_id, food_data)
            updated_food = updated_food_dao.json()
    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = f"Food record could not be updated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Food record updated"
        logging.info(msg)
        return jsonify(updated_food), 200


@bp.route("/api/food/<int:food_id>", methods = ["DELETE"])
@write_required
@log_route
def delete_food(food_id:int):
    """
    Delete a Food
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Get the specified Food record
            food = Food.get(user_id, food_id)

            # Delete the Food record
            db.session.delete(food)
    except Exception as e:
        msg = f"Food record could not be deleted: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Food record deleted"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# RECIPE
##############################
@bp.route("/api/recipe", methods = ["GET"])
@jwt_required()
@log_route
def get_recipes():
    """
    Get all Recipes for this user
    """
    recipes: list[Any] = []
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Get all the Recipes associated with that user_id
            recipe_daos = Recipe.get_all_for_user(user_id)
            for recipe_dao in recipe_daos:
                recipes.append(recipe_dao.json())
    except Exception as e:
        msg = f"Recipe records could not be retrieved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Recipe records retrieved"
        logging.info(msg)
        return jsonify(recipes), 200
    

@bp.route("/api/recipe/<int:recipe_id>", methods = ["GET"])
@jwt_required()
@log_route
def get_recipe(recipe_id: int):
    """
    Get one Recipe
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Get the Recipe for the given user_id and recipe_id
            recipe_dao = Recipe.get(user_id, recipe_id)
            if not recipe_dao:
                raise ValueError(f"Recipe record {recipe_id} not found.")
            recipe = recipe_dao.json()
    except Exception as e:
        msg = f"Recipe record could not be retrieved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Recipe record retrieved"
        logging.info(msg)
        return jsonify(recipe), 200


@bp.route("/api/recipe", methods = ["POST"])
@write_required
@log_route
def add_recipe():
    """
    Add a new Recipe (including its Ingredients)
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Validate recipe request
            recipe_data = RecipeRequest.model_validate(request.json)

            # Add the recipe to the database
            new_recipe_dao = Recipe.add_from_schema(user_id, recipe_data)
            new_recipe_id = new_recipe_dao.id
            new_recipe = new_recipe_dao.json()
    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = f"Recipe record could not be added: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe record {new_recipe_id} added"
        logging.info(msg)
        resp = make_response(jsonify(new_recipe), 201)
        resp.headers["Location"] = f"/recipe/{new_recipe_id}"
        return resp


@bp.route("/api/recipe", methods = ["PUT"])
@write_required
@log_route
def update_recipe():
    """
    Update an existing Recipe (including its Ingredients)
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Validate recipe request
            recipe_data = RecipeRequest.model_validate(request.json)

            # Update the database's record with the data in the request
            updated_recipe_dao = Recipe.update_from_schema(user_id, recipe_data)
            updated_recipe = updated_recipe_dao.json()
    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = f"Recipe record could not be updated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Recipe record updated"
        logging.info(msg)
        return jsonify(updated_recipe), 200


@bp.route("/api/recipe/<int:recipe_id>", methods = ["DELETE"])
@write_required
@log_route
def delete_recipe(recipe_id: int):
    """
    Delete a Recipe
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Get the specified Recipe record
            recipe = Recipe.get(user_id, recipe_id)

            # Delete any Ingredient records for this Recipe
            ingredient_daos = Ingredient.get_all_for_recipe(user_id, recipe_id)
            for ingredient_dao in ingredient_daos:
                db.session.delete(ingredient_dao)

            # Delete the Recipe
            db.session.delete(recipe)
    except Exception as e:
        msg = f"Recipe could not be deleted: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe record deleted"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


@bp.route("/api/recipe/<int:recipe_id>/recalc", methods = ["POST"])
@write_required
@log_route
def recalculate_recipe(recipe_id:int):
    """
    Recalculate the Nutrition info for a specified Recipe.
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            Recipe.recalculate(user_id, recipe_id)

    except Exception as e:
        msg = f"Recipe nutrition data could not be recalculated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe nutrition data recalculated for Recipe ID {recipe_id}"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


@bp.route("/api/recipe/recalc", methods = ["POST"])
@write_required
@log_route
def recalculate_all_for_user():
    """
    Recalculate the Nutrition info for all Recipe records for a User.
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            recipe_daos = Recipe.get_all_for_user(user_id)
            for recipe_dao in recipe_daos:
                Recipe.recalculate(user_id, recipe_dao.id, recipe_dao)

    except Exception as e:
        msg = f"Recipe nutrition data could not be recalculated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe nutrition data recalculated for all Recipes for user {email}"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# INGREDIENT
##############################
@bp.route("/api/recipe/<int:recipe_id>/ingredient", methods = ["GET"])
@jwt_required()
@log_route
def get_ingredients(recipe_id:int):
    """
    Get all Ingredients for a Recipe
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            # Get all the Ingredient records with that recipe_id
            ingredients: list[Ingredient] = Ingredient.get_all_for_recipe(user_id, recipe_id)
            data: list[Any] = []
            for ingredient in ingredients:
                data.append(ingredient.json())
    except Exception as e:
        msg = f"Ingredient records could not be retrieved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"{len(data)} Ingredient records retrieved"
        logging.info(msg)
        return jsonify(data), 200


##############################
# DAILY LOG ITEM
##############################
@bp.route("/api/dailylogitem", methods = ["GET"])
@jwt_required()
@log_route
def get_daily_log_entries():
    """
    Get DailyLogItem entries for this user.

    Accepts optional query parameters to filter by date range:
      ?date=2026-04-02            returns entries for a single date
      ?start=2026-04-01&end=2026-04-07   returns entries for a date range

    If no parameters are given, returns all entries for the user.
    """
    entries: list[Any] = []
    try:
        with db.session.begin():
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            date_str = request.args.get("date")
            start_str = request.args.get("start")
            end_str = request.args.get("end")

            if date_str:
                # Single-date query
                date = datetime.strptime(date_str, "%Y-%m-%d").date()
                log_daos = DailyLogItem.get_by_date(user_id, date)
            elif start_str and end_str:
                # Date-range query (weekly, monthly views)
                start = datetime.strptime(start_str, "%Y-%m-%d").date()
                end = datetime.strptime(end_str, "%Y-%m-%d").date()
                log_daos = DailyLogItem.get_by_range(user_id, start, end)
            else:
                raise ValueError("Either 'date' or both 'start' and 'end' query parameters are required")

            for log_dao in log_daos:
                entries.append(log_dao.json())
    except Exception as e:
        msg = f"DailyLogItem records could not be retrieved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"{len(entries)} DailyLogItem records retrieved"
        logging.info(msg)
        return jsonify(entries), 200


@bp.route("/api/dailylogitem/<int:log_id>", methods = ["GET"])
@jwt_required()
@log_route
def get_daily_log_entry(log_id: int):
    """
    Get one specific DailyLogItem entry.
    """
    try:
        with db.session.begin():
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            log_dao = DailyLogItem.get(user_id, log_id)
            entry = log_dao.json()
    except Exception as e:
        msg = f"DailyLogItem record could not be retrieved: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"DailyLogItem record {log_id} retrieved"
        logging.info(msg)
        return jsonify(entry), 200


@bp.route("/api/dailylogitem", methods = ["POST"])
@write_required
@log_route
def add_daily_log_entry():
    """
    Add a new DailyLogItem entry.

    Request body:
      {
        "date":      "2026-04-02",
        "recipe_id": 42,           (mutually exclusive with food_id)
        "food_id":   15,           (mutually exclusive with recipe_id)
        "servings":  2.0,
        "notes":     "optional note"   (optional)
      }

    Exactly one of recipe_id or food_id must be provided.
    """
    try:
        with db.session.begin():
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            if not request.is_json:
                raise ValueError("Invalid request - not JSON")

            # Validate daily log item request
            log_data = DailyLogItemRequest.model_validate(request.json)

            logging.debug(f"USERID {user_id}")

            new_log_dao = DailyLogItem.add_from_schema(user_id, log_data)
            new_log_id = new_log_dao.id
            new_entry = new_log_dao.json()
    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = f"DailyLogItem entry could not be added: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"DailyLogItem entry {new_log_id} added"
        logging.info(msg)
        resp = make_response(jsonify(new_entry), 201)
        resp.headers["Location"] = f"/dailylogitem/{new_log_id}"
        return resp


@bp.route("/api/dailylogitem/<int:log_id>", methods = ["PUT"])
@write_required
@log_route
def update_daily_log_entry(log_id: int):
    """
    Update the date and/or food/recipe and/or servings and/or notes on an existing DailyLogItem entry.

    Request body:
      {
        "date":      "2026-04-02",  (optional)
        "recipe_id": 42,            (optional, mutually exclusive with food_id)
        "food_id":   15,            (optional, mutually exclusive with recipe_id)
        "servings":  1.5,
        "notes":     "optional note"   (optional)
      }
    """
    try:
        with db.session.begin():
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            if not request.is_json:
                raise ValueError("Invalid request - not JSON")

            # Validate daily log item update request
            update_data = DailyLogItemUpdateRequest.model_validate(request.json)

            updated_log_dao = DailyLogItem.update_from_schema(user_id, log_id, update_data)
            updated_entry = updated_log_dao.json()
    except ValidationError as e:
        msg = _format_validation_error_message(e)
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors(include_context=False)}), 422
    except Exception as e:
        msg = f"DailyLogItem entry could not be updated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"DailyLogItem entry {log_id} updated"
        logging.info(msg)
        return jsonify(updated_entry), 200


@bp.route("/api/dailylogitem/<int:log_id>", methods = ["DELETE"])
@write_required
@log_route
def delete_daily_log_entry(log_id: int):
    """
    Delete a DailyLogItem entry.
    """
    try:
        with db.session.begin():
            email = get_jwt_identity()
            user_id = User.get_id_by_email(email)
            if not user_id:
                raise ValueError(f"Could not retrieve user record for email '{email}'")

            DailyLogItem.delete(user_id, log_id)
    except Exception as e:
        msg = f"DailyLogItem entry could not be deleted: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"DailyLogItem entry {log_id} deleted"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# USDA FDC IMPORTER (ADMIN)
##############################
@bp.route("/api/import/fdc/search", methods=["GET"])
@admin_required
@log_route
def fdc_search_foods():
    query = str(request.args.get("query", "")).strip()
    raw_data_type = request.args.get("dataType")
    try:
        page_number = int(request.args.get("pageNumber", 1))
        page_size = int(request.args.get("pageSize", 25))
    except Exception:
        return jsonify({"msg": "pageNumber and pageSize must be numeric"}), 400

    try:
        data_types = _parse_fdc_data_types(str(raw_data_type) if raw_data_type is not None else None)
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400

    if not query:
        return jsonify({"msg": "Missing required parameter 'query'"}), 400

    try:
        importer = _get_importer()
        data = importer.search_foods(query=query, page_number=page_number, page_size=page_size, data_types=data_types)
    except USDAFdcImporterError as e:
        msg = f"USDA search failed: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    except Exception as e:
        msg = f"USDA search failed: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500

    return jsonify(data), 200


@bp.route("/api/import/fdc/preview", methods=["POST"])
@admin_required
@log_route
def fdc_preview_foods():
    try:
        payload = _get_json_payload()
        fdc_ids = _parse_fdc_ids(payload.get("fdc_ids"))
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400

    try:
        importer = _get_importer()
        foods = importer.get_foods_by_ids(fdc_ids)
        previews: list[dict[str, Any]] = []
        for food in foods:
            mapped = importer.map_to_food_request(food)
            previews.append(
                {
                    "fdcId": food.get("fdcId"),
                    "dataType": food.get("dataType"),
                    "description": food.get("description"),
                    "calorieSource": importer.calorie_source(food),
                    "nutritionStatus": importer.nutrition_status(food),
                    "mapped": mapped.model_dump(),
                }
            )
    except USDAFdcImporterError as e:
        msg = f"USDA preview failed: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    except Exception as e:
        msg = f"USDA preview failed: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500

    return jsonify({"count": len(previews), "items": previews}), 200


@bp.route("/api/import/fdc/import", methods=["POST"])
@admin_required
@log_route
def fdc_import_foods():
    try:
        payload = _get_json_payload()
        fdc_ids = _parse_fdc_ids(payload.get("fdc_ids"))
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400

    created_count = 0
    updated_count = 0
    failures: list[dict[str, Any]] = []
    imported: list[dict[str, Any]] = []

    try:
        importer = _get_importer()
        usda_foods = importer.get_foods_by_ids(fdc_ids)
        by_fdc_id: dict[int, dict[str, Any]] = {
            int(food["fdcId"]): food for food in usda_foods if food.get("fdcId") is not None
        }

        with db.session.begin():
            importer_user_id = _get_importer_user_id()

            for fdc_id in fdc_ids:
                usda_food = by_fdc_id.get(fdc_id)
                if usda_food is None:
                    failures.append({"fdc_id": fdc_id, "error": "Food not found in USDA response"})
                    continue

                try:
                    with db.session.begin_nested():
                        mapped = importer.map_to_food_request(usda_food)
                        existing = Food.get_by_source_fdc_id(USDA_SOURCE, fdc_id)
                        if existing:
                            updated_request = mapped.model_copy(update={"id": existing.id})
                            food_dao = Food.update(importer_user_id, updated_request)
                            updated_count += 1
                            action = "updated"
                        else:
                            food_dao = Food.add(importer_user_id, mapped)
                            created_count += 1
                            action = "created"

                        food_dao.last_synced_at = datetime.now(timezone.utc)
                        imported.append(
                            {
                                "fdc_id": fdc_id,
                                "food_id": food_dao.id,
                                "name": food_dao.name,
                                "action": action,
                            }
                        )
                except Exception as e:
                    failures.append({"fdc_id": fdc_id, "error": str(e)})
    except USDAFdcImporterError as e:
        msg = f"USDA import failed: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    except Exception as e:
        msg = f"USDA import failed: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500

    response: dict[str, Any] = {
        "imported_count": len(imported),
        "created_count": created_count,
        "updated_count": updated_count,
        "failures": failures,
        "items": imported,
    }
    return jsonify(response), 200
