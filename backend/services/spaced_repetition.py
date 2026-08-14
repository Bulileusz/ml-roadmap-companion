import sqlite3
from datetime import date, timedelta

from repository import activity_repo, flashcards_repo
from services import clock

# Leitner: 5 pudełek, im wyższe pudełko tym rzadsza powtórka.
BOX_INTERVALS_DAYS = {1: 1, 2: 2, 3: 4, 4: 7, 5: 14}
MAX_BOX = 5
MIN_BOX = 1


def next_box(current_box: int, correct: bool) -> int:
    if correct:
        return min(current_box + 1, MAX_BOX)
    return MIN_BOX


def next_review_date(box: int, today: date) -> date:
    return today + timedelta(days=BOX_INTERVALS_DAYS[box])


def get_due_cards(
    conn: sqlite3.Connection, today: date | None = None
) -> list[sqlite3.Row]:
    cutoff = (today or clock.today()).isoformat()
    return flashcards_repo.list_due(conn, cutoff)


def get_intro_cards(conn: sqlite3.Connection, limit: int) -> list[sqlite3.Row]:
    return flashcards_repo.list_intro_queue(conn, limit)


def create_card(
    conn: sqlite3.Connection,
    front: str,
    back: str,
    phase_id: int | None,
    today: date | None = None,
    needs_intro: bool = False,
) -> int:
    """Nowa fiszka. `needs_intro=True` odkłada ją do przebiegu zapoznawczego.

    Domyślne False jest świadome: fiszkę dopisaną ręcznie w aplikacji właśnie
    napisałeś, czyli widziałeś obie strony - zapoznawanie z nią byłoby pustym
    klikiem. Karty z content/ to cudze sformułowania, których jeszcze nie
    czytałeś, więc import podaje True.
    """
    due = (today or clock.today()).isoformat()
    learned_at = None if needs_intro else clock.now_iso()
    return flashcards_repo.create(conn, front, back, phase_id, due, learned_at)


def record_intro(
    conn: sqlite3.Connection, card_id: int, today: date | None = None
) -> bool:
    """Zamyka przebieg zapoznawczy: karta wchodzi do pudełka 1 i normalnej rotacji.

    Bez oceniania - "widziałem to pierwszy raz" nie jest ani sukcesem, ani
    porażką. Termin liczymy interwałem pudełka 1, więc zapoznana dziś karta
    wraca nazajutrz, dokładnie jak po udanej powtórce w pudełku 1.
    """
    card = flashcards_repo.get(conn, card_id)
    if card is None:
        return False

    reference = today or clock.today()
    flashcards_repo.mark_learned(
        conn,
        card_id,
        clock.now_iso(),
        MIN_BOX,
        next_review_date(MIN_BOX, reference).isoformat(),
    )
    # Zapoznanie liczy się do dziennika: to realna nauka, a dziennik odpowiada
    # na pytanie "czy tego dnia się uczyłem", nie "czy zdałem test".
    activity_repo.log(conn, activity_repo.KIND_CARD_INTRO, card_id, card["front"])
    return True


def record_review(
    conn: sqlite3.Connection, card_id: int, correct: bool, today: date | None = None
) -> bool:
    card = flashcards_repo.get(conn, card_id)
    if card is None:
        return False
    new_box = next_box(card["box"], correct)
    new_date = next_review_date(new_box, today or clock.today())
    flashcards_repo.update_schedule(conn, card_id, new_box, new_date.isoformat())
    # Do dziennika trafia sam fakt powtórki - "umiałem"/"nie umiałem" jest już
    # zakodowane w pudełku fiszki, a dziennik ma odpowiadać na pytanie
    # "czy tego dnia się uczyłem", nie duplikować stanu Leitnera.
    activity_repo.log(conn, activity_repo.KIND_CARD_REVIEW, card_id, card["front"])
    return True
