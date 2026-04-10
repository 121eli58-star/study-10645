/**
 * Flashcard Viewer — Hub + Card Viewer
 * Targeted DOM updates (no full re-render on flip/next/prev) + 3D flip animation.
 * Round 2: Spaced Repetition (Leitner) — know/don't-know buttons, SR-only mode.
 */
window.FlashcardViewer = {
  currentIndex: 0,
  flipped: false,
  cards: [],
  cardIndices: [],   // original indices in the unit (for mastery keys)
  unitId: null,
  unitData: null,
  srMode: false,     // true = only showing due cards

  // DOM references cached after initial render
  _container: null,
  _cardEl: null,
  _frontTextEl: null,
  _backTextEl: null,
  _counterEl: null,
  _progressFillEl: null,
  _prevBtn: null,
  _nextBtn: null,
  _completeWrap: null,
  _srBtnsEl: null,      // know/don't-know buttons container
  _backUpdateTimer: null,

  async render(container, unitId, mode) {
    if (!unitId) {
      this._renderHub(container);
      return;
    }

    this._renderSkeleton(container);
    this.srMode = (mode === 'sr');
    try {
      const unit = await API.getUnit(unitId);
      this.unitId = unitId;
      this.unitData = unit;
      const allCards = unit.flashcards || [];

      if (this.srMode) {
        // SR mode: only due / unseen cards
        const dueIndices = API.getUnitCardsDue(unitId, allCards.length);
        if (dueIndices.length === 0) {
          container.innerHTML = `<div class="page-narrow fade-in">
            <div class="section-header">
              <button class="back-btn" onclick="App.navigate('cards')">← חזרה</button>
              <h2>${unit.icon} חזרה מרווחת</h2>
            </div>
            <div class="card card-static" style="text-align:center;padding:40px 24px;">
              <div style="font-size:48px;margin-bottom:12px;">🎉</div>
              <h3 style="color:var(--success);font-family:var(--font-headline);font-size:1.3rem;">כל הכרטיסיות מושלמות!</h3>
              <p style="color:var(--text-secondary);margin-top:8px;font-size:14px;">אין כרטיסיות לחזרה כרגע. חזור מחר!</p>
              <button class="btn btn-outline" style="margin-top:20px;" onclick="App.navigate('cards')">← חזרה לכרטיסיות</button>
            </div>
          </div>`;
          return;
        }
        this.cards = dueIndices.map(i => allCards[i]);
        this.cardIndices = dueIndices;
      } else {
        this.cards = allCards;
        this.cardIndices = allCards.map((_, i) => i);
      }

      this.currentIndex = 0;
      this.flipped = false;
      this._renderCard(container);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  /** Card-viewer skeleton */
  _renderSkeleton(container) {
    container.innerHTML = `<div class="page-narrow fade-in">
      <div class="skeleton skeleton-text med" style="margin:0 auto 12px;"></div>
      <div class="skeleton" style="height:4px;margin-bottom:20px;border-radius:999px;"></div>
      <div class="skeleton" style="height:260px;border-radius:var(--radius-xl);margin-bottom:20px;"></div>
      <div style="display:flex;gap:12px;">
        <div class="skeleton" style="flex:1;height:46px;border-radius:var(--radius-pill);"></div>
        <div class="skeleton" style="flex:1;height:46px;border-radius:var(--radius-pill);"></div>
      </div>
    </div>`;
  },

  /** Hub skeleton */
  _renderHubSkeleton(container) {
    container.innerHTML = `<div class="page fade-in">
      <div class="skeleton" style="height:150px;border-radius:var(--radius-xl);margin-bottom:24px;"></div>
      <div class="hub-stats" style="margin-bottom:28px;">
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
      const completedCount = (progress.flashcards_completed || []).length;
      const totalCards = units.reduce((s, u) => s + u.flashcard_count, 0);
      const dueCount = API.getFlashcardsDueCount();

      let html = `<div class="page fade-in">`;

      html += `<div class="hub-hero">
        <div class="hub-hero-icon" style="background:linear-gradient(135deg,rgba(188,19,254,0.08),rgba(45,27,105,0.06));">
          <span class="material-symbols-outlined" style="font-size:36px;color:#9333ea;">style</span>
        </div>
        <h2>מרכז הכרטיסיות</h2>
        <p>תרגול עם כרטיסיות הוא אחת הדרכים היעילות ביותר לזכירת חומר.</p>
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
        <div class="hub-stat" style="${dueCount > 0 ? 'color:var(--brand-blue)' : ''}">
          <div class="hub-stat-value">${dueCount}</div>
          <div class="hub-stat-label">לחזרה היום</div>
        </div>
      </div>`;

      // Action buttons
      html += `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:28px;">
        <button class="btn btn-primary" style="padding:12px 24px;font-size:14px;" onclick="FlashcardViewer._startMixed()">
          <span class="material-symbols-outlined" style="font-size:18px;">shuffle</span>
          תרגול מעורב
        </button>`;

      if (dueCount > 0) {
        html += `<button class="btn btn-outline" style="padding:12px 24px;font-size:14px;border-color:var(--brand-blue);color:var(--brand-blue);" onclick="FlashcardViewer._startSRAll()">
          <span class="material-symbols-outlined" style="font-size:18px;">replay</span>
          חזרה מרווחת (${dueCount})
        </button>`;
      }

      html += `</div>`;

      html += `<div class="unit-grid">`;
      for (const u of units) {
        const isDone = (progress.flashcards_completed || []).includes(u.id);
        const unitDue = API.getUnitCardsDue(u.id, u.flashcard_count).length;
        const hasDue = unitDue > 0 && unitDue < u.flashcard_count;
        html += `
          <div class="card hub-action-card" onclick="App.openUnit(${u.id},'cards')">
            <div class="hub-action-icon" style="background:${u.color}15;border:1px solid ${u.color}30;">
              <span style="font-size:24px;">${u.icon}</span>
            </div>
            <div class="hub-action-info">
              <h4>${u.title}</h4>
              <p>${u.flashcard_count} כרטיסיות${hasDue ? ` • <span style="color:var(--brand-blue);font-weight:600">${unitDue} לחזרה</span>` : ''}</p>
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

  /** Mixed practice (all units, parallel load, shuffled) */
  async _startMixed() {
    const container = document.getElementById('app-content');
    this._renderSkeleton(container);
    this.srMode = false;
    try {
      const unitsData = await API.getUnits();
      const loadedUnits = await Promise.all(
        unitsData.units.map(u => API.getUnit(u.id).catch(() => null))
      );
      const allCards = [];
      loadedUnits.forEach(unit => {
        if (!unit) return;
        (unit.flashcards || []).forEach((c, i) => allCards.push({
          ...c, unitId: unit.id, origIndex: i, unitTitle: unit.title, unitIcon: unit.icon
        }));
      });
      for (let i = allCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
      }
      this.unitId = null;
      this.unitData = { title: 'תרגול מעורב', icon: '🔀', color: '#9333ea' };
      const selected = allCards.slice(0, 20);
      this.cards = selected;
      this.cardIndices = selected.map(c => c.origIndex);
      this.currentIndex = 0;
      this.flipped = false;
      this._renderCard(container);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  /** SR mode across all units — only due/unseen cards */
  async _startSRAll() {
    const container = document.getElementById('app-content');
    this._renderSkeleton(container);
    this.srMode = true;
    try {
      const unitsData = await API.getUnits();
      const loadedUnits = await Promise.all(
        unitsData.units.map(u => API.getUnit(u.id).catch(() => null))
      );
      const dueCards = [];
      loadedUnits.forEach(unit => {
        if (!unit) return;
        const dueIndices = API.getUnitCardsDue(unit.id, (unit.flashcards || []).length);
        dueIndices.forEach(i => dueCards.push({
          ...(unit.flashcards[i]), unitId: unit.id, origIndex: i, unitTitle: unit.title, unitIcon: unit.icon
        }));
      });
      if (dueCards.length === 0) {
        container.innerHTML = `<div class="page-narrow fade-in">
          <div class="card card-static" style="text-align:center;padding:40px 24px;">
            <div style="font-size:48px;margin-bottom:12px;">🎉</div>
            <h3 style="color:var(--success);font-family:var(--font-headline);">כל הכרטיסיות מושלמות!</h3>
            <p style="color:var(--text-secondary);margin-top:8px;">אין כרטיסיות לחזרה כרגע. חזור מחר!</p>
            <button class="btn btn-outline" style="margin-top:20px;" onclick="App.navigate('cards')">← חזרה</button>
          </div>
        </div>`;
        return;
      }
      // Shuffle
      for (let i = dueCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dueCards[i], dueCards[j]] = [dueCards[j], dueCards[i]];
      }
      this.unitId = null;
      this.unitData = { title: 'חזרה מרווחת', icon: '🔁', color: '#3b82f6' };
      this.cards = dueCards;
      this.cardIndices = dueCards.map(c => c.origIndex);
      this.currentIndex = 0;
      this.flipped = false;
      this._renderCard(container);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="color:var(--error);text-align:center">שגיאה: ${err.message}</div></div>`;
    }
  },

  /** Initial render — builds full markup once and caches element references. */
  _renderCard(container) {
    this._container = container;
    if (this._backUpdateTimer) { clearTimeout(this._backUpdateTimer); this._backUpdateTimer = null; }

    const unit = this.unitData;
    const card = this.cards[this.currentIndex];
    if (!card) {
      container.innerHTML = `<div class="page"><div class="card" style="text-align:center">אין כרטיסיות ביחידה זו</div></div>`;
      return;
    }

    const pct = Math.round((this.currentIndex + 1) / this.cards.length * 100);
    const isLast = this.currentIndex === this.cards.length - 1;

    // Check current mastery for this card
    const cardUnitId = card.unitId || this.unitId;
    const cardOrigIdx = this.cardIndices[this.currentIndex];
    const cardKey = cardUnitId !== null ? `${cardUnitId}_${cardOrigIdx}` : null;
    const mastery = cardKey ? API.getCardMastery(cardKey) : null;
    const masteryLabel = mastery ? `📦 קופסה ${mastery.box}/5` : '✨ חדש';

    container.innerHTML = `<div class="page-narrow fade-in">
      <div class="section-header">
        <button class="back-btn" onclick="App.navigate('cards')">← חזרה</button>
        <h2>${unit.icon} ${this.srMode ? 'חזרה מרווחת' : 'כרטיסיות'} - ${unit.title}</h2>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span class="flashcard-counter" data-fc-counter>כרטיסייה ${this.currentIndex + 1} מתוך ${this.cards.length}</span>
        <span data-fc-mastery style="font-size:12px;color:var(--text-secondary);background:rgba(45,27,105,0.06);padding:3px 10px;border-radius:999px;">${masteryLabel}</span>
      </div>
      <div class="progress-bar" style="margin-bottom:20px;">
        <div class="progress-fill" data-fc-progress style="width:${pct}%"></div>
      </div>
      <div class="card flashcard${this.flipped ? ' flipped' : ''}" data-fc-card onclick="FlashcardViewer.flip()">
        <div class="flashcard-inner">
          <div class="flashcard-face front">
            <p class="fc-label">❓ שאלה • לחץ להפוך</p>
            <p class="fc-text" data-fc-front>${card.question}</p>
          </div>
          <div class="flashcard-face back">
            <p class="fc-label">💡 תשובה</p>
            <p class="fc-text" data-fc-back>${card.answer}</p>
          </div>
        </div>
      </div>

      <!-- Know / Don't-know buttons (shown after flip) -->
      <div data-fc-sr-btns style="display:${this.flipped ? 'flex' : 'none'};gap:10px;margin-top:12px;justify-content:center;">
        <button class="btn fc-know-btn" onclick="FlashcardViewer.rate(false)" style="flex:1;background:rgba(239,68,68,0.08);color:#ef4444;border-color:rgba(239,68,68,0.2);">
          <span class="material-symbols-outlined" style="font-size:18px;">close</span> לא ידעתי
        </button>
        <button class="btn fc-know-btn" onclick="FlashcardViewer.rate(true)" style="flex:1;background:rgba(52,168,83,0.08);color:var(--success);border-color:rgba(52,168,83,0.2);">
          <span class="material-symbols-outlined" style="font-size:18px;">check</span> ידעתי!
        </button>
      </div>

      <div class="flashcard-nav" style="margin-top:10px;">
        <button class="btn btn-outline" data-fc-prev ${this.currentIndex === 0 ? 'disabled' : ''} onclick="FlashcardViewer.prev()">הקודם →</button>
        <button class="btn btn-primary" data-fc-next ${isLast ? 'disabled' : ''} onclick="FlashcardViewer.next()">← הבא</button>
      </div>
      <div data-fc-complete style="text-align:center;margin-top:20px;display:${isLast ? 'block' : 'none'}">
        <button class="btn btn-success" onclick="FlashcardViewer.complete()">✅ סיימתי כרטיסיות</button>
      </div>
    </div>`;

    // Cache element references
    this._cardEl = container.querySelector('[data-fc-card]');
    this._frontTextEl = container.querySelector('[data-fc-front]');
    this._backTextEl = container.querySelector('[data-fc-back]');
    this._counterEl = container.querySelector('[data-fc-counter]');
    this._masteryEl = container.querySelector('[data-fc-mastery]');
    this._progressFillEl = container.querySelector('[data-fc-progress]');
    this._prevBtn = container.querySelector('[data-fc-prev]');
    this._nextBtn = container.querySelector('[data-fc-next]');
    this._completeWrap = container.querySelector('[data-fc-complete]');
    this._srBtnsEl = container.querySelector('[data-fc-sr-btns]');
  },

  /** Targeted flip — toggles 3D-flip class + shows/hides SR buttons */
  flip() {
    if (!this._cardEl) return;
    this.flipped = !this.flipped;
    this._cardEl.classList.toggle('flipped', this.flipped);
    if (this._srBtnsEl) this._srBtnsEl.style.display = this.flipped ? 'flex' : 'none';
  },

  /** "ידעתי / לא ידעתי" — update mastery and advance */
  async rate(knew) {
    // Determine card key for mastery tracking
    const card = this.cards[this.currentIndex];
    const cardUnitId = (card && card.unitId) ? card.unitId : this.unitId;
    const cardOrigIdx = this.cardIndices[this.currentIndex];
    if (cardUnitId !== null && cardOrigIdx !== undefined) {
      const cardKey = `${cardUnitId}_${cardOrigIdx}`;
      try { await API.updateFlashcardMastery(cardKey, knew); } catch (e) {}
    }
    if (this.currentIndex < this.cards.length - 1) {
      this.next();
    } else {
      // Last card — complete
      this.complete();
    }
  },

  /** Targeted next */
  next() {
    if (this.currentIndex >= this.cards.length - 1) return;
    this.currentIndex++;
    this._transitionTo();
  },

  /** Targeted prev */
  prev() {
    if (this.currentIndex <= 0) return;
    this.currentIndex--;
    this._transitionTo();
  },

  /** Apply targeted updates when the active card changes */
  _transitionTo() {
    if (!this._cardEl) return;
    const card = this.cards[this.currentIndex];
    const wasFlipped = this.flipped;
    this.flipped = false;

    if (this._frontTextEl) this._frontTextEl.innerHTML = card.question;

    if (this._backUpdateTimer) { clearTimeout(this._backUpdateTimer); this._backUpdateTimer = null; }

    if (wasFlipped) {
      this._cardEl.classList.remove('flipped');
      this._backUpdateTimer = setTimeout(() => {
        if (this._backTextEl) this._backTextEl.innerHTML = card.answer;
        this._backUpdateTimer = null;
      }, 600);
    } else {
      if (this._backTextEl) this._backTextEl.innerHTML = card.answer;
    }

    // Hide SR buttons when showing front
    if (this._srBtnsEl) this._srBtnsEl.style.display = 'none';

    // Mastery label
    const cardUnitId = (card && card.unitId) ? card.unitId : this.unitId;
    const cardOrigIdx = this.cardIndices[this.currentIndex];
    if (this._masteryEl && cardUnitId !== null && cardOrigIdx !== undefined) {
      const mastery = API.getCardMastery(`${cardUnitId}_${cardOrigIdx}`);
      this._masteryEl.textContent = mastery ? `📦 קופסה ${mastery.box}/5` : '✨ חדש';
    }

    // Counter
    if (this._counterEl) {
      this._counterEl.textContent = `כרטיסייה ${this.currentIndex + 1} מתוך ${this.cards.length}`;
    }
    // Progress bar
    if (this._progressFillEl) {
      const pct = Math.round((this.currentIndex + 1) / this.cards.length * 100);
      this._progressFillEl.style.width = `${pct}%`;
    }
    // Buttons
    const isLast = this.currentIndex === this.cards.length - 1;
    if (this._prevBtn) this._prevBtn.disabled = this.currentIndex === 0;
    if (this._nextBtn) this._nextBtn.disabled = isLast;
    if (this._completeWrap) this._completeWrap.style.display = isLast ? 'block' : 'none';
  },

  async complete() {
    if (this.unitId) {
      await API.updateProgress(this.unitId, 'flashcard');
    }
    App.toast('כרטיסיות הושלמו ✅', 'success');
    App.navigate('cards');
  }
};
