from repository import flashcards_repo, questions_repo, resources_repo


def test_status_reports_files_next_to_what_is_already_imported(client, seeded):
    status = client.get("/api/content/status").json()

    # Liczby z prawdziwego content/ w repo - tu sprawdzamy kształt i to, że
    # katalog jest w ogóle widziany (ścieżki pilnuje tests/test_paths.py).
    assert status["available"]["flashcards"] > 0
    assert status["available"]["questions"] > 0
    assert status["available"]["resources"] > 0
    # Przed pierwszym importem zera, nie pusty słownik: obie połówki wiersza na
    # stronie Dane mówią tym samym słownikiem, żeby dały się zestawić.
    assert status["imported"] == {
        "flashcards": 0,
        "questions": 0,
        "resources": 0,
        "tasks": 0,
    }


def test_sync_imports_the_repo_content_and_is_idempotent(client, db, seeded):
    first = client.post("/api/content/sync").json()

    assert first["flashcards_added"] > 0
    assert first["questions_added"] > 0
    assert first["resources_added"] > 0
    assert first["warnings"] == []
    # Zaimportowane fiszki czekają na zapoznanie, nie na powtórkę.
    assert flashcards_repo.count_intro_queue(db) == first["flashcards_added"]
    assert flashcards_repo.count_due(db, "2100-01-01") == 0

    second = client.post("/api/content/sync").json()

    assert second["flashcards_added"] == 0
    assert second["skipped"] > 0
    assert flashcards_repo.count_intro_queue(db) == first["flashcards_added"]


def test_sync_does_not_resurrect_what_you_deleted(client, db, seeded):
    client.post("/api/content/sync")
    card = flashcards_repo.list_all(db)[0]
    client.delete(f"/api/flashcards/{card['id']}")
    before = len(flashcards_repo.list_all(db))

    client.post("/api/content/sync")

    # Ewidencja content_imports pamięta, że pozycja już kiedyś wjechała.
    assert len(flashcards_repo.list_all(db)) == before


def test_status_after_sync_shows_what_landed(client, db, seeded):
    client.post("/api/content/sync")

    status = client.get("/api/content/status").json()

    phase_id = db.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
    assert status["imported"]["flashcards"] == status["available"]["flashcards"]
    assert status["imported"]["resources"] == status["available"]["resources"]
    assert questions_repo.list_by_phase(db, phase_id)
    assert resources_repo.list_by_phase(db, phase_id)
