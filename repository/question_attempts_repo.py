import sqlite3


def list_by_question(conn: sqlite3.Connection, question_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM question_attempts WHERE question_id = ? "
        "ORDER BY attempted_at DESC",
        (question_id,),
    ).fetchall()


def create_attempt(
    conn: sqlite3.Connection, question_id: int, solved_independently: bool
) -> None:
    conn.execute(
        "INSERT INTO question_attempts (question_id, solved_independently) "
        "VALUES (?, ?)",
        (question_id, int(solved_independently)),
    )
    conn.commit()
