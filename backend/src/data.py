from models import db, User, UserStatus, Ingredient, Nutrition
import json

# Add some seed data to the database: user records for the admin and the 
def load_db():
    errors = []
    try:
        # WIPE THE DATABASE
        # Note the two different ways of doing the same thing
        #Ingredient.query.delete()
        db.session.query(Ingredient).delete()
        db.session.query(Nutrition).delete()
        db.session.query(User).delete()
        db.session.commit()

        # ADD USER RECORDS
        errors = User.add("admin", "Test*123", "admin@trackeats.com", UserStatus.confirmed)
        if len(errors) == 0:
            errors = User.add("testuser", "Test*123", "testuser@trackeats.com", UserStatus.confirmed)

        # ADD INGREDIENT RECORDS
        if len(errors) == 0:
            # Get the userID of the testuser
            user_id = User.get_id("testuser")

            # Read in the JSON data
            with open("./data/grains.json") as f:
                data = json.load(f)
                
                # Loop through the JSON records
                for ingredient in data['ingredients']:
                    Ingredient.add(user_id, ingredient, False)

            with open("./data/dairy.json") as f:
                data = json.load(f)
                
                # Loop through the JSON records
                for ingredient in data['ingredients']:
                    print(ingredient["type"])
                    Ingredient.add(user_id, ingredient, False)

        # Commit all the new records to the database
        db.session.commit()

    except Exception as e:
        print(e)
        errors.append(str(e))

    return errors
