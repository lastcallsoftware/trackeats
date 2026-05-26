import os
import re
from typing import Any, cast

import requests as req

from schemas import FoodRequest, NutritionRequest


USDA_SOURCE = "usda_fdc"
_ALLOWED_DATA_TYPES = ["Branded", "Foundation"]


class USDAFdcImporterError(Exception):
    pass


class USDAFdcImporter:
    def __init__(self, api_key: str, timeout: int = 10):
        if not api_key:
            raise USDAFdcImporterError("USDA_FDC_API_KEY is missing")
        self._api_key = api_key
        self._timeout = timeout
        self._base_url = os.environ.get("USDA_FDC_BASE_URL", "https://api.nal.usda.gov/fdc").rstrip("/")

    def search_foods(
        self,
        query: str,
        page_number: int = 1,
        page_size: int = 25,
        data_types: list[str] | None = None,
    ) -> dict[str, Any]:
        requested_page = max(1, page_number)
        requested_page_size = max(1, min(page_size, 200))
        selected_data_types = _normalize_data_types(data_types)
        terms = _query_terms(query)
        use_visible_field_filter = len(terms) > 1 and not _has_search_operators(query)
        effective_query = _build_required_terms_query(query)
        payload = self._search_page(
            query=effective_query,
            page_number=requested_page,
            page_size=requested_page_size,
            data_types=selected_data_types,
        )
        foods = self._filtered_foods(payload, selected_data_types)
        if use_visible_field_filter:
            foods = [food for food in foods if _visible_fields_match_all_terms(food, terms)]

        return {
            "totalHits": int(payload.get("totalHits", 0) or 0),
            "currentPage": int(payload.get("currentPage", requested_page) or requested_page),
            "totalPages": int(payload.get("totalPages", 0) or 0),
            "foods": foods,
        }

    def _search_page(self, query: str, page_number: int, page_size: int, data_types: list[str]) -> dict[str, Any]:
        params: dict[str, Any] = {
            "api_key": self._api_key,
            "query": query,
            "pageNumber": max(1, page_number),
            "pageSize": max(1, min(page_size, 200)),
            "dataType": data_types,
        }
        payload = self._get("/v1/foods/search", params)

        # USDA docs claim list response, but actual payload is an object in practice.
        if isinstance(payload, list):
            payload_list = cast(list[Any], payload)
            first_item_any: Any = payload_list[0] if len(payload_list) > 0 else None
            payload = cast(dict[str, Any], first_item_any if isinstance(first_item_any, dict) else {})
        if not isinstance(payload, dict):
            return {"totalHits": 0, "currentPage": 1, "totalPages": 0, "foods": []}
        return cast(dict[str, Any], payload)

    def _filtered_foods(self, payload: dict[str, Any], allowed_data_types: list[str] | None = None) -> list[dict[str, Any]]:
        foods = payload.get("foods")
        if not isinstance(foods, list):
            return []

        allowed_set = set(allowed_data_types if allowed_data_types else _ALLOWED_DATA_TYPES)

        filtered: list[dict[str, Any]] = []
        for item_any in cast(list[Any], foods):
            if not isinstance(item_any, dict):
                continue
            item = cast(dict[str, Any], item_any)
            data_type = str(item.get("dataType", ""))
            if data_type not in allowed_set:
                continue
            filtered.append(item)
        return filtered

    def get_foods_by_ids(self, fdc_ids: list[int]) -> list[dict[str, Any]]:
        deduped_ids = list(dict.fromkeys([food_id for food_id in fdc_ids if food_id > 0]))
        if not deduped_ids:
            return []

        foods: list[dict[str, Any]] = []
        seen_ids: set[int] = set()
        chunk_size = 20
        for i in range(0, len(deduped_ids), chunk_size):
            chunk = deduped_ids[i : i + chunk_size]
            payload = self._post(
                "/v1/foods",
                {"fdcIds": chunk, "format": "full"},
                {"api_key": self._api_key},
            )
            if isinstance(payload, list):
                for item_any in cast(list[Any], payload):
                    if not isinstance(item_any, dict):
                        continue
                    item = cast(dict[str, Any], item_any)
                    if str(item.get("dataType", "")) not in _ALLOWED_DATA_TYPES:
                        continue
                    item_fdc_id = item.get("fdcId")
                    if item_fdc_id is None:
                        continue
                    try:
                        parsed_fdc_id = int(item_fdc_id)
                    except Exception:
                        continue
                    foods.append(item)
                    seen_ids.add(parsed_fdc_id)

        # USDA batch endpoint can intermittently omit requested IDs.
        missing_ids = [fdc_id for fdc_id in deduped_ids if fdc_id not in seen_ids]
        for missing_id in missing_ids:
            retry_attempts = 3
            for _ in range(retry_attempts):
                retry_payload = self._post(
                    "/v1/foods",
                    {"fdcIds": [missing_id], "format": "full"},
                    {"api_key": self._api_key},
                )
                if not isinstance(retry_payload, list):
                    continue

                found_missing_id = False
                for retry_item_any in cast(list[Any], retry_payload):
                    if not isinstance(retry_item_any, dict):
                        continue
                    retry_item = cast(dict[str, Any], retry_item_any)
                    if str(retry_item.get("dataType", "")) not in _ALLOWED_DATA_TYPES:
                        continue
                    retry_fdc_id = retry_item.get("fdcId")
                    if retry_fdc_id is None:
                        continue
                    try:
                        parsed_retry_fdc_id = int(retry_fdc_id)
                    except Exception:
                        continue
                    if parsed_retry_fdc_id in seen_ids:
                        continue
                    foods.append(retry_item)
                    seen_ids.add(parsed_retry_fdc_id)
                    if parsed_retry_fdc_id == missing_id:
                        found_missing_id = True

                if found_missing_id:
                    break

        return foods

    def map_to_food_request(self, usda_food: dict[str, Any]) -> FoodRequest:
        fdc_id = int(usda_food.get("fdcId") or 0)
        if fdc_id <= 0:
            raise USDAFdcImporterError("USDA payload missing valid fdcId")

        data_type = str(usda_food.get("dataType") or "")
        description = _truncate(str(usda_food.get("description") or "Unnamed USDA food"), 50)

        vendor = str(usda_food.get("brandOwner") or "").strip()
        if not vendor:
            vendor = "USDA Foundation" if data_type == "Foundation" else "USDA"
        vendor = _truncate(vendor, 50)

        category_blob = " ".join(
            [
                str(usda_food.get("brandedFoodCategory") or ""),
                str(_food_category_description(usda_food) or ""),
                description,
            ]
        ).strip()

        subtype = str(usda_food.get("brandedFoodCategory") or _food_category_description(usda_food) or "").strip()
        subtype = _truncate(subtype, 50) if subtype else None

        long_description = str(
            usda_food.get("ingredients")
            or usda_food.get("additionalDescriptions")
            or usda_food.get("scientificName")
            or ""
        ).strip()
        long_description = _truncate(long_description, 100) if long_description else None

        serving_size, serving_unit = _serving_size_fields(usda_food)
        serving_size_description = _serving_size_description(usda_food, serving_size, serving_unit)
        serving_size_g, serving_size_oz = _serving_mass(serving_size, serving_unit)

        calorie_value, _ = _calorie_value_with_source(usda_food)

        nutrition = NutritionRequest(
            serving_size_description=_truncate(serving_size_description, 50),
            serving_size_g=serving_size_g,
            serving_size_oz=serving_size_oz,
            calories=_to_int(calorie_value),
            total_fat_g=_to_float(_nutrient_value_any(usda_food, ["1004", "204"], "fat")),
            saturated_fat_g=_to_float(_nutrient_value_any(usda_food, ["1258", "606"], "saturatedFat")),
            trans_fat_g=_to_float(_nutrient_value_any(usda_food, ["1257", "605"], "transFat")),
            cholesterol_mg=_to_int(_nutrient_value_any(usda_food, ["1253", "601"], "cholesterol")),
            sodium_mg=_to_int(_nutrient_value_any(usda_food, ["1093", "307"], "sodium")),
            total_carbs_g=_to_int(_nutrient_value_any(usda_food, ["1005", "205"], "carbohydrates")),
            fiber_g=_to_int(_nutrient_value_any(usda_food, ["1079", "291"], "fiber")),
            total_sugar_g=_to_int(_nutrient_value_any(usda_food, ["2000", "269"], "sugars")),
            added_sugar_g=_to_int(_nutrient_value_any(usda_food, ["1235", "539"], None)),
            protein_g=_to_int(_nutrient_value_any(usda_food, ["1003", "203"], "protein")),
            vitamin_d_mcg=_to_int(_nutrient_value_any(usda_food, ["1114", "328"], None)),
            calcium_mg=_to_int(_nutrient_value_any(usda_food, ["1087", "301"], "calcium")),
            iron_mg=_to_float(_nutrient_value_any(usda_food, ["1089", "303"], "iron")),
            potassium_mg=_to_int(_nutrient_value_any(usda_food, ["1092", "306"], "postassium")),
        )

        return FoodRequest(
            group=_map_group(category_blob),
            name=description,
            vendor=vendor,
            servings=1.0,
            subtype=subtype,
            description=long_description,
            size_description=_truncate(serving_size_description, 50),
            size_description_2=None,
            size_oz=serving_size_oz,
            size_g=serving_size_g,
            source=USDA_SOURCE,
            fdc_id=fdc_id,
            fdc_data_type=_truncate(data_type, 30) if data_type else None,
            price=None,
            price_date=None,
            shelf_life=None,
            nutrition=nutrition,
        )

    def calorie_source(self, usda_food: dict[str, Any]) -> str:
        _, source = _calorie_value_with_source(usda_food)
        return source

    def nutrition_status(self, usda_food: dict[str, Any]) -> str:
        return "available" if _has_core_nutrition_data(usda_food) else "missing_core"

    def _get(self, path: str, params: dict[str, Any]) -> Any:
        url = f"{self._base_url}{path}"
        try:
            response = req.get(url, params=params, timeout=self._timeout)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise USDAFdcImporterError(f"USDA request failed ({path}): {str(e)}")

    def _post(self, path: str, json_payload: dict[str, Any], params: dict[str, Any]) -> Any:
        url = f"{self._base_url}{path}"
        try:
            response = req.post(url, params=params, json=json_payload, timeout=self._timeout)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise USDAFdcImporterError(f"USDA request failed ({path}): {str(e)}")


