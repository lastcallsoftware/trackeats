It is recommended practice to develop Python apps in a "virtual environment".
By default, a Python project shares the Python runtime and dependency library
globally, with all other Python projects.  This is bad because it makes the
project subject to unexpected change, plus it's likely you will include 
unnecessary dependencies from other projects.<br>

A Python virtual environment is simply a local copy of the Python runtime and
the project's dependencies.  The environment's "activation" script simply 
updates your system path to point to those local copies instead of the global
copies.  (If you are a node.js developer, this behavior should sound familiar,
since it's how the npm package manager behaves by default.)<br>

Create a virtual environment:<br>
```python3 -m venv .venv```

Activate the virtual environment:<br>
```source ./.venv/bin/activate```

To install new dependencies:<br>
```pip install <dependency>```

To install dependencies listed in requirements.txt:<br>
```pip install -r requirements.txt```

To run the app natively:<br>
```python3 app.py```

To store or retrieve any container images from Docker Hub, you first need to get
a personal access token from Docker Hub.  On the Docker Hub website, go to your 
Account Settings/Personal Access Tokens page and generate a token.  Be sure to 
store your token somewhere because you can't see it again after it is generated.<br>

Log on to Docker.  When prompted, give your personal access token:<br>
```docker login -u <username>```

To build the Docker image:<br>
```docker build -t lastcallsoftware/trackeats-backend .```

To run the Docker image:<br>
```docker run -it lastcallsoftware/trackeats-backend```

To push the image to Docker Hub:<br>
```docker push lastcallsoftware/trackeats-backend```

To pull the image on the remote server:<br>
```sudo docker pull lastcallsoftware/trackeats-backend```
