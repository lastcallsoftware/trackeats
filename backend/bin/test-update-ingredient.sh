#!/bin/bash
# Make sure to call:
#   export ACCESS_TOKEN="tokendata"
# ...before using this test.  The token can be obtained using the test-login.sh script.
curl \
-X PUT \
-H "Authorization: Bearer $ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{"id": 1,
"group": "grains",
"type": "Bagel",
"subtype": "Mixed Frozen",
"description": "",
"vendor": "Utopia Bagels of NY",
"size_description": "5 bagels (5 oz)",
"size_g": 680,
"servings": 5,
"nutrition_id": 1,
"nutrition": {
    "serving_size_description": "1 bagel (5 oz)",
    "serving_size_g": 136,
    "calories": 350,
    "total_fat_g": 1,
    "saturated_fat_g": 0,
    "trans_fat_g": 0,
    "cholesterol_mg": 0,
    "sodium_mg": 390,
    "total_carbs_g": 73,
    "fiber_g": 3,
    "total_sugar_g": 2,
    "added_sugar_g": 2,
    "protein_g": 10,
    "vitamin_d_mcg": 0,
    "calcium_mg": 30,
    "iron_mg": 4,
    "potassium_mg": 150
},
"price": 8.49,
"price_date": "2024-11-09",
"shelf_life": "7 days in fridge"}' \
https://trackeats.lastcallsw.com:54443/ingredient

#http://localhost:5000/ingredient
