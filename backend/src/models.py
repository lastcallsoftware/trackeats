from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import Mapped, mapped_column
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

# Instantiate the database connector.
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
                # I know that in the case of a validation failure you're not supposed to 
                # tell the caller whether the username or password was invalid.  In the
                # interests of easier debugging, I'll take my chances here... :P
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


# NUTRITION
# ---------
# This is the nutrition data that this app is intended to track.  It's basically
# the same data you see on a USDA nutrition label.
# Nutrition is a separate record because the same data fields are reused for 
# Ingredients, Meals, and the Daily Log.
# When used with the Ingedient record, it represents the nutrition for one 
# serving of one food item.  It is then combined in the proper proportions to 
# calculate the nutrition for Meals and Daily Logs.  Though as I type this I'm
# realizing that for the other records, the Nutrition data is calculated and 
# therefore denormalized if we store it separately for those records.  Hmmm.
# I'll cross that bridge when I get to it.
# IN THE MEAN TIME, FOR NOW... each of those tables is intended to have a 1-to-1
# relationship with this table.
# As a result, because we want Nutrition to be used with multiple tables, we 
# cannot put a foreign key to the associated table in the Nutrition table.  This
# means that although each of these tables has a 1-to-1 relationship with 
# Nutriion, technically Nutrition is the PARENT record.  As such, if you delete,
# say, an Ingredient record, we CANNOT configure the ORM layer to automatically 
# cascade delete the corresponding Nutrition record -- we'd have to do it the 
# other way around, which doesn't really make sense from a usage standpoint.
# So when we want to delete an Ingredient record (or Meal or Daily Log), we have 
# to code the delete of the corresponding Nutrition record manually.
# More generally, we say that the referential integrity only goes in one
# direction.  I'm not sure yet if that has other side effects that might bite
# us, but keep it in mind.
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


# INGREDIENT
# ----------
# This represents one "atomic" food item that you'd buy at the grocery store:
# a loaf of bread, a box of cereal, an orange, a head of lettuce, a package of 
# chicken breasts, etc.  This is the app's basic building-block record.
class FoodGroup(enum.Enum):
    fruits = 1,
    vegetables = 2,
    grains = 3,
    proteins = 4,
    dairy = 5,
    herbsAndSpices = 6,
    condimentsAndSauces = 7,
    oilsAndBakingNeeds = 8,
    preparedFoods = 9,
    beverages = 10,
    other = 11

class Ingredient(db.Model):
    __tablename__ = "ingredient"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    group = db.Column(db.Enum(FoodGroup), nullable=False)
    type = db.Column(db.String(32), nullable=False)
    subtype = db.Column(db.String(32), nullable=True)
    description = db.Column(db.String(100), nullable=True)
    vendor = db.Column(db.String(64), nullable=False)
    size_description = db.Column(db.String(32))
    size_g = db.Column(db.Integer)
    servings = db.Column(db.Float, nullable=False)
    nutrition_id = db.Column(db.Integer, db.ForeignKey('nutrition.id'))
    nutrition = db.relationship(Nutrition, single_parent=True, cascade="all, delete-orphan", backref=db.backref("nutrition", cascade="all, delete-orphan", uselist=False))
    price = db.Column(db.Float)
    price_date = db.Column(db.Date, nullable=True)
    shelf_life = db.Column(db.String(150))

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
            "type": self.type,
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

    # Add a new ingredient to the database.
    # Returns a list of error messages, or an empty list on success.
    # ingredient is expected to be a JSON-like dictionary object with the same 
    #   fields as the Ingredient record itself (including its child Nutrition 
    #   object), with the exception of the user_id field, which gets assigned here.
    # commit is a boolean indicating whether the record should be committed to
    #   the database.  Set it to false when you want to add a bunch of records
    #   at once (calling this function multiple times), in which case the caller
    #   is required to commit the records afterwards (via db.session.commit()).
    def add(user_id: int, ingredient: dict[str, str|int|float], commit: bool) -> list[str]:
        errors = []
        try: 
            # Add the user_id field to the ingredient record.
            ingredient["user_id"] = user_id

            # "Pull out" the nutrition child object.
            # The nutrition data is of course a separate detabase record, so we
            # have to instantiate and save it separately.
            nutrition = ingredient["nutrition"]
            del ingredient["nutrition"]

            if (len(ingredient["price_date"].strip()) == 0):
                del ingredient["price_date"]

            # Use Python's ** operator to populate an instance of the SQLAlchemy
            # model objects.
            # We're making a HUGE assumption here, which is that the database 
            # records have EXACTLY the same fields as the corresponding records
            # on the front end.  It's probably a lot safer to manually, explicitly
            # copy the data from one to the other.  That way we could account for
            # any differences in the field names, the data formats, and even the
            # absense of certain fields on one side or the other.  BUT I AIN'T
            # GOT TIME FOR THAT!
            n = Nutrition(**nutrition)
            i = Ingredient(**ingredient)

            # Now re-add the Nutrition child object to the Ingredient object.
            i.nutrition = n

            # Add the new record to the database!
            db.session.add(i)

            if commit:
                db.session.commit()
        except Exception as e:
            errors.append("Ingredient record could not be added: " + repr(e))

        return errors
    
    # Update an existing record.
    # Similar to the add method, this copies all the values from the JSON 
    # dictionary passed in the request into an Ingredient ORM record, and
    # likewise for the child Nutrition record.  I'm unsure if this is a
    # recommended method.  Probably not.  Probably the safer thing would 
    # be to manually, explicitly copy each field.  But I ain't got time for 
    # that!
    def update(user_id: int, ingredient: dict[str, str|int|float]) -> list[str]:
        errors = []
        try: 
            # 
            nutrition = ingredient["nutrition"]
            del ingredient["nutrition"]
            ingredient_id = ingredient["id"]
            nutrition_id = ingredient["nutrition_id"]
            if (len(ingredient["price_date"].strip()) == 0):
                del ingredient["price_date"]

            num_updates = Nutrition.query.filter_by(id=nutrition_id).update(nutrition)
            if (num_updates != 1):
                errors.append(f"Expected to update 1 Nutrition record but attempted to update {num_updates}.")
            num_updates = Ingredient.query.filter_by(user_id=user_id, id=ingredient_id).update(ingredient)
            if (num_updates != 1):
                errors.append(f"Expected to update 1 Ingredient record but attempted to update {num_updates}.")

            if (len(errors) == 0):
                db.session.commit()
        except Exception as e:
            errors.append("Ingredient record could not be updated: " + repr(e))

        return errors
