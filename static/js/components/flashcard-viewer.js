/**
 * Flashcard Viewer Component
 */
window.FlashcardViewer = {
  currentIndex: 0,
  flipped: false,
  cards: [],
  unitId: null,
  unitData: null,

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
      this.cards = unit.flashcards || [];
      this.currentIndex = 0;
      this.flipped = false;
      this._renderCard(container);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:#fca5a5;text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  _renderCard(container) {
    const unit = this.unitData;
    const card = this.cards[this.currentIndex];
    const color = unit.color || '#2563eb';

    let html = `<div class="page-narrow fade-in" style="--unit-color:${color}">`;

    // Header
    html += `<div class="section-header">
      <button class="back-btn" onclick="App.navigate('dashboard')">${HEB.back}</button>
      <h2>${unit.icon} כרטיסיות - ${unit.title}</h2>
    </div>`;

    // Counter
    html += `<div class="flashcard-counter">כרטיסייה ${this.currentIndex + 1} מתוך ${this.cards.length}</div>`;

    // Card
    const flippedClass = this.flipped ? 'flipped' : '';
    const bgColor = this.flipped ? color + '15' : 'rgba(30,41,59,0.9)';
    const borderColor = this.flipped ? color : 'rgba(148,163,184,0.15)';

    html += `
      <div class="card flashcard ${flippedClass}" onclick="FlashcardViewer.flip()"
           style="background:${bgColor};border-color:${borderColor}">
        <p class="fc-label">${this.flipped ? HEB.answer : HEB.question} • ${HEB.click_to_flip}</p>
        <p class="fc-text">${this.flipped ? card.answer : card.question}</p>
      </div>`;

    // Navigation
    html += `<div class="flashcard-nav">
      <button class="btn btn-outline" ${this.currentIndex === 0 ? 'disabled' : ''} onclick="FlashcardViewer.prev()">${HEB.prev}</button>
      <button class="btn btn-primary" style="background:${color}" ${this.currentIndex === this.cards.length - 1 ? 'disabled' : ''} onclick="FlashcardViewer.next()">${HEB.next}</button>
    </div>`;

    // Complete button
    if (this.currentIndex === this.cards.length - 1) {
      html += `<div style="text-align:center;margin-top:20px">
        <button class="btn btn-success" onclick="FlashcardViewer.complete()">✅ סיימתי כרטיסיות</button>
      </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  },

  flip() {
    this.flipped = !this.flipped;
    this._renderCard(document.getElementById('app-content'));
  },

  next() {
    if (this.currentIndex < this.cards.length - 1) {
      this.currentIndex++;
      this.flipped = false;
      this._renderCard(document.getElementById('app-content'));
    }
  },

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.flipped = false;
      this._renderCard(document.getElementById('app-content'));
    }
  },

  async complete() {
    await API.updateProgress(this.unitId, 'flashcard');
    App.toast('כרטיסיות הושלמו ✅', 'success');
    App.navigate('dashboard');
  }
};
