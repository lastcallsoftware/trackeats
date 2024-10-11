#!/bin/bash
curl -d '{"username": "testuser", "password": "Test*123", "email": "testuser@lastcallsoftware.com"}' -H "Content-Type: application/json" -X POST http://localhost:5000/register
