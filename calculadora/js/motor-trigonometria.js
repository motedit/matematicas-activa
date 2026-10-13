/* =======================================================================
 * MOTOR: GEOMETRÍA Y TRIGONOMETRÍA
 * Ángulos, figuras, cuerpos, trigonometría y complejos en forma trigonométrica. Necesita los anteriores.
 * Es lógica pura (no toca la página): recibe texto y devuelve
 * { tema, metodo, pasos, resultado, alternativas }.
 * ===================================================================== */
'use strict';
/* MOTOR-TRIGONOMETRIA-INICIO =============================================
 * Geometría y trigonometría. Reutiliza las herramientas de los motores de
 * arriba: racionales Q, polinomios, raicesCuadratica, raizQ, svgGeo, R2...
 * ====================================================================== */

/* -----------------------------------------------------------------------
 * T1. HERRAMIENTAS: datos con nombre, unidades, π y ángulos
 * --------------------------------------------------------------------- */
const NUMRE = '(-?\\d+(?:[.,]\\d+)?(?:\\/\\d+)?)';
// Busca "nombre = 5", "nombre 5", "nombre de 5" en el texto (sin tildes, en minúsculas).
function dato(t, nombres) {
  for (const n of nombres) { const m = t.match(new RegExp(`(?:^|[^a-z])${n}\\s*(?:=|:|de|mide|igual a|es)?\\s*${NUMRE}`)); if (m) return numDe(m[1]); }
  return null;
}
const unidadDe = t => (t.match(/\d\s*(mm|cm|dm|km|m)\b/) || [])[1] || '';
const Lu = (u, p = 1) => (u ? `\\,\\text{${u}}${p > 1 ? '^{' + p + '}' : ''}` : '');
const Lpi = q => `${q.eq(Q1) ? '' : L_frac(q)}\\pi\\approx ${L_x(q.num() * Math.PI)}`;   // q·π con su valor aproximado
const sen = '\\operatorname{sen}', tg = '\\operatorname{tg}', cotg = '\\operatorname{cotg}', cosec = '\\operatorname{cosec}';
// Ángulo en grados a partir de un texto: 35° 20' 15'', 45,5°, π/3 (radianes)
function leerGrados(s) {
  s = s.replace(/º/g, '°').replace(/[′’]/g, "'").replace(/[″”]|''/g, '"');
  const m = s.match(/(-?\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*')?\s*(?:(\d+(?:[.,]\d+)?)\s*")?/);
  if (m) { const g = numDe(m[1]), sg = g.signo < 0 ? QE(-1) : Q1; let q = g.abs(); if (m[2]) q = q.add(numDe(m[2]).div(QE(60))); if (m[3]) q = q.add(numDe(m[3]).div(QE(3600))); return q.mul(sg); }
  const p = s.match(/(-?\s*\d*(?:[.,]\d+)?\s*(?:π|pi)\s*(?:\/\s*\d+)?)/i);
  if (p) { const P_ = Pred(aPoly(exprAlg(p[1].replace(/π|pi/gi, 'p')))); if (P_.length === 1 && P_[0].v.p === 1) return P_[0].c.mul(QE(180)); }
  return null;
}
// Grados (racional) → 35° 20' 15''
function Lsex(q) {
  const neg = q.signo < 0; q = q.abs(); const g = q.n / q.d, r1 = q.sub(new Q(g)).mul(QE(60)), mi_ = r1.n / r1.d, s = r1.sub(new Q(mi_)).mul(QE(60));
  return (neg ? '-' : '') + `${L_ent(g)}^{\\circ}` + (mi_ || !s.cero ? `\\,${L_ent(mi_)}'` : '') + (!s.cero ? `\\,${s.entero ? L_ent(s.n) : L_x(s.num())}''` : '');
}
const Lg = q => (q.entero ? `${L_ent(q.n)}^{\\circ}` : Lsex(q));

/* Números con raíces cuadradas exactas (suma de términos c·√r): sirven para
 * operar con los valores exactos de los ángulos notables. */
class RN {
  constructor(m = new Map()) { this.m = m; }
  static q(q) { return new RN(q.cero ? new Map() : new Map([[1n, q]])); }
  static raiz(n, c = Q1) { const { k, m } = sqrtLibre(n); return new RN(new Map([[m, c.mul(new Q(k))]])); }
  add(o) { const r = new Map(this.m); for (const [k, v] of o.m) { const s = (r.get(k) || Q0).add(v); if (s.cero) r.delete(k); else r.set(k, s); } return new RN(r); }
  neg() { return new RN(new Map([...this.m].map(([k, v]) => [k, v.neg()]))); }
  sub(o) { return this.add(o.neg()); }
  mul(o) { let r = new RN(); for (const [a, x] of this.m) for (const [b, y] of o.m) { const { k, m } = sqrtLibre(a * b); r = r.add(new RN(new Map([[m, x.mul(y).mul(new Q(k))]]))); } return r; }
  div(o) {
    if (!o.m.size) throw new Error('Aparece una división por cero.');
    if (o.m.size === 1) { const [[r, c]] = [...o.m]; return this.mul(new RN(new Map([[r, Q1.div(c.mul(new Q(r)))]]))); }
    if (o.m.size === 2) { const [[p, a], [q, b]] = [...o.m], conj = new RN(new Map([[p, a], [q, b.neg()]])), den = o.mul(conj); if (den.m.size === 1 && den.m.has(1n)) return this.mul(conj).mul(RN.q(Q1.div(den.m.get(1n)))); }
    throw new Error('No puedo dividir por esa expresión con raíces.');
  }
  pow(n) { let r = RN.q(Q1); for (let i = 0; i < n; i++) r = r.mul(this); return r; }
  num() { let s = 0; for (const [k, v] of this.m) s += v.num() * Math.sqrt(Number(k)); return s; }
  esQ() { return !this.m.size || (this.m.size === 1 && this.m.has(1n)); }
  L() {
    if (!this.m.size) return '0';
    return [...this.m].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([r, c], i) => {
      const neg = c.n < 0n, a = c.abs(); let s;
      if (r === 1n) s = L_frac(a); else { const raiz = `\\sqrt{${L_ent(r)}}`; s = a.entero ? (a.eq(Q1) ? '' : L_ent(a.n)) + raiz : `\\frac{${a.n === 1n ? '' : L_ent(a.n)}${raiz}}{${L_ent(a.d)}}`; }
      return (i === 0 ? (neg ? '-' : '') : neg ? '-' : '+') + s;
    }).join('');
  }
}
// Valores exactos de seno y coseno en ángulos múltiplos de 30° o 45° (null si no es notable)
function senCosRN(deg) {
  const d = ((deg % 360) + 360) % 360; if (Math.abs(d - Math.round(d)) > 1e-9) return null;
  const D = Math.round(d); if (D % 30 && D % 45) return null;
  const ref = [D, 180 - D, D - 180, 360 - D].find(r => r >= 0 && r <= 90), h = new Q(1n, 2n);
  const T = { 0: [RN.q(Q0), RN.q(Q1)], 30: [RN.q(h), RN.raiz(3n, h)], 45: [RN.raiz(2n, h), RN.raiz(2n, h)], 60: [RN.raiz(3n, h), RN.q(h)], 90: [RN.q(Q1), RN.q(Q0)] }[ref];
  const sc = Math.cos(D * Math.PI / 180) < -1e-12, ss = Math.sin(D * Math.PI / 180) < -1e-12;
  return { s: ss ? T[0].neg() : T[0], c: sc ? T[1].neg() : T[1], ref };
}
const FUNCS = { sen: 'sen', sin: 'sen', cos: 'cos', tg: 'tg', tan: 'tg', cotg: 'cotg', cot: 'cotg', ctg: 'cotg', sec: 'sec', cosec: 'cosec', csc: 'cosec' };
const L_fn = f => ({ sen, cos: '\\cos', tg, cotg, sec: '\\sec', cosec })[f];
function trigRN(f, deg) {                         // valor exacto (RN), 'no' si no existe, null si no es notable
  const e = senCosRN(deg); if (!e) return null;
  const { s, c } = e, cero = x => !x.m.size;
  switch (f) { case 'sen': return s; case 'cos': return c; case 'tg': return cero(c) ? 'no' : s.div(c); case 'cotg': return cero(s) ? 'no' : c.div(s); case 'sec': return cero(c) ? 'no' : RN.q(Q1).div(c); case 'cosec': return cero(s) ? 'no' : RN.q(Q1).div(s); }
}
const trigNum = (f, deg) => { const r = deg * Math.PI / 180, s = Math.sin(r), c = Math.cos(r); return { sen: s, cos: c, tg: s / c, cotg: c / s, sec: 1 / c, cosec: 1 / s }[f]; };
// Triángulo dibujado a partir de sus tres lados (A en el origen, B sobre el eje x)
function svgTri(a, b, c, lab = {}) {
  const x = (b * b + c * c - a * a) / (2 * c), y = Math.sqrt(Math.max(0, b * b - x * x)), P = [[0, 0], [c, 0], [x, y]];
  const xs = P.map(p => p[0]), mnx = Math.min(...xs), mxx = Math.max(...xs), W = 300, H = 210, m = 34, sc = Math.min((W - 2 * m) / (mxx - mnx || 1), (H - 2 * m) / (y || 1));
  const X = v => m + (v - mnx) * sc, Y = v => H - m - v * sc, [A, B, C] = P.map(p => [X(p[0]), Y(p[1])]), mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const t = (p, s, dx = 0, dy = 0, cl = 'et pl') => `<text x="${p[0] + dx}" y="${p[1] + dy}" class="${cl}">${s}</text>`;
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Triángulo"><polygon points="${A} ${B} ${C}" class="poli"/>` +
    t(A, lab.A || 'A', -12, 14) + t(B, lab.B || 'B', 12, 14) + t(C, lab.C || 'C', 0, -8) + t(mid(B, C), lab.a || 'a', 12, 0, 'et') + t(mid(A, C), lab.b || 'b', -14, 0, 'et') + t(mid(A, B), lab.c || 'c', 0, 16, 'et') + '</svg>';
}
// Resuelve "expr1 = expr2" lineal en una letra (para problemas de ángulos con x)
function resolverLinealX(izq, der, x = 'x') {
  const D = Pred(Psub(aPoly(izq), aPoly(der))), p = partesLineales(D, x);
  if (!p || p.a.cero) throw new Error('No pude despejar la incógnita: revisá las expresiones.');
  return p.b.neg().div(p.a);
}
const expresionesConX = t => (t.match(/[-+]?\s*\(?\s*\d*(?:[.,]\d+)?\s*x(?:\s*[-+]\s*\d+(?:[.,]\d+)?)?\s*\)?|\b\d+(?:[.,]\d+)?\s*°?/g) || []).map(s => s.replace(/°/g, '').trim()).filter(Boolean);

/* -----------------------------------------------------------------------
 * T2. CONCEPTOS BÁSICOS (segmentos)
 * --------------------------------------------------------------------- */
function resolverConceptosG(texto) {
  const t = plano(texto), u = unidadDe(t), { pasos, P } = crearPasos();
  const ns = (t.replace(/[a-z]\s*=/g, ' ').match(/\d+(?:[.,]\d+)?(?:\/\d+)?/g) || []).map(numDe);
  if (/proporcional|razon|partes/.test(t)) {
    const [L, ...k] = ns; if (!L || k.length < 2) throw new Error('Escribilo así: “dividir un segmento de 15 cm en partes proporcionales a 2 y 3”.');
    const s = k.reduce((a, b) => a.add(b), Q0), u1 = L.div(s), partes = k.map(x => x.mul(u1));
    P('Planteamos', 'Repartimos la longitud del segmento en partes proporcionales: primero vemos cuánto vale una “parte”.', `${k.map(L_frac).join('+')}=${L_frac(s)}\\;\\text{partes}`);
    P('Calculamos cada parte', 'Dividimos la longitud total por la cantidad de partes y multiplicamos por cada número.', [`\\text{una parte}=\\frac{${L_frac(L)}}{${L_frac(s)}}=${L_frac(u1)}${Lu(u)}`, ...partes.map((p, i) => `${L_frac(k[i])}\\cdot ${L_frac(u1)}=${L_frac(p)}${Lu(u)}`)]);
    P('Verificamos', 'Las partes sumadas tienen que dar la longitud del segmento.', `${partes.map(L_frac).join('+')}=${L_frac(partes.reduce((a, b) => a.add(b), Q0))}${Lu(u)}\\;${partes.reduce((a, b) => a.add(b), Q0).eq(L) ? '\\checkmark' : ''}`);
    return { tema: 'basicosg', metodo: 'Segmentos proporcionales', pasos, resultado: partes.map(p => L_frac(p) + Lu(u)).join(',\\;') };
  }
  if (/medio/.test(t)) {
    const L = ns[0]; if (!L) throw new Error('Falta la longitud del segmento.');
    const m = L.div(QE(2));
    P('Usamos la definición de punto medio', 'El punto medio M divide al segmento en dos partes iguales.', `\\overline{AM}=\\overline{MB}=\\frac{${L_frac(L)}}{2}=${L_frac(m)}${Lu(u)}`);
    P('Verificamos', 'Las dos mitades juntas forman el segmento.', `${L_frac(m)}+${L_frac(m)}=${L_frac(L)}${Lu(u)}\\;\\checkmark`);
    return { tema: 'basicosg', metodo: 'Punto medio', pasos, resultado: `\\overline{AM}=${L_frac(m)}${Lu(u)}` };
  }
  if (ns.length >= 2) {
    const [a, b] = ns, resta = /resta|diferencia|falta|sobra|menos/.test(t), r = resta ? a.sub(b).abs() : a.add(b);
    P('Dibujamos la situación', resta ? 'Si un segmento está contenido en otro, lo que falta es la diferencia de longitudes.' : 'Si los puntos A, B y C están alineados y B queda entre A y C, los segmentos AB y BC son consecutivos: se suman.', resta ? `\\overline{AC}-\\overline{AB}=\\overline{BC}` : `\\overline{AC}=\\overline{AB}+\\overline{BC}`);
    P('Calculamos', '', `${L_frac(a)}${resta ? '-' : '+'}${L_frac(b)}=${L_frac(r)}${Lu(u)}`);
    P('Verificamos', resta ? 'Sumamos la diferencia al segmento menor: tiene que dar el mayor.' : 'Restamos uno de los segmentos al total: tiene que dar el otro.', resta ? `${L_frac(r)}+${L_frac(a.cmp(b) < 0 ? a : b)}=${L_frac(r.add(a.cmp(b) < 0 ? a : b))}\\;\\checkmark` : `${L_frac(r)}-${L_frac(a)}=${L_frac(b)}\\;\\checkmark`);
    return { tema: 'basicosg', metodo: resta ? 'Diferencia de segmentos' : 'Segmentos consecutivos', pasos, resultado: L_frac(r) + Lu(u) };
  }
  throw new Error('Escribilo así: “punto medio de un segmento de 15 cm”, “AB = 5 cm y BC = 7 cm consecutivos” o “dividir un segmento de 15 cm en partes proporcionales a 2 y 3”.');
}

/* -----------------------------------------------------------------------
 * T3. ÁNGULOS
 * --------------------------------------------------------------------- */
function clasificarAng(q) { const v = q.num(); return v === 0 ? 'nulo' : v < 90 ? 'agudo' : v === 90 ? 'recto' : v < 180 ? 'obtuso' : v === 180 ? 'llano' : v < 360 ? 'cóncavo' : 'de un giro o más'; }
function resolverAngulos(texto) {
  const t = plano(texto), { pasos, P } = crearPasos();
  const angs = [...texto.replace(/º/g, '°').matchAll(/-?\d+(?:[.,]\d+)?\s*°(?:\s*\d+(?:[.,]\d+)?\s*['′’])?(?:\s*\d+(?:[.,]\d+)?\s*(?:''|"|″|”))?/g)].map(m => leerGrados(m[0]));
  if (/radian|π|pi\b/.test(t) && !angs.length || /a radianes/.test(t)) {
    const g = angs[0] || leerGrados(texto); if (!g) throw new Error('Escribí el ángulo, por ejemplo: 135° a radianes, o 5π/6 a grados.');
    const k = g.div(QE(180)), aRad = angs.length > 0;
    P(aRad ? 'Pasamos a radianes' : 'Pasamos a grados', 'Como 180° equivalen a π radianes, para pasar de grados a radianes multiplicamos por π/180°; para volver, reemplazamos π por 180°.', aRad ? `${Lg(g)}\\cdot\\frac{\\pi}{180^{\\circ}}=${k.eq(Q1) ? '' : L_frac(k)}\\pi\\approx ${L_x(k.num() * Math.PI)}\\;\\text{rad}` : `${k.eq(Q1) ? '' : L_frac(k)}\\pi\\;\\text{rad}=${L_frac(k)}\\cdot 180^{\\circ}=${Lg(g)}`);
    P('Verificamos', 'Hacemos la conversión al revés.', `${L_frac(k)}\\pi\\cdot\\frac{180^{\\circ}}{\\pi}=${Lg(g)}\\;\\checkmark`);
    return { tema: 'angulos', metodo: 'Conversión grados y radianes', pasos, resultado: aRad ? `${Lg(g)}=${k.eq(Q1) ? '' : L_frac(k)}\\pi\\;\\text{rad}` : `${Lg(g)}` };
  }
  if (!angs.length) throw new Error('Escribí el ángulo con el símbolo de grados, por ejemplo: complemento de 35° 20\'.');
  const a = angs[0];
  if (/complement|suplement/.test(t)) {
    const comp = /complement/.test(t), tot = QE(comp ? 90 : 180), r = tot.sub(a);
    if (r.signo < 0) throw new Error(`Un ángulo mayor que ${comp ? 90 : 180}° no tiene ${comp ? 'complemento' : 'suplemento'}.`);
    P(comp ? 'Calculamos el complemento' : 'Calculamos el suplemento', comp ? 'Dos ángulos son complementarios si suman 90°: restamos a 90°.' : 'Dos ángulos son suplementarios si suman 180°: restamos a 180°.' + (a.entero ? '' : ' Para restar en el sistema sexagesimal, pedimos prestado: 1° = 60\' y 1\' = 60\'\'.'), `${tot.num()}^{\\circ}-${Lg(a)}=${Lg(r)}`);
    P('Verificamos', 'Sumamos los dos ángulos.', `${Lg(a)}+${Lg(r)}=${Lg(a.add(r))}\\;\\checkmark`);
    return { tema: 'angulos', metodo: comp ? 'Ángulos complementarios' : 'Ángulos suplementarios', pasos, resultado: Lg(r) };
  }
  if (angs.length >= 2 && /[+\-−]|suma|resta|diferencia/.test(texto)) {
    const resta = /-|−|resta|diferencia/.test(texto.replace(/^-/, '')), r = resta ? angs[0].sub(angs[1]) : angs[0].add(angs[1]);
    P(resta ? 'Restamos los ángulos' : 'Sumamos los ángulos', 'Operamos grados con grados, minutos con minutos y segundos con segundos. Cada 60\'\' forman 1\' y cada 60\' forman 1° (y al restar, se pide prestado al revés).', `${Lg(angs[0])}${resta ? '-' : '+'}${Lg(angs[1])}=${Lg(r)}`);
    P('Verificamos', 'Hacemos la cuenta en grados con decimales.', `${L_x(angs[0].num())}^{\\circ}${resta ? '-' : '+'}${L_x(angs[1].num())}^{\\circ}=${L_x(r.num())}^{\\circ}\\;\\checkmark`);
    return { tema: 'angulos', metodo: 'Operaciones en el sistema sexagesimal', pasos, resultado: Lg(r) };
  }
  P('Escribimos el ángulo', 'Un grado tiene 60 minutos y un minuto tiene 60 segundos.', `${Lg(a)}=${L_x(a.num())}^{\\circ}`);
  const r = a.mul(QE(1)).div(QE(180));
  P('Lo clasificamos', `Es un ángulo ${clasificarAng(a)} (agudo: menor que 90°; recto: 90°; obtuso: entre 90° y 180°; llano: 180°).`, `\\text{en radianes: }${L_frac(r)}\\pi\\approx ${L_x(r.num() * Math.PI)}`);
  P('Verificamos', 'Pasamos de decimal a sexagesimal: la parte decimal de los grados por 60 da los minutos, y así.', `${L_x(a.num())}^{\\circ}=${Lsex(a)}\\;\\checkmark`);
  return { tema: 'angulos', metodo: 'Sistema sexagesimal', pasos, resultado: `${Lsex(a)}=${L_x(a.num())}^{\\circ}` };
}

/* -----------------------------------------------------------------------
 * T4. RECTAS PARALELAS CORTADAS POR UNA TRANSVERSAL
 * --------------------------------------------------------------------- */
function svgParalelas(a) {
  const W = 300, H = 200, rad = a * Math.PI / 180, dx = 70 / Math.tan(rad || 1e-9), L = (x, y, s) => `<text x="${x}" y="${y}" class="et pl">${s}</text>`;
  const p1 = [150 - dx, 50], p2 = [150 + dx, 150];
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Paralelas y transversal"><line x1="10" y1="70" x2="290" y2="70" class="r1"/><line x1="10" y1="130" x2="290" y2="130" class="r1"/><line x1="${150 + 110 / Math.tan(rad || 1e-9)}" y1="-40" x2="${150 - 110 / Math.tan(rad || 1e-9)}" y2="240" class="r2"/>` +
    [[1, -16, -6], [2, 14, -6], [3, -16, 14], [4, 14, 14]].map(([n, ox, oy]) => L(150 + 30 / Math.tan(rad || 1e-9) + ox, 70 + oy, n)).join('') + [[5, -16, -6], [6, 14, -6], [7, -16, 14], [8, 14, 14]].map(([n, ox, oy]) => L(150 - 30 / Math.tan(rad || 1e-9) + ox, 130 + oy, n)).join('') + '</svg>';
}
function resolverParalelas(texto) {
  const t = plano(texto), { pasos, P } = crearPasos();
  const iguales = /altern|correspond|opuestos por el vertice/.test(t), suman = /conjugad|colateral|adyacent|suplement/.test(t);
  const conX = /\bx\b|\dx/.test(t);
  if (conX) {
    const ex = (cuerpoExpr(texto.replace(/^.*?(alternos|correspondientes|conjugados|colaterales|opuestos por el v[eé]rtice|adyacentes|suplementarios)\s*(internos|externos)?\s*/i, '')).split(/\s+y\s+|;|,\s*(?=[-\d(]*x)/).map(s => s.replace(/[°¿?]/g, '').trim()).filter(s => /\d|x/.test(s))).slice(0, 2);
    if (ex.length < 2) throw new Error('Escribí los dos ángulos, por ejemplo: alternos internos 3x + 10 y 5x − 30.');
    const A = exprAlg(ex[0]), B = exprAlg(ex[1]);
    if (!iguales && !suman) throw new Error('Decí qué relación tienen: alternos, correspondientes, opuestos por el vértice (son iguales) o conjugados/colaterales (suman 180°).');
    P('Planteamos la ecuación', iguales ? 'Entre paralelas cortadas por una transversal, los ángulos alternos (internos o externos), los correspondientes y los opuestos por el vértice son iguales.' : 'Los ángulos conjugados (colaterales) internos o externos, y los adyacentes, son suplementarios: suman 180°.', iguales ? `${LA(A)}=${LA(B)}` : `${LA(A)}+${LA(B)}=180`);
    const x = iguales ? resolverLinealX(A, B) : resolverLinealX({ t: 'add', items: [{ op: '+', e: A }, { op: '+', e: B }] }, { t: 'num', q: QE(180), raw: '180' });
    const va = Peval(aPoly(A), { x }), vb = Peval(aPoly(B), { x });
    P('Despejamos x', 'Pasamos los términos con x de un lado y los números del otro.', `x=${L_frac(x)}`);
    P('Calculamos los ángulos', 'Reemplazamos x en cada expresión.', [`${LA(A, { x })}=${Lg(va)}`, `${LA(B, { x })}=${Lg(vb)}`], svgParalelas(va.num() > 0 && va.num() < 180 ? va.num() : 60));
    P('Verificamos', iguales ? 'Los dos ángulos tienen que medir lo mismo.' : 'Los dos ángulos tienen que sumar 180°.', iguales ? `${Lg(va)}=${Lg(vb)}\\;${va.eq(vb) ? '\\checkmark' : ''}` : `${Lg(va)}+${Lg(vb)}=${Lg(va.add(vb))}\\;${va.add(vb).eq(QE(180)) ? '\\checkmark' : ''}`);
    return { tema: 'paralelas', metodo: iguales ? 'Ángulos iguales entre paralelas' : 'Ángulos suplementarios entre paralelas', pasos, resultado: `x=${L_frac(x)},\\;${Lg(va)}\\;\\text{y}\\;${Lg(vb)}` };
  }
  const a = leerGrados(texto); if (!a || a.signo <= 0 || a.num() >= 180) throw new Error('Escribí la medida de uno de los ángulos (entre 0° y 180°), por ejemplo: paralelas cortadas por una transversal, un ángulo mide 65°.');
  const b = QE(180).sub(a);
  P('Dibujamos las rectas', 'Dos rectas paralelas cortadas por una transversal forman 8 ángulos. Llamamos 1 al ángulo dato (arriba a la izquierda de la primera intersección).', `\\hat{1}=${Lg(a)}`, svgParalelas(a.num()));
  P('Usamos las relaciones entre ángulos', 'Los opuestos por el vértice, los correspondientes y los alternos son iguales; los adyacentes suman 180°. Así quedan solo dos medidas distintas.', [`\\hat{1}=\\hat{4}=\\hat{5}=\\hat{8}=${Lg(a)}`, `\\hat{2}=\\hat{3}=\\hat{6}=\\hat{7}=180^{\\circ}-${Lg(a)}=${Lg(b)}`]);
  P('Verificamos', 'Dos ángulos adyacentes (sobre la misma recta) tienen que sumar 180°, y los cuatro ángulos de cada intersección, 360°.', [`\\hat{1}+\\hat{2}=${Lg(a)}+${Lg(b)}=180^{\\circ}\\;\\checkmark`, `2\\cdot ${Lg(a)}+2\\cdot ${Lg(b)}=360^{\\circ}\\;\\checkmark`]);
  return { tema: 'paralelas', metodo: 'Ángulos entre paralelas', pasos, resultado: `${Lg(a)}\\;\\text{y}\\;${Lg(b)}` };
}

/* -----------------------------------------------------------------------
 * T5. TRIÁNGULOS, CUADRILÁTEROS Y POLÍGONOS (ángulos y propiedades)
 * --------------------------------------------------------------------- */
// Saca las palabras del principio: deja desde los dos puntos o desde la primera expresión con x o número.
function cuerpoExpr(texto) { const i = texto.indexOf(':'); if (i >= 0) return texto.slice(i + 1); const m = texto.search(/[-(]?\s*\d*\s*x\b|\d/i); return m >= 0 ? texto.slice(m) : texto; }
function sumaConX(texto, total, nombre) {           // ángulos expresados con x que suman "total"
  const { pasos, P } = crearPasos(), ex = cuerpoExpr(texto).split(/,|;|\s+y\s+/).map(s => s.replace(/[°¿?.]/g, '').trim()).filter(s => /\d|x/.test(s));
  const es = ex.map(exprAlg), suma = { t: 'add', items: es.map(e => ({ op: '+', e })) };
  P('Planteamos la ecuación', `La suma de los ángulos interiores de un ${nombre} es ${total}°.`, `${es.map(LA).join('+')}=${total}`);
  const x = resolverLinealX(suma, { t: 'num', q: QE(total), raw: String(total) }), vals = es.map(e => Peval(aPoly(e), { x }));
  P('Despejamos x', 'Juntamos los términos semejantes y despejamos.', `${L_P(Pred(aPoly(suma)))}=${total}\\;\\Rightarrow\\;x=${L_frac(x)}`);
  P('Calculamos cada ángulo', 'Reemplazamos x en cada expresión.', es.map((e, i) => `${LA(e, { x })}=${Lg(vals[i])}`));
  const s = vals.reduce((a, b) => a.add(b), Q0);
  P('Verificamos', `Los ángulos tienen que sumar ${total}°.`, `${vals.map(Lg).join('+')}=${Lg(s)}\\;${s.eq(QE(total)) ? '\\checkmark' : ''}`);
  return { pasos, x, vals };
}
function resolverTriangulos(texto) {
  const t = plano(texto), u = unidadDe(t);
  if (/\bx\b|\dx/.test(t)) { const r = sumaConX(texto, 180, 'triángulo'); return { tema: 'triangulos', metodo: 'Suma de ángulos interiores', pasos: r.pasos, resultado: `x=${L_frac(r.x)};\\;${r.vals.map(Lg).join(',\\;')}` }; }
  const { pasos, P } = crearPasos();
  const angs = [...texto.replace(/º/g, '°').matchAll(/\d+(?:[.,]\d+)?\s*°(?:\s*\d+(?:[.,]\d+)?\s*['′’])?/g)].map(m => leerGrados(m[0]));
  if (angs.length >= 2 && /exterior/.test(t)) {
    const e = angs[0].add(angs[1]);
    P('Usamos la propiedad del ángulo exterior', 'Un ángulo exterior de un triángulo es igual a la suma de los dos ángulos interiores no adyacentes a él.', `\\hat{e}=${Lg(angs[0])}+${Lg(angs[1])}=${Lg(e)}`);
    const int3 = QE(180).sub(e);
    P('Verificamos', 'El ángulo exterior y el interior adyacente forman un ángulo llano (180°), y los tres interiores suman 180°.', `${Lg(angs[0])}+${Lg(angs[1])}+${Lg(int3)}=180^{\\circ}\\;\\text{y}\\;${Lg(e)}+${Lg(int3)}=180^{\\circ}\\;\\checkmark`);
    return { tema: 'triangulos', metodo: 'Ángulo exterior', pasos, resultado: `\\hat{e}=${Lg(e)}` };
  }
  if (angs.length >= 2) {
    const c = QE(180).sub(angs[0]).sub(angs[1]); if (c.signo <= 0) throw new Error('Esos dos ángulos suman 180° o más: no forman un triángulo.');
    const all = [angs[0], angs[1], c], max = Math.max(...all.map(q => q.num()));
    P('Calculamos el tercer ángulo', 'Los tres ángulos interiores de cualquier triángulo suman 180°.', `\\hat{C}=180^{\\circ}-${Lg(angs[0])}-${Lg(angs[1])}=${Lg(c)}`);
    P('Clasificamos el triángulo', `Según sus ángulos es ${max === 90 ? 'rectángulo (tiene un ángulo recto)' : max > 90 ? 'obtusángulo (tiene un ángulo obtuso)' : 'acutángulo (los tres son agudos)'}${all[0].eq(all[1]) || all[1].eq(all[2]) || all[0].eq(all[2]) ? '; además, como tiene dos ángulos iguales, es isósceles' : ''}.`, all.map(Lg).join(',\\;'));
    P('Verificamos', 'Sumamos los tres ángulos.', `${all.map(Lg).join('+')}=180^{\\circ}\\;\\checkmark`);
    return { tema: 'triangulos', metodo: 'Suma de ángulos interiores', pasos, resultado: `\\hat{C}=${Lg(c)}` };
  }
  const ns = (t.match(/\d+(?:[.,]\d+)?(?:\/\d+)?/g) || []).map(numDe);
  if (ns.length >= 3) {
    const [a, b, c] = ns.slice(0, 3), ok = a.add(b).cmp(c) > 0 && a.add(c).cmp(b) > 0 && b.add(c).cmp(a) > 0;
    P('Revisamos si existe el triángulo', 'Desigualdad triangular: cada lado tiene que ser menor que la suma de los otros dos.', [`${L_frac(a)}+${L_frac(b)}=${L_frac(a.add(b))}\\;${a.add(b).cmp(c) > 0 ? '>' : '\\le '}\\;${L_frac(c)}`, `${L_frac(a)}+${L_frac(c)}=${L_frac(a.add(c))}\\;${a.add(c).cmp(b) > 0 ? '>' : '\\le '}\\;${L_frac(b)}`, `${L_frac(b)}+${L_frac(c)}=${L_frac(b.add(c))}\\;${b.add(c).cmp(a) > 0 ? '>' : '\\le '}\\;${L_frac(a)}`]);
    if (!ok) { const s3 = [a, b, c].sort((x, y) => x.cmp(y)); P('Verificamos', 'Comprobamos con los dos lados más chicos: si ni siquiera juntos alcanzan al lado mayor, no se pueden unir los extremos.', `${L_frac(s3[0])}+${L_frac(s3[1])}=${L_frac(s3[0].add(s3[1]))}\\le ${L_frac(s3[2])}\\;\\checkmark`); return { tema: 'triangulos', metodo: 'Desigualdad triangular', pasos, resultado: tx('No existe el triángulo') }; }
    const s2 = [a, b, c].map(x => x.pow(2)).sort((x, y) => x.cmp(y)), cmp = s2[2].cmp(s2[0].add(s2[1]));
    const tipoL = a.eq(b) && b.eq(c) ? 'equilátero' : a.eq(b) || b.eq(c) || a.eq(c) ? 'isósceles' : 'escaleno';
    P('Lo clasificamos', `Por sus lados es ${tipoL}. Por sus ángulos comparamos el cuadrado del lado mayor con la suma de los cuadrados de los otros: es ${cmp === 0 ? 'rectángulo' : cmp < 0 ? 'acutángulo' : 'obtusángulo'}.`, `${L_frac(s2[2])}\\;${cmp === 0 ? '=' : cmp < 0 ? '<' : '>'}\\;${L_frac(s2[0])}+${L_frac(s2[1])}`, svgTri(a.num(), b.num(), c.num()));
    const p = a.add(b).add(c), s = p.div(QE(2)), A2 = s.mul(s.sub(a)).mul(s.sub(b)).mul(s.sub(c));
    P('Perímetro y área', 'El perímetro es la suma de los lados. Para el área usamos la fórmula de Herón, con s = semiperímetro.', [`P=${L_frac(a)}+${L_frac(b)}+${L_frac(c)}=${L_frac(p)}${Lu(u)}`, `A=\\sqrt{s(s-a)(s-b)(s-c)}=\\sqrt{${L_frac(s)}\\cdot ${L_frac(s.sub(a))}\\cdot ${L_frac(s.sub(b))}\\cdot ${L_frac(s.sub(c))}}=${L_raiz(A2)}${Lu(u, 2)}`]);
    const ang = (x, y, z) => Math.acos((y.num() ** 2 + z.num() ** 2 - x.num() ** 2) / (2 * y.num() * z.num())) * 180 / Math.PI, A_ = ang(a, b, c), B_ = ang(b, a, c), C_ = 180 - A_ - B_;
    P('Verificamos', 'Calculamos los ángulos con el teorema del coseno: tienen que sumar 180°.', `${Lgr(A_)}+${Lgr(B_)}+${Lgr(C_)}=180^{\\circ}\\;\\checkmark`);
    return { tema: 'triangulos', metodo: 'Desigualdad triangular y fórmula de Herón', pasos, resultado: `${tx(tipoL + ', ' + (cmp === 0 ? 'rectángulo' : cmp < 0 ? 'acutángulo' : 'obtusángulo'))},\\;P=${L_frac(p)}${Lu(u)},\\;A=${L_raiz(A2)}${Lu(u, 2)}` };
  }
  throw new Error('Escribilo así: “triángulo con ángulos de 50° y 65°”, “ángulos de un triángulo: x, 2x y 3x” o “triángulo de lados 5, 6 y 7”.');
}
function resolverCuadrilateros(texto) {
  const t = plano(texto), u = unidadDe(t);
  if (/\bx\b|\dx/.test(t)) { const r = sumaConX(texto, 360, 'cuadrilátero'); return { tema: 'cuadrilateros', metodo: 'Suma de ángulos interiores (360°)', pasos: r.pasos, resultado: `x=${L_frac(r.x)};\\;${r.vals.map(Lg).join(',\\;')}` }; }
  const { pasos, P } = crearPasos();
  const angs = [...texto.replace(/º/g, '°').matchAll(/\d+(?:[.,]\d+)?\s*°(?:\s*\d+(?:[.,]\d+)?\s*['′’])?/g)].map(m => leerGrados(m[0]));
  if (/paralelogramo|romboide|rombo/.test(t) && angs.length === 1) {
    const a = angs[0], b = QE(180).sub(a);
    P('Usamos las propiedades del paralelogramo', 'En un paralelogramo los ángulos opuestos son iguales y los consecutivos son suplementarios (suman 180°).', [`\\hat{A}=\\hat{C}=${Lg(a)}`, `\\hat{B}=\\hat{D}=180^{\\circ}-${Lg(a)}=${Lg(b)}`]);
    P('Verificamos', 'Los cuatro ángulos tienen que sumar 360°.', `2\\cdot ${Lg(a)}+2\\cdot ${Lg(b)}=360^{\\circ}\\;\\checkmark`);
    return { tema: 'cuadrilateros', metodo: 'Propiedades del paralelogramo', pasos, resultado: `${Lg(a)},\\;${Lg(b)},\\;${Lg(a)},\\;${Lg(b)}` };
  }
  if (angs.length >= 3) {
    const d = QE(360).sub(angs[0]).sub(angs[1]).sub(angs[2]); if (d.signo <= 0) throw new Error('Esos ángulos suman 360° o más.');
    P('Calculamos el cuarto ángulo', 'Los ángulos interiores de cualquier cuadrilátero suman 360° (se puede partir en dos triángulos con una diagonal).', `\\hat{D}=360^{\\circ}-${angs.slice(0, 3).map(Lg).join('-')}=${Lg(d)}`);
    P('Verificamos', 'Sumamos los cuatro ángulos.', `${[...angs.slice(0, 3), d].map(Lg).join('+')}=360^{\\circ}\\;\\checkmark`);
    return { tema: 'cuadrilateros', metodo: 'Suma de ángulos interiores (360°)', pasos, resultado: `\\hat{D}=${Lg(d)}` };
  }
  if (/diagonal/.test(t)) {
    const l = dato(t, ['lado', 'l']), b = dato(t, ['base', 'b', 'largo']), h = dato(t, ['altura', 'h', 'ancho']);
    const [x, y] = l ? [l, l] : [b, h]; if (!x || !y) throw new Error('Escribí el lado del cuadrado o la base y la altura del rectángulo.');
    const d2 = x.pow(2).add(y.pow(2));
    P('Usamos el teorema de Pitágoras', `La diagonal divide al ${l ? 'cuadrado' : 'rectángulo'} en dos triángulos rectángulos: los lados son los catetos y la diagonal, la hipotenusa.`, `d=\\sqrt{${Lp(x)}^{2}+${Lp(y)}^{2}}=\\sqrt{${L_frac(d2)}}=${L_raiz(d2)}${Lu(u)}`);
    P('Verificamos', 'Elevamos la diagonal al cuadrado: tiene que dar la suma de los cuadrados de los lados.', `d^2=${L_frac(d2)}=${L_frac(x.pow(2))}+${L_frac(y.pow(2))}\\;\\checkmark`);
    return { tema: 'cuadrilateros', metodo: 'Teorema de Pitágoras', pasos, resultado: `d=${L_raiz(d2)}${Lu(u)}` };
  }
  throw new Error('Escribilo así: “cuadrilátero con ángulos de 80°, 95° y 110°”, “paralelogramo con un ángulo de 65°”, “ángulos de un cuadrilátero x, 2x, 3x y 4x” o “diagonal del rectángulo de base 8 y altura 6”.');
}
const NOMBRES_POL = { triangulo: 3, cuadrado: 4, cuadrilatero: 4, pentagono: 5, hexagono: 6, heptagono: 7, octogono: 8, octagono: 8, eneagono: 9, decagono: 10, endecagono: 11, dodecagono: 12 };
function resolverPoligonos(texto) {
  const t = plano(texto), { pasos, P } = crearPasos();
  let n = Object.entries(NOMBRES_POL).find(([k]) => t.includes(k))?.[1] || dato(t, ['n', 'lados', 'de']);
  if (n && !(n instanceof Q)) n = QE(n);
  const ai = /angulo interior.*?(\d+(?:[.,]\d+)?)|interior(?:es)? (?:de|mide|=)\s*(\d+(?:[.,]\d+)?)/.exec(t), sum = /suma.*?(\d+(?:[.,]\d+)?)/.exec(t), dg = /(\d+)\s*diagonales/.exec(t);
  if (!n && ai) { const a = numDe(ai[1] || ai[2]); const nn = QE(360).div(QE(180).sub(a)); if (!nn.entero) throw new Error('No existe un polígono regular con ese ángulo interior.'); P('Usamos el ángulo exterior', 'En un polígono regular, cada ángulo exterior mide 180° menos el interior, y los exteriores suman 360°.', [`\\text{exterior}=180^{\\circ}-${Lg(a)}=${Lg(QE(180).sub(a))}`, `n=\\frac{360^{\\circ}}{${Lg(QE(180).sub(a))}}=${L_frac(nn)}`]); n = nn; }
  else if (!n && sum && /suma/.test(t)) { const s = numDe(sum[1]), nn = s.div(QE(180)).add(QE(2)); if (!nn.entero) throw new Error('Ningún polígono tiene esa suma de ángulos interiores.'); P('Usamos la fórmula de la suma', 'La suma de los ángulos interiores es (n − 2)·180°: despejamos n.', `(n-2)\\cdot 180^{\\circ}=${Lg(s)}\\;\\Rightarrow\\;n=${L_frac(nn)}`); n = nn; }
  else if (!n && dg) { const D = BigInt(dg[1]), R = raicesCuadratica(Q1, QE(-3), new Q(-2n * D)); const nn = R.tipo === 'rac' ? R.r.find(r => r.signo > 0) : null; if (!nn || !nn.entero) throw new Error('Ningún polígono tiene esa cantidad de diagonales.'); P('Usamos la fórmula de las diagonales', 'Cantidad de diagonales: $\\frac{n(n-3)}{2}$. Planteamos la ecuación y resolvemos la cuadrática (n tiene que ser natural).', [`\\frac{n(n-3)}{2}=${dg[1]}\\;\\Rightarrow\\;n^2-3n-${2 * Number(D)}=0`, `n=${L_frac(nn)}`]); n = nn; }
  if (!n || !n.entero || n.n < 3n) throw new Error('Escribilo así: “hexágono regular”, “polígono de 9 lados”, “polígono regular de ángulo interior 140°” o “polígono con 20 diagonales”.');
  const N = Number(n.n), S = QE(180 * (N - 2)), ai_ = S.div(QE(N)), ae = QE(360).div(QE(N)), D = QE(N * (N - 3) / 2);
  P('Calculamos los elementos', `Un polígono de ${N} lados se puede partir en ${N - 2} triángulos desde un vértice, por eso sus ángulos interiores suman (n − 2)·180°. Si es regular, todos los ángulos son iguales.`, [`S_i=(${N}-2)\\cdot 180^{\\circ}=${Lg(S)}`, `\\text{ángulo interior}=\\frac{${Lg(S)}}{${N}}=${Lg(ai_)}`, `\\text{ángulo exterior}=\\text{ángulo central}=\\frac{360^{\\circ}}{${N}}=${Lg(ae)}`, `\\text{diagonales}=\\frac{${N}\\cdot(${N}-3)}{2}=${L_frac(D)}`]);
  P('Verificamos', 'En cada vértice, el ángulo interior y el exterior forman un ángulo llano.', `${Lg(ai_)}+${Lg(ae)}=${Lg(ai_.add(ae))}\\;${ai_.add(ae).eq(QE(180)) ? '\\checkmark' : ''}`);
  return { tema: 'poligonos', metodo: 'Fórmulas de los polígonos', pasos, resultado: `n=${N}:\\;S_i=${Lg(S)},\\;\\text{interior}=${Lg(ai_)},\\;\\text{diagonales}=${L_frac(D)}` };
}

/* -----------------------------------------------------------------------
 * T6. TRANSFORMACIONES DE FIGURAS (traslación, rotación, simetrías, homotecia)
 * --------------------------------------------------------------------- */
function resolverTransfG(texto) {
  const t = plano(texto), { pasos, P } = crearPasos();
  const crudos = leerPuntosG(texto).map((p, i) => ({ x: exactoG(p.x, 'Cada coordenada'), y: exactoG(p.y, 'Cada coordenada'), idx: p.idx }));
  const pos = w => { const i = t.search(w); return i < 0 ? Infinity : i; };
  const corte = Math.min(pos(/vector/), pos(/centro/), pos(/respecto/), pos(/razon/));
  const fig = crudos.filter(p => p.idx < corte).map((p, i) => ({ ...p, n: String.fromCharCode(65 + i) })), extra = crudos.filter(p => p.idx >= corte);
  if (!fig.length) throw new Error('Escribí primero los puntos de la figura, por ejemplo: trasladar (1, 2), (3, 2) y (2, 4) con el vector (4, -1).');
  let f, finv, regla, tipo, verif = 'aplicamos la transformación inversa y tenemos que volver a la figura original.';
  const Cn = extra[0] || { x: Q0, y: Q0 };
  if (/trasl/.test(t)) {
    const v = extra[0]; if (!v) throw new Error('Falta el vector de traslación: “con el vector (4, -1)”.');
    tipo = 'Traslación'; f = p => ({ x: p.x.add(v.x), y: p.y.add(v.y) }); finv = p => ({ x: p.x.sub(v.x), y: p.y.sub(v.y) });
    regla = `\\text{Sumamos el vector }\\vec{v}=${Lpt(v.x, v.y)}:\\;(x\\,;\\,y)\\to(x${v.x.signo < 0 ? '' : '+'}${L_frac(v.x)}\\,;\\,y${v.y.signo < 0 ? '' : '+'}${L_frac(v.y)})`;
  } else if (/homotec/.test(t)) {
    const k = dato(t, ['razon', 'k']); if (!k || k.cero) throw new Error('Falta la razón de la homotecia: “razón 2”.');
    tipo = 'Homotecia'; f = p => ({ x: Cn.x.add(k.mul(p.x.sub(Cn.x))), y: Cn.y.add(k.mul(p.y.sub(Cn.y))) }); finv = p => ({ x: Cn.x.add(p.x.sub(Cn.x).div(k)), y: Cn.y.add(p.y.sub(Cn.y).div(k)) });
    regla = `O=${Lpt(Cn.x, Cn.y)},\\;k=${L_frac(k)}:\\;P'=O+k\\,(P-O)`; verif = `las distancias al centro quedan multiplicadas por |k| = ${fmtX(k.abs().num())}, y aplicando razón 1/k volvemos a la figura original.`;
  } else if (/rot|gir/.test(t)) {
    const a = leerGrados(texto.replace(/\([^)]*\)/g, ' ')); if (a === null) throw new Error('Falta el ángulo de rotación: “90°”.');
    const te = trigExacta(a.num()); tipo = 'Rotación';
    if (te) { const rot = (p, sg) => { const dx = p.x.sub(Cn.x), dy = p.y.sub(Cn.y), s = sg > 0 ? te.s : te.s.neg(); const X = te.c.mulQ(dx).add(s.mulQ(dy).neg()).add(new R2(Cn.x)), Y = s.mulQ(dx).add(te.c.mulQ(dy)).add(new R2(Cn.y)); return { X, Y }; }; f = p => rot(p, 1); finv = p => p; }
    else { const r = a.num() * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); f = p => { const dx = p.x.num() - Cn.x.num(), dy = p.y.num() - Cn.y.num(); return { xn: Cn.x.num() + dx * c - dy * s, yn: Cn.y.num() + dx * s + dy * c }; }; }
    regla = `\\text{centro }${Lpt(Cn.x, Cn.y)},\\;\\theta=${Lg(a)}:\\;x'=h+(x-h)\\cos\\theta-(y-k)\\,${sen}\\,\\theta,\\;y'=k+(x-h)\\,${sen}\\,\\theta+(y-k)\\cos\\theta`;
    verif = 'una rotación conserva las distancias al centro: las comparamos antes y después.';
  } else if (/central|respecto (del|al) origen|respecto (del|al) punto/.test(t) && !/eje/.test(t)) {
    tipo = 'Simetría central'; f = p => ({ x: Cn.x.mul(QE(2)).sub(p.x), y: Cn.y.mul(QE(2)).sub(p.y) }); finv = f;
    regla = `\\text{centro }O=${Lpt(Cn.x, Cn.y)}:\\;P'=2O-P\\;\\text{(O es el punto medio entre P y P\')}`; verif = 'si aplicamos la misma simetría otra vez, volvemos a la figura original.';
  } else if (/simetr|reflej/.test(t)) {
    let r;
    if (/eje x|eje de las x|eje de abscisas/.test(t)) r = recta(Q0, Q1, Q0); else if (/eje y|eje de las y|eje de ordenadas/.test(t)) r = recta(Q1, Q0, Q0);
    else { const ecs = ecuacionesEnTexto(texto); if (!ecs.length) throw new Error('Decí respecto de qué eje o recta: eje x, eje y, y = x, x = 2…'); r = ecuacionXY(ecs[0]).r; }
    const nn = r.A.pow(2).add(r.B.pow(2)); tipo = 'Simetría axial';
    f = p => { const k = evalR(r, p.x, p.y).mul(QE(2)).div(nn); return { x: p.x.sub(r.A.mul(k)), y: p.y.sub(r.B.mul(k)) }; }; finv = f;
    regla = `\\text{eje: }${L_gen(r)}:\\;P'=P-\\frac{2(Ax+By+C)}{A^2+B^2}\\,(A\\,;\\,B)`; verif = 'si reflejamos otra vez respecto del mismo eje, volvemos a la figura original.';
  } else throw new Error('Decí qué transformación aplicar: trasladar, rotar, simetría (axial o central) u homotecia.');
  const imgs = fig.map(f), num = q => (q.num ? q.num() : q), xy = I_ => (I_.X ? [I_.X.num(), I_.Y.num()] : I_.xn !== undefined ? [I_.xn, I_.yn] : [I_.x.num(), I_.y.num()]);
  const LI = I_ => (I_.X ? `\\left(${I_.X.L()}\\,;\\,${I_.Y.L()}\\right)` : I_.xn !== undefined ? `(${L_x(I_.xn)}\\,;\\,${L_x(I_.yn)})` : Lpt(I_.x, I_.y));
  P(`Aplicamos la ${tipo.toLowerCase()}`, { 'Traslación': 'Cada punto se mueve con el mismo vector: sumamos sus componentes a las coordenadas.', 'Homotecia': 'Cada punto se aleja (o se acerca) del centro multiplicando su distancia por la razón k. Si k es negativa, además queda del otro lado del centro.', 'Rotación': 'Cada punto gira el mismo ángulo alrededor del centro (en sentido antihorario si el ángulo es positivo).', 'Simetría central': 'Cada punto se refleja a través del centro: el centro queda justo en el medio entre el punto y su imagen.', 'Simetría axial': 'Cada punto se refleja respecto del eje, como en un espejo: el eje es la mediatriz entre el punto y su imagen.' }[tipo], regla,
    tabla(['Punto', 'Imagen'], fig.map((p, i) => [k$(`${p.n}=${Lpt(p.x, p.y)}`), k$(`${p.n}'=${LI(imgs[i])}`)])));
  P('Lo vemos en el gráfico', 'La figura original está pintada; su imagen, con el borde rojo.', [], svgGeo({ polys: fig.length > 2 ? [fig.map(p => [p.x.num(), p.y.num()])] : [], segs: fig.length > 1 ? imgs.map((I_, i) => { const a = xy(I_), b = xy(imgs[(i + 1) % imgs.length]); return [a[0], a[1], b[0], b[1]]; }).slice(0, fig.length > 2 ? fig.length : 1) : [], pts: [...fig.map(p => [p.x.num(), p.y.num(), p.n]), ...imgs.map((I_, i) => [...xy(I_), fig[i].n + "'"]), ...(extra.length && tipo !== 'Traslación' ? [[Cn.x.num(), Cn.y.num(), 'O']] : [])] }));
  let ok, linea;
  if (tipo === 'Rotación') { const d0 = fig.map(p => (p.x.num() - Cn.x.num()) ** 2 + (p.y.num() - Cn.y.num()) ** 2), d1 = imgs.map(I_ => { const [a, b] = xy(I_); return (a - Cn.x.num()) ** 2 + (b - Cn.y.num()) ** 2; }); ok = d0.every((d, i) => aproxIgual(d, d1[i])); linea = fig.map((p, i) => `d(O,${p.n})^2=${L_x(d0[i])}=d(O,${p.n}')^2`).join(',\\;'); }
  else { const vuelta = imgs.map(finv); ok = vuelta.every((v, i) => v.x.eq(fig[i].x) && v.y.eq(fig[i].y)); linea = vuelta.map((v, i) => `${fig[i].n}'\\to ${Lpt(v.x, v.y)}`).join(',\\;'); }
  P('Verificamos', 'Para comprobar, ' + verif, `${linea}\\;${ok ? '\\checkmark' : ''}`);
  return { tema: 'transfg', metodo: tipo, pasos, resultado: imgs.map((I_, i) => `${fig[i].n}'=${LI(I_)}`).join(',\\;') };
}

/* -----------------------------------------------------------------------
 * T7. CIRCUNFERENCIA Y CÍRCULO
 * --------------------------------------------------------------------- */
function resolverCirculo(texto) {
  const t = plano(texto), u = unidadDe(t), { pasos, P } = crearPasos();
  const ang = leerGrados(texto);
  if (/inscript|central/.test(t) && ang) {
    const desdeCentral = /central\s*(de|mide|=)?\s*\d/.test(t);                 // ¿el dato es el ángulo central?
    const r = desdeCentral ? ang.div(QE(2)) : ang.mul(QE(2));
    P('Usamos la relación entre ángulo central e inscripto', 'Un ángulo inscripto en una circunferencia mide la mitad del ángulo central que abarca el mismo arco.', desdeCentral ? `\\text{inscripto}=\\frac{${Lg(ang)}}{2}=${Lg(r)}` : `\\text{central}=2\\cdot ${Lg(ang)}=${Lg(r)}`);
    P('Verificamos', 'El central tiene que ser el doble del inscripto.', desdeCentral ? `2\\cdot ${Lg(r)}=${Lg(ang)}\\;\\checkmark` : `\\frac{${Lg(r)}}{2}=${Lg(ang)}\\;\\checkmark`);
    return { tema: 'circulo', metodo: 'Ángulo inscripto y central', pasos, resultado: desdeCentral ? `\\text{inscripto}=${Lg(r)}` : `\\text{central}=${Lg(r)}` };
  }
  if (/corona/.test(t)) {
    const ns = (t.replace(/\([^)]*\)/g, ' ').match(/\d+(?:[.,]\d+)?(?:\/\d+)?/g) || []).map(numDe).sort((a, b) => b.cmp(a)); if (ns.length < 2) throw new Error('Escribí los dos radios: “corona circular de radios 5 y 3”.');
    const [R, r] = ns, k = R.pow(2).sub(r.pow(2));
    P('Calculamos el área de la corona', 'La corona circular es lo que queda entre dos circunferencias concéntricas: el área del círculo grande menos la del chico.', [`A=\\pi R^2-\\pi r^2=\\pi\\,(R^2-r^2)`, `A=\\pi\\,(${Lp(R)}^{2}-${Lp(r)}^{2})=${Lpi(k)}${Lu(u, 2)}`]);
    P('Verificamos', 'Calculamos cada círculo por separado y restamos.', `${Lpi(R.pow(2))}-${Lpi(r.pow(2))}\\;\\checkmark`);
    return { tema: 'circulo', metodo: 'Área de la corona circular', pasos, resultado: `A=${Lpi(k)}${Lu(u, 2)}` };
  }
  let r = dato(t, ['radio', 'r']); const d = dato(t, ['diametro', 'd']); if (!r && d) r = d.div(QE(2));
  if (!r) throw new Error('Escribí el radio o el diámetro, por ejemplo: círculo de radio 5 cm, o sector circular de radio 6 y 60°.');
  if (d) P('Calculamos el radio', 'El radio es la mitad del diámetro.', `r=\\frac{${L_frac(d)}}{2}=${L_frac(r)}${Lu(u)}`);
  if (/sector|arco/.test(t) && ang) {
    const fr = ang.div(QE(360)), arco = QE(2).mul(r).mul(fr), area = r.pow(2).mul(fr);
    P('Calculamos la longitud del arco', 'El arco es una parte de la circunferencia, proporcional a su ángulo central: $\\ell = 2\\pi r\\cdot\\frac{\\alpha}{360^{\\circ}}$.', `\\ell=2\\pi\\cdot ${L_frac(r)}\\cdot\\frac{${Lg(ang)}}{360^{\\circ}}=${Lpi(arco)}${Lu(u)}`);
    P('Calculamos el área del sector', 'El sector es la parte del círculo limitada por dos radios: $A = \\pi r^2\\cdot\\frac{\\alpha}{360^{\\circ}}$.', `A=\\pi\\cdot ${Lp(r)}^{2}\\cdot\\frac{${Lg(ang)}}{360^{\\circ}}=${Lpi(area)}${Lu(u, 2)}`);
    P('Verificamos', 'También se cumple que el área del sector es la mitad del arco por el radio.', `\\frac{\\ell\\cdot r}{2}=\\frac{${L_frac(arco)}\\pi\\cdot ${L_frac(r)}}{2}=${L_frac(arco.mul(r).div(QE(2)))}\\pi\\;${arco.mul(r).div(QE(2)).eq(area) ? '\\checkmark' : ''}`);
    return { tema: 'circulo', metodo: 'Arco y sector circular', pasos, resultado: `\\ell=${Lpi(arco)}${Lu(u)},\\quad A=${Lpi(area)}${Lu(u, 2)}` };
  }
  const L = QE(2).mul(r), A = r.pow(2);
  P('Calculamos la longitud de la circunferencia', 'La longitud (el “perímetro” del círculo) es $L = 2\\pi r$, porque π es la cantidad de veces que el diámetro entra en la circunferencia.', `L=2\\pi\\cdot ${L_frac(r)}=${Lpi(L)}${Lu(u)}`, svgGeo({ circs: [{ h: 0, k: 0, r: r.num() }], segs: [[0, 0, r.num(), 0]], pts: [[0, 0, 'O']] }));
  P('Calculamos el área del círculo', 'El área del círculo es $A = \\pi r^2$.', `A=\\pi\\cdot ${Lp(r)}^{2}=${Lpi(A)}${Lu(u, 2)}`);
  P('Verificamos', 'El área también es la mitad de la longitud por el radio (como un triángulo de base L y altura r).', `\\frac{L\\cdot r}{2}=\\frac{${L_frac(L)}\\pi\\cdot ${L_frac(r)}}{2}=${L_frac(L.mul(r).div(QE(2)))}\\pi\\;\\checkmark`);
  return { tema: 'circulo', metodo: 'Longitud y área', pasos, resultado: `L=${Lpi(L)}${Lu(u)},\\quad A=${Lpi(A)}${Lu(u, 2)}` };
}

/* -----------------------------------------------------------------------
 * T8. PERÍMETROS Y SUPERFICIES DE FIGURAS PLANAS
 * Cada valor es { L: LaTeX, x: número } para mezclar exactos, π y raíces.
 * --------------------------------------------------------------------- */
const mq = q => ({ L: L_frac(q), x: q.num(), q });
const mr = q => { const r = raizQ(q); return { L: r.exacta ? L_frac(r.q) : r.L + `\\approx ${L_x(r.x)}`, x: r.x, q: r.exacta ? r.q : null }; };
const mx = x => ({ L: L_x(x), x });
const mL = m => m.L.replace(/\\approx.*$/, '');
function apotemaRegular(n, l) {                    // apotema de un polígono regular (exacta para 3, 4 y 6 lados)
  if (n === 4) return mq(l.div(QE(2)));
  if (n === 6) { const r = RN.raiz(3n, l.div(QE(2))); return { L: r.L() + `\\approx ${L_x(r.num())}`, x: r.num() }; }
  if (n === 3) { const r = RN.raiz(3n, l.div(QE(6))); return { L: r.L() + `\\approx ${L_x(r.num())}`, x: r.num() }; }
  return mx(l.num() / (2 * Math.tan(Math.PI / n)));
}
function resolverPerimetros(texto) {
  const t = plano(texto), u = unidadDe(t), { pasos, P } = crearPasos();
  if (/circulo|circunferencia/.test(t)) return { ...resolverCirculo(texto), tema: 'perimetros' };
  const g = n => dato(t, n), l = g(['lado', 'l']), b = g(['base', 'b']), h = g(['altura', 'h']), ap = g(['apotema', 'ap']);
  const Bm = g(['base mayor', 'b mayor']), bm = g(['base menor', 'b menor']);
  let Dm = g(['diagonal mayor', 'd mayor']), dm = g(['diagonal menor', 'd menor']);
  const dg = t.match(/diagonales\s*(?:de|=|miden)?\s*(\d+(?:[.,]\d+)?)\s*(?:y|,)\s*(\d+(?:[.,]\d+)?)/); if (dg) { Dm = numDe(dg[1]); dm = numDe(dg[2]); }
  const lados = (t.match(/lados?\s*(?:de|=|miden)?\s*((?:\d+(?:[.,]\d+)?\s*(?:,|y)\s*)+\d+(?:[.,]\d+)?)/) || [])[1];
  const nPol = Object.entries(NOMBRES_POL).find(([k]) => t.includes(k) && k !== 'triangulo' && k !== 'cuadrado' && k !== 'cuadrilatero')?.[1] || (/poligono/.test(t) ? Number(dato(t, ['de', 'n'])?.n) : null);
  let fig, Pm, Am, ver;
  if (/cuadrado/.test(t)) { if (!l) throw new Error('Falta el lado del cuadrado.'); fig = 'Cuadrado'; Pm = mq(l.mul(QE(4))); Am = mq(l.pow(2));
    P('Calculamos el perímetro', 'El cuadrado tiene 4 lados iguales.', `P=4\\cdot ${L_frac(l)}=${Pm.L}${Lu(u)}`); P('Calculamos la superficie', 'El área del cuadrado es lado por lado.', `A=${Lp(l)}^{2}=${Am.L}${Lu(u, 2)}`); ver = `\\frac{d^2}{2}=\\frac{${L_frac(l.pow(2).mul(QE(2)))}}{2}=${L_frac(l.pow(2))}\\;\\checkmark`; P('Verificamos', 'El área del cuadrado también es la mitad del cuadrado de su diagonal (d² = 2l²).', ver); }
  else if (/rectangulo/.test(t)) { if (!b || !h) throw new Error('Faltan la base y la altura del rectángulo.'); fig = 'Rectángulo'; Pm = mq(b.add(h).mul(QE(2))); Am = mq(b.mul(h));
    P('Calculamos el perímetro', 'Sumamos los cuatro lados: dos bases y dos alturas.', `P=2\\cdot ${L_frac(b)}+2\\cdot ${L_frac(h)}=${Pm.L}${Lu(u)}`); P('Calculamos la superficie', 'El área del rectángulo es base por altura.', `A=${L_frac(b)}\\cdot ${L_frac(h)}=${Am.L}${Lu(u, 2)}`); P('Verificamos', 'Una diagonal parte al rectángulo en dos triángulos iguales de área b·h/2.', `2\\cdot\\frac{${L_frac(b)}\\cdot ${L_frac(h)}}{2}=${L_frac(b.mul(h))}\\;\\checkmark`); }
  else if (/rombo/.test(t) && !/romboide/.test(t)) { if (!Dm || !dm) throw new Error('Faltan las diagonales del rombo.'); fig = 'Rombo'; const l2 = Dm.div(QE(2)).pow(2).add(dm.div(QE(2)).pow(2)), lr = mr(l2); Am = mq(Dm.mul(dm).div(QE(2))); Pm = lr.q ? mq(lr.q.mul(QE(4))) : mx(4 * lr.x);
    P('Calculamos el lado', 'Las diagonales del rombo son perpendiculares y se cortan en su punto medio: forman 4 triángulos rectángulos de catetos D/2 y d/2.', `l=\\sqrt{${par('\\frac{' + L_frac(Dm) + '}{2}')}^{2}+${par('\\frac{' + L_frac(dm) + '}{2}')}^{2}}=${lr.L}${Lu(u)}`);
    P('Calculamos el perímetro', 'El rombo tiene 4 lados iguales.', `P=4\\cdot ${mL(lr)}=${Pm.L}${Lu(u)}`); P('Calculamos la superficie', 'El área del rombo es diagonal mayor por diagonal menor, dividido 2.', `A=\\frac{${L_frac(Dm)}\\cdot ${L_frac(dm)}}{2}=${Am.L}${Lu(u, 2)}`);
    P('Verificamos', 'Sumamos las áreas de los 4 triángulos rectángulos que forman las diagonales.', `4\\cdot\\frac{${L_frac(Dm.div(QE(2)))}\\cdot ${L_frac(dm.div(QE(2)))}}{2}=${L_frac(Dm.mul(dm).div(QE(2)))}\\;\\checkmark`); }
  else if (/trapecio/.test(t)) { if (!Bm || !bm || !h) throw new Error('Faltan la base mayor, la base menor y la altura del trapecio.'); fig = 'Trapecio'; Am = mq(Bm.add(bm).mul(h).div(QE(2)));
    P('Calculamos la superficie', 'El área del trapecio es la semisuma de las bases por la altura.', `A=\\frac{(${L_frac(Bm)}+${L_frac(bm)})\\cdot ${L_frac(h)}}{2}=${Am.L}${Lu(u, 2)}`);
    const ls = lados ? lados.split(/,|y/).map(s => numDe(s.trim())) : null;
    if (ls && ls.length >= 2) { Pm = mq(Bm.add(bm).add(ls[0]).add(ls[1])); P('Calculamos el perímetro', 'Sumamos las dos bases y los dos lados no paralelos.', `P=${[Bm, bm, ls[0], ls[1]].map(L_frac).join('+')}=${Pm.L}${Lu(u)}`); }
    else if (/isosceles/.test(t)) { const c2 = Bm.sub(bm).div(QE(2)).pow(2).add(h.pow(2)), c = mr(c2); Pm = c.q ? mq(Bm.add(bm).add(c.q.mul(QE(2)))) : mx(Bm.num() + bm.num() + 2 * c.x); P('Calculamos los lados iguales y el perímetro', 'En el trapecio isósceles, cada lado no paralelo es la hipotenusa de un triángulo de catetos h y (B − b)/2.', [`c=\\sqrt{${par('\\frac{' + L_frac(Bm) + '-' + L_frac(bm) + '}{2}')}^{2}+${Lp(h)}^{2}}=${c.L}`, `P=${L_frac(Bm)}+${L_frac(bm)}+2\\cdot ${mL(c)}=${Pm.L}${Lu(u)}`]); }
    P('Verificamos', 'Una diagonal parte al trapecio en dos triángulos de altura h: uno con base B y otro con base b.', `\\frac{${L_frac(Bm)}\\cdot ${L_frac(h)}}{2}+\\frac{${L_frac(bm)}\\cdot ${L_frac(h)}}{2}=${L_frac(Bm.mul(h).div(QE(2)).add(bm.mul(h).div(QE(2))))}\\;\\checkmark`); }
  else if (/paralelogramo|romboide/.test(t)) { if (!b || !h) throw new Error('Faltan la base y la altura.'); fig = 'Paralelogramo'; Am = mq(b.mul(h));
    P('Calculamos la superficie', 'El área del paralelogramo es base por altura (la altura es perpendicular a la base, no el lado inclinado).', `A=${L_frac(b)}\\cdot ${L_frac(h)}=${Am.L}${Lu(u, 2)}`); if (l) { Pm = mq(b.add(l).mul(QE(2))); P('Calculamos el perímetro', 'Tiene dos pares de lados iguales.', `P=2\\cdot(${L_frac(b)}+${L_frac(l)})=${Pm.L}${Lu(u)}`); }
    P('Verificamos', 'Si cortamos un triángulo de un costado y lo pasamos al otro, queda un rectángulo de la misma base y altura.', `A_{\\text{rectángulo}}=${L_frac(b)}\\cdot ${L_frac(h)}=${L_frac(b.mul(h))}\\;\\checkmark`); }
  else if (/triangulo/.test(t)) { if (!b || !h) return resolverTriangulos(texto); fig = 'Triángulo'; Am = mq(b.mul(h).div(QE(2)));
    P('Calculamos la superficie', 'El área del triángulo es base por altura dividido 2: es la mitad de un paralelogramo.', `A=\\frac{${L_frac(b)}\\cdot ${L_frac(h)}}{2}=${Am.L}${Lu(u, 2)}`); P('Verificamos', 'Dos triángulos iguales forman un paralelogramo de la misma base y altura.', `2\\cdot ${L_frac(b.mul(h).div(QE(2)))}=${L_frac(b)}\\cdot ${L_frac(h)}\\;\\checkmark`); }
  else if (nPol) { if (!l) throw new Error('Falta el lado del polígono regular.'); fig = `Polígono regular de ${nPol} lados`; const a = ap ? mq(ap) : apotemaRegular(nPol, l); Pm = mq(l.mul(QE(nPol)));
    if (!ap) P('Calculamos la apotema', 'La apotema va del centro al punto medio de un lado: $ap = \\frac{l}{2\\,\\operatorname{tg}(180^{\\circ}/n)}$.', `ap=\\frac{${L_frac(l)}}{2\\,${tg}\\,${Lgr(180 / nPol)}}=${a.L}${Lu(u)}`);
    P('Calculamos el perímetro', 'Tiene n lados iguales.', `P=${nPol}\\cdot ${L_frac(l)}=${Pm.L}${Lu(u)}`); Am = mx(Pm.x * a.x / 2); if (a.q) Am = mq(Pm.q.mul(a.q).div(QE(2)));
    P('Calculamos la superficie', 'El área de un polígono regular es perímetro por apotema dividido 2.', `A=\\frac{${Pm.L}\\cdot ${mL(a)}}{2}=${Am.L}${Lu(u, 2)}`);
    P('Verificamos', `El polígono se divide en ${nPol} triángulos iguales de base l y altura ap.`, `${nPol}\\cdot\\frac{${L_frac(l)}\\cdot ${L_x(a.x)}}{2}\\approx ${L_x(nPol * l.num() * a.x / 2)}\\;\\checkmark`); }
  else throw new Error('Decí la figura y sus medidas: “área del rectángulo de base 8 y altura 3”, “rombo de diagonales 8 y 6”, “trapecio de base mayor 10, base menor 6 y altura 4”, “hexágono regular de lado 4”.');
  return { tema: 'perimetros', metodo: `Fórmulas del ${fig.toLowerCase()}`, pasos, resultado: [Pm ? `P=${Pm.L}${Lu(u)}` : '', `A=${Am.L}${Lu(u, 2)}`].filter(Boolean).join(',\\quad ') };
}

/* -----------------------------------------------------------------------
 * T9. CUERPOS GEOMÉTRICOS, ÁREAS Y VOLÚMENES
 * --------------------------------------------------------------------- */
const BASES = { triangular: 3, cuadrangular: 4, rectangular: 4, pentagonal: 5, hexagonal: 6, heptagonal: 7, octogonal: 8, octagonal: 8, decagonal: 10 };
const POLIEDROS = { tetraedro: [4, 4, 6, 'triángulos'], cubo: [6, 8, 12, 'cuadrados'], hexaedro: [6, 8, 12, 'cuadrados'], octaedro: [8, 6, 12, 'triángulos'], dodecaedro: [12, 20, 30, 'pentágonos'], icosaedro: [20, 12, 30, 'triángulos'] };
function resolverCuerpos(texto) {
  const t = plano(texto), { pasos, P } = crearPasos();
  const pol = Object.keys(POLIEDROS).find(k => t.includes(k)), nb = Object.entries(BASES).find(([k]) => t.includes(k))?.[1] || Number(dato(t, ['de'])?.n) || null;
  let C_, V_, A_, nombre;
  if (/cilindro|cono|esfera/.test(t) && !pol) {
    const k = ['cilindro', 'cono', 'esfera'].find(x => t.includes(x));
    P('Identificamos el cuerpo', 'Es un cuerpo redondo: tiene superficies curvas, así que no es un poliedro (no tiene caras planas ni aristas rectas en todas partes).', tx({ cilindro: 'Cilindro: 2 bases circulares y una superficie lateral curva.', cono: 'Cono: 1 base circular, una superficie lateral curva y un vértice.', esfera: 'Esfera: una sola superficie curva; todos sus puntos están a la misma distancia del centro.' }[k]));
    P('Verificamos', 'La fórmula de Euler (C + V − A = 2) vale solo para poliedros; los cuerpos redondos no la cumplen en ese sentido.', tx('Cuerpo redondo') + '\\;\\checkmark');
    return { tema: 'cuerpos', metodo: 'Clasificación de cuerpos', pasos, resultado: tx(k.charAt(0).toUpperCase() + k.slice(1) + ': cuerpo redondo') };
  }
  if (pol) { [C_, V_, A_] = POLIEDROS[pol]; nombre = pol; P('Identificamos el poliedro', `Es un poliedro regular: todas sus caras son ${POLIEDROS[pol][3]} iguales y en cada vértice concurre la misma cantidad de caras. Hay solo cinco poliedros regulares.`, `\\text{${pol}: }${C_}\\;\\text{caras},\\;${V_}\\;\\text{vértices},\\;${A_}\\;\\text{aristas}`); }
  else if (/prisma/.test(t) && nb) { C_ = nb + 2; V_ = 2 * nb; A_ = 3 * nb; nombre = `prisma de base de ${nb} lados`; P('Contamos los elementos del prisma', `Un prisma tiene 2 bases iguales (de ${nb} lados) y una cara lateral por cada lado de la base.`, [`\\text{caras}=${nb}+2=${C_}`, `\\text{vértices}=2\\cdot ${nb}=${V_}`, `\\text{aristas}=3\\cdot ${nb}=${A_}`]); }
  else if (/piramide/.test(t) && nb) { C_ = nb + 1; V_ = nb + 1; A_ = 2 * nb; nombre = `pirámide de base de ${nb} lados`; P('Contamos los elementos de la pirámide', `Una pirámide tiene 1 base (de ${nb} lados), una cara triangular por cada lado de la base y un vértice arriba (la cúspide).`, [`\\text{caras}=${nb}+1=${C_}`, `\\text{vértices}=${nb}+1=${V_}`, `\\text{aristas}=2\\cdot ${nb}=${A_}`]); }
  else throw new Error('Escribilo así: “prisma pentagonal”, “pirámide hexagonal”, “octaedro” o “cilindro”. Para áreas y volúmenes, agregá las medidas.');
  P('Verificamos con la fórmula de Euler', 'En todo poliedro convexo se cumple: caras + vértices − aristas = 2.', `${C_}+${V_}-${A_}=${C_ + V_ - A_}\\;${C_ + V_ - A_ === 2 ? '\\checkmark' : ''}`);
  return { tema: 'cuerpos', metodo: 'Elementos de los poliedros', pasos, resultado: `C=${C_},\\;V=${V_},\\;A=${A_}` };
}
// Medidas de un cuerpo: devuelve las áreas y el volumen con sus pasos (P), según lo pedido.
function medirCuerpo(texto, P, que) {
  const t = plano(texto), u = unidadDe(t), g = n => dato(t, n);
  const r0 = g(['radio', 'r']), d0 = g(['diametro']), r = r0 || (d0 && d0.div(QE(2))), h = g(['altura', 'h']), a = g(['arista', 'lado', 'l', 'a']);
  const out = {}; const piq = q => ({ L: Lpi(q), x: q.num() * Math.PI, pi: q });
  const area = que !== 'vol', vol = que !== 'area';
  if (/esfera/.test(t)) { if (!r) throw new Error('Falta el radio de la esfera.'); out.nombre = 'esfera';
    if (area) { out.A = piq(r.pow(2).mul(QE(4))); P('Calculamos el área de la esfera', 'La superficie de la esfera es 4 veces el área de un círculo máximo: $A = 4\\pi r^2$.', `A=4\\pi\\cdot ${Lp(r)}^{2}=${out.A.L}${Lu(u, 2)}`); out.verA = [`4\\cdot\\left(\\pi\\cdot ${Lp(r)}^{2}\\right)=${L_frac(r.pow(2).mul(QE(4)))}\\pi\\;\\checkmark`, 'Comprobamos que es 4 veces el círculo máximo.']; }
    if (vol) { out.V = piq(r.pow(3).mul(new Q(4n, 3n))); P('Calculamos el volumen de la esfera', '$V = \\frac{4}{3}\\pi r^3$.', `V=\\frac{4}{3}\\pi\\cdot ${Lp(r)}^{3}=${out.V.L}${Lu(u, 3)}`); out.verV = [`\\frac{2}{3}\\cdot\\left(\\pi\\cdot ${Lp(r)}^{2}\\cdot ${L_frac(r.mul(QE(2)))}\\right)=${L_frac(r.pow(3).mul(new Q(4n, 3n)))}\\pi\\;\\checkmark`, 'Arquímedes: la esfera ocupa 2/3 del cilindro que la contiene (radio r y altura 2r).']; } }
  else if (/cilindro/.test(t)) { if (!r || !h) throw new Error('Faltan el radio y la altura del cilindro.'); out.nombre = 'cilindro';
    const AB = r.pow(2), AL = r.mul(h).mul(QE(2)), AT = AL.add(AB.mul(QE(2)));
    if (area) { P('Calculamos las áreas', 'Desenrollada, la superficie lateral es un rectángulo de base 2πr (la longitud de la circunferencia) y altura h. Las bases son dos círculos.', [`A_B=\\pi r^2=${Lpi(AB)}`, `A_L=2\\pi r h=2\\pi\\cdot ${L_frac(r)}\\cdot ${L_frac(h)}=${Lpi(AL)}`, `A_T=A_L+2A_B=${Lpi(AT)}${Lu(u, 2)}`]); out.A = piq(AT); out.verA = [`2\\pi r\\,(r+h)=2\\pi\\cdot ${L_frac(r)}\\cdot(${L_frac(r)}+${L_frac(h)})=${L_frac(AT)}\\pi\\;\\checkmark`, 'Calculamos el área total con la fórmula “sacando factor común” 2πr.']; }
    if (vol) { out.V = piq(AB.mul(h)); P('Calculamos el volumen', 'El volumen de un cilindro es el área de la base por la altura.', `V=\\pi r^2 h=\\pi\\cdot ${Lp(r)}^{2}\\cdot ${L_frac(h)}=${out.V.L}${Lu(u, 3)}`); out.verV = [`3\\cdot V_{\\text{cono}}=3\\cdot\\frac{${L_frac(AB.mul(h))}\\pi}{3}=${L_frac(AB.mul(h))}\\pi\\;\\checkmark`, 'Un cilindro equivale a tres conos de la misma base y altura.']; } }
  else if (/cono/.test(t)) { const g0 = g(['generatriz', 'g']); if (!r || (!h && !g0)) throw new Error('Faltan el radio y la altura (o la generatriz) del cono.'); out.nombre = 'cono';
    let hh = h, gg; if (!hh) { const h2 = g0.pow(2).sub(r.pow(2)); const hr = mr(h2); P('Calculamos la altura', 'La altura, el radio y la generatriz forman un triángulo rectángulo.', `h=\\sqrt{${Lp(g0)}^{2}-${Lp(r)}^{2}}=${hr.L}`); hh = hr.q; if (!hh && vol) out.hx = hr.x; gg = mq(g0); } else { gg = mr(h.pow(2).add(r.pow(2))); P('Calculamos la generatriz', 'La generatriz g va del vértice al borde de la base: es la hipotenusa del triángulo de catetos h y r.', `g=\\sqrt{${Lp(h)}^{2}+${Lp(r)}^{2}}=${gg.L}`); }
    if (area) { const AB = r.pow(2), alx = Math.PI * r.num() * gg.x; const AL = gg.q ? piq(r.mul(gg.q)) : mx(alx), AT = gg.q ? piq(AB.add(r.mul(gg.q))) : mx(alx + Math.PI * AB.num());
      P('Calculamos las áreas', 'La superficie lateral del cono es $A_L = \\pi r g$; la base es un círculo.', [`A_B=\\pi r^2=${Lpi(AB)}`, `A_L=\\pi\\cdot ${L_frac(r)}\\cdot ${mL(gg)}=${AL.L}`, `A_T=A_L+A_B=${AT.L}${Lu(u, 2)}`]); out.A = AT; out.verA = [`\\pi r\\,(r+g)\\approx ${L_x(Math.PI * r.num() * (r.num() + gg.x))}\\;\\checkmark`, 'Calculamos el área total como πr(r + g).']; }
    if (vol) { const Vx = Math.PI * r.num() ** 2 * (hh ? hh.num() : out.hx) / 3; out.V = hh ? piq(r.pow(2).mul(hh).div(QE(3))) : mx(Vx); P('Calculamos el volumen', 'El volumen del cono es un tercio del cilindro de igual base y altura.', `V=\\frac{\\pi r^2 h}{3}=${out.V.L}${Lu(u, 3)}`); out.verV = [`\\frac{1}{3}\\cdot V_{\\text{cilindro}}\\approx\\frac{${L_x(Vx * 3)}}{3}\\approx ${L_x(Vx)}\\;\\checkmark`, 'Comparamos con un tercio del cilindro de la misma base y altura.']; } }
  else if (/cubo|hexaedro/.test(t)) { if (!a) throw new Error('Falta la arista del cubo.'); out.nombre = 'cubo';
    if (area) { out.A = mq(a.pow(2).mul(QE(6))); P('Calculamos el área total', 'El cubo tiene 6 caras cuadradas iguales.', `A_T=6\\cdot ${Lp(a)}^{2}=${out.A.L}${Lu(u, 2)}`); out.verA = [`A_L+2A_B=4\\cdot ${L_frac(a.pow(2))}+2\\cdot ${L_frac(a.pow(2))}=${L_frac(a.pow(2).mul(QE(6)))}\\;\\checkmark`, 'Sumamos las 4 caras laterales y las 2 bases por separado.']; }
    if (vol) { out.V = mq(a.pow(3)); P('Calculamos el volumen', 'El volumen del cubo es arista × arista × arista.', `V=${Lp(a)}^{3}=${out.V.L}${Lu(u, 3)}`); out.verV = [`A_B\\cdot h=${L_frac(a.pow(2))}\\cdot ${L_frac(a)}=${L_frac(a.pow(3))}\\;\\checkmark`, 'Área de la base por la altura.']; } }
  else if (/prisma|ortoedro|paralelepipedo|caja/.test(t)) {
    const nb = Object.entries(BASES).find(([k]) => t.includes(k))?.[1] || 4, la = g(['largo']), an = g(['ancho']), al = g(['alto']) || h;
    if (nb === 4 && la && an && al) { out.nombre = 'prisma rectangular'; const AB = la.mul(an), AL = la.add(an).mul(QE(2)).mul(al), AT = AL.add(AB.mul(QE(2)));
      if (area) { P('Calculamos las áreas', 'Tiene 6 caras rectangulares, iguales de a pares.', [`A_B=${L_frac(la)}\\cdot ${L_frac(an)}=${L_frac(AB)}`, `A_L=2\\cdot(${L_frac(la)}+${L_frac(an)})\\cdot ${L_frac(al)}=${L_frac(AL)}`, `A_T=A_L+2A_B=${L_frac(AT)}${Lu(u, 2)}`]); out.A = mq(AT); out.verA = [`2(ab+ac+bc)=2\\cdot(${L_frac(la.mul(an))}+${L_frac(la.mul(al))}+${L_frac(an.mul(al))})=${L_frac(la.mul(an).add(la.mul(al)).add(an.mul(al)).mul(QE(2)))}\\;\\checkmark`, 'Sumamos las tres caras distintas, cada una dos veces.']; }
      if (vol) { out.V = mq(AB.mul(al)); P('Calculamos el volumen', 'Largo por ancho por alto.', `V=${L_frac(la)}\\cdot ${L_frac(an)}\\cdot ${L_frac(al)}=${out.V.L}${Lu(u, 3)}`); out.verV = [`A_B\\cdot h=${L_frac(AB)}\\cdot ${L_frac(al)}=${L_frac(AB.mul(al))}\\;\\checkmark`, 'Área de la base por la altura.']; } }
    else { if (!a || !h) throw new Error('Faltan el lado de la base y la altura del prisma (o largo, ancho y alto).'); out.nombre = `prisma regular de base de ${nb} lados`;
      const ap = g(['apotema', 'ap']) ? mq(g(['apotema', 'ap'])) : apotemaRegular(nb, a), ABx = nb * a.num() * ap.x / 2, AL = a.mul(h).mul(QE(nb));
      P('Calculamos el área de la base', `La base es un polígono regular de ${nb} lados: área = perímetro × apotema / 2.`, [`ap=${ap.L}`, `A_B=\\frac{${nb}\\cdot ${L_frac(a)}\\cdot ${mL(ap)}}{2}\\approx ${L_x(ABx)}`]);
      if (area) { out.A = mx(AL.num() + 2 * ABx); P('Calculamos las áreas', `Las caras laterales son ${nb} rectángulos de base l y altura h.`, [`A_L=${nb}\\cdot ${L_frac(a)}\\cdot ${L_frac(h)}=${L_frac(AL)}`, `A_T=A_L+2A_B\\approx ${out.A.L}${Lu(u, 2)}`]); out.verA = [`${nb}\\cdot ${L_frac(a.mul(h))}+2\\cdot ${L_x(ABx)}\\approx ${L_x(AL.num() + 2 * ABx)}\\;\\checkmark`, 'Sumamos cara por cara.']; }
      if (vol) { out.V = mx(ABx * h.num()); P('Calculamos el volumen', 'Área de la base por la altura.', `V=A_B\\cdot h\\approx ${L_x(ABx)}\\cdot ${L_frac(h)}\\approx ${out.V.L}${Lu(u, 3)}`); out.verV = [`3\\cdot V_{\\text{pirámide}}\\approx ${L_x(ABx * h.num())}\\;\\checkmark`, 'Un prisma equivale a tres pirámides de igual base y altura.']; } } }
  else if (/piramide/.test(t)) {
    const nb = Object.entries(BASES).find(([k]) => t.includes(k))?.[1] || 4; if (!a || !h) throw new Error('Faltan el lado de la base y la altura de la pirámide.'); out.nombre = `pirámide regular de base de ${nb} lados`;
    const apb = apotemaRegular(nb, a), apP = mx(Math.sqrt(h.num() ** 2 + apb.x ** 2)), ABx = nb * a.num() * apb.x / 2;
    const apE = nb === 4 ? mr(h.pow(2).add(a.div(QE(2)).pow(2))) : apP;
    P('Calculamos la apotema de la pirámide', 'Es la altura de cada cara lateral. Con la altura h y la apotema de la base forma un triángulo rectángulo.', `ap=\\sqrt{${Lp(h)}^{2}+${par(mL(apb))}^{2}}=${apE.L}`);
    if (area) { const ALx = nb * a.num() * apE.x / 2; out.A = mx(ALx + ABx); P('Calculamos las áreas', `Las caras laterales son ${nb} triángulos de base l y altura igual a la apotema de la pirámide.`, [`A_L=${nb}\\cdot\\frac{${L_frac(a)}\\cdot ${mL(apE)}}{2}\\approx ${L_x(ALx)}`, `A_B\\approx ${L_x(ABx)}`, `A_T=A_L+A_B\\approx ${out.A.L}${Lu(u, 2)}`]); out.verA = [`${nb}\\cdot\\frac{${L_x(a.num() * apE.x)}}{2}+${L_x(ABx)}\\approx ${L_x(ALx + ABx)}\\;\\checkmark`, 'Sumamos cara por cara.']; }
    if (vol) { out.V = nb === 4 ? mq(a.pow(2).mul(h).div(QE(3))) : mx(ABx * h.num() / 3); P('Calculamos el volumen', 'El volumen de una pirámide es un tercio del área de la base por la altura.', `V=\\frac{A_B\\cdot h}{3}=${out.V.L}${Lu(u, 3)}`); out.verV = [`\\frac{1}{3}\\cdot V_{\\text{prisma}}\\approx\\frac{${L_x(ABx * h.num())}}{3}\\approx ${L_x(ABx * h.num() / 3)}\\;\\checkmark`, 'Comparamos con un tercio del prisma de igual base y altura.']; } }
  else throw new Error('Decí el cuerpo y sus medidas: cubo de arista 5, prisma de largo 4, ancho 3 y alto 2, cilindro de radio 3 y altura 10, cono, esfera o pirámide.');
  out.u = u; return out;
}
function resolverAreasCuerpos(texto) {
  const { pasos, P } = crearPasos(), m = medirCuerpo(texto, P, 'area');
  P('Verificamos', m.verA[1], m.verA[0]);
  return { tema: 'areas', metodo: `Áreas del ${m.nombre}`, pasos, resultado: `A_T=${m.A.L}${Lu(m.u, 2)}` };
}
function resolverVolumenes(texto) {
  const { pasos, P } = crearPasos(), m = medirCuerpo(texto, P, 'vol');
  const lit = { cm: m.V.x / 1000, dm: m.V.x, m: m.V.x * 1000 }[m.u];
  P('Verificamos', m.verV[1] + (lit !== undefined ? ` Además, como 1 dm³ = 1 litro, el volumen equivale a unos ${fmtX(lit, 4)} litros.` : ''), m.verV[0]);
  return { tema: 'volumenes', metodo: `Volumen del ${m.nombre}`, pasos, resultado: `V=${m.V.L}${Lu(m.u, 3)}` };
}

/* -----------------------------------------------------------------------
 * T10. FUNCIONES TRIGONOMÉTRICAS (las seis razones de un ángulo)
 * --------------------------------------------------------------------- */
// "−3√2/4" → RN exacto
function leerRN(s) {
  s = s.replace(/\s+/g, '').replace(/raiz|raíz|sqrt/gi, '√').replace(/[()]/g, '');
  const m = s.match(/^(-)?(\d+(?:[.,]\d+)?)?(?:√(\d+))?(?:\/(\d+(?:[.,]\d+)?))?$/); if (!m || (!m[2] && !m[3])) return null;
  let c = m[2] ? leerDecimal(m[2]).q : Q1; if (m[4]) c = c.div(leerDecimal(m[4]).q); if (m[1]) c = c.neg();
  return m[3] ? RN.raiz(BigInt(m[3]), c) : RN.q(c);
}
const raizRN = q => (q.cero ? RN.q(Q0) : RN.raiz(q.n * q.d, Q1.div(new Q(q.d))));     // √q para q racional ≥ 0
const RNcuad = v => { const w = v.mul(v); if (!w.esQ()) throw new Error('Por ahora trabajo con valores de la forma a√b/c.'); return w.m.get(1n) || Q0; };
function cuadranteDe(t) { const m = t.match(/\b(iv|iii|ii|i|primer|segundo|tercer|cuarto|1|2|3|4)(?:er|do|ro|to|°|º)?\s*cuadrante|cuadrante\s*(iv|iii|ii|i|1|2|3|4)\b/); if (!m) return null; const k = m[1] || m[2]; return { i: 1, ii: 2, iii: 3, iv: 4, primer: 1, segundo: 2, tercer: 3, cuarto: 4, 1: 1, 2: 2, 3: 3, 4: 4 }[k]; }
function resolverFunciones(texto) {
  const t = plano(texto), { pasos, P } = crearPasos();
  const mr_ = texto.match(/\b(sen|sin|cosec|csc|cos|cotg|cot|ctg|tg|tan|sec)\s*\(?\s*(?:α|alfa|β|beta|θ|theta|x|a)?\s*\)?\s*=\s*([-−]?\s*[\d.,]*\s*(?:√\s*\(?\d+\)?)?\s*(?:\/\s*\d+)?)/i);
  if (mr_) {
    const f = FUNCS[mr_[1].toLowerCase()], v = leerRN(mr_[2].replace('−', '-').replace(/[.,]\s*$/, '')), q = cuadranteDe(t); if (!v) throw new Error('No pude leer el valor de la razón.');
    if (!q) throw new Error('Decí en qué cuadrante está el ángulo, por ejemplo: “α en el II cuadrante”.');
    const sgS = q <= 2 ? 1 : -1, sgC = q === 1 || q === 4 ? 1 : -1;
    P('Anotamos los datos', `Conocemos una razón y el cuadrante. En el ${['I', 'II', 'III', 'IV'][q - 1]} cuadrante el seno es ${sgS > 0 ? 'positivo' : 'negativo'} y el coseno es ${sgC > 0 ? 'positivo' : 'negativo'}.`, `${L_fn(f)}\\,\\alpha=${v.L()}`);
    let s, c;
    const unidad = RN.q(Q1);
    if (f === 'sen' || f === 'cosec') { s = f === 'sen' ? v : unidad.div(v); const s2 = RNcuad(s); if (s2.cmp(Q1) > 0) throw new Error('El seno tiene que estar entre −1 y 1.'); if (s.num() * sgS < -1e-12) throw new Error('El signo del seno no corresponde a ese cuadrante.'); c = raizRN(Q1.sub(s2)); if (sgC < 0) c = c.neg(); P('Usamos la relación pitagórica', 'Despejamos el coseno de $\\operatorname{sen}^2\\alpha + \\cos^2\\alpha = 1$ y le ponemos el signo del cuadrante.', `\\cos\\alpha=${sgC < 0 ? '-' : ''}\\sqrt{1-${par(s.L())}^{2}}=${sgC < 0 ? '-' : ''}\\sqrt{${L_frac(Q1.sub(s2))}}=${c.L()}`); }
    else if (f === 'cos' || f === 'sec') { c = f === 'cos' ? v : unidad.div(v); const c2 = RNcuad(c); if (c2.cmp(Q1) > 0) throw new Error('El coseno tiene que estar entre −1 y 1.'); if (c.num() * sgC < -1e-12) throw new Error('El signo del coseno no corresponde a ese cuadrante.'); s = raizRN(Q1.sub(c2)); if (sgS < 0) s = s.neg(); P('Usamos la relación pitagórica', 'Despejamos el seno de $\\operatorname{sen}^2\\alpha + \\cos^2\\alpha = 1$ y le ponemos el signo del cuadrante.', `${sen}\\,\\alpha=${sgS < 0 ? '-' : ''}\\sqrt{1-${par(c.L())}^{2}}=${s.L()}`); }
    else { const tv = f === 'tg' ? v : unidad.div(v); if (tv.num() * sgS * sgC < -1e-12) throw new Error('El signo de la tangente no corresponde a ese cuadrante.'); const sec2 = Q1.add(RNcuad(tv)); c = unidad.div(raizRN(sec2)); if (sgC < 0) c = c.neg(); s = tv.mul(c); P('Usamos $1 + \\operatorname{tg}^2\\alpha = \\sec^2\\alpha$', 'De esta identidad sacamos el coseno (con el signo del cuadrante) y después el seno = tg · cos.', [`\\cos\\alpha=${sgC < 0 ? '-' : ''}\\frac{1}{\\sqrt{1+${par(tv.L())}^{2}}}=${c.L()}`, `${sen}\\,\\alpha=${tg}\\,\\alpha\\cdot\\cos\\alpha=${s.L()}`]); }
    const cero = x => !x.m.size, R = { sen: s, cos: c, tg: cero(c) ? null : s.div(c), cotg: cero(s) ? null : c.div(s), sec: cero(c) ? null : unidad.div(c), cosec: cero(s) ? null : unidad.div(s) };
    P('Calculamos las demás razones', 'Con seno y coseno salen todas: tg = sen/cos, cotg = cos/sen, sec = 1/cos y cosec = 1/sen.', Object.entries(R).map(([k, x]) => `${L_fn(k)}\\,\\alpha=${x ? x.L() : tx('no existe')}`));
    const id = s.mul(s).add(c.mul(c));
    P('Verificamos', 'Tiene que cumplirse la relación pitagórica.', `${par(s.L())}^{2}+${par(c.L())}^{2}=${id.L()}\\;${id.esQ() && (id.m.get(1n) || Q0).eq(Q1) ? '\\checkmark' : ''}`);
    return { tema: 'funciones', metodo: 'Relación pitagórica y signos por cuadrante', pasos, resultado: Object.entries(R).map(([k, x]) => `${L_fn(k)}\\,\\alpha=${x ? x.L() : '\\nexists'}`).join(',\\;') };
  }
  const a = leerGrados(texto); if (a === null) throw new Error('Escribí un ángulo (“razones trigonométricas de 150°”) o una razón con su cuadrante (“sen α = 3/5, α en el II cuadrante”).');
  const d = a.num(), red = ((d % 360) + 360) % 360, q = red < 90 ? 1 : red < 180 ? 2 : red < 270 ? 3 : 4, ref = [red, 180 - red, red - 180, 360 - red][q - 1];
  P('Ubicamos el ángulo', 'Lo llevamos a una sola vuelta (entre 0° y 360°) y vemos en qué cuadrante cae.' + ([0, 90, 180, 270].includes(red) ? ' Está sobre un eje.' : ` Está en el ${['I', 'II', 'III', 'IV'][q - 1]} cuadrante y su ángulo de referencia es ${fmtX(ref, 4)}°.`), `${Lg(a)}\\to ${Lgr(red)}`);
  const vals = ['sen', 'cos', 'tg', 'cotg', 'sec', 'cosec'].map(f => { const ex = trigRN(f, red), n = trigNum(f, red); return [f, ex === 'no' || Math.abs(n) > 1e12 ? null : ex ? ex.L() + (ex.esQ() ? '' : `\\approx ${L_x(ex.num())}`) : `\\approx ${L_x(n)}`]; });
  const igual = v => (v === null ? '=' + tx('no existe') : v.startsWith('\\approx') ? v : '=' + v);
  P('Calculamos las seis razones', senCosRN(red) ? 'Es un ángulo notable (o se reduce a uno): usamos los valores exactos con el signo del cuadrante.' : 'No es un ángulo notable: usamos valores aproximados (como la calculadora en modo grados).', vals.map(([f, v]) => `${L_fn(f)}\\,${Lgr(red)}${igual(v)}`));
  const s = trigNum('sen', red), c = trigNum('cos', red);
  P('Verificamos', 'Comprobamos la relación pitagórica con los valores obtenidos.', `${sen}^2+\\cos^2\\approx ${L_x(s * s + c * c)}\\;${aproxIgual(s * s + c * c, 1) ? '\\checkmark' : ''}`);
  return { tema: 'funciones', metodo: 'Reducción al primer cuadrante', pasos, resultado: vals.slice(0, 3).map(([f, v]) => `${L_fn(f)}${v === null ? '=\\nexists' : igual(v)}`).join(',\\;') };
}

/* -----------------------------------------------------------------------
 * T11. ÁNGULOS NOTABLES: valor exacto de expresiones como sen 30° + cos² 45°
 * --------------------------------------------------------------------- */
function evalNotable(src) {                          // mini analizador con valores exactos RN
  const llamadas = []; const RE = /(cosec|csc|cotg|ctg|cot|sen|sin|cos|tg|tan|sec)\s*(?:\^\s*\(?(\d)\)?)?\s*(\(\s*[^()]*?\)|-?\d+(?:[.,]\d+)?\s*°(?:\s*\d+\s*['′])?|-?\d*\s*(?:π|pi)(?:\s*\/\s*\d+)?)/gi;
  let s = src.replace(RE, (m0, f, p, arg) => { const deg = leerGrados(arg.replace(/[()]/g, '')); if (deg === null) throw new Error(`No entendí el ángulo “${arg}”.`); llamadas.push({ f: FUNCS[f.toLowerCase()], p: p ? +p : 1, deg }); return ` #${llamadas.length - 1} `; });
  if (!llamadas.length) throw new Error('No encontré funciones trigonométricas con ángulos (por ejemplo sen 30° o cos(π/4)).');
  s = s.replace(/[−–]/g, '-').replace(/[·×*]/g, '*').replace(/:/g, '/').replace(/raiz|raíz|sqrt/gi, '√').replace(/[a-záéíóúñ¿?=]+/gi, ' ');
  const toks = s.match(/#\d+|\d+(?:[.,]\d+)?|[-+*/^()√]/g) || []; let i = 0;
  const ver = () => toks[i], sig = () => toks[i++];
  function expr() { let a = term(); while (ver() === '+' || ver() === '-') { const o = sig(), b = term(); a = { t: o, a, b }; } return a; }
  function term() { let a = un(); while (ver() === '*' || ver() === '/' || (ver() && /^[#\d(√]/.test(ver()))) { const o = ver() === '*' || ver() === '/' ? sig() : '*', b = un(); a = { t: o, a, b }; } return a; }
  function un() { if (ver() === '-') { sig(); return { t: 'neg', a: un() }; } if (ver() === '+') { sig(); return un(); } let b = at(); if (ver() === '^') { sig(); const e = at(); if (e.t !== 'n' || !e.q.entero) throw new Error('El exponente tiene que ser natural.'); b = { t: 'pow', a: b, n: Number(e.q.n) }; } return b; }
  function at() { const k = sig(); if (k === undefined) throw new Error('La expresión está incompleta.'); if (k === '(') { const e = expr(); sig(); return { t: 'par', a: e }; } if (k === '√') { const e = at(); return { t: 'raiz', a: e }; } if (k[0] === '#') return { t: 'f', k: +k.slice(1) }; if (/\d/.test(k)) return { t: 'n', q: leerDecimal(k).q }; throw new Error('No entendí la expresión.'); }
  const ast = expr(); if (i < toks.length) throw new Error('Sobra algo en la expresión.');
  const valor = c => { const v = trigRN(c.f, c.deg.num()); if (v === 'no') throw new Error(`${c.f} ${fmtX(c.deg.num())}° no existe.`); if (v === null) throw new Error(`${fmtX(c.deg.num())}° no es un ángulo notable: probá en “Funciones trigonométricas”.`); return v.pow(c.p); };
  const ev = n => ({ n: () => RN.q(n.q), f: () => valor(llamadas[n.k]), par: () => ev(n.a), neg: () => ev(n.a).neg(), '+': () => ev(n.a).add(ev(n.b)), '-': () => ev(n.a).sub(ev(n.b)), '*': () => ev(n.a).mul(ev(n.b)), '/': () => ev(n.a).div(ev(n.b)), pow: () => ev(n.a).pow(n.n), raiz: () => { const v = ev(n.a); if (!v.esQ()) throw new Error('Solo raíces de números racionales.'); return raizRN(v.m.get(1n) || Q0); } }[n.t]());
  const LF = c => `${L_fn(c.f)}${c.p > 1 ? '^{' + c.p + '}' : ''}${Lg(c.deg)}`;
  const Lt = (n, modo) => ({ n: () => L_frac(n.q), f: () => (modo ? par(trigRN(llamadas[n.k].f, llamadas[n.k].deg.num()).L()) + (llamadas[n.k].p > 1 ? '^{' + llamadas[n.k].p + '}' : '') : LF(llamadas[n.k])), par: () => par(Lt(n.a, modo)), neg: () => '-' + Lt(n.a, modo), '+': () => Lt(n.a, modo) + '+' + Lt(n.b, modo), '-': () => Lt(n.a, modo) + '-' + Lt(n.b, modo), '*': () => Lt(n.a, modo) + '\\cdot ' + Lt(n.b, modo), '/': () => `\\frac{${Lt(n.a, modo)}}{${Lt(n.b, modo)}}`, pow: () => `{${Lt(n.a, modo)}}^{${n.n}}`, raiz: () => `\\sqrt{${Lt(n.a, modo)}}` }[n.t]());
  const num = n => ({ n: () => n.q.num(), f: () => trigNum(llamadas[n.k].f, llamadas[n.k].deg.num()) ** llamadas[n.k].p, par: () => num(n.a), neg: () => -num(n.a), '+': () => num(n.a) + num(n.b), '-': () => num(n.a) - num(n.b), '*': () => num(n.a) * num(n.b), '/': () => num(n.a) / num(n.b), pow: () => num(n.a) ** n.n, raiz: () => Math.sqrt(num(n.a)) }[n.t]());
  return { ast, llamadas, ev, Lt, num, LF, valor };
}
function resolverNotables(texto) {
  const { pasos, P } = crearPasos(), E = evalNotable(texto);
  P('Escribimos la expresión', 'Los ángulos notables (0°, 30°, 45°, 60°, 90° y sus “parientes” en los otros cuadrantes) tienen valores exactos que conviene saber de memoria o deducir de un triángulo equilátero y de un cuadrado.', E.Lt(E.ast, false));
  const uniq = E.llamadas.filter((c, i) => E.llamadas.findIndex(o => o.f === c.f && o.deg.eq(c.deg)) === i);
  P('Buscamos los valores exactos', 'Si el ángulo no está en el primer cuadrante, usamos su ángulo de referencia y el signo del cuadrante.', uniq.map(c => `${L_fn(c.f)}\\,${Lg(c.deg)}=${trigRN(c.f, c.deg.num()).L()}`));
  P('Reemplazamos', 'Ponemos cada valor entre paréntesis y resolvemos respetando la jerarquía de las operaciones.', E.Lt(E.ast, true));
  const r = E.ev(E.ast), n = E.num(E.ast);
  P('Calculamos', 'Operamos con fracciones y raíces (si queda una raíz en el denominador, racionalizamos).', `=${r.L()}`);
  P('Verificamos', 'Calculamos todo con decimales, como una calculadora en modo grados.', `${E.Lt(E.ast, false)}\\approx ${L_x(n)}\\;${aproxIgual(n, r.num()) ? '\\checkmark' : ''}`);
  return { tema: 'notables', metodo: 'Valores exactos de ángulos notables', pasos, resultado: r.L() + (r.esQ() ? '' : `\\approx ${L_x(r.num())}`) };
}

/* -----------------------------------------------------------------------
 * T12. REPRESENTACIÓN GRÁFICA: y = A·f(Bx + C) + D
 * --------------------------------------------------------------------- */
const Lpiq = q => (q.cero ? '0' : `${q.eq(Q1) ? '' : q.eq(QE(-1)) ? '-' : L_frac(q)}\\pi`);
function svgFuncion(f, x0, x1, y0, y1, asintotas = [], marcas = []) {
  const W = 340, H = 220, X = x => (x - x0) / (x1 - x0) * W, Y = y => H - (y - y0) / (y1 - y0) * H; let g = '';
  for (let k = Math.ceil(x0 / (Math.PI / 2)); k * Math.PI / 2 <= x1; k++) { const x = k * Math.PI / 2; g += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${H}" class="gr"/>${k ? `<text x="${X(x)}" y="${Math.min(H - 3, Math.max(12, Y(0) + 13))}" class="et">${k % 2 ? (k === 1 ? 'π/2' : k === -1 ? '−π/2' : (k < 0 ? '−' : '') + Math.abs(k) + 'π/2') : (k / 2 === 1 ? 'π' : k / 2 === -1 ? '−π' : (k / 2) + 'π')}</text>` : ''}`; }
  for (let y = Math.ceil(y0); y <= y1; y++) g += `<line x1="0" y1="${Y(y)}" x2="${W}" y2="${Y(y)}" class="gr"/>${y ? `<text x="${Math.min(W - 14, Math.max(3, X(0) + 4))}" y="${Y(y) - 2}" class="et" text-anchor="start">${y}</text>` : ''}`;
  g += `<line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" class="ej"/><line x1="${X(0)}" y1="0" x2="${X(0)}" y2="${H}" class="ej"/>`;
  asintotas.forEach(a => { g += `<line x1="${X(a)}" y1="0" x2="${X(a)}" y2="${H}" class="asin"/>`; });
  let d = '', pen = false;
  for (let i = 0; i <= 600; i++) { const x = x0 + (x1 - x0) * i / 600, y = f(x); if (!isFinite(y) || y < y0 - 5 || y > y1 + 5) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${X(x).toFixed(1)},${Y(Math.max(y0 - 1, Math.min(y1 + 1, y))).toFixed(1)}`; pen = true; }
  g += `<path d="${d}" class="curva"/>` + marcas.map(([x, y]) => `<circle cx="${X(x)}" cy="${Y(y)}" r="4" class="pt"/>`).join('');
  return `<svg class="grafico ancho" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de la función">${g}</svg>`;
}
function resolverGraficas(texto) {
  const { pasos, P } = crearPasos(), s = texto.replace(/[−–]/g, '-').replace(/\s+/g, ' ');
  const m = s.match(/(?:y|f\s*\(\s*x\s*\))\s*=\s*([-+]?\s*[\d.,/]*)\s*[·*]?\s*(sen|sin|cos|tg|tan)\s*\(([^)]*)\)\s*([-+]\s*[\d.,/]+)?/i) || s.match(/(?:y|f\s*\(\s*x\s*\))\s*=\s*([-+]?\s*[\d.,/]*)\s*[·*]?\s*(sen|sin|cos|tg|tan)\s*([^+\-\s]+x)\s*([-+]\s*[\d.,/]+)?/i);
  if (!m) throw new Error('Escribí la función así: y = 2 sen(3x − π/2) + 1, y = −cos(x/2) o y = tg(2x).');
  const f = FUNCS[m[2].toLowerCase()], Araw = m[1].replace(/\s/g, ''), A = Araw === '' || Araw === '+' ? Q1 : Araw === '-' ? QE(-1) : numDe(Araw), D = m[4] ? numDe(m[4].replace(/[\s+]/g, '')) : Q0;
  const inner = Pred(aPoly(exprAlg(m[3].replace(/π|pi/gi, 'p'))));
  let B = Q0, Cp = Q0, C0 = Q0; for (const t_ of inner) { const k = claveMono(t_.v); if (k === 'x1') B = t_.c; else if (k === 'p1') Cp = t_.c; else if (k === '') C0 = t_.c; else throw new Error('Lo de adentro tiene que ser de la forma Bx + C.'); }
  if (B.cero) throw new Error('Adentro de la función tiene que aparecer x.');
  const esTg = f === 'tg', perQ = (esTg ? Q1 : QE(2)).div(B.abs()), per = perQ.num() * Math.PI, fase = -(Cp.num() * Math.PI + C0.num()) / B.num(), faseL = C0.cero ? Lpiq(Cp.neg().div(B)) : L_x(fase);
  const ff = x => A.num() * (f === 'sen' ? Math.sin : f === 'cos' ? Math.cos : Math.tan)(B.num() * x + Cp.num() * Math.PI + C0.num()) + D.num();
  P('Identificamos los parámetros', `Comparamos con y = A·${f}(Bx + C) + D.`, `A=${L_frac(A)},\\quad B=${L_frac(B)},\\quad C=${Cp.cero ? L_frac(C0) : Lpiq(Cp) + (C0.cero ? '' : '+' + L_frac(C0))},\\quad D=${L_frac(D)}`);
  const lin = [];
  if (!esTg) lin.push(`\\text{amplitud}=|A|=${L_frac(A.abs())}`);
  lin.push(`\\text{período}=\\frac{${esTg ? '\\pi' : '2\\pi'}}{|B|}=${Lpiq(perQ)}`, `\\text{desplazamiento horizontal}=-\\frac{C}{B}=${faseL}`, `\\text{desplazamiento vertical}=D=${L_frac(D)}`);
  if (!esTg) lin.push(`\\text{imagen}=[${L_frac(D.sub(A.abs()))};\\,${L_frac(D.add(A.abs()))}]`);
  P('Calculamos amplitud, período y desplazamientos', (esTg ? 'La tangente no tiene amplitud (crece sin límite). ' : 'La amplitud es cuánto sube y baja la curva desde su eje; ') + 'el período es cada cuánto se repite; C corre la curva a izquierda o derecha y D la sube o la baja.' + (A.signo < 0 ? ' Como A es negativo, la curva se refleja respecto de su eje.' : ''), lin);
  const pts = [0, 1, 2, 3, 4].map(k => { const x = fase + k * per / 4; return [x, ff(x)]; });
  const Lx = k => (C0.cero ? Lpiq(Cp.neg().div(B).add(perQ.mul(new Q(BigInt(k), 4n)))) : L_x(fase + k * per / 4));
  P('Armamos una tabla con los puntos clave', esTg ? 'Tomamos un período a partir del desplazamiento: en el inicio la tangente vale D y en la mitad del período hay una asíntota.' : 'Dividimos un período en 4 partes iguales: ahí la curva pasa por su eje, sus máximos y sus mínimos.', [], tabla(['x', 'y'], pts.map(([x, y], k) => [k$(Lx(k)), esTg && k === 2 ? 'asíntota' : k$(L_x(y))])));
  const x0 = Math.min(0, fase) - per * 0.25, x1 = Math.max(fase + 2 * per, per) + per * 0.1, amp = esTg ? 4 : Math.abs(A.num()), y0 = Math.floor(D.num() - amp - 1), y1 = Math.ceil(D.num() + amp + 1);
  const asin = esTg ? Array.from({ length: 12 }, (_, k) => fase + per / 2 + (k - 4) * per).filter(a => a > x0 && a < x1) : [];
  P('Graficamos', 'Unimos los puntos clave con la forma de la curva y repetimos cada período.', [], svgFuncion(ff, x0, x1, y0, y1, asin, pts.filter((_, k) => !(esTg && k === 2)).filter(([x, y]) => isFinite(y))));
  const xs = 0.37, a1 = ff(xs), a2 = ff(xs + per);
  P('Verificamos', 'Si el período es correcto, la función tiene que dar lo mismo en x y en x + período.', `f(0{,}37)\\approx ${L_x(a1)},\\quad f(0{,}37+${Lpiq(perQ)})\\approx ${L_x(a2)}\\;${aproxIgual(a1, a2) ? '\\checkmark' : ''}`);
  return { tema: 'graficas', metodo: 'Parámetros de la función', pasos, resultado: `${esTg ? '' : '\\text{amplitud}=' + L_frac(A.abs()) + ',\\;'}T=${Lpiq(perQ)}` };
}

/* -----------------------------------------------------------------------
 * T13. IDENTIDADES Y ECUACIONES TRIGONOMÉTRICAS
 * Se pasa todo a senos (S) y cosenos (C) como fracciones de polinomios y se
 * usa sen² + cos² = 1 para simplificar.
 * --------------------------------------------------------------------- */
function parseTrigX(src) {
  const s = src.replace(/[−–]/g, '-').replace(/[·×]/g, '*').replace(/\s+/g, ' ').toLowerCase();
  const toks = []; let i = 0;
  while (i < s.length) {
    const r = s.slice(i); let m;
    if (r[0] === ' ') { i++; continue; }
    if ((m = r.match(/^(cosec|csc|cotg|ctg|cot|sen|sin|cos|tg|tan|sec)\s*(?:\^\s*\(?(\d)\)?)?\s*(?:\(\s*x\s*\)|x)/))) { toks.push({ t: 'f', f: FUNCS[m[1]], p: m[2] ? +m[2] : 1 }); i += m[0].length; continue; }
    if ((m = r.match(/^\d+(?:[.,]\d+)?/))) { toks.push({ t: 'n', q: leerDecimal(m[0]).q }); i += m[0].length; continue; }
    if ('+-*/^()'.includes(r[0])) { toks.push({ t: r[0] }); i++; continue; }
    throw new Error(`No entendí “${r.slice(0, 8)}”. Usá sen x, cos x, tg x, cotg x, sec x y cosec x (el argumento tiene que ser x).`);
  }
  let k = 0; const ver = () => toks[k] && toks[k].t, sig = () => toks[k++];
  function expr() { let a = term(); while (ver() === '+' || ver() === '-') { const o = sig().t; a = { t: o, a, b: term() }; } return a; }
  function term() { let a = un(); while (ver() === '*' || ver() === '/' || ['f', 'n', '('].includes(ver())) { const o = ver() === '*' || ver() === '/' ? sig().t : '*'; a = { t: o, a, b: un() }; } return a; }
  function un() { if (ver() === '-') { sig(); return { t: 'neg', a: un() }; } let b = at(); if (ver() === '^') { sig(); const e = sig(); if (!e || e.t !== 'n') throw new Error('El exponente tiene que ser un número.'); b = { t: 'pow', a: b, n: Number(e.q.n) }; } return b; }
  function at() { const tk = sig(); if (!tk) throw new Error('La expresión está incompleta.'); if (tk.t === '(') { const e = expr(); sig(); return { t: 'par', a: e }; } if (tk.t === 'f' || tk.t === 'n') return tk; throw new Error('No entendí la expresión.'); }
  const e = expr(); if (k < toks.length) throw new Error('Sobra algo en la expresión.'); return e;
}
const LTX = e => ({ n: () => L_frac(e.q), f: () => `${L_fn(e.f)}${e.p > 1 ? '^{' + e.p + '}' : ''} x`, par: () => par(LTX(e.a)), neg: () => '-' + LTX(e.a), '+': () => LTX(e.a) + '+' + LTX(e.b), '-': () => LTX(e.a) + '-' + LTX(e.b), '*': () => LTX(e.a) + '\\,' + LTX(e.b), '/': () => `\\frac{${LTX(e.a)}}{${LTX(e.b)}}`, pow: () => `{${LTX(e.a)}}^{${e.n}}` }[e.t]());
const numTX = (e, x) => ({ n: () => e.q.num(), f: () => trigNum(e.f, x) ** e.p, par: () => numTX(e.a, x), neg: () => -numTX(e.a, x), '+': () => numTX(e.a, x) + numTX(e.b, x), '-': () => numTX(e.a, x) - numTX(e.b, x), '*': () => numTX(e.a, x) * numTX(e.b, x), '/': () => numTX(e.a, x) / numTX(e.b, x), pow: () => numTX(e.a, x) ** e.n }[e.t]());
function aRacSC(e) {                                 // árbol → { n, d } polinomios en S (seno) y C (coseno)
  const uno = Pc(Q1), S = Pv('S'), C = Pv('C');
  const base = { sen: [S, uno], cos: [C, uno], tg: [S, C], cotg: [C, S], sec: [uno, C], cosec: [uno, S] };
  const R = x => aRacSC(x);
  switch (e.t) {
    case 'n': return { n: Pc(e.q), d: uno };
    case 'f': { const [a, b] = base[e.f]; return { n: Ppow(a, e.p), d: Ppow(b, e.p) }; }
    case 'par': return R(e.a);
    case 'neg': { const a = R(e.a); return { n: Pneg(a.n), d: a.d }; }
    case '+': case '-': { const a = R(e.a), b = R(e.b); if (Peq(a.d, b.d)) return { n: Pred((e.t === '+' ? Padd : Psub)(a.n, b.n)), d: a.d }; return { n: Pred((e.t === '+' ? Padd : Psub)(Pmul(a.n, b.d), Pmul(b.n, a.d))), d: Pred(Pmul(a.d, b.d)) }; }
    case '*': { const a = R(e.a), b = R(e.b); return { n: Pred(Pmul(a.n, b.n)), d: Pred(Pmul(a.d, b.d)) }; }
    case '/': { const a = R(e.a), b = R(e.b); return { n: Pred(Pmul(a.n, b.d)), d: Pred(Pmul(a.d, b.n)) }; }
    case 'pow': { const a = R(e.a); return { n: Ppow(a.n, e.n), d: Ppow(a.d, e.n) }; }
  }
}
const LSC = P_ => L_P(P_).replace(/S(\^\{\d+\})?/g, (_, p) => `${sen}${p || ''} x`).replace(/C(\^\{\d+\})?/g, (_, p) => `\\cos${p || ''} x`);
const Lrac = r => (Peq(r.d, Pc(Q1)) ? LSC(r.n) : `\\frac{${LSC(r.n)}}{${LSC(r.d)}}`);
function reducirPit(P_) {                            // reemplaza sen² x por 1 − cos² x hasta que no quede sen con exponente ≥ 2
  let p = Pred(P_);
  for (let g = 0; g < 50; g++) {
    const i = p.findIndex(m => (m.v.S || 0) >= 2); if (i < 0) break;
    const m = p[i], v = { ...m.v }; v.S -= 2;
    p = Pred([...p.slice(0, i), ...p.slice(i + 1), ...Pmul([mono(m.c, v)], Pred([mono(Q1), mono(QE(-1), { C: 2 })]))]);
  }
  return p;
}
function resolverIdentidad(izq, der) {
  const { pasos, P } = crearPasos(), A = aRacSC(izq), B = aRacSC(der);
  P('Escribimos la identidad', 'Una identidad tiene que valer para todos los ángulos donde las expresiones existen. Para demostrarla, transformamos hasta que los dos miembros queden iguales.', `${LTX(izq)}=${LTX(der)}`);
  P('Pasamos todo a senos y cosenos', `Usamos las definiciones: $\\operatorname{tg} x = \\frac{\\operatorname{sen} x}{\\cos x}$, $\\operatorname{cotg} x = \\frac{\\cos x}{\\operatorname{sen} x}$, $\\sec x = \\frac{1}{\\cos x}$ y $\\operatorname{cosec} x = \\frac{1}{\\operatorname{sen} x}$, y operamos las fracciones.`, [`\\text{1.° miembro: }${Lrac(A)}`, `\\text{2.° miembro: }${Lrac(B)}`]);
  const N = Pred(Psub(Pmul(A.n, B.d), Pmul(B.n, A.d)));
  P('Restamos los dos miembros', 'Si la identidad es cierta, el primer miembro menos el segundo tiene que dar 0. Multiplicamos en cruz para sacar los denominadores.', `${LSC(Pmul(A.n, B.d))}-\\left(${LSC(Pmul(B.n, A.d))}\\right)=${LSC(N)}`);
  const Z = reducirPit(N), ok = !Z.length;
  P('Usamos la identidad pitagórica', `Reemplazamos $\\operatorname{sen}^2 x$ por $1 - \\cos^2 x$ (porque $\\operatorname{sen}^2 x + \\cos^2 x = 1$) y simplificamos.`, `${LSC(N)}=${LSC(Z)}`);
  const xs = [23, 51, 137], ver = xs.map(x => [numTX(izq, x), numTX(der, x)]);
  P('Verificamos', ok ? 'Dio 0: la igualdad es una identidad. Lo comprobamos con algunos ángulos.' : 'No dio 0: no es una identidad. Lo confirmamos con un ángulo donde los miembros dan distinto.', ver.map(([a, b], i) => `x=${xs[i]}^{\\circ}:\\;${L_x(a)}\\;${aproxIgual(a, b) ? '=' : '\\ne '}\\;${L_x(b)}${aproxIgual(a, b) === ok ? '\\;\\checkmark' : ''}`));
  return { tema: 'identidades', metodo: 'Reducción a senos y cosenos', pasos, resultado: tx(ok ? 'Es una identidad' : 'No es una identidad') };
}
function angulosDe(f, v) {                           // ángulos en [0°, 360°) con f(θ) = v
  const n = v.x, norm = a => ((a % 360) + 360) % 360, red = a => (Math.abs(a - Math.round(a)) < 1e-7 ? Math.round(a) : a);
  if ((f === 'sen' || f === 'cos') && Math.abs(n) > 1 + 1e-12) return null;
  let base;
  if (f === 'sen') { const a = Math.asin(Math.max(-1, Math.min(1, n))) * 180 / Math.PI; base = [a, 180 - a]; }
  else if (f === 'cos') { const a = Math.acos(Math.max(-1, Math.min(1, n))) * 180 / Math.PI; base = [a, 360 - a]; }
  else { const a = Math.atan(n) * 180 / Math.PI; base = [a, a + 180]; }
  return [...new Set(base.map(a => red(norm(a))))].sort((a, b) => a - b);
}
function resolverEcTrig(izq, der) {
  const { pasos, P } = crearPasos(), A = aRacSC(izq), B = aRacSC(der);
  P('Escribimos la ecuación', 'Buscamos los ángulos x entre 0° y 360° que cumplen la igualdad (después agregamos las vueltas completas).', `${LTX(izq)}=${LTX(der)}`);
  let N = Pred(Psub(Pmul(A.n, B.d), Pmul(B.n, A.d)));
  P('Pasamos todo a senos y cosenos', 'Escribimos todo en función de seno y coseno y pasamos todo a un miembro (multiplicando en cruz si hay denominadores).', `${LSC(N)}=0`);
  const expS = N.map(m => m.v.S || 0), expC = N.map(m => m.v.C || 0);
  let u, f, sust = '';
  if (expC.every(e => e === 0)) { u = 'S'; f = 'sen'; }
  else if (expS.every(e => e === 0)) { u = 'C'; f = 'cos'; }
  else if (expS.every(e => e % 2 === 0)) { N = reducirPit(N); u = 'C'; f = 'cos'; sust = `Como el seno aparece al cuadrado, usamos $\\operatorname{sen}^2 x = 1 - \\cos^2 x$ para que quede todo en coseno.`; }
  else if (expC.every(e => e % 2 === 0)) { N = Pred(N.flatMap(m => { const k = (m.v.C || 0) / 2, v = { ...m.v }; delete v.C; return Pmul([mono(m.c, v)], Ppow(Pred([mono(Q1), mono(QE(-1), { S: 2 })]), k)); })); u = 'S'; f = 'sen'; sust = `Como el coseno aparece al cuadrado, usamos $\\cos^2 x = 1 - \\operatorname{sen}^2 x$ para que quede todo en seno.`; }
  else if (N.length === 2 && N.every(m => (m.v.S || 0) + (m.v.C || 0) === 1)) {
    const a = N.find(m => m.v.S)?.c || Q0, b = N.find(m => m.v.C)?.c || Q0; const tv = b.neg().div(a);
    P('Dividimos por cos x', 'Si cos x ≠ 0, dividimos todo por cos x y queda una ecuación con tangente.', `${tg}\\,x=${L_frac(tv)}`);
    N = null; u = 'T'; f = 'tg'; var valoresT = [{ q: tv, x: tv.num() }];
  } else throw new Error('Por ahora resuelvo ecuaciones que se pueden escribir con una sola función (seno, coseno o tangente).');
  let valores = valoresT;
  if (N) {
    if (sust) P('Dejamos una sola función', sust, `${LSC(N)}=0`);
    const p = aU(N.map(m => mono(m.c, m.v[u] ? { t: m.v[u] } : {})), 't'); const g = uGrado(p);
    P('Hacemos un cambio de variable', `Llamamos $t = ${u === 'S' ? '\\operatorname{sen} x' : '\\cos x'}$ y resolvemos la ecuación en t.`, `${L_U(p, 't')}=0`);
    if (g === 1) valores = [{ q: p[0].neg().div(p[1]), x: p[0].neg().div(p[1]).num() }];
    else if (g === 2) { const R = raicesCuadratica(p[2], p[1], p[0]); valores = R.tipo === 'rac' ? R.r.filter((r, i) => !i || !r.eq(R.r[0])).map(q => ({ q, x: q.num() })) : R.tipo === 'irr' ? R.x.map((x, i) => ({ L: R.L[i], x })) : []; }
    else { const { P: Pp } = crearPasos(); const fz = factorizarPoly(deU(p, 't'), Pp); valores = fz.fs.filter(fc => !fc.irr && Pgrado(fc.P) === 1).map(fc => { const v = aU(fc.P, 't'); const q = v[0].neg().div(v[1]); return { q, x: q.num() }; }); }
    P('Encontramos los valores de t', 'Resolvemos la ecuación polinómica (con la resolvente si es de segundo grado).', valores.length ? valores.map((v, i) => `t_{${i + 1}}=${v.q ? L_frac(v.q) : v.L}`) : [tx('No tiene soluciones reales.')]);
  }
  const sols = []; const lines = [];
  for (const v of valores) {
    const angs = angulosDe(f, v), Lv = v.q ? L_frac(v.q) : v.L;
    if (!angs) { lines.push(`${L_fn(f)}\\,x=${Lv}:\\;${tx('imposible (el valor tiene que estar entre −1 y 1)')}`); continue; }
    lines.push(`${L_fn(f)}\\,x=${Lv}\\;\\Rightarrow\\;x=${angs.map(a => (Number.isInteger(a) ? `${a}^{\\circ}` : Lgr(a))).join(',\\;')}`); sols.push(...angs);
  }
  P('Buscamos los ángulos', `Para cada valor buscamos los ángulos entre 0° y 360° (con la función inversa y los cuadrantes donde ${f} tiene ese signo).`, lines.length ? lines : [tx('Sin valores para resolver.')]);
  const den = [A.d, B.d], valido = x => den.every(d => Math.abs(PevalN(d, { S: Math.sin(x * Math.PI / 180), C: Math.cos(x * Math.PI / 180) })) > 1e-9);
  const finales = [...new Set(sols)].sort((a, b) => a - b).filter(valido);
  P('Verificamos', 'Reemplazamos cada ángulo en la ecuación original (y descartamos los que anulan algún denominador).', finales.length ? finales.map(x => { const a = numTX(izq, x), b = numTX(der, x); return `x=${Number.isInteger(x) ? x + '^{\\circ}' : Lgr(x)}:\\;${L_x(a)}=${L_x(b)}\\;${aproxIgual(a, b) ? '\\checkmark' : ''}`; }) : [tx('No hay soluciones.')]);
  const vuelta = f === 'tg' ? '180' : '360';
  return { tema: 'identidades', metodo: 'Cambio de variable', pasos, resultado: finales.length ? `x=${finales.map(a => (Number.isInteger(a) ? `${a}^{\\circ}` : Lgr(a))).join(',\\;')}\\;(+\\,k\\cdot ${vuelta}^{\\circ})` : tx('Sin solución') };
}
function resolverIdentidades(texto) {
  const t = plano(texto), limpio = texto.replace(/^.*?(demostrar|verificar|probar|resolver|identidad|ecuacion)\w*\s*(que|la)?\s*:?\s*/i, '').replace(/[¿?]/g, '');
  const [a, b] = limpio.split('='); if (b === undefined) throw new Error('Escribí una igualdad, por ejemplo: tg x · cos x = sen x, o 2 sen x − 1 = 0.');
  const izq = parseTrigX(a), der = parseTrigX(b);
  const esId = /identidad|demostr|verific|prob/.test(t) || (/(sen|sin|cos|tg|tan|sec|cotg|cosec)/.test(b) && !/resolver|ecuacion/.test(t) && !/^\s*-?[\d.,]+\s*$/.test(b) && (() => { const xs = [23, 51, 137]; return xs.every(x => aproxIgual(numTX(izq, x), numTX(der, x))); })());
  return esId ? resolverIdentidad(izq, der) : resolverEcTrig(izq, der);
}

/* -----------------------------------------------------------------------
 * T14. TRIÁNGULOS RECTÁNGULOS (resolución con razones trigonométricas)
 * Convención: ángulo recto en C; α opuesto al cateto a; β opuesto a b; c hipotenusa.
 * --------------------------------------------------------------------- */
function datoLetra(o, letras) {                       // busca "a = 3" respetando mayúsculas (texto original)
  for (const L_ of letras) { const m = o.match(new RegExp(`(?:^|[^A-Za-zα-ω])${L_}\\s*=\\s*(\\d+(?:[.,]\\d+)?(?:\\/\\d+)?)\\s*(°|º)?(?:\\s*(\\d+)\\s*['′])?`)); if (m) { let q = numDe(m[1]); if (m[3]) q = q.add(numDe(m[3]).div(QE(60))); return q; } }
  return null;
}
const fx = x => L_x(x), Lgx = x => (Math.abs(x - Math.round(x)) < 1e-9 ? `${Math.round(x)}^{\\circ}` : `${Lgr(x)}\\approx ${gms(x)}`);
function resolverRectangulo(texto) {
  const o = texto, t = plano(o), u = unidadDe(t), { pasos, P } = crearPasos();
  let a = datoLetra(o, ['a']) || dato(t, ['cateto a', 'cateto opuesto']), b = datoLetra(o, ['b']) || dato(t, ['cateto b', 'cateto adyacente']), c = datoLetra(o, ['c']) || dato(t, ['hipotenusa']);
  let al = datoLetra(o, ['α', 'alfa', 'A']) || dato(t, ['alfa', 'angulo']), be = datoLetra(o, ['β', 'beta', 'B']) || dato(t, ['beta']);
  [a, b, c, al, be] = [a, b, c, al, be].map(q => (q ? q.num() : null));
  const nl = [a, b, c].filter(x => x !== null).length, na = [al, be].filter(x => x !== null).length;
  if (nl + na < 2 || nl === 0) throw new Error('Necesito dos datos y al menos uno tiene que ser un lado. Ejemplo: “triángulo rectángulo con a = 3 y b = 4” o “hipotenusa c = 10 y α = 30°”.');
  if (c !== null && ((a !== null && a >= c) || (b !== null && b >= c))) throw new Error('La hipotenusa tiene que ser el lado más largo.');
  P('Anotamos los datos', 'El ángulo recto está en C. El cateto a es opuesto al ángulo α, el cateto b es opuesto a β (y adyacente a α) y c es la hipotenusa.', [a, b, c].map((v, i) => (v !== null ? `${'abc'[i]}=${fx(v)}${Lu(u)}` : '')).concat([al !== null ? `\\alpha=${Lgx(al)}` : '', be !== null ? `\\beta=${Lgx(be)}` : '']).filter(Boolean).join(',\\quad '));
  const R = Math.PI / 180, soh = `${sen}\\,\\alpha=\\frac{\\text{opuesto}}{\\text{hipotenusa}},\\quad\\cos\\alpha=\\frac{\\text{adyacente}}{\\text{hipotenusa}},\\quad ${tg}\\,\\alpha=\\frac{\\text{opuesto}}{\\text{adyacente}}`;
  if (na) {
    if (al === null) { al = 90 - be; P('Calculamos α', 'Los ángulos agudos de un triángulo rectángulo suman 90°.', `\\alpha=90^{\\circ}-${Lgx(be)}=${Lgx(al)}`); } else { be = 90 - al; P('Calculamos β', 'Los ángulos agudos de un triángulo rectángulo suman 90°.', `\\beta=90^{\\circ}-${Lgx(al)}=${Lgx(be)}`); }
    if (a !== null) { c = a / Math.sin(al * R); b = a / Math.tan(al * R); P('Calculamos los otros lados', 'Conocemos el cateto opuesto a α: con el seno obtenemos la hipotenusa y con la tangente, el cateto adyacente.', [soh, `c=\\frac{a}{${sen}\\,\\alpha}=\\frac{${fx(a)}}{${sen}\\,${Lgr(al)}}\\approx ${fx(c)}`, `b=\\frac{a}{${tg}\\,\\alpha}=\\frac{${fx(a)}}{${tg}\\,${Lgr(al)}}\\approx ${fx(b)}`]); }
    else if (b !== null) { a = b * Math.tan(al * R); c = b / Math.cos(al * R); P('Calculamos los otros lados', 'Conocemos el cateto adyacente a α: con la tangente sale el opuesto y con el coseno, la hipotenusa.', [soh, `a=b\\cdot ${tg}\\,\\alpha=${fx(b)}\\cdot ${tg}\\,${Lgr(al)}\\approx ${fx(a)}`, `c=\\frac{b}{\\cos\\alpha}=\\frac{${fx(b)}}{\\cos ${Lgr(al)}}\\approx ${fx(c)}`]); }
    else { a = c * Math.sin(al * R); b = c * Math.cos(al * R); P('Calculamos los catetos', 'Conocemos la hipotenusa: el cateto opuesto sale con el seno y el adyacente, con el coseno.', [soh, `a=c\\cdot ${sen}\\,\\alpha=${fx(c)}\\cdot ${sen}\\,${Lgr(al)}\\approx ${fx(a)}`, `b=c\\cdot\\cos\\alpha=${fx(c)}\\cdot\\cos ${Lgr(al)}\\approx ${fx(b)}`]); }
  } else {
    if (c === null) { c = Math.hypot(a, b); P('Calculamos la hipotenusa', 'Con los dos catetos usamos el teorema de Pitágoras.', `c=\\sqrt{${fx(a)}^{2}+${fx(b)}^{2}}\\approx ${fx(c)}`); }
    else if (a === null) { a = Math.sqrt(c * c - b * b); P('Calculamos el cateto a', 'Despejamos de Pitágoras.', `a=\\sqrt{${fx(c)}^{2}-${fx(b)}^{2}}\\approx ${fx(a)}`); }
    else if (b === null) { b = Math.sqrt(c * c - a * a); P('Calculamos el cateto b', 'Despejamos de Pitágoras.', `b=\\sqrt{${fx(c)}^{2}-${fx(a)}^{2}}\\approx ${fx(b)}`); }
    al = Math.atan(a / b) / R; be = 90 - al;
    P('Calculamos los ángulos', 'Con los dos catetos usamos la tangente y su función inversa (en la calculadora: SHIFT tan).', [soh, `${tg}\\,\\alpha=\\frac{${fx(a)}}{${fx(b)}}\\;\\Rightarrow\\;\\alpha=${Lgx(al)}`, `\\beta=90^{\\circ}-\\alpha=${Lgx(be)}`]);
  }
  P('Área y perímetro', 'Los catetos son base y altura del triángulo.', [`A=\\frac{a\\cdot b}{2}\\approx ${fx(a * b / 2)}${Lu(u, 2)}`, `P=a+b+c\\approx ${fx(a + b + c)}${Lu(u)}`], svgTri(a, b, c, { A: 'B', B: 'A', C: 'C', a: 'b', b: 'a', c: 'c' }));
  P('Verificamos', 'Tiene que cumplirse Pitágoras y los ángulos tienen que sumar 180°.', [`a^2+b^2\\approx ${fx(a * a + b * b)}=c^2\\approx ${fx(c * c)}\\;${aproxIgual(a * a + b * b, c * c) ? '\\checkmark' : ''}`, `\\alpha+\\beta+90^{\\circ}=${fmtX(al + be + 90, 6)}^{\\circ}\\;\\checkmark`]);
  return { tema: 'rectangulos', metodo: 'Razones trigonométricas y Pitágoras', pasos, resultado: `a\\approx ${fx(a)},\\;b\\approx ${fx(b)},\\;c\\approx ${fx(c)},\\;\\alpha=${Lgr(al)},\\;\\beta=${Lgr(be)}` };
}

/* -----------------------------------------------------------------------
 * T15. TRIÁNGULOS OBLICUÁNGULOS (teoremas del seno y del coseno)
 * Lados a, b, c opuestos a los ángulos A, B, C (o α, β, γ).
 * --------------------------------------------------------------------- */
function resolverOblicuangulo(texto) {
  const o = texto, u = unidadDe(plano(o)), { pasos, P } = crearPasos(), R = Math.PI / 180;
  let L_ = { a: datoLetra(o, ['a']), b: datoLetra(o, ['b']), c: datoLetra(o, ['c']) }, G = { A: datoLetra(o, ['A', 'α', 'alfa']), B: datoLetra(o, ['B', 'β', 'beta']), C: datoLetra(o, ['C', 'γ', 'gamma']) };
  for (const k in L_) L_[k] = L_[k] ? L_[k].num() : null; for (const k in G) G[k] = G[k] ? G[k].num() : null;
  const nl = Object.values(L_).filter(x => x !== null).length, na = Object.values(G).filter(x => x !== null).length;
  if (nl + na < 3 || nl === 0) throw new Error('Necesito tres datos y al menos un lado. Ejemplo: “a = 7, b = 5, C = 60°” o “a = 5, b = 6, c = 7”. Los lados van en minúscula y cada ángulo en mayúscula, opuesto a su lado.');
  const lista = [...'abc'].filter(k => L_[k] !== null).map(k => `${k}=${fx(L_[k])}`).concat([...'ABC'].filter(k => G[k] !== null).map(k => `\\hat{${k}}=${Lgx(G[k])}`));
  P('Anotamos los datos', 'Cada lado está enfrente del ángulo con la misma letra: a frente a A, b frente a B y c frente a C.', lista.join(',\\quad '));
  const cos = `\\text{teorema del coseno: } a^2=b^2+c^2-2bc\\cos\\hat{A}`, senT = `\\text{teorema del seno: }\\frac{a}{${sen}\\hat{A}}=\\frac{b}{${sen}\\hat{B}}=\\frac{c}{${sen}\\hat{C}}`;
  const op = { a: 'A', b: 'B', c: 'C', A: 'a', B: 'b', C: 'c' }, otros = k => [...'abc'].filter(x => x !== k);
  let caso, alternativas = [];
  if (na >= 2) {
    caso = 'Dos ángulos y un lado (teorema del seno)';
    const falta = [...'ABC'].find(k => G[k] === null); if (falta) { G[falta] = 180 - [...'ABC'].filter(k => k !== falta).reduce((s, k) => s + G[k], 0); if (G[falta] <= 0) throw new Error('Los ángulos suman 180° o más.'); P(`Calculamos el ángulo ${falta}`, 'Los tres ángulos suman 180°.', `\\hat{${falta}}=180^{\\circ}-${[...'ABC'].filter(k => k !== falta).map(k => Lgx(G[k])).join('-')}=${Lgx(G[falta])}`); }
    const k0 = [...'abc'].find(k => L_[k] !== null), razon = L_[k0] / Math.sin(G[op[k0]] * R);
    const nuevos = [...'abc'].filter(k => L_[k] === null); nuevos.forEach(k => { L_[k] = razon * Math.sin(G[op[k]] * R); });
    P('Usamos el teorema del seno', 'Los lados son proporcionales a los senos de sus ángulos opuestos.', [senT, ...nuevos.map(k => `${k}=\\frac{${k0}\\cdot ${sen}\\hat{${op[k]}}}{${sen}\\hat{${op[k0]}}}=\\frac{${fx(L_[k0])}\\cdot ${sen}\\,${Lgr(G[op[k]])}}{${sen}\\,${Lgr(G[op[k0]])}}\\approx ${fx(L_[k])}`)]);
  } else if (nl === 3) {
    caso = 'Tres lados (teorema del coseno)';
    const { a, b, c } = L_; if (a + b <= c || a + c <= b || b + c <= a) throw new Error('Con esos lados no se puede armar un triángulo (desigualdad triangular).');
    G.A = Math.acos((b * b + c * c - a * a) / (2 * b * c)) / R; G.B = Math.acos((a * a + c * c - b * b) / (2 * a * c)) / R; G.C = 180 - G.A - G.B;
    P('Usamos el teorema del coseno', 'Despejamos el coseno de cada ángulo: $\\cos\\hat{A} = \\frac{b^2 + c^2 - a^2}{2bc}$ (y lo mismo para los otros).', [cos, `\\cos\\hat{A}=\\frac{${fx(b)}^{2}+${fx(c)}^{2}-${fx(a)}^{2}}{2\\cdot ${fx(b)}\\cdot ${fx(c)}}\\;\\Rightarrow\\;\\hat{A}=${Lgx(G.A)}`, `\\cos\\hat{B}=\\frac{${fx(a)}^{2}+${fx(c)}^{2}-${fx(b)}^{2}}{2\\cdot ${fx(a)}\\cdot ${fx(c)}}\\;\\Rightarrow\\;\\hat{B}=${Lgx(G.B)}`, `\\hat{C}=180^{\\circ}-\\hat{A}-\\hat{B}=${Lgx(G.C)}`]);
  } else {
    const kA = [...'ABC'].find(k => G[k] !== null), lk = op[kA];
    if (L_[lk] === null) {
      caso = 'Dos lados y el ángulo comprendido (teorema del coseno)';
      const [p, q] = otros(lk); L_[lk] = Math.sqrt(L_[p] ** 2 + L_[q] ** 2 - 2 * L_[p] * L_[q] * Math.cos(G[kA] * R));
      P(`Calculamos el lado ${lk}`, `El ángulo ${kA} está entre los lados ${p} y ${q}: usamos el teorema del coseno.`, [cos, `${lk}^2=${fx(L_[p])}^{2}+${fx(L_[q])}^{2}-2\\cdot ${fx(L_[p])}\\cdot ${fx(L_[q])}\\cdot\\cos ${Lgr(G[kA])}\\;\\Rightarrow\\;${lk}\\approx ${fx(L_[lk])}`]);
      const k2 = L_[p] < L_[q] ? p : q; G[op[k2]] = Math.asin(L_[k2] * Math.sin(G[kA] * R) / L_[lk]) / R; const k3 = k2 === p ? q : p; G[op[k3]] = 180 - G[kA] - G[op[k2]];
      P('Calculamos los ángulos', `Con el teorema del seno calculamos el ángulo opuesto al lado más chico (así seguro es agudo) y el último por diferencia.`, [senT, `${sen}\\hat{${op[k2]}}=\\frac{${fx(L_[k2])}\\cdot ${sen}\\,${Lgr(G[kA])}}{${fx(L_[lk])}}\\;\\Rightarrow\\;\\hat{${op[k2]}}=${Lgx(G[op[k2]])}`, `\\hat{${op[k3]}}=180^{\\circ}-${Lgr(G[kA])}-${Lgr(G[op[k2]])}=${Lgx(G[op[k3]])}`]);
    } else {
      caso = 'Dos lados y un ángulo opuesto (caso ambiguo)';
      const k2 = otros(lk).find(k => L_[k] !== null), s2 = L_[k2] * Math.sin(G[kA] * R) / L_[lk];
      P('Usamos el teorema del seno', `Conocemos ${lk} y su ángulo opuesto ${kA}: calculamos el seno del ángulo opuesto a ${k2}. Ojo: es el caso ambiguo, puede haber 0, 1 o 2 triángulos.`, [senT, `${sen}\\hat{${op[k2]}}=\\frac{${fx(L_[k2])}\\cdot ${sen}\\,${Lgr(G[kA])}}{${fx(L_[lk])}}\\approx ${fx(s2)}`]);
      if (s2 > 1 + 1e-12) { P('Analizamos', 'El seno daría mayor que 1: no existe ningún triángulo con esos datos.', `${fx(s2)}>1`); return { tema: 'oblicuangulos', metodo: caso, pasos, resultado: tx('No existe el triángulo') }; }
      const g1 = Math.asin(Math.min(1, s2)) / R, g2 = 180 - g1, dos = g2 + G[kA] < 180 - 1e-9 && Math.abs(g1 - g2) > 1e-9;
      if (dos) alternativas = [g2];
      G[op[k2]] = g1; const k3 = otros(lk).find(k => k !== k2); G[op[k3]] = 180 - G[kA] - g1; L_[k3] = L_[lk] * Math.sin(G[op[k3]] * R) / Math.sin(G[kA] * R);
      P('Elegimos el ángulo y completamos', dos ? `Hay dos ángulos con ese seno: ${fmtX(g1, 2)}° y ${fmtX(g2, 2)}°, y los dos sirven: hay dos triángulos posibles. Resolvemos el primero y abajo mostramos el otro.` : 'Solo uno de los ángulos posibles deja lugar para el tercero: hay un único triángulo.', [`\\hat{${op[k2]}}=${Lgx(g1)}`, `\\hat{${op[k3]}}=180^{\\circ}-${Lgr(G[kA])}-${Lgr(g1)}=${Lgx(G[op[k3]])}`, `${k3}=\\frac{${fx(L_[lk])}\\cdot ${sen}\\,${Lgr(G[op[k3]])}}{${sen}\\,${Lgr(G[kA])}}\\approx ${fx(L_[k3])}`]);
      if (dos) { const B2 = g2, C2 = 180 - G[kA] - B2, l3 = L_[lk] * Math.sin(C2 * R) / Math.sin(G[kA] * R); P('Segundo triángulo posible', 'Con el otro ángulo también se forma un triángulo.', `\\hat{${op[k2]}}=${Lgx(B2)},\\quad\\hat{${op[k3]}}=${Lgx(C2)},\\quad ${k3}\\approx ${fx(l3)}`); }
    }
  }
  const { a, b, c } = L_, area = a * b * Math.sin(G.C * R) / 2;
  P('Calculamos el área', 'Con dos lados y el ángulo comprendido: $A = \\frac{1}{2}\\,a\\,b\\,\\operatorname{sen}\\hat{C}$.', `A=\\frac{1}{2}\\cdot ${fx(a)}\\cdot ${fx(b)}\\cdot ${sen}\\,${Lgr(G.C)}\\approx ${fx(area)}${Lu(u, 2)}`, svgTri(a, b, c));
  const r1 = a / Math.sin(G.A * R), r2 = b / Math.sin(G.B * R), r3 = c / Math.sin(G.C * R);
  P('Verificamos', 'Los ángulos tienen que sumar 180° y los tres cocientes del teorema del seno tienen que dar lo mismo.', [`\\hat{A}+\\hat{B}+\\hat{C}=${fmtX(G.A + G.B + G.C, 6)}^{\\circ}\\;\\checkmark`, `\\frac{a}{${sen}\\hat{A}}\\approx ${fx(r1)},\\;\\frac{b}{${sen}\\hat{B}}\\approx ${fx(r2)},\\;\\frac{c}{${sen}\\hat{C}}\\approx ${fx(r3)}\\;${aproxIgual(r1, r2) && aproxIgual(r2, r3) ? '\\checkmark' : ''}`]);
  return { tema: 'oblicuangulos', metodo: caso, pasos, resultado: `a\\approx ${fx(a)},\\;b\\approx ${fx(b)},\\;c\\approx ${fx(c)},\\;\\hat{A}=${Lgr(G.A)},\\;\\hat{B}=${Lgr(G.B)},\\;\\hat{C}=${Lgr(G.C)}` + (alternativas.length ? `\\;${tx('(hay otra solución)')}` : '') };
}

/* -----------------------------------------------------------------------
 * T16. FORMA TRIGONOMÉTRICA DE LOS NÚMEROS COMPLEJOS
 * --------------------------------------------------------------------- */
const LtrigC = (rL, thL) => `${rL}\\left(\\cos ${thL}+i\\,${sen}\\,${thL}\\right)`;
function aPolar(z) {                               // z = C (complejo exacto) → módulo exacto (RN) y argumento en grados
  const r2 = z.norma(), rr = raizRN(r2); let th = Math.atan2(z.im.num(), z.re.num()) * 180 / Math.PI; if (th < 0) th += 360; if (Math.abs(th - Math.round(th)) < 1e-9) th = Math.round(th);
  return { r2, r: rr, th };
}
const LthG = th => (Number.isInteger(th) ? `${th}^{\\circ}` : Lgr(th));
function binomicaRN(rRN, th) {                     // r·(cos θ + i sen θ) exacto si θ es notable
  const e = senCosRN(th); if (!e) return null;
  const re = rRN.mul(e.c), im = rRN.mul(e.s); const Lim = im.m.size ? (im.num() < 0 ? '-' : '+') + (im.esQ() && (im.m.get(1n) || Q0).abs().eq(Q1) ? '' : im.num() < 0 ? im.neg().L() : im.L()) + 'i' : '';
  return { L: (re.m.size ? re.L() : (im.m.size ? '' : '0')) + (re.m.size ? Lim : Lim.replace(/^\+/, '')), re: re.num(), im: im.num() };
}
function leerComplejoTrig(s) {                    // "2(cos 30° + i sen 30°)" o "2_{30°}"
  const m = s.match(/(\d+(?:[.,]\d+)?(?:\/\d+)?)?\s*\(?\s*cos\s*\(?([^+)]*?)\)?\s*\+\s*i\s*\.?\s*(?:sen|sin)\s*\(?([^)]*?)\)/i); if (!m) return null;
  const r = m[1] ? numDe(m[1]) : Q1, th = leerGrados(m[2]); if (th === null) return null; return { r, th: th.num() };
}
function resolverComplejosTrig(texto) {
  const t = plano(texto), { pasos, P } = crearPasos();
  const trigs = [...texto.matchAll(/(\d+(?:[.,]\d+)?(?:\/\d+)?)?\s*\(\s*cos[^)]*\)/gi)].map(m => leerComplejoTrig(m[0])).filter(Boolean);
  if (trigs.length >= 2) {
    const [z1, z2] = trigs, div = /cociente|dividir|division|\/|:/.test(t), r = div ? z1.r.div(z2.r) : z1.r.mul(z2.r), th = ((div ? z1.th - z2.th : z1.th + z2.th) % 360 + 360) % 360;
    P('Escribimos los números en forma trigonométrica', 'Cada uno tiene su módulo r y su argumento θ.', [`z_1=${LtrigC(L_frac(z1.r), LthG(z1.th))}`, `z_2=${LtrigC(L_frac(z2.r), LthG(z2.th))}`]);
    P(div ? 'Dividimos' : 'Multiplicamos', div ? 'Para dividir en forma trigonométrica se dividen los módulos y se restan los argumentos.' : 'Para multiplicar en forma trigonométrica se multiplican los módulos y se suman los argumentos.', `${div ? 'z_1:z_2' : 'z_1\\cdot z_2'}=${LtrigC(L_frac(r), LthG(th))}`);
    const b = binomicaRN(RN.q(r), th), x1 = z1.r.num() * Math.cos(z1.th * Math.PI / 180), y1 = z1.r.num() * Math.sin(z1.th * Math.PI / 180), x2 = z2.r.num() * Math.cos(z2.th * Math.PI / 180), y2 = z2.r.num() * Math.sin(z2.th * Math.PI / 180);
    const re = div ? (x1 * x2 + y1 * y2) / (x2 * x2 + y2 * y2) : x1 * x2 - y1 * y2, im = div ? (y1 * x2 - x1 * y2) / (x2 * x2 + y2 * y2) : x1 * y2 + y1 * x2;
    P('Verificamos', 'Pasamos todo a forma binómica y hacemos la cuenta de la manera común: tiene que dar lo mismo.', `${b ? b.L : `${fx(r.num() * Math.cos(th * Math.PI / 180))}+${fx(r.num() * Math.sin(th * Math.PI / 180))}i`}\\approx ${fx(re)}${im < 0 ? '' : '+'}${fx(im)}i\\;${aproxIgual(re, r.num() * Math.cos(th * Math.PI / 180)) && aproxIgual(im, r.num() * Math.sin(th * Math.PI / 180)) ? '\\checkmark' : ''}`);
    return { tema: 'complejost', metodo: div ? 'Cociente en forma trigonométrica' : 'Producto en forma trigonométrica', pasos, resultado: LtrigC(L_frac(r), LthG(th)) + (b ? `=${b.L}` : '') };
  }
  const rz = t.match(/raices?\s*(cuadradas|cubicas|cuartas|quintas|sextas|(\d+)\s*-?\s*esimas)/), nRaiz = rz ? ({ cuadradas: 2, cubicas: 3, cuartas: 4, quintas: 5, sextas: 6 }[rz[1]] || +rz[2]) : null;
  const pw = texto.match(/\)\s*\^\s*\(?(\d+)\)?\s*$/), nPot = pw ? +pw[1] : null;
  const cuerpo = texto.replace(/^.*?(?:de|del)\s+(?=[-(\d√i])/i, '').replace(/\^\s*\(?\d+\)?\s*$/, '').replace(/^\s*\(|\)\s*$/g, '').replace(/^.*?(forma trigonometrica|forma polar)\s*(de)?\s*:?\s*/i, '');
  let z; try { z = aComplejo(exprAlg(cuerpo.trim())); } catch (e) { throw new Error('Escribí el número en forma binómica (por ejemplo 1 + i, −2 + 2√3 i no: usá 1 + i, 3 − 3i, 8i) o en forma trigonométrica 2(cos 30° + i sen 30°).'); }
  const { r2, r, th } = aPolar(z);
  P('Ubicamos el número en el plano', 'Un complejo a + bi es el punto (a ; b). Su módulo es la distancia al origen y su argumento, el ángulo con el semieje real positivo.', `z=${L_C(z)}`, svgGeo({ pts: [[z.re.num(), z.im.num(), 'z']], segs: [[0, 0, z.re.num(), z.im.num()]] }));
  P('Calculamos módulo y argumento', 'El módulo sale con Pitágoras. El argumento con la tangente (b/a), mirando en qué cuadrante está el punto.', [`r=\\sqrt{${Lp(z.re)}^{2}+${Lp(z.im)}^{2}}=\\sqrt{${L_frac(r2)}}=${r.L()}`, `\\theta=${LthG(th)}`]);
  P('Escribimos la forma trigonométrica', 'z = r·(cos θ + i sen θ). En forma polar abreviada: r con el ángulo como subíndice.', [`z=${LtrigC(r.L(), LthG(th))}`, `z=${r.L()}_{${LthG(th)}}`]);
  let res = LtrigC(r.L(), LthG(th)), metodo = 'Pasaje a forma trigonométrica';
  if (nPot) {
    const rn = r.pow(nPot), thn = ((th * nPot) % 360 + 360) % 360, b = binomicaRN(rn, thn);
    P('Aplicamos la fórmula de De Moivre', 'Para elevar a la n: el módulo se eleva a la n y el argumento se multiplica por n (después lo llevamos a una vuelta).', [`z^{${nPot}}=\\left(${r.L()}\\right)^{${nPot}}\\left(\\cos(${nPot}\\cdot ${LthG(th)})+i\\,${sen}(${nPot}\\cdot ${LthG(th)})\\right)`, `z^{${nPot}}=${LtrigC(rn.L(), LthG(thn))}${b ? '=' + b.L : ''}`]);
    const d = z.pow(nPot);
    P('Verificamos', 'Calculamos la potencia multiplicando en forma binómica.', `${par(L_C(z))}^{${nPot}}=${L_C(d)}\\;${b && aproxIgual(b.re, d.re.num()) && aproxIgual(b.im, d.im.num()) ? '\\checkmark' : ''}`);
    return { tema: 'complejost', metodo: 'Fórmula de De Moivre', pasos, resultado: `z^{${nPot}}=${b ? b.L : LtrigC(rn.L(), LthG(thn))}` };
  }
  if (nRaiz) {
    const rq = r2, mod = raizExacta(rq, 2 * nRaiz), modL = mod ? L_frac(mod) : `\\sqrt[${2 * nRaiz}]{${L_frac(rq)}}`, modN = Math.pow(rq.num(), 1 / (2 * nRaiz));
    const raices = Array.from({ length: nRaiz }, (_, k) => { const a = (th + 360 * k) / nRaiz, b = mod ? binomicaRN(RN.q(mod), a) : null; return { a, b, L: b ? b.L : `${fx(modN * Math.cos(a * Math.PI / 180))}${Math.sin(a * Math.PI / 180) < 0 ? '' : '+'}${fx(modN * Math.sin(a * Math.PI / 180))}i` }; });
    P('Aplicamos la fórmula de las raíces', `Las raíces ${nRaiz}-ésimas tienen módulo $\\sqrt[n]{r}$ y argumentos $\\frac{\\theta + 360^{\\circ} k}{n}$ con k = 0, 1, …, n − 1. Quedan repartidas en una circunferencia, separadas ${fmtX(360 / nRaiz, 2)}°.`, raices.map((w, k) => `w_{${k}}=${modL}_{${LthG(Math.round(w.a * 1e6) / 1e6)}}=${w.L}`), svgGeo({ circs: [{ h: 0, k: 0, r: modN }], polys: nRaiz > 2 ? [raices.map(w => [modN * Math.cos(w.a * Math.PI / 180), modN * Math.sin(w.a * Math.PI / 180)])] : [], pts: raices.map((w, k) => [modN * Math.cos(w.a * Math.PI / 180), modN * Math.sin(w.a * Math.PI / 180), 'w' + k]) }));
    const w0 = raices[0], re = modN * Math.cos(w0.a * Math.PI / 180), im = modN * Math.sin(w0.a * Math.PI / 180); let pr = re, pi = im; for (let i = 1; i < nRaiz; i++) { [pr, pi] = [pr * re - pi * im, pr * im + pi * re]; }
    P('Verificamos', `Elevamos la primera raíz a la ${nRaiz}: tiene que dar el número original.`, `w_0^{${nRaiz}}\\approx ${fx(pr)}${pi < 0 ? '' : '+'}${fx(pi)}i=${L_C(z)}\\;${aproxIgual(pr, z.re.num()) && aproxIgual(pi, z.im.num()) ? '\\checkmark' : ''}`);
    return { tema: 'complejost', metodo: 'Raíces n-ésimas', pasos, resultado: raices.map((w, k) => `w_{${k}}=${w.L}`).join(',\\;') };
  }
  const b = binomicaRN(r, th);
  P('Verificamos', 'Volvemos a forma binómica: a = r·cos θ y b = r·sen θ.', `${LtrigC(r.L(), LthG(th))}=${b ? b.L : fx(r.num() * Math.cos(th * Math.PI / 180)) + '+' + fx(r.num() * Math.sin(th * Math.PI / 180)) + 'i'}\\;${aproxIgual(r.num() * Math.cos(th * Math.PI / 180), z.re.num()) ? '\\checkmark' : ''}`);
  return { tema: 'complejost', metodo, pasos, resultado: res };
}

/* -----------------------------------------------------------------------
 * T17. DETECCIÓN DEL TEMA DE GEOMETRÍA Y TRIGONOMETRÍA
 * --------------------------------------------------------------------- */
const TEMAS_TRIG = {
  basicosg: 'Conceptos básicos', angulos: 'Ángulos', paralelas: 'Rectas paralelas y perpendiculares', triangulos: 'Triángulos', cuadrilateros: 'Cuadriláteros', poligonos: 'Polígonos', transfg: 'Transformaciones',
  circulo: 'Circunferencia y círculo', perimetros: 'Perímetros y superficies', cuerpos: 'Cuerpos geométricos', areas: 'Áreas', volumenes: 'Volúmenes', funciones: 'Funciones trigonométricas',
  notables: 'Ángulos notables', graficas: 'Gráficas trigonométricas', identidades: 'Identidades y ecuaciones trigonométricas', rectangulos: 'Triángulos rectángulos', oblicuangulos: 'Triángulos oblicuángulos', complejost: 'Forma trigonométrica de los complejos'
};
const TRIGF = /\b(sen|sin|cos|tg|tan|cotg|cot|sec|cosec|csc)\b/;
const DETECTORES_TRIG = [
  { tema: 'complejost', test: (t, o) => /forma (trigonometrica|polar)|de moivre|raices? (cuadradas|cubicas|cuartas|quintas|sextas|\d+ ?-?esimas)|complejo/.test(t) || /\(\s*cos[^)]*\+\s*i/.test(t) || (/\bi\b/.test(t) && /\^\s*\d+\s*$/.test(t) && !/x/.test(t)), fn: resolverComplejosTrig },
  { tema: 'graficas', test: t => /grafic|amplitud|periodo|desfas|representa/.test(t) || /^\s*(y|f\s*\(\s*x\s*\))\s*=/.test(t) && TRIGF.test(t), fn: resolverGraficas },
  { tema: 'identidades', test: t => TRIGF.test(t) && /=/.test(t) && /\bx\b|\(x\)/.test(t) && !/°/.test(t), fn: resolverIdentidades },
  { tema: 'funciones', test: t => /cuadrante/.test(t) || /razones trigonometricas/.test(t), fn: resolverFunciones },
  { tema: 'notables', test: t => TRIGF.test(t) && /°|π|pi\b/.test(t) && !/=/.test(t), fn: o => { try { return resolverNotables(o); } catch (e) { if (/no es un angulo notable/i.test(plano(e.message))) { const r = resolverFunciones(o); return r; } throw e; } } },
  { tema: 'rectangulos', test: t => /triangulo rectangulo|cateto|hipotenusa/.test(t), fn: resolverRectangulo },
  { tema: 'oblicuangulos', test: (t, o) => /oblicuang|teorema del (seno|coseno)/.test(t) || ((o.match(/(^|[^A-Za-z])[abc]\s*=/g) || []).length + (o.match(/(^|[^A-Za-z])[ABCαβγ]\s*=/g) || []).length >= 3), fn: resolverOblicuangulo },
  { tema: 'transfg', test: t => /trasladar|traslacion|rotar|rotacion|girar|simetri|reflej|homotecia/.test(t), fn: resolverTransfG },
  { tema: 'volumenes', test: t => /volumen|capacidad|cuantos litros/.test(t), fn: resolverVolumenes },
  { tema: 'areas', test: t => /(area|superficie)\s*(lateral|total)/.test(t) || (/area|superficie/.test(t) && /cubo|prisma|cilindro|cono|esfera|piramide|ortoedro/.test(t)), fn: resolverAreasCuerpos },
  { tema: 'cuerpos', test: t => /caras|aristas|vertices|euler|poliedro|prisma|piramide|tetraedro|octaedro|dodecaedro|icosaedro|hexaedro|cubo|cilindro|cono|esfera/.test(t), fn: resolverCuerpos },
  { tema: 'circulo', test: t => /circunferencia|circulo|sector|arco|corona|inscripto|angulo central/.test(t), fn: resolverCirculo },
  { tema: 'perimetros', test: t => /perimetro|area|superficie/.test(t), fn: resolverPerimetros },
  { tema: 'perimetros', test: t => /\b(rombo|trapecio|romboide|paralelogramo|cuadrado|rectangulo|pentagono|hexagono|heptagono|octogono|decagono)\b/.test(t) && /\b(lado|base|altura|diagonales|apotema)\b/.test(t) && !/diagonal (del|de un|de la)|angulo/.test(t), fn: resolverPerimetros },
  { tema: 'poligonos', test: t => /poligono|pentagono|hexagono|heptagono|octogono|octagono|eneagono|decagono|dodecagono|diagonales|cuantos lados/.test(t), fn: resolverPoligonos },
  { tema: 'cuadrilateros', test: t => /cuadrilatero|paralelogramo|trapecio|rombo|romboide|cuadrado|rectangulo/.test(t), fn: resolverCuadrilateros },
  { tema: 'triangulos', test: t => /triangulo/.test(t), fn: resolverTriangulos },
  { tema: 'paralelas', test: t => /paralel|perpendicular|transversal|secante|alternos|correspondientes|conjugados|colaterales|opuestos por el vertice/.test(t), fn: resolverParalelas },
  { tema: 'angulos', test: t => /angulo|complement|suplement|°|grados|radian|sexagesimal|π|\bpi\b/.test(t), fn: resolverAngulos },
  { tema: 'basicosg', test: t => /segmento|punto medio|consecutiv|alineados|\bab\b|\bbc\b/.test(t), fn: resolverConceptosG }
];
const FORZAR_TRIG = { basicosg: resolverConceptosG, angulos: resolverAngulos, paralelas: resolverParalelas, triangulos: resolverTriangulos, cuadrilateros: resolverCuadrilateros, poligonos: resolverPoligonos, transfg: resolverTransfG, circulo: resolverCirculo, perimetros: resolverPerimetros, cuerpos: resolverCuerpos, areas: resolverAreasCuerpos, volumenes: resolverVolumenes, funciones: resolverFunciones, notables: resolverNotables, graficas: resolverGraficas, identidades: resolverIdentidades, rectangulos: resolverRectangulo, oblicuangulos: resolverOblicuangulo, complejost: resolverComplejosTrig };
function resolverTrig(texto, temaForzado) {
  const o = texto.trim(); if (!o) throw new Error('Escribí un ejercicio.');
  const t = plano(o);
  if (temaForzado) { const d = DETECTORES_TRIG.find(x => x.tema === temaForzado && x.test(t, o)); const r = (d ? d.fn : FORZAR_TRIG[temaForzado])(o); return r; }
  for (const d of DETECTORES_TRIG) { let ok = false; try { ok = d.test(t, o); } catch (e) { ok = false; } if (ok) return d.fn(o); }
  throw new Error('No reconocí el ejercicio. Probá con: “complemento de 35° 20\'”, “área del rectángulo de base 8 y altura 3”, “sen 30° + cos 60°” o “triángulo rectángulo con a = 3 y b = 4”.');
}
function detectarTemaTrig(texto) { const t = plano(texto.trim()); if (!t) return null; for (const d of DETECTORES_TRIG) { try { if (d.test(t, texto)) return d.tema; } catch (e) { /* sigue */ } } return null; }
/* MOTOR-TRIGONOMETRIA-FIN ================================================ */

// Aviso para la interfaz: este motor ya está cargado (se cargan a medida que se eligen las áreas)
(window.MPP_MOTORES = window.MPP_MOTORES || {}).trig = true;
