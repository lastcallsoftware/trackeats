#!/bin/bash

echo -e "\nExporting all data..."
curl -X POST "http://localhost:8080/api/db/export" -H "Content-Type: application/json" | jq .
