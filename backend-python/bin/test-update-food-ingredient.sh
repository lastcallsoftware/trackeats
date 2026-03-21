#!/bin/bash
# Before using this script, make sure to export an auth token using:
#   export ACCESS_TOKEN="tokendata"
# A token can be obtained and exported automatically using:
#   source ./bin/test-login.sh


# Usage: ./test-update-food-ingredient.sh
# Reads BACKEND_BASE_URL from .env
set -a
[ -f .env ] && . .env
set +a

if [ -z "$BACKEND_BASE_URL" ]; then
  echo "BACKEND_BASE_URL is not set. Please set it in your .env file."
  exit 1
fi

curl \
curl \
    -X PUT \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "$BACKEND_BASE_URL/recipe/1/food_ingredient/25/2.5"
