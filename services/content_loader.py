"""Service to load and cache JSON content files (multi-course)."""
import json
from pathlib import Path
from config import COURSES_DIR, UNITS_DIR, EXERCISES_DIR, EXAM_BANK_DIR, USER_DATA_DIR


def _load_json(path: Path) -> dict:
    """Load a JSON file and return its contents."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_courses() -> list[dict]:
    """Load the courses index."""
    index_path = COURSES_DIR / "courses_index.json"
    if index_path.exists():
        return _load_json(index_path)
    return []


def load_course(course_id: str) -> dict | None:
    """Load a course manifest by ID."""
    path = COURSES_DIR / course_id / "course.json"
    if path.exists():
        return _load_json(path)
    return None


def load_all_units(course_id: str = None) -> list[dict]:
    """Load all unit JSON files for a course, sorted by ID."""
    if course_id:
        units_dir = COURSES_DIR / course_id / "units"
    else:
        units_dir = UNITS_DIR  # legacy fallback
    units = []
    for json_file in sorted(units_dir.glob("unit_*.json")):
        data = _load_json(json_file)
        units.append(data)
    return sorted(units, key=lambda u: u["id"])


def load_unit(unit_id: int, course_id: str = None) -> dict | None:
    """Load a single unit by ID, optionally scoped to a course."""
    if course_id:
        units_dir = COURSES_DIR / course_id / "units"
    else:
        units_dir = UNITS_DIR
    for json_file in units_dir.glob("unit_*.json"):
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
