#!/bin/bash
sudo docker rm trackeats-backend
sudo docker run -d \
    --name trackeats-backend \
    -p 5000:5000 \
    -e ENV="DEV" \
    lastcallsoftware/trackeats-backend
