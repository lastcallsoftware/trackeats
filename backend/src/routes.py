import re
import logging
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from models import db, Ingredient, User
from crypto import encrypt, decrypt, hash_password, check_password
from sendmail import verify_user_email

bp = Blueprint("auth", __name__)

# HELPER FUNCTIONS
# ----------------
# Add a user to the database.  This does not issue a token; if registration is
# successful, the caller may then use the /login API to get a token using
# these same credentials.
def add_user(username: str, password: str, email: str) -> list[str]:
    # Add a catch-all try-except block, because who knows what could fail in
    # the ORM and JWT libraries we use here?  If there is a failure we want
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

        if not email:
            errors.append("Email address is required but missing.")
        else:
            email = email.strip()
            parts = email.split("@")
            if (len(parts) != 2):
                errors.append("Email address must contain exactly one @ character.")
            else:
                locallen = len(parts[0])
                domainlen = len(parts[1])
                if (locallen < 1):
                    errors.append("Email address before @ must be at least 1 character.")
                elif (locallen > 64):
                    errors.append("Email address before @ must be at most 64 characters.")
                if (domainlen < 1):
                    errors.append("Email address after @ must be at least 1 character.")
                elif (domainlen > 255):
                    errors.append("Email address after @ must be at most 255 characters.")

        if len(errors) == 0:
            # Check whether this username is already in the database
            query = db.select(User).filter_by(username=username)
            existing_user = db.session.execute(query).first()
            if (existing_user is not None):
                errors.append(f"User {username} already exists")
            else:
                # Salt and hash the password
                password_hash_str = hash_password(password)

                # Encrypt the user data.  Currently that is just the email address.
                encrypted_email = None
                if email and len(email) > 0:
                    encrypted_email = encrypt(email)

                # Store the user record in the database
                now = datetime.now()
                new_user = User(username=username, active=True, issued=now, email=encrypted_email, password_hash=password_hash_str)
                db.session.add(new_user)
                db.session.commit()
    except:
        errors.append("Internal server error: user could not be added")

    return errors

def validate_user(username: str, password: str) -> list[str]:
    errors = []

    try:
        if not username:
            errors.append("Missing required value 'username'")
        if not password:
            errors.append("Missing required value 'password'")

        if len(errors) == 0:
            # Validate the credentials
            # Retrieve user record from database
            # I know that in the case of a validation failure you're not supposed to 
            # tell the caller whether the username or password was invalid.  In the
            # interests of easier debugging, I'll take my chances here... :P
            query = db.select(User).filter_by(username=username)
            existing_users = db.session.execute(query).first()
            if (existing_users is None):
                errors.append(f"Invalid username {username}")
            else:
                existing_user = existing_users[0]
                password_hash_bytes = bytes(existing_user.password_hash, "utf-8")

                # Validate the password.
                # Note that the salt is stored as part of the hash, rather than as a 
                # separarte value.  The bcrypt API knows how to separate them.
                password_bytes = bytes(password, "utf-8")
                if (not check_password(password_bytes, password_hash_bytes)):
                    errors.append(f"Invalid password for username {username}")
    except:
        errors.append("Internal server error: user could not be validated")

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
        add_user("admin", "Test*123", "admin@lastcallsoftware.com")
        add_user("testuser", "Test*123", None)
    except:
        return {"msg": "Data load failed"}, 500

    return {"msg": "Data load complete"}, 200


# USER
# ----
# Return the list of users
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
                    data.append(user.__repr__())
                else:
                    data.append(str(user))
        except:
            return jsonify({"msg": "Internal server error - Unable to access database"}), 500
        return jsonify(data),200


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
        errors.append("Invalid request - not JSON")
    else:
        # Get parameters from request
        username = request.json.get('username', None)
        password = request.json.get('password', None)
        email = request.json.get('email', None)

        # Add the user to the database
        errors = add_user(username, password, email)

    if len(errors) > 0:
        msg = "\n".join(errors)
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"User {username} registered"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


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

        # Validate the user
        errors = validate_user(username, password)

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

@bp.route("/sendmail", methods=["GET"])
def mymail():
    logging.info("/sendmail")
    email_addr = request.args.get("addr")
    if email_addr == None:
        msg = "Missing required parameter 'addr'"
        logging.error(msg)
        return jsonify({"msg": msg}), 400

    error_msg = verify_user_email(email_addr)
    if error_msg is not None:
        msg = f"Couldn't send email to {email_addr}: {error_msg}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"Email successfully sent to {email_addr}"
        logging.info(msg)
        return jsonify({"msg": msg}), 200

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
