import os
import logging
from datetime import datetime, timedelta
from typing import Any
from flask import Blueprint, jsonify, make_response, request
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity # type:ignore
from pydantic import ValidationError
from sendmail import Sendmail
from models import db, User, Preferences, UserStatus, Food, Recipe, Ingredient, DailyLogItem
from schemas import (
    RegistrationRequest, ResendConfirmationRequest, LoginRequest,
    FoodRequest, RecipeRequest,
    DailyLogItemRequest, DailyLogItemUpdateRequest, PreferencesRequest
)
from crypto import Crypto
from data import Data
from sqlalchemy.sql import text

bp = Blueprint("auth", __name__)


##############################
# HEALTH
##############################
@bp.route("/api/health", methods = ["GET"])
def health():
    """
    Check the app's health.
    """
    #logging.info("/health")
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
# DATABASE ACTIONS
##############################
@bp.route("/api/db/init", methods=["GET"])
@jwt_required()
def db_init():
    """
    INIT - Wipe the database and recreate all the tables using the ORM classes in 
    models.py.  Note that the tables will be EMPTY!
    """
    logging.info("/db/init")
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
@jwt_required()
def db_purge():
    """
    LOAD - Populate the (presumably newly created) database with test data.
    Be aware that this API first deletes the contents of tables it populates!
    """
    logging.info(f"/db/purge")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
@jwt_required()
def db_load():
    """
    LOAD - Populate the (presumably newly created) database with test data.
    Be aware that this API first deletes the contents of tables it populates!
    """
    logging.info("/db/load")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)
        
            Data.load_db(user_id)
    except Exception as e:
        msg = "Data load failed: " + str(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Data load complete"
        logging.info(msg)
        return {"msg": msg}, 200


@bp.route("/api/db/export", methods=["GET"])
@jwt_required()
def db_export():
    """
    EXPORT - Export selected data to JSON files for long-term storage and reloading purposes.
    """
    logging.info("/db/export")
    try:
        with db.session.begin():
            Data.export_db()
    except Exception as e:
        msg = "Data export failed: " + str(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Data export complete"
        logging.info(msg)
        return {"msg": msg}, 200


##############################
# REGISTER
##############################
@bp.route("/api/register", methods=["POST"])
def register():
    """
    Begin the user registeration process by retrieving the user's credentials from
    the request body, validating them, adding a record to the database, and sending
    an email to their specified email address.
    """
    logging.info("/register")
    try:
        with db.session.begin():
            # If it's not even JSON, don't bother checking anything else
            if not request.is_json:
                raise ValueError("Invalid request - not JSON.")

            # If this is a "resend confirmation email" request sent because the original 
            # token expired, the request will be sent with the expired token rather than 
            # the username and email address (which is sent in the usual case).  So look 
            # for the expired token first and deal with that workflow separately.
            expired_token = request.json.get("token")
            if expired_token:
                # Validate resend request
                ResendConfirmationRequest.model_validate(request.json)
                
                user = User.get_by_token(expired_token)
                username = user.username
                encrypted_email_addr = user.email
                if encrypted_email_addr is None:
                    raise ValueError("Email address missing from User record")
                email_addr = Crypto.decrypt(encrypted_email_addr)

                # Generate a NEW verification token
                token = Crypto.generate_url_token()

                # Save the new token to the database.
                # We only keep the latest one.  A fancy-schmancy system would keep a 
                # record of past tokens and invalidate them, but we're not that fancy.
                user.confirmation_token = token

            # Otherwise this is a normal confirmation request, with username, password,
            # email address, and the seed requested flag.
            else:
                # Validate registration request
                reg_data = RegistrationRequest.model_validate(request.json)

                username = reg_data.username
                password = reg_data.password
                email_addr = reg_data.email
                seed_requested = reg_data.seed_requested

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
            error_msg = Sendmail.send_confirmation_email(username, token, email_addr)
            if error_msg is not None:
                raise RuntimeError(f"Couldn't send email to {email_addr}: {error_msg}.")
            else:
                logging.info(f"Email successfully sent to {email_addr}.")

            user.confirmation_sent_at = datetime.now()

    except ValidationError as e:
        msg = f"Invalid request: {e.error_count()} validation error(s)"
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors()}), 422
    except Exception as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 401
    else:
        msg = f"User {username} registered."
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# SENDMAIL
##############################
@bp.route("/api/sendmail", methods=["GET"])
@jwt_required()
def sendmail():
    """
    Sends a verification email to the specified user.
    """    
    logging.info("/sendmail")
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


