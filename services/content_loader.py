"""Service to load and cache JSON content files."""
import json
from pathlib import Path
from functools import lru_cache
from config import UNITS_DIR, EXERCISES_DIR, EXAM_BANK_DIR, USER_DATA_DIR


def _load_json(path: Path) -> dict:
    """Load a JSON file and return its contents."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_all_units() -> list[dict]:
    """Load all unit JSON files sorted by ID."""
    units = []
    for json_file in sorted(UNITS_DIR.glob("unit_*.json")):
        data = _load_json(json_file)
        units.append(data)
    return sorted(units, key=lambda u: u["id"])


def load_unit(unit_id: int) -> dict | None:
    """Load a single unit by ID."""
    for json_file in UNITS_DIR.glob("unit_*.json"):
        data = _load_json(json_file)
        if data.get("id") == unit_id:
            return data
    return None


def load_exercises(diagram_type: str) -> list[dict]:
    """Load diagram exercises by type."""
    path = EXERCISES_DIR / f"{diagram_type}_exercises.json"
    if path.exists():
        data = _load_json(path)
        return data.get("exercises", [])
    return []


def load_exam_pool() -> list[dict]:
    """Load the exam question pool."""
    path = EXAM_BANK_DIR / "exam_questions_pool.json"
    if path.exists():
        data = _load_json(path)
        return data.get("questions", [])
    return []


def load_progress() -> dict:
    """Load user progress from file."""
    path = USER_DATA_DIR / "progress.json"
    if path.exists():
        return _load_json(path)
    return {
        "units_read": [],
        "flashcards_completed": [],
        "quiz_scores": {},
        "exam_history": []
    }


def save_progress(progress: dict) -> None:
    """Save user progress to file."""
    path = USER_DATA_DIR / "progress.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)
