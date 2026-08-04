import streamlit as st

from db.bootstrap import init_app
from services import dashboard, progress
from ui.components import render_phase_section
from ui.dashboard_components import (
    render_leitner_boxes,
    render_metrics_row,
    render_today_section,
)
from ui.theme import page_setup

page_setup("ML Roadmap Companion", "🗺️")
st.title("🗺️ ML Roadmap Companion")
st.markdown("`$ ml-roadmap --status`")

conn = init_app()
data = dashboard.get_dashboard_data(conn)

render_metrics_row(data)

col_today, col_boxes = st.columns([0.55, 0.45], gap="large")
with col_today:
    render_today_section(data)
with col_boxes:
    render_leitner_boxes(data)

st.divider()
st.subheader("Fazy roadmapy")

phase_progress = progress.get_all_phase_progress(conn)
first_incomplete_id = next(
    (p["phase"]["id"] for p in phase_progress if p["done"] < p["total"]), None
)

for entry in phase_progress:
    phase = entry["phase"]
    if entry["total"] > 0 and entry["done"] == entry["total"]:
        icon = "✅"
    elif phase["id"] == first_incomplete_id:
        icon = "🎯"
    else:
        icon = "⏳"
    render_phase_section(
        conn, entry, expanded=(phase["id"] == first_incomplete_id), icon=icon
    )
