import sqlite3

from services import clock


def list_by_phase(conn: sqlite3.Connection, phase_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM questions WHERE phase_id = ? ORDER BY created_at, id",
        (phase_id,),
    ).fetchall()


def create(
    conn: sqlite3.Connection, phase_id: int, question_text: str, question_type: str
) -> int:
    cursor = conn.execute(
        "INSERT INTO questions (phase_id, question_text, question_type, created_at) "
        "VALUES (?, ?, ?, ?)",
        (phase_id, question_text, question_type, clock.now_iso()),
    )
    conn.commit()
    return cursor.lastrowid


def delete(conn: sqlite3.Connection, question_id: int) -> None:
    conn.execute("DELETE FROM questions WHERE id = ?", (question_id,))
    conn.commit()
