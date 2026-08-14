import pytest
from fastapi.testclient import TestClient

from api.deps import get_db
from api.main import app
from db.connection import get_connection
from db.schema import init_db
from db.seed_data import seed_if_empty


@pytest.fixture
def db(tmp_path):
    connection = get_connection(tmp_path / "api.db")
    init_db(connection)
    yield connection
    connection.close()


@pytest.fixture
def client(db):
    """TestClient na bazie tymczasowej, celowo BEZ menedżera kontekstu.

    `with TestClient(app)` odpalałoby lifespan, czyli bootstrap() na prawdziwym
    data/roadmap.db - z migracjami, importem całego content/ i zapisem migawki.
    Testy mają nie dotykać dysku użytkownika, a lifespan ma osobny test, który
    podstawia mu własne ścieżki.
    """
    # Zwykłe callable, nie generator: FastAPI rozpoznaje generatory po
    # inspect.isgeneratorfunction, a lambda zwracająca iterator nim nie jest -
    # do endpointu trafiłby wtedy sam iterator zamiast połączenia. Zamknięcie
    # połączenia zostaje na fixture `db`.
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def seeded(db):
    """Baza z fazami i zadaniami z seeda - stan po pierwszym uruchomieniu."""
    seed_if_empty(db)
    return db


@pytest.fixture
def phase_id(seeded):
    return seeded.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
