from __future__ import annotations
from typing import Any
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from email_validator import validate_email, EmailNotValidError
from crypto import Crypto
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
# Yes, it's as confusing as it sounds.  This is called a "back reference".
# The legacy way of doing this was to use the "backref" attribute, which 
# automatically created a field in the child record that pointed back to the
# parent record.  It basically creates a new field in the child record that 
# is defined using the "relationship()" method, which then points back to 
# the parent record.  This is convenient, but as you can surely tell, 
# EXTREMELY confusing.
#
# Therefore the new, preferred way of doing this is to just explicitly create
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
# relationships manually.  The only place I used it is between the Nutrition
# table and the Food/Recipe/DailyLog tables.  See the comments for the Nutrition
# record for more about that.
##############################

# Instantiate the Flask-SQLAlchemny database connector.
db = SQLAlchemy()


##############################
# USER
##############################
class UserStatus(enum.Enum):
    pending = 1
    confirmed = 2
    cancelled = 3
    banned = 4

class User(db.Model):
    """
    A user of this app.  This record contains their password hash and other
    authentication data.  Any personal data (such as email address) is encrypted.
    Each user owns their own app data.
    """
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(db.String(100), index=True, unique=True)
    status: Mapped[UserStatus] = mapped_column(db.Enum(UserStatus), nullable=False)
    email: Mapped[bytes|None] = mapped_column(db.LargeBinary, nullable=True)
    created_at: Mapped[str] = mapped_column(db.DateTime, nullable=False)
    password_hash: Mapped[str] = mapped_column(db.String(64), nullable=False)
    confirmation_sent_at: Mapped[datetime.datetime | None] = mapped_column(db.DateTime, nullable=True)
    confirmation_token: Mapped[str|None] = mapped_column(db.String(64), nullable=True)

    def __init__(self, data: dict[str,Any]):
        self.username = data["username"]
        self.status = data["status"]
        self.email = data.get("email")
        self.created_at = data["created_at"]
        self.password_hash = data["password_hash"]
        self.confirmation_sent_at = data.get("confirmation_sent_at")
        self.confirmation_token = data.get("confirmation_token")
        return self

    def __str__(self):
        return f"<User {self.id} {self.username}, status: {self.status}, created_at: {self.created_at}, confirmation_sent_at: {self.confirmation_sent_at}>"

    def __repr__(self):
        email = ""
        if self.email and len(self.email) > 0:
            email = Crypto.decrypt(self.email)
        return f"User({self.id}, \'{self.username}\', {self.status}, \'{email}\', {self.created_at}, \'{self.password_hash}\', {self.confirmation_sent_at}, \'{self.confirmation_token}\')"

    def json(self) -> dict[str,Any]:
        return {
            "id": self.id,
            "username": self.username,
            "status": self.status.name,
            "created_at": self.created_at,
            "confirmation_sent_at": self.confirmation_sent_at
            }
    

    @staticmethod
    def get_all() -> list[User]:
        users = db.session.scalars(db.select(User)).all()
        return list(users)


    @staticmethod
    def get(username: str) -> User|None:
        user = db.session.scalars(db.select(User).filter_by(username=username)).first()
        return user


    @staticmethod
    def get_id(username: str) -> int:
        """
        Get the user_id for the given username
        """
        user = db.session.scalars(db.select(User).filter_by(username=username)).first()
        if user is None:
            raise ValueError(f"User {username} not found")
        return user.id


    @staticmethod
    def add(data: dict[str,Any]) -> None:
        """
        Add a new User to the database.
        """
        # Pull fields from dictionary
        username: str = data["username"]
        password: str = data["password"]
        email_addr: str = data["email"]
        status: UserStatus = data.get("status", UserStatus.pending)
        confirmation_token: str|None = data.get("token")

        errors: list[str] = []
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
                    password_hash_str = Crypto.hash_password(password)

                    # Encrypt the user data.  Currently that is just the email address.
                    encrypted_email_addr = None
                    if email_addr and len(email_addr) > 0:
                        encrypted_email_addr = Crypto.encrypt(email_addr)

                    # Store the user record in the database
                    now = datetime.datetime.now()
                    confirmation_sent_at = None
                    if confirmation_token is not None:
                        confirmation_sent_at = now
                    new_user = User({
                        "username": username, 
                        "status": status, 
                        "email": encrypted_email_addr, 
                        "created_at": now, 
                        "password_hash": password_hash_str,
                        "confirmation_sent_at": confirmation_sent_at, 
                        "confirmation_token": confirmation_token
                        })
                    db.session.add(new_user)
                    db.session.commit()
        except Exception as e:
            errors.append(repr(e))
        if (len(errors) > 0):
            msg = "\n".join(errors)
            raise ValueError(f"User {username} could not be added: " + msg)


    @staticmethod
    def verify(username: str, password: str) -> None:
        """
        Verify that the given user credentials are valid.
        """
        errors: list[str] = []
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
                        if not Crypto.check_password(password_bytes, password_hash_bytes):
                            errors.append(f"Invalid password for username {username}.")
        except Exception as e:
            errors.append(repr(e))
        if (len(errors) > 0):
            msg = "\n".join(errors)
            raise ValueError(f"User record could not be validated: " + msg)


