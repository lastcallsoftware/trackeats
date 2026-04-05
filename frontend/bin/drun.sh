#!/bin/bash
sudo docker rm trackeats-frontend
sudo docker run -d \
    --name trackeats-frontend \
    -p 80:8080 \
    -p 443:8443 \
    -p 5443:5443 \
    -v /etc/ssl/certs:/etc/ssl/certs \
    --add-host=host.docker.internal:host-gateway \
    lastcallsoftware/trackeats-frontend
    