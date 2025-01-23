from models import db, User, UserStatus, Food, Recipe, Nutrition
import json

# Add some seed data to the database: user records for the admin and the 
def load_db():
    errors = []
    try:
        # WIPE THE DATABASE
        # Note the two different ways of doing the same thing
        #Food.query.delete()
        db.session.query(Recipe).delete()
        db.session.query(Food).delete()
        db.session.query(Nutrition).delete()
        db.session.query(User).delete()
        db.session.commit()

        # ADD USER RECORDS
        errors = User.add("admin", "Test*123", "admin@lastcallsw.com", UserStatus.confirmed)
        if len(errors) == 0:
            errors = User.add("testuser", "Test*123", "testuser@lastcallsw.com", UserStatus.confirmed)

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

        # Add Recipe records

        # Commit all the new records to the database
        db.session.commit()

    except Exception as e:
        print(e)
        errors.append(str(e))

    return errors
