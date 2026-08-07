import re
import sqlite3
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path

from repository import (
    content_imports_repo,
    phases_repo,
    questions_repo,
    resources_repo,
)
from services import clock, spaced_repetition

CONTENT_ROOT = Path(__file__).resolve().parent.parent / "content"

DEFAULT_QUESTION_TYPE = "concept"
QUESTION_TYPES = ("concept", "code")

# Ile świeżo zaimportowanych fiszek staje się wymagalnych tego samego dnia.
# Wrzucenie startera bez tego dałoby kilkadziesiąt powtórek pierwszego dnia -
# a lawina na starcie to najczęstszy powód porzucenia spaced repetition.
# Kolejne partie dostają kolejne dni; fiszka dodana ręcznie w UI dalej jest
# wymagalna od razu, bo to świadoma decyzja użytkownika.
NEW_CARDS_PER_DAY = 10

_SECTION = re.compile(r"^##[ \t]+(.*)$", re.MULTILINE)
_TYPE_TAG = re.compile(r"^\[(\w+)\]\s*(.*)$")


@dataclass
class SyncResult:
    flashcards_added: int = 0
    questions_added: int = 0
    resources_added: int = 0
    answers_filled: int = 0
    skipped: int = 0
    warnings: list[str] = field(default_factory=list)

    @property
    def total_added(self) -> int:
        return self.flashcards_added + self.questions_added + self.resources_added


def normalize_key(phase_code: str, text: str) -> str:
    """Klucz ewidencji: faza + treść bez różnic w białych znakach i wielkości.

    Dzięki temu poprawka wcięcia albo wielkiej litery w pliku nie tworzy
    duplikatu, a przeniesienie pozycji do innego pliku nic nie zmienia.
    """
    return f"{phase_code}|{' '.join(text.split()).lower()}"


def parse_sections(text: str) -> list[tuple[str, str]]:
    """Dzieli plik na sekcje '## nagłówek' + treść pod spodem."""
    sections = []
    matches = list(_SECTION.finditer(text))
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        sections.append((match.group(1).strip(), text[start:end].strip()))
    return sections


def phase_code_from_filename(path: Path) -> str:
    """'2b-ensemble.md' -> '2b'. Kod fazy to część przed pierwszym myślnikiem."""
    return path.stem.split("-", 1)[0]


def split_type_tag(
    heading: str, allowed: tuple[str, ...] = QUESTION_TYPES, default: str | None = None
) -> tuple[str, str]:
    """'[code] Napisz pętlę' -> ('code', 'Napisz pętlę'); bez tagu -> default.

    Nierozpoznany tag zostaje częścią treści, zamiast po cichu znikać -
    literówka w '[boook]' ma być widoczna w aplikacji, a nie zjedzona.
    """
    match = _TYPE_TAG.match(heading)
    if match and match.group(1) in allowed:
        return match.group(1), match.group(2).strip()
    return (default or DEFAULT_QUESTION_TYPE), heading


def split_url(body: str) -> tuple[str, str]:
    """Pierwsza linia zaczynająca się od http to link, reszta to opis."""
    lines = body.splitlines()
    if lines and lines[0].strip().lower().startswith("http"):
        return lines[0].strip(), "\n".join(lines[1:]).strip()
    return "", body.strip()


def _markdown_files(directory: Path) -> list[Path]:
    return sorted(directory.glob("*.md")) if directory.is_dir() else []


def _phase_code_of(phase_ids: dict[str, int], phase_id: int | None) -> str:
    """Odwrotność mapy kod -> id; pytanie bez fazy dostaje pusty kod."""
    for code, known_id in phase_ids.items():
        if known_id == phase_id:
            return code
    return ""


