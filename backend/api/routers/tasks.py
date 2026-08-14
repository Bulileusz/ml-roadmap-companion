from fastapi import APIRouter, Response, status

from api import schemas
from api.deps import DbConn, as_dict, found
from repository import tasks_repo
from services import activity

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=schemas.Task, status_code=status.HTTP_201_CREATED)
def create_task(payload: schemas.TaskCreate, conn: DbConn):
    task_id = tasks_repo.create(conn, payload.phase_id, payload.title)
    return as_dict(tasks_repo.get(conn, task_id))


@router.patch("/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, payload: schemas.TaskUpdate, conn: DbConn):
    task = found(tasks_repo.get(conn, task_id), f"zadanie {task_id}")

    if payload.title is not None:
        tasks_repo.update_title(conn, task_id, payload.title)
    if payload.notes is not None:
        tasks_repo.update_notes(conn, task_id, payload.notes)
    if payload.is_done is not None and payload.is_done != bool(task["is_done"]):
        # Przez activity, nie przez repozytorium: to jedyne miejsce, które wie,
        # że zmiana stanu zadania idzie do dziennika. Warunek na zmianę stanu
        # chroni dziennik przed serią identycznych wpisów, gdyby front wysłał
        # PATCH z niezmienionym is_done przy edycji tytułu.
        activity.record_task_toggle(conn, task, payload.is_done)

    return as_dict(tasks_repo.get(conn, task_id))


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, conn: DbConn):
    found(tasks_repo.get(conn, task_id), f"zadanie {task_id}")
    tasks_repo.delete(conn, task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
