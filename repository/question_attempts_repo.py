import sqlite3

from services import clock


def list_by_question(conn: sqlite3.Connection, question_id: int) -> list[sqlite3.Row]:
    # id DESC jako tiebreak dla podejść zapisanych w tej samej sekundzie.
    return conn.execute(
        "SELECT * FROM question_attempts WHERE question_id = ? "
        "ORDER BY attempted_at DESC, id DESC",
        (question_id,),
    ).fetchall()


def create(
    conn: sqlite3.Connection, question_id: int, solved_independently: bool
) -> int:
    cursor = conn.execute(
        "INSERT INTO question_attempts "
        "(question_id, solved_independently, attempted_at) VALUES (?, ?, ?)",
        (question_id, int(solved_independently), clock.now_iso()),
    )
    conn.commit()
    return cursor.lastrowid
