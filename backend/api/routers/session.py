from fastapi import APIRouter

from api import schemas
from api.deps import DbConn, as_dict, as_dicts
from services import session

router = APIRouter(prefix="/session", tags=["session"])


@router.get("/today", response_model=schemas.SessionPlan)
def get_today(conn: DbConn):
    """Plan sesji dnia. Nie zapisuje nic - każdy krok odkłada się osobnym endpointem.

    Dzięki temu sesja przerwana w połowie nie gubi zrobionej pracy i nie
    zostawia stanu do posprzątania: nie ma czego wznawiać, bo plan wystarczy
    policzyć od nowa.
    """
    plan = session.plan(conn)
    return {
        **plan,
        "intro": as_dicts(plan["intro"]),
        "reviews": as_dicts(plan["reviews"]),
        "questions": as_dicts(plan["questions"]),
        "phase": as_dict(plan["phase"]) if plan["phase"] is not None else None,
        "next_task": (
            as_dict(plan["next_task"]) if plan["next_task"] is not None else None
        ),
    }
