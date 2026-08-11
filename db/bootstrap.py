import sqlite3

import streamlit as st

from db.connection import get_connection
from db.schema import init_db
from db.seed_data import seed_if_empty
from services import content


@st.cache_resource
def init_app() -> sqlite3.Connection:
    conn = get_connection()
    init_db(conn)
    seed_if_empty(conn)
    # Materiały z content/ dociągają się przy starcie, żeby fiszka dopisana
    # do pliku (choćby z telefonu przez GitHuba) trafiała do bazy bez
    # dodatkowego kliknięcia. Import jest idempotentny - patrz services/content.
    content.sync(conn)
    return conn
