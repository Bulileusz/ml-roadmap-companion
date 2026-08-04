import streamlit as st


def _fiszki_form(n: int) -> str:
    # Polska odmiana: 1 fiszka, 2-4 fiszki, 5+ fiszek (z wyjątkiem 12-14).
    if n == 1:
        return "fiszka"
    if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
        return "fiszki"
    return "fiszek"


def render_metrics_row(data: dict) -> None:
    roadmap = data["roadmap"]
    independence = data["independence"]

    col_roadmap, col_due, col_ind = st.columns(3)
    col_roadmap.metric(
        "Postęp roadmapy",
        f"{int(roadmap['pct'])}%",
        delta=f"{roadmap['done']}/{roadmap['total']} zadań",
        delta_color="off",
        border=True,
    )
    col_due.metric(
        "Fiszki na dziś",
        data["due_count"],
        delta=f"{data['cards_total']} {_fiszki_form(data['cards_total'])} łącznie",
        delta_color="off",
        border=True,
    )
    ind_value = "—" if independence["total"] == 0 else f"{int(independence['pct'])}%"
    col_ind.metric(
        "Samodzielność",
        ind_value,
        delta=f"{independence['independent']}/{independence['total']} podejść",
        delta_color="off",
        border=True,
    )


def render_today_section(data: dict) -> None:
    st.subheader("Co dziś robię")
    with st.container(border=True):
        task = data["next_task"]
        if task is None:
            st.markdown("🎉 **Wszystkie zadania roadmapy zrobione!**")
        else:
            st.badge(task["phase_name"], color="green")
            st.markdown(f"**{task['title']}**")
        if data["due_count"] > 0:
            st.page_link(
                "pages/1_🃏_Fiszki.py",
                label=f"Do powtórki czeka dziś: {data['due_count']}",
                icon="🃏",
            )


def render_leitner_boxes(data: dict) -> None:
    st.subheader("Pudełka Leitnera")
    total = data["cards_total"]
    with st.container(border=True):
        if total == 0:
            st.caption("Brak fiszek — dodaj pierwszą na stronie 🃏 Fiszki.")
            return
        for box, count in sorted(data["boxes"].items()):
            st.progress(count / total, text=f"Pudełko {box} · {count}")
