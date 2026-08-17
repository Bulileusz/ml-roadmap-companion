"""Sesja dnia: jeden rytuał zamiast pięciu stron do odwiedzenia z pamięci.

Ta warstwa nie zapisuje niczego. Składa tylko plan „co dziś", a każdy krok
sesji odkłada się przez zwykłe endpointy powtórki, zapoznania i podejścia do
pytania. Dzięki temu przerwana w połowie sesja nie gubi zrobionej pracy i nie
zostawia po sobie żadnego stanu do posprzątania - nie ma czego wznawiać, bo
plan wystarczy policzyć od nowa.
"""

import math
import sqlite3
from datetime import date, timedelta

from repository import (
    flashcards_repo,
    phases_repo,
    questions_repo,
    resources_repo,
    tasks_repo,
)
from services import clock, progress, spaced_repetition

# Limity jednej sesji. Kolejka zapoznawcza przejęła rolę dawnego
# NEW_CARDS_PER_DAY: wgranie stu fiszek z content/ nie ma dać stu nowych kart
# do przerobienia w jeden wieczór.
# Ile materiałów pokazać na odprawie. Trzy mieszczą się pod zadaniem jednym
# rzutem oka; przy pięciu robi się lista do przewijania, a wtedy jesteś na
# ekranie Zasobów, nie w sesji.
MATERIALS_PER_BRIEFING = 3

INTROS_PER_SESSION = 5
# Powtórki nie znikają, jeśli nie zmieszczą się w sesji - zaległe zostają
# zaległe. Sufit jest po to, żeby licznik postępu na górze ekranu miał
# skończoną, widoczną długość: pasek „13 z 13" ciągnie do końca, „13 z 140"
# zniechęca zanim się zacznie.
MAX_REVIEWS_PER_SESSION = 20
QUESTIONS_PER_SESSION = 3

# Ile fiszek fazy trzeba mieć poznanych, zanim wejdą jej pytania.
#
# Fiszki dostały przebieg zapoznawczy właśnie po to, żeby pierwszy kontakt
# z materiałem nie był zapisem porażki. Pytania takiej warstwy nie miały:
# na świeżej bazie sesja od razu podsuwała trzy pytania z fazy, w której nie
# widziałeś jeszcze ani jednej karty, więc jedyną szczerą odpowiedzią było
# "sprawdziłem rozwiązanie". Wskaźnik samodzielności startował zaszumiony
# i przez pierwsze tygodnie nie mierzył niczego.
#
# Osiem, bo tyle mniej więcej daje pierwszy tydzień zapoznań przy limicie
# pięciu kart na sesję - próg ma opóźnić pytania o kilka wieczorów, a nie
# schować je na miesiąc.
QUESTIONS_UNLOCK_AFTER_LEARNED = 8

# Ile dni pytanie odłożone przez "jeszcze nie umiem" nie wraca do sesji.
# Krócej niż tydzień, bo to ma być odłożenie, nie schowanie; dłużej niż jeden
# wieczór, bo inaczej jutro znów odbijesz się od tego samego pytania.
QUESTION_DEFER_DAYS = 3

# Szacowanie czasu - z obserwacji, nie z pomiaru: karta zapoznawcza to
# przeczytanie obu stron, powtórka to sekunda namysłu i klik, pytanie
# koncepcyjne to realne półtorej minuty. Plus minuta na rozkręcenie się.
SECONDS_PER_INTRO = 20
SECONDS_PER_REVIEW = 15
SECONDS_PER_QUESTION = 90
SESSION_OVERHEAD_SECONDS = 60
# Odprawa to przeczytanie, co dziś robisz - nie sama robota. Zadanie roadmapy
# zajmie wieczór, ale dzieje się poza aplikacją, więc doliczanie go tutaj
# wyrzuciłoby szacunek sesji z czterech minut na sześćdziesiąt cztery
# i zniechęcało dokładnie tak, jak opisuje komentarz przy sufcie powtórek.
SECONDS_PER_BRIEFING = 45


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


def estimate_seconds(
    intro: int, reviews: int, questions: int, briefing: int = 0
) -> int:
    if intro + reviews + questions + briefing == 0:
        return 0
    return (
        intro * SECONDS_PER_INTRO
        + reviews * SECONDS_PER_REVIEW
        + questions * SECONDS_PER_QUESTION
        + briefing * SECONDS_PER_BRIEFING
        + SESSION_OVERHEAD_SECONDS
    )


def questions_for(
    conn: sqlite3.Connection, phase: sqlite3.Row | None, today: date
) -> tuple[list[sqlite3.Row], dict | None]:
    """Pytania do sesji albo powód, dla którego jeszcze ich nie ma.

    Zwraca parę: listę pytań i - gdy próg nie jest osiągnięty - licznik
    "masz N z M poznanych fiszek". Powód jedzie do frontu, bo brak pytań bez
    wyjaśnienia wygląda jak usterka, a to jest decyzja: najpierw zobacz
    materiał, potem odpowiadaj.
    """
    if phase is None:
        return [], None

    learned = flashcards_repo.count_learned_by_phase(conn, phase["id"])
    if learned < QUESTIONS_UNLOCK_AFTER_LEARNED:
        return [], {"learned": learned, "needed": QUESTIONS_UNLOCK_AFTER_LEARNED}

    deferred_since = (today - timedelta(days=QUESTION_DEFER_DAYS)).isoformat()
    questions = questions_repo.list_for_session(
        conn, phase["id"], QUESTIONS_PER_SESSION, deferred_since=deferred_since
    )
    return questions, None


def briefing(conn: sqlite3.Connection) -> dict | None:
    """Odprawa: co dziś robisz, z czego i który to punkt fazy.

    Zadanie roadmapy zajmuje wieczór, a sesja kilkanaście minut - te dwie rzeczy
    nie mieszczą się w jednym przebiegu. Dlatego to jest **zapowiedź, nie praca**:
    ekran mówi, co masz dziś zrobić, i schodzi z drogi. Odhaczenie następuje na
    Mapie, po faktycznej robocie, więc ten krok niczego nie zapisuje.

    Materiały są przypisem, nie połową ekranu: łączy je z zadaniem tylko faza,
    więc lista mówi uczciwie "to są źródła tej fazy", zamiast twierdzić, że
    dana pozycja jest materiałem do tego konkretnego zadania.
    """
    task = tasks_repo.first_incomplete(conn)
    if task is None:
        return None

    phase_id = task["phase_id"]
    done, total = tasks_repo.count_progress(conn, phase_id)
    return {
        "task": task,
        "materials": resources_repo.list_for_session(
            conn, phase_id, MATERIALS_PER_BRIEFING
        ),
        "done": done,
        "total": total,
    }


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
    questions, gate = questions_for(conn, phase, reference)

    brief = briefing(conn)
    seconds = estimate_seconds(
        len(intro), len(reviews), len(questions), 1 if brief else 0
    )
    return {
        "briefing": brief,
        "intro": intro,
        "reviews": reviews,
        # Ile powtórek nie weszło do tej sesji. Pokazywane obok licznika, żeby
        # sufit był widoczną decyzją, a nie po cichu ukrytą zaległością.
        "reviews_remaining": max(len(due) - len(reviews), 0),
        "questions": questions,
        # None = pytania są odblokowane. Nie-None niesie licznik, którym front
        # tłumaczy, czemu ich dziś nie ma.
        "questions_gate": gate,
        "phase": phase,
        "next_task": tasks_repo.first_incomplete(conn),
        "total_steps": len(intro) + len(reviews) + len(questions) + (1 if brief else 0),
        "estimated_minutes": math.ceil(seconds / 60),
    }
