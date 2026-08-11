import pytest

from repository import content_imports_repo, resources_repo
from services import content


@pytest.fixture
def seeded(conn):
    for order_index, code in enumerate(["0", "1"]):
        conn.execute(
            "INSERT INTO phases (code, name, order_index) VALUES (?, ?, ?)",
            (code, f"Faza {code}", order_index),
        )
    conn.commit()
    return conn


@pytest.fixture
def content_root(tmp_path):
    for name in ("flashcards", "questions", "resources"):
        (tmp_path / name).mkdir()
    return tmp_path


def _phase_id(conn, code):
    return conn.execute("SELECT id FROM phases WHERE code = ?", (code,)).fetchone()[
        "id"
    ]


def test_create_and_list_ordered(seeded):
    phase_id = _phase_id(seeded, "0")

    first = resources_repo.create(seeded, phase_id, "ISLR", "https://statlearning.com")
    second = resources_repo.create(seeded, phase_id, "MML")

    listed = resources_repo.list_by_phase(seeded, phase_id)
    assert [r["id"] for r in listed] == [first, second]
    assert [r["order_index"] for r in listed] == [0, 1]
    assert listed[0]["url"] == "https://statlearning.com"
    # Domyślne wartości: bez linku, rodzaj 'other', status 'todo'.
    assert listed[1]["url"] == ""
    assert listed[1]["kind"] == resources_repo.DEFAULT_KIND
    assert listed[1]["status"] == resources_repo.STATUS_TODO


def test_order_index_is_per_phase(seeded):
    resources_repo.create(seeded, _phase_id(seeded, "0"), "Pierwszy")
    drugi = resources_repo.create(seeded, _phase_id(seeded, "1"), "W innej fazie")

    listed = resources_repo.list_by_phase(seeded, _phase_id(seeded, "1"))
    assert [r["id"] for r in listed] == [drugi]
    assert listed[0]["order_index"] == 0


def test_update_status_and_count(seeded):
    phase_id = _phase_id(seeded, "0")
    a = resources_repo.create(seeded, phase_id, "A")
    resources_repo.create(seeded, phase_id, "B")

    resources_repo.update_status(seeded, a, resources_repo.STATUS_DONE)

    assert resources_repo.count_by_status(seeded) == {"done": 1, "todo": 1}


def test_invalid_status_is_rejected_by_schema(seeded):
    phase_id = _phase_id(seeded, "0")
    resource_id = resources_repo.create(seeded, phase_id, "A")

    import sqlite3

    with pytest.raises(sqlite3.IntegrityError):
        resources_repo.update_status(seeded, resource_id, "nieistniejacy")


def test_update_fields_and_phase(seeded):
    source = _phase_id(seeded, "0")
    target = _phase_id(seeded, "1")
    resource_id = resources_repo.create(seeded, source, "Stary tytuł")

    resources_repo.update_fields(
        seeded, resource_id, "Nowy tytuł", "https://example.org", "rozdział 3"
    )
    resources_repo.update_phase(seeded, resource_id, target)

    assert resources_repo.list_by_phase(seeded, source) == []
    moved = resources_repo.list_by_phase(seeded, target)[0]
    assert moved["title"] == "Nowy tytuł"
    assert moved["url"] == "https://example.org"
    assert moved["detail"] == "rozdział 3"


def test_deleting_phase_detaches_resource(seeded):
    phase_id = _phase_id(seeded, "0")
    resource_id = resources_repo.create(seeded, phase_id, "A")

    seeded.execute("DELETE FROM phases WHERE id = ?", (phase_id,))
    seeded.commit()

    row = seeded.execute(
        "SELECT phase_id FROM resources WHERE id = ?", (resource_id,)
    ).fetchone()
    # Cross-module FK: usunięcie fazy odpina materiał, nie kasuje go.
    assert row is not None
    assert row["phase_id"] is None


def test_delete(seeded):
    phase_id = _phase_id(seeded, "0")
    resource_id = resources_repo.create(seeded, phase_id, "A")

    resources_repo.delete(seeded, resource_id)

    assert resources_repo.list_by_phase(seeded, phase_id) == []


def test_split_url_takes_first_http_line():
    assert content.split_url("https://a.pl\nopis\nw dwóch liniach") == (
        "https://a.pl",
        "opis\nw dwóch liniach",
    )
    # Bez linku cała treść jest opisem.
    assert content.split_url("sam opis") == ("", "sam opis")
    assert content.split_url("") == ("", "")


def test_sync_imports_resources_with_kind_and_url(seeded, content_root):
    (content_root / "resources" / "0-python.md").write_text(
        "## [book] ISLR\nhttps://www.statlearning.com/\nRozdziały 2-5.\n\n"
        "## [video] StatQuest\nBez linku, sam opis.\n",
        encoding="utf-8",
    )

    result = content.sync(seeded, content_root)

    assert result.resources_added == 2
    listed = resources_repo.list_by_phase(seeded, _phase_id(seeded, "0"))
    assert [r["title"] for r in listed] == ["ISLR", "StatQuest"]
    assert listed[0]["kind"] == "book"
    assert listed[0]["url"] == "https://www.statlearning.com/"
    assert listed[0]["detail"] == "Rozdziały 2-5."
    assert listed[1]["kind"] == "video"
    assert listed[1]["url"] == ""
    assert listed[1]["detail"] == "Bez linku, sam opis."


def test_unknown_kind_tag_stays_in_the_title(seeded, content_root):
    (content_root / "resources" / "0-python.md").write_text(
        "## [boook] Literówka\n", encoding="utf-8"
    )

    content.sync(seeded, content_root)

    listed = resources_repo.list_by_phase(seeded, _phase_id(seeded, "0"))
    # Literówka ma być widoczna, a nie po cichu zjedzona.
    assert listed[0]["title"] == "[boook] Literówka"
    assert listed[0]["kind"] == resources_repo.DEFAULT_KIND


def test_resource_sync_is_idempotent(seeded, content_root):
    (content_root / "resources" / "0-python.md").write_text(
        "## [book] ISLR\n", encoding="utf-8"
    )

    content.sync(seeded, content_root)
    second = content.sync(seeded, content_root)

    assert second.resources_added == 0
    assert len(resources_repo.list_by_phase(seeded, _phase_id(seeded, "0"))) == 1


def test_deleted_resource_does_not_come_back(seeded, content_root):
    (content_root / "resources" / "0-python.md").write_text(
        "## [book] ISLR\n", encoding="utf-8"
    )
    content.sync(seeded, content_root)
    resource_id = resources_repo.list_by_phase(seeded, _phase_id(seeded, "0"))[0]["id"]

    resources_repo.delete(seeded, resource_id)
    content.sync(seeded, content_root)

    assert resources_repo.list_by_phase(seeded, _phase_id(seeded, "0")) == []


def test_resource_ledger_uses_its_own_kind(seeded, content_root):
    (content_root / "resources" / "0-python.md").write_text(
        "## [book] ISLR\n", encoding="utf-8"
    )
    (content_root / "flashcards" / "0-python.md").write_text(
        "## ISLR\nTa sama nazwa, inny rodzaj.\n", encoding="utf-8"
    )

    content.sync(seeded, content_root)

    counts = content_imports_repo.count_by_kind(seeded)
    # Ten sam tytuł jako fiszka i jako materiał to dwie niezależne pozycje.
    assert counts[content_imports_repo.KIND_RESOURCE] == 1
    assert counts[content_imports_repo.KIND_FLASHCARD] == 1
