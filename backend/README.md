# Summary

This is the back end portion of the Trackeats app.  It is a Python-based Flask
app using Waitress as its WSGI app server, deployed in its own
Docker cointainer.  It includes a connector for talking to the app's MySQL 
database, which is deployed deparately in its own Docker container.<br>

The back end contains no graphical user interface whatsoever.  Its only external
interface is a set of REST microservices which act as a proxy bewtween the front
end and the database.<br>

# Setting up and building the app

It is recommended practice to develop Python apps in a "virtual environment".
By default, a Python project shares the Python runtime and dependency library
globally, with all other Python projects.  This is bad because it makes the
project subject to unexpected changes, plus it's likely you will include 
unnecessary dependencies from other projects.<br>

A Python virtual environment addresses these issues by making a local copy of 
the Python runtime and the project's dependencies.  The environment's 
"activation" script simply updates your system path to point to those local 
copies instead of the global copies.  (If you are a node.js developer, this 
behavior should sound familiar, since it's how the npm package manager behaves 
by default.)<br>

The following command should be executed in an Ubuntu 24.04 WSL virtual machine
on Windows (or an actual Ubuntu system!) in the project's backend directory.<br>

Create a virtual environment:<br>
```python3 -m venv .venv```

Activate the virtual environment:<br>
```source ./.venv/bin/activate```

To install a new dependency:<br>
```pip install <dependency>```

To install dependencies listed in requirements.txt:<br>
```pip install -r requirements.txt```

To run the app locally:<br>
```python3 app.py```

Note that the back end app does NOT run in the Flask dev server in production.
We use a real WSGI app server instead.  The Flak dev server is only a 
convenience for when you are developing the app locally.<br> 


# Docker Interactions

To store or retrieve any container images from Docker Hub, you need to be logged 
in to Docker Hub.  To do that, you first need to get a personal access token 
from Docker Hub.  On the Docker Hub website, go to your Account Settings, then
the Personal Access Tokens page, and generate a new token.  Be sure to store 
the token somewhere because you can't see it again after it is generated.<br>

To run Docker commands in a WSL Linux VM (e.g., an Ubuntu 24.04 command prompt),
you must have the "Use the WSL 2 based engine" option enabled in the General
Settings of the Docker Desktop app for Windows.  (You may have to restart the app 
after enabling this setting.)  Also, you must have started Docker Desktop at some
point since your last reboot (presumably some background daemon is started when
you start the app).<br>

## Locally

Make sure you are in the backend directory when you run any of these commands.<br>

Log on to Docker.  When prompted, provide your Docker Hub personal access token:<br>
```docker login -u <username>```

To build the Docker image (note the . on the end):<br>
```docker build -t lastcallsoftware/trackeats-backend .```

To run the Docker image locally:<br>
```docker run -d -p 8080:8080 lastcallsoftware/trackeats-backend```

To push the image to Docker Hub:<br>
```docker push lastcallsoftware/trackeats-backend```

To see all images you have built:
```docker image ls -a```

To delete inactive images:
```docker image prune```

## On the Trackeats server

To deploy and execute the back end app on the Trackeats server, ssh onto the
server and follow these instructions:

To pull the image file from Docker Hub:<br>
```sudo docker pull lastcallsoftware/trackeats-backend```

To run the Docker image on the server in a container:<br>
```sudo docker run -d -p:8080 lastcallsoftware/trackeats-backend```
