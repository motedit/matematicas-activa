/* =======================================================================
 * MOTOR: ESTADÍSTICA Y PROBABILIDAD
 * Estadística descriptiva, probabilidad, distribuciones e inferencia. Usa la simplificación de cálculo para la regla de Simpson.
 * Es lógica pura (no toca la página): recibe texto y devuelve
 * { tema, metodo, pasos, resultado, alternativas }.
 * ===================================================================== */
'use strict';
/* MOTOR-ESTADISTICA-INICIO ===============================================
 * Estadística y probabilidad. Todo numérico (con decimales), con funciones
 * especiales propias (normal, t de Student, chi-cuadrado, F) y gráficos SVG.
 * ====================================================================== */

/* -----------------------------------------------------------------------
 * E1. NÚMEROS, LECTURA DE DATOS
 * --------------------------------------------------------------------- */
const eR = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d;
const eL = (x, d = 4) => (isFinite(x) ? L_x(eR(x, d)) : x > 0 ? '+\\infty' : x < 0 ? '-\\infty' : '—');
const eT = (x, d = 4) => fmtX(eR(x, d), d);
const eSum = a => a.reduce((s, v) => s + v, 0), eMedia = a => eSum(a) / a.length;
// Convierte "2,5" o "2.5" o "3/4" en número
function eNum(s) { s = String(s).trim().replace(/\s/g, ''); if (/^-?\d+\/\d+$/.test(s)) { const [a, b] = s.split('/'); return +a / +b; } if (/^-?\d+%$/.test(s)) return +s.slice(0, -1) / 100; return +s.replace(',', '.'); }
// Lista de números: acepta separadores ";", espacios o ", " (coma + espacio). "2,5" sin espacio es decimal.
function eLista(s) {
  s = s.replace(/[{}\[\]]/g, ' ').trim().replace(/[;,\s]+$/, '');
  const partes = /;/.test(s) ? s.split(/;/) : /,\s/.test(s) || !/\d,\d/.test(s) ? s.split(/,\s*|\s+/) : s.split(/\s+/);
  return partes.map(p => p.trim()).filter(p => /^-?\d+([.,]\d+)?(\/\d+)?%?$/.test(p)).map(eNum);
}
function ePalabras(s) { return s.split(/[;,\n]+|\s+y\s+/).map(p => p.trim().toLowerCase()).filter(p => p && !/^\d/.test(p)); }
// Busca "etiqueta: valores" (por ejemplo "x: 1, 2, 3; y: 4, 5, 6") → { x: [..], y: [..] }
function eEtiquetas(texto) {
  const out = {}, re = /(?<=^|[\s;.,(])([a-zA-ZáéíóúÁÉÍÓÚñ][\wáéíóúñ]*(?:\s+[A-Z0-9][\w]{0,2})?)\s*[:=]\s*((?:-?\d+(?:[.,]\d+)?%?\s*[,;]?\s*)+)/g; let m;
  while ((m = re.exec(texto))) { const k = plano(m[1]).trim(); const v = eLista(m[2].replace(/;\s*$/, '')); if (v.length >= 2) out[k] = v; }
  return out;
}
// Datos: lista simple, tabla x/f, intervalos con frecuencias o datos cualitativos
function eDatos(texto) {
  const t = plano(texto), et = eEtiquetas(texto);
  const ivm = [...texto.matchAll(/[\[(]?\s*(-?\d+(?:[.,]\d+)?)\s*[-–;,]\s*(-?\d+(?:[.,]\d+)?)\s*[\])]?\s*[:→]\s*(\d+)/g)];
  if (ivm.length >= 2) return { tipo: 'agrupados', clases: ivm.map(m => ({ a: eNum(m[1]), b: eNum(m[2]), f: +m[3] })) };
  const ki = Object.keys(et).find(k => /interval|clase/.test(k)), kf = Object.keys(et).find(k => /^f|frecuenc/.test(k));
  if (ki && kf) { const iv = texto.match(new RegExp('(?:intervalos?|clases?)\\s*[:=]\\s*([^;]+(?:;[^:]+)?)', 'i')); }
  const kx = Object.keys(et).find(k => /^(x|valores?|xi|dato)/.test(k)); if (kx && kf && et[kx].length === et[kf].length) { const datos = []; et[kx].forEach((x, i) => { for (let j = 0; j < et[kf][i]; j++) datos.push(x); }); return { tipo: 'tabla', x: et[kx], f: et[kf], datos }; }
  const cuerpo = texto.includes(':') ? texto.slice(texto.indexOf(':') + 1) : texto;
  const nums = eLista(cuerpo.replace(/[a-záéíóúñ]+\s*=\s*-?\d+([.,]\d+)?/gi, ' ').replace(/[a-záéíóúñ()]+/gi, ' '));
  if (nums.length >= 3) return { tipo: 'lista', datos: nums };
  const pal = ePalabras(cuerpo); if (pal.length >= 3) return { tipo: 'cualitativos', datos: pal };
  throw new Error('No encontré los datos. Escribilos así: “datos: 4, 7, 5, 9, 5, 6” (separados por coma y espacio, o por punto y coma si usás coma decimal).');
}
// Parámetros con nombre: n = 10, p = 0,3, μ = 50, σ = 10, λ = 3, α = 0,05…
function eParam(texto, nombres) {
  const s = texto.replace(/μ|\bmu\b/g, 'mu').replace(/σ|\bsigma\b/g, 'sigma').replace(/λ|\blambda\b/g, 'lambda').replace(/α|\balfa\b|\balpha\b/g, 'alfa').replace(/x̄|\boverlinex\b|\bbarx\b|\bxbarra\b|media muestral/g, 'xbar');
  for (const n of nombres) { const m = s.match(new RegExp(`(?:^|[^a-zA-Z])${n}\\s*(?:=|:|de|es)\\s*(-?\\d+(?:[.,]\\d+)?(?:\\/\\d+)?%?)`, 'i')); if (m) return eNum(m[1]); }
  return null;
}

/* -----------------------------------------------------------------------
 * E2. FUNCIONES ESPECIALES (implementación propia)
 * --------------------------------------------------------------------- */
// Regla de Simpson propia (así estadística no necesita cargar el motor de integrales)
function eSimpson(f, a, b, n = 2000) { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; }
const ePhi = z => { if (!isFinite(z)) return z > 0 ? 1 : 0; const f = t => Math.exp(-t * t / 2) / Math.sqrt(2 * Math.PI); return 0.5 + Math.sign(z) * eSimpson(f, 0, Math.min(Math.abs(z), 12), 2000); };
const eInvPhi = p => { let lo = -12, hi = 12; for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (ePhi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
function eLnGamma(x) { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - eLnGamma(1 - x); x -= 1; let a = c[0]; const t = x + g + 0.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }
function eBetaFC(a, b, x) {                         // fracción continua de la beta incompleta (método de Lentz)
  const tiny = 1e-30; let c = 1, d = 1 - (a + b) * x / (a + 1); if (Math.abs(d) < tiny) d = tiny; d = 1 / d; let h = d;
  for (let m = 1; m <= 300; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny; c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1)); d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny; c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break; }
  return h;
}
function eBetaInc(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(eLnGamma(a + b) - eLnGamma(a) - eLnGamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * eBetaFC(a, b, x) / a : 1 - bt * eBetaFC(b, a, 1 - x) / b; }
function eGammaInc(a, x) {                         // P(a, x) regularizada inferior
  if (x <= 0) return 0;
  if (x < a + 1) { let s = 1 / a, d = s; for (let n = 1; n < 500; n++) { d *= x / (a + n); s += d; if (Math.abs(d) < Math.abs(s) * 1e-15) break; } return s * Math.exp(-x + a * Math.log(x) - eLnGamma(a)); }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d; for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
  return 1 - Math.exp(-x + a * Math.log(x) - eLnGamma(a)) * h;
}
const eTcdf = (t, gl) => { const x = gl / (gl + t * t), p = 0.5 * eBetaInc(x, gl / 2, 0.5); return t >= 0 ? 1 - p : p; };
const eChiCdf = (x, gl) => eGammaInc(gl / 2, x / 2);
const eFcdf = (f, d1, d2) => eBetaInc(d1 * f / (d1 * f + d2), d1 / 2, d2 / 2);
const eInv = (cdf, p, lo = -1e3, hi = 1e3) => { for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
const eComb = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };

/* -----------------------------------------------------------------------
 * E3. GRÁFICOS
 * --------------------------------------------------------------------- */
const E_COL = ['#1b6ec2', '#17a398', '#e0a53a', '#7a5cc4', '#e5604a', '#0f7d74', '#c4862a', '#5a748c'];   // paleta de Matemáticas Activa
function eMarco(W, H, x0, x1, y0, y1, etX = '', etY = '') {
  const X = x => 40 + (x - x0) / (x1 - x0 || 1) * (W - 55), Y = y => H - 28 - (y - y0) / (y1 - y0 || 1) * (H - 45);
  const paso = r => { const p = 10 ** Math.floor(Math.log10(r || 1)); return [1, 2, 5, 10].map(k => k * p).find(k => k >= r); }, py = paso((y1 - y0) / 6);
  let g = ''; for (let y = Math.ceil(y0 / py) * py; y <= y1 + 1e-9; y += py) g += `<line x1="40" y1="${Y(y)}" x2="${W - 15}" y2="${Y(y)}" class="gr"/><text x="35" y="${Y(y) + 4}" class="et" text-anchor="end">${fmtX(eR(y, 3))}</text>`;
  g += `<line x1="40" y1="${Y(y0)}" x2="${W - 15}" y2="${Y(y0)}" class="ej"/><line x1="40" y1="${H - 28}" x2="40" y2="12" class="ej"/>`;
  return { X, Y, g, W, H };
}
function eSvgBarras(cats, vals, { etY = 'f', unidas = false, poligono = false } = {}) {
  const W = 360, H = 240, n = cats.length, mx = Math.max(...vals) * 1.1 || 1, M = eMarco(W, H, 0, n, 0, mx); let g = M.g;
  const ancho = (W - 55) / n;
  vals.forEach((v, i) => { const x = 40 + i * ancho + (unidas ? 0 : ancho * 0.15), w = unidas ? ancho : ancho * 0.7; g += `<rect x="${x}" y="${M.Y(v)}" width="${w}" height="${M.Y(0) - M.Y(v)}" fill="${E_COL[i % E_COL.length]}" fill-opacity="${unidas ? 0.55 : 0.85}" stroke="#0e1f33" stroke-opacity=".35" stroke-width="${unidas ? 1 : 0}"/><text x="${40 + (i + 0.5) * ancho}" y="${H - 12}" class="et">${String(cats[i]).slice(0, 10)}</text>`; });
  if (poligono) { const pts = vals.map((v, i) => `${40 + (i + 0.5) * ancho},${M.Y(v)}`); g += `<polyline points="${40 - ancho * 0.5},${M.Y(0)} ${pts.join(' ')} ${40 + (n + 0.5) * ancho},${M.Y(0)}" class="curva" fill="none"/>`; vals.forEach((v, i) => { g += `<circle cx="${40 + (i + 0.5) * ancho}" cy="${M.Y(v)}" r="3.5" class="pt"/>`; }); }
  return `<svg class="grafico ancho" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de barras">${g}</svg>`;
}
function eSvgSectores(cats, vals) {
  const W = 360, H = 230, cx = 115, cy = 115, r = 95, tot = eSum(vals); let a0 = -Math.PI / 2, g = '';
  vals.forEach((v, i) => { const a1 = a0 + 2 * Math.PI * v / tot, big = a1 - a0 > Math.PI ? 1 : 0, p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    g += vals.length === 1 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${E_COL[0]}"/>` : `<path d="M${cx},${cy} L${p0} A${r},${r} 0 ${big} 1 ${p1} Z" fill="${E_COL[i % E_COL.length]}" stroke="#fff" stroke-width="1.5"/>`;
    g += `<rect x="235" y="${20 + i * 22}" width="12" height="12" fill="${E_COL[i % E_COL.length]}"/><text x="252" y="${30 + i * 22}" class="et" text-anchor="start">${String(cats[i]).slice(0, 12)} (${fmtX(eR(100 * v / tot, 1))}%)</text>`; a0 = a1; });
  return `<svg class="grafico ancho" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagrama de sectores">${g}</svg>`;
}
function eSvgXY(xs, ys, { recta = null, linea = false, extra = [] } = {}) {
  const all = [...ys, ...extra.flatMap(e => e.ys)], x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(0, ...all), y1 = Math.max(...all), px = (x1 - x0) * 0.08 || 1, py = (y1 - y0) * 0.1 || 1;
  const M = eMarco(360, 240, x0 - px, x1 + px, y0 - (y0 < 0 ? py : 0), y1 + py); let g = M.g;
  xs.forEach(x => { g += `<text x="${M.X(x)}" y="${240 - 12}" class="et">${fmtX(eR(x, 2))}</text>`; });
  if (linea) g += `<polyline points="${xs.map((x, i) => `${M.X(x)},${M.Y(ys[i])}`).join(' ')}" class="curva" fill="none"/>`;
  extra.forEach((e, k) => { g += `<polyline points="${e.xs.map((x, i) => `${M.X(x)},${M.Y(e.ys[i])}`).join(' ')}" class="curva2" fill="none"/>`; });
  if (recta) { const [a, b] = recta, xa = x0 - px, xb = x1 + px; g += `<line x1="${M.X(xa)}" y1="${M.Y(a + b * xa)}" x2="${M.X(xb)}" y2="${M.Y(a + b * xb)}" class="curva2"/>`; }
  xs.forEach((x, i) => { g += `<circle cx="${M.X(x)}" cy="${M.Y(ys[i])}" r="4" class="pt"/>`; });
  return `<svg class="grafico ancho" viewBox="0 0 360 240" role="img" aria-label="Gráfico">${g}</svg>`;
}
function eSvgCampana(mu, s, a, b, f = null) {          // curva de densidad con área sombreada entre a y b
  const dens = f || (x => Math.exp(-(((x - mu) / s) ** 2) / 2) / (s * Math.sqrt(2 * Math.PI))), x0 = mu - 4 * s, x1 = mu + 4 * s, ym = dens(mu) * 1.15, M = eMarco(360, 220, x0, x1, 0, ym);
  let g = M.g, d = '', sh = ''; const A = Math.max(a, x0), B = Math.min(b, x1);
  for (let i = 0; i <= 200; i++) { const x = x0 + (x1 - x0) * i / 200; d += `${i ? 'L' : 'M'}${M.X(x).toFixed(1)},${M.Y(dens(x)).toFixed(1)}`; }
  if (B > A) { sh = `M${M.X(A)},${M.Y(0)}`; for (let i = 0; i <= 100; i++) { const x = A + (B - A) * i / 100; sh += `L${M.X(x).toFixed(1)},${M.Y(dens(x)).toFixed(1)}`; } sh += `L${M.X(B)},${M.Y(0)}Z`; g += `<path d="${sh}" class="region"/>`; }
  g += `<path d="${d}" class="curva"/>`; [-3, -2, -1, 0, 1, 2, 3].forEach(k => { g += `<text x="${M.X(mu + k * s)}" y="208" class="et">${fmtX(eR(mu + k * s, 2))}</text>`; });
  return `<svg class="grafico ancho" viewBox="0 0 360 220" role="img" aria-label="Curva de densidad">${g}</svg>`;
}
const eFilas = (cab, filas) => tabla(cab, filas.map(f => f.map(c => (typeof c === 'number' ? eT(c) : c))));

/* -----------------------------------------------------------------------
 * E4. TIPOS DE VARIABLES
 * --------------------------------------------------------------------- */
const E_TIPOS = [
  ['cualitativa ordinal', /nivel|grado de|satisfacc|calificaci[oó]n con letras|opini[oó]n|ranking|puesto|posici[oó]n en|talle|orden de m[eé]rito|estrato|clase social|medalla|categor[ií]a (de|del) hotel|escala|frecuencia con que|dolor/],
  ['cuantitativa discreta', /n[uú]mero de|cantidad de|hermanos|hijos|goles|alumnos|autos|mascotas|materias|veces|habitantes|faltas|visitas|llamadas|piezas|empleados|habitaciones|puntos|votos|errores|accidentes|nacimientos/],
  ['cuantitativa continua', /estatura|altura|peso|temperatura|tiempo|duraci[oó]n|distancia|velocidad|longitud|superficie|[aá]rea|volumen|presi[oó]n|salario|sueldo|ingreso|precio|edad|masa|consumo|caudal|glucosa|colesterol|nota promedio|promedio/],
  ['cualitativa nominal', /color|sexo|g[eé]nero|nacionalidad|marca|deporte|religi[oó]n|estado civil|profesi[oó]n|ocupaci[oó]n|tipo de|provincia|ciudad|lugar|nombre|comida|materia preferida|equipo|partido|idioma|m[uú]sica|carrera|barrio|preferencia|medio de transporte|signo|raza de perro|mascota preferida/]
];
const E_ORD = ['muy bajo', 'bajo', 'medio', 'alto', 'muy alto', 'malo', 'regular', 'bueno', 'muy bueno', 'excelente', 'nada', 'poco', 'bastante', 'mucho', 'primario', 'secundario', 'terciario', 'universitario', 's', 'm', 'l', 'xl', 'insuficiente', 'suficiente', 'aprobado', 'notable', 'sobresaliente'];
function resolverTiposVar(texto) {
  const { pasos, P } = crearPasos(), t = plano(texto);
  P('Recordamos la clasificación', 'Una variable es cualitativa si sus valores son categorías (palabras) y cuantitativa si son números que se pueden contar o medir. Las cualitativas pueden ser nominales (sin orden) u ordinales (con orden); las cuantitativas, discretas (se cuentan: valores aislados) o continuas (se miden: pueden tomar cualquier valor intermedio).', [], tabla(['Tipo', 'Pregunta clave', 'Ejemplo'], [['Cualitativa nominal', '¿Son categorías sin orden?', 'color de ojos'], ['Cualitativa ordinal', '¿Son categorías que se pueden ordenar?', 'nivel de estudios'], ['Cuantitativa discreta', '¿Se cuenta? (0, 1, 2, …)', 'cantidad de hermanos'], ['Cuantitativa continua', '¿Se mide? (admite decimales)', 'estatura']]));
  let filas = [];
  const datos = (() => { try { return eDatos(texto); } catch (e) { return null; } })();
  const lista = texto.replace(/^.*?(clasific\w*|tipo de variable\w*|variables?|es|son)\s*[:]?\s*/i, '').split(/[;,\n]|\s+y\s+(?=[a-záéíóú])/i).map(s => s.trim()).filter(s => s.length > 2 && !/^\d/.test(s));
  if (datos && (datos.tipo === 'lista' || datos.tipo === 'cualitativos') && (!lista.length || /datos|valores/.test(t))) {
    const d = datos.datos; let tipo, porque;
    if (datos.tipo === 'cualitativos') { const ord = d.every(w => E_ORD.includes(w)); tipo = ord ? 'cualitativa ordinal' : 'cualitativa nominal'; porque = ord ? 'los valores son categorías que tienen un orden natural' : 'los valores son categorías sin un orden natural'; }
    else { const ent = d.every(x => Number.isInteger(x)); tipo = ent ? 'cuantitativa discreta' : 'cuantitativa continua'; porque = ent ? 'los valores son números enteros que salen de contar' : 'aparecen valores con decimales: la variable se mide'; }
    filas = [[d.slice(0, 6).map(x => (typeof x === 'number' ? eT(x) : x)).join('; ') + (d.length > 6 ? '…' : ''), tipo, porque]];
  } else {
    if (!lista.length) throw new Error('Escribí las variables a clasificar, por ejemplo: clasificar: color de ojos, número de hermanos, estatura, nivel de estudios.');
    filas = lista.map(v => { const p = plano(v), hit = E_TIPOS.find(([, re]) => re.test(p)); const tipo = hit ? hit[0] : 'no la reconozco';
      const porque = { 'cualitativa nominal': 'sus valores son categorías sin orden', 'cualitativa ordinal': 'sus valores son categorías que se pueden ordenar', 'cuantitativa discreta': 'se obtiene contando: toma valores enteros aislados', 'cuantitativa continua': 'se obtiene midiendo: admite valores intermedios' }[tipo] || 'probá describirla con otras palabras';
      return [v, tipo + (/edad/.test(p) ? ' (si se cuenta en años cumplidos, se trata como discreta)' : ''), porque]; });
  }
  P('Clasificamos cada variable', 'Para cada una nos preguntamos: ¿son palabras o números? Si son palabras, ¿tienen orden? Si son números, ¿se cuentan o se miden?', [], tabla(['Variable', 'Tipo', '¿Por qué?'], filas));
  const ok = filas.filter(f => !/no la reconozco/.test(f[1])).length;
  P('Verificamos', 'Revisamos con las preguntas clave: una cuantitativa tiene que tener sentido sumarla o promediarla; una ordinal, ordenarla; una nominal, solo contar cuántas veces aparece cada categoría.', `${ok}\\text{ de }${filas.length}\\text{ variables clasificadas}\\;${ok === filas.length ? '\\checkmark' : ''}`);
  return { tema: 'tipos', metodo: 'Clasificación de variables', pasos, resultado: filas.map(f => tx(`${f[0]}: ${f[1].split(' (')[0]}`)).join(',\\;') };
}

/* -----------------------------------------------------------------------
 * E5. TABLAS DE FRECUENCIAS
 * --------------------------------------------------------------------- */
// Arma la tabla (por valores o por intervalos). Devuelve { filas: [{ etiqueta, x (marca), f, a, b }], n, agrupada }
function eTabla(D, forzarAgrupar = false) {
  if (D.tipo === 'agrupados') { const filas = D.clases.map(c => ({ etiqueta: `[${eT(c.a)};\\,${eT(c.b)})`, x: (c.a + c.b) / 2, f: c.f, a: c.a, b: c.b })); return { filas, n: eSum(filas.map(r => r.f)), agrupada: true }; }
  if (D.tipo === 'cualitativos') { const orden = E_ORD.filter(w => D.datos.includes(w)), cats = orden.length === new Set(D.datos).size ? orden : [...new Set(D.datos)]; return { filas: cats.map(c => ({ etiqueta: c, f: D.datos.filter(d => d === c).length })), n: D.datos.length, cual: true, ordinal: orden.length === cats.length }; }
  const d = [...D.datos].sort((a, b) => a - b), dist = [...new Set(d)];
  if (!forzarAgrupar && (dist.length <= 12 || D.tipo === 'tabla')) return { filas: dist.map(x => ({ etiqueta: eT(x), x, f: d.filter(v => v === x).length })), n: d.length, agrupada: false };
  const n = d.length, k = Math.max(4, Math.round(1 + 3.322 * Math.log10(n))), R = d[n - 1] - d[0], dec = d.some(x => !Number.isInteger(x)) ? 1 : 0, a = Math.ceil((R / k) * 10 ** dec + 1e-9) / 10 ** dec || 1;
  const filas = []; for (let i = 0; i < k; i++) { const li = eR(d[0] + i * a, 6), ls = eR(li + a, 6); filas.push({ etiqueta: `[${eT(li)};\\,${eT(ls)})`, x: (li + ls) / 2, f: d.filter(v => v >= li && (v < ls || (i === k - 1 && v <= ls))).length, a: li, b: ls }); }
  return { filas, n, agrupada: true, k, R, amp: a };
}
function eFilasFrec(T) {
  let F = 0; return T.filas.map(r => { F += r.f; return { ...r, h: r.f / T.n, F, H: F / T.n }; });
}
function resolverFrecuencias(texto) {
  const { pasos, P } = crearPasos(), D = eDatos(texto), T = eTabla(D, /agrup|interval|clase/.test(plano(texto))), filas = eFilasFrec(T);
  P('Ordenamos y contamos los datos', T.cual ? 'Es una variable cualitativa: contamos cuántas veces aparece cada categoría.' : T.agrupada && T.k ? 'Hay muchos valores distintos: conviene agruparlos en intervalos (clases).' : 'Contamos cuántas veces aparece cada valor.', D.datos ? `n=${T.n}` : `n=${T.n}`);
  if (T.k) P('Armamos los intervalos', 'Con la regla de Sturges elegimos la cantidad de clases; la amplitud es el rango dividido por esa cantidad (redondeado para arriba).', [`k\\approx 1+3{,}322\\,\\log(${T.n})\\approx ${T.k}`, `\\text{rango}=${eL(T.R)},\\quad\\text{amplitud}=\\frac{${eL(T.R)}}{${T.k}}\\approx ${eL(T.amp)}`]);
  const nominal = T.cual && !T.ordinal;
  P('Completamos la tabla de frecuencias', `fᵢ: frecuencia absoluta (cuántas veces). hᵢ = fᵢ/n: frecuencia relativa (proporción).${nominal ? '' : ' Fᵢ y Hᵢ: frecuencias acumuladas (se van sumando).'}${T.agrupada ? ' xᵢ es la marca de clase (punto medio del intervalo).' : ''}`, [],
    eFilas([T.cual ? 'Categoría' : T.agrupada ? 'Intervalo' : 'xᵢ', ...(T.agrupada ? ['Marca xᵢ'] : []), 'fᵢ', 'hᵢ', '%', ...(nominal ? [] : ['Fᵢ', 'Hᵢ'])], [...filas.map(r => [T.agrupada ? k$(r.etiqueta) : r.etiqueta, ...(T.agrupada ? [r.x] : []), r.f, r.h, eT(100 * r.h, 2) + '%', ...(nominal ? [] : [r.F, r.H])]), ['Total', ...(T.agrupada ? [''] : []), T.n, 1, '100%', ...(nominal ? [] : ['', ''])]]));
  const sh = eSum(filas.map(r => r.h));
  P('Verificamos', 'La suma de las frecuencias absolutas tiene que dar n, la de las relativas 1 y la última acumulada también n.', `\\sum f_i=${T.n},\\quad\\sum h_i=${eL(sh)}${nominal ? '' : `,\\quad F_{${filas.length}}=${filas[filas.length - 1].F}`}\\;${Math.abs(sh - 1) < 1e-9 ? '\\checkmark' : ''}`);
  return { tema: 'frecuencias', metodo: T.agrupada ? 'Tabla con datos agrupados' : 'Tabla de frecuencias', pasos, resultado: `n=${T.n},\\;${filas.length}\\;\\text{${T.agrupada ? 'clases' : T.cual ? 'categorías' : 'valores'}}` };
}

/* -----------------------------------------------------------------------
 * E6. REPRESENTACIONES GRÁFICAS
 * --------------------------------------------------------------------- */
function resolverGraficos(texto) {
  const t = plano(texto), { pasos, P } = crearPasos(), et = eEtiquetas(texto);
  if (/dispersion|nube de puntos/.test(t) || (et.x && et.y)) {
    const xs = et.x, ys = et.y; if (!xs || !ys || xs.length !== ys.length) throw new Error('Para un diagrama de dispersión escribí “x: 1, 2, 3; y: 4, 5, 7”.');
    P('Armamos los pares (x ; y)', 'Cada observación es un punto del plano. El diagrama de dispersión muestra si las variables se relacionan.', xs.map((x, i) => `(${eL(x)};\\,${eL(ys[i])})`).join(',\\;'));
    const r = eCorr(xs, ys);
    P('Dibujamos el diagrama de dispersión', `Si los puntos suben hacia la derecha, la relación es positiva; si bajan, negativa. Acá la tendencia es ${r > 0.3 ? 'positiva' : r < -0.3 ? 'negativa' : 'débil o nula'}.`, [], eSvgXY(xs, ys));
    P('Verificamos', 'Ubicamos todos los pares: tiene que haber un punto por cada observación.', `${xs.length}\\text{ puntos}\\;\\checkmark`);
    return { tema: 'graficos', metodo: 'Diagrama de dispersión', pasos, resultado: tx(`Diagrama de dispersión con ${xs.length} puntos`) };
  }
  const D = eDatos(texto), T = eTabla(D, /histograma|poligono|ojiva|agrup|interval/.test(t) && D.tipo === 'lista'), filas = eFilasFrec(T), cats = filas.map(r => (T.agrupada ? r.etiqueta.replace(/\\,|\\;/g, ' ') : r.etiqueta)), fs = filas.map(r => r.f);
  let tipo = /sector|torta|pie|circular/.test(t) ? 'sectores' : /histograma/.test(t) ? 'histograma' : /poligono/.test(t) ? 'poligono' : /barra/.test(t) ? 'barras' : T.cual ? 'barras y sectores' : T.agrupada ? 'histograma' : 'barras';
  P('Armamos la tabla de frecuencias', 'Primero contamos: el gráfico se dibuja a partir de las frecuencias.', [], eFilas([T.agrupada ? 'Intervalo' : T.cual ? 'Categoría' : 'xᵢ', 'fᵢ', 'hᵢ'], filas.map(r => [T.agrupada ? k$(r.etiqueta) : r.etiqueta, r.f, r.h])));
  const verif = [];
  if (/barras|poligono/.test(tipo) && !/histograma/.test(tipo)) { P(tipo === 'poligono' ? 'Dibujamos el polígono de frecuencias' : 'Dibujamos el diagrama de barras', tipo === 'poligono' ? 'Unimos con segmentos los puntos (xᵢ ; fᵢ) y cerramos sobre el eje en los extremos.' : 'Para variables cualitativas o discretas: una barra separada por cada valor, con altura igual a su frecuencia.', [], eSvgBarras(cats, fs, { poligono: tipo === 'poligono', unidas: tipo === 'poligono' && T.agrupada })); verif.push(`\\sum\\text{alturas}=${eSum(fs)}=n`); }
  if (/histograma/.test(tipo)) { P('Dibujamos el histograma', 'Para datos agrupados en intervalos: rectángulos pegados, con base en cada intervalo y altura igual a la frecuencia. El polígono une las marcas de clase.', [], eSvgBarras(cats, fs, { unidas: true, poligono: true })); verif.push(`\\sum\\text{alturas}=${eSum(fs)}=n`); }
  if (/sectores/.test(tipo)) { const ang = filas.map(r => 360 * r.h); P('Dibujamos el diagrama de sectores', 'Cada sector ocupa un ángulo proporcional a su frecuencia: ángulo = hᵢ · 360°.', filas.map((r, i) => `${T.cual ? tx(r.etiqueta) : r.etiqueta}:\\;${eL(r.h)}\\cdot 360^{\\circ}=${eL(ang[i], 2)}^{\\circ}`), eSvgSectores(cats, fs)); verif.push(`\\sum\\text{ángulos}=${eL(eSum(ang), 2)}^{\\circ}`); }
  P('Verificamos', 'Las alturas tienen que sumar n y los ángulos de los sectores, 360°.', verif.join(',\\quad') + '\\;\\checkmark');
  return { tema: 'graficos', metodo: { sectores: 'Diagrama de sectores', histograma: 'Histograma y polígono', poligono: 'Polígono de frecuencias', barras: 'Diagrama de barras', 'barras y sectores': 'Barras y sectores' }[tipo], pasos, resultado: tx(`Gráfico con ${filas.length} ${T.agrupada ? 'clases' : 'categorías'} (n = ${T.n})`), alternativas: [] };
}

/* -----------------------------------------------------------------------
 * E7. MEDIDAS DE TENDENCIA CENTRAL, DISPERSIÓN, FORMA Y POSICIÓN
 * --------------------------------------------------------------------- */
function eDatosNum(texto) { const D = eDatos(texto); if (D.tipo === 'cualitativos') throw new Error('Con datos cualitativos solo se puede calcular la moda (y la mediana si son ordinales).'); return D; }
function eModa(T) { const mx = Math.max(...T.filas.map(r => r.f)); return T.filas.filter(r => r.f === mx); }
function resolverCentral(texto) {
  const { pasos, P } = crearPasos(), D = eDatos(texto);
  if (D.tipo === 'cualitativos') { const T = eTabla(D), m = eModa(T); P('Contamos cada categoría', 'Con datos cualitativos la única medida de centralización que siempre tiene sentido es la moda.', [], eFilas(['Categoría', 'fᵢ'], T.filas.map(r => [r.etiqueta, r.f]))); P('Verificamos', 'La moda es la categoría con mayor frecuencia.', `\\text{Mo}=${tx(m.map(r => r.etiqueta).join(', '))}\\;(f=${m[0].f})\\;\\checkmark`); return { tema: 'central', metodo: 'Moda', pasos, resultado: `\\text{Mo}=${tx(m.map(r => r.etiqueta).join(', '))}` }; }
  const T = eTabla(D), n = T.n;
  if (D.tipo === 'agrupados') {
    const filas = eFilasFrec(T), media = eSum(filas.map(r => r.x * r.f)) / n, i = filas.findIndex(r => r.F >= n / 2), c = filas[i], Fant = i ? filas[i - 1].F : 0, a = c.b - c.a, me = c.a + (n / 2 - Fant) / c.f * a;
    const im = filas.reduce((b, r, k) => (r.f > filas[b].f ? k : b), 0), cm = filas[im], d1 = cm.f - (im ? filas[im - 1].f : 0), d2 = cm.f - (im < filas.length - 1 ? filas[im + 1].f : 0), mo = cm.a + d1 / (d1 + d2 || 1) * (cm.b - cm.a);
    P('Calculamos la media con las marcas de clase', 'Con datos agrupados usamos la marca de clase xᵢ como representante de cada intervalo.', [`\\bar{x}=\\frac{\\sum x_i f_i}{n}=\\frac{${eL(eSum(filas.map(r => r.x * r.f)))}}{${n}}=${eL(media)}`], eFilas(['Intervalo', 'xᵢ', 'fᵢ', 'xᵢ·fᵢ', 'Fᵢ'], filas.map(r => [k$(r.etiqueta), r.x, r.f, r.x * r.f, r.F])));
    P('Calculamos la mediana', `La mediana deja la mitad de los datos de cada lado: buscamos el intervalo donde la acumulada llega a n/2 = ${eT(n / 2)} e interpolamos.`, `\\text{Me}=L_i+\\frac{\\frac{n}{2}-F_{i-1}}{f_i}\\cdot a=${eL(c.a)}+\\frac{${eL(n / 2)}-${Fant}}{${c.f}}\\cdot ${eL(a)}=${eL(me)}`);
    P('Calculamos la moda', 'Está en el intervalo de mayor frecuencia (intervalo modal).', `\\text{Mo}=L_i+\\frac{d_1}{d_1+d_2}\\cdot a=${eL(cm.a)}+\\frac{${d1}}{${d1}+${d2}}\\cdot ${eL(cm.b - cm.a)}=${eL(mo)}`);
    P('Verificamos', 'La suma de los desvíos respecto de la media (pesados por la frecuencia) tiene que dar 0.', `\\sum (x_i-\\bar{x})f_i=${eL(eSum(filas.map(r => (r.x - media) * r.f)), 6)}\\;\\checkmark`);
    return { tema: 'central', metodo: 'Datos agrupados', pasos, resultado: `\\bar{x}=${eL(media)},\\;\\text{Me}=${eL(me)},\\;\\text{Mo}=${eL(mo)}` };
  }
  const d = [...D.datos].sort((a, b) => a - b), media = eMedia(d), me = n % 2 ? d[(n - 1) / 2] : (d[n / 2 - 1] + d[n / 2]) / 2, mo = eModa(T);
  P('Ordenamos los datos', 'Para la mediana hace falta tenerlos ordenados de menor a mayor.', d.length <= 40 ? d.map(x => eL(x)).join(',\\;') : `${d.slice(0, 15).map(x => eL(x)).join(',\\;')},\\;\\ldots`);
  P('Calculamos la media', 'Es el promedio: sumamos todos los datos y dividimos por la cantidad.', `\\bar{x}=\\frac{\\sum x_i}{n}=\\frac{${eL(eSum(d))}}{${n}}=${eL(media)}`);
  P('Calculamos la mediana', n % 2 ? `n = ${n} es impar: la mediana es el dato del medio, en la posición (n + 1)/2 = ${(n + 1) / 2}.` : `n = ${n} es par: la mediana es el promedio de los dos datos centrales (posiciones ${n / 2} y ${n / 2 + 1}).`, n % 2 ? `\\text{Me}=x_{(${(n + 1) / 2})}=${eL(me)}` : `\\text{Me}=\\frac{${eL(d[n / 2 - 1])}+${eL(d[n / 2])}}{2}=${eL(me)}`);
  P('Calculamos la moda', mo.length === T.filas.length ? 'Todos los valores aparecen la misma cantidad de veces: no hay moda.' : 'Es el valor que más se repite' + (mo.length > 1 ? ' (hay más de uno: es multimodal).' : '.'), mo.length === T.filas.length ? tx('Sin moda') : `\\text{Mo}=${mo.map(r => eL(r.x)).join(';\\,')}\\quad(f=${mo[0].f})`, eSvgBarras(T.filas.map(r => r.etiqueta), T.filas.map(r => r.f)));
  const debajo = d.filter(x => x <= me).length;
  P('Verificamos', 'La suma de los desvíos respecto de la media da 0, y al menos la mitad de los datos son menores o iguales que la mediana.', [`\\sum (x_i-\\bar{x})=${eL(eSum(d.map(x => x - media)), 6)}\\;\\checkmark`, `${debajo}\\ge\\frac{${n}}{2}\\;\\checkmark`]);
  return { tema: 'central', metodo: 'Media, mediana y moda', pasos, resultado: `\\bar{x}=${eL(media)},\\;\\text{Me}=${eL(me)},\\;\\text{Mo}=${mo.length === T.filas.length ? '\\nexists' : mo.map(r => eL(r.x)).join(';\\,')}` };
}
function eMomentos(D) { const T = eTabla(D), xs = T.filas.map(r => (r.x !== undefined ? r.x : 0)), fs = T.filas.map(r => r.f), n = T.n, media = eSum(xs.map((x, i) => x * fs[i])) / n, m = k => eSum(xs.map((x, i) => (x - media) ** k * fs[i])) / n; return { T, xs, fs, n, media, m2: m(2), m3: m(3), m4: m(4) }; }
function resolverDispersion(texto, metodo) {
  const { pasos, P } = crearPasos(), D = eDatosNum(texto), M = eMomentos(D), { T, xs, fs, n, media } = M, muestral = metodo === 'muestral' || (metodo !== 'poblacional' && /muestr/.test(plano(texto)));
  const sc = eSum(xs.map((x, i) => (x - media) ** 2 * fs[i])), vari = sc / (muestral ? n - 1 : n), s = Math.sqrt(vari), datosOrd = D.datos ? [...D.datos].sort((a, b) => a - b) : null;
  const R = datosOrd ? datosOrd[n - 1] - datosOrd[0] : T.filas[T.filas.length - 1].b - T.filas[0].a;
  P('Calculamos el rango', 'Es la diferencia entre el dato mayor y el menor: mide la amplitud total.', `R=${datosOrd ? `${eL(datosOrd[n - 1])}-${par(eL(datosOrd[0]))}` : `${eL(T.filas[T.filas.length - 1].b)}-${par(eL(T.filas[0].a))}`}=${eL(R)}`);
  P('Calculamos la media', 'La necesitamos para medir cuánto se alejan los datos.', `\\bar{x}=${eL(media)}`);
  P('Armamos la tabla de desvíos', 'Para cada valor calculamos su distancia a la media al cuadrado (así no se cancelan los positivos con los negativos).', [], eFilas([T.agrupada ? 'Marca xᵢ' : 'xᵢ', 'fᵢ', 'xᵢ − x̄', '(xᵢ − x̄)²·fᵢ'], [...T.filas.map((r, i) => [xs[i], fs[i], xs[i] - media, (xs[i] - media) ** 2 * fs[i]]), ['Total', n, '', sc]]));
  P(`Calculamos la varianza ${muestral ? 'muestral' : 'poblacional'}`, muestral ? 'Para una muestra dividimos por n − 1 (así la varianza estima mejor la de la población).' : 'Dividimos la suma de cuadrados por n (los datos son toda la población).', `${muestral ? 's^2' : '\\sigma^2'}=\\frac{\\sum (x_i-\\bar{x})^2 f_i}{${muestral ? 'n-1' : 'n'}}=\\frac{${eL(sc)}}{${muestral ? n - 1 : n}}=${eL(vari)}`);
  P('Calculamos la desviación típica y el coeficiente de variación', 'La desviación típica es la raíz de la varianza (vuelve a las unidades de los datos). El CV compara la dispersión con la media, en porcentaje.', [`${muestral ? 's' : '\\sigma'}=\\sqrt{${eL(vari)}}=${eL(s)}`, `CV=\\frac{${muestral ? 's' : '\\sigma'}}{\\bar{x}}\\cdot 100\\%=\\frac{${eL(s)}}{${eL(media)}}\\cdot 100\\%=${eL(100 * s / media, 2)}\\%`]);
  const alt2 = (eSum(xs.map((x, i) => x * x * fs[i])) - n * media * media) / (muestral ? n - 1 : n);
  P('Verificamos', 'Usamos la fórmula abreviada: ' + (muestral ? '$s^2 = \\frac{\\sum x_i^2 f_i - n\\bar{x}^2}{n-1}$.' : '$\\sigma^2 = \\frac{\\sum x_i^2 f_i}{n} - \\bar{x}^2$.'), `${eL(alt2)}=${eL(vari)}\\;${Math.abs(alt2 - vari) < 1e-6 * Math.max(1, vari) ? '\\checkmark' : ''}`);
  return { tema: 'dispersion', metodo: muestral ? 'Varianza muestral (n − 1)' : 'Varianza poblacional (n)', pasos, resultado: `R=${eL(R)},\\;${muestral ? 's^2' : '\\sigma^2'}=${eL(vari)},\\;${muestral ? 's' : '\\sigma'}=${eL(s)},\\;CV=${eL(100 * s / media, 2)}\\%`, alternativas: [{ nombre: muestral ? 'Ver como población (÷ n)' : 'Ver como muestra (÷ n − 1)', metodo: muestral ? 'poblacional' : 'muestral' }] };
}
function resolverForma(texto) {
  const { pasos, P } = crearPasos(), D = eDatosNum(texto), M = eMomentos(D), { T, xs, fs, n, media, m2, m3, m4 } = M, s = Math.sqrt(m2), g1 = m3 / s ** 3, g2 = m4 / m2 ** 2 - 3;
  P('Calculamos media y desviación típica', 'Las medidas de forma comparan los desvíos con la desviación típica.', [`\\bar{x}=${eL(media)},\\quad\\sigma=${eL(s)}`]);
  P('Calculamos los momentos centrales', 'Son promedios de las potencias de los desvíos: m₃ mide la asimetría y m₄ el apuntamiento.', [], eFilas([T.agrupada ? 'Marca xᵢ' : 'xᵢ', 'fᵢ', '(xᵢ−x̄)³·fᵢ', '(xᵢ−x̄)⁴·fᵢ'], [...T.filas.map((r, i) => [xs[i], fs[i], (xs[i] - media) ** 3 * fs[i], (xs[i] - media) ** 4 * fs[i]]), ['Total', n, m3 * n, m4 * n]]));
  const tipoA = Math.abs(g1) < 0.1 ? 'aproximadamente simétrica' : g1 > 0 ? 'asimétrica a la derecha (positiva): la cola larga está hacia los valores altos' : 'asimétrica a la izquierda (negativa): la cola larga está hacia los valores bajos';
  P('Coeficiente de asimetría de Fisher', 'Si g₁ ≈ 0 la distribución es simétrica; si es positivo, tiene cola a la derecha; si es negativo, a la izquierda.', `g_1=\\frac{m_3}{\\sigma^3}=\\frac{${eL(m3)}}{${eL(s)}^3}=${eL(g1)}\\;\\Rightarrow\\;\\text{${tipoA.split(':')[0]}}`);
  const tipoC = Math.abs(g2) < 0.1 ? 'mesocúrtica (como la normal)' : g2 > 0 ? 'leptocúrtica (más apuntada que la normal)' : 'platicúrtica (más achatada que la normal)';
  P('Coeficiente de curtosis', 'Se compara con la normal (que tiene g₂ = 0): g₂ > 0 más apuntada, g₂ < 0 más achatada.', `g_2=\\frac{m_4}{\\sigma^4}-3=\\frac{${eL(m4)}}{${eL(s)}^4}-3=${eL(g2)}\\;\\Rightarrow\\;\\text{${tipoC.split(' (')[0]}}`, eSvgBarras(T.filas.map(r => r.etiqueta.replace(/\\,|\\;/g, ' ')), fs, { unidas: T.agrupada }));
  const d = D.datos ? [...D.datos].sort((a, b) => a - b) : null, me = d ? (n % 2 ? d[(n - 1) / 2] : (d[n / 2 - 1] + d[n / 2]) / 2) : null, pear = me !== null ? 3 * (media - me) / s : null;
  P('Verificamos', 'Comparamos con el coeficiente de Pearson, Aₚ = 3(x̄ − Me)/σ: tienen que indicar el mismo sentido de asimetría (o ambos cerca de 0).', pear !== null ? `A_p=\\frac{3(${eL(media)}-${par(eL(me))})}{${eL(s)}}=${eL(pear)}\\;${Math.sign(eR(pear, 1)) === Math.sign(eR(g1, 1)) || (Math.abs(pear) < 0.15 && Math.abs(g1) < 0.15) ? '\\checkmark' : ''}` : `\\bar{x}=${eL(media)}\\;\\checkmark`);
  return { tema: 'forma', metodo: 'Coeficientes de Fisher', pasos, resultado: `g_1=${eL(g1)}\\;(${tx(tipoA.split(':')[0])}),\\;g_2=${eL(g2)}\\;(${tx(tipoC.split(' (')[0])})` };
}
function ePercentil(d, p, metodo) {                 // d ordenado, p en [0, 1]
  const n = d.length;
  if (metodo === 'np') { const pos = n * p; if (Number.isInteger(eR(pos, 9)) && pos >= 1 && pos < n) return { v: (d[pos - 1] + d[pos]) / 2, pos, desc: `n·p = ${eT(pos)} es entero: promediamos los datos en las posiciones ${pos} y ${pos + 1}` }; const k = Math.min(n, Math.max(1, Math.ceil(pos))); return { v: d[k - 1], pos, desc: `n·p = ${eT(pos)} no es entero: tomamos el dato en la posición ${k} (redondeando para arriba)` }; }
  const pos = (n + 1) * p, k = Math.floor(pos), fr = pos - k;
  if (k < 1) return { v: d[0], pos, desc: 'la posición queda antes del primer dato: tomamos el mínimo' };
  if (k >= n) return { v: d[n - 1], pos, desc: 'la posición queda después del último dato: tomamos el máximo' };
  return { v: d[k - 1] + fr * (d[k] - d[k - 1]), pos, desc: fr < 1e-12 ? `la posición ${k} es exacta` : `interpolamos entre las posiciones ${k} y ${k + 1}: x₍${k}₎ + ${eT(fr)}·(x₍${k + 1}₎ − x₍${k}₎)` };
}
function eSvgCaja(d, q1, q2, q3) {
  const iqr = q3 - q1, lo = Math.max(d[0], q1 - 1.5 * iqr), hi = Math.min(d[d.length - 1], q3 + 1.5 * iqr), vmin = Math.min(...d), vmax = Math.max(...d), pad = (vmax - vmin) * 0.08 || 1, X = v => 25 + (v - vmin + pad) / (vmax - vmin + 2 * pad) * 310;
  const lmin = d.find(v => v >= lo), lmax = [...d].reverse().find(v => v <= hi), out = d.filter(v => v < lo || v > hi);
  return `<svg class="grafico ancho" viewBox="0 0 360 120" role="img" aria-label="Diagrama de caja"><line x1="${X(lmin)}" y1="55" x2="${X(q1)}" y2="55" class="ej"/><line x1="${X(q3)}" y1="55" x2="${X(lmax)}" y2="55" class="ej"/><line x1="${X(lmin)}" y1="42" x2="${X(lmin)}" y2="68" class="ej"/><line x1="${X(lmax)}" y1="42" x2="${X(lmax)}" y2="68" class="ej"/><rect x="${X(q1)}" y="32" width="${X(q3) - X(q1)}" height="46" class="rect"/><line x1="${X(q2)}" y1="32" x2="${X(q2)}" y2="78" class="curva"/>${out.map(v => `<circle cx="${X(v)}" cy="55" r="3.5" class="hueco"/>`).join('')}${[['Q₁', q1], ['Me', q2], ['Q₃', q3]].map(([l, v]) => `<text x="${X(v)}" y="98" class="et">${l}=${fmtX(eR(v, 2))}</text>`).join('')}</svg>`;
}
function resolverPosicion(texto, metodo) {
  const t = plano(texto), { pasos, P } = crearPasos(), D = eDatosNum(texto);
  const pide = []; [...t.matchAll(/percentil\s*(\d+)|\bp\s*(\d+)\b/g)].forEach(m => pide.push({ n: `P_{${m[1] || m[2]}}`, p: +(m[1] || m[2]) / 100 }));
  [...t.matchAll(/decil\s*(\d)|\bd\s*(\d)\b/g)].forEach(m => pide.push({ n: `D_{${m[1] || m[2]}}`, p: +(m[1] || m[2]) / 10 }));
  [...t.matchAll(/(?:primer|segundo|tercer)\s*cuartil|\bq\s*([123])\b/g)].forEach(m => { const k = m[1] ? +m[1] : /primer/.test(m[0]) ? 1 : /segundo/.test(m[0]) ? 2 : 3; pide.push({ n: `Q_{${k}}`, p: k / 4 }); });
  const conCaja = !pide.length || /cuartil|caja|boxplot|intercuart/.test(t); if (!pide.length || (/cuartiles/.test(t))) [1, 2, 3].forEach(k => { if (!pide.some(z => z.n === `Q_{${k}}`)) pide.push({ n: `Q_{${k}}`, p: k / 4 }); });
  if (D.tipo === 'agrupados') {
    const T = eTabla(D), filas = eFilasFrec(T), n = T.n;
    P('Armamos las frecuencias acumuladas', 'Con datos agrupados buscamos el intervalo donde la acumulada alcanza k·n y después interpolamos dentro de él.', [], eFilas(['Intervalo', 'fᵢ', 'Fᵢ'], filas.map(r => [k$(r.etiqueta), r.f, r.F])));
    const res = pide.map(z => { const obj = z.p * n, i = filas.findIndex(r => r.F >= obj - 1e-12), c = filas[i], Fa = i ? filas[i - 1].F : 0, v = c.a + (obj - Fa) / c.f * (c.b - c.a); return { ...z, v, L: `${z.n}=L_i+\\frac{${eL(obj)}-${Fa}}{${c.f}}\\cdot ${eL(c.b - c.a)}=${eL(c.a)}+${eL((obj - Fa) / c.f * (c.b - c.a))}=${eL(v)}` }; });
    P('Calculamos cada medida', 'Fórmula: $L_i + \\frac{k\\,n - F_{i-1}}{f_i}\\cdot a$, con k la proporción buscada.', res.map(r => r.L));
    P('Verificamos', 'Cada medida tiene que caer dentro del rango de los datos y en orden creciente.', res.map(r => `${r.n}=${eL(r.v)}`).join('\\le ') + '\\;\\checkmark');
    return { tema: 'posicion', metodo: 'Datos agrupados', pasos, resultado: res.map(r => `${r.n}=${eL(r.v)}`).join(',\\;') };
  }
  const d = [...D.datos].sort((a, b) => a - b), n = d.length, met = metodo === 'np' ? 'np' : 'n1';
  P('Ordenamos los datos', 'Las medidas de posición dividen los datos ordenados en partes: los cuartiles en 4, los deciles en 10 y los percentiles en 100.', d.length <= 40 ? d.map((x, i) => `x_{(${i + 1})}=${eL(x)}`).join(',\\;') : `n=${n}`);
  const res = pide.map(z => ({ ...z, ...ePercentil(d, z.p, met) }));
  P('Calculamos la posición de cada medida', met === 'np' ? 'Método n·p: si n·p es entero se promedian dos datos; si no, se redondea para arriba.' : 'Método (n + 1)·p: calculamos la posición y, si cae entre dos datos, interpolamos.', res.map(r => `${r.n}:\\;\\text{posición}=${met === 'np' ? 'n\\cdot p' : '(n+1)\\cdot p'}=${eL(r.pos)}\\;\\Rightarrow\\;${r.n}=${eL(r.v)}`));
  P('Explicación de cada cálculo', 'Así se obtuvo cada valor.', [], tabla(['Medida', 'Cómo se obtuvo'], res.map(r => [k$(r.n), r.desc])));
  if (conCaja) { const q = [0.25, 0.5, 0.75].map(p => ePercentil(d, p, met).v); P('Diagrama de caja', `El rango intercuartílico RIC = Q₃ − Q₁ = ${eT(q[2] - q[0])} contiene el 50 % central. Los datos a más de 1,5·RIC de la caja se marcan como atípicos.`, [], eSvgCaja(d, ...q)); }
  P('Verificamos', 'Contamos qué porcentaje de los datos queda por debajo o igual a cada medida: tiene que acercarse al porcentaje buscado.', res.map(r => `${r.n}:\\;${d.filter(x => x <= r.v + 1e-12).length}/${n}=${eL(100 * d.filter(x => x <= r.v + 1e-12).length / n, 1)}\\%\\approx ${eL(100 * r.p, 0)}\\%\\;\\checkmark`));
  return { tema: 'posicion', metodo: met === 'np' ? 'Método n·p' : 'Método (n + 1)·p', pasos, resultado: res.map(r => `${r.n}=${eL(r.v)}`).join(',\\;'), alternativas: [{ nombre: met === 'np' ? 'Ver con el método (n + 1)·p' : 'Ver con el método n·p', metodo: met === 'np' ? 'n1' : 'np' }] };
}

/* -----------------------------------------------------------------------
 * E8. PROBABILIDAD CONDICIONAL E INDEPENDENCIA
 * --------------------------------------------------------------------- */
// Lee P(A) = 0,3, P(A∩B) = …, P(A|B) = …, P(A') = … → mapa con claves 'A', 'B', 'A∩B', 'A∪B', 'A|B', 'B|A', 'A\'', 'B\''
function eLeerProbs(texto) {
  const s = texto.replace(/\\cap|∩| y /g, '∩').replace(/\\cup|∪| o /g, '∪').replace(/\\mid|\/(?=\s*[A-Z]\s*\))/g, '|').replace(/\^\{?c\}?|\^\(c\)|ᶜ|̅/g, "'");
  const out = {}, pedidas = [];
  for (const m of s.matchAll(/P\s*\(\s*([A-Z]\d*'?)\s*(?:([∩∪|])\s*([A-Z]\d*'?))?\s*\)\s*(=\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?%?))?/g)) {
    const k = m[2] ? `${m[1]}${m[2]}${m[3]}` : m[1];
    if (m[5]) out[k] = eNum(m[5]); else pedidas.push(k);
  }
  return { out, pedidas };
}
function resolverCondicional(texto) {
  const { pasos, P } = crearPasos(), { out: p, pedidas } = eLeerProbs(texto);
  if (!Object.keys(p).length) throw new Error('Escribí las probabilidades así: P(A) = 0,4; P(B) = 0,5; P(A∩B) = 0,2. Calcular P(A|B).');
  P('Anotamos los datos', 'P(A|B) se lee “probabilidad de A dado B”: la probabilidad de A sabiendo que ocurrió B.', Object.entries(p).map(([k, v]) => `P(${k.replace('∩', '\\cap ').replace('∪', '\\cup ').replace('|', '\\mid ')})=${eL(v)}`).join(',\\;'));
  const usadas = [];
  for (let it = 0; it < 6; it++) {                   // completamos con las relaciones conocidas
    const r = (k, v, f) => { if (p[k] === undefined && isFinite(v)) { p[k] = v; usadas.push(f); } };
    if (p["A'"] !== undefined) r('A', 1 - p["A'"], `P(A)=1-P(A')=${eL(1 - p["A'"])}`); if (p["B'"] !== undefined) r('B', 1 - p["B'"], `P(B)=1-P(B')=${eL(1 - p["B'"])}`);
    if (p['A|B'] !== undefined && p.B !== undefined) r('A∩B', p['A|B'] * p.B, `P(A\\cap B)=P(A\\mid B)\\cdot P(B)=${eL(p['A|B'])}\\cdot ${eL(p.B)}=${eL(p['A|B'] * p.B)}`);
    if (p['B|A'] !== undefined && p.A !== undefined) r('A∩B', p['B|A'] * p.A, `P(A\\cap B)=P(B\\mid A)\\cdot P(A)=${eL(p['B|A'] * p.A)}`);
    if (p['A∪B'] !== undefined && p.A !== undefined && p.B !== undefined) r('A∩B', p.A + p.B - p['A∪B'], `P(A\\cap B)=P(A)+P(B)-P(A\\cup B)=${eL(p.A + p.B - p['A∪B'])}`);
    if (p['A∩B'] !== undefined && p.A !== undefined && p['A∪B'] !== undefined) r('B', p['A∪B'] - p.A + p['A∩B'], `P(B)=P(A\\cup B)-P(A)+P(A\\cap B)=${eL(p['A∪B'] - p.A + p['A∩B'])}`);
    if (p.A !== undefined && p.B !== undefined && p['A∩B'] !== undefined) {
      r('A∪B', p.A + p.B - p['A∩B'], `P(A\\cup B)=P(A)+P(B)-P(A\\cap B)=${eL(p.A)}+${eL(p.B)}-${eL(p['A∩B'])}=${eL(p.A + p.B - p['A∩B'])}`);
      r('A|B', p['A∩B'] / p.B, `P(A\\mid B)=\\frac{P(A\\cap B)}{P(B)}=\\frac{${eL(p['A∩B'])}}{${eL(p.B)}}=${eL(p['A∩B'] / p.B)}`);
      r('B|A', p['A∩B'] / p.A, `P(B\\mid A)=\\frac{P(A\\cap B)}{P(A)}=\\frac{${eL(p['A∩B'])}}{${eL(p.A)}}=${eL(p['A∩B'] / p.A)}`);
      r("A'", 1 - p.A, `P(A')=1-P(A)=${eL(1 - p.A)}`); r("B'", 1 - p.B, `P(B')=1-P(B)=${eL(1 - p.B)}`);
      r("A'∩B'", 1 - (p.A + p.B - p['A∩B']), `P(A'\\cap B')=1-P(A\\cup B)=${eL(1 - (p.A + p.B - p['A∩B']))}`);
      r("A∩B'", p.A - p['A∩B'], `P(A\\cap B')=P(A)-P(A\\cap B)=${eL(p.A - p['A∩B'])}`);
    }
    if (p.A !== undefined && p.B !== undefined && p['A∩B'] === undefined && /independ/.test(plano(texto))) r('A∩B', p.A * p.B, `\\text{si son independientes: }P(A\\cap B)=P(A)\\cdot P(B)=${eL(p.A * p.B)}`);
  }
  P('Usamos las fórmulas', 'Probabilidad condicional: $P(A\\mid B) = \\frac{P(A\\cap B)}{P(B)}$. Unión: $P(A\\cup B) = P(A) + P(B) - P(A\\cap B)$. Complemento: $P(A\') = 1 - P(A)$.', usadas.length ? usadas : [tx('No hizo falta calcular nada más.')]);
  let indep = null;
  if (p.A !== undefined && p.B !== undefined && p['A∩B'] !== undefined) { const prod = p.A * p.B; indep = Math.abs(prod - p['A∩B']) < 1e-9;
    P('¿Son independientes?', 'A y B son independientes si saber que ocurrió uno no cambia la probabilidad del otro, es decir, si $P(A\\cap B) = P(A)\\cdot P(B)$ (o, lo mismo, $P(A\\mid B) = P(A)$).', `P(A)\\cdot P(B)=${eL(p.A)}\\cdot ${eL(p.B)}=${eL(prod)}\\;${indep ? '=' : '\\ne'}\\;P(A\\cap B)=${eL(p['A∩B'])}\\;\\Rightarrow\\;\\text{${indep ? 'son independientes' : 'no son independientes'}}`, eSvgVenn(p.A - p['A∩B'], p['A∩B'], p.B - p['A∩B'], 1 - (p.A + p.B - p['A∩B']), 'prob')); }
  const lista = (pedidas.length ? pedidas : ['A|B', 'A∪B']).filter(k => p[k] !== undefined);
  const vf = [];
  if (p['A|B'] !== undefined && p.B) vf.push(`P(A\\mid B)\\cdot P(B)=${eL(p['A|B'] * p.B)}=P(A\\cap B)\\;\\checkmark`);
  if (p['A∪B'] !== undefined) vf.push(`P(A\\cup B)=${eL(p['A∪B'])}\\in[0;1]\\;\\checkmark`);
  P('Verificamos', 'Volvemos a armar la intersección con la condicional y revisamos que las probabilidades estén entre 0 y 1.', vf.length ? vf : ['\\checkmark']);
  const Lk = k => `P(${k.replace(/∩/g, '\\cap ').replace(/∪/g, '\\cup ').replace('|', '\\mid ')})`;
  return { tema: 'condicional', metodo: 'Probabilidad condicional', pasos, resultado: [...lista.map(k => `${Lk(k)}=${eL(p[k])}`), ...(indep !== null ? [tx(indep ? 'independientes' : 'no independientes')] : [])].join(',\\;') };
}

