import streamlit as st

from db.bootstrap import init_app
from ui.journal_components import (
    render_activity_calendar,
    render_activity_feed,
    render_streak_summary,
)
from ui.theme import page_setup

page_setup("Dziennik - ML Roadmap Companion", "📔")
st.title("📔 Dziennik nauki")
st.markdown("`$ ml-roadmap --log`")

conn = init_app()

render_streak_summary(conn)
st.divider()
render_activity_calendar(conn)
st.divider()
render_activity_feed(conn)
