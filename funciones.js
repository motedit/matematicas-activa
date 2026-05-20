// ================================================================
//  MATEMÁTICAS ACTIVA — funciones.js
//  Calculadora + Graficadora de Funciones para la materia Cálculo
//  Llamado desde materia.js: window.initFunciones()
// ================================================================
(function () {
'use strict';

// ── Constantes ────────────────────────────────────────────────
const PI = Math.PI;
const r2 = n => (!isFinite(n) || isNaN(n)) ? '—' : Math.round(n * 100) / 100;
const r4 = n => (!isFinite(n) || isNaN(n)) ? '—' : Math.round(n * 10000) / 10000;

// ── Evaluador seguro de f(x) ──────────────────────────────────
function evalF(expr, x) {
    if (!expr || !String(expr).trim()) return NaN;
    try {
        const e = String(expr)
            .replace(/\^/g, '**')
            .replace(/\bsen\b/gi, 'Math.sin').replace(/\bsin\b/gi, 'Math.sin')
            .replace(/\bcos\b/gi, 'Math.cos').replace(/\btan\b/gi, 'Math.tan')
            .replace(/\basen\b/gi,'Math.asin').replace(/\basin\b/gi,'Math.asin')
            .replace(/\bacos\b/gi,'Math.acos').replace(/\batan\b/gi,'Math.atan')
            .replace(/\bln\b/gi, 'Math.log').replace(/\blog2\b/gi, 'Math.log2')
            .replace(/\blog\b/gi, 'Math.log10').replace(/\bsqrt\b/gi, 'Math.sqrt')
            .replace(/\babs\b/gi, 'Math.abs').replace(/\bpi\b/gi, 'Math.PI')
            .replace(/\bPI\b/g, 'Math.PI')
            .replace(/(?<![a-zA-Z0-9_])e(?![a-zA-Z0-9_])/g, 'Math.E');
        return Function('x', `'use strict'; return +(${e})`)(x);
    } catch { return NaN; }
}

// ── Utilidades matemáticas ────────────────────────────────────
function encontrarCeros(f, xMin, xMax, tol = 0.001) {
    const zeros = [], steps = 3000, dx = (xMax - xMin) / steps;
    for (let i = 0; i < steps; i++) {
        const x1 = xMin + i * dx, x2 = x1 + dx;
        const f1 = f(x1), f2 = f(x2);
        if (!isFinite(f1) || !isFinite(f2)) continue;
        if (Math.sign(f1) !== Math.sign(f2)) {
            let a = x1, b = x2;
            for (let j = 0; j < 60; j++) {
                const m = (a + b) / 2;
                if ((b - a) / 2 < 1e-9) { zeros.push(m); break; }
                if (Math.sign(f(m)) === Math.sign(f(a))) a = m; else b = m;
            }
        }
    }
    const ded = [];
    zeros.forEach(z => { const rz = Math.round(z * 1000) / 1000; if (!ded.some(d => Math.abs(d - rz) < tol)) ded.push(rz); });
    return ded;
}

function derivNum(f, x, h = 1e-7) { return (f(x + h) - f(x - h)) / (2 * h); }

function monotonia(f, xMin = -5, xMax = 5) {
    const steps = 300, dx = (xMax - xMin) / steps;
    let crec = [], decr = [], iCr = null, iDe = null, prev = null;
    for (let i = 0; i <= steps; i++) {
        const x = xMin + i * dx, d = derivNum(f, x);
        if (!isFinite(d)) { prev = null; continue; }
        const s = d > 0.05 ? 1 : d < -0.05 ? -1 : 0;
        if (s !== prev) {
            if (prev === 1 && iCr !== null) crec.push(`[${r2(iCr)}, ${r2(x)}]`);
            if (prev === -1 && iDe !== null) decr.push(`[${r2(iDe)}, ${r2(x)}]`);
            if (s === 1) iCr = x;
            if (s === -1) iDe = x;
        }
        prev = s;
    }
    if (prev === 1 && iCr !== null) crec.push(`[${r2(iCr)}, ${r2(xMax)}]`);
    if (prev === -1 && iDe !== null) decr.push(`[${r2(iDe)}, ${r2(xMax)}]`);
    return { crec: crec.join('  ') || '—', decr: decr.join('  ') || '—' };
}

function paridad(f) {
    const pts = [1, 2, 3, 4, 5];
    let par = true, imp = true;
    for (const x of pts) {
        const fx = f(x), fmx = f(-x);
        if (!isFinite(fx) || !isFinite(fmx)) { par = false; imp = false; break; }
        if (Math.abs(fx - fmx) > 1e-6) par = false;
        if (Math.abs(fx + fmx) > 1e-6) imp = false;
    }
    return par ? 'par' : imp ? 'impar' : 'ninguna';
}

function cuadratica(a, b, c) {
    const D = b * b - 4 * a * c, xv = -b / (2 * a), yv = a * xv * xv + b * xv + c;
    let raices = 'Sin raíces reales (D < 0)';
    if (D > 1e-9) { const s = Math.sqrt(D); raices = `x₁ = ${r4((-b + s) / (2 * a))}   x₂ = ${r4((-b - s) / (2 * a))}`; }
    else if (Math.abs(D) <= 1e-9) raices = `x = ${r4(xv)}  (raíz doble)`;
    return { D: r4(D), xv: r4(xv), yv: r4(yv), raices, apertura: a > 0 ? '↑ Abre hacia arriba' : '↓ Abre hacia abajo', eje: `x = ${r4(xv)}` };
}

function integral(f, a, b, n = 2000) {
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
    return s * h / 3;
}

// ── Helpers UI ────────────────────────────────────────────────
const gv  = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
const gn  = id => parseFloat(gv(id));
const gb  = id => { const e = document.getElementById(id); return e ? e.checked : false; };
const esc = s  => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function resItem(lbl, val, big = false) {
    return `<div class="fci-item">
        <div class="fci-lbl">${lbl}</div>
        <div class="fci-val${big ? ' fci-big' : ''}">${val}</div>
    </div>`;
}

function showErr(id, msg) { const e = document.getElementById(id); if (e) { e.innerHTML = esc(msg); e.style.display = 'block'; } }
function hideErr(id)      { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
function showRes(id)      { const e = document.getElementById(id); if (e) e.style.display = 'block'; }
function hideRes(id)      { const e = document.getElementById(id); if (e) e.style.display = 'none'; }

// ── CSS ───────────────────────────────────────────────────────
function inyectarCSS() {
    if (document.getElementById('fc-style')) return;
    const s = document.createElement('style');
    s.id = 'fc-style';
    s.textContent = `
/* ─── TABS ─── */
.fc-tabs{display:flex;gap:6px;margin-bottom:22px}
.fc-tab{flex:1;padding:12px 18px;border-radius:12px;border:2px solid #e2e8f0;background:transparent;cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;color:#64748b;transition:all .22s;text-align:center}
.fc-tab.active{background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border-color:transparent;box-shadow:0 4px 16px rgba(37,99,235,.3)}
.fc-tab:hover:not(.active){background:#f1f5f9;color:#1e293b}

/* ─── OPERACIONES ─── */
.fc-op-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:18px}
.fc-op-btn{padding:13px 12px;border-radius:12px;border:2px solid #e2e8f0;background:white;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;color:#64748b;transition:all .2s;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.fc-op-icon{font-size:22px;display:block;margin-bottom:5px}
.fc-op-btn.active,.fc-op-btn:hover{border-color:#2563eb;background:#eff6ff;color:#1e40af}
.fc-op-btn.active{background:linear-gradient(135deg,#eff6ff,#f5f3ff);border-color:#7c3aed}
.fc-op-box{background:white;border-radius:14px;padding:24px;border:1.5px solid #e2e8f0;box-shadow:0 2px 10px rgba(0,0,0,.04)}
.fc-op-title{font-family:'Poppins',inherit;font-size:17px;font-weight:800;color:#0f172a;margin:0 0 4px}
.fc-op-desc{font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.5}

/* ─── FORM ─── */
.fc-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:14px}
.fc-field{display:flex;flex-direction:column;gap:4px}
.fc-field label{font-size:12px;font-weight:700;color:#475569;letter-spacing:.2px}
.fc-field input{padding:10px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;color:#0f172a;background:#f8fafc;outline:none;transition:border-color .2s;box-sizing:border-box;width:100%}
.fc-field input:focus{border-color:#2563eb;background:white;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
.fc-btn-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.fc-btn{padding:11px 24px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .22s}
.fc-btn-primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;box-shadow:0 4px 14px rgba(37,99,235,.3)}
.fc-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(37,99,235,.4)}

/* ─── RESULTADOS ─── */
.fc-error{background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:12px 16px;color:#991b1b;font-size:13px;margin-top:10px;display:none}
.fc-result{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:22px;margin-top:16px;display:none}
.fc-res-title{font-size:13px;font-weight:700;color:#1e40af;margin:0 0 14px}
.fci-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:14px}
.fci-item{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:11px 14px}
.fci-lbl{font-size:11px;font-weight:700;color:#64748b;margin-bottom:3px}
.fci-val{font-size:15px;font-weight:800;color:#0f172a;font-family:'Courier New',monospace;word-break:break-all;line-height:1.3}
.fci-big{font-size:24px;color:#2563eb}
.fc-formula{background:#1e293b;border-radius:10px;padding:16px 20px;font-family:'Courier New',monospace;font-size:12.5px;color:#e2e8f0;line-height:1.9;white-space:pre-wrap;margin:0;overflow-x:auto}
.fc-badge{padding:3px 13px;border-radius:100px;font-size:12px;font-weight:700;display:inline-block}
.fc-badge-par{background:#dbeafe;color:#1e40af}
.fc-badge-impar{background:#ede9fe;color:#5b21b6}
.fc-badge-ninguna{background:#f1f5f9;color:#475569}

/* ─── TABLA ─── */
.fc-tabla{width:100%;border-collapse:collapse;font-size:13px;margin:0}
.fc-tabla th{background:#1e293b;color:#e2e8f0;padding:8px 12px;text-align:left;font-weight:700}
.fc-tabla td{padding:7px 12px;border-bottom:1px solid #f1f5f9;font-family:'Courier New',monospace;color:#1e293b}
.fc-tabla tr:nth-child(even) td{background:#f8fafc}

/* ─── GRAFICADORA ─── */
.fc-graf-box{background:white;border-radius:14px;padding:22px;border:1.5px solid #e2e8f0;margin-bottom:14px}
.fc-presets{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px;align-items:center}
.fc-preset-lbl{font-size:12px;font-weight:700;color:#64748b;align-self:center}
.fc-preset{padding:5px 13px;border-radius:8px;border:1.5px solid #e2e8f0;background:white;font-size:12px;font-weight:600;cursor:pointer;color:#2563eb;transition:all .2s;font-family:'Courier New',monospace;white-space:nowrap}
.fc-preset:hover{background:#dbeafe;border-color:#2563eb}
.fc-func-rows{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-bottom:14px}
.fc-func-row{display:flex;align-items:center;gap:8px}
.fc-func-dot{width:13px;height:13px;border-radius:50%;flex-shrink:0;box-shadow:0 0 0 2px rgba(0,0,0,.08)}
.fc-func-row label{font-size:12px;font-weight:700;color:#475569;white-space:nowrap}
.fc-func-row input{flex:1;padding:9px 11px;border:2px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:'Courier New',monospace;color:#0f172a;background:#f8fafc;outline:none;transition:border-color .2s}
.fc-func-row input:focus{border-color:#2563eb;background:white}
.fc-range-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.fc-range-row label{font-size:12px;font-weight:700;color:#475569}
.fc-range-row input{width:64px;padding:7px 8px;border:2px solid #e2e8f0;border-radius:8px;font-size:13px;text-align:center;outline:none;font-family:inherit}
.fc-range-row input:focus{border-color:#2563eb}
.fc-opts{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.fc-opts label{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:600;color:#475569;cursor:pointer}
.fc-canvas-wrap{background:#0f172a;border-radius:14px;overflow:hidden}
.fc-canvas-wrap canvas{display:block;width:100%}
.fc-graf-info{margin-top:10px;background:white;border-radius:10px;padding:13px 18px;border:1px solid #e2e8f0;font-size:13px;color:#475569;line-height:2;display:none}

/* ─── RESPONSIVE ─── */
@media(max-width:560px){
    .fc-op-grid{grid-template-columns:1fr 1fr}
    .fci-grid{grid-template-columns:1fr 1fr}
    .fc-form{grid-template-columns:1fr}
    .fc-tabs{flex-direction:column}
}`;
    document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════════
//  CALCULADORA — OPERACIONES
// ══════════════════════════════════════════════════════════════

// ── 1. Evaluar f(a) ──────────────────────────────────────────
function opEvaluar() {
    const expr = gv('ev-fx'), a = gn('ev-a');
    hideErr('ev-err');
    if (!expr) { showErr('ev-err', 'Ingresá la función f(x).'); return; }
    if (isNaN(a)) { showErr('ev-err', 'Ingresá el valor del punto a.'); return; }
    const f = x => evalF(expr, x);
    const puntos = [-3, -2, -1, 0, 1, 2, 3, 5, a];
    showRes('ev-res');
    const tabla = [-5,-4,-3,-2,-1,0,1,2,3,4,5].map(x =>
        `<tr><td>x = ${x}</td><td>f(${x}) = ${r4(f(x))}</td></tr>`
    ).join('');
    document.getElementById('ev-res').innerHTML = `
        <p class="fc-res-title">f(x) = ${esc(expr)} &nbsp;—&nbsp; Evaluación en a = ${a}</p>
        <div class="fci-grid">
            ${resItem(`f(${a})`, r4(f(a)), true)}
            ${resItem('f(0)',   r4(f(0)))}
            ${resItem('f(1)',   r4(f(1)))}
            ${resItem('f(−1)',  r4(f(-1)))}
            ${resItem('f(2)',   r4(f(2)))}
            ${resItem('f(−2)',  r4(f(-2)))}
            ${resItem('f(10)',  r4(f(10)))}
        </div>
        <p style="font-size:12px;font-weight:700;color:#475569;margin:10px 0 6px">Tabla de valores</p>
        <div style="overflow-x:auto"><table class="fc-tabla">
            <tr><th>x</th><th>f(x)</th><th>x</th><th>f(x)</th></tr>
            ${[-5,-4,-3,-2,-1,0,1,2,3,4,5].reduce((acc, x, i, arr) => {
                if (i % 2 === 0) acc += `<tr><td>${x}</td><td>${r4(f(x))}</td><td>${arr[i+1]}</td><td>${r4(f(arr[i+1]))}</td></tr>`;
                return acc;
            }, '')}
        </table></div>
        <pre class="fc-formula" style="margin-top:12px">f(x) = ${expr}
f(${a}) = ${r4(f(a))}</pre>`;
}

// ── 2. Análisis completo ─────────────────────────────────────
function opAnalisis() {
    const expr = gv('an-fx'), xMin = gn('an-xmin') || -6, xMax = gn('an-xmax') || 6;
    hideErr('an-err');
    if (!expr) { showErr('an-err', 'Ingresá la función f(x).'); return; }
    const f = x => evalF(expr, x);
    const ceros = encontrarCeros(f, xMin, xMax);
    const par   = paridad(f);
    const mono  = monotonia(f, xMin, xMax);
    const f0    = f(0);
    const badgeCls = par === 'par' ? 'fc-badge-par' : par === 'impar' ? 'fc-badge-impar' : 'fc-badge-ninguna';
    const badgeTxt = par === 'par' ? '📐 Par — f(−x) = f(x)' : par === 'impar' ? '↔️ Impar — f(−x) = −f(x)' : '❌ Ninguna — ni par ni impar';
    showRes('an-res');
    document.getElementById('an-res').innerHTML = `
        <p class="fc-res-title">Análisis de f(x) = ${esc(expr)} en [${xMin}, ${xMax}]</p>
        <div class="fci-grid">
            ${resItem('Intercepto Y — f(0)', r4(f0))}
            ${resItem('Ceros (aprox.)', ceros.length ? ceros.map(z => `x=${z}`).join('  ') : 'Ninguno en el rango')}
            ${resItem('Creciente en', mono.crec)}
            ${resItem('Decreciente en', mono.decr)}
        </div>
        <div style="margin-bottom:14px">
            <p style="font-size:12px;font-weight:700;color:#475569;margin:0 0 6px">Paridad</p>
            <span class="fc-badge ${badgeCls}">${badgeTxt}</span>
        </div>
        <pre class="fc-formula">f(x) = ${expr}
Intercepto Y: f(0) = ${r4(f0)}
Ceros en [${xMin}, ${xMax}]: ${ceros.length ? ceros.join(', ') : 'No encontrados'}
Paridad: ${badgeTxt}
Creciente en: ${mono.crec}
Decreciente en: ${mono.decr}</pre>`;
}

// ── 3. Función cuadrática ─────────────────────────────────────
function opCuad() {
    const a = gn('cq-a'), b = gn('cq-b'), c = gn('cq-c');
    hideErr('cq-err');
    if (isNaN(a) || a === 0) { showErr('cq-err', 'El coeficiente "a" no puede ser 0 ni estar vacío.'); return; }
    if (isNaN(b) || isNaN(c)) { showErr('cq-err', 'Ingresá los tres coeficientes.'); return; }
    const q = cuadratica(a, b, c);
    const bSgn = b >= 0 ? `+${b}` : b, cSgn = c >= 0 ? `+${c}` : c;
    showRes('cq-res');
    document.getElementById('cq-res').innerHTML = `
        <p class="fc-res-title">f(x) = ${a}x² ${bSgn}x ${cSgn}</p>
        <div class="fci-grid">
            ${resItem('Vértice V(x, y)', `(${q.xv} , ${q.yv})`, true)}
            ${resItem('Eje de simetría', q.eje)}
            ${resItem('Discriminante Δ', q.D)}
            ${resItem('Apertura', q.apertura)}
            ${resItem('Raíces', q.raices)}
            ${resItem('f(0) = c', c)}
        </div>
        <pre class="fc-formula">f(x) = ${a}x² ${bSgn}x ${cSgn}

Vértice:
  xᵥ = −b / 2a = −(${b}) / 2·(${a}) = ${q.xv}
  yᵥ = f(${q.xv}) = ${q.yv}

Discriminante:
  Δ = b² − 4ac = ${b}² − 4·${a}·${c} = ${q.D}

Raíces: ${q.raices}
${q.apertura}
Eje de simetría: ${q.eje}</pre>`;
}

// ── 4. Paridad ────────────────────────────────────────────────
function opParidad() {
    const expr = gv('pr-fx');
    hideErr('pr-err');
    if (!expr) { showErr('pr-err', 'Ingresá la función f(x).'); return; }
    const f = x => evalF(expr, x);
    const par = paridad(f);
    const pts = [-3, -2, -1, 1, 2, 3];
    const badgeCls = par === 'par' ? 'fc-badge-par' : par === 'impar' ? 'fc-badge-impar' : 'fc-badge-ninguna';
    const badgeTxt = par === 'par' ? '📐 Par — f(−x) = f(x)  ·  Simétrica respecto al eje Y'
                   : par === 'impar' ? '↔️ Impar — f(−x) = −f(x)  ·  Simétrica respecto al origen'
                   : '❌ Ninguna — no es par ni impar';
    const filasTxt = pts.map(x =>
        `f(${x}) = ${r4(f(x))}   f(−${x}) = ${r4(f(-x))}   f(x)+f(−x) = ${r4(f(x)+f(-x))}   f(−x)−f(x) = ${r4(f(-x)-f(x))}`
    ).join('\n');
    showRes('pr-res');
    document.getElementById('pr-res').innerHTML = `
        <p class="fc-res-title">Paridad de f(x) = ${esc(expr)}</p>
        <div class="fci-grid" style="margin-bottom:14px">
            ${resItem('Resultado', `<span class="fc-badge ${badgeCls}">${par.toUpperCase()}</span>`)}
        </div>
        <p style="font-size:14px;color:#1e293b;margin:0 0 12px">${badgeTxt}</p>
        <div style="overflow-x:auto">
        <table class="fc-tabla">
            <tr><th>x</th><th>f(x)</th><th>f(−x)</th><th>f(x) + f(−x)</th><th>f(−x) − f(x)</th></tr>
            ${pts.map(x => `<tr>
                <td>${x}</td>
                <td>${r4(f(x))}</td>
                <td>${r4(f(-x))}</td>
                <td>${r4(f(x)+f(-x))}</td>
                <td>${r4(f(-x)-f(x))}</td>
            </tr>`).join('')}
        </table></div>
        <pre class="fc-formula" style="margin-top:12px">f(x) = ${expr}

Verificación:
${filasTxt}

Conclusión: ${badgeTxt}</pre>`;
}

// ── 5. Composición ────────────────────────────────────────────
function opComposicion() {
    const fExpr = gv('co-fx'), gExpr = gv('co-gx'), a = gn('co-a');
    hideErr('co-err');
    if (!fExpr || !gExpr) { showErr('co-err', 'Ingresá f(x) y g(x).'); return; }
    if (isNaN(a)) { showErr('co-err', 'Ingresá el valor de a.'); return; }
    const f = x => evalF(fExpr, x), g = x => evalF(gExpr, x);
    const ga = g(a), fga = f(ga), fa = f(a), gfa = g(fa);
    const pts = [-2, -1, 0, 1, 2, 3];
    showRes('co-res');
    document.getElementById('co-res').innerHTML = `
        <p class="fc-res-title">Composición: f(x) = ${esc(fExpr)} &nbsp; g(x) = ${esc(gExpr)} &nbsp; en a = ${a}</p>
        <div class="fci-grid">
            ${resItem('g(a)', r4(ga))}
            ${resItem('(f∘g)(a) = f(g(a))', r4(fga), true)}
            ${resItem('f(a)', r4(fa))}
            ${resItem('(g∘f)(a) = g(f(a))', r4(gfa))}
        </div>
        <div style="overflow-x:auto;margin-bottom:14px">
        <table class="fc-tabla">
            <tr><th>x</th><th>g(x)</th><th>(f∘g)(x)</th><th>f(x)</th><th>(g∘f)(x)</th></tr>
            ${pts.map(x => {
                const gx=g(x), fgx=f(gx), fx=f(x), gfx=g(fx);
                return `<tr><td>${x}</td><td>${r4(gx)}</td><td>${r4(fgx)}</td><td>${r4(fx)}</td><td>${r4(gfx)}</td></tr>`;
            }).join('')}
        </table></div>
        <pre class="fc-formula">f(x) = ${fExpr}
g(x) = ${gExpr}

(f∘g)(${a}) = f(g(${a})) = f(${r4(ga)}) = ${r4(fga)}

(g∘f)(${a}) = g(f(${a})) = g(${r4(fa)}) = ${r4(gfa)}

⚠️  En general: f∘g ≠ g∘f</pre>`;
}

// ── 6. Operaciones ────────────────────────────────────────────
function opOperaciones() {
    const fExpr = gv('op-fx'), gExpr = gv('op-gx'), a = gn('op-a');
    hideErr('op-err');
    if (!fExpr || !gExpr) { showErr('op-err', 'Ingresá f(x) y g(x).'); return; }
    if (isNaN(a)) { showErr('op-err', 'Ingresá el valor de a.'); return; }
    const f = x => evalF(fExpr, x), g = x => evalF(gExpr, x);
    const fa = f(a), ga = g(a);
    const pts = [-2, -1, 0, 1, 2, 3];
    showRes('op-res');
    document.getElementById('op-res').innerHTML = `
        <p class="fc-res-title">Operaciones: f(x) = ${esc(fExpr)} &nbsp; g(x) = ${esc(gExpr)} &nbsp; en a = ${a}</p>
        <div class="fci-grid">
            ${resItem('f(a)', r4(fa))}
            ${resItem('g(a)', r4(ga))}
            ${resItem('(f + g)(a)', r4(fa + ga), true)}
            ${resItem('(f − g)(a)', r4(fa - ga))}
            ${resItem('(f · g)(a)', r4(fa * ga))}
            ${resItem('(f / g)(a)', r4(fa / ga))}
        </div>
        <div style="overflow-x:auto;margin-bottom:14px">
        <table class="fc-tabla">
            <tr><th>x</th><th>f(x)</th><th>g(x)</th><th>f+g</th><th>f−g</th><th>f·g</th><th>f/g</th></tr>
            ${pts.map(x => {
                const fx=f(x), gx=g(x);
                return `<tr><td>${x}</td><td>${r4(fx)}</td><td>${r4(gx)}</td><td>${r4(fx+gx)}</td><td>${r4(fx-gx)}</td><td>${r4(fx*gx)}</td><td>${r4(fx/gx)}</td></tr>`;
            }).join('')}
        </table></div>
        <pre class="fc-formula">f(x) = ${fExpr}  →  f(${a}) = ${r4(fa)}
g(x) = ${gExpr}  →  g(${a}) = ${r4(ga)}

(f + g)(${a}) = ${r4(fa)} + ${r4(ga)} = ${r4(fa + ga)}
(f − g)(${a}) = ${r4(fa)} − ${r4(ga)} = ${r4(fa - ga)}
(f · g)(${a}) = ${r4(fa)} × ${r4(ga)} = ${r4(fa * ga)}
(f / g)(${a}) = ${r4(fa)} ÷ ${r4(ga)} = ${r4(fa / ga)}</pre>`;
}

// ══════════════════════════════════════════════════════════════
//  GRAFICADORA DE FUNCIONES
// ══════════════════════════════════════════════════════════════
function fcGraficar() {
    const canvas = document.getElementById('fc-canvas');
    if (!canvas) return;
    const W = canvas.parentElement.clientWidth || 600;
    const H = Math.round(W * 0.62);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const xMin = parseFloat(document.getElementById('fc-xmin')?.value) || -8;
    const xMax = parseFloat(document.getElementById('fc-xmax')?.value) || 8;
    const yMin = parseFloat(document.getElementById('fc-ymin')?.value) || -8;
    const yMax = parseFloat(document.getElementById('fc-ymax')?.value) || 8;

    const f1e = document.getElementById('fc-f1')?.value.trim() || '';
    const f2e = document.getElementById('fc-f2')?.value.trim() || '';
    const f3e = document.getElementById('fc-f3')?.value.trim() || '';

    const showZeros  = document.getElementById('fc-show-zeros')?.checked;
    const showYint   = document.getElementById('fc-show-yint')?.checked;
    const showInters = document.getElementById('fc-show-inters')?.checked;

    const tx = x => (x - xMin) / (xMax - xMin) * W;
    const ty = y => H - (y - yMin) / (yMax - yMin) * H;
    const inRange = (x, y) => x >= xMin && x <= xMax && y >= yMin && y <= yMax;

    // ── Fondo y grilla ──────────────────────────────────────
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

    const xR = xMax - xMin, yR = yMax - yMin;
    const xStep = xR > 40 ? 10 : xR > 20 ? 5 : xR > 10 ? 2 : 1;
    const yStep = yR > 40 ? 10 : yR > 20 ? 5 : yR > 10 ? 2 : 1;

    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
        ctx.strokeStyle = x === 0 ? '#475569' : '#1e293b';
        ctx.lineWidth = x === 0 ? 1.5 : 0.5;
        ctx.beginPath(); ctx.moveTo(tx(x), 0); ctx.lineTo(tx(x), H); ctx.stroke();
    }
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
        ctx.strokeStyle = y === 0 ? '#475569' : '#1e293b';
        ctx.lineWidth = y === 0 ? 1.5 : 0.5;
        ctx.beginPath(); ctx.moveTo(0, ty(y)); ctx.lineTo(W, ty(y)); ctx.stroke();
    }

    // Números de eje
    const y0c = Math.min(Math.max(ty(0), 12), H - 16);
    const x0c = Math.min(Math.max(tx(0), 24), W - 12);
    ctx.fillStyle = '#64748b'; ctx.font = `${Math.max(10, W / 62)}px Arial`;
    ctx.textAlign = 'center';
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
        if (x === 0) continue;
        ctx.fillText(x, tx(x), y0c + 14);
    }
    ctx.textAlign = 'right';
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
        if (y === 0) continue;
        ctx.fillText(y, x0c - 4, ty(y) + 4);
    }

    // ── Plotear funciones ───────────────────────────────────
    const FUNCS = [
        { expr: f1e, color: '#60a5fa', name: 'f(x)' },
        { expr: f2e, color: '#a78bfa', name: 'g(x)' },
        { expr: f3e, color: '#34d399', name: 'h(x)' },
    ].filter(f => f.expr.trim());

    const infoLines = [];
    const steps = W * 2;

    FUNCS.forEach(({ expr, color, name }) => {
        const f = x => evalF(expr, x);
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
        let first = true, prevY = null;
        for (let i = 0; i <= steps; i++) {
            const x = xMin + (xMax - xMin) * i / steps, y = f(x);
            if (isNaN(y) || !isFinite(y) || Math.abs(y) > yR * 8) { first = true; prevY = null; continue; }
            if (prevY !== null && Math.abs(y - prevY) > yR * 4) { first = true; }
            prevY = y;
            if (first) { ctx.moveTo(tx(x), ty(y)); first = false; } else ctx.lineTo(tx(x), ty(y));
        }
        ctx.stroke();

        // Ceros
        if (showZeros) {
            const ceros = encontrarCeros(f, xMin, xMax, 0.005);
            ceros.forEach(z => {
                if (!inRange(z, 0)) return;
                ctx.fillStyle = color; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(tx(z), ty(0), 5, 0, PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = 'white'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
                ctx.fillText(`(${r2(z)}, 0)`, tx(z), ty(0) - 10);
            });
            infoLines.push(`<span style="color:${color}">●</span> <b>${name} = ${expr}</b> — Ceros: ${ceros.length ? ceros.map(z => `x=${r2(z)}`).join(', ') : 'ninguno en el rango'}`);
        } else {
            infoLines.push(`<span style="color:${color}">●</span> <b>${name} = ${expr}</b>`);
        }

        // Intercepto Y
        if (showYint) {
            const fy0 = f(0);
            if (isFinite(fy0) && inRange(0, fy0)) {
                ctx.fillStyle = color; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(tx(0), ty(fy0), 5, 0, PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = 'white'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left';
                ctx.fillText(`${name}(0)=${r2(fy0)}`, tx(0) + 8, ty(fy0) - 8);
            }
        }
    });

    // Intersecciones f ∩ g
    if (showInters && FUNCS.length >= 2) {
        const f = x => evalF(FUNCS[0].expr, x), g = x => evalF(FUNCS[1].expr, x);
        const inters = encontrarCeros(x => f(x) - g(x), xMin, xMax, 0.01);
        inters.forEach(xi => {
            const yi = f(xi);
            if (!isFinite(yi) || !inRange(xi, yi)) return;
            ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(tx(xi), ty(yi), 6, 0, PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
            ctx.fillText(`(${r2(xi)}, ${r2(yi)})`, tx(xi), ty(yi) - 12);
        });
        if (inters.length) infoLines.push(`<span style="color:#fbbf24">⬤</span> Intersección f∩g en: ${inters.map(x => `x=${r2(x)}`).join(', ')}`);
        else infoLines.push(`<span style="color:#fbbf24">⬤</span> f y g no se intersectan en el rango`);
    }

    // Leyenda
    if (FUNCS.length > 0) {
        const lh = 18, lpad = 14;
        const lw = Math.min(W - 20, FUNCS.length * 180);
        ctx.fillStyle = 'rgba(15,23,42,.85)';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(8, 8, lw, FUNCS.length * lh + 12, 8) : ctx.rect(8, 8, lw, FUNCS.length * lh + 12);
        ctx.fill();
        FUNCS.forEach(({ color, name, expr }, i) => {
            ctx.fillStyle = color; ctx.fillRect(lpad, 18 + i * lh, 10, 10);
            ctx.fillStyle = '#e2e8f0'; ctx.font = '11px Arial'; ctx.textAlign = 'left';
            ctx.fillText(`${name} = ${expr.substring(0, 28)}`, lpad + 15, 26 + i * lh);
        });
    }

    // Panel de info
    const infoEl = document.getElementById('fc-graf-info');
    if (infoEl) {
        if (infoLines.length) { infoEl.style.display = 'block'; infoEl.innerHTML = infoLines.join('<br>'); }
        else infoEl.style.display = 'none';
    }
}

// ══════════════════════════════════════════════════════════════
//  TABS y OPERACIONES — control de UI
// ══════════════════════════════════════════════════════════════
function fcTab(tab) {
    ['calculadora', 'graficadora'].forEach(t => {
        const el = document.getElementById('fc-panel-' + t);
        if (el) el.style.display = t === tab ? 'block' : 'none';
    });
    document.querySelectorAll('.fc-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${tab}'`));
    });
    if (tab === 'graficadora') setTimeout(fcGraficar, 80);
}

const OPS = {
    evaluar: {
        titulo: 'Evaluar f(a)',
        desc: 'Calculá el valor de f(a) para cualquier función y punto. También muestra una tabla de valores.',
        html: `<div class="fc-form">
            <div class="fc-field"><label>f(x) =</label><input type="text" id="ev-fx" value="x^2 + 2*x - 3" autocomplete="off" placeholder="ej: x^2 + 2*x"></div>
            <div class="fc-field"><label>Punto a =</label><input type="number" id="ev-a" value="2" placeholder="ej: 2"></div>
        </div>
        <div class="fc-btn-row"><button class="fc-btn fc-btn-primary" onclick="window._func.opEvaluar()">🎯 Calcular f(a)</button></div>
        <div id="ev-err" class="fc-error"></div>
        <div id="ev-res" class="fc-result"></div>`
    },
    analisis: {
        titulo: 'Análisis completo de f(x)',
        desc: 'Ceros, paridad, monotonía (crecimiento/decrecimiento) e intercepto Y en el rango indicado.',
        html: `<div class="fc-form">
            <div class="fc-field"><label>f(x) =</label><input type="text" id="an-fx" value="x^2 - 4" autocomplete="off" placeholder="ej: x^2 - 4"></div>
            <div class="fc-field"><label>x mínimo</label><input type="number" id="an-xmin" value="-6"></div>
            <div class="fc-field"><label>x máximo</label><input type="number" id="an-xmax" value="6"></div>
        </div>
        <div class="fc-btn-row"><button class="fc-btn fc-btn-primary" onclick="window._func.opAnalisis()">🔍 Analizar función</button></div>
        <div id="an-err" class="fc-error"></div>
        <div id="an-res" class="fc-result"></div>`
    },
    cuadratica: {
        titulo: 'Función cuadrática f(x) = ax² + bx + c',
        desc: 'Ingresá los tres coeficientes para calcular vértice, discriminante, raíces, apertura y eje de simetría.',
        html: `<div class="fc-form">
            <div class="fc-field"><label>Coeficiente a (de x²)</label><input type="number" id="cq-a" value="1" step="any" placeholder="≠ 0"></div>
            <div class="fc-field"><label>Coeficiente b (de x)</label><input type="number" id="cq-b" value="-3" step="any"></div>
            <div class="fc-field"><label>Coeficiente c (término indep.)</label><input type="number" id="cq-c" value="2" step="any"></div>
        </div>
        <div class="fc-btn-row"><button class="fc-btn fc-btn-primary" onclick="window._func.opCuad()">⬆️ Analizar cuadrática</button></div>
        <div id="cq-err" class="fc-error"></div>
        <div id="cq-res" class="fc-result"></div>`
    },
    paridad: {
        titulo: 'Paridad de f(x)',
        desc: 'Determiná si la función es par f(−x)=f(x), impar f(−x)=−f(x), o ninguna. Incluye tabla de verificación.',
        html: `<div class="fc-form">
            <div class="fc-field"><label>f(x) =</label><input type="text" id="pr-fx" value="x^2" autocomplete="off" placeholder="ej: x^2  o  sin(x)"></div>
        </div>
        <div class="fc-btn-row"><button class="fc-btn fc-btn-primary" onclick="window._func.opParidad()">🪞 Verificar paridad</button></div>
        <div id="pr-err" class="fc-error"></div>
        <div id="pr-res" class="fc-result"></div>`
    },
    composicion: {
        titulo: 'Composición (f ∘ g)(a) = f(g(a))',
        desc: 'Calculá la composición de dos funciones en un punto y la tabla de (f∘g)(x) vs (g∘f)(x).',
        html: `<div class="fc-form">
            <div class="fc-field"><label>f(x) =</label><input type="text" id="co-fx" value="x^2 + 1" autocomplete="off"></div>
            <div class="fc-field"><label>g(x) =</label><input type="text" id="co-gx" value="2*x - 1" autocomplete="off"></div>
            <div class="fc-field"><label>Punto a =</label><input type="number" id="co-a" value="3"></div>
        </div>
        <div class="fc-btn-row"><button class="fc-btn fc-btn-primary" onclick="window._func.opComposicion()">∘ Calcular (f∘g)(a)</button></div>
        <div id="co-err" class="fc-error"></div>
        <div id="co-res" class="fc-result"></div>`
    },
    operaciones: {
        titulo: 'Operaciones entre f(x) y g(x)',
        desc: 'Calculá suma, resta, producto y cociente de dos funciones en un punto. Incluye tabla completa.',
        html: `<div class="fc-form">
            <div class="fc-field"><label>f(x) =</label><input type="text" id="op-fx" value="x^2" autocomplete="off"></div>
            <div class="fc-field"><label>g(x) =</label><input type="text" id="op-gx" value="x + 3" autocomplete="off"></div>
            <div class="fc-field"><label>Punto a =</label><input type="number" id="op-a" value="2"></div>
        </div>
        <div class="fc-btn-row"><button class="fc-btn fc-btn-primary" onclick="window._func.opOperaciones()">➕ Calcular todas</button></div>
        <div id="op-err" class="fc-error"></div>
        <div id="op-res" class="fc-result"></div>`
    },
};

function fcOp(op) {
    const def = OPS[op]; if (!def) return;
    document.querySelectorAll('.fc-op-btn').forEach(b =>
        b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${op}'`))
    );
    const inner = document.getElementById('fc-op-inner');
    if (inner) inner.innerHTML = `
        <p class="fc-op-title">${def.titulo}</p>
        <p class="fc-op-desc">${def.desc}</p>
        ${def.html}`;
}

const PRESETS = [
    ['x^2','x²'], ['2*x+1','2x+1'], ['x^3-3*x','x³−3x'], ['x^2-4','x²−4'],
    ['sin(x)','sin(x)'], ['cos(x)','cos(x)'], ['tan(x)','tan(x)'],
    ['e^x','eˣ'], ['ln(x)','ln(x)'], ['sqrt(x)','√x'],
    ['1/x','1/x'], ['abs(x)','|x|'], ['x^2+2*x-3','x²+2x−3'],
];

function fcPreset(expr) {
    const ids = ['fc-f1','fc-f2','fc-f3'];
    let placed = false;
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el && !el.value.trim()) { el.value = expr; placed = true; break; }
    }
    if (!placed) {
        const el = document.getElementById('fc-f1');
        if (el) el.value = expr;
    }
    setTimeout(fcGraficar, 60);
}

