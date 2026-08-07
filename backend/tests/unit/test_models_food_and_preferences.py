import datetime
from types import SimpleNamespace
import pytest
import models
from schemas import FoodRequest, NutritionRequest, NutritionAlternativeRequest


class _SessionStub:
    def __init__(self) -> None:
        self.scalar_result: object | None = None
        self.get_map: dict[tuple[object, int], object | None] = {}
        self.added: list[object] = []
        self.deleted: list[object] = []
        self.flushed = False

    def scalar(self, statement: object) -> object | None:
        _ = statement
        return self.scalar_result

    def get(self, model_class: object, key: int) -> object | None:
        return self.get_map.get((model_class, key))

    def add(self, obj: object) -> None:
        self.added.append(obj)

    def delete(self, obj: object) -> None:
        self.deleted.append(obj)

    def flush(self) -> None:
        self.flushed = True
        if self.added:
            newest = self.added[-1]
            if getattr(newest, "id", None) is None:
                setattr(newest, "id", 77)


def _food_request(food_id: int | None = None) -> FoodRequest:
    return FoodRequest(
        id=food_id,
        group="fruits",
        name="Orange",
        vendor="Farmer Market",
        servings=2.0,
        subtype="Citrus",
        description="Fresh oranges",
        size_description="1 bag",
        size_imperial=16.0,
        size_metric=454,
        price=4.99,
        price_date="2026-04-01",
        shelf_life="7 days",
        nutrition=NutritionRequest(
            serving_size_description="1 orange",
            serving_size_oz=4.0,
            serving_size_g=113,
            calories=62,
            total_fat_g=0.2,
            saturated_fat_g=0.0,
            trans_fat_g=0.0,
            cholesterol_mg=0,
            sodium_mg=1,
            total_carbs_g=15,
            fiber_g=3,
            total_sugar_g=12,
            added_sugar_g=0,
            protein_g=1,
            vitamin_d_mcg=0,
            calcium_mg=52,
            iron_mg=0.1,
            potassium_mg=237,
        ),
    )


def test_food_from_schema_maps_fields_and_nutrition() -> None:
    request = _food_request(food_id=5)
    food = models.Food(user_id=1)

    food.from_schema(user_id=1, food_request=request)

    assert food.id == 5
    assert food.user_id == 1
    assert food.group == models.FoodGroup.fruits
    assert food.name == "Orange"
    assert food.price == 4.99
    assert food.price_date == datetime.date(2026, 4, 1)
    assert food.nutrition.serving_size_description == "1 orange"
    assert food.nutrition.calories == 62
    assert food.nutrition.total_carbs_g == 15


