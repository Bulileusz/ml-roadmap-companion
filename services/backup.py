import json
import sqlite3
from pathlib import Path

from services import clock

# Kolejność ma znaczenie przy imporcie: rodzice przed dziećmi przy wstawianiu,
# odwrotnie przy czyszczeniu. Trzymamy jedną listę, żeby dodanie tabeli w
# przyszłości było jedną zmianą, a nie dwiema rozjeżdżającymi się.
TABLES = [
    "phases",
    "tasks",
    "flashcards",
    "questions",
    "question_attempts",
    "activity_log",
    # Bez ewidencji importów w kopii odtworzenie backupu zgubiłoby wiedzę
    # o tym, co już wjechało z content/, i przy najbliższym starcie
    # zaimportowałoby wszystko drugi raz - obok wierszy z backupu.
    "content_imports",
]

FORMAT_VERSION = 1


class BackupError(Exception):
    """Import odrzucony - baza pozostaje nietknięta."""


def _schema_version(conn: sqlite3.Connection) -> int:
    return conn.execute("PRAGMA user_version").fetchone()[0]


def export_data(conn: sqlite3.Connection) -> dict:
    return {
        "format_version": FORMAT_VERSION,
        "schema_version": _schema_version(conn),
        "exported_at": clock.now_iso(),
        "tables": {
            table: [dict(row) for row in conn.execute(f"SELECT * FROM {table}")]
            for table in TABLES
        },
    }


def export_json(conn: sqlite3.Connection) -> str:
    # ensure_ascii=False, bo dane są po polsku - plik ma być czytelny
    # w edytorze, nie ciągiem \uXXXX.
    return json.dumps(export_data(conn), ensure_ascii=False, indent=2)


def export_filename(today=None) -> str:
    return f"roadmap-export-{(today or clock.today()).isoformat()}.json"


def summarize(payload: dict) -> dict[str, int]:
    """Ile czego jest w pliku - do pokazania użytkownikowi PRZED nadpisaniem."""
    tables = payload.get("tables", {})
    return {table: len(tables.get(table, [])) for table in TABLES}


def _validate(conn: sqlite3.Connection, payload: dict) -> None:
    if not isinstance(payload, dict):
        raise BackupError("Plik nie zawiera obiektu JSON.")

    if payload.get("format_version") != FORMAT_VERSION:
        raise BackupError(
            f"Nieobsługiwany format pliku "
            f"(oczekiwano {FORMAT_VERSION}, jest {payload.get('format_version')!r})."
        )

    file_schema = payload.get("schema_version")
    if not isinstance(file_schema, int):
        raise BackupError("Brak poprawnego schema_version w pliku.")
    if file_schema > _schema_version(conn):
        # Plik z nowszej wersji apki może zawierać kolumny, których ta baza
        # nie zna - lepiej odmówić niż po cichu zgubić dane.
        raise BackupError(
            f"Plik pochodzi z nowszej wersji bazy (schema {file_schema} > "
            f"{_schema_version(conn)}). Zaktualizuj aplikację i spróbuj ponownie."
        )

    tables = payload.get("tables")
    if not isinstance(tables, dict):
        raise BackupError("Brak sekcji 'tables' w pliku.")
    missing = [table for table in TABLES if table not in tables]
    if missing:
        raise BackupError(f"W pliku brakuje tabel: {', '.join(missing)}.")


def import_data(conn: sqlite3.Connection, payload: dict) -> dict[str, int]:
    """Zastępuje całą zawartość bazy danymi z pliku. Zwraca liczby wierszy.

    Wszystko w jednej transakcji: błąd w połowie oznacza pełny rollback,
    więc nieudany import nigdy nie zostawia bazy w stanie pośrednim.
    """
    _validate(conn, payload)
    tables = payload["tables"]

    try:
        # Bez jawnego BEGIN: sqlite3 otwiera transakcję niejawnie przy
        # pierwszym DELETE i trzyma ją do commit(), a jawne BEGIN wysypałoby
        # się, gdyby transakcja już była otwarta.
        # Czyszczenie od dzieci do rodziców - kolejność odwrotna niż wstawianie.
        for table in reversed(TABLES):
            conn.execute(f"DELETE FROM {table}")

        for table in TABLES:
            rows = tables[table]
            if not rows:
                continue
            # id zachowujemy celowo: bez tego rozjechałyby się wszystkie
            # relacje (tasks.phase_id, question_attempts.question_id, ...).
            columns = list(rows[0].keys())
            placeholders = ", ".join("?" for _ in columns)
            statement = (
                f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
            )
            conn.executemany(
                statement, [tuple(row[column] for column in columns) for row in rows]
            )
        conn.commit()
    except Exception as exc:
        conn.rollback()
        raise BackupError(f"Import nie powiódł się: {exc}") from exc

    return summarize(payload)


def backup_database(conn: sqlite3.Connection, target_path: str | Path) -> Path:
    """Kopia zapasowa przez sqlite3 backup API, nie kopiowanie pliku.

    Baza chodzi w trybie WAL, więc surowa kopia samego `roadmap.db` bez
    sidecarów `-wal`/`-shm` potrafi być niespójna. Backup API zdejmuje
    spójny snapshot do jednego pliku.
    """
    target = Path(target_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    destination = sqlite3.connect(target)
    try:
        conn.backup(destination)
    finally:
        destination.close()
    return target


def backup_path_for(db_path: str | Path, now: str | None = None) -> Path:
    """Ścieżka kopii obok pliku bazy: roadmap.db.bak-RRRR-MM-DD-HHMMSS."""
    stamp = (now or clock.now_iso()).replace(" ", "-").replace(":", "")
    return Path(db_path).with_name(f"{Path(db_path).name}.bak-{stamp}")