// ══════════════════════════════════════════════════════════════
//  HTML COMPLETO
// ══════════════════════════════════════════════════════════════
function buildHTML() {
    return `
<div class="fc-tabs">
    <button class="fc-tab active" onclick="window._func.fcTab('calculadora')">🔢 Calculadora de Funciones</button>
    <button class="fc-tab" onclick="window._func.fcTab('graficadora')">📈 Graficadora</button>
</div>

<!-- CALCULADORA -->
<div id="fc-panel-calculadora">
    <div class="fc-op-grid">
        <button class="fc-op-btn active" onclick="window._func.fcOp('evaluar')">
            <span class="fc-op-icon">🎯</span>Evaluar f(a)
        </button>
        <button class="fc-op-btn" onclick="window._func.fcOp('analisis')">
            <span class="fc-op-icon">🔍</span>Análisis completo
        </button>
        <button class="fc-op-btn" onclick="window._func.fcOp('cuadratica')">
            <span class="fc-op-icon">⬆️</span>Función cuadrática
        </button>
        <button class="fc-op-btn" onclick="window._func.fcOp('paridad')">
            <span class="fc-op-icon">🪞</span>Paridad
        </button>
        <button class="fc-op-btn" onclick="window._func.fcOp('composicion')">
            <span class="fc-op-icon">∘</span>Composición f∘g
        </button>
        <button class="fc-op-btn" onclick="window._func.fcOp('operaciones')">
            <span class="fc-op-icon">➕</span>Operaciones f y g
        </button>
    </div>
    <div class="fc-op-box">
        <div id="fc-op-inner"></div>
    </div>
</div>

<!-- GRAFICADORA -->
<div id="fc-panel-graficadora" style="display:none">
    <div class="fc-graf-box">
        <div class="fc-presets">
            <span class="fc-preset-lbl">Presets:</span>
            ${PRESETS.map(([e, l]) => `<button class="fc-preset" onclick="window._func.fcPreset('${e}')">${l}</button>`).join('')}
        </div>
        <div class="fc-func-rows">
            <div class="fc-field">
                <div class="fc-func-row">
                    <div class="fc-func-dot" style="background:#60a5fa"></div>
                    <label>f(x) =</label>
                    <input type="text" id="fc-f1" value="x^2" placeholder="ej: x^2 + 2*x - 1" autocomplete="off">
                </div>
            </div>
            <div class="fc-field">
                <div class="fc-func-row">
                    <div class="fc-func-dot" style="background:#a78bfa"></div>
                    <label>g(x) =</label>
                    <input type="text" id="fc-f2" value="2*x + 1" placeholder="ej: sin(x) (opcional)" autocomplete="off">
                </div>
            </div>
            <div class="fc-field">
                <div class="fc-func-row">
                    <div class="fc-func-dot" style="background:#34d399"></div>
                    <label>h(x) =</label>
                    <input type="text" id="fc-f3" placeholder="ej: cos(x) (opcional)" autocomplete="off">
                </div>
            </div>
        </div>
        <div class="fc-range-row">
            <label>x:</label>
            <input type="number" id="fc-xmin" value="-8" title="x mínimo">
            <label>a</label>
            <input type="number" id="fc-xmax" value="8" title="x máximo">
            &nbsp;
            <label>y:</label>
            <input type="number" id="fc-ymin" value="-8" title="y mínimo">
            <label>a</label>
            <input type="number" id="fc-ymax" value="8" title="y máximo">
        </div>
        <div class="fc-opts">
            <label><input type="checkbox" id="fc-show-zeros" checked> Mostrar ceros</label>
            <label><input type="checkbox" id="fc-show-yint" checked> Intercepto y</label>
            <label><input type="checkbox" id="fc-show-inters"> Intersecciones f∩g</label>
        </div>
        <div class="fc-btn-row">
            <button class="fc-btn fc-btn-primary" onclick="window._func.fcGraficar()">📈 Graficar funciones</button>
        </div>
    </div>
    <div class="fc-canvas-wrap"><canvas id="fc-canvas"></canvas></div>
    <div id="fc-graf-info" class="fc-graf-info"></div>
</div>`;
}

