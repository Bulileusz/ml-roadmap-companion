import streamlit as st


def page_setup(title: str, icon: str) -> None:
    st.set_page_config(page_title=title, page_icon=icon, layout="wide")
