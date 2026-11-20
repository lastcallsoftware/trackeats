"""Temporary backfill coverage; remove with the repair command after use."""

import datetime

from flask import Flask
import pytest

from models import Food, FoodGroup, User, UserStatus, db
from temporary_usda_backfill import backfill_usda_foundation_ids
from usda_fdc_importer import USDAFdcImporter, _truncate


@pytest.fixture
def repair_app(monkeypatch: pytest.MonkeyPatch):
    app = Flask(__name__)
    app.config.update(TESTING=True, SQLALCHEMY_DATABASE_URI="sqlite:///:memory:")
    db.init_app(app)
    app.cli.add_command(backfill_usda_foundation_ids)
    monkeypatch.setenv("USDA_FDC_API_KEY", "test-key")
    with app.app_context():
        db.create_all()
        db.session.execute(db.insert(User).values(
            id=1, username="Test", status=UserStatus.confirmed,
            created_at=datetime.datetime(2026, 1, 1),
        ))
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


def add_food(name: str, **values) -> Food:
    food_id = db.session.scalar(db.insert(Food).values(
        user_id=1, name=name, vendor="USDA Foundation", group=FoodGroup.other, servings=2, **values,
    ).returning(Food.id))
    db.session.commit()
    return db.session.get(Food, food_id)


def test_preview_apply_and_rerun_preserve_existing_food(repair_app: Flask, monkeypatch: pytest.MonkeyPatch):
    description = "A Foundation description long enough to require truncation in the importer"
    food_id = add_food(_truncate(description, 50)).id
    pages = []

    def search(self, **kwargs):
        pages.append(kwargs["page_number"])
        assert kwargs["query"] == _truncate(description, 50).removesuffix("...")
        assert kwargs["data_types"] == ["Foundation"]
        return {"totalPages": 2, "foods": [] if kwargs["page_number"] == 1 else [
            {"fdcId": 100, "description": description, "dataType": "Foundation"},
        ]}

    monkeypatch.setattr(USDAFdcImporter, "search_foods", search)
    runner = repair_app.test_cli_runner()
    preview = runner.invoke(args=["backfill-usda-foundation-ids"])
    assert preview.exit_code == 0, preview.output
    assert "Would patch 1 of 1" in preview.output
    assert pages == [1, 2]
    assert db.session.get(Food, food_id).fdc_id is None

    applied = runner.invoke(args=["backfill-usda-foundation-ids", "--apply"])
    assert applied.exit_code == 0, applied.output
    assert "Patched 1 of 1" in applied.output
    food = db.session.get(Food, food_id)
    assert (food.source, food.fdc_id, food.fdc_data_type) == ("usda_fdc", 100, "Foundation")
    assert food.servings == 2 and food.name == _truncate(description, 50)
    assert db.session.scalar(db.select(db.func.count()).select_from(Food)) == 1
    rerun = runner.invoke(args=["backfill-usda-foundation-ids", "--apply"])
    assert rerun.exit_code == 0 and "No USDA Foundation foods" in rerun.output


def test_only_exact_unique_unoccupied_matches_are_patched(repair_app: Flask, monkeypatch: pytest.MonkeyPatch):
    wrong_vendor = add_food("Valid")
    wrong_vendor.vendor = "USDA"
    db.session.commit()
    wrong_case = add_food("valid")
    ambiguous = add_food("Ambiguous")
    missing = add_food("Missing")
    existing = add_food("Existing", source="usda_fdc", fdc_id=100)
    conflict = add_food("Valid")
    wrong_source = add_food("Branded")
    valid = add_food("Unique")
    repeated = add_food("Unique")
    ids = [food.id for food in [wrong_vendor, wrong_case, ambiguous, missing, existing, conflict, wrong_source, valid, repeated]]
    queries = []

    def search(self, **kwargs):
        queries.append(kwargs["query"])
        return {"totalPages": 1, "foods": [
            {"fdcId": 100, "description": "Valid", "dataType": "Foundation"},
            {"fdcId": 101, "description": "Ambiguous", "dataType": "Foundation"},
            {"fdcId": 102, "description": "Ambiguous", "dataType": "Foundation"},
            {"fdcId": 103, "description": "Branded", "dataType": "Branded"},
            {"fdcId": 104, "description": "Unique", "dataType": "Foundation"},
        ]}

    monkeypatch.setattr(USDAFdcImporter, "search_foods", search)
    result = repair_app.test_cli_runner().invoke(args=["backfill-usda-foundation-ids", "--apply"])
    assert result.exit_code == 0, result.output
    assert "Patched 1 of 7" in result.output
    assert queries == ["valid", "Ambiguous", "Missing", "Valid", "Branded", "Unique"]
    assert [db.session.get(Food, food_id).fdc_id for food_id in ids] == [
        None, None, None, None, 100, None, None, 104, None,
    ]


def test_no_eligible_database_foods_does_not_search_usda(repair_app: Flask, monkeypatch: pytest.MonkeyPatch):
    add_food("Already imported", source="usda_fdc", fdc_id=100)

    def unexpected_search(self, **kwargs):
        pytest.fail("USDA must not be searched without an eligible database food")

    monkeypatch.setattr(USDAFdcImporter, "search_foods", unexpected_search)
    result = repair_app.test_cli_runner().invoke(args=["backfill-usda-foundation-ids", "--apply"])
    assert result.exit_code == 0, result.output
    assert "No USDA Foundation foods" in result.output
