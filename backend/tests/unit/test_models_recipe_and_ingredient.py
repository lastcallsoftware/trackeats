from types import SimpleNamespace
from typing import cast

import pytest

import models
from schemas import IngredientRequest, NutritionRequest, RecipeRequest


class _NutritionAccumulator:
    def __init__(self) -> None:
        self.reset_called = False
        self.sum_calls: list[tuple[object, float, float]] = []
        self.serving_size_oz = 0.0
        self.serving_size_g = 0

    def reset(self) -> None:
        self.reset_called = True
        self.serving_size_oz = 0.0
        self.serving_size_g = 0

    def sum(self, nutrition: object, servings: float, modifier: float = 1.0) -> None:
        self.sum_calls.append((nutrition, servings, modifier))
        self.serving_size_oz += getattr(nutrition, "serving_size_oz", 0) * servings * modifier
        self.serving_size_g += getattr(nutrition, "serving_size_g", 0) * servings * modifier


class _RecipeNutritionStub:
    def sum(self, nutrition: object, servings: float, modifier: float = 1.0) -> None:
        _ = nutrition
        _ = servings
        _ = modifier


class _IngredientRow:
    def __init__(self, row_id: int, food_id: int | None, recipe_id: int | None, servings: float) -> None:
        self.id = row_id
        self.food_ingredient_id = food_id
        self.recipe_ingredient_id = recipe_id
        self.servings = servings


class _SessionStub:
    def __init__(self) -> None:
        self.scalar_result: object | None = None
        self.get_map: dict[tuple[object, int], object | None] = {}
        self.added: list[object] = []
        self.flushed = False

    def scalar(self, statement: object) -> object | None:
        _ = statement
        return self.scalar_result

    def get(self, model_class: object, key: int) -> object | None:
        return self.get_map.get((model_class, key))

    def add(self, obj: object) -> None:
        self.added.append(obj)

    def flush(self) -> None:
        self.flushed = True


