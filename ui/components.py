import sqlite3

import streamlit as st

from repository import tasks_repo
from services import activity

NO_PHASE_LABEL = "— brak —"


def phase_options(phases: list[sqlite3.Row]) -> dict[str, int | None]:
    """Etykieta widoczna w selectboxie -> phase_id (None = fiszka/pytanie luzem)."""
    options: dict[str, int | None] = {NO_PHASE_LABEL: None}
    for phase in phases:
        options[phase["name"]] = phase["id"]
    return options


def phase_label(options: dict[str, int | None], phase_id: int | None) -> str:
    for label, option_id in options.items():
        if option_id == phase_id:
            return label
    # Faza mogła zostać usunięta (FK z ON DELETE SET NULL czyści phase_id
    # dopiero w bazie) - w UI pokazujemy wtedy po prostu "brak".
    return NO_PHASE_LABEL


def render_progress_bar(pct: float, caption: str) -> None:
    st.progress(pct / 100)
    st.caption(caption)


def _on_toggle_done(conn: sqlite3.Connection, task: sqlite3.Row) -> None:
    is_done = st.session_state[f"done_{task['id']}"]
    activity.record_task_toggle(conn, task, is_done)


def _on_title_change(conn: sqlite3.Connection, task_id: int, prev_title: str) -> None:
    key = f"title_{task_id}"
    title = st.session_state[key].strip()
    if title:
        tasks_repo.update_title(conn, task_id, title)
    else:
        # Pusty tytuł: przywracamy poprzednią wartość, żeby widget
        # nie rozjechał się z bazą.
        st.session_state[key] = prev_title
        st.toast("Tytuł nie może być pusty", icon="⚠️")


def _on_notes_change(conn: sqlite3.Connection, task_id: int) -> None:
    notes = st.session_state[f"notes_{task_id}"]
    tasks_repo.update_notes(conn, task_id, notes)


def render_task_row(conn: sqlite3.Connection, task: sqlite3.Row) -> None:
    task_id = task["id"]
    confirm_key = f"confirm_delete_{task_id}"

    # Checkbox i tytuł zostają widoczne, bo to codzienna czynność. Notatki
    # i usuwanie idą do popovera - zawsze rozwinięte pole notatek dawało
    # ~200 px na task, czyli kilka ekranów przewijania na fazę.
    has_notes = bool(task["notes"].strip())
    with st.container(horizontal=True, vertical_alignment="center"):
        st.checkbox(
            "Zrobione",
            value=bool(task["is_done"]),
            key=f"done_{task_id}",
            on_change=_on_toggle_done,
            args=(conn, task),
            label_visibility="collapsed",
            width="content",
        )
        st.text_input(
            "Tytuł",
            value=task["title"],
            key=f"title_{task_id}",
            on_change=_on_title_change,
            args=(conn, task_id, task["title"]),
            label_visibility="collapsed",
            width="stretch",
        )
        with st.popover("📝" if has_notes else "✏️", width="content"):
            st.text_area(
                "Notatki",
                value=task["notes"],
                key=f"notes_{task_id}",
                on_change=_on_notes_change,
                args=(conn, task_id),
                height=160,
                placeholder="co zrobiłem, wnioski...",
            )
            st.divider()
            if st.session_state.get(confirm_key):
                st.caption("Na pewno usunąć to zadanie?")
                with st.container(horizontal=True):
                    if st.button("Tak, usuń", key=f"delete_yes_{task_id}"):
                        tasks_repo.delete(conn, task_id)
                        st.session_state[confirm_key] = False
                        st.rerun()
                    if st.button("Anuluj", key=f"delete_no_{task_id}"):
                        st.session_state[confirm_key] = False
                        st.rerun()
            else:
                if st.button("🗑️ Usuń zadanie", key=f"delete_{task_id}"):
                    st.session_state[confirm_key] = True
                    st.rerun()


def _on_add_task(conn: sqlite3.Connection, phase_id: int) -> None:
    # Celowo bez st.form: pola formularzy trzymają lokalny stan we froncie
    # i nie da się ich niezawodnie wyczyścić z session_state. Zwykły widget
    # + czyszczenie klucza w callbacku przycisku działa przewidywalnie.
    title_key = f"add_task_title_{phase_id}"
    error_key = f"add_task_error_{phase_id}"
    title = st.session_state.get(title_key, "").strip()
    if title:
        tasks_repo.create(conn, phase_id, title)
        st.session_state[title_key] = ""
        st.session_state.pop(error_key, None)
    else:
        st.session_state[error_key] = "Tytuł zadania nie może być pusty."


def render_add_task_form(conn: sqlite3.Connection, phase_id: int) -> None:
    with st.container(border=True):
        st.text_input("Nowe zadanie", key=f"add_task_title_{phase_id}")
        st.button(
            "Dodaj zadanie",
            key=f"add_task_submit_{phase_id}",
            on_click=_on_add_task,
            args=(conn, phase_id),
        )
        error = st.session_state.get(f"add_task_error_{phase_id}")
        if error:
            st.error(error)


def render_phase_section(
    conn: sqlite3.Connection,
    entry: dict,
    expanded: bool = False,
    icon: str | None = None,
) -> None:
    phase = entry["phase"]
    done, total, pct = entry["done"], entry["total"], entry["pct"]

    with st.expander(phase["name"], expanded=expanded, icon=icon):
        render_progress_bar(pct, f"{done}/{total} zadań ({int(pct)}%)")

        tasks = tasks_repo.list_by_phase(conn, phase["id"])
        for task in tasks:
            render_task_row(conn, task)

        render_add_task_form(conn, phase["id"])
