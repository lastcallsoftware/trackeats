#!/bin/bash
OUTPUT=`curl --no-progress-meter \
-H "Content-Type: application/json" \
-d '{"username": "testuser", "password": "Test*123" }' \
http://localhost:5000/login`

ACCESS_TOKEN=`echo $OUTPUT | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$'`
export ACCESS_TOKEN=$ACCESS_TOKEN
echo "Logged in with ACCESS_TOKEN: " $ACCESS_TOKEN
