"""API routes for quiz checking."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.content_loader import load_unit

router = APIRouter(tags=["quiz"])


class QuizSubmission(BaseModel):
    unit_id: int
    answers: dict[str, int]  # question_index -> selected_option_index


@router.post("/quiz/check")
async def check_quiz(submission: QuizSubmission):
    """Check quiz answers and return detailed results."""
    unit = load_unit(submission.unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail=f"Unit {submission.unit_id} not found")

    quiz = unit.get("quiz", [])
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz found for this unit")

    score = 0
    total = len(quiz)
    results = []

    for i, q in enumerate(quiz):
        idx = str(i)
        user_answer = submission.answers.get(idx, -1)
        is_correct = user_answer == q["correct"]
        if is_correct:
            score += 1
        results.append({
            "question_index": i,
            "correct": is_correct,
            "correct_answer": q["correct"],
            "user_answer": user_answer,
            "explanation": q.get("explanation", q.get("explain", ""))
        })

    return {
        "score": score,
        "total": total,
        "percentage": round(score / total * 100, 1) if total > 0 else 0,
        "results": results
    }
