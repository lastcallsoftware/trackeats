import os
from pathlib import Path
from typing import Any

import pytest
from dotenv import load_dotenv
from flask import Flask
from flask.testing import FlaskClient

from app import additional_app_config, minimal_app_config
from data import Data
from models import Food, db
from usda_fdc_importer import USDA_SOURCE


def _integration_app() -> Flask:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(env_path)

    app = minimal_app_config()
    additional_app_config(app)

    with app.app_context():
        with db.session.begin():
            # Ensure key users (including admin/catalog) exist for auth/import flows.
            Data.add_users()

    return app


def _admin_headers(client: FlaskClient) -> dict[str, str]:
    admin_password = os.environ.get("APP_ADMIN_PASSWORD")
    if not admin_password:
        pytest.fail("APP_ADMIN_PASSWORD is required for USDA integration tests")

    login_resp = client.post(
        "/api/login",
        json={"email": Data.ADMIN_USER_EMAIL, "password": admin_password},
    )
    assert login_resp.status_code == 200, login_resp.get_json()

    token = login_resp.get_json().get("access_token")
    assert token, "Expected /api/login to return access_token"
    return {"Authorization": f"Bearer {token}"}


def _choose_target_milk_row(foods: list[dict[str, Any]]) -> dict[str, Any]:
    configured = os.environ.get("USDA_TEST_MILK_FDC_ID")
    if configured:
        try:
            target_id = int(configured)
        except ValueError:
            pytest.fail("USDA_TEST_MILK_FDC_ID must be numeric if provided")

        for row in foods:
            if int(row.get("fdcId") or 0) == target_id:
                return row

        pytest.fail(
            f"USDA_TEST_MILK_FDC_ID={target_id} not present in milk search results; "
            "adjust page size/query or update USDA_TEST_MILK_FDC_ID"
        )

    # Fallback: use first available milk Foundation row from current live results.
    return foods[0]


@pytest.mark.integration
def test_milk_search_then_import_selected_record() -> None:
    app = _integration_app()
    client = app.test_client()
    headers = _admin_headers(client)

    search_resp = client.get(
        "/api/import/fdc/search",
        query_string={
            "query": "milk",
            "pageNumber": 1,
            "pageSize": 25,
            "dataType": "Foundation",
        },
        headers=headers,
    )

    assert search_resp.status_code == 200, search_resp.get_json()
    search_data = search_resp.get_json()

    foods = search_data.get("foods") or []
    preview_items = search_data.get("previewItems") or []

    assert isinstance(foods, list)
    assert isinstance(preview_items, list)
    assert len(foods) > 0, "Expected at least one milk Foundation result"
    assert len(preview_items) > 0, "Expected preview data in search response"

    target_row = _choose_target_milk_row(foods)
    target_fdc_id = int(target_row["fdcId"])

    import_resp = client.post(
        "/api/import/fdc/import",
        json={
            "fdc_ids": [target_fdc_id],
            "group_overrides": {},
            "usda_foods": [target_row],
        },
        headers=headers,
    )

    assert import_resp.status_code == 200, import_resp.get_json()
    import_data = import_resp.get_json()

    assert import_data.get("failures") == []
    assert import_data.get("imported_count") == 1

    imported_items = import_data.get("items") or []
    assert len(imported_items) == 1
    assert int(imported_items[0].get("fdc_id") or 0) == target_fdc_id
    assert imported_items[0].get("action") in {"created", "updated"}

    with app.app_context():
        catalog_user_id = Data.CATALOG_USER_ID
        imported_food = Food.get_by_user_source_fdc_id(catalog_user_id, USDA_SOURCE, target_fdc_id)
        assert imported_food is not None
