import streamlit as st

from db.bootstrap import init_app
from repository import phases_repo
from ui.flashcards_components import (
    render_add_flashcard_form,
    render_all_flashcards_list,
    render_due_today_section,
)
from ui.theme import page_setup

page_setup("Fiszki", "🃏", "--review")

conn = init_app()

phases = phases_repo.list_all(conn)

render_due_today_section(conn)
st.divider()
render_add_flashcard_form(conn, phases)
render_all_flashcards_list(conn, phases)
