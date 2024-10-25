#!/bin/bash
sudo docker rm trackeats-frontend
sudo docker run -d \
    --name trackeats-frontend \
    -p 80:8080 \
    lastcallsoftware/trackeats-frontend
