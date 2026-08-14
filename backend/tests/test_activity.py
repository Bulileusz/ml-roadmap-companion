from datetime import date

from repository import (
    activity_repo,
    flashcards_repo,
    question_attempts_repo,
    questions_repo,
    resources_repo,
    tasks_repo,
)
from services import activity, spaced_repetition

TODAY = date(2026, 3, 15)


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


def test_card_intro_is_logged_and_takes_the_card_out_of_the_queue(conn):
    card_id = spaced_repetition.create_card(
        conn, "Gradient", "Wektor pochodnych", None, today=TODAY, needs_intro=True
    )
    assert spaced_repetition.get_due_cards(conn, today=TODAY) == []

    assert spaced_repetition.record_intro(conn, card_id, today=TODAY) is True

    entry = activity_repo.list_recent(conn)[0]
    assert entry["kind"] == activity_repo.KIND_CARD_INTRO
    assert entry["ref_id"] == card_id
    assert entry["detail"] == "Gradient"
    # Pudełko 1 i termin za dzień - dokładnie jak po udanej powtórce w pudełku 1.
    card = flashcards_repo.get(conn, card_id)
    assert card["box"] == 1
    assert card["next_review_at"] == "2026-03-16"
    assert card["learned_at"] is not None
    nazajutrz = spaced_repetition.get_due_cards(conn, date(2026, 3, 16))
    assert [c["id"] for c in nazajutrz] == [card_id]


def test_missing_card_intro_logs_nothing(conn):
    assert spaced_repetition.record_intro(conn, 999) is False
    assert activity_repo.count_all(conn) == 0


def test_only_finishing_a_resource_lands_in_the_journal(conn):
    phase_id = _make_phase(conn)
    resource_id = resources_repo.create(conn, phase_id, "ISLR", "https://example.org")
    resource = resources_repo.list_by_phase(conn, phase_id)[0]

    # "Zacząłem czytać" to nie wydarzenie dnia nauki - podbijałoby serię za samo
    # przestawienie selecta.
    activity.record_resource_status(conn, resource, resources_repo.STATUS_IN_PROGRESS)
    assert activity_repo.count_all(conn) == 0

    resource = resources_repo.list_by_phase(conn, phase_id)[0]
    activity.record_resource_status(conn, resource, resources_repo.STATUS_DONE)

    entry = activity_repo.list_recent(conn)[0]
    assert entry["kind"] == activity_repo.KIND_RESOURCE_DONE
    assert entry["ref_id"] == resource_id
    assert entry["detail"] == "ISLR"


def test_finishing_an_already_finished_resource_does_not_log_twice(conn):
    phase_id = _make_phase(conn)
    resources_repo.create(conn, phase_id, "ISLR")
    resource = resources_repo.list_by_phase(conn, phase_id)[0]
    activity.record_resource_status(conn, resource, resources_repo.STATUS_DONE)

    # Powtórne kliknięcie "przerobione" na materiale, który już jest przerobiony,
    # nie jest nowym osiągnięciem.
    resource = resources_repo.list_by_phase(conn, phase_id)[0]
    activity.record_resource_status(conn, resource, resources_repo.STATUS_DONE)

    assert activity_repo.count_all(conn) == 1


def test_count_by_kind_and_per_day(conn):
    conn.execute(
        "INSERT INTO activity_log (occurred_at, kind, ref_id, detail) VALUES "
        "('2026-03-14 08:00:00', 'task_done', 1, ''), "
        "('2026-03-15 09:00:00', 'card_review', 2, ''), "
        "('2026-03-15 09:05:00', 'card_review', 3, ''), "
        "('2026-03-01 09:00:00', 'card_intro', 4, '')"
    )
    conn.commit()

    assert activity_repo.count_by_kind(conn) == {
        "task_done": 1,
        "card_review": 2,
        "card_intro": 1,
    }
    # Okno odcina marzec 1., a dni bez ruchu po prostu nie mają klucza -
    # wypełnia je services/streak.py, na czystych funkcjach.
    assert activity_repo.count_per_day(conn, "2026-03-14") == {
        "2026-03-14": 1,
        "2026-03-15": 2,
    }


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
