import sqlite3

from services import clock

STATUS_TODO = "todo"
STATUS_IN_PROGRESS = "in_progress"
STATUS_DONE = "done"
STATUSES = (STATUS_TODO, STATUS_IN_PROGRESS, STATUS_DONE)

# Rodzaje materiału. Bez CHECK w schemacie - lista rośnie szybciej niż
# migracje, a wpisanie nieznanego rodzaju ma degradować UI do ikony
# domyślnej, a nie wywalać zapis.
KINDS = ("book", "course", "video", "docs", "article", "other")
DEFAULT_KIND = "other"


def list_by_phase(conn: sqlite3.Connection, phase_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM resources WHERE phase_id = ? ORDER BY order_index, id",
        (phase_id,),
    ).fetchall()


def get(conn: sqlite3.Connection, resource_id: int) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM resources WHERE id = ?", (resource_id,)
    ).fetchone()


def create(
    conn: sqlite3.Connection,
    phase_id: int | None,
    title: str,
    url: str = "",
    kind: str = DEFAULT_KIND,
    detail: str = "",
) -> int:
    # INSERT...SELECT zamiast SELECT MAX + INSERT, tak jak w tasks_repo:
    # atomowe wyznaczenie order_index na współdzielonym połączeniu.
    now = clock.now_iso()
    cursor = conn.execute(
        "INSERT INTO resources "
        "(phase_id, title, url, kind, detail, order_index, created_at, updated_at) "
        "SELECT ?, ?, ?, ?, ?, COALESCE(MAX(order_index), -1) + 1, ?, ? "
        "FROM resources WHERE phase_id IS ?",
        (phase_id, title, url, kind, detail, now, now, phase_id),
    )
    conn.commit()
    return cursor.lastrowid


def update_status(conn: sqlite3.Connection, resource_id: int, status: str) -> None:
    conn.execute(
        "UPDATE resources SET status = ?, updated_at = ? WHERE id = ?",
        (status, clock.now_iso(), resource_id),
    )
    conn.commit()


def update_fields(
    conn: sqlite3.Connection, resource_id: int, title: str, url: str, detail: str
) -> None:
    conn.execute(
        "UPDATE resources SET title = ?, url = ?, detail = ?, updated_at = ? "
        "WHERE id = ?",
        (title, url, detail, clock.now_iso(), resource_id),
    )
    conn.commit()


def update_phase(
    conn: sqlite3.Connection, resource_id: int, phase_id: int | None
) -> None:
    conn.execute(
        "UPDATE resources SET phase_id = ?, updated_at = ? WHERE id = ?",
        (phase_id, clock.now_iso(), resource_id),
    )
    conn.commit()


def delete(conn: sqlite3.Connection, resource_id: int) -> None:
    conn.execute("DELETE FROM resources WHERE id = ?", (resource_id,))
    conn.commit()


def count_by_status(conn: sqlite3.Connection) -> dict[str, int]:
    rows = conn.execute(
        "SELECT status, COUNT(*) AS cnt FROM resources GROUP BY status"
    ).fetchall()
    return {row["status"]: row["cnt"] for row in rows}
