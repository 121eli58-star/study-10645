/**
 * Unit Viewer Component - Summary / Learning mode
 */
window.UnitViewer = {
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
      const [unit, progress] = await Promise.all([
        API.getUnit(unitId),
        API.getProgress()
      ]);

      const isRead = (progress.units_read || []).includes(unitId);
      const summary = unit.summary || [];
      const summaryItems = Array.isArray(summary) ? summary :
        (summary.bullet_points || summary.sections?.map(s => `**${s.heading}**: ${s.content}`) || []);

      let html = `<div class="page-narrow fade-in">`;

      // Header
      html += `<div class="section-header">
        <button class="back-btn" onclick="App.navigate('dashboard')">${HEB.back}</button>
        <h2>${unit.icon} ${HEB.unit} ${unit.id}: ${unit.title}</h2>
      </div>`;

      // Summary card
      html += `<div class="card">`;
      for (let i = 0; i < summaryItems.length; i++) {
        const text = summaryItems[i].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const border = i < summaryItems.length - 1 ? 'border-bottom:1px solid rgba(148,163,184,0.1)' : '';
        html += `<div class="summary-item" style="${border}">${text}</div>`;
      }
      html += `</div>`;

      // Mark as read button
      if (!isRead) {
        html += `<div style="text-align:center;margin-top:20px">
          <button class="btn btn-success" onclick="UnitViewer.markRead(${unitId})">${HEB.done_reading}</button>
        </div>`;
      } else {
        html += `<p style="text-align:center;color:#22c55e;margin-top:20px;font-size:14px">${HEB.marked_read}</p>`;
      }

      html += `</div>`;
      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:#fca5a5;text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  async markRead(unitId) {
    await API.updateProgress(unitId, 'read');
    App.toast('יחידה סומנה כנקראה ✅', 'success');
    UnitViewer.render(document.getElementById('app-content'), unitId);
  }
};
