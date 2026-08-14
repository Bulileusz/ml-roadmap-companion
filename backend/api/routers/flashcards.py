from fastapi import APIRouter, Response, status

from api import schemas
from api.deps import DbConn, as_dict, as_dicts, found
from repository import flashcards_repo
from services import session, spaced_repetition

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@router.get("", response_model=list[schemas.Flashcard])
def list_flashcards(conn: DbConn):
    return as_dicts(flashcards_repo.list_all(conn))


@router.get("/due", response_model=list[schemas.Flashcard])
def list_due(conn: DbConn):
    return as_dicts(spaced_repetition.get_due_cards(conn))


@router.get("/intro", response_model=list[schemas.Flashcard])
def list_intro(conn: DbConn, limit: int = session.INTROS_PER_SESSION):
    return as_dicts(spaced_repetition.get_intro_cards(conn, limit))


@router.post("", response_model=schemas.Flashcard, status_code=status.HTTP_201_CREATED)
def create_flashcard(payload: schemas.FlashcardCreate, conn: DbConn):
    # needs_intro domyślnie False: fiszkę dopisaną tutaj właśnie napisałeś,
    # więc widziałeś obie strony - przebieg zapoznawczy byłby pustym klikiem.
    card_id = spaced_repetition.create_card(
        conn, payload.front, payload.back, payload.phase_id
    )
    return as_dict(flashcards_repo.get(conn, card_id))


@router.patch("/{card_id}", response_model=schemas.Flashcard)
def update_flashcard(card_id: int, payload: schemas.FlashcardUpdate, conn: DbConn):
    card = found(flashcards_repo.get(conn, card_id), f"fiszka {card_id}")

    # Przód i tył idą jednym UPDATE-em, bo repozytorium wymaga obu - brakujące
    # pole bierzemy z bazy, żeby PATCH samego tyłu nie wyczyścił przodu.
    if payload.front is not None or payload.back is not None:
        flashcards_repo.update_content(
            conn,
            card_id,
            payload.front if payload.front is not None else card["front"],
            payload.back if payload.back is not None else card["back"],
        )
    if payload.own_note is not None:
        flashcards_repo.update_own_note(conn, card_id, payload.own_note)
    # model_fields_set, nie "is not None": phase_id=null znaczy "odepnij od
    # fazy" i musi być rozróżnialne od pominięcia pola w PATCH-u.
    if "phase_id" in payload.model_fields_set:
        flashcards_repo.update_phase(conn, card_id, payload.phase_id)

    return as_dict(flashcards_repo.get(conn, card_id))


@router.post("/{card_id}/review", response_model=schemas.Flashcard)
def review_flashcard(card_id: int, payload: schemas.ReviewResult, conn: DbConn):
    found(flashcards_repo.get(conn, card_id), f"fiszka {card_id}")
    spaced_repetition.record_review(conn, card_id, correct=payload.correct)
    # Zwracamy kartę po zmianie: front pokazuje awans pudełka od razu, bez
    # dopytywania o listę.
    return as_dict(flashcards_repo.get(conn, card_id))


@router.post("/{card_id}/intro", response_model=schemas.Flashcard)
def introduce_flashcard(card_id: int, conn: DbConn):
    found(flashcards_repo.get(conn, card_id), f"fiszka {card_id}")
    spaced_repetition.record_intro(conn, card_id)
    return as_dict(flashcards_repo.get(conn, card_id))


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flashcard(card_id: int, conn: DbConn):
    found(flashcards_repo.get(conn, card_id), f"fiszka {card_id}")
    flashcards_repo.delete(conn, card_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