def test_recipe_recalculate_sums_food_and_recipe_ingredients(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ingredient_rows: list[object] = [
        _IngredientRow(row_id=1, food_id=10, recipe_id=None, servings=1.5),
        _IngredientRow(row_id=2, food_id=None, recipe_id=20, servings=2.0),
    ]
    food_dao = SimpleNamespace(nutrition_id=101, price=0)
    recipe_ingredient_dao = SimpleNamespace(nutrition_id=202, price=0, servings=4.0)
    ingredient_food_nutrition = object()
    ingredient_recipe_nutrition = object()

    def _get_all_for_recipe(user_id: int, recipe_id: int) -> list[object]:
        assert user_id == 1
        assert recipe_id == 99
        return ingredient_rows

    def _food_get(user_id: int, food_id: int) -> object:
        assert user_id == 1
        assert food_id == 10
        return food_dao

    def _recipe_get(user_id: int, recipe_id: int) -> object:
        assert user_id == 1
        assert recipe_id == 20
        return recipe_ingredient_dao

    def _nutrition_get(user_id: int, nutrition_id: int) -> object:
        assert user_id == 1
        if nutrition_id == 101:
            return ingredient_food_nutrition
        if nutrition_id == 202:
            return ingredient_recipe_nutrition
        raise AssertionError(f"Unexpected nutrition id: {nutrition_id}")

    monkeypatch.setattr(models.Ingredient, "get_all_for_recipe", staticmethod(_get_all_for_recipe))
    monkeypatch.setattr(models.Food, "get", staticmethod(_food_get))
    monkeypatch.setattr(models.Recipe, "get", staticmethod(_recipe_get))
    monkeypatch.setattr(models.Nutrition, "get", staticmethod(_nutrition_get))

    recipe_dao = cast(models.Recipe, SimpleNamespace(id=99, nutrition_id=500))
    recipe_nutrition_dao = _NutritionAccumulator()

    result = models.Recipe.recalculate(
        user_id=1,
        recipe_id=99,
        recipe_dao=recipe_dao,
        recipe_nutrition_dao=cast(models.Nutrition, recipe_nutrition_dao),
    )

    assert result is recipe_dao
    assert recipe_nutrition_dao.reset_called is True
    assert recipe_nutrition_dao.sum_calls == [
        (ingredient_food_nutrition, 1.5, 1.0),
        (ingredient_recipe_nutrition, 2.0, 0.25),
    ]


def test_recipe_from_schema_populates_recipe_size_fields() -> None:
    request = RecipeRequest(
        id=7,
        cuisine="Italian",
        name="Soup",
        total_yield="2 bowls",
        servings=2.0,
        size_oz=12.0,
        size_g=340,
        price=3.5,
        nutrition=NutritionRequest(
            serving_size_description="1 bowl",
            serving_size_oz=4.0,
            serving_size_g=113,
        ),
    )

    recipe_dao = models.Recipe(user_id=1, data=request)

    assert recipe_dao.size_oz == 12.0
    assert recipe_dao.size_g == 340
    assert recipe_dao.nutrition.serving_size_oz == 4.0
    assert recipe_dao.nutrition.serving_size_g == 113


def test_recipe_from_schema_populates_parent_recipe_id() -> None:
    # A "variation" of a recipe points back at the recipe it was copied from.
    request = RecipeRequest(
        id=7,
        cuisine="Italian",
        name="Meatless Stew",
        total_yield="4 bowls",
        servings=4.0,
        parent_recipe_id=42,
        nutrition=NutritionRequest(serving_size_description="1 bowl"),
    )

    recipe_dao = models.Recipe(user_id=1, data=request)

    assert recipe_dao.parent_recipe_id == 42


def test_recipe_json_includes_parent_recipe_id() -> None:
    request = RecipeRequest(
        id=7,
        cuisine="Italian",
        name="Meatless Stew",
        total_yield="4 bowls",
        servings=4.0,
        parent_recipe_id=42,
        nutrition=NutritionRequest(serving_size_description="1 bowl"),
    )

    recipe_dao = models.Recipe(user_id=1, data=request)

    assert recipe_dao.json()["parent_recipe_id"] == 42


def test_recipe_from_schema_defaults_parent_recipe_id_to_none() -> None:
    request = RecipeRequest(
        cuisine="Italian",
        name="Stew",
        total_yield="4 bowls",
        servings=4.0,
        nutrition=NutritionRequest(serving_size_description="1 bowl"),
    )

    recipe_dao = models.Recipe(user_id=1, data=request)

    assert recipe_dao.parent_recipe_id is None


def test_clear_parent_for_children_issues_update(monkeypatch: pytest.MonkeyPatch) -> None:
    # Severing a base recipe's variations should null out their parent_recipe_id so the
    # self-referential FK isn't left dangling when the base is deleted.
    executed: list[object] = []
    session = _SessionStub()
    session.execute = lambda statement: executed.append(statement)  # type: ignore[attr-defined]
    monkeypatch.setattr(models.db, "session", session, raising=False)

    models.Recipe.clear_parent_for_children(user_id=1, recipe_id=42)

    assert len(executed) == 1
    rendered = str(executed[0]).lower()
    assert "update recipe" in rendered
    assert "parent_recipe_id" in rendered


def test_recipe_recalculate_sets_total_weight_from_ingredient_nutrition(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ingredient_rows: list[object] = [
        _IngredientRow(row_id=1, food_id=10, recipe_id=None, servings=1.5),
        _IngredientRow(row_id=2, food_id=None, recipe_id=20, servings=2.0),
    ]
    food_dao = SimpleNamespace(nutrition_id=101, price=0)
    recipe_ingredient_dao = SimpleNamespace(nutrition_id=202, price=0, servings=4.0)
    ingredient_food_nutrition = SimpleNamespace(serving_size_oz=4.0, serving_size_g=113)
    ingredient_recipe_nutrition = SimpleNamespace(serving_size_oz=2.0, serving_size_g=56)

    def _get_all_for_recipe(user_id: int, recipe_id: int) -> list[object]:
        return ingredient_rows

    def _food_get(user_id: int, food_id: int) -> object:
        return food_dao

    def _recipe_get(user_id: int, recipe_id: int) -> object:
        return recipe_ingredient_dao

    def _nutrition_get(user_id: int, nutrition_id: int) -> object:
        if nutrition_id == 101:
            return ingredient_food_nutrition
        if nutrition_id == 202:
            return ingredient_recipe_nutrition
        raise AssertionError(f"Unexpected nutrition id: {nutrition_id}")

    monkeypatch.setattr(models.Ingredient, "get_all_for_recipe", staticmethod(_get_all_for_recipe))
    monkeypatch.setattr(models.Food, "get", staticmethod(_food_get))
    monkeypatch.setattr(models.Recipe, "get", staticmethod(_recipe_get))
    monkeypatch.setattr(models.Nutrition, "get", staticmethod(_nutrition_get))

    recipe_dao = cast(models.Recipe, SimpleNamespace(id=99, nutrition_id=500, servings=4.0))
    recipe_nutrition_dao = _NutritionAccumulator()

    models.Recipe.recalculate(
        user_id=1,
        recipe_id=99,
        recipe_dao=recipe_dao,
        recipe_nutrition_dao=cast(models.Nutrition, recipe_nutrition_dao),
    )

    # recalculate stores totals (not per-serving); the frontend divides by servings.
    # serving_size_oz is rounded to 2 decimals, serving_size_g to a whole number.
    assert recipe_nutrition_dao.serving_size_oz == round(4.0 * 1.5 + 2.0 * 2.0 * 0.25, 2)
    assert recipe_nutrition_dao.serving_size_g == round(113 * 1.5 + 56 * 2.0 * 0.25)


def test_recipe_recalculate_raises_for_invalid_ingredient_link(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Invalid row has both food_ingredient_id and recipe_ingredient_id set.
    ingredient_rows: list[object] = [
        _IngredientRow(row_id=3, food_id=10, recipe_id=20, servings=1.0),
    ]

    def _get_all_for_recipe(user_id: int, recipe_id: int) -> list[object]:
        return ingredient_rows

    monkeypatch.setattr(
        models.Ingredient,
        "get_all_for_recipe",
        staticmethod(_get_all_for_recipe),
    )

    recipe_dao = cast(models.Recipe, SimpleNamespace(id=99, nutrition_id=500))
    recipe_nutrition_dao = _NutritionAccumulator()

    with pytest.raises(ValueError, match="Either food ID or recipe ID"):
        models.Recipe.recalculate(
            user_id=1,
            recipe_id=99,
            recipe_dao=recipe_dao,
            recipe_nutrition_dao=cast(models.Nutrition, recipe_nutrition_dao),
        )


def test_recipe_recalculate_raises_when_ingredient_nutrition_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ingredient_rows: list[object] = [
        _IngredientRow(row_id=5, food_id=10, recipe_id=None, servings=1.0),
    ]

    def _get_all_for_recipe(user_id: int, recipe_id: int) -> list[object]:
        return ingredient_rows

    def _food_get(user_id: int, food_id: int) -> object:
        return SimpleNamespace(nutrition_id=101)

    def _nutrition_get(user_id: int, nutrition_id: int) -> None:
        return None

    monkeypatch.setattr(
        models.Ingredient,
        "get_all_for_recipe",
        staticmethod(_get_all_for_recipe),
    )
    monkeypatch.setattr(
        models.Food,
        "get",
        staticmethod(_food_get),
    )
    monkeypatch.setattr(models.Nutrition, "get", staticmethod(_nutrition_get))

    recipe_dao = cast(models.Recipe, SimpleNamespace(id=99, nutrition_id=500))
    recipe_nutrition_dao = _NutritionAccumulator()

    with pytest.raises(ValueError, match="Nutrition record 101 not found"):
        models.Recipe.recalculate(
            user_id=1,
            recipe_id=99,
            recipe_dao=recipe_dao,
            recipe_nutrition_dao=cast(models.Nutrition, recipe_nutrition_dao),
        )


def test_ingredient_requires_recipe_id() -> None:
    request = IngredientRequest(
        recipe_id=None,
        food_ingredient_id=10,
        servings=1.0,
        ordinal=0,
    )

    with pytest.raises(ValueError, match="recipe_id is required"):
        models.Ingredient(user_id=1, data=request)


def test_ingredient_requires_ordinal() -> None:
    request = IngredientRequest(
        recipe_id=99,
        food_ingredient_id=10,
        servings=1.0,
        ordinal=None,
    )

    with pytest.raises(ValueError, match="ordinal is required"):
        models.Ingredient(user_id=1, data=request)


def test_recipe_add_from_schema_preserves_provided_id(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _SessionStub()
    monkeypatch.setattr(models.db, "session", session, raising=False)

    request = RecipeRequest(
        id=222,
        cuisine="Italian",
        name="Pasta",
        total_yield="4 servings",
        servings=4.0,
        nutrition=NutritionRequest(
            serving_size_description="1 serving",
            calories=400,
        ),
        ingredients=[],
    )
    keylists: dict[str, dict[int, int]] = {}

    recipe = models.Recipe.add_from_schema(user_id=1, recipe_request=request, keylists=keylists)

    assert session.flushed is True
    assert recipe.id is None
    assert keylists == {"recipes": {222: None}}


def test_ingredient_add_from_schema_preserves_provided_id(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _SessionStub()
    recipe_nutrition = _RecipeNutritionStub()
    ingredient_nutrition = object()
    session.get_map[(models.Nutrition, 900)] = recipe_nutrition
    session.get_map[(models.Nutrition, 901)] = ingredient_nutrition
    monkeypatch.setattr(models.db, "session", session, raising=False)

    def _recipe_get(user_id: int, recipe_id: int) -> object:
        return SimpleNamespace(id=recipe_id, nutrition_id=900, price=0)

    def _food_get(user_id: int, food_id: int) -> object:
        return SimpleNamespace(id=food_id, nutrition_id=901, price=5.0, servings=2.0)

    monkeypatch.setattr(models.Recipe, "get", staticmethod(_recipe_get))
    monkeypatch.setattr(models.Food, "get", staticmethod(_food_get))

    request = IngredientRequest(
        id=333,
        recipe_id=77,
        food_ingredient_id=55,
        servings=1.5,
        ordinal=0,
    )

    ingredient = models.Ingredient.add_from_schema(user_id=1, ingredient_request=request)

    assert len(session.added) == 1
    assert ingredient is session.added[0]
    assert ingredient.id is None