##############################
# CONFIRM
##############################
class ExpiredToken(Exception):
    pass
class InvalidToken(Exception):
    pass
class UserAlreadyConfirmed(Exception):
    pass

@bp.route("/api/confirm", methods = ["GET"])
def confirm():
    """
    Confirm the user by matching the token in the confirmation email with
    the token stored in the user's User record.
    """
    logging.info("/confirm")
    try:
        with db.session.begin():
            confirmation_token = request.args.get("token")
            if confirmation_token is None:
                raise ValueError("Missing required parameter 'token'")

            # Retrieve the User record from the database.
            user = User.get_by_token(confirmation_token)

            # Check whether the confirmation token is correct.
            if (confirmation_token != user.confirmation_token):
                raise InvalidToken(f"Invalid confirmation token for '{user.username}'")

            # Make sure we have a time for when the token was sent.  Shouldn't be possible for us
            # to match the token but not have a send time for it, but we have to check anyway.
            if not user.confirmation_sent_at:
                raise InvalidToken(f"Missing send time for confirmation token sent to '{user.username}'")

            # Check whether the confirmation token has expired.
            expired_time = user.confirmation_sent_at + timedelta(hours=4)
            if datetime.now() > expired_time:
                raise ExpiredToken(f"Confirmation token expired for '{user.username}'")

            # Check whether the user is already confirmed
            #if user.status == UserStatus.confirmed:
            #    raise UserAlreadyConfirmed(f"User '{user.username}' has already been confirmed")

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
        msg = f"User {user.username} confirmed"
        return_data: dict[str,Any] = { "username": user.username, "msg": msg }
        logging.info(msg)
        return jsonify(return_data), 200


##############################
# LOGIN
##############################
@bp.route("/api/login", methods = ["POST"])
def login():
    """
    Log in the user by retrieving their credentials from the request body, 
    verfifying them against the database, and if valid, generating and
    returning a JWT token.
    """    
    logging.info("/login")
    try:
        with db.session.begin():
            # If it's not even JSON, don't bother checking anything else
            if not request.is_json:
                raise ValueError("Invalid request - not JSON")

            # Validate login request
            login_data = LoginRequest.model_validate(request.json)

            username = login_data.username
            password = login_data.password

            # Verify that the user's credentials are valid
            user = User.verify(username, password)

            # If requested, do the database seeding
            if user.seed_requested and user.seeded_at is None:
                Data.seed_database(user)

            # Generate a JWT token
            token_duration = int(os.environ.get("ACCESS_TOKEN_DURATION", 120))
            access_token = create_access_token(identity=username, expires_delta=timedelta(minutes=token_duration))
    except ValidationError as e:
        msg = f"Invalid request: {e.error_count()} validation error(s)"
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors()}), 422
    except Exception as e:
        msg = str(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 401
    else:
        msg = f"User {username} authenticated, returning token"
        logging.info(msg)
        return jsonify(access_token=access_token), 200


##############################
# USER
##############################
@bp.route("/api/user", methods = ["GET"])
@jwt_required()
def get_users():
    """
    Return the list of all Users
    """
    logging.info("/user")
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
def get_user(username: str):
    """
    Get a particular User
    """
    logging.info("/user/" + username)
    try:
        with db.session.begin():
            longform = (request.args.get("long") is not None)

            user_dao = User.get(username)
            if longform:
                data = str(user_dao)
            else:
                data = user_dao.json()
    except Exception as e:
        msg = f"User record could not be retrieved for {username}: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"User record retrieved for {username}"
        logging.info(msg)
        return jsonify(data), 200


@bp.route("/api/user", methods = ["DELETE"])
@jwt_required()
def delete_user():
    """
    Delete a user and ALL THEIR DATA
    """
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_dao = User.get(username)
            user_id = user_dao.id

            if username == "guest" or username == "admin" or username == "testuser":
                raise ValueError("Nice try, but this account may not be deleted.")
            
            Recipe.delete_all_for_user(user_id)
            Food.delete_all_for_user(user_id)
            db.session.delete(user_dao)

    except Exception as e:
        msg = f"User deletion failed: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"User record deleted for user {user_id} '{username}'"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# PREFERENCES
##############################
@bp.route("/api/preferences/<string:context>", methods = ["GET"])
@jwt_required()
def get_preferences(context: str):
    """
    Return the list of all Users
    """
    logging.info(f"/preferences/{context}")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
@jwt_required()
def save_preferences(context: str):
    """
    Return the list of all Users
    """
    logging.info(f"/preferences/{context}")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

            # Validate preferences request (just ensure it's valid JSON)
            prefs_data = PreferencesRequest.model_validate(request.json)
            prefs = prefs_data.model_dump()
            
            Preferences.save(user_id, context, prefs)
    except ValidationError as e:
        msg = f"Invalid request: {e.error_count()} validation error(s)"
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors()}), 422
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
def whoami():
    """
    # This is a test API call intended to test token protection without involving 
    # any database or other API calls.
    # It retrieves the identity of the current user from the JWT token.
    """
    logging.info("/whoami")
    try:
        username = get_jwt_identity()
    except Exception as e:
        msg = f"Unable to identify user: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"User identified as: {username}"
        logging.info(msg)
        return jsonify(logged_in_as=username), 200


