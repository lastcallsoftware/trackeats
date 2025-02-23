from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from email_validator import validate_email, EmailNotValidError
from crypto import check_password, encrypt, decrypt, hash_password
import enum
import datetime
import re
import logging
import json

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
#   https://docs.sqlalchemy.org/en/20/orm/relationship_api.html
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
# It follows that adding the child record to a parent record's relationship() 
# field doesn't actually create a child record in the database -- it creates
# the association record between them.  The child record must already exist.
# An exception is the (very common) case where the association record has 
# additional fields besides the foreign keys of the two associated tables.
# For example, the a Recipe's Ingredients links a Recipe record with a
# Food or Recipe, so it has foreign keys on those tables, but it also has
# a "servings" field to indicate the quantity of the ingredient.  In this
# case you must create the association record manually.
#
# Furthermore, the relationship() method also allows you to define *in the 
# parent record* a field in the child record for accessing the parent record.
# Yes, it's confusing as it sounds.  This is called a "back reference".
# The legacy way of doing this was to use the "backref" attribute, which 
# automatically created a field in the child record that pointed back to the
# parent record.  It basically creates a new field in the child record that 
# is defined using the "relationship()" method, which then points back to 
# the parent record.  This is convenient, but as you can surely tell, 
# EXTREMELY confusing.
#
# Therefor the new, preferred way of doing this is to just explicitly create
# a relationship() field in the child record that points back to the parent, 
# and to reference it in the parent using the "back_populates" attribute.
# For more information, see:
#   https://docs.sqlalchemy.org/en/20/orm/backref.html
# 
# Note that you don't HAVE TO define a back reference at all.  It's just a
# convenience for accessing the parent record from the child record.  I started
# out defining back references for all the relationships in this app simply 
# because all the examples I saw for how to define a relationship() used them,
# but I've since decided that they're not necessary, and not worth the extra 
# code and confusion.
#
# In fact I've mostly ditched using relationship() at all.  It's very limited
# in what it can do, and FAR more complicated than just handling the 
# relationships manually.
##############################

# Instantiate the Flask-SQLAlchemny database connector.
db = SQLAlchemy()


##############################
# USER
##############################
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
    # This function validates the data before adding it.
    def add(username: str, password: str, email_addr: str, status=UserStatus.pending, confirmation_token: str=None) -> None:
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
            errors.append(repr(e))
        if (len(errors) > 0):
            msg = "\n".join(errors)
            raise ValueError(f"User {username} could not be added: " + msg)

    # Verify that the given user credentials are valid.
    def verify(username: str, password: str) -> None:
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
            errors.append(repr(e))
        if (len(errors) > 0):
            msg = "\n".join(errors)
            raise ValueError(f"User record could not be validated: " + msg)


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
    serving_size_oz = db.Column(db.Float)
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
            self.serving_size_oz = data.get("serving_size_oz", 0)
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
            "serving_size_oz": self.serving_size_oz,
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

    # Subtract one Nutrition record from another.
    def subtract(self, nutrition2: "Nutrition", servings: float) -> dict:
        self.calories -= nutrition2.calories * servings
        self.total_fat_g -= nutrition2.total_fat_g * servings
        self.saturated_fat_g -= nutrition2.saturated_fat_g * servings
        self.trans_fat_g -= nutrition2.trans_fat_g * servings
        self.cholesterol_mg -= nutrition2.cholesterol_mg * servings
        self.sodium_mg -= nutrition2.sodium_mg * servings
        self.total_carbs_g -= nutrition2.total_carbs_g * servings
        self.fiber_g -= nutrition2.fiber_g * servings
        self.total_sugar_g -= nutrition2.total_sugar_g * servings
        self.added_sugar_g -= nutrition2.added_sugar_g * servings
        self.protein_g -= nutrition2.protein_g * servings
        self.vitamin_d_mcg -= nutrition2.vitamin_d_mcg * servings
        self.calcium_mg -= nutrition2.calcium_mg * servings
        self.iron_mg -= nutrition2.iron_mg * servings
        self.potassium_mg -= nutrition2.potassium_mg * servings
        return self

    # Reset the Nutrition totals to zero (leave the ID and serving info intact).
    def reset(self) -> dict:
        self.calories = 0
        self.total_fat_g = 0
        self.saturated_fat_g = 0
        self.trans_fat_g = 0
        self.cholesterol_mg = 0
        self.sodium_mg = 0
        self.total_carbs_g = 0
        self.fiber_g = 0
        self.total_sugar_g = 0
        self.added_sugar_g = 0
        self.protein_g = 0
        self.vitamin_d_mcg = 0
        self.calcium_mg = 0
        self.iron_mg = 0
        self.potassium_mg = 0
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
    description = db.Column(db.String(100), nullable=True)
    vendor = db.Column(db.String(64), nullable=False)
    size_description = db.Column(db.String(64))
    size_oz = db.Column(db.Float)
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
            self.size_oz = data.get("size_oz")
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
            "size_oz": self.size_oz,
            "size_g": self.size_g,
            "servings": self.servings,
            "nutrition_id": self.nutrition_id,
            "nutrition": self.nutrition.json(),
            "price": self.price,
            "price_date": price_date,
            "shelf_life": self.shelf_life
            }

    # Add a new Food record to the database.
    # food is expected to be a JSON-like dictionary object with the same 
    #   fields as the Food record itself (including its child Nutrition 
    #   object), with the exception of the user_id field, which gets assigned here.
    # commit is a boolean indicating whether the record should be committed to
    #   the database.  Set it to false when you want to add a bunch of records
    #   at once (calling this function multiple times), in which case the caller
    #   is required to commit the records afterwards (via db.session.commit()).
    def add(user_id: int, food: dict[str, str|int|float], commit: bool) -> None:
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
            raise ValueError("Food record could not be added: " + repr(e)) from e

    # Update an existing Food record.
    def update(user_id: int, food: dict[str, str|int|float]) -> None:
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
                raise ValueError(f"Expected to update 1 Nutrition record but found {num_updates}.")

            num_updates = Food.query.filter_by(user_id=user_id, id=food_id).update(food)
            if (num_updates != 1):
                raise ValueError(f"Expected to update 1 Food record but found {num_updates}.")

            db.session.commit()
        except Exception as e:
            raise ValueError("Food record could not be updated: " + repr(e)) from e


