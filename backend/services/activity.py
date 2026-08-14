import sqlite3
from datetime import date

from repository import (
    activity_repo,
    question_attempts_repo,
    resources_repo,
    tasks_repo,
)
from services import clock, streak

# Jedyny punkt zapisu do dziennika po stronie tasków i pytań. UI woła te
# funkcje zamiast repozytoriów wprost, więc kolejność "zmień stan + zaloguj"
# jest w jednym miejscu, a warstwy zostają w ryzach (ui -> services -> repository).
# Powtórki fiszek logują się wewnątrz spaced_repetition.record_review - to już
# jest service, nie potrzebuje tu opakowania.


def record_task_toggle(
    conn: sqlite3.Connection, task: sqlite3.Row, is_done: bool
) -> None:
    tasks_repo.set_done(conn, task["id"], is_done)
    kind = activity_repo.KIND_TASK_DONE if is_done else activity_repo.KIND_TASK_UNDONE
    activity_repo.log(conn, kind, task["id"], task["title"])


def record_question_attempt(
    conn: sqlite3.Connection, question: sqlite3.Row, solved_independently: bool
) -> None:
    question_attempts_repo.create(conn, question["id"], solved_independently)
    activity_repo.log(
        conn,
        activity_repo.KIND_QUESTION_ATTEMPT,
        question["id"],
        question["question_text"],
    )


def record_resource_status(
    conn: sqlite3.Connection, resource: sqlite3.Row, status: str
) -> None:
    """Zmiana statusu materiału; do dziennika trafia tylko przejście na "przerobione".

    "Zacząłem czytać" i "przestawiłem z powrotem na do zrobienia" to nie
    wydarzenia dnia nauki - zaśmiecałyby dziennik i sztucznie podbijały serię.
    Domknięcie materiału jest realnym osiągnięciem i dlatego jest logowane.
    """
    resources_repo.update_status(conn, resource["id"], status)
    if (
        status == resources_repo.STATUS_DONE
        and resource["status"] != resources_repo.STATUS_DONE
    ):
        activity_repo.log(
            conn,
            activity_repo.KIND_RESOURCE_DONE,
            resource["id"],
            resource["title"],
        )


def get_streak(conn: sqlite3.Connection, today: date | None = None) -> dict:
    active_dates = activity_repo.list_active_dates(conn)
    reference = today or clock.today()
    return {
        "current": streak.current_streak(active_dates, reference),
        "longest": streak.longest_streak(active_dates),
        "active_days": len(active_dates),
    }