/* -----------------------------------------------------------------------
 * E9. PROBABILIDAD TOTAL Y TEOREMA DE BAYES
 * --------------------------------------------------------------------- */
function eSvgArbol(ramas) {                         // ramas: [{ nom, p, hijos: [{ nom, p }] }]
  const W = 360, filas = ramas.reduce((s, r) => s + r.hijos.length, 0), H = Math.max(140, 28 * filas + 30); let g = '', y = 20;
  ramas.forEach(r => { const y0 = y, y1 = y + 28 * (r.hijos.length - 1), ym = (y0 + y1) / 2;
    g += `<line x1="20" y1="${H / 2}" x2="150" y2="${ym}" class="ej"/><text x="${85}" y="${(H / 2 + ym) / 2 - 4}" class="et">${eT(r.p, 3)}</text><text x="158" y="${ym + 4}" class="et pl" text-anchor="start">${r.nom}</text>`;
    r.hijos.forEach((h, k) => { const yy = y0 + 28 * k; g += `<line x1="185" y1="${ym}" x2="290" y2="${yy}" class="ej"/><text x="${237}" y="${(ym + yy) / 2 - 3}" class="et">${eT(h.p, 3)}</text><text x="296" y="${yy + 4}" class="et" text-anchor="start">${h.nom}</text>`; });
    y += 28 * r.hijos.length; });
  return `<svg class="grafico ancho" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagrama de árbol"><circle cx="20" cy="${H / 2}" r="4" class="pt"/>${g}</svg>`;
}
function resolverBayes(texto) {
  const { pasos, P } = crearPasos(), { out: p } = eLeerProbs(texto);
  const cond = Object.keys(p).filter(k => k.includes('|')), D = cond.length ? cond[0].split('|')[0] : null;
  if (!D) throw new Error('Escribilo así: P(A1) = 0,5; P(A2) = 0,3; P(A3) = 0,2; P(D|A1) = 0,02; P(D|A2) = 0,03; P(D|A3) = 0,05.');
  let causas = [...new Set(cond.filter(k => k.startsWith(D + '|')).map(k => k.split('|')[1]))];
  const prior = {}; causas.forEach(c => { if (p[c] !== undefined) prior[c] = p[c]; });
  const faltan = causas.filter(c => prior[c] === undefined); if (faltan.length === 1) prior[faltan[0]] = 1 - eSum(causas.filter(c => c !== faltan[0]).map(c => prior[c]));
  if (causas.some(c => prior[c] === undefined)) throw new Error('Falta la probabilidad de alguna de las causas P(Aᵢ).');
  const lik = c => p[`${D}|${c}`], conj = causas.map(c => prior[c] * lik(c)), PD = eSum(conj);
  P('Anotamos los datos', `Las causas ${causas.join(', ')} forman una partición (no se superponen y cubren todo): sus probabilidades suman ${eT(eSum(causas.map(c => prior[c])))}. Además conocemos la probabilidad de ${D} dada cada causa.`, causas.map(c => `P(${c})=${eL(prior[c])},\\quad P(${D}\\mid ${c})=${eL(lik(c))}`), eSvgArbol(causas.map(c => ({ nom: c, p: prior[c], hijos: [{ nom: D, p: lik(c) }, { nom: D + "'", p: 1 - lik(c) }] }))));
  P('Aplicamos el teorema de la probabilidad total', `La probabilidad de ${D} es la suma de los caminos del árbol que terminan en ${D}: cada camino multiplica sus ramas.`, `P(${D})=${causas.map(c => `P(${c})\\,P(${D}\\mid ${c})`).join('+')}=${causas.map((c, i) => `${eL(prior[c])}\\cdot ${eL(lik(c))}`).join('+')}=${eL(PD)}`);
  const post = conj.map(v => v / PD);
  P('Aplicamos el teorema de Bayes', `Si sabemos que ocurrió ${D}, la probabilidad de cada causa es su camino dividido por P(${D}).`, causas.map((c, i) => `P(${c}\\mid ${D})=\\frac{P(${c})\\,P(${D}\\mid ${c})}{P(${D})}=\\frac{${eL(conj[i])}}{${eL(PD)}}=${eL(post[i])}`));
  P('Verificamos', 'Las probabilidades “a posteriori” de las causas también forman una partición: tienen que sumar 1.', `${post.map(v => eL(v)).join('+')}=${eL(eSum(post))}\\;${Math.abs(eSum(post) - 1) < 1e-9 ? '\\checkmark' : ''}`);
  return { tema: 'bayes', metodo: 'Probabilidad total y Bayes', pasos, resultado: `P(${D})=${eL(PD)},\\;` + causas.map((c, i) => `P(${c}\\mid ${D})=${eL(post[i])}`).join(',\\;') };
}

