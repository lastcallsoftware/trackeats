from models import db, User, UserStatus, Food, Recipe, Ingredient, Nutrition
#from sqlalchemy import select
import json
import logging

# Add some seed data to the database: user records for the admin and the 
def load_db():
    purge_data()
    add_users()
    user_id = User.get_id("testuser")
    import_foods(user_id)
    #add_recipes(user_id)
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
    User.add("admin", "Test*123", "admin@lastcallsw.com", UserStatus.confirmed)
    User.add("testuser", "Test*123", "testuser@lastcallsw.com", UserStatus.confirmed)
    db.session.commit()
    logging.info("User records added")

# Add Food records
def import_foods(user_id: int):
    logging.info("Importing Food records...")
    # Read in the JSON food data and add it to the database
    with open("./data/condiments.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Imported condiments")

    with open("./data/dairy.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Imported dairy")

    with open("./data/fats_and_sugars.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Imported fats_and_sugars")

    with open("./data/grains.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Imported grains")

    with open("./data/herbs_and_spices.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Imported herbs_and_spices")

    with open("./data/proteins.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Imported proteins")

    with open("./data/vegetables.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Imported vegetables")
    logging.info("Food records imported")

# Add Recipes
# This is how we did it (i.e., in code) before I wrote the import/export code 
# for Recipes and Ingredients
def add_recipes(user_id: int):
    logging.info("Adding Recipe records...")
    if user_id is None:
        user_id = User.get_id("testuser")

    ingredient1 = Food.query.filter(Food.user_id == user_id)\
                            .filter(Food.name == "Chicken")\
                            .filter(Food.subtype == "Breast, Boneless Skinless")\
                            .filter(Food.vendor == "Katie's Best")\
                            .first()
    ingredient2 = Food.query.filter(Food.user_id == user_id)\
                            .filter(Food.name == "MySalt")\
                            .first()
    Recipe.add(
        user_id,
        "american",
        "Salty Chicken",
        "2 breasts",
        2,
        "1 breast",
        [(ingredient1, 2), (ingredient2, 1)], 
        None)
    db.session.commit()
    logging.info("Recipe records added")

# Add Ingredients
def import_ingredients(user_id: int = None):
    logging.info("Importing Ingredient records...")
    with open("./data/ingredients.json") as f:
        ingredients = json.load(f)
        for ingredient in ingredients:
            Ingredient.add(ingredient["recipe_id"],
                           ingredient["food_ingredient_id"],
                           ingredient["recipe_ingredient_id"],
                           ingredient["servings"],
                           ingredient["summary"],
                           True)
    logging.info("Ingredient records imported")

# Import recipes from file
# Note that this is done separately from the Ingredients, though of course 
# Recipes are meaningless without correctly matching Ingredients, so
# Recipes and Ingredients should ALWAYS be imported/exported together.
def import_recipes(user_id: int):
    with open("./data/recipes.json") as f:
        recipes = json.load(f)
        for recipe in recipes:
            Recipe.add(user_id, 
                       recipe["cuisine"],
                       recipe["name"],
                       recipe["total_yield"],
                       recipe["servings"],
                       recipe["nutrition"]["serving_size_description"])
    logging.info("Recipe records imported")


###################
# EXPORT DATA
# Simple serializer
def serialize_data(obj):
    if isinstance(obj, Recipe):
        return obj.json()
    elif isinstance(obj, Ingredient):
        return obj.json()
    elif isinstance(obj, Food):
        return obj.json()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

# Save selected data to JSON files.
def export_db(user_id: int = None):
    if user_id is None:
        user_id = User.get_id("testuser")
    export_foods(user_id)
    export_ingredients(user_id)
    export_recipes(user_id)

def export_foods(user_id: int):
    logging.info("Exporting Food records...")
    foods:list[Food] = Food.query.all()
    with open(file="./data/foods.json", mode="w") as f:
        json.dump(obj=foods, fp=f, indent=4, default=serialize_data)
    logging.info("Food records exported")

def export_ingredients(user_id: int):
    logging.info("Exporting Ingredient records...")
    ingredients:list[Ingredient] = Ingredient.query.all()
    with open(file="./data/ingredients.json", mode="w") as f:
        json.dump(obj=ingredients, fp=f, indent=4, default=serialize_data)
    logging.info("Ingredient records exported")

def export_recipes(user_id: int):
    logging.info("Exporting Recipe records...")
    recipes:list[Recipe] = Recipe.query.filter_by(user_id=user_id).all()
    with open(file="./data/recipes.json", mode="w") as f:
        json.dump(obj=recipes, fp=f, indent=4, default=serialize_data)
    logging.info("Recipe records exported")