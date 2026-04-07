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
    const res = await fetch(`/data/units/${file}.json`);
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
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Support both index-based ("0","1") and id-based ("u1_q_01") keys
      const userAnswer = answers[String(i)] !== undefined ? answers[String(i)] : answers[q.id];
      const isCorrect = userAnswer === q.correct;
      if (isCorrect) correct++;
      results.push({
        question_index: i,
        question_id: q.id,
        correct: isCorrect,
        user_answer: userAnswer,
        correct_answer: q.correct,
        explanation: q.explanation || ''
      });
    }
    return {
      unit_id: unitId,
      score: correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round(correct / questions.length * 100) : 0,
      results
    };
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

  // ── Diagrams — full client-side validation ───────────────────────────────

  async validateDiagram(diagramType, nodes, edges, exerciseId = null) {
    const errors = [];
    const warnings = [];

    if (nodes.length === 0) {
      return { valid: false, errors: [{ message_he: 'התרשים ריק — גרור רכיבים מסרגל הכלים' }] };
    }

    const ofType = (t) => nodes.filter(n => n.type === t);
    const out = (id) => edges.filter(e => e.source === id);
    const inc = (id) => edges.filter(e => e.target === id);
    const conn = (id) => edges.filter(e => e.source === id || e.target === id);
    const byId = (id) => nodes.find(n => n.id === id);

    if (diagramType === 'flowchart') {
      const starts = ofType('start').filter(n => /התחלה|start/i.test(n.label));
      const ends = ofType('start').filter(n => /סוף|סיום|end/i.test(n.label));
      if (starts.length === 0) errors.push({ message_he: 'חסר אלמנט "התחלה"', affected_node_ids: [] });
      if (starts.length > 1) errors.push({ message_he: 'יש יותר מהתחלה אחת', affected_node_ids: starts.map(n => n.id) });
      if (ends.length === 0) errors.push({ message_he: 'חסר אלמנט "סוף"', affected_node_ids: [] });
      for (const d of ofType('decision')) {
        const o = out(d.id);
        if (o.length < 2) errors.push({ message_he: `תנאי "${d.label}" חייב 2 יציאות (כן/לא)`, affected_node_ids: [d.id] });
        else {
          const hasYN = o.some(e => /כן|yes/i.test(e.label)) && o.some(e => /לא|no/i.test(e.label));
          if (!hasYN) warnings.push({ message_he: `מומלץ לתייג יציאות "${d.label}" כ-"כן" ו-"לא"` });
        }
      }
      for (const n of nodes) {
        if (n.type === 'free_text' || n.type === 'connector') continue;
        if (n.type === 'start' && /סוף|סיום|end/i.test(n.label)) continue;
        if (out(n.id).length === 0) warnings.push({ message_he: `"${n.label}" — אין חיבור יוצא` });
      }
    }

    else if (diagramType === 'erd') {
      const ents = nodes.filter(n => n.type === 'entity' || n.type === 'weak_entity');
      const rels = nodes.filter(n => n.type === 'relationship' || n.type === 'weak_rel');
      if (ents.length === 0) errors.push({ message_he: 'חסרות ישויות בתרשים' });
      for (const ent of ents) {
        const connIds = conn(ent.id).map(e => e.source === ent.id ? e.target : e.source);
        if (!connIds.some(id => byId(id)?.type === 'key_attr'))
          errors.push({ message_he: `ישות "${ent.label}" חייבת תכונה מזהה (מפתח)`, affected_node_ids: [ent.id] });
      }
      for (const we of ofType('weak_entity')) {
        const connRels = conn(we.id).map(e => e.source === we.id ? e.target : e.source)
          .filter(id => { const n = byId(id); return n && (n.type === 'relationship' || n.type === 'weak_rel'); });
        if (connRels.length === 0) errors.push({ message_he: `ישות חלשה "${we.label}" חייבת קשר מזהה`, affected_node_ids: [we.id] });
      }
      for (const rel of rels) {
        const connEnts = conn(rel.id).map(e => e.source === rel.id ? e.target : e.source)
          .filter(id => { const n = byId(id); return n && (n.type === 'entity' || n.type === 'weak_entity'); });
        if (connEnts.length < 2) errors.push({ message_he: `קשר "${rel.label}" חייב לחבר לפחות 2 ישויות`, affected_node_ids: [rel.id] });
      }
      for (const a of nodes.filter(n => ['attribute','key_attr','multival_attr'].includes(n.type))) {
        if (conn(a.id).length === 0) warnings.push({ message_he: `תכונה "${a.label}" לא מחוברת` });
      }
    }

    else if (diagramType === 'dfd') {
      const procs = ofType('dfd_process');
      if (procs.length === 0) errors.push({ message_he: 'חייב לפחות תהליך אחד' });
      for (const p of procs) {
        if (inc(p.id).length === 0) errors.push({ message_he: `תהליך "${p.label}" חייב קלט (חץ נכנס)`, affected_node_ids: [p.id] });
        if (out(p.id).length === 0) errors.push({ message_he: `תהליך "${p.label}" חייב פלט (חץ יוצא)`, affected_node_ids: [p.id] });
      }
      for (const e of edges) {
        const src = byId(e.source), tgt = byId(e.target);
        if (src?.type === 'external' && tgt?.type === 'external')
          errors.push({ message_he: 'אסור זרימה ישירה בין ישויות חיצוניות' });
        if (src?.type === 'data_store' && tgt?.type === 'data_store')
          errors.push({ message_he: 'אסור זרימה ישירה בין מאגרי נתונים' });
      }
      for (const s of ofType('data_store')) {
        if (conn(s.id).length === 0) errors.push({ message_he: `מאגר "${s.label}" לא מחובר`, affected_node_ids: [s.id] });
      }
      if (edges.some(e => !e.label || !e.label.trim()))
        warnings.push({ message_he: 'מומלץ לתייג את כל זרימות המידע (חיצים)' });
    }

    else if (diagramType === 'class_diagram') {
      const cls = nodes.filter(n => ['class','interface','abstract_class'].includes(n.type));
      if (cls.length === 0) errors.push({ message_he: 'חסרות מחלקות בתרשים' });
      for (const c of cls) {
        if (conn(c.id).length === 0) warnings.push({ message_he: `"${c.label.split('\\n')[0]}" לא מחוברת` });
      }
    }

    else if (diagramType === 'menu_tree') {
      const menus = ofType('menu');
      if (menus.length === 0) errors.push({ message_he: 'חסר צומת שורש (תפריט ראשי)' });
      for (const n of nodes) {
        if (n.type === 'free_text') continue;
        if (n === menus[0]) continue; // root
        if (inc(n.id).length === 0) errors.push({ message_he: `"${n.label}" לא מחובר לצומת אב`, affected_node_ids: [n.id] });
      }
    }

    if (nodes.length > 1 && edges.length === 0)
      errors.push({ message_he: 'אין חיבורים — הוסף חיצים בין הרכיבים' });

    return { valid: errors.length === 0, errors, warnings };
  }
};
