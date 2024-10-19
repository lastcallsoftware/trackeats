#!/bin/bash
sudo docker rm trackeats-frontend
sudo docker run -d \
    --name trackeats-frontend \
    -p 80:8080 \
    -e REACT_APP_BACKEND_BASE_URL=$REACT_APP_BACKEND_BASE_URL \
    lastcallsoftware/trackeats-frontend
