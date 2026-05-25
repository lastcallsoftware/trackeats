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
            {"nutrient": {"number": "208"}, "amount": 23},
            {"nutrient": {"number": "203"}, "amount": 2.9},
            {"nutrient": {"number": "205"}, "amount": 3.6},
            {"nutrient": {"number": "307"}, "amount": 79},
            {"nutrient": {"number": "301"}, "amount": 99},
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
    assert request.nutrition.sodium_mg == 79
    assert request.nutrition.calcium_mg == 99


def test_search_foods_uses_required_term_query_operators(monkeypatch) -> None:
    importer = USDAFdcImporter(api_key="test-key")

    calls: list[dict[str, object]] = []

    def fake_get(path: str, params: dict[str, object]) -> dict[str, object]:
        assert path == "/v1/foods/search"
        calls.append(params)
        return {
            "totalHits": 2,
            "currentPage": 1,
            "totalPages": 1,
            "foods": [
                {"fdcId": 3, "description": "Apple Juice", "dataType": "Branded", "brandOwner": "Acme"},
                {"fdcId": 4, "description": "Organic Apple Juice Blend", "dataType": "Foundation"},
            ],
        }

    monkeypatch.setattr(importer, "_get", fake_get)

    first_page = importer.search_foods(query="apple juice", page_number=1, page_size=25)

    assert first_page["totalHits"] == 2
    assert first_page["totalPages"] == 1
    assert first_page["currentPage"] == 1
    assert [food["fdcId"] for food in first_page["foods"]] == [3, 4]

    assert len(calls) == 1
    assert calls[0]["query"] == "+apple +juice"


def test_search_foods_filters_to_visible_fields_only(monkeypatch) -> None:
    importer = USDAFdcImporter(api_key="test-key")

    def fake_get(path: str, params: dict[str, object]) -> dict[str, object]:
        assert path == "/v1/foods/search"
        return {
            "totalHits": 2,
            "currentPage": 1,
            "totalPages": 1,
            "foods": [
                {
                    "fdcId": 2752968,
                    "description": "Original Philly Chicken Sandwich Slices",
                    "dataType": "Branded",
                    "brandOwner": "Tyson Foods Inc.",
                    "ingredients": "Chicken breast with rib meat",
                },
                {
                    "fdcId": 111,
                    "description": "Tyson Chicken Breast Fillets",
                    "dataType": "Branded",
                    "brandOwner": "Tyson Foods Inc.",
                },
            ],
        }

    monkeypatch.setattr(importer, "_get", fake_get)

    result = importer.search_foods(query="tyson chicken breast", page_number=1, page_size=25)

    # Only rows matching all terms in visible table fields should remain.
    assert [food["fdcId"] for food in result["foods"]] == [111]


def test_search_foods_respects_selected_data_type(monkeypatch) -> None:
    importer = USDAFdcImporter(api_key="test-key")
    calls: list[dict[str, object]] = []

    def fake_get(path: str, params: dict[str, object]) -> dict[str, object]:
        assert path == "/v1/foods/search"
        calls.append(params)
        return {
            "totalHits": 2,
            "currentPage": 1,
            "totalPages": 1,
            "foods": [
                {"fdcId": 10, "description": "Chicken breast", "dataType": "Foundation"},
                {"fdcId": 11, "description": "Chicken breast", "dataType": "Branded", "brandOwner": "Acme"},
            ],
        }

    monkeypatch.setattr(importer, "_get", fake_get)

    result = importer.search_foods(
        query="chicken breast",
        page_number=1,
        page_size=25,
        data_types=["Foundation"],
    )

    assert calls[0]["dataType"] == ["Foundation"]
    assert [food["fdcId"] for food in result["foods"]] == [10]


def test_map_to_food_request_uses_atwater_energy_for_foundation() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food = {
        "fdcId": 90001,
        "dataType": "Foundation",
        "description": "Spinach, baby",
        "foodNutrients": [
            {"nutrient": {"number": "957"}, "amount": 26.6},
            {"nutrient": {"number": "203"}, "amount": 2.9},
            {"nutrient": {"number": "205"}, "amount": 2.4},
            {"nutrient": {"number": "204"}, "amount": 0.6},
        ],
    }

    request = importer.map_to_food_request(usda_food)

    assert request.nutrition.calories == 27


def test_map_to_food_request_estimates_calories_from_macros_when_missing() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food = {
        "fdcId": 90002,
        "dataType": "Foundation",
        "description": "Macro only test",
        "foodNutrients": [
            {"nutrient": {"number": "203"}, "amount": 5.0},
            {"nutrient": {"number": "205"}, "amount": 10.0},
            {"nutrient": {"number": "204"}, "amount": 2.0},
        ],
    }

    request = importer.map_to_food_request(usda_food)

    # 5*4 + 10*4 + 2*9 = 78 kcal
    assert request.nutrition.calories == 78


def test_calorie_source_atwater_energy() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food = {
        "fdcId": 90003,
        "dataType": "Foundation",
        "description": "Atwater source test",
        "foodNutrients": [
            {"nutrient": {"number": "957"}, "amount": 42.0},
        ],
    }

    assert importer.calorie_source(usda_food) == "atwater_energy"


def test_calorie_source_estimated_from_macros() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food = {
        "fdcId": 90004,
        "dataType": "Foundation",
        "description": "Estimated source test",
        "foodNutrients": [
            {"nutrient": {"number": "203"}, "amount": 4.0},
            {"nutrient": {"number": "205"}, "amount": 6.0},
            {"nutrient": {"number": "204"}, "amount": 1.0},
        ],
    }

    assert importer.calorie_source(usda_food) == "estimated_from_macros"
