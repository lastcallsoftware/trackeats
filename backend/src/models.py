from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import Mapped, mapped_column
from crypto import decrypt
import enum
import datetime

# Instantiate the database connector.
db = SQLAlchemy()

# SQL ALCHEMY ORM MODELS
# ----------------------
# We're using a library (flask-sqlalchemy) that handles database interactions
# for us.  These are the classes that represent the various records in the
# database.

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
    price_date = db.Column(db.DateTime)
    shelf_life = db.Column(db.String(100))

    def __str__(self):
        return str(vars(self))
    def json(self):
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
            "price_date": datetime.datetime.strftime(self.price_date, "%d %b %Y"),
            "shelf_life": self.shelf_life
            }


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