from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from email_validator import validate_email, EmailNotValidError
from crypto import check_password, encrypt, decrypt, hash_password
import enum
import datetime
import re
import logging

# We're using a library (flask-sqlalchemy) that handles database interactions
# for us.  This file contains the classes that represent the various records in 
# the database.  I've beefed up these classes to be more than just thin shells
# around the database tables, though.  They contain things like validation, too.

##############################
# A NOTE ABOUT HOW SQLALCHEMY HANDLES RELATIONSHIPS BETWEEN TABLES.
##############################
# The exact mechanisms and syntax for this depend on whether you're doing a 
# one-to-one, one-to-many, many-to-one, or many-to-many relationship, and in the
# latter cases, whether the association table contains additional fields or just
# the foreign keys.  Not to mention whether you're using SQLAlchemy 1.x or 2.x, 
# SQLAlchemy's declarative or imperative syntax, and/or the Flask-SQLAlchemy 
# add-on.  Yes, it's kind of a nightmare!
#
# But I'm mot going to get into those details here.  Here I just want to talk 
# about how SQLAlchemy 2.x's relationship() method works.
#
# To create a relationship between tables, you first you have to set up foriegn
# key(s) between them.  This is done by defining a "ForiegnKey" field in one or
# both tables, typically referencing the other table's primary key.
#
# That tells you WHICH records are related, but it doesn't actually allow you to
# ACCESS one table from the other.  To do that, you have to define a field in 
# one or both tables using the "relationship()" method.  Then you can access the
# records in the other table through this field.  The field does not actually 
# STORE the child records, it's just a way to access them.  The relationship() 
# exists only at the ORM level, not at the database level.
#
# This is why you can't add a child record to a parent record just by adding
# it to the parent record's relationship() field (which is just a list of the 
# related records).  You have to add the child record to the child table 
# yourself.  SQLAlchemy will create any required association record for you --
# except in the (very common) case where the association record has additional 
# fields besides the foreign keys of the two associated tables, in which case 
# you have to create the association record yourself as well.  This is what we 
# do in the Recipe.add_food_ingredient() method below.
#
# Furthermore, the relationship() method also allows you to define *in the 
# parent record* a field in the child record for accessing the parent record.
# Yes, it's confusing as it sounds.  This is called a "back reference".
# The legacy way of doing this was to use the "backref" attribute, which 
# automatically created a field in the child record that pointed back to the
# parent record.  It basically defines a new field in the child record that 
# uses the "relationship()" method to point back to the parent record.  This 
# was convenient, but as you can surely tell, EXTREMELY confusing.
# The new, preferred way of doing this is to just explicitly create a 
# relationship() field in the child record that points back to the parent, 
# and to reference it in the parent using the "back_populates" attribute.
# For more information, see:
#   https://docs.sqlalchemy.org/en/20/orm/backref.html#relationships-backref
# 
# Note that you don't HAVE TO define a back reference at all.  It's just a
# convenience for accessing the parent record from the child record.  I started
# out defining back references for all the relationships in this app simply 
# because all the examples I saw for how to define a relationship() used them,
# but I've since decided that they're not necessary, and not worth the extra 
# code and confusion.
# For example, we don't really need a way to access the Recipe record from the
# Food records that are its ingredients.  Maybe one day we'll have a feature
# where you can say, "tell me all the Recipes that use this Food", but for now
# that's not really necessary.
#
# Honestly after going through this torture, I'm not sure an ORM layer like
# SQLAlchemy is even worth the effort.  It's a lot of extra work and complexity 
# for not much benefit.  It often seems like it would be easier to just write the
# SQL queries yourself.
# Whatever!  The train has left the station on this one.
##############################

# Instantiate the Flask-SQLAlchemny database connector.
db = SQLAlchemy()

# USER
# ----
# A user of this app.  This record contains their password hash and other
# authentication data.  Any personal data (such as email address) is encrypted.
# Each user owns their own app data.
class UserStatus(enum.Enum):
    pending = 1
    confirmed = 2
    cancelled = 3
    banned = 4

