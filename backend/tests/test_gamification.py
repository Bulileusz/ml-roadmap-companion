from datetime import date

import pytest

from repository import activity_repo, flashcards_repo, questions_repo, tasks_repo
from services import activity, gamification, spaced_repetition

TODAY = date(2026, 3, 15)


def _make_phase(conn, code="0", name="Faza 0", order_index=0):
    cursor = conn.execute(
        "INSERT INTO phases (code, name, order_index) VALUES (?, ?, ?)",
        (code, name, order_index),
    )
    conn.commit()
    return cursor.lastrowid


def test_xp_is_zero_on_a_fresh_database(conn):
    assert gamification.get_progression(conn) == {
        "xp": 0,
        "level": 1,
        "xp_into_level": 0,
        "xp_for_next_level": 50,
        "pct": 0.0,
    }


@pytest.mark.parametrize(
    ("xp", "level"),
    [
        (0, 1),
        (49, 1),
        (50, 2),
        (199, 2),
        (200, 3),
        (449, 3),
        (450, 4),
        (800, 5),
    ],
)
def test_level_thresholds(xp, level):
    assert gamification.level_for(xp) == level


def test_level_boundary_is_not_lost_to_float_rounding():
    # Progi są kwadratami, więc to dokładnie te wartości, na których sqrt na
    # floatach potrafi zwrócić 1.9999999 i zabrać poziom w momencie zdobycia.
    for level in range(1, 40):
        próg = gamification.xp_for_level(level)
        assert gamification.level_for(próg) == level
        assert gamification.level_for(próg - 1) == max(level - 1, 1)


def test_undoing_a_task_cancels_its_xp_exactly(conn):
    phase_id = _make_phase(conn)
    tasks_repo.create(conn, phase_id, "NumPy: broadcasting")
    task = tasks_repo.list_by_phase(conn, phase_id)[0]

    activity.record_task_toggle(conn, task, True)
    assert gamification.get_progression(conn)["xp"] == 10

    activity.record_task_toggle(conn, task, False)

    # Stan "nigdy nie odhaczone" i "odhaczone, potem odznaczone" mają dawać
    # tyle samo - inaczej klikanie w tę i we tę hodowałoby XP.
    assert gamification.get_progression(conn)["xp"] == 0


def test_xp_never_goes_below_zero():
    assert gamification.xp_from_counts({activity_repo.KIND_TASK_UNDONE: 5}, 0) == 0


def test_unknown_event_kind_is_ignored_not_fatal():
    # Dziennik nie ma już CHECK-a na kind, więc kopia zapasowa z nowszej wersji
    # apki może przywlec rodzaj, którego ta wersja nie zna.
    counts = {activity_repo.KIND_CARD_REVIEW: 3, "quantum_leap": 99}
    assert gamification.xp_from_counts(counts, 0) == 6


def test_independent_answer_pays_a_bonus_on_top_of_the_attempt(conn):
    phase_id = _make_phase(conn)
    questions_repo.create(conn, phase_id, "Czym jest bias?", "concept")
    question = questions_repo.list_by_phase(conn, phase_id)[0]

    activity.record_question_attempt(conn, question, True)
    assert gamification.get_progression(conn)["xp"] == 5 + 3

    activity.record_question_attempt(conn, question, False)

    # Samo zmierzenie się z pytaniem też jest warte punktów: gdyby
    # „sprawdziłem" nie dawało nic, opłacałoby się go unikać, a wtedy
    # wskaźnik samodzielności przestaje cokolwiek mierzyć.
    assert gamification.get_progression(conn)["xp"] == 5 + 3 + 5


