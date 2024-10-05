import os
from flask import Flask, jsonify, request, render_template, url_for, redirect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from waitress import serve
#from models import Ingredient
#from loaddb import loaddb

app = Flask(__name__)

# For now, store database userID/password/hostname in environment variables.
# I'll figure out some better secret-storage mechanism eventually.
db_protocol = os.environ.get('DB_PROTOCOL', 'mysql+mysqlconnector')
db_user = os.environ.get('DB_USER', 'trackeats-backend-mysql')
db_password = os.environ['DB_PASSWORD']
db_hostname = os.environ.get('DB_HOSTNAME', 'localhost')
db_name = os.environ.get('DB_NAME', 'trackeats')

# Configure a couple Flask-SQLAlchemy config values.
# For all SQLAlchemy config settings, see https://flask-sqlalchemy.palletsprojects.com/en/2.x/config/
#
# SQLALCHEMY_DATABASE_URI is the URI of the database.
#app.config['SQLALCHEMY_DATABASE_URI'] = f"{db_protocol}://{db_user}:{db_password}@{db_hostname}/{db_name}"
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+mysqlconnector://trackeats-backend-mysql:{db_password}@trackeats.com/trackeats"
# SQLALCHEMY_TRACK_MODIFICATIONS disables the tracking of changes to objects.
# This just saves memory by turning off a monitoring feature.
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Instantiate the database connector.
db = SQLAlchemy(app)

# Set the CORS policy.
#
# Tricking web apps into sending/retrieving data to/from a different URL than 
# was intended is a common strategy employed by attackers, so modern browsers 
# have a policy (Cross Origin Resource Sharing, Or CORS) that by default 
# prohibits interactions with URLs from a different origin (i.e., a different 
# web protocol, domain name, or port than the web app was originally served 
# from).
# 
# Even though our front end and back end will be running on the same server,
# they will have different port numbers, which would therefore prevent them from
# communicating.  (Specifically, the front end will be served on 
# trackeats.com:80 or trackeats.com:443, the standard ports for HTTP and HTTPS 
# requests, respectively; and the back end will be listening on 
# trackeats.com:8080 or trackeats.com:8443, arbitrary ports chosen for the back
# end's REST web services.)  So we have to fix this!
#
# To accomplish this, the server receiving the HTTP request must set a header
# in its HTTP response indicating which URLs are allowed to make the request.
#
# Note that this policy is enforced by the BROWSER.  So if you make a request
# from something that isn't a browser -- say, the curl tool -- this whole CORS 
# thing does exactly nothing.  But we're not worried about the security of
# command-line utilities, we're worried about the security of web apps, and web
# apps run in browsers!
#
# Anyway, we could set the proper HTTP response header manually (it's the
# Access-Control-Allow-Origin header), but there's a little plugin library 
# (flask-cors) that automagically does this for us with just one line of code,
# so we'll use that.
#
# In production, we'll only need to account for port 443, but I'm adding a 
# couple more commonly used ports for convenience during development.  The
# important thing, really, is that we're restricting the domain to localhost
# (i.e., the front end and back end must be running on the same server,
# so any request to the server will be coming from localhost.)  If bad guys
# can make requests from the app server, it's already game over anyway, so
# tightly restricting the port number doesn't really matter.
CORS(app, origins=["http://localhost:80", "http://localhost:443", "http://localhost:5000", "http://localhost:8080"])

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

@app.route("/login", methods = ["POST"])
def login():
    data = request.get_json()
    username = data["username"]
    password = data["password"]
    print(f"Username: {username}, Password: {password}")
    return "Request verified", 200

if __name__ == "__main__":
    serve(app, listen="*:5000")
