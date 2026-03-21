#!/bin/bash
# This script logs in as the testuser and sets the ACCESS_TOKEN environment variable.
#
# Normally a shell script is invoked in its own copy of the shell, so environment variables 
# set in the script are not available to the shell that called the script.
# To keep ACCESS_TOKEN in the current environment, run this script with the "source" command:
#   source login.sh <username> <password>
# Or use . as a shorthand:
#  . login.sh <username> <password>

# Usage: source login.sh [username] [password]
USERNAME="${1:-guest}"
PASSWORD="${2:-Guest*123}"

# Load BACKEND_BASE_URL from .env if present
set -a
[ -f .env ] && . .env
set +a

if [ -z "$BACKEND_BASE_URL" ]; then
  echo "BACKEND_BASE_URL is not set. Please set it in your .env file."
  return 1
fi

OUTPUT=`curl --no-progress-meter \
-H "Content-Type: application/json" \
-d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\" }" \
"$BACKEND_BASE_URL/login"`

ACCESS_TOKEN=`echo $OUTPUT | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$'`
export ACCESS_TOKEN=$ACCESS_TOKEN
echo "Logged in as user " $USERNAME " with ACCESS_TOKEN: " $ACCESS_TOKEN
