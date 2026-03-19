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

    2a. FRONTEND: Environment variables
        In a Vite app (which this is), environment variables used by the front end MUST be prefixed with "VITE_" to be recognized by the app. This is a security measure, because in front end apps environment variables are "baked in" at build time.  Forcing you to be explicit about which environment variables to include in the app's build by including this prefix prevents accidental leakage of sensitive data.

        Implicit in this is that any environment variables used by the front end are *inherently insecure*.  Assume that anything in the front end is public knowledge.  You should *never* include sensitive data in its build, even via environment variables.

        As such, only a couple of safe environment variables are used with the front end.  If they are not set, the app fails on startup and immediately exits:
            VITE_BACKEND_BASE_URL
            VITE_PORTFOLIO_URL

    2b. BACKEND: Environment variables
        The backend has an .env file with a lot more info, including sensitive data like the database password, but also non-sensitive environment-specific data like the database URL.
        
        I am currently in the process of migrating to GitHub Secrets for providing environment variables to the app, and possibly HashiCorp Vault for their long-term secure storage.  In the meantime I'm using a hybrid system where some data comes from GitHub Secrets and some from an .env file.
        
        .env files are never checked in to GitHub, though there is a .env.example file that is checked in, which has examples and comments explaining all the required values.  I also have an .env.production on my local system with the values used on the app server, but this will soon be gone because all that config will be in GitHub Secrets.  Config when running locally will still be in a local .env file.

    3. BACKEND: trackeats-backend-encryption.key
        This is a symmetric encryption key file used to encrypt sensitive data like the user's email address before persisting in the database.  It is not checked in to GitHub, and on the server side it is created dynamically by GitHub Secrets.

