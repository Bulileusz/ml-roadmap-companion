from repository import activity_repo, flashcards_repo
from services import spaced_repetition


def test_create_flashcard_skips_the_intro_queue(client, phase_id):
    response = client.post(
        "/api/flashcards",
        json={
            "front": "Czym jest gradient?",
            "back": "Wektor pochodnych",
            "phase_id": phase_id,
        },
    )

    assert response.status_code == 201
    card = response.json()
    assert card["learned_at"] is not None
    assert card["own_note"] == ""
    assert card["box"] == 1
    # Ręcznie dopisana fiszka jest wymagalna od razu i nie idzie do zapoznania.
    assert client.get("/api/flashcards/intro").json() == []
    assert len(client.get("/api/flashcards/due").json()) == 1


def test_empty_back_is_rejected(client, seeded):
    response = client.post("/api/flashcards", json={"front": "Przód", "back": "  "})

    assert response.status_code == 422


def test_imported_card_waits_in_the_intro_queue(client, db):
    card_id = spaced_repetition.create_card(db, "Przód", "Tył", None, needs_intro=True)

    assert client.get("/api/flashcards/due").json() == []
    intro = client.get("/api/flashcards/intro").json()
    assert [card["id"] for card in intro] == [card_id]


def test_intro_endpoint_moves_the_card_into_rotation(client, db):
    card_id = spaced_repetition.create_card(db, "Przód", "Tył", None, needs_intro=True)

    response = client.post(f"/api/flashcards/{card_id}/intro")

    assert response.status_code == 200
    assert response.json()["learned_at"] is not None
    assert client.get("/api/flashcards/intro").json() == []
    assert activity_repo.list_recent(db)[0]["kind"] == activity_repo.KIND_CARD_INTRO


def test_review_promotes_the_box_and_returns_the_card(client, db):
    card_id = spaced_repetition.create_card(db, "Przód", "Tył", None)

    response = client.post(f"/api/flashcards/{card_id}/review", json={"correct": True})

    assert response.status_code == 200
    # Karta po zmianie wraca w odpowiedzi, więc front pokazuje awans pudełka
    # bez dopytywania o listę.
    assert response.json()["box"] == 2
    assert activity_repo.list_recent(db)[0]["kind"] == activity_repo.KIND_CARD_REVIEW


def test_failed_review_resets_to_the_first_box(client, db):
    card_id = spaced_repetition.create_card(db, "Przód", "Tył", None)
    client.post(f"/api/flashcards/{card_id}/review", json={"correct": True})
    client.post(f"/api/flashcards/{card_id}/review", json={"correct": True})

    response = client.post(f"/api/flashcards/{card_id}/review", json={"correct": False})

    assert response.json()["box"] == 1


def test_patching_only_the_back_leaves_the_front_alone(client, db):
    card_id = spaced_repetition.create_card(db, "Przód", "Tył", None)

    response = client.patch(f"/api/flashcards/{card_id}", json={"back": "Nowy tył"})

    assert response.json() == {**response.json(), "front": "Przód", "back": "Nowy tył"}


def test_own_note_can_be_written_and_cleared(client, db):
    card_id = spaced_repetition.create_card(db, "Przód", "Tył", None)

    written = client.patch(
        f"/api/flashcards/{card_id}", json={"own_note": "moimi słowami: to średnia"}
    )
    assert written.json()["own_note"] == "moimi słowami: to średnia"

    cleared = client.patch(f"/api/flashcards/{card_id}", json={"own_note": ""})
    assert cleared.json()["own_note"] == ""


def test_phase_can_be_detached_with_an_explicit_null(client, db, phase_id):
    card_id = spaced_repetition.create_card(db, "Przód", "Tył", phase_id)

    response = client.patch(f"/api/flashcards/{card_id}", json={"phase_id": None})

    # null znaczy "odepnij", a pominięcie pola - "nie dotykaj". Bez tego
    # rozróżnienia nie da się odpiąć fiszki od fazy przez PATCH.
    assert response.json()["phase_id"] is None


def test_omitting_phase_id_keeps_the_current_phase(client, db, phase_id):
    card_id = spaced_repetition.create_card(db, "Przód", "Tył", phase_id)

    response = client.patch(f"/api/flashcards/{card_id}", json={"front": "Inny przód"})

    assert response.json()["phase_id"] == phase_id


def test_delete_flashcard(client, db):
    card_id = spaced_repetition.create_card(db, "Przód", "Tył", None)

    assert client.delete(f"/api/flashcards/{card_id}").status_code == 204
    assert flashcards_repo.get(db, card_id) is None


def test_operations_on_a_missing_card_give_404(client, seeded):
    assert (
        client.post("/api/flashcards/999/review", json={"correct": True}).status_code
        == 404
    )
    assert client.post("/api/flashcards/999/intro").status_code == 404
    assert client.patch("/api/flashcards/999", json={"front": "x"}).status_code == 404
    assert client.delete("/api/flashcards/999").status_code == 404
