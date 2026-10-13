/* =======================================================================
 * ESCRITURA A MANO (sección 3 · punto 10)
 * Recuadro para escribir el ejercicio con el dedo, el lápiz o el mouse.
 * Usa el mismo reconocedor de la Pizarra Docente (lib/escritura/modelo.js,
 * se carga recién al abrir): separa los trazos en símbolos, reconoce cada
 * uno (0-9 + − × ÷ = ( ) x . < > ≤ ≥ ≠ √ % ± π ∞ Δ θ) y arma la expresión,
 * con exponentes (por tamaño y altura) y fracciones (raya horizontal con
 * algo arriba y algo abajo).
 * ===================================================================== */
'use strict';

let MODELO = null, cargaModelo = null;
function cargarModeloEscritura() {
  if (MODELO) return Promise.resolve(MODELO);
  return cargaModelo || (cargaModelo = new Promise((ok, mal) => {
    const usar = () => { const m = window.MODELO_ESCRITURA; const dec = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Int8Array(u.buffer); };
      MODELO = { ...m, W1: dec(m.W1), W2: dec(m.W2) }; delete window.MODELO_ESCRITURA; ok(MODELO); };
    if (window.MODELO_ESCRITURA) return usar();
    const s = document.createElement('script'); s.src = 'lib/escritura/modelo.js'; s.onload = usar; s.onerror = () => { cargaModelo = null; mal(new Error('No pude cargar el reconocedor de escritura (lib/escritura).')); }; document.head.appendChild(s);
  }));
}

/* ---------- 1. Reconocer un símbolo (red neuronal de 28×28) ---------- */
function trazosAVector(trazos) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  trazos.forEach(st => st.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }));
  const w = x1 - x0, h = y1 - y0, maxd = Math.max(w, h, 1), pad = Math.max(6, maxd * 0.18), cw = Math.ceil(w + 2 * pad), ch = Math.ceil(h + 2 * pad);
  const tc = document.createElement('canvas'); tc.width = cw; tc.height = ch; const tx = tc.getContext('2d', { willReadFrequently: true });
  tx.fillStyle = '#000'; tx.fillRect(0, 0, cw, ch); tx.strokeStyle = '#fff'; tx.fillStyle = '#fff'; tx.lineWidth = Math.max(3, maxd * 0.07); tx.lineCap = 'round'; tx.lineJoin = 'round';
  trazos.forEach(st => { tx.beginPath(); st.forEach((p, i) => { const X = p.x - x0 + pad, Y = p.y - y0 + pad; i ? tx.lineTo(X, Y) : tx.moveTo(X, Y); }); if (st.length === 1) { tx.arc(st[0].x - x0 + pad, st[0].y - y0 + pad, tx.lineWidth / 2, 0, 7); tx.fill(); } tx.stroke(); });
  const d0 = tx.getImageData(0, 0, cw, ch).data; let ix0 = cw, iy0 = ch, ix1 = 0, iy1 = 0, alguno = false;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d0[(y * cw + x) * 4] > 38) { alguno = true; ix0 = Math.min(ix0, x); ix1 = Math.max(ix1, x); iy0 = Math.min(iy0, y); iy1 = Math.max(iy1, y); }
  if (!alguno) return null;
  const bw = ix1 - ix0 + 1, bh = iy1 - iy0 + 1, s = 20 / Math.max(bw, bh), nw = Math.max(1, Math.round(bw * s)), nh = Math.max(1, Math.round(bh * s));
  const o = document.createElement('canvas'); o.width = 28; o.height = 28; const ox = o.getContext('2d', { willReadFrequently: true });
  ox.fillStyle = '#000'; ox.fillRect(0, 0, 28, 28); ox.imageSmoothingEnabled = true; ox.drawImage(tc, ix0, iy0, bw, bh, Math.floor((28 - nw) / 2), Math.floor((28 - nh) / 2), nw, nh);
  const dd = ox.getImageData(0, 0, 28, 28).data, g = new Float32Array(784); for (let i = 0; i < 784; i++) g[i] = dd[i * 4] / 255;
  let m = 0, cx = 0, cy = 0; for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) { const v = g[y * 28 + x]; m += v; cx += v * x; cy += v * y; }
  if (m > 0) { const dx = Math.round(14 - cx / m), dy = Math.round(14 - cy / m); if (dx || dy) { const g2 = new Float32Array(784); for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < 28 && ny >= 0 && ny < 28) g2[ny * 28 + nx] = g[y * 28 + x]; } return g2; } }
  return g;
}
function predecir(vec) {
  const { W1, sW1, b1, W2, sW2, b2, labels, H, O } = MODELO, h = new Float32Array(H), o = new Float32Array(O);
  for (let j = 0; j < H; j++) { let s = 0; for (let i = 0; i < 784; i++) s += vec[i] * W1[i * H + j]; s = s * sW1 + b1[j]; h[j] = s > 0 ? s : 0; }
  for (let k = 0; k < O; k++) { let s = 0; for (let j = 0; j < H; j++) s += h[j] * W2[j * O + k]; o[k] = s * sW2 + b2[k]; }
  let mx = -1e9; for (let k = 0; k < O; k++) mx = Math.max(mx, o[k]); let suma = 0; for (let k = 0; k < O; k++) { o[k] = Math.exp(o[k] - mx); suma += o[k]; }
  return [...o].map((v, k) => ({ label: labels[k], p: v / suma })).sort((a, b) => b.p - a.p);
}