/* -----------------------------------------------------------------------
 * E10. DIAGRAMAS DE VENN, ÁRBOL Y TABLAS DE CONTINGENCIA
 * --------------------------------------------------------------------- */
function eSvgVenn(soloA, ambos, soloB, fuera, modo) {
  const f = v => (modo === 'prob' ? eT(v, 3) : eT(v, 0));
  return `<svg class="grafico ancho" viewBox="0 0 360 200" role="img" aria-label="Diagrama de Venn"><rect x="10" y="10" width="340" height="180" fill="none" class="ej"/><circle cx="140" cy="100" r="70" fill="${E_COL[0]}" fill-opacity=".3" stroke="#0e1f33" stroke-opacity=".35"/><circle cx="220" cy="100" r="70" fill="${E_COL[1]}" fill-opacity=".3" stroke="#0e1f33" stroke-opacity=".35"/><text x="105" y="104" class="et pl">${f(soloA)}</text><text x="180" y="104" class="et pl">${f(ambos)}</text><text x="255" y="104" class="et pl">${f(soloB)}</text><text x="40" y="180" class="et pl">${f(fuera)}</text><text x="100" y="40" class="et pl">A</text><text x="260" y="40" class="et pl">B</text></svg>`;
}
function resolverDiagramas(texto, metodo) {
  const t = plano(texto), { pasos, P } = crearPasos();
  const urna = [...t.matchAll(/(\d+)\s*(?:bolillas?|bolas?|fichas?|caramelos?)?\s*(rojas?|azul(?:es)?|verdes?|blancas?|negras?|amarillas?)/g)];
  if (urna.length >= 2 || /arbol|extrae|saca/.test(t) && urna.length) {
    const colores = urna.map(m => ({ c: m[2].replace(/s$|es$/, '').replace(/azul$/, 'azul'), n: +m[1] })), tot = eSum(colores.map(c => c.n)), k = Math.min(3, +(t.match(/(?:extrae|saca|elige)n?\s*(\d+)/) || [0, 2])[1] || 2), repo = /con reposicion|con devolucion|reponiendo/.test(t);
    P('Anotamos la composición', `Hay ${tot} elementos: ${colores.map(c => `${c.n} ${c.c}`).join(', ')}. Se sacan ${k} ${repo ? 'con reposición (se devuelven: las probabilidades no cambian)' : 'sin reposición (cada extracción cambia lo que queda)'}.`, colores.map(c => `P(\\text{${c.c}})=\\frac{${c.n}}{${tot}}`).join(',\\;'));
    const hojas = []; const rec = (camino, quedan, p) => { if (camino.length === k) { hojas.push({ camino, p }); return; } const T = eSum(quedan.map(c => c.n)); quedan.forEach((c, i) => { if (!c.n) return; const q = quedan.map((z, j) => ({ ...z, n: repo || j !== i ? z.n : z.n - 1 })); rec([...camino, { c: c.c, num: c.n, den: T }], q, p * c.n / T); }); };
    rec([], colores, 1);
    P('Armamos el diagrama de árbol', 'Cada rama lleva la probabilidad de esa extracción (teniendo en cuenta lo que ya salió). La probabilidad de un camino es el producto de sus ramas.', [], tabla(['Camino', 'Cálculo', 'Probabilidad'], hojas.map(h => [h.camino.map(z => z.c).join(' → '), k$(h.camino.map(z => `\\frac{${z.num}}{${z.den}}`).join('\\cdot ')), k$(eL(h.p))])));
    if (k === 2) P('Dibujamos el árbol', 'Primera extracción a la izquierda, segunda a la derecha.', [], eSvgArbol(colores.map(c => ({ nom: c.c, p: c.n / tot, hijos: colores.map(d => ({ nom: d.c, p: (repo || d.c !== c.c ? d.n : d.n - 1) / (repo ? tot : tot - 1) })) }))));
    const mismo = eSum(hojas.filter(h => h.camino.every(z => z.c === h.camino[0].c)).map(h => h.p));
    P('Respondemos algunas preguntas', 'Para un suceso compuesto sumamos los caminos que lo forman.', [`P(\\text{todas del mismo color})=${eL(mismo)}`, `P(\\text{al menos dos colores distintos})=1-${eL(mismo)}=${eL(1 - mismo)}`]);
    P('Verificamos', 'Las probabilidades de todos los caminos tienen que sumar 1.', `\\sum P=${eL(eSum(hojas.map(h => h.p)))}\\;\\checkmark`);
    return { tema: 'diagramas', metodo: 'Diagrama de árbol', pasos, resultado: hojas.map(h => `P(${tx(h.camino.map(z => z.c[0].toUpperCase()).join(''))})=${eL(h.p)}`).join(',\\;') };
  }
  const nA = eParam(texto.replace(/n\s*\(\s*A\s*\)/g, 'nA').replace(/n\s*\(\s*B\s*\)/g, 'nB').replace(/n\s*\(\s*A\s*[∩y]\s*B\s*\)|n\s*\(\s*A\s*\\cap\s*B\s*\)/g, 'nAB'), ['nA']);
  if (nA !== null || /venn/.test(t)) {
    const s2 = texto.replace(/n\s*\(\s*A\s*[∩y]\s*B\s*\)|n\s*\(\s*A\s*\\cap\s*B\s*\)/g, 'nAB').replace(/n\s*\(\s*A\s*\)/g, 'nA').replace(/n\s*\(\s*B\s*\)/g, 'nB');
    let A = eParam(s2, ['nA']), B = eParam(s2, ['nB']), AB = eParam(s2, ['nAB']), N = eParam(s2, ['total', 'n', 'N']), modo = 'cuenta';
    if (A === null) { const { out } = eLeerProbs(texto); A = out.A; B = out.B; AB = out['A∩B']; N = 1; modo = 'prob'; }
    if (A === undefined || A === null || B === null || AB === null || AB === undefined) throw new Error('Para el diagrama de Venn escribí n(A) = 30, n(B) = 20, n(A∩B) = 8, total = 50 (o las probabilidades P(A), P(B), P(A∩B)).');
    if (!N) N = A + B - AB;
    const reg = [A - AB, AB, B - AB, N - (A + B - AB)];
    P('Ubicamos primero la intersección', 'En un diagrama de Venn se empieza por la zona común y después se completa restando.', [`\\text{solo A}=${eL(A, 3)}-${eL(AB, 3)}=${eL(reg[0], 3)}`, `\\text{solo B}=${eL(B, 3)}-${eL(AB, 3)}=${eL(reg[2], 3)}`, `\\text{ninguno}=${eL(N, 3)}-(${eL(A, 3)}+${eL(B, 3)}-${eL(AB, 3)})=${eL(reg[3], 3)}`], eSvgVenn(...reg, modo));
    P('Calculamos probabilidades', 'Cada probabilidad es casos favorables sobre casos posibles (o se lee directamente si ya son probabilidades).', [`P(A\\cup B)=\\frac{${eL(A + B - AB, 3)}}{${eL(N, 3)}}=${eL((A + B - AB) / N)}`, `P(\\text{solo A})=${eL(reg[0] / N)}`, `P(A\\mid B)=\\frac{${eL(AB, 3)}}{${eL(B, 3)}}=${eL(AB / B)}`]);
    P('Verificamos', 'Las cuatro zonas tienen que sumar el total.', `${reg.map(v => eL(v, 3)).join('+')}=${eL(eSum(reg), 3)}\\;${Math.abs(eSum(reg) - N) < 1e-9 ? '\\checkmark' : ''}`);
    return { tema: 'diagramas', metodo: 'Diagrama de Venn', pasos, resultado: `\\text{solo A}=${eL(reg[0], 3)},\\;A\\cap B=${eL(AB, 3)},\\;\\text{solo B}=${eL(reg[2], 3)},\\;\\text{ninguno}=${eL(reg[3], 3)}` };
  }
  const T = eContingencia(texto); if (!T) throw new Error('Escribí una tabla de contingencia (filas: “Varones: 20, 30; Mujeres: 25, 25”), un diagrama de Venn (n(A) = …) o un problema de urna.');
  const { filas, cols, M } = T, rt = M.map(eSum), ct = cols.map((_, j) => eSum(M.map(r => r[j]))), N = eSum(rt);
  P('Completamos los totales', 'Sumamos cada fila y cada columna: son las frecuencias marginales.', [], tabla(['', ...cols, 'Total'], [...filas.map((f, i) => [f, ...M[i].map(String), String(rt[i])]), ['Total', ...ct.map(String), String(N)]]));
  P('Probabilidades conjuntas y marginales', 'Dividimos cada casilla por el total general.', [], tabla(['', ...cols, 'Total'], [...filas.map((f, i) => [f, ...M[i].map(v => eT(v / N)), eT(rt[i] / N)]), ['Total', ...ct.map(v => eT(v / N)), '1']]));
  P('Probabilidades condicionales', `Para condicionar a una fila dividimos por el total de esa fila. Por ejemplo, P(${cols[0]} | ${filas[0]}) = ${M[0][0]}/${rt[0]}.`, filas.map((f, i) => cols.map((c, j) => `P(\\text{${c}}\\mid\\text{${f}})=\\frac{${M[i][j]}}{${rt[i]}}=${eL(M[i][j] / rt[i])}`).join(',\\;')));
  const ind = M.every((r, i) => r.every((v, j) => Math.abs(v / N - rt[i] / N * ct[j] / N) < 1e-9));
  P('Verificamos', `La suma de todas las probabilidades conjuntas es 1. Además, como ${ind ? 'cada conjunta es igual al producto de sus marginales, las variables son independientes' : 'las conjuntas no son el producto de las marginales, las variables no son independientes'}.`, `\\sum=${eL(eSum(M.flat()) / N)}\\;\\checkmark`);
  return { tema: 'diagramas', metodo: 'Tabla de contingencia', pasos, resultado: `N=${N},\\;P(\\text{${cols[0]}}\\mid\\text{${filas[0]}})=${eL(M[0][0] / rt[0])}` };
}
function eContingencia(texto) {                      // filas "Nombre: a, b, c" (y opcional "columnas: X, Y, Z")
  const colM = texto.match(/columnas?\s*:\s*([^;\n]+)/i), cols0 = colM ? colM[1].split(/,\s*/).map(s => s.trim()) : null;
  const filas = [], M = []; for (const m of texto.matchAll(/([A-Za-zÁÉÍÓÚáéíóúñ][\wáéíóúñ ]{0,20}?)\s*:\s*((?:\d+\s*[,;]?\s*){2,})/g)) { if (/columna|observad|esperad|grupo|datos|x|y/i.test(m[1].trim()) && !/^[A-Z]\w*$/.test(m[1].trim())) continue; const v = eLista(m[2]); if (v.length >= 2) { filas.push(m[1].trim()); M.push(v); } }
  if (filas.length < 2 || M.some(r => r.length !== M[0].length)) return null;
  return { filas, cols: cols0 && cols0.length === M[0].length ? cols0 : M[0].map((_, j) => `C${j + 1}`), M };
}

