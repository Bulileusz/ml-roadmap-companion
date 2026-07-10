import sqlite3

import streamlit as st

from repository import question_attempts_repo, questions_repo
from services import question_stats

QUESTION_TYPE_LABELS = {"concept": "Koncepcyjne", "code": "Kodowe"}


def render_question_row(conn: sqlite3.Connection, question: sqlite3.Row) -> None:
    question_id = question["id"]
    confirm_key = f"confirm_delete_question_{question_id}"

    col_text, col_type, col_delete = st.columns([0.6, 0.2, 0.2])

    with col_text:
        st.markdown(f"**{question['question_text']}**")
    with col_type:
        st.caption(QUESTION_TYPE_LABELS.get(question["question_type"], question["question_type"]))
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
            question_attempts_repo.create_attempt(conn, question_id, True)
            st.rerun()
    with col_checked:
        if st.button("📖 Musiałem sprawdzić rozwiązanie", key=f"checked_{question_id}"):
            question_attempts_repo.create_attempt(conn, question_id, False)
            st.rerun()
    with col_summary:
        if summary["total"] == 0:
            st.caption("Brak podejść jeszcze.")
        else:
            st.caption(
                f"{summary['independent']}/{summary['total']} samodzielnie "
                f"({summary['pct']:.0f}%)"
            )

    if attempts:
        with st.expander(f"Historia podejść ({len(attempts)})"):
            for attempt in attempts:
                icon = "✅" if attempt["solved_independently"] else "📖"
                st.caption(f"{icon} {attempt['attempted_at']}")

    st.divider()


def render_add_question_form(conn: sqlite3.Connection, phase_id: int) -> None:
    with st.form(key=f"add_question_form_{phase_id}", clear_on_submit=True):
        text = st.text_area("Nowe pytanie", height=80)
        question_type = st.selectbox(
            "Typ",
            options=list(QUESTION_TYPE_LABELS.keys()),
            format_func=lambda key: QUESTION_TYPE_LABELS[key],
            key=f"question_type_{phase_id}",
        )
        submitted = st.form_submit_button("Dodaj pytanie")
        if submitted and text.strip():
            questions_repo.create(conn, phase_id, text.strip(), question_type)
            st.rerun()


def render_phase_questions_section(conn: sqlite3.Connection, phase: sqlite3.Row) -> None:
    questions = questions_repo.list_by_phase(conn, phase["id"])

    with st.expander(f"{phase['name']} ({len(questions)})"):
        if not questions:
            st.caption("Brak pytań - dodaj pierwsze poniżej.")
        for question in questions:
            render_question_row(conn, question)

        render_add_question_form(conn, phase["id"])