// ══════════════════════════════════════════════════════════════
//  INIT — llamado por materia.js
// ══════════════════════════════════════════════════════════════
function init() {
    const sec  = document.getElementById('mat-calc-section');
    const cont = document.getElementById('mat-calc-container');
    if (!sec || !cont) return;

    sec.style.display = 'block';
    const titulo = sec.querySelector('.mat-section-title');
    if (titulo) titulo.textContent = '🧮 Calculadora y Graficadora de Funciones';
    const desc = sec.querySelector('.mat-section-desc');
    if (desc) desc.textContent = 'Evaluá, analizá, graficá y operá funciones matemáticas con solución paso a paso.';

    inyectarCSS();
    cont.innerHTML = buildHTML();
    fcOp('evaluar');

    window.addEventListener('resize', () => {
        const gPanel = document.getElementById('fc-panel-graficadora');
        if (gPanel && gPanel.style.display !== 'none') fcGraficar();
    });

    // Enter en inputs de la graficadora → graficar
    ['fc-f1','fc-f2','fc-f3','fc-xmin','fc-xmax','fc-ymin','fc-ymax'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') fcGraficar(); });
    });
}

// ── API pública ───────────────────────────────────────────────
window._func = {
    fcTab, fcOp, fcPreset, fcGraficar,
    opEvaluar, opAnalisis, opCuad, opParidad, opComposicion, opOperaciones
};
window.initFunciones = init;

})();
