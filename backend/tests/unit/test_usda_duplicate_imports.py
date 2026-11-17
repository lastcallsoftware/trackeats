"""Exercise USDA duplicate protection with a real, isolated database."""

import datetime
import sqlite3
from collections.abc import Iterator

from flask import Flask
import pytest
from sqlalchemy.exc import IntegrityError

import models
import routes
from usda_fdc_importer import USDAFdcImporter


@pytest.fixture
def fdc_app(monkeypatch: pytest.MonkeyPatch) -> Iterator[Flask]:
    app = Flask(__name__)
    app.config.update(TESTING=True, SQLALCHEMY_DATABASE_URI="sqlite:///:memory:")
    models.db.init_app(app)
    app.register_blueprint(routes.bp)
    monkeypatch.setattr(routes, "verify_jwt_in_request", lambda: None)
    monkeypatch.setattr(routes, "get_jwt", lambda: {"roles": ["admin"]})
    monkeypatch.setattr(routes, "_get_catalog_user_id", lambda: 1)
    importer = USDAFdcImporter(api_key="test-key")
    monkeypatch.setattr(routes, "_get_importer", lambda: importer)
    monkeypatch.setattr(importer, "get_foods_by_ids", lambda ids: [
        {"fdcId": value, "description": f"Food {value}", "dataType": "Foundation",
         "labelNutrients": {"calories": {"value": 100}}} for value in ids
    ])
    with app.app_context():
        models.db.create_all()
        models.db.session.execute(models.db.insert(models.User), [
            {"id": value, "username": f"User {value}", "status": models.UserStatus.confirmed,
             "created_at": datetime.datetime(2026, 1, 1)} for value in [1, 2]
        ])
        models.db.session.commit()
        yield app
        models.db.session.remove()
        models.db.drop_all()


def test_missing_nutrition_reason_is_returned_for_preview_and_import(
    fdc_app: Flask, monkeypatch: pytest.MonkeyPatch,
) -> None:
    importer = routes._get_importer()
    monkeypatch.setattr(importer, "get_foods_by_ids", lambda ids: [
        {"fdcId": 10, "description": "Sparse food", "dataType": "Foundation",
         "foodNutrients": [{"nutrient": {"number": "255"}, "amount": 75}]},
        {"fdcId": 11, "description": "Complete food", "dataType": "Foundation",
         "labelNutrients": {"calories": {"value": 100}}},
    ])
    client = fdc_app.test_client()
    preview_response = client.post("/api/import/fdc/preview", json={"fdc_ids": [10, 11]})
    assert preview_response.status_code == 200
    preview = preview_response.get_json()
    assert [item["fdcId"] for item in preview["items"]] == [11]
    failure = preview["failures"][0]
    assert failure["fdc_id"] == 10
    assert failure["retryable"] is False
    assert "calories, protein, carbohydrate, total fat, or sodium" in failure["error"]
    assert "Choose another USDA record or add the food manually" in failure["error"]

    import_response = client.post("/api/import/fdc/import", json={"fdc_ids": [10, 11]})
    assert import_response.status_code == 200
    result = import_response.get_json()
    assert result["failures"] == [{"fdc_id": 10, "error": failure["error"]}]
    assert result["created_count"] == 1
    assert [item["fdc_id"] for item in result["items"]] == [11]
    assert models.Food.get_by_user_source_fdc_id(1, "usda_fdc", 10) is None


