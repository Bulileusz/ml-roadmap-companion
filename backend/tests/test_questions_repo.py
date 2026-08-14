from repository import question_attempts_repo, questions_repo


def _make_phase(conn):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.commit()
    return cursor.lastrowid


def test_create_and_list_by_phase(conn):
    phase_id = _make_phase(conn)

    first = questions_repo.create(conn, phase_id, "Pytanie 1", "concept")
    second = questions_repo.create(conn, phase_id, "Pytanie 2", "code")

    questions = questions_repo.list_by_phase(conn, phase_id)
    assert [q["id"] for q in questions] == [first, second]
    assert questions[0]["question_type"] == "concept"
    assert questions[1]["question_type"] == "code"


def test_update_text(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Stara treść", "concept")

    questions_repo.update_text(conn, question_id, "Nowa treść")

    question = questions_repo.list_by_phase(conn, phase_id)[0]
    assert question["question_text"] == "Nowa treść"
    # Typ nietknięty - settery są granularne.
    assert question["question_type"] == "concept"


def test_update_type(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Pytanie", "concept")

    questions_repo.update_type(conn, question_id, "code")

    question = questions_repo.list_by_phase(conn, phase_id)[0]
    assert question["question_type"] == "code"
    assert question["question_text"] == "Pytanie"


def test_update_phase_moves_question(conn):
    source_id = _make_phase(conn)
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('1', 'Faza 1')")
    conn.commit()
    target_id = cursor.lastrowid
    question_id = questions_repo.create(conn, source_id, "Pytanie", "concept")

    questions_repo.update_phase(conn, question_id, target_id)

    assert questions_repo.list_by_phase(conn, source_id) == []
    assert [q["id"] for q in questions_repo.list_by_phase(conn, target_id)] == [
        question_id
    ]


def test_update_phase_to_none_detaches_question(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Pytanie", "concept")

    questions_repo.update_phase(conn, question_id, None)

    assert questions_repo.list_by_phase(conn, phase_id) == []
    row = conn.execute(
        "SELECT phase_id FROM questions WHERE id = ?", (question_id,)
    ).fetchone()
    assert row["phase_id"] is None


def test_delete_question(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Pytanie", "concept")

    questions_repo.delete(conn, question_id)

    assert questions_repo.list_by_phase(conn, phase_id) == []


def test_attempts_ordered_newest_first_with_id_tiebreak(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Pytanie", "concept")

    # Podejścia zapisane w tej samej sekundzie - rozstrzyga id DESC.
    first = question_attempts_repo.create(conn, question_id, True)
    second = question_attempts_repo.create(conn, question_id, False)

    attempts = question_attempts_repo.list_by_question(conn, question_id)
    assert [a["id"] for a in attempts] == [second, first]
    assert [a["solved_independently"] for a in attempts] == [0, 1]


def test_count_overall_attempts(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Pytanie", "concept")

    assert question_attempts_repo.count_overall(conn) == (0, 0)

    question_attempts_repo.create(conn, question_id, True)
    question_attempts_repo.create(conn, question_id, False)
    question_attempts_repo.create(conn, question_id, True)

    assert question_attempts_repo.count_overall(conn) == (2, 3)


def test_deleting_question_cascades_attempts(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Pytanie", "concept")
    question_attempts_repo.create(conn, question_id, True)

    questions_repo.delete(conn, question_id)

    count = conn.execute("SELECT COUNT(*) FROM question_attempts").fetchone()[0]
    assert count == 0


def test_deleting_phase_sets_question_phase_id_null(conn):
    phase_id = _make_phase(conn)
    question_id = questions_repo.create(conn, phase_id, "Pytanie", "concept")

    conn.execute("DELETE FROM phases WHERE id = ?", (phase_id,))
    conn.commit()

    row = conn.execute(
        "SELECT phase_id FROM questions WHERE id = ?", (question_id,)
    ).fetchone()
    assert row is not None
    assert row["phase_id"] is None
