# About this app

This project is a small web application.  Conceptually it is a portfolio app intended to demonstrate competence in a wide range of current technologies, including front end techs like React, JavaScript, and CSS, back end techs like Python, Flask, and MySQL, and cloud and deployment techs like AWS and Docker.

[Front end documentation](frontend/README.md).
[Back end documentation](backend/README.md)


# Config and Secret Management

I'm currently using a combination of .env files and GitHub Secrets.  I'd like to migrate to the latter completely, but I haven't quite figured out how this will work for local/testing environments.

Config includes:

    1. FRONTEND and BACKEND: SSL .crt and .key files
        These files are now managed entirely by Docker Compose and GitHib Secrets.
        This includes the server's private .key file and public .crt file.

    2. FRONTEND and BACKEND: .env file
        Both the frontend and backend have an .env file with things like the database passwords, but also non-sensitive environment-specific data like the database URL.  As noted I am in the process of migrating to HitHub Secrets for as much of this config as possible.  .env files are not checked in to GitHub, but there is a .env.example file that is checked in, which has examples and explanations in comments.  I also have an .env.production on my local system with the values used on the app server, but this will soon be gone as all that config will be in GitHub Secrets.  Config when running locally will still be in a local .env file.

    3. BACKEND: trackeats-backend-encryption.key
        This is a symmetric encryption key file used to encrypt sensitive data like the user's email address before persisting in the database.  It is not checked in to GitHub, and on the server side it is created dynamically by GitHub Secrets.
