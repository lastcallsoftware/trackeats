#!/bin/bash
curl -d '{"username": "test", "password": "test" }' -H "Content-Type: application/json" -X POST http://localhost:5000/login
