#!/bin/bash
# This script logs in as the testuser and sets the ACCESS_TOKEN environment variable.
# Normally a shell script is invoked in its own copy of the shell, so environment variables 
# set in the script are not available to the shell that called the script.
# To keep ACCESS_TOKEN in the current environment, run this script with the "source" command:
#   source test-login.sh
# Or use . as a shorthand:
#  . test-login.sh
OUTPUT=`curl --no-progress-meter \
-H "Content-Type: application/json" \
-d '{"username": "testuser", "password": "Test*123" }' \
http://localhost:5000/login`
#https://trackeats.lastcallsw.com:5443/login`

ACCESS_TOKEN=`echo $OUTPUT | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$'`
export ACCESS_TOKEN=$ACCESS_TOKEN
echo "Logged in with ACCESS_TOKEN: " $ACCESS_TOKEN
