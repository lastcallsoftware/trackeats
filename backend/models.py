
from flask_sqlalchemy import SQLAlchemy

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

    def __repr__(self):
        return f"<Ingredient {self.name} {self.serving_size}>"


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    active = db.Column(db.Boolean, nullable=False)
    username = db.Column(db.String(100), index=True, nullable=False)
    email = db.Column(db.String(120), nullable=True)
    issued = db.Column(db.DateTime, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    salt = db.Column(db.String(32), nullable=True)

    def __repr__(self):
        return f"<User {self.id} {self.username} active: {self.active} issued: {self.issued}>"