/* Reglas de forma para los símbolos que la red confunde (rayas, cruces y paréntesis):
 * se miran la dirección, lo recto y la curvatura de cada trazo. Devuelve el símbolo o null. */
function formaDeTrazo(st) {
  const b = caja([st]), a = st[0], z = st[st.length - 1], largo = Math.hypot(z.x - a.x, z.y - a.y) || 1;
  let desvio = 0, lado = 0; for (const p of st) { const d = ((z.x - a.x) * (a.y - p.y) - (a.x - p.x) * (z.y - a.y)) / largo; if (Math.abs(d) > Math.abs(desvio)) desvio = d; lado += d; }
  return { ...b, recto: Math.abs(desvio) < 0.12 * Math.max(b.w, b.h, 8), curvo: Math.abs(desvio) > 0.12 * Math.max(b.w, b.h), dx: z.x - a.x, dy: z.y - a.y, horizontal: b.h < 0.25 * b.w, vertical: b.w < 0.3 * b.h, abombado: lado };
}
// ¿El trazo dobla de golpe en algún punto? (un 7 sí; un paréntesis no)
function tieneEsquina(st) {
  const L = st.reduce((s, p, i) => (i ? s + Math.hypot(p.x - st[i - 1].x, p.y - st[i - 1].y) : 0), 0), paso = L / 8; if (!paso) return false;
  const muestra = [st[0]]; let acum = 0; for (let i = 1; i < st.length; i++) { acum += Math.hypot(st[i].x - st[i - 1].x, st[i].y - st[i - 1].y); if (acum >= paso) { muestra.push(st[i]); acum = 0; } }
  for (let i = 1; i < muestra.length - 1; i++) { const a = Math.atan2(muestra[i].y - muestra[i - 1].y, muestra[i].x - muestra[i - 1].x), b = Math.atan2(muestra[i + 1].y - muestra[i].y, muestra[i + 1].x - muestra[i].x); let d = Math.abs(a - b); if (d > Math.PI) d = 2 * Math.PI - d; if (d > Math.PI / 3) return true; }
  return false;
}
function reglaGeometrica(grupo) {
  const f = grupo.trazos.map(formaDeTrazo);
  if (f.length === 1) {
    const t = f[0];
    if (t.horizontal && t.recto) return '-';
    if (t.h > 2 * t.w && t.curvo) {                 // paréntesis: una sola curva suave, con la punta (más a la izq. o der.) en el medio
      const st = grupo.trazos[0], n = st.length, iMin = st.reduce((m, p, i) => (p.x < st[m].x ? i : m), 0), iMax = st.reduce((m, p, i) => (p.x > st[m].x ? i : m), 0);
      const sube = st.every((p, i) => !i || p.y >= st[i - 1].y - 0.04 * t.h), baja = st.every((p, i) => !i || p.y <= st[i - 1].y + 0.04 * t.h);
      if ((sube || baja) && !tieneEsquina(st)) { if (iMin > 0.3 * n && iMin < 0.7 * n) return '('; if (iMax > 0.3 * n && iMax < 0.7 * n) return ')'; }
    }
    return null;
  }
  if (f.length === 2) {
    const [p, q] = f;
    if (p.horizontal && q.horizontal && p.recto && q.recto && Math.abs(p.cy - q.cy) > 0.12 * Math.max(p.w, q.w)) return '=';
    const cruzan = Math.min(p.x1, q.x1) > Math.max(p.x0, q.x0) && Math.min(p.y1, q.y1) > Math.max(p.y0, q.y0);
    if (cruzan && p.recto && q.recto) {
      const pend = t => Math.sign(t.dx) * Math.sign(t.dy);
      if ((p.horizontal && q.vertical) || (q.horizontal && p.vertical)) return '+';
      if (!p.horizontal && !q.horizontal && !p.vertical && !q.vertical && pend(p) !== pend(q)) return 'x';
    }
  }
  return null;
}

