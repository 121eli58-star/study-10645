/**
 * Flashcard Viewer — Hub + Card Viewer
 */
window.FlashcardViewer = {
  currentIndex: 0,
  flipped: false,
  cards: [],
  unitId: null,
  unitData: null,

  async render(container, unitId) {
    if (!unitId) {
      this._renderHub(container);
      return;
    }

    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
    try {
      const unit = await API.getUnit(unitId);
      this.unitId = unitId;
      this.unitData = unit;
      this.cards = unit.flashcards || [];
      this.currentIndex = 0;
      this.flipped = false;
      this._renderCard(container);
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
      const completedCount = (progress.flashcards_completed || []).length;
      const totalCards = units.reduce((s, u) => s + u.flashcard_count, 0);

      let html = `<div class="page fade-in">`;

      html += `<div class="hub-hero">
        <div class="hub-hero-icon" style="background:linear-gradient(135deg,rgba(188,19,254,0.08),rgba(45,27,105,0.06));">
          <span class="material-symbols-outlined" style="font-size:36px;color:#9333ea;">style</span>
        </div>
        <h2>מרכז הכרטיסיות</h2>
        <p>תרגול עם כרטיסיות הוא אחת הדרכים היעילות ביותר לזכירת חומר. בחר יחידה והתחל!</p>
      </div>`;

      html += `<div class="hub-stats">
        <div class="hub-stat">
          <div class="hub-stat-value">${completedCount}</div>
          <div class="hub-stat-label">יחידות הושלמו</div>
        </div>
        <div class="hub-stat">
          <div class="hub-stat-value">${totalCards}</div>
          <div class="hub-stat-label">סה"כ כרטיסיות</div>
        </div>
        <div class="hub-stat">
          <div class="hub-stat-value">${units.length > 0 ? Math.round(completedCount / units.length * 100) : 0}%</div>
          <div class="hub-stat-label">התקדמות</div>
        </div>
      </div>`;

      // Mixed practice button
      html += `<div style="text-align:center;margin-bottom:28px;">
        <button class="btn btn-primary" style="padding:12px 28px;font-size:15px;" onclick="FlashcardViewer._startMixed()">
          <span class="material-symbols-outlined" style="font-size:18px;">shuffle</span>
          תרגול מעורב מכל היחידות
        </button>
      </div>`;

      html += `<div class="unit-grid">`;
      for (const u of units) {
        const isDone = (progress.flashcards_completed || []).includes(u.id);
        html += `
          <div class="card hub-action-card" onclick="App.openUnit(${u.id},'cards')">
            <div class="hub-action-icon" style="background:${u.color}15;border:1px solid ${u.color}30;">
              <span style="font-size:24px;">${u.icon}</span>
            </div>
            <div class="hub-action-info">
              <h4>${u.title}</h4>
              <p>${u.flashcard_count} כרטיסיות</p>
            </div>
            ${isDone ? '<span class="hub-action-badge" style="background:rgba(52,168,83,0.1);color:var(--success);">✅ הושלם</span>' : '<span class="hub-action-badge">🃏 להתחיל</span>'}
          </div>`;
      }
      html += `</div></div>`;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  /** Start mixed-unit flashcard practice */
  async _startMixed() {
    const container = document.getElementById('app-content');
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
    try {
      const unitsData = await API.getUnits();
      const allCards = [];
      for (const u of unitsData.units) {
        const unit = await API.getUnit(u.id);
        (unit.flashcards || []).forEach(c => allCards.push({ ...c, unitTitle: unit.title, unitIcon: unit.icon }));
      }
      // Shuffle
      for (let i = allCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
      }
      this.unitId = null;
      this.unitData = { title: 'תרגול מעורב', icon: '🔀', color: '#9333ea' };
      this.cards = allCards.slice(0, 20); // Max 20 cards
      this.currentIndex = 0;
      this.flipped = false;
      this._renderCard(container);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  _renderCard(container) {
    const unit = this.unitData;
    const card = this.cards[this.currentIndex];

    let html = `<div class="page-narrow fade-in">`;
    html += `<div class="section-header">
      <button class="back-btn" onclick="App.navigate('cards')">← חזרה</button>
      <h2>${unit.icon} כרטיסיות - ${unit.title}</h2>
    </div>`;

    html += `<div class="flashcard-counter">כרטיסייה ${this.currentIndex + 1} מתוך ${this.cards.length}</div>`;

    // Progress bar
    html += `<div class="progress-bar" style="margin-bottom:20px;"><div class="progress-fill" style="width:${Math.round((this.currentIndex + 1) / this.cards.length * 100)}%"></div></div>`;

    const flippedClass = this.flipped ? 'flipped' : '';
    html += `
      <div class="card flashcard ${flippedClass}" onclick="FlashcardViewer.flip()">
        <p class="fc-label">${this.flipped ? '💡 תשובה' : '❓ שאלה'} • לחץ להפוך</p>
        <p class="fc-text">${this.flipped ? card.answer : card.question}</p>
      </div>`;

    html += `<div class="flashcard-nav">
      <button class="btn btn-outline" ${this.currentIndex === 0 ? 'disabled' : ''} onclick="FlashcardViewer.prev()">הקודם →</button>
      <button class="btn btn-primary" ${this.currentIndex === this.cards.length - 1 ? 'disabled' : ''} onclick="FlashcardViewer.next()">← הבא</button>
    </div>`;

    if (this.currentIndex === this.cards.length - 1) {
      html += `<div style="text-align:center;margin-top:20px">
        <button class="btn btn-success" onclick="FlashcardViewer.complete()">✅ סיימתי כרטיסיות</button>
      </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  },

  flip() { this.flipped = !this.flipped; this._renderCard(document.getElementById('app-content')); },
  next() { if (this.currentIndex < this.cards.length - 1) { this.currentIndex++; this.flipped = false; this._renderCard(document.getElementById('app-content')); } },
  prev() { if (this.currentIndex > 0) { this.currentIndex--; this.flipped = false; this._renderCard(document.getElementById('app-content')); } },

  async complete() {
    if (this.unitId) {
      await API.updateProgress(this.unitId, 'flashcard');
    }
    App.toast('כרטיסיות הושלמו ✅', 'success');
    App.navigate('cards');
  }
};
