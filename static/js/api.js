/**
 * API Client - Fully client-side implementation
 * Reads JSON data files directly, stores progress in localStorage
 */
window.API = {
  // Map unit IDs to their JSON filenames
  _unitFiles: {
    1: 'unit_01_intro',
    2: 'unit_02_flowcharts',
    3: 'unit_03_feasibility',
    4: 'unit_04_data_dictionary',
    5: 'unit_05_erd',
    6: 'unit_06_transactions_menu',
    7: 'unit_07_normalization',
    8: 'unit_08_uml_class',
    9: 'unit_09_dfd'
  },

  _cache: {},

  /** Load a single unit JSON file (cached) */
  async _loadUnit(id) {
    if (this._cache[id]) return this._cache[id];
    const file = this._unitFiles[id];
    if (!file) throw new Error(`Unit ${id} not found`);
    const res = await fetch(`/static/data/units/${file}.json`);
    if (!res.ok) throw new Error(`Failed to load unit ${id}`);
    const data = await res.json();
    this._cache[id] = data;
    return data;
  },

  // ── Units ────────────────────────────────────────────────────────────────

  async getUnits() {
    const ids = Object.keys(this._unitFiles).map(Number);
    const units = [];
    for (const id of ids) {
      const u = await this._loadUnit(id);
      const summary = u.summary || [];
      units.push({
        id: u.id,
        title: u.title,
        icon: u.icon || '',
        color: u.color || '#2563eb',
        topic_count: (u.topics || []).length,
        flashcard_count: (u.flashcards || []).length,
        quiz_count: (u.quiz || []).length,
        summary_count: Array.isArray(summary) ? summary.length : 0
      });
    }
    return { units };
  },

  async getUnit(id) {
    return this._loadUnit(id);
  },

  async getUnitSummary(id) {
    const u = await this._loadUnit(id);
    return { summary: u.summary || [] };
  },

  async getUnitFlashcards(id) {
    const u = await this._loadUnit(id);
    return { flashcards: u.flashcards || [] };
  },

  async getUnitQuiz(id) {
    const u = await this._loadUnit(id);
    return { quiz: u.quiz || [] };
  },

  // ── Quiz ─────────────────────────────────────────────────────────────────

  async checkQuiz(unitId, answers) {
    const u = await this._loadUnit(unitId);
    const questions = u.quiz || [];
    let correct = 0;
    const results = [];
    for (const q of questions) {
      const isCorrect = answers[q.id] === q.correct;
      if (isCorrect) correct++;
      results.push({
        question_id: q.id,
        correct: isCorrect,
        correct_answer: q.correct,
        explanation: q.explanation || ''
      });
    }
    return { score: correct, total: questions.length, results };
  },

  // ── Exam ─────────────────────────────────────────────────────────────────

  async generateExam(numQuestions, units) {
    const pool = [];
    const unitIds = (units && units.length > 0)
      ? units
      : Object.keys(this._unitFiles).map(Number);

    for (const uid of unitIds) {
      try {
        const u = await this._loadUnit(uid);
        (u.quiz || []).forEach(q => pool.push({ ...q, unit_id: uid }));
      } catch (e) { /* skip missing units */ }
    }

    // Shuffle and pick
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numQuestions);
    const examId = 'exam_' + Date.now();

    // Store answer key in memory for this session
    window.__examAnswerKey = { id: examId, questions: selected };

    // Strip correct answers before sending to UI
    return {
      exam_id: examId,
      questions: selected.map(({ correct, explanation, ...q }) => q)
    };
  },

  async submitExam(examId, answers, timeTaken) {
    const key = window.__examAnswerKey;
    if (!key || key.id !== examId) return { score: 0, total: 0, results: [] };

    let correct = 0;
    const results = key.questions.map(q => {
      const isCorrect = answers[q.id] === q.correct;
      if (isCorrect) correct++;
      return {
        question_id: q.id,
        correct: isCorrect,
        correct_answer: q.correct,
        explanation: q.explanation || ''
      };
    });

    const examData = {
      date: new Date().toISOString(),
      score: correct,
      total: key.questions.length,
      time_taken: timeTaken
    };
    await this.updateProgress(0, 'exam', examData);

    return { score: correct, total: key.questions.length, results };
  },

  // ── Progress (localStorage) ───────────────────────────────────────────────

  _defaultProgress() {
    return { units_read: [], flashcards_completed: [], quiz_scores: {}, exam_history: [] };
  },

  _loadProgress() {
    try {
      return JSON.parse(localStorage.getItem('study10645_progress')) || this._defaultProgress();
    } catch {
      return this._defaultProgress();
    }
  },

  _saveProgress(p) {
    localStorage.setItem('study10645_progress', JSON.stringify(p));
  },

  async getProgress() {
    return this._loadProgress();
  },

  async updateProgress(unitId, activityType, data = {}) {
    const progress = this._loadProgress();

    if (activityType === 'read' && unitId) {
      if (!progress.units_read.includes(unitId)) progress.units_read.push(unitId);
    } else if (activityType === 'flashcard' && unitId) {
      if (!progress.flashcards_completed.includes(unitId)) progress.flashcards_completed.push(unitId);
    } else if (activityType === 'quiz' && unitId) {
      progress.quiz_scores[String(unitId)] = data.score ?? 0;
    } else if (activityType === 'exam') {
      progress.exam_history.push(data);
    }

    this._saveProgress(progress);
    return { status: 'ok', progress };
  },

  // ── Diagrams ─────────────────────────────────────────────────────────────

  async validateDiagram(diagramType, nodes, edges, exerciseId = null) {
    const issues = [];
    if (nodes.length === 0) {
      issues.push({ type: 'error', message: 'אין רכיבים בתרשים — גרור רכיבים מהסרגל' });
    }
    if (nodes.length > 1 && edges.length === 0) {
      issues.push({ type: 'warning', message: 'יש רכיבים שאינם מחוברים — הוסף חיצים בין הרכיבים' });
    }
    const isValid = issues.filter(i => i.type === 'error').length === 0;
    return {
      valid: isValid,
      issues,
      feedback: isValid
        ? '✅ התרשים נראה תקין! (בדיקה מלאה עם AI תהיה זמינה בקרוב)'
        : '⚠️ יש בעיות לתיקון: ' + issues.map(i => i.message).join(', ')
    };
  }
};
