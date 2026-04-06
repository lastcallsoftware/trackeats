import datetime
from types import SimpleNamespace

import pytest

import models
from schemas import FoodRequest, NutritionRequest


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
        size_oz=16.0,
        size_g=454,
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