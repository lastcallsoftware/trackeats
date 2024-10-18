#!/bin/bash
sudo docker run -d \
    --name trackeats-backend \
    -p 5000:5000 \
    lastcallsoftware/trackeats-backend
