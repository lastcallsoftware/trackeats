import os
import sys
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from waitress import serve
from models import db, User
from dotenv import load_dotenv
from routes import bp
from logger import log

# STARTUP
# -------
# Instantiate the Flask framework and register the "blueprints" (i.e., web
# services) defined in routes.py.
app = Flask(__name__)
app.register_blueprint(bp)


# LOAD CONFIG
# -----------
# We're using a library (python-dotenv) to assist with accessing config files.
#
# load_dotenv("filename") loads values from the specified filename, or the 
# ".env" file is no filename is given, and stores them as environment variables.
# Any values read in this manner will NOT override existing environment 
# variables.
#
# dotenv_values("filename") functions similarly, except it returns the values
# as a dictionary rather than stuffing them into environment variables.  This
# function also supports "expension": referencing the value of other
# previously-defined environment variables using the ${VAR_NAME} syntax.
#
# Environment variables can be acccessed using os.environ or os.getenv().
# os.environ can be read as a dictionary (i.e., os.environ["MY_VALUE"]),
# or by calling os.environ.get("MY_VALUE").  The latter is usually preferable
# because the former throws an exception if the value is not defined, whereas
# .get() just returns None.  Also, .get() allows you to speecify a default
# value to use if the value is not defined.
env = os.environ.get("ENV", "DEV")
log(f"Execution environment: {env}")
if (env == "PROD"):
    load_dotenv(".env.production")
else:
    load_dotenv(".env")


# INITIALIZE DATABASE CONNECTION
# ------------------------------
# We're using a library (mysql-connector-python) that handles the MySQL database 
# connection for us.  Initialize it here.
db_protocol = os.environ.get('DB_PROTOCOL', 'mysql+mysqlconnector://')
db_user = os.environ.get('DB_USER', 'trackeats-backend-mysql')
db_password = os.environ.get('DB_PASSWORD')
db_hostname = os.environ.get('DB_HOSTNAME')
db_name = os.environ.get('DB_NAME', 'trackeats')
exit_now = False
if (db_hostname == None or len(db_hostname) == 0):
    log("DB_HOSTNAME not specified - exiting.")
    exit_now = True
if (db_password == None or len(db_password) == 0):
    log("DB_PASSWORD not specified - exiting.")
    exit_now = True
if (exit_now):
    sys.exit(0)
db_connection_uri = f"{db_protocol}{db_user}:{db_password}@{db_hostname}/{db_name}"
db_safe_connection_uri = f"{db_protocol}{db_user}:DB_PASSWORD@{db_hostname}/{db_name}"
log(f"Connecting to database: {db_safe_connection_uri}")

# Configure Flask-SQLAlchemy.
# For all Flask-SQLAlchemy config settings, see https://flask-sqlalchemy.palletsprojects.com/en/2.x/config/
# SQLALCHEMY_DATABASE_URI is the URI of the database.
app.config['SQLALCHEMY_DATABASE_URI'] = db_connection_uri
# The SQLALCHEMY_TRACK_MODIFICATIONS setting controls "the tracking of changes to objects".
# Disabling it saves memory by turning off an unnecessary monitoring feature.
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Instantiate the database connector.
db.init_app(app)

# Test the database.  Just calling "db.engine.connect()" is insufficient because
# it only tests the network connection, it doesn't try to log on.  So we try to
# run an actual query -- once which doesn't actually do anything, but finishes
# quickly.
# The most likely reason for a failure is that the password is invalid.  This 
# results in a SQLAlchemy "ProgrammingError" exception -- rather than something 
# informative, like, say, an "InvalidPasswordError".  It also gives an exception 
# stack that doesn't even indicate this *file* as the source of the failure, let 
# alone this function.
# BAD CODING, SQLAlchemy nerds!
def test_db_connection():
    try:
        with app.app_context():
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1 as test"))
    except ProgrammingError:
        return "Could not connect to database - Access denied."
    except:
        return "Could not connect to database - Internal server error."
    return None

errmsg = test_db_connection()
if (errmsg):
    log (errmsg)
    sys.exit(0)
log("Database connection verified.")


# INITIALIZE JWT MANAGER
# ----------------------
# We're using a library (flask-jwt-extended) that handles token management for
# us.  Intialize it here.

# Define the key to use for signing and validating tokens.
# Eventually we'll specify a real crypto key here, but for now let's fake it.

secret_key = ""
keyfile = "keyfile.key"
if not os.path.exists(keyfile):
    log(f"Key file does not exist: {keyfile} -- exiting.")
    sys.exit(0)
try:
    with open(keyfile, "rb") as file:
        secret_key = file.read()
    app.config['JWT_SECRET_KEY'] = secret_key
    jwt = JWTManager(app)
except OSError:
    log(f"Could not read key file: {keyfile} -- exiting")
    sys.exit(0)


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


# When the boilerplate code was generated, this used Flask's built-in WSGI server:
#   app.run(debug=True)
#...but I have updated it to use the Waitress server.  It is also possible to run
# Waitress directly from 
if __name__ == "__main__":
    serve(app, listen="*:5000")
