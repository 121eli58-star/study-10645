"""API routes for user progress tracking."""
from fastapi import APIRouter
from pydantic import BaseModel
from services.content_loader import load_progress, save_progress

router = APIRouter(tags=["progress"])


class ProgressUpdate(BaseModel):
    unit_id: int
    activity_type: str  # "read", "flashcard", "quiz", "diagram", "exam"
    data: dict = {}


@router.get("/progress")
async def get_progress():
    """Get current user progress."""
    return load_progress()


@router.post("/progress")
async def update_progress(update: ProgressUpdate):
    """Update user progress."""
    progress = load_progress()

    if update.activity_type == "read":
        if update.unit_id not in progress["units_read"]:
            progress["units_read"].append(update.unit_id)

    elif update.activity_type == "flashcard":
        if update.unit_id not in progress["flashcards_completed"]:
            progress["flashcards_completed"].append(update.unit_id)

    elif update.activity_type == "quiz":
        key = str(update.unit_id)
        score = update.data.get("score", 0)
        progress["quiz_scores"][key] = score

    elif update.activity_type == "exam":
        progress["exam_history"].append(update.data)

    save_progress(progress)
    return {"status": "ok", "progress": progress}
