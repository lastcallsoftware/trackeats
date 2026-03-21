#!/bin/bash


# Usage: ./test-register.sh
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
    -X POST \
    -d '{"username": "testuser", "password": "Test*123", "email": "testuser@lastcallsoftware.com"}' \
    -H "Content-Type: application/json" \
    "$BACKEND_BASE_URL/register"
