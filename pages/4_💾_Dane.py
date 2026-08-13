import streamlit as st

from db.bootstrap import init_app
from ui.backup_components import (
    render_content_section,
    render_export_section,
    render_import_section,
)
from ui.theme import page_setup

page_setup("Dane", "💾", "--dump")

conn = init_app()

render_content_section(conn)
st.divider()
render_export_section(conn)
st.divider()
render_import_section(conn)
