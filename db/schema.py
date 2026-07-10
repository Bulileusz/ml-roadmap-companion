import sqlite3

# Moduł 2 (fiszki/SRS) i Moduł 3 (bank pytań) dodadzą własne tabele
# referencujące phases(id) / tasks(id) - bez zmian w schemacie poniżej.

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


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(_CREATE_PHASES)
    conn.execute(_CREATE_TASKS)
    conn.execute(_CREATE_TASKS_INDEX)
    conn.execute(_CREATE_FLASHCARDS)
    conn.execute(_CREATE_FLASHCARDS_INDEX)
    conn.execute(_CREATE_QUESTIONS)
    conn.execute(_CREATE_QUESTIONS_INDEX)
    conn.execute(_CREATE_QUESTION_ATTEMPTS)
    conn.execute(_CREATE_QUESTION_ATTEMPTS_INDEX)
    conn.commit()