def _truncate(value: str, max_len: int) -> str:
    if len(value) <= max_len:
        return value
    return value[: max_len - 3].rstrip() + "..."


def _to_int(value: float | int | None) -> int:
    if value is None:
        return 0
    try:
        return int(round(float(value)))
    except Exception:
        return 0


def _to_float(value: float | int | None) -> float:
    if value is None:
        return 0.0
    try:
        return round(float(value), 3)
    except Exception:
        return 0.0


def _query_terms(query: str) -> list[str]:
    return [term for term in re.split(r"\s+", _normalize_search_text(query)) if term]


def _normalize_data_types(data_types: list[str] | None) -> list[str]:
    if not data_types:
        return list(_ALLOWED_DATA_TYPES)

    normalized: list[str] = []
    seen: set[str] = set()
    for value in data_types:
        cleaned = str(value).strip().lower()
        if cleaned == "branded":
            canonical = "Branded"
        elif cleaned == "foundation":
            canonical = "Foundation"
        else:
            continue

        if canonical not in seen:
            normalized.append(canonical)
            seen.add(canonical)

    return normalized if normalized else list(_ALLOWED_DATA_TYPES)


def _normalize_search_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _has_search_operators(query: str) -> bool:
    normalized_query = re.sub(r"\s+", " ", query.strip())
    return bool(re.search(r'[+\-"*():]', normalized_query))


