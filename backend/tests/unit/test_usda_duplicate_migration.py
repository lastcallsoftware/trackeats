"""Verify the import identity constraint without altering application data."""

import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
import pytest
import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError


def test_duplicate_migration_preserves_records_and_requires_manual_cleanup() -> None:
    path = Path(__file__).resolve().parents[2] / "migrations" / "versions" / "e7f9a1b3c5d7_prevent_duplicate_usda_foods.py"
    spec = importlib.util.spec_from_file_location("duplicate_migration", path)
    assert spec is not None and spec.loader is not None
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    metadata = sa.MetaData()
    food = sa.Table("food", metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("source", sa.String(20)), sa.Column("fdc_id", sa.Integer),
    )
    engine = sa.create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        metadata.create_all(connection)
        connection.execute(food.insert(), [
            {"id": value, "user_id": 1, "source": "usda_fdc", "fdc_id": 10} for value in [1, 2]
        ])
        with Operations.context(MigrationContext.configure(connection)):
            with pytest.raises(RuntimeError, match="Resolve duplicates"):
                migration.upgrade()
            assert connection.scalar(sa.select(sa.func.count()).select_from(food)) == 2
            assert not sa.inspect(connection).get_unique_constraints("food")

            connection.execute(food.delete().where(food.c.id == 2))
            migration.upgrade()
            assert connection.scalar(sa.select(sa.func.count()).select_from(food)) == 1
            with pytest.raises(IntegrityError), connection.begin_nested():
                connection.execute(food.insert().values(user_id=1, source="usda_fdc", fdc_id=10))
            connection.execute(food.insert().values(user_id=2, source="usda_fdc", fdc_id=10))
            for _ in range(2):
                connection.execute(food.insert().values(user_id=1, source=None, fdc_id=None))
            migration.downgrade()
            connection.execute(food.insert().values(user_id=1, source="usda_fdc", fdc_id=10))
            assert connection.scalar(sa.select(sa.func.count()).select_from(food)) == 5
