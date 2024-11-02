import re
import logging
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from models import UserStatus, db, Ingredient, User
from crypto import encrypt, decrypt, hash_password, check_password
from sendmail import send_confirmation_email
from email_validator import validate_email, EmailNotValidError
from crypto import generate_url_token

bp = Blueprint("auth", __name__)

# HELPER FUNCTIONS
# ----------------

# ADD_NEW_USER
# ------------
# Add a new user to the database and send them a verification email.
# This function does not issue a JWT token; if registration is successful, the
# caller may then use the /login API to get a token using these same credentials.
def add_new_user(username: str, password: str, email_addr: str, status=UserStatus.pending, confirmation_token: str=None) -> list[str]:
    # Add a catch-all try-except block, because who knows what could fail in
    # the ORM and JWT libraries we use here?  If there is a failure, we want
    # to return our own error message instad of an exception stack!
    try:
        errors = []

        if not username:
            errors.append("Username is required but missing.")
        else:
            username = username.strip()
            if len(username) < 3:
                errors.append("Username must be at least 3 characters.")
            elif len(username) > 100:
                errors.append("Username must be at most 100 characters.")
        
        if not password:
            errors.append("Password is required but missing.")
        else:
            password = password.strip()
            if len(password) < 8:
                errors.append("Password must be at least 8 characters.")
            elif len(password) > 100:
                errors.append("Password must be at most 100 characters.")
            if not re.search(r"[a-z]", password):
                errors.append("Password must contain at least one lowercase letter.")
            if not re.search(r"[A-Z]", password):
                errors.append("Password must contain at least one uppercase letter.")
            if not re.search(r"\d", password):
                errors.append("Password must contain at least one digit.")
            if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
                errors.append("Password must contain at least one special character.")

        if not email_addr:
            errors.append("Email address is required but missing.")
        else:
            try:
                email_info = validate_email(email_addr, check_deliverability=True)
                email_addr = email_info.normalized
            except EmailNotValidError as e:
                errors.append(str(e) + " ")

        if len(errors) == 0:
            # Check whether this username is already in the database
            query = db.select(User).filter_by(username=username)
            existing_user = db.session.execute(query).first()
            if (existing_user is not None):
                errors.append(f"User {username} already exists.")
            else:
                # Salt and hash the password
                password_hash_str = hash_password(password)

                # Encrypt the user data.  Currently that is just the email address.
                encrypted_email = None
                if email_addr and len(email_addr) > 0:
                    encrypted_email_addr = encrypt(email_addr)

                # Store the user record in the database
                now = datetime.now()
                confirmation_sent_at = None
                if confirmation_token is not None:
                    confirmation_sent_at = now
                new_user = User(
                    username=username, 
                    status=status, 
                    email=encrypted_email_addr, 
                    created_at=now, 
                    password_hash=password_hash_str,
                    confirmation_sent_at=confirmation_sent_at, 
                    confirmation_token=confirmation_token)
                db.session.add(new_user)
                db.session.commit()
    except Exception as e:
        errors.append("User could not be added: " + repr(e))

    return errors


# VERIFY_USER
# -----------
# Verify that the given user credentials are valid
def verify_user(username: str, password: str) -> list[str]:
    errors = []

    try:
        if not username:
            errors.append("Username is required but missing.")
        if not password:
            errors.append("Password is required but missing.")

        if len(errors) == 0:
            # Validate the credentials
            # Retrieve user record from database
            # I know that in the case of a validation failure you're not supposed to 
            # tell the caller whether the username or password was invalid.  In the
            # interests of easier debugging, I'll take my chances here... :P
            query = db.select(User).filter_by(username=username)
            users = db.session.execute(query).first()
            if users is None:
                errors.append(f"Invalid username {username}.")
            else:
                user = users[0]

                # Make sure the user has been confirmed
                if user.status != UserStatus.confirmed:
                    errors.append(f"User {username} has not been confirmed.")
                else:
                    # Validate the password.
                    # Note that the salt is stored as part of the hash, rather than as a 
                    # separarte value.  The bcrypt API knows how to separate them.
                    password_hash_bytes = bytes(user.password_hash, "utf-8")
                    password_bytes = bytes(password, "utf-8")
                    if (not check_password(password_bytes, password_hash_bytes)):
                        errors.append(f"Invalid password for username {username}.")
    except:
        errors.append("Internal server error: user could not be validated.")

    return errors


