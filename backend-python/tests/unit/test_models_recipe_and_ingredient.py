from types import SimpleNamespace
from typing import cast

import pytest

import models
from schemas import IngredientRequest, NutritionRequest, RecipeRequest


class _NutritionAccumulator:
    def __init__(self) -> None:
        self.reset_called = False
        self.sum_calls: list[tuple[object, float]] = []

    def reset(self) -> None:
        self.reset_called = True

    def sum(self, nutrition: object, servings: float) -> None:
        self.sum_calls.append((nutrition, servings))


class _RecipeNutritionStub:
    def sum(self, nutrition: object, servings: float) -> None:
        _ = nutrition
        _ = servings


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
    food_dao = SimpleNamespace(nutrition_id=101)
    recipe_ingredient_dao = SimpleNamespace(nutrition_id=202)
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
        (ingredient_food_nutrition, 1.5),
        (ingredient_recipe_nutrition, 2.0),
    ]


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
    assert recipe.id == 222
    assert keylists == {"recipes": {222: 222}}


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

    def _generate_summary(ingredient: object, servings: float) -> str:
        _ = ingredient
        _ = servings
        return "summary"

    monkeypatch.setattr(models.Recipe, "get", staticmethod(_recipe_get))
    monkeypatch.setattr(models.Food, "get", staticmethod(_food_get))
    monkeypatch.setattr(models.Ingredient, "generate_summary", staticmethod(_generate_summary))

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
    assert ingredient.id == 333