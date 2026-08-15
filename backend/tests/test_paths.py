from pathlib import Path

from db.connection import DB_ENV_VAR, DEFAULT_DB_PATH, resolve_db_path
from services.content import CONTENT_ROOT

# Dwie stałe liczone od __file__ przetrwały przenosiny kodu do backend/ tylko
# dlatego, że ktoś o nich pamiętał. Reszta testów tego nie łapie: test_content
# wstrzykuje własny content_root, a bazy jadą na tmp_path - wskazanie złego
# katalogu przeszłoby przez cały zielony pakiet i objawiło się dopiero pustą
# bazą w produkcji. Ten plik jest zabezpieczeniem dokładnie na to.

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_database_lives_in_repo_root_data():
    assert DEFAULT_DB_PATH == REPO_ROOT / "data" / "roadmap.db"


def test_env_var_redirects_the_database(monkeypatch, tmp_path):
    # Bez tej furtki każde ręczne sprawdzenie apki na żywym serwerze pisze do
    # prawdziwej historii nauki - zdarzyło się raz i zostawiło w niej śmieciowe
    # powtórki oraz cudzą notatkę w polu „moimi słowami".
    monkeypatch.setenv(DB_ENV_VAR, str(tmp_path / "próba.db"))

    assert resolve_db_path() == tmp_path / "próba.db"


def test_empty_env_var_falls_back_to_the_real_database(monkeypatch):
    # Pusta zmienna to najczęściej "export ML_ROADMAP_DB=" w skrypcie, a nie
    # prośba o bazę w katalogu bieżącym.
    monkeypatch.setenv(DB_ENV_VAR, "   ")

    assert resolve_db_path() == DEFAULT_DB_PATH


def test_content_root_is_the_repo_level_content_directory():
    assert CONTENT_ROOT == REPO_ROOT / "content"


def test_content_root_actually_exists_with_the_three_kinds():
    # content/ jest w gicie, więc ten katalog ma prawo być sprawdzany na dysku:
    # gdyby import materiałów zaczął celować w puste miejsce, przy starcie
    # aplikacji nie wjechałaby ani jedna fiszka i nic by o tym nie powiedziało.
    assert CONTENT_ROOT.is_dir()
    for kind in ("flashcards", "questions", "resources"):
        assert (CONTENT_ROOT / kind).is_dir(), kind