def test_xp_sums_across_all_kinds_of_learning(conn):
    phase_id = _make_phase(conn)
    tasks_repo.create(conn, phase_id, "Zadanie")
    activity.record_task_toggle(conn, tasks_repo.list_by_phase(conn, phase_id)[0], True)
    card_id = spaced_repetition.create_card(
        conn, "Gradient", "Wektor", None, today=TODAY, needs_intro=True
    )
    spaced_repetition.record_intro(conn, card_id, today=TODAY)
    spaced_repetition.record_review(conn, card_id, correct=True, today=TODAY)

    # 10 (zadanie) + 3 (zapoznanie) + 2 (powtórka)
    assert gamification.get_progression(conn)["xp"] == 15


def test_progression_reports_progress_inside_the_level():
    # 300 XP: poziom 3 zaczyna się na 200, poziom 4 na 450.
    assert gamification.progression(300) == {
        "xp": 300,
        "level": 3,
        "xp_into_level": 100,
        "xp_for_next_level": 250,
        "pct": 40.0,
    }


def test_achievements_start_locked_but_are_all_listed(conn):
    _make_phase(conn)

    achievements = gamification.get_achievements(conn, TODAY)

    assert achievements, "lista osiągnięć nie może być pusta"
    assert not any(a["unlocked"] for a in achievements)
    # Niezdobyte też wracają, z podpowiedzią: zamknięty kafelek mówi, po co
    # warto wrócić, a lista samych zdobytych nie mówi nic o tym, co dalej.
    assert all(a["hint"] for a in achievements)
    assert {a["id"] for a in achievements} >= {"streak-7", "reviews-100", "phase-0"}


def test_completing_every_task_in_a_phase_unlocks_it(conn):
    phase_id = _make_phase(conn, "2b", "Faza 2b - Ensemble", 3)
    tasks_repo.create(conn, phase_id, "Random Forest")
    tasks_repo.create(conn, phase_id, "XGBoost")
    tasks = tasks_repo.list_by_phase(conn, phase_id)

    activity.record_task_toggle(conn, tasks[0], True)
    assert not _by_id(gamification.get_achievements(conn, TODAY), "phase-2b")[
        "unlocked"
    ]

    activity.record_task_toggle(conn, tasks[1], True)

    assert _by_id(gamification.get_achievements(conn, TODAY), "phase-2b")["unlocked"]


def test_empty_phase_does_not_count_as_completed(conn):
    _make_phase(conn, "4", "Faza 4 - Projekt", 5)

    # 0 z 0 zadań to nie sukces, to faza, której jeszcze nie rozpisałeś.
    assert not _by_id(gamification.get_achievements(conn, TODAY), "phase-4")["unlocked"]


def test_mastering_a_card_unlocks_the_first_trophy(conn):
    card_id = spaced_repetition.create_card(conn, "a", "b", None, today=TODAY)
    flashcards_repo.update_schedule(conn, card_id, 5, "2026-04-01")

    assert _by_id(gamification.get_achievements(conn, TODAY), "mastered-1")["unlocked"]
    assert not _by_id(gamification.get_achievements(conn, TODAY), "mastered-10")[
        "unlocked"
    ]


def test_streak_achievement_uses_the_record_not_the_current_run(conn):
    # Seria 7 dni w lutym, przerwana. Zdobyta odznaka nie ma prawa zniknąć,
    # bo dorobek raz osiągnięty zostaje - inaczej jedna przerwa kasowałaby
    # historię i odznaka przestaje być odznaką.
    dni = ", ".join(
        f"('2026-02-{day:02d} 09:00:00', 'task_done', 1, '')" for day in range(1, 8)
    )
    conn.execute(
        f"INSERT INTO activity_log (occurred_at, kind, ref_id, detail) VALUES {dni}"
    )
    conn.commit()

    achievements = gamification.get_achievements(conn, TODAY)

    assert activity.get_streak(conn, TODAY)["current"] == 0
    assert _by_id(achievements, "streak-7")["unlocked"]
    assert not _by_id(achievements, "streak-14")["unlocked"]


def _by_id(achievements: list[dict], achievement_id: str) -> dict:
    return next(a for a in achievements if a["id"] == achievement_id)
