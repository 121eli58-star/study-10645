/**
 * Quiz Viewer Component - Multiple choice quiz per unit
 */
window.QuizViewer = {
  unitId: null,
  unitData: null,
  answers: {},
  submitted: false,
  results: null,

  async render(container, unitId) {
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';

    if (!unitId) {
      container.innerHTML = `<div class="page" style="text-align:center;padding-top:80px">
        <p style="font-size:48px;margin-bottom:16px">👆</p>
        <p style="color:#94a3b8">${HEB.select_unit}</p>
        <button class="btn btn-primary" style="margin-top:12px" onclick="App.navigate('dashboard')">${HEB.go_home}</button>
      </div>`;
      return;
    }

    try {
      const unit = await API.getUnit(unitId);
      this.unitId = unitId;
      this.unitData = unit;
      this.answers = {};
      this.submitted = false;
      this.results = null;
      this._renderQuiz(container);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:#fca5a5;text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  _renderQuiz(container) {
    const unit = this.unitData;
    const quiz = unit.quiz || [];
    const color = unit.color || '#2563eb';
    const allAnswered = quiz.every((_, i) => this.answers[i] !== undefined);

    let html = `<div class="page-narrow fade-in" style="--unit-color:${color}">`;

    // Header
    html += `<div class="section-header">
      <button class="back-btn" onclick="App.navigate('dashboard')">${HEB.back}</button>
      <h2>${unit.icon} בוחן - ${unit.title}</h2>
    </div>`;

    // Results banner
    if (this.submitted && this.results) {
      const score = this.results.score;
      const total = this.results.total;
      const pct = this.results.percentage;
      const icon = score === total ? '🎉' : score >= total / 2 ? '👍' : '📚';
      const bgColor = score === total ? 'rgba(34,197,94,0.15)' : score >= total / 2 ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)';

      html += `<div class="card quiz-result" style="background:${bgColor};margin-bottom:20px">
        <div class="result-icon">${icon}</div>
        <div class="result-score">${score} / ${total} ${HEB.correct_answers}</div>
        <p style="font-size:14px;color:#94a3b8;margin-top:4px">${pct}%</p>
        <button class="btn btn-primary" style="margin-top:12px;background:${color}" onclick="QuizViewer.retry()">${HEB.try_again}</button>
      </div>`;
    }

    // Questions
    for (let qi = 0; qi < quiz.length; qi++) {
      const q = quiz[qi];
      const userAnswer = this.answers[qi];
      const result = this.results?.results?.[qi];
      const isCorrect = result?.correct;
      const borderColor = this.submitted ? (isCorrect ? '#22c55e' : (userAnswer !== undefined ? '#ef4444' : 'rgba(148,163,184,0.15)')) : 'rgba(148,163,184,0.15)';

      html += `<div class="card quiz-question" style="border-color:${borderColor};margin-bottom:16px">
        <p class="q-text">${qi + 1}. ${q.question}</p>
        <div class="quiz-options">`;

      for (let oi = 0; oi < q.options.length; oi++) {
        let classes = 'quiz-option';
        let prefix = '';

        if (this.submitted) {
          if (oi === q.correct) {
            classes += ' correct';
            prefix = '✅ ';
          } else if (oi === userAnswer && oi !== q.correct) {
            classes += ' wrong';
            prefix = '❌ ';
          }
        } else if (userAnswer === oi) {
          classes += ' selected';
        }

        const disabled = this.submitted ? 'disabled' : '';

        html += `<button class="${classes}" ${disabled} onclick="QuizViewer.selectAnswer(${qi}, ${oi})">${prefix}${q.options[oi]}</button>`;
      }

      html += `</div>`;

      // Explanation
      if (this.submitted) {
        const explanation = result?.explanation || q.explanation || q.explain || '';
        if (explanation) {
          const expClass = isCorrect ? 'correct-exp' : 'wrong-exp';
          const expIcon = isCorrect ? '✅ ' : '💡 ';
          html += `<div class="explanation ${expClass}">${expIcon}${explanation}</div>`;
        }
      }

      html += `</div>`;
    }

    // Submit button
    if (!this.submitted) {
      html += `<div style="text-align:center;padding:20px 0">
        <button class="btn btn-success" style="font-size:16px;padding:12px 32px" ${!allAnswered ? 'disabled' : ''} onclick="QuizViewer.submit()">${HEB.check_answers}</button>
      </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  },

  selectAnswer(qi, oi) {
    if (this.submitted) return;
    this.answers[qi] = oi;
    this._renderQuiz(document.getElementById('app-content'));
  },

  async submit() {
    if (this.submitted) return;

    const answersMap = {};
    Object.keys(this.answers).forEach(k => {
      answersMap[String(k)] = this.answers[k];
    });

    try {
      this.results = await API.checkQuiz(this.unitId, answersMap);
      this.submitted = true;

      // Save progress
      await API.updateProgress(this.unitId, 'quiz', { score: this.results.score });

      this._renderQuiz(document.getElementById('app-content'));

      // Scroll to top to see results
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      App.toast('שגיאה בבדיקת התשובות: ' + err.message, 'error');
    }
  },

  retry() {
    this.answers = {};
    this.submitted = false;
    this.results = null;
    this._renderQuiz(document.getElementById('app-content'));
  }
};
