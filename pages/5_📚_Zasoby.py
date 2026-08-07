import streamlit as st

from db.bootstrap import init_app
from repository import phases_repo
from ui.resources_components import (
    render_overall_progress,
    render_phase_resources_section,
)
from ui.theme import page_setup

page_setup("Zasoby - ML Roadmap Companion", "📚")
st.title("📚 Zasoby")
st.markdown("`$ ml-roadmap --sources`")
st.caption(
    "Z czego uczyć się w danej fazie. Roadmapa mówi CO zrobić, ta strona — Z CZEGO."
)

conn = init_app()

render_overall_progress(conn)
st.divider()

phases = phases_repo.list_all(conn)
for phase in phases:
    render_phase_resources_section(conn, phase, phases)
