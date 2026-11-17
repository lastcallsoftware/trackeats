import sys
from pathlib import Path
from decimal import Decimal
from typing import Any

import pytest

from schemas import FoodRequest

BACKEND_IMPORT = Path(__file__).resolve().parents[2] / "import"
if str(BACKEND_IMPORT) not in sys.path:
    sys.path.insert(0, str(BACKEND_IMPORT))

from usda_fdc_importer import USDAFdcImporter, _map_group, _determine_unit_kind  # type: ignore[attr-defined]


def test_map_group_fallback_other() -> None:
    assert _map_group("completely unknown category") == "other"


def test_determine_unit_kind_solid_liquid_household() -> None:
    """Unit kind classification should map to solid/liquid, with custom names as solid."""
    # Solid (weight) units
    assert _determine_unit_kind("g") == "solid"
    assert _determine_unit_kind("oz") == "solid"
    assert _determine_unit_kind("kg") == "solid"
    assert _determine_unit_kind("lb") == "solid"
    assert _determine_unit_kind("mg") == "solid"

    # Liquid (volume) units
    assert _determine_unit_kind("ml") == "liquid"
    assert _determine_unit_kind("fl oz") == "liquid"
    assert _determine_unit_kind("cup") == "liquid"
    assert _determine_unit_kind("tbsp") == "liquid"
    assert _determine_unit_kind("tsp") == "liquid"
    assert _determine_unit_kind("l") == "liquid"
    assert _determine_unit_kind("pint") == "liquid"
    assert _determine_unit_kind("quart") == "liquid"
    assert _determine_unit_kind("gallon") == "liquid"

    # Custom/household units fall back to solid, since their weight is known directly
    assert _determine_unit_kind("slice") == "solid"
    assert _determine_unit_kind("breast") == "solid"
    assert _determine_unit_kind("medium banana") == "solid"


def test_map_group_detects_common_categories() -> None:
    assert _map_group("cheese and dairy foods") == "dairy"
    assert _map_group("beverages and drinks") == "beverages"
    assert _map_group("spice mix") == "herbsAndSpices"


@pytest.mark.parametrize("description, expected", [
    ("Apples, raw, with skin", "fruits"),
    ("Peaches, canned in juice", "fruits"),
    ("Peaches canned in fruit juice", "fruits"),
    ("Pears in their own juice", "fruits"),
    ("Apple juice, canned or bottled", "beverages"),
    ("Orange juice, frozen concentrate", "beverages"),
    ("Pineapple and grapefruit juice drink", "beverages"),
    ("Apricot nectar, canned", "beverages"),
])
@pytest.mark.parametrize("category_field", ["foodCategory", "brandedFoodCategory"])
def test_import_splits_fruit_and_juice_category(description: str, expected: str, category_field: str) -> None:
    category = "Fruits and Fruit Juices"
    payload = {
        "fdcId": 12345,
        "description": description,
        category_field: {"description": category} if category_field == "foodCategory" else category,
    }
    mapped = USDAFdcImporter(api_key="test-key").map_to_food_request(payload)
    assert mapped.group == expected


@pytest.mark.parametrize("description, expected", [
    ("Egg, whole, raw, fresh", "proteins"),
    ("Egg, white, raw, fresh", "proteins"),
    ("Egg, yolk, raw, fresh", "proteins"),
    ("Eggs, scrambled, with milk and cheese", "proteins"),
    ("Liquid egg whites", "proteins"),
    ("Egg substitute, liquid", "proteins"),
    ("Milk, whole", "dairy"),
    ("Cheese, cheddar", "dairy"),
    ("Yogurt, plain", "dairy"),
    ("Eggnog", "dairy"),
])
@pytest.mark.parametrize("category_field", ["foodCategory", "brandedFoodCategory"])
def test_import_splits_dairy_and_egg_category(description: str, expected: str, category_field: str) -> None:
    category = "Dairy and Egg Products"
    payload = {
        "fdcId": 12345,
        "description": description,
        category_field: {"description": category} if category_field == "foodCategory" else category,
    }
    mapped = USDAFdcImporter(api_key="test-key").map_to_food_request(payload)
    assert mapped.group == expected


@pytest.mark.parametrize("category, description", [
    ("Beverages", "Soy milk, unsweetened"),
    ("Beverages", "Almond milk, vanilla"),
    ("Cereal Grains and Pasta", "Oat milk"),
    ("Nut and Seed Products", "Cashew milk"),
    ("Beverages", "Rice drink"),
    ("Beverages", "Almond beverage"),
    ("Other", "Dairy-free yogurt"),
    ("Other", "Plant-based cheese"),
    ("Other", "Coconut yogurt"),
    ("Milk Substitutes", "Unsweetened original"),
])
def test_map_group_keeps_dairy_alternatives_together(category: str, description: str) -> None:
    assert _map_group(category, description) == "dairy"


