import pytest

from repository import content_imports_repo, phases_repo, tasks_repo
from services import content


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


# --- Import roadmapy z content/tasks/ -------------------------------------
# Zadania weszły w ten sam tryb co fiszki, pytania i materiały: addytywnie,
# po kluczu, bez wskrzeszania skasowanych. Zestaw przypadków jest ten sam,
# co w test_resources.py - to ta sama umowa, więc ma być tak samo pilnowana.


@pytest.fixture
def content_root(tmp_path):
    for name in ("flashcards", "questions", "resources", "tasks"):
        (tmp_path / name).mkdir()
    return tmp_path


def _write_tasks(root, name, text):
    (root / "tasks" / name).write_text(text, encoding="utf-8")


def test_sync_imports_tasks_with_notes(conn, content_root):
    phase_id = _make_phase(conn)
    _write_tasks(
        content_root,
        "0-python.md",
        "# Faza 0\n\n"
        "## Postaw środowisko\n"
        "Załóż venv przez uv.\n"
        "Gotowe, gdy import numpy przechodzi.\n\n"
        "## Przećwicz broadcasting\n"
        "Napisz skrypt na pięciu kształtach.\n",
    )

    result = content.sync(conn, content_root)

    assert result.tasks_added == 2
    tasks = tasks_repo.list_by_phase(conn, phase_id)
    assert [t["title"] for t in tasks] == [
        "Postaw środowisko",
        "Przećwicz broadcasting",
    ]
    # Notatka niesie "co zrobić" i "Gotowe, gdy" - bez niej odprawa jest pusta.
    assert tasks[0]["notes"].startswith("Załóż venv")
    assert "Gotowe, gdy" in tasks[0]["notes"]
    # Kolejność z pliku jest kolejnością nauki, więc musi przetrwać import.
    assert [t["order_index"] for t in tasks] == [0, 1]


def test_task_sync_is_idempotent(conn, content_root):
    _make_phase(conn)
    _write_tasks(content_root, "0-python.md", "## Jedyne\nOpis.\n")

    content.sync(conn, content_root)
    second = content.sync(conn, content_root)

    assert second.tasks_added == 0
    assert conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 1


def test_deleted_task_does_not_come_back(conn, content_root):
    phase_id = _make_phase(conn)
    _write_tasks(content_root, "0-python.md", "## Do skasowania\nOpis.\n")
    content.sync(conn, content_root)

    task_id = tasks_repo.list_by_phase(conn, phase_id)[0]["id"]
    tasks_repo.delete(conn, task_id)
    content.sync(conn, content_root)

    assert tasks_repo.list_by_phase(conn, phase_id) == []


def test_task_with_unknown_phase_code_is_reported(conn, content_root):
    _make_phase(conn)
    _write_tasks(content_root, "9-nieznana.md", "## Zadanie\nOpis.\n")

    result = content.sync(conn, content_root)

    assert result.tasks_added == 0
    assert any("nieznany kod fazy '9'" in warning for warning in result.warnings)


def test_task_without_notes_is_imported_but_flagged(conn, content_root):
    phase_id = _make_phase(conn)
    _write_tasks(content_root, "0-python.md", "## Sam tytuł\n")

    result = content.sync(conn, content_root)

    # Wjeżdża, bo lepiej mieć zadanie bez opisu niż zgubioną pozycję roadmapy -
    # ale ostrzeżenie ma być, żeby luka nie została w treści na zawsze.
    assert result.tasks_added == 1
    assert tasks_repo.list_by_phase(conn, phase_id)[0]["notes"] == ""
    assert any("bez opisu" in warning for warning in result.warnings)


def test_task_ledger_uses_its_own_kind(conn, content_root):
    _make_phase(conn)
    _write_tasks(content_root, "0-python.md", "## Zadanie\nOpis.\n")

    content.sync(conn, content_root)

    keys = content_imports_repo.imported_keys(conn, content_imports_repo.KIND_TASK)
    assert keys == {"0|zadanie"}
    # Rodzaje się nie mieszają - materiał o tym samym tytule wjedzie osobno.
    resources = content_imports_repo.imported_keys(
        conn, content_imports_repo.KIND_RESOURCE
    )
    assert resources == set()
