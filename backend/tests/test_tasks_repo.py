from repository import phases_repo, tasks_repo


def _make_phase(conn, code="0", name="Faza 0"):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES (?, ?)", (code, name))
    conn.commit()
    return cursor.lastrowid


def test_create_assigns_sequential_order_index(conn):
    phase_id = _make_phase(conn)

    first_id = tasks_repo.create(conn, phase_id, "Pierwsze")
    second_id = tasks_repo.create(conn, phase_id, "Drugie")

    tasks = tasks_repo.list_by_phase(conn, phase_id)
    assert [t["id"] for t in tasks] == [first_id, second_id]
    assert [t["order_index"] for t in tasks] == [0, 1]


def test_order_index_is_independent_per_phase(conn):
    phase_a = _make_phase(conn, "a", "Faza A")
    phase_b = _make_phase(conn, "b", "Faza B")

    tasks_repo.create(conn, phase_a, "A1")
    tasks_repo.create(conn, phase_a, "A2")
    tasks_repo.create(conn, phase_b, "B1")

    b_tasks = tasks_repo.list_by_phase(conn, phase_b)
    assert [t["order_index"] for t in b_tasks] == [0]


def test_update_and_set_done(conn):
    phase_id = _make_phase(conn)
    task_id = tasks_repo.create(conn, phase_id, "Zadanie")

    tasks_repo.update_title(conn, task_id, "Nowy tytuł")
    tasks_repo.update_notes(conn, task_id, "notatka")
    tasks_repo.set_done(conn, task_id, True)

    task = tasks_repo.list_by_phase(conn, phase_id)[0]
    assert task["title"] == "Nowy tytuł"
    assert task["notes"] == "notatka"
    assert task["is_done"] == 1


def test_delete_removes_task(conn):
    phase_id = _make_phase(conn)
    task_id = tasks_repo.create(conn, phase_id, "Do usunięcia")

    tasks_repo.delete(conn, task_id)

    assert tasks_repo.list_by_phase(conn, phase_id) == []


def test_count_progress_per_phase_and_overall(conn):
    phase_a = _make_phase(conn, "a", "Faza A")
    phase_b = _make_phase(conn, "b", "Faza B")
    done_task = tasks_repo.create(conn, phase_a, "Zrobione")
    tasks_repo.create(conn, phase_a, "Niezrobione")
    tasks_repo.create(conn, phase_b, "Inne")
    tasks_repo.set_done(conn, done_task, True)

    assert tasks_repo.count_progress(conn, phase_a) == (1, 2)
    assert tasks_repo.count_progress(conn, phase_b) == (0, 1)
    assert tasks_repo.count_progress_overall(conn) == (1, 3)


def test_first_incomplete_empty_db(conn):
    assert tasks_repo.first_incomplete(conn) is None


def test_first_incomplete_skips_done_and_respects_order(conn):
    phase_b = _make_phase(conn, "b", "Faza B")
    conn.execute("UPDATE phases SET order_index = 1 WHERE id = ?", (phase_b,))
    phase_a = _make_phase(conn, "a", "Faza A")
    conn.commit()
    tasks_repo.create(conn, phase_b, "Z późnej fazy")
    done = tasks_repo.create(conn, phase_a, "Zrobione")
    tasks_repo.create(conn, phase_a, "Niezrobione")
    tasks_repo.set_done(conn, done, True)

    task = tasks_repo.first_incomplete(conn)

    assert task["title"] == "Niezrobione"
    assert task["phase_name"] == "Faza A"


def test_deleting_phase_cascades_tasks(conn):
    phase_id = _make_phase(conn)
    tasks_repo.create(conn, phase_id, "Zadanie")

    conn.execute("DELETE FROM phases WHERE id = ?", (phase_id,))
    conn.commit()

    count = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
    assert count == 0


def test_phases_list_all_ordered(conn):
    _make_phase(conn, "late", "Późna")
    conn.execute("UPDATE phases SET order_index = 5 WHERE code = 'late'")
    _make_phase(conn, "early", "Wczesna")
    conn.commit()

    phases = phases_repo.list_all(conn)
    assert [p["code"] for p in phases] == ["early", "late"]
