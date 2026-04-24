import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

from app import minimal_app_config, verify_database_connection


@pytest.mark.integration
def test_verify_database_connection_with_real_db() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(env_path)

    required = ["DB_HOSTNAME", "DB_APP_PASSWORD"]
    missing = [key for key in required if not os.environ.get(key)]
    if missing:
        pytest.fail(f"Missing required environment variables for integration test: {', '.join(missing)}")

    app = minimal_app_config()
    error = verify_database_connection(app)

    assert error is None
