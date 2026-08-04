import sqlite3
from datetime import date

from repository import flashcards_repo, question_attempts_repo, tasks_repo
from services import clock, progress
from services.spaced_repetition import MAX_BOX, MIN_BOX


def get_dashboard_data(conn: sqlite3.Connection, today: date | None = None) -> dict:
    cutoff = (today or clock.today()).isoformat()

    independent, attempts_total = question_attempts_repo.count_overall(conn)

    counts = flashcards_repo.count_by_box(conn)
    boxes = {box: counts.get(box, 0) for box in range(MIN_BOX, MAX_BOX + 1)}

    return {
        "roadmap": progress.get_overall_progress(conn),
        "due_count": flashcards_repo.count_due(conn, cutoff),
        "independence": {
            "independent": independent,
            "total": attempts_total,
            "pct": progress.phase_progress_pct(independent, attempts_total),
        },
        "boxes": boxes,
        "cards_total": sum(boxes.values()),
        "next_task": tasks_repo.first_incomplete(conn),
    }
