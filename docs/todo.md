In no particular order:
- Set up issue tracking in Jira or GitHub so I don't have to keep this list in a text file!
- Look into deploying MySQL in a Docker container
- Figure out how to build and deploy the front end in Docker
    *** Determine if it's necessary/advisable to build the app in WSL, or if it's okay to build in
        native Windows and deploy to Linux using Docker.
- Figure out how to build and deploy the back end in Docker
- Set up a back end prokect using Django or Flask+SQL Alchemy
    - Django has its own built-in ORM and substantial ability to construct front-end web pages, but
        we aren't planning to use the latter functionality.
    - Flask has good, easy-to-use support for web services, which is how we're planning to get the
        two halves of the app to talk to each other, but an add-on product (SQL Alchemny) that I
        haven't looked at yet is needed for the ORM level.
    Django is the more popular product and I'm leaning towards that.
- Figure out how to do CI/CD with GitHub Actions (or Jenkins)
