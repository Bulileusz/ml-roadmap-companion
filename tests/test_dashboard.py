from datetime import date

from repository import question_attempts_repo, questions_repo, tasks_repo
from services import dashboard, spaced_repetition

TODAY = date(2026, 1, 10)


def _make_phase(conn, code="0", name="Faza 0", order_index=0):
    cursor = conn.execute(
        "INSERT INTO phases (code, name, order_index) VALUES (?, ?, ?)",
        (code, name, order_index),
    )
    conn.commit()
    return cursor.lastrowid


def test_empty_database(conn):
    data = dashboard.get_dashboard_data(conn, today=TODAY)

    assert data["roadmap"] == {"done": 0, "total": 0, "pct": 0.0}
    assert data["due_count"] == 0
    assert data["independence"] == {"independent": 0, "total": 0, "pct": 0.0}
    assert data["boxes"] == {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    assert data["cards_total"] == 0
    assert data["next_task"] is None


def test_next_task_follows_phase_and_task_order(conn):
    late_phase = _make_phase(conn, "1", "Faza 1", order_index=1)
    early_phase = _make_phase(conn, "0", "Faza 0", order_index=0)
    tasks_repo.create(conn, late_phase, "Zadanie późnej fazy")
    done_task = tasks_repo.create(conn, early_phase, "Zrobione wcześniej")
    tasks_repo.create(conn, early_phase, "Pierwsze niezrobione")
    tasks_repo.set_done(conn, done_task, True)

    data = dashboard.get_dashboard_data(conn, today=TODAY)

    assert data["next_task"]["title"] == "Pierwsze niezrobione"
    assert data["next_task"]["phase_name"] == "Faza 0"
    assert data["roadmap"] == {"done": 1, "total": 3, "pct": 1 / 3 * 100}


def test_flashcard_metrics(conn):
    due_card = spaced_repetition.create_card(conn, "a", "b", None, today=TODAY)
    spaced_repetition.create_card(conn, "c", "d", None, today=TODAY)
    # Ocena wypycha kartę do pudełka 2 z przyszłym terminem.
    spaced_repetition.record_review(conn, due_card, correct=True, today=TODAY)

    data = dashboard.get_dashboard_data(conn, today=TODAY)

    assert data["due_count"] == 1
    assert data["boxes"] == {1: 1, 2: 1, 3: 0, 4: 0, 5: 0}
    assert data["cards_total"] == 2


def test_independence_metric(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Pytanie", "concept")
    question_attempts_repo.create(conn, question_id, True)
    question_attempts_repo.create(conn, question_id, True)
    question_attempts_repo.create(conn, question_id, False)

    data = dashboard.get_dashboard_data(conn, today=TODAY)

    assert data["independence"]["independent"] == 2
    assert data["independence"]["total"] == 3
    assert data["independence"]["pct"] == 2 / 3 * 100
