#!/bin/bash
sudo docker rm -f trackeats-backend >/dev/null 2>&1 || true
sudo docker run -d \
    --name trackeats-backend \
    -p 5000:5000 \
    lastcallsoftware/trackeats-backend
