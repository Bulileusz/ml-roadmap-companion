from fastapi import APIRouter

from api import schemas
from api.deps import DbConn, as_dict, as_dicts
from repository import question_attempts_repo
from services import progress, session

router = APIRouter(prefix="/session", tags=["session"])


@router.get("/today", response_model=schemas.SessionPlan)
def get_today(conn: DbConn):
    """Plan sesji dnia. Nie zapisuje nic - każdy krok odkłada się osobnym endpointem.

    Dzięki temu sesja przerwana w połowie nie gubi zrobionej pracy i nie
    zostawia stanu do posprzątania: nie ma czego wznawiać, bo plan wystarczy
    policzyć od nowa.
    """
    plan = session.plan(conn)
    phase = plan["phase"]

    # Pytania jadą ze skumulowanym wskaźnikiem samodzielności, bo sesja pokazuje
    # go PRZED odpowiedzią ("samodzielnie 6 z 9"). To informacja, która zmienia
    # sposób podejścia: pytanie, na którym regularnie się przewracasz, warto
    # potraktować inaczej niż takie, które wychodzi za każdym razem. Wszystkie
    # pochodzą z jednej fazy, więc wystarczy jedno zapytanie.
    stats = (
        question_attempts_repo.stats_by_phase(conn, phase["id"])
        if phase is not None
        else {}
    )
    questions = []
    for row in plan["questions"]:
        independent, total = stats.get(row["id"], (0, 0))
        questions.append(
            {
                **dict(row),
                "stats": {
                    "independent": independent,
                    "total": total,
                    "pct": progress.phase_progress_pct(independent, total),
                },
            }
        )

    brief = plan["briefing"]
    return {
        **plan,
        "briefing": (
            None
            if brief is None
            else {
                **brief,
                "task": as_dict(brief["task"]),
                "materials": as_dicts(brief["materials"]),
            }
        ),
        "intro": as_dicts(plan["intro"]),
        "reviews": as_dicts(plan["reviews"]),
        "questions": questions,
        "phase": as_dict(phase) if phase is not None else None,
        "next_task": (
            as_dict(plan["next_task"]) if plan["next_task"] is not None else None
        ),
    }
