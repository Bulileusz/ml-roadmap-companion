import sqlite3

import streamlit as st

from db.connection import get_connection
from db.schema import init_db
from db.seed_data import seed_if_empty


@st.cache_resource
def init_app() -> sqlite3.Connection:
    conn = get_connection()
    init_db(conn)
    seed_if_empty(conn)
    return conn
