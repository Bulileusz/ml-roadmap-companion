import sqlite3
from datetime import date, timedelta

from repository import flashcards_repo
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


def create_card(
    conn: sqlite3.Connection,
    front: str,
    back: str,
    phase_id: int | None,
    today: date | None = None,
) -> int:
    # Nowa fiszka jest due od razu (next_review_at = dziś).
    due = (today or clock.today()).isoformat()
    return flashcards_repo.create(conn, front, back, phase_id, due)


def record_review(
    conn: sqlite3.Connection, card_id: int, correct: bool, today: date | None = None
) -> bool:
    card = flashcards_repo.get(conn, card_id)
    if card is None:
        return False
    new_box = next_box(card["box"], correct)
    new_date = next_review_date(new_box, today or clock.today())
    flashcards_repo.update_schedule(conn, card_id, new_box, new_date.isoformat())
    return True
