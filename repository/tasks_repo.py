import sqlite3


def list_tasks_by_phase(conn: sqlite3.Connection, phase_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM tasks WHERE phase_id = ? ORDER BY order_index, id",
        (phase_id,),
    ).fetchall()


def get_task(conn: sqlite3.Connection, task_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()


def create_task(conn: sqlite3.Connection, phase_id: int, title: str) -> int:
    max_order = conn.execute(
        "SELECT COALESCE(MAX(order_index), -1) FROM tasks WHERE phase_id = ?",
        (phase_id,),
    ).fetchone()[0]
    cursor = conn.execute(
        "INSERT INTO tasks (phase_id, title, order_index) VALUES (?, ?, ?)",
        (phase_id, title, max_order + 1),
    )
    conn.commit()
    return cursor.lastrowid


def update_task_title(conn: sqlite3.Connection, task_id: int, title: str) -> None:
    conn.execute(
        "UPDATE tasks SET title = ?, updated_at = datetime('now') WHERE id = ?",
        (title, task_id),
    )
    conn.commit()


def update_task_notes(conn: sqlite3.Connection, task_id: int, notes: str) -> None:
    conn.execute(
        "UPDATE tasks SET notes = ?, updated_at = datetime('now') WHERE id = ?",
        (notes, task_id),
    )
    conn.commit()


def set_task_done(conn: sqlite3.Connection, task_id: int, is_done: bool) -> None:
    conn.execute(
        "UPDATE tasks SET is_done = ?, updated_at = datetime('now') WHERE id = ?",
        (int(is_done), task_id),
    )
    conn.commit()


def delete_task(conn: sqlite3.Connection, task_id: int) -> None:
    conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()


def count_progress(conn: sqlite3.Connection, phase_id: int) -> tuple[int, int]:
    row = conn.execute(
        "SELECT COUNT(*) AS total, COALESCE(SUM(is_done), 0) AS done "
        "FROM tasks WHERE phase_id = ?",
        (phase_id,),
    ).fetchone()
    return row["done"], row["total"]
