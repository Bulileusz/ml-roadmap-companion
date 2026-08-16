from repository import questions_repo, tasks_repo
from services import spaced_repetition


def test_dashboard_on_a_freshly_seeded_database(client, seeded):
    data = client.get("/api/dashboard").json()

    assert data["roadmap"]["done"] == 0
    # Roadmapa fixture'u `seeded`, nie seeda - zadania wchodzą z content/tasks/.
    assert data["roadmap"]["total"] == 12
    assert data["due_count"] == 0
    assert data["intro_count"] == 0
    assert data["independence"] == {"independent": 0, "total": 0, "pct": 0.0}
    assert data["streak"] == {"current": 0, "longest": 0, "active_days": 0}
    assert data["progression"]["level"] == 1
    # Pierwsze niedokończone zadanie z pierwszej fazy - to jest "co dziś robię".
    assert data["next_task"]["title"] == "Postaw środowisko"
    assert data["next_task"]["phase_name"].startswith("Faza 0")


def test_boxes_are_a_list_covering_every_box_in_order(client, seeded):
    boxes = client.get("/api/dashboard").json()["boxes"]

    # Lista, nie słownik: klucze JSON i tak byłyby stringami, a lista trzyma
    # kolejność pudełek bez sortowania na froncie.
    assert [entry["box"] for entry in boxes] == [1, 2, 3, 4, 5]
    assert all(entry["count"] == 0 for entry in boxes)


def test_intro_queue_is_counted_separately_from_reviews(client, db, seeded):
    spaced_repetition.create_card(db, "Świeża", "Tył", None, needs_intro=True)
    spaced_repetition.create_card(db, "Poznana", "Tył", None)

    data = client.get("/api/dashboard").json()

    # "Poznaj nowe" i "sprawdź, czy pamiętasz" to dwa różne rodzaje pracy -
    # sklejenie ich w jedną liczbę zaciemniałoby, co dziś czeka.
    assert data["intro_count"] == 1
    assert data["due_count"] == 1
    assert data["cards_total"] == 1


def test_xp_grows_with_learning(client, db, phase_id):
    task_id = tasks_repo.create(db, phase_id, "Zadanie")
    client.patch(f"/api/tasks/{task_id}", json={"is_done": True})
    question_id = questions_repo.create(db, phase_id, "Pytanie", "concept")
    client.post(
        f"/api/questions/{question_id}/attempts", json={"solved_independently": True}
    )

    progression = client.get("/api/dashboard").json()["progression"]

    # 10 za zadanie + 5 za podejście + 3 premii za samodzielność
    assert progression["xp"] == 18
    assert progression["level"] == 1
    assert progression["xp_for_next_level"] == 50


def test_achievements_are_listed_with_hints(client, seeded):
    achievements = client.get("/api/achievements").json()

    assert {a["id"] for a in achievements} >= {"streak-7", "mastered-1", "phase-2b"}
    assert not any(a["unlocked"] for a in achievements)
    assert all(a["hint"] and a["icon"] for a in achievements)


def test_health_endpoint(client, seeded):
    assert client.get("/api/health").json() == {"status": "ok"}
