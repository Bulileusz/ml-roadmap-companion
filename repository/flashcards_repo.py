import sqlite3

from services import clock


def list_all(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM flashcards ORDER BY created_at DESC, id DESC"
    ).fetchall()


def list_due(conn: sqlite3.Connection, on_or_before: str) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM flashcards WHERE next_review_at <= ? "
        "ORDER BY next_review_at, id",
        (on_or_before,),
    ).fetchall()


def count_due(conn: sqlite3.Connection, on_or_before: str) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM flashcards WHERE next_review_at <= ?",
        (on_or_before,),
    ).fetchone()[0]


def count_by_box(conn: sqlite3.Connection) -> dict[int, int]:
    rows = conn.execute(
        "SELECT box, COUNT(*) AS cnt FROM flashcards GROUP BY box"
    ).fetchall()
    return {row["box"]: row["cnt"] for row in rows}


def get(conn: sqlite3.Connection, card_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM flashcards WHERE id = ?", (card_id,)).fetchone()


def create(
    conn: sqlite3.Connection,
    front: str,
    back: str,
    phase_id: int | None,
    next_review_at: str,
) -> int:
    now = clock.now_iso()
    cursor = conn.execute(
        "INSERT INTO flashcards "
        "(phase_id, front, back, next_review_at, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (phase_id, front, back, next_review_at, now, now),
    )
    conn.commit()
    return cursor.lastrowid


def update_content(
    conn: sqlite3.Connection, card_id: int, front: str, back: str
) -> None:
    conn.execute(
        "UPDATE flashcards SET front = ?, back = ?, updated_at = ? WHERE id = ?",
        (front, back, clock.now_iso(), card_id),
    )
    conn.commit()


def update_schedule(
    conn: sqlite3.Connection, card_id: int, box: int, next_review_at: str
) -> None:
    conn.execute(
        "UPDATE flashcards SET box = ?, next_review_at = ?, updated_at = ? "
        "WHERE id = ?",
        (box, next_review_at, clock.now_iso(), card_id),
    )
    conn.commit()


def delete(conn: sqlite3.Connection, card_id: int) -> None:
    conn.execute("DELETE FROM flashcards WHERE id = ?", (card_id,))
    conn.commit()
