/**
 * Dashboard Component — Lumina Academic (Multi-course)
 */
window.Dashboard = {
  async render(container) {
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
    try {
      const course = API.getCurrentCourse();
      const [unitsData, progress] = await Promise.all([API.getUnits(), API.getProgress()]);
      const units = unitsData.units || [];
      const features = course?.features || [];
      const totalTasks = units.length * 3;
      let doneTasks = 0;
      units.forEach(u => {
        if ((progress.units_read||[]).includes(u.id)) doneTasks++;
        if ((progress.flashcards_completed||[]).includes(u.id)) doneTasks++;
        if ((progress.quiz_scores||{})[String(u.id)] !== undefined) doneTasks++;
      });
      const pct = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;

      let currentUnit = units[0];
      for (const u of units) {
        if (!(progress.units_read||[]).includes(u.id)) { currentUnit = u; break; }
      }

      const quizScores = progress.quiz_scores || {};
      const lastQuizUnit = Object.keys(quizScores).pop();
      const lastQuizScore = lastQuizUnit ? quizScores[lastQuizUnit] : null;
      const lastQuizUnitData = lastQuizUnit ? units.find(u => u.id === parseInt(lastQuizUnit)) : null;

      const userName = Auth?.currentUser?.displayName || Auth?.currentUser?.email?.split('@')[0] || 'סטודנט';

      // Update header course label
      const headerLabel = document.getElementById('header-course-label');
      if (headerLabel && course) headerLabel.textContent = `קורס ${course.id}`;

      let html = `<div class="page fade-in">`;

      // Welcome
      html += `<div style="margin-bottom:32px;">
        <h2 style="font-family:var(--font-headline);font-size:2.2rem;color:var(--brand-deep);margin-bottom:6px;font-weight:800;">
          ברוך הבא, ${userName} 👋
        </h2>
        <p style="color:var(--text-secondary);font-size:1rem;max-width:600px;line-height:1.7;">
          הושלמו <span style="color:var(--brand-blue);font-weight:700;">${doneTasks} מתוך ${totalTasks}</span> משימות.
          ${pct >= 80 ? 'את/ה מתקדם/ת מעולה! 🚀' : pct >= 40 ? 'ממשיכים ללמוד! 📚' : 'בואו נתחיל ללמוד! 💪'}
        </p>
      </div>`;

      // Bento Grid
      html += `<div style="display:grid;grid-template-columns:1.7fr 1fr;gap:16px;margin-bottom:28px;">`;

      // Hero Course Card
      html += `
        <div class="card card-static" style="position:relative;overflow:hidden;padding:32px;grid-row:span 2;">
          <span style="display:inline-block;padding:5px 14px;background:${course?.color || '#3b82f6'}15;color:${course?.color || '#3b82f6'};border-radius:var(--radius-pill);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:16px;border:1px solid ${course?.color || '#3b82f6'}30;">
            קורס פעיל
          </span>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;">
              <h3 style="font-family:var(--font-headline);font-size:2rem;color:var(--brand-deep);margin-bottom:8px;line-height:1.25;font-weight:800;">
                ${course?.icon || ''} ${course?.title || 'קורס'}
              </h3>
              <p style="color:${course?.color || '#3b82f6'};font-weight:600;font-size:0.95rem;margin-bottom:24px;">
                קורס ${course?.id || ''} • ${units.length} יחידות
              </p>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="App.openUnit(${currentUnit.id},'learn')" style="padding:12px 24px;">
                  המשך ליחידה ${currentUnit.id}
                  <span class="material-symbols-outlined" style="font-size:16px;">arrow_back</span>
                </button>
                <button class="btn btn-outline" onclick="App.navigate('exam')">מבחן סימולציה</button>
              </div>
            </div>
            <div style="position:relative;width:120px;height:120px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
              <svg width="120" height="120" style="transform:rotate(-90deg);filter:drop-shadow(0 0 8px ${course?.color || '#3b82f6'}33);">
                <circle cx="60" cy="60" r="52" fill="transparent" stroke="rgba(45,27,105,0.06)" stroke-width="8"/>
                <circle cx="60" cy="60" r="52" fill="transparent" stroke="${course?.color || 'var(--brand-blue)'}" stroke-width="8"
                        stroke-dasharray="327" stroke-dashoffset="${Math.round(327*(1-pct/100))}" stroke-linecap="round"/>
              </svg>
              <div style="position:absolute;display:flex;flex-direction:column;align-items:center;">
                <span style="font-size:1.8rem;font-weight:800;color:var(--brand-deep);font-family:var(--font-headline);">${pct}%</span>
                <span style="font-size:9px;text-transform:uppercase;color:var(--text-secondary);font-weight:700;letter-spacing:0.1em;">הושלם</span>
              </div>
            </div>
          </div>
        </div>`;

      // AI Insight
      html += `
        <div class="card card-static" style="padding:24px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="width:40px;height:40px;border-radius:12px;background:rgba(59,130,246,0.08);display:flex;align-items:center;justify-content:center;">
              <span class="material-symbols-outlined" style="color:var(--brand-blue);font-size:20px;">psychology</span>
            </div>
            <h4 style="font-family:var(--font-headline);font-size:1.1rem;color:var(--brand-deep);margin:0;font-weight:700;">תובנת למידה AI</h4>
          </div>
          <div style="padding:12px 14px;border-radius:var(--radius-sm);background:rgba(45,27,105,0.03);margin-bottom:12px;">
            <p style="font-size:13px;color:var(--text-primary);line-height:1.7;font-style:italic;">
              "${currentUnit ? `מומלץ להתמקד ביחידה ${currentUnit.id}: <b>${currentUnit.title}</b>` : 'כל היחידות הושלמו! 🎉'}"
            </p>
          </div>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px;">
            <li style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);">
              <span class="material-symbols-outlined" style="font-size:16px;color:${course?.color || 'var(--brand-blue)'};">check_circle</span>
              קרא סיכום יחידה ${currentUnit.id}
            </li>
            <li style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);">
              <span class="material-symbols-outlined" style="font-size:16px;color:${course?.color || 'var(--brand-blue)'};">check_circle</span>
              תרגל כרטיסיות ובוחן
            </li>
          </ul>
        </div>`;

      // Recent Activity
      html += `
        <div class="card card-static" style="padding:20px;display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:12px;background:rgba(45,27,105,0.04);display:flex;align-items:center;justify-content:center;">
            <span class="material-symbols-outlined" style="color:var(--brand-deep);font-size:22px;">verified</span>
          </div>
          <div style="flex:1;">
            ${lastQuizUnitData ?
              `<h5 style="font-size:14px;font-weight:700;color:var(--brand-deep);margin:0 0 2px;">${lastQuizUnitData.title}</h5>
               <p style="font-size:12px;color:${course?.color || 'var(--brand-blue)'};font-weight:600;margin:0;">ציון: ${lastQuizScore}/${lastQuizUnitData.quiz_count}</p>` :
              `<h5 style="font-size:14px;font-weight:700;color:var(--brand-deep);margin:0 0 2px;">אין פעילות אחרונה</h5>
               <p style="font-size:12px;color:var(--text-secondary);margin:0;">התחל בוחן כדי לראות תוצאות</p>`}
          </div>
          ${lastQuizUnitData ? '<span class="hub-action-badge">בוחן אחרון</span>' : ''}
        </div>`;

      html += `</div>`; // close bento

      // Progress strip
      html += `
        <div class="card card-static" style="padding:24px;margin-bottom:28px;">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center;">
            <div>
              <p style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">יחידות שנקראו</p>
              <p style="font-size:2rem;font-family:var(--font-headline);color:var(--brand-deep);font-weight:800;">${(progress.units_read||[]).length}/${units.length}</p>
            </div>
            <div style="border-right:1px solid var(--border-card);border-left:1px solid var(--border-card);">
              <p style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">בחנים שהושלמו</p>
              <p style="font-size:2rem;font-family:var(--font-headline);color:var(--brand-deep);font-weight:800;">${Object.keys(quizScores).length}/${units.length}</p>
            </div>
            <div>
              <p style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">התקדמות כוללת</p>
              <p style="font-size:2rem;font-family:var(--font-headline);color:${course?.color || 'var(--brand-blue)'};font-weight:800;">${pct}%</p>
            </div>
          </div>
        </div>`;

      // Quick actions — conditional on course features
      const actions = [];
      if (features.includes('sandbox')) {
        actions.push(`<div class="card hub-action-card" onclick="App.navigate('sandbox')">
          <div class="hub-action-icon" style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.12);">
            <span class="material-symbols-outlined" style="color:var(--brand-blue);font-size:24px;font-variation-settings:'FILL' 1;">draw</span>
          </div>
          <div class="hub-action-info"><h4>סטודיו ציור</h4><p>צייר תרשימים אקדמיים</p></div>
          <span class="material-symbols-outlined" style="color:var(--text-muted);">arrow_outward</span>
        </div>`);
      }
      if (features.includes('calculator')) {
        actions.push(`<div class="card hub-action-card" onclick="App.navigate('calculator')">
          <div class="hub-action-icon" style="background:rgba(45,27,105,0.04);border:1px solid rgba(45,27,105,0.08);">
            <span class="material-symbols-outlined" style="color:var(--brand-deep);font-size:24px;font-variation-settings:'FILL' 1;">calculate</span>
          </div>
          <div class="hub-action-info"><h4>מחשבון ישימות</h4><p>נרמול ותוחלת תועלת</p></div>
          <span class="material-symbols-outlined" style="color:var(--text-muted);">arrow_outward</span>
        </div>`);
      }
      if (actions.length > 0) {
        html += `<div style="display:grid;grid-template-columns:${actions.length > 1 ? '1fr 1fr' : '1fr'};gap:14px;margin-bottom:28px;">
          ${actions.join('')}
        </div>`;
      }

      // Unit Grid
      html += `<h3 style="font-family:var(--font-headline);font-size:1.3rem;color:var(--brand-deep);margin-bottom:16px;font-weight:800;">
        <span class="material-symbols-outlined" style="vertical-align:middle;margin-left:6px;">school</span>
        יחידות הקורס
      </h3>
      <div class="unit-grid">`;

      for (const u of units) {
        const isRead = (progress.units_read||[]).includes(u.id);
        const isCards = (progress.flashcards_completed||[]).includes(u.id);
        const quizScore = quizScores[String(u.id)];
        const unitDone = (isRead?1:0)+(isCards?1:0)+(quizScore!==undefined?1:0);
        const unitColor = u.color || course?.color || '#3b82f6';

        html += `
          <div class="card unit-card">
            <div class="color-bar" style="background:${unitColor};opacity:${unitDone>0?1:0.3}"></div>
            <div class="unit-icon">${u.icon}</div>
            <div class="unit-title">${HEB.unit} ${u.id}: ${u.title}</div>
            <div class="unit-subtitle">${u.topic_count} נושאים • ${u.flashcard_count} כרטיסיות • ${u.quiz_count} שאלות</div>
            <div class="progress-bar" style="margin-bottom:6px;"><div class="progress-fill" style="width:${Math.round(unitDone/3*100)}%;background:${unitColor}"></div></div>
            <div class="unit-actions">
              <button class="btn btn-outline btn-sm" onclick="App.openUnit(${u.id},'learn')">${isRead?'✅':'📖'} למידה</button>
              <button class="btn btn-outline btn-sm" onclick="App.openUnit(${u.id},'cards')">${isCards?'✅':'🃏'} כרטיסיות</button>
              <button class="btn btn-outline btn-sm" onclick="App.openUnit(${u.id},'quiz')">${quizScore!==undefined?'✅ '+quizScore+'/'+u.quiz_count:'✏️ בוחן'}</button>
            </div>
          </div>`;
      }

      html += `</div></div>`;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="text-align:center;color:var(--error);">
        <p>שגיאה בטעינת הנתונים</p><p style="font-size:13px">${err.message}</p>
        <button class="btn btn-primary" style="margin-top:12px" onclick="Dashboard.render(document.getElementById('app-content'))">נסה שוב</button>
      </div></div>`;
    }
  }
};
