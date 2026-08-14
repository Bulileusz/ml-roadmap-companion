import sqlite3
from pathlib import Path

# parents[2], nie parent.parent: ten plik leży w backend/db/, a baza ma zostać
# w data/ w korzeniu repo - wspólnym dla backendu i frontu. Policzenie ścieżki
# od backend/ dałoby drugą, pustą bazę w backend/data/ i po cichu osierociło
# tę prawdziwą. Pilnuje tego tests/test_paths.py.
DB_PATH = Path(__file__).resolve().parents[2] / "data" / "roadmap.db"


def get_connection(db_path: str | Path = DB_PATH) -> sqlite3.Connection:
    if db_path != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn
