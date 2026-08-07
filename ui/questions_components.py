import sqlite3

import streamlit as st

from repository import question_attempts_repo, questions_repo
from services import question_stats

QUESTION_TYPE_LABELS = {"concept": "Koncepcyjne", "code": "Kodowe"}
QUESTION_TYPE_BADGE_COLORS = {"concept": "blue", "code": "violet"}


def render_question_row(conn: sqlite3.Connection, question: sqlite3.Row) -> None:
    question_id = question["id"]
    confirm_key = f"confirm_delete_question_{question_id}"

    col_text, col_type, col_delete = st.columns([0.6, 0.2, 0.2])

    with col_text:
        st.markdown(f"**{question['question_text']}**")
    with col_type:
        question_type = question["question_type"]
        st.badge(
            QUESTION_TYPE_LABELS.get(question_type, question_type),
            color=QUESTION_TYPE_BADGE_COLORS.get(question_type, "gray"),
        )
    with col_delete:
        if st.session_state.get(confirm_key):
            c1, c2 = st.columns(2)
            if c1.button("Tak", key=f"question_delete_yes_{question_id}"):
                questions_repo.delete(conn, question_id)
                st.session_state[confirm_key] = False
                st.rerun()
            if c2.button("Anuluj", key=f"question_delete_no_{question_id}"):
                st.session_state[confirm_key] = False
                st.rerun()
        else:
            if st.button("🗑️", key=f"question_delete_{question_id}"):
                st.session_state[confirm_key] = True
                st.rerun()

    attempts = question_attempts_repo.list_by_question(conn, question_id)
    summary = question_stats.summarize_attempts(attempts)

    col_solo, col_checked, col_summary = st.columns([0.3, 0.35, 0.35])
    with col_solo:
        if st.button("✅ Rozwiązałem samodzielnie", key=f"solo_{question_id}"):
            question_attempts_repo.create(conn, question_id, True)
            st.rerun()
    with col_checked:
        if st.button("📖 Musiałem sprawdzić rozwiązanie", key=f"checked_{question_id}"):
            question_attempts_repo.create(conn, question_id, False)
            st.rerun()
    with col_summary:
        if summary["total"] == 0:
            st.caption("Brak podejść jeszcze.")
        else:
            st.progress(
                summary["pct"] / 100,
                text=(
                    f"{summary['independent']}/{summary['total']} samodzielnie "
                    f"({int(summary['pct'])}%)"
                ),
            )

    if attempts:
        with st.expander(f"Historia podejść ({len(attempts)})"):
            for attempt in attempts:
                icon = "✅" if attempt["solved_independently"] else "📖"
                # Obcinamy sekundy: "YYYY-MM-DD HH:MM".
                st.caption(f"{icon} `{attempt['attempted_at'][:16]}`")

    st.divider()


def _on_add_question(conn: sqlite3.Connection, phase_id: int) -> None:
    # Celowo bez st.form: pola formularzy trzymają lokalny stan we froncie
    # i nie da się ich niezawodnie wyczyścić z session_state. Zwykły widget
    # + czyszczenie klucza w callbacku przycisku działa przewidywalnie.
    text_key = f"add_question_text_{phase_id}"
    error_key = f"add_question_error_{phase_id}"
    text = st.session_state.get(text_key, "").strip()
    if text:
        question_type = st.session_state.get(f"question_type_{phase_id}", "concept")
        questions_repo.create(conn, phase_id, text, question_type)
        st.session_state[text_key] = ""
        st.session_state.pop(error_key, None)
    else:
        st.session_state[error_key] = "Treść pytania nie może być pusta."


def render_add_question_form(conn: sqlite3.Connection, phase_id: int) -> None:
    with st.container(border=True):
        st.text_area("Nowe pytanie", height=80, key=f"add_question_text_{phase_id}")
        st.selectbox(
            "Typ",
            options=list(QUESTION_TYPE_LABELS.keys()),
            format_func=lambda key: QUESTION_TYPE_LABELS[key],
            key=f"question_type_{phase_id}",
        )
        st.button(
            "Dodaj pytanie",
            key=f"add_question_submit_{phase_id}",
            on_click=_on_add_question,
            args=(conn, phase_id),
        )
        error = st.session_state.get(f"add_question_error_{phase_id}")
        if error:
            st.error(error)


def render_phase_questions_section(
    conn: sqlite3.Connection, phase: sqlite3.Row
) -> None:
    questions = questions_repo.list_by_phase(conn, phase["id"])

    with st.expander(f"{phase['name']} ({len(questions)})"):
        if not questions:
            st.caption("Brak pytań - dodaj pierwsze poniżej.")
        for question in questions:
            render_question_row(conn, question)

        render_add_question_form(conn, phase["id"])
