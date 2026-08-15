import json
import sqlite3
from datetime import date
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
    "resources",
    "activity_log",
    # Bez ewidencji importów w kopii odtworzenie backupu zgubiłoby wiedzę
    # o tym, co już wjechało z content/, i przy najbliższym starcie
    # zaimportowałoby wszystko drugi raz - obok wierszy z backupu.
    "content_imports",
    "day_notes",
]

# Tabele, bez których plik jest niekompletny. Nie to samo co TABLES: day_notes
# doszło już po wydaniu formatu 1, więc eksport zrobiony wcześniej po prostu nie
# ma takiej sekcji. Odrzucanie go byłoby karą za to, że kopia jest starsza niż
# apka - a to dokładnie ta sytuacja, w której kopii się używa.
REQUIRED_TABLES = [
    "phases",
    "tasks",
    "flashcards",
    "questions",
    "question_attempts",
    "resources",
    "activity_log",
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
    missing = [table for table in REQUIRED_TABLES if table not in tables]
    if missing:
        raise BackupError(f"W pliku brakuje tabel: {', '.join(missing)}.")


def problem_with(conn: sqlite3.Connection, payload: dict) -> str | None:
    """Powód, dla którego pliku nie da się wczytać - albo None, gdy da się.

    Podgląd przed nadpisaniem potrzebuje tej samej walidacji co import, tylko
    bez wyjątku: użytkownik ma zobaczyć problem *zamiast* przycisku „nadpisz",
    a nie po jego kliknięciu.
    """
    try:
        _validate(conn, payload)
    except BackupError as exc:
        return str(exc)
    return None


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
            # .get, nie [table]: sekcji dopisanych po formacie 1 może w pliku
            # nie być - wtedy tabela zostaje pusta, tak jak przed ich istnieniem.
            rows = tables.get(table, [])
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


def database_path(conn: sqlite3.Connection) -> Path | None:
    """Plik, na którym siedzi to połączenie. None dla bazy w pamięci.

    Pytamy połączenie, a nie stałą DB_PATH z modułu. Wersja ze stałą działała
    w produkcji, ale kopię bezpieczeństwa przed importem kładła zawsze obok
    prawdziwej bazy - także wtedy, gdy request szedł na całkiem inną (w testach
    obok data/roadmap.db pojawiały się śmieciowe .bak-*). Kopia ma leżeć obok
    tej bazy, którą faktycznie nadpisujemy.
    """
    for _, name, file in conn.execute("PRAGMA database_list").fetchall():
        if name == "main":
            return Path(file) if file else None
    return None


# Ile dziennych migawek trzymamy. Historia nauki istnieje w jednej kopii -
# data/roadmap.db nie jest w gicie i ginie razem z dyskiem. Ręczny eksport na
# stronie Dane wymaga pamiętania o nim, więc jest tu jeszcze jeden, automatyczny
# przy starcie. Dwa tygodnie wstecz wystarczy, żeby zauważyć, że coś się zepsuło.
SNAPSHOTS_KEPT = 14


def write_daily_snapshot(
    conn: sqlite3.Connection,
    directory: str | Path,
    today: date | None = None,
    keep: int = SNAPSHOTS_KEPT,
) -> Path | None:
    """Jedna migawka JSON na dzień. Zwraca ścieżkę albo None, gdy już istnieje.

    JSON, nie kopia pliku bazy: migawka ma być czytelna i wczytywalna przez ten
    sam import, którego używa strona Dane, także na innej maszynie i po zmianie
    schematu. Rozmiar całej bazy to tu kilkaset kilobajtów, więc dzienna kopia
    pełnej treści jest tańsza niż zastanawianie się nad przyrostową.
    """
    target_dir = Path(directory)
    stamp = (today or clock.today()).isoformat()
    target = target_dir / f"roadmap-snapshot-{stamp}.json"
    if target.exists():
        return None

    target_dir.mkdir(parents=True, exist_ok=True)
    target.write_text(export_json(conn), encoding="utf-8")

    # Nazwy plików są sortowalne po dacie, więc wystarczy sortowanie leksykalne.
    snapshots = sorted(target_dir.glob("roadmap-snapshot-*.json"))
    for stale in snapshots[:-keep]:
        stale.unlink()
    return target
