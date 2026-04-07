/**
 * Dashboard Component - Premium Bento Layout
 * Hero course card, AI insights, performance, study plan
 */
window.Dashboard = {
  async render(container) {
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';

    try {
      const [unitsData, progress] = await Promise.all([
        API.getUnits(),
        API.getProgress()
      ]);

      const units = unitsData.units || [];
      const totalTasks = units.length * 3;
      let doneTasks = 0;

      units.forEach(u => {
        if ((progress.units_read || []).includes(u.id)) doneTasks++;
        if ((progress.flashcards_completed || []).includes(u.id)) doneTasks++;
        if ((progress.quiz_scores || {})[String(u.id)] !== undefined) doneTasks++;
      });

      const pct = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;

      // Find current unit (first incomplete)
      let currentUnit = units[0];
      for (const u of units) {
        const isRead = (progress.units_read || []).includes(u.id);
        if (!isRead) { currentUnit = u; break; }
      }

      // Recent quiz score
      const quizScores = progress.quiz_scores || {};
      const lastQuizUnit = Object.keys(quizScores).pop();
      const lastQuizScore = lastQuizUnit ? quizScores[lastQuizUnit] : null;
      const lastQuizUnitData = lastQuizUnit ? units.find(u => u.id === parseInt(lastQuizUnit)) : null;

      let html = `<div class="page fade-in">`;

      // ── Welcome Banner ──
      html += `
        <div style="margin-bottom: 36px;">
          <h2 style="font-family:var(--font-headline);font-size:3rem;color:var(--warm-peach);margin-bottom:8px;font-style:italic;">
            ברוך הבא! 👋
          </h2>
          <p style="color:var(--text-secondary);font-size:1.1rem;max-width:600px;line-height:1.7;">
            הושלמו <span style="color:var(--soft-purple);font-weight:700;">${doneTasks} מתוך ${totalTasks}</span> משימות.
            ${pct >= 80 ? 'את/ה מתקדם/ת מעולה! 🚀' : pct >= 40 ? 'ממשיכים ללמוד! 📚' : 'בואו נתחיל ללמוד! 💪'}
          </p>
        </div>`;

      // ── Bento Grid ──
      html += `<div style="display:grid;grid-template-columns:1.7fr 1fr;gap:20px;margin-bottom:36px;">`;

      // ── Hero Course Card ──
      const ringPct = Math.round(452.3 * (1 - pct / 100));
      html += `
        <div class="card card-static" style="position:relative;overflow:hidden;padding:36px;grid-row:span 2;">
          <div style="position:absolute;left:-40px;top:-40px;width:200px;height:200px;background:rgba(244,211,186,0.08);filter:blur(80px);border-radius:50%;"></div>

          <span style="display:inline-block;padding:6px 16px;background:rgba(244,211,186,0.1);color:var(--warm-peach);border-radius:var(--radius-pill);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:20px;border:1px solid rgba(244,211,186,0.2);font-family:var(--font-label);">
            קורס פעיל
          </span>

          <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;">
            <div style="flex:1;">
              <h3 style="font-family:var(--font-headline);font-size:2.4rem;color:var(--cream);margin-bottom:8px;line-height:1.25;">
                תכנון ועיצוב<br>מערכות מידע
              </h3>
              <p style="color:var(--soft-purple);font-weight:600;font-size:1rem;margin-bottom:28px;">
                קורס 10645 • ${units.length} יחידות
              </p>

              <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="App.openUnit(${currentUnit.id},'learn')" style="padding:14px 28px;font-size:15px;">
                  המשך ליחידה ${currentUnit.id}
                  <span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span>
                </button>
                <button class="btn btn-outline" onclick="App.navigate('exam')" style="padding:14px 24px;">
                  מבחן סימולציה
                </button>
              </div>
            </div>

            <div style="position:relative;width:140px;height:140px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
              <svg width="140" height="140" style="transform:rotate(-90deg);filter:drop-shadow(0 0 12px rgba(244,211,186,0.25));">
                <circle cx="70" cy="70" r="60" fill="transparent" stroke="rgba(253,252,240,0.06)" stroke-width="10"/>
                <circle cx="70" cy="70" r="60" fill="transparent" stroke="var(--warm-peach)" stroke-width="10"
                        stroke-dasharray="377" stroke-dashoffset="${Math.round(377 * (1 - pct / 100))}" stroke-linecap="round"/>
              </svg>
              <div style="position:absolute;display:flex;flex-direction:column;align-items:center;">
                <span style="font-size:2rem;font-weight:900;color:var(--cream);font-family:var(--font-headline);">${pct}%</span>
                <span style="font-size:10px;text-transform:uppercase;color:var(--soft-purple);font-weight:700;letter-spacing:0.12em;font-family:var(--font-label);">הושלם</span>
              </div>
            </div>
          </div>
        </div>`;

      // ── AI Insight Card ──
      html += `
        <div class="card card-static" style="background:var(--bg-card-2);border-color:rgba(142,125,173,0.2);padding:28px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(142,125,173,0.2);display:flex;align-items:center;justify-content:center;border:1px solid rgba(142,125,173,0.3);">
              <span class="material-symbols-outlined" style="color:var(--soft-purple);font-size:24px;">psychology</span>
            </div>
            <h4 style="font-family:var(--font-headline);font-size:1.2rem;color:var(--warm-peach);margin:0;">תובנת למידה AI</h4>
          </div>

          <div style="padding:16px;border-radius:var(--radius-sm);background:rgba(26,36,27,0.5);border:1px solid rgba(253,252,240,0.05);margin-bottom:16px;">
            <p style="font-size:14px;color:var(--text-primary);line-height:1.7;font-style:italic;">
              "${currentUnit ? `מומלץ להתמקד ביחידה ${currentUnit.id}: <b>${currentUnit.title}</b>. לחץ על "המשך ליחידה" כדי להתקדם.` : 'כל היחידות הושלמו! 🎉'}"
            </p>
          </div>

          <p style="font-size:11px;font-weight:700;color:var(--soft-purple);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:8px;font-family:var(--font-label);">פעולות מומלצות:</p>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;">
            <li style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);">
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--soft-purple);">check_circle</span>
              קרא סיכום יחידה ${currentUnit.id}
            </li>
            <li style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);">
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--soft-purple);">check_circle</span>
              תרגל כרטיסיות ובוחן
            </li>
          </ul>
        </div>`;

      // ── Recent Activity / Quick Stats ──
      html += `
        <div class="card card-static" style="padding:24px;display:flex;align-items:center;gap:18px;">
          <div style="width:52px;height:52px;border-radius:50%;background:rgba(253,252,240,0.05);display:flex;align-items:center;justify-content:center;border:1px solid rgba(253,252,240,0.08);">
            <span class="material-symbols-outlined" style="color:var(--warm-peach);font-size:24px;">verified</span>
          </div>
          <div style="flex:1;">
            ${lastQuizUnitData ?
              `<h5 style="font-size:15px;font-weight:700;color:var(--cream);margin:0 0 4px;">${lastQuizUnitData.title}</h5>
               <p style="font-size:13px;color:var(--warm-peach);font-weight:700;margin:0;">ציון אחרון: ${lastQuizScore}/${lastQuizUnitData.quiz_count}</p>` :
              `<h5 style="font-size:15px;font-weight:700;color:var(--cream);margin:0 0 4px;">אין פעילות אחרונה</h5>
               <p style="font-size:13px;color:var(--text-secondary);margin:0;">התחל בוחן כדי לראות תוצאות</p>`}
          </div>
          ${lastQuizUnitData ? `<span style="font-size:10px;font-weight:900;background:var(--warm-peach);color:var(--deep-olive);padding:4px 10px;border-radius:var(--radius-pill);font-family:var(--font-label);">בוחן אחרון</span>` : ''}
        </div>`;

      html += `</div>`; // close bento grid

      // ── Performance Strip ──
      html += `
        <div class="card card-static" style="padding:28px;margin-bottom:36px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h4 style="font-family:var(--font-headline);font-size:1.4rem;color:var(--warm-peach);margin:0;">
              <span class="material-symbols-outlined" style="vertical-align:middle;margin-left:6px;">insights</span>
              מצב התקדמות
            </h4>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;text-align:center;">
            <div>
              <p style="font-size:11px;font-weight:700;color:var(--soft-purple);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;font-family:var(--font-label);">יחידות שנקראו</p>
              <p style="font-size:2.4rem;font-family:var(--font-headline);color:var(--cream);">${(progress.units_read || []).length}/${units.length}</p>
            </div>
            <div style="border-right:1px solid rgba(253,252,240,0.06);border-left:1px solid rgba(253,252,240,0.06);">
              <p style="font-size:11px;font-weight:700;color:var(--soft-purple);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;font-family:var(--font-label);">בחנים שהושלמו</p>
              <p style="font-size:2.4rem;font-family:var(--font-headline);color:var(--cream);">${Object.keys(quizScores).length}/${units.length}</p>
            </div>
            <div>
              <p style="font-size:11px;font-weight:700;color:var(--soft-purple);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;font-family:var(--font-label);">התקדמות כוללת</p>
              <p style="font-size:2.4rem;font-family:var(--font-headline);color:var(--warm-peach);">${pct}%</p>
            </div>
          </div>
        </div>`;

      // ── Quick Actions Row ──
      html += `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:36px;">
          <div class="card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="App.navigate('sandbox')">
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="width:56px;height:56px;border-radius:1.2rem;background:rgba(244,211,186,0.08);display:flex;align-items:center;justify-content:center;border:1px solid rgba(244,211,186,0.15);">
                <span class="material-symbols-outlined" style="color:var(--warm-peach);font-size:28px;font-variation-settings:'FILL' 1;">draw</span>
              </div>
              <div>
                <h4 style="font-family:var(--font-headline);font-size:1.1rem;color:var(--cream);margin:0;">סטודיו ציור</h4>
                <p style="font-size:13px;color:var(--text-secondary);margin:0;">צייר תרשימים אקדמיים</p>
              </div>
            </div>
            <span class="material-symbols-outlined" style="color:var(--text-muted);">arrow_outward</span>
          </div>

          <div class="card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="App.navigate('calculator')">
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="width:56px;height:56px;border-radius:1.2rem;background:rgba(142,125,173,0.1);display:flex;align-items:center;justify-content:center;border:1px solid rgba(142,125,173,0.2);">
                <span class="material-symbols-outlined" style="color:var(--soft-purple);font-size:28px;font-variation-settings:'FILL' 1;">calculate</span>
              </div>
              <div>
                <h4 style="font-family:var(--font-headline);font-size:1.1rem;color:var(--cream);margin:0;">מחשבון ישימות</h4>
                <p style="font-size:13px;color:var(--text-secondary);margin:0;">נרמול ותוחלת תועלת</p>
              </div>
            </div>
            <span class="material-symbols-outlined" style="color:var(--text-muted);">arrow_outward</span>
          </div>
        </div>`;

      // ── Unit Grid ──
      html += `
        <h3 style="font-family:var(--font-headline);font-size:1.5rem;color:var(--warm-peach);margin-bottom:20px;font-style:italic;">
          <span class="material-symbols-outlined" style="vertical-align:middle;margin-left:8px;">school</span>
          יחידות הקורס
        </h3>
        <div class="unit-grid">`;

      for (const u of units) {
        const isRead = (progress.units_read || []).includes(u.id);
        const isCards = (progress.flashcards_completed || []).includes(u.id);
        const quizScore = quizScores[String(u.id)];
        const unitDone = (isRead ? 1 : 0) + (isCards ? 1 : 0) + (quizScore !== undefined ? 1 : 0);
        const barOpacity = unitDone > 0 ? 1 : 0.3;

        html += `
          <div class="card unit-card">
            <div class="color-bar" style="background:${u.color};opacity:${barOpacity}"></div>
            <div class="unit-icon">${u.icon}</div>
            <div class="unit-title">${HEB.unit} ${u.id}: ${u.title}</div>
            <div class="unit-subtitle">${u.topic_count} נושאים • ${u.flashcard_count} כרטיסיות • ${u.quiz_count} שאלות</div>
            <div class="progress-bar" style="margin-bottom:6px;">
              <div class="progress-fill" style="width:${Math.round(unitDone/3*100)}%;background:${u.color}"></div>
            </div>
            <div class="unit-actions">
              <button class="btn btn-outline btn-sm" onclick="App.openUnit(${u.id},'learn')">
                ${isRead ? '✅' : '📖'} למידה
              </button>
              <button class="btn btn-outline btn-sm" onclick="App.openUnit(${u.id},'cards')">
                ${isCards ? '✅' : '🃏'} כרטיסיות
              </button>
              <button class="btn btn-outline btn-sm" onclick="App.openUnit(${u.id},'quiz')">
                ${quizScore !== undefined ? '✅ ' + quizScore + '/' + u.quiz_count : '✏️ בוחן'}
              </button>
            </div>
          </div>`;
      }

      html += `</div></div>`;
      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="text-align:center;color:#fca5a5">
        <p>שגיאה בטעינת הנתונים</p><p style="font-size:13px">${err.message}</p>
        <button class="btn btn-primary" style="margin-top:12px" onclick="Dashboard.render(document.getElementById('app-content'))">נסה שוב</button>
      </div></div>`;
    }
  }
};
