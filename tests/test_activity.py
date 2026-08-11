from datetime import date

from repository import activity_repo, question_attempts_repo, questions_repo, tasks_repo
from services import activity, spaced_repetition


def _make_phase(conn):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.commit()
    return cursor.lastrowid


def test_log_and_list_recent(conn):
    activity_repo.log(conn, activity_repo.KIND_TASK_DONE, 1, "Pierwsze")
    second = activity_repo.log(conn, activity_repo.KIND_CARD_REVIEW, 2, "Drugie")

    entries = activity_repo.list_recent(conn)
    # Zapis w tej samej sekundzie - rozstrzyga id DESC, więc najnowszy pierwszy.
    assert entries[0]["id"] == second
    assert entries[0]["kind"] == activity_repo.KIND_CARD_REVIEW
    assert entries[0]["detail"] == "Drugie"
    assert len(entries) == 2


def test_list_recent_respects_limit(conn):
    for index in range(5):
        activity_repo.log(conn, activity_repo.KIND_TASK_DONE, index, f"Task {index}")

    assert len(activity_repo.list_recent(conn, limit=3)) == 3


def test_list_active_dates_is_distinct_and_descending(conn):
    conn.execute(
        "INSERT INTO activity_log (occurred_at, kind, ref_id, detail) VALUES "
        "('2026-03-10 08:00:00', 'task_done', 1, ''), "
        "('2026-03-10 20:00:00', 'card_review', 2, ''), "
        "('2026-03-12 09:00:00', 'task_done', 3, '')"
    )
    conn.commit()

    assert activity_repo.list_active_dates(conn) == ["2026-03-12", "2026-03-10"]


def test_record_task_toggle_writes_state_and_log(conn):
    phase_id = _make_phase(conn)
    task_id = tasks_repo.create(conn, phase_id, "Nauczyć się broadcastingu")
    task = tasks_repo.list_by_phase(conn, phase_id)[0]

    activity.record_task_toggle(conn, task, True)

    assert tasks_repo.count_progress(conn, phase_id) == (1, 1)
    entry = activity_repo.list_recent(conn)[0]
    assert entry["kind"] == activity_repo.KIND_TASK_DONE
    assert entry["ref_id"] == task_id
    assert entry["detail"] == "Nauczyć się broadcastingu"

    activity.record_task_toggle(conn, task, False)

    assert tasks_repo.count_progress(conn, phase_id) == (0, 1)
    assert activity_repo.list_recent(conn)[0]["kind"] == activity_repo.KIND_TASK_UNDONE


def test_record_question_attempt_writes_attempt_and_log(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Czym jest bias?", "concept")
    question = questions_repo.list_by_phase(conn, phase_id)[0]

    activity.record_question_attempt(conn, question, True)

    assert question_attempts_repo.count_overall(conn) == (1, 1)
    entry = activity_repo.list_recent(conn)[0]
    assert entry["kind"] == activity_repo.KIND_QUESTION_ATTEMPT
    assert entry["ref_id"] == question_id
    assert entry["detail"] == "Czym jest bias?"


def test_card_review_is_logged(conn):
    card_id = spaced_repetition.create_card(
        conn, "Gradient", "Wektor pochodnych", None, today=date(2026, 3, 15)
    )

    spaced_repetition.record_review(
        conn, card_id, correct=True, today=date(2026, 3, 15)
    )

    entry = activity_repo.list_recent(conn)[0]
    assert entry["kind"] == activity_repo.KIND_CARD_REVIEW
    assert entry["ref_id"] == card_id
    assert entry["detail"] == "Gradient"


def test_missing_card_review_logs_nothing(conn):
    assert spaced_repetition.record_review(conn, 999, correct=True) is False
    assert activity_repo.count_all(conn) == 0


def test_log_survives_deletion_of_its_subject(conn):
    phase_id = _make_phase(conn)
    task_id = tasks_repo.create(conn, phase_id, "Zadanie do skasowania")
    task = tasks_repo.list_by_phase(conn, phase_id)[0]
    activity.record_task_toggle(conn, task, True)

    tasks_repo.delete(conn, task_id)

    # ref_id celowo nie jest FK - wpis zostaje, a detail trzyma migawkę tytułu.
    entry = activity_repo.list_recent(conn)[0]
    assert entry["ref_id"] == task_id
    assert entry["detail"] == "Zadanie do skasowania"


def test_get_streak_summary(conn):
    conn.execute(
        "INSERT INTO activity_log (occurred_at, kind, ref_id, detail) VALUES "
        "('2026-03-14 08:00:00', 'task_done', 1, ''), "
        "('2026-03-15 09:00:00', 'task_done', 2, ''), "
        "('2026-03-01 09:00:00', 'task_done', 3, '')"
    )
    conn.commit()

    summary = activity.get_streak(conn, today=date(2026, 3, 15))

    assert summary == {"current": 2, "longest": 2, "active_days": 3}
