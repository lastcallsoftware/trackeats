from types import SimpleNamespace, TracebackType
from typing import Any, Callable, cast

import pytest
from flask import Flask, Response

import routes


class _DummyTxn:
    def __enter__(self) -> "_DummyTxn":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> bool:
        return False


class _JsonDao:
    def __init__(self, payload: dict[str, Any], dao_id: int | None = None) -> None:
        self._payload = payload
        self.id = dao_id

    def json(self) -> dict[str, Any]:
        return self._payload


def _mock_session(monkeypatch: pytest.MonkeyPatch, deleted: list[object] | None = None) -> None:
    def _delete(obj: object) -> None:
        if deleted is not None:
            deleted.append(obj)

    session = SimpleNamespace(begin=lambda: _DummyTxn(), delete=_delete)
    monkeypatch.setattr(routes.db, "session", session, raising=False)


def _unwrap(func: Any) -> Callable[..., tuple[Response, int]]:
    return cast(Callable[..., tuple[Response, int]], getattr(func, "__wrapped__", func))


def _as_response_status(result: object) -> tuple[Response, int]:
    if isinstance(result, tuple):
        tuple_result = cast(tuple[object, object], result)
        resp, status = tuple_result
        return cast(Response, resp), cast(int, status)

    resp = cast(Response, result)
    return resp, resp.status_code


def test_whoami_returns_identity(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "testuser")

    with bare_flask_app.test_request_context("/api/whoami", method="GET"):
        resp, status = _unwrap(routes.whoami)()

    assert status == 200
    assert resp.get_json()["logged_in_as"] == "testuser"


