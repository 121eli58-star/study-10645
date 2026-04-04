/**
 * API Client - Fetch wrapper for all backend calls
 */
window.API = {
  BASE: '/api',

  async _fetch(path, options = {}) {
    try {
      const res = await fetch(this.BASE + path, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`API Error [${path}]:`, err);
      throw err;
    }
  },

  // Units
  async getUnits() {
    return this._fetch('/units');
  },

  async getUnit(id) {
    return this._fetch(`/units/${id}`);
  },

  async getUnitSummary(id) {
    return this._fetch(`/units/${id}/summary`);
  },

  async getUnitFlashcards(id) {
    return this._fetch(`/units/${id}/flashcards`);
  },

  async getUnitQuiz(id) {
    return this._fetch(`/units/${id}/quiz`);
  },

  // Quiz
  async checkQuiz(unitId, answers) {
    return this._fetch('/quiz/check', {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId, answers })
    });
  },

  // Exam
  async generateExam(numQuestions, units) {
    return this._fetch('/exam/generate', {
      method: 'POST',
      body: JSON.stringify({ num_questions: numQuestions, units })
    });
  },

  async submitExam(examId, answers, timeTaken) {
    return this._fetch('/exam/submit', {
      method: 'POST',
      body: JSON.stringify({ exam_id: examId, answers, time_taken_seconds: timeTaken })
    });
  },

  // Progress
  async getProgress() {
    return this._fetch('/progress');
  },

  async updateProgress(unitId, activityType, data = {}) {
    return this._fetch('/progress', {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId, activity_type: activityType, data })
    });
  },

  // Diagrams
  async validateDiagram(diagramType, nodes, edges, exerciseId = null) {
    return this._fetch('/diagrams/validate', {
      method: 'POST',
      body: JSON.stringify({
        diagram_type: diagramType,
        exercise_id: exerciseId,
        nodes,
        edges
      })
    });
  }
};
