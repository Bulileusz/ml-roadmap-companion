import pytest

from repository import questions_repo, resources_repo, tasks_repo
from services import session, spaced_repetition


def unlock_questions(db, phase_id):
    """Zdejmuje próg gotowości: pytania fazy wchodzą po ośmiu poznanych fiszkach.

    Karty odsuwamy w przyszłość, bo poznana fiszka z terminem na dziś wpadłaby
    do powtórek i przestawiła asercje o kolejce - a te testy sprawdzają dobór
    pytań, nie rotację Leitnera.
    """
    for index in range(session.QUESTIONS_UNLOCK_AFTER_LEARNED):
        spaced_repetition.create_card(db, f"Tło {index}", "Tył", phase_id)
    db.execute(
        "UPDATE flashcards SET next_review_at = '2099-01-01' WHERE front LIKE 'Tło %'"
    )
    db.commit()


def test_empty_session_on_a_freshly_seeded_database(client, seeded):
    plan = client.get("/api/session/today").json()

    assert plan["intro"] == []
    assert plan["reviews"] == []
    assert plan["questions"] == []
    # Nie zero: dopóki roadmapa ma niedokończone zadanie, sesja ma co zapowiedzieć.
    # "Nic do nauki dziś" i "nie masz nic do roboty" to dwa różne stany.
    assert plan["total_steps"] == 1
    # 45 s odprawy + minuta na rozkręcenie się = 105 s, czyli 2 minuty w górę.
    assert plan["estimated_minutes"] == 2
    assert plan["phase"]["code"] == "0"
    assert plan["next_task"]["title"] == "Postaw środowisko"
    assert plan["briefing"]["task"]["title"] == "Postaw środowisko"


def test_session_orders_the_day_intro_reviews_questions(client, db, phase_id):
    unlock_questions(db, phase_id)
    spaced_repetition.create_card(db, "Świeża", "Tył", phase_id, needs_intro=True)
    spaced_repetition.create_card(db, "Poznana", "Tył", phase_id)
    questions_repo.create(db, phase_id, "Po co skalować cechy?", "concept")

    plan = client.get("/api/session/today").json()

    assert [card["front"] for card in plan["intro"]] == ["Świeża"]
    assert [card["front"] for card in plan["reviews"]] == ["Poznana"]
    assert [q["question_text"] for q in plan["questions"]] == ["Po co skalować cechy?"]
    # Cztery, nie trzy: odprawa jest krokiem sesji, choć samo zadanie robisz
    # poza aplikacją.
    assert plan["total_steps"] == 4
    # 45 s + 20 s + 15 s + 90 s + minuta narzutu = 230 s, czyli 4 minuty w górę.
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
    unlock_questions(db, second)
    questions_repo.create(db, first, "Z fazy 0", "concept")
    questions_repo.create(db, second, "Z fazy 1", "concept")

    plan = client.get("/api/session/today").json()

    assert plan["phase"]["code"] == "1"
    assert [q["question_text"] for q in plan["questions"]] == ["Z fazy 1"]


def test_untouched_questions_are_picked_before_recently_checked_ones(
    client, db, phase_id
):
    unlock_questions(db, phase_id)
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
    unlock_questions(db, last)
    questions_repo.create(db, last, "Z fazy projektowej", "concept")

    plan = client.get("/api/session/today").json()

    # Nauka nie kończy się na odhaczeniu roadmapy - pytania z ostatniej fazy
    # dalej mają sens, a next_task po prostu nie ma czego wskazać.
    assert plan["next_task"] is None
    assert plan["phase"]["code"] == "4"
    assert [q["question_text"] for q in plan["questions"]] == ["Z fazy projektowej"]
    # Nie ma czego zapowiedzieć, więc sesja zaczyna się od powtórek jak dawniej.
    assert plan["briefing"] is None


