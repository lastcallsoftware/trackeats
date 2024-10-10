import os
from flask import Flask, jsonify, request, render_template, url_for, redirect
from flask_cors import CORS
from waitress import serve
from flask_jwt_extended import (JWTManager, jwt_required, create_access_token, get_jwt_identity)
from models import db, Ingredient, User
from datetime import datetime

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
db.init_app(app)


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

# In production, we'll need to account for port 443, 80, and maybe maybe 8080.
#CORS(app, origins=["http://localhost:80", "http://localhost:443", "http://localhost:8080",
#                   "http://www.trackeats.com:80", "http://www.trackeats.com:443", "http://www.trackeats.com:8080"])

# I haven't worked out the correct domain names yet, so for now just allow
# EVERYTHING.  This isn't secure, obviously, but I'll take my chances!
CORS(app)


# ROUTE HANDLERS
# --------------
# The heart of the Flask framework (flask) is its route handlers.  These are the
# functions that respond to various REST web service requests.

@app.route("/db/init", methods=["GET"])
def init():
    # To execute this function, the app needs to be running with 
    db.drop_all()
    db.create_all()

    return "Initialization complete", 200

@app.route("/db/load", methods=["GET"])
def init():
    # set up a couple records to play with
    db.session.delete("ingredient")
    milk = Ingredient(name="milk", serving_size="1 cup")
    butter = Ingredient(name="butter", serving_size="1 tbsp")
    db.session.add(milk)
    db.session.add(butter)
    db.session.commit()

    # we don't have a register API yet so create a user record
    db.session.delete("user")
    now = datetime.now()
    admin_user = User(username="admin", active=True, issued=now, password_hash="ABC123")
    test_user = User(username="test", active=True, issued=now, password_hash="ABC123")
    db.session.add(admin_user)
    db.session.add(test_user)
    db.session.commit()

    return "Data load complete", 200

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
    existing_user = User.query()

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
