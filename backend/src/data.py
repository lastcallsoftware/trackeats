from models import db, User, UserStatus, Food, Recipe, RecipeFoods, RecipeRecipes, Nutrition
#from sqlalchemy import select
import json

# Add some seed data to the database: user records for the admin and the 
def load_db():
    errors = []
    try:
        # WIPE THE DATABASE
        # Note the two different ways of doing the same thing
        #Food.query.delete()
        db.session.query(RecipeFoods).delete()
        db.session.query(RecipeRecipes).delete()
        db.session.query(Recipe).delete()
        db.session.query(Food).delete()
        db.session.query(Nutrition).delete()
        db.session.query(User).delete()
        db.session.commit()

        # ADD USER RECORDS
        errors = User.add("admin", "Test*123", "admin@lastcallsw.com", UserStatus.confirmed)
        if len(errors) == 0:
            errors = User.add("testuser", "Test*123", "testuser@lastcallsw.com", UserStatus.confirmed)
            db.session.commit()

        # ADD FOOD RECORDS
        if len(errors) == 0:
            # Get the userID of the testuser
            user_id = User.get_id("testuser")

            # Read in the JSON food data and add it to the database
            with open("./data/condiments.json") as f:
                data = json.load(f)
                for food in data['foods']:
                    Food.add(user_id, food, False)

            with open("./data/dairy.json") as f:
                data = json.load(f)
                for food in data['foods']:
                    Food.add(user_id, food, False)

            with open("./data/fats_and_sugars.json") as f:
                data = json.load(f)
                for food in data['foods']:
                    Food.add(user_id, food, False)

            with open("./data/grains.json") as f:
                data = json.load(f)
                for food in data['foods']:
                    Food.add(user_id, food, False)

            with open("./data/herbs_and_spices.json") as f:
                data = json.load(f)
                for food in data['foods']:
                    Food.add(user_id, food, False)

            with open("./data/proteins.json") as f:
                data = json.load(f)
                for food in data['foods']:
                    Food.add(user_id, food, False)

            with open("./data/vegetables.json") as f:
                data = json.load(f)
                for food in data['foods']:
                    Food.add(user_id, food, False)
    
            db.session.commit()

        # ADD RECIPE RECORDS
        if len(errors) == 0:
            # Read in the JSON recipe data and add it to the database
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
            #retval = Recipe.add(user_id, "Salty Chicken", "2 breasts", "1 breast", 2, None, None, False)
            retval = Recipe.add(user_id, "Salty Chicken", "2 breasts", "1 breast", 2, [(ingredient1, 2), (ingredient2, 1)], None, False)
            db.session.commit()

    except Exception as e:
        print(e)
        errors.append(str(e))

    return errors
