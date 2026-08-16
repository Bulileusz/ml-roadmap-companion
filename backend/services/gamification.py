"""XP, poziomy i osiągnięcia - w całości wyliczane z tego, co już jest w bazie.

Zero nowych tabel i zero migracji. `activity_log` trzyma pełną historię
zdarzeń od pierwszego dnia, więc XP jest funkcją czystą tej historii, a nie
licznikiem, który da się rozjechać z rzeczywistością. Praktyczny skutek:
przywrócenie kopii zapasowej odtwarza też dorobek, a błąd w formule naprawia
się jej poprawieniem, nie migracją danych.

Osiągnięcia z tego samego powodu nie mają stanu po stronie serwera - backend
mówi tylko "te są zdobyte", a front porównuje ten zbiór z zapamiętanym
poprzednim i na różnicy odpala celebrację.
"""

import sqlite3
from dataclasses import dataclass
from datetime import date
from math import isqrt

from repository import activity_repo, flashcards_repo, question_attempts_repo
from services import activity, progress
from services.spaced_repetition import MAX_BOX

# Ile XP daje jedno zdarzenie. Stawki odbijają wysiłek, nie czas: odhaczone
# zadanie roadmapy jest rzadkie i kosztowne, powtórka fiszki tania i częsta.
#
# task_undone celowo na minusie i dokładnie symetrycznie: odznaczenie zadania
# ma wyzerować swój wkład, żeby klikanie w tę i we tę nie hodowało XP. Nie jest
# to kara - stan bez zadania i stan po jego odznaczeniu mają dawać tyle samo.
XP_PER_EVENT = {
    activity_repo.KIND_TASK_DONE: 10,
    activity_repo.KIND_TASK_UNDONE: -10,
    activity_repo.KIND_CARD_REVIEW: 2,
    activity_repo.KIND_CARD_INTRO: 3,
    activity_repo.KIND_QUESTION_ATTEMPT: 5,
    # Odroczenie nie płaci. Wpisane jawnie, choć nieznane rodzaje i tak są
    # ignorowane: bez tej linii następna osoba musiałaby wywnioskować z ciszy,
    # że zero jest decyzją, a nie przeoczeniem. Gdyby płaciło, "jeszcze nie
    # umiem" stałoby się tańszym sposobem na XP niż zmierzenie się z pytaniem.
    activity_repo.KIND_QUESTION_DEFERRED: 0,
    activity_repo.KIND_RESOURCE_DONE: 8,
}

# Premia za podejście rozwiązane samodzielnie. Osobno od stawki za podejście,
# bo samo zmierzenie się z pytaniem już jest warte punktów - inaczej "sprawdziłem
# rozwiązanie" stałoby się przyciskiem, którego opłaca się unikać, a to psuje
# uczciwość statystyki samodzielności.
XP_INDEPENDENT_BONUS = 3

# Krzywa poziomów. Próg poziomu n to 50*(n-1)^2, czyli kolejne poziomy kosztują
# 50, 150, 250, 350... XP. Przy około 50 XP za dzień nauki wychodzi poziom 2
# pierwszego dnia, 4 po tygodniu z kawałkiem i 6 po miesiącu - zwalnia, ale
# nigdy nie staje.
XP_LEVEL_BASE = 50


def xp_for_level(level: int) -> int:
    """Ile XP trzeba mieć, żeby wejść na dany poziom. Poziom 1 startuje od zera."""
    return XP_LEVEL_BASE * (level - 1) ** 2