@pytest.mark.parametrize("category, description, expected", [
    ("Beverages", "Almond-flavored coffee", "beverages"),
    ("Nut and Seed Products", "Almonds", "nutsAndSeeds"),
    ("Cereal Grains and Pasta", "Oats", "grains"),
    ("Baked Products", "Bread, made with almond milk", "grains"),
    ("Vegetables", "Water chestnuts", "vegetables"),
    ("Nut and Seed Products", "Almond butter", "nutsAndSeeds"),
    ("Cereal Grains and Pasta", "Rice noodles", "grains"),
    ("", "Steak", "proteins"),
    ("", "Berries", "fruits"),
    ("", "Apples", "fruits"),
    ("", "Tea", "beverages"),
    ("", "Juices", "beverages"),
    ("", "Oatmeal", "grains"),
    ("Unknown category", "Chicken", "proteins"),
    ("Cheese and dairy foods", "Fruit-flavored yogurt", "dairy"),
])
def test_map_group_prefers_categories_and_matches_complete_words(category: str, description: str, expected: str) -> None:
    assert _map_group(category, description) == expected


def test_map_to_food_request_branded_payload() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food: dict[str, Any] = {
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
    assert request.subtype is None
    assert request.name == "CHEDDAR CHEESE"
    assert request.vendor == "Acme Foods"
    assert request.servings == 1.0
    assert request.nutrition.calories == 110
    assert request.nutrition.total_fat_g == 9
    assert request.nutrition.protein_g == 7


def test_map_to_food_request_foundation_defaults_vendor_and_serving() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food: dict[str, Any] = {
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
    assert request.subtype is None
    assert request.nutrition.serving_size_description == "100 g"
    assert request.nutrition.calories == 23
    assert request.nutrition.protein_g == 3
    assert request.nutrition.total_carbs_g == 4
    assert request.nutrition.sodium_mg == 79
    assert request.nutrition.calcium_mg == 99


def test_search_foods_uses_required_term_query_operators(monkeypatch: pytest.MonkeyPatch) -> None:
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


def test_search_foods_filters_to_visible_fields_only(monkeypatch: pytest.MonkeyPatch) -> None:
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


def test_search_foods_respects_selected_data_type(monkeypatch: pytest.MonkeyPatch) -> None:
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
    usda_food: dict[str, Any] = {
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
    usda_food: dict[str, Any] = {
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
    usda_food: dict[str, Any] = {
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
    usda_food: dict[str, Any] = {
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


@pytest.mark.parametrize("fat", [0, 93.7])
def test_foundation_nlea_fat_supports_validation_mapping_and_calorie_estimate(fat: float) -> None:
    importer = USDAFdcImporter(api_key="test-key")
    # FDC 748608 reports NLEA total fat, with no energy or other core macros.
    food: dict[str, Any] = {
        "fdcId": 748608,
        "description": "Oil, olive, extra virgin",
        "dataType": "Foundation",
        "foodNutrients": [
            {"nutrient": {"id": 1085, "number": "298", "name": "Total fat (NLEA)"}, "amount": fat},
        ],
    }
    mapped = importer.validate_and_map_food(food)
    assert importer.nutrition_status(food) == "available"
    assert mapped.nutrition.total_fat_g == Decimal(str(fat))
    assert mapped.nutrition.calories == round(fat * 9)
    assert importer.calorie_source(food) == ("estimated_from_macros" if fat else "missing")


@pytest.mark.parametrize("fat", [0, 100])
def test_nlea_fat_fallback_preserves_standard_total_fat(fat: float) -> None:
    importer = USDAFdcImporter(api_key="test-key")
    food: dict[str, Any] = {
        "fdcId": 748608,
        "dataType": "Foundation",
        "foodNutrients": [
            {"nutrient": {"number": "298"}, "amount": 93.7},
            {"nutrient": {"number": "204"}, "amount": fat},
        ],
    }
    assert importer.validate_and_map_food(food).nutrition.total_fat_g == fat


@pytest.mark.parametrize("carbs", [0, 12.5])
def test_carbohydrate_by_summation_supports_validation_and_calorie_estimation(carbs: float) -> None:
    importer = USDAFdcImporter(api_key="test-key")
    food: dict[str, Any] = {
        "fdcId": 746764,
        "dataType": "Foundation",
        "foodNutrients": [
            {"nutrient": {"id": 1050, "number": "205.2"}, "amount": carbs},
        ],
    }
    mapped = importer.validate_and_map_food(food)
    assert importer.nutrition_status(food) == "available"
    assert mapped.nutrition.total_carbs_g == round(carbs)
    assert mapped.nutrition.calories == round(carbs * 4)
    assert mapped.nutrition.protein_g == mapped.nutrition.total_fat_g == 0


def test_nlea_total_sugars_are_mapped_without_becoming_added_sugars() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    mapped = importer.validate_and_map_food({
        "fdcId": 746764,
        "dataType": "Foundation",
        "foodNutrients": [
            {"nutrient": {"number": "208"}, "amount": 40},
            {"nutrient": {"id": 1063, "number": "269.3"}, "amount": 7.5},
        ],
    })
    assert mapped.nutrition.total_sugar_g == 8
    assert mapped.nutrition.added_sugar_g == 0


@pytest.mark.parametrize("value", [0, 6])
@pytest.mark.parametrize("use_label", [False, True])
def test_alternate_carbs_and_sugars_preserve_existing_value_precedence(value: int, use_label: bool) -> None:
    importer = USDAFdcImporter(api_key="test-key")
    food: dict[str, Any] = {
        "fdcId": 746764,
        "dataType": "Foundation",
        "foodNutrients": [
            {"nutrient": {"number": "205.2"}, "amount": 20},
            {"nutrient": {"number": "269.3"}, "amount": 12},
            {"nutrient": {"number": "208"}, "amount": 100},
        ],
    }
    if use_label:
        food["labelNutrients"] = {
            "carbohydrates": {"value": value}, "sugars": {"value": value},
        }
    else:
        food["foodNutrients"].extend([
            {"nutrient": {"number": "205"}, "amount": value},
            {"nutrient": {"number": "269"}, "amount": value},
        ])
    mapped = importer.validate_and_map_food(food)
    assert mapped.nutrition.total_carbs_g == value
    assert mapped.nutrition.total_sugar_g == value
    assert mapped.nutrition.calories == 100


def test_map_to_food_request_uses_median_when_amount_missing() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food: dict[str, Any] = {
        "fdcId": 90005,
        "dataType": "Foundation",
        "description": "Median-only nutrient test",
        "foodNutrients": [
            {"nutrient": {"number": "208"}, "median": 50.0},
            {"nutrient": {"number": "203"}, "median": 2.5},
            {"nutrient": {"number": "205"}, "median": 11.0},
        ],
    }

    request = importer.map_to_food_request(usda_food)

    assert request.nutrition.calories == 50
    assert request.nutrition.protein_g == 2
    assert request.nutrition.total_carbs_g == 11


def test_nutrition_status_missing_core_when_only_non_core_nutrients_present() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food: dict[str, Any] = {
        "fdcId": 90006,
        "dataType": "Foundation",
        "description": "Sparse nutrient test",
        "foodNutrients": [
            {"nutrient": {"number": "255"}, "amount": 74.5},
            {"nutrient": {"number": "606"}, "amount": 0.7},
            {"nutrient": {"number": "269.3"}, "amount": 1.1},
        ],
    }

    assert importer.nutrition_status(usda_food) == "missing_core"


def test_nutrition_status_available_when_core_nutrients_present() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    usda_food: dict[str, Any] = {
        "fdcId": 90007,
        "dataType": "Foundation",
        "description": "Core nutrient test",
        "foodNutrients": [
            {"nutrient": {"number": "957"}, "amount": 65.0},
            {"nutrient": {"number": "205"}, "amount": 16.0},
        ],
    }

    assert importer.nutrition_status(usda_food) == "available"


def test_get_foods_by_ids_falls_back_for_ids_omitted_by_batch(monkeypatch: pytest.MonkeyPatch) -> None:
    importer = USDAFdcImporter(api_key="test-key")

    post_calls: list[tuple[str, list[int]]] = []

    def fake_post(path: str, json_payload: dict[str, object], params: dict[str, object]) -> list[dict[str, object]]:
        assert path == "/v1/foods"
        fdc_ids = [int(v) for v in json_payload["fdcIds"]]  # type: ignore[index]
        post_calls.append((path, fdc_ids))
        if fdc_ids == [100, 200]:
            # Simulate USDA intermittently omitting one requested ID in batch response.
            return [{"fdcId": 100, "dataType": "Foundation", "description": "Food 100"}]
        if fdc_ids == [200]:
            # Per-ID retry should recover the omitted item.
            return [{"fdcId": 200, "dataType": "Foundation", "description": "Food 200"}]
        return []

    monkeypatch.setattr(importer, "_post", fake_post)

    foods = importer.get_foods_by_ids([100, 200])

    assert [int(food["fdcId"]) for food in foods] == [100, 200]
    assert post_calls[:2] == [
        ("/v1/foods", [100, 200]),
        ("/v1/foods", [200]),
    ]

@pytest.mark.parametrize("network_failure", [True, False])
def test_usda_request_retryable_only_for_network_errors(monkeypatch: pytest.MonkeyPatch, network_failure: bool) -> None:
    import requests
    from usda_fdc_importer import USDAFdcImporterError

    def fail(*args: Any, **kwargs: Any) -> None:
        if network_failure:
            raise requests.Timeout("Timed out")
        raise ValueError("Invalid JSON")

    monkeypatch.setattr(requests, "post", fail)
    importer = USDAFdcImporter(api_key="test-key")
    with pytest.raises(USDAFdcImporterError) as error:
        importer._post("/v1/foods", {"fdcIds": [1]}, {})
    assert error.value.retryable is network_failure


def test_foundation_milk_uses_liquid_total_and_primary_serving_with_measured_density() -> None:
    importer = USDAFdcImporter(api_key="test-key")
    food = {
        "fdcId": 10, "dataType": "Foundation",
        "description": "Milk, reduced fat, fluid, 2% milkfat",
        "foodNutrients": [{"nutrient": {"number": "208"}, "amount": 50}],
        "foodPortions": [{"amount": 1, "modifier": "cup", "measureUnit": {"name": "undetermined"}, "gramWeight": 244}],
    }
    mapped = importer.validate_and_map_food(food)
    assert mapped.unit_type == "liquid"
    assert mapped.density == pytest.approx(244 / 236.588)
    assert mapped.size_metric == round(100 / mapped.density)
    assert mapped.size_imperial == pytest.approx(100 / mapped.density / 29.5735, abs=0.001)
    primary, cup = mapped.nutrition_alternatives
    assert primary.is_primary
    assert primary.serving_unit_kind == "liquid"
    assert primary.serving_unit == "ml"
    assert primary.serving_value == pytest.approx(100 / mapped.density)
    assert float(primary.nutrition.serving_size_metric) == pytest.approx(100 / mapped.density, abs=0.01)
    assert primary.nutrition.calories == 50
    assert not cup.is_primary
    assert cup.serving_unit == "cup"
    assert cup.serving_unit_kind == "liquid"
    assert float(cup.nutrition.serving_size_metric) == pytest.approx(236.588, abs=0.01)
    assert float(cup.nutrition.serving_size_imperial) == pytest.approx(8, abs=0.01)
    assert cup.nutrition.calories == 122


@pytest.mark.parametrize("portion_fields", [
    {"portionDescription": "1 serving"},
    {"portionDescription": "1 RACC"},
    {"portionDescription": "1.0 racc"},
    {"modifier": "racc", "measureUnit": {"name": "undetermined"}},
    {"modifier": "serving", "measureUnit": {"name": "undetermined"}},
    {"measureUnit": {"name": "racc"}},
])
def test_import_prefers_single_serving_and_preserves_other_portions(portion_fields: dict[str, Any]) -> None:
    mapped = USDAFdcImporter(api_key="test-key").map_to_food_request({
        "fdcId": 14, "description": "Example food", "dataType": "Foundation",
        "foodNutrients": [{"nutrient": {"number": "208"}, "amount": 200}],
        "foodPortions": [
            {"amount": 1, "measureUnit": {"name": "cup"}, "gramWeight": 120},
            {"amount": 1, "gramWeight": 30, **portion_fields},
        ],
    })
    primary, original, cup = mapped.nutrition_alternatives
    assert primary.is_primary
    assert sum(alt.is_primary for alt in mapped.nutrition_alternatives) == 1
    assert [alt.ordinal for alt in mapped.nutrition_alternatives] == [0, 1, 2]
    assert primary.nutrition.serving_size_description.lower() in {"1 serving", "1.0 serving"}
    assert primary.nutrition.calories == 60
    assert primary.nutrition.serving_size_metric == 30
    assert mapped.nutrition is primary.nutrition
    assert mapped.size_description == primary.nutrition.serving_size_description
    assert mapped.size_metric == 30
    assert original.nutrition.calories == 200
    assert not original.is_primary and original.serving_unit == "g"
    assert cup.nutrition.calories == 240
    assert not cup.is_primary and cup.serving_unit == "cup"


def test_import_does_not_promote_multiple_servings() -> None:
    mapped = USDAFdcImporter(api_key="test-key").map_to_food_request({
        "fdcId": 15, "description": "Example food",
        "foodPortions": [{"amount": 2, "portionDescription": "2 servings", "gramWeight": 60}],
    })
    assert mapped.nutrition_alternatives[0].is_primary
    assert mapped.nutrition_alternatives[0].serving_unit == "g"
    assert not mapped.nutrition_alternatives[1].is_primary


def test_preferred_serving_scales_branded_label_nutrition() -> None:
    mapped = USDAFdcImporter(api_key="test-key").map_to_food_request({
        "fdcId": 16, "description": "Example food", "dataType": "Branded",
        "servingSize": 30, "servingSizeUnit": "g",
        "labelNutrients": {"calories": {"value": 100}},
        "foodPortions": [{"amount": 1, "modifier": "racc", "gramWeight": 60}],
    })
    primary, original = mapped.nutrition_alternatives
    assert primary.is_primary and primary.nutrition.calories == 200
    assert mapped.nutrition.calories == 200 and mapped.size_metric == 60
    assert not original.is_primary and original.nutrition.calories == 100


def test_preferred_liquid_serving_retains_density_and_volume() -> None:
    mapped = USDAFdcImporter(api_key="test-key").map_to_food_request({
        "fdcId": 17, "description": "Milk", "dataType": "Foundation",
        "foodNutrients": [{"nutrient": {"number": "208"}, "amount": 50}],
        "foodPortions": [
            {"amount": 1, "measureUnit": {"name": "cup"}, "gramWeight": 244},
            {"amount": 1, "modifier": "racc", "gramWeight": 244},
        ],
    })
    primary = mapped.nutrition_alternatives[0]
    assert primary.is_primary and primary.nutrition.serving_size_description == "1 serving"
    assert mapped.density == pytest.approx(244 / 236.588)
    assert mapped.unit_type == "liquid"
    assert mapped.size_metric == 237
    assert mapped.size_imperial == pytest.approx(8, abs=0.001)
    assert mapped.nutrition.calories == 122
    assert primary.nutrition.serving_size_metric == 244


@pytest.mark.parametrize("unit,amount,ml", [("ml", 240, 240), ("fl oz", 8, 236.588), ("l", 0.25, 250)])
def test_branded_liquid_serving_units_preserve_label_nutrition(unit: str, amount: float, ml: float) -> None:
    mapped = USDAFdcImporter(api_key="test-key").validate_and_map_food({
        "fdcId": 11, "dataType": "Branded", "description": "Milk",
        "servingSize": amount, "servingSizeUnit": unit,
        "labelNutrients": {"calories": {"value": 120}},
    })
    assert mapped.unit_type == "liquid"
    assert mapped.size_metric == round(ml)
    assert float(mapped.nutrition.serving_size_metric) == pytest.approx(ml, abs=0.01)
    assert mapped.nutrition.calories == 120
    primary = mapped.nutrition_alternatives[0]
    assert primary.is_primary and primary.serving_unit_kind == "liquid"
    assert primary.serving_value == amount and primary.serving_unit == unit


def test_solid_food_keeps_weight_total_and_explicit_primary_with_volume_alternative() -> None:
    mapped = USDAFdcImporter(api_key="test-key").validate_and_map_food({
        "fdcId": 12, "dataType": "Foundation", "description": "Flour, wheat",
        "labelNutrients": {"calories": {"value": 360}},
        "foodPortions": [{"amount": 1, "measureUnit": {"name": "cup"}, "gramWeight": 120}],
    })
    assert mapped.unit_type == "solid" and mapped.size_metric == 100
    primary, cup = mapped.nutrition_alternatives
    assert primary.is_primary and primary.serving_unit == "g"
    assert primary.serving_value == 100 and primary.serving_unit_kind == "solid"
    assert cup.serving_unit_kind == "liquid"
    assert float(cup.nutrition.serving_size_metric) == pytest.approx(236.588, abs=0.01)
    assert cup.nutrition.calories == 432


@pytest.mark.parametrize("description", ["Milk, dry", "Milk chocolate", "Cheese", "Yogurt", "Water chestnuts", "Nuts, roasted in oil"])
def test_solid_descriptions_are_not_mistaken_for_liquids(description: str) -> None:
    mapped = USDAFdcImporter(api_key="test-key").validate_and_map_food({
        "fdcId": 13, "description": description, "labelNutrients": {"calories": {"value": 100}},
    })
    assert mapped.unit_type == "solid"
    assert mapped.nutrition_alternatives[0].serving_unit_kind == "solid"
