/**
 * Calculator Component - Step-by-step feasibility study calculations
 * Normalization methods, cost-benefit graph, expected utility
 */
window.Calculator = {
  proposals: [
    { name: "א'", cost: 200000, benefit: 0.7 },
    { name: "ב'", cost: 210000, benefit: 0.65 },
    { name: "ג'", cost: 220000, benefit: 0.8 },
    { name: "ד'", cost: 230000, benefit: 0.85 },
    { name: "ה'", cost: 190000, benefit: 0.65 },
  ],
  weightBenefit: 0.75,
  currentStep: 0,
  normMethod: 1,
  cmax: 0, // For method 4

  render(container) {
    let html = `<div class="page fade-in">
      <div class="section-header">
        <h2>${HEB.calc_title}</h2>
      </div>`;

    // Input section
    html += `<div class="card calc-section">
      <h3 style="margin-bottom:16px">📊 נתוני הצעות</h3>
      <table class="data-table">
        <thead><tr><th></th><th>הצעה</th><th>עלות (₪)</th><th>תועלת (0-1)</th><th></th></tr></thead>
        <tbody>`;

    this.proposals.forEach((p, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td><input class="calc-input" style="width:60px" value="${p.name}" onchange="Calculator.updateProposal(${i},'name',this.value)"></td>
        <td><input class="calc-input" type="number" value="${p.cost}" onchange="Calculator.updateProposal(${i},'cost',+this.value)"></td>
        <td><input class="calc-input" type="number" step="0.01" min="0" max="1" value="${p.benefit}" onchange="Calculator.updateProposal(${i},'benefit',+this.value)"></td>
        <td><button class="btn btn-outline btn-sm" onclick="Calculator.removeProposal(${i})">✕</button></td>
      </tr>`;
    });

    html += `</tbody></table>
      <div style="display:flex;gap:12px;align-items:center;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="Calculator.addProposal()">➕ הוסף הצעה</button>
        <div class="calc-input-group" style="margin:0">
          <label>${HEB.weight_benefit}</label>
          <input class="calc-input" type="number" step="0.05" min="0" max="1" value="${this.weightBenefit}"
            onchange="Calculator.weightBenefit=+this.value;Calculator.render(document.getElementById('app-content'))">
        </div>
        <div class="calc-input-group" style="margin:0">
          <label>שיטת נרמול:</label>
          <select onchange="Calculator.normMethod=+this.value;Calculator.render(document.getElementById('app-content'))">
            <option value="1" ${this.normMethod===1?'selected':''}>שיטה 1: Cmin/Ci</option>
            <option value="2" ${this.normMethod===2?'selected':''}>שיטה 2: (Cmin/Ci)·Bmax</option>
            <option value="3" ${this.normMethod===3?'selected':''}>שיטה 3: אינטרפולציה ליניארית</option>
            <option value="4" ${this.normMethod===4?'selected':''}>שיטה 4: נרמול חיסכון (CMAX)</option>
          </select>
        </div>
      </div>`;

    if (this.normMethod === 4) {
      html += `<div class="calc-input-group" style="margin-top:12px">
        <label>CMAX (סכום מירבי):</label>
        <input class="calc-input" type="number" value="${this.cmax || ''}" placeholder="הזן סכום"
          onchange="Calculator.cmax=+this.value;Calculator.render(document.getElementById('app-content'))">
      </div>`;
    }

    html += `</div>`;

    // Calculate results
    if (this.proposals.length >= 2) {
      html += this._renderStep1(); // Eliminate dominated
      html += this._renderStep2(); // Normalize
      html += this._renderStep3(); // Expected utility
      html += this._renderStep4(); // Graph analysis
    }

    html += `</div>`;
    container.innerHTML = html;
  },

  _renderStep1() {
    const props = this.proposals;
    const dominated = new Set();

    for (let i = 0; i < props.length; i++) {
      for (let j = 0; j < props.length; j++) {
        if (i === j) continue;
        // j dominates i if: cost_j <= cost_i AND benefit_j >= benefit_i AND at least one strict
        if (props[j].cost <= props[i].cost && props[j].benefit >= props[i].benefit &&
            (props[j].cost < props[i].cost || props[j].benefit > props[i].benefit)) {
          dominated.add(i);
        }
      }
    }

    let html = `<div class="card calc-section">
      <div class="calc-step active">
        <div class="step-title">שלב 1: ניפוי הצעות נחותות</div>
        <p style="font-size:13px;color:#94a3b8;margin-bottom:12px">הצעה נחותה = יש הצעה אחרת שטובה ממנה באופן אבסולוטי (עלות נמוכה יותר ו/או תועלת גבוהה יותר)</p>
        <table class="data-table">
          <thead><tr><th>הצעה</th><th>עלות</th><th>תועלת</th><th>סטטוס</th></tr></thead>
          <tbody>`;

    props.forEach((p, i) => {
      const cls = dominated.has(i) ? 'eliminated' : '';
      const status = dominated.has(i) ? '❌ נחותה' : '✅ נשארת';
      html += `<tr class="${cls}"><td>${p.name}</td><td>${p.cost.toLocaleString()}</td><td>${p.benefit}</td><td>${status}</td></tr>`;
    });

    html += `</tbody></table>`;

    if (dominated.size > 0) {
      const domNames = [...dominated].map(i => `הצעה ${props[i].name}`).join(', ');
      html += `<p style="margin-top:12px;font-size:14px">📝 <strong>${domNames}</strong> נחותות וינופו מהמשך החישוב.</p>`;
    } else {
      html += `<p style="margin-top:12px;font-size:14px">📝 אין הצעות נחותות - כולן ממשיכות לשלב הבא.</p>`;
    }

    html += `</div></div>`;

    // Store for next steps
    this._remaining = props.filter((_, i) => !dominated.has(i));
    return html;
  },

  _renderStep2() {
    const remaining = this._remaining;
    if (!remaining || remaining.length === 0) return '';

    const costs = remaining.map(p => p.cost);
    const cmin = Math.min(...costs);
    const cmax = Math.max(...costs);
    const bmax = Math.max(...remaining.map(p => p.benefit));
    const bmin = Math.min(...remaining.map(p => p.benefit));

    let html = `<div class="card calc-section">
      <div class="calc-step active">
        <div class="step-title">שלב 2: נרמול עלויות - שיטה ${this.normMethod}</div>`;

    // Show formula
    const formulas = {
      1: `NCi = Cmin / Ci\nCmin = ${cmin.toLocaleString()}`,
      2: `NCi = (Cmin / Ci) × Bmax\nCmin = ${cmin.toLocaleString()}, Bmax = ${bmax}`,
      3: `NCi = [(Cmax - Ci)(Bmax - Bmin) / (Cmax - Cmin)] + Bmin\nCmax = ${cmax.toLocaleString()}, Cmin = ${cmin.toLocaleString()}, Bmax = ${bmax}, Bmin = ${bmin}`,
      4: `NCi = (CMAX - Ci) / CMAX\nCMAX = ${(this.cmax || 'לא הוגדר').toLocaleString()}`
    };

    html += `<div class="calc-step"><div class="step-formula">${formulas[this.normMethod]}</div></div>`;

    // Calculate NC for each
    const normalized = remaining.map(p => {
      let nc;
      switch (this.normMethod) {
        case 1: nc = cmin / p.cost; break;
        case 2: nc = (cmin / p.cost) * bmax; break;
        case 3: nc = cmax === cmin ? bmax : ((cmax - p.cost) * (bmax - bmin) / (cmax - cmin)) + bmin; break;
        case 4: nc = this.cmax > 0 ? (this.cmax - p.cost) / this.cmax : 0; break;
        default: nc = cmin / p.cost;
      }
      return { ...p, nc: Math.round(nc * 10000) / 10000 };
    });

    html += `<table class="data-table">
      <thead><tr><th>הצעה</th><th>עלות</th><th>תועלת (B)</th><th>עלות מנורמלת (NC)</th></tr></thead>
      <tbody>`;

    normalized.forEach(p => {
      html += `<tr><td>${p.name}</td><td>${p.cost.toLocaleString()}</td><td>${p.benefit}</td><td><strong>${p.nc}</strong></td></tr>`;
    });

    html += `</tbody></table>`;

    // Show calculation details
    html += `<div style="margin-top:12px;font-size:13px;color:#94a3b8">`;
    normalized.forEach(p => {
      let calc;
      switch (this.normMethod) {
        case 1: calc = `NC(${p.name}) = ${cmin.toLocaleString()} / ${p.cost.toLocaleString()} = ${p.nc}`; break;
        case 2: calc = `NC(${p.name}) = (${cmin.toLocaleString()} / ${p.cost.toLocaleString()}) × ${bmax} = ${p.nc}`; break;
        case 3: calc = `NC(${p.name}) = [(${cmax.toLocaleString()} - ${p.cost.toLocaleString()}) × (${bmax} - ${bmin}) / (${cmax.toLocaleString()} - ${cmin.toLocaleString()})] + ${bmin} = ${p.nc}`; break;
        case 4: calc = `NC(${p.name}) = (${(this.cmax||0).toLocaleString()} - ${p.cost.toLocaleString()}) / ${(this.cmax||0).toLocaleString()} = ${p.nc}`; break;
      }
      html += `<p>📐 ${calc}</p>`;
    });
    html += `</div>`;

    html += `</div></div>`;

    this._normalized = normalized;
    return html;
  },

  _renderStep3() {
    const normalized = this._normalized;
    if (!normalized || normalized.length === 0) return '';

    const p = this.weightBenefit;
    const wCost = Math.round((1 - p) * 100) / 100;

    const results = normalized.map(prop => {
      const eu = Math.round((p * prop.benefit + wCost * prop.nc) * 10000) / 10000;
      return { ...prop, eu };
    });

    const best = results.reduce((a, b) => a.eu > b.eu ? a : b);

    let html = `<div class="card calc-section">
      <div class="calc-step active">
        <div class="step-title">שלב 3: חישוב תוחלת תועלת</div>
        <div class="calc-step"><div class="step-formula">EU = P × B + (1-P) × NC\nP (משקל תועלת) = ${p}\n1-P (משקל עלות) = ${wCost}</div></div>

        <table class="data-table">
          <thead><tr><th>הצעה</th><th>B</th><th>NC</th><th>תוחלת תועלת</th></tr></thead>
          <tbody>`;

    results.forEach(r => {
      const cls = r.name === best.name ? 'highlight' : '';
      html += `<tr class="${cls}"><td>${r.name}</td><td>${r.benefit}</td><td>${r.nc}</td><td><strong>${r.eu}</strong></td></tr>`;
    });

    html += `</tbody></table>`;

    // Show calculations
    html += `<div style="margin-top:12px;font-size:13px;color:#94a3b8">`;
    results.forEach(r => {
      html += `<p>📐 EU(${r.name}) = ${p} × ${r.benefit} + ${wCost} × ${r.nc} = ${r.eu}</p>`;
    });
    html += `</div>`;

    html += `<p class="calc-result" style="margin-top:16px;font-size:18px">🏆 ${HEB.optimal}: הצעה ${best.name} (EU = ${best.eu})</p>`;

    html += `</div></div>`;

    this._euResults = results;
    return html;
  },

  _renderStep4() {
    const results = this._euResults;
    if (!results || results.length < 2) return '';

    let html = `<div class="card calc-section">
      <div class="calc-step active">
        <div class="step-title">שלב 4: ניתוח רגישות (גרף עלות-תועלת)</div>
        <p style="font-size:13px;color:#94a3b8;margin-bottom:12px">
          נקודות חיתוך בין הצעות - בהן אנחנו אדישים. הנוסחה: (1-P)×NCi + P×Bi = (1-P)×NCj + P×Bj
        </p>`;

    // Find intersection points
    const intersections = [];
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const a = results[i], b = results[j];
        // (1-P)*NCa + P*Ba = (1-P)*NCb + P*Bb
        // NCa - P*NCa + P*Ba = NCb - P*NCb + P*Bb
        // NCa - NCb = P*(NCa - NCb) + P*(Bb - Ba)
        // NCa - NCb = P*(NCa - NCb + Bb - Ba)
        const denom = (a.nc - b.nc + b.benefit - a.benefit);
        if (Math.abs(denom) > 0.0001) {
          const pInt = (a.nc - b.nc) / denom;
          if (pInt >= 0 && pInt <= 1) {
            intersections.push({
              p: Math.round(pInt * 10000) / 10000,
              proposals: [a.name, b.name]
            });
          }
        }
      }
    }

    if (intersections.length > 0) {
      html += `<h4 style="margin:12px 0 8px">📍 נקודות חיתוך:</h4>`;
      intersections.sort((a, b) => a.p - b.p);
      intersections.forEach(int => {
        html += `<div class="calc-step" style="padding:10px 16px">
          <p>P = <strong>${int.p}</strong> — אדישות בין הצעה ${int.proposals[0]} להצעה ${int.proposals[1]}</p>
        </div>`;
      });

      // Decision ranges
      html += `<h4 style="margin:16px 0 8px">📋 סיכום תחומי החלטה:</h4>`;
      const points = [0, ...intersections.map(i => i.p), 1];
      for (let i = 0; i < points.length - 1; i++) {
        const midP = (points[i] + points[i + 1]) / 2;
        let bestName = '';
        let bestEu = -Infinity;
        results.forEach(r => {
          const eu = midP * r.benefit + (1 - midP) * r.nc;
          if (eu > bestEu) { bestEu = eu; bestName = r.name; }
        });
        html += `<p style="font-size:14px">• במשקל תועלת ${points[i]} עד ${points[i+1]}: <strong>הצעה ${bestName}</strong></p>`;
      }
    } else {
      html += `<p>אין נקודות חיתוך - הצעה אחת עדיפה בכל טווח המשקלות.</p>`;
    }

    // Simple SVG graph
    html += this._renderGraph(results, intersections);

    html += `</div></div>`;
    return html;
  },

  _renderGraph(results, intersections) {
    const W = 500, H = 300, pad = 50;
    const colors = ['#60a5fa', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#f472b6'];

    let svg = `<svg width="100%" viewBox="0 0 ${W} ${H}" style="margin-top:16px;background:rgba(0,0,0,0.2);border-radius:10px">`;

    // Axes
    svg += `<line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#475569" stroke-width="1"/>`;
    svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="#475569" stroke-width="1"/>`;

    // Labels
    svg += `<text x="${W/2}" y="${H-10}" fill="#94a3b8" font-size="12" text-anchor="middle">P (משקל תועלת)</text>`;
    svg += `<text x="15" y="${H/2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90, 15, ${H/2})">EU</text>`;

    // Axis ticks
    for (let t = 0; t <= 1; t += 0.2) {
      const x = pad + t * (W - 2 * pad);
      svg += `<text x="${x}" y="${H-pad+18}" fill="#64748b" font-size="10" text-anchor="middle">${t.toFixed(1)}</text>`;
    }

    // Draw lines for each proposal
    results.forEach((r, idx) => {
      const color = colors[idx % colors.length];
      const eu0 = r.nc; // at P=0, EU = NC
      const eu1 = r.benefit; // at P=1, EU = B

      const x1 = pad;
      const y1 = H - pad - eu0 * (H - 2 * pad);
      const x2 = W - pad;
      const y2 = H - pad - eu1 * (H - 2 * pad);

      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2"/>`;
      svg += `<text x="${x2+5}" y="${y2+4}" fill="${color}" font-size="11">${r.name}</text>`;
    });

    // Intersection points
    intersections.forEach(int => {
      const x = pad + int.p * (W - 2 * pad);
      const r = results[0];
      const eu = int.p * r.benefit + (1 - int.p) * r.nc;
      const y = H - pad - eu * (H - 2 * pad);
      svg += `<circle cx="${x}" cy="${y}" r="4" fill="#f59e0b"/>`;
      svg += `<text x="${x}" y="${y-10}" fill="#f59e0b" font-size="10" text-anchor="middle">P=${int.p}</text>`;
    });

    // Current P marker
    const pX = pad + this.weightBenefit * (W - 2 * pad);
    svg += `<line x1="${pX}" y1="${pad}" x2="${pX}" y2="${H-pad}" stroke="#ef4444" stroke-width="1" stroke-dasharray="4,4"/>`;
    svg += `<text x="${pX}" y="${pad-5}" fill="#ef4444" font-size="10" text-anchor="middle">P=${this.weightBenefit}</text>`;

    svg += `</svg>`;
    return svg;
  },

  // Data management
  updateProposal(i, field, value) {
    this.proposals[i][field] = value;
    this.render(document.getElementById('app-content'));
  },

  addProposal() {
    const letters = "אבגדהוזחטיכלמנסעפצקרשת";
    const idx = this.proposals.length;
    const name = idx < letters.length ? letters[idx] + "'" : "הצעה " + (idx + 1);
    this.proposals.push({ name, cost: 0, benefit: 0 });
    this.render(document.getElementById('app-content'));
  },

  removeProposal(i) {
    if (this.proposals.length <= 2) {
      App.toast('צריך לפחות 2 הצעות', 'error');
      return;
    }
    this.proposals.splice(i, 1);
    this.render(document.getElementById('app-content'));
  }
};
