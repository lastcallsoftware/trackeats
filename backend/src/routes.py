import os
import logging
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from sendmail import send_confirmation_email
from models import db, User, UserStatus, Ingredient
from crypto import generate_url_token
from data import load_db

bp = Blueprint("auth", __name__)

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
# Populate the (presumably newly created) database with a little seed data
# for testing.
# Be aware that this API first deletes the contents of tables it populates!
@bp.route("/db/load", methods=["GET"])
def db_load():
    logging.info("/db/load")

    errors = load_db()

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
        errors = User.add(username, password, email_addr, UserStatus.pending, token)
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

    msg = f"User {username} confirmed.  You may now close this window and log into the Trackeats app."
    logging.info(msg)
    return jsonify(msg), 200


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
        errors = User.verify(username, password)

        # Generate a JWT token
        access_token = None
        if (len(errors)) == 0:
            token_duration = int(os.environ.get("ACCESS_TOKEN_DURATION", 120))
            access_token = create_access_token(identity=username, expires_delta=timedelta(minutes=token_duration))

    if (len(errors) > 0):
        error_str = "\n".join(errors)
        logging.error(error_str)
        return jsonify({"msg": error_str}), 401
    else:
        logging.info(f"User {username} authenticated, token sent")
        return jsonify(access_token=access_token), 200


# USER
# ----
# Return the list of all Users.
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
                    data.append(user.json())
        except Exception as e:
            return jsonify({"msg": "Unable to access database: " + str(e)}), 500
        return jsonify(data),200

# Get a particular User record.
@bp.route("/user/<string:username>", methods = ["GET"])
def get_user(username: str):
    logging.info("/user/" + username)
    try:
        longform = False
        if (request.args.get("long") != None):
            longform = True
        query = db.select(User).filter_by(username=username)
        user = db.session.execute(query).first()[0]
        if longform:
            data = repr(user)
        else:
            data = user.json()
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
    username = get_jwt_identity()
    logging.info(f"username: {username}")
    return jsonify(logged_in_as=username), 200


# INGREDIENT
# ----------
# Get the list of all ingredients for this user
@bp.route("/ingredient", methods = ["GET"])
@jwt_required()
def get_ingredients():
    logging.info("/ingredient GET")

    errors = []
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get all the Ingredients associated with that user_id
        ingredients = Ingredient.query.filter_by(user_id=user_id).all()
        data = []
        for ingredient in ingredients:
            data.append(ingredient.json())
    except Exception as e:
        errors.append("Could not retrieve Ingredient records: " + repr(e))

    if (len(errors) > 0):
        msg = "\n".join(errors)
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        return jsonify(data), 200
    
# Add a new Ingredient to the database for this user
@bp.route("/ingredient", methods = ["POST"])
@jwt_required()
def add_ingredient():
    logging.info("/ingredient POST")

    errors = []
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Add the ingredient to the database
        ingredient = request.json
        errors = Ingredient.add(user_id, ingredient, True)
    except Exception as e:
        errors.append("Ingredient record could not be added: " + repr(e))

    if (len(errors) > 0):
        msg = "\n".join(errors)
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Ingredient added"
        logging.info(msg)
        return jsonify({"msg": msg}), 200