def level_for(xp: int) -> int:
    # isqrt na dzielonej liczbie całkowitej zamiast sqrt na floatach: przy
    # progach będących kwadratami float potrafi dać 1.9999999 i zabrać poziom
    # dokładnie w momencie jego zdobycia.
    return isqrt(max(xp, 0) // XP_LEVEL_BASE) + 1


def xp_from_counts(counts: dict[str, int], independent_attempts: int) -> int:
    """Suma XP z liczników zdarzeń. Czysta funkcja - stąd łatwa do przetestowania.

    Nieznany rodzaj zdarzenia jest ignorowany, nie wysadza liczenia: dziennik
    nie ma już CHECK-a na kind, więc wpis z przyszłej wersji apki może się tu
    pojawić po wczytaniu kopii zapasowej.
    """
    total = sum(
        count * XP_PER_EVENT[kind]
        for kind, count in counts.items()
        if kind in XP_PER_EVENT
    )
    total += independent_attempts * XP_INDEPENDENT_BONUS
    # Dolne zero: sam ujemny wkład task_undone nie ma prawa zejść pod zero, bo
    # nie da się odznaczyć zadania, którego się nie odhaczyło.
    return max(total, 0)


def progression(xp: int) -> dict:
    """XP rozłożone na poziom i postęp w jego obrębie - gotowe pod pasek na UI."""
    level = level_for(xp)
    floor_xp = xp_for_level(level)
    next_xp = xp_for_level(level + 1)
    span = next_xp - floor_xp
    return {
        "xp": xp,
        "level": level,
        "xp_into_level": xp - floor_xp,
        "xp_for_next_level": span,
        "pct": (xp - floor_xp) / span * 100 if span else 0.0,
    }


def get_progression(conn: sqlite3.Connection) -> dict:
    independent, _ = question_attempts_repo.count_overall(conn)
    counts = activity_repo.count_by_kind(conn)
    return progression(xp_from_counts(counts, independent))


@dataclass(frozen=True)
class Achievement:
    id: str
    label: str
    hint: str
    # Nazwa ikony z Lucide. Backend podaje nazwę, nie rysunek - decyzja
    # wizualna zostaje na froncie, tak jak przy kolorach faz.
    icon: str


# Progi. Jeden ciąg na kategorię, żeby dołożenie kolejnego stopnia było zmianą
# w jednej linii, a nie w trzech rozjeżdżających się miejscach.
STREAK_TIERS = (7, 14, 30, 50, 100)
REVIEW_TIERS = (100, 500, 1000)
MASTERED_TIERS = (1, 10, 25, 50)
LEVEL_TIERS = (5, 10, 20)


def _streak_achievement(days: int) -> Achievement:
    return Achievement(
        id=f"streak-{days}",
        label=f"{days} dni z rzędu",
        hint=f"Ucz się {days} dni bez przerwy.",
        icon="Flame",
    )


def _review_achievement(count: int) -> Achievement:
    return Achievement(
        id=f"reviews-{count}",
        label=f"{count} powtórek",
        hint=f"Zrób {count} powtórek fiszek.",
        icon="RefreshCw",
    )


def _mastered_achievement(count: int) -> Achievement:
    return Achievement(
        id=f"mastered-{count}",
        label=("Pierwsza opanowana" if count == 1 else f"{count} opanowanych"),
        hint=f"Doprowadź {count} fiszek do pudełka {MAX_BOX}.",
        icon="Trophy",
    )


def _level_achievement(level: int) -> Achievement:
    return Achievement(
        id=f"level-{level}",
        label=f"Poziom {level}",
        hint=f"Zdobądź {xp_for_level(level)} XP.",
        icon="Sparkles",
    )


def _phase_achievement(code: str, name: str) -> Achievement:
    return Achievement(
        id=f"phase-{code}",
        label=f"Faza {code} domknięta",
        hint=f"Odhacz wszystkie zadania: {name}.",
        icon="CircleCheckBig",
    )


def get_achievements(conn: sqlite3.Connection, today: date | None = None) -> list[dict]:
    """Wszystkie osiągnięcia z flagą, czy są zdobyte.

    Zwracamy też niezdobyte: pokazany, jeszcze zamknięty kafelek mówi, po co
    warto wrócić - lista wyłącznie zdobytych nie mówi nic o tym, co dalej.
    """
    streak = activity.get_streak(conn, today)
    counts = activity_repo.count_by_kind(conn)
    reviews = counts.get(activity_repo.KIND_CARD_REVIEW, 0)
    mastered = flashcards_repo.count_by_box(conn).get(MAX_BOX, 0)
    level = get_progression(conn)["level"]

    unlocked: list[tuple[Achievement, bool]] = []
    unlocked += [
        (_streak_achievement(tier), streak["longest"] >= tier) for tier in STREAK_TIERS
    ]
    unlocked += [(_review_achievement(t), reviews >= t) for t in REVIEW_TIERS]
    unlocked += [(_mastered_achievement(t), mastered >= t) for t in MASTERED_TIERS]
    unlocked += [(_level_achievement(t), level >= t) for t in LEVEL_TIERS]
    # Fazy na końcu, bo to najdłuższy dystans w całej apce.
    for entry in progress.get_all_phase_progress(conn):
        phase = entry["phase"]
        done = entry["total"] > 0 and entry["done"] == entry["total"]
        unlocked.append((_phase_achievement(phase["code"], phase["name"]), done))

    return [
        {
            "id": achievement.id,
            "label": achievement.label,
            "hint": achievement.hint,
            "icon": achievement.icon,
            "unlocked": is_unlocked,
        }
        for achievement, is_unlocked in unlocked
    ]
