#!/bin/bash
# This makes the app available to the outside world on port 80
sudo docker run -d -p 80:8080 --name trackeats-frontend lastcallsoftware/trackeats-frontend
