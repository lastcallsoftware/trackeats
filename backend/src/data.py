from models import db, User, UserStatus, Food, Recipe, Ingredient, Nutrition
#from sqlalchemy import select
import json
import logging

# Add some seed data to the database: user records for the admin and the 
def load_db():
    # WIPE THE DATABASE
    # Note the two different ways of doing the same thing
    #Food.query.delete()
    db.session.query(Ingredient).delete()
    db.session.query(Recipe).delete()
    db.session.query(Food).delete()
    db.session.query(Nutrition).delete()
    db.session.query(User).delete()
    db.session.commit()

    # ADD USER RECORDS
    User.add("admin", "Test*123", "admin@lastcallsw.com", UserStatus.confirmed)
    User.add("testuser", "Test*123", "testuser@lastcallsw.com", UserStatus.confirmed)
    db.session.commit()

    # ADD FOOD RECORDS
    # Get the userID of the testuser
    user_id = User.get_id("testuser")

    # Read in the JSON food data and add it to the database
    with open("./data/condiments.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Added condiments")

    with open("./data/dairy.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Added dairy")

    with open("./data/fats_and_sugars.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Added fats_and_sugars")

    with open("./data/grains.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Added grains")

    with open("./data/herbs_and_spices.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Added herbs_and_spices")

    with open("./data/proteins.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Added proteins")

    with open("./data/vegetables.json") as f:
        data = json.load(f)
        for food in data['foods']:
            Food.add(user_id, food, False)
    db.session.commit()
    logging.info("Added vegetables")


    # ADD RECIPE RECORDS
    # Read in the JSON recipe data and add it to the database
    # Eventually we'll want to store this data in a file, like the food data.
    # The problem is the record IDs, which are opaque to someone reading a
    # text file.  Maybe find a way to import ingredients by name rather than ID 
    # number.
    #with open("./data/recipes.json") as f:
    #    data = json.load(f)
    #    for recipe in data['recipes']:
    #        Recipe.add(user_id, recipe)

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
    
    logging.info("Added Recipes")

    db.session.commit()