def test_food_add_creates_record_and_populates_keylist(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _SessionStub()
    monkeypatch.setattr(models.db, "session", session, raising=False)

    keylists: dict[str, dict[int, int]] = {}
    request = _food_request(food_id=123)

    added = models.Food.add(user_id=1, food=request, keylists=keylists)

    assert session.flushed is True
    assert len(session.added) == 1
    assert added is session.added[0]
    assert added.id == 77
    assert keylists == {"foods": {123: 77}}


def test_food_update_requires_id() -> None:
    request = _food_request(food_id=None)

    with pytest.raises(ValueError, match="Food ID is required for update"):
        models.Food.update(user_id=1, food=request)


def test_food_update_raises_when_record_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _SessionStub()
    monkeypatch.setattr(models.db, "session", session, raising=False)
    request = _food_request(food_id=9)

    with pytest.raises(ValueError, match="Food record 9 not found"):
        models.Food.update(user_id=1, food=request)


def test_food_delete_removes_food_and_its_nutrition(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _SessionStub()
    food_dao = SimpleNamespace(id=8, nutrition_id=99)
    nutrition_dao = SimpleNamespace(id=99)
    session.get_map[(models.Food, 8)] = food_dao
    session.get_map[(models.Nutrition, 99)] = nutrition_dao
    monkeypatch.setattr(models.db, "session", session, raising=False)

    models.Food.delete(user_id=1, food_id=8)

    assert session.deleted == [food_dao, nutrition_dao]


def _food_request_with_alternatives() -> FoodRequest:
    """Build a FoodRequest with a primary serving size and one alternative."""
    return FoodRequest(
        id=10,
        group="fruits",
        name="Orange",
        vendor="Farmer Market",
        servings=2.0,
        nutrition=NutritionRequest(
            serving_size_description="1 orange",
            serving_size_oz=4.0,
            serving_size_g=113,
            calories=62,
            total_fat_g=0.2,
            saturated_fat_g=0.0,
            trans_fat_g=0.0,
            cholesterol_mg=0,
            sodium_mg=1,
            total_carbs_g=15,
            fiber_g=3,
            total_sugar_g=12,
            added_sugar_g=0,
            protein_g=1,
            vitamin_d_mcg=0,
            calcium_mg=52,
            iron_mg=0.1,
            potassium_mg=237,
        ),
        nutrition_alternatives=[
            NutritionAlternativeRequest(
                serving_value=1,
                serving_unit="g",
                serving_unit_kind="solid",
                is_primary=True,
                nutrition=NutritionRequest(
                    serving_size_description="1 orange",
                    serving_size_oz=4.0,
                    serving_size_g=113,
                    calories=62,
                    total_fat_g=0.2,
                    saturated_fat_g=0.0,
                    trans_fat_g=0.0,
                    cholesterol_mg=0,
                    sodium_mg=1,
                    total_carbs_g=15,
                    fiber_g=3,
                    total_sugar_g=12,
                    added_sugar_g=0,
                    protein_g=1,
                    vitamin_d_mcg=0,
                    calcium_mg=52,
                    iron_mg=0.1,
                    potassium_mg=237,
                ),
            ),
            NutritionAlternativeRequest(
                serving_value=100,
                serving_unit="ml",
                serving_unit_kind="liquid",
                nutrition=NutritionRequest(
                    serving_size_description="100 ml",
                    serving_size_oz=3.5,
                    serving_size_g=100,
                    calories=25,
                    total_fat_g=0.0,
                    saturated_fat_g=0.0,
                    trans_fat_g=0.0,
                    cholesterol_mg=0,
                    sodium_mg=0,
                    total_carbs_g=6,
                    fiber_g=0,
                    total_sugar_g=5,
                    added_sugar_g=0,
                    protein_g=0,
                    vitamin_d_mcg=0,
                    calcium_mg=0,
                    iron_mg=0.0,
                    potassium_mg=0,
                ),
            ),
        ],
    )


def test_food_request_validates_single_primary() -> None:
    """A FoodRequest with more than one primary serving size should fail validation."""
    request = _food_request_with_alternatives()
    # Mark both alternatives as primary
    request.nutrition_alternatives[0].is_primary = True
    request.nutrition_alternatives[1].is_primary = True

    with pytest.raises(Exception, match="Only one serving size may be marked as primary"):
        FoodRequest.model_validate(request.model_dump())


def test_food_request_accepts_single_primary() -> None:
    """A FoodRequest with exactly one primary serving size should validate."""
    request = _food_request_with_alternatives()
    validated = FoodRequest.model_validate(request.model_dump())
    assert validated.nutrition_alternatives[0].is_primary is True
    assert validated.nutrition_alternatives[1].is_primary is False


def test_food_add_persists_alternatives_with_primary(monkeypatch: pytest.MonkeyPatch) -> None:
    """Food.add should create NutritionAlternative rows, reusing the primary Nutrition."""
    session = _SessionStub()
    monkeypatch.setattr(models.db, "session", session, raising=False)

    request = _food_request_with_alternatives()
    added = models.Food.add(user_id=1, food=request)

    # The primary alternative should reuse the Food's primary Nutrition record
    primary_alt = [a for a in session.added if isinstance(a, models.NutritionAlternative) and a.is_primary]
    assert len(primary_alt) == 1
    assert primary_alt[0].nutrition_id == added.nutrition_id

    # The non-primary alternative should have its own Nutrition record
    non_primary_alt = [a for a in session.added if isinstance(a, models.NutritionAlternative) and not a.is_primary]
    assert len(non_primary_alt) == 1
    assert non_primary_alt[0].nutrition_id != added.nutrition_id


def test_nutrition_alternative_compute_serving_weight_solid() -> None:
    """Solid serving sizes compute weight directly from the unit."""
    alt = models.NutritionAlternative()
    alt.serving_value = 2
    alt.serving_unit = "oz"
    alt.serving_unit_kind = "solid"
    alt.household_weight_g = None

    weight_g = alt.compute_serving_weight_g()
    assert weight_g is not None
    assert weight_g == round(2 * 28.3495, 2)
    weight_oz = alt.compute_serving_weight_oz()
    assert weight_oz is not None
    assert weight_oz == round(weight_g / 28.3495, 2)


def test_nutrition_alternative_compute_serving_weight_liquid() -> None:
    """Liquid serving sizes compute weight from volume × density."""
    alt = models.NutritionAlternative()
    alt.serving_value = 100
    alt.serving_unit = "ml"
    alt.serving_unit_kind = "liquid"
    alt.household_weight_g = None

    weight_g = alt.compute_serving_weight_g(density=1.0)
    assert weight_g == 100.0

    weight_g_dense = alt.compute_serving_weight_g(density=1.5)
    assert weight_g_dense == 150.0


def test_nutrition_alternative_compute_serving_weight_arbitrary() -> None:
    """Arbitrary serving sizes use the user-provided household weight."""
    alt = models.NutritionAlternative()
    alt.serving_value = 1
    alt.serving_unit = "slice"
    alt.serving_unit_kind = "arbitrary"
    alt.household_weight_g = 45.0

    weight_g = alt.compute_serving_weight_g()
    assert weight_g == 45.0
    weight_oz = alt.compute_serving_weight_oz()
    assert weight_oz == round(45.0 / 28.3495, 2)


def test_nutrition_alternative_compute_serving_weight_unknown_unit() -> None:
    """Unknown units should return None for weight computation."""
    alt = models.NutritionAlternative()
    alt.serving_value = 1
    alt.serving_unit = "furlong"
    alt.serving_unit_kind = "solid"
    alt.household_weight_g = None

    assert alt.compute_serving_weight_g() is None
    assert alt.compute_serving_weight_oz() is None


def test_preferences_get_returns_none_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _SessionStub()
    session.scalar_result = None
    monkeypatch.setattr(models.db, "session", session, raising=False)

    result = models.Preferences.get(user_id=1, context="foods.columns")

    assert result is None


def test_preferences_get_returns_payload_when_present(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _SessionStub()
    session.scalar_result = SimpleNamespace(preferences={"columns": ["name", "group"]})
    monkeypatch.setattr(models.db, "session", session, raising=False)

    result = models.Preferences.get(user_id=1, context="foods.columns")

    assert result == {"columns": ["name", "group"]}


def test_preferences_save_updates_existing_record(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _SessionStub()
    existing = SimpleNamespace(user_id=1, context="foods.columns", preferences={"a": 1})
    session.scalar_result = existing
    monkeypatch.setattr(models.db, "session", session, raising=False)

    models.Preferences.save(user_id=1, context="foods.columns", prefs={"a": 2})

    assert existing.preferences == {"a": 2}
    assert session.added == [existing]


def test_preferences_save_creates_new_record_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _SessionStub()
    session.scalar_result = None
    monkeypatch.setattr(models.db, "session", session, raising=False)

    models.Preferences.save(user_id=3, context="recipes.columns", prefs={"visible": True})

    assert len(session.added) == 1
    created = session.added[0]
    assert isinstance(created, models.Preferences)
    created_pref = created
    assert created_pref.user_id == 3
    assert created_pref.context == "recipes.columns"
    assert created_pref.preferences == {"visible": True}