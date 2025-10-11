#!/bin/bash

# Test script for the DB export API endpoint
# This script tests exporting food data to a JSON file

echo "Testing DB export API endpoint for foods..."
curl -X POST http://localhost:8080/api/db/export/foods -H "Content-Type: application/json" | jq .

echo -e "\nTesting general DB export API endpoint..."
curl -X POST "http://localhost:8080/api/db/export?type=foods" -H "Content-Type: application/json" | jq .

echo -e "\nTesting DB export API with custom file path..."
curl -X POST "http://localhost:8080/api/db/export?type=foods&filePath=backend2/data/foods_exported.json" -H "Content-Type: application/json" | jq .
