from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

from db import bootstrap
from db.connection import get_connection

# Strony to skrypty Streamlita, nie funkcje - pytest normalnie ich nie dotyka,
# więc literówka w wywołaniu st.* wychodziłaby dopiero przy ręcznym odpaleniu
# apki. AppTest wykonuje skrypt na sucho i zbiera wyjątki.

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PAGES = ["app.py"] + sorted(
    str(path.relative_to(PROJECT_ROOT))
    for path in (PROJECT_ROOT / "pages").glob("*.py")
)


@pytest.fixture
def isolated_app_db(tmp_path, monkeypatch):
    """init_app() na bazie tymczasowej zamiast prawdziwego data/roadmap.db."""
    connection = get_connection(tmp_path / "app.db")
    monkeypatch.setattr(bootstrap, "get_connection", lambda *args, **kwargs: connection)
    # init_app jest cache'owane przez st.cache_resource, więc bez czyszczenia
    # kolejny test dostałby połączenie z poprzedniego tmp_path.
    bootstrap.init_app.clear()
    yield connection
    bootstrap.init_app.clear()
    connection.close()


@pytest.mark.parametrize("page", PAGES)
def test_page_renders_without_exception(page, isolated_app_db):
    app = AppTest.from_file(str(PROJECT_ROOT / page), default_timeout=30).run()

    assert not app.exception, [entry.value for entry in app.exception]


def test_home_page_shows_all_metric_tiles(isolated_app_db):
    app = AppTest.from_file(str(PROJECT_ROOT / "app.py"), default_timeout=30).run()

    labels = [metric.label for metric in app.metric]
    assert labels == ["Postęp roadmapy", "Fiszki na dziś", "Samodzielność", "Seria dni"]
