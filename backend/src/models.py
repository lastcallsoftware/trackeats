from flask_sqlalchemy import SQLAlchemy
from crypto import decrypt

# Instantiate the database connector.
db = SQLAlchemy()

# SQL ALCHEMY ORM MODELS
# ----------------------
# We're using a library (flask-sqlalchemy) that handles database interactions
# for us.  These are the classes that represent the various records in the
# database.

class Ingredient(db.Model):
    __tablename__ = "ingredient"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    serving_size = db.Column(db.String(32), nullable=False)

    def __str__(self):
        return f"<Ingredient {self.name}, serving size: {self.serving_size}>"
    def __repr__(self):
        return f"Ingredient({self.name}, {self.serving_size})"


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), index=True, nullable=False)
    active = db.Column(db.Boolean, nullable=False)
    email = db.Column(db.LargeBinary, nullable=True)
    issued = db.Column(db.DateTime, nullable=False)
    password_hash = db.Column(db.String(64), nullable=False)

    def __str__(self):
        return f"<User {self.id} {self.username}, active: {self.active}, issued: {self.issued}>"
    def __repr__(self):
        email = ""
        if self.email and len(self.email) > 0:
            email = decrypt(self.email)
        return f"User({self.id}, \'{self.username}\', {self.active}, \'{email}\', {self.issued}, \'{self.password_hash}\')"
