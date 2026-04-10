/**
 * Main Application Controller / Router
 * Lumina Academic — Multi-course Learning System
 */
window.App = {
  currentRoute: 'dashboard',
  currentUnitId: null,
  currentCourseId: null,
  courses: [],

  /** Initialize the app (called after auth login) */
  async init() {
    console.log('🚀 Lumina Academic — מערכת לימודים');
    await API._migrateOldProgress();

    // Load courses list
    try {
      this.courses = await API.getCourses();
    } catch (e) {
      console.error('Failed to load courses', e);
      this.courses = [];
    }

    // Restore last active course or default to first
    const saved = localStorage.getItem('active_course');
    const courseId = (saved && this.courses.find(c => c.id === saved)) ? saved : (this.courses[0]?.id || '10645');
    await this.switchCourse(courseId, true);
  },

  /** Switch active course */
  async switchCourse(courseId, isInit = false) {
    if (!isInit && this.currentCourseId === courseId) return;

    // Optimistic UI: mark the new course active immediately in the switcher
    document.querySelectorAll('.course-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.courseId === courseId);
    });

    // Subtle overlay for anything slower than ~150ms
    const targetCourse = this.courses.find(c => c.id === courseId);
    const overlay = isInit ? null : this._showSwitchOverlay(targetCourse);

    this.currentCourseId = courseId;
    try {
      await API.setCourse(courseId);
    } catch (e) {
      console.error('Failed to load course', courseId, e);
      this._hideSwitchOverlay(overlay);
      this.toast('שגיאה בטעינת הקורס', 'error', {
        label: 'נסה שוב',
        onClick: () => this.switchCourse(courseId)
      });
      return;
    }

    this._renderCourseSwitcher();
    this._updateSidebarFeatures();

    // Reset chatbot for new course
    if (typeof Chatbot !== 'undefined') {
      Chatbot.historyLoaded = false;
      Chatbot.messages = [];
      Chatbot._updateSystemPrompt();
    }

    this._hideSwitchOverlay(overlay);

    if (!isInit || this.currentRoute === 'dashboard') {
      this.currentUnitId = null;
      this.navigate('dashboard');
    }
  },

  _showSwitchOverlay(course) {
    let el = document.getElementById('course-switching-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'course-switching-overlay';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="switch-card">
      <div class="spinner-sm"></div>
      <span>עובר ל${course ? '-' + course.title : 'קורס'}...</span>
    </div>`;
    // Force reflow then add .active to trigger fade-in
    requestAnimationFrame(() => el.classList.add('active'));
    return el;
  },

  _hideSwitchOverlay(el) {
    if (!el) return;
    el.classList.remove('active');
    setTimeout(() => { if (el && el.parentNode) el.remove(); }, 300);
  },

  /** Render course switcher in sidebar */
  _renderCourseSwitcher() {
    const el = document.getElementById('course-switcher');
    if (!el) return;
    const current = API.getCurrentCourse();
    let html = '';
    for (const c of this.courses) {
      const isActive = c.id === this.currentCourseId;
      html += `<button class="course-btn ${isActive ? 'active' : ''}" data-course-id="${c.id}" onclick="App.switchCourse('${c.id}')" title="${c.title}">
        <span class="course-btn-icon">${c.icon}</span>
        <span class="course-btn-text">${c.id} — ${c.title}</span>
        <span class="material-symbols-outlined course-btn-check" style="${isActive ? '' : 'display:none'}">check_circle</span>
      </button>`;
    }
    el.innerHTML = html;

    // Update sidebar header
    const header = document.getElementById('sidebar-course-name');
    if (header && current) {
      header.textContent = current.title;
    }
  },

  /** Show/hide sidebar items based on course features */
  _updateSidebarFeatures() {
    const course = API.getCurrentCourse();
    const features = course?.features || [];
    document.querySelectorAll('.sidebar-link[data-feature]').forEach(btn => {
      const feature = btn.dataset.feature;
      btn.style.display = features.includes(feature) ? '' : 'none';
    });
  },

  /** Navigate to a route (async, with fade transition) */
  async navigate(route, unitId) {
    this.currentRoute = route;
    if (unitId !== undefined) this.currentUnitId = unitId;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === route);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.style.fontVariationSettings = btn.dataset.route === route ? "'FILL' 1" : "'FILL' 0";
      }
    });

    this.closeSidebar();
    const container = document.getElementById('app-content');

    // Only animate if user doesn't prefer reduced motion
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (container && !reduceMotion) {
      container.classList.add('page-leaving');
      await new Promise(r => setTimeout(r, 170));
      container.classList.remove('page-leaving');
      container.classList.add('page-entering');
      setTimeout(() => container.classList.remove('page-entering'), 320);
    }

    switch (route) {
      case 'dashboard':
        this.currentUnitId = null;
        Dashboard.render(container);
        break;
      case 'learn':
        UnitViewer.render(container, this.currentUnitId);
        break;
      case 'cards':
        FlashcardViewer.render(container, this.currentUnitId);
        break;
      case 'quiz':
        QuizViewer.render(container, this.currentUnitId);
        break;
      case 'exam':
        ExamViewer.render(container);
        break;
      case 'calculator':
        Calculator.render(container);
        break;
      case 'sandbox':
        if (typeof DiagramEditor !== 'undefined') {
          DiagramEditor.render(container);
        } else {
          container.innerHTML = '<div class="page"><div class="card" style="text-align:center">שגיאה בטעינת מערכת הציור</div></div>';
        }
        break;
      default:
        Dashboard.render(container);
    }
  },

  /** Animate a numeric counter from 0 to `to` over `duration` ms */
  animateCount(el, to, duration = 900) {
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !to || to <= 0) { el.textContent = String(Math.round(to || 0)); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = String(Math.round(to * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  openUnit(unitId, mode) {
    this.currentUnitId = unitId;
    this.navigate(mode, unitId);
  },

  _isMobile() { return window.innerWidth <= 1024; },

  /** Animate sidebar open/close via rAF — bypasses CSS transition quirks on fixed elements */
  _animateSidebar(open) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (!this._isMobile()) { sidebar.style.transform = ''; return; }

    // Cancel any in-progress animation
    if (this._sidebarRaf) cancelAnimationFrame(this._sidebarRaf);

    // Parse current translateX% from inline style or default
    const current = sidebar.style.transform;
    const match = current.match(/translateX\(([\d.]+)%\)/);
    // Default to 120 (off-screen) when no inline style — matches the CSS initial state
    const startPct = match ? parseFloat(match[1]) : 120;
    const endPct = open ? 0 : 120;
    const duration = 320;
    const ease = t => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const startTime = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const pct = startPct + (endPct - startPct) * ease(t);
      sidebar.style.transform = `translateX(${pct.toFixed(2)}%)`;
      if (t < 1) { this._sidebarRaf = requestAnimationFrame(step); }
      else { sidebar.style.transform = `translateX(${endPct}%)`; this._sidebarRaf = null; }
    };
    this._sidebarRaf = requestAnimationFrame(step);
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    const opening = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', opening);
    overlay?.classList.toggle('active', opening);
    this._animateSidebar(opening);
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    sidebar.classList.remove('open');
    overlay?.classList.remove('active');
    this._animateSidebar(false);
  },

  toggleChatbot() {
    const panel = document.getElementById('chatbot-panel');
    const trigger = document.getElementById('chatbot-trigger');
    if (panel) {
      panel.classList.toggle('open');
      if (trigger) trigger.style.display = panel.classList.contains('open') ? 'none' : 'flex';
      if (panel.classList.contains('open') && typeof Chatbot !== 'undefined') {
        Chatbot.loadHistory();
      }
    }
    this.closeSidebar();
  },

  /**
   * Show a toast notification.
   * @param {string} message - The message to show
   * @param {'success'|'error'} type - Visual style
   * @param {{label: string, onClick: Function}} [action] - Optional action button
   */
  toast(message, type = 'success', action = null) {
    const tc = document.getElementById('toast-container');
    if (!tc) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const text = document.createElement('span');
    text.textContent = message;
    t.appendChild(text);
    if (action && action.label && typeof action.onClick === 'function') {
      const btn = document.createElement('button');
      btn.className = 'toast-action';
      btn.textContent = action.label;
      btn.onclick = (e) => {
        e.stopPropagation();
        try { action.onClick(); } catch (err) { console.warn(err); }
        this._dismissToast(t);
      };
      t.appendChild(btn);
    }
    tc.appendChild(t);

    const duration = type === 'error' ? 7000 : 5000;
    let timer = setTimeout(() => this._dismissToast(t), duration);

    // Pause dismiss on hover
    t.addEventListener('mouseenter', () => { clearTimeout(timer); });
    t.addEventListener('mouseleave', () => { timer = setTimeout(() => this._dismissToast(t), 2000); });
  },

  _dismissToast(t) {
    if (!t || !t.parentNode) return;
    t.classList.add('leaving');
    setTimeout(() => { if (t.parentNode) t.remove(); }, 300);
  }
};