def _build_required_terms_query(query: str) -> str:
    normalized_query = re.sub(r"\s+", " ", query.strip())
    terms = _query_terms(normalized_query)
    if len(terms) <= 1:
        return normalized_query

    # Respect advanced user-entered search operators/field selectors.
    if _has_search_operators(normalized_query):
        return normalized_query

    return " ".join(f"+{term}" for term in terms)


def _food_category_description(usda_food: dict[str, Any]) -> str:
    food_category = usda_food.get("foodCategory")
    if isinstance(food_category, dict):
        typed_food_category = cast(dict[str, Any], food_category)
        return str(typed_food_category.get("description") or "")
    return ""


def _visible_fields_match_all_terms(usda_food: dict[str, Any], terms: list[str]) -> bool:
    if not terms:
        return True

    visible_search_text = _normalize_search_text(
        " ".join(
            [
                str(usda_food.get("description") or ""),
                str(usda_food.get("brandOwner") or ""),
                str(usda_food.get("dataType") or ""),
            ]
        )
    )
    return all(term in visible_search_text for term in terms)


def _serving_size_fields(usda_food: dict[str, Any]) -> tuple[float | None, str | None]:
    raw_size = usda_food.get("servingSize")
    raw_unit = usda_food.get("servingSizeUnit")

    size: float | None = None
    try:
        if raw_size is not None:
            size = float(raw_size)
    except Exception:
        size = None

    unit = str(raw_unit).strip().lower() if raw_unit else None
    return size, unit