##############################
# INGREDIENT
##############################
# This is a many-to-many association table that links Recipes to their
# constituent Food and Recipe items.  It also stores the number of servings of 
# each Ingredient used in the Recipe.
# Note that SQLAlchemy relationships CANNOT be used with this table since
# SQLAlchemy relationships are by definition between two tables, and this table
# associates THREE tables (though only two tables in any given record),
# That is, either the food_ingredient_id or the recipe_ingredient_id is set
# in any given record, but never both.
##############################
# This allows us to reference Recipe before we actually define it.
class Recipe:
    pass

class Ingredient(db.Model):
    __tablename__ = "ingredient"

    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey("recipe.id"))
    food_ingredient_id = db.Column(db.Integer, db.ForeignKey("food.id"), nullable=True)
    recipe_ingredient_id = db.Column(db.Integer, db.ForeignKey("recipe.id"), nullable=True)
    servings = db.Column(db.Float, nullable=False, default=0)
    summary = db.Column(db.String(100))

    def json(self):
        return {
            "id": self.id,
            "recipe_id": self.recipe_id,
            "food_ingredient_id": self.food_ingredient_id,
            "recipe_ingredient_id": self.recipe_ingredient_id,
            "servings": self.servings,
            "summary": self.summary
        }
    
    # Generate a short summary of an Ingredient.
    def generate_summary(ingredient: Food | Recipe, servings: float) -> str:
        ss_oz:float = round(ingredient.nutrition.serving_size_oz * servings, 1)
        ss_g:int = round(ingredient.nutrition.serving_size_g * servings)
        if type(ingredient) == Food:
            food:Food = ingredient
            subtype = f",{food.subtype}" if (food.subtype is None or food.subtype == "") else "" 
            return f"{servings} x {food.nutrition.serving_size_description} {food.vendor} {food.name}{subtype} ({ss_oz} oz/{ss_g} g)"
        else:
            recipe:Recipe = ingredient
            return f"{servings} x {recipe.name} ({ss_oz} oz/{ss_g} g)"

    def add(recipe_id: int, food_ingredient_id: int, recipe_ingredient_id:int, servings: float, summary: str, commit: bool = False) -> None:
        try:
            # Generate a summay for this Ingredient if one wasn't provided.
            if summary is None or summary == "":
                if food_ingredient_id is not None:
                    food:Food = Food.query.filter_by(id=food_ingredient_id).first()
                    summary = Ingredient.generate_summary(food, servings)
                elif recipe_ingredient_id is not None:
                    recipe:Recipe = Recipe.query.filter_by(id=recipe_ingredient_id).first()
                    summary = Ingredient.generate_summary(recipe, servings)
                else:
                    raise ValueError("Either food_ingredient_id or recipe_ingredient_id must be provided.")

            # Create a new Ingredient record and add it to the database.
            ingredient = Ingredient(recipe_id=recipe_id, food_ingredient_id=food_ingredient_id, servings=servings, summary=summary)
            db.session.add(ingredient)

            if commit:
                db.session.commit()
        except Exception as e:
            raise ValueError("Ingredient record could not be added: " + repr(e)) from e


