#!/bin/bash
# Make sure to call:
#   export ACCESS_TOKEN="tokendata"
# ...before using this test.  The token can be obtained using the test-login.sh script.  Tokens are (currently) valid for 1 day
curl \
-X GET \
-H "Authorization: Bearer $ACCESS_TOKEN" \
http://localhost:5000/ingredient/1
