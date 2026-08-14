from fastapi import APIRouter

from api import schemas
from api.deps import DbConn, as_dicts
from repository import tasks_repo
from services import progress

router = APIRouter(prefix="/phases", tags=["phases"])


@router.get("", response_model=list[schemas.PhaseProgress])
def list_phases(conn: DbConn):
    # Fazy zawsze z postępem: strona startowa i lista zadań i tak potrzebują
    # obu, a osobny endpoint na same fazy byłby drugim round-tripem po to samo.
    return [
        {**entry, "phase": dict(entry["phase"])}
        for entry in progress.get_all_phase_progress(conn)
    ]


@router.get("/{phase_id}/tasks", response_model=list[schemas.Task])
def list_phase_tasks(phase_id: int, conn: DbConn):
    return as_dicts(tasks_repo.list_by_phase(conn, phase_id))
