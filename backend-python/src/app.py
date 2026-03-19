import os
import sys
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from waitress import serve
from models import db
from dotenv import load_dotenv
from routes import bp
import logging
from crypto import load_key
from data import Data


# STARTUP
# -------
# Instantiate the Flask framework and register the "blueprints" (i.e., web
# services) defined in routes.py.
app = Flask(__name__)
app.register_blueprint(bp)

# Configure the logger.  Any downstream modules will inherit this config.
logging.basicConfig(level=logging.DEBUG, 
                    format='%(asctime)s %(levelname)s: %(message)s')

# LOAD CONFIG
# -----------
# We're using a standard Python library (python-dotenv) to assist with 
# accessing config files.
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
# As with any dictionary, os.environ can be read using an index (e.g., 
# os.environ["MY_VALUE"]), or by calling os.environ.get("MY_VALUE").

# Use a flag to indicate a fatal error.  We don't call sys.exit() immediately
# because I want to check ALL the environment variables first, so you don't
# have to play whack-a-mole with missing vars.
fatal_error = False

env_file = ".env"
load_dotenv(env_file)
#env_values = dotenv_values(env_file)
env = os.environ.get("ENV", "DEV")
logging.info(f"Execution environment: {env}")

# BACKEND_BASE_URL is the name of THIS server.  We need it to build the links
# we put in confirmation emails.
hostname = os.environ.get("BACKEND_BASE_URL")
if (hostname is None):
    logging.error("BACKEND_BASE_URL not specified - exiting.")
    fatal_error = True
else:
    logging.info("BACKEND_BASE_URL: " + hostname)


# INITIALIZE DATABASE CONNECTION
# ------------------------------
# We're using a library (mysql-connector-python) that handles the MySQL database 
# connection for us.  Initialize it here.
db_protocol = os.environ.get('DB_PROTOCOL', 'mysql+mysqlconnector://')
db_user = os.environ.get('DB_USER', 'trackeats-backend-mysql')
db_password = os.environ.get('DB_PASSWORD')
db_hostname = os.environ.get('DB_HOSTNAME')
db_name = os.environ.get('DB_NAME', 'trackeats')
if (db_hostname == None or len(db_hostname) == 0):
    logging.error("DB_HOSTNAME not specified - exiting.")
    fatal_error = True
if (db_password == None or len(db_password) == 0):
    logging.error("DB_PASSWORD not specified - exiting.")
    fatal_error = True
if (fatal_error):
    sys.exit(0)
db_connection_uri = f"{db_protocol}{db_user}:{db_password}@{db_hostname}/{db_name}"
db_safe_connection_uri = f"{db_protocol}{db_user}:DB_PASSWORD@{db_hostname}/{db_name}"
logging.info(f"Connecting to database: {db_safe_connection_uri}")

# Configure Flask-SQLAlchemy.
# For all Flask-SQLAlchemy config settings, see https://flask-sqlalchemy.palletsprojects.com/en/2.x/config/
# SQLALCHEMY_DATABASE_URI is the URI of the database.
app.config['SQLALCHEMY_DATABASE_URI'] = db_connection_uri
# The SQLALCHEMY_TRACK_MODIFICATIONS setting controls "the tracking of changes to objects".
# Disabling it saves memory by turning off an unnecessary monitoring feature.
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Instantiate the database connector.
db.init_app(app)

# Test the database connection.  Just calling "db.engine.connect()" is insufficient 
# because it only tests the network connection, it doesn't try to log on.  So we try 
# to run an actual query -- once which doesn't actually do anything, but finishes
# quickly.
def verify_database_connection():
    try:
        with app.app_context():
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1 as test"))
    except SQLAlchemyError as e:
        return "Could not connect to database: " + repr(e)
    return None

def initialize_database():
    try:
        with app.app_context():
            Data.init_db()
    except SQLAlchemyError as e:
        return "Could not connect to database: " + repr(e)
    return None

errmsg = verify_database_connection()
if (errmsg):
    logging.error(errmsg)
    sys.exit(0)

errmsg = initialize_database()
if (errmsg):
    logging.error(errmsg)
    sys.exit(0)

logging.info("Database connection verified.")


# INITIALIZE JWT MANAGER
# ----------------------
# We're using a library (flask-jwt-extended) that handles token management for
# us.  Intialize it here.
# The key can be anything ("Secret_key" works, for example), but of course you'd
# prefer it to be something rather harder to guess!
try:
    keyfile = os.environ.get("BACKEND_ENCRYPTION_KEY", "trackeats-backend-encryption.key")
    
    # The key file MUST be stored in the "JWT_SECRET_KEY" app.config value.
    app.config['JWT_SECRET_KEY'] = load_key(keyfile)

    # With that value properly stored, we can now initialize the token manager.
    jwt = JWTManager(app)
except Exception as e:
    logging.error(f"Error iniitializing token manager: " + repr(e))
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
#TODO: fix this!
CORS(app, expose_headers=["Location"])


if __name__ == "__main__":
    serve(app, listen="*:5000")
