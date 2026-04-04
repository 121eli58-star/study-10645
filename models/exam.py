"""Pydantic models for exam simulation."""
from pydantic import BaseModel
from typing import Optional


class ExamConfig(BaseModel):
    num_questions: int = 20
    units: list[int] = []
    time_minutes: int = 90


class ExamQuestion(BaseModel):
    id: str
    unit_id: int
    question: str
    options: list[str]
    correct: int
    explanation: str


class ExamSubmission(BaseModel):
    exam_id: str
    answers: dict[str, int]
    time_taken_seconds: int


class ExamResult(BaseModel):
    score: int
    total: int
    percentage: float
    per_unit: dict[int, dict]
    feedback: list[dict]


class ProgressData(BaseModel):
    unit_id: int
    activity_type: str
    data: dict = {}


class UserProgress(BaseModel):
    units_read: list[int] = []
    flashcards_completed: list[int] = []
    quiz_scores: dict[str, int] = {}
    exam_history: list[dict] = []
