#!/bin/bash
# Make sure to call:
#   export ACCESS_TOKEN="tokendata"
# ...before using this test.  The token can be obtained using the test-login.sh script.  Tokens are (currently) valid for 1 day
curl -d '{"username": "testuser", "password": "Test*123" }' -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN" -X GET http://localhost:5000/ingredient
