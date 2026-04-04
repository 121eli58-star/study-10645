"""API routes for course units."""
from fastapi import APIRouter, HTTPException
from services.content_loader import load_all_units, load_unit

router = APIRouter(tags=["units"])


@router.get("/units")
async def get_units():
    """Get list of all units with summary info."""
    units = load_all_units()
    result = []
    for u in units:
        flashcards = u.get("flashcards", [])
        quiz = u.get("quiz", [])
        summary = u.get("summary", [])
        result.append({
            "id": u["id"],
            "title": u["title"],
            "icon": u.get("icon", ""),
            "color": u.get("color", "#2563eb"),
            "topic_count": len(u.get("topics", [])),
            "flashcard_count": len(flashcards),
            "quiz_count": len(quiz),
            "summary_count": len(summary) if isinstance(summary, list) else len(summary.get("sections", []) if isinstance(summary, dict) else [])
        })
    return {"units": result}


@router.get("/units/{unit_id}")
async def get_unit(unit_id: int):
    """Get full unit content including summary, flashcards, quiz."""
    unit = load_unit(unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found")
    return unit


@router.get("/units/{unit_id}/summary")
async def get_unit_summary(unit_id: int):
    """Get unit summary only."""
    unit = load_unit(unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found")
    return {"summary": unit.get("summary", [])}


@router.get("/units/{unit_id}/flashcards")
async def get_unit_flashcards(unit_id: int):
    """Get unit flashcards only."""
    unit = load_unit(unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found")
    return {"flashcards": unit.get("flashcards", [])}


@router.get("/units/{unit_id}/quiz")
async def get_unit_quiz(unit_id: int):
    """Get unit quiz questions only (without correct answers for exam mode)."""
    unit = load_unit(unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found")
    return {"quiz": unit.get("quiz", [])}
