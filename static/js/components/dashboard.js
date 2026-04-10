/**
 * Dashboard Component — Lumina Academic (Multi-course)
 *
 * Strategy: "Render first, sync later".
 * 1. Show a skeleton immediately.
 * 2. Read progress synchronously from localStorage.
 * 3. Fetch units in parallel (api.js already uses Promise.all).
 * 4. Render the real dashboard; animate ring + counts.
 * 5. Fire background Firestore sync; listen to `progress-synced`
 *    and re-render just the numeric/ring bits if cloud wins.
 */
window.Dashboard = {
  _syncListener: null,

  _renderSkeleton(container) {
    container.innerHTML = `
      <div class="page">
        <div style="margin-bottom:28px;">
          <div class="skeleton skeleton-text long" style="height:28px;width:60%;"></div>
          <div class="skeleton skeleton-text med" style="height:14px;"></div>
        </div>
        <div class="dash-bento">
          <div class="skeleton skeleton-card hero dash-bento-main" style="min-height:240px;"></div>
          <div class="skeleton skeleton-card" style="height:120px;"></div>
          <div class="skeleton skeleton-card" style="height:90px;"></div>
        </div>
        <div class="skeleton skeleton-card" style="height:92px;margin-bottom:28px;"></div>
        <div class="skeleton skeleton-text short" style="height:20px;margin-bottom:12px;"></div>
        <div class="skeleton-grid">
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
      </div>`;
  },

  async render(container) {
    this._renderSkeleton(container);

    // Tear down any previous listener from a prior render
    if (this._syncListener) {
      window.removeEventListener('progress-synced', this._syncListener);
      this._syncListener = null;
    }

    try {
      const course = API.getCurrentCourse();
      // Read progress synchronously (no Firestore wait)
      const progressSync = API.getProgressSync();
      const unitsData = await API.getUnits();
      const units = unitsData.units || [];

      // Initial render with sync data
      this._renderContent(container, course, units, progressSync);

      // Kick off background cloud sync (non-blocking)
      API.syncProgressFromCloud().catch(() => {});

      // Listen for cloud sync completion and re-render numbers
      this._syncListener = (ev) => {
        const fresh = ev.detail;
        if (!fresh) return;
        this._updateCounters(course, units, fresh);
      };
      window.addEventListener('progress-synced', this._syncListener);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="card" style="text-align:center;color:var(--error);">
        <p>שגיאה בטעינת הנתונים</p><p style="font-size:13px">${err.message}</p>
        <button class="btn btn-primary" style="margin-top:12px" onclick="Dashboard.render(document.getElementById('app-content'))">נסה שוב</button>
      </div></div>`;
    }
  },

  _computeStats(units, progress) {
    const totalTasks = units.length * 3;
    let doneTasks = 0;
    units.forEach(u => {
      if ((progress.units_read||[]).includes(u.id)) doneTasks++;
      if ((progress.flashcards_completed||[]).includes(u.id)) doneTasks++;
      if ((progress.quiz_scores||{})[String(u.id)] !== undefined) doneTasks++;
    });
    const pct = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;
    return { totalTasks, doneTasks, pct };
  },

  _renderContent(container, course, units, progress) {
    const { totalTasks, doneTasks, pct } = this._computeStats(units, progress);

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

    const ringCircumference = 327;
    const courseColor = course?.color || '#3b82f6';

    let html = `<div class="page">`;

    // Welcome
    html += `<div style="margin-bottom:32px;">
      <h2 class="dash-welcome-heading" style="font-family:var(--font-headline);font-size:clamp(1.5rem,5vw,2.2rem);color:var(--brand-deep);margin-bottom:6px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ברוך הבא, ${userName} 👋
      </h2>
      <p style="color:var(--text-secondary);font-size:1rem;max-width:600px;line-height:1.7;">
        הושלמו <span style="color:var(--brand-blue);font-weight:700;"><span data-count="done-tasks">0</span> מתוך ${totalTasks}</span> משימות.
        ${pct >= 80 ? 'את/ה מתקדם/ת מעולה! 🚀' : pct >= 40 ? 'ממשיכים ללמוד! 📚' : 'בואו נתחיל ללמוד! 💪'}
      </p>
    </div>`;

    // Bento Grid
    html += `<div class="dash-bento">`;

    // Hero Course Card
    html += `
      <div class="card card-static dash-bento-main" style="position:relative;overflow:hidden;padding:32px;">
        <span style="display:inline-block;padding:5px 14px;background:${courseColor}15;color:${courseColor};border-radius:var(--radius-pill);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:16px;border:1px solid ${courseColor}30;">
          קורס פעיל
        </span>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <h3 style="font-family:var(--font-headline);font-size:2rem;color:var(--brand-deep);margin-bottom:8px;line-height:1.25;font-weight:800;">
              ${course?.icon || ''} ${course?.title || 'קורס'}
            </h3>
            <p style="color:${courseColor};font-weight:600;font-size:0.95rem;margin-bottom:24px;">
              קורס ${course?.id || ''} • ${units.length} יחידות
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              ${currentUnit ? `<button class="btn btn-primary" onclick="App.openUnit(${currentUnit.id},'learn')" style="padding:12px 24px;">
                המשך ליחידה ${currentUnit.id}
                <span class="material-symbols-outlined" style="font-size:16px;">arrow_back</span>
              </button>` : ''}
              <button class="btn btn-outline" onclick="App.navigate('exam')">מבחן סימולציה</button>
            </div>
          </div>
          <div style="position:relative;width:120px;height:120px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
            <svg width="120" height="120" style="transform:rotate(-90deg);filter:drop-shadow(0 0 8px ${courseColor}33);">
              <circle cx="60" cy="60" r="52" fill="transparent" stroke="rgba(45,27,105,0.06)" stroke-width="8"/>
              <circle class="progress-ring-fill" data-ring="main" cx="60" cy="60" r="52" fill="transparent" stroke="${courseColor}" stroke-width="8"
                      stroke-dasharray="${ringCircumference}" stroke-dashoffset="${ringCircumference}" stroke-linecap="round"/>
            </svg>
            <div style="position:absolute;display:flex;flex-direction:column;align-items:center;">
              <span data-count="pct" style="font-size:1.8rem;font-weight:800;color:var(--brand-deep);font-family:var(--font-headline);">0<span style="font-size:1.2rem;">%</span></span>
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
          ${currentUnit ? `<li style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);">
            <span class="material-symbols-outlined" style="font-size:16px;color:${courseColor};">check_circle</span>
            קרא סיכום יחידה ${currentUnit.id}
          </li>` : ''}
          <li style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);">
            <span class="material-symbols-outlined" style="font-size:16px;color:${courseColor};">check_circle</span>
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
             <p style="font-size:12px;color:${courseColor};font-weight:600;margin:0;">ציון: ${lastQuizScore}/${lastQuizUnitData.quiz_count}</p>` :
            `<h5 style="font-size:14px;font-weight:700;color:var(--brand-deep);margin:0 0 2px;">אין פעילות אחרונה</h5>
             <p style="font-size:12px;color:var(--text-secondary);margin:0;">התחל בוחן כדי לראות תוצאות</p>`}
        </div>
        ${lastQuizUnitData ? '<span class="hub-action-badge">בוחן אחרון</span>' : ''}
      </div>`;

    html += `</div>`; // close bento

    // Progress strip with animated counts
    html += `
      <div class="card card-static" style="padding:24px;margin-bottom:28px;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center;">
          <div>
            <p style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">יחידות שנקראו</p>
            <p class="dash-stats-num" style="font-size:2rem;font-family:var(--font-headline);color:var(--brand-deep);font-weight:800;"><span data-count="units-read">0</span>/${units.length}</p>
          </div>
          <div style="border-right:1px solid var(--border-card);border-left:1px solid var(--border-card);">
            <p style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">בחנים שהושלמו</p>
            <p class="dash-stats-num" style="font-size:2rem;font-family:var(--font-headline);color:var(--brand-deep);font-weight:800;"><span data-count="quizzes">0</span>/${units.length}</p>
          </div>
          <div>
            <p style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">התקדמות כוללת</p>
            <p class="dash-stats-num" style="font-size:2rem;font-family:var(--font-headline);color:${courseColor};font-weight:800;"><span data-count="pct-big">0</span>%</p>
          </div>
        </div>
      </div>`;

    // Spaced Repetition nudge — only shown when cards are due
    const cardsDue = API.getFlashcardsDueCount();
    if (cardsDue > 0) {
      html += `
        <div class="card card-static" style="margin-bottom:20px;display:flex;align-items:center;gap:14px;padding:18px 20px;border-right:4px solid var(--brand-blue);background:rgba(59,130,246,0.04);">
          <span class="material-symbols-outlined" style="font-size:28px;color:var(--brand-blue);flex-shrink:0;">replay</span>
          <div style="flex:1;">
            <h5 style="font-size:14px;font-weight:700;color:var(--brand-deep);margin:0 0 2px;">חזרה מרווחת</h5>
            <p style="font-size:12px;color:var(--text-secondary);margin:0;">יש לך <strong style="color:var(--brand-blue);">${cardsDue} כרטיסיות</strong> שמחכות לחזרה היום</p>
          </div>
          <button class="btn btn-outline" style="border-color:var(--brand-blue);color:var(--brand-blue);white-space:nowrap;flex-shrink:0;" onclick="FlashcardViewer._startSRAll()">
            התחל חזרה
            <span class="material-symbols-outlined" style="font-size:16px;">arrow_back</span>
          </button>
        </div>`;
    }

    // Quick actions
    const features = course?.features || [];
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
      html += `<div class="${actions.length > 1 ? 'dash-tools' : ''}" style="${actions.length === 1 ? 'margin-bottom:28px;' : ''}">
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
      const unitColor = u.color || courseColor;

      html += `
        <div class="card unit-card" data-unit-id="${u.id}">
          <div class="color-bar" style="background:${unitColor};opacity:${unitDone>0?1:0.3}"></div>
          <div class="unit-icon">${u.icon}</div>
          <div class="unit-title">${HEB.unit} ${u.id}: ${u.title}</div>
          <div class="unit-subtitle">${u.topic_count} נושאים • ${u.flashcard_count} כרטיסיות • ${u.quiz_count} שאלות</div>
          <div class="progress-bar" style="margin-bottom:6px;"><div class="progress-fill" style="width:0%;background:${unitColor}" data-unit-progress="${Math.round(unitDone/3*100)}"></div></div>
          <div class="unit-actions">
            <button class="btn btn-outline btn-sm" onclick="App.openUnit(${u.id},'learn')">${isRead?'✅':'📖'} למידה</button>
            <button class="btn btn-outline btn-sm" onclick="App.openUnit(${u.id},'cards')">${isCards?'✅':'🃏'} כרטיסיות</button>
            <button class="btn btn-outline btn-sm" onclick="App.openUnit(${u.id},'quiz')">${quizScore!==undefined?'✅ '+quizScore+'/'+u.quiz_count:'✏️ בוחן'}</button>
          </div>
        </div>`;
    }

    html += `</div></div>`;
    container.innerHTML = html;

    // Kick off animations after paint
    requestAnimationFrame(() => {
      // Ring
      const ring = container.querySelector('[data-ring="main"]');
      if (ring) {
        const offset = ringCircumference * (1 - pct / 100);
        // Delay slightly so the transition kicks in
        setTimeout(() => { ring.setAttribute('stroke-dashoffset', String(offset)); }, 60);
      }
      // Numeric counts
      App.animateCount(container.querySelector('[data-count="done-tasks"]'), doneTasks, 900);
      // pct has a <span>%</span> inside — we only animate the number node, preserving the %
      const pctEl = container.querySelector('[data-count="pct"]');
      if (pctEl) {
        const pctFirstNode = pctEl.firstChild;
        if (pctFirstNode && pctFirstNode.nodeType === 3) {
          const start = performance.now();
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (reduce) {
            pctFirstNode.nodeValue = String(pct);
          } else {
            const step = (now) => {
              const t = Math.min(1, (now - start) / 1000);
              const eased = 1 - Math.pow(1 - t, 3);
              pctFirstNode.nodeValue = String(Math.round(pct * eased));
              if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        }
      }
      App.animateCount(container.querySelector('[data-count="units-read"]'), (progress.units_read||[]).length, 900);
      App.animateCount(container.querySelector('[data-count="quizzes"]'), Object.keys(quizScores).length, 900);
      App.animateCount(container.querySelector('[data-count="pct-big"]'), pct, 1000);

      // Unit progress bars — animate from 0 → target
      container.querySelectorAll('.unit-card .progress-fill').forEach(fill => {
        const target = fill.dataset.unitProgress;
        if (target) setTimeout(() => { fill.style.width = target + '%'; }, 100);
      });
    });
  },

  /** Refresh just the animated numbers/ring after Firestore sync */
  _updateCounters(course, units, progress) {
    const container = document.getElementById('app-content');
    if (!container) return;
    const { doneTasks, pct } = this._computeStats(units, progress);
    const ringCircumference = 327;

    // Ring
    const ring = container.querySelector('[data-ring="main"]');
    if (ring) {
      ring.setAttribute('stroke-dashoffset', String(ringCircumference * (1 - pct / 100)));
    }

    // Done tasks text
    App.animateCount(container.querySelector('[data-count="done-tasks"]'), doneTasks, 600);
    // % big
    App.animateCount(container.querySelector('[data-count="pct-big"]'), pct, 600);
    // Units read / quizzes
    App.animateCount(container.querySelector('[data-count="units-read"]'), (progress.units_read||[]).length, 600);
    App.animateCount(container.querySelector('[data-count="quizzes"]'), Object.keys(progress.quiz_scores || {}).length, 600);
    // pct node inside hero
    const pctEl = container.querySelector('[data-count="pct"]');
    if (pctEl && pctEl.firstChild && pctEl.firstChild.nodeType === 3) {
      pctEl.firstChild.nodeValue = String(pct);
    }
  }
};
