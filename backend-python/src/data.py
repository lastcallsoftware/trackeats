from models import db, User, UserStatus, Food, Recipe, Ingredient, Nutrition
#from sqlalchemy import select
import json
import logging

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
    User.add("admin", "Test*123", "admin@lastcallsw.com", UserStatus.confirmed)
    User.add("testuser", "Test*123", "testuser@lastcallsw.com", UserStatus.confirmed)
    User.add("guest", "Guest*123", "testuser@lastcallsw.com", UserStatus.confirmed)
    db.session.commit()
    logging.info("User records added")

# Import Foods
def import_foods(user_id: int = None):
    logging.info("Importing Food records...")
    with open("./data/foods.json") as f:
        foods: list[dict] = json.load(f)
        for food in foods:
            Food.add(user_id,
                     food,
                     False)
    db.session.commit()
    logging.info("Food records imported")

# Import Recipes
def import_recipes(user_id: int):
    logging.info("Importing Recipe records...")
    with open("./data/recipes.json") as f:
        recipes: list[dict] = json.load(f)
        for recipe in recipes:
            Recipe.add(user_id, 
                       recipe["cuisine"],
                       recipe["name"],
                       recipe["total_yield"],
                       recipe["servings"],
                       recipe["nutrition"]["serving_size_description"],
                       recipe["id"])                    
    logging.info("Recipe records imported")

# Import Ingredients
def import_ingredients(user_id: int = None):
    logging.info("Importing Ingredient records...")
    with open("./data/ingredients.json") as f:
        ingredients: list[dict] = json.load(f)
        for ingredient in ingredients:
            Ingredient.add(ingredient["recipe_id"],
                           ingredient["food_ingredient_id"],
                           ingredient["recipe_ingredient_id"],
                           ingredient["servings"],
                           ingredient["summary"],
                           ingredient.get("ordinal", None),
                           True)
    logging.info("Ingredient records imported")


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
        user_id = User.get_id("guest")
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
    recipes:list[Recipe] = Recipe.query.all()
    with open(file="./data/recipes.json", mode="w") as f:
        json.dump(obj=recipes, fp=f, indent=4, default=serialize_data)
    logging.info("Recipe records exported")