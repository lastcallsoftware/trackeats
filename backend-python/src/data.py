from sqlalchemy import select, delete, inspect
from models import db, User, UserStatus, Food, Recipe, Ingredient, Nutrition
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
            keylists: dict[str, dict[int,int]] = {}
            Data.import_foods(user.id, keylists)
            Data.import_recipes(user.id, keylists)
            user.seeded_at = datetime.datetime.now()
            user.seed_version = 1
            user.seed_requested = False
        except Exception as e:
            raise DatabaseError("Seeding failed: " + str(e))


    @staticmethod
    def add_users():
        """
        Add basic User records
        """
        logging.info("Adding User records...")
        
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
                Food.add(user_id, food, keylists)
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
                Recipe.add(user_id, recipe, keylists)
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
                Ingredient.add(user_id, ingredient, keylists)
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