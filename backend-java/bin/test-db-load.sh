#!/bin/bash

# Test script for the DB load API endpoint
# This script tests loading food data from the default JSON file

echo "Testing DB load API endpoint for foods..."
curl -X POST http://localhost:8080/api/db/load/foods -H "Content-Type: application/json" | jq .

echo -e "\nTesting general DB load API endpoint..."
curl -X POST "http://localhost:8080/api/db/load?type=foods" -H "Content-Type: application/json" | jq .

echo -e "\nTesting DB load API with custom file path..."
curl -X POST "http://localhost:8080/api/db/load?type=foods&filePath=backend2/data/foods.json" -H "Content-Type: application/json" | jq .
