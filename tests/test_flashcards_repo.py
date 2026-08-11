from repository import flashcards_repo


def test_create_and_get(conn):
    card_id = flashcards_repo.create(conn, "Przód", "Tył", None, "2026-01-10")

    card = flashcards_repo.get(conn, card_id)
    assert card["front"] == "Przód"
    assert card["back"] == "Tył"
    assert card["box"] == 1
    assert card["next_review_at"] == "2026-01-10"


def test_get_missing_returns_none(conn):
    assert flashcards_repo.get(conn, 9999) is None


def test_list_due_boundary_dates(conn):
    past = flashcards_repo.create(conn, "wczoraj", "x", None, "2026-01-09")
    today = flashcards_repo.create(conn, "dziś", "x", None, "2026-01-10")
    flashcards_repo.create(conn, "jutro", "x", None, "2026-01-11")

    due = flashcards_repo.list_due(conn, "2026-01-10")

    assert [c["id"] for c in due] == [past, today]


def test_count_due_and_count_by_box(conn):
    flashcards_repo.create(conn, "wczoraj", "x", None, "2026-01-09")
    flashcards_repo.create(conn, "dziś", "x", None, "2026-01-10")
    future = flashcards_repo.create(conn, "jutro", "x", None, "2026-01-11")
    flashcards_repo.update_schedule(conn, future, 3, "2026-01-14")

    assert flashcards_repo.count_due(conn, "2026-01-10") == 2
    assert flashcards_repo.count_by_box(conn) == {1: 2, 3: 1}


def test_update_content_and_schedule(conn):
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10")

    flashcards_repo.update_content(conn, card_id, "nowy przód", "nowy tył")
    flashcards_repo.update_schedule(conn, card_id, 3, "2026-01-14")

    card = flashcards_repo.get(conn, card_id)
    assert card["front"] == "nowy przód"
    assert card["back"] == "nowy tył"
    assert card["box"] == 3
    assert card["next_review_at"] == "2026-01-14"


def test_delete(conn):
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10")

    flashcards_repo.delete(conn, card_id)

    assert flashcards_repo.get(conn, card_id) is None
    assert flashcards_repo.list_all(conn) == []


def test_update_phase(conn):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.commit()
    phase_id = cursor.lastrowid
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10")

    flashcards_repo.update_phase(conn, card_id, phase_id)

    assert flashcards_repo.get(conn, card_id)["phase_id"] == phase_id

    flashcards_repo.update_phase(conn, card_id, None)

    assert flashcards_repo.get(conn, card_id)["phase_id"] is None


def test_update_phase_keeps_schedule_and_still_set_null_on_phase_delete(conn):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.commit()
    phase_id = cursor.lastrowid
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10")
    flashcards_repo.update_schedule(conn, card_id, 3, "2026-01-14")

    flashcards_repo.update_phase(conn, card_id, phase_id)

    card = flashcards_repo.get(conn, card_id)
    # Przepięcie fazy nie rusza harmonogramu powtórek.
    assert card["box"] == 3
    assert card["next_review_at"] == "2026-01-14"

    # FK dopięty przez update_phase zachowuje się tak samo jak ten z insertu.
    conn.execute("DELETE FROM phases WHERE id = ?", (phase_id,))
    conn.commit()
    assert flashcards_repo.get(conn, card_id)["phase_id"] is None


def test_deleting_phase_sets_phase_id_null(conn):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.commit()
    phase_id = cursor.lastrowid
    card_id = flashcards_repo.create(conn, "a", "b", phase_id, "2026-01-10")

    conn.execute("DELETE FROM phases WHERE id = ?", (phase_id,))
    conn.commit()

    card = flashcards_repo.get(conn, card_id)
    assert card is not None
    assert card["phase_id"] is None
