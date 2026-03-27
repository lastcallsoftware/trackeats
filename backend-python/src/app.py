import os
import sys
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from waitress import serve
from models import db
from dotenv import load_dotenv
from routes import bp
import logging
from crypto import Crypto
from data import Data


def minimal_app_config() -> Flask:
    """
    This is the minimum app config needed for the database migration code to work.
    """
    # STARTUP
    # -------
    # Instantiate the Flask framework.
    app = Flask(__name__)

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
    load_dotenv( ".env")

    # See if we're running in debug mode.
    debug_mode = os.environ.get("FLASK_DEBUG")
    if debug_mode == "1":
        logging.info("Running in FLASK_DEBUG mode")

    # INITIALIZE DATABASE CONNECTION
    # ------------------------------
    # We're using a library (mysql-connector-python) that handles the MySQL database 
    # connection for us.  Initialize it here.
    db_protocol = os.environ.get('DB_PROTOCOL', 'mysql+mysqlconnector://')
    db_database_name = os.environ.get('DB_DATABASE_NAME', 'trackeats')
    db_app_username = os.environ.get('DB_APP_USERNAME', 'trackeats-backend-mysql')

    db_hostname = os.environ.get('DB_HOSTNAME')
    if not db_hostname:
        logging.error("DB_HOSTNAME is missing -- exiting.")
        sys.exit(0)

    db_app_password = os.environ.get('DB_APP_PASSWORD')
    if not db_app_password:
        logging.error("DB_APP_PASSWORD is missing -- exiting.")
        sys.exit(0)

    db_connection_uri = f"{db_protocol}{db_app_username}:{db_app_password}@{db_hostname}/{db_database_name}"
    db_safe_connection_uri = f"{db_protocol}{db_app_username}:DB_APP_PASSWORD@{db_hostname}/{db_database_name}"
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

    # Instantiate the Flask migration object.  This thing is basically why I split the 
    # app setup into two separate functions.  The "minimal" config is what's needed to
    # run "flask db upgrade" from the command line.
    Migrate(app, db)

    # Register the app's "blueprints" -- the REST endpoints defined in routes.py.
    app.register_blueprint(bp)

    return app


def additional_app_config(app: Flask):
    """
    This is additional config beyond the minimum, needed for the full app to run.
    """
    # BACKEND_BASE_URL
    # ----------------
    # This is just the name of THIS server.  We need it to build the links we put in
    # confirmation emails.
    hostname = os.environ.get("BACKEND_BASE_URL")
    if (hostname is None):
        logging.error("BACKEND_BASE_URL is missing -- exiting.")
        exit(0)
    logging.info("BACKEND_BASE_URL: " + hostname)

    # INITIALIZE JWT LIB
    # ------------------
    # We're using a library (flask-jwt-extended) that handles JWT token management.
    # It requires a key to be in the app context.  It should already be in the environment,
    # just copy it over.
    jwt_secret_key = os.environ.get("JWT_SECRET_KEY")
    if not jwt_secret_key:
        logging.error("JWT_SECRET_KEY is missing -- exiting.")
        exit(0)
    app.config['JWT_SECRET_KEY'] = jwt_secret_key
    JWTManager(app)

    # INITIALIZE CRYPTO LIB
    # ---------------------
    # We use a symmetric key to encrypt/decrypt sensitive data like the user's email address.
    # Unlike the password, which we NEVER decrypt, we do need to decrypt these other values.
    symmetric_key_b64 = os.environ.get("BACKEND_ENCRYPTION_KEY_B64")
    if not symmetric_key_b64:
        logging.error("BACKEND_ENCRYPTION_KEY_B64 is missing -- exiting.")
        exit(0)
    Crypto.initialize(symmetric_key_b64)

    # SET CORS POLICY
    # ---------------
    # CORS (Cross-Origin Resource Policy) is an HTTP-header-based security mechanism 
    # intended to stop man-in-the-middle attacks.  It allows a server to indicate any origins 
    # (domain, scheme, or port) other than its own from which a browser should permit loading
    # resources.  It's needed any time an app running in a browser at one domain accesses 
    # resources or API endpoints running in a different domain. 
    # 
    # Crucially, CORS policy is enforced by the browser, not the app server, so you can't
    # really disable it.  You *can* configure it to be maximally permissive, but obviously
    # that's not great.
    # 
    # We're using a library (flask-cors) that handles CORS policy for us.  
    #
    # In production, we'll need to account for port 443, 80, and maybe maybe 8080.
    #CORS(app, origins=["http://localhost:80", "http://localhost:443", "http://localhost:8080",
    #                   "http://www.trackeats.com:80", "http://www.trackeats.com:443", "http://www.trackeats.com:8080"])
    #
    # I haven't worked out the correct domain names yet, so for now just allow
    # EVERYTHING.  This isn't secure, obviously, but I'll take my chances!
    #TODO: fix this!
    CORS(app, expose_headers=["Location"])


def verify_database_connection(app: Flask):
    """
    Test the database connection.  Just calling "db.engine.connect()" is insufficient 
    because it only tests the network connection, it doesn't try to log on.  So we try 
    to run an actual query -- once which doesn't actually do anything, but finishes
    quickly.
    """
    try:
        with app.app_context():
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1 as test"))
    except SQLAlchemyError as e:
        return "Could not connect to database: " + repr(e)
    return None


def initialize_database(app: Flask):
    """
    This can be used to recreate the database schema from scratch.  It does so if the User
    table is not detected in the database, which is taken to mean that the database has
    not been created yet.
    """
    try:
        with app.app_context():
            Data.init_db()
    except SQLAlchemyError as e:
        return "Could not connect to database: " + repr(e)
    return None


if __name__ == "__main__":
    app = minimal_app_config()
    additional_app_config(app)

    errmsg = verify_database_connection(app)
    if (errmsg):
        logging.error(errmsg)
        sys.exit(0)

    logging.info("Database connection verified.")

    errmsg = initialize_database(app)
    if (errmsg):
        logging.error(errmsg)
        sys.exit(0)

    serve(app, listen="*:5000")
