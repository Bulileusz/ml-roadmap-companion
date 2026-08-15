"""Sesja dnia: jeden rytuał zamiast pięciu stron do odwiedzenia z pamięci.

Ta warstwa nie zapisuje niczego. Składa tylko plan „co dziś", a każdy krok
sesji odkłada się przez zwykłe endpointy powtórki, zapoznania i podejścia do
pytania. Dzięki temu przerwana w połowie sesja nie gubi zrobionej pracy i nie
zostawia po sobie żadnego stanu do posprzątania - nie ma czego wznawiać, bo
plan wystarczy policzyć od nowa.
"""

import math
import sqlite3
from datetime import date

from repository import phases_repo, questions_repo, tasks_repo
from services import clock, progress, spaced_repetition

# Limity jednej sesji. Kolejka zapoznawcza przejęła rolę dawnego
# NEW_CARDS_PER_DAY: wgranie stu fiszek z content/ nie ma dać stu nowych kart
# do przerobienia w jeden wieczór.
INTROS_PER_SESSION = 5
# Powtórki nie znikają, jeśli nie zmieszczą się w sesji - zaległe zostają
# zaległe. Sufit jest po to, żeby licznik postępu na górze ekranu miał
# skończoną, widoczną długość: pasek „13 z 13" ciągnie do końca, „13 z 140"
# zniechęca zanim się zacznie.
MAX_REVIEWS_PER_SESSION = 20
QUESTIONS_PER_SESSION = 3

# Szacowanie czasu - z obserwacji, nie z pomiaru: karta zapoznawcza to
# przeczytanie obu stron, powtórka to sekunda namysłu i klik, pytanie
# koncepcyjne to realne półtorej minuty. Plus minuta na rozkręcenie się.
SECONDS_PER_INTRO = 20
SECONDS_PER_REVIEW = 15
SECONDS_PER_QUESTION = 90
SESSION_OVERHEAD_SECONDS = 60


def current_phase(conn: sqlite3.Connection) -> sqlite3.Row | None:
    """Faza, w której jesteś: pierwsza z niedokończonymi zadaniami.

    Gdy cała roadmapa jest odhaczona, wracamy ostatnią fazę zamiast None -
    nauka się wtedy nie kończy, a pytania z fazy projektowej dalej mają sens.
    """
    entries = progress.get_all_phase_progress(conn)
    for entry in entries:
        if entry["done"] < entry["total"]:
            return entry["phase"]
    phases = phases_repo.list_all(conn)
    return phases[-1] if phases else None


def estimate_seconds(intro: int, reviews: int, questions: int) -> int:
    if intro + reviews + questions == 0:
        return 0
    return (
        intro * SECONDS_PER_INTRO
        + reviews * SECONDS_PER_REVIEW
        + questions * SECONDS_PER_QUESTION
        + SESSION_OVERHEAD_SECONDS
    )


def plan(conn: sqlite3.Connection, today: date | None = None) -> dict:
    """Plan dnia w trzech etapach: powtórki, zapoznania, pytania.

    Sam plan jest workiem trzech list - kolejność etapów układa front
    (`lib/session-machine.ts`), bo to decyzja o przebiegu, nie o danych. Ale
    warto ją tu zapisać, bo wynika z tego, co jest zobowiązaniem: **powtórki
    idą pierwsze, bo mają termin**. Zapoznania są uznaniowe, więc gdy urwiesz
    sesję w połowie, ma być zrobione to, co na dziś przypadało. Pytania na
    końcu, bo wymagają złożenia kilku rzeczy naraz i są najdroższe poznawczo.

    Zadanie roadmapy jest dopisane jako drogowskaz, nie jako krok do odklikania.
    """
    reference = today or clock.today()

    intro = spaced_repetition.get_intro_cards(conn, INTROS_PER_SESSION)
    due = spaced_repetition.get_due_cards(conn, reference)
    reviews = due[:MAX_REVIEWS_PER_SESSION]

    phase = current_phase(conn)
    questions = (
        questions_repo.list_for_session(conn, phase["id"], QUESTIONS_PER_SESSION)
        if phase is not None
        else []
    )

    seconds = estimate_seconds(len(intro), len(reviews), len(questions))
    return {
        "intro": intro,
        "reviews": reviews,
        # Ile powtórek nie weszło do tej sesji. Pokazywane obok licznika, żeby
        # sufit był widoczną decyzją, a nie po cichu ukrytą zaległością.
        "reviews_remaining": max(len(due) - len(reviews), 0),
        "questions": questions,
        "phase": phase,
        "next_task": tasks_repo.first_incomplete(conn),
        "total_steps": len(intro) + len(reviews) + len(questions),
        "estimated_minutes": math.ceil(seconds / 60),
    }