/* ---------- 2. Separar en símbolos, fracciones y exponentes ---------- */
const caja = trazos => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; trazos.forEach(st => st.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); })); return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; };
const mediana = a => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
function agrupar(trazos) {                          // trazos que se superponen en x forman un mismo símbolo (=, +, x, ÷…)
  const items = trazos.map(st => ({ st, ...caja([st]) })).sort((a, b) => a.cx - b.cx), H = mediana(items.map(i => i.h)) || 30, grupos = []; let cur = null;
  for (const it of items) {
    if (!cur) { cur = { trazos: [it.st], ...it }; grupos.push(cur); continue; }
    const solape = Math.min(cur.x1, it.x1) - Math.max(cur.x0, it.x0), minw = Math.max(1, Math.min(cur.x1 - cur.x0, it.w)), hueco = it.x0 - cur.x1, chico = it.h < 0.55 * H;
    const adentro = (it.x0 >= cur.x0 - 3 && it.x1 <= cur.x1 + 3) || (cur.x0 >= it.x0 - 3 && cur.x1 <= it.x1 + 3);   // uno dentro del otro en x: + = ÷
    if (adentro || solape > 0.32 * minw || (hueco < 0.22 * H && !chico)) { cur.trazos.push(it.st); Object.assign(cur, caja(cur.trazos)); }
    else { cur = { trazos: [it.st], ...it }; grupos.push(cur); }
  }
  return grupos;
}
const OPS = new Set(['+', '-', '*', '/', '÷', '±']), REL = new Set(['=', '<', '>', '≤', '≥', '≠']);
const OPERANDO = l => /^[0-9xπ∞Δθ]$/.test(l) || l.length > 1;
function elegirSimbolos(syms) {                    // elige, para cada símbolo, el candidato que tiene sentido en ese lugar
  let prev = null, abiertos = 0, huboRel = false; const out = [];
  const permitido = (l, primero) => {
    if (l === '*' || l === '/' || l === '÷') return !(primero || prev === null || OPS.has(prev) || REL.has(prev) || prev === '(' || prev === '√');
    if (l === '+' || l === '-' || l === '±') return !OPS.has(prev);
    if (REL.has(l)) return !huboRel && prev !== null && (OPERANDO(prev) || prev === ')' || prev === '%');
    if (l === ')') return abiertos > 0 && prev !== null && (OPERANDO(prev) || prev === ')' || prev === '%');
    if (l === '.') return prev !== null && /\d/.test(prev);
    if (l === '%') return prev !== null && (OPERANDO(prev) || prev === ')');
    if (l === '√') return primero || prev === null || OPS.has(prev) || REL.has(prev) || prev === '(' || prev === '√';
    return true;
  };
  for (const s of syms) {
    let elegido = null, p = 0;
    for (const c of s.cands) { if (c.p < 0.015) break; if (permitido(c.label, !out.length)) { elegido = c.label; p = c.p; break; } }
    if (elegido === null) { elegido = s.cands[0].label; p = s.cands[0].p; }
    if (elegido === '.' && !(prev !== null && /\d/.test(prev))) continue;
    s.label = elegido; s.p = p; if (elegido === '(') abiertos++; else if (elegido === ')') abiertos = Math.max(0, abiertos - 1); if (REL.has(elegido)) huboRel = true;
    prev = elegido; out.push(s);
  }
  while (out.length && (OPS.has(out[out.length - 1].label) || REL.has(out[out.length - 1].label) || ['.', '(', '√'].includes(out[out.length - 1].label))) out.pop();
  return out;
}
function armar(syms) {                              // une los símbolos; los chicos y altos son exponentes
  const medH = mediana(syms.filter(s => !s.frac).map(s => s.h)) || 20, base = syms.filter(s => s.frac || s.h >= 0.68 * medH);
  const baseCy = mediana(base.map(s => s.cy)), baseH = mediana(base.filter(s => !s.frac).map(s => s.h)) || medH; let t = '', enExp = false;
  syms.forEach((s, i) => {
    const exp = i > 0 && !s.frac && /[0-9x]/.test(s.label) && s.h < 0.82 * baseH && s.cy < baseCy - 0.16 * baseH;
    if (exp && !enExp) { t += '^('; enExp = true; } else if (!exp && enExp) { t += ')'; enExp = false; }
    t += s.label;
  });
  return enExp ? t + ')' : t;
}
// Reconoce una expresión a partir de trazos (recursivo para numerador y denominador)
function reconocerTrazos(trazos, nivel = 0) {
  if (!trazos.length) return { texto: '', dudoso: false };
  // Fracciones: un trazo casi horizontal, largo, con trazos arriba y abajo dentro de su ancho
  const info = trazos.map(st => ({ st, ...caja([st]) })), hTipica = mediana(info.map(i => Math.max(i.h, i.w * 0.3))) || 30, syms = [];
  const usados = new Set();
  if (nivel < 2) for (const b of info.filter(i => i.h < 0.2 * i.w && i.w > 1.1 * hTipica).sort((a, b) => b.w - a.w)) {
    if (usados.has(b.st)) continue;
    const dentro = i => i !== b && !usados.has(i.st) && i.cx > b.x0 - 0.1 * b.w && i.cx < b.x1 + 0.1 * b.w;
    const arriba = info.filter(i => dentro(i) && i.cy < b.cy && i.y1 < b.cy + 0.1 * hTipica), abajo = info.filter(i => dentro(i) && i.cy > b.cy && i.y0 > b.cy - 0.1 * hTipica);
    if (!arriba.length || !abajo.length) continue;
    const num = reconocerTrazos(arriba.map(i => i.st), nivel + 1), den = reconocerTrazos(abajo.map(i => i.st), nivel + 1);
    [b, ...arriba, ...abajo].forEach(i => usados.add(i.st));
    const env = x => (/^[\w.π]+$/.test(x) ? x : `(${x})`), c = caja([b.st, ...arriba.map(i => i.st), ...abajo.map(i => i.st)]);
    syms.push({ frac: true, label: `${env(num.texto)}/${env(den.texto)}`, cands: [{ label: `${env(num.texto)}/${env(den.texto)}`, p: 1 }], dudoso: num.dudoso || den.dudoso, ...c, cy: b.cy });
  }
  for (const g of agrupar(trazos.filter(st => !usados.has(st)))) {
    const v = trazosAVector(g.trazos); if (!v) continue; let cands = predecir(v);
    const forma = reglaGeometrica(g); if (forma) cands = [{ label: forma, p: 0.95 }, ...cands.filter(c => c.label !== forma)];   // la forma manda
    syms.push({ cands, label: cands[0].label, ...g });
  }
  syms.sort((a, b) => a.cx - b.cx);
  const elegidos = elegirSimbolos(syms);
  return { texto: armar(elegidos), dudoso: elegidos.some(s => s.dudoso || (!s.frac && s.p < 0.5)) };
}
// Texto reconocido → texto para la calculadora ("x·2" → "x*2", "÷" → "/", paréntesis balanceados)
function limpiarEscritura(t) {
  t = t.replace(/÷/g, '/').replace(/([+\-*/])\s*([*/])/g, '$2');
  const a = (t.match(/\(/g) || []).length, c = (t.match(/\)/g) || []).length; if (a > c) t += ')'.repeat(a - c);
  return t.replace(/\*/g, '·');
}
// Vista previa en LaTeX
function escrituraALatex(t) {
  let s = t; for (let k = 0; k < 4; k++) s = s.replace(/(\([^()]*\)|[\w.π]+)\/(\([^()]*\)|[\w.π]+)/, (m, a, b) => `\\frac{${a.replace(/^\(|\)$/g, '')}}{${b.replace(/^\(|\)$/g, '')}}`);
  return s.replace(/\^\(([^()]*)\)/g, '^{$1}').replace(/√\(([^()]*)\)/g, '\\sqrt{$1}').replace(/√(\w+)/g, '\\sqrt{$1}').replace(/·/g, '\\cdot ').replace(/≤/g, '\\le ').replace(/≥/g, '\\ge ').replace(/≠/g, '\\ne ').replace(/±/g, '\\pm ').replace(/π/g, '\\pi ').replace(/∞/g, '\\infty ').replace(/Δ/g, '\\Delta ').replace(/θ/g, '\\theta ').replace(/%/g, '\\%');
}

