import sqlite3

# Wersjonowanie schematu przez PRAGMA user_version: każda pozycja MIGRATIONS
# to jedna wersja, aplikowana raz. Zmiany schematu = nowa funkcja na końcu
# listy, nigdy edycja już wydanej migracji.
#
# Defaulty datetime('now')/date('now') poniżej są w UTC - zostają jako
# nieszkodliwy fallback; aplikacja ustawia te kolumny jawnie czasem lokalnym
# (services/clock.py), więc defaulty nie są używane w normalnym działaniu.

_CREATE_PHASES = """
CREATE TABLE IF NOT EXISTS phases (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    order_index  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

_CREATE_TASKS = """
CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    phase_id     INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    notes        TEXT NOT NULL DEFAULT '',
    is_done      INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0, 1)),
    order_index  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

_CREATE_TASKS_INDEX = """
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON tasks(phase_id);
"""

# Nullable FK z ON DELETE SET NULL - usunięcie fazy/taska w Module 1 nie
# kasuje fiszek, tylko odpina je od fazy.
_CREATE_FLASHCARDS = """
CREATE TABLE IF NOT EXISTS flashcards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    phase_id        INTEGER REFERENCES phases(id) ON DELETE SET NULL,
    front           TEXT NOT NULL,
    back            TEXT NOT NULL,
    box             INTEGER NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
    next_review_at  TEXT NOT NULL DEFAULT (date('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

_CREATE_FLASHCARDS_INDEX = """
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_at);
"""

# questions.phase_id: cross-module, opcjonalny link do Modułu 1 - nullable +
# ON DELETE SET NULL (usunięcie fazy nie kasuje pytania, tylko je odpina).
_CREATE_QUESTIONS = """
CREATE TABLE IF NOT EXISTS questions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    phase_id       INTEGER REFERENCES phases(id) ON DELETE SET NULL,
    question_text  TEXT NOT NULL,
    question_type  TEXT NOT NULL DEFAULT 'concept' CHECK (question_type IN ('concept', 'code')),
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

_CREATE_QUESTIONS_INDEX = """
CREATE INDEX IF NOT EXISTS idx_questions_phase_id ON questions(phase_id);
"""

# question_attempts.question_id: intra-module, właścicielska relacja
# rodzic-dziecko (log podejść nie ma sensu bez pytania) - NOT NULL +
# ON DELETE CASCADE, tak jak tasks.phase_id -> phases w Module 1.
_CREATE_QUESTION_ATTEMPTS = """
CREATE TABLE IF NOT EXISTS question_attempts (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id           INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    attempted_at          TEXT NOT NULL DEFAULT (datetime('now')),
    solved_independently  INTEGER NOT NULL CHECK (solved_independently IN (0, 1))
);
"""

_CREATE_QUESTION_ATTEMPTS_INDEX = """
CREATE INDEX IF NOT EXISTS idx_question_attempts_question_id ON question_attempts(question_id);
"""


# activity_log.ref_id celowo NIE jest kluczem obcym - to trzeci wzorzec
# relacji obok dwóch opisanych w README. Wpis dziennika ma przeżyć usunięcie
# obiektu, którego dotyczy: dziennik, który da się wyczyścić kasując taska,
# nie jest dziennikiem. Dlatego `detail` trzyma zdenormalizowaną migawkę
# tytułu - wpis pozostaje czytelny nawet gdy źródło zniknie.
_CREATE_ACTIVITY_LOG = """
CREATE TABLE IF NOT EXISTS activity_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at  TEXT NOT NULL,
    kind         TEXT NOT NULL CHECK (kind IN ('task_done', 'task_undone', 'card_review', 'question_attempt')),
    ref_id       INTEGER,
    detail       TEXT NOT NULL DEFAULT ''
);
"""

_CREATE_ACTIVITY_LOG_INDEX = """
CREATE INDEX IF NOT EXISTS idx_activity_log_occurred_at ON activity_log(occurred_at);
"""

# Backfill: question_attempts to jedyna tabela z prawdziwym logiem zdarzeń,
# więc jej historię da się przenieść 1:1. Tasków i fiszek odtworzyć nie można -
# updated_at jest nadpisywane przy każdej zmianie, więc niesie tylko datę
# ostatniej edycji, nie przebieg. Historia tych dwóch zaczyna się od migracji.
_BACKFILL_ACTIVITY_FROM_ATTEMPTS = """
INSERT INTO activity_log (occurred_at, kind, ref_id, detail)
SELECT
    question_attempts.attempted_at,
    'question_attempt',
    question_attempts.question_id,
    COALESCE(questions.question_text, '')
FROM question_attempts
LEFT JOIN questions ON questions.id = question_attempts.question_id
ORDER BY question_attempts.attempted_at, question_attempts.id;
"""


def _migration_1_initial_schema(conn: sqlite3.Connection) -> None:
    # IF NOT EXISTS pozwala bezpiecznie "zaadoptować" bazę sprzed
    # wersjonowania (tabele istnieją, user_version = 0).
    conn.execute(_CREATE_PHASES)
    conn.execute(_CREATE_TASKS)
    conn.execute(_CREATE_TASKS_INDEX)
    conn.execute(_CREATE_FLASHCARDS)
    conn.execute(_CREATE_FLASHCARDS_INDEX)
    conn.execute(_CREATE_QUESTIONS)
    conn.execute(_CREATE_QUESTIONS_INDEX)
    conn.execute(_CREATE_QUESTION_ATTEMPTS)
    conn.execute(_CREATE_QUESTION_ATTEMPTS_INDEX)


def _migration_2_activity_log(conn: sqlite3.Connection) -> None:
    conn.execute(_CREATE_ACTIVITY_LOG)
    conn.execute(_CREATE_ACTIVITY_LOG_INDEX)
    # Backfill tylko do pustego dziennika. Tak jak IF NOT EXISTS wyżej, to
    # zabezpieczenie ścieżki adopcji bazy sprzed wersjonowania, gdzie tabele
    # już istnieją, a migracje przejeżdżają jeszcze raz - bez tego warunku
    # historia podejść zdublowałaby się.
    existing = conn.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0]
    if existing == 0:
        conn.execute(_BACKFILL_ACTIVITY_FROM_ATTEMPTS)


MIGRATIONS = [_migration_1_initial_schema, _migration_2_activity_log]


def init_db(conn: sqlite3.Connection) -> None:
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    for version, migration in enumerate(MIGRATIONS[current:], start=current + 1):
        migration(conn)
        # PRAGMA nie przyjmuje parametrów wiązanych; version pochodzi
        # wyłącznie z enumerate, nie z wejścia użytkownika.
        conn.execute(f"PRAGMA user_version = {version}")
        conn.commit()
