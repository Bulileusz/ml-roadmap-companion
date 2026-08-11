import sqlite3

import streamlit as st

from repository import question_attempts_repo, questions_repo
from services import activity, question_stats
from ui.components import phase_label, phase_options

QUESTION_TYPE_LABELS = {"concept": "Koncepcyjne", "code": "Kodowe"}
QUESTION_TYPE_BADGE_COLORS = {"concept": "blue", "code": "violet"}


def _on_text_change(conn: sqlite3.Connection, question_id: int, prev_text: str) -> None:
    key = f"question_text_{question_id}"
    text = st.session_state[key].strip()
    if text:
        questions_repo.update_text(conn, question_id, text)
    else:
        # Pusta treść: przywracamy poprzednią wartość, żeby widget nie
        # rozjechał się z bazą (ten sam wzorzec co przy tytule taska).
        st.session_state[key] = prev_text
        st.toast("Treść pytania nie może być pusta", icon="⚠️")


def _on_answer_change(conn: sqlite3.Connection, question_id: int) -> None:
    # Pusta odpowiedź jest dozwolona - to legalny stan "jeszcze nie napisana",
    # w przeciwieństwie do pustej treści pytania.
    questions_repo.update_answer(
        conn, question_id, st.session_state[f"question_answer_{question_id}"]
    )


def _on_type_change(conn: sqlite3.Connection, question_id: int) -> None:
    questions_repo.update_type(
        conn, question_id, st.session_state[f"question_type_edit_{question_id}"]
    )


def _on_phase_change(
    conn: sqlite3.Connection, question_id: int, options: dict[str, int | None]
) -> None:
    # Strona grupuje pytania po fazach w expanderach, więc po tej zmianie
    # pytanie znika z bieżącego expandera i pojawia się w docelowym.
    # To zamierzone, nie zgubienie danych.
    label = st.session_state[f"question_phase_{question_id}"]
    questions_repo.update_phase(conn, question_id, options[label])


def render_question_row(
    conn: sqlite3.Connection, question: sqlite3.Row, phases: list[sqlite3.Row]
) -> None:
    question_id = question["id"]
    confirm_key = f"confirm_delete_question_{question_id}"
    options = phase_options(phases)

    # Domyślnie widać samą treść i akcje. Edycja (typ, faza, usuwanie) siedzi
    # w popoverze, bo rozłożona na stałe zajmowała na telefonie ~250 px na
    # każde pytanie - faza z 12 pytaniami to było 5000 px przewijania.
    question_type = question["question_type"]
    st.markdown(
        f":{QUESTION_TYPE_BADGE_COLORS.get(question_type, 'gray')}-badge"
        f"[{QUESTION_TYPE_LABELS.get(question_type, question_type)}] "
        f"**{question['question_text']}**"
    )

    with st.popover("✏️ Edytuj", width="content"):
        st.text_area(
            "Treść pytania",
            value=question["question_text"],
            key=f"question_text_{question_id}",
            on_change=_on_text_change,
            args=(conn, question_id, question["question_text"]),
            height=120,
        )
        type_keys = list(QUESTION_TYPE_LABELS.keys())
        st.selectbox(
            "Typ",
            options=type_keys,
            index=type_keys.index(question_type),
            format_func=lambda key: QUESTION_TYPE_LABELS[key],
            key=f"question_type_edit_{question_id}",
            on_change=_on_type_change,
            args=(conn, question_id),
        )
        option_labels = list(options.keys())
        st.selectbox(
            "Faza",
            options=option_labels,
            index=option_labels.index(phase_label(options, question["phase_id"])),
            key=f"question_phase_{question_id}",
            on_change=_on_phase_change,
            args=(conn, question_id, options),
        )
        st.text_area(
            "Odpowiedź / wyjaśnienie",
            value=question["answer"],
            key=f"question_answer_{question_id}",
            on_change=_on_answer_change,
            args=(conn, question_id),
            height=160,
            placeholder="czego dowodzi to pytanie, na co zwrócić uwagę...",
        )
        st.divider()
        if st.session_state.get(confirm_key):
            st.caption("Na pewno usunąć to pytanie razem z historią podejść?")
            with st.container(horizontal=True):
                if st.button("Tak, usuń", key=f"question_delete_yes_{question_id}"):
                    questions_repo.delete(conn, question_id)
                    st.session_state[confirm_key] = False
                    st.rerun()
                if st.button("Anuluj", key=f"question_delete_no_{question_id}"):
                    st.session_state[confirm_key] = False
                    st.rerun()
        else:
            if st.button("🗑️ Usuń pytanie", key=f"question_delete_{question_id}"):
                st.session_state[confirm_key] = True
                st.rerun()

    attempts = question_attempts_repo.list_by_question(conn, question_id)
    summary = question_stats.summarize_attempts(attempts)

    reveal_key = f"reveal_answer_{question_id}"
    answer = question["answer"].strip()

    with st.container(horizontal=True):
        if st.button(
            "✅ Samodzielnie",
            key=f"solo_{question_id}",
            help="Rozwiązałem samodzielnie",
        ):
            activity.record_question_attempt(conn, question, True)
            st.session_state[reveal_key] = False
            st.rerun()
        if st.button(
            "📖 Sprawdziłem",
            key=f"checked_{question_id}",
            help="Musiałem sprawdzić rozwiązanie",
        ):
            activity.record_question_attempt(conn, question, False)
            # Kliknięcie "sprawdziłem" bez pokazania odpowiedzi nie miałoby
            # sensu - odsłaniamy ją od razu, bo po to się tu kliknęło.
            st.session_state[reveal_key] = True
            st.rerun()
        if answer and not st.session_state.get(reveal_key):
            if st.button("💡 Pokaż odpowiedź", key=f"reveal_{question_id}"):
                st.session_state[reveal_key] = True
                st.rerun()

    if not answer:
        st.caption(
            "Brak odpowiedzi — dopisz ją w `content/questions/`, "
            "albo tutaj przez ✏️ Edytuj."
        )
    elif st.session_state.get(reveal_key):
        st.info(answer)
        if st.button("Ukryj odpowiedź", key=f"hide_{question_id}"):
            st.session_state[reveal_key] = False
            st.rerun()

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
    conn: sqlite3.Connection, phase: sqlite3.Row, phases: list[sqlite3.Row]
) -> None:
    questions = questions_repo.list_by_phase(conn, phase["id"])

    with st.expander(f"{phase['name']} ({len(questions)})"):
        if not questions:
            st.caption("Brak pytań - dodaj pierwsze poniżej.")
        for question in questions:
            render_question_row(conn, question, phases)

        render_add_question_form(conn, phase["id"])
