#!/bin/bash
# Before using this script, make sure to export an auth token using:
#   export ACCESS_TOKEN="tokendata"
# A token can be obtained and exported automatically using:
#   source ./bin/test-login.sh
curl \
-X PUT \
-H "Authorization: Bearer $ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
"id": 2,
"nutrition_id": 367,
"cuisine": "Chinese",
"name": "Cup of Rice",
"total_yield": "8 cups",
"servings": 8,
"nutrition": {
    "serving_size_description": "1 hogshead"
    }
}' \
http://localhost:5000/recipe
#https://trackeats.lastcallsw.com:54443/recipe
