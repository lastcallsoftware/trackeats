#!/bin/bash
docker container ls -a|grep trackeats-backend|cut -d " " -f1|xargs docker container stop
