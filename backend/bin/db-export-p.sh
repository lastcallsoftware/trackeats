#!/bin/bash
# Before using this script, make sure to export an auth token using:
#   export ACCESS_TOKEN="tokendata"
# A token can be obtained and exported automatically using:
#   source ./bin/test-login.sh
curl -s \
-X GET \
-H "Authorization: Bearer $ACCESS_TOKEN" \
https://trackeats.lastcallsw.com:5443/db/export
