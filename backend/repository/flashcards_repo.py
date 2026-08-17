import sqlite3

from services import clock


def list_all(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM flashcards ORDER BY created_at DESC, id DESC"
    ).fetchall()


# learned_at IS NOT NULL w każdym pytaniu o powtórki: fiszka przed przebiegiem
# zapoznawczym nie jest wymagalna, choćby jej next_review_at wypadał na dziś.
# Bez tego warunku pierwszym kontaktem z importowaną kartą byłoby pytanie
# "umiałem / nie umiałem" o coś, czego nigdy nie widziałeś - dokładnie ten błąd,
# który opisuje docs/modul-nauki.md.
_LEARNED = "learned_at IS NOT NULL"
_AWAITING_INTRO = "learned_at IS NULL"


def list_due(conn: sqlite3.Connection, on_or_before: str) -> list[sqlite3.Row]:
    return conn.execute(
        f"SELECT * FROM flashcards WHERE {_LEARNED} AND next_review_at <= ? "
        "ORDER BY next_review_at, id",
        (on_or_before,),
    ).fetchall()


def count_due(conn: sqlite3.Connection, on_or_before: str) -> int:
    return conn.execute(
        f"SELECT COUNT(*) FROM flashcards WHERE {_LEARNED} AND next_review_at <= ?",
        (on_or_before,),
    ).fetchone()[0]


def list_intro_queue(conn: sqlite3.Connection, limit: int) -> list[sqlite3.Row]:
    """Fiszki czekające na przebieg zapoznawczy, najstarsze pierwsze."""
    return conn.execute(
        f"SELECT * FROM flashcards WHERE {_AWAITING_INTRO} ORDER BY created_at, id "
        "LIMIT ?",
        (limit,),
    ).fetchall()


def count_intro_queue(conn: sqlite3.Connection) -> int:
    return conn.execute(
        f"SELECT COUNT(*) FROM flashcards WHERE {_AWAITING_INTRO}"
    ).fetchone()[0]


def count_learned_by_phase(conn: sqlite3.Connection, phase_id: int) -> int:
    """Ile fiszek tej fazy masz już za sobą w przebiegu zapoznawczym.

    Miara "czy zdążyłeś zobaczyć materiał": pytania z fazy odblokowują się
    dopiero powyżej progu (services/session.py). Liczymy poznane, nie wszystkie
    istniejące - sto zaimportowanych kart, których nigdy nie widziałeś, nie
    czyni cię gotowym na pytania.
    """
    return conn.execute(
        f"SELECT COUNT(*) FROM flashcards WHERE phase_id = ? AND {_LEARNED}",
        (phase_id,),
    ).fetchone()[0]


def count_by_box(conn: sqlite3.Connection) -> dict[int, int]:
    # Tylko poznane: karta przed zapoznaniem siedzi formalnie w pudełku 1, ale
    # pokazywanie jej na wykresie pudełek kłamałoby o stanie nauki. Kolejka
    # zapoznawcza ma własny licznik (count_intro_queue).
    rows = conn.execute(
        f"SELECT box, COUNT(*) AS cnt FROM flashcards WHERE {_LEARNED} GROUP BY box"
    ).fetchall()
    return {row["box"]: row["cnt"] for row in rows}


def get(conn: sqlite3.Connection, card_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM flashcards WHERE id = ?", (card_id,)).fetchone()


def create(
    conn: sqlite3.Connection,
    front: str,
    back: str,
    phase_id: int | None,
    next_review_at: str,
    learned_at: str | None,
) -> int:
    """`learned_at=None` odkłada fiszkę do kolejki zapoznawczej.

    Parametr jest wymagany, bez wartości domyślnej: to decyzja domenowa
    ("czy tę kartę już widziałem"), a nie szczegół zapisu, więc ma być podjęta
    świadomie u wywołującego. Robi to services/spaced_repetition.create_card.
    """
    now = clock.now_iso()
    cursor = conn.execute(
        "INSERT INTO flashcards "
        "(phase_id, front, back, next_review_at, learned_at, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (phase_id, front, back, next_review_at, learned_at, now, now),
    )
    conn.commit()
    return cursor.lastrowid


def update_content(
    conn: sqlite3.Connection, card_id: int, front: str, back: str
) -> None:
    conn.execute(
        "UPDATE flashcards SET front = ?, back = ?, updated_at = ? WHERE id = ?",
        (front, back, clock.now_iso(), card_id),
    )
    conn.commit()


def update_phase(conn: sqlite3.Connection, card_id: int, phase_id: int | None) -> None:
    conn.execute(
        "UPDATE flashcards SET phase_id = ?, updated_at = ? WHERE id = ?",
        (phase_id, clock.now_iso(), card_id),
    )
    conn.commit()


def update_own_note(conn: sqlite3.Connection, card_id: int, own_note: str) -> None:
    """Notatka własnymi słowami. Pusta jest dozwolona - to legalny stan
    "jeszcze nie napisana", tak samo jak pusta odpowiedź przy pytaniu."""
    conn.execute(
        "UPDATE flashcards SET own_note = ?, updated_at = ? WHERE id = ?",
        (own_note, clock.now_iso(), card_id),
    )
    conn.commit()


def mark_learned(
    conn: sqlite3.Connection,
    card_id: int,
    learned_at: str,
    box: int,
    next_review_at: str,
) -> None:
    """Domknięcie przebiegu zapoznawczego: karta wchodzi do normalnej rotacji.

    Stempel i harmonogram jednym UPDATE-em, bo to jedno zdarzenie - dwa osobne
    zapisy mogłyby zostawić kartę poznaną, ale bez terminu powtórki.
    """
    conn.execute(
        "UPDATE flashcards SET learned_at = ?, box = ?, next_review_at = ?, "
        "updated_at = ? WHERE id = ?",
        (learned_at, box, next_review_at, clock.now_iso(), card_id),
    )
    conn.commit()


def update_schedule(
    conn: sqlite3.Connection, card_id: int, box: int, next_review_at: str
) -> None:
    conn.execute(
        "UPDATE flashcards SET box = ?, next_review_at = ?, updated_at = ? "
        "WHERE id = ?",
        (box, next_review_at, clock.now_iso(), card_id),
    )
    conn.commit()


def delete(conn: sqlite3.Connection, card_id: int) -> None:
    conn.execute("DELETE FROM flashcards WHERE id = ?", (card_id,))
    conn.commit()