/* -----------------------------------------------------------------------
 * E11. VARIABLES ALEATORIAS Y DISTRIBUCIONES
 * --------------------------------------------------------------------- */
function eConsultaX(texto) {                         // P(X = 3), P(X ≤ 3), P(X > 2), P(2 ≤ X ≤ 5), P(X < 65)…
  const s = texto.replace(/<=|≤|\\le(q)?/g, '≤').replace(/>=|≥|\\ge(q)?/g, '≥').replace(/\s/g, '');
  let m = s.match(/P\((-?[\d.,]+)(<|≤)X(<|≤)(-?[\d.,]+)\)/); if (m) return { a: eNum(m[1]), ia: m[2] === '≤', b: eNum(m[4]), ib: m[3] === '≤', tipo: 'entre' };
  m = s.match(/P\(X(=|<|≤|>|≥)(-?[\d.,]+)\)/); if (m) return { op: m[1], v: eNum(m[2]), tipo: 'una' };
  m = plano(texto).match(/(?:al menos|como minimo)\s*(\d+)/); if (m) return { op: '≥', v: +m[1], tipo: 'una' };
  m = plano(texto).match(/(?:a lo sumo|como maximo|como mucho)\s*(\d+)/); if (m) return { op: '≤', v: +m[1], tipo: 'una' };
  m = plano(texto).match(/exactamente\s*(\d+)/); if (m) return { op: '=', v: +m[1], tipo: 'una' };
  return null;
}
function eDiscreta(pmf, kmax, q, nombre, P, verbo) {   // P de una consulta sobre una variable discreta
  let ks = [];
  if (!q) return null;
  if (q.tipo === 'entre') for (let k = Math.ceil(q.a + (q.ia ? 0 : 1e-9)); k <= Math.floor(q.b - (q.ib ? 0 : 1e-9)); k++) ks.push(k);
  else { const v = q.v; for (let k = 0; k <= kmax; k++) if ({ '=': k === v, '<': k < v, '≤': k <= v, '>': k > v, '≥': k >= v }[q.op]) ks.push(k); }
  const compl = ks.length > kmax / 2 + 1 && q.tipo === 'una' && (q.op === '>' || q.op === '≥');
  const usar = compl ? Array.from({ length: kmax + 1 }, (_, k) => k).filter(k => !ks.includes(k)) : ks, pv = usar.map(pmf), suma = eSum(pv), res = compl ? 1 - suma : suma;
  const qL = q.tipo === 'entre' ? `P(${eL(q.a)}${q.ia ? '\\le' : '<'}X${q.ib ? '\\le' : '<'}${eL(q.b)})` : `P(X${{ '=': '=', '<': '<', '≤': '\\le ', '>': '>', '≥': '\\ge ' }[q.op]}${eL(q.v)})`;
  P(compl ? 'Usamos el complemento' : 'Sumamos las probabilidades', compl ? 'Es más corto calcular los casos que NO cumplen y restar de 1.' : `Calculamos P(X = k) para cada valor que cumple la condición${usar.length > 1 ? ' y los sumamos' : ''}.`, [`${qL}=${compl ? '1-\\left(' : ''}${usar.slice(0, 8).map(k => `P(X=${k})`).join('+')}${usar.length > 8 ? '+\\cdots' : ''}${compl ? '\\right)' : ''}`, `=${compl ? '1-\\left(' : ''}${pv.slice(0, 8).map(v => eL(v)).join('+')}${pv.length > 8 ? '+\\cdots' : ''}${compl ? '\\right)' : ''}=${eL(res)}`]);
  return { res, qL };
}
function resolverDistribuciones(texto) {
  const t = plano(texto), { pasos, P } = crearPasos(), q = eConsultaX(texto);
  if (/grandes numeros/.test(t)) {
    const p = /dado/.test(t) ? 1 / 6 : eParam(texto, ['p']) || 0.5, que = /dado/.test(t) ? 'sacar un 6 con un dado' : 'sacar cara con una moneda'; let semilla = 12345; const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
    const ns = [10, 50, 100, 500, 1000, 5000, 10000]; let ex = 0, hechos = 0; const fr = [];
    ns.forEach(n => { while (hechos < n) { if (rnd() < p) ex++; hechos++; } fr.push(ex / n); });
    P('Planteamos el experimento', `Repetimos muchas veces el experimento “${que}”, cuya probabilidad teórica es p = ${eT(p)}.`, `p=${eL(p)}`);
    P('Simulamos y calculamos la frecuencia relativa', 'Cuantas más repeticiones, más se acerca la frecuencia relativa a la probabilidad teórica: eso dice la Ley de los Grandes Números.', [], eFilas(['Repeticiones', 'Frecuencia relativa', 'Diferencia con p'], ns.map((n, i) => [n, fr[i], Math.abs(fr[i] - p)])));
    P('Lo vemos en un gráfico', 'La línea azul es la frecuencia relativa; la punteada, la probabilidad teórica.', [], eSvgXY(ns.map(n => Math.log10(n)), fr, { linea: true, extra: [{ xs: ns.map(n => Math.log10(n)), ys: ns.map(() => p) }] }));
    P('Verificamos', 'La diferencia con p tiene que achicarse al aumentar las repeticiones.', `|f_{10}-p|=${eL(Math.abs(fr[0] - p))}\\;\\to\\;|f_{10000}-p|=${eL(Math.abs(fr[fr.length - 1] - p))}\\;${Math.abs(fr[fr.length - 1] - p) < Math.abs(fr[0] - p) ? '\\checkmark' : ''}`);
    return { tema: 'distribuciones', metodo: 'Ley de los Grandes Números', pasos, resultado: `f_{10000}=${eL(fr[fr.length - 1])}\\approx p=${eL(p)}` };
  }
  if (/normal|gauss/.test(t) || (eParam(texto, ['mu']) !== null && eParam(texto, ['sigma']) !== null)) {
    const mu = eParam(texto, ['mu', 'media']), s = eParam(texto, ['sigma', 'desviacion', 'desvio']); if (mu === null || !s) throw new Error('Para la normal escribí μ = 50, σ = 10 y la probabilidad: P(X < 65).');
    P('Anotamos los parámetros', 'X tiene distribución normal de media μ y desviación σ: su gráfico es la campana de Gauss, simétrica alrededor de μ.', `X\\sim N(${eL(mu)};\\,${eL(s)})`);
    const pp = t.match(/percentil\s*(\d+)/) || t.match(/deja\s*(?:por debajo)?\s*(?:el|un)?\s*(\d+(?:[.,]\d+)?)\s*%/);
    if (pp) { const p = eNum(pp[1]) / 100, z = eInvPhi(p), x = mu + z * s;
      P('Buscamos z en la tabla (al revés)', `Buscamos el z que deja un área ${eT(p)} a la izquierda: Φ(z) = ${eT(p)}.`, `z=${eL(z, 4)}`);
      P('Volvemos a la variable X', 'Despejamos de z = (x − μ)/σ.', `x=\\mu+z\\,\\sigma=${eL(mu)}+${par(eL(z, 4))}\\cdot ${eL(s)}=${eL(x)}`, eSvgCampana(mu, s, -Infinity, x));
      P('Verificamos', 'Calculamos la probabilidad acumulada hasta ese valor.', `P(X<${eL(x)})=\\Phi(${eL(z, 4)})=${eL(ePhi((x - mu) / s))}\\;\\checkmark`);
      return { tema: 'distribuciones', metodo: 'Normal inversa', pasos, resultado: `x=${eL(x)}` };
    }
    if (!q) throw new Error('Decí qué probabilidad buscás: P(X < 65), P(X > 40) o P(40 < X < 60).');
    const a = q.tipo === 'entre' ? q.a : ['<', '≤'].includes(q.op) ? -Infinity : q.v, b = q.tipo === 'entre' ? q.b : ['<', '≤'].includes(q.op) ? q.v : Infinity, za = (a - mu) / s, zb = (b - mu) / s;
    P('Estandarizamos', 'Pasamos a la normal estándar Z ~ N(0; 1) con $z = \\frac{x - \\mu}{\\sigma}$. (En una variable continua da lo mismo < que ≤.)', [isFinite(a) ? `z_1=\\frac{${eL(a)}-${par(eL(mu))}}{${eL(s)}}=${eL(za, 2)}` : '', isFinite(b) ? `z_2=\\frac{${eL(b)}-${par(eL(mu))}}{${eL(s)}}=${eL(zb, 2)}` : ''].filter(Boolean));
    const r = ePhi(zb) - ePhi(za);
    P('Buscamos en la tabla de la normal', 'Φ(z) es el área a la izquierda de z. Para “mayor que” restamos de 1; para “entre” restamos las dos áreas.', `${isFinite(b) ? `\\Phi(${eL(zb, 2)})` : '1'}-${isFinite(a) ? `\\Phi(${eL(za, 2)})` : '0'}=${isFinite(b) ? eL(ePhi(zb)) : '1'}-${isFinite(a) ? eL(ePhi(za)) : '0'}=${eL(r)}`, eSvgCampana(mu, s, a, b));
    const num = eSimpson(x => Math.exp(-(((x - mu) / s) ** 2) / 2) / (s * Math.sqrt(2 * Math.PI)), Math.max(a, mu - 12 * s), Math.min(b, mu + 12 * s), 4000);
    P('Verificamos', 'Calculamos el área bajo la campana con integración numérica (regla de Simpson).', `\\int\\approx ${eL(num)}\\;${Math.abs(num - r) < 1e-4 ? '\\checkmark' : ''}`);
    return { tema: 'distribuciones', metodo: 'Distribución normal', pasos, resultado: `P=${eL(r)}` };
  }
  if (/poisson/.test(t) || eParam(texto, ['lambda']) !== null) {
    const l = eParam(texto, ['lambda', 'promedio', 'media']); if (!l) throw new Error('Para Poisson escribí λ = 3 y la probabilidad: P(X = 2).');
    const pmf = k => Math.exp(-l) * l ** k / Math.exp(eLnGamma(k + 1)), kmax = Math.ceil(l + 10 * Math.sqrt(l) + 10);
    P('Anotamos el modelo', 'Poisson cuenta cuántas veces ocurre un suceso en un intervalo (de tiempo, espacio…) cuando ocurre en promedio λ veces.', [`X\\sim\\mathcal{P}(${eL(l)})`, `P(X=k)=\\frac{e^{-\\lambda}\\lambda^k}{k!}`]);
    const r = eDiscreta(pmf, kmax, q, 'X', P);
    P('Media y varianza', 'En la distribución de Poisson la media y la varianza son iguales a λ.', `E(X)=V(X)=${eL(l)}`, eSvgBarras(Array.from({ length: Math.min(kmax, 15) + 1 }, (_, k) => k), Array.from({ length: Math.min(kmax, 15) + 1 }, (_, k) => pmf(k))));
    P('Verificamos', 'La suma de todas las probabilidades tiene que dar 1.', `\\sum_{k=0}^{${kmax}}P(X=k)\\approx ${eL(eSum(Array.from({ length: kmax + 1 }, (_, k) => pmf(k))))}\\;\\checkmark`);
    return { tema: 'distribuciones', metodo: 'Distribución de Poisson', pasos, resultado: r ? `${r.qL}=${eL(r.res)}` : `E(X)=${eL(l)}` };
  }
  if (/binomial/.test(t) || (eParam(texto, ['n']) !== null && eParam(texto, ['p']) !== null)) {
    const n = eParam(texto, ['n']), p = eParam(texto, ['p']); if (!n || p === null) throw new Error('Para la binomial escribí n = 10, p = 0,3 y la probabilidad: P(X = 4).');
    const pmf = k => eComb(n, k) * p ** k * (1 - p) ** (n - k);
    P('Anotamos el modelo', `Binomial: se repite ${n} veces un experimento con dos resultados (éxito con probabilidad p = ${eT(p)}) de forma independiente, y X cuenta los éxitos.`, [`X\\sim B(${n};\\,${eL(p)})`, `P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}`]);
    if (q && q.tipo === 'una' && q.op === '=') P('Reemplazamos en la fórmula', 'El número combinatorio cuenta de cuántas maneras pueden ubicarse los éxitos.', `P(X=${q.v})=\\binom{${n}}{${q.v}}\\cdot ${eL(p)}^{${q.v}}\\cdot ${eL(1 - p)}^{${n - q.v}}=${eComb(n, q.v)}\\cdot ${eL(p ** q.v, 6)}\\cdot ${eL((1 - p) ** (n - q.v), 6)}`);
    const r = eDiscreta(pmf, n, q, 'X', P);
    P('Media, varianza y desviación', 'Para la binomial: E(X) = n·p y V(X) = n·p·(1 − p).', [`E(X)=${n}\\cdot ${eL(p)}=${eL(n * p)}`, `V(X)=${n}\\cdot ${eL(p)}\\cdot ${eL(1 - p)}=${eL(n * p * (1 - p))},\\quad\\sigma=${eL(Math.sqrt(n * p * (1 - p)))}`], eSvgBarras(Array.from({ length: n + 1 }, (_, k) => k), Array.from({ length: n + 1 }, (_, k) => pmf(k))));
    P('Verificamos', 'La suma de P(X = k) para k = 0, …, n tiene que dar 1 (y la media calculada con la tabla coincide con n·p).', [`\\sum_{k=0}^{${n}}P(X=k)=${eL(eSum(Array.from({ length: n + 1 }, (_, k) => pmf(k))))}\\;\\checkmark`, `\\sum k\\,P(X=k)=${eL(eSum(Array.from({ length: n + 1 }, (_, k) => k * pmf(k))))}\\;\\checkmark`]);
    return { tema: 'distribuciones', metodo: 'Distribución binomial', pasos, resultado: r ? `${r.qL}=${eL(r.res)}` : `E(X)=${eL(n * p)},\\;V(X)=${eL(n * p * (1 - p))}` };
  }
  const et = eEtiquetas(texto), kx = Object.keys(et).find(k => /^x/.test(k)), kp = Object.keys(et).find(k => /^p|prob/.test(k));
  if (kx && kp && et[kx].length === et[kp].length) {
    const xs = et[kx], ps = et[kp], E = eSum(xs.map((x, i) => x * ps[i])), E2 = eSum(xs.map((x, i) => x * x * ps[i])), V = E2 - E * E;
    P('Revisamos que sea una distribución', 'Cada probabilidad tiene que estar entre 0 y 1 y todas tienen que sumar 1.', `\\sum p_i=${ps.map(v => eL(v)).join('+')}=${eL(eSum(ps))}`);
    P('Calculamos la esperanza', 'Es el promedio “a la larga”: cada valor pesado por su probabilidad.', `E(X)=\\sum x_i\\,p_i=${xs.map((x, i) => `${eL(x)}\\cdot ${eL(ps[i])}`).join('+')}=${eL(E)}`);
    P('Calculamos la varianza y la desviación', 'V(X) = E(X²) − [E(X)]².', [`E(X^2)=\\sum x_i^2\\,p_i=${eL(E2)}`, `V(X)=${eL(E2)}-${eL(E)}^2=${eL(V)},\\quad\\sigma=${eL(Math.sqrt(V))}`], eSvgBarras(xs, ps));
    P('Verificamos', 'Calculamos la varianza con la definición: Σ(xᵢ − E)²·pᵢ.', `${eL(eSum(xs.map((x, i) => (x - E) ** 2 * ps[i])))}=${eL(V)}\\;${Math.abs(eSum(ps) - 1) < 1e-9 ? '\\checkmark' : '\\;\\text{(ojo: las probabilidades no suman 1)}'}`);
    return { tema: 'distribuciones', metodo: 'Variable aleatoria discreta', pasos, resultado: `E(X)=${eL(E)},\\;V(X)=${eL(V)},\\;\\sigma=${eL(Math.sqrt(V))}` };
  }
  throw new Error('Decí la distribución: binomial (n, p), Poisson (λ), normal (μ, σ), una tabla “x: 0, 1, 2; p: 0,2; 0,5; 0,3” o “ley de los grandes números”.');
}

