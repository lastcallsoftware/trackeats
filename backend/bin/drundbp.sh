#!/bin/bash
sudo docker rm mysql
sudo docker run -d \
    --name mysql \
    -p 3306:3306 \
    -v /var/local/mysql:/var/lib/mysql \
    --env-file .env.db.production \
    mysql
