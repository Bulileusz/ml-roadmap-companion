"""Kontrakt API. Z tych modeli FastAPI generuje OpenAPI, a front - typy TS.

Jedno źródło prawdy dla kształtu danych na granicy HTTP: `npm run gen:api`
przepisuje ten plik na `frontend/src/api/schema.d.ts`, więc zmiana pola tutaj
psuje kompilację frontu od razu, a nie w runtime.

Daty i czasy jadą jako stringi, nie `datetime`. Baza trzyma je w formacie
SQLite ("RRRR-MM-DD" i "RRRR-MM-DD HH:MM:SS") liczonym czasem *lokalnym*
maszyny (services/clock.py). Przepuszczenie ich przez `datetime` dorobiłoby
strefę, której tam nie ma, i przy serializacji do ISO 8601 z "Z" front
zobaczyłby powtórkę przesuniętą o dwie godziny.
"""

from typing import Annotated, Literal, get_args

from pydantic import BaseModel, StringConstraints

from repository import resources_repo

# Tytuł: obcinamy białe znaki i nie wpuszczamy pustego. Wersja streamlitowa
# robiła to samo w callbackach widgetów (i przywracała poprzednią wartość) -
# teraz to jeden warunek w kontrakcie, wspólny dla wszystkich klientów.
Title = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]
# Treść: tył fiszki i odpowiedź do pytania bywają wieloakapitowe z kodem.
Body = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20_000)
]
# Tekst opcjonalny: notatki, odpowiedzi, opisy. Puste jest legalnym stanem
# "jeszcze nie napisane".
FreeText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20_000)]

QuestionType = Literal["concept", "code"]
ResourceStatus = Literal["todo", "in_progress", "done"]
ResourceKind = Literal["book", "course", "video", "docs", "article", "dataset", "other"]


def _assert_matches(name: str, literal: object, source: tuple[str, ...]) -> None:
    """Kontrakt HTTP i lista dopuszczalnych wartości w repozytorium muszą się zgadzać.

    Literal wymaga wartości statycznych, więc nie da się go wygenerować
    z `resources_repo.KINDS` - duplikacja jest nieusuwalna. Da się natomiast
    zrobić z niej błąd przy imporcie modułu, zamiast czekać, aż nowy rodzaj
    materiału zniknie z odpowiedzi API po poprawnym zapisie.
    """
    if set(get_args(literal)) != set(source):
        raise RuntimeError(
            f"{name} rozjechał się z repozytorium: "
            f"{sorted(get_args(literal))} != {sorted(source)}"
        )


_assert_matches("ResourceKind", ResourceKind, resources_repo.KINDS)
_assert_matches("ResourceStatus", ResourceStatus, resources_repo.STATUSES)


class Phase(BaseModel):
    id: int
    code: str
    name: str
    order_index: int


class PhaseProgress(BaseModel):
    phase: Phase
    done: int
    total: int
    pct: float


class Task(BaseModel):
    id: int
    phase_id: int
    title: str
    notes: str
    is_done: bool
    order_index: int


class TaskCreate(BaseModel):
    phase_id: int
    title: Title


class TaskUpdate(BaseModel):
    """PATCH: pominięte pole zostaje bez zmian, w odróżnieniu od pola z null.

    Rozróżnienie jest istotne przy `notes`, gdzie pusty string to poprawna
    wartość ("wyczyść notatkę"), a brak pola oznacza "nie dotykaj".
    """

    title: Title | None = None
    notes: FreeText | None = None
    is_done: bool | None = None


class Flashcard(BaseModel):
    id: int
    phase_id: int | None
    front: str
    back: str
    box: int
    next_review_at: str
    # None = karta czeka na przebieg zapoznawczy i nie jest wymagalna.
    learned_at: str | None
    own_note: str
    created_at: str
    updated_at: str


class FlashcardCreate(BaseModel):
    front: Title
    back: Body
    phase_id: int | None = None


class FlashcardUpdate(BaseModel):
    front: Title | None = None
    back: Body | None = None
    own_note: FreeText | None = None
    # phase_id=null to poprawna operacja ("odepnij od fazy"), więc null musi być
    # rozróżnialny od pominięcia pola. Rozstrzyga to `model_fields_set`
    # w routerze, a nie sentinel w kontrakcie - endpoint dotyka tylko tych pól,
    # które klient rzeczywiście przysłał.
    phase_id: int | None = None


class ReviewResult(BaseModel):
    correct: bool


class Question(BaseModel):
    id: int
    phase_id: int | None
    question_text: str
    question_type: QuestionType
    answer: str
    created_at: str


class QuestionStats(BaseModel):
    total: int
    independent: int
    pct: float


class QuestionWithStats(Question):
    """Pytanie razem ze skumulowanym wskaźnikiem samodzielności.

    Statystyki w tej samej odpowiedzi, a nie osobnym endpointem per pytanie:
    faza z dwunastoma pytaniami dawałaby dwanaście round-tripów, a to już widać
    w interfejsie.
    """

    stats: QuestionStats


class QuestionCreate(BaseModel):
    phase_id: int
    question_text: Body
    question_type: QuestionType = "concept"
    answer: FreeText = ""


class QuestionUpdate(BaseModel):
    question_text: Body | None = None
    question_type: QuestionType | None = None
    answer: FreeText | None = None
    phase_id: int | None = None


class Attempt(BaseModel):
    id: int
    question_id: int
    attempted_at: str
    solved_independently: bool


