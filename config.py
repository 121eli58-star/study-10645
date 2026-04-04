"""Application configuration."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UNITS_DIR = DATA_DIR / "units"
EXERCISES_DIR = DATA_DIR / "diagram_exercises"
EXAM_BANK_DIR = DATA_DIR / "exam_bank"
STATIC_DIR = BASE_DIR / "static"
USER_DATA_DIR = BASE_DIR / "user_data"

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", 8000))
