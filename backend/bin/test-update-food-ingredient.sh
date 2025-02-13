#!/bin/bash
# Before using this script, make sure to export an auth token using:
#   export ACCESS_TOKEN="tokendata"
# A token can be obtained and exported automatically using:
#   source ./bin/test-login.sh
curl \
-X PUT \
-H "Authorization: Bearer $ACCESS_TOKEN" \
-H "Content-Type: application/json" \
http://localhost:5000/recipe/1/food_ingredient/25/2.0
#https://trackeats.lastcallsw.com:54443/recipe/1/food_ingredient/25/2.0