##############################
# NURITION
##############################
class Nutrition(db.Model):
    """
    This is the nutrition data that this app is intended to track.  It's basically
    the same data you see on a USDA nutrition label.

    Nutrition is a separate record because the same data fields are reused for 
    the Food, Recipe, and DailyLog tables.

    When used with the Food record, it represents the nutrition for one 
    serving of one food item.  It is then combined in the proper proportions to 
    calculate the nutrition for Recipes and DailyLogs.

    The Nutrition data is technically denormalized for the Recipe and DailyLog
    tables.  That is, we store it even though it's calculated from other records
    that are already stored in the database.  We do this for efficiency.
    It's more efficient to store it rather than load all the ingredient child
    records and recalculate the totals every time a Recipe or DailyLog record is
    viewed.  We just have to remember to recalculate and re-store the Nutrition
    data when necessary, such as when a Recipe's ingredients change.

    The Food, Recipe and DailyLog tables each have a 1-to-1 relationship with the
    Nutrition table.  Note that technically, the Nutrition record is the parent
    record in these relationships.  That is, instead of the Nutrition record having
    the ID of an associated Food, Recipe, or DailyLog record, those records have the
    ID of an associated Nutrition record.  This is because the Nutrition record is 
    reused -- it can't have foreign key relationships on all three of those tables,
    so we do it the other way around.

    This has one convenient side effect, which is that we can configure SQLAlchemy
    for "cascade deletes".  So when we delete a Food, Recipe or DailyLog record,
    the ORM layer also automatically deletes the associated Nutrition record
    without any coding on our part.  It can do this because the "child" record in
    these relationships (Food/Recipe/DailyLog) has the ID of the "parent"
    Nutrition record.
    """
    __tablename__ = "nutrition"

    id: Mapped[int] = mapped_column(primary_key=True)
    serving_size_description: Mapped[str] = mapped_column(db.String(50), nullable=False)
    serving_size_g: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    serving_size_oz: Mapped[float | None] = mapped_column(db.Float, nullable=True)
    calories: Mapped[int] = mapped_column(db.Integer, nullable=False)
    total_fat_g: Mapped[float | None] = mapped_column(db.Float, nullable=True)
    saturated_fat_g: Mapped[float | None] = mapped_column(db.Float, nullable=True)
    trans_fat_g: Mapped[float | None] = mapped_column(db.Float, nullable=True)
    cholesterol_mg: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    sodium_mg: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    total_carbs_g: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    fiber_g: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    total_sugar_g: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    added_sugar_g: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    protein_g: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    vitamin_d_mcg: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    calcium_mg: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    iron_mg: Mapped[float | None] = mapped_column(db.Float, nullable=True)
    potassium_mg: Mapped[int | None] = mapped_column(db.Integer, nullable=True)

    def __init__(self, data: dict[str,Any]|None = None):
        if data is not None:
            self._update(data)

    def _update(self, data: dict[str,Any]):
        if data.get("id"):
            self.id = data["id"]
        self.serving_size_description = data["serving_size_description"]
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

    def json(self) -> dict[str,Any]:
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
    

    @staticmethod
    def get(user_id: int, nutrition_id: int) -> Nutrition | None:
        nutrition = db.session.get(Nutrition, nutrition_id)
        return nutrition


    def sum(self, nutrition2: Nutrition, servings: float, modifier: float = 1) -> Nutrition:
        """
        Add one Nutrition record to another.
        """
        self.calories = (self.calories or 0) + round((nutrition2.calories or 0) * servings * modifier)
        self.total_fat_g = (self.total_fat_g or 0) + round((nutrition2.total_fat_g or 0) * servings * modifier, 1)
        self.saturated_fat_g = (self.saturated_fat_g or 0) + round((nutrition2.saturated_fat_g or 0) * servings * modifier, 1)
        self.trans_fat_g = (self.trans_fat_g or 0) + round((nutrition2.trans_fat_g or 0) * servings * modifier, 1)
        self.cholesterol_mg = (self.cholesterol_mg or 0) + round((nutrition2.cholesterol_mg or 0) * servings * modifier)
        self.sodium_mg = (self.sodium_mg or 0) + round((nutrition2.sodium_mg or 0) * servings * modifier)
        self.total_carbs_g = (self.total_carbs_g or 0) + round((nutrition2.total_carbs_g or 0) * servings * modifier)
        self.fiber_g = (self.fiber_g or 0) + round((nutrition2.fiber_g or 0) * servings * modifier)
        self.total_sugar_g = (self.total_sugar_g or 0) + round((nutrition2.total_sugar_g or 0) * servings * modifier)
        self.added_sugar_g = (self.added_sugar_g or 0) + round((nutrition2.added_sugar_g or 0) * servings * modifier)
        self.protein_g = (self.protein_g or 0) + round((nutrition2.protein_g or 0) * servings * modifier)
        self.vitamin_d_mcg = (self.vitamin_d_mcg or 0) + round((nutrition2.vitamin_d_mcg or 0) * servings * modifier)
        self.calcium_mg = (self.calcium_mg or 0) + round((nutrition2.calcium_mg or 0) * servings * modifier)
        self.iron_mg = (self.iron_mg or 0) + round((nutrition2.iron_mg or 0) * servings * modifier, 1)
        self.potassium_mg = (self.potassium_mg or 0) + round((nutrition2.potassium_mg or 0) * servings * modifier)
        return self

    
    def subtract(self, nutrition2: Nutrition, servings: float, modifier: float = 1) -> Nutrition:
        """
        Subtract one Nutrition record from another.
        """
        return self.sum(nutrition2, servings, modifier * -1)


    def reset(self) -> Nutrition:
        """
        Reset the Nutrition totals to zero (leave the ID and serving info intact).
        """
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
    """
    This represents one "atomic" food item that you'd buy at the grocery store:
    a loaf of bread, a box of cereal, an orange, a head of lettuce, etc.
    This is the app's basic building-block record.
    """
    __tablename__ = "food"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    group: Mapped[FoodGroup] = mapped_column(db.Enum(FoodGroup), nullable=False)
    name: Mapped[str] = mapped_column(db.String(50), nullable=False)
    subtype: Mapped[str | None] = mapped_column(db.String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(db.String(100), nullable=True)
    vendor: Mapped[str] = mapped_column(db.String(50), nullable=False)
    size_description: Mapped[str | None] = mapped_column(db.String(50), nullable=True)
    size_oz: Mapped[float | None] = mapped_column(db.Float, nullable=True)
    size_g: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    servings: Mapped[float] = mapped_column(db.Float, nullable=False)
    nutrition_id: Mapped[int | None] = mapped_column(db.Integer, db.ForeignKey("nutrition.id"), nullable=True)
    nutrition: Mapped[Nutrition] = relationship(
        "Nutrition",
        single_parent=True,
        cascade="all, delete-orphan")
    price: Mapped[float | None] = mapped_column(db.Float, nullable=True)
    price_date: Mapped[datetime.date | None] = mapped_column(db.Date, nullable=True)
    shelf_life: Mapped[str | None] = mapped_column(db.String(150), nullable=True)

    def __init__(self, user_id: int, data: dict[str,Any]|None = None):
        if data is not None:
            self._update(user_id, data)
        else:
            self.group = FoodGroup.other
            self.nutrition = Nutrition()

    def _update(self, user_id: int, data: dict[str,Any]) -> None:
        if data.get("id"):
            self.id = data["id"]
        self.user_id = user_id
        self.group = FoodGroup[data["group"]]
        self.name = data["name"]
        self.subtype = data.get("subtype")
        self.description = data.get("description")
        self.vendor = data["vendor"]
        self.size_description = data.get("size_description")
        self.size_oz = data.get("size_oz")
        self.size_g = data.get("size_g")
        self.servings = data["servings"]
        self.nutrition = Nutrition(data.get("nutrition"))
        # This code sets the DAO field to None if the date string is None
        # OR if its stripped length is 0 (e.g., if is's all spaces)
        price_date = (data.get("price_date") or "").strip()
        self.price_date = datetime.date.fromisoformat(price_date) if price_date else None
        self.shelf_life = data.get("shelf_life")

    def __str__(self):
        return str(vars(self))
    
    def json(self) -> dict[str,Any]:
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
            "price_date": self.price_date.strftime("%Y-%m-%d") if self.price_date else None,
            "shelf_life": self.shelf_life
            }

    

    @staticmethod
    def get_all() -> list[Food]:
        foods = db.session.scalars(db.select(Food)).all()
        return list(foods)


    @staticmethod
    def get_by_user(user_id: int) -> list[Food]:
        foods = db.session.scalars(db.select(Food).where(Food.user_id == user_id).order_by("group", "name", "subtype")).all()
        return list(foods)


    @staticmethod
    def get(user_id: int, food_id: int) -> Food | None:
        food = db.session.scalars(db.select(Food).where(Food.user_id == user_id).where(Food.id == food_id).order_by("group", "name", "subtype")).first()
        return food


    @staticmethod
    def add(user_id: int, food: dict[str, str|int|float], commit: bool) -> dict[str, str|int|float]:
        """
        Add a new Food record to the database.
        commit is a boolean indicating whether the record should be committed to
            the database.  Set it to false when you want to add a bunch of records
            at once (calling this function multiple times), in which case the caller
            is required to commit the records afterwards (via db.session.commit()).
        """
        try: 
            # Construct the new Food database record.
            new_food_dao = Food(user_id, food)

            # Add the new record to the database!
            db.session.add(new_food_dao)

            if commit:
                db.session.commit()

            return new_food_dao.json()
        except Exception as e:
            raise ValueError("Food record could not be added: " + repr(e)) from e


    @staticmethod
    def update(user_id: int, food: dict[str, str|int|float]) -> dict[str, str|int|float]:
        """
        Update an existing Food record.
        """
        try:
            # Get the Food record
            food_id = food["id"]
            food_dao = db.session.get(Food, food_id)
            if not food_dao:
                raise ValueError(f"Food record {food_id} not found.")

            # Get the Nutrition child record
            nutrition_id = food_dao.nutrition_id
            nutrition_dao = db.session.get(Nutrition, nutrition_id)
            if not nutrition_dao:
                raise ValueError(f"Nutrition record {food_id}/{nutrition_id} not found.")

            # Add the user_id field.
            food["user_id"] = user_id

            # Update the data fields
            food_dao._update(user_id, food)

            db.session.commit()

            return food
        except Exception as e:
            raise ValueError("Food record could not be updated: " + repr(e)) from e


