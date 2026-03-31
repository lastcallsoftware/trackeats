#!/bin/bash
# Before using this script, make sure to export an auth token using:
#   export ACCESS_TOKEN="tokendata"
# A token can be obtained and exported automatically using:
#   source ./bin/test-login.sh


# Usage: ./test-update-recipe.sh
# Reads BACKEND_BASE_URL from .env
set -a
[ -f .env ] && . .env
set +a

if [ -z "$BACKEND_BASE_URL" ]; then
    echo "BACKEND_BASE_URL is not set. Please set it in your .env file."
    exit 1
fi



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
    "$BACKEND_BASE_URL/api/recipe"
