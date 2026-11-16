"""Verify that renaming the serving table preserves records and foreign keys."""

import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
import sqlalchemy as sa

import models


def test_food_serving_table_rename_preserves_data_and_links() -> None:
    path = Path(__file__).resolve().parents[2] / "migrations" / "versions" / "d6e8f0a2b4c6_rename_nutrition_alternative_to_food_serving.py"
    spec = importlib.util.spec_from_file_location("serving_migration", path)
    assert spec is not None and spec.loader is not None
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    metadata = sa.MetaData()
    food = sa.Table("food", metadata, sa.Column("id", sa.Integer, primary_key=True))
    nutrition = sa.Table("nutrition", metadata, sa.Column("id", sa.Integer, primary_key=True))
    old_serving = models.FoodServing.__table__.to_metadata(metadata, name="nutrition_alternative")
    engine = sa.create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(sa.text("PRAGMA foreign_keys=ON"))
        metadata.create_all(connection)
        connection.execute(food.insert().values(id=7))
        connection.execute(nutrition.insert().values(id=11))
        connection.execute(old_serving.insert().values(
            id=3, food_id=7, nutrition_id=11, serving_value=1.5,
            serving_unit="cup", serving_unit_kind="liquid", ordinal=0, is_primary=True,
        ))
        original = connection.execute(sa.select(old_serving)).one()

        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            assert "nutrition_alternative" not in sa.inspect(connection).get_table_names()
            serving = sa.Table("food_serving", sa.MetaData(), autoload_with=connection)
            assert connection.execute(sa.select(serving)).one() == original
            assert {fk["referred_table"] for fk in sa.inspect(connection).get_foreign_keys("food_serving")} == {"food", "nutrition"}

            migration.downgrade()
            assert "food_serving" not in sa.inspect(connection).get_table_names()
            assert connection.execute(sa.select(old_serving)).one() == original
