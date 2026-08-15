import os
import sqlite3
from pathlib import Path

# parents[2], nie parent.parent: ten plik leży w backend/db/, a baza ma zostać
# w data/ w korzeniu repo - wspólnym dla backendu i frontu. Policzenie ścieżki
# od backend/ dałoby drugą, pustą bazę w backend/data/ i po cichu osierociło
# tę prawdziwą. Pilnuje tego tests/test_paths.py.
DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "roadmap.db"

# Nadpisanie ścieżki bazy zmienną środowiskową. Powód jest konkretny: bez tego
# każde ręczne sprawdzenie apki na żywym serwerze celuje w prawdziwą historię
# nauki i zostawia w niej śmieciowe powtórki, notatki i wpisy dziennika. Raz się
# to zdarzyło. `ML_ROADMAP_DB=/tmp/próba.db uvicorn …` daje jednorazową bazę,
# a `make smoke` robi to samo jedną komendą.
DB_ENV_VAR = "ML_ROADMAP_DB"


def resolve_db_path() -> Path:
    override = os.environ.get(DB_ENV_VAR, "").strip()
    return Path(override).expanduser() if override else DEFAULT_DB_PATH


DB_PATH = resolve_db_path()


def get_connection(db_path: str | Path = DB_PATH) -> sqlite3.Connection:
    if db_path != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn
