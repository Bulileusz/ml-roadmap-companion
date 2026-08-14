from repository import activity_repo, tasks_repo


def test_phases_come_with_progress(client, seeded):
    response = client.get("/api/phases")

    assert response.status_code == 200
    phases = response.json()
    assert [entry["phase"]["code"] for entry in phases] == [
        "0",
        "1",
        "2",
        "2b",
        "3",
        "4",
    ]
    assert all(entry["done"] == 0 for entry in phases)
    assert all(entry["total"] > 0 for entry in phases)


def test_list_tasks_of_a_phase(client, phase_id):
    response = client.get(f"/api/phases/{phase_id}/tasks")

    assert response.status_code == 200
    tasks = response.json()
    assert tasks[0]["title"].startswith("NumPy")
    assert tasks[0]["is_done"] is False


def test_create_task(client, phase_id):
    response = client.post(
        "/api/tasks", json={"phase_id": phase_id, "title": "  Nowe zadanie  "}
    )

    assert response.status_code == 201
    # Białe znaki obcięte w kontrakcie, nie w interfejsie - ta sama reguła
    # obowiązuje każdego klienta.
    assert response.json()["title"] == "Nowe zadanie"


def test_blank_title_is_rejected(client, phase_id):
    response = client.post("/api/tasks", json={"phase_id": phase_id, "title": "   "})

    assert response.status_code == 422


def test_task_in_a_nonexistent_phase_is_rejected_by_the_database(client, seeded):
    response = client.post("/api/tasks", json={"phase_id": 9999, "title": "Sierotka"})

    # Klucz obcy pilnuje tego atomowo, więc nie dopytujemy bazy o istnienie
    # fazy przed każdym zapisem - pozwalamy jej odpowiedzieć.
    assert response.status_code == 400
    assert "odrzuciła" in response.json()["detail"]


def test_checking_a_task_off_writes_the_journal_entry(client, db, phase_id):
    task_id = tasks_repo.create(db, phase_id, "Broadcasting")

    response = client.patch(f"/api/tasks/{task_id}", json={"is_done": True})

    assert response.status_code == 200
    assert response.json()["is_done"] is True
    entry = activity_repo.list_recent(db)[0]
    assert entry["kind"] == activity_repo.KIND_TASK_DONE
    assert entry["detail"] == "Broadcasting"


def test_patch_without_state_change_does_not_pad_the_journal(client, db, phase_id):
    task_id = tasks_repo.create(db, phase_id, "Broadcasting")
    client.patch(f"/api/tasks/{task_id}", json={"is_done": True})

    # Front wysyła PATCH z pełnym stanem także przy zmianie tytułu; dziennik nie
    # ma się od tego zapełniać identycznymi wpisami.
    client.patch(f"/api/tasks/{task_id}", json={"is_done": True, "title": "Inny tytuł"})

    assert activity_repo.count_all(db) == 1
    assert tasks_repo.get(db, task_id)["title"] == "Inny tytuł"


def test_notes_can_be_cleared(client, db, phase_id):
    task_id = tasks_repo.create(db, phase_id, "Zadanie")
    client.patch(f"/api/tasks/{task_id}", json={"notes": "wnioski"})

    response = client.patch(f"/api/tasks/{task_id}", json={"notes": ""})

    # Pusty string to poprawna wartość ("wyczyść"), w odróżnieniu od pominięcia
    # pola, które znaczy "nie dotykaj".
    assert response.json()["notes"] == ""


def test_omitted_fields_are_left_alone(client, db, phase_id):
    task_id = tasks_repo.create(db, phase_id, "Zadanie")
    client.patch(f"/api/tasks/{task_id}", json={"notes": "wnioski"})

    response = client.patch(f"/api/tasks/{task_id}", json={"is_done": True})

    assert response.json()["notes"] == "wnioski"


def test_delete_task(client, db, phase_id):
    task_id = tasks_repo.create(db, phase_id, "Do skasowania")

    assert client.delete(f"/api/tasks/{task_id}").status_code == 204
    assert tasks_repo.get(db, task_id) is None
    assert client.delete(f"/api/tasks/{task_id}").status_code == 404


def test_missing_task_gives_a_readable_404(client, seeded):
    response = client.patch("/api/tasks/4242", json={"is_done": True})

    assert response.status_code == 404
    assert response.json()["detail"] == "Nie znaleziono: zadanie 4242."
