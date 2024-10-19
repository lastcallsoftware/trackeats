#!/bin/bash
sudo docker run -d \
    --name mysql \
    -p 3306:3306 \
    -v /var/local/mysql:/var/lib/mysql \
    -e MYSQL_ROOT_PASSWORD=Test*123 \
    -e MYSQL_DATABASE=trackeats \
    -e MYSQL_USER=trackeats-backend-mysql \
    -e MYSQL_PASSWORD=Yay*LJ54XOAN \
    mysql