# ROUTE HANDLERS
# --------------

# HEALTH
# ------
# Check the app's health.
# Currently it's just to see if the app is running, but I want to add other checks 
# too, like a test of the database connection.
@bp.route("/health", methods = ["GET"])
def health():
    logging.info("/health")
    return {"msg": "Server OK"}, 200


# DB/INIT
# -------
# Wipe the database and recreate all the tables using the ORM classes in 
# models.py.  Note that the tables will be EMPTY!
@bp.route("/db/init", methods=["GET"])
def db_init():
    logging.info("/db/init")

    # To execute this function, the app needs to be running with a DB_USERID
    # with DDL privileges
    db.drop_all()
    db.create_all()

    return {"msg": "Initialization complete"}, 200


# DB/LOAD
# -------
# Populate the (presumably newly crEated) database with a little seed data
# for testing.
# Be aware that this API first deletes the contents of tables it populates!
@bp.route("/db/load", methods=["GET"])
def db_load():
    logging.info("/db/load")
    try:
        Ingredient.query.delete()
        milk = Ingredient(name="milk", serving_size="1 cup")
        butter = Ingredient(name="butter", serving_size="1 tbsp")
        db.session.add(milk)
        db.session.add(butter)
        db.session.commit()

        db.session.query(User).delete()
        errors = add_new_user("admin", "Test*123", "admin@trackeats.com", UserStatus.confirmed)
        if len(errors) == 0:
            errors = add_new_user("testuser", "Test*123", "testuser@trackeats.com", UserStatus.confirmed)
    except Exception as e:
        errors.append(str(e))
    
    if len(errors) > 0:
        msg = "\n".join(errors)
        logging.error(msg)
        return {"msg": "Data load failed: " + msg}, 500
    else:
        return {"msg": "Data load complete"}, 200


# REGISTER
# --------
# Begin the user registeration process by retrieving the user's credentials from
# the request body, validating them, adding a record to the database, and sending
# an email to their specified email address.
@bp.route("/register", methods=["POST"])
def register():
    logging.info("/register")
    errors = []

    # If it's not even JSON, don't bother checking anything else
    if not request.is_json:
        errors.append("Invalid request - not JSON.")
    else:
        # Get parameters from request
        username = request.json.get('username', None)
        password = request.json.get('password', None)
        email_addr = request.json.get('email', None)

        # Generate a verification token
        token = generate_url_token()

        # Add the user to the database in "pending" state
        errors = add_new_user(username, password, email_addr, UserStatus.pending, token)
        if len(errors) == 0:
            logging.info(f"New user added to database: {username} at {email_addr}")

            # Send the confirmation email
            error_msg = send_confirmation_email(username, token, email_addr)
            if error_msg is not None:
                errors.append(f"Couldn't send email to {email_addr}: {error_msg}.")
            else:
                logging.info(f"Email successfully sent to {email_addr}.")

    if len(errors) > 0:
        msg = "\n".join(errors)
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"User {username} registered."
        logging.info(msg)
        return jsonify({"msg": msg}), 200


# SENDMAIL
# --------
# Sends a verification email to the specified user.
# TODO: This is currently an UNPROTECTED TEST API.
# Make sure to remove or protect it before releasing to production!
@bp.route("/sendmail", methods=["GET"])
def mymail():
    logging.info("/sendmail")

    # Get request parameters from URL
    username = request.args.get("username")
    if username is None:
        msg = "Missing required parameter 'username'."
        logging.error(msg)
        return jsonify({"msg": msg}), 400

    email_addr = request.args.get("addr")
    if email_addr is None:
        msg = "Missing required parameter 'addr'."
        logging.error(msg)
        return jsonify({"msg": msg}), 400

    token = generate_url_token(32)

    # Send confirmation email.
    error_msg = send_confirmation_email(username, token, email_addr)
    if error_msg is not None:
        msg = f"Couldn't send email to {email_addr}: {error_msg}."
        logging.error(msg)
        return jsonify({"msg": msg}), 500

    # SUCCESS!
    msg = f"Email successfully sent to {email_addr}."
    logging.info(msg)
    return jsonify({"msg": msg}), 200