##############################
# FOOD
##############################
@bp.route("/api/food", methods = ["GET"])
@jwt_required()
def get_foods():
    """
    Get all Foods for this user
    """
    logging.info("/food GET")
    foods: list[Any] = []
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

            # Get all the Foods associated with that user_id
            food_daos = Food.get_by_user(user_id)
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
def get_food(food_id:int):
    """
    Get one particular Food
    """
    logging.info(f"/food GET {food_id}")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
@jwt_required()
def add_food():
    """
    Add a new Food
    """
    logging.info("/food POST")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

            # Validate food request
            food_data = FoodRequest.model_validate(request.json)

            # Add the food to the database
            new_food_dao = Food.add(user_id, food_data)
            food_id = new_food_dao.id
            new_food = new_food_dao.json()
    except ValidationError as e:
        msg = f"Invalid request: {e.error_count()} validation error(s)"
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors()}), 422
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
@jwt_required()
def update_food():
    """
    Update an existing Food
    """
    logging.info("/food PUT")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

            # Validate food request
            food_data = FoodRequest.model_validate(request.json)

            # Replace the database's record with the data in the request
            updated_food_dao = Food.update(user_id, food_data)
            updated_food = updated_food_dao.json()
    except ValidationError as e:
        msg = f"Invalid request: {e.error_count()} validation error(s)"
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors()}), 422
    except Exception as e:
        msg = f"Food record could not be updated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Food record updated"
        logging.info(msg)
        return jsonify(updated_food), 200


@bp.route("/api/food/<int:food_id>", methods = ["DELETE"])
@jwt_required()
def delete_food(food_id:int):
    """
    Delete a Food
    """
    logging.info(f"/food/{food_id} DELETE")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
def get_recipes():
    """
    Get all Recipes for this user
    """
    logging.info("/recipe GET")
    recipes: list[Any] = []
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
def get_recipe(recipe_id: int):
    """
    Get one Recipe
    """
    logging.info("/recipe GET")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
@jwt_required()
def add_recipe():
    """
    Add a new Recipe (including its Ingredients)
    """
    logging.info("/recipe POST")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

            # Validate recipe request
            recipe_data = RecipeRequest.model_validate(request.json)

            # Add the recipe to the database
            new_recipe_dao = Recipe.add_from_schema(user_id, recipe_data)
            new_recipe_id = new_recipe_dao.id
            new_recipe = new_recipe_dao.json()
    except ValidationError as e:
        msg = f"Invalid request: {e.error_count()} validation error(s)"
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors()}), 422
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
@jwt_required()
def update_recipe():
    """
    Update an existing Recipe (including its Ingredients)
    """
    logging.info("/recipe PUT")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

            # Validate recipe request
            recipe_data = RecipeRequest.model_validate(request.json)

            # Update the database's record with the data in the request
            updated_recipe_dao = Recipe.update_from_schema(user_id, recipe_data)
            updated_recipe = updated_recipe_dao.json()
    except ValidationError as e:
        msg = f"Invalid request: {e.error_count()} validation error(s)"
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors()}), 422
    except Exception as e:
        msg = f"Recipe record could not be updated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Recipe record updated"
        logging.info(msg)
        return jsonify(updated_recipe), 200


@bp.route("/api/recipe/<int:recipe_id>", methods = ["DELETE"])
@jwt_required()
def delete_recipe(recipe_id: int):
    """
    Delete a Recipe
    """
    logging.info(f"/recipe/{recipe_id} DELETE")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
@jwt_required()
def recalculate_recipe(recipe_id:int):
    """
    Recalculate the Nutrition info for a specified Recipe.
    """
    logging.info(f"/recipe/{recipe_id}/recalc")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

            Recipe.recalculate_nutrition(user_id, recipe_id)

    except Exception as e:
        msg = f"Recipe nutrition data could not be recalculated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe nutrition data recalculated for Recipe ID {recipe_id}"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


