from repository import activity_repo, resources_repo


def test_create_resource_defaults_to_todo(client, phase_id):
    response = client.post(
        "/api/resources",
        json={
            "phase_id": phase_id,
            "title": "ISLR",
            "url": "https://www.statlearning.com/",
            "kind": "book",
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "todo"
    assert response.json()["kind"] == "book"


def test_unknown_kind_is_rejected_by_the_contract(client, phase_id):
    response = client.post(
        "/api/resources", json={"phase_id": phase_id, "title": "Coś", "kind": "podcast"}
    )

    # W bazie nie ma CHECK-a na kind (lista rośnie szybciej niż migracje), ale
    # kontrakt HTTP go pilnuje - literówka w rodzaju ma być widoczna od razu.
    assert response.status_code == 422


def test_only_finishing_a_resource_lands_in_the_journal(client, db, phase_id):
    resource_id = resources_repo.create(db, phase_id, "ISLR")

    client.patch(f"/api/resources/{resource_id}", json={"status": "in_progress"})
    assert activity_repo.count_all(db) == 0

    client.patch(f"/api/resources/{resource_id}", json={"status": "done"})

    entry = activity_repo.list_recent(db)[0]
    assert entry["kind"] == activity_repo.KIND_RESOURCE_DONE
    assert entry["detail"] == "ISLR"


def test_patching_the_url_leaves_the_description_alone(client, db, phase_id):
    resource_id = resources_repo.create(
        db, phase_id, "ISLR", "https://old", "book", "rozdziały 2-4"
    )

    response = client.patch(
        f"/api/resources/{resource_id}", json={"url": "https://new"}
    )

    assert response.json()["url"] == "https://new"
    assert response.json()["detail"] == "rozdziały 2-4"


def test_resources_are_listed_per_phase_in_insertion_order(client, db, phase_id):
    resources_repo.create(db, phase_id, "Pierwszy")
    resources_repo.create(db, phase_id, "Drugi")

    titles = [
        r["title"]
        for r in client.get("/api/resources", params={"phase_id": phase_id}).json()
    ]

    assert titles == ["Pierwszy", "Drugi"]


def test_delete_resource(client, db, phase_id):
    resource_id = resources_repo.create(db, phase_id, "Do skasowania")

    assert client.delete(f"/api/resources/{resource_id}").status_code == 204
    assert resources_repo.get(db, resource_id) is None
    assert client.delete(f"/api/resources/{resource_id}").status_code == 404
