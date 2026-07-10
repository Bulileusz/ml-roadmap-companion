import streamlit as st

from db.bootstrap import init_app
from repository import phases_repo
from ui.flashcards_components import (
    render_add_flashcard_form,
    render_all_flashcards_list,
    render_due_today_section,
)

st.set_page_config(page_title="Fiszki - ML Roadmap Companion", page_icon="🃏", layout="wide")
st.title("🃏 Fiszki")

conn = init_app()

render_due_today_section(conn)
st.divider()
render_add_flashcard_form(conn, phases_repo.list_phases(conn))
render_all_flashcards_list(conn)
