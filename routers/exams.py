"""API routes for exam simulation."""
from fastapi import APIRouter
from pydantic import BaseModel
from services.exam_generator import generate_exam, grade_exam

router = APIRouter(tags=["exams"])

# In-memory cache of generated exams for grading
_exam_cache: dict[str, list[dict]] = {}


class ExamRequest(BaseModel):
    num_questions: int = 20
    units: list[int] = []


class ExamSubmission(BaseModel):
    exam_id: str
    answers: dict[str, int]
    time_taken_seconds: int = 0


@router.post("/exam/generate")
async def create_exam(request: ExamRequest):
    """Generate a new randomized exam."""
    exam = generate_exam(
        num_questions=request.num_questions,
        unit_ids=request.units if request.units else None
    )
    # Cache for grading later
    _exam_cache[exam["exam_id"]] = exam["questions"]

    # Strip correct answers for client
    client_questions = []
    for q in exam["questions"]:
        client_questions.append({
            "id": q["id"],
            "unit_id": q.get("unit_id", 0),
            "question": q["question"],
            "options": q["options"]
        })

    return {
        "exam_id": exam["exam_id"],
        "questions": client_questions,
        "total": exam["total"],
        "time_minutes": exam["time_minutes"]
    }


@router.post("/exam/submit")
async def submit_exam(submission: ExamSubmission):
    """Submit and grade an exam."""
    questions = _exam_cache.get(submission.exam_id)
    if not questions:
        return {"error": "Exam not found or expired. Please generate a new exam."}

    result = grade_exam(questions, submission.answers)

    # Clean up cache
    del _exam_cache[submission.exam_id]

    return result
