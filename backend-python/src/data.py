from sqlalchemy import select
from models import db, User, UserStatus, Food, Recipe, Ingredient, Nutrition
#from sqlalchemy import select
import json
import logging
from typing import Any

# Add some seed data to the database: user records for the admin and the 
def load_db():
    purge_data()
    add_users()
    user_id = User.get_id("guest")
    import_foods(user_id)
    import_recipes(user_id)
    import_ingredients(user_id)
    
# Delete all previous data
def purge_data():
    # Note the two different ways of doing the same thing
    #Food.query.delete()
    db.session.query(Ingredient).delete()
    db.session.query(Recipe).delete()
    db.session.query(Food).delete()
    db.session.query(Nutrition).delete()
    db.session.query(User).delete()
    db.session.commit()

# Add User records
def add_users():
    logging.info("Adding User records...")
    #TODO: Find a way to do this that doesn't require me to put the credentials
    # in this file!
    User.add({"username": "admin", "password": "Test*123", "email": "admin@lastcallsw.com", "status": UserStatus.confirmed})
    User.add({"username": "testuser", "password": "Test*123", "email": "testuser@lastcallsw.com", "status": UserStatus.confirmed})
    User.add({"username": "guest", "password": "Guest*123", "email": "testuser@lastcallsw.com", "status": UserStatus.confirmed})
    db.session.commit()
    logging.info("User records added")

# Import Foods
def import_foods(user_id: int):
    logging.info("Importing Food records...")
    with open("./data/foods.json") as f:
        foods: list[dict[str,Any]] = json.load(f)
        for food in foods:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Food records imported")

# Import Recipes
def import_recipes(user_id: int):
    logging.info("Importing Recipe records...")
    with open("./data/recipes.json") as f:
        recipes: list[dict[str,Any]] = json.load(f)
        for recipe in recipes:
            Recipe.add(user_id, recipe)
    logging.info("Recipe records imported")

# Import Ingredients
def import_ingredients(user_id: int):
    logging.info("Importing Ingredient records...")
    with open("./data/ingredients.json") as f:
        ingredients: list[dict[str,Any]] = json.load(f)
        for ingredient in ingredients:
            # Not sure why we're calling this with commit = True but I must have had a reason
            Ingredient.add(user_id, ingredient, True)
    logging.info("Ingredient records imported")


###################
# EXPORT DATA
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

def export_db(user_id: int|None = None):
    """
    Save selected data to JSON files.
    """
    if user_id is None:
        user_id = User.get_id("guest")
    export_foods(user_id)
    export_ingredients(user_id)
    export_recipes(user_id)

def export_foods(user_id: int):
    logging.info("Exporting Food records...")
    foods = db.session.scalars(select(Food)).all()
    with open(file="./data/foods.json", mode="w") as f:
        json.dump(obj=foods, fp=f, indent=4, default=serialize_data)
    logging.info("Food records exported")

def export_ingredients(user_id: int):
    logging.info("Exporting Ingredient records...")
    ingredients = db.session.scalars(select(Ingredient)).all()
    with open(file="./data/ingredients.json", mode="w") as f:
        json.dump(obj=ingredients, fp=f, indent=4, default=serialize_data)
    logging.info("Ingredient records exported")

def export_recipes(user_id: int):
    logging.info("Exporting Recipe records...")
    recipes = db.session.scalars(select(Recipe)).all()
    with open(file="./data/recipes.json", mode="w") as f:
        json.dump(obj=recipes, fp=f, indent=4, default=serialize_data)
    logging.info("Recipe records exported")