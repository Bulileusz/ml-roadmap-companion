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


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(_CREATE_PHASES)
    conn.execute(_CREATE_TASKS)
    conn.execute(_CREATE_TASKS_INDEX)
    conn.execute(_CREATE_FLASHCARDS)
    conn.execute(_CREATE_FLASHCARDS_INDEX)
    conn.commit()
