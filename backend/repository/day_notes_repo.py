import sqlite3

from services import clock


def list_since(conn: sqlite3.Connection, since: str) -> dict[str, str]:
    """Notatki od dnia `since` (RRRR-MM-DD) jako dzień -> treść.

    Słownik, nie lista wierszy: dziennik i tak zestawia notatki z dniami
    wyliczonymi z activity_log, więc potrzebuje wyszukiwania po dacie, a nie
    kolejności.
    """
    rows = conn.execute(
        "SELECT day, note FROM day_notes WHERE day >= ?", (since,)
    ).fetchall()
    return {row["day"]: row["note"] for row in rows}


def get(conn: sqlite3.Connection, day: str) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM day_notes WHERE day = ?", (day,)).fetchone()


def upsert(conn: sqlite3.Connection, day: str, note: str) -> None:
    """Zapisuje notatkę dnia, nadpisując poprzednią.

    ON CONFLICT zamiast "sprawdź i wybierz INSERT albo UPDATE": zapis notatki
    idzie z jednego pola tekstowego, więc odróżnianie pierwszego zapisu od
    poprawki nie ma tu żadnego znaczenia poza created_at.
    """
    now = clock.now_iso()
    conn.execute(
        "INSERT INTO day_notes (day, note, created_at, updated_at) "
        "VALUES (?, ?, ?, ?) "
        "ON CONFLICT(day) DO UPDATE SET note = excluded.note, "
        "updated_at = excluded.updated_at",
        (day, note, now, now),
    )
    conn.commit()


def delete(conn: sqlite3.Connection, day: str) -> None:
    conn.execute("DELETE FROM day_notes WHERE day = ?", (day,))
    conn.commit()
