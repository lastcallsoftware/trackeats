#!/bin/bash
docker run -d -e DB_PASSWORD=$DB_PASSWORD -p 5000:5000 lastcallsoftware/trackeats-backend