def _serving_size_description(usda_food: dict[str, Any], size: float | None, unit: str | None) -> str:
    household = str(usda_food.get("householdServingFullText") or "").strip()
    if household:
        return household

    if size is not None and unit:
        size_display = int(size) if size.is_integer() else round(size, 2)
        return f"{size_display} {unit}"

    return "100 g"


def _serving_mass(size: float | None, unit: str | None) -> tuple[int | None, float | None]:
    if size is None or not unit:
        return (100, round(100.0 / 28.3495, 3))

    if unit in {"g", "gram", "grams"}:
        grams = int(round(size))
        return grams, round(grams / 28.3495, 3)

    if unit in {"oz", "ounce", "ounces"}:
        ounces = round(size, 3)
        return int(round(ounces * 28.3495)), ounces

    return (None, None)


def _label_nutrient(usda_food: dict[str, Any], field: str | None) -> float | None:
    if not field:
        return None
    label_nutrients_any = usda_food.get("labelNutrients")
    if not isinstance(label_nutrients_any, dict):
        return None
    label_nutrients = cast(dict[str, Any], label_nutrients_any)
    nutrient_obj_any = label_nutrients.get(field)
    if not isinstance(nutrient_obj_any, dict):
        return None
    nutrient_obj = cast(dict[str, Any], nutrient_obj_any)
    value = nutrient_obj.get("value")
    if value is None:
        return None
    try:
        return float(value)
    except Exception:
        return None


def _calorie_value_with_source(usda_food: dict[str, Any]) -> tuple[float | None, str]:
    label_value = _label_nutrient(usda_food, "calories")
    if label_value is not None:
        return label_value, "label"

    direct_energy_value = _nutrient_value_any(usda_food, ["1008", "208"], None)
    if direct_energy_value is not None:
        return direct_energy_value, "direct_energy"

    # USDA Foundation entries often report calories via Atwater energy IDs.
    atwater_energy_value = _nutrient_value_any(usda_food, ["957", "958"], None)
    if atwater_energy_value is not None:
        return atwater_energy_value, "atwater_energy"

    # Last fallback: estimate calories from macros when explicit energy is missing.
    protein_g = _nutrient_value_any(usda_food, ["1003", "203"], "protein") or 0.0
    carbs_g = _nutrient_value_any(usda_food, ["1005", "205"], "carbohydrates") or 0.0
    fat_g = _nutrient_value_any(usda_food, ["1004", "204"], "fat") or 0.0
    estimated = (protein_g * 4.0) + (carbs_g * 4.0) + (fat_g * 9.0)
    if estimated > 0:
        return estimated, "estimated_from_macros"

    return None, "missing"


