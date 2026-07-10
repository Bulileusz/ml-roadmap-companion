import sqlite3


def list_all(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM flashcards ORDER BY created_at DESC"
    ).fetchall()


def list_due_today(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM flashcards WHERE next_review_at <= date('now') "
        "ORDER BY next_review_at"
    ).fetchall()


def get(conn: sqlite3.Connection, card_id: int) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM flashcards WHERE id = ?", (card_id,)
    ).fetchone()


def create(
    conn: sqlite3.Connection, front: str, back: str, phase_id: int | None
) -> int:
    cursor = conn.execute(
        "INSERT INTO flashcards (phase_id, front, back) VALUES (?, ?, ?)",
        (phase_id, front, back),
    )
    conn.commit()
    return cursor.lastrowid


def update_content(
    conn: sqlite3.Connection, card_id: int, front: str, back: str
) -> None:
    conn.execute(
        "UPDATE flashcards SET front = ?, back = ?, updated_at = datetime('now') "
        "WHERE id = ?",
        (front, back, card_id),
    )
    conn.commit()


def update_schedule(
    conn: sqlite3.Connection, card_id: int, box: int, next_review_at: str
) -> None:
    conn.execute(
        "UPDATE flashcards SET box = ?, next_review_at = ?, "
        "updated_at = datetime('now') WHERE id = ?",
        (box, next_review_at, card_id),
    )
    conn.commit()


def delete(conn: sqlite3.Connection, card_id: int) -> None:
    conn.execute("DELETE FROM flashcards WHERE id = ?", (card_id,))
    conn.commit()