def test_briefing_carries_the_task_you_are_actually_on(client, db, seeded, phase_id):
    tasks_repo.update_notes(
        db,
        tasks_repo.list_by_phase(db, phase_id)[0]["id"],
        "Załóż venv.\nGotowe, gdy import numpy przechodzi.",
    )

    brief = client.get("/api/session/today").json()["briefing"]

    assert brief["task"]["title"] == "Postaw środowisko"
    assert brief["task"]["phase_id"] == phase_id
    # Notatka jest sednem odprawy - bez niej ekran pokazuje sam tytuł.
    assert "Gotowe, gdy" in brief["task"]["notes"]
    # Licznik mówi, który to punkt fazy: "zadanie 1 z 2".
    assert (brief["done"], brief["total"]) == (0, 2)


def test_briefing_and_questions_come_from_the_same_phase(client, db, seeded):
    """Zadanie i reszta sesji nie mogą się rozjechać na różne fazy.

    `current_phase` zwraca pierwszą fazę z niedokończonymi zadaniami, a
    `first_incomplete` pierwsze niedokończone zadanie w tej samej kolejności -
    więc rozjazd jest niemożliwy. Test przybija tę niezmienniczość, żeby
    zmiana sortowania w którymkolwiek z nich nie przeszła po cichu.
    """
    first = seeded.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
    for task in tasks_repo.list_by_phase(db, first):
        tasks_repo.set_done(db, task["id"], True)

    plan = client.get("/api/session/today").json()

    assert plan["briefing"]["task"]["phase_id"] == plan["phase"]["id"]
    assert plan["phase"]["code"] == "1"


def test_briefing_materials_prefer_started_and_skip_finished(
    client, db, seeded, phase_id
):
    started = resources_repo.create(db, phase_id, "Zaczęty")
    resources_repo.create(db, phase_id, "Nietknięty")
    finished = resources_repo.create(db, phase_id, "Przerobiony")
    resources_repo.update_status(db, started, resources_repo.STATUS_IN_PROGRESS)
    resources_repo.update_status(db, finished, resources_repo.STATUS_DONE)

    brief = client.get("/api/session/today").json()["briefing"]

    # Zaczęty przed nietkniętym: materiał raz otwarty ma zostać domknięty,
    # zanim otworzysz trzeci. Przerobiony nie wraca.
    assert [m["title"] for m in brief["materials"]] == ["Zaczęty", "Nietknięty"]


def test_briefing_materials_are_capped(client, db, seeded, phase_id):
    for index in range(session.MATERIALS_PER_BRIEFING + 2):
        resources_repo.create(db, phase_id, f"Materiał {index}")

    brief = client.get("/api/session/today").json()["briefing"]

    # Trzy mieszczą się pod zadaniem; przy pięciu to już ekran Zasobów.
    assert len(brief["materials"]) == session.MATERIALS_PER_BRIEFING


def test_briefing_survives_a_phase_without_materials(client, db, seeded):
    brief = client.get("/api/session/today").json()["briefing"]

    # Zadanie zostaje, blok "skąd to wziąć" po prostu znika.
    assert brief["materials"] == []
    assert brief["task"]["title"] == "Postaw środowisko"


def test_session_does_not_write_anything(client, db, phase_id):
    spaced_repetition.create_card(db, "Świeża", "Tył", phase_id, needs_intro=True)

    before = db.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0]
    client.get("/api/session/today")
    client.get("/api/session/today")

    # Plan jest wyliczany, nie zapisywany: sesja przerwana w połowie nie gubi
    # zrobionej pracy i nie zostawia stanu do posprzątania.
    assert db.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0] == before
    assert db.execute("SELECT COUNT(*) FROM flashcards").fetchone()[0] == 1


def test_questions_carry_their_independence_history(client, db, phase_id):
    unlock_questions(db, phase_id)
    question_id = questions_repo.create(db, phase_id, "Czym jest bias?", "concept")
    for solo in (True, True, False):
        db.execute(
            "INSERT INTO question_attempts (question_id, attempted_at, "
            "solved_independently) VALUES (?, '2026-03-01 10:00:00', ?)",
            (question_id, int(solo)),
        )
    db.commit()

    plan = client.get("/api/session/today").json()

    # Wskaźnik jedzie razem z pytaniem, bo sesja pokazuje go PRZED odpowiedzią:
    # „samodzielnie 2 z 3" mówi, czy z tym pytaniem masz historię wpadek.
    assert plan["questions"][0]["stats"] == {
        "independent": 2,
        "total": 3,
        "pct": pytest.approx(66.67, abs=0.01),
    }


