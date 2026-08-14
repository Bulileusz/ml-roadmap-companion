import sqlite3

from services import clock


def list_by_question(conn: sqlite3.Connection, question_id: int) -> list[sqlite3.Row]:
    # id DESC jako tiebreak dla podejść zapisanych w tej samej sekundzie.
    return conn.execute(
        "SELECT * FROM question_attempts WHERE question_id = ? "
        "ORDER BY attempted_at DESC, id DESC",
        (question_id,),
    ).fetchall()


def stats_by_phase(
    conn: sqlite3.Connection, phase_id: int
) -> dict[int, tuple[int, int]]:
    """question_id -> (samodzielne, wszystkie) dla całej fazy jednym zapytaniem.

    Strona pytań pokazuje pasek samodzielności przy każdym pytaniu. Liczenie go
    per pytanie dałoby kilkanaście zapytań na jedno wejście na stronę - a przez
    HTTP także kilkanaście round-tripów, co jest już widoczne w interfejsie.
    """
    rows = conn.execute(
        "SELECT questions.id AS question_id, "
        "       COUNT(question_attempts.id) AS total, "
        "       COALESCE(SUM(question_attempts.solved_independently), 0) "
        "           AS independent "
        "FROM questions "
        "LEFT JOIN question_attempts "
        "       ON question_attempts.question_id = questions.id "
        "WHERE questions.phase_id = ? "
        "GROUP BY questions.id",
        (phase_id,),
    ).fetchall()
    return {row["question_id"]: (row["independent"], row["total"]) for row in rows}


def count_overall(conn: sqlite3.Connection) -> tuple[int, int]:
    row = conn.execute(
        "SELECT COUNT(*) AS total, "
        "COALESCE(SUM(solved_independently), 0) AS independent "
        "FROM question_attempts"
    ).fetchone()
    return row["independent"], row["total"]


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
