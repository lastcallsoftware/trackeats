import os
import logging
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, make_response, request
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from sendmail import send_confirmation_email
from models import db, User, UserStatus, Nutrition, Food, Recipe, Ingredient
from crypto import generate_url_token
from data import load_db, export_db
from sqlalchemy.sql import text

bp = Blueprint("auth", __name__)


##############################
# HEALTH
##############################
# Check the app's health.
@bp.route("/health", methods = ["GET"])
def health():
    logging.info("/health")
    try:
        db.session.execute(text("SELECT 1"))
    except Exception as e:
        msg = "Health check failed: " + repr(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Server OK"
        logging.info(msg)
        return {"msg": msg}, 200


##############################
# DATABASE ACTIONS
##############################
# INIT - Wipe the database and recreate all the tables using the ORM classes in 
# models.py.  Note that the tables will be EMPTY!
@bp.route("/db/init", methods=["GET"])
def db_init():
    logging.info("/db/init")
    try:
        # To execute this function, the app needs to be running with a DB_USERID
        # with DDL privileges
        db.drop_all()
        db.create_all()
    except Exception as e:
        msg = "Initialization failed: " + repr(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Initialization complete"
        logging.info(msg)
        return {"msg": msg}, 200

# LOAD - Populate the (presumably newly created) database with test data.
# Be aware that this API first deletes the contents of tables it populates!
@bp.route("/db/load", methods=["GET"])
def db_load():
    logging.info("/db/load")
    try:
        load_db()
    except Exception as e:
        msg = "Data load failed: " + repr(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Data load complete"
        logging.info(msg)
        return {"msg": msg}, 200


# EXPORT - Export selected data to JSON files for long-term storage and reloading purposes.
@bp.route("/db/export", methods=["GET"])
@jwt_required()
def db_export():
    logging.info("/db/export")
    try:
        export_db()
    except Exception as e:
        msg = "Data export failed: " + repr(e)
        logging.error(msg)
        return {"msg": msg}, 500
    else:
        msg = "Data export complete"
        logging.info(msg)
        return {"msg": msg}, 200


##############################
# REGISTER
##############################
# Begin the user registeration process by retrieving the user's credentials from
# the request body, validating them, adding a record to the database, and sending
# an email to their specified email address.
@bp.route("/register", methods=["POST"])
def register():
    logging.info("/register")
    try:
        # If it's not even JSON, don't bother checking anything else
        if not request.is_json:
            raise ValueError("Invalid request - not JSON.")

        # Get parameters from request
        username = request.json.get('username', None)
        password = request.json.get('password', None)
        email_addr = request.json.get('email', None)

        # Generate a verification token
        token = generate_url_token()

        # Add the user to the database in "pending" state
        User.add(username, password, email_addr, UserStatus.pending, token)
        logging.info(f"New user added to database: {username} at {email_addr}")

        # Send the confirmation email
        error_msg = send_confirmation_email(username, token, email_addr)
        if error_msg is not None:
            raise RuntimeError(f"Couldn't send email to {email_addr}: {error_msg}.")
        else:
            logging.info(f"Email successfully sent to {email_addr}.")
    except Exception as e:
        msg = repr(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 401
    else:
        msg = f"User {username} registered."
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# SENDMAIL
##############################
# Sends a verification email to the specified user.
@bp.route("/sendmail", methods=["GET"])
@jwt_required()
def mymail():
    logging.info("/sendmail")
    try:
        # Get request parameters from URL
        username = request.args.get("username")
        if username is None:
            raise ValueError("Missing required parameter 'username'.")

        email_addr = request.args.get("addr")
        if email_addr is None:
            raise ValueError("Missing required parameter 'addr'.")

        # Generate an auth token
        token = generate_url_token(32)

        # Send the confirmation email.
        send_confirmation_email(username, token, email_addr)
    except Exception as e:
        if email_addr is not None:
            msg = f"Couldn't send email to {email_addr}: {repr(e)}"
        else:
            msg = f"Couldn't send email: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Email sent successfully to {email_addr}."
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# CONFIRM
##############################
# Confirm the user by matching the token in the confirmation email with
# stored the token in the user's User record.
@bp.route("/confirm", methods = ["GET"])
def confirm():
    logging.info("/confirm")
    try:
        # Retrieve request parameters from the confirmation URL.
        username = request.args.get("username")
        if username is None:
            raise ValueError("Missing required parameter 'username'.")

        confirmation_token = request.args.get("token")
        if confirmation_token is None:
            raise ValueError("Missing required parameter 'token'.")

        # Retrieve the User record from the database.
        query = db.select(User).filter_by(username=username)
        users = db.session.execute(query).first()
        if (users is None):
            raise ValueError(f"Unknown username {username}.")
        user = users[0]

        # Check whether the confirmation token has expired.
        expired_time = user.confirmation_sent_at + timedelta(hours=4)
        if datetime.now() > expired_time:
            raise ValueError(f"Confirmation token expired for {username}.")

        # Check whether the confirmation token is correct.
        if (confirmation_token != user.confirmation_token):
            raise ValueError(f"Invalid confirmation token for {username}.")

        # The user is confirmed.  Update their status.
        user.status = UserStatus.confirmed
        db.session.commit()
    except ValueError as e:
        msg = f"Unable to confirm user: {repr(e)}."
        logging.error(msg)
        return jsonify(msg), 400
    except Exception as e:
        msg = f"Unable to confirm user: {repr(e)}."
        logging.error(msg)
        return jsonify(msg), 500
    else:
        msg = f"User {username} confirmed.  You may now close this window and log into the Trackeats app."
        logging.info(msg)
        return jsonify(msg), 200


##############################
# LOGIN
##############################
# Log in the user by retrieving their credentials from the request body, 
# verfifying them against the database, and if valid, generating and
# returning a JWT token.
@bp.route("/login", methods = ["POST"])
def login():
    logging.info("/login")
    try:
        # If it's not even JSON, don't bother checking anything else
        if not request.is_json:
            raise ValueError("Invalid request - not JSON")

        # Get parameters from request
        username = request.json.get('username', None)
        password = request.json.get('password', None)

        # Verify that the user's credentials are valid
        User.verify(username, password)

        # Generate a JWT token
        token_duration = int(os.environ.get("ACCESS_TOKEN_DURATION", 120))
        access_token = create_access_token(identity=username, expires_delta=timedelta(minutes=token_duration))
    except Exception as e:
        msg = repr(e)
        logging.error(msg)
        return jsonify({"msg": msg}), 401
    else:
        msg = f"User {username} authenticated, returning token"
        logging.info(msg)
        return jsonify(access_token=access_token), 200


##############################
# USER
##############################
# Return the list of all Users.
@bp.route("/user", methods = ["GET"])
@jwt_required()
def get_users():
    logging.info("/user")
    try:
        longform = False
        if (request.args.get("long") is not None):
            longform = True
        users = User.query.all()
        data = []
        for user in users:
            if longform:
                data.append(repr(user))
            else:
                data.append(user.json())
    except Exception as e:
        msg = f"User records could not be retrieved: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = "User records retrieved"
        logging.info(msg)
        return jsonify(data),200

# Get a particular User record.
@bp.route("/user/<string:username>", methods = ["GET"])
@jwt_required()
def get_user(username: str):
    logging.info("/user/" + username)
    try:
        longform = False
        if (request.args.get("long") is not None):
            longform = True
        user = User.query.filter_by(username=username).first()
        if user is None:
            raise ValueError(f"User {username} not found")
        if longform:
            data = repr(user)
        else:
            data = user.json()
    except Exception as e:
        msg = f"User record could not be retrieved for {username}: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"User record retrieved for {username}"
        logging.info(msg)
        return jsonify(data),200


##############################
# WHOAMI
##############################
# This is a test API call intended to test token protection without involving 
# any database or other API calls.
# It retrieves the identity of the current user from the JWT token.
@bp.route('/whoami', methods=['GET'])
@jwt_required()
def protected():
    logging.info("/whoami")
    try:
        username = get_jwt_identity()
    except Exception as e:
        msg = f"Unable to identify user: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 500
    else:
        msg = f"User identified as: {username}"
        logging.info(msg)
        return jsonify(logged_in_as=username), 200


##############################
# FOOD
##############################
# Get all Foods
@bp.route("/food", methods = ["GET"])
@jwt_required()
def get_foods():
    logging.info("/food GET")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get all the Foods associated with that user_id
        foods = Food.query.filter_by(user_id=user_id).order_by(Food.group, Food.name, Food.subtype).all()
        data = []
        for food in foods:
            data.append(food.json())
    except Exception as e:
        msg = f"Food records could not be retrieved: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Food records retrieved"
        logging.info(msg)
        return jsonify(data), 200
    
# Get Food
@bp.route("/food/<int:food_id>", methods = ["GET"])
@jwt_required()
def get_food(food_id:int):
    logging.info(f"/food GET {food_id}")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get all the Foods associated with that user_id
        food = Food.query.filter_by(user_id=user_id, id=food_id).first()
        if food is None:
            raise ValueError(f"Food {food_id} not found.")
        data = food.json()
    except Exception as e:
        msg = f"Food record could not be retrieved: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Food record retrieved"
        logging.info(msg)
        return jsonify(data), 200

# Add Food
@bp.route("/food", methods = ["POST"])
@jwt_required()
def add_food():
    logging.info("/food POST")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Add the food to the database
        food = request.json
        new_food = Food.add(user_id, food, True)
    except Exception as e:
        msg = f"Food record could not be added: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        food_id = new_food["id"]
        msg = f"Food record {food_id} added"
        logging.info(msg)
        resp = make_response(jsonify(new_food), 201)
        resp.headers["Location"] = f"/food/{food_id}"
        return resp

# Update Food
@bp.route("/food", methods = ["PUT"])
@jwt_required()
def update_food():
    logging.info("/food PUT")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Replace the database's record with the data in the request
        food = request.json
        updated_food = Food.update(user_id, food)
    except Exception as e:
        msg = f"Food record could not be updated: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Food record updated"
        logging.info(msg)
        return jsonify(updated_food), 200

# Delete Food
@bp.route("/food/<int:food_id>", methods = ["DELETE"])
@jwt_required()
def delete_food(food_id:int):
    logging.info(f"/food/{food_id} DELETE")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get the specified Food record
        food = Food.query.filter_by(user_id=user_id, id=food_id).first()
        if food is None:
            raise RuntimeError(f"Food record {food_id} not found.")

        # Delete the Food record
        db.session.delete(food)
        db.session.commit()
    except Exception as e:
        msg = f"Food record could not be deleted: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Food record deleted"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# RECIPE
##############################
# Get all Recipes
@bp.route("/recipe", methods = ["GET"])
@jwt_required()
def get_recipes():
    logging.info("/recipe GET")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get all the Recipes associated with that user_id
        recipes = Recipe.query.filter_by(user_id=user_id).order_by(Recipe.cuisine, Recipe.name).all()
        data = []
        for recipe in recipes:
            data.append(recipe.json())
    except Exception as e:
        msg = f"Recipe records could not be retrieved: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Recipe records retrieved"
        logging.info(msg)
        return jsonify(data), 200
    
# Get Recipe
@bp.route("/recipe/<int:recipe_id>", methods = ["GET"])
@jwt_required()
def get_recipe(recipe_id: int):
    logging.info("/recipe GET")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get the Recipe for the given user_id and recipe_id
        recipe = Recipe.query.filter_by(user_id=user_id, id=recipe_id).first()
        data = recipe.json()
    except Exception as e:
        msg = f"Recipe record could not be retrieved: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Recipe record retrieved"
        logging.info(msg)
        return jsonify(data), 200

# Add Recipe
@bp.route("/recipe", methods = ["POST"])
@jwt_required()
def add_recipe():
    logging.info("/recipe POST")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        recipe: list[dict] = request.json

        # Pull the serving size description from the Nutrition child record and
        # make it a separate parameter.  It will be added back to the Nutrition
        # record when the Recipe is saved.  We just do it this way to make the
        # .add() API call easier.
        serving_size_description = recipe["nutrition"]["serving_size_description"]

        # Add the recipe to the database
        new_recipe = Recipe.add(
            user_id, 
            recipe["cuisine"],
            recipe["name"], 
            recipe["total_yield"],
            recipe["servings"],
            serving_size_description,
            recipe.get("id", None))
    except Exception as e:
        msg = f"Recipe record could not be added: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        recipe_id = new_recipe["id"]
        msg = f"Recipe record {recipe_id} added"
        logging.info(msg)
        resp = make_response(jsonify(new_recipe), 201)
        #resp.headers["Access-Control-Expose-Headers"] = f"Location"
        resp.headers["Location"] = f"/recipe/{recipe_id}"
        return resp

# Update Recipe
@bp.route("/recipe", methods = ["PUT"])
@jwt_required()
def update_recipe():
    logging.info("/recipe PUT")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Update the database's record with the data in the request
        recipe = request.json
        updated_recipe = Recipe.update(user_id, recipe)
    except Exception as e:
        msg = f"Recipe record could not be updated: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = "Recipe record updated"
        logging.info(msg)
        return jsonify(updated_recipe), 200

# Delete Recipe
@bp.route("/recipe/<int:recipe_id>", methods = ["DELETE"])
@jwt_required()
def delete_recipe(recipe_id: int):
    logging.info(f"/recipe/{recipe_id} DELETE")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get the specified Recipe record
        recipe = Recipe.query.filter_by(user_id=user_id, id=recipe_id).first()
        if recipe is None:
            raise ValueError(f"Recipe {recipe_id} not found")

        # Delete any Ingredient records for this Recipe
        # Get Ingredients
        Ingredient.query.filter_by(recipe_id=recipe_id).delete()

        # Delete the Recipe
        db.session.delete(recipe)
        db.session.commit()
    except Exception as e:
        msg = f"Recipe could not be deleted: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe record deleted"
        logging.info(msg)
        return jsonify({"msg": msg}), 200


##############################
# INGREDIENT
##############################
# Get all Ingredients for a Recipe
@bp.route("/recipe/<int:recipe_id>/ingredient", methods = ["GET"])
@jwt_required()
def get_ingredients(recipe_id:int):
    logging.info(f"/recipe/{recipe_id}/ingredient GET")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get all the Ingredient records with that recipe_id
        ingredients:list[Ingredient] = Ingredient.query.filter_by(recipe_id=recipe_id).all()
        data = []
        for ingredient in ingredients:
            data.append(ingredient.json())
    except Exception as e:
        msg = f"Ingredient records could not be retrieved: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"{len(data)} Ingredient records retrieved"
        logging.info(msg)
        return jsonify(data), 200

# Add multiple Ingredients (either Food or Recipe) to a Recipe
@bp.route("/recipe/<int:recipe_id>/ingredient", methods = ["POST"])
@jwt_required()
def add_ingredients(recipe_id:int):
    logging.info(f"/recipe/{recipe_id}/ingredient POST")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Add the Ingredients to the database
        ingredients: list[dict[str,any]] = request.json
        added_inrgedients = []
        for ingredient in ingredients:
            food_ingredient_id = ingredient.get("food_ingredient_id")
            recipe_ingredient_id = ingredient.get("recipe_ingredient_id")
            ordinal = ingredient.get("ordinal")
            servings = ingredient.get("servings")
            summary = ingredient.get("summary")
            new_ingredient = Ingredient.add(recipe_id, food_ingredient_id, recipe_ingredient_id, servings, summary, ordinal, False)
            added_inrgedients.append(new_ingredient)
        db.session.commit()
    except Exception as e:
        msg = f"Ingredient record(s) could not be added to Recipe {recipe_id}: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"{len(ingredients)} Ingredient records added to Recipe {recipe_id}"
        logging.info(msg)
        return jsonify(added_inrgedients), 200

# Update a Food Ingredient for a Recipe
@bp.route("/recipe/<int:recipe_id>/food_ingredient/<int:food_id>/<float:servings>", methods = ["PUT"])
@jwt_required()
def update_food_ingredient(recipe_id:int, food_id:int, servings:float):
    logging.info(f"/recipe/{recipe_id}/food_ingredient/{food_id}/{servings} PUT")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get the recipe referenced by the ID
        recipe:Recipe = Recipe.query.filter_by(user_id=user_id, id=recipe_id).first()

        # Update the Ingredient record (this just means updating its servings 
        # field), and alter the Recipe's Nutrition data accordingly
        updated_ingredient = recipe.update_food_ingredient(food_id=food_id, servings=servings)
    except Exception as e:
        msg = f"Food Ingredient record {recipe_id}/{food_id} could not be updated: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Food Ingredent record {recipe_id}/{food_id} updated"
        logging.info(msg)
        return jsonify(updated_ingredient), 200
    
# Update a Recipe Ingredient for a Recipe
@bp.route("/recipe/<int:recipe_id>/recipe_ingredient/<int:recipe_ingredient_id>/<float:servings>", methods = ["PUT"])
@jwt_required()
def update_recipe_ingredient(recipe_id:int, recipe_ingredient_id:int, servings:float):
    logging.info(f"/recipe/{recipe_id}/recipe_ingredient/{recipe_ingredient_id}/{servings} PUT")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get the recipe referenced by the ID
        recipe:Recipe = Recipe.query.filter_by(user_id=user_id, id=recipe_id).first()

        # Update the Ingredient record (this just means updating its servings 
        # field), and alter the Recipe's Nutrition data accordingly
        updated_recipe_ingredient = recipe.update_recipe_ingredient(recipe_id=recipe_ingredient_id, servings=servings)
    except Exception as e:
        msg = f"Recipe Ingredient record {recipe_id}/{recipe_ingredient_id} could not be updated: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe Ingredent record {recipe_id}/{recipe_ingredient_id} updated"
        logging.info(msg)
        return jsonify(updated_recipe_ingredient), 200

# Remove all Ingredients for this Recipe
@bp.route("/recipe/<int:recipe_id>/ingredient", methods = ["DELETE"])
@jwt_required()
def remove_ingredients(recipe_id:int):
    logging.info(f"/recipe/{recipe_id}/ingredient DELETE")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get the Recipe record so we can get its Nutrition child record
        recipe:Recipe = Recipe.query.filter_by(user_id=user_id, id=recipe_id).first()
        if (recipe is None):
            raise ValueError(f"Recipe {recipe_id} not found")

        # Remove all the Ingredients from the Recipe
        Ingredient.query.filter_by(recipe_id=recipe_id).delete()

        # Reset the Nutrition data for the Recipe
        nutrition = Nutrition.query.filter_by(id=recipe.nutrition_id).first()
        nutrition.reset()

        # Reset the price data for the Recipe
        recipe.price = 0
        
        db.session.commit()
    except Exception as e:
        msg = f"Ingredients for Recipe {recipe_id} could not be removed: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Ingredients for Recipe {recipe_id} removed"
        logging.info(msg)
        return jsonify({"msg": msg}), 200

# Remove a Food Ingredient for this Recipe
@bp.route("/recipe/<int:recipe_id>/food_ingredient/<int:food_id>", methods = ["DELETE"])
@jwt_required()
def remove_food_ingredient(recipe_id:int, food_id:int):
    logging.info(f"/recipe/{recipe_id}/food_ingredient/{food_id} DELETE")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get the associated Recipe
        recipe = Recipe.query.filter_by(user_id=user_id, id=recipe_id).first()

        # Remove the food ingredient from the recipe
        recipe.remove_food_ingredient(food_id)
    except Exception as e:
        msg = f"Food Ingredient record {recipe_id}/{food_id} could not be removed: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Food Ingredient record {recipe_id}/{food_id} removed"
        logging.info(msg)
        return jsonify({"msg": msg}), 200

# Remove a Recipe Ingredient for this Recipe
@bp.route("/recipe/<int:recipe_id>/recipe_ingredient/<int:recipe_ingredient_id>", methods = ["DELETE"])
@jwt_required()
def remove_recipe_ingredient(recipe_id:int, recipe_ingredient_id:int):
    logging.info(f"/recipe/{recipe_id}/recipe_ingredient/{recipe_ingredient_id} DELETE")
    try:
        # Get the user_id for the user identified by the token
        username = get_jwt_identity()
        user_id = User.get_id(username)

        # Get the associated Recipe
        recipe = Recipe.query.filter_by(user_id=user_id, id=recipe_id).first()

        # Remove the food ingredient from the recipe
        recipe.remove_recipe_ingredient(recipe_ingredient_id)
    except Exception as e:
        msg = f"Recipe Ingredient record {recipe_id}/{recipe_ingredient_id} could not be removed: {repr(e)}"
        logging.error(msg)
        return jsonify({"msg": msg}), 400
    else:
        msg = f"Recipe Ingredient record {recipe_id}/{recipe_ingredient_id} removed"
        logging.info(msg)
        return jsonify({"msg": msg}), 200
