from fastapi import APIRouter

from api import schemas
from api.deps import DbConn, as_dict
from services import dashboard, gamification

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=schemas.Dashboard)
def get_dashboard(conn: DbConn):
    data = dashboard.get_dashboard_data(conn)
    return {
        **data,
        # sqlite3.Row nie jest mapowaniem, którego Pydantic domyśli się sam.
        "next_task": (
            as_dict(data["next_task"]) if data["next_task"] is not None else None
        ),
        "boxes": [
            {"box": box, "count": count} for box, count in sorted(data["boxes"].items())
        ],
        "progression": gamification.get_progression(conn),
    }


@router.get("/achievements", response_model=list[schemas.Achievement])
def get_achievements(conn: DbConn):
    return gamification.get_achievements(conn)
