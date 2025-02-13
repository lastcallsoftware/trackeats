#!/bin/bash
# Before using this script, make sure to export an auth token using:
#   export ACCESS_TOKEN="tokendata"
# A token can be obtained and exported automatically using:
#   source ./bin/test-login.sh
curl \
-X DELETE \
-H "Authorization: Bearer $ACCESS_TOKEN" \
-H "Content-Type: application/json" \
http://localhost:5000/recipe/2/recipe_ingredient/1
#https://trackeats.lastcallsw.com:54443/recipe/1/food_ingredient/25
