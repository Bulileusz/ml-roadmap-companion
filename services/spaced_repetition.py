import sqlite3
from datetime import date, timedelta

from repository import flashcards_repo

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


def record_review(conn: sqlite3.Connection, card_id: int, correct: bool) -> None:
    card = flashcards_repo.get(conn, card_id)
    new_box = next_box(card["box"], correct)
    new_date = next_review_date(new_box, date.today())
    flashcards_repo.update_schedule(conn, card_id, new_box, new_date.isoformat())