class AttemptCreate(BaseModel):
    solved_independently: bool


class Resource(BaseModel):
    id: int
    phase_id: int | None
    title: str
    url: str
    kind: str
    detail: str
    status: ResourceStatus
    order_index: int


class ResourceCreate(BaseModel):
    phase_id: int | None = None
    title: Title
    url: FreeText = ""
    kind: ResourceKind = "other"
    detail: FreeText = ""


class ResourceUpdate(BaseModel):
    title: Title | None = None
    url: FreeText | None = None
    detail: FreeText | None = None
    status: ResourceStatus | None = None
    phase_id: int | None = None


class Counter(BaseModel):
    done: int
    total: int
    pct: float


class Independence(BaseModel):
    independent: int
    total: int
    pct: float


class Streak(BaseModel):
    current: int
    longest: int
    active_days: int


class Progression(BaseModel):
    xp: int
    level: int
    xp_into_level: int
    xp_for_next_level: int
    pct: float


class Achievement(BaseModel):
    id: str
    label: str
    hint: str
    # Nazwa ikony z Lucide; jak ją narysować, decyduje front.
    icon: str
    unlocked: bool


class NextTask(BaseModel):
    id: int
    phase_id: int
    title: str
    phase_name: str
    # "Co zrobić" i "Gotowe, gdy" - jedyne zdanie, które mówi, czy wieczór się
    # udał. Kolumna jedzie w wierszu z `first_incomplete` od zawsze; do PR-a
    # z odprawą odcinał ją tylko response_model.
    notes: str


class BoxCount(BaseModel):
    box: int
    count: int


class Dashboard(BaseModel):
    roadmap: Counter
    due_count: int
    intro_count: int
    independence: Independence
    # Lista, nie dict[int, int]: klucze słownika w JSON i tak stają się
    # stringami, a lista zachowuje kolejność pudełek bez sortowania na froncie.
    boxes: list[BoxCount]
    cards_total: int
    next_task: NextTask | None
    streak: Streak
    progression: Progression


class ActivityEntry(BaseModel):
    id: int
    occurred_at: str
    kind: str
    ref_id: int | None
    detail: str


class HeatmapDay(BaseModel):
    day: str
    count: int


class DayPhase(BaseModel):
    """Ile zdarzeń dnia przypadło na tę fazę. None = fazy już nie da się ustalić."""

    phase_id: int | None
    count: int


class JournalDay(BaseModel):
    """Jeden dzień dziennika - wyliczony, nie przechowywany (poza notatką)."""

    day: str
    # Wszystkie zdarzenia dnia, łącznie z odznaczeniem zadania - to samo, co
    # liczy heatmapa. Zero znaczy "dzień bez sesji".
    events: int
    reviewed: int
    introduced: int
    attempts: int
    independent: int
    tasks_done: int
    resources_done: int
    xp: int
    # Od najintensywniejszej - pierwsza faza nadaje dniowi barwę.
    phases: list[DayPhase]
    note: str


class DayNote(BaseModel):
    day: str
    note: str


class DayNoteUpdate(BaseModel):
    note: FreeText


class Briefing(BaseModel):
    """Pierwszy krok sesji: co dziś robisz, z czego i który to punkt fazy.

    Jeden zagnieżdżony obiekt zamiast trzech luźnych pól, bo front podejmuje
    jedną decyzję ("jest odprawa albo jej nie ma") zamiast korelować zadanie
    z listą materiałów i licznikiem.
    """

    task: NextTask
    materials: list[Resource]
    done: int
    total: int


class QuestionsGate(BaseModel):
    """Czemu w tej sesji nie ma pytań: ile fiszek fazy poznanych, ile trzeba."""

    learned: int
    needed: int


class SessionPlan(BaseModel):
    # None, gdy cała roadmapa jest odhaczona - wtedy sesja zaczyna się od
    # powtórek, tak jak przed tym PR-em.
    briefing: Briefing | None
    intro: list[Flashcard]
    reviews: list[Flashcard]
    reviews_remaining: int
    # Ze statystykami, bo sesja pokazuje wskaźnik samodzielności PRZED
    # odpowiedzią - to informacja o tym, czy z tym pytaniem masz historię.
    questions: list[QuestionWithStats]
    # None = pytania odblokowane. Nie-None mówi, ile brakuje - brak pytań bez
    # powodu wygląda jak usterka, a to jest decyzja.
    questions_gate: QuestionsGate | None
    phase: Phase | None
    next_task: NextTask | None
    total_steps: int
    estimated_minutes: int


class ContentStatus(BaseModel):
    # Ile pozycji leży w plikach content/ i ile z nich już wjechało do bazy.
    available: dict[str, int]
    imported: dict[str, int]


class ContentSyncResult(BaseModel):
    flashcards_added: int
    questions_added: int
    resources_added: int
    tasks_added: int
    answers_filled: int
    skipped: int
    warnings: list[str]


class BackupPreview(BaseModel):
    summary: dict[str, int]
    exported_at: str | None
    schema_version: int | None
    compatible: bool
    # Powód odrzucenia, gdy compatible=False - pokazywany zamiast przycisku
    # "nadpisz", a nie po nim.
    problem: str | None


class BackupImportResult(BaseModel):
    summary: dict[str, int]
    # Ścieżka kopii bezpieczeństwa zrobionej przed nadpisaniem.
    backup_path: str
