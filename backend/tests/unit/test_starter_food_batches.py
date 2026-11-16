"""Test catalog starter updates and import behavior without external services."""

import datetime
from collections.abc import Iterator
from typing import Any

import pytest
from flask import Flask

import models
import routes
from usda_fdc_importer import USDAFdcImporter


@pytest.fixture
def starter_app(monkeypatch: pytest.MonkeyPatch) -> Iterator[Flask]:
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    models.db.init_app(app)
    app.register_blueprint(routes.bp)
    monkeypatch.setattr(routes, "verify_jwt_in_request", lambda: None)
    monkeypatch.setattr(routes, "get_jwt", lambda: {"roles": ["admin"]})
    monkeypatch.setattr(routes, "_get_catalog_user_id", lambda: 5)
    with app.app_context():
        models.db.create_all()
        for user_id in [5, 42]:
            models.db.session.execute(models.db.insert(models.User).values(
                id=user_id, username=f"user{user_id}", status=models.UserStatus.confirmed,
                created_at=datetime.datetime(2026, 1, 1),
            ))
        for food_id, user_id in [(10, 5), (11, 5), (12, 42)]:
            models.db.session.execute(models.db.insert(models.Food).values(
                id=food_id, user_id=user_id, name=f"Food {food_id}", vendor="Store",
                group=models.FoodGroup.other, servings=1, starter_food=False,
            ))
        models.db.session.commit()
        yield app
        models.db.session.remove()
        models.db.drop_all()


def test_bulk_starter_update_and_retry(starter_app: Flask) -> None:
    client = starter_app.test_client()
    for starter_food in [True, True, False]:
        response = client.patch("/api/catalog/food/starter", json={
            "food_ids": [10, 11, 10], "starter_food": starter_food,
        })
        assert response.status_code == 200
        assert response.get_json() == {"food_ids": [10, 11], "starter_food": starter_food, "updated_count": 2}
        for food_id, expected in [(10, starter_food), (11, starter_food), (12, False)]:
            food = models.db.session.get(models.Food, food_id)
            assert food is not None
            assert food.starter_food is expected
        models.db.session.commit()


@pytest.mark.parametrize("invalid_id", [12, 999])
def test_bulk_starter_rejects_non_catalog_ids_atomically(starter_app: Flask, invalid_id: int) -> None:
    response = starter_app.test_client().patch("/api/catalog/food/starter", json={
        "food_ids": [10, invalid_id], "starter_food": True,
    })
    assert response.status_code == 404
    food = models.db.session.get(models.Food, 10)
    assert food is not None
    assert food.starter_food is False


@pytest.mark.parametrize("payload", [
    {}, {"food_ids": [], "starter_food": True},
    {"food_ids": [True], "starter_food": True},
    {"food_ids": [0], "starter_food": True},
    {"food_ids": ["10"], "starter_food": True},
    {"food_ids": [10], "starter_food": "true"},
])
def test_bulk_starter_validates_payload(starter_app: Flask, payload: dict[str, object]) -> None:
    response = starter_app.test_client().patch("/api/catalog/food/starter", json=payload)
    assert response.status_code == 400


@pytest.mark.parametrize("role", ["user", "readonly"])
def test_starter_operations_require_admin(starter_app: Flask, monkeypatch: pytest.MonkeyPatch, role: str) -> None:
    monkeypatch.setattr(routes, "get_jwt", lambda: {"roles": [role]})
    client = starter_app.test_client()
    assert client.patch("/api/catalog/food/starter", json={"food_ids": [10], "starter_food": True}).status_code == 403
    assert client.post("/api/import/fdc/import", json={"fdc_ids": [1], "starter_food": True}).status_code == 403


@pytest.mark.parametrize("starter_food", [True, False, None])
@pytest.mark.parametrize("existing_starter", [True, False])
def test_import_starter_flag_for_new_and_existing_foods(
    starter_app: Flask, monkeypatch: pytest.MonkeyPatch, starter_food: bool | None, existing_starter: bool,
) -> None:
    # Use the real USDA mapping and persistence; only replace the network call.
    importer = USDAFdcImporter(api_key="test-key")
    def get_foods_by_ids(ids: list[int]) -> list[dict[str, Any]]:
        return [
            {"fdcId": food_id, "description": "Milk", "dataType": "Branded",
             "labelNutrients": {"calories": {"value": 50}}}
            for food_id in ids
        ]

    monkeypatch.setattr(importer, "get_foods_by_ids", get_foods_by_ids)
    monkeypatch.setattr(routes, "_get_importer", lambda: importer)
    models.db.session.execute(models.db.update(models.Food).where(models.Food.id == 10).values(
        source="usda_fdc", fdc_id=1, starter_food=existing_starter,
    ))
    models.db.session.execute(models.db.insert(models.Nutrition).values(
        id=10, user_id=5, serving_size_description="serving", calories=50,
    ))
    models.db.session.execute(models.db.insert(models.FoodServing).values(
        food_id=10, nutrition_id=10, serving_value=1, serving_unit="serving",
        serving_unit_kind="solid", ordinal=0, is_primary=True,
    ))
    models.db.session.commit()
    payload: dict[str, list[int] | bool] = {"fdc_ids": [1, 2]}
    if starter_food is not None:
        payload["starter_food"] = starter_food
    response = starter_app.test_client().post("/api/import/fdc/import", json=payload)
    assert response.status_code == 200
    assert response.get_json()["failures"] == []
    assert response.get_json()["created_count"] == 1
    assert response.get_json()["updated_count"] == 1
    existing = models.db.session.get(models.Food, 10)
    created = models.db.session.scalar(models.db.select(models.Food).where(models.Food.fdc_id == 2))
    assert existing is not None
    assert created is not None
    assert existing.starter_food is (bool(starter_food) or existing_starter)
    assert created.starter_food is bool(starter_food)


def test_import_rejects_invalid_starter_flag(starter_app: Flask) -> None:
    response = starter_app.test_client().post("/api/import/fdc/import", json={"fdc_ids": [1], "starter_food": "true"})
    assert response.status_code == 400
