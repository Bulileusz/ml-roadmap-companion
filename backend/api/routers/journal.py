from datetime import timedelta

from fastapi import APIRouter, Query

from api import schemas
from api.deps import DbConn, as_dicts
from repository import activity_repo
from services import activity, clock, streak

router = APIRouter(prefix="/journal", tags=["journal"])

# Rok wstecz w siatce 7 x 52. Tyle mieści się na szerokim ekranie bez
# przewijania i tyle wystarcza, żeby zobaczyć własny rytm nauki, a nie
# ostatnie dwa tygodnie.
HEATMAP_WEEKS = 52
DAYS_PER_WEEK = 7


@router.get("/streak", response_model=schemas.Streak)
def get_streak(conn: DbConn):
    return activity.get_streak(conn)


@router.get("/heatmap", response_model=list[schemas.HeatmapDay])
def get_heatmap(conn: DbConn, weeks: int = Query(default=HEATMAP_WEEKS, ge=1, le=104)):
    days = weeks * DAYS_PER_WEEK
    today = clock.today()
    # Okno w SQL zawężamy do tych samych dni, które i tak zwrócimy - bez tego
    # zapytanie ciągnęłoby całą historię tylko po to, żeby ją wyrzucić.
    since = today - timedelta(days=days - 1)
    counts = activity_repo.count_per_day(conn, since.isoformat())
    return [
        {"day": day.isoformat(), "count": count}
        for day, count in streak.daily_counts(counts, today, days)
    ]


@router.get("/activity", response_model=list[schemas.ActivityEntry])
def get_activity(conn: DbConn, limit: int = Query(default=100, ge=1, le=1000)):
    return as_dicts(activity_repo.list_recent(conn, limit))
