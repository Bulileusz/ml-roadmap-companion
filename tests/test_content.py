from datetime import date

import pytest

from repository import (
    content_imports_repo,
    flashcards_repo,
    questions_repo,
)
from services import content

PHASE_CODES = ["0", "1", "2", "2b", "3", "4"]


@pytest.fixture
def seeded(conn):
    for order_index, code in enumerate(PHASE_CODES):
        conn.execute(
            "INSERT INTO phases (code, name, order_index) VALUES (?, ?, ?)",
            (code, f"Faza {code}", order_index),
        )
    conn.commit()
    return conn


@pytest.fixture
def content_root(tmp_path):
    (tmp_path / "flashcards").mkdir()
    (tmp_path / "questions").mkdir()
    return tmp_path


def _write(root, kind, name, text):
    (root / kind / name).write_text(text, encoding="utf-8")


def test_parse_sections_splits_on_headings():
    text = "# Tytuł\n\n## Przód A\nTył A\nw dwóch liniach.\n\n## Przód B\nTył B\n"

    assert content.parse_sections(text) == [
        ("Przód A", "Tył A\nw dwóch liniach."),
        ("Przód B", "Tył B"),
    ]


def test_parse_sections_ignores_other_heading_levels():
    text = "# H1\n### H3\n## Prawdziwa sekcja\ntreść\n"

    assert content.parse_sections(text) == [("Prawdziwa sekcja", "treść")]


def test_parse_sections_empty_file():
    assert content.parse_sections("") == []


def test_phase_code_from_filename():
    from pathlib import Path

    assert content.phase_code_from_filename(Path("0-python.md")) == "0"
    assert content.phase_code_from_filename(Path("2b-ensemble.md")) == "2b"
    assert content.phase_code_from_filename(Path("4-projekt-domenowy.md")) == "4"


def test_split_type_tag():
    assert content.split_type_tag("[code] Napisz KNN") == ("code", "Napisz KNN")
    assert content.split_type_tag("[concept] Czemu?") == ("concept", "Czemu?")
    # Bez tagu domyślnie concept; nieznany tag zostaje częścią treści.
    assert content.split_type_tag("Czemu?") == ("concept", "Czemu?")
    assert content.split_type_tag("[foo] Czemu?") == ("concept", "[foo] Czemu?")


def test_normalize_key_ignores_whitespace_and_case():
    assert content.normalize_key("0", "  Co   to JEST?  ") == content.normalize_key(
        "0", "co to jest?"
    )
    # Faza jest częścią klucza - to samo pytanie w dwóch fazach to dwie pozycje.
    assert content.normalize_key("0", "Co to?") != content.normalize_key("1", "Co to?")


