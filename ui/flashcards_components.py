import sqlite3

import streamlit as st

from repository import flashcards_repo
from services import spaced_repetition


def render_due_today_section(conn: sqlite3.Connection) -> None:
    st.subheader("Dzisiejsze powtórki")
    due = flashcards_repo.list_due_today(conn)

    if not due:
        st.success("Brak powtórek na dziś! 🎉")
        return

    card = due[0]
    card_id = card["id"]
    reveal_key = f"reveal_{card_id}"

    st.caption(f"Zostało dzisiaj: {len(due)}")
    st.markdown(f"### {card['front']}")

    if st.session_state.get(reveal_key):
        st.info(card["back"])
        col_wrong, col_right = st.columns(2)
        if col_wrong.button("❌ Nie umiałem", key=f"wrong_{card_id}"):
            spaced_repetition.record_review(conn, card_id, correct=False)
            st.session_state[reveal_key] = False
            st.rerun()
        if col_right.button("✅ Umiałem", key=f"right_{card_id}"):
            spaced_repetition.record_review(conn, card_id, correct=True)
            st.session_state[reveal_key] = False
            st.rerun()
    else:
        if st.button("Pokaż odpowiedź", key=f"show_{card_id}"):
            st.session_state[reveal_key] = True
            st.rerun()


def render_add_flashcard_form(conn: sqlite3.Connection, phases: list[sqlite3.Row]) -> None:
    with st.form("add_flashcard_form", clear_on_submit=True):
        front = st.text_input("Przód (pytanie/termin)")
        back = st.text_area("Tył (odpowiedź/definicja)", height=100)

        phase_options = {"— brak —": None}
        for phase in phases:
            phase_options[phase["name"]] = phase["id"]
        phase_label = st.selectbox("Faza (opcjonalnie)", list(phase_options.keys()))

        submitted = st.form_submit_button("Dodaj fiszkę")
        if submitted and front.strip() and back.strip():
            flashcards_repo.create(
                conn, front.strip(), back.strip(), phase_options[phase_label]
            )
            st.rerun()


def _on_content_change(conn: sqlite3.Connection, card_id: int) -> None:
    front = st.session_state[f"front_{card_id}"].strip()
    back = st.session_state[f"back_{card_id}"].strip()
    if front and back:
        flashcards_repo.update_content(conn, card_id, front, back)


def render_flashcard_edit_row(conn: sqlite3.Connection, card: sqlite3.Row) -> None:
    card_id = card["id"]
    confirm_key = f"confirm_delete_card_{card_id}"

    col_front, col_back, col_delete = st.columns([0.4, 0.45, 0.15])

    with col_front:
        st.text_input(
            "Przód",
            value=card["front"],
            key=f"front_{card_id}",
            on_change=_on_content_change,
            args=(conn, card_id),
            label_visibility="collapsed",
        )
    with col_back:
        st.text_input(
            "Tył",
            value=card["back"],
            key=f"back_{card_id}",
            on_change=_on_content_change,
            args=(conn, card_id),
            label_visibility="collapsed",
        )
    with col_delete:
        if st.session_state.get(confirm_key):
            c1, c2 = st.columns(2)
            if c1.button("Tak", key=f"card_delete_yes_{card_id}"):
                flashcards_repo.delete(conn, card_id)
                st.session_state[confirm_key] = False
                st.rerun()
            if c2.button("Anuluj", key=f"card_delete_no_{card_id}"):
                st.session_state[confirm_key] = False
                st.rerun()
        else:
            if st.button("🗑️", key=f"card_delete_{card_id}"):
                st.session_state[confirm_key] = True
                st.rerun()

    st.caption(f"Pudełko {card['box']}/5 • następna powtórka: {card['next_review_at']}")
    st.divider()


def render_all_flashcards_list(conn: sqlite3.Connection) -> None:
    cards = flashcards_repo.list_all(conn)
    with st.expander(f"Wszystkie fiszki ({len(cards)})"):
        if not cards:
            st.caption("Brak fiszek - dodaj pierwszą powyżej.")
        for card in cards:
            render_flashcard_edit_row(conn, card)