def test_get_users_and_get_user(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setattr(routes.User, "get_all", staticmethod(lambda: [_JsonDao({"username": "u1"}), _JsonDao({"username": "u2"})]))

    def _get_user(username: str) -> _JsonDao:
        return _JsonDao({"username": username})

    monkeypatch.setattr(routes.User, "get", staticmethod(_get_user))

    with bare_flask_app.test_request_context("/api/user", method="GET"):
        list_resp, list_status = _unwrap(routes.get_users)()

    with bare_flask_app.test_request_context("/api/user/testuser", method="GET"):
        one_resp, one_status = _unwrap(routes.get_user)("testuser")

    assert list_status == 200
    assert list_resp.get_json() == [{"username": "u1"}, {"username": "u2"}]
    assert one_status == 200
    assert one_resp.get_json() == {"username": "testuser"}


def test_food_crud_endpoints(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    deleted: list[object] = []
    _mock_session(monkeypatch, deleted=deleted)

    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "testuser")

    def _get_id(username: str) -> int:
        return 1

    def _get_by_user(user_id: int) -> list[_JsonDao]:
        return [_JsonDao({"id": 10, "name": "A"}), _JsonDao({"id": 11, "name": "B"})]

    def _get_food(user_id: int, food_id: int) -> _JsonDao:
        return _JsonDao({"id": food_id})

    def _add_food(user_id: int, payload: Any) -> _JsonDao:
        return _JsonDao({"id": 77}, dao_id=77)

    def _update_food(user_id: int, payload: Any) -> _JsonDao:
        # payload can be FoodRequest or dict, extract id from either
        payload_id = payload.id if hasattr(payload, 'id') else payload["id"]
        return _JsonDao({"id": payload_id, "name": "new"})

    monkeypatch.setattr(routes.User, "get_id", staticmethod(_get_id))
    monkeypatch.setattr(routes.Food, "get_by_user", staticmethod(_get_by_user))
    monkeypatch.setattr(routes.Food, "get", staticmethod(_get_food))
    monkeypatch.setattr(routes.Food, "add", staticmethod(_add_food))
    monkeypatch.setattr(routes.Food, "update", staticmethod(_update_food))

    with bare_flask_app.test_request_context("/api/food", method="GET"):
        get_all_resp, get_all_status = _as_response_status(_unwrap(routes.get_foods)())

    with bare_flask_app.test_request_context("/api/food/25", method="GET"):
        get_one_resp, get_one_status = _as_response_status(_unwrap(routes.get_food)(25))

    with bare_flask_app.test_request_context("/api/food", method="POST", json={
        "group": "fruits",
        "name": "orange",
        "vendor": "farmers market",
        "servings": 1.0,
        "serving_size_description": "1 medium"
    }):
        add_resp, add_status = _as_response_status(_unwrap(routes.add_food)())

    with bare_flask_app.test_request_context("/api/food", method="PUT", json={
        "id": 12,
        "group": "fruits",
        "name": "new",
        "vendor": "market",
        "servings": 1.0,
        "serving_size_description": "1 unit"
    }):
        update_resp, update_status = _as_response_status(_unwrap(routes.update_food)())

    with bare_flask_app.test_request_context("/api/food/5", method="DELETE"):
        delete_resp, delete_status = _as_response_status(_unwrap(routes.delete_food)(5))

    assert get_all_status == 200
    assert get_all_resp.get_json() == [{"id": 10, "name": "A"}, {"id": 11, "name": "B"}]

    assert get_one_status == 200
    assert get_one_resp.get_json() == {"id": 25}

    assert add_status == 201
    assert add_resp.get_json() == {"id": 77}
    assert add_resp.headers.get("Location") == "/food/77"

    assert update_status == 200
    assert update_resp.get_json() == {"id": 12, "name": "new"}

    assert delete_status == 200
    assert delete_resp.get_json()["msg"] == "Food record deleted"
    assert len(deleted) == 1


def test_recipe_crud_and_ingredients_get(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    deleted: list[object] = []
    _mock_session(monkeypatch, deleted=deleted)

    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "testuser")

    recipe_obj = object()
    ingredient_obj = object()

    def _get_id(username: str) -> int:
        return 1

    def _get_all_recipes(user_id: int) -> list[_JsonDao]:
        return [_JsonDao({"id": 1})]

    def _get_recipe(user_id: int, recipe_id: int) -> object:
        if recipe_id == 9:
            return recipe_obj
        return _JsonDao({"id": recipe_id})

    def _add_recipe(user_id: int, payload: Any) -> _JsonDao:
        return _JsonDao({"id": 22}, dao_id=22)

    def _update_recipe(user_id: int, payload: Any) -> _JsonDao:
        payload_id = payload.id if hasattr(payload, "id") else payload["id"]
        return _JsonDao({"id": payload_id})

    def _get_all_ingredients(user_id: int, recipe_id: int) -> list[object]:
        if recipe_id == 1:
            return [
                _JsonDao({"ordinal": 0, "food_ingredient_id": 25}),
                _JsonDao({"ordinal": 1, "recipe_ingredient_id": 1}),
            ]
        return [ingredient_obj]

    monkeypatch.setattr(routes.User, "get_id", staticmethod(_get_id))
    monkeypatch.setattr(routes.Recipe, "get_all_for_user", staticmethod(_get_all_recipes))
    monkeypatch.setattr(routes.Recipe, "get", staticmethod(_get_recipe))
    monkeypatch.setattr(routes.Recipe, "add_from_schema", staticmethod(_add_recipe))
    monkeypatch.setattr(routes.Recipe, "update_from_schema", staticmethod(_update_recipe))
    monkeypatch.setattr(routes.Ingredient, "get_all_for_recipe", staticmethod(_get_all_ingredients))

    with bare_flask_app.test_request_context("/api/recipe", method="GET"):
        get_all_resp, get_all_status = _as_response_status(_unwrap(routes.get_recipes)())

    with bare_flask_app.test_request_context("/api/recipe/3", method="GET"):
        get_one_resp, get_one_status = _as_response_status(_unwrap(routes.get_recipe)(3))

    with bare_flask_app.test_request_context("/api/recipe", method="POST", json={
        "name": "r1",
        "total_yield": "4 servings",
        "servings": 4.0,
        "serving_size_description": "1 serving"
    }):
        add_resp, add_status = _as_response_status(_unwrap(routes.add_recipe)())

    with bare_flask_app.test_request_context("/api/recipe", method="PUT", json={
        "id": 3,
        "name": "r2",
        "total_yield": "4 servings",
        "servings": 4.0,
        "serving_size_description": "1 serving"
    }):
        update_resp, update_status = _as_response_status(_unwrap(routes.update_recipe)())

    with bare_flask_app.test_request_context("/api/recipe/9", method="DELETE"):
        delete_resp, delete_status = _as_response_status(_unwrap(routes.delete_recipe)(9))

    with bare_flask_app.test_request_context("/api/recipe/1/ingredient", method="GET"):
        ingredients_resp, ingredients_status = _as_response_status(_unwrap(routes.get_ingredients)(1))

    assert get_all_status == 200
    assert get_all_resp.get_json() == [{"id": 1}]

    assert get_one_status == 200
    assert get_one_resp.get_json() == {"id": 3}

    assert add_status == 201
    assert add_resp.headers.get("Location") == "/recipe/22"
    assert add_resp.get_json() == {"id": 22}

    assert update_status == 200
    assert update_resp.get_json() == {"id": 3}

    assert delete_status == 200
    assert delete_resp.get_json()["msg"] == "Recipe record deleted"

    assert ingredients_status == 200
    assert ingredients_resp.get_json() == [
        {"ordinal": 0, "food_ingredient_id": 25},
        {"ordinal": 1, "recipe_ingredient_id": 1},
    ]

    assert len(deleted) == 2


def test_recalculate_recipe_success(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "testuser")

    calls: list[tuple[int, int]] = []

    def _get_id(username: str) -> int:
        return 1

    def _recalculate_nutrition(user_id: int, recipe_id: int) -> None:
        calls.append((user_id, recipe_id))

    monkeypatch.setattr(routes.User, "get_id", staticmethod(_get_id))
    monkeypatch.setattr(routes.Recipe, "recalculate_nutrition", staticmethod(_recalculate_nutrition))

    with bare_flask_app.test_request_context("/api/recipe/42/recalc", method="POST"):
        resp, status = _as_response_status(_unwrap(routes.recalculate_recipe)(42))

    assert status == 200
    assert resp.get_json() == {"msg": "Recipe nutrition data recalculated for Recipe ID 42"}
    assert calls == [(1, 42)]


def test_recalculate_recipe_returns_400_on_error(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "testuser")

    def _get_id(username: str) -> int:
        return 1

    def _recalculate_nutrition(user_id: int, recipe_id: int) -> None:
        raise RuntimeError("boom")

    monkeypatch.setattr(routes.User, "get_id", staticmethod(_get_id))
    monkeypatch.setattr(routes.Recipe, "recalculate_nutrition", staticmethod(_recalculate_nutrition))

    with bare_flask_app.test_request_context("/api/recipe/42/recalc", method="POST"):
        resp, status = _as_response_status(_unwrap(routes.recalculate_recipe)(42))

    assert status == 400
    assert resp.get_json()["msg"] == "Recipe nutrition data could not be recalculated: boom"


def test_recalculate_all_for_user_success(bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "testuser")

    calls: list[tuple[int, int, object]] = []
    recipe1 = _JsonDao({"id": 10}, dao_id=10)
    recipe2 = _JsonDao({"id": 11}, dao_id=11)

    def _get_id(username: str) -> int:
        return 1

    def _get_all_for_user(user_id: int) -> list[_JsonDao]:
        return [recipe1, recipe2]

    def _recalculate_nutrition(user_id: int, recipe_id: int, recipe_dao: object) -> None:
        calls.append((user_id, recipe_id, recipe_dao))

    monkeypatch.setattr(routes.User, "get_id", staticmethod(_get_id))
    monkeypatch.setattr(routes.Recipe, "get_all_for_user", staticmethod(_get_all_for_user))
    monkeypatch.setattr(routes.Recipe, "recalculate_nutrition", staticmethod(_recalculate_nutrition))

    with bare_flask_app.test_request_context("/api/recipe/recalc", method="POST"):
        resp, status = _as_response_status(_unwrap(routes.recalculate_all_for_user)())

    assert status == 200
    assert resp.get_json() == {"msg": "Recipe nutrition data recalculated for all Recipes for user testuser"}
    assert calls == [(1, 10, recipe1), (1, 11, recipe2)]


def test_recalculate_all_for_user_returns_400_on_error(
    bare_flask_app: Flask, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_session(monkeypatch)
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "testuser")

    def _get_id(username: str) -> int:
        return 1

    def _get_all_for_user(user_id: int) -> list[_JsonDao]:
        return [_JsonDao({"id": 10}, dao_id=10)]

    def _recalculate_nutrition(user_id: int, recipe_id: int, recipe_dao: object) -> None:
        raise RuntimeError("boom")

    monkeypatch.setattr(routes.User, "get_id", staticmethod(_get_id))
    monkeypatch.setattr(routes.Recipe, "get_all_for_user", staticmethod(_get_all_for_user))
    monkeypatch.setattr(routes.Recipe, "recalculate_nutrition", staticmethod(_recalculate_nutrition))

    with bare_flask_app.test_request_context("/api/recipe/recalc", method="POST"):
        resp, status = _as_response_status(_unwrap(routes.recalculate_all_for_user)())

    assert status == 400
    assert resp.get_json()["msg"] == "Recipe nutrition data could not be recalculated: boom"
