from datetime import date

from services import streak

TODAY = date(2026, 3, 15)


def test_current_streak_empty():
    assert streak.current_streak([], TODAY) == 0


def test_current_streak_single_day_today():
    assert streak.current_streak(["2026-03-15"], TODAY) == 1


def test_current_streak_counts_consecutive_days_back_from_today():
    days = ["2026-03-15", "2026-03-14", "2026-03-13"]
    assert streak.current_streak(days, TODAY) == 3


def test_current_streak_stops_at_gap():
    # Dziura 12 marca ucina serię na trzech dniach.
    days = ["2026-03-15", "2026-03-14", "2026-03-13", "2026-03-11", "2026-03-10"]
    assert streak.current_streak(days, TODAY) == 3


def test_current_streak_alive_when_last_activity_was_yesterday():
    # Seria nie ginie o północy - dzisiejszy dzień nauki jeszcze przed nami.
    days = ["2026-03-14", "2026-03-13"]
    assert streak.current_streak(days, TODAY) == 2


def test_current_streak_dead_when_last_activity_was_two_days_ago():
    assert streak.current_streak(["2026-03-13", "2026-03-12"], TODAY) == 0


def test_current_streak_ignores_future_dates():
    # Data z przyszłości (np. po przestawieniu zegara) nie przedłuża serii.
    days = ["2026-03-16", "2026-03-15"]
    assert streak.current_streak(days, TODAY) == 1


def test_current_streak_crosses_month_boundary():
    days = ["2026-03-02", "2026-03-01", "2026-02-28", "2026-02-27"]
    assert streak.current_streak(days, date(2026, 3, 2)) == 4


def test_current_streak_crosses_leap_day():
    # 2024 jest przestępny - 29 lutego istnieje i musi łączyć serię.
    days = ["2024-03-01", "2024-02-29", "2024-02-28"]
    assert streak.current_streak(days, date(2024, 3, 1)) == 3


def test_longest_streak_empty():
    assert streak.longest_streak([]) == 0


def test_longest_streak_picks_best_run():
    days = [
        "2026-03-15",
        "2026-03-14",  # seria 2
        "2026-03-10",
        "2026-03-09",
        "2026-03-08",
        "2026-03-07",  # seria 4
        "2026-03-01",  # seria 1
    ]
    assert streak.longest_streak(days) == 4


def test_longest_streak_ignores_duplicates():
    days = ["2026-03-15", "2026-03-15", "2026-03-14"]
    assert streak.longest_streak(days) == 2


def test_activity_last_days_shape_and_flags():
    calendar = streak.activity_last_days(["2026-03-15", "2026-03-13"], TODAY, days=5)

    assert len(calendar) == 5
    # Od najstarszego do najnowszego, ostatni element to dziś.
    assert [day.isoformat() for day, _ in calendar] == [
        "2026-03-11",
        "2026-03-12",
        "2026-03-13",
        "2026-03-14",
        "2026-03-15",
    ]
    assert [was_active for _, was_active in calendar] == [
        False,
        False,
        True,
        False,
        True,
    ]


def test_activity_last_days_ignores_dates_outside_window():
    calendar = streak.activity_last_days(["2026-01-01"], TODAY, days=3)
    assert [was_active for _, was_active in calendar] == [False, False, False]
