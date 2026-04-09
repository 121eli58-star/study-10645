/**
 * Quiz Viewer — Hub + Quiz
 */
window.QuizViewer = {
  unitId: null, unitData: null, answers: {}, submitted: false, results: null,

  async render(container, unitId) {
    if (!unitId) { this._renderHub(container); return; }
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
    try {
      const unit = await API.getUnit(unitId);
      this.unitId = unitId; this.unitData = unit;
      this.answers = {}; this.submitted = false; this.results = null;
      this._renderQuiz(container);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  /** Hub page */
  async _renderHub(container) {
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
    try {
      const [unitsData, progress] = await Promise.all([API.getUnits(), API.getProgress()]);
      const units = unitsData.units || [];
      const quizScores = progress.quiz_scores || {};
      const completedCount = Object.keys(quizScores).length;
      const totalScore = Object.values(quizScores).reduce((a, b) => a + b, 0);

      let html = `<div class="page fade-in">`;

      html += `<div class="hub-hero">
        <div class="hub-hero-icon" style="background:linear-gradient(135deg,rgba(52,168,83,0.08),rgba(45,27,105,0.06));">
          <span class="material-symbols-outlined" style="font-size:36px;color:var(--success);">quiz</span>
        </div>
        <h2>מרכז הבחנים</h2>
        <p>בדוק את הידע שלך עם בחנים ליחידות הקורס. כל בוחן מכיל שאלות אמריקאיות עם הסברים.</p>
      </div>`;

      html += `<div class="hub-stats">
        <div class="hub-stat">
          <div class="hub-stat-value">${completedCount}/${units.length}</div>
          <div class="hub-stat-label">בחנים הושלמו</div>
        </div>
        <div class="hub-stat">
          <div class="hub-stat-value">${totalScore}</div>
          <div class="hub-stat-label">תשובות נכונות</div>
        </div>
        <div class="hub-stat">
          <div class="hub-stat-value">${units.length > 0 ? Math.round(completedCount / units.length * 100) : 0}%</div>
          <div class="hub-stat-label">התקדמות</div>
        </div>
      </div>`;

      // Scores table
      if (completedCount > 0) {
        html += `<div class="card card-static" style="margin-bottom:24px;overflow-x:auto;">
          <h4 style="font-family:var(--font-headline);font-size:16px;color:var(--brand-deep);margin-bottom:12px;">📊 טבלת ציונים</h4>
          <table class="data-table" style="direction:rtl;text-align:right;">
            <thead><tr><th>יחידה</th><th>ציון</th><th>שאלות</th><th>סטטוס</th></tr></thead>
            <tbody>`;
        for (const u of units) {
          const score = quizScores[String(u.id)];
          const status = score !== undefined ? (score >= u.quiz_count * 0.7 ? '🌟 מצוין' : '📚 לשפר') : '—';
          html += `<tr>
            <td>${u.icon} ${u.title}</td>
            <td>${score !== undefined ? score : '—'}</td>
            <td>${u.quiz_count}</td>
            <td>${status}</td>
          </tr>`;
        }
        html += `</tbody></table></div>`;
      }

      // Unit cards
      html += `<div class="unit-grid">`;
      for (const u of units) {
        const score = quizScores[String(u.id)];
        const hasDone = score !== undefined;
        html += `
          <div class="card hub-action-card" onclick="App.openUnit(${u.id},'quiz')">
            <div class="hub-action-icon" style="background:${u.color}15;border:1px solid ${u.color}30;">
              <span style="font-size:24px;">${u.icon}</span>
            </div>
            <div class="hub-action-info">
              <h4>${u.title}</h4>
              <p>${u.quiz_count} שאלות${hasDone ? ` • ציון: ${score}/${u.quiz_count}` : ''}</p>
            </div>
            ${hasDone ? '<span class="hub-action-badge" style="background:rgba(52,168,83,0.1);color:var(--success);">✅ הושלם</span>' : '<span class="hub-action-badge">✏️ להתחיל</span>'}
          </div>`;
      }
      html += `</div></div>`;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  _renderQuiz(container) {
    const unit = this.unitData;
    const quiz = unit.quiz || [];
    const allAnswered = quiz.every((_, i) => this.answers[i] !== undefined);

    let html = `<div class="page-narrow fade-in">`;
    html += `<div class="section-header">
      <button class="back-btn" onclick="App.navigate('quiz')">← חזרה</button>
      <h2>${unit.icon} בוחן - ${unit.title}</h2>
    </div>`;

    if (this.submitted && this.results) {
      const score = this.results.score, total = this.results.total;
      const pct = total > 0 ? Math.round(score / total * 100) : 0;
      const icon = score === total ? '🎉' : score >= total / 2 ? '👍' : '📚';
      html += `<div class="card quiz-result card-static" style="background:${score === total ? 'rgba(52,168,83,0.06)' : score >= total / 2 ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)'};margin-bottom:20px;">
        <div class="result-icon">${icon}</div>
        <div class="result-score">${score} / ${total} תשובות נכונות</div>
        <p style="font-size:14px;color:var(--text-secondary);margin-top:4px;">${pct}%</p>
        <button class="btn btn-primary" style="margin-top:12px;" onclick="QuizViewer.retry()">🔄 נסה שוב</button>
      </div>`;
    }

    for (let qi = 0; qi < quiz.length; qi++) {
      const q = quiz[qi];
      const userAnswer = this.answers[qi];
      const result = this.results?.results?.[qi];
      const isCorrect = result?.correct;
      const borderStyle = this.submitted ? (isCorrect ? 'border-color:var(--success)' : (userAnswer !== undefined ? 'border-color:var(--error)' : '')) : '';

      html += `<div class="card quiz-question card-static" style="${borderStyle};margin-bottom:14px;">
        <p class="q-text">${qi + 1}. ${q.question}</p>
        <div class="quiz-options">`;

      for (let oi = 0; oi < q.options.length; oi++) {
        let cls = 'quiz-option', pfx = '';
        if (this.submitted) {
          if (oi === q.correct) { cls += ' correct'; pfx = '✅ '; }
          else if (oi === userAnswer && oi !== q.correct) { cls += ' wrong'; pfx = '❌ '; }
        } else if (userAnswer === oi) cls += ' selected';

        html += `<button class="${cls}" ${this.submitted ? 'disabled' : ''} onclick="QuizViewer.selectAnswer(${qi},${oi})">${pfx}${q.options[oi]}</button>`;
      }
      html += `</div>`;

      if (this.submitted) {
        const exp = result?.explanation || q.explanation || q.explain || '';
        if (exp) html += `<div class="explanation ${isCorrect ? 'correct-exp' : 'wrong-exp'}">${isCorrect ? '✅ ' : '💡 '}${exp}</div>`;
      }
      html += `</div>`;
    }

    if (!this.submitted) {
      html += `<div style="text-align:center;padding:20px 0">
        <button class="btn btn-success" style="font-size:15px;padding:12px 32px" ${!allAnswered ? 'disabled' : ''} onclick="QuizViewer.submit()">📝 בדוק תשובות</button>
      </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  },

  selectAnswer(qi, oi) { if (!this.submitted) { this.answers[qi] = oi; this._renderQuiz(document.getElementById('app-content')); } },

  async submit() {
    if (this.submitted) return;
    try {
      this.results = await API.checkQuiz(this.unitId, this.answers);
      this.submitted = true;
      await API.updateProgress(this.unitId, 'quiz', { score: this.results.score });
      this._renderQuiz(document.getElementById('app-content'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { App.toast('שגיאה: ' + err.message, 'error'); }
  },

  retry() { this.answers = {}; this.submitted = false; this.results = null; this._renderQuiz(document.getElementById('app-content')); }
};