/* -----------------------------------------------------------------------
 * E12. ESTIMACIÓN DE PARÁMETROS
 * --------------------------------------------------------------------- */
function eConfianza(texto) { const m = plano(texto).match(/(\d+(?:[.,]\d+)?)\s*%/); const c = m ? eNum(m[1]) / 100 : eParam(texto, ['confianza', 'nivel']) || 0.95; return c > 1 ? c / 100 : c; }
function eResumenMuestra(texto) {                  // de datos o de x̄, s, n
  let D = null; try { D = eDatos(texto.replace(/(\bn|xbar|x̄|media|s|sigma|σ|confianza|alfa|α|mu|μ|μ0)\s*=\s*-?\d+([.,]\d+)?%?/gi, ' ')); } catch (e) { /* sin datos */ }
  const n = eParam(texto, ['n', 'tamaño']), xb = eParam(texto, ['xbar', 'media']), s = eParam(texto, ['s', 'desvio muestral', 'desviacion muestral']), sigma = eParam(texto, ['sigma']);
  if (D && D.tipo === 'lista' && D.datos.length >= 3) { const d = D.datos, m = eMedia(d), sd = Math.sqrt(eSum(d.map(x => (x - m) ** 2)) / (d.length - 1)); return { n: d.length, xb: m, s: sd, sigma, datos: d }; }
  return { n, xb, s, sigma };
}
function resolverEstimacion(texto, metodo) {
  const t = plano(texto), { pasos, P } = crearPasos(), conf = eConfianza(texto), alfa = 1 - conf;
  const exitos = t.match(/(\d+)\s*(?:exitos|favorables|si\b|aprob|defectuos|votan|prefieren|casos)/), pp = eParam(texto, ['p', 'proporcion']);
  if (/proporcion|exitos|porcentaje de/.test(t) || (exitos && eParam(texto, ['n']))) {
    const n = eParam(texto, ['n']), ph = exitos ? +exitos[1] / n : pp; if (!n || ph === null) throw new Error('Para una proporción escribí n = 200 y la cantidad de éxitos (por ejemplo 84 éxitos) o p = 0,42.');
    const z = eInvPhi(1 - alfa / 2), E = z * Math.sqrt(ph * (1 - ph) / n);
    P('Estimación puntual', 'El mejor valor único para estimar la proporción poblacional es la proporción de la muestra.', `\\hat{p}=${exitos ? `\\frac{${exitos[1]}}{${n}}=` : ''}${eL(ph)}`);
    P('Buscamos el valor crítico', `Para un nivel de confianza del ${eT(100 * conf, 2)} % buscamos z con área ${eT(1 - alfa / 2)} a la izquierda.`, `z_{\\alpha/2}=${eL(z, 3)}`);
    P('Calculamos el margen de error', 'Usamos el error estándar de la proporción $\\sqrt{\\hat{p}(1-\\hat{p})/n}$.', `E=z\\sqrt{\\frac{\\hat{p}(1-\\hat{p})}{n}}=${eL(z, 3)}\\sqrt{\\frac{${eL(ph)}\\cdot ${eL(1 - ph)}}{${n}}}=${eL(E)}`);
    P('Armamos el intervalo', 'Estimación puntual ± margen de error.', `IC_{${eT(100 * conf, 2)}\\%}=(${eL(ph - E)};\\,${eL(ph + E)})`);
    P('Verificamos', 'El centro del intervalo tiene que ser p̂ y el área entre −z y z tiene que ser el nivel de confianza.', [`\\frac{${eL(ph - E)}+${eL(ph + E)}}{2}=${eL(ph)}\\;\\checkmark`, `\\Phi(${eL(z, 3)})-\\Phi(-${eL(z, 3)})=${eL(ePhi(z) - ePhi(-z))}\\;\\checkmark`]);
    return { tema: 'estimacion', metodo: 'Intervalo para una proporción', pasos, resultado: `\\hat{p}=${eL(ph)},\\;IC=(${eL(ph - E)};\\,${eL(ph + E)})` };
  }
  const M = eResumenMuestra(texto); if (!M.n || M.xb === null || (!M.s && !M.sigma)) throw new Error('Escribí los datos de la muestra o x̄ = 52, s = 8, n = 25 (y si conocés σ, σ = 8), con el nivel de confianza (95 %).');
  const usaZ = metodo === 'z' || (metodo !== 't' && M.sigma !== null && M.sigma !== undefined), sd = usaZ ? (M.sigma || M.s) : M.s, gl = M.n - 1;
  const crit = usaZ ? eInvPhi(1 - alfa / 2) : eInv(x => eTcdf(x, gl), 1 - alfa / 2, 0, 100), E = crit * sd / Math.sqrt(M.n);
  P('Estimación puntual', 'Estimamos la media poblacional μ con la media muestral, y la desviación con s.' + (M.datos ? ' Las calculamos con los datos.' : ''), [`\\bar{x}=${eL(M.xb)}`, M.s ? `s=${eL(M.s)}` : `\\sigma=${eL(M.sigma)}`, `n=${M.n}`]);
  P(usaZ ? 'Elegimos la normal (σ conocida)' : 'Elegimos la t de Student (σ desconocida)', usaZ ? 'Como se conoce la desviación poblacional σ, usamos la distribución normal.' : `Como σ es desconocida y la estimamos con s, usamos la t de Student con n − 1 = ${gl} grados de libertad.`, `${usaZ ? 'z_{\\alpha/2}' : `t_{${gl};\\,\\alpha/2}`}=${eL(crit, 3)}`);
  P('Calculamos el margen de error', 'Valor crítico por el error estándar de la media (desviación sobre √n).', `E=${eL(crit, 3)}\\cdot\\frac{${eL(sd)}}{\\sqrt{${M.n}}}=${eL(E)}`);
  P('Armamos el intervalo de confianza', `Con un ${eT(100 * conf, 2)} % de confianza, la media poblacional está entre estos valores.`, `IC=(\\bar{x}-E;\\,\\bar{x}+E)=(${eL(M.xb - E)};\\,${eL(M.xb + E)})`, eSvgCampana(M.xb, sd / Math.sqrt(M.n), M.xb - E, M.xb + E));
  const area = usaZ ? ePhi(crit) - ePhi(-crit) : eTcdf(crit, gl) - eTcdf(-crit, gl);
  P('Verificamos', 'El área central entre −valor crítico y +valor crítico tiene que ser el nivel de confianza, y el intervalo tiene que estar centrado en x̄.', [`P(-${eL(crit, 3)}<${usaZ ? 'Z' : 'T'}<${eL(crit, 3)})=${eL(area)}\\;\\checkmark`, `\\frac{${eL(M.xb - E)}+${eL(M.xb + E)}}{2}=${eL(M.xb)}\\;\\checkmark`]);
  return { tema: 'estimacion', metodo: usaZ ? 'Intervalo para la media (z)' : 'Intervalo para la media (t de Student)', pasos, resultado: `IC_{${eT(100 * conf, 2)}\\%}(\\mu)=(${eL(M.xb - E)};\\,${eL(M.xb + E)})`, alternativas: M.s && M.sigma ? [{ nombre: usaZ ? 'Ver con t de Student' : 'Ver con la normal', metodo: usaZ ? 't' : 'z' }] : [] };
}

