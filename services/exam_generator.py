"""Service to generate randomized exams from question pools."""
import random
import uuid
from services.content_loader import load_all_units, load_exam_pool


def generate_exam(num_questions: int = 20, unit_ids: list[int] | None = None) -> dict:
    """Generate a random exam from all available questions.

    Pulls from unit quizzes and the exam bank, shuffles, and returns
    an exam object with a unique ID.
    """
    all_questions = []

    # Collect from unit quizzes
    units = load_all_units()
    for unit in units:
        if unit_ids and unit["id"] not in unit_ids:
            continue
        for i, q in enumerate(unit.get("quiz", [])):
            all_questions.append({
                "id": q.get("id", f"u{unit['id']}_q{i}"),
                "unit_id": unit["id"],
                "unit_title": unit["title"],
                "question": q["question"],
                "options": q["options"],
                "correct": q["correct"],
                "explanation": q.get("explanation", q.get("explain", ""))
            })

    # Also pull from exam bank if available
    pool = load_exam_pool()
    for q in pool:
        if unit_ids and q.get("unit_id") not in unit_ids:
            continue
        all_questions.append(q)

    # Remove duplicates by question text
    seen = set()
    unique = []
    for q in all_questions:
        if q["question"] not in seen:
            seen.add(q["question"])
            unique.append(q)

    # Shuffle and take requested count
    random.shuffle(unique)
    selected = unique[:min(num_questions, len(unique))]

    exam_id = str(uuid.uuid4())[:8]

    return {
        "exam_id": exam_id,
        "questions": selected,
        "total": len(selected),
        "time_minutes": max(len(selected) * 3, 30)
    }


def grade_exam(exam_questions: list[dict], answers: dict[str, int]) -> dict:
    """Grade an exam submission and return detailed results."""
    score = 0
    total = len(exam_questions)
    feedback = []
    per_unit = {}

    for q in exam_questions:
        qid = q["id"]
        user_answer = answers.get(qid, -1)
        is_correct = user_answer == q["correct"]

        if is_correct:
            score += 1

        # Track per-unit scores
        uid = q.get("unit_id", 0)
        if uid not in per_unit:
            per_unit[uid] = {"correct": 0, "total": 0, "title": q.get("unit_title", "")}
        per_unit[uid]["total"] += 1
        if is_correct:
            per_unit[uid]["correct"] += 1

        feedback.append({
            "question_id": qid,
            "correct": is_correct,
            "correct_answer": q["correct"],
            "user_answer": user_answer,
            "explanation": q.get("explanation", "")
        })

    return {
        "score": score,
        "total": total,
        "percentage": round(score / total * 100, 1) if total > 0 else 0,
        "per_unit": per_unit,
        "feedback": feedback
    }
