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


def test_list_for_session_puts_untouched_questions_first(conn):
    phase_id = _make_phase(conn)
    swierze = questions_repo.create(conn, phase_id, "Nigdy nie próbowane", "concept")
    dawno = questions_repo.create(conn, phase_id, "Dawno sprawdzane", "concept")
    niedawno = questions_repo.create(conn, phase_id, "Niedawno sprawdzane", "concept")

    conn.execute(
        "INSERT INTO question_attempts (question_id, attempted_at, "
        "solved_independently) VALUES (?, '2026-01-05 10:00:00', 1)",
        (dawno,),
    )
    conn.execute(
        "INSERT INTO question_attempts (question_id, attempted_at, "
        "solved_independently) VALUES (?, '2026-03-14 10:00:00', 1)",
        (niedawno,),
    )
    conn.commit()

    wybrane = questions_repo.list_for_session(conn, phase_id, 3)

    # Nietknięte przed sprawdzanymi, a wśród sprawdzanych - najdawniejsze.
    # Losowa trójka regularnie omijałaby pytanie, którego nigdy nie próbowałeś,
    # a to właśnie ono uczy najwięcej.
    assert [q["id"] for q in wybrane] == [swierze, dawno, niedawno]


def test_list_for_session_respects_limit_and_phase(conn):
    phase_id = _make_phase(conn)
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('1', 'Faza 1')")
    conn.commit()
    other_phase = cursor.lastrowid
    questions_repo.create(conn, phase_id, "Z fazy 0 - pierwsze", "concept")
    questions_repo.create(conn, phase_id, "Z fazy 0 - drugie", "concept")
    questions_repo.create(conn, other_phase, "Z fazy 1", "concept")

    wybrane = questions_repo.list_for_session(conn, phase_id, 1)

    assert len(wybrane) == 1
    assert wybrane[0]["phase_id"] == phase_id


def test_list_for_session_on_empty_phase_is_empty(conn):
    assert questions_repo.list_for_session(conn, _make_phase(conn), 3) == []