def test_foundation_nlea_fat_can_be_previewed_and_imported(
    fdc_app: Flask, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(routes._get_importer(), "get_foods_by_ids", lambda ids: [
        {"fdcId": 748608, "description": "Oil, olive, extra virgin", "dataType": "Foundation",
         "foodNutrients": [
             {"nutrient": {"id": 1085, "number": "298"}, "amount": 93.7},
             {"nutrient": {"id": 1258, "number": "606"}, "amount": 15.4},
         ]},
    ])
    client = fdc_app.test_client()
    preview_response = client.post("/api/import/fdc/preview", json={"fdc_ids": [748608]})
    assert preview_response.status_code == 200
    preview = preview_response.get_json()
    assert preview["failures"] == []
    assert preview["items"][0]["calorieSource"] == "estimated_from_macros"
    assert float(preview["items"][0]["mapped"]["nutrition"]["total_fat_g"]) == 93.7

    response = client.post("/api/import/fdc/import", json={"fdc_ids": [748608]})
    assert response.status_code == 200
    result = response.get_json()
    assert result["failures"] == []
    assert result["created_count"] == 1
    food = models.Food.get_by_user_source_fdc_id(1, "usda_fdc", 748608)
    assert food is not None and food.primary_nutrition is not None
    assert float(food.primary_nutrition.total_fat_g) == 93.7
    assert food.primary_nutrition.calories == 843


def test_repeated_import_skips_existing_and_preserves_manual_edits(fdc_app: Flask) -> None:
    client = fdc_app.test_client()
    assert client.post("/api/import/fdc/import", json={"fdc_ids": [10]}).get_json()["created_count"] == 1
    food = models.Food.get_by_user_source_fdc_id(1, "usda_fdc", 10)
    assert food is not None
    original_id = food.id
    original_nutrition_id = food.primary_nutrition.id if food.primary_nutrition else None
    food.name = "Manually corrected name"
    food.starter_food = True
    models.db.session.commit()

    response = client.post("/api/import/fdc/import", json={"fdc_ids": [10, 11, 11]})
    assert response.status_code == 200
    result = response.get_json()
    assert result["created_count"] == result["imported_count"] == 1
    assert result["updated_count"] == 0
    assert result["skipped_count"] == 1
    assert result["skipped"] == [{"fdc_id": 10, "reason": "already_imported"}]
    assert result["failures"] == []
    assert [item["fdc_id"] for item in result["items"]] == [11]
    models.db.session.refresh(food)
    assert food.id == original_id and food.name == "Manually corrected name" and food.starter_food
    assert food.primary_nutrition and food.primary_nutrition.id == original_nutrition_id
    assert models.db.session.scalar(models.db.select(models.db.func.count()).select_from(models.Food)) == 2


def test_search_marks_catalog_imports_only(fdc_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    client = fdc_app.test_client()
    client.post("/api/import/fdc/import", json={"fdc_ids": [10]})
    models.db.session.execute(models.db.insert(models.Food).values(
        user_id=2, name="Other user's food", vendor="USDA", group=models.FoodGroup.other,
        servings=1, source="usda_fdc", fdc_id=11,
    ))
    models.db.session.commit()
    monkeypatch.setattr(routes._get_importer(), "search_foods", lambda **kwargs: {
        "totalHits": 3, "currentPage": 1, "totalPages": 1,
        "foods": [{"fdcId": value, "description": f"Food {value}"} for value in [10, 11, 12]],
    })
    response = client.get("/api/import/fdc/search?query=food")
    assert response.status_code == 200
    assert [food["alreadyImported"] for food in response.get_json()["foods"]] == [True, False, False]
    models.db.session.commit()
    assert client.post("/api/import/fdc/import", json={"fdc_ids": [11]}).get_json()["created_count"] == 1


def test_unique_constraint_blocks_duplicates_but_allows_manual_foods(fdc_app: Flask) -> None:
    fdc_app.test_client().post("/api/import/fdc/import", json={"fdc_ids": [10]})
    values = dict(user_id=1, name="Duplicate", vendor="USDA", group=models.FoodGroup.other, servings=1)
    with pytest.raises(IntegrityError), models.db.session.begin_nested():
        models.db.session.execute(models.db.insert(models.Food).values(**values, source="usda_fdc", fdc_id=10))
    for _ in range(2):
        models.db.session.execute(models.db.insert(models.Food).values(**values, source=None, fdc_id=None))
    models.db.session.commit()


def test_concurrent_duplicate_is_skipped_without_losing_other_imports(fdc_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    original_add = models.Food.add

    def add(user_id: int, food: routes.FoodRequest) -> models.Food:
        if food.fdc_id == 10:
            raise IntegrityError("INSERT", {}, sqlite3.IntegrityError(
                "UNIQUE constraint failed: food.user_id, food.source, food.fdc_id"
            ))
        return original_add(user_id, food)

    monkeypatch.setattr(models.Food, "add", staticmethod(add))
    response = fdc_app.test_client().post("/api/import/fdc/import", json={"fdc_ids": [10, 11]})
    result = response.get_json()
    assert response.status_code == 200
    assert result["skipped_count"] == 1 and result["created_count"] == 1
    assert result["failures"] == []
    assert [item["fdc_id"] for item in result["items"]] == [11]


@pytest.mark.parametrize("method, path", [("get", "/api/import/fdc/search?query=food"), ("post", "/api/import/fdc/import")])
def test_import_features_remain_admin_only(fdc_app: Flask, monkeypatch: pytest.MonkeyPatch, method: str, path: str) -> None:
    monkeypatch.setattr(routes, "get_jwt", lambda: {"roles": ["user"]})
    response = getattr(fdc_app.test_client(), method)(path)
    assert response.status_code == 403
