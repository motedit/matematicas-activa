/* =======================================================================
 * GRAFICADOR INTERACTIVO (nuevas mejoras, sección B · punto 9)
 * Ventana con un gráfico en lienzo (canvas):
 *   · hasta 4 funciones de x, con colores;
 *   · deslizadores automáticos para las letras que no son x (a, b, c, k…);
 *   · zoom con la ruedita o con dos dedos, mover arrastrando, botones +/−;
 *   · al pasar el mouse (o tocar), muestra (x ; f(x)) de cada curva;
 *   · marca ceros, máximos y mínimos de lo que se ve.
 * Usa el motor de cálculo (cS, cNum) para leer las fórmulas, así que antes
 * de abrir se asegura de que esté cargado.
 * ===================================================================== */
'use strict';

const GR_COLORES = ['#1b6ec2', '#e5604a', '#17a398', '#7a5cc4'];
const GR_LETRAS_MOTOR = ['k', 'h', 't', 'y'];          // letras libres del motor para los parámetros
const gr = { vista: { cx: 0, cy: 0, esc: 40 }, funcs: [], params: {}, cursor: null, punteros: new Map(), puntosClave: true };

// Lee "a x^2 + b x + c" → { e (árbol del motor), mapa letra→letra del motor }
function grLeer(txt) {
  let s = String(txt).replace(/^\s*(?:[fghy]\s*\(\s*x\s*\)|y)\s*=\s*/i, '').trim(); if (!s) return null;
  const reservadas = ['sen', 'sin', 'cos', 'tg', 'tan', 'cotg', 'cot', 'sec', 'cosec', 'csc', 'ln', 'log', 'sqrt', 'raiz', 'arcsen', 'arccos', 'arctg', 'arctan', 'pi', 'abs', 'exp'];
  s = s.replace(/[a-zñ]+/gi, w => (reservadas.includes(w.toLowerCase()) ? w : w.split('').join('*')));       // "ax" → "a*x"
  const letras = [...new Set((s.match(/(?<![a-záéíóúñ])[a-df-wz](?![a-záéíóúñ])/gi) || []).map(l => l.toLowerCase()))].filter(l => !reservadas.includes(l)).slice(0, 4);
  const mapa = {}; letras.forEach((l, i) => { mapa[l] = GR_LETRAS_MOTOR[i]; });
  const t = s.replace(/(?<![a-záéíóúñ])[a-df-wz](?![a-záéíóúñ])/gi, l => mapa[l.toLowerCase()] || l);
  try { return { e: cS(cPrefijo ? cPrefijo(t) : t), mapa }; } catch (e) { return null; }
}
function grValor(f, x) { const v = { x }; for (const [l, m] of Object.entries(f.mapa)) v[m] = gr.params[l] ?? 1; try { return cNum(f.e, v); } catch (e) { return NaN; } }
// Conversión pantalla ↔ coordenadas
const grAX = (px, W) => gr.vista.cx + (px - W / 2) / gr.vista.esc, grAY = (py, H) => gr.vista.cy - (py - H / 2) / gr.vista.esc;
const grPX = (x, W) => W / 2 + (x - gr.vista.cx) * gr.vista.esc, grPY = (y, H) => H / 2 - (y - gr.vista.cy) * gr.vista.esc;
// Busca dónde cambia de signo una función entre a y b (para afinar ceros y extremos)
function grBiseccion(fn, a, b) { let fa = fn(a); for (let k = 0; k < 50; k++) { const m = (a + b) / 2, fm = fn(m); if (!isFinite(fm)) break; if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; }
function grPaso(esc) { const bruto = 80 / esc, p = 10 ** Math.floor(Math.log10(bruto)), m = bruto / p; return (m < 2 ? 1 : m < 5 ? 2 : 5) * p; }
const grFmt = v => { const r = Math.abs(v) < 1e-10 ? 0 : +v.toPrecision(4); return String(r).replace('.', ','); };
function grDibujar() {
  const cv = $('#grLienzo'); if (!cv || $('#dlgGrafico').open === false) return;
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const est = getComputedStyle(document.documentElement), col = n => est.getPropertyValue(n).trim() || '#888';
  g.fillStyle = col('--panel'); g.fillRect(0, 0, W, H);
  // cuadrícula y ejes
  const paso = grPaso(gr.vista.esc), x0 = grAX(0, W), x1 = grAX(W, W), y0 = grAY(H, H), y1 = grAY(0, H);
  g.lineWidth = 1; g.strokeStyle = col('--line'); g.font = '11px Inter, sans-serif'; g.fillStyle = col('--ink-soft');
  for (let x = Math.ceil(x0 / paso) * paso; x <= x1; x += paso) { const p = grPX(x, W); g.beginPath(); g.moveTo(p, 0); g.lineTo(p, H); g.stroke(); }
  for (let y = Math.ceil(y0 / paso) * paso; y <= y1; y += paso) { const p = grPY(y, H); g.beginPath(); g.moveTo(0, p); g.lineTo(W, p); g.stroke(); }
  g.strokeStyle = col('--ink-soft'); g.lineWidth = 1.4; const ex = grPY(0, H), ey = grPX(0, W);
  g.beginPath(); g.moveTo(0, ex); g.lineTo(W, ex); g.moveTo(ey, 0); g.lineTo(ey, H); g.stroke();
  const ly = Math.min(Math.max(ex + 13, 12), H - 4), lx = Math.min(Math.max(ey - 4, 26), W - 4);
  g.textAlign = 'center'; for (let x = Math.ceil(x0 / paso) * paso; x <= x1; x += paso) if (Math.abs(x) > paso / 2) g.fillText(grFmt(x), grPX(x, W), ly);
  g.textAlign = 'right'; for (let y = Math.ceil(y0 / paso) * paso; y <= y1; y += paso) if (Math.abs(y) > paso / 2) g.fillText(grFmt(y), lx, grPY(y, H) + 4);
  // curvas
  const claves = [];
  gr.funcs.forEach((f, i) => {
    if (!f.e) return; g.strokeStyle = GR_COLORES[i]; g.lineWidth = 2.4; g.beginPath(); let antes = null, prevY = null, prevX = null;
    for (let px = 0; px <= W; px += 1) {
      const x = grAX(px, W), y = grValor(f, x), py = grPY(y, H);
      if (!isFinite(y) || (antes !== null && Math.abs(py - antes) > H * 2)) { antes = null; continue; }            // corte (asíntota)
      if (antes === null) g.moveTo(px, py); else g.lineTo(px, py); antes = py;
      if (gr.puntosClave && prevY !== null && isFinite(prevY)) {
        if (Math.sign(y) !== Math.sign(prevY) && prevY !== 0 && Math.abs(y - prevY) < 5 * paso) claves.push({ x: grBiseccion(z => grValor(f, z), prevX, x), y: 0, c: GR_COLORES[i], tipo: 'cero' });
      }
      prevY = y; prevX = x;
    }
    g.stroke();
    if (gr.puntosClave) {                               // máximos y mínimos: cambio de signo de la pendiente
      const h = 1 / gr.vista.esc; let dAnt = null;
      const der = z => grValor(f, z + 1e-6) - grValor(f, z - 1e-6);
      for (let px = 2; px <= W - 2; px += 2) { const x = grAX(px, W), d = grValor(f, x + h) - grValor(f, x - h); if (dAnt !== null && isFinite(d) && isFinite(dAnt) && Math.sign(d) !== Math.sign(dAnt) && d !== 0) { const xe = grBiseccion(der, grAX(px - 2, W), x), y = grValor(f, xe); if (isFinite(y) && Math.abs(grPY(y, H)) < 1e5) claves.push({ x: xe, y, c: GR_COLORES[i], tipo: dAnt > 0 ? 'máx' : 'mín' }); } dAnt = d; }
    }
  });
  for (let a = claves.length - 1; a > 0; a--) if (claves.slice(0, a).some(q => q.c === claves[a].c && Math.abs(q.x - claves[a].x) * gr.vista.esc < 3 && Math.abs(q.y - claves[a].y) * gr.vista.esc < 3)) claves.splice(a, 1);   // sin repetidos
  claves.forEach(p => { const X = grPX(p.x, W), Y = grPY(p.y, H); g.fillStyle = col('--panel'); g.strokeStyle = p.c; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, 4.5, 0, 7); g.fill(); g.stroke(); });
  gr.claves = claves;
  // lectura en el cursor
  if (gr.cursor) {
    const x = grAX(gr.cursor.x, W), cercano = claves.find(p => Math.hypot(grPX(p.x, W) - gr.cursor.x, grPY(p.y, H) - gr.cursor.y) < 10);
    g.strokeStyle = col('--ink-soft'); g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(gr.cursor.x, 0); g.lineTo(gr.cursor.x, H); g.stroke(); g.setLineDash([]);
    const filas = cercano ? [{ c: cercano.c, t: `${cercano.tipo === 'cero' ? 'cero' : cercano.tipo}: (${grFmt(cercano.x)} ; ${grFmt(cercano.y)})` }] : gr.funcs.map((f, i) => ({ f, i })).filter(z => z.f.e).map(({ f, i }) => { const y = grValor(f, x); if (isFinite(y)) { g.fillStyle = GR_COLORES[i]; g.beginPath(); g.arc(gr.cursor.x, grPY(y, H), 4, 0, 7); g.fill(); } return { c: GR_COLORES[i], t: `(${grFmt(x)} ; ${isFinite(y) ? grFmt(y) : '—'})` }; });
    g.font = '600 12px "Space Mono", monospace'; const wcaja = Math.max(...filas.map(z => g.measureText(z.t).width)) + 26, hcaja = filas.length * 18 + 10;
    let bx = gr.cursor.x + 12, by = 10; if (bx + wcaja > W) bx = gr.cursor.x - wcaja - 12;
    g.fillStyle = col('--bg-deep'); g.globalAlpha = 0.92; g.beginPath(); g.roundRect ? g.roundRect(bx, by, wcaja, hcaja, 8) : g.rect(bx, by, wcaja, hcaja); g.fill(); g.globalAlpha = 1;
    filas.forEach((z, k) => { g.fillStyle = z.c; g.beginPath(); g.arc(bx + 11, by + 14 + k * 18, 4, 0, 7); g.fill(); g.fillStyle = '#e3eef9'; g.textAlign = 'left'; g.fillText(z.t, bx + 20, by + 18 + k * 18); });
    $('#grLectura').textContent = filas.map(z => z.t).join('   ');
  }
}
function grPintarFunciones() {
  $('#grFunciones').innerHTML = gr.funcs.map((f, i) => `<div class="gr-fila"><span class="gr-color" style="background:${GR_COLORES[i]}"></span><span class="gr-fx">f<sub>${i + 1}</sub>(x) =</span><input class="texto" data-gf="${i}" value="${escapar(f.txt)}" aria-label="Función ${i + 1}" spellcheck="false" autocomplete="off">${gr.funcs.length > 1 ? `<button type="button" class="gr-quitar" data-gq="${i}" aria-label="Quitar función ${i + 1}">×</button>` : ''}</div>`).join('');
  $('#grFunciones').querySelectorAll('[data-gf]').forEach(inp => inp.addEventListener('input', () => { const f = gr.funcs[+inp.dataset.gf]; f.txt = inp.value; Object.assign(f, grLeer(inp.value) || { e: null, mapa: {} }); inp.classList.toggle('invalido', !!inp.value.trim() && !f.e); grPintarParams(); grDibujar(); }));
  $('#grFunciones').querySelectorAll('[data-gq]').forEach(b => b.addEventListener('click', () => { gr.funcs.splice(+b.dataset.gq, 1); grPintarFunciones(); grPintarParams(); grDibujar(); }));
  $('#grAgregar').hidden = gr.funcs.length >= 4;
}
function grPintarParams() {
  const letras = [...new Set(gr.funcs.flatMap(f => Object.keys(f.mapa || {})))].sort();
  letras.forEach(l => { if (gr.params[l] === undefined) gr.params[l] = 1; });
  $('#grParams').innerHTML = letras.map(l => `<label class="gr-param"><span>${l} = <b id="grv-${l}">${grFmt(gr.params[l])}</b></span><input type="range" min="-5" max="5" step="0.1" value="${gr.params[l]}" data-gp="${l}" aria-label="Valor de ${l}"></label>`).join('');
  $('#grParams').hidden = !letras.length;
  $('#grParams').querySelectorAll('[data-gp]').forEach(r => r.addEventListener('input', () => { gr.params[r.dataset.gp] = +r.value; $('#grv-' + r.dataset.gp).textContent = grFmt(+r.value); grDibujar(); }));
}
function grZoom(factor, px, py) {
  const cv = $('#grLienzo'), W = cv.clientWidth, H = cv.clientHeight; px = px ?? W / 2; py = py ?? H / 2;
  const ax = grAX(px, W), ay = grAY(py, H); gr.vista.esc = Math.min(4000, Math.max(2, gr.vista.esc * factor));
  gr.vista.cx = ax - (px - W / 2) / gr.vista.esc; gr.vista.cy = ay + (py - H / 2) / gr.vista.esc; grDibujar();
}
// Función del ejercicio actual (si la hay): f(x) = …, y = …, o la expresión de una derivada/integral/límite
function grFuncionDelEjercicio() {
  const t = String(ultimaEntrada || '');
  let m = t.match(/(?:[fgh]\s*\(\s*x\s*\)|\by)\s*=\s*([^,;]+?)(?:\s+(?:en|si|para|entre|desde|con|,)|$)/i); if (m && /x/.test(m[1])) return m[1].trim();
  m = t.match(/(?:derivada de|deriva[r]?|graficar|grafica de|gráfica de|estudio de)\s+(.+)$/i); if (m && /x/.test(m[1])) return m[1].replace(/\s+(en|entre|desde)\s.*$/, '').trim();
  m = t.match(/∫(?:_[^ ]+)?\s*(.+?)\s*dx/); if (m) return m[1].trim();
  m = t.match(/lim[^ ]*\s+[^ ]+\s+(.+)$/i); if (m && /x/.test(m[1])) return m[1].trim();
  return /x/.test(t) && !/[=<>]/.test(t) ? t.trim() : '';
}
function abrirGraficador(inicial) {
  conMotor('calc', () => {
    const txt = inicial !== undefined ? inicial : grFuncionDelEjercicio() || 'a x^2 + b x + c';
    gr.funcs = [{ txt, ...(grLeer(txt) || { e: null, mapa: {} }) }]; gr.vista = { cx: 0, cy: 0, esc: 40 }; gr.cursor = null;
    grPintarFunciones(); grPintarParams(); $('#dlgGrafico').showModal(); requestAnimationFrame(grDibujar);
  });
}
/* ---------- Eventos ---------- */
(function () {
  const cv = $('#grLienzo'); if (!cv) return;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e); grZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); }, { passive: false });
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); gr.punteros.set(e.pointerId, pos(e)); gr.cursor = pos(e); grDibujar(); });
  cv.addEventListener('pointermove', e => {
    const p = pos(e), antes = gr.punteros.get(e.pointerId);
    if (antes && gr.punteros.size === 1) { gr.vista.cx -= (p.x - antes.x) / gr.vista.esc; gr.vista.cy += (p.y - antes.y) / gr.vista.esc; }
    if (antes && gr.punteros.size === 2) { const otro = [...gr.punteros.entries()].find(([id]) => id !== e.pointerId)[1], d0 = Math.hypot(antes.x - otro.x, antes.y - otro.y), d1 = Math.hypot(p.x - otro.x, p.y - otro.y); if (d0 > 0) grZoom(d1 / d0, (p.x + otro.x) / 2, (p.y + otro.y) / 2); }
    if (antes) gr.punteros.set(e.pointerId, p); gr.cursor = p; grDibujar();
  });
  const fin = e => { gr.punteros.delete(e.pointerId); };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  cv.addEventListener('pointerleave', () => { if (!gr.punteros.size) { gr.cursor = null; grDibujar(); } });
  cv.addEventListener('keydown', e => { const d = 40 / gr.vista.esc, k = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key]; if (k) { e.preventDefault(); gr.vista.cx += k[0]; gr.vista.cy += k[1]; grDibujar(); } if (e.key === '+') grZoom(1.25); if (e.key === '-') grZoom(0.8); });
  $('#grMas').addEventListener('click', () => grZoom(1.25)); $('#grMenos').addEventListener('click', () => grZoom(0.8));
  $('#grCentrar').addEventListener('click', () => { gr.vista = { cx: 0, cy: 0, esc: 40 }; grDibujar(); });
  $('#grClave').addEventListener('change', e => { gr.puntosClave = e.target.checked; grDibujar(); });
  $('#grAgregar').addEventListener('click', () => { if (gr.funcs.length < 4) { gr.funcs.push({ txt: '', e: null, mapa: {} }); grPintarFunciones(); $('#grFunciones').querySelector(`[data-gf="${gr.funcs.length - 1}"]`).focus(); } });
  $('#cerrarGrafico').addEventListener('click', () => $('#dlgGrafico').close());
  $('#botonGraficar').addEventListener('click', () => abrirGraficador());
  $('#botonGraficador').addEventListener('click', () => abrirGraficador(''));
  window.addEventListener('resize', () => { if ($('#dlgGrafico').open) grDibujar(); });
})();
