import sqlite3
from itertools import groupby

import streamlit as st

from repository import activity_repo
from services import activity, clock, streak
from ui.theme import METRIC_WIDTH, empty_state

ACTIVITY_LABELS = {
    activity_repo.KIND_TASK_DONE: ("✅", "Zadanie zrobione"),
    activity_repo.KIND_TASK_UNDONE: ("↩️", "Zadanie odznaczone"),
    activity_repo.KIND_CARD_REVIEW: ("🃏", "Powtórka fiszki"),
    activity_repo.KIND_QUESTION_ATTEMPT: ("📝", "Podejście do pytania"),
}


def render_streak_summary(conn: sqlite3.Connection) -> None:
    summary = activity.get_streak(conn)

    # Kontener poziomy zamiast st.columns(3) - ten sam powód co na stronie
    # startowej: kolumny na telefonie układają się jedna pod drugą i sam rząd
    # metryk zjada ekran, zanim widać dziennik.
    with st.container(horizontal=True):
        st.metric(
            "Aktualna seria", summary["current"], border=True, width=METRIC_WIDTH
        )
        st.metric("Rekord", summary["longest"], border=True, width=METRIC_WIDTH)
        st.metric(
            "Dni z aktywnością",
            summary["active_days"],
            border=True,
            width=METRIC_WIDTH,
        )

    if summary["current"] == 0 and summary["active_days"] > 0:
        st.caption(
            "Seria przerwana — odhacz zadanie, zrób powtórkę albo podejdź "
            "do pytania, żeby zacząć od nowa."
        )


def render_activity_calendar(conn: sqlite3.Connection, days: int = 30) -> None:
    st.subheader(f"Ostatnie {days} dni")
    active_dates = activity_repo.list_active_dates(conn)
    calendar = streak.activity_last_days(active_dates, clock.today(), days)

    # Pasek dzień-po-dniu: wypełniony kwadrat = był ruch. Prosty markdown
    # zamiast wykresu - nie ciągniemy pandas/altair tylko po to.
    marks = "".join("🟩" if was_active else "⬛" for _, was_active in calendar)
    st.markdown(marks)
    st.caption(f"{calendar[0][0].isoformat()} → {calendar[-1][0].isoformat()}")


def render_activity_feed(conn: sqlite3.Connection, limit: int = 100) -> None:
    st.subheader("Historia")
    entries = activity_repo.list_recent(conn, limit)

    if not entries:
        empty_state(
            "Dziennik jest pusty. Zapisuje się tu odhaczenie zadania, "
            "powtórka fiszki i podejście do pytania."
        )
        return

    # list_recent zwraca posortowane malejąco, więc groupby po dacie wystarczy
    # bez ponownego sortowania.
    for day, day_entries in groupby(entries, key=lambda row: row["occurred_at"][:10]):
        day_entries = list(day_entries)
        with st.expander(
            f"{day} · {len(day_entries)}",
            expanded=(day == entries[0]["occurred_at"][:10]),
        ):
            for entry in day_entries:
                icon, label = ACTIVITY_LABELS.get(entry["kind"], ("•", entry["kind"]))
                detail = entry["detail"] or "—"
                st.caption(
                    f"{icon} `{entry['occurred_at'][11:16]}` **{label}** · {detail}"
                )
