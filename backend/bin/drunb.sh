#!/bin/bash
sudo docker run -d -e DB_PASSWORD=$DB_PASSWORD -p 5000:5000 --name trackeats-backend lastcallsoftware/trackeats-backend
