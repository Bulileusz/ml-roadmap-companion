import sqlite3

from services import clock

# Rodzaje zdarzeń dziennika - muszą zgadzać się z CHECK-iem w db/schema.py.
KIND_TASK_DONE = "task_done"
KIND_TASK_UNDONE = "task_undone"
KIND_CARD_REVIEW = "card_review"
KIND_QUESTION_ATTEMPT = "question_attempt"


def log(
    conn: sqlite3.Connection, kind: str, ref_id: int | None, detail: str = ""
) -> int:
    cursor = conn.execute(
        "INSERT INTO activity_log (occurred_at, kind, ref_id, detail) "
        "VALUES (?, ?, ?, ?)",
        (clock.now_iso(), kind, ref_id, detail),
    )
    conn.commit()
    return cursor.lastrowid


def list_recent(conn: sqlite3.Connection, limit: int = 100) -> list[sqlite3.Row]:
    # id DESC jako tiebreak dla zdarzeń zapisanych w tej samej sekundzie.
    return conn.execute(
        "SELECT * FROM activity_log ORDER BY occurred_at DESC, id DESC LIMIT ?",
        (limit,),
    ).fetchall()


def list_active_dates(conn: sqlite3.Connection) -> list[str]:
    """Dni z jakąkolwiek aktywnością, format 'RRRR-MM-DD', od najnowszego."""
    rows = conn.execute(
        "SELECT DISTINCT DATE(occurred_at) AS day FROM activity_log ORDER BY day DESC"
    ).fetchall()
    return [row["day"] for row in rows]


def count_all(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0]
