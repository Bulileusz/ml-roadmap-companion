import sqlite3

import streamlit as st

from repository import tasks_repo


def render_progress_bar(pct: float, caption: str) -> None:
    st.progress(pct / 100)
    st.caption(caption)


def _on_toggle_done(conn: sqlite3.Connection, task_id: int) -> None:
    is_done = st.session_state[f"done_{task_id}"]
    tasks_repo.set_task_done(conn, task_id, is_done)


def _on_title_change(conn: sqlite3.Connection, task_id: int) -> None:
    title = st.session_state[f"title_{task_id}"].strip()
    if title:
        tasks_repo.update_task_title(conn, task_id, title)


def _on_notes_change(conn: sqlite3.Connection, task_id: int) -> None:
    notes = st.session_state[f"notes_{task_id}"]
    tasks_repo.update_task_notes(conn, task_id, notes)


def render_task_row(conn: sqlite3.Connection, task: sqlite3.Row) -> None:
    task_id = task["id"]
    confirm_key = f"confirm_delete_{task_id}"

    col_check, col_title, col_delete = st.columns([0.06, 0.84, 0.10])

    with col_check:
        st.checkbox(
            "Zrobione",
            value=bool(task["is_done"]),
            key=f"done_{task_id}",
            on_change=_on_toggle_done,
            args=(conn, task_id),
            label_visibility="collapsed",
        )

    with col_title:
        st.text_input(
            "Tytuł",
            value=task["title"],
            key=f"title_{task_id}",
            on_change=_on_title_change,
            args=(conn, task_id),
            label_visibility="collapsed",
        )

    with col_delete:
        if st.session_state.get(confirm_key):
            c1, c2 = st.columns(2)
            if c1.button("Tak", key=f"delete_yes_{task_id}"):
                tasks_repo.delete_task(conn, task_id)
                st.session_state[confirm_key] = False
                st.rerun()
            if c2.button("Anuluj", key=f"delete_no_{task_id}"):
                st.session_state[confirm_key] = False
                st.rerun()
        else:
            if st.button("🗑️", key=f"delete_{task_id}"):
                st.session_state[confirm_key] = True
                st.rerun()

    st.text_area(
        "Notatki",
        value=task["notes"],
        key=f"notes_{task_id}",
        on_change=_on_notes_change,
        args=(conn, task_id),
        height=70,
        placeholder="co zrobiłem, wnioski...",
        label_visibility="collapsed",
    )
    st.divider()


def render_add_task_form(conn: sqlite3.Connection, phase_id: int) -> None:
    with st.form(key=f"add_task_form_{phase_id}", clear_on_submit=True):
        title = st.text_input("Nowe zadanie")
        submitted = st.form_submit_button("Dodaj zadanie")
        if submitted and title.strip():
            tasks_repo.create_task(conn, phase_id, title.strip())
            st.rerun()


def render_phase_section(conn: sqlite3.Connection, phase: sqlite3.Row, expanded: bool = False) -> None:
    done, total = tasks_repo.count_progress(conn, phase["id"])
    pct = 0.0 if total == 0 else done / total * 100

    with st.expander(phase["name"], expanded=expanded):
        render_progress_bar(pct, f"{done}/{total} zadań ({pct:.0f}%)")

        tasks = tasks_repo.list_tasks_by_phase(conn, phase["id"])
        for task in tasks:
            render_task_row(conn, task)

        render_add_task_form(conn, phase["id"])
