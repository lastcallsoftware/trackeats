It is recommended to develop this app in a virtual environment:<br>
    python3 -m venv .venv<br>
Activate the virtual environment using:
    source ./.venv/bin/activate

Use this to install any dependencies:
    pip install <dependency>

...or to install requiremetns listed in requirements.txt:
    pip install -r requirements.txt

To run the app natively:
    python3 app.py

To use Docker, first log on.  When prompted give your personal access token
(obtained from DockerHub on your Account Settings/Personal Access Tokens page):
    docker login -u <username>

To build the Docker image:
    docker build -t lastcallsoftware/trackeats-backend .

To run the Docker image:
    docker run -it lastcallsoftware/trackeats-backend

To push the image to Docker Hub:
    docker push lastcallsoftware/trackeats-backend

To pull the image on the remote server:
    sudo docker pull lastcallsoftware/trackeats-backend
