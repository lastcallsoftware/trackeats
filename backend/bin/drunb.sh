#!/bin/bash
sudo docker run -d \
    --name trackeats-backend \
    -p 5000:5000 \
    -e DB_HOSTNAME=$DB_HOSTNAME \
    -e DB_PASSWORD=$DB_PASSWORD  \
    lastcallsoftware/trackeats-backend
