"""Exercise account deletion against a database with foreign keys enforced."""

import datetime
from collections.abc import Iterator

import pytest
from flask import Flask

import models
import routes


@pytest.fixture
def account_app(monkeypatch: pytest.MonkeyPatch) -> Iterator[Flask]:
    app = Flask(__name__)
    app.config.update(TESTING=True, SQLALCHEMY_DATABASE_URI="sqlite:///:memory:")
    models.db.init_app(app)
    app.register_blueprint(routes.bp)
    monkeypatch.setattr(routes, "verify_jwt_in_request", lambda: None)
    monkeypatch.setattr(routes, "get_jwt", lambda: {"roles": ["admin"]})
    monkeypatch.setattr(routes, "get_jwt_identity", lambda: "alice@example.com")
    monkeypatch.setattr(models.User, "get_by_email", staticmethod(lambda email: models.User.get("alice")))

    with app.app_context():
        models.db.session.execute(models.db.text("PRAGMA foreign_keys=ON"))
        models.db.session.commit()
        models.db.create_all()
        yield app
        models.db.session.remove()
        models.db.drop_all()


def _seed_account(user_id: int, username: str, profile: str) -> None:
    session = models.db.session
    session.execute(models.db.insert(models.User).values(
        id=user_id, username=username, status=models.UserStatus.confirmed,
        created_at=datetime.datetime(2026, 1, 1),
    ))
    if profile == "empty":
        return
    session.execute(models.db.insert(models.Food).values(
        id=user_id, user_id=user_id, group=models.FoodGroup.other,
        name="Apple", vendor="Store", servings=1,
    ))
    if profile == "food":
        return
    for nutrition_id in range(user_id, user_id + 4):
        session.execute(models.db.insert(models.Nutrition).values(
            id=nutrition_id, user_id=user_id, serving_size_description="serving", calories=100,
        ))
    session.execute(models.db.insert(models.NutritionAlternative).values(
        id=user_id, food_id=user_id, nutrition_id=user_id,
        serving_value=1, serving_unit="serving", serving_unit_kind="solid", is_primary=True,
    ))
    # Insert the parent with a higher ID to catch deletion in primary-key order.
    for recipe_id, parent_id in [(user_id + 1, None), (user_id, user_id + 1)]:
        session.execute(models.db.insert(models.Recipe).values(
            id=recipe_id, user_id=user_id, name="Recipe", total_yield="one serving",
            nutrition_id=user_id + 1 if parent_id is None else None,
            parent_recipe_id=parent_id,
        ))
    session.execute(models.db.insert(models.Ingredient), [
        dict(id=user_id, user_id=user_id, recipe_id=user_id, food_ingredient_id=user_id,
             ordinal=0, servings=1),
        dict(id=user_id + 1, user_id=user_id, recipe_id=user_id,
             recipe_ingredient_id=user_id + 1, ordinal=1, servings=1),
    ])
    session.execute(models.db.insert(models.DailyLogItem).values(
        id=user_id, user_id=user_id, date=datetime.date(2026, 1, 1),
        food_id=user_id, recipe_id=user_id, nutrition_id=user_id + 2, servings=1, ordinal=0,
    ))
    session.execute(models.db.insert(models.Preferences).values(
        id=user_id, user_id=user_id, context="foods.columns", preferences={"name": True},
    ))
    # The fourth nutrition row is an orphan left by earlier food deletions.


@pytest.mark.parametrize("endpoint", ["/api/user", "/api/user/alice"])
@pytest.mark.parametrize("profile", ["empty", "food", "full"])
def test_delete_account_removes_owned_data_only(account_app: Flask, endpoint: str, profile: str) -> None:
    _seed_account(14, "alice", profile)
    _seed_account(42, "bob", "full")
    models.db.session.commit()
    tables = list(models.db.metadata.sorted_tables)
    before = {table.name: models.db.session.execute(models.db.select(table)).all() for table in tables}
    models.db.session.commit()

    response = account_app.test_client().delete(endpoint)

    assert response.status_code == 200, response.get_json()
    for table in tables:
        remaining = models.db.session.execute(models.db.select(table)).all()
        expected = [row for row in before[table.name] if row.id >= 42]
        assert remaining == expected, table.name


@pytest.mark.parametrize("endpoint", ["/api/user", "/api/user/alice"])
def test_delete_account_rolls_back_on_cleanup_failure(
    account_app: Flask, monkeypatch: pytest.MonkeyPatch, endpoint: str,
) -> None:
    _seed_account(14, "alice", "full")
    models.db.session.commit()
    tables = list(models.db.metadata.sorted_tables)
    before = {table.name: models.db.session.execute(models.db.select(table)).all() for table in tables}
    models.db.session.commit()

    def fail_food_cleanup(user_id: int) -> None:
        raise ValueError("Simulated cleanup failure")

    monkeypatch.setattr(models.Food, "delete_all_for_user", staticmethod(fail_food_cleanup))
    response = account_app.test_client().delete(endpoint)

    assert response.status_code == 500
    assert "Simulated cleanup failure" in response.get_json()["msg"]
    for table in tables:
        assert models.db.session.execute(models.db.select(table)).all() == before[table.name]
