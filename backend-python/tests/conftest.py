import sys
from pathlib import Path

import pytest
from _pytest.config import Config
from _pytest.nodes import Item
from flask import Flask


BACKEND_SRC = Path(__file__).resolve().parents[1] / "src"
if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))


@pytest.fixture
def bare_flask_app() -> Flask:
    app = Flask(__name__)
    app.config["TESTING"] = True
    return app


def pytest_collection_modifyitems(config: Config, items: list[Item]) -> None:
    # Keep integration tests out of default runs, but allow explicit marker selection.
    if config.getoption("-m"):
        return

    skip_integration = pytest.mark.skip(reason="integration test (run with pytest -m integration)")
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip_integration)
