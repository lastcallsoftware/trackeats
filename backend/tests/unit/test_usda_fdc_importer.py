import sys
from pathlib import Path

from schemas import FoodRequest


BACKEND_IMPORT = Path(__file__).resolve().parents[2] / "import"
if str(BACKEND_IMPORT) not in sys.path:
    sys.path.insert(0, str(BACKEND_IMPORT))

from usda_fdc_importer import USDAFdcImporter, _map_group


def test_map_group_fallback_other() -> None:
    assert _map_group("completely unknown category") == "other"


def test_map_group_detects_common_categories() -> None:
    assert _map_group("cheese and dairy foods") == "dairy"
    assert _map_group("beverages and drinks") == "beverages"
    assert _map_group("spice mix") == "herbsAndSpices"


def test_map_to_food_request_branded_payload() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food = {
        "fdcId": 12345,
        "dataType": "Branded",
        "description": "CHEDDAR CHEESE",
        "brandOwner": "Acme Foods",
        "brandedFoodCategory": "Cheese",
        "servingSize": 28,
        "servingSizeUnit": "g",
        "householdServingFullText": "1 oz",
        "labelNutrients": {
            "calories": {"value": 110},
            "fat": {"value": 9},
            "saturatedFat": {"value": 6},
            "transFat": {"value": 0},
            "cholesterol": {"value": 30},
            "sodium": {"value": 180},
            "carbohydrates": {"value": 1},
            "fiber": {"value": 0},
            "sugars": {"value": 0},
            "protein": {"value": 7},
            "calcium": {"value": 200},
            "iron": {"value": 0.1},
            "postassium": {"value": 20},
        },
    }

    request = importer.map_to_food_request(usda_food)

    assert isinstance(request, FoodRequest)
    assert request.fdc_id == 12345
    assert request.source == "usda_fdc"
    assert request.group == "dairy"
    assert request.name == "CHEDDAR CHEESE"
    assert request.vendor == "Acme Foods"
    assert request.servings == 1.0
    assert request.nutrition.calories == 110
    assert request.nutrition.total_fat_g == 9
    assert request.nutrition.protein_g == 7


def test_map_to_food_request_foundation_defaults_vendor_and_serving() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food = {
        "fdcId": 67890,
        "dataType": "Foundation",
        "description": "Spinach, raw",
        "foodCategory": {"description": "Vegetables and Vegetable Products"},
        "foodNutrients": [
            {"nutrient": {"number": "1008"}, "amount": 23},
            {"nutrient": {"number": "1003"}, "amount": 2.9},
            {"nutrient": {"number": "1005"}, "amount": 3.6},
        ],
    }

    request = importer.map_to_food_request(usda_food)

    assert request.fdc_id == 67890
    assert request.vendor == "USDA Foundation"
    assert request.group == "vegetables"
    assert request.nutrition.serving_size_description == "100 g"
    assert request.nutrition.calories == 23
    assert request.nutrition.protein_g == 3
    assert request.nutrition.total_carbs_g == 4
