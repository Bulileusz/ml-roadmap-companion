from fastapi import APIRouter, Response, status

from api import schemas
from api.deps import DbConn, as_dict, as_dicts, found
from repository import question_attempts_repo, questions_repo
from services import activity, progress

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("", response_model=list[schemas.QuestionWithStats])
def list_questions(phase_id: int, conn: DbConn):
    # phase_id wymagany, bo strona i tak grupuje pytania po fazach - pełna lista
    # bez podziału nie ma odbiorcy, a statystyki liczy się per faza jednym
    # zapytaniem (stats_by_phase).
    stats = question_attempts_repo.stats_by_phase(conn, phase_id)
    result = []
    for question in questions_repo.list_by_phase(conn, phase_id):
        independent, total = stats.get(question["id"], (0, 0))
        result.append(
            {
                **dict(question),
                "stats": {
                    "independent": independent,
                    "total": total,
                    "pct": progress.phase_progress_pct(independent, total),
                },
            }
        )
    return result


@router.post("", response_model=schemas.Question, status_code=status.HTTP_201_CREATED)
def create_question(payload: schemas.QuestionCreate, conn: DbConn):
    question_id = questions_repo.create(
        conn,
        payload.phase_id,
        payload.question_text,
        payload.question_type,
        payload.answer,
    )
    return as_dict(questions_repo.get(conn, question_id))


@router.patch("/{question_id}", response_model=schemas.Question)
def update_question(question_id: int, payload: schemas.QuestionUpdate, conn: DbConn):
    found(questions_repo.get(conn, question_id), f"pytanie {question_id}")

    if payload.question_text is not None:
        questions_repo.update_text(conn, question_id, payload.question_text)
    if payload.question_type is not None:
        questions_repo.update_type(conn, question_id, payload.question_type)
    if payload.answer is not None:
        questions_repo.update_answer(conn, question_id, payload.answer)
    if "phase_id" in payload.model_fields_set:
        questions_repo.update_phase(conn, question_id, payload.phase_id)

    return as_dict(questions_repo.get(conn, question_id))


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, conn: DbConn):
    found(questions_repo.get(conn, question_id), f"pytanie {question_id}")
    # question_attempts leci razem z pytaniem przez ON DELETE CASCADE - log
    # podejść nie ma sensu bez pytania. Wpisy w dzienniku zostają, bo
    # activity_log.ref_id celowo nie jest kluczem obcym.
    questions_repo.delete(conn, question_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{question_id}/attempts", response_model=list[schemas.Attempt])
def list_attempts(question_id: int, conn: DbConn):
    found(questions_repo.get(conn, question_id), f"pytanie {question_id}")
    return as_dicts(question_attempts_repo.list_by_question(conn, question_id))


@router.post(
    "/{question_id}/attempts",
    response_model=schemas.QuestionStats,
    status_code=status.HTTP_201_CREATED,
)
def create_attempt(question_id: int, payload: schemas.AttemptCreate, conn: DbConn):
    question = found(questions_repo.get(conn, question_id), f"pytanie {question_id}")
    activity.record_question_attempt(conn, question, payload.solved_independently)

    # Zwracamy przeliczony wskaźnik, nie samo podejście: pasek samodzielności
    # pod pytaniem to jedyna rzecz, którą front musi po tym odświeżyć.
    independent, total = question_attempts_repo.stats_by_phase(
        conn, question["phase_id"]
    ).get(question_id, (0, 0))
    return {
        "independent": independent,
        "total": total,
        "pct": progress.phase_progress_pct(independent, total),
    }
