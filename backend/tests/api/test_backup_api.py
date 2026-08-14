import json

from repository import tasks_repo


def _upload(client, path, payload):
    return client.post(
        path,
        files={
            "file": (
                "export.json",
                json.dumps(payload).encode("utf-8"),
                "application/json",
            )
        },
    )


def test_export_comes_as_a_named_download(client, seeded):
    response = client.get("/api/backup/export")

    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    assert "roadmap-export-" in response.headers["content-disposition"]
    # Nagłówek musi być widoczny dla JS-u, inaczej fetch() nie zna nazwy pliku.
    assert "Content-Disposition" in response.headers["access-control-expose-headers"]
    payload = response.json()
    assert set(payload["tables"]) >= {"phases", "tasks", "flashcards"}
    assert len(payload["tables"]["phases"]) == 6


def test_preview_summarizes_before_anything_is_overwritten(client, db, seeded):
    original = client.get("/api/backup/export").json()
    tasks_repo.create(db, 1, "Zadanie dodane po eksporcie")

    preview = _upload(client, "/api/backup/preview", original).json()

    assert preview["compatible"] is True
    assert preview["problem"] is None
    assert preview["summary"]["phases"] == 6
    assert preview["exported_at"]
    # Podgląd nie może niczego dotknąć - użytkownik jeszcze się nie zgodził.
    assert tasks_repo.get(db, tasks_repo.list_by_phase(db, 1)[-1]["id"]) is not None


def test_preview_explains_why_a_newer_file_is_refused(client, db, seeded):
    payload = client.get("/api/backup/export").json()
    payload["schema_version"] = 999

    preview = _upload(client, "/api/backup/preview", payload).json()

    # Problem pokazujemy ZAMIAST przycisku "nadpisz", a nie po jego kliknięciu.
    assert preview["compatible"] is False
    assert "nowszej wersji" in preview["problem"]


def test_safety_copy_lands_next_to_the_database_being_overwritten(
    client, db, seeded, tmp_path
):
    exported = client.get("/api/backup/export").json()

    result = _upload(client, "/api/backup/import", exported).json()

    # Ścieżka z połączenia, nie ze stałej DB_PATH: wersja ze stałą sypała
    # śmieciowe .bak-* obok prawdziwego data/roadmap.db przy każdym takim teście.
    from pathlib import Path

    assert Path(result["backup_path"]).parent == tmp_path
    assert Path(result["backup_path"]).exists()
    assert list(tmp_path.glob("api.db.bak-*"))


def test_roundtrip_restores_the_state_and_leaves_a_safety_copy(client, db, seeded):
    task_id = tasks_repo.create(db, 1, "Zadanie do odzyskania")
    exported = client.get("/api/backup/export").json()
    tasks_repo.delete(db, task_id)
    assert tasks_repo.get(db, task_id) is None

    response = _upload(client, "/api/backup/import", exported)

    assert response.status_code == 200
    result = response.json()
    assert result["summary"]["tasks"] == len(exported["tables"]["tasks"])
    # id zachowane, więc relacje między tabelami przetrwały przeniesienie.
    restored = tasks_repo.get(db, task_id)
    assert restored["title"] == "Zadanie do odzyskania"
    assert ".bak-" in result["backup_path"]


def test_import_of_a_newer_schema_is_rejected_with_400(client, seeded):
    payload = client.get("/api/backup/export").json()
    payload["schema_version"] = 999

    response = _upload(client, "/api/backup/import", payload)

    assert response.status_code == 400
    assert "nowszej wersji" in response.json()["detail"]


def test_import_of_garbage_is_rejected_before_it_touches_the_database(
    client, db, seeded
):
    before = len(tasks_repo.list_by_phase(db, 1))

    response = client.post(
        "/api/backup/import",
        files={"file": ("export.json", b"to nie jest json", "application/json")},
    )

    assert response.status_code == 400
    assert len(tasks_repo.list_by_phase(db, 1)) == before


def test_import_of_a_json_array_is_rejected(client, seeded):
    response = client.post(
        "/api/backup/import",
        files={"file": ("export.json", b"[1, 2, 3]", "application/json")},
    )

    assert response.status_code == 400
    assert "obiektu JSON" in response.json()["detail"]
