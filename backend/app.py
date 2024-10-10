import os
from flask import Flask, jsonify, request, render_template, url_for, redirect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from waitress import serve
from flask_jwt_extended import (JWTManager, jwt_required, create_access_token, get_jwt_identity)

#from models import Ingredient
#from loaddb import loaddb

app = Flask(__name__)


# INITIALIZE DATABASE CONNECTOR
# -----------------------------
# We're using a library (mysql-connector-python) that handles the MySQL database 
# connection for us.  Initialize it here.

# For now, store database userID/password/hostname in environment variables.
# I'll figure out some better secret-storage mechanism eventually.
db_protocol = os.environ.get('DB_PROTOCOL', 'mysql+mysqlconnector')
db_user = os.environ.get('DB_USER', 'trackeats-backend-mysql')
db_password = os.environ['DB_PASSWORD']
db_hostname = os.environ.get('DB_HOSTNAME', 'trackeats.com')
db_name = os.environ.get('DB_NAME', 'trackeats')

# Configure a couple Flask-SQLAlchemy config values.
# For all SQLAlchemy config settings, see https://flask-sqlalchemy.palletsprojects.com/en/2.x/config/
# SQLALCHEMY_DATABASE_URI is the URI of the database.
app.config['SQLALCHEMY_DATABASE_URI'] = f"{db_protocol}://{db_user}:{db_password}@{db_hostname}/{db_name}"
# SQLALCHEMY_TRACK_MODIFICATIONS disables the tracking of changes to objects.
# This just saves memory by turning off a monitoring feature.
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Instantiate the database connector.
db = SQLAlchemy(app)


# INITIALIZE JWT MANAGER
# ----------------------
# We're using a library (flask-jwt-extended) that handles token management for
# us.  Intialize it here.

# Define the key to use for signing and validating tokens.
# Eventually we'll specify a real crypto key here, but for now let's fake it.
app.config['JWT_SECRET_KEY'] = 'super-secret'  # Change this!
jwt = JWTManager(app)


# SET CORS POLICY
# ---------------
# We're using a library (flask-cors) that handles CORS policy for us.  
# Initialize it here.
#
# Background
# Tricking web apps into sending/retrieving data to/from a different URL than 
# was intended is a common strategy employed by attackers, so modern browsers 
# have a policy (Cross Origin Resource Sharing, Or CORS) that by default 
# prohibits interactions with URLs from a different origin (i.e., a different 
# web protocol, domain name, or port than the web app was originally served 
# from).
# 
# Even though our front end and back end will be running on the same server,
# they will have different port numbers, which would therefore prevent them from
# communicating.  So we have to fix this!
#
# To do that, the server receiving the HTTP request must set a header in its 
# HTTP response indicating which URLs are allowed to make the request.
#
# Note that this policy is enforced by the BROWSER.  To be clear, this doesn't
# refer to the front-end app that runs IN the browser, but to the browser 
# itself -- Chrome, for example.  When the front-end app makes a request, the 
# response first goes through the browser.  The browser reads the list of 
# allowed requesters (i.e., the CORS headers) in the response and sees if its 
# own URL is in there, and if not it says, "Oh, we're not allowed to make this 
# request!",and then instead of giving the response to the front-end app, it
# instead gives it an error.
#
# Note that it is entirely possible to make requests to the back end that do NOT
# go through a web browser -- for example, via the curl tool.  Such tools don't
# care about CORS headers, so this whole CORS thing does exactly nothing in 
# their case.  But CORS isn't about securing the data requested from the back 
# end, it's about preventing web apps (which run in trusted browsers) from being 
# fooled into requesting/delivering data to/from the wrong servers.
#
# We could set the proper HTTP response header manually (it's the
# Access-Control-Allow-Origin header), but there's a little plugin library 
# (flask-cors) that automagically does this for us with just one line of code,
# so we'll use that.
#
# In production, we'll need to account for port 443 (that's the HTTPS port), 
# maybe port 80 (the regular HTTP port), and maybe maybe port 8080 (used for
# testing HTTP because Linux, annoyingly, prohibits the use of port nummbers 
# under 1024).
#CORS(app, origins=["http://localhost:80", "http://localhost:443", "http://localhost:8080",
#                   "http://www.trackeats.com:80", "http://www.trackeats.com:443", "http://www.trackeats.com:8080"])
CORS(app)


# SQL ALCHEMY ORM MODELS
# ----------------------
# We're using a library (flask-sqlalchemy) that handles database interactions
# for us.  These are the classes that represent the various records in the
# database.
# This should probably be in its own .py file but I haven't worked out how to do
# that yet.

class Ingredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    serving_size = db.Column(db.String(32), nullable=False)

    def __repr__(self):
        return f"<Ingredient {self.name} {self.serving_size}>"


# ROUTE HANDLERS
# --------------
# The heart of the Flask framework (flask) is its route handlers.  These are the
# functions that respond to various REST web service requests.

@app.route("/init", methods=["GET"])
def init():
    db.drop_all()
    db.create_all()

    # set up a couple records to play with
    milk = Ingredient(name="milk", serving_size="1 cup")
    butter = Ingredient(name="butter", serving_size="1 tbsp")
    db.session.add(milk)
    db.session.add(butter)
    db.session.commit()
    return "Initialization complete"

@app.route("/health", methods = ["GET"])
def health():
    return "Server OK", 200

@app.route("/ingredients", methods = ["GET"])
def hello_world():
    if (request.method == "GET"):
        ingredients = Ingredient.query.all()
        data = []
        for ingredient in ingredients:
            data.append({"name": ingredient.name, "serving_size": ingredient.serving_size})
        return jsonify(data)

@app.route("/register", methods=["POST"])
def register():
    if not request.is_json:
        return jsonify({"message": "Invalid request - not JSON"}), 400

    username = request.json.get('username', None)
    password = request.json.get('password', None)
    print(f"Username: {username}, Password: {password}")
    if not username:
        return jsonify({"message": "Missing required value 'username'"}), 400
    if not password:
        return jsonify({"message": "Missing required value 'password'"}), 400

    # Store the credentials to the database
    # For now just pretend
    return jsonify({"message": "User registered"}), 200

@app.route("/login", methods = ["POST"])
def login():
    if not request.is_json:
        return jsonify({"message": "Invalid request - not JSON"}), 400

    username = request.json.get('username', None)
    password = request.json.get('password', None)
    print(f"Username: {username}, Password: {password}")
    if not username:
        return jsonify({"message": "Missing required value 'username'"}), 400
    if not password:
        return jsonify({"message": "Missing parequiredssword value 'password'"}), 400

    # Validate the credentials
    # For now just hardcode them to have to be test/test
    # Eventually replace this with a call to the database to get the values
    if username != 'test' or password != 'testtest':
        return jsonify({"message": "Invalid username or password"}), 401

    # Create and return an access token
    # For now we're accepting most of the default creation parameters (which is
    # really the main reason to use this library in the first place)
    access_token = create_access_token(identity=username)
    return jsonify(access_token=access_token), 200

if __name__ == "__main__":
    serve(app, listen="*:5000")