@bp.route("/api/recipe/recalc", methods = ["POST"])
@jwt_required()
def recalculate_all_for_user():
    """
    Recalculate the Nutrition info for all Recipe records for a User.
    """
    logging.info(f"/recipe/recalc")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

            recipe_daos = Recipe.get_all_for_user(user_id)
            for recipe_dao in recipe_daos:
                Recipe.recalculate_nutrition(user_id, recipe_dao.id, recipe_dao)

    except Exception as e:
        msg = f"Recipe nutrition data could not be recalculated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe nutrition data recalculated for all Recipes for user {username}"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# INGREDIENT
##############################
@bp.route("/api/recipe/<int:recipe_id>/ingredient", methods = ["GET"])
@jwt_required()
def get_ingredients(recipe_id:int):
    """
    Get all Ingredients for a Recipe
    """
    logging.info(f"/recipe/{recipe_id}/ingredient GET")
    try:
        with db.session.begin():
            # Get the user_id for the user identified by the token
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
def get_daily_log_entries():
    """
    Get DailyLogItem entries for this user.

    Accepts optional query parameters to filter by date range:
      ?date=2026-04-02            returns entries for a single date
      ?start=2026-04-01&end=2026-04-07   returns entries for a date range

    If no parameters are given, returns all entries for the user.
    """
    logging.info("/dailylogitem GET")
    entries: list[Any] = []
    try:
        with db.session.begin():
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
def get_daily_log_entry(log_id: int):
    """
    Get one specific DailyLogItem entry.
    """
    logging.info(f"/dailylogitem/{log_id} GET")
    try:
        with db.session.begin():
            username = get_jwt_identity()
            user_id = User.get_id(username)

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
@jwt_required()
def add_daily_log_entry():
    """
    Add a new DailyLogItem entry.

    Request body:
      {
        "date":      "2026-04-02",
        "recipe_id": 42,
        "servings":  2.0,
        "notes":     "optional note"   (optional)
      }
    """
    logging.info("/dailylogitem POST")
    try:
        with db.session.begin():
            username = get_jwt_identity()
            user_id = User.get_id(username)

            if not request.is_json:
                raise ValueError("Invalid request - not JSON")

            # Validate daily log item request
            log_data = DailyLogItemRequest.model_validate(request.json)

            logging.debug(f"USERID {user_id}")

            new_log_dao = DailyLogItem.add_from_schema(user_id, log_data)
            new_log_id = new_log_dao.id
            new_entry = new_log_dao.json()
    except ValidationError as e:
        msg = f"Invalid request: {e.error_count()} validation error(s)"
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors()}), 422
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
@jwt_required()
def update_daily_log_entry(log_id: int):
    """
    Update the servings and/or notes on an existing DailyLogItem entry.

    Request body:
      {
        "servings": 1.5,
        "notes":    "optional note"   (optional)
      }
    """
    logging.info(f"/dailylogitem/{log_id} PUT")
    try:
        with db.session.begin():
            username = get_jwt_identity()
            user_id = User.get_id(username)

            if not request.is_json:
                raise ValueError("Invalid request - not JSON")

            # Validate daily log item update request
            update_data = DailyLogItemUpdateRequest.model_validate(request.json)

            updated_log_dao = DailyLogItem.update_from_schema(user_id, log_id, update_data)
            updated_entry = updated_log_dao.json()
    except ValidationError as e:
        msg = f"Invalid request: {e.error_count()} validation error(s)"
        logging.error(msg)
        return jsonify({"msg": msg, "errors": e.errors()}), 422
    except Exception as e:
        msg = f"DailyLogItem entry could not be updated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"DailyLogItem entry {log_id} updated"
        logging.info(msg)
        return jsonify(updated_entry), 200


@bp.route("/api/dailylogitem/<int:log_id>", methods = ["DELETE"])
@jwt_required()
def delete_daily_log_entry(log_id: int):
    """
    Delete a DailyLogItem entry.
    """
    logging.info(f"/dailylogitem/{log_id} DELETE")
    try:
        with db.session.begin():
            username = get_jwt_identity()
            user_id = User.get_id(username)

            DailyLogItem.delete(user_id, log_id)
    except Exception as e:
        msg = f"DailyLogItem entry could not be deleted: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"DailyLogItem entry {log_id} deleted"
        logging.info(msg)
        return jsonify({"msg": msg}), 200