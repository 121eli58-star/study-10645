/**
 * Dashboard Component - Main screen with unit cards and progress
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
      const totalTasks = units.length * 3; // read + flashcards + quiz per unit
      let doneTasks = 0;

      units.forEach(u => {
        if ((progress.units_read || []).includes(u.id)) doneTasks++;
        if ((progress.flashcards_completed || []).includes(u.id)) doneTasks++;
        if ((progress.quiz_scores || {})[String(u.id)] !== undefined) doneTasks++;
      });

      const pct = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;

      let html = `<div class="page fade-in">`;

      // Progress banner
      html += `
        <div class="card card-gradient" style="margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h2>${HEB.overall_progress}</h2>
            <span style="font-size:24px;font-weight:700;color:#60a5fa">${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;background:#60a5fa"></div>
          </div>
          <p style="margin-top:8px;font-size:13px;color:#94a3b8">${doneTasks} ${HEB.out_of} ${totalTasks} ${HEB.tasks_done}</p>
        </div>`;

      // Unit grid
      html += `<div class="unit-grid">`;

      for (const u of units) {
        const isRead = (progress.units_read || []).includes(u.id);
        const isCards = (progress.flashcards_completed || []).includes(u.id);
        const quizScore = (progress.quiz_scores || {})[String(u.id)];
        const unitDone = (isRead ? 1 : 0) + (isCards ? 1 : 0) + (quizScore !== undefined ? 1 : 0);
        const barOpacity = unitDone > 0 ? 1 : 0.3;

        html += `
          <div class="card unit-card">
            <div class="color-bar" style="background:${u.color};opacity:${barOpacity}"></div>
            <div class="unit-icon">${u.icon}</div>
            <div class="unit-title">${HEB.unit} ${u.id}</div>
            <div class="unit-subtitle">${u.title}</div>
            <div class="progress-bar" style="margin-bottom:4px">
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
