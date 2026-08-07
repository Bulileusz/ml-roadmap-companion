from db.connection import get_connection
from db.schema import MIGRATIONS, init_db

ALL_TABLES = {
    "phases",
    "tasks",
    "flashcards",
    "questions",
    "question_attempts",
    "activity_log",
}


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


def _migrate_to_version_1(db_path):
    """Baza zatrzymana na wersji 1 - stan sprzed dołożenia dziennika."""
    connection = get_connection(db_path)
    MIGRATIONS[0](connection)
    connection.execute("PRAGMA user_version = 1")
    connection.commit()
    return connection


def test_v1_db_upgrades_and_backfills_attempts(tmp_path):
    old = _migrate_to_version_1(tmp_path / "v1.db")
    old.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    old.execute(
        "INSERT INTO questions (id, phase_id, question_text, question_type) "
        "VALUES (7, 1, 'Czym jest wariancja?', 'concept')"
    )
    old.execute(
        "INSERT INTO question_attempts (question_id, attempted_at, "
        "solved_independently) VALUES "
        "(7, '2026-03-10 08:00:00', 1), (7, '2026-03-11 09:30:00', 0)"
    )
    old.commit()
    assert _user_version(old) == 1
    assert "activity_log" not in _table_names(old)

    init_db(old)

    assert _user_version(old) == len(MIGRATIONS)
    rows = old.execute("SELECT * FROM activity_log ORDER BY occurred_at").fetchall()
    assert [row["occurred_at"] for row in rows] == [
        "2026-03-10 08:00:00",
        "2026-03-11 09:30:00",
    ]
    assert {row["kind"] for row in rows} == {"question_attempt"}
    assert {row["ref_id"] for row in rows} == {7}
    # detail to migawka treści pytania, dociągana JOIN-em w backfillu.
    assert {row["detail"] for row in rows} == {"Czym jest wariancja?"}
    old.close()


def test_backfill_does_not_duplicate_when_migrations_replay(tmp_path):
    old = _migrate_to_version_1(tmp_path / "replay.db")
    old.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    old.execute(
        "INSERT INTO questions (id, phase_id, question_text, question_type) "
        "VALUES (1, 1, 'Pytanie', 'concept')"
    )
    old.execute(
        "INSERT INTO question_attempts (question_id, attempted_at, "
        "solved_independently) VALUES (1, '2026-03-10 08:00:00', 1)"
    )
    old.commit()

    init_db(old)
    # Powtórne przejechanie migracji (ścieżka adopcji starej bazy) nie może
    # zdublować przeniesionej historii.
    MIGRATIONS[1](old)

    count = old.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0]
    assert count == 1
    old.close()


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
