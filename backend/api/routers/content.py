from fastapi import APIRouter

from api import schemas
from api.deps import DbConn
from services import content

router = APIRouter(prefix="/content", tags=["content"])


@router.get("/status", response_model=schemas.ContentStatus)
def get_status(conn: DbConn):
    return {
        "available": content.available_counts(),
        "imported": content.imported_counts(conn),
    }


@router.post("/sync", response_model=schemas.ContentSyncResult)
def sync(conn: DbConn):
    """Ręczne doczytanie materiałów z content/ bez restartu aplikacji.

    To samo robi lifespan przy starcie; endpoint jest po to, żeby fiszka
    dopisana do pliku w trakcie sesji nauki nie wymagała ubijania serwera.
    Import jest idempotentny, więc kliknięcie dwa razy nic nie psuje.
    """
    result = content.sync(conn)
    return {
        "flashcards_added": result.flashcards_added,
        "questions_added": result.questions_added,
        "resources_added": result.resources_added,
        "answers_filled": result.answers_filled,
        "skipped": result.skipped,
        "warnings": result.warnings,
    }