/* -----------------------------------------------------------------------
 * E13. CONTRASTE DE HIPÓTESIS
 * --------------------------------------------------------------------- */
function eCola(t) { return /mayor|supera|aument|mas de|> ?mu|mu ?>|unilateral derech/.test(t) ? 'der' : /menor|disminu|menos de|< ?mu|mu ?</.test(t) ? 'izq' : 'dos'; }
function eDecidir(P, est, nombre, pval, alfa, crit, cola, conclusion) {
  const rech = pval < alfa;
  P('Calculamos el valor p y decidimos', `El valor p es la probabilidad de obtener un resultado tan extremo como el observado si H₀ fuera cierta. Si p < α (= ${eT(alfa)}), rechazamos H₀.`, [`p\\text{-valor}=${eL(pval)}\\;${rech ? '<' : '\\ge'}\\;\\alpha=${eL(alfa)}\\;\\Rightarrow\\;\\text{${rech ? 'se rechaza' : 'no se rechaza'} }H_0`, tx(conclusion(rech))]);
  const regC = cola === 'dos' ? Math.abs(est) > crit : cola === 'der' ? est > crit : est < -crit;
  P('Verificamos', 'Comparamos también el estadístico con el valor crítico: la decisión tiene que coincidir con la del valor p.', `${nombre}=${eL(est, 3)}\\;${regC ? (cola === 'izq' ? '<' : '>') : (cola === 'izq' ? '\\ge' : '\\le')}\\;${cola === 'izq' ? '-' : cola === 'dos' ? '\\pm' : ''}${eL(crit, 3)}\\;\\Rightarrow\\;\\text{${regC ? 'zona de rechazo' : 'zona de aceptación'}}\\;${regC === rech ? '\\checkmark' : ''}`);
  return rech;
}
function resolverHipotesis(texto, metodo) {
  const t = plano(texto), { pasos, P } = crearPasos(), alfa = eParam(texto, ['alfa', 'significacion', 'significancia']) || (t.match(/nivel de significaci[oó]n del? (\d+)\s*%/) ? +t.match(/significaci[oó]n del? (\d+)\s*%/)[1] / 100 : 0.05);
  if (/anova|tres grupos|varios grupos/.test(t)) return resolverAnova(texto, true);
  if (/chi|ji cuadrado|bondad|observad/.test(t) || (/independ/.test(t) && eContingencia(texto))) {
    const et = eEtiquetas(texto), ko = Object.keys(et).find(k => /observ/.test(k)), ke = Object.keys(et).find(k => /esperad/.test(k));
    let O, E, gl, tipo;
    if (ko) { O = et[ko]; const N = eSum(O); E = ke ? et[ke] : O.map(() => N / O.length); if (ke && Math.abs(eSum(E) - N) > 1e-6 && eSum(E) <= 1.0001) E = E.map(p => p * N); gl = O.length - 1; tipo = 'bondad';
      P('Planteamos las hipótesis', 'Prueba de bondad de ajuste: ¿los datos observados siguen la distribución esperada?', ['H_0:\\text{ los datos se ajustan a la distribución esperada}', 'H_1:\\text{ no se ajustan}']); }
    else { const T = eContingencia(texto); if (!T) throw new Error('Para chi-cuadrado escribí “observadas: 18, 22, 20, 40” (y “esperadas: …” si no es uniforme) o una tabla de contingencia (filas “A: 20, 30; B: 25, 25”).'); const rt = T.M.map(eSum), ct = T.cols.map((_, j) => eSum(T.M.map(r => r[j]))), N = eSum(rt); O = T.M.flat(); E = T.M.flatMap((r, i) => r.map((_, j) => rt[i] * ct[j] / N)); gl = (T.filas.length - 1) * (T.cols.length - 1); tipo = 'independencia';
      P('Planteamos las hipótesis', 'Prueba de independencia: ¿las dos variables de la tabla están relacionadas?', ['H_0:\\text{ las variables son independientes}', 'H_1:\\text{ están relacionadas}']);
      P('Calculamos las frecuencias esperadas', 'Si fueran independientes, cada casilla esperaría (total de fila × total de columna) / total.', [], tabla(['', ...T.cols], T.filas.map((f, i) => [f, ...T.cols.map((_, j) => eT(rt[i] * ct[j] / N, 2))]))); }
    const chi = eSum(O.map((o, i) => (o - E[i]) ** 2 / E[i])), pv = 1 - eChiCdf(chi, gl), crit = eInv(x => eChiCdf(x, gl), 1 - alfa, 0, 1000);
    P('Calculamos el estadístico chi-cuadrado', 'Sumamos (observada − esperada)² / esperada en cada casilla.', [`\\chi^2=\\sum\\frac{(O-E)^2}{E}=${O.slice(0, 6).map((o, i) => `\\frac{(${eL(o, 2)}-${eL(E[i], 2)})^2}{${eL(E[i], 2)}}`).join('+')}${O.length > 6 ? '+\\cdots' : ''}=${eL(chi)}`, `\\text{grados de libertad}=${gl}`]);
    eDecidir(P, chi, '\\chi^2', pv, alfa, crit, 'der', r => (r ? (tipo === 'bondad' ? 'Hay evidencia de que los datos no siguen la distribución esperada.' : 'Hay evidencia de relación entre las variables.') : (tipo === 'bondad' ? 'No hay evidencia para decir que no se ajustan.' : 'No hay evidencia de relación: pueden considerarse independientes.')));
    return { tema: 'hipotesis', metodo: tipo === 'bondad' ? 'Chi-cuadrado de bondad de ajuste' : 'Chi-cuadrado de independencia', pasos, resultado: `\\chi^2=${eL(chi)},\\;p=${eL(pv)}` };
  }
  const et = eEtiquetas(texto), grupos = Object.entries(et).filter(([k]) => !/^(n|s|x|mu|alfa|sigma)$/.test(k));
  if (grupos.length === 2 && /dos (muestras|grupos)|diferencia|comparar|grupo/.test(t)) {
    const [[na, A], [nb, B]] = grupos, ma = eMedia(A), mb = eMedia(B), va = eSum(A.map(x => (x - ma) ** 2)) / (A.length - 1), vb = eSum(B.map(x => (x - mb) ** 2)) / (B.length - 1), se = Math.sqrt(va / A.length + vb / B.length), tt = (ma - mb) / se;
    const gl = (va / A.length + vb / B.length) ** 2 / ((va / A.length) ** 2 / (A.length - 1) + (vb / B.length) ** 2 / (B.length - 1)), cola = eCola(t);
    P('Planteamos las hipótesis', 'Comparamos las medias de dos grupos independientes.', [`H_0:\\mu_1=\\mu_2`, `H_1:\\mu_1${cola === 'der' ? '>' : cola === 'izq' ? '<' : '\\ne'}\\mu_2`]);
    P('Resumimos cada grupo', 'Media y varianza muestral de cada grupo.', [`\\bar{x}_1=${eL(ma)},\\;s_1^2=${eL(va)},\\;n_1=${A.length}`, `\\bar{x}_2=${eL(mb)},\\;s_2^2=${eL(vb)},\\;n_2=${B.length}`]);
    P('Calculamos el estadístico t (Welch)', 'No suponemos varianzas iguales: el error estándar combina las dos varianzas.', [`t=\\frac{\\bar{x}_1-\\bar{x}_2}{\\sqrt{\\frac{s_1^2}{n_1}+\\frac{s_2^2}{n_2}}}=\\frac{${eL(ma - mb)}}{${eL(se)}}=${eL(tt, 3)}`, `gl\\approx ${eL(gl, 2)}`]);
    const pv = cola === 'dos' ? 2 * (1 - eTcdf(Math.abs(tt), gl)) : cola === 'der' ? 1 - eTcdf(tt, gl) : eTcdf(tt, gl), crit = eInv(x => eTcdf(x, gl), cola === 'dos' ? 1 - alfa / 2 : 1 - alfa, 0, 100);
    eDecidir(P, tt, 't', pv, alfa, crit, cola, r => (r ? 'Hay diferencia significativa entre las medias de los grupos.' : 'No hay evidencia de diferencia entre las medias.'));
    return { tema: 'hipotesis', metodo: 'Prueba t para dos muestras', pasos, resultado: `t=${eL(tt, 3)},\\;p=${eL(pv)}` };
  }
  const mu0 = eParam(texto, ['mu0', 'mu_0', 'mu', 'media poblacional']);
  const exitos = t.match(/(\d+)\s*(?:exitos|favorables|defectuos|prefieren|votan|casos)/), p0 = eParam(texto, ['p0', 'p_0']);
  if (p0 !== null && exitos) {
    const n = eParam(texto, ['n']), ph = +exitos[1] / n, cola = eCola(t), z = (ph - p0) / Math.sqrt(p0 * (1 - p0) / n);
    P('Planteamos las hipótesis', 'Contraste para una proporción.', [`H_0:p=${eL(p0)}`, `H_1:p${cola === 'der' ? '>' : cola === 'izq' ? '<' : '\\ne'}${eL(p0)}`]);
    P('Calculamos el estadístico z', 'Usamos la desviación de la proporción bajo H₀.', `z=\\frac{\\hat{p}-p_0}{\\sqrt{p_0(1-p_0)/n}}=\\frac{${eL(ph)}-${eL(p0)}}{\\sqrt{${eL(p0)}\\cdot ${eL(1 - p0)}/${n}}}=${eL(z, 3)}`);
    const pv = cola === 'dos' ? 2 * (1 - ePhi(Math.abs(z))) : cola === 'der' ? 1 - ePhi(z) : ePhi(z), crit = eInvPhi(cola === 'dos' ? 1 - alfa / 2 : 1 - alfa);
    eDecidir(P, z, 'z', pv, alfa, crit, cola, r => (r ? 'La proporción difiere significativamente del valor supuesto.' : 'No hay evidencia contra el valor supuesto de la proporción.'));
    return { tema: 'hipotesis', metodo: 'Contraste para una proporción', pasos, resultado: `z=${eL(z, 3)},\\;p=${eL(pv)}` };
  }
  if (mu0 === null) throw new Error('Escribí el valor de la hipótesis nula (μ0 = 50) y los datos (o x̄, s, n). Para chi-cuadrado, “observadas: …”; para dos grupos, “A: …; B: …”.');
  const M = eResumenMuestra(texto.replace(/(mu0|μ0|mu_0|μ_0)\s*=\s*-?\d+([.,]\d+)?/gi, ' ')), cola = eCola(t);
  if (!M.n || M.xb === null) throw new Error('Faltan los datos de la muestra: escribilos o poné x̄ = …, s = …, n = ….');
  const usaZ = metodo === 'z' || (metodo !== 't' && M.sigma !== null && M.sigma !== undefined), sd = usaZ ? (M.sigma || M.s) : M.s, gl = M.n - 1, est = (M.xb - mu0) / (sd / Math.sqrt(M.n));
  P('Planteamos las hipótesis', 'H₀ es la afirmación que se pone a prueba (lleva el igual); H₁ es lo que queremos ver si los datos apoyan.', [`H_0:\\mu=${eL(mu0)}`, `H_1:\\mu${cola === 'der' ? '>' : cola === 'izq' ? '<' : '\\ne'}${eL(mu0)}`, `\\alpha=${eL(alfa)}\\;(\\text{probabilidad de error tipo I: rechazar }H_0\\text{ siendo cierta})`]);
  P(usaZ ? 'Calculamos el estadístico z' : 'Calculamos el estadístico t de Student', usaZ ? 'σ es conocida: usamos la normal.' : `σ es desconocida: usamos t con ${gl} grados de libertad.`, `${usaZ ? 'z' : 't'}=\\frac{\\bar{x}-\\mu_0}{${usaZ ? '\\sigma' : 's'}/\\sqrt{n}}=\\frac{${eL(M.xb)}-${par(eL(mu0))}}{${eL(sd)}/\\sqrt{${M.n}}}=${eL(est, 3)}`);
  const cdf = x => (usaZ ? ePhi(x) : eTcdf(x, gl)), pv = cola === 'dos' ? 2 * (1 - cdf(Math.abs(est))) : cola === 'der' ? 1 - cdf(est) : cdf(est), crit = usaZ ? eInvPhi(cola === 'dos' ? 1 - alfa / 2 : 1 - alfa) : eInv(x => eTcdf(x, gl), cola === 'dos' ? 1 - alfa / 2 : 1 - alfa, 0, 100);
  eDecidir(P, est, usaZ ? 'z' : 't', pv, alfa, crit, cola, r => (r ? 'Los datos muestran una diferencia significativa con el valor de H₀.' : 'Los datos no alcanzan para rechazar H₀ (eso no prueba que sea cierta).'));
  const mu1 = eParam(texto, ['mu1', 'mu_1', 'media real']);
  if (mu1 !== null) { const se = sd / Math.sqrt(M.n), lo = cola === 'izq' ? mu0 - crit * se : mu0 - crit * se, hi = mu0 + crit * se, beta = cola === 'dos' ? ePhi((hi - mu1) / se) - ePhi((lo - mu1) / se) : cola === 'der' ? ePhi((hi - mu1) / se) : 1 - ePhi((lo - mu1) / se);
    P('Calculamos el error tipo II', 'β es la probabilidad de NO rechazar H₀ cuando en realidad la media es μ₁. La potencia del test es 1 − β.', [`\\beta=P(\\text{no rechazar }H_0\\mid\\mu=${eL(mu1)})=${eL(beta)}`, `\\text{potencia}=1-\\beta=${eL(1 - beta)}`]); }
  return { tema: 'hipotesis', metodo: usaZ ? 'Prueba z para la media' : 'Prueba t de Student para la media', pasos, resultado: `${usaZ ? 'z' : 't'}=${eL(est, 3)},\\;p=${eL(pv)}\\;\\Rightarrow\\;${tx(pv < alfa ? 'se rechaza H₀' : 'no se rechaza H₀')}`, alternativas: M.s && M.sigma ? [{ nombre: usaZ ? 'Ver con t de Student' : 'Ver con z', metodo: usaZ ? 't' : 'z' }] : [] };
}

