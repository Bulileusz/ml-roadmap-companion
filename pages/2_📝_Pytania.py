from db.bootstrap import init_app
from repository import phases_repo
from ui.questions_components import render_phase_questions_section
from ui.theme import page_setup

page_setup("Bank pytań", "📝", "--quiz")

conn = init_app()

phases = phases_repo.list_all(conn)
for phase in phases:
    render_phase_questions_section(conn, phase, phases)
