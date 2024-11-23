#!/bin/bash
curl \
-X POST \
-d '{"username": "testuser", "password": "Test*123", "email": "testuser@lastcallsoftware.com"}' \
-H "Content-Type: application/json" \
https://trackeats.lastcallsw.com:5443/register

#http://localhost:5000/register