def _sync_flashcards(
    conn: sqlite3.Connection,
    root: Path,
    phase_ids: dict[str, int],
    result: SyncResult,
    today: date,
) -> None:
    seen = content_imports_repo.imported_keys(conn, content_imports_repo.KIND_FLASHCARD)

    for path in _markdown_files(root / "flashcards"):
        code = phase_code_from_filename(path)
        if code not in phase_ids:
            result.warnings.append(
                f"{path.name}: nieznany kod fazy '{code}' - pomijam."
            )
            continue

        for front, back in parse_sections(path.read_text(encoding="utf-8")):
            if not front or not back:
                result.warnings.append(
                    f"{path.name}: fiszka '{front[:40]}' bez przodu albo tyłu "
                    f"- pomijam."
                )
                continue

            key = normalize_key(code, front)
            if key in seen:
                result.skipped += 1
                continue

            # Najpierw treść, potem ewidencja: awaria między tymi krokami
            # oznacza duplikat przy następnym starcie (do skasowania w UI),
            # a nie bezpowrotnie zgubioną fiszkę.
            due = today + timedelta(days=result.flashcards_added // NEW_CARDS_PER_DAY)
            spaced_repetition.create_card(conn, front, back, phase_ids[code], today=due)
            content_imports_repo.mark_imported(
                conn, content_imports_repo.KIND_FLASHCARD, key
            )
            seen.add(key)
            result.flashcards_added += 1


def _sync_questions(
    conn: sqlite3.Connection, root: Path, phase_ids: dict[str, int], result: SyncResult
) -> None:
    seen = content_imports_repo.imported_keys(conn, content_imports_repo.KIND_QUESTION)
    # Pytania czekające na odpowiedź, po znormalizowanej treści -> wiersz.
    # Pozwala uzupełnić brakującą odpowiedź w pozycji, która jest już
    # w ewidencji i normalnym trybem zostałaby po prostu pominięta.
    awaiting_answer = {
        normalize_key(
            _phase_code_of(phase_ids, row["phase_id"]), row["question_text"]
        ): row
        for row in questions_repo.list_without_answer(conn)
    }

    for path in _markdown_files(root / "questions"):
        code = phase_code_from_filename(path)
        if code not in phase_ids:
            result.warnings.append(
                f"{path.name}: nieznany kod fazy '{code}' - pomijam."
            )
            continue

        # Treść pod nagłówkiem pytania to odpowiedź/wyjaśnienie.
        for heading, answer in parse_sections(path.read_text(encoding="utf-8")):
            question_type, text = split_type_tag(heading)
            if not text:
                continue

            key = normalize_key(code, text)
            if key in seen:
                result.skipped += 1
                # Wyjątek od "nie nadpisujemy": pustą odpowiedź wolno
                # uzupełnić. Import wypełnia luki, nigdy nie zastępuje treści,
                # którą sam poprawiłeś w aplikacji.
                existing = awaiting_answer.pop(key, None)
                if existing is not None and answer:
                    questions_repo.update_answer(conn, existing["id"], answer)
                    result.answers_filled += 1
                continue

            questions_repo.create(
                conn, phase_ids[code], text, question_type, answer=answer
            )
            content_imports_repo.mark_imported(
                conn, content_imports_repo.KIND_QUESTION, key
            )
            seen.add(key)
            result.questions_added += 1


def _sync_resources(
    conn: sqlite3.Connection, root: Path, phase_ids: dict[str, int], result: SyncResult
) -> None:
    seen = content_imports_repo.imported_keys(conn, content_imports_repo.KIND_RESOURCE)

    for path in _markdown_files(root / "resources"):
        code = phase_code_from_filename(path)
        if code not in phase_ids:
            result.warnings.append(
                f"{path.name}: nieznany kod fazy '{code}' - pomijam."
            )
            continue

        for heading, body in parse_sections(path.read_text(encoding="utf-8")):
            kind, title = split_type_tag(
                heading,
                allowed=resources_repo.KINDS,
                default=resources_repo.DEFAULT_KIND,
            )
            if not title:
                continue

            key = normalize_key(code, title)
            if key in seen:
                result.skipped += 1
                continue

            url, detail = split_url(body)
            resources_repo.create(conn, phase_ids[code], title, url, kind, detail)
            content_imports_repo.mark_imported(
                conn, content_imports_repo.KIND_RESOURCE, key
            )
            seen.add(key)
            result.resources_added += 1


def sync(
    conn: sqlite3.Connection, root: Path | None = None, today: date | None = None
) -> SyncResult:
    """Dokłada do bazy pozycje z content/, których jeszcze nigdy nie importowano.

    Import jest addytywny i jednokierunkowy: nowe pozycje wjeżdżają, ale
    istniejące nie są nadpisywane, a skasowane w UI nie wracają. Poprawka
    tyłu fiszki w pliku nie zmienia klucza, więc nie trafi do bazy - przód
    zmieniasz w pliku, tył w aplikacji.
    """
    root = root or CONTENT_ROOT
    result = SyncResult()
    if not root.is_dir():
        return result

    phase_ids = {phase["code"]: phase["id"] for phase in phases_repo.list_all(conn)}
    if not phase_ids:
        result.warnings.append("Brak faz w bazie - import materiałów pominięty.")
        return result

    _sync_flashcards(conn, root, phase_ids, result, today or clock.today())
    _sync_questions(conn, root, phase_ids, result)
    _sync_resources(conn, root, phase_ids, result)
    return result


def available_counts(root: Path | None = None) -> dict[str, int]:
    """Ile pozycji leży w plikach - do pokazania obok liczby zaimportowanych."""
    root = root or CONTENT_ROOT
    counts = {"flashcards": 0, "questions": 0, "resources": 0}
    if not root.is_dir():
        return counts

    for kind in ("flashcards", "questions", "resources"):
        for path in _markdown_files(root / kind):
            counts[kind] += len(parse_sections(path.read_text(encoding="utf-8")))
    return counts
