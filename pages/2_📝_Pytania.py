import streamlit as st

from db.bootstrap import init_app
from repository import phases_repo
from ui.questions_components import render_phase_questions_section

st.set_page_config(page_title="Pytania - ML Roadmap Companion", page_icon="📝", layout="wide")
st.title("📝 Bank pytań")

conn = init_app()

for phase in phases_repo.list_phases(conn):
    render_phase_questions_section(conn, phase)
