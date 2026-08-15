from datetime import date

from repository import day_notes_repo
from services import journal

TODAY = date(2026, 8, 15)


def _phase(conn, code: str) -> int:
    cursor = conn.execute(
        "INSERT INTO phases (code, name) VALUES (?, ?)", (code, f"Faza {code}")
    )
    conn.commit()
    return cursor.lastrowid


def _card(conn, phase_id: int | None) -> int:
    cursor = conn.execute(
        "INSERT INTO flashcards (phase_id, front, back, next_review_at) "
        "VALUES (?, 'Przód', 'Tył', '2026-08-15')",
        (phase_id,),
    )
    conn.commit()
    return cursor.lastrowid


def _question(conn, phase_id: int) -> int:
    cursor = conn.execute(
        "INSERT INTO questions (phase_id, question_text, question_type) "
        "VALUES (?, 'Czym jest bias?', 'concept')",
        (phase_id,),
    )
    conn.commit()
    return cursor.lastrowid


def _log(conn, day: str, kind: str, ref_id: int | None = None, times: int = 1) -> None:
    for minute in range(times):
        conn.execute(
            "INSERT INTO activity_log (occurred_at, kind, ref_id, detail) "
            "VALUES (?, ?, ?, '')",
            (f"{day} 20:{minute:02d}:00", kind, ref_id),
        )
    conn.commit()


def _attempt(conn, day: str, question_id: int, solo: bool) -> None:
    conn.execute(
        "INSERT INTO question_attempts (question_id, attempted_at, "
        "solved_independently) VALUES (?, ?, ?)",
        (question_id, f"{day} 20:30:00", int(solo)),
    )
    conn.commit()


def _day(days: list[dict], iso: str) -> dict:
    return next(entry for entry in days if entry["day"] == iso)


def test_window_ends_today_and_has_no_holes(conn):
    days = journal.daily_log(conn, 7, today=TODAY)

    assert len(days) == 7
    # Rosnąco, jak heatmapa - kalendarz rysuje się od najstarszego.
    assert days[0]["day"] == "2026-08-09"
    assert days[-1]["day"] == "2026-08-15"
    assert all(entry["events"] == 0 for entry in days)


def test_day_splits_events_into_countable_parts(conn):
    phase_id = _phase(conn, "2")
    card_id = _card(conn, phase_id)
    _log(conn, "2026-08-14", "card_review", card_id, times=3)
    _log(conn, "2026-08-14", "card_intro", card_id, times=2)

    entry = _day(journal.daily_log(conn, 7, today=TODAY), "2026-08-14")

    assert entry["reviewed"] == 3
    assert entry["introduced"] == 2
    assert entry["events"] == 5
    # 3 * 2 XP za powtórkę + 2 * 3 XP za zapoznanie.
    assert entry["xp"] == 12


def test_independence_comes_from_attempts_not_from_the_log(conn):
    phase_id = _phase(conn, "2")
    question_id = _question(conn, phase_id)
    _log(conn, "2026-08-13", "question_attempt", question_id, times=2)
    _attempt(conn, "2026-08-13", question_id, solo=True)
    _attempt(conn, "2026-08-13", question_id, solo=False)

    entry = _day(journal.daily_log(conn, 7, today=TODAY), "2026-08-13")

    assert (entry["independent"], entry["attempts"]) == (1, 2)
    # 2 * 5 XP za podejście + 3 XP premii za jedno samodzielne.
    assert entry["xp"] == 13


def test_phases_are_ordered_by_intensity(conn):
    slaba = _phase(conn, "2")
    mocna = _phase(conn, "3")
    _log(conn, "2026-08-12", "card_review", _card(conn, slaba), times=1)
    _log(conn, "2026-08-12", "card_review", _card(conn, mocna), times=4)

    entry = _day(journal.daily_log(conn, 7, today=TODAY), "2026-08-12")

    assert entry["phases"] == [
        {"phase_id": mocna, "count": 4},
        {"phase_id": slaba, "count": 1},
    ]


def test_event_whose_object_is_gone_keeps_the_day_but_loses_the_phase(conn):
    phase_id = _phase(conn, "2")
    card_id = _card(conn, phase_id)
    _log(conn, "2026-08-11", "card_review", card_id)
    # Dziennik przeżywa usunięcie fiszki - ref_id celowo nie jest kluczem obcym.
    conn.execute("DELETE FROM flashcards WHERE id = ?", (card_id,))
    conn.commit()

    entry = _day(journal.daily_log(conn, 7, today=TODAY), "2026-08-11")

    assert entry["reviewed"] == 1
    assert entry["phases"] == [{"phase_id": None, "count": 1}]


def test_undoing_a_task_does_not_push_the_day_below_zero(conn):
    phase_id = _phase(conn, "2")
    cursor = conn.execute(
        "INSERT INTO tasks (phase_id, title) VALUES (?, 'NumPy')", (phase_id,)
    )
    conn.commit()
    _log(conn, "2026-08-10", "task_undone", cursor.lastrowid)

    entry = _day(journal.daily_log(conn, 7, today=TODAY), "2026-08-10")

    assert entry["xp"] == 0
    # Dzień z samym odznaczeniem to wciąż dzień z ruchem - kalendarz ma go pokazać.
    assert entry["events"] == 1


def test_note_rides_along_with_its_day(conn):
    day_notes_repo.upsert(conn, "2026-08-14", "Padło na regresji, wracam jutro.")

    days = journal.daily_log(conn, 7, today=TODAY)

    assert _day(days, "2026-08-14")["note"] == "Padło na regresji, wracam jutro."
    assert _day(days, "2026-08-13")["note"] == ""


def test_empty_note_removes_the_row_instead_of_storing_blankness(conn):
    journal.set_note(conn, "2026-08-14", "coś tam")
    assert day_notes_repo.get(conn, "2026-08-14") is not None

    assert journal.set_note(conn, "2026-08-14", "") == ""
    assert day_notes_repo.get(conn, "2026-08-14") is None
