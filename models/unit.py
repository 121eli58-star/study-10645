"""Pydantic models for course units, flashcards, and quiz questions."""
from pydantic import BaseModel
from typing import Optional


class SummarySection(BaseModel):
    heading: str
    content: str
    key_terms: list[str] = []


class Flashcard(BaseModel):
    id: str
    question: str
    answer: str
    difficulty: int = 1
    tags: list[str] = []


class QuizOption(BaseModel):
    text: str


class QuizQuestion(BaseModel):
    id: str
    question: str
    options: list[str]
    correct: int
    explanation: str
    difficulty: int = 1
    tags: list[str] = []


class UnitSummary(BaseModel):
    sections: list[SummarySection] = []
    bullet_points: list[str] = []


class Unit(BaseModel):
    id: int
    title: str
    icon: str
    color: str
    topics: list[str] = []
    summary: UnitSummary | list[str]
    flashcards: list[Flashcard]
    quiz: list[QuizQuestion]


class UnitListItem(BaseModel):
    id: int
    title: str
    icon: str
    color: str
    topic_count: int
    flashcard_count: int
    quiz_count: int
