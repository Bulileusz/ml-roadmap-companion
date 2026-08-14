"""Zależności współdzielone przez routery: połączenie z bazą i konwersja wierszy."""

import sqlite3
from collections.abc import Iterator
from typing import Annotated, Any

from fastapi import Depends, HTTPException

from db.connection import get_connection


def get_db() -> Iterator[sqlite3.Connection]:
    """Świeże połączenie na request, zamykane po odpowiedzi.

    Świadome odejście od jednego współdzielonego połączenia, które trzymała
    wersja streamlitowa (`st.cache_resource`). Endpointy są zwykłymi `def`, więc
    FastAPI puszcza je w threadpoolu - a jedno `sqlite3.Connection` z
    `check_same_thread=False` dzielone między wątkami to zaproszenie do
    przeplecionych transakcji, bo repozytoria commitują same. Otwarcie
    połączenia do lokalnego pliku kosztuje mikrosekundy, a WAL i tak dopuszcza
    równoległych czytelników.
    """
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


DbConn = Annotated[sqlite3.Connection, Depends(get_db)]


def as_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def as_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    """sqlite3.Row nie jest mapowaniem, którego Pydantic sam się domyśli.

    Zamiana na dict tutaj, a nie `model_validate` w każdym endpointcie: FastAPI
    waliduje zwracane dicty względem `response_model` i tak, więc jedna
    konwersja wystarcza na całą warstwę.
    """
    return [dict(row) for row in rows]


def found(row: sqlite3.Row | None, what: str) -> sqlite3.Row:
    """Wiersz albo 404 z sensownym komunikatem po polsku."""
    if row is None:
        raise HTTPException(status_code=404, detail=f"Nie znaleziono: {what}.")
    return row
