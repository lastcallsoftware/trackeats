#!/bin/bash
# This stops the first listed instance of the front end app
docker container ls -a|grep trackeats-frontend|cut -d " " -f1|xargs docker container stop
