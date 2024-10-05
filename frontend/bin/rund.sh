#!/bin/bash
# This makes the app available to the outside world on port 80
docker run -d -p 80:8080 lastcallsoftware/trackeats-frontend