def test_untouched_question_reports_a_clean_slate(client, db, phase_id):
    unlock_questions(db, phase_id)
    questions_repo.create(db, phase_id, "Nietknięte", "concept")

    stats = client.get("/api/session/today").json()["questions"][0]["stats"]

    assert stats == {"independent": 0, "total": 0, "pct": 0.0}


def test_questions_wait_until_you_have_seen_the_material(client, db, phase_id):
    """Próg gotowości: bez poznanych fiszek pytania nie wchodzą do sesji.

    To ta sama zasada, którą fiszki dostały wraz z przebiegiem zapoznawczym:
    pierwszy kontakt z materiałem nie ma być zapisem porażki. Bez progu świeża
    baza podsuwała trzy pytania z fazy, w której nie widziałeś ani jednej karty.
    """
    for index in range(session.QUESTIONS_UNLOCK_AFTER_LEARNED - 1):
        spaced_repetition.create_card(db, f"Tło {index}", "Tył", phase_id)
    questions_repo.create(db, phase_id, "Po co skalować cechy?", "concept")

    plan = client.get("/api/session/today").json()

    assert plan["questions"] == []
    # Powód jedzie do frontu: brak pytań bez wyjaśnienia wygląda jak usterka.
    assert plan["questions_gate"] == {
        "learned": session.QUESTIONS_UNLOCK_AFTER_LEARNED - 1,
        "needed": session.QUESTIONS_UNLOCK_AFTER_LEARNED,
    }


def test_questions_unlock_at_the_threshold(client, db, phase_id):
    unlock_questions(db, phase_id)
    questions_repo.create(db, phase_id, "Po co skalować cechy?", "concept")

    plan = client.get("/api/session/today").json()

    assert [q["question_text"] for q in plan["questions"]] == ["Po co skalować cechy?"]
    assert plan["questions_gate"] is None


def test_deferred_question_does_not_come_back_tomorrow(client, db, phase_id):
    unlock_questions(db, phase_id)
    questions_repo.create(db, phase_id, "Odłożone", "concept")
    questions_repo.create(db, phase_id, "Zwykłe", "concept")
    deferred = questions_repo.list_by_phase(db, phase_id)[0]

    assert client.post(f"/api/questions/{deferred['id']}/defer").status_code == 204
    plan = client.get("/api/session/today").json()

    # "Jeszcze nie umiem" ma odłożyć pytanie na kilka dni. Bez tego wracałoby
    # nazajutrz na sam przód kolejki, bo nie ma ani jednego podejścia.
    assert [q["question_text"] for q in plan["questions"]] == ["Zwykłe"]


def test_deferring_is_not_an_attempt(client, db, phase_id):
    unlock_questions(db, phase_id)
    questions_repo.create(db, phase_id, "Odłożone", "concept")
    question = questions_repo.list_by_phase(db, phase_id)[0]

    client.post(f"/api/questions/{question['id']}/defer")

    # Wskaźnik samodzielności mierzy, jak często radzisz sobie sam - a nie ile
    # razy trafiłeś na pytanie za wcześnie. Odroczenie nie może go ruszyć.
    attempts = client.get(f"/api/questions/{question['id']}/attempts").json()
    assert attempts == []
    dashboard = client.get("/api/dashboard").json()
    assert dashboard["independence"] == {"independent": 0, "total": 0, "pct": 0.0}
    # Zero XP: gdyby płaciło, byłby to tańszy sposób na punkty niż odpowiadanie.
    assert dashboard["progression"]["xp"] == 0


def test_deferring_an_unknown_question_is_404(client, seeded):
    assert client.post("/api/questions/999/defer").status_code == 404
