import sqlite3

from services import clock

# Rodzaje zdarzeń dziennika. Od migracji 6 schemat nie ma na nie CHECK-a - lista
# rośnie z każdym modułem, więc jej miejsce jest tutaj, przy kodzie, który jej
# używa (dokładnie ta sama decyzja co przy content_imports_repo.KINDS).
KIND_TASK_DONE = "task_done"
KIND_TASK_UNDONE = "task_undone"
KIND_CARD_REVIEW = "card_review"
KIND_CARD_INTRO = "card_intro"
KIND_QUESTION_ATTEMPT = "question_attempt"
KIND_RESOURCE_DONE = "resource_done"
KINDS = (
    KIND_TASK_DONE,
    KIND_TASK_UNDONE,
    KIND_CARD_REVIEW,
    KIND_CARD_INTRO,
    KIND_QUESTION_ATTEMPT,
    KIND_RESOURCE_DONE,
)


def log(
    conn: sqlite3.Connection, kind: str, ref_id: int | None, detail: str = ""
) -> int:
    cursor = conn.execute(
        "INSERT INTO activity_log (occurred_at, kind, ref_id, detail) "
        "VALUES (?, ?, ?, ?)",
        (clock.now_iso(), kind, ref_id, detail),
    )
    conn.commit()
    return cursor.lastrowid


def list_recent(conn: sqlite3.Connection, limit: int = 100) -> list[sqlite3.Row]:
    # id DESC jako tiebreak dla zdarzeń zapisanych w tej samej sekundzie.
    return conn.execute(
        "SELECT * FROM activity_log ORDER BY occurred_at DESC, id DESC LIMIT ?",
        (limit,),
    ).fetchall()


def list_active_dates(conn: sqlite3.Connection) -> list[str]:
    """Dni z jakąkolwiek aktywnością, format 'RRRR-MM-DD', od najnowszego."""
    rows = conn.execute(
        "SELECT DISTINCT DATE(occurred_at) AS day FROM activity_log ORDER BY day DESC"
    ).fetchall()
    return [row["day"] for row in rows]


def count_all(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0]


def count_by_kind(conn: sqlite3.Connection) -> dict[str, int]:
    """Ile zdarzeń każdego rodzaju - podstawa wyliczenia XP i osiągnięć."""
    rows = conn.execute(
        "SELECT kind, COUNT(*) AS cnt FROM activity_log GROUP BY kind"
    ).fetchall()
    return {row["kind"]: row["cnt"] for row in rows}


def counts_per_day_by_kind(
    conn: sqlite3.Connection, since: str
) -> dict[str, dict[str, int]]:
    """Dzień -> rodzaj -> liczba zdarzeń, od `since` (RRRR-MM-DD).

    Dziennik pokazuje dzień rozbity na składniki ("14 powtórek, 2 nowe karty"),
    a XP dnia wylicza się z tych samych liczników co XP całkowite - jedno
    zapytanie zamiast sześciu po jednym na rodzaj.
    """
    rows = conn.execute(
        "SELECT DATE(occurred_at) AS day, kind, COUNT(*) AS cnt FROM activity_log "
        "WHERE DATE(occurred_at) >= ? GROUP BY day, kind",
        (since,),
    ).fetchall()
    result: dict[str, dict[str, int]] = {}
    for row in rows:
        result.setdefault(row["day"], {})[row["kind"]] = row["cnt"]
    return result


# Do której fazy należy zdarzenie, zależy od jego rodzaju: powtórka i zapoznanie
# wskazują fiszkę, podejście - pytanie, odhaczenie - zadanie, domknięcie -
# materiał. Każdy JOIN jest LEFT-em, bo activity_log.ref_id celowo nie jest
# kluczem obcym: wpis przeżywa usunięcie obiektu, którego dotyczył, i wtedy po
# prostu nie da się już powiedzieć, w której fazie ten dzień upłynął.
_PHASE_COUNTS_PER_DAY = """
-- Alias `phase`, nie `phase_id`: cztery dołączone tabele mają własną kolumnę
-- o tej nazwie, więc GROUP BY po niej byłby dwuznaczny.
SELECT DATE(activity_log.occurred_at) AS day,
       COALESCE(flashcards.phase_id, questions.phase_id,
                tasks.phase_id, resources.phase_id) AS phase,
       COUNT(*) AS cnt
FROM activity_log
LEFT JOIN flashcards
       ON activity_log.kind IN (?, ?) AND flashcards.id = activity_log.ref_id
LEFT JOIN questions
       ON activity_log.kind = ? AND questions.id = activity_log.ref_id
LEFT JOIN tasks
       ON activity_log.kind IN (?, ?) AND tasks.id = activity_log.ref_id
LEFT JOIN resources
       ON activity_log.kind = ? AND resources.id = activity_log.ref_id
WHERE DATE(activity_log.occurred_at) >= ?
GROUP BY day, phase
"""


def phase_counts_per_day(
    conn: sqlite3.Connection, since: str
) -> dict[str, dict[int | None, int]]:
    """Dzień -> faza -> liczba zdarzeń. `None` = fazy nie da się już ustalić."""
    rows = conn.execute(
        _PHASE_COUNTS_PER_DAY,
        (
            KIND_CARD_REVIEW,
            KIND_CARD_INTRO,
            KIND_QUESTION_ATTEMPT,
            KIND_TASK_DONE,
            KIND_TASK_UNDONE,
            KIND_RESOURCE_DONE,
            since,
        ),
    ).fetchall()
    result: dict[str, dict[int | None, int]] = {}
    for row in rows:
        result.setdefault(row["day"], {})[row["phase"]] = row["cnt"]
    return result


def count_per_day(conn: sqlite3.Connection, since: str) -> dict[str, int]:
    """Liczba zdarzeń na dzień od `since` (RRRR-MM-DD) - pod heatmapę i sparkline.

    Zwracamy słownik, nie listę: kalendarz i tak trzeba wypełnić także dniami
    bez ruchu, a to robi już services/streak.py na czystych funkcjach.
    """
    rows = conn.execute(
        "SELECT DATE(occurred_at) AS day, COUNT(*) AS cnt FROM activity_log "
        "WHERE DATE(occurred_at) >= ? GROUP BY day",
        (since,),
    ).fetchall()
    return {row["day"]: row["cnt"] for row in rows}
