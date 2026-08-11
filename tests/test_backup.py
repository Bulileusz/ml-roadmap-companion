import json
import sqlite3
from datetime import date

import pytest

from db.connection import get_connection
from db.schema import init_db
from repository import (
    activity_repo,
    flashcards_repo,
    question_attempts_repo,
    questions_repo,
    tasks_repo,
)
from services import backup


def _populate(conn):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.commit()
    phase_id = cursor.lastrowid

    task_id = tasks_repo.create(conn, phase_id, "NumPy: broadcasting")
    tasks_repo.set_done(conn, task_id, True)
    flashcards_repo.create(
        conn, "Gradient", "Wektor pochodnych", phase_id, "2026-03-15"
    )
    question_id = questions_repo.create(conn, phase_id, "Czym jest bias?", "concept")
    question_attempts_repo.create(conn, question_id, True)
    activity_repo.log(
        conn, activity_repo.KIND_TASK_DONE, task_id, "NumPy: broadcasting"
    )
    return phase_id, task_id, question_id


def _snapshot(conn):
    # content_imports nie ma kolumny id (klucz to para kind+item_key).
    orders = {"content_imports": "kind, item_key"}
    return {
        table: [
            dict(row)
            for row in conn.execute(
                f"SELECT * FROM {table} ORDER BY {orders.get(table, 'id')}"
            )
        ]
        for table in backup.TABLES
    }


def test_export_covers_every_table(conn):
    _populate(conn)

    payload = backup.export_data(conn)

    assert set(payload["tables"]) == set(backup.TABLES)
    assert payload["format_version"] == backup.FORMAT_VERSION
    assert (
        payload["schema_version"] == conn.execute("PRAGMA user_version").fetchone()[0]
    )
    assert backup.summarize(payload)["tasks"] == 1


def test_export_json_is_readable_utf8(conn):
    _populate(conn)

    text = backup.export_json(conn)

    # Polskie znaki jako znaki, nie \uXXXX - plik ma być czytelny w edytorze.
    assert "Czym jest bias?" in text
    assert json.loads(text)["tables"]["questions"][0]["question_text"] == (
        "Czym jest bias?"
    )


def test_export_filename_uses_given_date():
    assert backup.export_filename(date(2026, 3, 15)) == "roadmap-export-2026-03-15.json"


def test_roundtrip_into_fresh_database_preserves_rows_and_ids(conn, tmp_path):
    _populate(conn)
    payload = backup.export_data(conn)
    original = _snapshot(conn)

    fresh = get_connection(tmp_path / "fresh.db")
    init_db(fresh)
    backup.import_data(fresh, payload)

    assert _snapshot(fresh) == original
    fresh.close()


def test_import_replaces_existing_content(conn, tmp_path):
    _populate(conn)
    payload = backup.export_data(conn)

    target = get_connection(tmp_path / "other.db")
    init_db(target)
    target.execute("INSERT INTO phases (code, name) VALUES ('9', 'Faza do skasowania')")
    target.commit()

    backup.import_data(target, payload)

    codes = [row["code"] for row in target.execute("SELECT code FROM phases")]
    assert codes == ["0"]
    target.close()


def test_import_preserves_foreign_key_relations(conn, tmp_path):
    phase_id, task_id, question_id = _populate(conn)
    payload = backup.export_data(conn)

    fresh = get_connection(tmp_path / "fk.db")
    init_db(fresh)
    backup.import_data(fresh, payload)

    task = fresh.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    assert task["phase_id"] == phase_id
    attempt = fresh.execute("SELECT * FROM question_attempts").fetchone()
    assert attempt["question_id"] == question_id
    fresh.close()


def test_import_rejects_newer_schema_version(conn):
    _populate(conn)
    payload = backup.export_data(conn)
    payload["schema_version"] += 1
    before = _snapshot(conn)

    with pytest.raises(backup.BackupError, match="nowszej wersji"):
        backup.import_data(conn, payload)

    assert _snapshot(conn) == before


def test_import_accepts_older_schema_version(conn):
    # Plik ze starszej wersji bazy jest w porządku: brakujące kolumny mają
    # defaulty, a migracje już przeszły.
    _populate(conn)
    payload = backup.export_data(conn)
    payload["schema_version"] = 1

    backup.import_data(conn, payload)

    assert backup.summarize(backup.export_data(conn))["tasks"] == 1


def test_import_rejects_unknown_format_version(conn):
    payload = backup.export_data(conn)
    payload["format_version"] = 99

    with pytest.raises(backup.BackupError, match="Nieobsługiwany format"):
        backup.import_data(conn, payload)


def test_import_rejects_missing_tables(conn):
    payload = backup.export_data(conn)
    del payload["tables"]["flashcards"]

    with pytest.raises(backup.BackupError, match="brakuje tabel"):
        backup.import_data(conn, payload)


def test_import_rejects_non_dict_payload(conn):
    with pytest.raises(backup.BackupError):
        backup.import_data(conn, ["nie", "obiekt"])


def test_failed_import_rolls_back_and_leaves_database_untouched(conn):
    _populate(conn)
    payload = backup.export_data(conn)
    before = _snapshot(conn)

    # Wiersz z nieistniejącą kolumną wysypie INSERT w połowie importu -
    # tabele skasowane wcześniej muszą wrócić przez rollback.
    payload["tables"]["tasks"][0]["kolumna_ktorej_nie_ma"] = 1

    with pytest.raises(backup.BackupError):
        backup.import_data(conn, payload)

    assert _snapshot(conn) == before


def test_failed_import_on_constraint_violation_rolls_back(conn):
    _populate(conn)
    payload = backup.export_data(conn)
    before = _snapshot(conn)

    # box = 99 łamie CHECK (box BETWEEN 1 AND 5).
    payload["tables"]["flashcards"][0]["box"] = 99

    with pytest.raises(backup.BackupError):
        backup.import_data(conn, payload)

    assert _snapshot(conn) == before


def test_backup_database_writes_readable_snapshot(conn, tmp_path):
    _populate(conn)
    target = tmp_path / "snapshot.db"

    result = backup.backup_database(conn, target)

    assert result == target
    assert target.exists()
    copy = sqlite3.connect(target)
    copy.row_factory = sqlite3.Row
    try:
        assert copy.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 1
        assert (
            copy.execute("PRAGMA user_version").fetchone()[0]
            == (conn.execute("PRAGMA user_version").fetchone()[0])
        )
    finally:
        copy.close()


def test_backup_path_is_a_sibling_of_the_database():
    path = backup.backup_path_for("/tmp/data/roadmap.db", now="2026-03-15 08:30:00")

    assert path.name == "roadmap.db.bak-2026-03-15-083000"
    assert str(path.parent) == "/tmp/data"
