/**
 * Exam Viewer Component - Full exam simulation with timer
 */
window.ExamViewer = {
  examData: null,
  answers: {},
  submitted: false,
  results: null,
  timerInterval: null,
  secondsRemaining: 0,
  startTime: null,

  async render(container) {
    if (this.examData && !this.submitted) {
      // Exam in progress
      this._renderExam(container);
      return;
    }

    // Show exam setup
    let html = `<div class="page fade-in">
      <div class="section-header">
        <h2>📝 מבחן סימולציה</h2>
      </div>
      <div class="card" style="max-width:600px;margin:0 auto">
        <h3 style="margin-bottom:16px">הגדרות מבחן</h3>

        <div class="calc-input-group">
          <label>${HEB.num_questions}</label>
          <select id="exam-num">
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20" selected>20</option>
            <option value="30">30</option>
          </select>
        </div>

        <div style="margin:16px 0">
          <label style="display:block;margin-bottom:8px;color:#94a3b8">${HEB.select_units}</label>
          <div id="exam-units" style="display:flex;flex-wrap:wrap;gap:8px">
            <label style="display:flex;align-items:center;gap:6px;color:#e2e8f0;font-size:14px">
              <input type="checkbox" value="all" checked onchange="ExamViewer.toggleAll(this)"> ${HEB.all_units}
            </label>
          </div>
        </div>

        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:16px" onclick="ExamViewer.generate()">
          ${HEB.generate_exam}
        </button>
      </div>
    </div>`;

    container.innerHTML = html;

    // Load unit list for checkboxes
    try {
      const data = await API.getUnits();
      const unitsDiv = document.getElementById('exam-units');
      for (const u of (data.units || [])) {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:6px;color:#e2e8f0;font-size:14px';
        label.innerHTML = `<input type="checkbox" value="${u.id}" class="unit-cb" checked> ${u.icon} ${u.title}`;
        unitsDiv.appendChild(label);
      }
    } catch (e) {}
  },

  toggleAll(cb) {
    document.querySelectorAll('.unit-cb').forEach(c => c.checked = cb.checked);
  },

  async generate() {
    const num = parseInt(document.getElementById('exam-num').value);
    const allChecked = document.querySelector('input[value="all"]')?.checked;
    let units = [];

    if (!allChecked) {
      document.querySelectorAll('.unit-cb:checked').forEach(c => {
        units.push(parseInt(c.value));
      });
    }

    try {
      const container = document.getElementById('app-content');
      container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>מכין מבחן...</p></div>';

      this.examData = await API.generateExam(num, units);
      this.answers = {};
      this.submitted = false;
      this.results = null;
      this.startTime = Date.now();
      this.secondsRemaining = (this.examData.time_minutes || 60) * 60;

      this._startTimer();
      this._renderExam(container);

    } catch (err) {
      App.toast('שגיאה ביצירת המבחן: ' + err.message, 'error');
    }
  },

  _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      this.secondsRemaining--;
      if (this.secondsRemaining <= 0) {
        this._stopTimer();
        this.submitExam();
        return;
      }
      const timerEl = document.getElementById('exam-timer');
      if (timerEl) {
        const m = Math.floor(this.secondsRemaining / 60);
        const s = this.secondsRemaining % 60;
        timerEl.textContent = `⏱️ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        timerEl.className = 'exam-timer' + (this.secondsRemaining < 300 ? ' danger' : this.secondsRemaining < 600 ? ' warning' : '');
      }
    }, 1000);
  },

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  _renderExam(container) {
    const questions = this.examData.questions || [];
    const allAnswered = questions.every(q => this.answers[q.id] !== undefined);

    let html = `<div id="exam-timer" class="exam-timer">⏱️ --:--</div>`;
    html += `<div class="page-narrow fade-in">`;

    html += `<div class="section-header">
      <h2>📝 מבחן (${questions.length} שאלות)</h2>
    </div>`;

    // Results
    if (this.submitted && this.results) {
      const { score, total, percentage, per_unit, feedback } = this.results;
      const icon = percentage >= 85 ? '🎉' : percentage >= 55 ? '👍' : '📚';

      html += `<div class="card quiz-result" style="margin-bottom:24px;background:${percentage >= 55 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}">
        <div class="result-icon">${icon}</div>
        <div class="result-score">${score} / ${total} (${percentage}%)</div>
        <div style="margin-top:16px;text-align:right">
          <p style="font-weight:600;margin-bottom:8px">${HEB.per_unit}</p>`;

      for (const [uid, data] of Object.entries(per_unit || {})) {
        html += `<p style="font-size:13px;color:#94a3b8">• ${data.title || 'יחידה ' + uid}: ${data.correct}/${data.total}</p>`;
      }

      html += `</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="ExamViewer.reset()">מבחן חדש</button>
      </div>`;
    }

    // Questions
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const userAnswer = this.answers[q.id];
      const fb = this.results?.feedback?.[qi];

      let borderColor = 'rgba(148,163,184,0.15)';
      if (this.submitted && fb) {
        borderColor = fb.correct ? '#22c55e' : '#ef4444';
      }

      html += `<div class="card quiz-question" style="border-color:${borderColor};margin-bottom:16px">
        <p class="q-text">${qi + 1}. ${q.question}</p>
        <div class="quiz-options">`;

      for (let oi = 0; oi < q.options.length; oi++) {
        let classes = 'quiz-option';
        let prefix = '';

        if (this.submitted && fb) {
          if (oi === fb.correct_answer) { classes += ' correct'; prefix = '✅ '; }
          else if (oi === userAnswer && !fb.correct) { classes += ' wrong'; prefix = '❌ '; }
        } else if (userAnswer === oi) {
          classes += ' selected';
        }

        const disabled = this.submitted ? 'disabled' : '';
        html += `<button class="${classes}" ${disabled} onclick="ExamViewer.answer('${q.id}', ${oi})">${prefix}${q.options[oi]}</button>`;
      }

      html += `</div>`;

      if (this.submitted && fb?.explanation) {
        const expClass = fb.correct ? 'correct-exp' : 'wrong-exp';
        html += `<div class="explanation ${expClass}">${fb.correct ? '✅' : '💡'} ${fb.explanation}</div>`;
      }

      html += `</div>`;
    }

    // Submit
    if (!this.submitted) {
      html += `<div style="text-align:center;padding:20px 0">
        <button class="btn btn-success" style="font-size:16px;padding:12px 32px" ${!allAnswered ? 'disabled' : ''} onclick="ExamViewer.submitExam()">${HEB.submit_exam}</button>
        <p style="font-size:12px;color:#64748b;margin-top:8px">יש לענות על כל השאלות</p>
      </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Update timer immediately
    if (!this.submitted) {
      const timerEl = document.getElementById('exam-timer');
      if (timerEl) {
        const m = Math.floor(this.secondsRemaining / 60);
        const s = this.secondsRemaining % 60;
        timerEl.textContent = `⏱️ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
    }
  },

  answer(qid, oi) {
    if (this.submitted) return;
    this.answers[qid] = oi;
    this._renderExam(document.getElementById('app-content'));
  },

  async submitExam() {
    this._stopTimer();
    const timeTaken = Math.floor((Date.now() - this.startTime) / 1000);

    try {
      this.results = await API.submitExam(this.examData.exam_id, this.answers, timeTaken);
      this.submitted = true;
      this._renderExam(document.getElementById('app-content'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      App.toast('שגיאה בהגשת המבחן: ' + err.message, 'error');
    }
  },

  reset() {
    this._stopTimer();
    this.examData = null;
    this.answers = {};
    this.submitted = false;
    this.results = null;
    this.render(document.getElementById('app-content'));
  }
};
