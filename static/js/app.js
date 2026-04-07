/**
 * Main Application Controller / Router
 * Course 10645 - Interactive Learning System
 * Organic Premium Design
 */
window.App = {
  currentRoute: 'dashboard',
  currentUnitId: null,

  /** Initialize the app */
  async init() {
    console.log('🚀 מערכת לימודים 10645 — אתחול...');
    this.navigate('dashboard');
  },

  /** Navigate to a route */
  navigate(route, unitId) {
    this.currentRoute = route;
    if (unitId !== undefined) this.currentUnitId = unitId;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === route);
      // Toggle Material Symbol FILL for active item
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.style.fontVariationSettings = btn.dataset.route === route ? "'FILL' 1" : "'FILL' 0";
      }
    });

    // Close sidebar on mobile after navigation
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

  /** Open a unit in a specific mode */
  openUnit(unitId, mode) {
    this.currentUnitId = unitId;
    this.navigate(mode, unitId);
  },

  /** Toggle sidebar (mobile) */
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  },

  /** Close sidebar (mobile) */
  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  },

  /** Toggle chatbot panel */
  toggleChatbot() {
    const panel = document.getElementById('chatbot-panel');
    const trigger = document.getElementById('chatbot-trigger');
    if (panel) {
      panel.classList.toggle('open');
      if (trigger) trigger.style.display = panel.classList.contains('open') ? 'none' : 'flex';
    }
    // Close sidebar on mobile when opening chatbot
    this.closeSidebar();
  },

  /** Show a toast notification */
  toast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
