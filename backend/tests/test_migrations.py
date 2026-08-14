import sqlite3

import pytest

from db.connection import get_connection
from db.schema import MIGRATIONS, init_db

ALL_TABLES = {
    "phases",
    "tasks",
    "flashcards",
    "questions",
    "question_attempts",
    "activity_log",
    "content_imports",
    "resources",
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


def test_v3_db_gains_answer_column_with_empty_default(tmp_path):
    old = get_connection(tmp_path / "v3.db")
    for migration in MIGRATIONS[:3]:
        migration(old)
    old.execute("PRAGMA user_version = 3")
    old.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    old.execute(
        "INSERT INTO questions (id, phase_id, question_text, question_type) "
        "VALUES (5, 1, 'Stare pytanie', 'concept')"
    )
    old.commit()
    columns = {row["name"] for row in old.execute("PRAGMA table_info(questions)")}
    assert "answer" not in columns

    init_db(old)

    assert _user_version(old) == len(MIGRATIONS)
    row = old.execute("SELECT * FROM questions WHERE id = 5").fetchone()
    # Istniejące pytanie dostaje pustą odpowiedź, a nie NULL - import z
    # content/ rozpoznaje po tym, że można ją uzupełnić.
    assert row["answer"] == ""
    assert row["question_text"] == "Stare pytanie"
    old.close()


def test_answer_migration_is_idempotent(tmp_path):
    conn = get_connection(tmp_path / "idem.db")
    init_db(conn)
    conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.execute(
        "INSERT INTO questions (phase_id, question_text, question_type, answer) "
        "VALUES (1, 'Pytanie', 'concept', 'Odpowiedź')"
    )
    conn.commit()

    # Powtórne przejechanie migracji (ścieżka adopcji) nie może wywalić się na
    # istniejącej kolumnie ani skasować zapisanej odpowiedzi.
    MIGRATIONS[3](conn)

    assert conn.execute("SELECT answer FROM questions").fetchone()["answer"] == (
        "Odpowiedź"
    )
    conn.close()


def test_v4_db_gains_resources_and_keeps_the_import_ledger(tmp_path):
    old = get_connection(tmp_path / "v4.db")
    for migration in MIGRATIONS[:4]:
        migration(old)
    old.execute("PRAGMA user_version = 4")
    old.execute(
        "INSERT INTO content_imports (kind, item_key, created_at) "
        "VALUES ('flashcard', '0|coś', '2026-01-01 10:00:00')"
    )
    old.commit()
    assert "resources" not in _table_names(old)

    init_db(old)

    assert _user_version(old) == len(MIGRATIONS)
    assert "resources" in _table_names(old)
    # Przebudowa content_imports musi zachować wiersze - inaczej cały starter
    # wjechałby drugi raz przy najbliższym starcie.
    rows = old.execute("SELECT * FROM content_imports").fetchall()
    assert [(r["kind"], r["item_key"]) for r in rows] == [("flashcard", "0|coś")]
    # CHECK na kind zniknął, więc nowy rodzaj przechodzi.
    old.execute(
        "INSERT INTO content_imports (kind, item_key, created_at) "
        "VALUES ('resource', '0|islr', '2026-01-01 10:00:00')"
    )
    old.commit()
    old.close()


def test_content_imports_rebuild_runs_only_once(tmp_path):
    conn = get_connection(tmp_path / "rebuild.db")
    init_db(conn)
    conn.execute(
        "INSERT INTO content_imports (kind, item_key, created_at) "
        "VALUES ('resource', '0|islr', '2026-01-01 10:00:00')"
    )
    conn.commit()

    # Powtórne przejechanie migracji nie może wyczyścić ewidencji.
    MIGRATIONS[4](conn)

    count = conn.execute("SELECT COUNT(*) FROM content_imports").fetchone()[0]
    assert count == 1
    conn.close()


def _migrate_to_version_5(db_path):
    """Baza zatrzymana na wersji 5 - stan sprzed modułu nauki."""
    connection = get_connection(db_path)
    for migration in MIGRATIONS[:5]:
        migration(connection)
    connection.execute("PRAGMA user_version = 5")
    connection.commit()
    return connection


def test_v5_db_drops_the_activity_kind_check_and_keeps_history(tmp_path):
    old = _migrate_to_version_5(tmp_path / "v5.db")
    old.execute(
        "INSERT INTO activity_log (id, occurred_at, kind, ref_id, detail) VALUES "
        "(3, '2026-03-10 08:00:00', 'task_done', 1, 'NumPy'), "
        "(9, '2026-03-11 09:30:00', 'card_review', 2, 'Gradient')"
    )
    old.commit()
    # Przed migracją nowy rodzaj odbija się od CHECK-a.
    with pytest.raises(sqlite3.IntegrityError):
        old.execute(
            "INSERT INTO activity_log (occurred_at, kind) "
            "VALUES ('2026-03-12 10:00:00', 'card_intro')"
        )
    old.rollback()

    init_db(old)

    assert _user_version(old) == len(MIGRATIONS)
    # Przepisanie tabeli zachowuje wiersze *razem z id* - dziennik sortuje się
    # po (occurred_at, id), więc przenumerowanie zmieniłoby kolejność zdarzeń
    # zapisanych w tej samej sekundzie.
    rows = old.execute("SELECT * FROM activity_log ORDER BY id").fetchall()
    assert [(r["id"], r["kind"], r["detail"]) for r in rows] == [
        (3, "task_done", "NumPy"),
        (9, "card_review", "Gradient"),
    ]
    # Indeks ginie razem z DROP TABLE, więc migracja musi go odtworzyć.
    indeksy = {
        row["name"]
        for row in old.execute(
            "SELECT name FROM sqlite_master WHERE type = 'index' "
            "AND tbl_name = 'activity_log'"
        )
    }
    assert "idx_activity_log_occurred_at" in indeksy
    # A nowe rodzaje wchodzą już bez przeszkód.
    old.execute(
        "INSERT INTO activity_log (occurred_at, kind) VALUES "
        "('2026-03-12 10:00:00', 'card_intro'), "
        "('2026-03-12 11:00:00', 'resource_done')"
    )
    old.commit()
    old.close()


def test_activity_log_rebuild_runs_only_once(tmp_path):
    conn = get_connection(tmp_path / "activity-replay.db")
    init_db(conn)
    conn.execute(
        "INSERT INTO activity_log (occurred_at, kind, detail) "
        "VALUES ('2026-03-10 08:00:00', 'card_intro', 'Gradient')"
    )
    conn.commit()

    # Powtórne przejechanie migracji (ścieżka adopcji) nie ma prawa przemielić
    # dziennika drugi raz - CHECK-a już nie ma, więc warunek musi je zablokować.
    MIGRATIONS[5](conn)

    rows = conn.execute("SELECT * FROM activity_log").fetchall()
    assert [(r["kind"], r["detail"]) for r in rows] == [("card_intro", "Gradient")]
    conn.close()


def test_v5_db_gains_learning_columns_with_backfilled_learned_at(tmp_path):
    old = _migrate_to_version_5(tmp_path / "v5-cards.db")
    old.execute(
        "INSERT INTO flashcards (id, front, back, box, next_review_at, created_at, "
        "updated_at) VALUES "
        "(1, 'Gradient', 'Wektor pochodnych', 4, '2026-03-20', "
        "'2026-01-02 19:00:00', '2026-03-13 19:00:00')"
    )
    old.commit()
    columns = {row["name"] for row in old.execute("PRAGMA table_info(flashcards)")}
    assert "learned_at" not in columns
    assert "own_note" not in columns

    init_db(old)

    card = old.execute("SELECT * FROM flashcards WHERE id = 1").fetchone()
    # Karta siedząca w pudełku 4 jest dawno w rotacji - wysłanie jej do
    # przebiegu zapoznawczego byłoby absurdem, więc backfill stempluje
    # learned_at datą utworzenia.
    assert card["learned_at"] == "2026-01-02 19:00:00"
    assert card["own_note"] == ""
    assert card["box"] == 4
    old.close()


def test_learning_migration_is_idempotent(tmp_path):
    conn = get_connection(tmp_path / "learning-idem.db")
    init_db(conn)
    conn.execute(
        "INSERT INTO flashcards (front, back, next_review_at, learned_at, own_note, "
        "created_at, updated_at) VALUES "
        "('a', 'b', '2026-03-20', NULL, 'moja notatka', '2026-03-01 10:00:00', "
        "'2026-03-01 10:00:00')"
    )
    conn.commit()

    MIGRATIONS[6](conn)

    card = conn.execute("SELECT * FROM flashcards").fetchone()
    # Powtórka migracji nie może ani nadpisać notatki, ani zbackfillować
    # learned_at karcie, która świadomie czeka na zapoznanie.
    assert card["own_note"] == "moja notatka"
    assert card["learned_at"] is None
    conn.close()


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
