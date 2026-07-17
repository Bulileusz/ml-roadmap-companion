from datetime import date

import pytest

from repository import flashcards_repo
from services import spaced_repetition
from services.spaced_repetition import (
    BOX_INTERVALS_DAYS,
    MAX_BOX,
    MIN_BOX,
    next_box,
    next_review_date,
)

TODAY = date(2026, 1, 10)


def test_next_box_promotes_on_correct():
    assert next_box(1, correct=True) == 2
    assert next_box(4, correct=True) == 5


def test_next_box_caps_at_max():
    assert next_box(MAX_BOX, correct=True) == MAX_BOX


def test_next_box_resets_to_min_on_wrong():
    for box in range(MIN_BOX, MAX_BOX + 1):
        assert next_box(box, correct=False) == MIN_BOX


@pytest.mark.parametrize(
    ("box", "expected"),
    [
        (1, date(2026, 1, 11)),
        (2, date(2026, 1, 12)),
        (3, date(2026, 1, 14)),
        (4, date(2026, 1, 17)),
        (5, date(2026, 1, 24)),
    ],
)
def test_next_review_date_per_box(box, expected):
    assert next_review_date(box, TODAY) == expected


def test_intervals_cover_all_boxes():
    assert set(BOX_INTERVALS_DAYS) == set(range(MIN_BOX, MAX_BOX + 1))


def test_create_card_is_due_immediately(conn):
    card_id = spaced_repetition.create_card(conn, "a", "b", None, today=TODAY)

    due = spaced_repetition.get_due_cards(conn, today=TODAY)
    assert [c["id"] for c in due] == [card_id]


def test_get_due_cards_excludes_future(conn):
    card_id = spaced_repetition.create_card(conn, "a", "b", None, today=TODAY)
    spaced_repetition.record_review(conn, card_id, correct=True, today=TODAY)

    assert spaced_repetition.get_due_cards(conn, today=TODAY) == []
    # Pudełko 2 -> interwał 2 dni.
    later = spaced_repetition.get_due_cards(conn, today=date(2026, 1, 12))
    assert [c["id"] for c in later] == [card_id]


def test_record_review_correct_promotes_and_schedules(conn):
    card_id = spaced_repetition.create_card(conn, "a", "b", None, today=TODAY)

    result = spaced_repetition.record_review(conn, card_id, correct=True, today=TODAY)

    card = flashcards_repo.get(conn, card_id)
    assert result is True
    assert card["box"] == 2
    assert card["next_review_at"] == "2026-01-12"


def test_record_review_wrong_resets_to_box_one(conn):
    card_id = spaced_repetition.create_card(conn, "a", "b", None, today=TODAY)
    for _ in range(3):
        spaced_repetition.record_review(conn, card_id, correct=True, today=TODAY)
    assert flashcards_repo.get(conn, card_id)["box"] == 4

    spaced_repetition.record_review(conn, card_id, correct=False, today=TODAY)

    card = flashcards_repo.get(conn, card_id)
    assert card["box"] == 1
    assert card["next_review_at"] == "2026-01-11"


def test_record_review_missing_card_returns_false(conn):
    assert spaced_repetition.record_review(conn, 9999, correct=True) is False
