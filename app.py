import sqlite3

import streamlit as st

from db.connection import get_connection
from db.schema import init_db
from db.seed_data import seed_if_empty
from services import progress
from ui.components import render_progress_bar, render_phase_section


@st.cache_resource
def init_app() -> sqlite3.Connection:
    conn = get_connection()
    init_db(conn)
    seed_if_empty(conn)
    return conn


st.set_page_config(page_title="ML Roadmap Companion", page_icon="🗺️", layout="wide")
st.title("🗺️ ML Roadmap Companion")

conn = init_app()

overall = progress.get_overall_progress(conn)
render_progress_bar(
    overall["pct"],
    f"Postęp całości: {overall['done']}/{overall['total']} zadań ({overall['pct']:.0f}%)",
)

st.divider()

phase_progress = progress.get_all_phase_progress(conn)
first_incomplete_id = next(
    (p["phase"]["id"] for p in phase_progress if p["done"] < p["total"]), None
)

for entry in phase_progress:
    phase = entry["phase"]
    render_phase_section(conn, phase, expanded=(phase["id"] == first_incomplete_id))
