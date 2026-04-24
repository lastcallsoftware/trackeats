# About this app

This project is a small web application.  Conceptually it is a portfolio app intended to demonstrate competence in a wide range of current technologies, including front end techs like React, JavaScript, and CSS, back end techs like Python, Flask, and MySQL, and cloud and deployment techs like AWS and Docker.

[Front end documentation](frontend/README.md).
[Back end documentation](backend/README.md)


# Deployment

On the app server, TrackEats is deployed in Docker containers by GitHub Actions and Docker Compose using CI/CD.  Whenever code changes are pushed to the main branch in GitHub, it triggers a new deployment on the server.

Locally, the app builds automatically and runs manually, using /frontend/bin/run.sh and /backend/bin/run.sh (though they are both trivial scripts that run the usual commands for starting JavaScript and Python apps, respectively).


# Config and Secret Management

GitHub Secrets/Docker Compose provide all environment variables to the app in the production build, as well as the server's SSL certificate files and the symmetric keys used by the backend.  For the local (development) build, the environment variables are provided by an .env file.  An .env.example file documents all the environment variables in use and provides sample values where appropriate.

Note that environment variables used by the front end MUST be prefixed with "VITE_" to be recognized by the app. This is a security measure, because in front end apps the values of environment variables are "baked into" the app at build time and should be considered public knowledge.  Forcing you to be explicit about which environment variables to include in the app's build by requiring them to have the "VITE_" prefix prevents accidental leakage of sensitive data.