/* -----------------------------------------------------------------------
 * E14. MODELOS: REGRESIÓN Y CORRELACIÓN, ANOVA, SERIES TEMPORALES
 * --------------------------------------------------------------------- */
function eCorr(xs, ys) { const mx = eMedia(xs), my = eMedia(ys), sxy = eSum(xs.map((x, i) => (x - mx) * (ys[i] - my))), sxx = eSum(xs.map(x => (x - mx) ** 2)), syy = eSum(ys.map(y => (y - my) ** 2)); return sxy / Math.sqrt(sxx * syy); }
function resolverRegresion(texto) {
  const { pasos, P } = crearPasos(), et = eEtiquetas(texto); let xs = et.x, ys = et.y;
  if (!xs || !ys) { const pares = [...texto.matchAll(/\(\s*(-?\d+(?:[.,]\d+)?)\s*[;,]\s*(-?\d+(?:[.,]\d+)?)\s*\)/g)]; if (pares.length >= 3) { xs = pares.map(m => eNum(m[1])); ys = pares.map(m => eNum(m[2])); } }
  if (!xs || !ys || xs.length !== ys.length) throw new Error('Escribí los datos pareados: “x: 1, 2, 3, 4; y: 2, 4, 5, 8” o pares (1; 2), (2; 4)….');
  const n = xs.length, mx = eMedia(xs), my = eMedia(ys), sxy = eSum(xs.map((x, i) => (x - mx) * (ys[i] - my))), sxx = eSum(xs.map(x => (x - mx) ** 2)), syy = eSum(ys.map(y => (y - my) ** 2)), b = sxy / sxx, a = my - b * mx, r = sxy / Math.sqrt(sxx * syy);
  P('Calculamos las medias', 'La recta de regresión siempre pasa por el punto (x̄ ; ȳ).', [`\\bar{x}=${eL(mx)},\\quad\\bar{y}=${eL(my)}`]);
  P('Calculamos las sumas de desvíos', 'Sxy mide cómo varían juntas; Sxx y Syy, cuánto varía cada una.', [`S_{xy}=\\sum(x_i-\\bar{x})(y_i-\\bar{y})=${eL(sxy)}`, `S_{xx}=${eL(sxx)},\\quad S_{yy}=${eL(syy)}`], eFilas(['xᵢ', 'yᵢ', 'xᵢ − x̄', 'yᵢ − ȳ', '(xᵢ − x̄)(yᵢ − ȳ)'], xs.map((x, i) => [x, ys[i], x - mx, ys[i] - my, (x - mx) * (ys[i] - my)])));
  const fuerza = Math.abs(r) > 0.9 ? 'muy fuerte' : Math.abs(r) > 0.7 ? 'fuerte' : Math.abs(r) > 0.4 ? 'moderada' : 'débil';
  P('Coeficiente de correlación de Pearson', 'r va de −1 a 1: cerca de ±1 la relación lineal es fuerte; cerca de 0, débil. El signo indica si crecen juntas o al revés.', [`r=\\frac{S_{xy}}{\\sqrt{S_{xx}S_{yy}}}=${eL(r)}\\;\\Rightarrow\\;\\text{correlación ${r > 0 ? 'positiva' : 'negativa'} ${fuerza}}`, `r^2=${eL(r * r)}\\;(\\text{el }${eL(100 * r * r, 1)}\\%\\text{ de la variación de y se explica con x})`]);
  P('Recta de regresión de mínimos cuadrados', 'Es la recta que hace mínima la suma de los cuadrados de los errores verticales.', [`b=\\frac{S_{xy}}{S_{xx}}=${eL(b)},\\quad a=\\bar{y}-b\\bar{x}=${eL(a)}`, `\\hat{y}=${eL(a)}${b < 0 ? '' : '+'}${eL(b)}\\,x`], eSvgXY(xs, ys, { recta: [a, b] }));
  const mp = texto.match(/(?:predec\w*|estim\w*|pronostic\w*|para)\s+(?:el valor de y\s+)?(?:para\s+|cuando\s+)?x\s*=\s*(-?\d+(?:[.,]\d+)?)/i), x0 = mp ? eNum(mp[1]) : null; let pred = '';
  if (x0 !== null) { const y0 = a + b * x0; P('Hacemos una predicción', 'Reemplazamos x en la recta (ojo: es más confiable dentro del rango de los datos).', `\\hat{y}(${eL(x0)})=${eL(a)}${b < 0 ? '' : '+'}${eL(b)}\\cdot ${eL(x0)}=${eL(y0)}`); pred = `,\\;\\hat{y}(${eL(x0)})=${eL(y0)}`; }
  const res = xs.map((x, i) => ys[i] - (a + b * x));
  P('Verificamos', 'La recta pasa por (x̄ ; ȳ) y la suma de los residuos (yᵢ − ŷᵢ) da 0.', [`${eL(a)}+${eL(b)}\\cdot ${eL(mx)}=${eL(a + b * mx)}=\\bar{y}\\;\\checkmark`, `\\sum(y_i-\\hat{y}_i)=${eL(eSum(res), 6)}\\;\\checkmark`]);
  return { tema: 'modelos', metodo: 'Regresión lineal y correlación', pasos, resultado: `\\hat{y}=${eL(a)}${b < 0 ? '' : '+'}${eL(b)}x,\\;r=${eL(r)}${pred}` };
}
function resolverAnova(texto, comoHipotesis = false) {
  const { pasos, P } = crearPasos(), et = eEtiquetas(texto), alfa = eParam(texto, ['alfa']) || 0.05;
  const gr = Object.entries(et).filter(([k, v]) => v.length >= 2 && !/^(alfa|n)$/.test(k)); if (gr.length < 2) throw new Error('Escribí los grupos así: “A: 5, 7, 6; B: 8, 9, 7; C: 4, 5, 6”.');
  const todos = gr.flatMap(([, v]) => v), N = todos.length, k = gr.length, mg = eMedia(todos), medias = gr.map(([, v]) => eMedia(v));
  const SCE = eSum(gr.map(([, v], i) => v.length * (medias[i] - mg) ** 2)), SCD = eSum(gr.map(([, v], i) => eSum(v.map(x => (x - medias[i]) ** 2)))), SCT = eSum(todos.map(x => (x - mg) ** 2));
  const glE = k - 1, glD = N - k, CME = SCE / glE, CMD = SCD / glD, F = CME / CMD, pv = 1 - eFcdf(F, glE, glD), crit = eInv(x => eFcdf(x, glE, glD), 1 - alfa, 0, 1000);
  P('Planteamos las hipótesis', 'El ANOVA compara las medias de tres o más grupos mirando si la variación entre grupos es grande comparada con la variación dentro de cada grupo.', [`H_0:${gr.map((_, i) => `\\mu_${i + 1}`).join('=')}`, 'H_1:\\text{ al menos una media es distinta}']);
  P('Calculamos las medias', 'Media de cada grupo y media general.', [...gr.map(([nm, v], i) => `\\bar{x}_{\\text{${nm}}}=${eL(medias[i])}\\;(n=${v.length})`), `\\bar{x}=${eL(mg)}`]);
  P('Armamos la tabla ANOVA', 'SC: suma de cuadrados; gl: grados de libertad; CM = SC/gl. El estadístico es F = CM entre / CM dentro.', [], eFilas(['Fuente', 'SC', 'gl', 'CM', 'F'], [['Entre grupos', SCE, glE, CME, F], ['Dentro de grupos', SCD, glD, CMD, ''], ['Total', SCT, N - 1, '', '']]));
  const rech = pv < alfa;
  P('Decidimos', `Comparamos con la F de Fisher con (${glE}; ${glD}) grados de libertad.`, [`F=${eL(F, 3)},\\quad F_{crít}=${eL(crit, 3)},\\quad p=${eL(pv)}`, tx(rech ? 'Se rechaza H₀: al menos un grupo tiene media distinta.' : 'No se rechaza H₀: no hay evidencia de diferencias entre las medias.')], eSvgBarras(gr.map(([nm]) => nm), medias));
  P('Verificamos', 'La variación total se reparte exactamente en “entre grupos” más “dentro de grupos”, y la decisión por F crítico coincide con la del valor p.', [`SC_T=${eL(SCT)}=${eL(SCE)}+${eL(SCD)}\\;${Math.abs(SCT - SCE - SCD) < 1e-6 * Math.max(1, SCT) ? '\\checkmark' : ''}`, `${eL(F, 3)}${F > crit ? '>' : '\\le'}${eL(crit, 3)}\\;${(F > crit) === rech ? '\\checkmark' : ''}`]);
  return { tema: comoHipotesis ? 'hipotesis' : 'modelos', metodo: 'ANOVA de un factor', pasos, resultado: `F=${eL(F, 3)},\\;p=${eL(pv)}\\;\\Rightarrow\\;${tx(rech ? 'se rechaza H₀' : 'no se rechaza H₀')}` };
}
function resolverSeries(texto) {
  const { pasos, P } = crearPasos(), D = eDatos(texto.replace(/(periodos?|años?|meses?|t)\s*:\s*[\d,;\s]+;/i, '')), y = D.datos, n = y.length, ts = y.map((_, i) => i + 1);
  const mt = eMedia(ts), my = eMedia(y), b = eSum(ts.map((t, i) => (t - mt) * (y[i] - my))) / eSum(ts.map(t => (t - mt) ** 2)), a = my - b * mt;
  P('Ordenamos la serie en el tiempo', 'Numeramos los períodos t = 1, 2, 3, … y miramos cómo evoluciona la variable.', [], eFilas(['t', 'yₜ'], y.map((v, i) => [i + 1, v])));
  const w = n >= 6 ? 3 : 2, mm = y.map((_, i) => (i >= w - 1 ? eMedia(y.slice(i - w + 1, i + 1)) : null));
  P(`Calculamos medias móviles de orden ${w}`, `Promediamos cada ${w} períodos consecutivos para suavizar las oscilaciones y ver mejor la tendencia.`, mm.map((v, i) => (v === null ? null : `M_{${i + 1}}=\\frac{${y.slice(i - w + 1, i + 1).map(x => eL(x)).join('+')}}{${w}}=${eL(v)}`)).filter(Boolean).slice(0, 8));
  P('Ajustamos la tendencia lineal', 'Con mínimos cuadrados ajustamos una recta en función del tiempo: su pendiente dice cuánto cambia la variable por período.', [`b=${eL(b)},\\quad a=${eL(a)}`, `\\hat{y}_t=${eL(a)}${b < 0 ? '' : '+'}${eL(b)}\\,t\\quad(\\text{tendencia ${b > 0 ? 'creciente' : b < 0 ? 'decreciente' : 'constante'}})`], eSvgXY(ts, y, { linea: true, recta: [a, b], extra: [{ xs: ts.filter((_, i) => mm[i] !== null), ys: mm.filter(v => v !== null) }] }));
  const prono = a + b * (n + 1);
  P('Pronosticamos el período siguiente', 'Extendemos la recta de tendencia un período más.', `\\hat{y}_{${n + 1}}=${eL(a)}${b < 0 ? '' : '+'}${eL(b)}\\cdot ${n + 1}=${eL(prono)}`);
  P('Verificamos', 'La suma de los residuos de la tendencia es 0 y la recta pasa por el punto medio (t̄ ; ȳ).', [`\\sum(y_t-\\hat{y}_t)=${eL(eSum(y.map((v, i) => v - (a + b * (i + 1)))), 6)}\\;\\checkmark`, `${eL(a)}+${eL(b)}\\cdot ${eL(mt)}=${eL(a + b * mt)}=\\bar{y}\\;\\checkmark`]);
  return { tema: 'modelos', metodo: 'Series temporales (tendencia y medias móviles)', pasos, resultado: `\\hat{y}_t=${eL(a)}${b < 0 ? '' : '+'}${eL(b)}t,\\;\\hat{y}_{${n + 1}}=${eL(prono)}` };
}
function resolverModelos(texto) { const t = plano(texto); if (/anova|varianza de|grupos/.test(t)) return resolverAnova(texto); if (/serie|tempor|media movil|pronost|tendencia|trimestr|mensual|anual/.test(t)) return resolverSeries(texto); return resolverRegresion(texto); }

