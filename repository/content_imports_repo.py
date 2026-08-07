import sqlite3

from services import clock

# Rodzaje pozycji w ewidencji. Od migracji 5 schemat nie ma na nie CHECK-a,
# bo lista rośnie z każdym modułem - jej miejsce jest tutaj, przy kodzie,
# który jej używa.
KIND_FLASHCARD = "flashcard"
KIND_QUESTION = "question"
KIND_RESOURCE = "resource"
KINDS = (KIND_FLASHCARD, KIND_QUESTION, KIND_RESOURCE)


def imported_keys(conn: sqlite3.Connection, kind: str) -> set[str]:
    rows = conn.execute(
        "SELECT item_key FROM content_imports WHERE kind = ?", (kind,)
    ).fetchall()
    return {row["item_key"] for row in rows}


def mark_imported(conn: sqlite3.Connection, kind: str, item_key: str) -> None:
    # INSERT OR IGNORE: powtórzony klucz w obrębie jednego przebiegu importu
    # (ta sama fiszka w dwóch plikach) nie może wywalić całej synchronizacji.
    conn.execute(
        "INSERT OR IGNORE INTO content_imports (kind, item_key, created_at) "
        "VALUES (?, ?, ?)",
        (kind, item_key, clock.now_iso()),
    )
    conn.commit()


def count_by_kind(conn: sqlite3.Connection) -> dict[str, int]:
    rows = conn.execute(
        "SELECT kind, COUNT(*) AS cnt FROM content_imports GROUP BY kind"
    ).fetchall()
    return {row["kind"]: row["cnt"] for row in rows}
