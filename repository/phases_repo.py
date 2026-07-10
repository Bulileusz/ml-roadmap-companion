import sqlite3


def list_phases(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM phases ORDER BY order_index").fetchall()


def get_phase(conn: sqlite3.Connection, phase_id: int) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM phases WHERE id = ?", (phase_id,)
    ).fetchone()