/* ---------- 3. Recuadro para escribir ---------- */
const tinta = { trazos: [], actual: null, reloj: null };
function dibujarTinta() {
  const cv = $('#escLienzo'), g = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const est = getComputedStyle(document.documentElement); g.strokeStyle = est.getPropertyValue('--line').trim() || '#ddd'; g.lineWidth = 1; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(16, H * 0.62); g.lineTo(W - 16, H * 0.62); g.stroke(); g.setLineDash([]);
  g.strokeStyle = est.getPropertyValue('--ink').trim() || '#0e1f33'; g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round';
  [...tinta.trazos, ...(tinta.actual ? [tinta.actual] : [])].forEach(st => { g.beginPath(); st.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); if (st.length === 1) { g.arc(st[0].x, st[0].y, 1.6, 0, 7); } g.stroke(); });
  $('#escVacio').hidden = tinta.trazos.length > 0 || !!tinta.actual;
}
async function reconocerAhora() {
  if (!tinta.trazos.length) { $('#escTexto').value = ''; $('#escVista').innerHTML = ''; $('#escUsar').disabled = true; return; }
  try {
    await cargarModeloEscritura();
    const r = reconocerTrazos(tinta.trazos.map(st => st.map(p => ({ x: p.x, y: p.y })))), t = limpiarEscritura(r.texto);
    $('#escTexto').value = t; pintarVistaEscritura(); $('#escUsar').disabled = !t;
    $('#escEstado').textContent = !t ? 'No pude reconocer nada todavía.' : r.dudoso ? 'Revisá lo reconocido: algún símbolo no quedó claro (podés corregirlo abajo).' : 'Listo. Si algo no quedó bien, corregilo abajo.';
  } catch (e) { $('#escEstado').textContent = e.message; }
}
function pintarVistaEscritura() { const t = $('#escTexto').value.trim(); $('#escVista').innerHTML = t ? katexHTML(escrituraALatex(t), true) : ''; $('#escUsar').disabled = !t; }
(function () {
  const cv = $('#escLienzo'); if (!cv) return;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); clearTimeout(tinta.reloj); tinta.actual = [pos(e)]; dibujarTinta(); });
  cv.addEventListener('pointermove', e => { if (!tinta.actual) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; evs.forEach(ev => tinta.actual.push(pos(ev))); dibujarTinta(); });
  const fin = () => { if (!tinta.actual) return; tinta.trazos.push(tinta.actual); tinta.actual = null; dibujarTinta(); clearTimeout(tinta.reloj); tinta.reloj = setTimeout(reconocerAhora, 800); };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  $('#escDeshacer').addEventListener('click', () => { tinta.trazos.pop(); dibujarTinta(); reconocerAhora(); });
  $('#escBorrar').addEventListener('click', () => { tinta.trazos = []; dibujarTinta(); reconocerAhora(); $('#escEstado').textContent = ''; });
  $('#escTexto').addEventListener('input', pintarVistaEscritura);
  $('#escUsar').addEventListener('click', () => { const t = $('#escTexto').value.trim(); if (!t) return; $('#dlgEscritura').close(); campoTexto.value = t; if (hayMathLive()) campoMath.setValue(''); actualizarDeteccion(); resolverAhora(); });
  $('#cerrarEscritura').addEventListener('click', () => $('#dlgEscritura').close());
  $('#botonEscribir').addEventListener('click', () => { $('#dlgEscritura').showModal(); requestAnimationFrame(dibujarTinta); cargarModeloEscritura().catch(e => { $('#escEstado').textContent = e.message; }); });
  window.addEventListener('resize', () => { if ($('#dlgEscritura').open) dibujarTinta(); });
})();
