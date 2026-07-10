import sqlite3


def list_by_phase(conn: sqlite3.Connection, phase_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM questions WHERE phase_id = ? ORDER BY created_at",
        (phase_id,),
    ).fetchall()


def get(conn: sqlite3.Connection, question_id: int) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM questions WHERE id = ?", (question_id,)
    ).fetchone()


def create(
    conn: sqlite3.Connection, phase_id: int, question_text: str, question_type: str
) -> int:
    cursor = conn.execute(
        "INSERT INTO questions (phase_id, question_text, question_type) "
        "VALUES (?, ?, ?)",
        (phase_id, question_text, question_type),
    )
    conn.commit()
    return cursor.lastrowid


def update_text(
    conn: sqlite3.Connection,
    question_id: int,
    question_text: str,
    question_type: str,
) -> None:
    conn.execute(
        "UPDATE questions SET question_text = ?, question_type = ? WHERE id = ?",
        (question_text, question_type, question_id),
    )
    conn.commit()


def delete(conn: sqlite3.Connection, question_id: int) -> None:
    conn.execute("DELETE FROM questions WHERE id = ?", (question_id,))
    conn.commit()
