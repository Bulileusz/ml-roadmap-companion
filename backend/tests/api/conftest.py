import pytest
from fastapi.testclient import TestClient

from api.deps import get_db
from api.main import app
from db.connection import get_connection
from db.schema import init_db
from db.seed_data import seed_if_empty
from repository import tasks_repo


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


# Zadania roadmapy nie jadą już z seeda - wchodzą z content/tasks/. Testy
# potrzebują ich jednak jako tła: bez ani jednego zadania każda faza ma
# done == total, więc current_phase nie ma czego wskazać i cofa się do ostatniej
# fazy, a "pierwsze niedokończone zadanie" nie istnieje. Zestaw jest jawny
# i celowo minimalny - dzięki temu testy nie zależą od tego, co akurat leży
# w content/, a rozpisanie roadmapy przez research nie przestawia im asercji.
SEEDED_TASKS = {
    "0": ["Postaw środowisko", "Przećwicz broadcasting"],
    "1": ["Wektory i macierze", "Pochodne pod gradient"],
    "2": ["KNN na sklearn", "Metryki klasyfikacji"],
    "2b": ["Random Forest", "Strojenie hiperparametrów"],
    "3": ["Tensory i autograd", "Pętla treningowa"],
    "4": ["Wybór kierunku", "Model bazowy"],
}


@pytest.fixture
def seeded(db):
    """Fazy z seeda plus minimalna roadmapa - stan po pierwszym uruchomieniu."""
    seed_if_empty(db)
    phase_ids = {
        row["code"]: row["id"]
        for row in db.execute("SELECT id, code FROM phases").fetchall()
    }
    for code, titles in SEEDED_TASKS.items():
        for title in titles:
            tasks_repo.create(db, phase_ids[code], title)
    return db


@pytest.fixture
def phase_id(seeded):
    return seeded.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
