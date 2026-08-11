import sqlite3

import streamlit as st

from repository import flashcards_repo
from services import spaced_repetition
from ui.components import NO_PHASE_LABEL, phase_label, phase_options

# Kolor badge'a rośnie z pudełkiem: świeża fiszka szara, opanowana zielona.
BOX_BADGE_COLORS = {1: "gray", 2: "blue", 3: "violet", 4: "orange", 5: "green"}


def render_due_today_section(conn: sqlite3.Connection) -> None:
    st.subheader("Dzisiejsze powtórki")
    due = spaced_repetition.get_due_cards(conn)

    if not due:
        st.success("Brak powtórek na dziś! 🎉")
        return

    card = due[0]
    card_id = card["id"]
    reveal_key = f"reveal_{card_id}"

    with st.container(border=True):
        st.badge(f"Zostało dzisiaj: {len(due)}", color="green")
        st.markdown(f"### {card['front']}")

        if st.session_state.get(reveal_key):
            st.info(card["back"])
            col_wrong, col_right = st.columns(2)
            if col_wrong.button(
                "❌ Nie umiałem", key=f"wrong_{card_id}", use_container_width=True
            ):
                spaced_repetition.record_review(conn, card_id, correct=False)
                st.session_state[reveal_key] = False
                st.rerun()
            if col_right.button(
                "✅ Umiałem",
                key=f"right_{card_id}",
                type="primary",
                use_container_width=True,
            ):
                spaced_repetition.record_review(conn, card_id, correct=True)
                st.session_state[reveal_key] = False
                st.rerun()
        else:
            if st.button(
                "Pokaż odpowiedź", key=f"show_{card_id}", use_container_width=True
            ):
                st.session_state[reveal_key] = True
                st.rerun()


def _on_add_flashcard(conn: sqlite3.Connection, options: dict[str, int | None]) -> None:
    # Celowo bez st.form: pola formularzy trzymają lokalny stan we froncie
    # i nie da się ich niezawodnie wyczyścić z session_state. Zwykły widget
    # + czyszczenie klucza w callbacku przycisku działa przewidywalnie.
    front = st.session_state.get("add_card_front", "").strip()
    back = st.session_state.get("add_card_back", "").strip()
    if front and back:
        label = st.session_state.get("add_card_phase", NO_PHASE_LABEL)
        spaced_repetition.create_card(conn, front, back, options[label])
        st.session_state["add_card_front"] = ""
        st.session_state["add_card_back"] = ""
        st.session_state.pop("add_card_error", None)
    elif not front:
        st.session_state["add_card_error"] = "Przód fiszki nie może być pusty."
    else:
        st.session_state["add_card_error"] = "Tył fiszki nie może być pusty."


def render_add_flashcard_form(
    conn: sqlite3.Connection, phases: list[sqlite3.Row]
) -> None:
    options = phase_options(phases)

    with st.container(border=True):
        st.text_input("Przód (pytanie/termin)", key="add_card_front")
        st.text_area("Tył (odpowiedź/definicja)", height=100, key="add_card_back")
        st.selectbox("Faza (opcjonalnie)", list(options.keys()), key="add_card_phase")
        st.button(
            "Dodaj fiszkę",
            key="add_card_submit",
            on_click=_on_add_flashcard,
            args=(conn, options),
        )
        error = st.session_state.get("add_card_error")
        if error:
            st.error(error)


def _on_content_change(
    conn: sqlite3.Connection, card_id: int, prev_front: str, prev_back: str
) -> None:
    front_key = f"front_{card_id}"
    back_key = f"back_{card_id}"
    front = st.session_state[front_key].strip()
    back = st.session_state[back_key].strip()
    if front and back:
        flashcards_repo.update_content(conn, card_id, front, back)
    else:
        # Przywracamy oba pola do stanu z bazy - przywrócenie tylko jednego
        # zostawiłoby drugie widocznie rozjechane z zapisanymi danymi.
        st.session_state[front_key] = prev_front
        st.session_state[back_key] = prev_back
        st.toast("Przód i tył fiszki nie mogą być puste", icon="⚠️")


def _on_card_phase_change(
    conn: sqlite3.Connection, card_id: int, options: dict[str, int | None]
) -> None:
    label = st.session_state[f"card_phase_{card_id}"]
    flashcards_repo.update_phase(conn, card_id, options[label])


def render_flashcard_edit_row(
    conn: sqlite3.Connection, card: sqlite3.Row, phases: list[sqlite3.Row]
) -> None:
    card_id = card["id"]
    confirm_key = f"confirm_delete_card_{card_id}"
    options = phase_options(phases)

    # Na liście widać przód i stan pudełka; przód/tył/faza/usuwanie chowają
    # się w popoverze, żeby 76 fiszek nie było 76 razy po ~250 px.
    box_color = BOX_BADGE_COLORS.get(card["box"], "gray")
    with st.container(horizontal=True, vertical_alignment="center"):
        st.markdown(
            f":{box_color}-badge[📦 {card['box']}/{spaced_repetition.MAX_BOX}] "
            f"**{card['front']}**",
            width="stretch",
        )
        with st.popover("✏️", width="content"):
            st.text_input(
                "Przód",
                value=card["front"],
                key=f"front_{card_id}",
                on_change=_on_content_change,
                args=(conn, card_id, card["front"], card["back"]),
            )
            st.text_area(
                "Tył",
                value=card["back"],
                key=f"back_{card_id}",
                on_change=_on_content_change,
                args=(conn, card_id, card["front"], card["back"]),
                height=120,
            )
            option_labels = list(options.keys())
            st.selectbox(
                "Faza",
                options=option_labels,
                index=option_labels.index(phase_label(options, card["phase_id"])),
                key=f"card_phase_{card_id}",
                on_change=_on_card_phase_change,
                args=(conn, card_id, options),
            )
            st.caption(f"Następna powtórka: {card['next_review_at']}")
            st.divider()
            if st.session_state.get(confirm_key):
                st.caption("Na pewno usunąć tę fiszkę?")
                with st.container(horizontal=True):
                    if st.button("Tak, usuń", key=f"card_delete_yes_{card_id}"):
                        flashcards_repo.delete(conn, card_id)
                        st.session_state[confirm_key] = False
                        st.rerun()
                    if st.button("Anuluj", key=f"card_delete_no_{card_id}"):
                        st.session_state[confirm_key] = False
                        st.rerun()
            else:
                if st.button("🗑️ Usuń fiszkę", key=f"card_delete_{card_id}"):
                    st.session_state[confirm_key] = True
                    st.rerun()


def render_all_flashcards_list(
    conn: sqlite3.Connection, phases: list[sqlite3.Row]
) -> None:
    cards = flashcards_repo.list_all(conn)
    with st.expander(f"Wszystkie fiszki ({len(cards)})"):
        if not cards:
            st.caption("Brak fiszek - dodaj pierwszą powyżej.")
        for card in cards:
            render_flashcard_edit_row(conn, card, phases)
