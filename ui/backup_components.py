import json
import sqlite3

import streamlit as st

from db.connection import DB_PATH
from repository import content_imports_repo
from services import backup, content
from ui.theme import METRIC_WIDTH

TABLE_LABELS = {
    "phases": "fazy",
    "tasks": "zadania",
    "flashcards": "fiszki",
    "questions": "pytania",
    "question_attempts": "podejścia do pytań",
    "resources": "materiały",
    "activity_log": "wpisy dziennika",
    "content_imports": "wpisy ewidencji importu",
}


def _format_summary(summary: dict[str, int]) -> str:
    return " · ".join(
        f"{count} {TABLE_LABELS.get(table, table)}" for table, count in summary.items()
    )


def render_content_section(conn: sqlite3.Connection) -> None:
    st.subheader("Materiały z `content/`")
    st.caption(
        "Fiszki i pytania trzymane w repo wjeżdżają do bazy przy każdym starcie. "
        "Import nie duplikuje, nie nadpisuje i nie wskrzesza skasowanych pozycji — "
        "szczegóły w `content/README.md`."
    )

    available = content.available_counts()
    imported = content_imports_repo.count_by_kind(conn)

    with st.container(border=True):
        with st.container(horizontal=True):
            for label, available_key, imported_key in (
                ("Fiszki", "flashcards", "flashcard"),
                ("Pytania", "questions", "question"),
                ("Materiały", "resources", "resource"),
            ):
                st.metric(
                    f"{label} w plikach",
                    available[available_key],
                    delta=f"zaimportowano {imported.get(imported_key, 0)}",
                    delta_color="off",
                    delta_arrow="off",
                    border=True,
                    width=METRIC_WIDTH,
                )

        if st.button("🔄 Wczytaj materiały teraz"):
            result = content.sync(conn)
            for warning in result.warnings:
                st.warning(warning)
            if result.total_added or result.answers_filled:
                st.success(
                    f"Dodano {result.flashcards_added} fiszek, "
                    f"{result.questions_added} pytań i "
                    f"{result.resources_added} materiałów; "
                    f"uzupełniono {result.answers_filled} odpowiedzi."
                )
            else:
                st.info(f"Nic nowego — {result.skipped} pozycji już w bazie.")


def render_export_section(conn: sqlite3.Connection) -> None:
    st.subheader("Eksport")
    payload = backup.export_data(conn)

    with st.container(border=True):
        st.caption(_format_summary(backup.summarize(payload)))
        st.download_button(
            "⬇️ Pobierz kopię (JSON)",
            data=json.dumps(payload, ensure_ascii=False, indent=2),
            file_name=backup.export_filename(),
            mime="application/json",
            type="primary",
        )


def render_import_section(conn: sqlite3.Connection) -> None:
    st.subheader("Import")
    st.caption(
        "Import **zastępuje całą zawartość bazy** danymi z pliku. "
        "Przed nadpisaniem powstaje kopia bezpieczeństwa obok pliku bazy."
    )

    with st.container(border=True):
        uploaded = st.file_uploader("Plik eksportu (.json)", type="json")
        if uploaded is None:
            return

        try:
            payload = json.loads(uploaded.getvalue().decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            st.error(f"Nie udało się odczytać pliku: {exc}")
            return

        # Podsumowanie PRZED potwierdzeniem - użytkownik widzi, co wchodzi,
        # zanim zgodzi się skasować to, co ma.
        st.info(f"Plik zawiera: {_format_summary(backup.summarize(payload))}")
        if exported_at := payload.get("exported_at"):
            st.caption(f"Wyeksportowano: {exported_at}")

        confirmed = st.checkbox(
            "Rozumiem, że obecne dane zostaną zastąpione", key="import_confirm"
        )
        if not st.button("Nadpisz bazę danymi z pliku", disabled=not confirmed):
            return

        try:
            backup_target = backup.backup_path_for(DB_PATH)
            backup.backup_database(conn, backup_target)
            summary = backup.import_data(conn, payload)
        except backup.BackupError as exc:
            st.error(str(exc))
            return
        except sqlite3.Error as exc:
            st.error(f"Błąd bazy danych: {exc}")
            return

        # Współdzielone połączenie siedzi w st.cache_resource i po podmianie
        # danych strony trzymałyby stary stan aż do restartu.
        st.cache_resource.clear()
        st.success(
            f"Zaimportowano: {_format_summary(summary)}. "
            f"Kopia poprzedniej bazy: `{backup_target}`"
        )
        st.rerun()