def test_sync_imports_flashcards_and_questions(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Przód\nTył\n")
    _write(
        content_root,
        "questions",
        "0-python.md",
        "## Pytanie koncepcyjne\n\n## [code] Pytanie kodowe\n",
    )

    result = content.sync(seeded, content_root)

    assert result.flashcards_added == 1
    assert result.questions_added == 2
    cards = flashcards_repo.list_all(seeded)
    assert [card["front"] for card in cards] == ["Przód"]
    assert cards[0]["back"] == "Tył"
    phase_id = seeded.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
    assert cards[0]["phase_id"] == phase_id
    types = [q["question_type"] for q in questions_repo.list_by_phase(seeded, phase_id)]
    assert sorted(types) == ["code", "concept"]


def test_first_imported_cards_are_due_today(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Przód\nTył\n")

    content.sync(seeded, content_root, today=date(2026, 3, 15))

    card = flashcards_repo.list_all(seeded)[0]
    assert card["box"] == 1
    assert card["next_review_at"] == "2026-03-15"


def test_import_staggers_new_cards_across_days(seeded, content_root):
    count = content.NEW_CARDS_PER_DAY * 2 + 1
    body = "".join(f"## Przód {index}\nTył {index}\n\n" for index in range(count))
    _write(content_root, "flashcards", "0-python.md", body)

    content.sync(seeded, content_root, today=date(2026, 3, 15))

    dates = [card["next_review_at"] for card in flashcards_repo.list_all(seeded)]
    # Pierwsza porcja dziś, druga jutro, reszta pojutrze - żeby wgranie
    # startera nie dało kilkudziesięciu powtórek pierwszego dnia.
    assert dates.count("2026-03-15") == content.NEW_CARDS_PER_DAY
    assert dates.count("2026-03-16") == content.NEW_CARDS_PER_DAY
    assert dates.count("2026-03-17") == 1


def test_manual_cards_stay_due_immediately(seeded, content_root):
    # Stagger dotyczy tylko importu - ręczne dodanie fiszki to świadoma
    # decyzja i ma być wymagalne od razu.
    from services import spaced_repetition

    spaced_repetition.create_card(
        seeded, "Ręczna", "Tył", None, today=date(2026, 3, 15)
    )

    assert flashcards_repo.list_all(seeded)[0]["next_review_at"] == "2026-03-15"


def test_sync_is_idempotent(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Przód\nTył\n")

    content.sync(seeded, content_root)
    second = content.sync(seeded, content_root)

    assert second.flashcards_added == 0
    assert second.skipped == 1
    assert len(flashcards_repo.list_all(seeded)) == 1


def test_sync_does_not_resurrect_deleted_flashcards(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Przód\nTył\n")
    content.sync(seeded, content_root)
    card_id = flashcards_repo.list_all(seeded)[0]["id"]

    flashcards_repo.delete(seeded, card_id)
    content.sync(seeded, content_root)

    # Ewidencja pamięta, że ta fiszka już kiedyś wjechała - skasowanie
    # w UI jest decyzją użytkownika i import ma jej nie cofać.
    assert flashcards_repo.list_all(seeded) == []


def test_sync_does_not_overwrite_edited_back(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Przód\nStary tył\n")
    content.sync(seeded, content_root)
    card_id = flashcards_repo.list_all(seeded)[0]["id"]
    flashcards_repo.update_content(seeded, card_id, "Przód", "Poprawiony w UI")

    _write(content_root, "flashcards", "0-python.md", "## Przód\nInny tył z pliku\n")
    content.sync(seeded, content_root)

    assert flashcards_repo.get(seeded, card_id)["back"] == "Poprawiony w UI"


def test_changed_front_creates_a_new_card(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Stary przód\nTył\n")
    content.sync(seeded, content_root)

    _write(content_root, "flashcards", "0-python.md", "## Nowy przód\nTył\n")
    result = content.sync(seeded, content_root)

    assert result.flashcards_added == 1
    assert {card["front"] for card in flashcards_repo.list_all(seeded)} == {
        "Stary przód",
        "Nowy przód",
    }


def test_moving_an_entry_between_files_does_not_duplicate(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Przód\nTył\n")
    content.sync(seeded, content_root)

    (content_root / "flashcards" / "0-python.md").unlink()
    _write(content_root, "flashcards", "0-numpy.md", "## Przód\nTył\n")
    result = content.sync(seeded, content_root)

    assert result.flashcards_added == 0
    assert len(flashcards_repo.list_all(seeded)) == 1


def test_same_text_in_two_phases_is_two_entries(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Przód\nTył\n")
    _write(content_root, "flashcards", "1-matma.md", "## Przód\nTył\n")

    result = content.sync(seeded, content_root)

    assert result.flashcards_added == 2


def test_question_body_becomes_the_answer(seeded, content_root):
    _write(
        content_root,
        "questions",
        "0-python.md",
        "## Czym jest broadcasting?\nRozciąganiem wymiarów o rozmiarze 1.\n",
    )

    content.sync(seeded, content_root)

    phase_id = seeded.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
    question = questions_repo.list_by_phase(seeded, phase_id)[0]
    assert question["question_text"] == "Czym jest broadcasting?"
    assert question["answer"] == "Rozciąganiem wymiarów o rozmiarze 1."


def test_question_without_body_gets_empty_answer(seeded, content_root):
    _write(content_root, "questions", "0-python.md", "## Pytanie bez odpowiedzi\n")

    content.sync(seeded, content_root)

    phase_id = seeded.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
    assert questions_repo.list_by_phase(seeded, phase_id)[0]["answer"] == ""


def test_sync_fills_a_missing_answer_on_an_already_imported_question(
    seeded, content_root
):
    # Tak wygląda realny scenariusz: 56 pytań wjechało bez odpowiedzi, potem
    # odpowiedzi dopisano do plików. Normalny import by je pominął.
    _write(content_root, "questions", "0-python.md", "## Pytanie\n")
    content.sync(seeded, content_root)
    phase_id = seeded.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
    assert questions_repo.list_by_phase(seeded, phase_id)[0]["answer"] == ""

    _write(content_root, "questions", "0-python.md", "## Pytanie\nDopisana treść.\n")
    result = content.sync(seeded, content_root)

    assert result.answers_filled == 1
    assert result.questions_added == 0
    questions = questions_repo.list_by_phase(seeded, phase_id)
    assert len(questions) == 1
    assert questions[0]["answer"] == "Dopisana treść."


def test_sync_never_overwrites_an_answer_edited_in_the_app(seeded, content_root):
    _write(content_root, "questions", "0-python.md", "## Pytanie\nZ pliku.\n")
    content.sync(seeded, content_root)
    phase_id = seeded.execute("SELECT id FROM phases WHERE code = '0'").fetchone()["id"]
    question_id = questions_repo.list_by_phase(seeded, phase_id)[0]["id"]
    questions_repo.update_answer(seeded, question_id, "Moja własna wersja.")

    _write(content_root, "questions", "0-python.md", "## Pytanie\nInna z pliku.\n")
    result = content.sync(seeded, content_root)

    assert result.answers_filled == 0
    assert (
        questions_repo.list_by_phase(seeded, phase_id)[0]["answer"]
        == "Moja własna wersja."
    )


def test_blank_answer_in_file_does_not_count_as_filled(seeded, content_root):
    _write(content_root, "questions", "0-python.md", "## Pytanie\n")
    content.sync(seeded, content_root)

    result = content.sync(seeded, content_root)

    assert result.answers_filled == 0


def test_unknown_phase_code_is_reported_not_raised(seeded, content_root):
    _write(content_root, "flashcards", "9-nieznana.md", "## Przód\nTył\n")

    result = content.sync(seeded, content_root)

    assert result.flashcards_added == 0
    assert any("9" in warning for warning in result.warnings)


def test_flashcard_without_back_is_skipped_with_warning(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Sam przód\n\n## Pełna\nTył\n")

    result = content.sync(seeded, content_root)

    assert result.flashcards_added == 1
    assert any("Sam przód" in warning for warning in result.warnings)


def test_sync_without_content_directory_is_a_noop(seeded, tmp_path):
    result = content.sync(seeded, tmp_path / "nie-ma-tego")

    assert result.total_added == 0
    assert result.warnings == []


def test_sync_without_phases_warns_instead_of_importing(conn, content_root):
    _write(content_root, "flashcards", "0-python.md", "## Przód\nTył\n")

    result = content.sync(conn, content_root)

    assert result.total_added == 0
    assert result.warnings


def test_ledger_records_every_import(seeded, content_root):
    _write(content_root, "flashcards", "0-python.md", "## A\n1\n\n## B\n2\n")
    _write(content_root, "questions", "0-python.md", "## Pytanie\n")

    content.sync(seeded, content_root)

    assert content_imports_repo.count_by_kind(seeded) == {"flashcard": 2, "question": 1}


def test_available_counts_reads_files_without_touching_db(content_root):
    _write(content_root, "flashcards", "0-python.md", "## A\n1\n\n## B\n2\n")
    _write(content_root, "questions", "0-python.md", "## P1\n\n## P2\n\n## P3\n")

    assert content.available_counts(content_root) == {"flashcards": 2, "questions": 3}
