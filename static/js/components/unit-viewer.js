/**
 * Unit Viewer Component — Learning Hub + Reader
 */
window.UnitViewer = {
  async render(container, unitId) {
    if (!unitId) {
      this._renderHub(container);
      return;
    }

    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';

    try {
      const [unit, progress] = await Promise.all([API.getUnit(unitId), API.getProgress()]);
      const isRead = (progress.units_read || []).includes(unitId);
      const summary = unit.summary || [];
      const summaryItems = Array.isArray(summary) ? summary :
        (summary.bullet_points || summary.sections?.map(s => `**${s.heading}**: ${s.content}`) || []);

      let html = `<div class="page-narrow fade-in">`;
      html += `<div class="section-header">
        <button class="back-btn" onclick="App.navigate('learn')">← חזרה</button>
        <h2>${unit.icon} ${HEB.unit} ${unit.id}: ${unit.title}</h2>
      </div>`;

      html += `<div class="card card-static">`;
      for (let i = 0; i < summaryItems.length; i++) {
        const text = summaryItems[i].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<div class="summary-item">${text}</div>`;
      }
      html += `</div>`;

      if (!isRead) {
        html += `<div style="text-align:center;margin-top:20px">
          <button class="btn btn-success" onclick="UnitViewer.markRead(${unitId})">✅ סיימתי לקרוא</button>
        </div>`;
      } else {
        html += `<p style="text-align:center;color:var(--success);margin-top:20px;font-size:14px">✅ יחידה זו סומנה כנקראה</p>`;
      }

      // Navigation buttons
      html += `<div style="display:flex;justify-content:center;gap:12px;margin-top:20px;">
        <button class="btn btn-outline" onclick="App.openUnit(${unitId},'cards')">🃏 כרטיסיות</button>
        <button class="btn btn-outline" onclick="App.openUnit(${unitId},'quiz')">✏️ בוחן</button>
      </div>`;

      html += `</div>`;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  /** Hub page when no unit is selected */
  async _renderHub(container) {
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
    try {
      const [unitsData, progress] = await Promise.all([API.getUnits(), API.getProgress()]);
      const units = unitsData.units || [];
      const readCount = (progress.units_read || []).length;

      let html = `<div class="page fade-in">`;

      // Hero
      html += `<div class="hub-hero">
        <div class="hub-hero-icon" style="background:linear-gradient(135deg,rgba(59,130,246,0.1),rgba(45,27,105,0.08));">
          <span class="material-symbols-outlined" style="font-size:36px;color:var(--brand-blue);">auto_stories</span>
        </div>
        <h2>מרחב הלמידה</h2>
        <p>בחר יחידה כדי לקרוא את הסיכום, ללמוד את הנושאים ולהתקדם בקורס</p>
      </div>`;

      // Stats
      html += `<div class="hub-stats">
        <div class="hub-stat">
          <div class="hub-stat-value">${readCount}</div>
          <div class="hub-stat-label">יחידות נקראו</div>
        </div>
        <div class="hub-stat">
          <div class="hub-stat-value">${units.length}</div>
          <div class="hub-stat-label">סה"כ יחידות</div>
        </div>
        <div class="hub-stat">
          <div class="hub-stat-value">${units.length > 0 ? Math.round(readCount / units.length * 100) : 0}%</div>
          <div class="hub-stat-label">התקדמות</div>
        </div>
      </div>`;

      // Unit cards
      html += `<div class="unit-grid">`;
      for (const u of units) {
        const isRead = (progress.units_read || []).includes(u.id);
        html += `
          <div class="card hub-action-card" onclick="App.openUnit(${u.id},'learn')">
            <div class="hub-action-icon" style="background:${u.color}15;border:1px solid ${u.color}30;">
              <span style="font-size:24px;">${u.icon}</span>
            </div>
            <div class="hub-action-info">
              <h4>${HEB.unit} ${u.id}: ${u.title}</h4>
              <p>${u.topic_count} נושאים • ${u.flashcard_count} כרטיסיות</p>
            </div>
            ${isRead ? '<span class="hub-action-badge" style="background:rgba(52,168,83,0.1);color:var(--success);">✅ נקרא</span>' : '<span class="hub-action-badge">📖 לקרוא</span>'}
          </div>`;
      }
      html += `</div></div>`;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  async markRead(unitId) {
    await API.updateProgress(unitId, 'read');
    App.toast('יחידה סומנה כנקראה ✅', 'success');
    UnitViewer.render(document.getElementById('app-content'), unitId);
  }
};