##############################
# RECIPE
##############################
# This represents a collection of Food and Recipe items that are combined to 
# make a meal.
# It includes a denormalized copy of the Nutrition data for the Recipe.
# ("Denormalized" because it could be calculated from its ingredients.)
# This is the app"s second-level building-block record.
##############################
class Recipe(db.Model):
    __tablename__ = "recipe"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    cuisine = db.Column(db.String(20))
    name = db.Column(db.String(50), nullable=False)
    total_yield = db.Column(db.String(50), nullable=False)
    servings = db.Column(db.Float, nullable=False)
    nutrition_id = db.Column(db.Integer, db.ForeignKey("nutrition.id"))
    nutrition = db.relationship(
        Nutrition, 
        single_parent=True, 
        cascade="all, delete-orphan") 

    def __str__(self):
        return str(vars(self))

    # Return a JSON representation of this Recipe object
    def json(self):
        return {
            "id": self.id,
            "name": self.name,
            "cuisine": self.cuisine,
            "total_yield": self.total_yield,
            "servings": self.servings,
            "nutrition_id": self.nutrition_id,
            "nutrition": self.nutrition.json(),
            }

    # Create a new Recipe record and add it to the database.
    # Returns the ID of the new Recipe record.
    def add(user_id: int, 
            cuisine: str,
            name: str,
            total_yield: str, 
            servings: int, 
            serving_size_description: str, 
            food_ingredients_and_servings: list[tuple[dict,float]],
            recipe_ingredients_and_servings: list[tuple[dict,float]]) -> int:
        try:
            recipe = Recipe()
            recipe.user_id = user_id
            recipe.cuisine = cuisine
            recipe.name = name
            recipe.total_yield = total_yield
            recipe.servings = servings

            # Create a new Nurition child record for the Recipe.  At the start the only field
            # with a value is the serving_size_description.
            recipe.nutrition = Nutrition({"serving_size_description": serving_size_description})

            # Add the Recipe record to the database WITH NO INGREDIENTS YET.
            db.session.add(recipe)
            db.session.commit()

            # Add the Food and Recipe ingredients to the Recipe, summing in 
            # their Nutrition data as we go.
            if food_ingredients_and_servings is not None:
                for food_ingredient_and_serving in food_ingredients_and_servings:
                    recipe.add_food_ingredient(food_ingredient_and_serving[0].id, food_ingredient_and_serving[1])
            if recipe_ingredients_and_servings is not None:
                for recipe_ingredient_and_serving in recipe_ingredients_and_servings:
                    recipe.add_recipe_ingredient(recipe_ingredient_and_serving[0].id, recipe_ingredient_and_serving[1])

            # Return the ID of the new Recipe record.
            return recipe.id
        except Exception as e:
            raise ValueError("Recipe record could not be added: " + repr(e)) from e

    # Update an existing Recipe record.
    # For now, I'm going with the rule that Nutrition data for a Recipe is 
    # updated ONLY by adding/updating/removing its ingredients.
    # In turn, a Recipe's ingredients are ONLY added/updated/removed via 
    # their own separate API calls.
    # Therefore this API call only affects the Recipe record's own data
    # fields, not those of its child records.
    def update(user_id: int, recipe: dict) -> None:
        # Add the user_id field.
        recipe["user_id"] = user_id

        # Remove the Nutrition object from the dictionary.
        nutrition = recipe["nutrition"]
        del recipe["nutrition"]

        # Get the ID fields so we can update the proper records.
        recipe_id = recipe["id"]
        nutrition_id = recipe["nutrition_id"]

        # For the Nutrition record, we only want to update the serving_size_description field.
        num_updates = Nutrition.query.filter_by(id=nutrition_id).update({Nutrition.serving_size_description: nutrition["serving_size_description"]})
        if (num_updates != 1):
            raise ValueError(f"Expected to update 1 Nutrition record but found {num_updates}.")

        # Update the Recipe record.
        num_updates = Recipe.query.filter_by(user_id=user_id, id=recipe_id).update(recipe)
        if (num_updates != 1):
            raise ValueError(f"Expected to update 1 Recipe record but found {num_updates}.")

        db.session.commit()

    # Add a Food Ingredient record for this Recipe
    def add_food_ingredient(self, food_id: int, servings: float, summary: str = None) -> None:
        logging.info(f"Adding Food Ingredient {self.id}/{food_id}")

        # Check whether the Ingredient record already exists
        ingredient:Ingredient = Ingredient.query.filter_by(recipe_id=self.id, food_ingredient_id=food_id).first()
        if ingredient is not None:
            raise ValueError(f"Food Ingredient record {self.id}/{food_id} already exists")

        # Get the associated Food record
        food:Food = Food.query.filter_by(id=food_id).first()
        if food is None:
            raise ValueError(f"Food {food_id} not found")

        # Generate a pithy summary, if necessary
        if summary is None or summary == "":
            summary = Ingredient.generate_summary(food, servings)

        # Create a new Ingredient record and add it to the database.
        ingredient:Ingredient = Ingredient(recipe_id=self.id, food_ingredient_id=food_id, servings=servings, summary=summary)
        db.session.add(ingredient)

        # Sum the Nutrition data from the new Ingredient into the Recipe.
        self.nutrition.sum(food.nutrition, servings)

        db.session.commit()

        logging.info(f"Food Ingredient {self.id}/{food_id} added")

    # Add a Recipe Ingredient record for this Recipe.
    def add_recipe_ingredient(self, recipe_id: int, servings: float, summary: str = None) -> None:
        logging.info(f"Adding Recipe Ingredient {self.id}/{recipe_id}")

        # Check whether the Ingredient record already exists
        ingredient:Ingredient = Ingredient.query.filter_by(recipe_id=self.id, recipe_ingredient_id=recipe_id).first()
        if ingredient is not None:
            raise ValueError(f"Recipe Ingredient record {self.id}/{recipe_id} already exists")

        # Get the Recipe record so we can sum its Nutrition data into the Recipe.
        recipe:Recipe = Recipe.query.filter_by(id=recipe_id).first()
        if recipe is None:
            raise ValueError(f"Recipe {recipe_id} not found")

        # Generate a pithy summary, if necessary
        if summary is None or summary == "":
            summary = Ingredient.generate_summary(food, servings)

        # Create a new Ingredient record and add it to the database.
        ingredient:Ingredient = Ingredient(recipe_id=self.id, recipe_ingredient_id=recipe_id, servings=servings)
        db.session.add(ingredient)

        # Sum the Nutrition data from the new Ingredient into the Recipe.
        self.nutrition.sum(recipe.nutrition, servings)

        db.session.commit()

        logging.info(f"Recipe Ingredient {self.id}/{recipe_id} added")

    # Add an Ingredient (either Food or Recipe) to the Recipe.
    def add_ingredient(self, ingredient: Ingredient) -> None:
        if ingredient.food_ingredient_id is not None:
            self.add_food_ingredient(ingredient.food_ingredient_id, ingredient.servings)
        elif ingredient.recipe_ingredient_id is not None:
            self.add_recipe_ingredient(ingredient.recipe_ingredient_id, ingredient.servings)
        else:
            raise ValueError("Ingredient record must have either a food_ingredient_id or a recipe_ingredient_id")

    # Update a Food Ingredient.
    def update_food_ingredient(self, food_id: int, servings: int) -> None:
        logging.info(f"Updating Food Ingredient {self.id}/{food_id}")

        # Find the Ingredient record that links the Recipe to the Food.
        ingredient:Ingredient = Ingredient.query.filter_by(recipe_id=self.id, food_ingredient_id=food_id).first()
        if ingredient is None:
            raise ValueError(f"Food Ingredient {self.id}/{food_id} not found")

        # Update the record
        old_servings = ingredient.servings
        ingredient.servings = servings

        # Get the Food corresponding record
        food = Food.query.filter_by(id=food_id).first()
        if food is None:
            raise ValueError(f"Food {food_id} not found")

        # Subtract the Ingredient's old Nutrition data from the Recipe.
        self.nutrition.subtract(food.nutrition, old_servings)
        # Add the Ingredient's new Nutrition data to the Recipe.
        self.nutrition.sum(food.nutrition, ingredient.servings)

        # Update the summary
        ingredient.summary = Ingredient.generate_summary(food, servings)

        # Commit the changes.
        db.session.commit()

        logging.info(f"Food Ingredient {self.id}/{food_id} updated")

    # Update a Recipe Ingredient.
    def update_recipe_ingredient(self, recipe_id: int, servings: int) -> None:
        logging.info(f"Updating Recipe Ingredient {self.id}/{recipe_id}")

        # Find the Ingredient record that links the Recipe to the Recipe.
        ingredient:Ingredient = Ingredient.query.filter_by(recipe_id=self.id, recipe_ingredient_id=recipe_id).first()
        if ingredient is None:
            raise ValueError(f"Recipe Ingredient {self.id}/{recipe_id} not found")
        
        # Update the record
        old_servings = ingredient.servings
        ingredient.servings = servings

        # Get the corresponding Recipe record
        recipe = Recipe.query.filter_by(id=recipe_id).first()
        if recipe is None:
            raise ValueError(f"Recipe {recipe_id} not found")

        # Subtract the Ingredient's old Nutrition data from the Recipe.
        self.nutrition.subtract(recipe.nutrition, old_servings)
        # Add the Ingredient's new Nutrition data to the Recipe.
        self.nutrition.sum(recipe.nutrition, ingredient.servings)

        # Update the summary
        ingredient.summary = Ingredient.generate_summary(recipe, servings)

        # Commit the changes.
        db.session.commit()

        logging.info(f"Recipe Ingredient {self.id}/{recipe_id} updated")
        
    # Remove a Food Ingredient from the Recipe.
    def remove_food_ingredient(self, food_id: int) -> None:
        logging.info(f"Removing Food Ingredient {self.id}/{food_id}")

        # Find the Ingredient record that links the Recipe to the Food.
        #recipe_food = RecipeFood.query.filter_by(recipe_id=self.id, ingredient_id=food_id).first()
        ingredient = Ingredient.query.filter_by(recipe_id=self.id, food_ingredient_id=food_id).first()
        if ingredient is None:
            raise ValueError(f"Food Ingredient {self.id}/{food_id} not found")

        # Delete the Ingredient record.
        db.session.delete(ingredient)

        # Get the Food corresponding record
        food = Food.query.filter_by(id=food_id).first()
        if food is None:
            # We'll treat this as non-fatal for now
            logging.warning(f"Recipe {food_id} not found")
        else:
            # Subtract the Food's Nutrition data from the Recipe.
            self.nutrition.subtract(food.nutrition, ingredient.servings)

        # Commit the changes.
        db.session.commit()

        logging.info(f"Food Ingredient {self.id}/{food_id} removed")

    # Remove a Recipe Ingredient from the Recipe.
    def remove_recipe_ingredient(self, recipe_id: int) -> None:
        logging.info(f"Removing Recipe Ingredient {self.id}/{recipe_id}")

        # Find the Ingredient record that links the Recipe to the Food.
        ingredient = Ingredient.query.filter_by(recipe_id=self.id, recipe_ingredient_id=recipe_id).first()
        if ingredient is None:
            raise ValueError(f"Recipe Ingredient {self.id}/{recipe_id} not found")

        # Delete the Ingredient record.
        db.session.delete(ingredient)

        # Get the Food corresponding record
        recipe = Recipe.query.filter_by(id=recipe_id).first()
        if recipe is None:
            # We'll treat this as non-fatal for now
            logging.warning(f"Recipe {recipe_id} not found")
        else:
            # Subtract the Food's Nutrition data from the Recipe.
            self.nutrition.subtract(recipe.nutrition, ingredient.servings)

        # Commit the changes.
        db.session.commit()

        logging.info(f"Recipe Ingredient {self.id}/{recipe_id} removed")

    # Reset the Nutrition data for the Recipe.
    # It's simpler to just delete the old record and create a new one.
    def reset_nutrition(self) -> None:
        db.session.delete(self.nutrition)
        self.nutrition = Nutrition()

    # Recalculate the Nutrition data for the Recipe.
    # This is a failsafe.  Typically the Nutrition data is adjusted whenever
    # an ingredient is added or removed from the Recipe, but maybe we want
    # a way to recalculate it from scratch.
    # def recalculate_nutrition(self):
    #     self.reset_nutrition()
    #     if self.food_ingredients is not None:
    #         for food_ingredient in self.food_ingredients:
    #             self.nutrition.sum(food_ingredient.nutrition, food_ingredient.servings)
    #     if self.recipe_ingredients is not None:
    #         for recipe_ingredient in self.recipe_ingredients:
    #             self.nutrition.sum(recipe_ingredient.nutrition, recipe_ingredient.servings)
