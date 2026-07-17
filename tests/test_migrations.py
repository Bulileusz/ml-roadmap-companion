from db.connection import get_connection
from db.schema import MIGRATIONS, init_db

ALL_TABLES = {"phases", "tasks", "flashcards", "questions", "question_attempts"}


def _table_names(conn):
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table'"
    ).fetchall()
    return {row["name"] for row in rows}


def _user_version(conn):
    return conn.execute("PRAGMA user_version").fetchone()[0]


def test_fresh_db_migrates_to_latest_version(conn):
    assert _user_version(conn) == len(MIGRATIONS)
    assert ALL_TABLES <= _table_names(conn)


def test_init_db_is_idempotent(conn):
    conn.execute("INSERT INTO phases (code, name) VALUES ('x', 'Faza X')")
    conn.commit()

    init_db(conn)

    assert _user_version(conn) == len(MIGRATIONS)
    count = conn.execute("SELECT COUNT(*) FROM phases").fetchone()[0]
    assert count == 1


def test_legacy_db_without_user_version_is_adopted(tmp_path):
    # Baza sprzed wersjonowania: tabele istnieją, user_version = 0.
    legacy = get_connection(tmp_path / "legacy.db")
    for migration in MIGRATIONS:
        migration(legacy)
    legacy.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    legacy.commit()
    assert _user_version(legacy) == 0

    init_db(legacy)

    assert _user_version(legacy) == len(MIGRATIONS)
    count = legacy.execute("SELECT COUNT(*) FROM phases").fetchone()[0]
    assert count == 1
    legacy.close()
