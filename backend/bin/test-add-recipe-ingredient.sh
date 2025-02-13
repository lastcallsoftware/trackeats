#!/bin/bash
# Before using this script, make sure to export an auth token using:
#   export ACCESS_TOKEN="tokendata"
# A token can be obtained and exported automatically using:
#   source ./bin/test-login.sh
curl \
-X POST \
-H "Authorization: Bearer $ACCESS_TOKEN" \
-H "Content-Type: application/json" \
http://localhost:5000/recipe/2/recipe_ingredient/1/1.5
#https://trackeats.lastcallsw.com:54443/recipe/2/food_ingredient/1/1.5
