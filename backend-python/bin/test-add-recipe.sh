#!/bin/bash
# Before using this script, make sure to export an auth token using:
#   export ACCESS_TOKEN="tokendata"
# A token can be obtained and exported automatically using:
#   source ./bin/test-login.sh
curl \
-H "Authorization: Bearer $ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
"cuisine": "chinese",
"name": "Cup of Rice",
"total_yield": "4 cups",
"servings": 4,
"nutrition": {"serving_size_description": "1 cup"}
}' \
http://localhost:5000/recipe
#https://trackeats.lastcallsw.com:54443/recipe
