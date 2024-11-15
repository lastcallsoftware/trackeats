#!/bin/bash
curl \
-H "Content-Type: application/json" \
-d '{"username": "testuser", "password": "Test*123" }' \
http://localhost:5000/login