class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), index=True, unique=True, nullable=False)
    status = db.Column(db.Enum(UserStatus), nullable=False)
    email = db.Column(db.LargeBinary, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    password_hash = db.Column(db.String(64), nullable=False)
    confirmation_sent_at = db.Column(db.DateTime, nullable=True)
    confirmation_token = db.Column(db.String(64), nullable=True)

    def __str__(self):
        return f"<User {self.id} {self.username}, status: {self.status}, created_at: {self.created_at}, confirmation_sent_at: {self.confirmation_sent_at}>"
    def __repr__(self):
        email = ""
        if self.email and len(self.email) > 0:
            email = decrypt(self.email)
        return f"User({self.id}, \'{self.username}\', {self.status}, \'{email}\', {self.created_at}, \'{self.password_hash}\', {self.confirmation_sent_at}, \'{self.confirmation_token}\')"
    def json(self):
        return {
            "id": self.id,
            "username": self.username,
            "status": self.status.name,
            "created_at": self.created_at,
            "confirmation_sent_at": self.confirmation_sent_at
            }
    
    # Get the user_id for the given username
    def get_id(username: str) -> int:
        #query = db.select(User).filter_by(username)
        #users = db.session.execute(query).first()
        user = User.query.filter_by(username=username).first()
        return user.id

    # Add a new User to the database.
    # Returns a list of error messages, or an empty list on success.
    # This function validates the data before adding it.
    def add(username: str, password: str, email_addr: str, status=UserStatus.pending, confirmation_token: str=None) -> list[str]:
    # Add a catch-all try-except block, because who knows what could fail in
    # the ORM and JWT libraries we use here?  If there is a failure, we want
    # to return our own error message instad of an exception stack!
        errors = []
        try:
            if not username:
                errors.append("Username is required but missing.")
            else:
                username = username.strip()
                if len(username) < 3:
                    errors.append("Username must be at least 3 characters.")
                elif len(username) > 100:
                    errors.append("Username must be at most 100 characters.")
            
            if not password:
                errors.append("Password is required but missing.")
            else:
                password = password.strip()
                if len(password) < 8:
                    errors.append("Password must be at least 8 characters.")
                elif len(password) > 100:
                    errors.append("Password must be at most 100 characters.")
                if not re.search(r"[a-z]", password):
                    errors.append("Password must contain at least one lowercase letter.")
                if not re.search(r"[A-Z]", password):
                    errors.append("Password must contain at least one uppercase letter.")
                if not re.search(r"\d", password):
                    errors.append("Password must contain at least one digit.")
                if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
                    errors.append("Password must contain at least one special character.")

            if not email_addr:
                errors.append("Email address is required but missing.")
            else:
                try:
                    email_info = validate_email(email_addr, check_deliverability=True)
                    email_addr = email_info.normalized
                except EmailNotValidError as e:
                    errors.append(str(e) + " ")

            if len(errors) == 0:
                # Check whether this username is already in the database
                query = db.select(User).filter_by(username=username)
                existing_user = db.session.execute(query).first()
                if (existing_user is not None):
                    errors.append(f"User {username} already exists.")
                else:
                    # Salt and hash the password
                    password_hash_str = hash_password(password)

                    # Encrypt the user data.  Currently that is just the email address.
                    encrypted_email = None
                    if email_addr and len(email_addr) > 0:
                        encrypted_email_addr = encrypt(email_addr)

                    # Store the user record in the database
                    now = datetime.datetime.now()
                    confirmation_sent_at = None
                    if confirmation_token is not None:
                        confirmation_sent_at = now
                    new_user = User(
                        username=username, 
                        status=status, 
                        email=encrypted_email_addr, 
                        created_at=now, 
                        password_hash=password_hash_str,
                        confirmation_sent_at=confirmation_sent_at, 
                        confirmation_token=confirmation_token)
                    db.session.add(new_user)
                    db.session.commit()
        except Exception as e:
            errors.append(f"User {username} could not be added: " + repr(e))

        return errors

    # Verify that the given user credentials are valid.
    # Return a list of error messages, or an empty list on success.
    def verify(username: str, password: str) -> list[str]:
        errors = []
        try:
            if not username:
                errors.append("Username is required but missing.")
            if not password:
                errors.append("Password is required but missing.")

            if len(errors) == 0:
                # Validate the credentials
                # Retrieve user record from database
                # I know that in the case of a validation failure you're not 
                # supposed to tell the caller whether the username or password 
                # was invalid, because that gives hackers more info.  But in the
                # interests of easier debugging, I'll take my chances here...
                query = db.select(User).filter_by(username=username)
                users = db.session.execute(query).first()
                if users is None:
                    errors.append(f"Invalid username {username}.")
                else:
                    user = users[0]

                    # Make sure the user has been confirmed
                    if user.status != UserStatus.confirmed:
                        errors.append(f"User {username} has not been confirmed.")
                    else:
                        # Validate the password.
                        # Note that the salt is stored as part of the hash, rather than as a 
                        # separarte value.  The bcrypt API knows how to separate them.
                        password_hash_bytes = bytes(user.password_hash, "utf-8")
                        password_bytes = bytes(password, "utf-8")
                        if (not check_password(password_bytes, password_hash_bytes)):
                            errors.append(f"Invalid password for username {username}.")
        except Exception as e:
            errors.append("User record could not be validated: " + repr(e))

        return errors


##############################
# NURITION
##############################
# This is the nutrition data that this app is intended to track.  It's basically
# the same data you see on a USDA nutrition label.
#
# Nutrition is a separate record because the same data fields are reused for 
# the Food, Recipe, and DailyLog tables.
#
# When used with the Food record, it represents the nutrition for one 
# serving of one food item.  It is then combined in the proper proportions to 
# calculate the nutrition for Recipes and DailyLogs.
#
# The Nutrition data is technically denormalized for the Recipe and DailyLog
# tables.  That is, we store it even though it's calculated from other records
# that are already stored in the database.  We do this for efficiency.
# It's more efficient to store it rather than load all the ingredient child 
# records and recalculate the totals every time a Recipe or DailyLog record is 
# loaded.  We just have to remember to recalculate and re-store the Nutrition 
# data when necessary, such as when a Recipe's ingredients change.
# 
# Each of those tables has a 1-to-1 relationship with the Nutrition table.
# Note that the Nutrition record is the parent record in this relationship.
# This is because the Nutrition record is the one that is reused in multiple
# places.
# As such, if you delete of of these records, we CANNOT configure the ORM layer
# to automatically cascade delete its corresponding Nutrition record -- we'd 
# have to do it the other way around, which doesn't really make sense from a 
# usage standpoint.
# So when we want to delete a Food, Recipe, or DailyLog, we have to code the 
# delete of the corresponding Nutrition record manually.
##############################
class Nutrition(db.Model):
    __tablename__ = "nutrition"

    id = db.Column(db.Integer, primary_key=True)
    serving_size_description = db.Column(db.String(64), nullable=False)
    serving_size_g = db.Column(db.Integer)
    calories =  db.Column(db.Integer, nullable=False)
    total_fat_g = db.Column(db.Float)
    saturated_fat_g = db.Column(db.Float)
    trans_fat_g = db.Column(db.Integer)
    cholesterol_mg = db.Column(db.Integer)
    sodium_mg = db.Column(db.Integer)
    total_carbs_g = db.Column(db.Integer)
    fiber_g = db.Column(db.Integer)
    total_sugar_g = db.Column(db.Integer)
    added_sugar_g = db.Column(db.Integer)
    protein_g = db.Column(db.Integer)
    vitamin_d_mcg = db.Column(db.Integer)
    calcium_mg = db.Column(db.Integer)
    iron_mg = db.Column(db.Float)
    potassium_mg = db.Column(db.Integer)

    def __init__(self, data: dict = None):
        if data is not None:
            self.serving_size_description = data.get("serving_size_description", "")
            self.serving_size_g = data.get("serving_size_g", 0)
            self.calories = data.get("calories", 0)
            self.total_fat_g = data.get("total_fat_g", 0)
            self.saturated_fat_g = data.get("saturated_fat_g", 0)
            self.trans_fat_g = data.get("trans_fat_g", 0)
            self.cholesterol_mg = data.get("cholesterol_mg", 0)
            self.sodium_mg = data.get("sodium_mg", 0)
            self.total_carbs_g = data.get("total_carbs_g", 0)
            self.fiber_g = data.get("fiber_g", 0)
            self.total_sugar_g = data.get("total_sugar_g", 0)
            self.added_sugar_g = data.get("added_sugar_g", 0)
            self.protein_g = data.get("protein_g", 0)
            self.vitamin_d_mcg = data.get("vitamin_d_mcg", 0)
            self.calcium_mg = data.get("calcium_mg", 0)
            self.iron_mg = data.get("iron_mg", 0)
            self.potassium_mg = data.get("potassium_mg", 0)

    def __str__(self):
        return str(vars(self))
    def json(self):
        return {
            "id": self.id,
            "serving_size_description": self.serving_size_description,
            "serving_size_g": self.serving_size_g,
            "calories": self.calories,
            "total_fat_g": self.total_fat_g,
            "saturated_fat_g": self.saturated_fat_g,
            "trans_fat_g": self.trans_fat_g,
            "cholesterol_mg": self.cholesterol_mg,
            "sodium_mg": self.sodium_mg,
            "total_carbs_g": self.total_carbs_g,
            "fiber_g": self.fiber_g,
            "total_sugar_g": self.total_sugar_g,
            "added_sugar_g": self.added_sugar_g,
            "protein_g": self.protein_g,
            "vitamin_d_mcg": self.vitamin_d_mcg,
            "calcium_mg": self.calcium_mg,
            "iron_mg": self.iron_mg,
            "potassium_mg": self.potassium_mg
        }
    
    # Add one Nutrition record to another.
    # Actually this would probably happen on the front end so I don't know why
    # I bothered to write this method.
    def sum(self, nutrition2: "Nutrition", servings: float) -> dict:
        self.calories += nutrition2.calories * servings
        self.total_fat_g += nutrition2.total_fat_g * servings
        self.saturated_fat_g += nutrition2.saturated_fat_g * servings
        self.trans_fat_g += nutrition2.trans_fat_g * servings
        self.cholesterol_mg += nutrition2.cholesterol_mg * servings
        self.sodium_mg += nutrition2.sodium_mg * servings
        self.total_carbs_g += nutrition2.total_carbs_g * servings
        self.fiber_g += nutrition2.fiber_g * servings
        self.total_sugar_g += nutrition2.total_sugar_g * servings
        self.added_sugar_g += nutrition2.added_sugar_g * servings
        self.protein_g += nutrition2.protein_g * servings
        self.vitamin_d_mcg += nutrition2.vitamin_d_mcg * servings
        self.calcium_mg += nutrition2.calcium_mg * servings
        self.iron_mg += nutrition2.iron_mg * servings
        self.potassium_mg += nutrition2.potassium_mg * servings
        return self


##############################
# FOOD
##############################
# This represents one "atomic" food item that you'd buy at the grocery store:
# a loaf of bread, a box of cereal, an orange, a head of lettuce, etc.
# This is the app's basic building-block record.
##############################
class FoodGroup(enum.Enum):
    beverages = 1,
    condiments = 2,
    dairy = 3,
    fatsAndSugars = 4,
    fruits = 5,
    grains = 6,
    herbsAndSpices = 7,
    nutsAndSeeds = 8,
    preparedFoods = 9,
    proteins = 10,
    vegetables = 11,
    other = 12

class Food(db.Model):
    __tablename__ = "food"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    group = db.Column(db.Enum(FoodGroup), nullable=False)
    name = db.Column(db.String(64), nullable=False)
    subtype = db.Column(db.String(64), nullable=True)
    description = db.Column(db.String(128), nullable=True)
    vendor = db.Column(db.String(64), nullable=False)
    size_description = db.Column(db.String(64))
    size_g = db.Column(db.Integer)
    servings = db.Column(db.Float, nullable=False)
    nutrition_id = db.Column(db.Integer, db.ForeignKey('nutrition.id'))
    nutrition = db.relationship(
        "Nutrition", 
        single_parent=True, 
        cascade="all, delete-orphan")
        #backref=db.backref("food", cascade="all, delete-orphan", uselist=False))
    price = db.Column(db.Float)
    price_date = db.Column(db.Date, nullable=True)
    shelf_life = db.Column(db.String(150))

    def __init__(self, data: dict = None):
        if data is not None:
            self.user_id = data.get("user_id")
            self.group = FoodGroup[data.get("group")]
            self.name = data.get("name")
            self.subtype = data.get("subtype")
            self.description = data.get("description")
            self.vendor = data.get("vendor")
            self.size_description = data.get("size_description")
            self.size_g = data.get("size_g")
            self.servings = data.get("servings")
            self.nutrition = Nutrition(data.get("nutrition"))
            self.price = data.get("price")
            self.price_date = data.get("price_date")
            self.shelf_life = data.get("shelf_life")
        else:
            self.group = FoodGroup.other
            self.nutrition = Nutrition()

    def __str__(self):
        return str(vars(self))
    def json(self):
        price_date = ""
        if (self.price_date):
            price_date = datetime.datetime.strftime(self.price_date, "%Y-%m-%d")
        return {
            "id": self.id,
            "user_id": self.user_id,
            "group": self.group.name,
            "name": self.name,
            "subtype": self.subtype,
            "description": self.description,
            "vendor": self.vendor,
            "size_description": self.size_description,
            "size_g": self.size_g,
            "servings": self.servings,
            "nutrition_id": self.nutrition_id,
            "nutrition": self.nutrition.json(),
            "price": self.price,
            "price_date": price_date,
            "shelf_life": self.shelf_life
            }

    # Add a new food to the database.
    # Returns a list of error messages, or an empty list on success.
    # food is expected to be a JSON-like dictionary object with the same 
    #   fields as the Food record itself (including its child Nutrition 
    #   object), with the exception of the user_id field, which gets assigned here.
    # commit is a boolean indicating whether the record should be committed to
    #   the database.  Set it to false when you want to add a bunch of records
    #   at once (calling this function multiple times), in which case the caller
    #   is required to commit the records afterwards (via db.session.commit()).
    def add(user_id: int, food: dict[str, str|int|float], commit: bool) -> list[str]:
        errors = []
        try: 
            # Add the user_id field.
            food["user_id"] = user_id

            # Remove the price_date field if it's empty.
            if (len(food["price_date"].strip()) == 0):
                del food["price_date"]

            # Construct the new Food database record.
            f = Food(food)

            # Add the new record to the database!
            db.session.add(f)

            if commit:
                db.session.commit()
        except Exception as e:
            errors.append("Food record could not be added: " + repr(e))

        return errors
    
    # Update an existing record.
    # This method passes the values to be updated to the update() method via a 
    # dictionary.  Therefore the caller must pass in a dictionary with the
    # same keys as the Food record itself (including its child Nutrition object).
    # I'm not crazy about this method, but it's quick and dirty.
    # The alternative would be to manually, explicitly copy each field into a 
    # new dictionary whose keys we definitively know.  Obviously, that's a lot 
    # more work.
    # The user_id field is not passed in the dictionary, but is passed as a
    # separate argument.
    def update(user_id: int, food: dict[str, str|int|float]) -> list[str]:
        errors = []
        try:
            # Add the user_id field.
            food["user_id"] = user_id

            # Remove the Nutrition object from the dictionary.
            nutrition = food["nutrition"]
            del food["nutrition"]

            # Remove the price_date field if it's empty.
            if (len(food["price_date"].strip()) == 0):
                del food["price_date"]

            # Get the ID fields so we can update the proper records.
            food_id = food["id"]
            nutrition_id = food["nutrition_id"]

            # Update the Nutrition and Food records.
            num_updates = Nutrition.query.filter_by(id=nutrition_id).update(nutrition)
            if (num_updates != 1):
                errors.append(f"Expected to update 1 Nutrition record but attempted to update {num_updates}.")
            num_updates = Food.query.filter_by(user_id=user_id, id=food_id).update(food)
            if (num_updates != 1):
                errors.append(f"Expected to update 1 Food record but attempted to update {num_updates}.")

            if (len(errors) == 0):
                db.session.commit()
        except Exception as e:
            errors.append("Food record could not be updated: " + repr(e))

        return errors


##############################
# RECIPE_FOODS
##############################
# This is a many-to-many relationship table that links Recipes to their
# constituent Food items.  It also stores the number of servings of each 
# Food item in the Recipe.
##############################
class RecipeFoods(db.Model):
    __tablename__ = "recipe_foods"

    recipe_id = db.Column(db.Integer, db.ForeignKey("recipe.id"), primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey("food.id"), primary_key=True)
    servings = db.Column(db.Float, default=0, nullable=False)


##############################
# RECIPE_RECIPES
##############################
# This is a many-to-many relationship table that links Recipes to itself.
# It also stores the number of servings of each Recips item in the Recipe.
# This is used when a Recipe includes other Recipes as ingredients.
# For example, a Recipe for a pizza might include a Recipe for pizza dough.
##############################
class RecipeRecipes(db.Model):
    __tablename__ = "recipe_recipes"

    recipe_id = db.Column(db.Integer, db.ForeignKey("recipe.id"), primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey("recipe.id"), primary_key=True)
    servings = db.Column(db.Float, default=0, nullable=False)


##############################
# RECIPE
##############################
# This represents a collection of Food items that are combined to make a meal.
# It includes a denormalized copy of the Nutrition data for the Recipe.
# This is the app"s second-level building-block record.
##############################
# This allows us to specify Recipe as a class and then use it as a type hint
# in the add() method below
class Recipe:
    pass

class Recipe(db.Model):
    __tablename__ = "recipe"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    name = db.Column(db.String(50), nullable=False)
    total_yield = db.Column(db.String(50), nullable=False)
    servings = db.Column(db.Float, nullable=False)
    food_ingredients = db.relationship(
        "Food",
        secondary="recipe_foods")
        #backref="recipes")
        #back_populates="recipes")
    # We need the primaryjoin and secondaryjoin parameters because we're using
    # the same table for both the parent and child records -- a self-join.
    recipe_ingredients = db.relationship(
        "Recipe",
        secondary="recipe_recipes",
        primaryjoin=id == RecipeRecipes.recipe_id,
        secondaryjoin=id == RecipeRecipes.ingredient_id)
        #backref="recipes")
    nutrition_id = db.Column(db.Integer, db.ForeignKey("nutrition.id"))
    nutrition = db.relationship(
        Nutrition, 
        single_parent=True, 
        cascade="all, delete-orphan") 
        #backref=db.backref("recipe", cascade="all, delete-orphan", uselist=False))

    def __str__(self):
        return str(vars(self))
    def json(self):
        return {
            "id": self.id,
            "name": self.name,
            "nutrition_id": self.nutrition_id,
            "nutrition": self.nutrition.json(),
            }

    # Create new Recipe record and add it to the database.
    # Returns the new Recipe on success or a list of error messages on failure.
    # Parameters:
    #   user_id is the ID of the user who owns the Recipe.
    #   name is the name of the Recipe.
    #   total_yield is the total number of servings the Recipe makes.
    #   serving_description is a description of the serving size.
    #   servings is the number of servings the Recipe makes.
    #   food_ingredients is a list of tuples, each containing a Food record and
    #     the number of servings of that Food item in the Recipe.
    #   recipe_ingrediwnts is a list of tuples, each containing a Recipe record 
    #     and the number of servings of that Recipe in the Recipe.
    def add(user_id: int, 
            name: str,
            total_yield: str, 
            serving_description: str, 
            servings: int, 
            food_ingredients_and_servings: list[tuple[dict,float]],
            recipe_ingredients_and_servings: list[tuple[dict,float]], 
            commit: bool) -> Recipe|list[str]:
        errors = []
        recipe = None
        try:
            recipe = Recipe()
            recipe.user_id = user_id
            recipe.name = name
            recipe.total_yield = total_yield
            recipe.servings = servings
            recipe.nutrition = Nutrition({"serving_size_description": serving_description})

            # Add the Recipe record to the database. 
            db.session.add(recipe)
            db.session.commit()

            # Add the Food and Recipe ingredients to the Recipe, summing in 
            # their Nutrition data as we go.
            if food_ingredients_and_servings is not None:
                for food_ingredient_and_serving in food_ingredients_and_servings:
                    recipe.add_food_ingredient(food_ingredient_and_serving[0], food_ingredient_and_serving[1])
            if recipe_ingredients_and_servings is not None:
                for recipe_ingredient_and_serving in recipe_ingredients_and_servings:
                    recipe.add_recipe_ingredient(recipe_ingredient_and_serving[0], recipe_ingredient_and_serving[1])

        except Exception as e:
            errors.append("Recipe record could not be added: " + repr(e))

        if len(errors) == 0:
            return recipe
        else:
            return errors

    # Add a Food item to the Recipe as an ingredient.
    def add_food_ingredient(self, food, servings: float):
        print("Adding Food ingredient: ", food.name)
        self.nutrition.sum(food.nutrition, servings)

        # Add the Food ingredient record to the Recipe.
        # This doesn't actually add the contents of the Food record as a child
        # record, instead it automatically creates the RecipeFoods association 
        # record.
        self.food_ingredients.append(food)
        
        # Now query the newly-created RecipeFoods record so we can set the 
        # servings.
        recipe_food = RecipeFoods.query.filter_by(recipe_id=self.id, ingredient_id=food.id).first()

        # Now set the servings field and commit the record.
        recipe_food.servings = servings
        db.session.commit()
        
        print("Food ingredient added")

    # Add a Recipe item to the Recipe as an ingredient.
    def add_recipe_ingredient(self, recipe: Recipe, servings: float) -> list[str]:
        print("Adding Recipe ingredient: ", recipe.name)
        self.nutrition.sum(recipe.nutrition, servings)

        # Add the Recipe ingredient record to the Recipe.
        # This doesn't actually add the contents of the Recipe record as a child
        # record, instead it automatically creates the RecipeRecipes association
        # record.
        self.food_ingredients.append(recipe)
        
        # Now query the newly-created RecipeRecipes record so we can set the 
        # servings.
        recipe_recipe = RecipeRecipes.query.filter_by(recipe_id=self.id, ingredient_id=recipe.id).first()

        # Now set the servings field and commit the record.
        recipe_recipe.servings = servings
        db.session.commit()
        
        print("Recipe ingredient added")

    # Update an existing Recipe record.
    # Similar to the add method, this copies all the values from the JSON 
    # dictionary passed in the request into an Recipe ORM record, and
    # likewise for the child Nutrition record.  I'm unsure if this is a
    # recommended method.  Probably not.  Probably the safer thing would 
    # be to manually, explicitly copy each field.  But I ain't got time for 
    # that!
    def update(user_id: int, recipe: dict[str, str|int|float]) -> list[str]:
        errors = []
        try: 
            # 
            nutrition = recipe["nutrition"]
            del recipe["nutrition"]
            recipe_id = recipe["id"]
            nutrition_id = recipe["nutrition_id"]

            num_updates = Nutrition.query.filter_by(id=nutrition_id).update(nutrition)
            if (num_updates != 1):
                errors.append(f"Expected to update 1 Nutrition record but attempted to update {num_updates}.")
            num_updates = Food.query.filter_by(user_id=user_id, id=recipe_id).update(recipe)
            if (num_updates != 1):
                errors.append(f"Expected to update 1 Recipe record but attempted to update {num_updates}.")

            if (len(errors) == 0):
                db.session.commit()
        except Exception as e:
            errors.append("Recipe record could not be updated: " + repr(e))

        return errors

