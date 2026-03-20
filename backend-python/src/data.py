from sqlalchemy import select, delete, inspect
from models import db, User, UserStatus, Food, Recipe, Ingredient, Nutrition
#from sqlalchemy import select
import json
import logging
import os
from typing import Any

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
            logging.debug("Database initialization safety check override engaged!")
            do_init = True
        else:
            inspector = inspect(db.engine)
            if 'user' not in inspector.get_table_names():
                logging.debug("User table not found; initiating schema refresh")
                do_init = True

        if do_init:
            logging.debug("DROPPING ALL TABLES")
            db.drop_all()
            logging.debug("RECREATING DATABASE SCHEMA")
            db.create_all()

        # Always make sure the key user logins have been created
        Data.add_users()

    @staticmethod
    def load_db(user_id: int):
        """
        Add some seed data to the database: user records for the admin and the 
        """
        Data.purge_data()
        Data.import_foods(user_id)
        Data.import_recipes(user_id)
        Data.import_ingredients(user_id)
        

    @staticmethod
    def purge_data(delete_users: bool = False):
        """
        Delete all previous data
        """
        logging.debug("DELETING ALL DATA")
        db.session.execute(delete(Ingredient))
        db.session.execute(delete(Recipe))
        db.session.execute(delete(Food))
        db.session.execute(delete(Nutrition))
        if delete_users:
            db.session.execute(delete(Nutrition))
        db.session.commit()


    @staticmethod
    def add_users():
        """
        Add basic User records
        """
        logging.info("Adding User records...")
        
        admin_password = os.environ.get("DB_ADMIN_PASSWORD")
        if not admin_password:
            raise ValueError("DB_ADMIN_PASSWORD not set")

        test_password = os.environ.get("DB_TEST_PASSWORD")
        if not test_password:
            raise ValueError("DB_TEST_PASSWORD not set")

        guest_password = os.environ.get("DB_GUEST_PASSWORD")
        if not guest_password:
            raise ValueError("DB_GUEST_PASSWORD not set")

        admin_user_dao = User.get("admin")
        if not admin_user_dao:
            User.add({"username": Data.ADMIN_USER_NAME, "password": admin_password, "email": Data.ADMIN_USER_EMAIL, "status": UserStatus.confirmed})

        test_user_dao = User.get("testuser")
        if not test_user_dao:
            User.add({"username": Data.TEST_USER_NAME, "password": test_password, "email": Data.TEST_USER_EMAIL, "status": UserStatus.confirmed})

        guest_user_dao = User.get("guest")
        if not guest_user_dao:
            User.add({"username": Data.GUEST_USER_NAME, "password": guest_password, "email": Data.GUEST_USER_EMAIL, "status": UserStatus.confirmed})

        db.session.commit()
        logging.info("User records added")


    @staticmethod
    def import_foods(user_id: int):
        """
        Import Foods from JSON
        """
        logging.info("Importing Food records...")
        with open("./data/foods.json") as f:
            foods: list[dict[str,Any]] = json.load(f)
            for food in foods:
                Food.add(user_id, food, False)
        db.session.commit()
        logging.info("Food records imported")


    @staticmethod
    def import_recipes(user_id: int):
        """
        Import Recipes from JSON
        """
        logging.info("Importing Recipe records...")
        with open("./data/recipes.json") as f:
            recipes: list[dict[str,Any]] = json.load(f)
            for recipe in recipes:
                Recipe.add(user_id, recipe)
        logging.info("Recipe records imported")


    @staticmethod
    def import_ingredients(user_id: int):
        """
        Import Ingredients from JSON
        """
        logging.info("Importing Ingredient records...")
        with open("./data/ingredients.json") as f:
            ingredients: list[dict[str,Any]] = json.load(f)
            for ingredient in ingredients:
                # Not sure why we're calling this with commit = True but I must have had a reason
                Ingredient.add(user_id, ingredient, True)
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
        with open(file="./data/foods.json", mode="w") as f:
            json.dump(obj=foods, fp=f, indent=4, default=Data.serialize_data)
        logging.info("Food records exported")


    @staticmethod
    def export_ingredients(user_id: int):
        logging.info("Exporting Ingredient records...")
        ingredients = db.session.scalars(select(Ingredient)).all()
        with open(file="./data/ingredients.json", mode="w") as f:
            json.dump(obj=ingredients, fp=f, indent=4, default=Data.serialize_data)
        logging.info("Ingredient records exported")


    @staticmethod
    def export_recipes(user_id: int):
        logging.info("Exporting Recipe records...")
        recipes = db.session.scalars(select(Recipe)).all()
        with open(file="./data/recipes.json", mode="w") as f:
            json.dump(obj=recipes, fp=f, indent=4, default=Data.serialize_data)
        logging.info("Recipe records exported")