#!/bin/bash
# Make sure to call:
#   export ACCESS_TOKEN="tokendata"
# ...before using this test.  The token can be obtained using the test-login.sh script.
curl \
-H "Authorization: Bearer $ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{"group": "dairy",
"type": "Milk",
"subtype": "Almond",
"description": "Unsweetened Almond Breeze",
"vendor": "Blue Diamond",
"size_description": "1 quart (32 fl oz)",
"size_g": 946,
"servings": 4,
"nutrition": {"serving_size_description": "1 cup (8 fl oz)",
"serving_size_g": 240,
"calories": 30,
"total_fat_g": 2.5,
"saturated_fat_g": 0,
"trans_fat_g": 0,
"cholesterol_mg": 0,
"sodium_mg": 170,
"total_carbs_g": 1,
"fiber_g": 1,
"total_sugar_g": 0,
"added_sugar_g": 0,
"protein_g": 1,
"vitamin_d_mcg": 5,
"calcium_mg": 450,
"iron_mg": 0.7,
"potassium_mg": 160},
"price": 3.19,
"price_date": "2024-11-12",
"shelf_life": "7-14 days in fridge"}' \
https://trackeats.lastcallsw.com:54443/ingredient

#http://localhost:5000/ingredient
