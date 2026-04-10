/**
 * API Client — Multi-course, Firestore-backed with localStorage fallback
 */
window.API = {
  _currentCourseId: null,
  _courseManifest: null,
  _courses: null,
  _cache: {},  // keyed by `${courseId}_${unitId}`

  // ── Courses ──

  async getCourses() {
    if (this._courses) return this._courses;
    const res = await fetch('/data/courses/courses_index.json');
    if (!res.ok) throw new Error('Failed to load courses index');
    this._courses = await res.json();
    return this._courses;
  },

  async setCourse(courseId) {
    if (this._currentCourseId === courseId && this._courseManifest) return this._courseManifest;
    const res = await fetch(`/data/courses/${courseId}/course.json`);
    if (!res.ok) throw new Error(`Failed to load course ${courseId}`);
    this._courseManifest = await res.json();
    this._currentCourseId = courseId;
    localStorage.setItem('active_course', courseId);
    return this._courseManifest;
  },

  getCurrentCourse() {
    return this._courseManifest;
  },

  getCurrentCourseId() {
    return this._currentCourseId;
  },

  // ── Units ──

  async _loadUnit(id) {
    const cacheKey = `${this._currentCourseId}_${id}`;
    if (this._cache[cacheKey]) return this._cache[cacheKey];
    const manifest = this._courseManifest;
    if (!manifest) throw new Error('No course selected');
    const entry = manifest.units.find(u => u.id === id);
    if (!entry) throw new Error(`Unit ${id} not found in course ${manifest.id}`);
    const res = await fetch(`/data/courses/${manifest.id}/units/${entry.file}.json`);
    if (!res.ok) throw new Error(`Failed to load unit ${id}`);
    const data = await res.json();
    this._cache[cacheKey] = data;
    return data;
  },

  async getUnits() {
    const manifest = this._courseManifest;
    if (!manifest) throw new Error('No course selected');
    const units = await Promise.all(
      manifest.units.map(async entry => {
        const u = await this._loadUnit(entry.id);
        return {
          id: u.id, title: u.title, icon: u.icon || '',
          color: u.color || manifest.color || '#3b82f6',
          topic_count: (u.topics || []).length,
          flashcard_count: (u.flashcards || []).length,
          quiz_count: (u.quiz || []).length,
          summary_count: Array.isArray(u.summary) ? u.summary.length : 0
        };
      })
    );
    return { units };
  },

  async getUnit(id) { return this._loadUnit(id); },
  async getUnitSummary(id) { const u = await this._loadUnit(id); return { summary: u.summary || [] }; },
  async getUnitFlashcards(id) { const u = await this._loadUnit(id); return { flashcards: u.flashcards || [] }; },
  async getUnitQuiz(id) { const u = await this._loadUnit(id); return { quiz: u.quiz || [] }; },

  async checkQuiz(unitId, answers) {
    const u = await this._loadUnit(unitId);
    const questions = u.quiz || [];
    let correct = 0;
    const results = questions.map(q => {
      const isCorrect = answers[q.id] === q.correct;
      if (isCorrect) correct++;
      return { question_id: q.id, correct: isCorrect, correct_answer: q.correct, explanation: q.explanation || '' };
    });
    return { score: correct, total: questions.length, percentage: Math.round(correct / questions.length * 100), results };
  },

  async generateExam(numQuestions, units) {
    const manifest = this._courseManifest;
    const pool = [];
    const unitIds = (units && units.length > 0) ? units : manifest.units.map(u => u.id);
    for (const uid of unitIds) {
      try { const u = await this._loadUnit(uid); (u.quiz || []).forEach(q => pool.push({ ...q, unit_id: uid })); } catch (e) {}
    }
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numQuestions);
    const examId = 'exam_' + Date.now();
    window.__examAnswerKey = { id: examId, questions: selected };
    return { exam_id: examId, questions: selected.map(({ correct, explanation, ...q }) => q) };
  },

  async submitExam(examId, answers, timeTaken) {
    const key = window.__examAnswerKey;
    if (!key || key.id !== examId) return { score: 0, total: 0, results: [] };
    let correct = 0;
    const results = key.questions.map(q => {
      const isCorrect = answers[q.id] === q.correct;
      if (isCorrect) correct++;
      return { question_id: q.id, correct: isCorrect, correct_answer: q.correct, explanation: q.explanation || '' };
    });
    const examData = { date: new Date().toISOString(), score: correct, total: key.questions.length, time_taken: timeTaken };
    await this.updateProgress(0, 'exam', examData);
    return { score: correct, total: key.questions.length, results };
  },

  // ── Progress (per-course, Firestore with localStorage fallback) ──

  _progressKey() { return `study_${this._currentCourseId}_progress`; },

  _defaultProgress() {
    return {
      units_read: [],
      flashcards_completed: [],
      quiz_scores: {},
      exam_history: [],
      flashcard_mastery: {},  // { "unitId_cardIndex": { box, nextReview, lastSeen } }
      quiz_mistakes: {}       // { "unitId_qIndex": count }
    };
  },

  // Leitner box review intervals in days (index = box number 1-5)
  _leitnerDays: [0, 1, 2, 4, 8, 16],

  _getUid() {
    return Auth?.currentUser?.uid || null;
  },

  /** Fast synchronous read from localStorage — use for initial render */
  getProgressSync() {
    try { return JSON.parse(localStorage.getItem(this._progressKey())) || this._defaultProgress(); }
    catch { return this._defaultProgress(); }
  },

  /** Legacy async path: checks Firestore first, falls back to localStorage */
  async getProgress() {
    const uid = this._getUid();
    const courseId = this._currentCourseId;
    if (uid && Auth?.db) {
      try {
        const doc = await Auth.db.collection('users').doc(uid).collection('courses').doc(courseId).get();
        if (doc.exists) {
          const p = doc.data();
          // keep localStorage in sync for future sync reads
          try { localStorage.setItem(this._progressKey(), JSON.stringify(p)); } catch {}
          return p;
        }
      } catch (e) { console.warn('Firestore read failed, using localStorage', e); }
    }
    return this.getProgressSync();
  },

  /** Background Firestore sync — dispatches 'progress-synced' event when done */
  async syncProgressFromCloud() {
    const uid = this._getUid();
    if (!uid || !Auth?.db) return null;
    const courseId = this._currentCourseId;
    try {
      const doc = await Auth.db.collection('users').doc(uid).collection('courses').doc(courseId).get();
      if (doc.exists) {
        const p = doc.data();
        try { localStorage.setItem(this._progressKey(), JSON.stringify(p)); } catch {}
        window.dispatchEvent(new CustomEvent('progress-synced', { detail: p }));
        return p;
      }
    } catch (e) { console.warn('Progress sync failed', e); }
    return null;
  },

  async _saveProgress(p) {
    localStorage.setItem(this._progressKey(), JSON.stringify(p));
    const uid = this._getUid();
    const courseId = this._currentCourseId;
    if (uid && Auth?.db) {
      try {
        await Auth.db.collection('users').doc(uid).collection('courses').doc(courseId).set(p, { merge: true });
      } catch (e) { console.warn('Firestore write failed', e); }
    }
  },

  async updateProgress(unitId, activityType, data = {}) {
    const progress = await this.getProgress();
    if (activityType === 'read' && unitId) {
      if (!progress.units_read.includes(unitId)) progress.units_read.push(unitId);
    } else if (activityType === 'flashcard' && unitId) {
      if (!progress.flashcards_completed.includes(unitId)) progress.flashcards_completed.push(unitId);
    } else if (activityType === 'quiz' && unitId) {
      progress.quiz_scores[String(unitId)] = data.score ?? 0;
    } else if (activityType === 'exam') {
      if (!progress.exam_history) progress.exam_history = [];
      progress.exam_history.push(data);
    }
    await this._saveProgress(progress);
    return { status: 'ok', progress };
  },

  // ── Spaced Repetition (Leitner boxes) ──

  /** Update mastery after reviewing a flashcard. `knew` = true → advance box; false → reset to box 1 */
  async updateFlashcardMastery(cardKey, knew) {
    const progress = await this.getProgress();
    if (!progress.flashcard_mastery) progress.flashcard_mastery = {};
    const cur = progress.flashcard_mastery[cardKey] || { box: 1, nextReview: 0, lastSeen: 0 };
    const now = Date.now();
    const newBox = knew ? Math.min(5, cur.box + 1) : 1;
    const days = this._leitnerDays[newBox] || 1;
    progress.flashcard_mastery[cardKey] = {
      box: newBox,
      nextReview: now + days * 86400000, // ms per day
      lastSeen: now
    };
    await this._saveProgress(progress);
    return progress.flashcard_mastery[cardKey];
  },

  /** Returns indices of cards due for review now in a unit (unseen cards are always "due") */
  getUnitCardsDue(unitId, totalCards) {
    const progress = this.getProgressSync();
    const mastery = progress.flashcard_mastery || {};
    const now = Date.now();
    const due = [];
    for (let i = 0; i < totalCards; i++) {
      const key = `${unitId}_${i}`;
      const m = mastery[key];
      if (!m || m.nextReview <= now) due.push(i); // unseen OR overdue
    }
    return due;
  },

  /** Total cards due across all units (for dashboard badge) */
  getFlashcardsDueCount() {
    const progress = this.getProgressSync();
    const mastery = progress.flashcard_mastery || {};
    const now = Date.now();
    return Object.values(mastery).filter(m => m.nextReview <= now).length;
  },

  /** Get mastery object for a card */
  getCardMastery(cardKey) {
    const progress = this.getProgressSync();
    return (progress.flashcard_mastery || {})[cardKey] || null;
  },

  // ── Quiz Mistakes ──

  /** Record which question indices were wrong after a quiz submission */
  async recordQuizMistakes(unitId, wrongIndices) {
    if (!wrongIndices || wrongIndices.length === 0) return;
    const progress = await this.getProgress();
    if (!progress.quiz_mistakes) progress.quiz_mistakes = {};
    for (const idx of wrongIndices) {
      const key = `${unitId}_${idx}`;
      progress.quiz_mistakes[key] = (progress.quiz_mistakes[key] || 0) + 1;
    }
    await this._saveProgress(progress);
  },

  /** Get mistake indices for a unit (sorted by mistake count desc) */
  getQuizMistakes(unitId) {
    const progress = this.getProgressSync();
    const mistakes = progress.quiz_mistakes || {};
    return Object.entries(mistakes)
      .filter(([k]) => k.startsWith(`${unitId}_`))
      .map(([k, count]) => ({ index: parseInt(k.split('_')[1]), count }))
      .sort((a, b) => b.count - a.count);
  },

  // ── Migration: old flat progress → per-course ──

  async _migrateOldProgress() {
    const oldKey = 'study10645_progress';
    const old = localStorage.getItem(oldKey);
    if (old && !localStorage.getItem('study_10645_progress')) {
      localStorage.setItem('study_10645_progress', old);
      localStorage.removeItem(oldKey);
    }
  },

  // ── Chat History (Firestore, per-course) ──

  async saveChatHistory(messages) {
    const uid = this._getUid();
    if (!uid || !Auth?.db) return;
    const courseId = this._currentCourseId;
    try {
      await Auth.db.collection('users').doc(uid).collection('courses').doc(courseId)
        .collection('data').doc('chat_history').set({
          messages: messages.slice(-50),
          updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.warn('Chat history save failed', e); }
  },

  async loadChatHistory() {
    const uid = this._getUid();
    if (!uid || !Auth?.db) return [];
    const courseId = this._currentCourseId;
    try {
      const doc = await Auth.db.collection('users').doc(uid).collection('courses').doc(courseId)
        .collection('data').doc('chat_history').get();
      return doc.exists ? (doc.data().messages || []) : [];
    } catch (e) { return []; }
  },

  // ── Diagrams ──
  async validateDiagram(diagramType, nodes, edges, exerciseId = null) {
    const issues = [];
    if (nodes.length === 0) issues.push({ type: 'error', message: 'אין רכיבים בתרשים — גרור רכיבים מהסרגל' });
    if (nodes.length > 1 && edges.length === 0) issues.push({ type: 'warning', message: 'יש רכיבים שאינם מחוברים — הוסף חיצים בין הרכיבים' });
    const isValid = issues.filter(i => i.type === 'error').length === 0;
    return { valid: isValid, issues, feedback: isValid ? '✅ התרשים נראה תקין!' : '⚠️ יש בעיות: ' + issues.map(i => i.message).join(', ') };
  }
};
