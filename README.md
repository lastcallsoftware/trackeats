# About this app

This project is a small web application.  Conceptually it is a portfolio app intended to demonstrate competence in a wide range of current technologies, including front end techs like React, JavaScript, and CSS, back end techs like Python, Flask, and MySQL, and cloud and deployment techs like AWS and Docker.  

[Front end documentation](frontend/README.md).
[Back end documentation](backend/README.md)


# Config and Secret Management

It is bad practice to hardcode environment-specific config values in the app 
code.  For example, the backend server URL would be "localhost" when you're 
developing the app locally on your own desktop, but "trackeats.com" when you
deploy the app to production.  You don't want to have to modify the code every
time you deploy the app!

Moreover, it's even worse practice, as well as a massive security violation, to
hardcode "secrets" like a database password in the code -- especially when the
code is stored in a publicly-viewable repository.

There are many ways this can be handled, depending on how much effort and 
especially how much MONEY you want to throw at the problem.  And most of the 
solutions commit you to vendor lock-in.  For example, Hashicorp's popular Vault 
product can be used to store and retrieve secrets, but then you're at the mercy 
of Hashicorp's licensing and functionality, and if you don't qualify for their 
free tier of products it can be astronomically expensive (their entry-level paid
tier starts at $13,600/year!).

Plus, it seems to me that in many caes you're just substituting one type of
problem for another.  For example, if you use Vault, instead of storing and 
managing your own app's secrets, you have to store and manage your Vault 
credentials.  PLUS you have to master the intricacies how to access the Vault
-- yet another tech to throw on the stack.  No thanks.

Vault is the most extreme example of vendor lock-in, but every solution I've 
seen suffers from this to one degree or another.  Automated certificate 
management requires you to lock into some Certificate Authority's (CA's) 
deployment service; cloud-based automation requires you to lock into some cloud
vendor's services (e.g., AWS).  You just can't escape the fact that any 
"Something as a Service" solution means paying for someone's service and using
their proprietary crap.  AFAIK there isn't any good free/open-source solution to 
this issue.

Optimally I would love to be able to press one button and have the entire app
and all its associated config deploy to a brand new server and start up
automatically.  This is the promise of Kubernetes, if I ever get the time to
devote to learning that product!

But in the meantime, I'm afraid there will have to be some manual config 
necessary for a new Trackeats server deployment.  Manual config considerations
include:

    1. FRONTEND and BACKEND: SSL .crt and .key files
        The SSL certificate and its associated private key file must be
        present ON THE SERVER at runtime.

    2. FRONTEND: .env and .env.production files
        The .env and .env.production files must be present in the /frontend 
        directory when the frontend Docker image is built, or when the frontend 
        app is run locally.  Unlike the backend config, which is a bit more
        flexible, the config files used for the frontend MUST have these 
        specific names.  

        The proper file is chosen by the Vite engine at runtime based on the
        Vite execution "mode".  By default, the mode is set to "production" when
        the app is built using the "npm run build" command (which is what we
        specify to build the frontend app in the Dockerfile), and it's set to 
        "development" when the app is run using "npm run dev" (which is almost
        always how you'd run the app locally during development).

        Note that this means that the the execution mode is basically determined
        by whether you run the app in a Docker container or not.  In other 
        words, if you run the frontend in a Docker container LOCALLY, it will 
        still run using the production execution mode!

        I suppose I could remedy this by futzing around with the Dockerfile,
        but it's really not that big a deal since I never run the app that way.
        Just keep it in mind.

        [P.S. The Vite execution mode can also be overriden by setting the 
        --mode flag in the Vite build command, in case we ever want to try 
        that.]

        Any config values in the .env and .env.producion files MUST have the
        prefix "VITE_" to be read by the app.

        Currently the only value in these config files is VITE_BACKEND_BASE_URL,
        which specifies the URL of the backend server for making REST calls.
        Note that when running locally, this value must be the IP address of
        your WSL virtual machine -- "localhost" will not work.  To help 
        determine that value, I've set up a "getip.sh" script in /backend/bin.

    3. BACKEND: ENV environment variable
        For the backend project, the ENV environment variable must be set
        properly when the app is started.  Currently it only matters if ENV
        is set to "PROD", in which case the app selects the .env.production
        config file at runtime.  If ENV is set to anything else, or not set
        at all, the app selects the .env file at runtime instead.

        The ENV environment variable is set using the -e flag in the "docker 
        run" command.  This flag is part of the "drunb.sh" and "drunbp.sh" 
        scripts.

    4. BACKEND: .env and .env.production files
        Yes, the backend also has its own .env and .env.production config files.
        These files are loaded by the backend app at runtime, so they must be 
        present in the project's /backend directory when the trackeats-backend 
        Docker image is built, or when you run the app locally.

        The .env.production file is selected when the ENV environment variable
        is set to PROD, and the .env file is selected in all other cases.
        Both files contain the DB_HOSTNAME and DB_PASSWORD values, for 
        production and non-production environments respectively.

    5. BACKEND: trackeats-backend-encryption.key
        This file must be present in the /backend directory when the backend
        Docker image is built, or when the app is executed locally.  It is
        a symmetric key file used to encrypt user data in the database.

    6. DATABASE: .env.db and .env.db.production files
        The .env.db.production file must be present ON THE SERVER when the
        database is started!  We don't actually build the MySQL image file,
        we just use the official image from the Docker Hub site, so we can't
        include config files in the actual Docker image.  The only way for it
        to access a config file is if it's physically copied to the server.

        Likewise, the .env.db file must be present in the local environment
        if we run the database container locally.

        The config file is specified by the --env-file flag in the "docker run"
        command.  This flag is part of the "drundb.sh" and "drundbp.sh" scripts 
        used to start the database Docker container.  It seems that it finds the
        config file as long as it's in the same directory as the script when it
        is executed, so we don't have to put it anywhere special.

        We could also have set the environment variables in the startup script
        directly instead of putting them in a seprate config file, but using
        a seprate file seemed a little cleaner.

        The config files contain the MYSQL_ROOT_PASSWORD, MYSQL_DATABASE,
        MYSQL_USER, and MYSQL_PASSWORD config values.  These values are 
        interpreted by the MySQL server itself, not by our own code.

As previously noted, it's bad practice to store these files in GitHub with the
source code, so until I think of something better, they'll simply have to be 
stored on my desktop, and be backed up manually in my own personal cloud storage 
(i.e, Dropbox).

Not optimal, but it will do for now.

