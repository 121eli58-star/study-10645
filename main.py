"""
Course 10645 - Interactive Learning System
תכנון, ניתוח ועיצוב מערכות מידע

FastAPI application entry point.
Run with: python main.py
"""
import sys
from pathlib import Path

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from config import STATIC_DIR, HOST, PORT
from routers import units, quiz, exams, progress, diagrams

app = FastAPI(
    title="מערכת לימודים - קורס 10645",
    description="Interactive Learning System for Information Systems Design",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_event():
    """Ensure user_data directory and progress file exist."""
    from config import USER_DATA_DIR
    import json
    USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
    progress_file = USER_DATA_DIR / "progress.json"
    if not progress_file.exists():
        with open(progress_file, "w", encoding="utf-8") as f:
            json.dump({"units_read": [], "flashcards_completed": [], "quiz_scores": {}, "exam_history": []}, f)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(units.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(exams.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(diagrams.router, prefix="/api")

# Serve static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    """Serve the main SPA page."""
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "app": "course-10645-learning-system"}


if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 50)
    print("  מערכת לימודים - קורס 10645")
    print("  תכנון, ניתוח ועיצוב מערכות מידע")
    print("=" * 50)
    print(f"\n  Server: http://{HOST}:{PORT}")
    print(f"  API Docs: http://{HOST}:{PORT}/docs")
    print("=" * 50 + "\n")

    uvicorn.run(app, host=HOST, port=PORT)
