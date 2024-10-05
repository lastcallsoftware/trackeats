#!/bin/bash
docker container ls -a|grep trackeats-frontend|cut -d " " -f1|xargs docker container stop
