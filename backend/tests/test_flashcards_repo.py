from repository import flashcards_repo

# Stempel "tę kartę już widziałem". Większość testów tego pliku dotyczy rotacji
# Leitnera, a ta zaczyna się dopiero po przebiegu zapoznawczym - karta bez
# learned_at nie jest wymagalna, choćby jej termin wypadał na wczoraj.
LEARNED = "2026-01-08 20:00:00"


def test_create_and_get(conn):
    card_id = flashcards_repo.create(conn, "Przód", "Tył", None, "2026-01-10", LEARNED)

    card = flashcards_repo.get(conn, card_id)
    assert card["front"] == "Przód"
    assert card["back"] == "Tył"
    assert card["box"] == 1
    assert card["next_review_at"] == "2026-01-10"


def test_get_missing_returns_none(conn):
    assert flashcards_repo.get(conn, 9999) is None


def test_list_due_boundary_dates(conn):
    past = flashcards_repo.create(conn, "wczoraj", "x", None, "2026-01-09", LEARNED)
    today = flashcards_repo.create(conn, "dziś", "x", None, "2026-01-10", LEARNED)
    flashcards_repo.create(conn, "jutro", "x", None, "2026-01-11", LEARNED)

    due = flashcards_repo.list_due(conn, "2026-01-10")

    assert [c["id"] for c in due] == [past, today]


def test_count_due_and_count_by_box(conn):
    flashcards_repo.create(conn, "wczoraj", "x", None, "2026-01-09", LEARNED)
    flashcards_repo.create(conn, "dziś", "x", None, "2026-01-10", LEARNED)
    future = flashcards_repo.create(conn, "jutro", "x", None, "2026-01-11", LEARNED)
    flashcards_repo.update_schedule(conn, future, 3, "2026-01-14")

    assert flashcards_repo.count_due(conn, "2026-01-10") == 2
    assert flashcards_repo.count_by_box(conn) == {1: 2, 3: 1}


def test_cards_awaiting_intro_are_not_due(conn):
    flashcards_repo.create(conn, "poznana", "x", None, "2026-01-09", LEARNED)
    swieza = flashcards_repo.create(conn, "świeża", "x", None, "2026-01-09", None)

    # Termin obu wypadł wczoraj, ale świeża karta nie ma prawa trafić do
    # powtórek przed zapoznaniem - inaczej pierwszym pytaniem o coś, czego nigdy
    # nie widziałeś, byłoby "umiałeś?".
    assert [c["front"] for c in flashcards_repo.list_due(conn, "2026-01-10")] == [
        "poznana"
    ]
    assert flashcards_repo.count_due(conn, "2026-01-10") == 1
    assert [c["id"] for c in flashcards_repo.list_intro_queue(conn, 10)] == [swieza]
    assert flashcards_repo.count_intro_queue(conn) == 1
    # Wykres pudełek też pomija kolejkę zapoznawczą, choć formalnie siedzi ona
    # w pudełku 1.
    assert flashcards_repo.count_by_box(conn) == {1: 1}


def test_intro_queue_is_oldest_first_and_respects_limit(conn):
    pierwsza = flashcards_repo.create(conn, "1", "x", None, "2026-01-10", None)
    druga = flashcards_repo.create(conn, "2", "x", None, "2026-01-10", None)
    flashcards_repo.create(conn, "3", "x", None, "2026-01-10", None)

    # created_at ma rozdzielczość sekundy, więc trzy karty z jednego przebiegu
    # importu mają ten sam stempel - kolejność rozstrzyga id, i to jest celowe:
    # kolejka ma być stabilna między odświeżeniami, a nie losowa.
    assert [c["id"] for c in flashcards_repo.list_intro_queue(conn, 2)] == [
        pierwsza,
        druga,
    ]


def test_mark_learned_moves_card_into_rotation(conn):
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10", None)

    flashcards_repo.mark_learned(conn, card_id, LEARNED, 1, "2026-01-11")

    card = flashcards_repo.get(conn, card_id)
    assert card["learned_at"] == LEARNED
    assert card["box"] == 1
    assert card["next_review_at"] == "2026-01-11"
    assert flashcards_repo.count_intro_queue(conn) == 0
    assert [c["id"] for c in flashcards_repo.list_due(conn, "2026-01-11")] == [card_id]


def test_own_note_defaults_to_empty_and_is_editable(conn):
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10", LEARNED)
    assert flashcards_repo.get(conn, card_id)["own_note"] == ""

    flashcards_repo.update_own_note(
        conn, card_id, "moimi słowami: to po prostu średnia"
    )

    assert flashcards_repo.get(conn, card_id)["own_note"] == (
        "moimi słowami: to po prostu średnia"
    )

    # Wyczyszczenie notatki jest legalne - pusta to "jeszcze nie napisana".
    flashcards_repo.update_own_note(conn, card_id, "")

    assert flashcards_repo.get(conn, card_id)["own_note"] == ""


def test_update_content_and_schedule(conn):
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10", LEARNED)

    flashcards_repo.update_content(conn, card_id, "nowy przód", "nowy tył")
    flashcards_repo.update_schedule(conn, card_id, 3, "2026-01-14")

    card = flashcards_repo.get(conn, card_id)
    assert card["front"] == "nowy przód"
    assert card["back"] == "nowy tył"
    assert card["box"] == 3
    assert card["next_review_at"] == "2026-01-14"


def test_delete(conn):
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10", LEARNED)

    flashcards_repo.delete(conn, card_id)

    assert flashcards_repo.get(conn, card_id) is None
    assert flashcards_repo.list_all(conn) == []


def test_update_phase(conn):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.commit()
    phase_id = cursor.lastrowid
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10", LEARNED)

    flashcards_repo.update_phase(conn, card_id, phase_id)

    assert flashcards_repo.get(conn, card_id)["phase_id"] == phase_id

    flashcards_repo.update_phase(conn, card_id, None)

    assert flashcards_repo.get(conn, card_id)["phase_id"] is None


def test_update_phase_keeps_schedule_and_still_set_null_on_phase_delete(conn):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.commit()
    phase_id = cursor.lastrowid
    card_id = flashcards_repo.create(conn, "a", "b", None, "2026-01-10", LEARNED)
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
    card_id = flashcards_repo.create(conn, "a", "b", phase_id, "2026-01-10", LEARNED)

    conn.execute("DELETE FROM phases WHERE id = ?", (phase_id,))
    conn.commit()

    card = flashcards_repo.get(conn, card_id)
    assert card is not None
    assert card["phase_id"] is None
