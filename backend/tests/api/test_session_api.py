from repository import questions_repo, tasks_repo
from services import session, spaced_repetition


def test_empty_session_on_a_freshly_seeded_database(client, seeded):
    plan = client.get("/api/session/today").json()

    assert plan["intro"] == []
    assert plan["reviews"] == []
    assert plan["questions"] == []
    assert plan["total_steps"] == 0
    # Zero kroków to zero minut, nie "minuta na rozkręcenie się".
    assert plan["estimated_minutes"] == 0
    assert plan["phase"]["code"] == "0"
    assert plan["next_task"]["title"].startswith("NumPy")


def test_session_orders_the_day_intro_reviews_questions(client, db, phase_id):
    spaced_repetition.create_card(db, "Świeża", "Tył", phase_id, needs_intro=True)
    spaced_repetition.create_card(db, "Poznana", "Tył", phase_id)
    questions_repo.create(db, phase_id, "Po co skalować cechy?", "concept")

    plan = client.get("/api/session/today").json()

    assert [card["front"] for card in plan["intro"]] == ["Świeża"]
    assert [card["front"] for card in plan["reviews"]] == ["Poznana"]
    assert [q["question_text"] for q in plan["questions"]] == ["Po co skalować cechy?"]
    assert plan["total_steps"] == 3
    # 20 s + 15 s + 90 s + minuta narzutu = 185 s, czyli 4 minuty w górę.
    assert plan["estimated_minutes"] == 4


def test_intro_queue_is_capped_per_session(client, db, phase_id):
    for index in range(session.INTROS_PER_SESSION + 3):
        spaced_repetition.create_card(
            db, f"Karta {index}", "Tył", phase_id, needs_intro=True
        )

    plan = client.get("/api/session/today").json()

    # Wgranie stu fiszek z content/ nie ma dać stu nowych kart na jeden wieczór.
    assert len(plan["intro"]) == session.INTROS_PER_SESSION


def test_reviews_are_capped_and_the_rest_is_reported_not_hidden(client, db, phase_id):
    for index in range(session.MAX_REVIEWS_PER_SESSION + 4):
        spaced_repetition.create_card(db, f"Karta {index}", "Tył", phase_id)

    plan = client.get("/api/session/today").json()

    assert len(plan["reviews"]) == session.MAX_REVIEWS_PER_SESSION
    # Sufit jest widoczną decyzją, a nie po cichu ukrytą zaległością.
    assert plan["reviews_remaining"] == 4


def test_questions_come_from_the_phase_you_are_actually_in(client, db, seeded):
    # Faza 0 domknięta w całości, więc sesja ma sięgać po pytania z fazy 1.
    first = seeded.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
    second = seeded.execute("SELECT id FROM phases WHERE code = '1'").fetchone()["id"]
    for task in tasks_repo.list_by_phase(db, first):
        tasks_repo.set_done(db, task["id"], True)
    questions_repo.create(db, first, "Z fazy 0", "concept")
    questions_repo.create(db, second, "Z fazy 1", "concept")

    plan = client.get("/api/session/today").json()

    assert plan["phase"]["code"] == "1"
    assert [q["question_text"] for q in plan["questions"]] == ["Z fazy 1"]


def test_untouched_questions_are_picked_before_recently_checked_ones(
    client, db, phase_id
):
    for index in range(session.QUESTIONS_PER_SESSION + 1):
        questions_repo.create(db, phase_id, f"Pytanie {index}", "concept")
    checked = questions_repo.list_by_phase(db, phase_id)[0]
    client.post(
        f"/api/questions/{checked['id']}/attempts", json={"solved_independently": True}
    )

    plan = client.get("/api/session/today").json()

    assert len(plan["questions"]) == session.QUESTIONS_PER_SESSION
    # Sprawdzone dziś wypada z kolejki na rzecz nietkniętych - losowanie
    # regularnie omijałoby pytania, których nigdy nie próbowałeś.
    assert checked["id"] not in [q["id"] for q in plan["questions"]]


def test_session_survives_a_fully_completed_roadmap(client, db, seeded):
    for phase in seeded.execute("SELECT id FROM phases").fetchall():
        for task in tasks_repo.list_by_phase(db, phase["id"]):
            tasks_repo.set_done(db, task["id"], True)
    last = seeded.execute("SELECT id FROM phases WHERE code = '4'").fetchone()["id"]
    questions_repo.create(db, last, "Z fazy projektowej", "concept")

    plan = client.get("/api/session/today").json()

    # Nauka nie kończy się na odhaczeniu roadmapy - pytania z ostatniej fazy
    # dalej mają sens, a next_task po prostu nie ma czego wskazać.
    assert plan["next_task"] is None
    assert plan["phase"]["code"] == "4"
    assert [q["question_text"] for q in plan["questions"]] == ["Z fazy projektowej"]


def test_session_does_not_write_anything(client, db, phase_id):
    spaced_repetition.create_card(db, "Świeża", "Tył", phase_id, needs_intro=True)

    before = db.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0]
    client.get("/api/session/today")
    client.get("/api/session/today")

    # Plan jest wyliczany, nie zapisywany: sesja przerwana w połowie nie gubi
    # zrobionej pracy i nie zostawia stanu do posprzątania.
    assert db.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0] == before
    assert db.execute("SELECT COUNT(*) FROM flashcards").fetchone()[0] == 1
