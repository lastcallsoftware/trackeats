from __future__ import annotations
from typing import Any
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, select
from sqlalchemy.orm import Mapped, mapped_column, relationship
from email_validator import validate_email
from crypto import Crypto
from schemas import FoodRequest, RecipeRequest, IngredientRequest, DailyLogItemRequest, DailyLogItemUpdateRequest, NutritionRequest
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
# table and the Food/Recipe/DailyLogItem tables.  See the comments for the Nutrition
# record for more about that.
##############################

# Instantiate the Flask-SQLAlchemny database connector.
# Disable "expire on commit".  By default SQLAlchemy does lazy reads on DAO objects
# when you access their fields outside of a trandaction to ensure they're "up to date".
# This is exactly the kind of behavior I *don't* want in a DAO layer.  No thanks.
db = SQLAlchemy(session_options={ "expire_on_commit": False })


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
    email: Mapped[bytes | None] = mapped_column(db.LargeBinary, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(db.DateTime, nullable=False)
    password_hash: Mapped[str] = mapped_column(db.String(64), nullable=False)
    confirmation_sent_at: Mapped[datetime.datetime | None] = mapped_column(db.DateTime, nullable=True)
    confirmation_token: Mapped[str | None] = mapped_column(db.String(64), nullable=True)
    seed_requested: Mapped[bool] = mapped_column(db.Boolean, nullable=False, default=False)
    seed_version: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    seeded_at: Mapped[datetime.datetime | None] = mapped_column(db.DateTime, nullable=True)

    def __init__(
        self,
        username: str,
        status: UserStatus,
        email: bytes | None,
        created_at: datetime.datetime,
        password_hash: str,
        confirmation_sent_at: datetime.datetime | None = None,
        confirmation_token: str | None = None,
        seed_requested: bool = False,
        seed_version: int | None = None,
        seeded_at: datetime.datetime | None = None,
    ):
        self.username = username
        self.status = status
        self.email = email
        self.created_at = created_at
        self.password_hash = password_hash
        self.confirmation_sent_at = confirmation_sent_at
        self.confirmation_token = confirmation_token
        self.seed_requested = seed_requested
        self.seed_version = seed_version
        self.seeded_at = seeded_at

    def __str__(self):
        return (f"<User {self.id} "
                f"username: {self.username}, "
                f"status: {self.status}, "
                f"email: <confidential>, "
                f"created_at: {self.created_at}, "
                f"password_hash: <confidential>, "
                f"confirmation_sent_at: {self.confirmation_sent_at}>"
                f"confirmation_token: <confidential>, "
                f"seed_requested: {self.seed_requested}, "
                f"seed_version: {self.seed_version}, "
                f"seeded_at: {self.seeded_at}>")

    def __repr__(self):
        email = ""
        if self.email and len(self.email) > 0:
            email = Crypto.decrypt(self.email)
        return (f"User({self.id}, "
                f"\'{self.username}\', "
                f"{self.status}, "
                f"\'{email}\', "
                f"{self.created_at}, "
                f"\'{self.password_hash}\', "
                f"{self.confirmation_sent_at}, "
                f"\'{self.confirmation_token}\', "
                f"{self.seed_requested}, "
                f"{self.seed_version}, "
                f"{self.seeded_at}")

    def json(self) -> dict[str,Any]:
        return {
            "id": self.id,
            "username": self.username,
            "status": self.status.name,
            "created_at": self.created_at,
            "confirmation_sent_at": self.confirmation_sent_at,
            "seed_requested": self.seed_requested,
            "seed_version": self.seed_version,
            "seeded_at": self.seeded_at
        }
    

    @staticmethod
    def get_all() -> list[User]:
        users = db.session.scalars(db.select(User)).all()
        return list(users)


    @staticmethod
    def get(username: str) -> User:
        user = db.session.scalar(db.select(User).where(User.username == username))
        #if not user:
        #    raise ValueError(f"Invalid username '{username}'")
        return user


    @staticmethod
    def get_by_token(token: str) -> User:
        user = db.session.scalar(db.select(User).where(User.confirmation_token == token))
        return user
    

    @staticmethod
    def get_id(username: str) -> int:
        """
        Get the user_id for the given username
        """
        user = db.session.scalar(db.select(User).where(User.username == username))
        if user is None:
            raise ValueError(f"User '{username}' not found")
        return user.id


    @staticmethod
    def add(data: dict[str,Any]) -> User:
        """
        Add a new User to the database.
        """
        # Pull fields from dictionary
        username: str = data["username"]
        password: str = data["password"]
        email_addr: str = data["email"]
        status: UserStatus = data.get("status", UserStatus.pending)
        confirmation_token: str|None = data.get("token")
        confirmation_sent_at: datetime.datetime|None = data.get("confirmation_sent_at")
        seed_requested: bool = data.get("seed_requested", False)
        seed_version: int|None = data.get("seed_version")
        seeded_at: datetime.datetime|None = data.get("seeded_at")

        if not username:
            raise ValueError("Username is required.")
        username = username.strip()
        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters")
        elif len(username) > 100:
            raise ValueError("Username must be at most 100 characters")
            
        if not password:
            raise ValueError("Password is required.")
        password = password.strip()
        errors: list[str] = []
        if len(password) < 8:
            errors.append("Password must be at least 8 characters")
        elif len(password) > 100:
            errors.append("Password must be at most 100 characters")
        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")
        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")
        if not re.search(r"\d", password):
            errors.append("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
            errors.append("Password must contain at least one special character")
        if len(errors) > 0:
            raise ValueError(errors)

        if not email_addr:
            raise ValueError("Email address is required")
        email_info = validate_email(email_addr, check_deliverability=True)
        email_addr = email_info.normalized

        # Check whether this username is already in the database
        existing_user = db.session.scalar(db.select(User).where(User.username == username))
        if existing_user:
            raise ValueError(f"User '{username}' already exists")

        # Salt and hash the password
        password_hash_str = Crypto.hash_password(password)

        # Encrypt the user data.  Currently that is just the email address.
        encrypted_email_addr = None
        if email_addr and len(email_addr) > 0:
            encrypted_email_addr = Crypto.encrypt(email_addr)

        # Store the user record in the database
        now = datetime.datetime.now()
        confirmation_sent_at = None
        new_user_dao = User(
            username=username,
            status=status,
            email=encrypted_email_addr,
            created_at=now,
            password_hash=password_hash_str,
            confirmation_sent_at=confirmation_sent_at,
            confirmation_token=confirmation_token,
            seed_requested=seed_requested,
            seed_version=seed_version,
            seeded_at=seeded_at,
        )
        db.session.add(new_user_dao)

        return new_user_dao
    

    @staticmethod
    def verify(username: str, password: str) -> User:
        """
        Verify that the given user credentials are valid.
        """
        if not username:
            raise ValueError("Username is required")
        if not password:
            raise ValueError("Password is required")

        # Validate the credentials
        # Retrieve user record from database
        # I know that in the case of a validation failure you're not 
        # supposed to tell the caller whether the username or password 
        # was invalid, because that gives hackers more info.  But in the
        # interests of easier debugging, I'll take my chances here...
        user = User.get(username)

        # Make sure the user has been confirmed
        if user.status != UserStatus.confirmed:
            raise ValueError(f"User '{username}' has not been confirmed")

        # Validate the password.
        # Note that the salt is stored as part of the hash, rather than as a 
        # separarte value.  The bcrypt API knows how to separate them.
        password_hash_bytes = bytes(user.password_hash, "utf-8")
        password_bytes = bytes(password, "utf-8")
        if not Crypto.check_password(password_bytes, password_hash_bytes):
            raise ValueError(f"Incorrect password for username '{username}'")

        return user


##############################
# PREFERENCES
##############################
class Preferences(db.Model):
    """
    This stores user preferences like which table columns are visible.
    The context column indicates the thing to which the preferences apply.
    Example: "foods.columns"
    """
    __tablename__ = "preferences"
    __table_args__ = (db.UniqueConstraint("user_id", "context", name="uq_user_table_pref"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    context: Mapped[str] = mapped_column(db.String(50), nullable=False)
    preferences: Mapped[dict[str,Any]] = mapped_column(db.JSON, nullable=False)


    @staticmethod
    def get(user_id: int, context: str) -> dict[str,Any] | None:
        prefs_dao = db.session.scalar(select(Preferences).where(Preferences.user_id == user_id).where(Preferences.context == context))
        if not prefs_dao:
            return None;
        return prefs_dao.preferences;


    @staticmethod
    def save(user_id: int, context: str, prefs: dict[str,Any]) -> None:
        prefs_dao = db.session.scalar(select(Preferences).where(Preferences.user_id == user_id).where(Preferences.context == context))
        if prefs_dao:
            prefs_dao.preferences = prefs
        else:
            prefs_dao = Preferences()
            prefs_dao.user_id = user_id
            prefs_dao.context = context
            prefs_dao.preferences = prefs
        db.session.add(prefs_dao)


##############################
# NURITION
##############################
class Nutrition(db.Model):
    """
    This is the nutrition data that this app is intended to track.  It's basically
    the same data you see on a USDA nutrition label.

    Nutrition is a separate record because the same data fields are reused for 
    the Food, Recipe, and DailyLogItem tables.

    When used with the Food record, it represents the nutrition for one 
    serving of one food item.  It is then combined in the proper proportions to 
    calculate the nutrition for Recipes and DailyLogs.

    The Nutrition data is technically denormalized for the Recipe and DailyLogItem
    tables.  That is, we store it even though it's calculated from other records
    that are already stored in the database.  We do this for efficiency.
    It's more efficient to store it rather than load all the ingredient child
    records and recalculate the totals every time a Recipe or DailyLogItem record is
    viewed.  We just have to remember to recalculate and re-store the Nutrition
    data when necessary, such as when a Recipe's ingredients change.

    The Food, Recipe and DailyLogItem tables each have a 1-to-1 relationship with the
    Nutrition table.  Note that technically, the Nutrition record is the parent
    record in these relationships.  That is, instead of the Nutrition record having
    the ID of an associated Food, Recipe, or DailyLogItem record, those records have the
    ID of an associated Nutrition record.  This is because the Nutrition record is 
    reused -- it can't have foreign key relationships on all three of those tables,
    so we do it the other way around.

    This has one convenient side effect, which is that we can configure SQLAlchemy
    for "cascade deletes".  So when we delete a Food, Recipe or DailyLogItem record,
    the ORM layer also automatically deletes the associated Nutrition record
    without any coding on our part.  It can do this because the "child" record in
    these relationships (Food/Recipe/DailyLogItem) has the ID of the "parent"
    Nutrition record.
    """
    __tablename__ = "nutrition"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey("user.id"), nullable=False)
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

    def __init__(self, user_id: int, data: NutritionRequest | None = None):
        if data is not None:
            self.from_schema(user_id, data)

    def from_schema(self, user_id: int, data: NutritionRequest) -> None:
        self.user_id = user_id
        self.serving_size_description = data.serving_size_description
        self.serving_size_oz = data.serving_size_oz
        self.serving_size_g = data.serving_size_g
        self.calories = data.calories
        self.total_fat_g = data.total_fat_g
        self.saturated_fat_g = data.saturated_fat_g
        self.trans_fat_g = data.trans_fat_g
        self.cholesterol_mg = data.cholesterol_mg
        self.sodium_mg = data.sodium_mg
        self.total_carbs_g = data.total_carbs_g
        self.fiber_g = data.fiber_g
        self.total_sugar_g = data.total_sugar_g
        self.added_sugar_g = data.added_sugar_g
        self.protein_g = data.protein_g
        self.vitamin_d_mcg = data.vitamin_d_mcg
        self.calcium_mg = data.calcium_mg
        self.iron_mg = data.iron_mg
        self.potassium_mg = data.potassium_mg

    def __str__(self):
        return str(vars(self))

    def json(self) -> dict[str,Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
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
    user_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    recipe_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey("recipe.id"), nullable=True)
    food_ingredient_id: Mapped[int | None] = mapped_column(db.Integer, db.ForeignKey("food.id"), nullable=True)
    recipe_ingredient_id: Mapped[int | None] = mapped_column(db.Integer, db.ForeignKey("recipe.id"), nullable=True)
    ordinal: Mapped[int] = mapped_column(db.Integer, nullable=False)
    servings: Mapped[float] = mapped_column(db.Float, nullable=False, default=0)
    summary: Mapped[str | None] = mapped_column(db.String(100), nullable=True)

    def __init__(self, user_id: int, data: IngredientRequest):
        self.from_schema(user_id, data)

    def from_schema(self, user_id: int, ingredient_request: IngredientRequest) -> None:
        """Load Ingredient attributes from an IngredientRequest Pydantic schema."""
        if ingredient_request.id is not None:
            self.id = ingredient_request.id
        if ingredient_request.recipe_id is None:
            raise ValueError("recipe_id is required for Ingredient")
        if ingredient_request.ordinal is None:
            raise ValueError("ordinal is required for Ingredient")

        self.user_id = user_id
        self.recipe_id = ingredient_request.recipe_id
        self.food_ingredient_id = ingredient_request.food_ingredient_id
        self.recipe_ingredient_id = ingredient_request.recipe_ingredient_id
        self.ordinal = ingredient_request.ordinal
        self.servings = ingredient_request.servings

    def json(self) -> dict[str,Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "recipe_id": self.recipe_id,
            "food_ingredient_id": self.food_ingredient_id,
            "recipe_ingredient_id": self.recipe_ingredient_id,
            "ordinal": self.ordinal,
            "servings": self.servings,
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
        ingredients = db.session.scalars(db.select(Ingredient).where(Ingredient.user_id == user_id)).all()
        return list(ingredients)


    @staticmethod
    def get_all_for_recipe(user_id: int, recipe_id: int) -> list[Ingredient]:
        """
        Get all Ingredients for a Recipe
        """
        ingredients = db.session.scalars(db.select(Ingredient).where(Ingredient.user_id == user_id).where(Ingredient.recipe_id == recipe_id)).all()
        return list(ingredients)


    @staticmethod
    def get(user_id: int, ingredient_id: int) -> Ingredient:
        """
        Get one specififc Ingredient
        """
        ingredient = db.session.scalar(db.select(Ingredient).where(Ingredient.user_id == user_id).where(Ingredient.id == ingredient_id))
        if not ingredient:
            raise ValueError(f"Ingredient record not found for ID {ingredient_id}")
        return ingredient


    @staticmethod
    def add_from_schema(
        user_id: int,
        ingredient_request: IngredientRequest,
        keylists: dict[str,dict[int,int]] | None = None,
        recipe_id_override: int | None = None,
    ) -> Ingredient:
        """Create a new Ingredient record from a validated IngredientRequest schema."""
        recipe_id = recipe_id_override if recipe_id_override is not None else ingredient_request.recipe_id
        food_ingredient_id = ingredient_request.food_ingredient_id
        recipe_ingredient_id = ingredient_request.recipe_ingredient_id
        servings = ingredient_request.servings
        ordinal = ingredient_request.ordinal

        if recipe_id is None:
            raise ValueError("recipe_id is required")

        try:
            # If we have keylists, remap the keys
            if keylists:
                food_keys = keylists["foods"]
                recipe_keys = keylists["recipes"]
                recipe_id = recipe_keys[recipe_id]
                if food_ingredient_id:
                    food_ingredient_id = food_keys[food_ingredient_id]
                if recipe_ingredient_id:
                    recipe_ingredient_id = recipe_keys[recipe_ingredient_id]

            # Check whether a matching Ingredient record already exists
            ingredient_dao = db.session.scalar(
                db.select(Ingredient)
                .where(Ingredient.recipe_id == recipe_id)
                .where(Ingredient.food_ingredient_id == food_ingredient_id)
                .where(Ingredient.recipe_ingredient_id == recipe_ingredient_id)
            )
            if ingredient_dao:
                raise ValueError(f"Ingredient record {recipe_id}/{food_ingredient_id}/{recipe_ingredient_id} already exists")

            # Get the Recipe record
            recipe_dao = Recipe.get(user_id, recipe_id)

            # Get its Nutrition child record
            recipe_nutrition_dao = db.session.get(Nutrition, recipe_dao.nutrition_id)
            if not recipe_nutrition_dao:
                raise ValueError(f"Nutrition record {recipe_id}/{recipe_dao.nutrition_id} not found")

            # Sum ingredient nutrition into recipe nutrition
            if food_ingredient_id:
                food_ingredient_dao = Food.get(user_id, food_ingredient_id)

                ingredient_nutrition_dao = db.session.get(Nutrition, food_ingredient_dao.nutrition_id)
                if not ingredient_nutrition_dao:
                    raise ValueError(f"Ingredient record {food_ingredient_id}/{food_ingredient_dao.nutrition_id} not found")

                recipe_nutrition_dao.sum(ingredient_nutrition_dao, servings)
                price_per_serving = (food_ingredient_dao.price or 0) / food_ingredient_dao.servings
                recipe_dao.price = (recipe_dao.price or 0) + round(price_per_serving * servings, 2)

            elif recipe_ingredient_id:
                recipe_ingredient_dao = Recipe.get(user_id, recipe_ingredient_id)

                ingredient_nutrition_dao = db.session.get(Nutrition, recipe_ingredient_dao.nutrition_id)
                if not ingredient_nutrition_dao:
                    raise ValueError(f"Ingredient record {recipe_ingredient_id}/{recipe_ingredient_dao.nutrition_id} not found")

                recipe_nutrition_dao.sum(
                    ingredient_nutrition_dao,
                    servings,
                    1 / recipe_ingredient_dao.servings if recipe_ingredient_dao.servings else 0,
                )

                price_per_serving = (recipe_ingredient_dao.price or 0) / recipe_ingredient_dao.servings if recipe_ingredient_dao.servings else 0
                total_price = round(price_per_serving * servings, 2)
                recipe_dao.price = recipe_dao.price + total_price if recipe_dao.price else total_price

            else:
                raise ValueError("Either food_ingredient_id or recipe_ingredient_id must be provided")

            if ordinal is None:
                ordinal = db.session.scalar(select(func.count(Ingredient.id)).where(Ingredient.recipe_id == recipe_id))

            ingredient_payload = ingredient_request.model_copy(
                update={
                    "id": None,
                    "recipe_id": recipe_id,
                    "food_ingredient_id": food_ingredient_id,
                    "recipe_ingredient_id": recipe_ingredient_id,
                    "ordinal": ordinal,
                    "servings": servings,
                }
            )
            ingredient_dao = Ingredient(user_id, ingredient_payload)
            db.session.add(ingredient_dao)

            return ingredient_dao

        except Exception as e:
            raise ValueError(
                f"Ingredient record {recipe_id}/{food_ingredient_id}/{recipe_ingredient_id} could not be added: {str(e)}"
            )


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
    size_description_2: Mapped[str | None] = mapped_column(db.String(50), nullable=True)
    size_oz: Mapped[float | None] = mapped_column(db.Float, nullable=True)
    size_g: Mapped[int | None] = mapped_column(db.Integer, nullable=True)
    servings: Mapped[float] = mapped_column(db.Float, nullable=False)
    nutrition_id: Mapped[int | None] = mapped_column(db.Integer, db.ForeignKey("nutrition.id"), nullable=True)
    nutrition: Mapped[Nutrition] = relationship("Nutrition")
    price: Mapped[float | None] = mapped_column(db.Float, nullable=True)
    price_date: Mapped[datetime.date | None] = mapped_column(db.Date, nullable=True)
    shelf_life: Mapped[str | None] = mapped_column(db.String(150), nullable=True)

    def __init__(self, user_id: int, data: FoodRequest | None = None):
        if data is not None:
            self.from_schema(user_id, data)
        else:
            self.group = FoodGroup.other
            self.nutrition = Nutrition(user_id)

    def from_schema(self, user_id: int, food_request: FoodRequest) -> None:
        """Load Food attributes from a FoodRequest Pydantic schema."""
        if food_request.id:
            self.id = food_request.id
        self.user_id = user_id
        self.group = FoodGroup[food_request.group]
        self.name = food_request.name
        self.subtype = food_request.subtype
        self.description = food_request.description
        self.vendor = food_request.vendor
        self.size_description = food_request.size_description
        self.size_description_2 = food_request.size_description_2
        self.size_oz = food_request.size_oz
        self.size_g = food_request.size_g
        self.servings = food_request.servings
        self.price = food_request.price
        self.price_date = datetime.date.fromisoformat(food_request.price_date) if food_request.price_date else None
        self.shelf_life = food_request.shelf_life
        # Create nutrition record from nested schema
        if not self.nutrition:
            self.nutrition = Nutrition(user_id)
        self.nutrition.from_schema(user_id, food_request.nutrition)

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
            "size_description_2": self.size_description_2,
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
        food_daos = db.session.scalars(db.select(Food)).all()
        return list(food_daos)


    @staticmethod
    def get_all_for_user(user_id: int) -> list[Food]:
        food_daos = db.session.scalars(db.select(Food).where(Food.user_id == user_id).order_by("group", "name", "subtype")).all()
        return list(food_daos)


    @staticmethod
    def get(user_id: int, food_id: int) -> Food:
        food_dao = db.session.scalar(db.select(Food).where(Food.user_id == user_id).where(Food.id == food_id).order_by("group", "name", "subtype"))
        if not food_dao:
            raise ValueError(f"Food record not found for ID {food_id}")
        return food_dao


    @staticmethod
    def add(user_id: int, food: FoodRequest, keylists: dict[str,dict[int,int]] | None = None) -> Food:
        """
        Add a new Food record to the database.
        """
        try: 
            # Create a fresh Food DAO
            new_food_dao = Food(user_id)

            old_food_id = food.id
            # For import paths, keep old IDs only for mapping and let DB assign PKs.
            food_payload = food.model_copy(update={"id": None}) if keylists is not None else food
            new_food_dao.from_schema(user_id, food_payload)

            # Add the new record to the database
            db.session.add(new_food_dao)

            # Flush without committing to get the new IDs
            db.session.flush()

            # Save the old ID to new ID mapping (only if old_food_id is not None)
            if keylists is not None and old_food_id is not None:
                if not keylists.get("foods"):
                    keylists["foods"] = {}
                keylists["foods"][old_food_id] = new_food_dao.id

            return new_food_dao

        except Exception as e:
            raise ValueError("Food record could not be added: " + str(e))


    @staticmethod
    def update(user_id: int, food: FoodRequest) -> Food:
        """
        Update an existing Food record.
        """
        try:
            if food.id is None:
                raise ValueError("Food ID is required for update")

            food_id = food.id

            food_dao = db.session.get(Food, food_id)
            if not food_dao:
                raise ValueError(f"Food record {food_id} not found.")

            if not food_dao.nutrition:
                raise ValueError(f"Nutrition record for Food {food_id} not found")

            # Update the data fields from schema
            food_dao.from_schema(user_id, food)

            return food_dao

        except Exception as e:
            raise ValueError("Food record could not be updated: " + str(e))


    @staticmethod
    def delete(user_id: int, food_id: int) -> None:
        """
        Delete a particular Food record
        """
        try:
            # Get the Food record
            food_dao = db.session.get(Food, food_id)
            if not food_dao:
                raise ValueError(f"Food record {food_id} not found")

            # Food has a foreign key on Nutrition so it must be deleted first
            nutrition_id = food_dao.nutrition_id
            db.session.delete(food_dao)

            # Delete its associated Nutrition record qif it exists
            if nutrition_id:
                nutrition_dao = db.session.get(Nutrition, food_dao.nutrition_id)
                if nutrition_dao:
                    db.session.delete(nutrition_dao)

        except Exception as e:
            raise ValueError("Food record could not be deleted: " + str(e))


    @staticmethod
    def delete_all_for_user(user_id: int) -> None:
        """
        Delete all Food records for a particular User
        """
        logging.info(f"Deleting Food records for user {user_id}")
        try:
            food_daos = db.session.scalars(db.select(Food).where(Food.user_id == user_id)).all()
            for food_dao in food_daos:
                # Food has a foreign key on Nutrition so it must be deleted first
                nutrition_id = food_dao.nutrition_id
                db.session.delete(food_dao)

                # Delete its associated Nutrition record if it exists
                if nutrition_id:
                    nutrition_dao = db.session.get(Nutrition, nutrition_id)
                    if nutrition_dao:
                        db.session.delete(nutrition_dao)

        except Exception as e:
            raise ValueError(f"Food records could not be deleted for user {user_id}: {str(e)}")
        logging.info("Food records deleted")


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
    nutrition: Mapped[Nutrition] = relationship("Nutrition")
    price: Mapped[float | None] = mapped_column(db.Float, default=0, nullable=True)

    def __init__(self, user_id: int, data: RecipeRequest | None):
        if data:
            self.from_schema(user_id, data)
        else:
            self.nutrition = Nutrition(user_id)

    def from_schema(self, user_id: int, recipe_request: RecipeRequest) -> None:
        """Load Recipe attributes from a RecipeRequest Pydantic schema."""
        if recipe_request.id is not None:
            self.id = recipe_request.id
        self.user_id = user_id
        self.cuisine = recipe_request.cuisine
        self.name = recipe_request.name
        self.total_yield = recipe_request.total_yield
        self.servings = recipe_request.servings
        self.price = recipe_request.price

        # Create nutrition record from nested schema
        if not self.nutrition:
            self.nutrition = Nutrition(user_id)
        self.nutrition.from_schema(user_id, recipe_request.nutrition)

    def __str__(self):
        return str(vars(self))

    # Return a JSON representation of this Recipe object
    def json(self) -> dict[str,Any]:
        return {
            "id": self.id,
            "cuisine": self.cuisine,
            "name": self.name,
            "total_yield": self.total_yield,
            "servings": self.servings,
            "nutrition_id": self.nutrition_id,
            "nutrition": self.nutrition.json(),
            "price": self.price
            }
    

    @staticmethod
    def get_all() -> list[Recipe]:
        """
        Get all Recipe records
        """
        recipe_daos = db.session.scalars(db.select(Recipe)).all()
        return list(recipe_daos)


    @staticmethod
    def get_all_for_user(user_id: int) -> list[Recipe]:
        recipe_daos = db.session.scalars(db.select(Recipe).where(Recipe.user_id == user_id)).all()
        return list(recipe_daos)


    @staticmethod
    def get(user_id: int, recipe_id: int) -> Recipe:
        recipe_dao = db.session.scalar(db.select(Recipe).where(Recipe.user_id == user_id).where(Recipe.id == recipe_id))
        if not recipe_dao:
            raise ValueError(f"Recipe record not found for ID {recipe_id}")
        return recipe_dao


    @staticmethod
    def add_from_schema(user_id: int, recipe_request: RecipeRequest, keylists: dict[str,dict[int,int]] | None = None) -> Recipe:
        """Add a Recipe from a validated RecipeRequest schema."""
        try:
            # Create a fresh Recipe DAO and populate directly from schema.
            new_recipe_dao = Recipe(user_id, None)
            # For import paths, keep old IDs only for mapping and let DB assign PKs.
            recipe_payload = recipe_request.model_copy(update={"id": None}) if keylists is not None else recipe_request
            new_recipe_dao.from_schema(user_id, recipe_payload)

            db.session.add(new_recipe_dao)
            db.session.flush()

            # Persist child Ingredient records whenever they are provided.
            if recipe_request.ingredients:
                if not new_recipe_dao.nutrition:
                    raise ValueError("Nutrition record for new Recipe not found")

                new_recipe_dao.nutrition.reset()
                for ingredient_request in recipe_request.ingredients:
                    if keylists is not None and ingredient_request.recipe_id is not None:
                        Ingredient.add_from_schema(user_id, ingredient_request, keylists=keylists)
                    else:
                        Ingredient.add_from_schema(user_id, ingredient_request, recipe_id_override=new_recipe_dao.id)

                db.session.flush()
                new_recipe_dao = Recipe.recalculate(user_id, new_recipe_dao.id, new_recipe_dao, new_recipe_dao.nutrition)

            # Save the old ID to new ID mapping when available.
            if keylists is not None and recipe_request.id is not None:
                if not keylists.get("recipes"):
                    keylists["recipes"] = {}
                keylists["recipes"][recipe_request.id] = new_recipe_dao.id

            return new_recipe_dao
        except Exception as e:
            raise ValueError("Recipe record could not be added: " + str(e))


    @staticmethod
    def update_from_schema(user_id: int, recipe_request: RecipeRequest) -> Recipe:
        """Update a Recipe from a validated RecipeRequest schema."""
        try:
            if recipe_request.id is None:
                raise ValueError("Recipe ID is required for update")

            recipe_id = recipe_request.id

            # Get the existing Recipe record
            recipe_dao = Recipe.get(user_id, recipe_id)
            if not recipe_dao:
                raise ValueError(f"Recipe record {recipe_id} not found")

            if not recipe_dao.nutrition:
                raise ValueError(f"Nutrition record for Recipe {recipe_id} not found")

            # Update the Recipe fields from the validated schema.
            recipe_dao.from_schema(user_id, recipe_request)

            # Flush without committing to get any generated IDs
            db.session.flush()

            # Remove existing Ingredient records for this Recipe
            ingredient_daos = Ingredient.get_all_for_recipe(user_id, recipe_id)
            for ingredient_dao in ingredient_daos:
                db.session.delete(ingredient_dao)

            # Reset and rebuild nutrition from ingredients
            recipe_dao.nutrition.reset()

            for ingredient_request in recipe_request.ingredients:
                Ingredient.add_from_schema(user_id, ingredient_request, recipe_id_override=recipe_id)

            db.session.flush()

            recipe_dao = Recipe.recalculate(user_id, recipe_id, recipe_dao, recipe_dao.nutrition)
            #recipe_dao.nutrition.serving_size_description = recipe_request.nutrition.serving_size_description

            return recipe_dao
        except Exception as e:
            raise ValueError("Recipe record could not be updated: " + str(e))


    @staticmethod
    def update_recipe_ingredient(user_id: int, recipe_id: int, ingredient_id: int, servings: float) -> Recipe:
        """
        Update a Recipe's existing Ingredient record.
        """
        try:
            # Get the Ingredient record
            ingredient_dao = Ingredient.get(user_id, ingredient_id)

            # Update it
            ingredient_dao.servings = servings

            # Recompute the Recipe's Nutrition and price data
            recipe_dao = Recipe.recalculate(user_id, recipe_id)

            return recipe_dao
        except Exception as e:
            raise ValueError(f"Ingredient record {ingredient_id} could not be updated: {str(e)}")


    @staticmethod
    def delete_recipe_ingredient(user_id: int, recipe_id: int, ingredient_id: int) -> Recipe:
        """
        Update a Recipe's existing Ingredient record.
        """
        try:
            # Get the Ingredient record
            ingredient_dao: Ingredient|None = Ingredient.get(user_id, ingredient_id)

            # Delete it
            db.session.delete(ingredient_dao)

            # Recompute the Recipe's Nutrition and price data
            recipe_dao = Recipe.recalculate(user_id, recipe_id)

            return recipe_dao
        except Exception as e:
            raise ValueError(f"Ingredient record {ingredient_id} could not be deleted: {str(e)}")


    @staticmethod
    def delete(user_id: int, recipe_id: int) -> None:
        """
        Delete a particular Recipe record
        """
        try:
            # Get the Recipe record
            recipe_dao = Recipe.get(user_id, recipe_id)

            # Get its child Ingredient records
            ingredient_daos: list[Ingredient] = Ingredient.get_all_for_recipe(user_id, recipe_id)
            for ingredient_dao in ingredient_daos:
                # Delete each one
                db.session.delete(ingredient_dao)

            # Delete the Recipe record
            nutrition_id = recipe_dao.nutrition_id
            db.session.delete(recipe_dao)

            # Delete the associated Nutrition record
            if nutrition_id:
                nutrition_dao = db.session.get(Nutrition, nutrition_id)
                if nutrition_dao:
                    db.session.delete(nutrition_dao)

        except Exception as e:
            raise ValueError(f"Recipe record {recipe_id} could not be deleted: {str(e)}")


    @staticmethod
    def delete_all_for_user(user_id: int) -> None:
        """
        Delete all Recipes for a partiular user

        This is a little tricky because an Ingredient in one Recipe can reference
        another Recipe, so we can't necessarily delete a Recipe even when all its 
        own Ingredients have been removed.  So first we loop through all a User's
        Recipes and delete their Ingredients, and THEN we loop through the Recipes
        and delete them in a second pass.
        """
        logging.info(f"Deleting Recipe records for User {user_id}")
        try:
            # Get all the Recipe records
            recipe_daos = db.session.scalars(db.select(Recipe).where(Recipe.user_id == user_id)).all()
            for recipe_dao in recipe_daos:
                # Delete its child Ingredient records
                ingredient_daos: list[Ingredient] = Ingredient.get_all_for_recipe(user_id, recipe_dao.id)
                for ingredient_dao in ingredient_daos:
                    db.session.delete(ingredient_dao)

            # Flush so referential integrity won't be violated
            db.session.flush()

            # Now loop through the Recipes again and delete THEM this time, along 
            # with their associated Nutrition record
            for recipe_dao in recipe_daos:
                # Recipe has a foreign key on Nutrition so it must be deleted first
                nutrition_id = recipe_dao.nutrition_id
                db.session.delete(recipe_dao)

                # Delete its associated Nutrition record if it exists
                if nutrition_id:
                    nutrition_dao = db.session.get(Nutrition, nutrition_id)
                    if nutrition_dao:
                        db.session.delete(nutrition_dao)

        except Exception as e:
            raise ValueError(f"Recipe records could not be deleted for user {user_id}: {str(e)}")
        logging.info("Recipe records deleted")


    @staticmethod
    def recalculate(user_id: int, recipe_id: int, recipe_dao: Recipe | None = None, recipe_nutrition_dao: Nutrition | None = None) -> Recipe:
        """
        Recompute a Recipe's Nutrition data.  Intended to be called after one or more
        of the Recipe's Ingredients has been added, updated or deleted.
        """
        try:
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

            # Reset the nutrition and price otals
            recipe_nutrition_dao.reset()
            recipe_dao.price = 0

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

                # Add its price total
                if food_ingredient_dao and food_ingredient_dao.price:
                    recipe_dao.price = round(
                        recipe_dao.price + (food_ingredient_dao.price/food_ingredient_dao.servings * ingredient_dao.servings),
                        2,
                    )
                elif recipe_ingredient_dao and recipe_ingredient_dao.price:
                    recipe_dao.price = round(
                        recipe_dao.price + (recipe_ingredient_dao.price/recipe_ingredient_dao.servings * ingredient_dao.servings),
                        2,
                    )

            recipe_dao.price = round(recipe_dao.price, 2)

            return recipe_dao
        
        except Exception as e:
            raise ValueError(f"Unable to recalculate Nutrition for recipe {recipe_id}: {str(e)}")



##############################
# DAILY LOG
##############################
class DailyLogItem(db.Model):
    """
    A DailyLogItem record represents one item consumed on one day.
    There are multiple DailyLogItem records per user per date -- one per
    recipe consumed.

    Fields:
      date       - the calendar date the item was consumed
      recipe_id  - the Recipe that was consumed
      servings   - how many servings were consumed
        price      - denormalized total price for this consumed quantity,
                 captured at log time to preserve historical values
      ordinal    - display order within the day
      notes      - optional free-text note on this specific item
                   (e.g. "late night snack", "skipped half of it")
      nutrition_id - a Nutrition snapshot taken at log time, scaled by
                   servings consumed.  Stored so that later edits to the
                   Recipe do not alter the historical record.

    The nutrition snapshot is the recipe's per-serving nutrition multiplied
    by servings consumed.  Summing snapshots across all rows for a date range
    gives the totals for that period -- no joins into recipes or ingredients
    required at query time.

    Deletion of a DailyLogItem record also deletes its Nutrition snapshot,
    following the same FK pattern as Food and Recipe.
    """
    __tablename__ = "daily_log_item"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(db.Date, nullable=False, index=True)
    recipe_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey("recipe.id"), nullable=False)
    servings: Mapped[float] = mapped_column(db.Float, nullable=False)
    ordinal: Mapped[int] = mapped_column(db.Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(db.String(200), nullable=True)
    nutrition_id: Mapped[int | None] = mapped_column(db.Integer, db.ForeignKey("nutrition.id"), nullable=True)
    nutrition: Mapped["Nutrition | None"] = relationship("Nutrition")
    price: Mapped[float | None] = mapped_column(db.Float, default=0, nullable=True)

    def __init__(
        self,
        user_id: int,
        log_request: DailyLogItemRequest,
        ordinal: int,
        nutrition_id: int | None,
        dao_id: int | None = None,
    ):
        if dao_id is not None:
            self.id = dao_id
        self.user_id = user_id
        self.date = datetime.date.fromisoformat(log_request.date.strip())
        self.recipe_id = log_request.recipe_id
        self.servings = log_request.servings
        self.ordinal = ordinal
        self.notes = log_request.notes
        self.nutrition_id = nutrition_id

    def __str__(self) -> str:
        return str(vars(self))

    @staticmethod
    def calculate_price(recipe_price: float | None, recipe_servings: float, consumed_servings: float) -> float:
        if not recipe_price or recipe_servings <= 0:
            return 0.0
        return round((recipe_price / recipe_servings) * consumed_servings, 2)

    def json(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "date": self.date.isoformat(),
            "recipe_id": self.recipe_id,
            "servings": self.servings,
            "ordinal": self.ordinal,
            "notes": self.notes,
            "nutrition_id": self.nutrition_id,
            "nutrition": self.nutrition.json() if self.nutrition else None,
            "price": self.price,
        }


    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    @staticmethod
    def get_all() -> list[DailyLogItem]:
        """
        Get one specific DailyLogItem entry.
        """
        log_daos = db.session.scalars(db.select(DailyLogItem)).all()
        return list(log_daos)
        
    
    @staticmethod
    def get_all_for_user(user_id: int) -> list[DailyLogItem]:
        """
        Get one specific DailyLogItem entry.
        """
        log_daos = db.session.scalars(
            db.select(DailyLogItem)
            .where(DailyLogItem.user_id == user_id)
        ).all()
        return list(log_daos)
    

    @staticmethod
    def get(user_id: int, log_id: int) -> DailyLogItem:
        """
        Get one specific DailyLogItem entry.
        """
        log_dao = db.session.scalar(
            db.select(DailyLogItem)
            .where(DailyLogItem.user_id == user_id)
            .where(DailyLogItem.id == log_id)
        )
        if not log_dao:
            raise ValueError(f"DailyLogItem record not found for ID {log_id}")
        return log_dao


    @staticmethod
    def get_by_date(user_id: int, date: datetime.date) -> list[DailyLogItem]:
        """
        Return all DailyLogItem entries for a specific date, ordered by ordinal.
        """
        entries = db.session.scalars(
            db.select(DailyLogItem)
            .where(DailyLogItem.user_id == user_id)
            .where(DailyLogItem.date == date)
            .order_by(DailyLogItem.ordinal)
        ).all()
        return list(entries)


    @staticmethod
    def get_by_range(user_id: int, start: datetime.date, end: datetime.date) -> list[DailyLogItem]:
        """
        Return all DailyLogItem entries within an inclusive date range, ordered
        by date then ordinal.  Used for weekly and monthly summary views.
        """
        entries = db.session.scalars(
            db.select(DailyLogItem)
            .where(DailyLogItem.user_id == user_id)
            .where(DailyLogItem.date >= start)
            .where(DailyLogItem.date <= end)
            .order_by(DailyLogItem.date, DailyLogItem.ordinal)
        ).all()
        return list(entries)


    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    @staticmethod
    def add_from_schema(user_id: int, log_request: DailyLogItemRequest) -> DailyLogItem:
        """Add a DailyLogItem from a validated DailyLogItemRequest schema."""
        date = datetime.date.fromisoformat(log_request.date.strip())

        # Validate the Recipe and get its nutrition
        recipe_dao = Recipe.get(user_id, log_request.recipe_id)
        recipe_nutrition_dao = db.session.get(Nutrition, recipe_dao.nutrition_id)
        if not recipe_nutrition_dao:
            raise ValueError(f"Nutrition record for Recipe {log_request.recipe_id} not found")

        # Build nutrition snapshot
        snapshot = Nutrition(
            user_id,
            NutritionRequest(serving_size_description=recipe_nutrition_dao.serving_size_description),
        )
        modifier = (1.0 / recipe_dao.servings) if recipe_dao.servings else 0
        snapshot.sum(recipe_nutrition_dao, log_request.servings, modifier)
        db.session.add(snapshot)
        db.session.flush()

        ordinal = db.session.scalar(
            select(func.count(DailyLogItem.id))
            .where(DailyLogItem.user_id == user_id)
            .where(DailyLogItem.date == date)
        ) or 0

        log_dao = DailyLogItem(user_id, log_request, ordinal=ordinal, nutrition_id=snapshot.id)
        log_dao.price = DailyLogItem.calculate_price(recipe_dao.price, recipe_dao.servings, log_request.servings)
        db.session.add(log_dao)
        db.session.flush()

        return log_dao


    @staticmethod
    def update_from_schema(user_id: int, log_id: int, update_request: DailyLogItemUpdateRequest) -> DailyLogItem:
        """Update a DailyLogItem from a validated DailyLogItemUpdateRequest schema."""
        return DailyLogItem.update(user_id, log_id, update_request.servings, update_request.notes)

    @staticmethod
    def update(user_id: int, log_id: int, servings: float,
               notes: str | None = None) -> DailyLogItem:
        """
        Update the servings and/or notes on an existing DailyLogItem entry.

        Rebuilds the Nutrition snapshot in-place rather than diffing old vs
        new values -- simpler and less error-prone.
        """
        try:
            log_dao = DailyLogItem.get(user_id, log_id)

            # Rebuild the snapshot
            recipe_dao = Recipe.get(user_id, log_dao.recipe_id)
            recipe_nutrition_dao = db.session.get(Nutrition, recipe_dao.nutrition_id)
            if not recipe_nutrition_dao:
                raise ValueError(f"Nutrition record for Recipe {log_dao.recipe_id} not found")

            snapshot = db.session.get(Nutrition, log_dao.nutrition_id)
            if not snapshot:
                raise ValueError(f"Nutrition snapshot for DailyLogItem {log_id} not found")
            snapshot.reset()
            modifier = (1.0 / recipe_dao.servings) if recipe_dao.servings else 0
            snapshot.sum(recipe_nutrition_dao, servings, modifier)

            log_dao.servings = servings
            log_dao.notes = notes
            log_dao.price = DailyLogItem.calculate_price(recipe_dao.price, recipe_dao.servings, servings)

            return log_dao

        except Exception as e:
            raise ValueError(f"DailyLogItem entry {log_id} could not be updated: {str(e)}")


    @staticmethod
    def delete(user_id: int, daily_log_id: int) -> None:
        """
        Delete a DailyLogItem entry and its Nutrition snapshot.
        Re-ordinals the remaining entries for that date so there are no gaps.
        """
        try:
            log_dao = DailyLogItem.get(user_id, daily_log_id)

            # Close the ordinal gap left by this deletion
            siblings = DailyLogItem.get_by_date(user_id, log_dao.date)
            for sibling in siblings:
                if sibling.id != daily_log_id and sibling.ordinal > log_dao.ordinal:
                    sibling.ordinal -= 1

            # Delete the entry and its snapshot
            nutrition_id = log_dao.nutrition_id
            db.session.delete(log_dao)
            if nutrition_id:
                nutrition_dao = db.session.get(Nutrition, nutrition_id)
                if nutrition_dao:
                    db.session.delete(nutrition_dao)

        except Exception as e:
            raise ValueError(f"DailyLogItem entry {daily_log_id} could not be deleted: {str(e)}")


    @staticmethod
    def delete_all_for_user(user_id: int) -> None:
        """
        Delete all DailyLogItem entries for a user, including their Nutrition
        snapshots.  Called during account deletion.
        """
        try:
            daily_log_daos = db.session.scalars(
                db.select(DailyLogItem).where(DailyLogItem.user_id == user_id)
            ).all()
            for daily_log_dao in daily_log_daos:
                nutrition_id = daily_log_dao.nutrition_id
                db.session.delete(daily_log_dao)
                if nutrition_id:
                    nutrition_dao = db.session.get(Nutrition, nutrition_id)
                    if nutrition_dao:
                        db.session.delete(nutrition_dao)

        except Exception as e:
            raise ValueError(f"DailyLogItem records could not be deleted for user {user_id}: {str(e)}")
