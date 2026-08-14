from repository import activity_repo, questions_repo


def test_questions_come_with_their_independence_stats(client, db, phase_id):
    question_id = questions_repo.create(db, phase_id, "Czym jest bias?", "concept")
    client.post(
        f"/api/questions/{question_id}/attempts", json={"solved_independently": True}
    )
    client.post(
        f"/api/questions/{question_id}/attempts", json={"solved_independently": False}
    )

    response = client.get("/api/questions", params={"phase_id": phase_id})

    assert response.status_code == 200
    question = response.json()[0]
    # Statystyki w tej samej odpowiedzi: faza z dwunastoma pytaniami nie ma
    # kosztować dwunastu dodatkowych round-tripów.
    assert question["stats"] == {"independent": 1, "total": 2, "pct": 50.0}


def test_question_without_attempts_reports_zeros(client, db, phase_id):
    questions_repo.create(db, phase_id, "Nietknięte", "concept")

    stats = client.get("/api/questions", params={"phase_id": phase_id}).json()[0][
        "stats"
    ]

    assert stats == {"independent": 0, "total": 0, "pct": 0.0}


def test_create_question_defaults_to_a_concept_without_an_answer(client, phase_id):
    response = client.post(
        "/api/questions",
        json={"phase_id": phase_id, "question_text": "Po co skalować cechy?"},
    )

    assert response.status_code == 201
    assert response.json()["question_type"] == "concept"
    # Pusta odpowiedź to legalny stan "jeszcze nie napisana" - po tym import
    # z content/ rozpoznaje, że wolno ją uzupełnić.
    assert response.json()["answer"] == ""


def test_unknown_question_type_is_rejected(client, phase_id):
    response = client.post(
        "/api/questions",
        json={"phase_id": phase_id, "question_text": "Coś", "question_type": "essay"},
    )

    assert response.status_code == 422


def test_attempt_is_logged_and_returns_the_recalculated_stats(client, db, phase_id):
    question_id = questions_repo.create(db, phase_id, "Czym jest bias?", "concept")

    response = client.post(
        f"/api/questions/{question_id}/attempts", json={"solved_independently": True}
    )

    assert response.status_code == 201
    assert response.json() == {"independent": 1, "total": 1, "pct": 100.0}
    entry = activity_repo.list_recent(db)[0]
    assert entry["kind"] == activity_repo.KIND_QUESTION_ATTEMPT
    assert entry["detail"] == "Czym jest bias?"


def test_attempt_history_is_newest_first(client, db, phase_id):
    question_id = questions_repo.create(db, phase_id, "Pytanie", "concept")
    db.execute(
        "INSERT INTO question_attempts (question_id, attempted_at, "
        "solved_independently) VALUES (?, '2026-03-01 10:00:00', 1), "
        "(?, '2026-03-10 10:00:00', 0)",
        (question_id, question_id),
    )
    db.commit()

    attempts = client.get(f"/api/questions/{question_id}/attempts").json()

    assert [a["attempted_at"] for a in attempts] == [
        "2026-03-10 10:00:00",
        "2026-03-01 10:00:00",
    ]
    assert attempts[0]["solved_independently"] is False


def test_deleting_a_question_takes_its_attempts_but_leaves_the_journal(
    client, db, phase_id
):
    question_id = questions_repo.create(db, phase_id, "Do skasowania", "concept")
    client.post(
        f"/api/questions/{question_id}/attempts", json={"solved_independently": True}
    )

    assert client.delete(f"/api/questions/{question_id}").status_code == 204

    assert db.execute("SELECT COUNT(*) FROM question_attempts").fetchone()[0] == 0
    # activity_log.ref_id celowo nie jest kluczem obcym - dziennik, który da się
    # wyczyścić kasując pytanie, nie jest dziennikiem.
    assert activity_repo.list_recent(db)[0]["detail"] == "Do skasowania"


def test_moving_a_question_to_another_phase(client, db, seeded, phase_id):
    question_id = questions_repo.create(db, phase_id, "Pytanie", "concept")
    other = seeded.execute("SELECT id FROM phases WHERE code = '1'").fetchone()["id"]

    response = client.patch(f"/api/questions/{question_id}", json={"phase_id": other})

    assert response.json()["phase_id"] == other
    assert client.get("/api/questions", params={"phase_id": phase_id}).json() == []
