# Summary

This is the front-end portion of the TrackEats app.  It is a React app served by an Nginx web server.<br>

This frontend started from the Vite React + TypeScript template and currently uses the SWC React plugin (`@vitejs/plugin-react-swc`) for fast local builds.

The app's function and purpose can be explored by reading the README.ms in the project root folder, but basically it is intended to help track the nutritional content of the user's daily diet.<br>

# Installing and running the code

To run this app, you first need npm and nodeJS installed locally.  Then clone this Git repository to a local directory, and from the project's root directory execute:
```npm install```

This will download all the required JavaScript dependencies, including the React libraries.  Finally, to run the app locally, execute:
```npm run dev```

This will bundle up the app, deploy it to the Vite app server, and start it up.  Then you should be able to start up a browser and point it at localhost to see the app.  Voila!<br>

The coolest thing is that if you keep the app running, as you make changes to the code it is automatically compiled and deployed and you can see the effects in real time.<br>

Note that the front end app does NOT run in the Vite dev server in production.  Instead it runs inside a Docker container and is served by the Nginx web server.  The Vite dev server is only a convenience for when you are developing the app locally.<br> 

# Docker Interactions

To store or retrieve any container images from Docker Hub, you must be logged in to Docker Hub.  To do that, you first need to get a personal access token from Docker Hub.  On the Docker Hub website, go to your Account Settings, then the Personal Access Tokens page, and generate a new token.  Be sure to store the token somewhere because you can't see it again after it is generated.  Then when you first log in you will be prompted for the token.  This is a one-time action -- you won't need to manually log in again.<br>

To be able to run Docker commands in WSL (e.g., an Ubuntu command prompt), open Docker Desktop's settings, select Resources, and on the WSL Integration tab enable the "Enable integration with my default WSL distro" option.<br>

Also, Docker Desktop have been started at some point since your last reboot in order to use its CLI interface.  The simplest thing is to go to its General settings and select "Start Docker Desktop when you sign in to your computer".  You can close the Docker Deskop app itself afterwards -- the engine will continue to run.<br>

## Running in a Docker Container

The app now uses GitHub Actions & Docker Compose to manage the build and deployment of the app in Docker containers.  This is fantastic for remote server deployment, but it's a little dicey for use when running locally.  In addition to the .env files needed for the environment settings which you always use when running locally (i.e., even when not in a Docker container), you also need a docker-compose.override.yml with special instructions for building and running the containers locally.  I'll admit that I haven't been super diligent about keeping that file updated, since I never run the app in containers locally.

Below are instructions for running the Docker commands manually (i.e., not using Docker Compose).  This is NOT recommended -- it's just for reference.

## Locally

Make sure you are in the frontend directory when you run any of these commands.<br>

Log on to Docker.  When prompted, provide your Docker Hub personal access token:<br>
```docker login -u <username>```

To build the Docker image (note the . on the end):<br>
```docker build -t lastcallsoftware/trackeats-frontend .```

To run the Docker image locally:<br>
```docker run -d -p 80:80 lastcallsoftware/trackeats-frontend```

To push the image to Docker Hub:<br>
```docker push lastcallsoftware/trackeats-frontend```

To see all images you have built:
```docker image ls -a```

To delete inactive images:
```docker image prune```

## On the Trackeats server

To deploy and execute the back end app on the Trackeats server, ssh onto the server and follow these instructions:

To pull the image file from Docker Hub:<br>
```sudo docker pull lastcallsoftware/trackeats-frontend```

To run the Docker image on the server in a cotainer:<br>
```sudo docker run -d -p 80:80 lastcallsoftware/trackeats-frontend```

# Other

For current, project-specific behavior, rely on:

- `package.json` scripts in this folder
- `eslint.config.js` for lint rules
- `tsconfig*.json` for TypeScript project configuration
