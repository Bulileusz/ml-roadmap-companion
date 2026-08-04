import sqlite3

from services import clock


def list_by_phase(conn: sqlite3.Connection, phase_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM tasks WHERE phase_id = ? ORDER BY order_index, id",
        (phase_id,),
    ).fetchall()


def create(conn: sqlite3.Connection, phase_id: int, title: str) -> int:
    # Pojedynczy INSERT...SELECT zamiast SELECT MAX + INSERT: atomowe
    # wyznaczenie order_index na współdzielonym połączeniu.
    now = clock.now_iso()
    cursor = conn.execute(
        "INSERT INTO tasks (phase_id, title, order_index, created_at, updated_at) "
        "SELECT ?, ?, COALESCE(MAX(order_index), -1) + 1, ?, ? "
        "FROM tasks WHERE phase_id = ?",
        (phase_id, title, now, now, phase_id),
    )
    conn.commit()
    return cursor.lastrowid


def update_title(conn: sqlite3.Connection, task_id: int, title: str) -> None:
    conn.execute(
        "UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?",
        (title, clock.now_iso(), task_id),
    )
    conn.commit()


def update_notes(conn: sqlite3.Connection, task_id: int, notes: str) -> None:
    conn.execute(
        "UPDATE tasks SET notes = ?, updated_at = ? WHERE id = ?",
        (notes, clock.now_iso(), task_id),
    )
    conn.commit()


def set_done(conn: sqlite3.Connection, task_id: int, is_done: bool) -> None:
    conn.execute(
        "UPDATE tasks SET is_done = ?, updated_at = ? WHERE id = ?",
        (int(is_done), clock.now_iso(), task_id),
    )
    conn.commit()


def delete(conn: sqlite3.Connection, task_id: int) -> None:
    conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()


def first_incomplete(conn: sqlite3.Connection) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT tasks.*, phases.name AS phase_name "
        "FROM tasks JOIN phases ON phases.id = tasks.phase_id "
        "WHERE tasks.is_done = 0 "
        "ORDER BY phases.order_index, tasks.order_index, tasks.id LIMIT 1"
    ).fetchone()


def count_progress(conn: sqlite3.Connection, phase_id: int) -> tuple[int, int]:
    row = conn.execute(
        "SELECT COUNT(*) AS total, COALESCE(SUM(is_done), 0) AS done "
        "FROM tasks WHERE phase_id = ?",
        (phase_id,),
    ).fetchone()
    return row["done"], row["total"]


def count_progress_overall(conn: sqlite3.Connection) -> tuple[int, int]:
    row = conn.execute(
        "SELECT COUNT(*) AS total, COALESCE(SUM(is_done), 0) AS done FROM tasks"
    ).fetchone()
    return row["done"], row["total"]
