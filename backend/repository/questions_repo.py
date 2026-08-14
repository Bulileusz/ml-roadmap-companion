import sqlite3

from services import clock


def list_by_phase(conn: sqlite3.Connection, phase_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM questions WHERE phase_id = ? ORDER BY created_at, id",
        (phase_id,),
    ).fetchall()


def get(conn: sqlite3.Connection, question_id: int) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM questions WHERE id = ?", (question_id,)
    ).fetchone()


def list_for_session(
    conn: sqlite3.Connection, phase_id: int, limit: int
) -> list[sqlite3.Row]:
    """Pytania do sesji dnia: najpierw nietknięte, potem najdawniej sprawdzane.

    Losowanie byłoby prostsze, ale gorsze - przy kilkunastu pytaniach na fazę
    losowa trójka regularnie omijałaby te, których nigdy nie próbowałeś, a to
    właśnie one uczą najwięcej. `COALESCE` na pustym stringu, bo NULL sortuje
    się w SQLite przed każdą datą i pytanie bez podejść i tak wychodzi pierwsze
    dzięki liczbie podejść.
    """
    return conn.execute(
        "SELECT questions.* FROM questions "
        "LEFT JOIN question_attempts "
        "       ON question_attempts.question_id = questions.id "
        "WHERE questions.phase_id = ? "
        "GROUP BY questions.id "
        "ORDER BY COUNT(question_attempts.id), "
        "         COALESCE(MAX(question_attempts.attempted_at), ''), "
        "         questions.id "
        "LIMIT ?",
        (phase_id, limit),
    ).fetchall()


def create(
    conn: sqlite3.Connection,
    phase_id: int,
    question_text: str,
    question_type: str,
    answer: str = "",
) -> int:
    cursor = conn.execute(
        "INSERT INTO questions "
        "(phase_id, question_text, question_type, answer, created_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (phase_id, question_text, question_type, answer, clock.now_iso()),
    )
    conn.commit()
    return cursor.lastrowid


# Osobne settery na pole zamiast jednego update(): tak samo jak w tasks_repo
# (update_title/update_notes/set_done). Każdy widget w UI ma własny callback,
# więc granularne funkcje nie wymagają zgadywania aktualnej wartości pozostałych
# pól z session_state.
#
# Bez updated_at: tabela questions nie ma tej kolumny i nigdzie jej nie
# pokazujemy, więc nie dokładamy migracji tylko po to.
def update_text(conn: sqlite3.Connection, question_id: int, question_text: str) -> None:
    conn.execute(
        "UPDATE questions SET question_text = ? WHERE id = ?",
        (question_text, question_id),
    )
    conn.commit()


def update_answer(conn: sqlite3.Connection, question_id: int, answer: str) -> None:
    conn.execute(
        "UPDATE questions SET answer = ? WHERE id = ?",
        (answer, question_id),
    )
    conn.commit()


def list_without_answer(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    """Pytania z pustą odpowiedzią - import z content/ może je uzupełnić."""
    return conn.execute("SELECT * FROM questions WHERE TRIM(answer) = ''").fetchall()


def update_type(conn: sqlite3.Connection, question_id: int, question_type: str) -> None:
    conn.execute(
        "UPDATE questions SET question_type = ? WHERE id = ?",
        (question_type, question_id),
    )
    conn.commit()


def update_phase(
    conn: sqlite3.Connection, question_id: int, phase_id: int | None
) -> None:
    conn.execute(
        "UPDATE questions SET phase_id = ? WHERE id = ?",
        (phase_id, question_id),
    )
    conn.commit()


def delete(conn: sqlite3.Connection, question_id: int) -> None:
    conn.execute("DELETE FROM questions WHERE id = ?", (question_id,))
    conn.commit()
