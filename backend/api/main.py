"""Punkt wejścia backendu. `uvicorn api.main:app --reload` z katalogu backend/.

Serwuje API pod /api i - jeśli front jest zbudowany - także samą aplikację pod
/, żeby wersja „produkcyjna" na własnym laptopie była jedną komendą i jednym
portem. W trybie deweloperskim front chodzi na Vite (:5173), który proxuje /api
tutaj; dlatego nie ma tu CORS-a - proxy sprawia, że przeglądarka widzi jedno
źródło, a middleware byłoby kolejną ruchomą częścią bez powodu.
"""

import logging
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from api.routers import (
    backup,
    content,
    dashboard,
    flashcards,
    journal,
    phases,
    questions,
    resources,
    session,
    tasks,
)
from db.connection import DB_PATH, get_connection
from db.schema import init_db
from db.seed_data import seed_if_empty
from services import backup as backup_service
from services import content as content_service

# Uvicorn zakłada handlery na własnych loggerach ("uvicorn", "uvicorn.error"),
# nie na root - bez tego podsumowanie importu materiałów i ścieżka migawki
# przepadałyby po cichu przy starcie. basicConfig jest no-opem, gdy root ma już
# handler, a loggery uvicorna mają propagate=False, więc nic się nie dubluje.
# Format ten sam co uvicorna, żeby wyjście czytało się jednolicie.
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")

logger = logging.getLogger("ml-roadmap")

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
SNAPSHOT_DIR = DB_PATH.parent / "snapshots"


def bootstrap() -> None:
    """Migracje, dane startowe, materiały z content/ i dzienna migawka.

    Raz przy starcie procesu, na własnym połączeniu - nie na tym z requestu.
    Odpowiednik `init_app()` z wersji streamlitowej, bez cache'owania
    połączenia: migracje mają przejechać dokładnie raz, a nie przy pierwszym
    trafieniu w endpoint.
    """
    conn = get_connection()
    try:
        init_db(conn)
        seed_if_empty(conn)
        # Materiały dociągają się przy starcie, żeby fiszka dopisana do pliku -
        # choćby z telefonu, przez webowy edytor GitHuba - trafiała do bazy bez
        # dodatkowego kliknięcia. Import jest idempotentny, patrz services/content.
        result = content_service.sync(conn)
        for warning in result.warnings:
            logger.warning("content: %s", warning)
        if result.total_added or result.answers_filled:
            logger.info(
                "content: dodano %s zadań, %s fiszek, %s pytań, %s materiałów; "
                "uzupełniono %s odpowiedzi",
                result.tasks_added,
                result.flashcards_added,
                result.questions_added,
                result.resources_added,
                result.answers_filled,
            )

        # Migawka po migracjach i imporcie, żeby odbijała stan, z którym apka
        # faktycznie wstała. Błąd zapisu nie ma prawa zablokować startu -
        # brak kopii jest przykry, brak działającej apki gorszy.
        try:
            snapshot = backup_service.write_daily_snapshot(conn, SNAPSHOT_DIR)
            if snapshot is not None:
                logger.info("migawka dnia: %s", snapshot)
        except OSError as exc:
            logger.warning("nie udało się zapisać migawki: %s", exc)
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    bootstrap()
    yield


app = FastAPI(
    title="ML Roadmap Companion",
    description="Lokalne API do codziennej nauki ML. Jeden użytkownik, bez auth.",
    version="2.0.0",
    lifespan=lifespan,
)


@app.exception_handler(sqlite3.IntegrityError)
async def integrity_error_handler(request: Request, exc: sqlite3.IntegrityError):
    """Naruszony klucz obcy albo CHECK to błąd wejścia, nie awaria serwera.

    Najczęstszy przypadek: phase_id wskazujący na fazę, której nie ma. Zamiast
    dopytywać bazę o istnienie fazy przed każdym zapisem, pozwalamy jej
    odpowiedzieć - to jedno zapytanie mniej i sprawdzenie atomowe.
    """
    logger.info("odrzucone przez bazę: %s", exc)
    return JSONResponse(
        status_code=400,
        content={"detail": f"Baza odrzuciła zapis: {exc}"},
    )


for router in (
    dashboard.router,
    phases.router,
    tasks.router,
    flashcards.router,
    questions.router,
    resources.router,
    journal.router,
    session.router,
    content.router,
    backup.router,
):
    app.include_router(router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def mount_frontend(application: FastAPI) -> None:
    """Zbudowany front pod /, z fallbackiem SPA na index.html.

    Montowane warunkowo: w trybie deweloperskim frontend/dist nie istnieje i nie
    ma go powodu wymagać - `uvicorn` ma wtedy obsługiwać samo API.
    """
    if not FRONTEND_DIST.is_dir():
        logger.info("frontend/dist nie istnieje - serwuję tylko API")
        return

    application.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="assets",
    )

    index = FRONTEND_DIST / "index.html"

    @application.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        # Routing trzyma React Router, więc każda nieznana ścieżka dostaje
        # index.html - inaczej odświeżenie strony na /session dawałoby 404.
        # Pliki leżące wprost w dist (favicon, manifest) serwujemy jako pliki.
        candidate = (FRONTEND_DIST / full_path).resolve()
        # is_relative_to zamiast samego is_file(): bez tego "../../etc/passwd"
        # w ścieżce wyszłoby poza katalog frontu. Apka chodzi na localhoście,
        # ale to nie powód, żeby zostawiać otwarty odczyt dowolnego pliku.
        if (
            full_path
            and candidate.is_file()
            and candidate.is_relative_to(FRONTEND_DIST.resolve())
        ):
            return FileResponse(candidate)
        return FileResponse(index)


mount_frontend(app)
