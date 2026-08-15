"""Dziennik nauki: okno dni złożone z tego, co zapisał activity_log.

Ten sam ruch co przy XP w services/gamification.py - dzień nauki nie jest
osobnym bytem w bazie, tylko funkcją historii zdarzeń. Dzięki temu nie ma czego
rozjechać: poprawiona formuła XP poprawia też dziennik wstecz, a wczytanie
kopii zapasowej odtwarza całą oś czasu razem z zdarzeniami.

Jedyne, czego nie da się wyliczyć, to notatka własna - i tylko ona ma tabelę.

Świadomie NIE liczymy tu czasu spędzonego nad nauką: nigdzie go nie mierzymy,
a "minuty" wyliczone ze stawki na powtórkę byłyby wymyślone, nie zmierzone.
"""

import sqlite3
from datetime import date, timedelta

from repository import activity_repo, day_notes_repo, question_attempts_repo
from services import clock, gamification


def _phase_slices(counts: dict[int | None, int]) -> list[dict]:
    """Fazy dnia od najintensywniejszej. Osierocone zdarzenia (None) na końcu."""
    ordered = sorted(
        counts.items(),
        # phase_id w kluczu sortowania jako tiebreak, żeby remis miał stabilną
        # kolejność - inaczej dwie fazy po tyle samo powtórek zamieniałyby się
        # miejscami między odświeżeniami i barwa dnia migałaby bez powodu.
        key=lambda item: (-item[1], item[0] is None, item[0] or 0),
    )
    return [{"phase_id": phase_id, "count": count} for phase_id, count in ordered]


def daily_log(
    conn: sqlite3.Connection, days: int, today: date | None = None
) -> list[dict]:
    """Ostatnie `days` dni, od najstarszego - tak jak heatmapa.

    Zwracamy także dni bez ruchu: kalendarz aktywności musi je narysować, a
    strumień wpisów i tak filtruje po `events`. Jedno zapytanie na cały ekran
    zamiast heatmapy osobno i dziennika osobno.
    """
    reference = today or clock.today()
    since = (reference - timedelta(days=days - 1)).isoformat()

    by_kind = activity_repo.counts_per_day_by_kind(conn, since)
    by_phase = activity_repo.phase_counts_per_day(conn, since)
    attempts_per_day = question_attempts_repo.stats_per_day(conn, since)
    notes = day_notes_repo.list_since(conn, since)

    result = []
    for offset in range(days):
        day = (reference - timedelta(days=days - 1 - offset)).isoformat()
        counts = by_kind.get(day, {})
        independent, attempts = attempts_per_day.get(day, (0, 0))
        result.append(
            {
                "day": day,
                "events": sum(counts.values()),
                "reviewed": counts.get(activity_repo.KIND_CARD_REVIEW, 0),
                "introduced": counts.get(activity_repo.KIND_CARD_INTRO, 0),
                "attempts": attempts,
                "independent": independent,
                "tasks_done": counts.get(activity_repo.KIND_TASK_DONE, 0),
                "resources_done": counts.get(activity_repo.KIND_RESOURCE_DONE, 0),
                # Ta sama funkcja co przy XP całkowitym, tylko na licznikach
                # jednego dnia. Dolne zero działa więc per dzień: odznaczenie
                # wczorajszego zadania nie robi z dzisiaj dnia na minusie.
                "xp": gamification.xp_from_counts(counts, independent),
                "phases": _phase_slices(by_phase.get(day, {})),
                "note": notes.get(day, ""),
            }
        )
    return result


def set_note(conn: sqlite3.Connection, day: str, note: str) -> str:
    """Zapisuje notatkę dnia; pusta kasuje wiersz. Zwraca stan po zapisie.

    Pusty tekst nie jest osobnym stanem "notatka istnieje, ale nic w niej nie
    ma" - wyczyszczenie pola ma po prostu usunąć notatkę, więc kasowanie nie
    potrzebuje własnego endpointu.
    """
    if note:
        day_notes_repo.upsert(conn, day, note)
    else:
        day_notes_repo.delete(conn, day)
    return note
