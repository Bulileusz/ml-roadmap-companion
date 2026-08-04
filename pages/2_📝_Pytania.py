import streamlit as st

from db.bootstrap import init_app
from repository import phases_repo
from ui.questions_components import render_phase_questions_section
from ui.theme import page_setup

page_setup("Pytania - ML Roadmap Companion", "📝")
st.title("📝 Bank pytań")
st.markdown("`$ ml-roadmap --quiz`")

conn = init_app()

for phase in phases_repo.list_all(conn):
    render_phase_questions_section(conn, phase)
