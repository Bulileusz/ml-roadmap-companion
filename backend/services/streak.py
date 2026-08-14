from datetime import date, timedelta

# Czyste funkcje na listach dat (bez SQL) - łatwe do przetestowania na
# przypadkach brzegowych, tak jak next_box/next_review_date w spaced_repetition.


def _parse(active_dates: list[str]) -> set[date]:
    return {date.fromisoformat(day) for day in active_dates}


def current_streak(active_dates: list[str], today: date) -> int:
    """Liczba dni nauki z rzędu kończąca się dziś albo wczoraj.

    Wczoraj też liczy się jako seria żywa: inaczej streak "ginąłby" o północy,
    zanim dzisiejszy dzień nauki w ogóle zdąży się zacząć.
    """
    days = _parse(active_dates)
    if not days:
        return 0

    if today in days:
        cursor = today
    elif today - timedelta(days=1) in days:
        cursor = today - timedelta(days=1)
    else:
        return 0

    length = 0
    while cursor in days:
        length += 1
        cursor -= timedelta(days=1)
    return length


def longest_streak(active_dates: list[str]) -> int:
    days = _parse(active_dates)
    if not days:
        return 0

    best = 0
    for day in days:
        # Liczymy tylko od początków serii, więc każdy ciąg odwiedzamy raz.
        if day - timedelta(days=1) in days:
            continue
        length = 0
        cursor = day
        while cursor in days:
            length += 1
            cursor += timedelta(days=1)
        best = max(best, length)
    return best


def activity_last_days(
    active_dates: list[str], today: date, days: int = 30
) -> list[tuple[date, bool]]:
    """Ostatnie `days` dni (od najstarszego), z flagą czy był tego dnia ruch."""
    active = _parse(active_dates)
    start = today - timedelta(days=days - 1)
    return [
        (start + timedelta(days=offset), start + timedelta(days=offset) in active)
        for offset in range(days)
    ]
