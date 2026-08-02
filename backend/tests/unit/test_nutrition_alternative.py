"""Tests for NutritionAlternative model and Food add/update with alternatives."""

from types import SimpleNamespace
import pytest
import models
from schemas import FoodRequest, NutritionRequest, NutritionAlternativeRequest


class _SessionStub:
    """Minimal session stub that tracks added/deleted objects and simulates flush."""

    def __init__(self) -> None:
        self.scalar_result: object | None = None
        self.scalars_result: list[object] = []
        self.get_map: dict[tuple[object, int], object | None] = {}
        self.added: list[object] = []
        self.deleted: list[object] = []
        self.flushed = False

    def scalar(self, statement: object) -> object | None:  # noqa: ARG002
        return self.scalar_result

    def scalars(self, statement: object) -> object:  # noqa: ARG002
        class _ScalarResult:
            def __init__(self, items: list[object]) -> None:
                self._items = items

            def all(self) -> list[object]:
                return self._items

            def unique(self) -> "_ScalarResult":
                return self

        return _ScalarResult(self.scalars_result)

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


def _basic_nutrition() -> NutritionRequest:
    """Return a minimal NutritionRequest used as the primary nutrition."""
    return NutritionRequest(
        serving_size_description="100 g",
        serving_size_oz=3.527,
        serving_size_g=100,
        calories=200,
        total_fat_g=10.0,
        saturated_fat_g=2.0,
        trans_fat_g=0.0,
        cholesterol_mg=30,
        sodium_mg=400,
        total_carbs_g=20,
        fiber_g=3,
        total_sugar_g=5,
        added_sugar_g=2,
        protein_g=10,
        vitamin_d_mcg=1,
        calcium_mg=50,
        iron_mg=1.5,
        potassium_mg=300,
    )


def _food_request_with_alternatives(
    food_id: int | None = None,
    alternatives: list[NutritionAlternativeRequest] | None = None,
) -> FoodRequest:
    """Factory for a FoodRequest that includes optional alternatives."""
    return FoodRequest(
        id=food_id,
        group="proteins",
        name="Chicken Breast",
        vendor="TestCo",
        servings=1.0,
        price=5.99,
        price_date="2026-07-01",
        shelf_life="5 days",
        nutrition=_basic_nutrition(),
        nutrition_alternatives=alternatives or [],
    )


# ── NutritionAlternative model unit tests ──


