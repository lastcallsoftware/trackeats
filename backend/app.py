import os
import re
from flask import Flask, jsonify, request, render_template, url_for, redirect
from flask_cors import CORS
from waitress import serve
from flask_jwt_extended import (JWTManager, jwt_required, create_access_token, get_jwt_identity)
from models import db, Ingredient, User
from datetime import datetime, timedelta
from bcrypt import hashpw, checkpw, gensalt

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


# HELPER FUNCTIONS
# ----------------
# Consider moving this stuff to a separate class or wrapper component

# Add a user to the database.  This does not issue a token; if registration is
# successful, the caller may then use the /login API to get a token using
# these same credentials.
def add_user(username: str, password: str, email: str) -> list[str]:
    # Add a catch-all try-except block, because who knows what could fail in
    # the ORM and JWT libraries we use here?  If there is a failure we want
    # to return our own error message instad of an exception stack!
    try:
        errors = []

        if not username:
            errors.append("Missing required value 'username'.")
        if len(username) < 3:
            errors.append("Username must be at least 3 characters.")
        if len(username) > 100:
            errors.append("Username must be at most 100 characters.")
        
        if not password:
            errors.append("Missing required value 'password'.")
        if len(password) < 8:
            errors.append("Password must be at least 8 characters.")
        if len(password) > 100:
            errors.append("Password must be at most 100 characters.")
        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter.")
        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter.")
        if not re.search(r"\d", password):
            errors.append("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
            errors.append("Password must contain at least one special character.")

        if email is not None and "@" not in email:
            errors.append("Email address must contain an @ character.")

        if len(errors) == 0:
            # Check whether this username is already in the database
            query = db.select(User).filter_by(username=username)
            existing_user = db.session.execute(query).first()
            if (existing_user is not None):
                errors.append(f"User {username} already exists")
            else:
                # Salt and hash the password
                # Note that the salt is stored as part of the hash, rather than as a 
                # separarte value.  The bcrypt API knows how to separate them.
                salt = gensalt()
                password_bytes = bytes(password, "utf-8")
                password_hash = hashpw(password_bytes, salt)
                password_hash_str = password_hash.decode("utf-8")

                # Store the credentials in the database
                now = datetime.now()
                new_user = User(username=username, active=True, issued=now, email=email, password_hash=password_hash_str)
                db.session.add(new_user)
                db.session.commit()
    except:
        errors.append("Internal server error: user could not be added")

    return errors

def validate_user(username: str, password: str) -> list[str]:
    errors = []

    try:
        if not username:
            errors.append("Missing required value 'username'")
        if not password:
            errors.append("Missing required value 'password'")

        if len(errors) == 0:
            # Validate the credentials
            # Retrieve user record from database
            # I know that in the case of a validation failure you're not supposed to 
            # tell the caller whether the username or password was invalid.  In the
            # interests of easier debugging, I'll take my chances here... :P
            query = db.select(User).filter_by(username=username)
            existing_users = db.session.execute(query).first()
            if (existing_users is None):
                errors.append(f"Invalid username {username}")
            else:
                existing_user = existing_users[0]
                password_hash_bytes = bytes(existing_user.password_hash, "utf-8")

                # Validate the password.
                # Note that the salt is stored as part of the hash, rather than as a 
                # separarte value.  The bcrypt API knows how to separate them.
                password_bytes = bytes(password, "utf-8")
                if (not checkpw(password_bytes, password_hash_bytes)):
                    errors.append(f"Invalid password for username {username}")
    except:
        errors.append("Internal server error: user could not be validated")

    return errors

# Log messages.  For now just print to console, eventually we'll replace with
# something more robust.
def log(message: str):
    print(datetime.now(), message)


# ROUTE HANDLERS
# --------------
# The heart of the Flask framework (flask) is its route handlers.  These are the
# functions that respond to various REST web service requests.

@app.route("/db/init", methods=["GET"])
def db_init():
    # To execute this function, the app needs to be running with a DB_USERID
    # with DDL privileges
    db.drop_all()
    db.create_all()

    return {"msg": "Initialization complete"}, 200

@app.route("/db/load", methods=["GET"])
def db_load():
    Ingredient.query.delete()
    milk = Ingredient(name="milk", serving_size="1 cup")
    butter = Ingredient(name="butter", serving_size="1 tbsp")
    db.session.add(milk)
    db.session.add(butter)
    db.session.commit()

    db.session.query(User).delete()
    add_user("admin", "Test*123", None)
    add_user("testuser", "Test*123", None)

    return {"msg": "Data load complete"}, 200

@app.route("/user", methods = ["GET"])
def get_users():
    if (request.method == "GET"):
        longform = False
        if (request.args.get("long") != None):
            longform = True
        users = User.query.all()
        data = []
        for user in users:
            if longform:
                data.append(user.__repr__())
            else:
                data.append(str(user))
        return jsonify(data)

@app.route("/health", methods = ["GET"])
def health():
    return {"msg": "Server OK"}, 200

@app.route("/register", methods=["POST"])
def register():
    errors = []

    # If it's not even JSON, don't bother checking anything else
    if not request.is_json:
        errors.append("Invalid request - not JSON")
    else:
        # Get parameters from request
        username = request.json.get('username', None)
        password = request.json.get('password', None)
        email = request.json.get('email', None)

        # Add the user to the database
        errors = add_user(username, password, email)

    if len(errors) > 0:
        error_str = "\n".join(errors)
        log(error_str)
        return jsonify({"msg": error_str}), 400
    else:
        msg = f"User {username} registered"
        log(msg)
        return jsonify({"msg": msg}), 200

@app.route("/login", methods = ["POST"])
def login():
    errors = []

    # If it's not even JSON, don't bother checking anything else
    if not request.is_json:
        errors.append("Invalid request - not JSON")
    else:
        # Get parameters from request
        username = request.json.get('username', None)
        password = request.json.get('password', None)

        # Validate the user
        errors = validate_user(username, password)

        access_token = None
        if (len(errors)) == 0:
            access_token = create_access_token(identity=username, expires_delta=timedelta(seconds=60))

    if (len(errors) > 0):
        error_str = "\n".join(errors)
        log(error_str)
        return jsonify({"msg": error_str}), 401
    else:
        log (f"User {username} authenticated, token sent")
        return jsonify(access_token=access_token), 200

@app.route("/ingredients", methods = ["GET"])
@jwt_required()
def hello_world():
    if (request.method == "GET"):
        ingredients = Ingredient.query.all()
        data = []
        for ingredient in ingredients:
            data.append({"name": ingredient.name, "serving_size": ingredient.serving_size})
        return jsonify(data), 200

@app.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    # Access the identity of the current user with get_jwt_identity
    current_user = get_jwt_identity()
    return jsonify(logged_in_as=current_user), 200

if __name__ == "__main__":
    serve(app, listen="*:5000")
