#!/bin/bash
# This stops the first listed instance of the back end app
docker container ls -a|grep trackeats-backend|cut -d " " -f1|xargs docker container stop