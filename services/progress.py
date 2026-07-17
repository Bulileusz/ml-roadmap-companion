import sqlite3

from repository import phases_repo, tasks_repo


def phase_progress_pct(done: int, total: int) -> float:
    if total == 0:
        return 0.0
    return done / total * 100


def get_all_phase_progress(conn: sqlite3.Connection) -> list[dict]:
    result = []
    for phase in phases_repo.list_all(conn):
        done, total = tasks_repo.count_progress(conn, phase["id"])
        result.append(
            {
                "phase": phase,
                "done": done,
                "total": total,
                "pct": phase_progress_pct(done, total),
            }
        )
    return result


def get_overall_progress(conn: sqlite3.Connection) -> dict:
    done, total = tasks_repo.count_progress_overall(conn)
    return {"done": done, "total": total, "pct": phase_progress_pct(done, total)}
