from models import db, User, UserStatus, FoodCategory, Ingredient, Nutrition
import datetime

# Add some seed data to the database: user records for the admin and the 
def load_db(add_new_user):
    try:
        db.session.query(User).delete()
        errors = add_new_user("admin", "Test*123", "admin@trackeats.com", UserStatus.confirmed)
        if len(errors) == 0:
            errors = add_new_user("testuser", "Test*123", "testuser@trackeats.com", UserStatus.confirmed)

        # DELETE ALL INGREDIENTS!
        Ingredient.query.delete()

        milk_nutrition = Nutrition(
            serving_size_description = "1 cup",
            serving_size_g = 240,
            calories =  90,
            total_fat_g = 0,
            saturated_fat_g = 0,
            trans_fat_g = 0,
            cholesterol_mg = 5,
            sodium_mg = 130,
            total_carb_g = 13,
            fiber_g = 0,
            total_sugar_g = 12,
            added_sugar_g = 0,
            protein_g = 8,
            vitamin_d_mcg = 2.5,
            calcium_mg = 300,
            iron_mg = 0,
            potassium_mg = 150
            )
        db.session.add(milk_nutrition)
        db.session.commit()
        milk_nutrition_id = milk_nutrition.id

        # We COULD find a convoluted way to return the user ID from add_new_user(), or
        # query the database using the username to get the user ID, but... we know for
        # certain that "testuser" will always have ID 2 in a new database.
        user_id = 2
        milk = Ingredient(
            user_id = user_id,
            name = "Milk, Fat Free",
            category = FoodCategory.dairy,
            vendor = "Tuscan Farms",
            size = "1 quart (946 ml)",
            servings = 4,
            nutrition_id = milk_nutrition_id,
            price = 2.89,
            price_date = datetime.datetime(2024, 11, 4),
            shelf_life = "opened: 1 week in fridge"
            )
        db.session.add(milk)
        db.session.commit()

        butter_nutrition = Nutrition(
            serving_size_description = "1 tbsp",
            serving_size_g = 14,
            calories =  100,
            total_fat_g = 11,
            saturated_fat_g = 7,
            trans_fat_g = 0,
            cholesterol_mg = 30,
            sodium_mg = 0,
            total_carb_g = 0,
            fiber_g = 0,
            total_sugar_g = 0,
            added_sugar_g = 0,
            protein_g = 0,
            vitamin_d_mcg = 0,
            calcium_mg = 0,
            iron_mg = 0,
            potassium_mg = 0
            )
        db.session.add(butter_nutrition)
        db.session.commit()
        butter_nutrition_id = butter_nutrition.id

        butter = Ingredient(
            user_id = user_id,
            name = "Butter, Unsalted",
            category = FoodCategory.dairy,
            vendor = "Land O'Lakes",
            size = "1 pound (454 g)",
            servings = 32,
            nutrition_id = butter_nutrition_id,
            price = 7.49,
            price_date = datetime.datetime(2024, 11, 4),
            shelf_life = "1-3 months in fridge; 12 months in freezer"
        )
        db.session.add(butter)
        db.session.commit()

    except Exception as e:
        errors.append(str(e))

    return errors
    
