It is recommended to develop this app in a virtual environment:<br>
    ```python3 -m venv .venv```

Activate the virtual environment using:<br>
    ```source ./.venv/bin/activate```<br>

Use this to install any dependencies:<br>
```pip install <dependency>```

...or to install requiremetns listed in requirements.txt:<br>
```pip install -r requirements.txt```<br>

To run the app natively:<br>
    python3 app.py<br>

To use Docker, first log on.  When prompted give your personal access token
(obtained from DockerHub on your Account Settings/Personal Access Tokens page):<br>
    docker login -u <username><br>

To build the Docker image:<br>
    docker build -t lastcallsoftware/trackeats-backend .<br>

To run the Docker image:<br>
    docker run -it lastcallsoftware/trackeats-backend<br>

To push the image to Docker Hub:<br>
    docker push lastcallsoftware/trackeats-backend<br>

To pull the image on the remote server:<br>
    sudo docker pull lastcallsoftware/trackeats-backend<br>
