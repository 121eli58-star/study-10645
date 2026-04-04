/**
 * Main Application Controller / Router
 * Course 10645 - Interactive Learning System
 */
window.App = {
  currentRoute: 'dashboard',
  currentUnitId: null,

  /** Initialize the app */
  async init() {
    console.log('🚀 מערכת לימודים 10645 - אתחול...');
    this.navigate('dashboard');
  },

  /** Navigate to a route */
  navigate(route, unitId) {
    this.currentRoute = route;
    if (unitId !== undefined) this.currentUnitId = unitId;

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === route);
    });

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
        this._renderSandboxPlaceholder(container);
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
  },

  /** Sandbox placeholder (will be replaced in Phase 3+) */
  _renderSandboxPlaceholder(container) {
    container.innerHTML = `<div class="page fade-in">
      <div class="section-header">
        <h2>✏️ סנדבוקס תרשימים</h2>
      </div>
      <div class="card">
        <div class="sandbox-placeholder">
          <div class="icon">🎨</div>
          <h3>בקרוב! סביבת ציור אינטראקטיבית</h3>
          <p style="max-width:400px;text-align:center;color:#94a3b8">
            כאן תוכל לצייר תרשימי DFD, ERD, תרשימי זרימה, עצי תפריטים ותרשימי מחלקות.
            המערכת תבדוק את התרשימים שלך ותתן משוב מפורט.
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:16px">
            <div class="btn btn-outline" style="cursor:default">🔄 DFD</div>
            <div class="btn btn-outline" style="cursor:default">🔗 ERD</div>
            <div class="btn btn-outline" style="cursor:default">🔀 תרשים זרימה</div>
            <div class="btn btn-outline" style="cursor:default">🌳 עץ תפריטים</div>
            <div class="btn btn-outline" style="cursor:default">📐 תרשים מחלקות</div>
          </div>
        </div>
      </div>
    </div>`;
  }
};

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
