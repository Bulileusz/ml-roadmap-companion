import json
import sqlite3

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import Response

from api import schemas
from api.deps import DbConn
from services import backup

router = APIRouter(prefix="/backup", tags=["backup"])


def _parse(raw: bytes) -> dict:
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=400, detail=f"Nie udało się odczytać pliku: {exc}"
        ) from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Plik nie zawiera obiektu JSON.")
    return payload


@router.get("/export")
def export(conn: DbConn):
    """Cała baza jako jeden plik JSON, gotowy do pobrania."""
    filename = backup.export_filename()
    return Response(
        content=backup.export_json(conn),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            # Bez tego przeglądarka nie widzi nazwy pliku przez fetch() -
            # nagłówki inne niż bezpieczne domyślnie są ukryte przed JS-em.
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post("/preview", response_model=schemas.BackupPreview)
def preview(conn: DbConn, file: UploadFile):
    """Co wejdzie z pliku - do pokazania PRZED zgodą na skasowanie tego, co jest."""
    payload = _parse(file.file.read())
    problem = backup.problem_with(conn, payload)
    version = payload.get("schema_version")
    return {
        "summary": backup.summarize(payload),
        "exported_at": payload.get("exported_at"),
        "schema_version": version if isinstance(version, int) else None,
        "compatible": problem is None,
        "problem": problem,
    }


@router.post("/import", response_model=schemas.BackupImportResult)
def import_backup(conn: DbConn, file: UploadFile):
    """Zastępuje całą zawartość bazy danymi z pliku.

    Przed nadpisaniem powstaje kopia bezpieczeństwa obok pliku bazy - przez
    sqlite3 backup API, nie kopiowanie pliku, bo baza chodzi w trybie WAL
    i surowa kopia bez sidecarów potrafi być niespójna.
    """
    payload = _parse(file.file.read())
    # Ścieżkę bierzemy z połączenia, nie ze stałej DB_PATH: kopia ma leżeć obok
    # tej bazy, którą faktycznie nadpisujemy.
    current = backup.database_path(conn)
    if current is None:
        raise HTTPException(
            status_code=500,
            detail="Baza działa w pamięci - nie ma gdzie zapisać kopii bezpieczeństwa.",
        )
    target = backup.backup_path_for(current)
    try:
        backup.backup_database(conn, target)
        summary = backup.import_data(conn, payload)
    except backup.BackupError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Błąd bazy danych: {exc}") from exc
    return {"summary": summary, "backup_path": str(target)}
