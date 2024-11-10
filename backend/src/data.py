from models import db, User, UserStatus, FoodGroup, Ingredient, Nutrition
import datetime
import json
import logging

# Add some seed data to the database: user records for the admin and the 
def load_db(add_new_user):
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
        # Add a couple standard users (admin and testuser)
        errors = add_new_user("admin", "Test*123", "admin@trackeats.com", UserStatus.confirmed)
        if len(errors) == 0:
            errors = add_new_user("testuser", "Test*123", "testuser@trackeats.com", UserStatus.confirmed)

        # Get the userID of the testuser
        query = db.select(User).filter_by(username="testuser")
        users = db.session.execute(query).first()
        user_id = users[0].id

        # ADD INGREDIENT RECORDS
        # Read in the JSON data
        with open("./data/grains.json") as f:
            data = json.load(f)
            
            # Loop through the JSON records
            for ing in data['ingredients']:
                # Tweak the data a little
                ing["user_id"] = user_id

                # "Pull out" the nutrition child object.
                # The method we're about to use to deserialize the records
                # doesn't handle child objects properly.
                nut = ing["nutrition"]
                del ing["nutrition"]

                # Use Pythons ** operator to create an instance of the SQLAlchemy model objects
                n = Nutrition(**nut)
                i = Ingredient(**ing)

                # No re-add the nutrition child object to the Ingredient object
                i.nutrition = n

                # Add the new record to the database!
                db.session.add(i)

        # Commit all the new records to the database
        db.session.commit()

    except Exception as e:
        print(e)
        errors.append(str(e))

    return errors
