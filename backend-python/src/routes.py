import os
import logging
from datetime import datetime, timedelta
from typing import Any
from flask import Blueprint, jsonify, make_response, request
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity # type:ignore
from sendmail import Sendmail
from models import db, User, UserStatus, Food, Recipe, Ingredient
from crypto import Crypto
from data import Data
from sqlalchemy.sql import text

bp = Blueprint("auth", __name__)


##############################
# HEALTH
##############################
@bp.route("/health", methods = ["GET"])
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
@bp.route("/db/init", methods=["GET"])
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


@bp.route("/db/purge", methods=["GET"])
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


@bp.route("/db/load", methods=["GET"])
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


@bp.route("/db/export", methods=["GET"])
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
@bp.route("/register", methods=["POST"])
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

            # Get parameters from request
            username = request.json.get('username', None)
            password = request.json.get('password', None)
            email_addr = request.json.get('email', None)
            seed_requested = request.json.get('seed_requested', False)

            # Generate a verification token
            token = Crypto.generate_url_token()

            # Add the user to the database in "pending" state
            User.add({
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
@bp.route("/sendmail", methods=["GET"])
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
            raise ValueError("Missing required parameter 'username'.")

        email_addr = request.args.get("addr")
        if email_addr is None:
            raise ValueError("Missing required parameter 'addr'.")

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
@bp.route("/confirm", methods = ["GET"])
def confirm():
    """
    Confirm the user by matching the token in the confirmation email with
    the token stored in the user's User record.
    """
    logging.info("/confirm")
    try:
        with db.session.begin():
            # Retrieve request parameters from the confirmation URL.
            username = request.args.get("username")
            if username is None:
                raise ValueError("Missing required parameter 'username'.")

            confirmation_token = request.args.get("token")
            if confirmation_token is None:
                raise ValueError("Missing required parameter 'token'.")

            # Retrieve the User record from the database.
            user = User.get(username)

            # Check whether the confirmation token has expired.
            if not user.confirmation_sent_at:
                raise ValueError(f"Confirmation token was not sent to {username}.")
            expired_time = user.confirmation_sent_at + timedelta(hours=4)
            if datetime.now() > expired_time:
                raise ValueError(f"Confirmation token expired for {username}.")

            # Check whether the confirmation token is correct.
            if (confirmation_token != user.confirmation_token):
                raise ValueError(f"Invalid confirmation token for {username}.")

            # The user is confirmed.  Update their status.
            user.status = UserStatus.confirmed
  
    except ValueError as e:
        msg = f"Unable to confirm user: {str(e)}."
        logging.error(msg)
        return jsonify(msg), 400
    except Exception as e:
        msg = f"Unable to confirm user: {str(e)}."
        logging.error(msg)
        return jsonify(msg), 500
    else:
        msg = f"User {username} confirmed.  You may now close this window and log into the Trackeats app."
        logging.info(msg)
        return jsonify(msg), 200


##############################
# LOGIN
##############################
@bp.route("/login", methods = ["POST"])
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

            # Get parameters from request
            username = request.json.get('username', None)
            password = request.json.get('password', None)

            # Verify that the user's credentials are valid
            user = User.verify(username, password)

            # If requested, do the database seeding
            if user.seed_requested and user.seeded_at is None:
                Data.seed_database(user)

            # Generate a JWT token
            token_duration = int(os.environ.get("ACCESS_TOKEN_DURATION", 120))
            access_token = create_access_token(identity=username, expires_delta=timedelta(minutes=token_duration))
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
@bp.route("/user", methods = ["GET"])
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
        return jsonify(users),200


@bp.route("/user/<string:username>", methods = ["GET"])
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
        return jsonify(data),200


##############################
# WHOAMI
##############################
@bp.route('/whoami', methods=['GET'])
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
@bp.route("/food", methods = ["GET"])
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


@bp.route("/food/<int:food_id>", methods = ["GET"])
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


@bp.route("/food", methods = ["POST"])
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

            # Add the food to the database
            food = request.json
            new_food_dao = Food.add(user_id, food)
            food_id = new_food_dao.id
            new_food = new_food_dao.json()
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


@bp.route("/food", methods = ["PUT"])
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

            # Replace the database's record with the data in the request
            food = request.json
            updated_food_dao = Food.update(user_id, food)
            updated_food = updated_food_dao.json()
    except Exception as e:
        msg = f"Food record could not be updated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Food record updated"
        logging.info(msg)
        return jsonify(updated_food), 200


@bp.route("/food/<int:food_id>", methods = ["DELETE"])
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
@bp.route("/recipe", methods = ["GET"])
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
    

@bp.route("/recipe/<int:recipe_id>", methods = ["GET"])
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


@bp.route("/recipe", methods = ["POST"])
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

            # Get the recipe data from the request
            recipe: dict[str,Any] = request.json

            # Add the recipe to the database
            new_recipe_dao = Recipe.add(user_id, recipe)
            new_recipe_id = new_recipe_dao.id
            new_recipe = new_recipe_dao.json()
    except Exception as e:
        msg = f"Recipe record could not be added: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe record {new_recipe_id} added"
        logging.info(msg)
        resp = make_response(jsonify(new_recipe), 201)
        #resp.headers["Access-Control-Expose-Headers"] = f"Location"
        resp.headers["Location"] = f"/recipe/{new_recipe_id}"
        return resp


@bp.route("/recipe", methods = ["PUT"])
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

            # Update the database's record with the data in the request
            recipe = request.json
            updated_recipe_dao = Recipe.update(user_id, recipe)
            updated_recipe = updated_recipe_dao.json()
    except Exception as e:
        msg = f"Recipe record could not be updated: {str(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Recipe record updated"
        logging.info(msg)
        return jsonify(updated_recipe), 200


@bp.route("/recipe/<int:recipe_id>", methods = ["DELETE"])
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


##############################
# INGREDIENT
##############################
@bp.route("/recipe/<int:recipe_id>/ingredient", methods = ["GET"])
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