##############################
# INGREDIENT
##############################
class Ingredient(db.Model):
    """
    This is a many-to-many association table that links Recipes to their
    constituent Food and Recipe items.  It also stores the number of servings of 
    each Ingredient used in the Recipe.

    Note that SQLAlchemy relationships CANNOT be used with this table since
    SQLAlchemy relationships are by definition between two tables, and this table
    associates THREE tables (though only two in any given record).

    That is, either the recipe_id AND either the food_ingredient_id or the 
    recipe_ingredient_id is set in any given record, but never both.
    """
    __tablename__ = "ingredient"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey("recipe.id"), nullable=True)
    food_ingredient_id: Mapped[int | None] = mapped_column(db.Integer, db.ForeignKey("food.id"), nullable=True)
    recipe_ingredient_id: Mapped[int | None] = mapped_column(db.Integer, db.ForeignKey("recipe.id"), nullable=True)
    ordinal: Mapped[int] = mapped_column(db.Integer, nullable=False)
    servings: Mapped[float] = mapped_column(db.Float, nullable=False, default=0)
    summary: Mapped[str | None] = mapped_column(db.String(100), nullable=True)

    def __init__(self, user_id: int, data: dict[str,Any]):
        self._update(user_id, data)
    
    def _update(self, user_id: int, data: dict[str,Any]) -> None:
        if data.get("id"):
            self.id = data["id"]
        self.recipe_id = data["recipe_id"]
        self.food_ingredient_id = data.get("food_ingredient_id")
        self.recipe_ingredient_id = data.get("recipe_ingredient_id")
        self.ordinal = data["ordinal"]
        self.servings = float(data["servings"])
        self.summary = data.get("summary")

    def json(self) -> dict[str,Any]:
        return {
            "id": self.id,
            "recipe_id": self.recipe_id,
            "food_ingredient_id": self.food_ingredient_id,
            "recipe_ingredient_id": self.recipe_ingredient_id,
            "ordinal": self.ordinal,
            "servings": self.servings,
            "summary": self.summary
        }
    

    @staticmethod
    def get_all() -> list[Ingredient]:
        """
        Get all Ingredients
        """
        ingredients = db.session.scalars(db.select(Ingredient)).all()
        return list(ingredients)


    @staticmethod
    def get_all_for_user(user_id: int) -> list[Ingredient]:
        """
        Get all Ingredients for a particular User
        """
        raise NotImplementedError("This feature is not yet implemented.  Ingredient does not have a user_id column.")


    @staticmethod
    def get_all_for_recipe(user_id: int, recipe_id: int) -> list[Ingredient]:
        """
        Get all Ingredients for a Recipe
        """
        ingredients = db.session.scalars(db.select(Ingredient).where(Ingredient.recipe_id == recipe_id)).all()
        return list(ingredients)


    @staticmethod
    def get(user_id: int, ingredient_id: int) -> Ingredient | None:
        """
        Get one specififc Ingredient
        """
        ingredient = db.session.get(Ingredient, ingredient_id)
        return ingredient


    @staticmethod
    def add(user_id: int, data: dict[str,Any], commit: bool = True) -> dict[str, str|int|float]:
        """
        Create a new Ingredient record
        """
        # Pull values from dictionary
        recipe_id = data["recipe_id"]
        food_ingredient_id = data.get("food_ingredient_id")
        recipe_ingredient_id = data.get("recipe_ingredient_id")
        servings = float(data["servings"])
        summary = str(data.get("summary"))
        ordinal = data.get("ordinal")

        try:
            # Check whether a matching Ingredient record already exists
            ingredient_dao = db.session.scalars(db.select(Ingredient).where(Ingredient.recipe_id == recipe_id).where(Ingredient.food_ingredient_id == food_ingredient_id).where(Ingredient.recipe_ingredient_id == recipe_ingredient_id)).first()
            if ingredient_dao:
                raise ValueError(f"Ingredient record {recipe_id}/{food_ingredient_id}/{recipe_ingredient_id} already exists")

            # Get the Recipe record
            recipe_dao = db.session.get(Recipe, recipe_id)
            if not recipe_dao:
                raise ValueError(f"Recipe record {recipe_id} not found")

            # Get its Nutrition child record
            recipe_nutrition_dao = db.session.get(Nutrition, recipe_dao.nutrition_id)
            if not recipe_nutrition_dao:
                raise ValueError(f"Nutrition record {recipe_id}/{recipe_dao.nutrition_id} not found")

            # Generate a summary for this Ingredient if one wasn't provided.
            # Also, sum the Nutrition data from the new Ingredient into the Recipe.
            # Food Ingredient
            if food_ingredient_id:
                food_ingredient_dao = db.session.get(Food, food_ingredient_id)
                if not food_ingredient_dao:
                    raise ValueError(f"Food Ingredient record {food_ingredient_id} not found")
                
                ingredient_nutririon_dao = db.session.get(Nutrition, food_ingredient_dao.nutrition_id)
                if not ingredient_nutririon_dao:
                    raise ValueError(f"Ingredient record {food_ingredient_id}/{food_ingredient_dao.nutrition_id} not found")

                summary = Ingredient.generate_summary(food_ingredient_dao, servings)
                recipe_nutrition_dao.sum(ingredient_nutririon_dao, servings)
                price_per_serving = (food_ingredient_dao.price or 0)/food_ingredient_dao.servings
                recipe_dao.price = (recipe_dao.price or 0) + round(price_per_serving * servings, 2)

            # Recipe Ingredient
            elif recipe_ingredient_id:
                recipe_ingredient_dao = db.session.get(Recipe, recipe_ingredient_id)
                if not recipe_ingredient_dao:
                    raise ValueError(f"Recipe Ingredient record {recipe_ingredient_id} not found")

                ingredient_nutrition_dao = db.session.get(Nutrition, recipe_ingredient_dao.nutrition_id)
                if not ingredient_nutrition_dao:
                    raise ValueError(f"Ingredient record {recipe_ingredient_id}/{recipe_ingredient_dao.nutrition_id} not found")

                summary = Ingredient.generate_summary(recipe_ingredient_dao, servings)
                recipe_nutrition_dao.sum(ingredient_nutrition_dao, servings, 1/recipe_ingredient_dao.servings if recipe_ingredient_dao.servings else 0)
                
                price_per_serving = (recipe_ingredient_dao.price or 0)/recipe_ingredient_dao.servings if recipe_ingredient_dao.servings else 0
                total_price = round(price_per_serving * servings, 2)
                recipe_dao.price = recipe_dao.price + total_price if recipe_dao.price else total_price

            else:
                raise ValueError("Either food_ingredient_id or recipe_ingredient_id must be provided.")
            
            if ordinal is None:
                ordinal = db.session.query(func.count(Ingredient.id)).filter_by(recipe_id=recipe_id).scalar()
            
            # Create a new Ingredient record and add it to the database.
            ingred = Ingredient(user_id, {
                "recipe_id": recipe_id, 
                "food_ingredient_id": food_ingredient_id, 
                "recipe_ingredient_id": recipe_ingredient_id, 
                "ordinal": ordinal,
                "servings": servings,
                "summary": summary})
            db.session.add(ingred)

            if True:
                db.session.commit()

            return ingred.json()
        except Exception as e:
            raise ValueError(f"Ingredient record {recipe_id}/{food_ingredient_id}/{recipe_ingredient_id} could not be added: " + repr(e)) from e


    @staticmethod
    def generate_summary(ingredient: Food | Recipe, servings: float) -> str:
        """
        Generate a short text summary of an Ingredient for the Recipe list.
        """
        # Get the Nutrition record
        nutrition_id = ingredient.nutrition_id
        nutrition_dao = db.session.get(Nutrition, nutrition_id)
        if not nutrition_dao:
            raise ValueError(f"Nutrition record {nutrition_id} not found.")

        ss_oz: float = round((nutrition_dao.serving_size_oz or 0) * servings, 1)
        ss_g: int = round((nutrition_dao.serving_size_g or 0) * servings)

        if type(ingredient) == Food:
            food: Food = ingredient
            subtype = "" if (food.subtype is None or food.subtype == "") else f", {food.subtype}" 
            return f"{servings} x ({food.nutrition.serving_size_description}) {food.name}{subtype} ({ss_oz} oz/{ss_g} g)"
        elif type(ingredient) == Recipe:
            recipe: Recipe = ingredient
            return f"{servings} x {recipe.name} ({ss_oz} oz/{ss_g} g)"
        raise ValueError(f"Unknown ingredient type: {type(ingredient)}")


