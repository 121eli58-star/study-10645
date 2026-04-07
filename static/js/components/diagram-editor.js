/**
 * Diagram Editor Component - Advanced Studio
 * Supports: Flowchart, ERD (advanced), DFD (advanced), Class Diagram (advanced), Menu Tree
 * Plus placeholder categories for future expansion.
 */
window.DiagramEditor = {
  container: null,
  nodes: [],
  edges: [],
  diagramType: 'flowchart',
  selectedEdgeType: 'arrow', // current line type tool selected

  canvasEl: null,
  svgEl: null,
  toolboxEl: null,

  dragState: null,        // { node, offsetX, offsetY, el }
  connectionState: null,  // { sourceId, pendingLine }
  editingNodeId: null,

  // ─── Tool Definitions ────────────────────────────────────────────
  tools: {
    flowchart: {
      nodes: [
        { type: 'start',       label: '⬭ התחלה / סוף',      shape: 'ellipse'      },
        { type: 'process',     label: '▭ תהליך',             shape: 'rect'         },
        { type: 'decision',    label: '◇ תנאי (Decision)',    shape: 'diamond'      },
        { type: 'io',          label: '▱ קלט / פלט',         shape: 'parallelogram'},
        { type: 'connector',   label: '○ מחבר',              shape: 'circle'       }
      ],
      edges: [
        { type: 'arrow',       label: '→ קו זרימה' }
      ]
    },
    erd: {
      nodes: [
        { type: 'entity',         label: '▭ ישות (Entity)',              shape: 'rect'            },
        { type: 'weak_entity',    label: '▭▭ ישות חלשה',                shape: 'rect_double'     },
        { type: 'relationship',   label: '◇ קשר (Relationship)',         shape: 'diamond'         },
        { type: 'weak_rel',       label: '◇◇ קשר חלש',                  shape: 'diamond_double'  },
        { type: 'attribute',      label: '○ תכונה (Attribute)',           shape: 'ellipse'         },
        { type: 'key_attr',       label: '○̲ מפתח (Key Attribute)',        shape: 'ellipse_key'     },
        { type: 'multival_attr',  label: '○○ ריבוי ערכים',               shape: 'ellipse_double'  },
        { type: 'assoc_entity',   label: '▭◇ ישות אסוציאטיבית',          shape: 'assoc_entity'    }
      ],
      edges: [
        { type: 'rel_line',       label: '─ קו קשר' },
        { type: 'gen_line',       label: '─▷ הכללה (Generalization)' }
      ]
    },
    dfd: {
      nodes: [
        { type: 'dfd_process',    label: '⊙ תהליך (Process)',            shape: 'dfd_process'     },
        { type: 'external',       label: '▭‖ ישות חיצונית',              shape: 'external_entity' },
        { type: 'data_store',     label: '⊏ מאגר נתונים',               shape: 'data_store'      }
      ],
      edges: [
        { type: 'data_flow',      label: '→ זרם נתונים (labeled)' }
      ]
    },
    class_diagram: {
      nodes: [
        { type: 'class',          label: '▭ מחלקה (Class)',              shape: 'class_box'       },
        { type: 'interface',      label: '▭ ממשק (Interface)',           shape: 'class_box'       },
        { type: 'abstract_class', label: '▭ מחלקה מופשטת',              shape: 'class_box'       }
      ],
      edges: [
        { type: 'inheritance',    label: '─▷ ירושה (Generalization)' },
        { type: 'realization',    label: '╌▷ מימוש (Realization)' },
        { type: 'aggregation',    label: '─◇ צבירה (Aggregation)' },
        { type: 'composition',    label: '─◆ הרכב (Composition)' },
        { type: 'association',    label: '─ אסוציאציה' },
        { type: 'dependency',     label: '╌> תלות' }
      ]
    },
    menu_tree: {
      nodes: [
        { type: 'menu',           label: '▭ תפריט ראשי',                shape: 'rect'            },
        { type: 's_node',         label: '▭ בחירה / שורה',              shape: 'rect'            }
      ],
      edges: [
        { type: 'arrow',          label: '→ חץ' }
      ]
    }
  },

  placeholders: [
    { value: 'usecase',    label: 'Use Case Diagram (בקרוב)' },
    { value: 'activity',   label: 'Activity Diagram (בקרוב)' },
    { value: 'component',  label: 'Component Diagram (בקרוב)' },
    { value: 'deployment', label: 'Deployment Diagram (בקרוב)' }
  ],

  // ─── Render Entry Point ────────────────────────────────────────
  render(container) {
    this.container = container;
    this.nodes = [];
    this.edges = [];
    this.dragState = null;
    this.connectionState = null;
    this.selectedEdgeType = null;

    container.innerHTML = `
      <div class="page de-page fade-in">
        <div class="de-topbar">
          <h2 style="margin:0; font-size:18px; white-space:nowrap;">✏️ Studio תרשימים</h2>
          <div class="de-topbar-controls">
            <select id="diagram-type-select" class="de-select">
              <optgroup label="─ תרשימים פעילים ─">
                <option value="flowchart">תרשים זרימה (Flowchart)</option>
                <option value="erd">ERD - ישויות-קשרים</option>
                <option value="dfd">DFD - זרימת נתונים</option>
                <option value="class_diagram">מחלקות UML</option>
                <option value="menu_tree">עץ תפריטים</option>
              </optgroup>
              <optgroup label="─ בקרוב ─">
                ${this.placeholders.map(p => `<option value="${p.value}" disabled>${p.label}</option>`).join('')}
              </optgroup>
            </select>
            <button class="de-btn de-btn-outline" id="btn-clear">🗑 נקה</button>
            <button class="de-btn de-btn-validate" id="btn-validate">✨ בדוק תרשים</button>
          </div>
        </div>

        <div class="de-workspace">
          <!-- Sidebar Toolbox -->
          <div class="de-sidebar" id="de-sidebar">
            <div class="de-sidebar-header">ארגז כלים</div>
            <div id="toolbox-nodes" class="de-tool-group"></div>
            <div class="de-sidebar-divider">קווי חיבור</div>
            <div id="toolbox-edges" class="de-tool-group"></div>
          </div>

          <!-- Canvas -->
          <div class="de-canvas-wrap" id="canvas-wrapper">
            <svg id="svg-layer" class="de-svg"></svg>
            <div id="canvas-area" class="de-canvas"></div>
          </div>

          <!-- Validation Panel (overlay) -->
          <div class="de-val-panel" id="validation-panel" style="display:none">
            <div class="de-val-header">
              <span>📋 תוצאת בדיקה</span>
              <button id="close-validation" class="de-val-close">✖</button>
            </div>
            <div id="validation-content" class="de-val-content"></div>
            
            <div class="de-exercise-panel">
              <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">הזן את הנחיות התרגיל (אופציונלי לאבחון AI):</label>
              <textarea id="val-exercise-prompt" placeholder="לדוגמה: ספרייה משאילה ספרים..."></textarea>
            </div>
          </div>
          
          <!-- Property Panel (overlay) -->
          <div class="de-props-panel" id="props-panel" style="display:none">
            <span class="de-props-close" id="props-close">✖</span>
            <h3>ערוך צומת</h3>
            <label>תווית / טקסט:</label>
            <textarea id="prop-label" rows="3"></textarea>
            <label>צבע רקע:</label>
            <input type="color" id="prop-color" value="#1e293b">
            <label>צבע גבול/טקסט:</label>
            <input type="color" id="prop-stroke" value="#60a5fa">
          </div>
        </div>
      </div>
    `;

    this.canvasEl  = document.getElementById('canvas-area');
    this.svgEl     = document.getElementById('svg-layer');
    this.toolboxEl = document.getElementById('toolbox-nodes');

    this.renderToolbox();
    this.bindEvents();
  },

  // ─── Toolbox Rendering ─────────────────────────────────────────
  renderToolbox() {
    const type = document.getElementById('diagram-type-select').value;
    this.diagramType  = type;
    this.selectedEdgeType = null;

    const def = this.tools[type];
    if (!def) { this._clearToolbox(); return; }

    // Node tools (include free text in all diagrams)
    const activeNodes = [...def.nodes, { type: 'free_text', label: 'T טקסט חופשי', shape: 'free_text' }];
    document.getElementById('toolbox-nodes').innerHTML = activeNodes.map(t =>
      `<div class="de-toolbox-item" draggable="true"
            data-type="${t.type}" data-shape="${t.shape}" data-label="${t.label}">
         <span class="de-tool-preview ${t.shape}"></span>
         <span class="de-tool-label">${t.label}</span>
       </div>`
    ).join('');

    // Edge tools
    document.getElementById('toolbox-edges').innerHTML = def.edges.map(e =>
      `<div class="de-edge-tool" data-edge-type="${e.type}">${e.label}</div>`
    ).join('');

    this._bindToolboxDrag();
    this._bindEdgeTools();
  },

  _clearToolbox() {
    document.getElementById('toolbox-nodes').innerHTML = '<p class="de-placeholder-note">בקרוב...</p>';
    document.getElementById('toolbox-edges').innerHTML = '';
  },

  _bindToolboxDrag() {
    document.querySelectorAll('.de-toolbox-item').forEach(el => {
      el.addEventListener('dragstart', e => {
        const payload = JSON.stringify({
          type:  el.dataset.type,
          shape: el.dataset.shape,
          label: el.dataset.label
        });
        e.dataTransfer.setData('text/plain', payload);
        window.__deDragPayload = payload;
      });
    });
  },

  _bindEdgeTools() {
    document.querySelectorAll('.de-edge-tool').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.de-edge-tool').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        this.selectedEdgeType = el.dataset.edgeType;
        // Show cursor hint
        this.canvasEl.style.cursor = 'crosshair';
        App.toast(`כלי חיבור נבחר: ${el.textContent.trim()}`, 'success');
      });
    });
  },

  // ─── Events ───────────────────────────────────────────────────
  bindEvents() {
    document.getElementById('diagram-type-select').addEventListener('change', () => {
      this.clearCanvas();
      this.renderToolbox();
    });
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('למחוק את כל התרשים?')) this.clearCanvas();
    });
    document.getElementById('btn-validate').addEventListener('click', () => this.validateDiagram());
    document.getElementById('close-validation').addEventListener('click', () => {
      document.getElementById('validation-panel').style.display = 'none';
      this.clearErrors();
    });

    const wrapper = document.getElementById('canvas-wrapper');
    wrapper.addEventListener('dragenter', e => { e.preventDefault(); });
    wrapper.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    wrapper.addEventListener('drop', e => {
      e.preventDefault();
      let raw = e.dataTransfer.getData('text/plain');
      if (!raw || raw === 'drag') raw = window.__deDragPayload;
      if (!raw) return;

      const data = JSON.parse(raw);
      const rect = this.canvasEl.getBoundingClientRect();
      const dropX = e.clientX - rect.left - 70;
      const dropY = e.clientY - rect.top - 30;
      this.addNode(data.type, data.shape, data.label, dropX, dropY);
    });

    this.canvasEl.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup',   this.onMouseUp.bind(this));

    // Deselect and close properties on empty click
    this.canvasEl.addEventListener('click', e => {
      if (e.target === this.canvasEl) {
        this.selectedEdgeType = null;
        this.canvasEl.style.cursor = 'default';
        document.querySelectorAll('.de-edge-tool').forEach(x => x.classList.remove('active'));
        document.getElementById('props-panel').style.display = 'none';
        this.editingNodeId = null;
      }
    });

    // Properties panel events
    document.getElementById('props-close').addEventListener('click', () => {
      document.getElementById('props-panel').style.display = 'none';
      this.editingNodeId = null;
    });

    const updateNodeProperty = () => {
      if (!this.editingNodeId) return;
      const node = this.nodes.find(n => n.id === this.editingNodeId);
      if (node) {
        node.label = document.getElementById('prop-label').value;
        node.properties.bgColor = document.getElementById('prop-color').value;
        node.properties.strokeColor = document.getElementById('prop-stroke').value;
        
        const el = document.getElementById(node.id);
        const ports = el.querySelectorAll('.de-port, .de-node-del');
        const portHtml = Array.from(ports).map(p => p.outerHTML).join('');
        el.innerHTML = this._nodeInnerHTML(node) + portHtml;
        this._redrawEdges();
      }
    };

    document.getElementById('prop-label').addEventListener('input', updateNodeProperty);
    document.getElementById('prop-color').addEventListener('input', updateNodeProperty);
    document.getElementById('prop-stroke').addEventListener('input', updateNodeProperty);
  },

  // ─── Node CRUD ────────────────────────────────────────────────
  addNode(type, shape, labelText, x, y) {
    const id    = 'n_' + Date.now() + '_' + Math.floor(Math.random() * 999);
    const label = this._defaultLabel(type, labelText);
    const defaultColor = shape === 'free_text' ? 'transparent' : '#1e293b';
    const defaultStroke = shape === 'free_text' ? '#f8fafc' : '#60a5fa'; // White text by default
    this.nodes.push({ id, type, shape, label, x: Math.max(0,x), y: Math.max(0,y), properties: { bgColor: defaultColor, strokeColor: defaultStroke } });
    this._renderOneNode(this.nodes[this.nodes.length - 1]);
    this._redrawEdges();
  },

  _defaultLabel(type, fallback) {
    const map = {
      start: 'התחלה', end: 'סוף', process: 'תהליך', decision: 'תנאי',
      io: 'קלט/פלט', connector: '',
      entity: 'ישות', weak_entity: 'ישות חלשה', relationship: 'קשר',
      weak_rel: 'קשר חלש', attribute: 'תכונה', key_attr: 'מפתח', multival_attr: 'תכונה',
      assoc_entity: 'קשר',
      dfd_process: '1\nשם תהליך', external: 'ישות חיצונית', data_store: 'D1 מאגר',
      class: 'ClassName\n─────\n+ attr: Type\n─────\n+ method()', 
      interface: '«interface»\nIName\n─────\n+ method()',
      abstract_class: '{abstract}\nClassName\n─────\n+ attr\n─────',
      menu: 'תפריט ראשי', s_node: 'בחירה',
      free_text: 'טקסט חופשי'
    };
    return map[type] || fallback || 'צומת';
  },

  removeNode(id) {
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
    const el = document.getElementById(id);
    if (el) el.remove();
    this._redrawEdges();
  },

  clearCanvas() {
    this.nodes = []; this.edges = [];
    this.canvasEl.innerHTML = '';
    this.svgEl.innerHTML   = '';
    const vp = document.getElementById('validation-panel');
    if (vp) vp.style.display = 'none';
  },

  // ─── Node Rendering ───────────────────────────────────────────
  _renderOneNode(node) {
    const el = document.createElement('div');
    el.id          = node.id;
    el.className   = 'de-node';
    el.dataset.shape = node.shape || 'rect';
    el.style.left  = node.x + 'px';
    el.style.top   = node.y + 'px';

    el.innerHTML = this._nodeInnerHTML(node) + `
      <div class="de-port de-port-top"    data-port="top"></div>
      <div class="de-port de-port-bottom" data-port="bottom"></div>
      <div class="de-port de-port-left"   data-port="left"></div>
      <div class="de-port de-port-right"  data-port="right"></div>
      <div class="de-node-del" title="מחק">✕</div>
    `;
    this.canvasEl.appendChild(el);

    // Double-click to edit label
    el.addEventListener('dblclick', () => this._editNodeLabel(node, el));
  },

  _nodeInnerHTML(node) {
    const shape = node.shape;
    const lines = node.label.split('\n');
    const props = node.properties || {};
    // Use fallback colors if not provided
    const bg = props.bgColor || '#1e293b';
    const strk = props.strokeColor || '#60a5fa';

    if (shape === 'free_text') {
      return `<svg class="de-shape-svg" width="140" height="60" viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg">
        <text x="70" y="36" text-anchor="middle" font-size="14" fill="${strk}" font-weight="bold">${lines[0]}</text>
      </svg>`;
    }
    if (shape === 'dfd_process') {
      return `<svg class="de-shape-svg dfd-proc-svg" width="140" height="70" viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="70" cy="35" rx="68" ry="33" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <line x1="2" y1="18" x2="138" y2="18" stroke="${strk}" stroke-width="1.5"/>
        <text x="70" y="13" text-anchor="middle" font-size="10" fill="#94a3b8">${lines[0] || '1'}</text>
        <text x="70" y="48" text-anchor="middle" font-size="12" fill="#f1f5f9">${lines[1] || 'תהליך'}</text>
      </svg>`;
    }
    if (shape === 'external_entity') {
      return `<svg class="de-shape-svg ext-ent-svg" width="140" height="60" viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="136" height="56" rx="0" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <rect x="8" y="7" width="124" height="46" rx="0" fill="none" stroke="${strk}" stroke-width="1.5"/>
        <text x="70" y="36" text-anchor="middle" font-size="13" fill="#f1f5f9">${lines[0]}</text>
      </svg>`;
    }
    if (shape === 'data_store') {
      return `<svg class="de-shape-svg data-store-svg" width="140" height="60" viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M 20,2 L 138,2 L 138,58 L 20,58" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <line x1="20" y1="2" x2="20" y2="58" stroke="${strk}" stroke-width="2"/>
        <text x="80" y="36" text-anchor="middle" font-size="12" fill="#f1f5f9">${lines[0]}</text>
      </svg>`;
    }
    if (shape === 'assoc_entity') {
      return `<svg class="de-shape-svg assoc-svg" width="140" height="80" viewBox="0 0 140 80" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="136" height="76" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <polygon points="70,15 128,40 70,65 12,40" fill="${bg}" stroke="${strk}" stroke-width="1.5"/>
        <text x="70" y="44" text-anchor="middle" font-size="12" fill="#f1f5f9">${lines[0]}</text>
      </svg>`;
    }
    if (shape === 'rect_double') {
      return `<svg class="de-shape-svg" width="140" height="60" viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="2"  y="2"  width="136" height="56" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <rect x="7"  y="7"  width="126" height="46" fill="none"    stroke="${strk}" stroke-width="1.5"/>
        <text x="70" y="36" text-anchor="middle" font-size="13" fill="#f1f5f9">${lines[0]}</text>
      </svg>`;
    }
    if (shape === 'diamond_double') {
      return `<svg class="de-shape-svg" width="140" height="80" viewBox="0 0 140 80" xmlns="http://www.w3.org/2000/svg">
        <polygon points="70,2  138,40 70,78 2,40"   fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <polygon points="70,10 128,40 70,70 12,40"  fill="${bg}" stroke="${strk}" stroke-width="1.5"/>
        <text x="70" y="44" text-anchor="middle" font-size="12" fill="#f1f5f9">${lines[0]}</text>
      </svg>`;
    }
    if (shape === 'ellipse_key') {
      return `<svg class="de-shape-svg" width="120" height="50" viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="60" cy="25" rx="57" ry="22" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <text x="60" y="30" text-anchor="middle" font-size="13" fill="#f1f5f9" text-decoration="underline">${lines[0]}</text>
      </svg>`;
    }
    if (shape === 'ellipse_double') {
      return `<svg class="de-shape-svg" width="120" height="50" viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="60" cy="25" rx="57" ry="22" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <ellipse cx="60" cy="25" rx="50" ry="16" fill="none"    stroke="${strk}" stroke-width="1.5"/>
        <text x="60" y="30" text-anchor="middle" font-size="13" fill="#f1f5f9">${lines[0]}</text>
      </svg>`;
    }
    if (shape === 'class_box') {
      const hdr = lines[0] || 'Class';
      const attrs = lines.slice(1).join('\n');
      const parts = attrs.split('─────');
      const attrText = parts[0] || '';
      const methText = parts[1] || '';
      const renderLines = (txt) => txt.split('\n').filter(Boolean).map(
        (l, i) => `<text x="5" y="${16 + i*15}" font-size="11" fill="#cbd5e1">${l.replace(/&/g,'&amp;')}</text>`
      ).join('');
      const aLines = attrText.split('\n').filter(Boolean).length;
      const mLines = methText.split('\n').filter(Boolean).length;
      const h = 20 + 15*(aLines + mLines + 1) + 10;
      return `<svg class="de-shape-svg class-svg" width="160" height="${h}" viewBox="0 0 160 ${h}" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="158" height="${h-2}" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <line x1="1" y1="22" x2="159" y2="22" stroke="${strk}" stroke-width="1.5"/>
        <text x="80" y="16" text-anchor="middle" font-size="13" fill="#93c5fd" font-weight="bold">${hdr}</text>
        <g transform="translate(5,28)">${renderLines(attrText)}</g>
        <line x1="1" y1="${28+aLines*15}" x2="159" y2="${28+aLines*15}" stroke="#475569" stroke-width="1"/>
        <g transform="translate(5,${34+aLines*15})">${renderLines(methText)}</g>
      </svg>`;
    }
    // diamond
    if (shape === 'diamond') {
      return `<svg class="de-shape-svg" width="120" height="70" viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg">
        <polygon points="60,3 117,35 60,67 3,35" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <text x="60" y="39" text-anchor="middle" font-size="12" fill="#f1f5f9">${lines[0]}</text>
      </svg>`;
    }
    // ellipse
    if (shape === 'ellipse' || shape === 'circle') {
      return `<svg class="de-shape-svg" width="120" height="60" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="60" cy="30" rx="58" ry="27" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <text x="60" y="35" text-anchor="middle" font-size="13" fill="#f1f5f9">${lines[0]}</text>
      </svg>`;
    }
    // parallelogram
    if (shape === 'parallelogram') {
      return `<svg class="de-shape-svg" width="140" height="60" viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg">
        <polygon points="20,2 138,2 120,58 2,58" fill="${bg}" stroke="${strk}" stroke-width="2"/>
        <text x="70" y="36" text-anchor="middle" font-size="13" fill="#f1f5f9">${lines[0]}</text>
      </svg>`;
    }
    // default rect
    return `<svg class="de-shape-svg" width="140" height="60" viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="136" height="56" rx="4" fill="${bg}" stroke="${strk}" stroke-width="2"/>
      <text x="70" y="36" text-anchor="middle" font-size="13" fill="#f1f5f9">${lines[0]}</text>
    </svg>`;
  },

  // ─── Edge Rendering ───────────────────────────────────────────
  _redrawEdges() {
    // Remove all edge elements
    this.svgEl.querySelectorAll('.de-edge-g').forEach(e => e.remove());
    this.edges.forEach(edge => {
      const g = this._buildEdgeSvg(edge);
      if (g) this.svgEl.appendChild(g);
    });
  },

  _buildEdgeSvg(edge) {
    const src = this.nodes.find(n => n.id === edge.source);
    const tgt = this.nodes.find(n => n.id === edge.target);
    if (!src || !tgt) return null;

    // Center points (approximate)
    const sx = src.x + 70, sy = src.y + 35;
    const tx = tgt.x + 70, ty = tgt.y + 35;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'de-edge-g');
    g.setAttribute('id', 'eg_' + edge.id);

    const type = edge.type || 'arrow';

    // Path
    const dy = Math.abs(ty - sy) * 0.5;
    const pathD = `M ${sx} ${sy} C ${sx} ${sy+dy}, ${tx} ${ty-dy}, ${tx} ${ty}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');

    // Styling by type
    this._applyEdgeStyle(path, type);

    // Marker (arrowhead / diamond etc.)
    const markerId = `mk_${edge.id}`;
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = this._buildMarker(markerId, type);
    if (marker) {
      defs.appendChild(marker);
      g.appendChild(defs);
      if (['aggregation','composition','gen_line','inheritance','realization'].includes(type)) {
        path.setAttribute('marker-start', `url(#${markerId})`);
      } else {
        path.setAttribute('marker-end', `url(#${markerId})`);
      }
    }
    g.appendChild(path);

    // Label
    if (edge.label) {
      const mx = (sx + tx) / 2, my = (sy + ty) / 2 - 10;
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', mx); txt.setAttribute('y', my);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('font-size', '12');
      txt.setAttribute('fill', '#94a3b8');
      txt.textContent = edge.label;
      g.appendChild(txt);
    }

    // Cardinality labels for ERD
    if (edge.cardSrc || edge.cardTgt) {
      if (edge.cardSrc) {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', sx + (tx > sx ? 18 : -18));
        t.setAttribute('y', sy + (ty > sy ? 14 : -14));
        t.setAttribute('font-size', '11'); t.setAttribute('fill', '#fbbf24');
        t.textContent = edge.cardSrc;
        g.appendChild(t);
      }
      if (edge.cardTgt) {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', tx + (sx > tx ? 18 : -18));
        t.setAttribute('y', ty + (sy > ty ? 14 : -14));
        t.setAttribute('font-size', '11'); t.setAttribute('fill', '#fbbf24');
        t.textContent = edge.cardTgt;
        g.appendChild(t);
      }
    }

    return g;
  },

  _applyEdgeStyle(path, type) {
    const base = { stroke: '#94a3b8', strokeWidth: '2.5', strokeDash: 'none' };
    const styles = {
      arrow:       { stroke: '#94a3b8', strokeWidth: '2.5' },
      data_flow:   { stroke: '#60a5fa', strokeWidth: '2.5' },
      rel_line:    { stroke: '#94a3b8', strokeWidth: '2.5' },
      gen_line:    { stroke: '#94a3b8', strokeWidth: '2.5' },
      inheritance: { stroke: '#a78bfa', strokeWidth: '2.5' },
      realization: { stroke: '#a78bfa', strokeWidth: '2.5', dash: '8,4' },
      aggregation: { stroke: '#34d399', strokeWidth: '2.5' },
      composition: { stroke: '#f87171', strokeWidth: '2.5' },
      association: { stroke: '#94a3b8', strokeWidth: '2' },
      dependency:  { stroke: '#94a3b8', strokeWidth: '2',   dash: '6,4' }
    };
    const s = styles[type] || base;
    path.setAttribute('stroke', s.stroke || base.stroke);
    path.setAttribute('stroke-width', s.strokeWidth || base.strokeWidth);
    if (s.dash) path.setAttribute('stroke-dasharray', s.dash);
  },

  _buildMarker(id, type) {
    const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    m.setAttribute('id', id);
    m.setAttribute('markerUnits', 'strokeWidth');
    m.setAttribute('markerWidth', '10');
    m.setAttribute('markerHeight', '10');
    m.setAttribute('refX', '5');
    m.setAttribute('refY', '5');
    m.setAttribute('orient', 'auto');

    if (type === 'arrow' || type === 'data_flow' || type === 'association') {
      m.setAttribute('refX', '8');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M0,0 L0,10 L10,5 z');
      p.setAttribute('fill', '#94a3b8');
      m.appendChild(p);
      return m;
    }
    if (type === 'dependency') {
      m.setAttribute('refX', '8');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M0,0 L0,10 L10,5 z');
      p.setAttribute('fill', '#94a3b8'); p.setAttribute('opacity', '0.7');
      m.appendChild(p); return m;
    }
    if (type === 'inheritance' || type === 'gen_line' || type === 'realization') {
      m.setAttribute('refX', '1'); m.setAttribute('markerWidth', '12'); m.setAttribute('markerHeight', '12');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      p.setAttribute('points', '0,5 10,0 10,10');
      p.setAttribute('fill', '#1e293b'); p.setAttribute('stroke', '#a78bfa'); p.setAttribute('stroke-width', '1.5');
      m.appendChild(p); return m;
    }
    if (type === 'aggregation') {
      m.setAttribute('refX', '1'); m.setAttribute('markerWidth', '14'); m.setAttribute('markerHeight', '8');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      p.setAttribute('points', '0,4 6,0 12,4 6,8');
      p.setAttribute('fill', '#1e293b'); p.setAttribute('stroke', '#34d399'); p.setAttribute('stroke-width', '1.5');
      m.appendChild(p); return m;
    }
    if (type === 'composition') {
      m.setAttribute('refX', '1'); m.setAttribute('markerWidth', '14'); m.setAttribute('markerHeight', '8');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      p.setAttribute('points', '0,4 6,0 12,4 6,8');
      p.setAttribute('fill', '#f87171'); p.setAttribute('stroke', '#f87171');
      m.appendChild(p); return m;
    }
    if (type === 'rel_line') return null; // plain line, no marker
    return null;
  },

  // Update all edges when node moves
  _updateEdgesForNode(nodeId) {
    this._redrawEdges(); // Simple: redraw all
  },

  // ─── Mouse Interaction ────────────────────────────────────────
  onMouseDown(e) {
    if (e.target.classList.contains('de-node-del')) {
      this.removeNode(e.target.closest('.de-node').id);
      return;
    }
    if (e.target.classList.contains('de-port')) {
      const nodeEl = e.target.closest('.de-node');
      if (!nodeEl) return;

      // Auto-select a default edge if none selected
      if (!this.selectedEdgeType) {
        const defEdges = this.tools[this.diagramType]?.edges;
        if (defEdges && defEdges.length > 0) {
          this.selectedEdgeType = defEdges[0].type;
        }
      }

      if (this.selectedEdgeType) {
        this.connectionState = { sourceId: nodeEl.id };
        // Draw temp line
        const tmpLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tmpLine.setAttribute('id', 'tmp-edge');
        tmpLine.setAttribute('stroke', '#60a5fa');
        tmpLine.setAttribute('stroke-width', '2');
        tmpLine.setAttribute('fill', 'none');
        tmpLine.setAttribute('stroke-dasharray', '6,3');
        this.svgEl.appendChild(tmpLine);
        this.connectionState.tmpLine = tmpLine;
      }
      return;
    }

    const nodeEl = e.target.closest('.de-node');
    if (nodeEl) {
      if (this.selectedEdgeType) return; // In connection mode, ports handle it
      const node = this.nodes.find(n => n.id === nodeEl.id);
      if (!node) return;
      this.clearErrors();
      const rect = this.canvasEl.getBoundingClientRect();
      this.dragState = {
        node, el: nodeEl,
        offsetX: e.clientX - rect.left - node.x,
        offsetY: e.clientY - rect.top  - node.y
      };
      e.preventDefault();
    }
  },

  onMouseMove(e) {
    const rect = this.canvasEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (this.dragState) {
      const { node, el } = this.dragState;
      node.x = mx - this.dragState.offsetX;
      node.y = my - this.dragState.offsetY;
      el.style.left = node.x + 'px';
      el.style.top  = node.y + 'px';
      this._redrawEdges();
    }
    if (this.connectionState && this.connectionState.tmpLine) {
      const src = this.nodes.find(n => n.id === this.connectionState.sourceId);
      if (!src) return;
      const sx = src.x + 70, sy = src.y + 35;
      const dy = Math.abs(my - sy) * 0.4;
      this.connectionState.tmpLine.setAttribute('d',
        `M ${sx} ${sy} C ${sx} ${sy+dy}, ${mx} ${my-dy}, ${mx} ${my}`);
    }
  },

  onMouseUp(e) {
    if (this.dragState) {
      this.dragState = null;
    }
    if (this.connectionState) {
      const tmp = document.getElementById('tmp-edge');
      if (tmp) tmp.remove();

      const targetEl = e.target.closest('.de-node');
      if (targetEl && targetEl.id !== this.connectionState.sourceId) {
        // Ask for edge label / cardinalities
        this._promptEdgeOptions(this.connectionState.sourceId, targetEl.id, this.selectedEdgeType);
      }
      this.connectionState = null;
    }
  },

  // ─── Prompts for Labels / Cardinality ─────────────────────────
  _promptEdgeOptions(srcId, tgtId, edgeType) {
    let label = '';
    let cardSrc = '', cardTgt = '';

    if (edgeType === 'data_flow') {
      label = prompt('שם זרם הנתונים (חובה):', 'נתונים') || 'נתונים';
    } else if (edgeType === 'rel_line') {
      label = prompt('שם הקשר (אופציונלי):', '') || '';
      cardSrc = prompt('קרדינליות קצה מקור (e.g. 1..1, 0..N):', '1..1') || '';
      cardTgt = prompt('קרדינליות קצה יעד (e.g. 1..N, 0..N):', '0..N') || '';
    } else if (['inheritance','realization','aggregation','composition','gen_line'].includes(edgeType)) {
      label = ''; // No label for structural lines
    } else {
      label = prompt('תווית לחיבור (אופציונלי):', '') || '';
    }

    const id = 'e_' + Date.now();
    this.edges.push({ id, source: srcId, target: tgtId, type: edgeType, label, cardSrc, cardTgt });
    this._redrawEdges();
  },

  // ─── Node Label Editing ───────────────────────────────────────
  _editNodeLabel(node, el) {
    this.editingNodeId = node.id;
    document.getElementById('props-panel').style.display = 'flex';
    document.getElementById('prop-label').value = node.label;
    document.getElementById('prop-color').value = node.properties.bgColor || '#1e293b';
    document.getElementById('prop-stroke').value = node.properties.strokeColor || '#60a5fa';
  },

  // ─── Error Highlighting ───────────────────────────────────────
  clearErrors() {
    this.canvasEl.querySelectorAll('.de-node').forEach(n => n.classList.remove('de-node-error'));
  },

  // ─── Validation API ───────────────────────────────────────────
  async validateDiagram() {
    this.clearErrors();

    const nodesPayload = this.nodes.map(n => ({ id: n.id, type: n.type, label: n.label, x: n.x, y: n.y, properties: n.properties }));
    const edgesPayload = this.edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label || '' }));

    const panel   = document.getElementById('validation-panel');
    const content = document.getElementById('validation-content');
    panel.style.display = 'block';
    content.innerHTML   = '<div class="de-spinner"></div>';

    try {
      const result = await API.validateDiagram(this.diagramType, nodesPayload, edgesPayload);

      if (result.valid) {
        let html = '<div class="de-v-ok">🎉 התרשים תקין לחלוטין!</div>';
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(w => {
            html += `<div class="de-v-warn">⚠️ ${w.message_he || w}</div>`;
          });
        }
        content.innerHTML = html;
      } else {
        let html = '';
        (result.errors || []).forEach(err => {
          html += `<div class="de-v-err">❌ ${err.message_he || err}</div>`;
          (err.affected_node_ids || []).forEach(nid => {
            const el = document.getElementById(nid);
            if (el) el.classList.add('de-node-error');
          });
        });
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(w => {
            html += `<div class="de-v-warn">⚠️ ${w.message_he || w}</div>`;
          });
        }
        content.innerHTML = html;
      }
    } catch (err) {
      content.innerHTML = `<div class="de-v-err">שגיאה: ${err.message}</div>`;
    }
  }
};
