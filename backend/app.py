import os
from flask import Flask, jsonify, request, render_template, url_for, redirect
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
#from models import Ingredient
#from loaddb import loaddb

app = Flask(__name__)

# Configure a couple Flask-SQLAlchemy config values.
# For all SQLAlchemy config settings, see https://flask-sqlalchemy.palletsprojects.com/en/2.x/config/
#
# SQLALCHEMY_DATABASE_URI is the URI of the database.
# The sample used a toy database called SQLite.  I just deleted the URI for that, I'll never use it.
app.config['SQLALCHEMY_DATABASE_URI'] = "mysql+mysqlconnector://mysql-admin:inSANE*32@trackeats.com/trackeats"
# SQLALCHEMY_TRACK_MODIFICATIONS disables the tracking of changes to objects.
# This just saves memory by turning off a monitoring feature.
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Instantiate the database.
db = SQLAlchemy(app)

class Ingredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    serving_size = db.Column(db.String(32), nullable=False)

    def __repr__(self):
        return f"<Ingredient {self.name} {self.serving_size}>"

@app.route("/init", methods=["GET"])
def init():
    db.drop_all()
    db.create_all()

    milk = Ingredient(name="milk", serving_size="1 cup")
    butter = Ingredient(name="butter", serving_size="1 tbsp")
    db.session.add(milk)
    db.session.add(butter)
    db.session.commit()
    return "Initialization complete"

@app.route("/ingredients", methods = ["GET"])
def hello_world():
    if (request.method == "GET"):
        ingredients = Ingredient.query.all()
        data = []
        for ingredient in ingredients:
            data.append({"name": ingredient.name, "serving_size": ingredient.serving_size})
#        data = ({"name":"milk", "serving_size":"1 cup"},
#                {"name":"butter", "serving_size":"1 tbsp"})
        return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)
