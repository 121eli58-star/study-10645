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
    this.currentCourseId = courseId;
    try {
      await API.setCourse(courseId);
    } catch (e) {
      console.error('Failed to load course', courseId, e);
      return;
    }

    this._renderCourseSwitcher();
    this._updateSidebarFeatures();

    if (!isInit || this.currentRoute === 'dashboard') {
      this.currentUnitId = null;
      this.navigate('dashboard');
    }

    // Reset chatbot for new course
    if (typeof Chatbot !== 'undefined') {
      Chatbot.historyLoaded = false;
      Chatbot.messages = [];
      Chatbot._updateSystemPrompt();
    }
  },

  /** Render course switcher in sidebar */
  _renderCourseSwitcher() {
    const el = document.getElementById('course-switcher');
    if (!el) return;
    const current = API.getCurrentCourse();
    let html = '';
    for (const c of this.courses) {
      const isActive = c.id === this.currentCourseId;
      html += `<button class="course-btn ${isActive ? 'active' : ''}" onclick="App.switchCourse('${c.id}')" title="${c.title}">
        <span class="course-btn-icon">${c.icon}</span>
        <span class="course-btn-text">${c.id} — ${c.title}</span>
        ${isActive ? '<span class="material-symbols-outlined course-btn-check">check_circle</span>' : ''}
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

  /** Navigate to a route */
  navigate(route, unitId) {
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

  openUnit(unitId, mode) {
    this.currentUnitId = unitId;
    this.navigate(mode, unitId);
  },

  toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('active');
  },

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
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

  toast(message, type = 'success') {
    const tc = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = message;
    tc.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s';
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }
};
