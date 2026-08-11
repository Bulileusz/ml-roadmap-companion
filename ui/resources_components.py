import sqlite3

import streamlit as st

from repository import resources_repo
from ui.components import confirm_delete, phase_label, phase_options
from ui.theme import METRIC_WIDTH, badge, empty_state

KIND_LABELS = {
    "book": ("📕", "Książka"),
    "course": ("🎓", "Kurs"),
    "video": ("🎬", "Wideo"),
    "docs": ("📄", "Dokumentacja"),
    "article": ("📰", "Artykuł"),
    "other": ("🔗", "Inne"),
}

STATUS_LABELS = {
    resources_repo.STATUS_TODO: "Do przerobienia",
    resources_repo.STATUS_IN_PROGRESS: "W trakcie",
    resources_repo.STATUS_DONE: "Przerobione",
}

STATUS_BADGE_COLORS = {
    resources_repo.STATUS_TODO: "gray",
    resources_repo.STATUS_IN_PROGRESS: "orange",
    resources_repo.STATUS_DONE: "green",
}


def _on_status_change(conn: sqlite3.Connection, resource_id: int) -> None:
    resources_repo.update_status(
        conn, resource_id, st.session_state[f"resource_status_{resource_id}"]
    )


def _on_fields_change(
    conn: sqlite3.Connection, resource_id: int, prev_title: str
) -> None:
    title_key = f"resource_title_{resource_id}"
    title = st.session_state[title_key].strip()
    if not title:
        # Ten sam wzorzec co przy tytule taska: pusty tytuł wraca do
        # poprzedniej wartości, żeby widget nie rozjechał się z bazą.
        st.session_state[title_key] = prev_title
        st.toast("Tytuł materiału nie może być pusty", icon="⚠️")
        return
    resources_repo.update_fields(
        conn,
        resource_id,
        title,
        st.session_state[f"resource_url_{resource_id}"].strip(),
        st.session_state[f"resource_detail_{resource_id}"],
    )


def _on_resource_phase_change(
    conn: sqlite3.Connection, resource_id: int, options: dict[str, int | None]
) -> None:
    label = st.session_state[f"resource_phase_{resource_id}"]
    resources_repo.update_phase(conn, resource_id, options[label])


def render_resource_row(
    conn: sqlite3.Connection, resource: sqlite3.Row, phases: list[sqlite3.Row]
) -> None:
    resource_id = resource["id"]
    options = phase_options(phases)

    icon, kind_label = KIND_LABELS.get(resource["kind"], KIND_LABELS["other"])
    status = resource["status"]
    title = resource["title"]
    # Tytuł jako link, gdy jest URL - jedno kliknięcie zamiast kopiowania.
    heading = f"[{title}]({resource['url']})" if resource["url"] else f"**{title}**"
    kind_badge = badge(f"{icon} {kind_label}", STATUS_BADGE_COLORS.get(status, "gray"))

    with st.container(horizontal=True, vertical_alignment="center"):
        st.markdown(f"{kind_badge} {heading}", width="stretch")
        with st.popover("✏️", width="content"):
            st.text_input(
                "Tytuł",
                value=title,
                key=f"resource_title_{resource_id}",
                on_change=_on_fields_change,
                args=(conn, resource_id, title),
            )
            st.text_input(
                "Link",
                value=resource["url"],
                key=f"resource_url_{resource_id}",
                on_change=_on_fields_change,
                args=(conn, resource_id, title),
            )
            st.text_area(
                "Opis / rozdział",
                value=resource["detail"],
                key=f"resource_detail_{resource_id}",
                on_change=_on_fields_change,
                args=(conn, resource_id, title),
                height=120,
            )
            option_labels = list(options.keys())
            st.selectbox(
                "Faza",
                options=option_labels,
                index=option_labels.index(phase_label(options, resource["phase_id"])),
                key=f"resource_phase_{resource_id}",
                on_change=_on_resource_phase_change,
                args=(conn, resource_id, options),
            )
            st.divider()
            confirm_delete(
                "Usuń materiał",
                "Na pewno usunąć ten materiał?",
                f"resource_{resource_id}",
                lambda: resources_repo.delete(conn, resource_id),
            )

    st.segmented_control(
        "Status",
        options=list(STATUS_LABELS.keys()),
        format_func=lambda key: STATUS_LABELS[key],
        default=status,
        key=f"resource_status_{resource_id}",
        on_change=_on_status_change,
        args=(conn, resource_id),
        label_visibility="collapsed",
    )
    if resource["detail"]:
        st.caption(resource["detail"])
    st.divider()


def _on_add_resource(conn: sqlite3.Connection, phase_id: int) -> None:
    # Celowo bez st.form - patrz komentarz w ui/components.py.
    title_key = f"add_resource_title_{phase_id}"
    error_key = f"add_resource_error_{phase_id}"
    title = st.session_state.get(title_key, "").strip()
    if not title:
        st.session_state[error_key] = "Tytuł materiału nie może być pusty."
        return
    resources_repo.create(
        conn,
        phase_id,
        title,
        st.session_state.get(f"add_resource_url_{phase_id}", "").strip(),
        st.session_state.get(
            f"add_resource_kind_{phase_id}", resources_repo.DEFAULT_KIND
        ),
    )
    st.session_state[title_key] = ""
    st.session_state[f"add_resource_url_{phase_id}"] = ""
    st.session_state.pop(error_key, None)


def render_add_resource_form(conn: sqlite3.Connection, phase_id: int) -> None:
    with st.container(border=True):
        st.text_input("Nowy materiał", key=f"add_resource_title_{phase_id}")
        st.text_input("Link (opcjonalnie)", key=f"add_resource_url_{phase_id}")
        st.selectbox(
            "Rodzaj",
            options=list(KIND_LABELS.keys()),
            format_func=lambda key: f"{KIND_LABELS[key][0]} {KIND_LABELS[key][1]}",
            key=f"add_resource_kind_{phase_id}",
        )
        st.button(
            "Dodaj materiał",
            key=f"add_resource_submit_{phase_id}",
            on_click=_on_add_resource,
            args=(conn, phase_id),
        )
        error = st.session_state.get(f"add_resource_error_{phase_id}")
        if error:
            st.error(error)


def render_phase_resources_section(
    conn: sqlite3.Connection, phase: sqlite3.Row, phases: list[sqlite3.Row]
) -> None:
    resources = resources_repo.list_by_phase(conn, phase["id"])
    done = sum(1 for r in resources if r["status"] == resources_repo.STATUS_DONE)

    with st.expander(f"{phase['name']} ({done}/{len(resources)})"):
        if resources:
            st.progress(done / len(resources))
        else:
            empty_state("Brak materiałów — dodaj pierwszy poniżej.")
        for resource in resources:
            render_resource_row(conn, resource, phases)

        render_add_resource_form(conn, phase["id"])


def render_overall_progress(conn: sqlite3.Connection) -> None:
    counts = resources_repo.count_by_status(conn)
    total = sum(counts.values())
    if total == 0:
        return

    with st.container(horizontal=True):
        for status, label in STATUS_LABELS.items():
            st.metric(label, counts.get(status, 0), border=True, width=METRIC_WIDTH)