def test_nutrition_alternative_add_creates_record_and_nutrition(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """NutritionAlternative.add creates the junction record and its Nutrition."""
    session = _SessionStub()
    monkeypatch.setattr(models.db, "session", session, raising=False)

    nutrition_data = NutritionRequest(
        serving_size_description="3 oz",
        serving_size_oz=3.0,
        serving_size_g=85,
        calories=170,
        total_fat_g=8.5,
        saturated_fat_g=1.7,
        trans_fat_g=0.0,
        cholesterol_mg=26,
        sodium_mg=340,
        total_carbs_g=17,
        fiber_g=3,
        total_sugar_g=4,
        added_sugar_g=2,
        protein_g=9,
        vitamin_d_mcg=1,
        calcium_mg=43,
        iron_mg=1.3,
        potassium_mg=255,
    )

    alt = models.NutritionAlternative.add(
        food_id=5,
        serving_value=85,
        serving_unit="g",
        serving_unit_kind="mass",
        nutrition_data=nutrition_data,
        ordinal=0,
    )

    assert alt.serving_value == 85
    assert alt.serving_unit == "g"
    assert alt.serving_unit_kind == models.ServingUnitKind.mass
    assert alt.ordinal == 0
    assert alt.nutrition is not None
    assert alt.nutrition.calories == 170
    assert alt.nutrition.serving_size_g == 85


def test_nutrition_alternative_add_defaults_ordinal(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When ordinal is omitted it defaults to 0."""
    session = _SessionStub()
    monkeypatch.setattr(models.db, "session", session, raising=False)

    alt = models.NutritionAlternative.add(
        food_id=5,
        serving_value=30,
        serving_unit="ml",
        serving_unit_kind="volume",
        nutrition_data=NutritionRequest(
            serving_size_description="1 fl oz",
            serving_size_oz=1.0,
            serving_size_g=30,
            calories=50,
        ),
    )

    assert alt.ordinal == 0


# ── Food.add with alternatives ──


def test_food_add_persists_alternatives(monkeypatch: pytest.MonkeyPatch) -> None:
    """Food.add creates a Food, its primary Nutrition, and all alternatives."""
    session = _SessionStub()
    monkeypatch.setattr(models.db, "session", session, raising=False)

    alt = NutritionAlternativeRequest(
        serving_value=200,
        serving_unit="g",
        serving_unit_kind="mass",
        ordinal=1,
        nutrition=NutritionRequest(
            serving_size_description="200 g",
            serving_size_oz=7.055,
            serving_size_g=200,
            calories=400,
        ),
    )

    request = _food_request_with_alternatives(food_id=10, alternatives=[alt])
    keylists: dict[str, dict[int, int]] = {}

    added = models.Food.add(user_id=1, food=request, keylists=keylists)

    # Should flush once
    assert session.flushed is True

    # Expect 3 objects: Food, primary Nutrition, alternative chain (alt + its Nutrition)
    assert len(session.added) == 4
    assert added is session.added[0]
    assert isinstance(added, models.Food)

    # Primary Nutrition
    assert isinstance(session.added[1], models.Nutrition)
    assert session.added[1].calories == 200

    # Alternative (NutritionAlternative.add creates both the NutritionAlternative
    # and its Nutrition, adding both to the session)
    alt_objects = [o for o in session.added[2:] if isinstance(o, models.NutritionAlternative)]
    assert len(alt_objects) == 1
    assert alt_objects[0].serving_value == 200
    assert alt_objects[0].serving_unit_kind == models.ServingUnitKind.mass
    assert alt_objects[0].nutrition is not None
    assert alt_objects[0].nutrition.calories == 400

    # Keylist mapping
    assert keylists == {"foods": {10: 77}}


def test_food_add_without_alternatives(monkeypatch: pytest.MonkeyPatch) -> None:
    """Food.add with an empty alternatives list still creates the Food + primary Nutrition."""
    session = _SessionStub()
    monkeypatch.setattr(models.db, "session", session, raising=False)

    request = _food_request_with_alternatives(food_id=11, alternatives=[])
    keylists: dict[str, dict[int, int]] = {}

    models.Food.add(user_id=1, food=request, keylists=keylists)

    # Only 2 objects: Food + primary Nutrition (no alternatives)
    assert len(session.added) == 2
    assert isinstance(session.added[0], models.Food)
    assert isinstance(session.added[1], models.Nutrition)


def test_food_add_with_multiple_alternatives(monkeypatch: pytest.MonkeyPatch) -> None:
    """Food.add persists multiple alternatives in order."""
    session = _SessionStub()
    monkeypatch.setattr(models.db, "session", session, raising=False)

    alts = [
        NutritionAlternativeRequest(
            serving_value=50,
            serving_unit="g",
            serving_unit_kind="mass",
            ordinal=i,
            nutrition=NutritionRequest(
                serving_size_description=f"{50 * (i + 1)} g",
                serving_size_g=50 * (i + 1),
                calories=100 * (i + 1),
            ),
        )
        for i in range(3)
    ]

    request = _food_request_with_alternatives(food_id=12, alternatives=alts)
    keylists: dict[str, dict[int, int]] = {}

    models.Food.add(user_id=1, food=request, keylists=keylists)

    # 1 Food + 1 primary Nutrition + 3 alternatives + 3 alternative nutritions = 8
    assert len(session.added) == 8

    # Check the alternatives are in the expected order
    alt_objs = [o for o in session.added if isinstance(o, models.NutritionAlternative)]
    assert len(alt_objs) == 3
    for i in range(3):
        assert alt_objs[i].ordinal == i


# ── Food.update with alternatives ──


def test_food_update_replaces_alternatives(monkeypatch: pytest.MonkeyPatch) -> None:
    """Food.update deletes old alternatives and creates new ones."""
    session = _SessionStub()

    # Simulate existing Food with primary Nutrition
    existing_food = SimpleNamespace(id=5, user_id=1, nutrition_id=10)
    session.get_map[(models.Food, 5)] = existing_food

    # Simulate existing alternatives returned by get_for_food
    old_alt1 = SimpleNamespace(id=101, food_id=5, nutrition_id=201)
    old_alt2 = SimpleNamespace(id=102, food_id=5, nutrition_id=202)
    session.scalars_result = [old_alt1, old_alt2]

    monkeypatch.setattr(models.db, "session", session, raising=False)

    new_alt = NutritionAlternativeRequest(
        serving_value=150,
        serving_unit="g",
        serving_unit_kind="mass",
        ordinal=0,
        nutrition=NutritionRequest(
            serving_size_description="150 g",
            serving_size_g=150,
            calories=300,
        ),
    )

    request = _food_request_with_alternatives(food_id=5, alternatives=[new_alt])

    models.Food.update(user_id=1, food=request)

    # Old alternatives should be deleted
    assert len(session.deleted) >= 2
    deleted_ids = {getattr(d, "id", None) for d in session.deleted}
    assert 101 in deleted_ids
    assert 102 in deleted_ids

    # New alternative should be added (plus the alternative's nutrition)
    added_alts = [o for o in session.added if isinstance(o, models.NutritionAlternative)]
    assert len(added_alts) == 1
    assert added_alts[0].serving_value == 150
    assert added_alts[0].ordinal == 0


def test_food_update_clears_alternatives_when_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """Food.update with no alternatives deletes all existing alternatives."""
    session = _SessionStub()

    existing_food = SimpleNamespace(id=6, user_id=1, nutrition_id=11, name="Old")
    session.get_map[(models.Food, 6)] = existing_food

    old_alt = SimpleNamespace(id=201, food_id=6, nutrition_id=301)
    session.scalars_result = [old_alt]

    monkeypatch.setattr(models.db, "session", session, raising=False)

    request = _food_request_with_alternatives(food_id=6, alternatives=[])

    models.Food.update(user_id=1, food=request)

    deleted_ids = {getattr(d, "id", None) for d in session.deleted}
    assert 201 in deleted_ids


# ── Food.delete cascade ──


def test_food_delete_removes_alternatives(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deleting a Food also removes its Nutrition, NutritionAlternative,
    and alternative Nutritions."""
    session = _SessionStub()

    food_dao = SimpleNamespace(id=8, nutrition_id=99)
    nutrition_dao = SimpleNamespace(id=99)
    alt1 = SimpleNamespace(id=301, food_id=8, nutrition_id=201)
    alt2 = SimpleNamespace(id=302, food_id=8, nutrition_id=202)
    alt_nutrition1 = SimpleNamespace(id=201)
    alt_nutrition2 = SimpleNamespace(id=202)

    session.get_map[(models.Food, 8)] = food_dao
    session.get_map[(models.Nutrition, 99)] = nutrition_dao
    session.get_map[(models.NutritionAlternative, 301)] = alt1
    session.get_map[(models.NutritionAlternative, 302)] = alt2
    session.get_map[(models.Nutrition, 201)] = alt_nutrition1
    session.get_map[(models.Nutrition, 202)] = alt_nutrition2

    # Simulate the alternatives query via get_for_food
    session.scalars_result = [alt1, alt2]

    monkeypatch.setattr(models.db, "session", session, raising=False)

    models.Food.delete(user_id=1, food_id=8)

    expected_deleted = {
        id(food_dao),
        id(nutrition_dao),
        id(alt1),
        id(alt2),
        id(alt_nutrition1),
        id(alt_nutrition2),
    }
    actual_deleted = {id(d) for d in session.deleted}
    assert actual_deleted == expected_deleted


# ── json() includes alternatives ──


def test_food_json_includes_alternatives_via_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Food.json includes nutrition_alternatives by querying the DB."""
    session = _SessionStub()

    # Create a Food with primary Nutrition using proper constructors
    food = models.Food(user_id=1)
    food.id = 1
    food.nutrition = models.Nutrition(user_id=1)
    food.nutrition.id = 10
    food.nutrition.serving_size_description = "100 g"
    food.nutrition.serving_size_g = 100
    food.nutrition.calories = 200

    # Build a NutritionAlternative with its own Nutrition
    alt_nutrition = models.Nutrition(user_id=1)
    alt_nutrition.id = 20
    alt_nutrition.serving_size_description = "50 g"
    alt_nutrition.serving_size_g = 50
    alt_nutrition.calories = 100

    alt = models.NutritionAlternative()
    alt.id = 30
    alt.food_id = 1
    alt.nutrition_id = 20
    alt.nutrition = alt_nutrition
    alt.serving_value = 50
    alt.serving_unit = "g"
    alt.serving_unit_kind = models.ServingUnitKind.mass
    alt.ordinal = 0

    # Stub the get_for_food query
    session.scalars_result = [alt]
    monkeypatch.setattr(models.db, "session", session, raising=False)

    d = food.json()

    assert d["nutrition"]["calories"] == 200
    assert "nutrition_alternatives" in d
    assert len(d["nutrition_alternatives"]) == 1
    assert d["nutrition_alternatives"][0]["serving_value"] == 50
    assert d["nutrition_alternatives"][0]["serving_unit"] == "g"
    assert d["nutrition_alternatives"][0]["nutrition"]["calories"] == 100
    assert d["nutrition_alternatives"][0]["ordinal"] == 0


def test_food_json_empty_alternatives(monkeypatch: pytest.MonkeyPatch) -> None:
    """Food.json returns an empty list when no alternatives exist."""
    session = _SessionStub()

    food = models.Food(user_id=1)
    food.id = 2
    food.nutrition = models.Nutrition(user_id=1)
    food.nutrition.id = 11
    food.nutrition.serving_size_description = "1 medium"
    food.nutrition.calories = 95

    # No alternatives
    session.scalars_result = []
    monkeypatch.setattr(models.db, "session", session, raising=False)

    d = food.json()

    assert d["nutrition_alternatives"] == []