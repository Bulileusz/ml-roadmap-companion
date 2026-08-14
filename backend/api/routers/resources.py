from fastapi import APIRouter, Response, status

from api import schemas
from api.deps import DbConn, as_dict, as_dicts, found
from repository import resources_repo
from services import activity

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("", response_model=list[schemas.Resource])
def list_resources(phase_id: int, conn: DbConn):
    return as_dicts(resources_repo.list_by_phase(conn, phase_id))


@router.post("", response_model=schemas.Resource, status_code=status.HTTP_201_CREATED)
def create_resource(payload: schemas.ResourceCreate, conn: DbConn):
    resource_id = resources_repo.create(
        conn,
        payload.phase_id,
        payload.title,
        payload.url,
        payload.kind,
        payload.detail,
    )
    return as_dict(resources_repo.get(conn, resource_id))


@router.patch("/{resource_id}", response_model=schemas.Resource)
def update_resource(resource_id: int, payload: schemas.ResourceUpdate, conn: DbConn):
    resource = found(resources_repo.get(conn, resource_id), f"materiał {resource_id}")

    # Tytuł, link i opis idą jednym UPDATE-em (update_fields), więc brakujące
    # pola bierzemy z bazy - PATCH samego linku nie ma wyczyścić opisu.
    if any(value is not None for value in (payload.title, payload.url, payload.detail)):
        resources_repo.update_fields(
            conn,
            resource_id,
            payload.title if payload.title is not None else resource["title"],
            payload.url if payload.url is not None else resource["url"],
            payload.detail if payload.detail is not None else resource["detail"],
        )
    if payload.status is not None:
        # Przez activity: domknięcie materiału trafia do dziennika, samo
        # "zacząłem czytać" nie.
        activity.record_resource_status(conn, resource, payload.status)
    if "phase_id" in payload.model_fields_set:
        resources_repo.update_phase(conn, resource_id, payload.phase_id)

    return as_dict(resources_repo.get(conn, resource_id))


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(resource_id: int, conn: DbConn):
    found(resources_repo.get(conn, resource_id), f"materiał {resource_id}")
    resources_repo.delete(conn, resource_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