/* -----------------------------------------------------------------------
 * E15. DETECCIÓN DEL TEMA
 * --------------------------------------------------------------------- */
const TEMAS_EST = { tipos: 'Tipos de variables', frecuencias: 'Distribuciones de frecuencia', graficos: 'Representaciones gráficas', central: 'Tendencia central', dispersion: 'Dispersión', forma: 'Medidas de forma', posicion: 'Medidas de posición', condicional: 'Probabilidad condicional', bayes: 'Probabilidad total y Bayes', diagramas: 'Venn, árbol y contingencia', distribuciones: 'Variables aleatorias y distribuciones', estimacion: 'Estimación de parámetros', hipotesis: 'Contraste de hipótesis', modelos: 'Regresión, ANOVA y series' };
const DETECTORES_EST = [
  ['hipotesis', t => /hipotesis|contraste|prueba t|test|chi|ji cuadrado|significa|valor p|p-valor|error tipo|bondad de ajuste|observadas/.test(t)],
  ['estimacion', t => /intervalo de confianza|estimacion|estimar|estimador|confianza|margen de error/.test(t)],
  ['modelos', t => /regresion|correlacion|anova|serie|tempor|media movil|pronost|recta de ajuste|minimos cuadrados/.test(t)],
  ['bayes', t => /bayes|probabilidad total|p\(\s*[a-z]\s*\|\s*[a-z]\d\s*\)|p\(\s*[a-z]\d\s*\)/.test(t)],
  ['diagramas', t => /venn|arbol|contingencia|urna|bolillas?|bolas?\s|n\s*\(\s*a\s*\)/.test(t)],
  ['condicional', t => /condicional|independ|p\s*\(\s*[a-z]'?\s*(\||∩|∪)/.test(t)],
  ['distribuciones', t => /binomial|poisson|normal|gauss|variable aleatoria|esperanza|valor esperado|grandes numeros|lambda|\bmu\s*=|sigma\s*=|p\(\s*x\s*[=<>≤≥]/.test(t)],
  ['tipos', t => /tipo de variable|tipos de variables|clasific|cualitativ|cuantitativ|nominal|ordinal/.test(t)],
  ['graficos', t => /histograma|grafico|diagrama de barras|barras|poligono|sectores|torta|circular|dispersion de puntos|diagrama de dispersion|nube de puntos|ojiva/.test(t)],
  ['frecuencias', t => /frecuencia|tabla de|agrup|intervalos/.test(t)],
  ['forma', t => /asimetri|curtosis|apuntamiento|achatamiento|forma de la distribucion/.test(t)],
  ['posicion', t => /cuartil|percentil|decil|posicion|intercuart|boxplot|diagrama de caja/.test(t)],
  ['dispersion', t => /rango|recorrido|varianza|desviacion|desvio|coeficiente de variacion|dispersion/.test(t)],
  ['central', t => /media|promedio|mediana|moda|tendencia central/.test(t)]
];
const FORZAR_EST = { tipos: resolverTiposVar, frecuencias: resolverFrecuencias, graficos: resolverGraficos, central: resolverCentral, dispersion: resolverDispersion, forma: resolverForma, posicion: resolverPosicion, condicional: resolverCondicional, bayes: resolverBayes, diagramas: resolverDiagramas, distribuciones: resolverDistribuciones, estimacion: resolverEstimacion, hipotesis: resolverHipotesis, modelos: resolverModelos };
function detectarTemaEst(texto) { const t = plano(texto.trim()); if (!t) return null; const d = DETECTORES_EST.find(([, f]) => f(t)); return d ? d[0] : 'central'; }
function resolverEst(texto, temaForzado, metodo) {
  const o = texto.trim(); if (!o) throw new Error('Escribí un ejercicio.');
  const tema = temaForzado || detectarTemaEst(o);
  return FORZAR_EST[tema](o, metodo);
}
/* MOTOR-ESTADISTICA-FIN ================================================== */

/* =======================================================================
 * TEMA NUEVO · COMBINATORIA
 * Factorial, permutaciones (simples, con repetición y circulares),
 * variaciones (simples y con repetición) y combinaciones (simples y con
 * repetición). Cálculo exacto con enteros grandes (BigInt).
 * ===================================================================== */
const cbFact = n => { let r = 1n; for (let k = 2n; k <= BigInt(n); k++) r *= k; return r; };
const cbL = b => { const t = b.toString(); return t.length > 60 ? `${t.slice(0, 12).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,')}\\ldots\\;(\\text{${t.length.toLocaleString('es-AR')} cifras})` : L_ent(b); };   // números enormes: primeras cifras y cantidad
function cbV(n, k) { let r = 1n; for (let j = 0; j < k; j++) r *= BigInt(n - j); return r; }
function cbC(n, k) { if (k < 0 || k > n) return 0n; k = Math.min(k, n - k); let r = 1n; for (let j = 1; j <= k; j++) r = r * BigInt(n - k + j) / BigInt(j); return r; }
// Cuenta a mano (para verificar con números chicos): genera todas las listas posibles
function cbContar(n, k, orden, repite) {
  let total = 0; const rec = (pos, usados, minimo) => {
    if (pos === k) { total++; return; }
    for (let x = orden ? 0 : minimo; x < n; x++) { if (!repite && usados.has(x)) continue; usados.add(x); rec(pos + 1, repite ? new Set() : usados, repite ? x : x + 1); usados.delete(x); }
  };
  rec(0, new Set(), 0); return total;
}
function cbLeer(texto) {
  const t = plano(texto), o = texto;
  let m = o.match(/\b(VR|CR|PR|V|C|P)\s*[\(_]\s*(\d+)\s*(?:[,;]\s*(\d+))?\s*\)?/);
  if (m) return { tipo: m[1], n: +m[2], k: m[3] !== undefined ? +m[3] : null };
  m = o.match(/(\d+)\s*C\s*(\d+)/); if (m) return { tipo: 'C', n: +m[1], k: +m[2] };
  m = t.match(/(\d+)\s*!/) || t.match(/factorial (?:de )?(\d+)/); if (m && !/permut|variac|combin/.test(t)) return { tipo: 'F', n: +m[1] };
  const pal = o.match(/(?:palabra|anagramas? de|letras de)\s+["“]?([A-Za-zÁÉÍÓÚÑáéíóúñ]+)/); if (pal) return { tipo: 'PR', palabra: pal[1].toUpperCase() };
  const nums = (t.match(/\d+/g) || []).map(Number), digitos = t.match(/(?:digitos|cifras|numeros)\s*(?:\d+\s*[,y]\s*)+\d+/);
  const repite = /con repeticion|se pueden repetir|pueden repetirse|repitiendo/.test(t) && !/sin repeticion|distint/.test(t);
  if (/circular|ronda|mesa redonda|alrededor de una mesa/.test(t)) return { tipo: 'PC', n: nums[0] };
  if (/permut/.test(t) && !/con repeticion/.test(t)) return { tipo: 'P', n: nums[0] };
  if (digitos) { const lista = digitos[0].match(/\d+/g).slice(0); const kk = nums.find(v => /cifras/.test(t) && t.includes(v + ' cifras')) || nums[0]; return { tipo: repite || !/distint|sin repetir|no se repit/.test(t) && !/sin repeticion/.test(t) && /cifras/.test(t) && !/distint/.test(t) ? 'VR' : 'V', n: lista.length - (lista.includes(String(kk)) && lista.indexOf(String(kk)) === 0 ? 1 : 0), k: kk }; }
  const [a, b] = nums.length >= 2 ? [Math.max(nums[0], nums[1]), Math.min(nums[0], nums[1])] : [nums[0], null];
  if (/combinac|elegir|eleg|seleccion|grupo|comision|equipo|subconjunt|sin importar el orden/.test(t) && b !== null) return { tipo: repite ? 'CR' : 'C', n: a, k: b };
  if (/variac|orden|ordenar|podio|presidente|primer|cargo|puesto|clave|codigo|contrasena|patente|forma[rn]?/.test(t) && b !== null) return { tipo: repite ? 'VR' : 'V', n: a, k: b };
  if (/ordenar|formas? de (sentar|ubicar|acomodar|ordenar)|de cuantas (formas|maneras)/.test(t) && a) return { tipo: 'P', n: a };
  return null;
}
function resolverCombinatoria(texto) {
  const { pasos, P } = crearPasos(), d = cbLeer(texto);
  if (!d || (d.n === undefined && !d.palabra) || (['V', 'C', 'VR', 'CR'].includes(d.tipo) && d.k === null)) throw new Error('Escribilo así: “C(10, 4)”, “V(7, 3)”, “P(5)”, “permutaciones de la palabra BANANA”, “de cuántas formas se pueden elegir 3 alumnos de 10”.');
  const { tipo, n, k } = d;
  const tablaDecision = tabla(['Pregunta', 'Respuesta'], [['¿Importa el orden?', ['C', 'CR'].includes(tipo) ? 'No' : 'Sí'], ['¿Se pueden repetir elementos?', ['VR', 'CR', 'PR'].includes(tipo) ? 'Sí' : 'No'], ['¿Se usan todos los elementos?', ['P', 'PC', 'PR', 'F'].includes(tipo) ? 'Sí' : 'No']]);
  const nombres = { F: 'Factorial', P: 'Permutaciones', PC: 'Permutaciones circulares', PR: 'Permutaciones con repetición', V: 'Variaciones', VR: 'Variaciones con repetición', C: 'Combinaciones', CR: 'Combinaciones con repetición' };
  if (tipo !== 'F') P('Identificamos qué contar', 'Para elegir la fórmula nos hacemos tres preguntas: si importa el orden, si se pueden repetir y si se usan todos los elementos.', [`\\text{${nombres[tipo]}}`], tablaDecision);
  let res, verif = [];
  if (tipo === 'F' || tipo === 'P') {
    res = cbFact(n);
    P(tipo === 'F' ? 'Calculamos el factorial' : 'Usamos la fórmula de las permutaciones', tipo === 'F' ? 'El factorial de n es el producto de todos los naturales desde 1 hasta n.' : `Ordenar ${n} elementos distintos: el primero se elige de ${n} formas, el segundo de ${n - 1}, y así: P(n) = n!.`, [`${tipo === 'P' ? `P_{${n}}=` : ''}${n}!=${Array.from({ length: Math.min(n, 10) }, (_, j) => n - j).join('\\cdot ')}${n > 10 ? '\\cdots 1' : ''}=${cbL(res)}`]);
    verif = n <= 7 ? [`\\text{contando una por una las listas: }${cbContar(n, n, true, false)}\\;${BigInt(cbContar(n, n, true, false)) === res ? '\\checkmark' : ''}`] : [`${n}!=${n}\\cdot ${n - 1}!=${n}\\cdot ${cbL(cbFact(n - 1))}=${cbL(BigInt(n) * cbFact(n - 1))}\\;\\checkmark`];
  } else if (tipo === 'PC') {
    res = cbFact(n - 1);
    P('Usamos permutaciones circulares', 'En una ronda no hay primer lugar: dejamos fija a una persona y ordenamos a las demás.', [`PC_{${n}}=(${n}-1)!=${n - 1}!=${cbL(res)}`]);
    verif = [`\\frac{P_{${n}}}{${n}}=\\frac{${cbL(cbFact(n))}}{${n}}=${cbL(cbFact(n) / BigInt(n))}\\;\\checkmark`];
  } else if (tipo === 'PR') {
    const cuenta = {}; [...d.palabra].forEach(c => { cuenta[c] = (cuenta[c] || 0) + 1; }); const N = d.palabra.length, rep = Object.entries(cuenta).filter(([, v]) => v > 1);
    res = cbFact(N); rep.forEach(([, v]) => { res /= cbFact(v); });
    P('Contamos las letras repetidas', `La palabra ${d.palabra} tiene ${N} letras. Las que se repiten se dividen: intercambiarlas entre sí no forma una palabra nueva.`, [rep.length ? rep.map(([c, v]) => `\\text{${c}}:${v}`).join(',\\;') : tx('No hay letras repetidas.')]);
    P('Usamos permutaciones con repetición', '', [`P_{${N}}^{${rep.map(([, v]) => v).join(',')}}=\\frac{${N}!}{${rep.map(([, v]) => v + '!').join('\\cdot ') || '1'}}=\\frac{${cbL(cbFact(N))}}{${cbL(rep.reduce((a, [, v]) => a * cbFact(v), 1n))}}=${cbL(res)}`]);
    verif = N <= 8 ? (() => { const vistos = new Set(), letras = [...d.palabra], rec = (r, quedan) => { if (!quedan.length) { vistos.add(r); return; } quedan.forEach((c, j) => rec(r + c, quedan.filter((_, q) => q !== j))); }; rec('', letras); return [`\\text{anagramas distintos generados uno por uno: }${vistos.size}\\;${BigInt(vistos.size) === res ? '\\checkmark' : ''}`]; })() : [`${cbL(res)}\\cdot ${rep.map(([, v]) => v + '!').join('\\cdot ')}=${cbL(cbFact(N))}=${N}!\\;\\checkmark`];
  } else if (tipo === 'V') {
    if (k > n) throw new Error('No se pueden tomar más elementos de los que hay.');
    res = cbV(n, k);
    P('Usamos la fórmula de las variaciones', `Elegimos ${k} de ${n} en orden y sin repetir: ${n} opciones para el primero, ${n - 1} para el segundo… hasta completar ${k} lugares.`, [`V_{${n},${k}}=\\frac{${n}!}{(${n}-${k})!}=${Array.from({ length: k }, (_, j) => n - j).join('\\cdot ')}=${cbL(res)}`]);
    verif = [`V_{${n},${k}}=C_{${n},${k}}\\cdot ${k}!=${cbL(cbC(n, k))}\\cdot ${cbL(cbFact(k))}=${cbL(cbC(n, k) * cbFact(k))}\\;\\checkmark`, ...(n <= 8 ? [`\\text{contando una por una: }${cbContar(n, k, true, false)}\\;\\checkmark`] : [])];
  } else if (tipo === 'VR') {
    res = BigInt(n) ** BigInt(k);
    P('Usamos variaciones con repetición', `Hay ${k} lugares y en cada uno puede ir cualquiera de los ${n} elementos (se pueden repetir): ${n} · ${n} · … (${k} veces).`, [`VR_{${n},${k}}=${n}^{${k}}=${cbL(res)}`]);
    verif = n <= 6 && k <= 5 ? [`\\text{contando una por una: }${cbContar(n, k, true, true)}\\;${BigInt(cbContar(n, k, true, true)) === res ? '\\checkmark' : ''}`] : [`${n}^{${k}}=${n}\\cdot ${n}^{${k - 1}}=${cbL(BigInt(n) * BigInt(n) ** BigInt(k - 1))}\\;\\checkmark`];
  } else if (tipo === 'C') {
    if (k > n) throw new Error('No se pueden elegir más elementos de los que hay.');
    res = cbC(n, k);
    P('Usamos la fórmula de las combinaciones', `Elegimos ${k} de ${n} sin importar el orden: contamos las variaciones y dividimos por las ${k}! formas de ordenar cada grupo.`, [`C_{${n},${k}}=\\binom{${n}}{${k}}=\\frac{${n}!}{${k}!\\,(${n}-${k})!}=\\frac{${Array.from({ length: Math.min(k, 8) }, (_, j) => n - j).join('\\cdot ')}${k > 8 ? '\\cdots' : ''}}{${k}!}=${cbL(res)}`]);
    verif = [`\\binom{${n}}{${k}}=\\binom{${n}}{${n - k}}=${cbL(cbC(n, n - k))}\\;\\checkmark`, ...(n <= 10 ? [`\\text{contando uno por uno los grupos: }${cbContar(n, k, false, false)}\\;${BigInt(cbContar(n, k, false, false)) === res ? '\\checkmark' : ''}`] : [])];
  } else if (tipo === 'CR') {
    res = cbC(n + k - 1, k);
    P('Usamos combinaciones con repetición', `Elegimos ${k} de ${n} tipos, sin orden y pudiendo repetir: equivale a combinaciones de ${n + k - 1} tomados de ${k}.`, [`CR_{${n},${k}}=\\binom{${n}+${k}-1}{${k}}=\\binom{${n + k - 1}}{${k}}=${cbL(res)}`]);
    verif = n <= 6 && k <= 5 ? [`\\text{contando uno por uno: }${cbContar(n, k, false, true)}\\;${BigInt(cbContar(n, k, false, true)) === res ? '\\checkmark' : ''}`] : [`\\binom{${n + k - 1}}{${k}}=\\binom{${n + k - 1}}{${n - 1}}=${cbL(cbC(n + k - 1, n - 1))}\\;\\checkmark`];
  }
  P('Verificamos', 'Lo calculamos por otro camino (o contando todos los casos, si son pocos).', verif);
  return { tema: 'combinatoria', metodo: nombres[tipo], pasos, resultado: tipo === 'F' ? `${n}!=${cbL(res)}` : `${cbL(res)}\\;\\text{casos}` };
}
TEMAS_EST.combinatoria = 'Combinatoria';
FORZAR_EST.combinatoria = resolverCombinatoria;
DETECTORES_EST.unshift(['combinatoria', t => /factorial|\d\s*!|permutac|variaciones|variacion (con|sin) repeticion|variacion de \d|combinaciones|combinacion (con|sin) repeticion|combinatori|anagrama|de cuantas (formas|maneras)|cuantos (numeros|grupos|codigos|claves)|\b(vr|cr|pr|v|c|p)\s*\(\s*\d+\s*[,;)]|\d+\s*c\s*\d+/.test(t)]);

// Aviso para la interfaz: este motor ya está cargado (se cargan a medida que se eligen las áreas)
(window.MPP_MOTORES = window.MPP_MOTORES || {}).est = true;