# CONFIRM
# -------
# Confirm the user by matching the token in the confirmation email with
# stored the token in the user's User record.
@bp.route("/confirm", methods = ["GET"])
def confirm():
    logging.info("/confirm")

    # Retrieve request parameters from the confirmation URL.
    username = request.args.get("username")
    if username is None:
        msg = "Missing required parameter 'username'."
        logging.error(msg)
        return jsonify({"msg": msg}), 400

    confirmation_token = request.args.get("token")
    if confirmation_token is None:
        msg = "Missing required parameter 'token'."
        logging.error(msg)
        return jsonify({"msg": msg}), 400

    # Retrieve the User record from the database.
    query = db.select(User).filter_by(username=username)
    users = db.session.execute(query).first()
    if (users is None):
        msg = f"Unknown username {username}."
        logging.error(msg)
        return jsonify({"msg": msg}), 401
    user = users[0]

    # Check whether the confirmation token has expired.
    expired_time = user.confirmation_sent_at + timedelta(hours=4)
    if datetime.now() > expired_time:
        msg = f"Confirmation token expired for {username}."
        logging.error(msg)
        return jsonify({"msg": msg}), 401

    # Check whether the confirmation token is correct.
    if (confirmation_token != user.confirmation_token):
        msg = f"Invalid confirmation token for {username}."
        logging.error(msg)
        return jsonify({"msg": msg}), 401

    # The user is confirmed.  Update their status.
    try:
        user.status = UserStatus.confirmed
        db.session.commit()
    except Exception as e:
        msg = f"Error saving User record: {str(e)}."
        logging.error(msg)
        return jsonify(msg), 500

    msg = f"User confirmed: {username}"
    logging.info(msg)
    return jsonify(msg), 200

# VERIFY
# ------
# Check whether a user has been confirmed.  The front end repeatedly calls this
# after after a new user registers to determine whther they have clicked on the
# email link that was sent to them.



# LOGIN
# -----
# Log in the user by retrieving their credentials from the request body, 
# verfifying them against the database, and if valid, generating and
# returning a JWT token.
@bp.route("/login", methods = ["POST"])
def login():
    logging.info("/login")
    errors = []

    # If it's not even JSON, don't bother checking anything else
    if not request.is_json:
        errors.append("Invalid request - not JSON")
    else:
        # Get parameters from request
        username = request.json.get('username', None)
        password = request.json.get('password', None)

        # Verify that the user's credentials are valid
        errors = verify_user(username, password)

        # Generate a JWT token
        access_token = None
        if (len(errors)) == 0:
            access_token = create_access_token(identity=username, expires_delta=timedelta(seconds=60))

    if (len(errors) > 0):
        error_str = "\n".join(errors)
        logging.error(error_str)
        return jsonify({"msg": error_str}), 401
    else:
        logging.info(f"User {username} authenticated, token sent")
        return jsonify(access_token=access_token), 200


# USER
# ----
# Return the list of users.
# TODO: This is currently an UNPROTECTED API.
# Make sure to protect it before releasing to production!
@bp.route("/user", methods = ["GET"])
def get_users():
    logging.info("/user")
    if (request.method == "GET"):
        try:
            longform = False
            if (request.args.get("long") != None):
                longform = True
            users = User.query.all()
            data = []
            for user in users:
                if longform:
                    data.append(repr(user))
                else:
                    data.append(str(user))
        except Exception as e:
            return jsonify({"msg": "Unable to access database: " + str(e)}), 500
        return jsonify(data),200


# WHOAMI
# ------
# This is a test API call intended to test token protection without involving 
# any database or other API calls.
# It retrieves the identity of the current user from the JWT token.
@bp.route('/whoami', methods=['GET'])
@jwt_required()
def protected():
    logging.info("/whoami")
    current_user = get_jwt_identity()
    logging.info(f"current_user: {current_user}")
    return jsonify(logged_in_as=current_user), 200


# INGREDIENT
# ----------
# Finally, an API that actually retrieves app data!
@bp.route("/ingredient", methods = ["GET"])
@jwt_required()
def hello_world():
    logging.info("/ingredient")
    if (request.method == "GET"):
        ingredients = Ingredient.query.all()
        data = []
        for ingredient in ingredients:
            data.append({"name": ingredient.name, "serving_size": ingredient.serving_size})
        return jsonify(data), 200
