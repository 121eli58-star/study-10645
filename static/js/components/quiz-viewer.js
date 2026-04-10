/**
 * Quiz Viewer — Hub + Quiz
 * Targeted DOM updates (no full re-render on select) + staggered reveal on submit.
 */
window.QuizViewer = {
  unitId: null,
  unitData: null,
  answers: {},
  submitted: false,
  results: null,
  _filterIndices: null,   // null = all questions; array = retry subset

  // DOM references cached after initial render
  _container: null,
  _questionsWrap: null,
  _progressWrap: null,
  _answeredEl: null,
  _progressFillEl: null,
  _submitBtn: null,
  _submitWrap: null,
  _resultCard: null,

  async render(container, unitId, filterIndices) {
    if (!unitId) { this._renderHub(container); return; }
    this._renderSkeleton(container);
    try {
      const unit = await API.getUnit(unitId);
      this.unitId = unitId;
      this.unitData = unit;
      this.answers = {};
      this.submitted = false;
      this.results = null;
      this._filterIndices = filterIndices || null;
      this._renderQuiz(container);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  /** Quiz skeleton */
  _renderSkeleton(container) {
    container.innerHTML = `<div class="page-narrow fade-in">
      <div class="skeleton skeleton-text med" style="margin:0 auto 12px;"></div>
      <div class="skeleton skeleton-text short" style="margin:0 auto 20px;"></div>
      <div class="skeleton" style="height:6px;margin-bottom:20px;border-radius:999px;"></div>
      ${Array.from({length:5}).map(()=>'<div class="skeleton" style="height:170px;border-radius:var(--radius-xl);margin-bottom:14px;"></div>').join('')}
    </div>`;
  },

  /** Hub skeleton */
  _renderHubSkeleton(container) {
    container.innerHTML = `<div class="page fade-in">
      <div class="skeleton" style="height:150px;border-radius:var(--radius-xl);margin-bottom:24px;"></div>
      <div class="hub-stats" style="margin-bottom:24px;">
        <div class="skeleton" style="height:86px;border-radius:var(--radius-lg);"></div>
        <div class="skeleton" style="height:86px;border-radius:var(--radius-lg);"></div>
        <div class="skeleton" style="height:86px;border-radius:var(--radius-lg);"></div>
      </div>
      <div class="unit-grid">
        ${Array.from({length:6}).map(()=>'<div class="skeleton skeleton-card"></div>').join('')}
      </div>
    </div>`;
  },

  /** Hub page */
  async _renderHub(container) {
    this._renderHubSkeleton(container);
    try {
      const progress = API.getProgressSync();
      const unitsData = await API.getUnits();
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
        const mistakes = API.getQuizMistakes(u.id);
        const mistakeCount = mistakes.length;
        const mistakeLabel = mistakeCount > 0
          ? `<span style="color:#f59e0b;font-weight:600"> • ${mistakeCount} לשיפור</span>`
          : '';
        html += `
          <div class="card hub-action-card" onclick="App.openUnit(${u.id},'quiz')">
            <div class="hub-action-icon" style="background:${u.color}15;border:1px solid ${u.color}30;">
              <span style="font-size:24px;">${u.icon}</span>
            </div>
            <div class="hub-action-info">
              <h4>${u.title}</h4>
              <p>${u.quiz_count} שאלות${hasDone ? ` • ציון: ${score}/${u.quiz_count}` : ''}${mistakeLabel}</p>
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

  /** Initial quiz render with pre-wired refs for targeted updates */
  _renderQuiz(container) {
    this._container = container;
    const unit = this.unitData;
    const allQuiz = unit.quiz || [];

    // Apply filter (retry-mistakes mode) or use all questions
    const isRetryMode = Array.isArray(this._filterIndices);
    const questionIndices = isRetryMode
      ? this._filterIndices
      : allQuiz.map((_, i) => i);
    const quiz = questionIndices.map(i => ({ ...allQuiz[i], _origIndex: i }));
    const total = quiz.length;

    const retryLabel = isRetryMode ? ' — חזרה על טעויות' : '';

    let html = `<div class="page-narrow fade-in">
      <div class="section-header">
        <button class="back-btn" onclick="App.navigate('quiz')">← חזרה</button>
        <h2>${unit.icon} בוחן - ${unit.title}${retryLabel}</h2>
      </div>

      <div class="quiz-progress" data-quiz-progress>
        <div class="quiz-progress-label">
          ענית על <span data-quiz-answered>0</span> מתוך <span data-quiz-total>${total}</span> שאלות
        </div>
        <div class="progress-bar">
          <div class="progress-fill" data-quiz-progress-fill style="width:0%"></div>
        </div>
      </div>

      <div class="card quiz-result card-static" data-quiz-result style="display:none;margin-bottom:20px;"></div>

      <div data-quiz-questions>`;

    for (let qi = 0; qi < total; qi++) {
      const q = quiz[qi];
      const mistakeCount = API.getQuizMistakes(this.unitId).find(m => m.index === q._origIndex)?.count || 0;
      const mistakeBadge = mistakeCount > 0
        ? `<span style="float:left;font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.08);padding:2px 8px;border-radius:999px;margin-top:-2px;">⚠️ ${mistakeCount}× שגיאה</span>`
        : '';
      html += `<div class="card quiz-question card-static" data-q="${qi}" data-orig="${q._origIndex}" style="margin-bottom:14px;">
        <p class="q-text">${qi + 1}. ${q.question}${mistakeBadge}</p>
        <div class="quiz-options">`;
      for (let oi = 0; oi < q.options.length; oi++) {
        html += `<button class="quiz-option" data-q="${qi}" data-o="${oi}" onclick="QuizViewer.selectAnswer(${qi},${oi})"><span class="quiz-option-prefix" data-prefix></span>${q.options[oi]}</button>`;
      }
      html += `</div>
        <div class="explanation" data-explanation style="display:none"></div>
      </div>`;
    }

    html += `</div>
      <div data-quiz-submit-wrap style="text-align:center;padding:20px 0;">
        <button class="btn btn-success" data-quiz-submit disabled style="font-size:15px;padding:12px 32px" onclick="QuizViewer.submit()">📝 בדוק תשובות</button>
      </div>
    </div>`;

    // Store question mapping for submit
    this._quizQuestions = quiz;
    container.innerHTML = html;

    // Cache references
    this._questionsWrap = container.querySelector('[data-quiz-questions]');
    this._progressWrap = container.querySelector('[data-quiz-progress]');
    this._answeredEl = container.querySelector('[data-quiz-answered]');
    this._progressFillEl = container.querySelector('[data-quiz-progress-fill]');
    this._submitBtn = container.querySelector('[data-quiz-submit]');
    this._submitWrap = container.querySelector('[data-quiz-submit-wrap]');
    this._resultCard = container.querySelector('[data-quiz-result]');
  },

  /** Targeted select — only toggles class + updates progress indicator */
  selectAnswer(qi, oi) {
    if (this.submitted) return;
    this.answers[qi] = oi;
    const qEl = this._questionsWrap?.querySelector(`.quiz-question[data-q="${qi}"]`);
    if (qEl) {
      qEl.querySelectorAll('.quiz-option').forEach(btn => btn.classList.remove('selected'));
      const chosen = qEl.querySelector(`.quiz-option[data-o="${oi}"]`);
      if (chosen) chosen.classList.add('selected');
    }
    this._updateProgressIndicator();
  },

  _updateProgressIndicator() {
    const quiz = this.unitData.quiz || [];
    const answered = Object.keys(this.answers).length;
    const total = quiz.length;
    const pct = total > 0 ? Math.round(answered / total * 100) : 0;
    if (this._answeredEl) this._answeredEl.textContent = answered;
    if (this._progressFillEl) this._progressFillEl.style.width = `${pct}%`;
    if (this._submitBtn) this._submitBtn.disabled = answered < total;
  },

  async submit() {
    if (this.submitted) return;
    if (!this._submitBtn || this._submitBtn.disabled) return;
    try {
      this._submitBtn.disabled = true;

      // Build answers keyed by original question IDs for API.checkQuiz
      const quiz = this._quizQuestions || (this.unitData.quiz || []).map((q, i) => ({ ...q, _origIndex: i }));
      const apiAnswers = {};
      for (const [qi, oi] of Object.entries(this.answers)) {
        const q = quiz[parseInt(qi)];
        if (q) apiAnswers[q.id !== undefined ? q.id : q._origIndex] = oi;
      }

      // Check against full unit quiz (pass original answers)
      this.results = await API.checkQuiz(this.unitId, apiAnswers);
      this.submitted = true;

      // Track mistakes: find wrong origIndex values
      const wrongIndices = [];
      quiz.forEach((q, qi) => {
        const result = this.results.results.find(r => r.question_id === (q.id !== undefined ? q.id : q._origIndex));
        if (result && !result.correct) wrongIndices.push(q._origIndex);
      });

      await Promise.all([
        API.updateProgress(this.unitId, 'quiz', { score: this.results.score }),
        API.recordQuizMistakes(this.unitId, wrongIndices)
      ]);

      this._wrongIndicesForRetry = wrongIndices;
      this._applyResultsStaggered();
    } catch (err) {
      App.toast('שגיאה: ' + err.message, 'error');
      if (this._submitBtn) this._submitBtn.disabled = false;
    }
  },

  /** Reveal correct/wrong with a staggered delay per question */
  _applyResultsStaggered() {
    const quiz = this._quizQuestions || (this.unitData.quiz || []).map((q, i) => ({ ...q, _origIndex: i }));
    const score = this.results.score;
    const total = this.results.total;
    const pct = total > 0 ? Math.round(score / total * 100) : 0;
    const icon = score === total ? '🎉' : score >= total / 2 ? '👍' : '📚';
    const bg = score === total
      ? 'rgba(52,168,83,0.06)'
      : score >= total / 2
        ? 'rgba(245,158,11,0.06)'
        : 'rgba(239,68,68,0.06)';
    const wrongCount = (this._wrongIndicesForRetry || []).length;

    if (this._progressWrap) this._progressWrap.style.display = 'none';
    if (this._submitWrap) this._submitWrap.style.display = 'none';

    if (this._resultCard) {
      this._resultCard.style.background = bg;
      this._resultCard.innerHTML = `
        <div class="result-icon">${icon}</div>
        <div class="result-score">${score} / ${total} תשובות נכונות</div>
        <p style="font-size:14px;color:var(--text-secondary);margin-top:4px;">${pct}%</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px;">
          <button class="btn btn-primary" onclick="QuizViewer.retry()">🔄 נסה שוב</button>
          ${wrongCount > 0 ? `<button class="btn btn-outline" style="border-color:#f59e0b;color:#f59e0b;" onclick="QuizViewer.retryMistakes()">⚠️ חזור על ${wrongCount} טעויות</button>` : ''}
        </div>
      `;
      this._resultCard.style.display = 'block';
      this._resultCard.classList.add('reveal-in');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Staggered reveal of each question result
    for (let qi = 0; qi < quiz.length; qi++) {
      const q = quiz[qi];
      const origId = q.id !== undefined ? q.id : q._origIndex;
      const result = this.results.results.find(r => r.question_id === origId) || this.results.results[qi];
      const userAnswer = this.answers[qi];
      const qEl = this._questionsWrap?.querySelector(`.quiz-question[data-q="${qi}"]`);
      if (!qEl) continue;

      setTimeout(() => {
        if (result?.correct) {
          qEl.classList.add('result-correct');
        } else if (userAnswer !== undefined) {
          qEl.classList.add('result-wrong');
        }
        qEl.querySelectorAll('.quiz-option').forEach(btn => {
          const oi = parseInt(btn.dataset.o);
          btn.disabled = true;
          btn.classList.remove('selected');
          const prefixEl = btn.querySelector('[data-prefix]');
          if (oi === q.correct) {
            btn.classList.add('correct');
            if (prefixEl) prefixEl.textContent = '✅ ';
          } else if (oi === userAnswer && oi !== q.correct) {
            btn.classList.add('wrong');
            if (prefixEl) prefixEl.textContent = '❌ ';
          }
        });
        const expEl = qEl.querySelector('[data-explanation]');
        if (expEl) {
          const exp = (result && result.explanation) || q.explanation || q.explain || '';
          if (exp) {
            expEl.className = 'explanation ' + ((result?.correct) ? 'correct-exp' : 'wrong-exp') + ' reveal-in';
            expEl.innerHTML = ((result?.correct) ? '✅ ' : '💡 ') + exp;
            expEl.style.display = 'block';
          }
        }
        qEl.classList.add('reveal-in');
      }, qi * 90);
    }
  },

  /** Full retry — reset all answers */
  retry() {
    this.answers = {};
    this.submitted = false;
    this.results = null;
    this._filterIndices = null;
    this._wrongIndicesForRetry = null;
    this._renderQuiz(document.getElementById('app-content'));
  },

  /** Retry only the wrong questions */
  retryMistakes() {
    const wrong = this._wrongIndicesForRetry || [];
    if (wrong.length === 0) return;
    this.answers = {};
    this.submitted = false;
    this.results = null;
    this._wrongIndicesForRetry = null;
    this._filterIndices = wrong;
    this._renderQuiz(document.getElementById('app-content'));
  }
};