def _has_core_nutrition_data(usda_food: dict[str, Any]) -> bool:
    calorie_value, calorie_source = _calorie_value_with_source(usda_food)
    if calorie_value is not None and calorie_source != "missing":
        return True

    protein = _nutrient_value_any(usda_food, ["1003", "203"], "protein")
    carbs = _nutrient_value_any(usda_food, ["1005", "205"], "carbohydrates")
    total_fat = _nutrient_value_any(usda_food, ["1004", "204"], "fat")
    sodium = _nutrient_value_any(usda_food, ["1093", "307"], "sodium")

    return any(value is not None for value in [protein, carbs, total_fat, sodium])


def _nutrient_value_any(
    usda_food: dict[str, Any],
    nutrient_numbers: list[str],
    label_field: str | None,
) -> float | None:
    label_value = _label_nutrient(usda_food, label_field)
    if label_value is not None:
        return label_value

    for nutrient_number in nutrient_numbers:
        matched = _nutrient_value(usda_food, nutrient_number, None)
        if matched is not None:
            return matched

    return None


def _nutrient_value(usda_food: dict[str, Any], nutrient_number: str, label_field: str | None) -> float | None:
    label_value = _label_nutrient(usda_food, label_field)
    if label_value is not None:
        return label_value

    food_nutrients = usda_food.get("foodNutrients")
    if not isinstance(food_nutrients, list):
        return None

    for nutrient_item_any in cast(list[Any], food_nutrients):
        if not isinstance(nutrient_item_any, dict):
            continue
        nutrient_item = cast(dict[str, Any], nutrient_item_any)

        number_candidate = nutrient_item.get("number")
        if number_candidate is None:
            number_candidate = nutrient_item.get("nutrientNumber")
        if number_candidate is None and isinstance(nutrient_item.get("nutrient"), dict):
            number_candidate = nutrient_item["nutrient"].get("number")

        if str(number_candidate) != nutrient_number:
            continue

        value = nutrient_item.get("amount")
        if value is None:
            value = nutrient_item.get("median")
        if value is None:
            return None
        try:
            return float(value)
        except Exception:
            return None

    return None


def _map_group(group_text: str) -> str:
    normalized = group_text.strip().lower()

    group_rules = [
        ("beverages", ["beverage", "juice", "soda", "drink", "coffee", "tea", "water"]),
        ("dairy", ["dairy", "milk", "cheese", "yogurt", "butter"]),
        ("fruits", ["fruit", "apple", "banana", "berry", "citrus"]),
        ("vegetables", ["vegetable", "broccoli", "lettuce", "carrot", "spinach", "potato"]),
        ("grains", ["grain", "bread", "rice", "pasta", "oat", "cereal", "flour"]),
        ("nutsAndSeeds", ["nut", "seed", "almond", "peanut", "walnut", "sunflower"]),
        ("proteins", ["protein", "meat", "beef", "pork", "chicken", "fish", "egg", "tofu"]),
        ("condiments", ["condiment", "sauce", "ketchup", "mustard", "dressing", "seasoning"]),
        ("fatsAndSugars", ["oil", "fat", "sugar", "syrup", "honey", "shortening"]),
        ("preparedFoods", ["prepared", "frozen", "meal", "entree", "pizza", "sandwich", "soup"]),
        ("herbsAndSpices", ["spice", "herb", "basil", "oregano", "pepper", "curry"]),
    ]

    for group_name, keywords in group_rules:
        if any(keyword in normalized for keyword in keywords):
            return group_name

    return "other"