##############################
# RECIPE
##############################
class Recipe(db.Model):
    """
    Recipe represents a collection of Food and Recipe items that are combined to 
    make a single "dish" or "meal".
    
    It includes a denormalized copy of the Nutrition data for the Recipe.
    ("Denormalized" because it could be calculated from its ingredients.)
    
    This is the app"s second-level building-block record.
    """
    __tablename__ = "recipe"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    cuisine: Mapped[str | None] = mapped_column(db.String(20), nullable=True)
    name: Mapped[str] = mapped_column(db.String(50), nullable=False)
    total_yield: Mapped[str] = mapped_column(db.String(50), nullable=False)
    servings: Mapped[float] = mapped_column(db.Float, nullable=False, default=0)
    nutrition_id: Mapped[int | None] = mapped_column(db.Integer, db.ForeignKey("nutrition.id"), nullable=True)
    nutrition: Mapped[Nutrition] = relationship(
        "Nutrition",
        single_parent=True,
        cascade="all, delete-orphan")
    price: Mapped[float | None] = mapped_column(db.Float, default=0, nullable=True)

    def __init__(self, user_id: int, data: dict[str,Any]):
        self.user_id = user_id
        self._update(user_id, data)
    
    def _update(self, user_id: int, data: dict[str,Any]):
        if data.get("id"):
            self.id = data["id"]
        self.cuisine = data.get("cuisine")
        self.name = data["name"]
        self.total_yield = data["total_yield"]
        self.servings = data["servings"]
        self.nutrition_id = data.get("nutrition_id")
        #self.nutrition is set by recipe.add()
        self.price = data.get("price")

    def __str__(self):
        return str(vars(self))

    # Return a JSON representation of this Recipe object
    def json(self) -> dict[str,Any]:
        nutrition_dao = db.session.get(Nutrition, self.nutrition_id)
        if not nutrition_dao:
            raise ValueError(f"Nutrition record {self.id}/{self.nutrition_id} not found")

        return {
            "id": self.id,
            "cuisine": self.cuisine,
            "name": self.name,
            "total_yield": self.total_yield,
            "servings": self.servings,
            "nutrition_id": self.nutrition_id,
            "nutrition": nutrition_dao.json(),
            "price": self.price
            }
    

    @staticmethod
    def get_all() -> list[Recipe]:
        """
        Get all Recipe records
        """
        recipes = db.session.scalars(db.select(Recipe)).all()
        return list(recipes)


    @staticmethod
    def get_all_for_user(user_id: int) -> list[Recipe]:
        recipes = db.session.scalars(db.select(Recipe).where(Recipe.user_id == user_id)).all()
        return list(recipes)


    @staticmethod
    def get(user_id: int, recipe_id: int) -> Recipe | None:
        recipe = db.session.scalars(db.select(Recipe).where(Recipe.user_id == user_id).where(Recipe.id == recipe_id)).first()
        return recipe


    @staticmethod
    def add(user_id: int, data: dict[str,Any]) -> dict[str,Any]:
        """
        Add a new Recipe record with a new blank Nutrition child record
        """
        with db.session.begin():
            try:
                recipe_dao = Recipe(user_id, data)

                # Create a new Nurition child record for the Recipe.  At the start the only field
                # with a value is the serving_size_description.
                nutrition = data.get("nutrition")
                serving_size_description = nutrition.get("serving_size_description") if nutrition else None
                recipe_dao.nutrition = Nutrition({"serving_size_description": serving_size_description})

                # Add the Recipe record
                db.session.add(recipe_dao)

                # Flush the recent changes (but don't commit them yet)
                # This is so Recipe's primary key gets generated
                db.session.flush()

                # Add the ingredients
                ingredients = data.get("ingredients", [])
                for ingredient in ingredients:
                    # Assign the recipe_id we just got for the new Recipe record
                    ingredient["recipe_id"] = recipe_dao.id
                    ingredient_dao = Ingredient(user_id, ingredient)
                    db.session.add(ingredient_dao)

                # Return the new Recipe record.
                return recipe_dao.json()
            except Exception as e:
                raise ValueError("Recipe record could not be added: " + repr(e)) from e


    @staticmethod
    def update(user_id: int, data: dict[str, Any]) -> dict[str, Any]:
        """
        Update an existing Recipe record.

        Nutrition data for a Recipe is updated ONLY by adding/updating/removing its ingredients.
        In turn, a Recipe's ingredients are ONLY added/updated/removed via their own separate 
        API calls.
        
        Therefore this API call only affects the Recipe record's own data fields, not those of
        its child records.
        """
        with db.session.begin():
            try:
                recipe_id = data["recipe_id"]
                nutrition_id = data["nutrition_id"]
                nutrition = data["nutrition"]

                # Get the existing Recipe record
                recipe_dao = Recipe.get(user_id, recipe_id)
                if not recipe_dao:
                    raise ValueError(f"Recipe record {recipe_id} not found")

                # Get its child Nutrition record
                recipe_nutrition_dao = Nutrition.get(user_id, nutrition_id)
                if not recipe_nutrition_dao:
                    raise ValueError(f"Nutrition record {recipe_id}/{nutrition_id} not found")

                # Update the Recipe DAO's fields with the data from the front end
                recipe_dao.cuisine = data["cuisine"]
                recipe_dao.name = data["name"]
                recipe_dao.total_yield = data["total_yield"]
                recipe_dao.servings = data["servings"]
                recipe_dao.price = data["price"]

                # Flush the session (but don't commit it yet) so Recipe's primary key gets generated
                db.session.flush()

                # Remove the existing Ingredient records for this Recipe
                ingredient_daos = Ingredient.get_all_for_recipe(user_id, recipe_id)
                for ingredient_dao in ingredient_daos:
                    db.session.delete(ingredient_dao)

                # Reset the Recipe's Nutrition data zeroes
                recipe_nutrition_dao.reset()

                # Add the Ingredients that are in the data passed by the front end
                ingredients = data.get("ingredients", [])
                for ingredient in ingredients:
                    # Assign the recipe_id we just got for the new Recipe record
                    ingredient["recipe_id"] = recipe_id
                    ingredient_dao = Ingredient(user_id, ingredient)
                    db.session.add(ingredient_dao)

                # Flush the recent changes (but don't commit them yet)
                db.session.flush()

                # Update the Recipe's Nutrition data
                recipe_dao = Recipe._recalculate_nutrition(user_id, recipe_id, recipe_dao, recipe_nutrition_dao)

                # Update the Recipe Nutrition record's serving_size_description field.
                # This is the only field for this record that comes from the UI, the rest
                # are calculated.
                recipe_nutrition_dao.serving_size_description = nutrition["serving_size_description"]

                # Return the updated Recipe record.
                return recipe_dao.json()
            except Exception as e:
                raise ValueError("Recipe record could not be updated: " + repr(e)) from e
    

    @staticmethod
    def update_ingredient(user_id: int, recipe_id: int, ingredient_id: int, servings: float) -> Recipe:
        """
        Update a Recipe's existing Ingredient record.
        """
        with db.session.begin():
            logging.info(f"Updating Ingredient record {recipe_id}/{ingredient_id} with {servings} servings")

            # Get the Ingredient record
            ingredient_dao: Ingredient|None = Ingredient.get(user_id, ingredient_id)
            if not ingredient_dao:
                raise ValueError(f"Ingredient record {recipe_id}/{ingredient_id} not found")

            # Update it
            ingredient_dao.servings = servings

            # Flush the change to the database server.  Not strictly necessary but it's nice
            # to be explicit
            db.session.flush()

            # Recompute the Recipe's Nutrition data
            recipe_dao = Recipe._recalculate_nutrition(user_id, recipe_id)

            # Commit the transaction
            db.session.commit()

            return recipe_dao


    @staticmethod
    def delete_ingredient(user_id: int, recipe_id: int, ingredient_id: int) -> Recipe:
        """
        Update a Recipe's existing Ingredient record.
        """
        with db.session.begin():
            logging.info(f"Deleting Ingredient record {recipe_id}/{ingredient_id}")

            # Get the Ingredient record
            ingredient_dao: Ingredient|None = Ingredient.get(user_id, ingredient_id)
            if not ingredient_dao:
                raise ValueError(f"Ingredient record {recipe_id}/{ingredient_id} not found")

            # Delete it
            db.session.delete(ingredient_dao)

            # Flush the change to the database server.  Not strictly necessary but it's nice
            # to be explicit
            db.session.flush()

            # Recompute the Recipe's Nutrition data
            recipe_dao = Recipe._recalculate_nutrition(user_id, recipe_id)

            # Commit the transaction
            db.session.commit()

            return recipe_dao


    @staticmethod
    def delete(user_id: int, recipe_id: int) -> None:
        with db.session.begin():
            logging.info(f"Deleting Recipe record {recipe_id}")

            # Get the Recipe record
            recipe_dao: Recipe|None = Recipe.get(user_id, recipe_id)
            if not recipe_dao:
                raise ValueError(f"Recipe record {recipe_id} not found")

            # Get its child Ingredient records
            ingredient_daos: list[Ingredient] = Ingredient.get_all_for_recipe(user_id, recipe_id)
            for ingredient_dao in ingredient_daos:
                # Delete each one
                db.session.delete(ingredient_dao)

            # Delete the Recipe record
            db.session.delete(recipe_dao)

            # Commit the transaction
            db.session.commit()


    @staticmethod
    def _recalculate_nutrition(user_id: int, recipe_id: int, recipe_dao: Recipe | None = None, recipe_nutrition_dao: Nutrition | None = None) -> Recipe:
        """
        Recompute a Recipe's Nutrition data.  Intended to be called after one or more
        of the Recipe's Ingredients has been added, updated or deleted.
        """
        if not recipe_dao:
            # Get the Recipe record
            recipe_dao = db.session.get(Recipe, recipe_id)
            if not recipe_dao:
                raise ValueError(f"Recipe record {recipe_id} not found")

        if not recipe_nutrition_dao:
            # Get the Recipe's Nutrition child record
            recipe_nutrition_dao = db.session.get(Nutrition, recipe_dao.nutrition_id)
            if not recipe_nutrition_dao:
                raise ValueError(f"Nutrition record {recipe_id}/{recipe_dao.nutrition_id} not found")

        # Reset the nutrition totals
        recipe_nutrition_dao.reset()

        # Get the Recipe's Ingredients
        ingredient_daos: list[Ingredient] = Ingredient.get_all_for_recipe(user_id, recipe_id)
        for ingredient_dao in ingredient_daos:
            # Get the corresponding Food or Recipe record
            ingredient_nutrition_id = None
            food_ingredient_dao = None
            recipe_ingredient_dao = None
            if ingredient_dao.food_ingredient_id and not ingredient_dao.recipe_ingredient_id:
                food_ingredient_dao = Food.get(user_id, ingredient_dao.food_ingredient_id)
                if not food_ingredient_dao:
                    raise ValueError(f"Food Ingedient record {ingredient_dao.food_ingredient_id} not found")
                ingredient_nutrition_id = food_ingredient_dao.nutrition_id
            elif ingredient_dao.recipe_ingredient_id and not ingredient_dao.food_ingredient_id:
                recipe_ingredient_dao = Recipe.get(user_id, ingredient_dao.recipe_ingredient_id)
                if not recipe_ingredient_dao:
                    raise ValueError(f"Recipe Ingedient record {ingredient_dao.recipe_ingredient_id} not found")
                ingredient_nutrition_id = recipe_ingredient_dao.nutrition_id
            else:
                raise ValueError("Either food ID or recipe ID must be proviided for an ingredient, but not both")
            if not ingredient_nutrition_id:
                raise ValueError(f"Nutrition ID for Ingredient record {ingredient_dao.id} could not be determined")

            # Get the Food or Recipe's Nutrition record
            ingredient_nutrition_dao = Nutrition.get(user_id, ingredient_nutrition_id)
            if not ingredient_nutrition_dao:
                raise ValueError(f"Nutrition record {ingredient_nutrition_id} not found")

            # Add its nutrition data to the total
            recipe_nutrition_dao.sum(ingredient_nutrition_dao, ingredient_dao.servings)

        return recipe_dao

