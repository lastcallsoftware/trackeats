#!/bin/bash
curl -d '{"username": "testuser", "password": "Test*123" }' -H "Content-Type: application/json" -X POST http://localhost:5000/login
