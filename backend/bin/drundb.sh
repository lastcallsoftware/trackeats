#!/bin/bash
sudo docker volume create mysql-data
sudo docker rm mysql
sudo docker run -d \
    --name mysql \
    -p 3306:3306 \
    -v mysql-data:/var/lib/mysql \
    --env-file .env.db \
    mysql
