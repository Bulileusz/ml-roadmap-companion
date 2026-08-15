from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query

from api import schemas
from api.deps import DbConn, as_dicts
from repository import activity_repo
from services import activity, clock, journal, streak

router = APIRouter(prefix="/journal", tags=["journal"])

# Rok wstecz w siatce 7 x 52. Tyle mieści się na szerokim ekranie bez
# przewijania i tyle wystarcza, żeby zobaczyć własny rytm nauki, a nie
# ostatnie dwa tygodnie.
HEATMAP_WEEKS = 52
DAYS_PER_WEEK = 7

# Kwartał. Kalendarz na stronie dziennika stoi obok strumienia dni, więc jest
# węższy niż heatmapa na cały rok - a trzynaście tygodni to i tak więcej, niż
# widać w pamięci.
JOURNAL_DAYS = 91


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


@router.get("/days", response_model=list[schemas.JournalDay])
def get_days(conn: DbConn, days: int = Query(default=JOURNAL_DAYS, ge=1, le=730)):
    return journal.daily_log(conn, days)


def _parsed_day(day: str) -> str:
    """Data z URL-a, sprawdzona pod kątem formatu i tego, że już nastała."""
    try:
        parsed = date.fromisoformat(day)
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"'{day}' to nie jest data w formacie RRRR-MM-DD."
        ) from None
    # Notatka do dnia, którego jeszcze nie było, nie miałaby się gdzie pokazać:
    # strumień dziennika kończy się na dzisiaj. Lepiej odmówić niż zapisać ją
    # w miejscu, do którego użytkownik nigdy nie zajrzy.
    if parsed > clock.today():
        raise HTTPException(
            status_code=400, detail="Nie da się opisać dnia, który jeszcze nie nastał."
        )
    return parsed.isoformat()


@router.put("/days/{day}/note", response_model=schemas.DayNote)
def put_day_note(day: str, payload: schemas.DayNoteUpdate, conn: DbConn):
    """Notatka do dnia nauki. Pusta treść kasuje notatkę."""
    checked = _parsed_day(day)
    return {"day": checked, "note": journal.set_note(conn, checked, payload.note)}
