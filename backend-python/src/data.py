from sqlalchemy import select, delete, inspect
from models import db, User, UserStatus, Food, Recipe, Ingredient, Nutrition
from schemas import FoodRequest, RecipeRequest, IngredientRequest
#from sqlalchemy import select
import json
import logging
import os
import datetime
from typing import Any

class DatabaseError(Exception):
    pass

class Data:
    ADMIN_USER_NAME = "admin"
    ADMIN_USER_EMAIL = "admin@lastcallsw.com"
    TEST_USER_NAME = "testuser"
    TEST_USER_EMAIL = "testuser@lastcallsw.com"
    GUEST_USER_NAME = "guest"
    GUEST_USER_EMAIL = "testuser@lastcallsw.com"

    ###################
    # INITIALIZATION
    ###################
    @staticmethod
    def init_db(override_safety_check: bool = False):
        """
        Initialize the database schema.
        WARNING: THIS DELETES ALL TABLES AND DATA

        To execute this function, the app needs to be running with a DB_APP_USERNAME
        with DDL privileges
        """
        # Yes, I know this check could be done more concisely, but I wanted to have
        # to jump thruogh a few hoops to execute the init code.
        do_init = False
        if override_safety_check:
            logging.info("Database initialization safety check override engaged!")
            do_init = True
        else:
            inspector = inspect(db.engine)
            if 'user' in inspector.get_table_names():
                logging.info("User table found and overrride not engaged; NOT initiating schema refresh")
            else:
                logging.info("User table not found; initiating schema refresh")
                do_init = True

        if do_init:
            logging.warning("DROPPING ALL TABLES")
            db.drop_all()
            logging.warning("RECREATING DATABASE SCHEMA")
            db.create_all()

        # Always make sure the key user logins have been created
        Data.add_users()


    @staticmethod
    def load_db(user_id: int):
        """
        Load all the data in the /data subdirectory, overwriting the user_id fields 
        in the raw data so the stored data will be for this user only.
        """
        # Delete all Food and Recipe records for this User.
        # The Recipe deletion code also deletes the associated Ingrdient records,
        # and the child Nutrition records of the Foods and Recipes are deleted 
        # automatically by SQLAlchemy as a result of the record setup.
        Recipe.delete_all_for_user(user_id)
        Food.delete_all_for_user(user_id)

        # Now add all the data
        keylists: dict[str, dict[int,int]] = {}
        Data.import_foods(user_id, keylists)
        Data.import_recipes(user_id, keylists)
        Data.import_ingredients(user_id, keylists)
        

    @staticmethod
    def purge_data(user_id: int, for_user_id: int|None):
        """
        Delete all previous data
        TODO: Delete data per user
        """
        logging.debug("DELETING ALL DATA")
        db.session.execute(delete(Ingredient))
        db.session.execute(delete(Recipe))
        db.session.execute(delete(Food))
        db.session.execute(delete(Nutrition))


    @staticmethod
    def seed_database(user: User) -> None:
        try:
            logging.info(f"Seeding database for user {user.username}...")
            keylists: dict[str, dict[int,int]] = {}
            Data.import_foods(user.id, keylists)
            Data.import_recipes(user.id, keylists)
            Data.import_ingredients(user.id, keylists)
            user.seeded_at = datetime.datetime.now()
            user.seed_version = 1
            user.seed_requested = False
            logging.info(f"Database seeded for user '{user.username}'")
        except Exception as e:
            raise DatabaseError("Seeding failed: " + str(e))


    @staticmethod
    def add_users():
        """
        Add basic User records
        """
        logging.info("Adding critical User records...")
        
        admin_password = os.environ.get("APP_ADMIN_PASSWORD")
        if not admin_password:
            raise ValueError("APP_ADMIN_PASSWORD not set")

        test_password = os.environ.get("APP_TEST_PASSWORD")
        if not test_password:
            raise ValueError("APP_TEST_PASSWORD not set")

        guest_password = os.environ.get("APP_GUEST_PASSWORD")
        if not guest_password:
            raise ValueError("APP_GUEST_PASSWORD not set")

        admin_user_dao = User.get("admin")
        if not admin_user_dao:
            User.add({"username": Data.ADMIN_USER_NAME, "password": admin_password, "email": Data.ADMIN_USER_EMAIL, "status": UserStatus.confirmed})

        test_user_dao = User.get("testuser")
        if not test_user_dao:
            User.add({"username": Data.TEST_USER_NAME, "password": test_password, "email": Data.TEST_USER_EMAIL, "status": UserStatus.confirmed})

        guest_user_dao = User.get("guest")
        if not guest_user_dao:
            User.add({"username": Data.GUEST_USER_NAME, "password": guest_password, "email": Data.GUEST_USER_EMAIL, "status": UserStatus.confirmed})

        logging.info("User records added")


    @staticmethod
    def import_foods(user_id: int, keylists: dict[str, dict[int,int]]):
        """
        Import Foods from JSON
        """
        logging.info("Importing Food records...")
        with open("./data/foods.json") as f:
            foods: list[dict[str,Any]] = json.load(f)
            for food in foods:
                nutrition: dict[str, Any] = food.get("nutrition", {})
                food_request = FoodRequest.model_validate(
                    {
                        "id": food.get("id"),
                        "group": food.get("group"),
                        "name": food.get("name"),
                        "vendor": food.get("vendor"),
                        "servings": food.get("servings"),
                        "subtype": food.get("subtype"),
                        "description": food.get("description"),
                        "size_description": food.get("size_description"),
                        "size_oz": food.get("size_oz"),
                        "size_g": food.get("size_g"),
                        "price": food.get("price"),
                        "price_date": food.get("price_date"),
                        "shelf_life": food.get("shelf_life"),
                        "serving_size_description": nutrition.get("serving_size_description"),
                        "serving_size_oz": nutrition.get("serving_size_oz"),
                        "serving_size_g": nutrition.get("serving_size_g"),
                        "calories": nutrition.get("calories", 0),
                        "total_fat_g": nutrition.get("total_fat_g"),
                        "saturated_fat_g": nutrition.get("saturated_fat_g"),
                        "trans_fat_g": nutrition.get("trans_fat_g"),
                        "cholesterol_mg": nutrition.get("cholesterol_mg"),
                        "sodium_mg": nutrition.get("sodium_mg"),
                        "total_carbs_g": nutrition.get("total_carbs_g"),
                        "fiber_g": nutrition.get("fiber_g"),
                        "total_sugar_g": nutrition.get("total_sugar_g"),
                        "added_sugar_g": nutrition.get("added_sugar_g"),
                        "protein_g": nutrition.get("protein_g"),
                        "vitamin_d_mcg": nutrition.get("vitamin_d_mcg"),
                        "calcium_mg": nutrition.get("calcium_mg"),
                        "iron_mg": nutrition.get("iron_mg"),
                        "potassium_mg": nutrition.get("potassium_mg"),
                    }
                )
                Food.add(user_id, food_request, keylists)
        logging.info("Food records imported")


    @staticmethod
    def import_recipes(user_id: int, keylists: dict[str, dict[int,int]]):
        """
        Import Recipes from JSON
        """
        logging.info("Importing Recipe records...")
        with open("./data/recipes.json") as f:
            recipes: list[dict[str,Any]] = json.load(f)
            for recipe in recipes:
                nutrition: dict[str, Any] = recipe.get("nutrition", {})
                recipe_request = RecipeRequest.model_validate(
                    {
                        "id": recipe.get("id"),
                        "cuisine": recipe.get("cuisine"),
                        "name": recipe.get("name"),
                        "total_yield": recipe.get("total_yield"),
                        "servings": recipe.get("servings"),
                        "serving_size_description": nutrition.get("serving_size_description"),
                        "serving_size_oz": nutrition.get("serving_size_oz"),
                        "serving_size_g": nutrition.get("serving_size_g"),
                        "calories": nutrition.get("calories", 0),
                        "total_fat_g": nutrition.get("total_fat_g"),
                        "saturated_fat_g": nutrition.get("saturated_fat_g"),
                        "trans_fat_g": nutrition.get("trans_fat_g"),
                        "cholesterol_mg": nutrition.get("cholesterol_mg"),
                        "sodium_mg": nutrition.get("sodium_mg"),
                        "total_carbs_g": nutrition.get("total_carbs_g"),
                        "fiber_g": nutrition.get("fiber_g"),
                        "total_sugar_g": nutrition.get("total_sugar_g"),
                        "added_sugar_g": nutrition.get("added_sugar_g"),
                        "protein_g": nutrition.get("protein_g"),
                        "vitamin_d_mcg": nutrition.get("vitamin_d_mcg"),
                        "calcium_mg": nutrition.get("calcium_mg"),
                        "iron_mg": nutrition.get("iron_mg"),
                        "potassium_mg": nutrition.get("potassium_mg"),
                        "price": recipe.get("price"),
                        "ingredients": [],
                    }
                )
                Recipe.add_from_schema(user_id, recipe_request, keylists)
        logging.info("Recipe records imported")


    @staticmethod
    def import_ingredients(user_id: int, keylists: dict[str, dict[int,int]]):
        """
        Import Ingredients from JSON
        """
        logging.info("Importing Ingredient records...")
        with open("./data/ingredients.json") as f:
            ingredients: list[dict[str,Any]] = json.load(f)
            for ingredient in ingredients:
                ingredient_request = IngredientRequest.model_validate(
                    {
                        "id": ingredient.get("id"),
                        "recipe_id": ingredient.get("recipe_id"),
                        "food_ingredient_id": ingredient.get("food_ingredient_id"),
                        "recipe_ingredient_id": ingredient.get("recipe_ingredient_id"),
                        "ordinal": ingredient.get("ordinal"),
                        "servings": ingredient.get("servings"),
                        "summary": ingredient.get("summary"),
                    }
                )
                Ingredient.add_from_schema(user_id, ingredient_request, keylists)
        logging.info("Ingredient records imported")


    ###################
    # EXPORT DATA
    ###################
    @staticmethod
    def serialize_data(obj: Any):
        """
        Simple serializer
        """
        if isinstance(obj, Recipe):
            return obj.json()
        elif isinstance(obj, Ingredient):
            return obj.json()
        elif isinstance(obj, Food):
            return obj.json()
        raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


    @staticmethod
    def export_db(user_id: int|None = None):
        """
        Save selected data to JSON files.
        """
        if user_id is None:
            user_id = User.get_id("guest")
        Data.export_foods(user_id)
        Data.export_ingredients(user_id)
        Data.export_recipes(user_id)


    @staticmethod
    def export_foods(user_id: int):
        logging.info("Exporting Food records...")
        foods = db.session.scalars(select(Food)).all()
        os.makedirs("./data", exist_ok=True)
        with open(file="./data/foods.json", mode="w") as f:
            json.dump(obj=foods, fp=f, indent=4, default=Data.serialize_data)
        logging.info("Food records exported")


    @staticmethod
    def export_ingredients(user_id: int):
        logging.info("Exporting Ingredient records...")
        ingredients = db.session.scalars(select(Ingredient)).all()
        os.makedirs("./data", exist_ok=True)
        with open(file="./data/ingredients.json", mode="w") as f:
            json.dump(obj=ingredients, fp=f, indent=4, default=Data.serialize_data)
        logging.info("Ingredient records exported")


    @staticmethod
    def export_recipes(user_id: int):
        logging.info("Exporting Recipe records...")
        recipes = db.session.scalars(select(Recipe)).all()
        os.makedirs("./data", exist_ok=True)
        with open(file="./data/recipes.json", mode="w") as f:
            json.dump(obj=recipes, fp=f, indent=4, default=Data.serialize_data)
        logging.info("Recipe records exported")