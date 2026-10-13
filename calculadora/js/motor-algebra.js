/* =======================================================================
 * MOTOR: ÁLGEBRA
 * Polinomios, factorización, ecuaciones, sistemas, matrices, complejos… Necesita motor-aritmetica.js.
 * Es lógica pura (no toca la página): recibe texto y devuelve
 * { tema, metodo, pasos, resultado, alternativas }.
 * ===================================================================== */
'use strict';
/* MOTOR-ALGEBRA-INICIO ===================================================
 * Álgebra. Usa las herramientas del motor de aritmética de arriba
 * (racionales Q, formato LaTeX, crearPasos, tabla...).
 * ====================================================================== */

/* -----------------------------------------------------------------------
 * A1. MONOMIOS Y POLINOMIOS EN VARIAS LETRAS
 * Un monomio es { c: coeficiente Q, v: { x: 2, y: 1 } }.
 * Un polinomio es una lista de monomios. Puede tener términos semejantes
 * sin juntar (así podemos mostrar el paso "aplicamos distributiva").
 * --------------------------------------------------------------------- */
const mono = (c, v = {}) => ({ c, v: Object.fromEntries(Object.entries(v).filter(([, e]) => e !== 0)) });
const claveMono = v => Object.keys(v).sort().map(k => k + v[k]).join('');
const gradoMono = m => Object.values(m.v).reduce((s, e) => s + e, 0);
function mulMono(a, b) { const v = { ...a.v }; for (const k in b.v) v[k] = (v[k] || 0) + b.v[k]; return mono(a.c.mul(b.c), v); }
function cmpMono(a, b) {
  const d = gradoMono(b) - gradoMono(a); if (d) return d;
  for (const k of [...new Set([...Object.keys(a.v), ...Object.keys(b.v)])].sort()) { const e = (b.v[k] || 0) - (a.v[k] || 0); if (e) return e; }
  return 0;
}
const Pc = q => (q.cero ? [] : [mono(q)]);
const Pv = x => [mono(Q1, { [x]: 1 })];
const Padd = (a, b) => [...a, ...b];
const Pneg = a => a.map(m => mono(m.c.neg(), m.v));
const Psub = (a, b) => Padd(a, Pneg(b));
const Pmul = (a, b) => { const r = []; for (const x of a) for (const y of b) r.push(mulMono(x, y)); return r; };
function Pred(a) {                                   // junta semejantes, saca ceros y ordena
  const m = new Map();
  for (const t of a) { const k = claveMono(t.v), p = m.get(k); m.set(k, p ? mono(p.c.add(t.c), t.v) : mono(t.c, t.v)); }
  return [...m.values()].filter(t => !t.c.cero).sort(cmpMono);
}
function Ppow(a, n) { let r = Pc(Q1); for (let i = 0; i < n; i++) r = Pred(Pmul(r, a)); return r; }
const Pscale = (a, q) => a.map(m => mono(m.c.mul(q), m.v));
const Pvars = a => [...new Set(a.flatMap(m => Object.keys(m.v)))].sort();
const Pgrado = a => (a.length ? Math.max(...a.map(gradoMono)) : -Infinity);
const Peq = (a, b) => { const x = Pred(Psub(a, b)); return x.length === 0; };
function Peval(a, val) {
  let s = Q0;
  for (const m of a) { let t = m.c; for (const k in m.v) { if (!val[k]) throw new Error(`Falta el valor de ${k}.`); t = t.mul(val[k].pow(m.v[k])); } s = s.add(t); }
  return s;
}
const PevalN = (a, val) => a.reduce((s, m) => s + m.c.num() * Object.entries(m.v).reduce((p, [k, e]) => p * val[k] ** e, 1), 0);
// LaTeX de un monomio y de un polinomio
function L_mono(m, primero) {
  const neg = m.c.n < 0n, a = m.c.abs();
  const vars = Object.keys(m.v).sort().map(k => (m.v[k] === 1 ? k : `${k}^{${m.v[k]}}`)).join('');
  const coef = vars && a.eq(Q1) ? '' : L_frac(a);
  return (primero ? (neg ? '-' : '') : (neg ? '-' : '+')) + coef + vars;
}
const L_P = p => (p.length ? p.map((m, i) => L_mono(m, i === 0)).join('') : '0');
const L_Pp = p => (p.length > 1 || (p.length === 1 && p[0].c.n < 0n) ? par(L_P(p)) : L_P(p));   // con paréntesis si hace falta
// Raíz cuadrada / cúbica de un monomio (si es exacta)
function raizMono(m, k) {
  const c = raizExacta(m.c, k); if (!c) return null;
  const v = {}; for (const x in m.v) { if (m.v[x] % k) return null; v[x] = m.v[x] / k; }
  return mono(c, v);
}

/* -----------------------------------------------------------------------
 * A2. POLINOMIOS EN UNA LETRA (para factorizar, dividir y buscar raíces)
 * Se guardan como lista de coeficientes de menor a mayor grado.
 * --------------------------------------------------------------------- */
const uTrim = p => { p = p.slice(); while (p.length > 1 && p[p.length - 1].cero) p.pop(); return p; };
const uGrado = p => { p = uTrim(p); return p.length === 1 && p[0].cero ? -Infinity : p.length - 1; };
const uAdd = (p, q) => uTrim(Array.from({ length: Math.max(p.length, q.length) }, (_, i) => (p[i] || Q0).add(q[i] || Q0)));
const uSub = (p, q) => uAdd(p, q.map(c => c.neg()));
const uMul = (p, q) => { const r = Array(p.length + q.length - 1).fill(Q0); p.forEach((a, i) => q.forEach((b, j) => { r[i + j] = r[i + j].add(a.mul(b)); })); return uTrim(r); };
const uEval = (p, x) => p.reduceRight((s, c) => s.mul(x).add(c), Q0);
function uDiv(p, d) {                                 // división larga: cociente y resto
  p = uTrim(p); d = uTrim(d); const gd = uGrado(d); if (gd < 0) throw new Error('No se puede dividir por el polinomio 0.');
  let r = p.slice(); const q = Array(Math.max(1, p.length - d.length + 1)).fill(Q0), pasos = [];
  while (uGrado(r) >= gd) {
    const k = uGrado(r) - gd, c = r[uGrado(r)].div(d[gd]); q[k] = c;
    const resta = Array(k).fill(Q0).concat(d.map(x => x.mul(c)));
    pasos.push({ c, k, resta: uTrim(resta) }); r = uSub(r, resta);
    if (pasos.length > 40) break;
  }
  return { q: uTrim(q), r: uTrim(r), pasos };
}
function uMcd(p, q) {                                 // máximo común divisor (mónico)
  p = uTrim(p); q = uTrim(q);
  while (uGrado(q) >= 0) { const r = uDiv(p, q).r; p = q; q = r; }
  const lc = p[uGrado(p)]; return lc && !lc.cero ? p.map(c => c.div(lc)) : p;
}
function aU(P, x) {                                    // Poly → coeficientes en x (o null si no es posible)
  const r = []; for (const m of Pred(P)) { const ks = Object.keys(m.v); if (ks.some(k => k !== x)) return null; const e = m.v[x] || 0; if (e < 0) return null; while (r.length <= e) r.push(Q0); r[e] = r[e].add(m.c); }
  return uTrim(r.length ? r : [Q0]);
}
const deU = (p, x) => Pred(p.map((c, i) => mono(c, i ? { [x]: i } : {})));
const L_U = (p, x) => L_P(deU(p, x));

/* -----------------------------------------------------------------------
 * A3. ANALIZADOR DE EXPRESIONES ALGEBRAICAS
 * Letras = variables. También entiende √, log, ln, valor absoluto y
 * comparaciones (=, <, >, ≤, ≥) para ecuaciones e inecuaciones.
 * --------------------------------------------------------------------- */
function lexAlg(src) {
  const s = src.replace(/[−–—]/g, '-').replace(/[·×*]/g, '*').replace(/÷/g, ':').replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/<=|=</g, '≤').replace(/>=|=>/g, '≥').replace(/!=/g, '≠').replace(/ra[ií]z|sqrt/gi, '√').replace(/√\[(\d+)\]/g, '√$1#')
    .replace(/[\[{]/g, '(').replace(/[\]}]/g, ')').replace(/\s+/g, '');
  const toks = []; let i = 0;
  while (i < s.length) {
    const r = s.slice(i); let m;
    if ((m = r.match(/^\d+(?:[.,]\d+)?/))) { toks.push({ t: 'num', q: leerDecimal(m[0]).q, raw: m[0] }); i += m[0].length; continue; }
    if ((m = r.match(/^√(?:(\d+)#)?/)) && m[0]) { toks.push({ t: 'raiz', k: m[1] ? +m[1] : 2 }); i += m[0].length; continue; }
    if ((m = r.match(/^log(?:_\(([^)]*)\)|_(\d+)|(\d+)(?=\())?/))) { toks.push({ t: 'log', base: m[1] || m[2] || m[3] || null }); i += m[0].length; continue; }
    if (r.startsWith('ln')) { toks.push({ t: 'log', base: 'e' }); i += 2; continue; }
    if (/^[a-zA-Z]/.test(r)) { toks.push({ t: 'var', n: r[0] }); i++; continue; }
    if ('+-*:/^()=<>≤≥≠|'.includes(r[0])) { toks.push({ t: r[0] === ':' ? '/' : r[0], dos: r[0] === ':' }); i++; continue; }
    throw new Error(`No reconozco “${r[0]}”.`);
  }
  const out = [];
  for (const tk of toks) {
    const p = out[out.length - 1];
    if (p && p.t === 'var' && tk.t === 'num') throw new Error('Hay un número pegado después de una letra. Escribí el número adelante (2x) o usá ^ para potencias (x^2).');
    if (p && (['num', 'var', ')'].includes(p.t) && ['var', '(', 'raiz', 'log'].includes(tk.t) || (p.t === ')' && tk.t === 'num'))) out.push({ t: '*', imp: true });
    out.push(tk);
  }
  return out;
}
function parseAlg(toks) {
  let i = 0; const ver = () => toks[i] && toks[i].t, sig = () => toks[i++];
  function expr() {
    const items = []; let op = '+';
    if (ver() === '+' || ver() === '-') op = sig().t;
    items.push({ op, e: term() });
    while (ver() === '+' || ver() === '-') { op = sig().t; items.push({ op, e: term() }); }
    if (items.length === 1) return items[0].op === '+' ? items[0].e : { t: 'neg', e: items[0].e };   // un solo término con signo menos
    return { t: 'add', items };
  }
  function term() {
    let a = unario();
    while (ver() === '*' || ver() === '/') { const tk = sig(), b = unario(); a = tk.t === '*' ? { t: 'mul', a, b, imp: tk.imp } : { t: 'div', a, b, dos: tk.dos }; }
    return a;
  }
  function unario() { if (ver() === '-') { sig(); return { t: 'neg', e: unario() }; } if (ver() === '+') { sig(); return unario(); } return potencia(); }
  function potencia() { const b = atomo(); if (ver() === '^') { sig(); return { t: 'pow', a: b, b: unario() }; } return b; }
  function atomo() {
    const tk = sig(); if (!tk) throw new Error('La expresión está incompleta.');
    switch (tk.t) {
      case 'num': return { t: 'num', q: tk.q, raw: tk.raw };
      case 'var': return { t: 'var', n: tk.n };
      case '(': { const e = expr(); if (ver() !== ')') throw new Error('Falta cerrar un paréntesis.'); sig(); return { t: 'par', e }; }
      case '|': { const e = expr(); if (ver() !== '|') throw new Error('Falta cerrar el valor absoluto.'); sig(); return { t: 'abs', e }; }
      case 'raiz': return { t: 'raiz', k: tk.k, e: atomo() };
      case 'log': return { t: 'log', base: tk.base === 'e' ? 'e' : tk.base ? leerDecimal(tk.base).q : null, e: atomo() };
    }
    throw new Error('Falta algo en la expresión.');
  }
  const e = expr();
  if (i < toks.length) { const t = toks[i].t; if (!'=<>≤≥≠'.includes(t)) throw new Error(t === ')' ? 'Hay un paréntesis de cierre de más.' : 'Sobra algo en la expresión.'); }
  return { e, resto: toks.slice(i) };
}
// Expresión completa (sin comparaciones)
function exprAlg(txt) { const { e, resto } = parseAlg(lexAlg(txt)); if (resto.length) throw new Error('Acá no va un signo igual ni una desigualdad.'); return e; }
// Ecuación o inecuación: { izq, op, der }
function relAlg(txt) {
  const toks = lexAlg(txt); const k = toks.findIndex(t => '=<>≤≥≠'.includes(t.t));
  if (k < 0) return null;
  const izq = parseAlg(toks.slice(0, k)), der = parseAlg(toks.slice(k + 1));
  if (izq.resto.length || !toks.slice(0, k).length || !toks.slice(k + 1).length) throw new Error('Revisá los dos miembros de la ecuación.');
  if (der.resto.length) {                                 // doble desigualdad: a < expr ≤ b
    const op2 = der.resto[0].t, ter = parseAlg(der.resto.slice(1));
    return { izq: izq.e, op: toks[k].t, der: der.e, op2, ter: ter.e };
  }
  return { izq: izq.e, op: toks[k].t, der: der.e };
}
const sinParA = e => (e.t === 'par' ? sinParA(e.e) : e);
// LaTeX de un árbol algebraico (como lo escribió el alumno)
function LA(e, sub) {
  const R = x => LA(x, sub);
  switch (e.t) {
    case 'num': return e.raw.replace(/[.,]/, '{,}');
    case 'var': return sub && sub[e.n] ? (sub[e.n].n < 0n || !sub[e.n].entero ? par(L_frac(sub[e.n])) : L_frac(sub[e.n])) : e.n;
    case 'par': return par(R(e.e));
    case 'neg': return '-' + R(e.e);
    case 'add': return e.items.map((it, k) => (k === 0 ? (it.op === '-' ? '-' : '') : it.op) + R(it.e)).join('');
    case 'mul': { const b = sinParA(e.b), a = sinParA(e.a); const juntar = !sub && e.imp && (b.t === 'var' || e.b.t === 'par' || b.t === 'pow' && sinParA(b.a).t === 'var' || b.t === 'raiz') && a.t !== 'par'; return R(e.a) + (juntar ? '' : '\\cdot ') + R(e.b); }
    case 'div': return e.dos ? `${R(e.a)}:${R(e.b)}` : `\\frac{${R(sinParA(e.a))}}{${R(sinParA(e.b))}}`;
    case 'pow': { const a = e.a; const simple = ['num', 'var', 'par'].includes(a.t) && !(sub && a.t === 'var'); return `{${simple ? R(a) : par(R(a))}}^{${R(sinParA(e.b))}}`; }
    case 'raiz': return e.k === 2 ? `\\sqrt{${R(sinParA(e.e))}}` : `\\sqrt[${e.k}]{${R(sinParA(e.e))}}`;
    case 'abs': return `\\left|${R(e.e)}\\right|`;
    case 'log': return (e.base === 'e' ? '\\ln' : e.base ? `\\log_{${L_frac(e.base)}}` : '\\log') + par(R(sinParA(e.e)));
  }
  return '?';
}
const relL = { '=': '=', '<': '<', '>': '>', '≤': '\\le ', '≥': '\\ge ', '≠': '\\ne ' };
// Árbol → polinomio. "reducir" en false deja los semejantes sin juntar (para mostrar la distributiva).
function aPoly(e, reducir = true) {
  const R = x => aPoly(x, reducir), fin = p => (reducir ? Pred(p) : p);
  switch (e.t) {
    case 'num': return Pc(e.q);
    case 'var': return Pv(e.n);
    case 'par': return R(e.e);
    case 'neg': return Pneg(R(e.e));
    case 'add': return fin(e.items.reduce((acc, it) => (it.op === '-' ? Psub(acc, R(it.e)) : Padd(acc, R(it.e))), []));
    case 'mul': return fin(Pmul(R(e.a), R(e.b)));
    case 'div': {
      const d = Pred(R(e.b));
      if (d.length !== 1) throw new Error('Para dividir por un polinomio, usá “Fracciones algebraicas” o la división de polinomios: (…) : (…).');
      const m = d[0]; return fin(R(e.a).map(t => mulMono(t, mono(m.c.inv(), Object.fromEntries(Object.entries(m.v).map(([k, v]) => [k, -v]))))));
    }
    case 'pow': {
      const ex = Pred(aPoly(e.b)); if (ex.length > 1 || (ex[0] && Object.keys(ex[0].v).length) || (ex[0] && !ex[0].c.entero)) throw new Error('El exponente tiene que ser un número entero.');
      const n = ex.length ? Number(ex[0].c.n) : 0, base = Pred(R(e.a));
      if (n < 0) { if (base.length !== 1) throw new Error('Un exponente negativo sobre una suma da una fracción algebraica.'); const m = base[0]; return [mono(m.c.pow(n), Object.fromEntries(Object.entries(m.v).map(([k, v]) => [k, v * n])))]; }
      if (n > 12) throw new Error('El exponente es demasiado grande.');
      return Ppow(base, n);
    }
  }
  throw new Error('Esa expresión no es un polinomio.');
}
// Evaluación numérica de un árbol (para verificar), con valores para las letras.
function evalA(e, val) {
  const R = x => evalA(x, val);
  switch (e.t) {
    case 'num': return e.q.num(); case 'var': if (!(e.n in val)) throw new Error(`Falta el valor de ${e.n}.`); return val[e.n];
    case 'par': return R(e.e); case 'neg': return -R(e.e);
    case 'add': return e.items.reduce((s, it) => s + (it.op === '-' ? -1 : 1) * R(it.e), 0);
    case 'mul': return R(e.a) * R(e.b); case 'div': return R(e.a) / R(e.b); case 'pow': return R(e.a) ** R(e.b);
    case 'raiz': { const a = R(e.e); return Math.sign(a) * Math.abs(a) ** (1 / e.k); }
    case 'abs': return Math.abs(R(e.e));
    case 'log': { const a = R(e.e); return e.base === 'e' ? Math.log(a) : Math.log(a) / Math.log(e.base ? e.base.num() : 10); }
  }
  return NaN;
}
const contieneA = (e, f) => !!e && typeof e === 'object' && (f(e) || ['e', 'a', 'b'].some(k => e[k] && typeof e[k] === 'object' && contieneA(e[k], f)) || (e.items || []).some(it => contieneA(it.e, f)));
const varsDe = e => { const s = new Set(); contieneA(e, n => { if (n.t === 'var') s.add(n.n); return false; }); return [...s].sort(); };
const aproxIgual = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
// Raíces racionales exactas como texto LaTeX con valor aproximado si hace falta.
const L_q = q => L_frac(q);

/* -----------------------------------------------------------------------
 * A4. CONCEPTOS BÁSICOS: valor numérico, reducción y operaciones
 * --------------------------------------------------------------------- */
function infoPolinomio(P) {
  const vs = Pvars(P), g = Pgrado(P);
  const indep = P.find(m => !Object.keys(m.v).length);
  const lin = [`\\text{grado: }${g === -Infinity ? tx('no tiene (es el polinomio nulo)') : g}`, `\\text{término independiente: }${indep ? L_frac(indep.c) : 0}`];
  if (vs.length === 1 && P.length) lin.push(`\\text{coeficiente principal: }${L_frac(P[0].c)}`);
  const nombre = P.length === 1 ? 'monomio' : P.length === 2 ? 'binomio' : P.length === 3 ? 'trinomio' : P.length === 4 ? 'cuatrinomio' : 'polinomio';
  return { lin, nombre, vs, g };
}
function resolverValorNumerico(texto) {
  const [, ex, asig] = texto.match(/^(?:.*?valor num[eé]rico de\s*)?(.+?)\s*(?:para|si|con|cuando)\s+(.+)$/i) || [];
  if (!ex) throw new Error('Escribilo así: “valor numérico de 3x^2 - 2y para x = 2, y = -1”.');
  const val = {}; for (const m of asig.matchAll(/([a-zA-Z])\s*=\s*(-?\s*\d+(?:[.,]\d+)?(?:\/\d+)?)/g)) { const s = m[2].replace(/\s/g, ''), neg = s.startsWith('-'); const [a, b] = s.replace('-', '').split('/'); const q = leerDecimal(a).q.div(b ? leerDecimal(b).q : Q1); val[m[1]] = neg ? q.neg() : q; }
  const e = exprAlg(ex.replace(/^.*?de\s+/i, '')), vs = varsDe(e);
  for (const v of vs) if (!val[v]) throw new Error(`Falta el valor de ${v}.`);
  const { pasos, P } = crearPasos();
  P('Escribimos la expresión y los valores', 'Calcular el valor numérico es reemplazar cada letra por su valor y hacer la cuenta.', [LA(e), vs.map(v => `${v}=${L_frac(val[v])}`).join(',\\quad ')]);
  P('Reemplazamos', 'Ponemos cada valor entre paréntesis, sobre todo si es negativo, para no equivocarnos con los signos.', LA(e, val));
  const r = Peval(aPoly(e), val);
  const terminos = Pred(aPoly(e));
  P('Calculamos', 'Resolvemos respetando la jerarquía: primero potencias, después multiplicaciones y al final sumas y restas.', terminos.length > 1 ? [`${terminos.map((m, i) => { const t = Peval([m], val); return (i === 0 ? (t.n < 0n ? '-' : '') : t.n < 0n ? '-' : '+') + L_frac(t.abs()); }).join('')}=${L_frac(r)}`] : [`=${L_frac(r)}`]);
  const f = evalA(e, Object.fromEntries(vs.map(v => [v, val[v].num()])));
  P('Verificamos', 'Repetimos la cuenta con decimales, como una calculadora.', `${LA(e, val)}\\approx ${L_x(f)}\\;${aproxIgual(f, r.num()) ? '\\checkmark' : ''}`);
  return { tema: 'basicos', metodo: 'Valor numérico por reemplazo', pasos, resultado: L_frac(r) };
}
function resolverReducir(texto) {
  const e = exprAlg(texto.replace(/^\s*(reducir|reduci|simplificar|operar|resolver|desarrollar|calcular|el grado de|grado de|grado)\s*:?\s*/i, ''));
  const { pasos, P } = crearPasos();
  P('Escribimos la expresión', 'Los términos semejantes son los que tienen las mismas letras con los mismos exponentes: solo esos se pueden sumar entre sí.', LA(e));
  const sin = aPoly(e, false), red = Pred(sin);
  if (contieneA(e, n => n.t === 'mul' || n.t === 'pow' || n.t === 'par' || n.t === 'div') && L_P(sin) !== LA(e)) P('Aplicamos la propiedad distributiva', 'Multiplicamos cada término de un paréntesis por cada término del otro (y el signo de adelante, si hay un menos, cambia todos los signos de adentro). Las letras iguales suman sus exponentes.', L_P(sin));
  const grupos = new Map(); for (const m of sin) { const k = claveMono(m.v); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(m); }
  const hay = [...grupos.values()].some(g => g.length > 1);
  if (hay) P('Agrupamos términos semejantes', 'Juntamos los términos semejantes y sumamos sus coeficientes (los números de adelante). La parte con letras queda igual.', [[...grupos.values()].sort((a, b) => cmpMono(a[0], b[0])).map((g, i) => (i ? '+' : '') + (g.length > 1 ? par(L_P(g)) : L_P(g).replace(/^\+/, ''))).join('').replace(/\+-/g, '-'), L_P(red)]);
  else if (!pasos[1]) P('No hay semejantes', 'Ningún par de términos tiene la misma parte literal: la expresión ya está reducida. La ordenamos de mayor a menor grado.', L_P(red));
  const inf = infoPolinomio(red);
  P('Describimos el resultado', `Es un ${inf.nombre}${inf.vs.length ? ' en ' + inf.vs.join(', ') : ''}.`, inf.lin);
  const val = Object.fromEntries(Pvars(sin).map((v, i) => [v, [2, 3, 5, 7][i % 4]]));
  const a = evalA(e, val), b = PevalN(red, val);
  P('Verificamos', 'Reemplazamos las letras por números cualesquiera en la expresión original y en el resultado: tienen que dar lo mismo.', `${Object.entries(val).map(([k, v]) => k + '=' + v).join(',\\;') || tx('sin letras')}:\\quad ${L_x(a)}=${L_x(b)}\\;${aproxIgual(a, b) ? '\\checkmark' : ''}`);
  return { tema: 'basicos', metodo: 'Propiedad distributiva y términos semejantes', pasos, resultado: L_P(red) };
}
function resolverDivisionPoli(texto, metodo) {
  const t = texto.replace(/^\s*(dividir|division|división)\s*:?\s*/i, '').replace(/\s+(entre|por)\s+/i, ' : ');
  const m = t.match(/^\s*\((.+)\)\s*[:÷/]\s*\((.+)\)\s*$/);
  if (!m) throw new Error('Escribí la división así: (x^3 - 2x + 1) : (x - 1).');
  const Pp = Pred(aPoly(exprAlg(m[1]))), Dd = Pred(aPoly(exprAlg(m[2]))), x = Pvars(Padd(Pp, Dd))[0] || 'x';
  const p = aU(Pp, x), d = aU(Dd, x); if (!p || !d) throw new Error('Por ahora la división de polinomios es en una sola letra.');
  const { q, r, pasos: pp } = uDiv(p, d); const { pasos, P } = crearPasos();
  const ruf = uGrado(d) === 1 && d[1].eq(Q1) && metodo !== 'larga';
  P('Escribimos la división', 'Ordenamos dividendo y divisor de mayor a menor grado. Si falta algún grado, conviene pensarlo con coeficiente 0.', `\\left(${L_U(p, x)}\\right):\\left(${L_U(d, x)}\\right)`);
  if (ruf) {
    const a = d[0].neg(), desc = p.slice().reverse(), fila2 = [''], fila3 = [desc[0]];
    for (let i = 1; i < desc.length; i++) { const v = fila3[i - 1].mul(a); fila2.push(v); fila3.push(desc[i].add(v)); }
    P('Elegimos la regla de Ruffini', `El divisor es de la forma x − a con a = ${fmtX(a.num())}, así que podemos usar Ruffini: bajamos el primer coeficiente, lo multiplicamos por a, lo sumamos al siguiente y repetimos. El último número es el resto.`, [],
      tabla(['', ...desc.map(c => k$(L_frac(c)))], [[k$(L_frac(a)), ...fila2.map(c => (c === '' ? '' : k$(L_frac(c))))], ['', ...fila3.map((c, i) => (i === fila3.length - 1 ? `<b>${k$(L_frac(c))}</b>` : k$(L_frac(c))))]], 'ruffini'));
  } else {
    P('Hacemos la división larga', 'Dividimos el término de mayor grado del dividendo por el de mayor grado del divisor, multiplicamos ese resultado por todo el divisor y lo restamos. Repetimos hasta que el resto tenga menor grado que el divisor.', [],
      tabla(['Cociente parcial', 'Restamos'], pp.map(s => [k$(L_P([mono(s.c, s.k ? { [x]: s.k } : {})])), k$(L_U(s.resta, x))])));
  }
  P('Cociente y resto', uGrado(r) < 0 ? 'El resto es 0: la división es exacta, así que el divisor es un factor del dividendo.' : 'El resto tiene menor grado que el divisor.', [`C(${x})=${L_U(q, x)}`, `R(${x})=${L_U(r, x)}`]);
  const chk = uAdd(uMul(d, q), r);
  P('Verificamos', 'Se tiene que cumplir: dividendo = divisor · cociente + resto.', `${L_Pp(deU(d, x))}\\cdot ${L_Pp(deU(q, x))}+${L_Pp(deU(r, x))}=${L_U(chk, x)}\\;${chk.length === p.length && chk.every((c, i) => c.eq(p[i])) ? '\\checkmark' : ''}`);
  return { tema: 'basicos', metodo: ruf ? 'Regla de Ruffini' : 'División larga de polinomios', pasos, resultado: `C(${x})=${L_U(q, x)},\\quad R(${x})=${L_U(r, x)}`, alternativas: uGrado(d) === 1 && d[1].eq(Q1) ? [{ nombre: ruf ? 'Ver con división larga' : 'Ver con Ruffini', metodo: ruf ? 'larga' : 'ruffini' }] : [] };
}

/* -----------------------------------------------------------------------
 * A5. PRODUCTOS NOTABLES
 * --------------------------------------------------------------------- */
function terminosDe(e) { e = sinParA(e); if (e.t !== 'add') return null; return e.items.map(it => (it.op === '-' ? Pneg(aPoly(it.e)) : aPoly(it.e))); }
function detectarNotable(e) {
  e = sinParA(e);
  if (e.t === 'pow' && e.a.t === 'par') {
    const n = sinParA(e.b), ts = terminosDe(e.a);
    if (n.t === 'num' && ts) { const k = Number(n.q.n); if (k === 2 && ts.length === 2) return { tipo: 'cuad', ts }; if (k === 3 && ts.length === 2) return { tipo: 'cubo', ts }; if (k === 2 && ts.length === 3) return { tipo: 'cuadtri', ts }; }
  }
  if (e.t === 'mul' && sinParA(e.a).t === 'add' && sinParA(e.b).t === 'add') {
    const A = terminosDe(e.a), B = terminosDe(e.b);
    if (A.length === 2 && B.length === 2) {
      if (Peq(A[0], B[0]) && Peq(A[1], Pneg(B[1]))) return { tipo: 'difcuad', ts: A };
      if (Peq(A[1], B[1]) && Peq(A[0], Pneg(B[0]))) return { tipo: 'difcuad', ts: [A[1], A[0]] };
      if (Peq(A[0], B[0]) && Pvars(A[1]).length === 0 && Pvars(B[1]).length === 0) return { tipo: 'comun', ts: [A[0], A[1], B[1]] };
    }
  }
  return null;
}
function resolverNotable(texto) {
  const e = exprAlg(texto.replace(/^\s*(desarrollar|desarrolla|producto notable|calcular)\s*:?\s*/i, ''));
  const N = detectarNotable(e); if (!N) return resolverReducir(texto);
  const { pasos, P } = crearPasos(); const [a, b] = N.ts, La = L_Pp(Pred(a)), Lb = L_Pp(Pred(b)), Lbs = L_Pp(Pred(Pneg(b)));
  const neg = Pred(b).length === 1 && Pred(b)[0].c.n < 0n, bAbs = neg ? Pneg(b) : b, Lbb = L_Pp(Pred(bAbs)), sg = neg ? '-' : '+';
  let res, nombre;
  P('Escribimos la expresión', 'Antes de multiplicar término a término, nos fijamos si es un producto notable: tiene una fórmula que ahorra cuentas.', LA(e));
  if (N.tipo === 'cuad') {
    nombre = 'Cuadrado de un binomio';
    P('Reconocemos el producto notable', `Es el cuadrado de un binomio: $(a ${sg} b)^2 = a^2 ${sg} 2ab + b^2$. El cuadrado del primero, ${neg ? 'menos' : 'más'} el doble del primero por el segundo, más el cuadrado del segundo.`, `a=${La},\\quad b=${Lbb}`);
    const t1 = Ppow(a, 2), t2 = Pscale(Pred(Pmul(a, bAbs)), QE(2)), t3 = Ppow(bAbs, 2);
    res = Pred(Padd(Padd(t1, neg ? Pneg(t2) : t2), t3));
    P('Aplicamos la fórmula', 'Calculamos cada término por separado.', [`{${La}}^{2}${sg}2\\cdot ${La}\\cdot ${Lbb}+{${Lbb}}^{2}`, `=${L_P(t1)}${sg}${L_P(t2).replace(/^-/, '')}+${L_P(t3)}`]);
  } else if (N.tipo === 'cubo') {
    nombre = 'Cubo de un binomio';
    P('Reconocemos el producto notable', `Es el cubo de un binomio: $(a ${sg} b)^3 = a^3 ${sg} 3a^2b + 3ab^2 ${sg} b^3$.`, `a=${La},\\quad b=${Lbb}`);
    const t = [Ppow(a, 3), Pscale(Pred(Pmul(Ppow(a, 2), bAbs)), QE(3)), Pscale(Pred(Pmul(a, Ppow(bAbs, 2))), QE(3)), Ppow(bAbs, 3)];
    res = Pred(Padd(Padd(t[0], neg ? Pneg(t[1]) : t[1]), Padd(t[2], neg ? Pneg(t[3]) : t[3])));
    P('Aplicamos la fórmula', 'Calculamos cada uno de los cuatro términos.', [`{${La}}^{3}${sg}3\\cdot {${La}}^{2}\\cdot ${Lbb}+3\\cdot ${La}\\cdot {${Lbb}}^{2}${sg}{${Lbb}}^{3}`, `=${t.map((x, i) => (i ? (neg && i % 2 ? '-' : '+') : '') + L_P(x)).join('')}`]);
  } else if (N.tipo === 'difcuad') {
    nombre = 'Suma por diferencia';
    P('Reconocemos el producto notable', 'Es una suma por una diferencia de los mismos términos: $(a + b)(a - b) = a^2 - b^2$. Los términos del medio se cancelan.', `a=${La},\\quad b=${L_Pp(Pred(b))}`);
    res = Pred(Psub(Ppow(a, 2), Ppow(b, 2)));
    P('Aplicamos la fórmula', 'Cuadrado del primero menos cuadrado del segundo.', [`{${La}}^{2}-{${L_Pp(Pred(b))}}^{2}=${L_P(res)}`]);
  } else if (N.tipo === 'comun') {
    nombre = 'Producto de binomios con un término común';
    const [x, p, q] = N.ts;
    P('Reconocemos el producto notable', 'Los dos binomios tienen un término común: $(x + a)(x + b) = x^2 + (a + b)x + ab$.', `x=${L_Pp(Pred(x))},\\quad a=${L_P(Pred(p))},\\quad b=${L_P(Pred(q))}`);
    res = Pred(Padd(Padd(Ppow(x, 2), Pmul(Pred(Padd(p, q)), x)), Pmul(p, q)));
    P('Aplicamos la fórmula', 'El cuadrado del término común, más la suma de los otros por el común, más el producto de los otros.', [`{${L_Pp(Pred(x))}}^{2}+${par(L_P(Pred(p)) + '+' + L_P(Pred(q)).replace(/^(?!-)/, '')).replace('+-', '-')}\\cdot ${L_Pp(Pred(x))}+${L_Pp(Pred(p))}\\cdot ${L_Pp(Pred(q))}`, `=${L_P(res)}`]);
  } else {
    nombre = 'Cuadrado de un trinomio';
    const [c] = [N.ts[2]];
    P('Reconocemos el producto notable', 'Es el cuadrado de un trinomio: $(a+b+c)^2 = a^2 + b^2 + c^2 + 2ab + 2ac + 2bc$.', `a=${La},\\quad b=${L_Pp(Pred(b))},\\quad c=${L_Pp(Pred(c))}`);
    const t = [Ppow(a, 2), Ppow(b, 2), Ppow(c, 2), Pscale(Pred(Pmul(a, b)), QE(2)), Pscale(Pred(Pmul(a, c)), QE(2)), Pscale(Pred(Pmul(b, c)), QE(2))];
    res = Pred(t.flat());
    P('Aplicamos la fórmula', 'Los cuadrados de los tres términos más los dobles productos de a dos.', [t.map((x, i) => (i ? '+' : '') + L_Pp(x)).join(''), `=${L_P(res)}`]);
  }
  P('Ordenamos el resultado', 'Juntamos semejantes (si hay) y ordenamos de mayor a menor grado.', L_P(res));
  const dist = Pred(aPoly(e));
  P('Verificamos', 'Hacemos la multiplicación completa con la propiedad distributiva: tiene que dar lo mismo que con la fórmula.', `${LA(e)}=${L_P(dist)}\\;${Peq(dist, res) ? '\\checkmark' : ''}`);
  return { tema: 'notables', metodo: nombre, pasos, resultado: L_P(res) };
}

/* -----------------------------------------------------------------------
 * A6. POTENCIACIÓN (propiedades con letras)
 * Junta, para cada letra, los exponentes que aporta cada factor.
 * --------------------------------------------------------------------- */
function resolverPotenciaAlg(texto) {
  const e = exprAlg(texto.replace(/^\s*(simplificar|simplifica|reducir|aplicar propiedades)\s*:?\s*/i, ''));
  if (contieneA(e, n => n.t === 'add')) throw new Error('Para usar las propiedades de la potenciación, la expresión tiene que ser un producto o cociente de potencias (sin sumas).');
  const aportes = {}; let coef = Q1; const detalle = [];
  function recorrer(n, mult, signo) {
    n = sinParA(n);
    if (n.t === 'num') { coef = coef.mul(n.q.pow(mult * signo)); if (mult !== 1 || signo < 0) detalle.push(`${n.raw}^{${mult * signo}}`); return; }
    if (n.t === 'var') { (aportes[n.n] = aportes[n.n] || []).push(mult * signo); return; }
    if (n.t === 'neg') { coef = coef.mul(QE(-1).pow(Math.abs(mult))); recorrer(n.e, mult, signo); return; }
    if (n.t === 'mul') { recorrer(n.a, mult, signo); recorrer(n.b, mult, signo); return; }
    if (n.t === 'div') { recorrer(n.a, mult, signo); recorrer(n.b, mult, -signo); return; }
    if (n.t === 'pow') { const ex = Pred(aPoly(n.b)); if (ex.length > 1 || (ex[0] && (Object.keys(ex[0].v).length || !ex[0].c.entero))) throw new Error('Los exponentes tienen que ser números enteros.'); recorrer(n.a, mult * (ex.length ? Number(ex[0].c.n) : 0), signo); return; }
    throw new Error('Esa expresión no se puede simplificar con las propiedades de la potenciación.');
  }
  recorrer(e, 1, 1);
  const { pasos, P } = crearPasos();
  P('Escribimos la expresión', 'Vamos a usar las propiedades de la potenciación: con la misma base, al multiplicar se suman los exponentes, al dividir se restan, y una potencia de potencia multiplica los exponentes.', LA(e));
  if (contieneA(e, n => n.t === 'pow' && sinParA(n.a).t !== 'var' && sinParA(n.a).t !== 'num'))
    P('Distribuimos las potencias', 'Una potencia de un producto (o de un cociente) se reparte sobre cada factor, y si un factor ya tenía exponente, se multiplican (potencia de potencia).', `\\text{Cada letra y cada número queda elevado al producto de sus exponentes.}`);
  const vars = Object.keys(aportes).sort(), fin = {};
  const lineas = vars.map(v => { const s = aportes[v].reduce((a, b) => a + b, 0); fin[v] = s; return `${v}^{${aportes[v].map((x, i) => (i ? (x < 0 ? '' : '+') : '') + x).join('')}}=${v}^{${s}}`; });
  P('Juntamos las potencias de igual base', 'Para cada letra sumamos los exponentes de los factores de arriba y restamos los de abajo.', [`\\text{número: }${L_frac(coef)}`, ...lineas]);
  const res = mono(coef, fin), num = Object.keys(fin).filter(v => fin[v] > 0), den = Object.keys(fin).filter(v => fin[v] < 0);
  const L_part = (ks, sg) => ks.map(v => (Math.abs(fin[v]) === 1 ? v : `${v}^{${Math.abs(fin[v])}}`)).join('');
  let resL = L_P([res]);
  if (den.length || !coef.entero) {
    const nn = (coef.n < 0n ? '-' : '') + (absB(coef.n) !== 1n || !num.length ? L_ent(absB(coef.n)) : '') + L_part(num), dd = (coef.d !== 1n ? L_ent(coef.d) : '') + L_part(den);
    resL = dd ? `\\frac{${nn.replace(/^-/, '')}}{${dd}}` : nn; if (coef.n < 0n && dd) resL = '-' + resL;
    if (den.length) P('Escribimos sin exponentes negativos', 'Un exponente negativo significa que esa potencia pasa al denominador con exponente positivo: $a^{-n} = \\frac{1}{a^n}$.', `${L_P([res])}=${resL}`);
  }
  if (Object.values(fin).some(x => x === 0)) P('Exponente cero', 'Las letras que quedaron con exponente 0 valen 1 (para valores distintos de cero), así que desaparecen.', vars.filter(v => fin[v] === 0).map(v => `${v}^{0}=1`).join(',\\;'));
  const val = Object.fromEntries(vars.map((v, i) => [v, [2, 3, 5, 7][i % 4]]));
  const a = evalA(e, val), b = coef.num() * vars.reduce((p, v) => p * val[v] ** fin[v], 1);
  P('Verificamos', 'Reemplazamos las letras por números en la expresión original y en el resultado.', `${vars.map(v => v + '=' + val[v]).join(',\\;') || tx('sin letras')}:\\quad ${L_x(a)}=${L_x(b)}\\;${aproxIgual(a, b) ? '\\checkmark' : ''}`);
  return { tema: 'potenciacion', metodo: 'Propiedades de la potenciación', pasos, resultado: resL };
}

/* -----------------------------------------------------------------------
 * A7. ECUACIÓN CUADRÁTICA (herramienta compartida)
 * Devuelve las raíces de a·x² + b·x + c con su escritura exacta.
 * --------------------------------------------------------------------- */
function sqrtLibre(n) {                       // n = k²·m con m libre de cuadrados
  n = BigInt(n); let k = 1n, m = 1n;
  for (const [p, e] of factoresPrimos(n)) { k *= p ** BigInt(Math.floor(e / 2)); if (e % 2) m *= p; }
  return { k, m };
}
// (p + s·q·√m)/r  en LaTeX; s = +1, −1 o 0 (para ±)
function L_rad(p, q, m, r, s, imag) {
  const raiz = (q === 1n && !(m === 1n && !imag) ? '' : L_ent(q)) + (m !== 1n ? `\\sqrt{${L_ent(m)}}` : '') + (imag ? 'i' : '');
  let num = p !== 0n ? L_ent(p) : '';
  num += s === 0 ? '\\pm ' : s < 0 ? '-' : (p !== 0n ? '+' : '');
  num += raiz || '1';
  return r === 1n ? num : `\\frac{${num}}{${L_ent(r)}}`;
}
function raicesCuadratica(a, b, c) {
  const D0 = a.d * b.d * c.d, A = a.mul(new Q(D0)).n, B = b.mul(new Q(D0)).n, C = c.mul(new Q(D0)).n;   // coeficientes enteros
  const g = mcdB(mcdB(A, B), C) || 1n, a1 = A / g, b1 = B / g, c1 = C / g;
  const D = b1 * b1 - 4n * a1 * c1;
  const out = { A: a1, B: b1, C: c1, D };
  if (D >= 0n) {
    const s = raizEnteraB(D, 2);
    if (s * s === D) { out.tipo = 'rac'; out.r = [new Q(-b1 + s, 2n * a1), new Q(-b1 - s, 2n * a1)]; out.L = out.r.map(L_frac); out.x = out.r.map(q => q.num()); return out; }
    const { k, m } = sqrtLibre(D), gg = mcdB(mcdB(absB(b1), k), absB(2n * a1)), sg = a1 < 0n ? -1n : 1n;
    const p = -b1 / gg * sg, q = k / gg, r = absB(2n * a1 / gg);
    out.tipo = 'irr'; out.p = p; out.q = q; out.m = m; out.rr = r;
    out.L = [L_rad(p, q, m, r, 1), L_rad(p, q, m, r, -1)]; out.Lpm = L_rad(p, q, m, r, 0);
    out.x = [(Number(p) + Number(q) * Math.sqrt(Number(m))) / Number(r), (Number(p) - Number(q) * Math.sqrt(Number(m))) / Number(r)];
    return out;
  }
  const { k, m } = sqrtLibre(-D), gg = mcdB(mcdB(absB(b1), k), absB(2n * a1)), sg = a1 < 0n ? -1n : 1n;
  const p = -b1 / gg * sg, q = k / gg, r = absB(2n * a1 / gg);
  out.tipo = 'comp'; out.p = p; out.q = q; out.m = m; out.rr = r;
  out.L = [L_rad(p, q, m, r, 1, true), L_rad(p, q, m, r, -1, true)]; out.Lpm = L_rad(p, q, m, r, 0, true);
  out.re = Number(p) / Number(r); out.im = Number(q) * Math.sqrt(Number(m)) / Number(r);
  return out;
}

/* -----------------------------------------------------------------------
 * A8. FACTORIZACIÓN (los casos de factoreo)
 * Se aplica un caso, se reemplaza el factor por sus nuevos factores y se
 * repite hasta que no se pueda más. Cada caso devuelve null si no aplica.
 * --------------------------------------------------------------------- */
// Saca lo común a todos los términos: número (MCD) y letras con el menor exponente.
function contenido(P) {
  P = Pred(P); if (!P.length) return { k: Q1, m: {}, resto: P };
  const D = P.reduce((a, t) => mcmB(a, t.c.d), 1n), ns = P.map(t => t.c.n * (D / t.c.d));
  let g = ns.reduce((a, b) => mcdB(a, b), 0n) || 1n; if (P[0].c.n < 0n) g = -g;
  const vs = Pvars(P), m = {}; for (const v of vs) { const e = Math.min(...P.map(t => t.v[v] || 0)); if (e) m[v] = e; }
  const k = new Q(g, D), resto = Pred(P.map(t => mono(t.c.div(k), Object.fromEntries(Object.entries(t.v).map(([v, e]) => [v, e - (m[v] || 0)])))));
  return { k, m, resto };
}
const esMonomio = P => Pred(P).length === 1;
const L_fac = f => (f.irr ? par(f.L) : (esMonomio(f.P) && Pred(f.P)[0].c.eq(Q1)) ? L_P(f.P) : par(L_P(f.P)));
const L_facE = f => (f.e > 1 ? `{${L_fac(f)}}^{${f.e}}` : L_fac(f));
function L_producto(k, fs) {
  const s = fs.map(L_facE).join('');
  if (!fs.length) return L_frac(k);
  if (k.eq(Q1)) return s; if (k.eq(QE(-1))) return '-' + s;
  return L_frac(k) + s;
}
const casoDifCuad = P => {
  if (P.length !== 2) return null;
  const pos = P.find(t => t.c.n > 0n), neg = P.find(t => t.c.n < 0n); if (!pos || !neg) return null;
  const A = raizMono(pos, 2), B = raizMono(mono(neg.c.neg(), neg.v), 2); if (!A || !B) return null;
  const f1 = Pred([A, mono(B.c.neg(), B.v)]), f2 = Pred([A, B]);
  return { titulo: 'Diferencia de cuadrados', texto: 'Son dos términos que se restan y los dos son cuadrados perfectos. Se factoriza como la resta de las bases por la suma de las bases: $a^2 - b^2 = (a - b)(a + b)$.', mates: [`a=${L_P([A])},\\quad b=${L_P([B])}`, `${L_P(P)}=${par(L_P(f1))}${par(L_P(f2))}`], fs: [{ P: f1, e: 1 }, { P: f2, e: 1 }] };
};
const casoTCP = P => {
  if (P.length !== 3) return null;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === j) continue; const k = 3 - i - j, ti = P[i], tj = P[j], tk = P[k];
    if (ti.c.n <= 0n || tj.c.n <= 0n) continue;
    const A = raizMono(ti, 2), B = raizMono(tj, 2); if (!A || !B) continue;
    const dob = mulMono(mono(QE(2)), mulMono(A, B));
    if (claveMono(dob.v) !== claveMono(tk.v) || !dob.c.abs().eq(tk.c.abs())) continue;
    const s = tk.c.n < 0n ? -1 : 1, base = s < 0 ? (i < j ? Pred([A, mono(B.c.neg(), B.v)]) : Pred([mono(A.c.neg(), A.v), B])) : Pred([A, B]);
    const baseN = base[0].c.n < 0n ? Pneg(base) : base;
    return { titulo: 'Trinomio cuadrado perfecto', texto: `Tiene tres términos: dos son cuadrados perfectos (de ${'$' + L_P([A]) + '$'} y de ${'$' + L_P([B]) + '$'}) y el otro es el doble producto de esas bases. Entonces es el cuadrado de un binomio: $a^2 ${s < 0 ? '-' : '+'} 2ab + b^2 = (a ${s < 0 ? '-' : '+'} b)^2$.`, mates: [`2\\cdot ${L_P([A])}\\cdot ${L_P([B])}=${L_P([dob])}`, `${L_P(P)}=${par(L_P(baseN))}^{2}`], fs: [{ P: Pred(baseN), e: 2 }] };
  }
  return null;
};
const casoCubo = P => {
  if (P.length !== 4) return null;
  const A = raizMono(P[0], 3), B = raizMono(P[3], 3); if (!A || !B) return null;
  const t2 = mulMono(mono(QE(3)), mulMono(mulMono(A, A), B)), t3 = mulMono(mono(QE(3)), mulMono(A, mulMono(B, B)));
  if (!Peq([t2], [P[1]]) || !Peq([t3], [P[2]])) return null;
  const base = Pred([A, B]);
  return { titulo: 'Cuatrinomio cubo perfecto', texto: 'El primero y el último términos son cubos perfectos, y los del medio son los triples productos $3a^2b$ y $3ab^2$. Es el cubo de un binomio: $(a+b)^3$.', mates: [`a=${L_P([A])},\\quad b=${L_P([B])}`, `3a^2b=${L_P([t2])},\\quad 3ab^2=${L_P([t3])}`, `${L_P(P)}=${par(L_P(base))}^{3}`], fs: [{ P: base, e: 3 }] };
};
const casoGrupos = P => {
  if (P.length !== 4) return null;
  for (const [i, j, k, l] of [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]]) {
    const g1 = contenido([P[i], P[j]]), g2 = contenido([P[k], P[l]]);
    if (!Peq(g1.resto, g2.resto) || Pgrado(g1.resto) < 1) continue;
    const c1 = mono(g1.k, g1.m), c2 = mono(g2.k, g2.m), otro = Pred([c1, c2]);
    return { titulo: 'Factor común por grupos', texto: 'Tiene cuatro términos sin un factor común a todos. Los agrupamos de a dos, sacamos factor común en cada grupo y, como queda el mismo paréntesis, lo sacamos de nuevo como factor común.',
      mates: [`${L_P(P)}=${par(L_P([P[i], P[j]]))}+${par(L_P([P[k], P[l]]))}`, `=${L_P([c1])}${par(L_P(g1.resto))}${L_mono(c2, false)}${par(L_P(g1.resto))}`, `=${par(L_P(g1.resto))}${par(L_P(otro))}`], fs: [{ P: g1.resto, e: 1 }, { P: otro, e: 1 }] };
  }
  return null;
};
// Casos en una sola letra
function linealDeRaiz(r, x) { return Pred([mono(new Q(r.d), { [x]: 1 }), mono(new Q(-r.n))]); }   // raíz n/d → (d·x − n)
const casoTrinomio = (P, x) => {
  const u = aU(P, x); if (!u || uGrado(u) !== 2) return null;
  const R = raicesCuadratica(u[2], u[1], u[0]);
  const linD = `\\Delta=b^2-4ac=${L_ent(R.D)}`;
  if (R.tipo === 'comp') return { irreducible: true, titulo: 'Revisamos si se puede seguir', texto: `El factor $${L_P(P)}$ es de grado 2 y su discriminante es negativo: no tiene raíces reales, así que no se puede factorizar más en los números reales.`, mates: [linD] };
  if (R.tipo === 'rac') {
    const [r1, r2] = R.r, fs = r1.eq(r2) ? [{ P: linealDeRaiz(r1, x), e: 2 }] : [{ P: linealDeRaiz(r1, x), e: 1 }, { P: linealDeRaiz(r2, x), e: 1 }];
    const k = u[2].div(new Q(r1.d * (r1.eq(r2) ? r1.d : r2.d)));
    return { titulo: 'Trinomio de segundo grado', texto: 'Si las raíces son $x_1$ y $x_2$, el trinomio se escribe $a(x - x_1)(x - x_2)$. Buscamos las raíces con la fórmula resolvente.', mates: [linD, `x_{1}=${L_frac(r1)},\\quad x_{2}=${L_frac(r2)}`, `${L_P(P)}=${L_producto(k, fs)}`], fs, k };
  }
  const f1 = { irr: true, L: `${x}-${par(R.L[0])}`, e: 1, quad: Pscale(P, u[2].inv()) }, f2 = { irr: true, L: `${x}-${par(R.L[1])}`, e: 1 };
  return { titulo: 'Trinomio de segundo grado', texto: 'Buscamos las raíces con la resolvente. Como el discriminante no es un cuadrado perfecto, las raíces son irracionales y quedan escritas con raíz.', mates: [linD, `x_{1,2}=${R.Lpm}`, `${L_P(P)}=${L_producto(u[2], [f1, f2])}`], fs: [f1, f2], k: u[2] };
};
const casoBicuadrado = (P, x) => {
  const u = aU(P, x); if (!u || P.length !== 3) return null;
  const g = uGrado(u); if (g % 2 || g < 4 || u[g / 2].cero || u.some((c, i) => !c.cero && i !== 0 && i !== g && i !== g / 2)) return null;
  const h = g / 2, R = raicesCuadratica(u[g], u[h], u[0]); if (R.tipo !== 'rac') return null;
  const fs = R.r.map(r => ({ P: Pred([mono(new Q(r.d), { [x]: h }), mono(new Q(-r.n))]), e: 1 }));
  const k = u[g].div(new Q(R.r[0].d * R.r[1].d));
  return { titulo: 'Trinomio bicuadrado', texto: `El exponente mayor (${g}) es el doble del otro (${h}). Llamamos $t = ${x}^{${h}}$ y queda un trinomio de segundo grado en t, que factorizamos con sus raíces.`, mates: [`t=${x}^{${h}}\\;\\Rightarrow\\;${L_U([u[0], u[h], u[g]], 't')}`, `t_{1}=${L_frac(R.r[0])},\\quad t_{2}=${L_frac(R.r[1])}`, `${L_P(P)}=${L_producto(k, fs)}`], fs, k };
};
function tablaRuffini(u, r) {
  const desc = u.slice().reverse(), f2 = [''], f3 = [desc[0]];
  for (let i = 1; i < desc.length; i++) { const v = f3[i - 1].mul(r); f2.push(v); f3.push(desc[i].add(v)); }
  return { html: tabla(['', ...desc.map(c => k$(L_frac(c)))], [[k$(L_frac(r)), ...f2.map(c => (c === '' ? '' : k$(L_frac(c))))], ['', ...f3.map((c, i) => (i === f3.length - 1 ? `<b>${k$(L_frac(c))}</b>` : k$(L_frac(c))))]], 'ruffini'), q: f3.slice(0, -1).reverse() };
}
const casoPotencias = (P, x) => {
  const u = aU(P, x); if (!u || P.length !== 2 || u[0].cero) return null;
  const n = uGrado(u); if (n < 3) return null;
  const a = raizExacta(u[n], n), c = raizExacta(u[0].abs(), n); if (!a || !c) return null;
  if (u[0].n > 0n && n % 2 === 0) return null;
  const r = (u[0].n < 0n ? c : c.neg()).div(a), T = tablaRuffini(u, r), lin = linealDeRaiz(r, x), cociente = deU(T.q.map(q => q.div(new Q(r.d))), x);
  return { titulo: u[0].n < 0n ? 'Diferencia de potencias de igual grado' : 'Suma de potencias de igual grado', texto: u[0].n < 0n ? 'Una resta de potencias de igual exponente siempre se divide por la resta de las bases. Hacemos esa división con Ruffini.' : 'Con exponente impar, una suma de potencias de igual exponente se divide por la suma de las bases. Hacemos la división con Ruffini.',
    mates: [`${L_P(P)}=${par(L_P(lin))}${par(L_P(cociente))}`], html: T.html, fs: [{ P: lin, e: 1 }, { P: cociente, e: 1 }] };
};
const casoGauss = (P, x) => {
  const u = aU(P, x); if (!u || uGrado(u) < 3) return null;
  const D = u.reduce((a, c) => mcmB(a, c.d), 1n), ui = u.map(c => c.mul(new Q(D)));
  const a0 = absB(ui[0].n), an = absB(ui[ui.length - 1].n); if (a0 === 0n) return null;
  const divs = n => { const s = []; for (let i = 1n; i * i <= n; i++) if (n % i === 0n) { s.push(i); if (i * i !== n) s.push(n / i); } return s; };
  const cands = []; for (const p of divs(a0)) for (const q of divs(an)) { const f = new Q(p, q); if (!cands.some(c => c.eq(f))) cands.push(f); }
  cands.sort((a, b) => a.cmp(b));
  const lista = cands.slice(0, 16).map(c => `\\pm${L_frac(c)}`).join(',\\;') + (cands.length > 16 ? ',\\;\\ldots' : '');
  let raiz = null; const probadas = [];
  for (const c of cands) { for (const r of [c, c.neg()]) { const v = uEval(u, r); if (v.cero) { raiz = r; break; } probadas.push(`P(${L_frac(r)})=${L_frac(v)}`); } if (raiz) break; }
  const intro = `Usamos el teorema de Gauss: si hay una raíz racional p/q, p divide al término independiente (${L_ent(ui[0].n)}) y q divide al coeficiente principal (${L_ent(ui[ui.length - 1].n)}).`;
  if (!raiz) return { irreducible: true, titulo: 'Buscamos raíces con el teorema de Gauss', texto: intro + ' Probamos todas las posibles raíces y ninguna da 0: no tiene raíces racionales, así que con estos casos no se puede seguir.', mates: [`\\text{posibles raíces: }${lista}`] };
  const T = tablaRuffini(u, raiz), lin = linealDeRaiz(raiz, x), cociente = deU(T.q.map(q => q.div(new Q(raiz.d))), x);
  return { titulo: 'Teorema de Gauss y regla de Ruffini', texto: intro + ` Probamos hasta que una da 0. Como P(${fmtX(raiz.num())}) = 0, el polinomio se divide por $(${L_P(linealDeRaiz(raiz, x))})$ y hacemos la división con Ruffini.`,
    mates: [`\\text{posibles raíces: }${lista}`, ...(probadas.length ? [probadas.slice(0, 4).join(',\\;') + (probadas.length > 4 ? ',\\;\\ldots' : '')] : []), `P(${L_frac(raiz)})=0`, `${L_P(P)}=${par(L_P(lin))}${par(L_P(cociente))}`], html: T.html, fs: [{ P: lin, e: 1 }, { P: cociente, e: 1 }] };
};
// Motor de factorización. Devuelve pasos y la lista final de factores.
function factorizarPoly(P0, P) {
  P0 = Pred(P0); const vs = Pvars(P0), x = vs.length === 1 ? vs[0] : null;
  const st = { k: Q1, fs: [] };
  const agregar = (lista, P, e) => {                      // normaliza: saca número y letras comunes
    const c = contenido(P); st.k = st.k.mul(c.k.pow(e));
    for (const v in c.m) lista.push({ P: [mono(Q1, { [v]: 1 })], e: c.m[v] * e, done: true });
    if (Pgrado(c.resto) >= 1) lista.push({ P: c.resto, e, done: Pgrado(c.resto) === 1 && esMonomio(c.resto) === false && Pvars(c.resto).length >= 1 && c.resto.length <= 2 && Pgrado(c.resto) === 1 });
  };
  const c0 = contenido(P0);
  if (!c0.k.eq(Q1) || Object.keys(c0.m).length) {
    agregar(st.fs, P0, 1);
    const comun = L_P([mono(c0.k, c0.m)]);
    P('Factor común', 'Siempre empezamos buscando lo que se repite en todos los términos: el máximo común divisor de los números y cada letra con su menor exponente. Después dividimos cada término por ese factor común.', `${L_P(P0)}=${comun === '1' ? '' : comun === '-1' ? '-' : comun}${par(L_P(c0.resto))}`);
  } else { st.fs.push({ P: P0, e: 1, done: false }); P('Buscamos factor común', 'Siempre empezamos por acá. En este caso no hay un número ni una letra que se repita en todos los términos, así que pasamos a los otros casos.'); }
  const CASOS = [casoDifCuad, casoTCP, casoCubo, casoTrinomio, casoBicuadrado, casoPotencias, casoGrupos, casoGauss];
  for (let g = 0; g < 40; g++) {
    const i = st.fs.findIndex(f => !f.done && !f.irr); if (i < 0) break;
    const f = st.fs[i], xf = Pvars(f.P).length === 1 ? Pvars(f.P)[0] : null;
    if (Pgrado(f.P) <= 1) { f.done = true; continue; }
    let r = null; for (const C of CASOS) { if ([casoTrinomio, casoBicuadrado, casoPotencias, casoGauss].includes(C) && !xf) continue; r = C(Pred(f.P), xf); if (r) break; }
    if (!r) { f.done = true; if (!xf) P('Revisamos el factor', `No encontramos otro caso de factoreo para $${L_P(f.P)}$: lo dejamos como está.`); continue; }
    if (r.irreducible) { f.done = true; P(r.titulo, r.texto, r.mates); continue; }
    const nuevos = [];
    for (const nf of r.fs) { if (nf.irr) nuevos.push({ ...nf, e: nf.e * f.e, done: true }); else agregar(nuevos, nf.P, nf.e * f.e); }
    if (r.k) st.k = st.k.mul(r.k.pow(f.e));
    st.fs.splice(i, 1, ...nuevos);
    P(r.titulo, r.texto + (f.e > 1 ? ` Como ese factor estaba elevado a la ${f.e}, cada factor nuevo también.` : ''), [...r.mates, `\\text{Queda: }${L_P(P0)}=${L_producto(st.k, juntarFactores(st.fs))}`], r.html || '');
  }
  return { k: st.k, fs: juntarFactores(st.fs), x };
}
function juntarFactores(fs) {
  const out = [];
  for (const f of fs) { const key = f.irr ? 'i' + f.L : L_P(Pred(f.P)); const o = out.find(z => z.key === key); if (o) o.e += f.e; else out.push({ ...f, key }); }
  return out.sort((a, b) => (a.irr ? 1 : 0) - (b.irr ? 1 : 0) || Pgrado(a.P || []) - Pgrado(b.P || []));
}
function productoFactores(k, fs) {                          // para verificar
  let r = Pc(k); for (const f of fs) { if (f.irr) { if (f.quad) r = Pred(Pmul(r, Ppow(f.quad, f.e))); } else r = Pred(Pmul(r, Ppow(f.P, f.e))); } return r;
}
function resolverFactorizacion(texto) {
  const e = exprAlg(texto.replace(/^\s*(factorizar|factoriza|factorear|factoreo de|factorizacion de|factorización de|descomponer)\s*:?\s*/i, ''));
  const P0 = Pred(aPoly(e)); if (Pgrado(P0) < 1) throw new Error('No hay letras: no hay nada que factorizar.');
  const { pasos, P } = crearPasos();
  P('Escribimos la expresión', 'Factorizar es escribirla como una multiplicación de factores lo más simples posible.' + (LA(e) !== L_P(P0) ? ' Primero la ordenamos y juntamos semejantes.' : ''), LA(e) !== L_P(P0) ? [LA(e), `=${L_P(P0)}`] : L_P(P0));
  const r = factorizarPoly(P0, P), prod = productoFactores(r.k, r.fs), res = L_producto(r.k, r.fs);
  P('Verificamos', 'Multiplicamos todos los factores (con la distributiva) y tiene que volver a dar la expresión original.', `${res}=${L_P(prod)}\\;${Peq(prod, P0) ? '\\checkmark' : ''}`);
  return { tema: 'factorizacion', metodo: 'Casos de factoreo', pasos, resultado: `${L_P(P0)}=${res}` };
}

/* -----------------------------------------------------------------------
 * A9. RAÍCES DE UN POLINOMIO
 * --------------------------------------------------------------------- */
function resolverRaices(texto) {
  let t = texto.replace(/^.*?\b(raices|raíces|ceros|soluciones)\s*(reales\s*)?(de|del polinomio)?\s*:?\s*/i, '').replace(/^p\(\s*x\s*\)\s*=/i, '');
  const rel = /=/.test(t) ? relAlg(t) : null;
  const P0 = Pred(rel ? Psub(aPoly(rel.izq), aPoly(rel.der)) : aPoly(exprAlg(t)));
  const vs = Pvars(P0); if (vs.length !== 1) throw new Error('Para buscar raíces, el polinomio tiene que tener una sola letra.');
  const x = vs[0]; const { pasos, P } = crearPasos();
  P('Planteamos', `Las raíces son los valores de ${x} que hacen P(${x}) = 0. Para encontrarlas factorizamos el polinomio: cada factor de grado 1 nos da una raíz.`, `P(${x})=${L_P(P0)}=0`);
  const r = factorizarPoly(P0, P), raices = [];
  for (const f of r.fs) {
    if (f.irr) { raices.push({ L: f.L.replace(new RegExp(`^${x}-`), '').replace(/^\\left\(|\\right\)$/g, ''), e: f.e, x: null }); continue; }
    const u = aU(f.P, x);
    if (uGrado(u) === 1) { const q = u[0].neg().div(u[1]); raices.push({ L: L_frac(q), e: f.e, q }); }
    else if (uGrado(u) === 2) { const R = raicesCuadratica(u[2], u[1], u[0]); if (R.tipo === 'comp') R.L.forEach(l => raices.push({ L: l, e: f.e, comp: true })); }
  }
  raices.sort((a, b) => (a.q && b.q ? a.q.cmp(b.q) : a.q ? -1 : b.q ? 1 : 0));
  const mult = e => (e === 2 ? ' (doble)' : e === 3 ? ' (triple)' : e > 3 ? ` (multiplicidad ${e})` : '');
  P('Leemos las raíces', 'Igualamos cada factor a cero. Si un factor está elevado a una potencia, la raíz se repite (eso es su multiplicidad).' + (raices.some(z => z.comp) ? ' Los factores de grado 2 sin raíces reales dan raíces complejas conjugadas.' : ''), raices.length ? raices.map((z, i) => `${x}_{${i + 1}}=${z.L}${mult(z.e) ? '\\;' + tx(mult(z.e)) : ''}`) : [tx('No tiene raíces racionales que se puedan encontrar con estos métodos.')]);
  const u0 = aU(P0, x);
  P('Verificamos', 'Reemplazamos cada raíz en el polinomio: tiene que dar 0.', raices.filter(z => z.q).map(z => `P(${L_frac(z.q)})=${L_frac(uEval(u0, z.q))}\\;${uEval(u0, z.q).cero ? '\\checkmark' : ''}`).concat(raices.some(z => !z.q && !z.comp) ? [tx('Las raíces irracionales salen de la resolvente, que ya verifica el producto de factores.')] : []).concat(raices.length ? [] : [tx('Sin raíces para verificar.')]));
  return { tema: 'raices', metodo: 'Factorización (Gauss, Ruffini y resolvente)', pasos, resultado: raices.length ? raices.map(z => z.L + (z.e > 1 ? `^{(${z.e})}` : '')).join(',\\;') : tx('sin raíces racionales') };
}

/* -----------------------------------------------------------------------
 * A10. FRACCIONES ALGEBRAICAS (una letra)
 * --------------------------------------------------------------------- */
function fraccionDe(e) {                                     // árbol → {n, d} (polinomios en una letra)
  e = sinParA(e);
  if (e.t === 'div') { const a = fraccionDe(e.a), b = fraccionDe(e.b); return { n: Pred(Pmul(a.n, b.d)), d: Pred(Pmul(a.d, b.n)) }; }
  if (e.t === 'mul') { const a = fraccionDe(e.a), b = fraccionDe(e.b); return { n: Pred(Pmul(a.n, b.n)), d: Pred(Pmul(a.d, b.d)) }; }
  return { n: Pred(aPoly(e)), d: Pc(Q1) };
}
function factoresL(P) { const { pasos, P: Pp } = crearPasos(); const r = factorizarPoly(P, Pp); if (r.fs.length === 1 && r.fs[0].e === 1 && r.k.eq(Q1) && !r.fs[0].irr) return L_P(r.fs[0].P); return L_producto(r.k, r.fs); }
function restricciones(D, x) {
  const u = aU(D, x); if (!u || uGrado(u) < 1) return [];
  const { pasos, P: Pp } = crearPasos(); const r = factorizarPoly(D, Pp), out = [];
  for (const f of r.fs) { if (f.irr) out.push(f.L.replace(new RegExp(`^${x}-`), '').replace(/^\\left\(|\\right\)$/g, '')); else { const v = aU(f.P, x); if (uGrado(v) === 1) out.push(L_frac(v[0].neg().div(v[1]))); } }
  return out;
}
function resolverFraccionAlg(texto) {
  const t = texto.replace(/^\s*(simplificar|simplifica|operar|resolver|calcular)\s*:?\s*/i, '');
  const e = exprAlg(t), vs = varsDe(e); if (vs.length !== 1) throw new Error('Por ahora las fracciones algebraicas tienen que tener una sola letra.');
  const x = vs[0]; const { pasos, P } = crearPasos(); const top = sinParA(e);
  P('Escribimos la expresión', 'Una fracción algebraica es un cociente de polinomios. Para simplificar u operar, el método es siempre el mismo: factorizar todo.', LA(e));
  let N, D;
  const fr = n => fraccionDe(n);
  const ops = top.t === 'add' ? top.items : null;
  if (ops && ops.length === 2) {
    const A = fr(ops[0].e), B = fr(ops[1].e), s = ops[1].op;
    P('Factorizamos los denominadores', 'Así se ve qué factores tienen en común y cuál es el denominador común (el mínimo común múltiplo).', [`${L_P(A.d)}=${factoresL(A.d)}`, `${L_P(B.d)}=${factoresL(B.d)}`]);
    const ua = aU(A.d, x), ub = aU(B.d, x), g = uMcd(ua, ub), mcm = uDiv(uMul(ua, ub), g).q;
    const fa = uDiv(mcm, ua).q, fb = uDiv(mcm, ub).q;
    N = Pred((s === '-' ? Psub : Padd)(Pmul(A.n, deU(fa, x)), Pmul(B.n, deU(fb, x)))); D = deU(mcm, x);
    P('Buscamos el denominador común', 'Multiplicamos cada numerador por lo que le falta a su denominador para llegar al común.', [`\\text{común: }${factoresL(D)}`, `\\frac{${L_Pp(A.n)}\\cdot ${L_Pp(deU(fa, x))}${s}${L_Pp(B.n)}\\cdot ${L_Pp(deU(fb, x))}}{${factoresL(D)}}=\\frac{${L_P(N)}}{${factoresL(D)}}`]);
  } else if (top.t === 'mul' || (top.t === 'div' && sinParA(top.a).t === 'div')) {
    const A = fr(top.a), B = fr(top.b), div = top.t === 'div';
    N = Pred(Pmul(A.n, div ? B.d : B.n)); D = Pred(Pmul(A.d, div ? B.n : B.d));
    P(div ? 'Multiplicamos por la inversa' : 'Multiplicamos', div ? 'Para dividir fracciones algebraicas, multiplicamos la primera por la inversa de la segunda.' : 'Multiplicamos numeradores entre sí y denominadores entre sí. Conviene dejarlos factorizados para simplificar.', `\\frac{${factoresL(A.n)}\\cdot ${factoresL(div ? B.d : B.n)}}{${factoresL(A.d)}\\cdot ${factoresL(div ? B.n : B.d)}}`);
  } else { const f = fr(e); N = f.n; D = f.d; }
  const rest = restricciones(D, x);
  P('Factorizamos numerador y denominador', 'Escribimos todo como producto para ver qué factores se repiten arriba y abajo.', `\\frac{${L_P(N)}}{${L_P(D)}}=\\frac{${factoresL(N)}}{${factoresL(D)}}`);
  if (rest.length) P('Anotamos las restricciones', 'El denominador no puede ser 0: los valores que lo anulan quedan excluidos (aunque después se simplifiquen).', `${x}\\ne ${rest.join(',\\;')}`);
  const un = aU(N, x), ud = aU(D, x), g = uMcd(un, ud);
  let n2 = uDiv(un, g).q, d2 = uDiv(ud, g).q; const lc = d2[uGrado(d2)]; n2 = n2.map(c => c.div(lc)); d2 = d2.map(c => c.div(lc));
  const N2 = deU(n2, x), D2 = deU(d2, x), simple = uGrado(d2) === 0;
  P('Simplificamos', uGrado(g) > 0 ? 'Tachamos los factores que están en el numerador y en el denominador (se puede porque son multiplicaciones).' : 'No hay factores comunes: la fracción ya está simplificada.', simple ? L_P(N2) : `\\frac{${factoresL(N2)}}{${factoresL(D2)}}`);
  const xv = [2.37, -1.61].find(v => Math.abs(PevalN(D, { [x]: v })) > 1e-9) || 3.1;
  const a = evalA(e, { [x]: xv }), b = PevalN(N2, { [x]: xv }) / PevalN(D2, { [x]: xv });
  const res = simple ? L_P(N2) : `\\frac{${factoresL(N2)}}{${factoresL(D2)}}`;
  P('Verificamos', `Reemplazamos ${x} por un número cualquiera (que no anule denominadores) en la expresión original y en el resultado.`, `${x}=${fmtX(xv).replace(',', '{,}')}:\\quad ${L_x(a)}=${L_x(b)}\\;${aproxIgual(a, b) ? '\\checkmark' : ''}`);
  return { tema: 'fracciones', metodo: 'Factorización y simplificación', pasos, resultado: res + (rest.length ? `\\quad(${x}\\ne ${rest.join(',\\,')})` : '') };
}

/* -----------------------------------------------------------------------
 * A11. GRÁFICOS SENCILLOS EN SVG (rectas, puntos, recta numérica)
 * --------------------------------------------------------------------- */
function svgPlano(rectas, puntos = []) {
  const xs = [0, ...puntos.map(p => p[0])], ys = [0, ...puntos.map(p => p[1])];
  rectas.forEach(r => { if (r.v != null) xs.push(r.v); else { ys.push(r.b); if (r.m) xs.push(-r.b / r.m); } });
  let x0 = Math.min(...xs) - 3, x1 = Math.max(...xs) + 3, y0 = Math.min(...ys) - 3, y1 = Math.max(...ys) + 3;
  const W = 320, H = 240, sx = W / (x1 - x0), sy = H / (y1 - y0), X = x => (x - x0) * sx, Y = y => H - (y - y0) * sy;
  const paso = Math.max(1, Math.round((x1 - x0) / 10));
  let g = '';
  for (let x = Math.ceil(x0 / paso) * paso; x <= x1; x += paso) g += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${H}" class="gr"/>${x ? `<text x="${X(x)}" y="${Math.min(H - 3, Math.max(12, Y(0) + 13))}" class="et">${x}</text>` : ''}`;
  for (let y = Math.ceil(y0 / paso) * paso; y <= y1; y += paso) g += `<line x1="0" y1="${Y(y)}" x2="${W}" y2="${Y(y)}" class="gr"/>${y ? `<text x="${Math.min(W - 14, Math.max(3, X(0) + 4))}" y="${Y(y) - 2}" class="et" text-anchor="start">${y}</text>` : ''}`;
  g += `<line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" class="ej"/><line x1="${X(0)}" y1="0" x2="${X(0)}" y2="${H}" class="ej"/>`;
  rectas.forEach((r, i) => { const c = i ? 'r2' : 'r1'; g += r.v != null ? `<line x1="${X(r.v)}" y1="0" x2="${X(r.v)}" y2="${H}" class="${c}"/>` : `<line x1="0" y1="${Y(r.m * x0 + r.b)}" x2="${W}" y2="${Y(r.m * x1 + r.b)}" class="${c}"/>`; });
  puntos.forEach(([x, y, l]) => { g += `<circle cx="${X(x)}" cy="${Y(y)}" r="4.5" class="pt"/>${l ? `<text x="${X(x) + 7}" y="${Y(y) - 7}" class="et pl" text-anchor="start">${l}</text>` : ''}`; });
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico">${g}</svg>`;
}
// Recta numérica con intervalos sombreados: intervalos = [{a, b, ca, cb}] (a/b pueden ser ±Infinity; c = cerrado)
function svgRecta(intervalos, marcas) {
  const vals = marcas.map(m => m.x), lo = Math.min(...vals) - 2, hi = Math.max(...vals) + 2, W = 320, X = x => 15 + (Math.max(lo, Math.min(hi, x)) - lo) / (hi - lo) * (W - 30);
  let g = `<line x1="5" y1="30" x2="${W - 5}" y2="30" class="ej"/>`;
  intervalos.forEach(iv => { g += `<line x1="${X(iv.a)}" y1="30" x2="${X(iv.b)}" y2="30" class="sol"/>`; });
  marcas.forEach(m => { g += `<circle cx="${X(m.x)}" cy="30" r="5" class="${m.cerrado ? 'pt' : 'hueco'}"/><text x="${X(m.x)}" y="52" class="et">${m.L}</text>`; });
  return `<svg class="grafico recta" viewBox="0 0 ${W} 60" role="img" aria-label="Recta numérica">${g}</svg>`;
}

/* -----------------------------------------------------------------------
 * A12. ECUACIONES DE PRIMER GRADO
 * --------------------------------------------------------------------- */
function partesLineales(P, x) {                       // P = a·x + b  →  {a, b}
  let a = Q0, b = Q0;
  for (const m of Pred(P)) { const ks = Object.keys(m.v); if (!ks.length) b = b.add(m.c); else if (ks.length === 1 && ks[0] === x && m.v[x] === 1) a = a.add(m.c); else return null; }
  return { a, b };
}
function resolverPrimerGrado(rel, x) {
  const { pasos, P } = crearPasos();
  const Lz = aPoly(rel.izq), Rz = aPoly(rel.der), L1 = partesLineales(Lz, x), R1 = partesLineales(Rz, x);
  P('Escribimos la ecuación', 'Queremos encontrar el valor de ' + x + ' que hace verdadera la igualdad. Lo que hagamos de un lado lo tenemos que hacer del otro.', `${LA(rel.izq)}=${LA(rel.der)}`);
  const red = `${L_P(Lz)}=${L_P(Rz)}`;
  if (red !== `${LA(rel.izq)}=${LA(rel.der)}`) P('Resolvemos paréntesis y juntamos semejantes', 'Aplicamos la propiedad distributiva y sumamos los términos semejantes de cada miembro.', red);
  let { a: a1, b: b1 } = L1, { a: a2, b: b2 } = R1;
  const den = [a1, b1, a2, b2].reduce((s, q) => mcmB(s, q.d), 1n);
  if (den > 1n) {
    const k = new Q(den); [a1, b1, a2, b2] = [a1, b1, a2, b2].map(q => q.mul(k));
    P('Sacamos los denominadores', `Multiplicamos los dos miembros por ${T_ent(den)} (el mínimo común múltiplo de los denominadores) para trabajar sin fracciones.`, `${L_P(Pred([mono(a1, { [x]: 1 }), mono(b1)]))}=${L_P(Pred([mono(a2, { [x]: 1 }), mono(b2)]))}`);
  }
  const A = a1.sub(a2), B = b2.sub(b1);
  P('Pasamos de término', `Dejamos los términos con ${x} de un lado y los números del otro. Lo que está sumando pasa restando y lo que está restando pasa sumando.`, [`${L_P(Pred([mono(a1, { [x]: 1 }), mono(a2.neg(), { [x]: 1 })])) || '0'}=${L_P(Pred([mono(b2), mono(b1.neg())])) || '0'}`.replace(/^$/, '0'), `${L_P([mono(A, { [x]: 1 })]) || '0'}=${L_frac(B)}`]);
  if (A.cero) {
    const ok = B.cero;
    P('Analizamos', ok ? `La ${x} desaparece y queda 0 = 0, que es verdadero siempre: cualquier número es solución (la ecuación es una identidad).` : `La ${x} desaparece y queda 0 = ${fmtX(B.num())}, que es falso: la ecuación no tiene solución.`, `0=${L_frac(B)}`);
    const prueba = [QE(0), QE(1)].map(v => ({ v, a: Peval(Lz, { [x]: v }), b: Peval(Rz, { [x]: v }) }));
    P('Verificamos', ok ? `Probamos con dos valores cualesquiera de ${x}: en los dos casos los miembros dan lo mismo.` : `Probamos con dos valores cualesquiera de ${x}: los miembros nunca dan lo mismo.`, prueba.map(p => `${x}=${L_frac(p.v)}:\\quad ${L_frac(p.a)}${p.a.eq(p.b) ? '=' : '\\ne '}${L_frac(p.b)}\\;\\checkmark`));
    return { tema: 'primergrado', metodo: 'Despeje', pasos, resultado: ok ? `${tx('Infinitas soluciones: ')}${x}\\in\\mathbb{R}` : tx('No tiene solución') };
  }
  const sol = B.div(A);
  if (!A.eq(Q1)) P('Despejamos ' + x, `El número que multiplica a ${x} pasa dividiendo${A.n < 0n ? ' (con su signo: como es negativo, el resultado cambia de signo)' : ''}.`, `${x}=\\frac{${L_frac(B)}}{${L_frac(A)}}=${L_frac(sol)}`);
  const vi = Peval(Lz, { [x]: sol }), vd = Peval(Rz, { [x]: sol });
  P('Verificamos', `Reemplazamos ${x} = ${fmtX(sol.num())} en la ecuación original: los dos miembros tienen que dar lo mismo.`, [`${LA(rel.izq, { [x]: sol })}=${L_frac(vi)}`, `${LA(rel.der, { [x]: sol })}=${L_frac(vd)}\\;${vi.eq(vd) ? '\\checkmark' : ''}`]);
  return { tema: 'primergrado', metodo: 'Despeje (propiedad uniforme)', pasos, resultado: `${x}=${L_frac(sol)}` };
}

/* -----------------------------------------------------------------------
 * A13. ECUACIONES DE SEGUNDO GRADO
 * --------------------------------------------------------------------- */
function resolverSegundoGrado(rel, x, metodo) {
  const { pasos, P } = crearPasos();
  const P0 = Pred(Psub(aPoly(rel.izq), aPoly(rel.der))), u = aU(P0, x);
  P('Escribimos la ecuación', 'Es de segundo grado: el mayor exponente de la incógnita es 2.', `${LA(rel.izq)}=${LA(rel.der)}`);
  const R = raicesCuadratica(u[2], u[1], u[0]);
  const ord = L_P(deU([QE(1).mul(new Q(R.C)), new Q(R.B), new Q(R.A)], x));
  if (`${ord}=0` !== `${LA(rel.izq)}=${LA(rel.der)}`) P('La llevamos a la forma general', 'Pasamos todo a un miembro, juntamos semejantes y, si hace falta, multiplicamos o dividimos para que los coeficientes queden enteros y simples.', `${ord}=0`);
  const a = R.A, b = R.B, c = R.C, sol = [];
  P('Identificamos a, b y c', 'Comparamos con $ax^2 + bx + c = 0$. El signo es parte del número.', `a=${L_ent(a)},\\quad b=${L_ent(b)},\\quad c=${L_ent(c)}`);
  let met;
  if (b === 0n || c === 0n) {
    if (c === 0n) {
      met = 'Factor común (incompleta)';
      const r2 = new Q(-b, a);
      P('Sacamos factor común', `Como c = 0, todos los términos tienen ${x}. Sacamos ${x} de factor común y usamos que si un producto da 0, alguno de los factores es 0.`, [`${x}\\left(${L_U([new Q(b), new Q(a)], x)}\\right)=0`, `${x}_{1}=0,\\quad ${x}_{2}=${L_frac(r2)}`]);
      sol.push(Q0, r2);
    } else {
      met = 'Despeje de la incógnita al cuadrado (incompleta)';
      const q = new Q(-c, a);
      P(`Despejamos ${x}²`, `Como b = 0, no hay término con ${x} sola: despejamos ${x}² y sacamos raíz cuadrada (con las dos posibilidades, + y −).`, `${x}^{2}=${L_frac(q)}`);
      if (q.n < 0n) { P('Analizamos', `${x}² no puede ser negativo en los reales: las soluciones son complejas.`, `${x}_{1,2}=${R.Lpm}`); return { tema: 'segundogrado', metodo: met, pasos, resultado: `${x}_{1,2}=${R.Lpm}` }; }
      P('Sacamos raíz cuadrada', '', `${x}=\\pm\\sqrt{${L_frac(q)}}=${R.tipo === 'rac' ? '\\pm' + L_frac(R.r[0].abs()) : R.Lpm}`);
      if (R.tipo === 'rac') sol.push(...R.r);
    }
  } else if (metodo === 'completar') {
    met = 'Completar cuadrados';
    const A_ = new Q(a), B_ = new Q(b), C_ = new Q(c), h = B_.div(A_.mul(QE(2))), dr = new Q(R.D, 4n * a * a);
    P('Dividimos por a', 'Queremos que el coeficiente principal sea 1 y dejamos el número solo del otro lado.', `${x}^{2}${L_mono(mono(B_.div(A_), { [x]: 1 }), false)}=${L_frac(C_.neg().div(A_))}`);
    P('Completamos el cuadrado', `Sumamos a los dos lados el cuadrado de la mitad del coeficiente de ${x}: $${par(L_frac(h))}^2 = ${L_frac(h.mul(h))}$. Así el primer miembro es un trinomio cuadrado perfecto.`, `${par(x + (h.n < 0n ? '' : '+') + L_frac(h))}^{2}=${L_frac(dr)}`);
    P('Sacamos raíz cuadrada', 'Con las dos posibilidades: + y −.', `${x}${h.n < 0n ? '' : '+'}${L_frac(h)}=\\pm\\sqrt{${L_frac(dr)}}\\;\\Rightarrow\\;${x}_{1,2}=${R.Lpm || L_frac(R.r[0]) + ',\\;' + L_frac(R.r[1])}`);
    if (R.tipo === 'rac') sol.push(...R.r);
  } else {
    met = 'Fórmula resolvente';
    P('Calculamos el discriminante', 'El discriminante dice cuántas soluciones reales hay: si es positivo, dos; si es 0, una (doble); si es negativo, ninguna real (son complejas).', `\\Delta=b^{2}-4ac=${par(L_ent(b))}^{2}-4\\cdot ${par(L_ent(a))}\\cdot ${par(L_ent(c))}=${L_ent(R.D)}`);
    P('Aplicamos la fórmula resolvente', 'Reemplazamos a, b y Δ en la fórmula. Ojo con −b: es el opuesto de b.', [`${x}_{1,2}=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}=\\frac{${L_ent(-b)}\\pm\\sqrt{${L_ent(R.D)}}}{${L_ent(2n * a)}}`, R.tipo === 'rac' ? `${x}_{1}=${L_frac(R.r[0])},\\quad ${x}_{2}=${L_frac(R.r[1])}` : `${x}_{1,2}=${R.Lpm}`]);
    if (R.tipo === 'rac') sol.push(...R.r);
  }
  if (sol.length) {
    const uniq = sol.filter((s, i) => sol.findIndex(z => z.eq(s)) === i);
    P('Verificamos', 'Reemplazamos cada solución en la ecuación original: los dos miembros tienen que dar lo mismo.', uniq.map(s => `${x}=${L_frac(s)}:\\quad ${L_frac(Peval(aPoly(rel.izq), { [x]: s }))}=${L_frac(Peval(aPoly(rel.der), { [x]: s }))}\\;${Peval(P0, { [x]: s }).cero ? '\\checkmark' : ''}`));
    return { tema: 'segundogrado', metodo: met, pasos, resultado: uniq.length === 1 ? `${x}=${L_frac(uniq[0])}\\;${tx('(raíz doble)')}` : `${x}_{1}=${L_frac(uniq[0])},\\quad ${x}_{2}=${L_frac(uniq[1])}`, alternativas: b && c ? [{ nombre: metodo === 'completar' ? 'Ver con la resolvente' : 'Ver completando cuadrados', metodo: metodo === 'completar' ? 'resolvente' : 'completar' }] : [] };
  }
  P('Verificamos', 'Usamos las propiedades de las raíces: la suma tiene que dar −b/a y el producto, c/a.', [`${x}_{1}+${x}_{2}=${L_frac(new Q(2n * R.p, R.rr))}=-\\frac{b}{a}=${L_frac(new Q(-b, a))}\\;\\checkmark`, `${x}_{1}\\cdot ${x}_{2}=${L_frac(new Q(c, a))}=\\frac{c}{a}\\;\\checkmark`]);
  return { tema: 'segundogrado', metodo: met, pasos, resultado: `${x}_{1,2}=${R.Lpm}`, alternativas: b && c ? [{ nombre: metodo === 'completar' ? 'Ver con la resolvente' : 'Ver completando cuadrados', metodo: metodo === 'completar' ? 'resolvente' : 'completar' }] : [] };
}

/* -----------------------------------------------------------------------
 * A14. DESIGUALDADES (inecuaciones)
 * --------------------------------------------------------------------- */
const voltear = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };
function L_intervalo(ivs) {
  if (!ivs.length) return '\\varnothing';
  return ivs.map(iv => `${iv.ca ? '[' : '('}${iv.a === -Infinity ? '-\\infty' : iv.La},\\,${iv.b === Infinity ? '+\\infty' : iv.Lb}${iv.cb ? ']' : ')'}`).join('\\cup ');
}
function resolverDesigualdad(rel, x) {
  const { pasos, P } = crearPasos();
  if (rel.op2) {                                                  // a < expr < b
    const mid = partesLineales(aPoly(rel.der), x), A = Pred(aPoly(rel.izq)), C = Pred(aPoly(rel.ter));
    if (!mid || A.length > 1 || C.length > 1 || Pvars(Padd(A, C)).length) throw new Error('La doble desigualdad tiene que ser de la forma a < (expresión lineal) < b.');
    const a = A.length ? A[0].c : Q0, c = C.length ? C[0].c : Q0;
    P('Escribimos la doble desigualdad', 'Hacemos la misma operación en las tres partes a la vez.', `${LA(rel.izq)}${relL[rel.op]}${LA(rel.der)}${relL[rel.op2]}${LA(rel.ter)}`);
    let lo = a.sub(mid.b), hi = c.sub(mid.b), o1 = rel.op, o2 = rel.op2;
    P('Restamos en las tres partes', `Restamos ${fmtX(mid.b.num())} para dejar solo el término con ${x}.`, `${L_frac(lo)}${relL[o1]}${L_P([mono(mid.a, { [x]: 1 })])}${relL[o2]}${L_frac(hi)}`);
    lo = lo.div(mid.a); hi = hi.div(mid.a);
    if (mid.a.n < 0n) { [lo, hi] = [hi, lo]; [o1, o2] = [voltear[o2], voltear[o1]]; }
    P('Dividimos en las tres partes', mid.a.n < 0n ? 'Dividimos por un número negativo: las desigualdades se dan vuelta.' : `Dividimos por ${fmtX(mid.a.num())}, que es positivo: las desigualdades se mantienen.`, `${L_frac(lo)}${relL[o1]}${x}${relL[o2]}${L_frac(hi)}`);
    const iv = [{ a: lo.num(), b: hi.num(), La: L_frac(lo), Lb: L_frac(hi), ca: o1 === '≤', cb: o2 === '≤' }];
    const pr = lo.add(hi).div(QE(2));
    P('Verificamos', `Probamos con un valor del intervalo, por ejemplo ${x} = ${fmtX(pr.num())}.`, `${LA(rel.izq)}${relL[rel.op]}${L_frac(Peval(aPoly(rel.der), { [x]: pr }))}${relL[rel.op2]}${LA(rel.ter)}\\;\\checkmark`, svgRecta(iv, [{ x: lo.num(), L: fmtX(lo.num()), cerrado: iv[0].ca }, { x: hi.num(), L: fmtX(hi.num()), cerrado: iv[0].cb }]));
    return { tema: 'desigualdades', metodo: 'Doble desigualdad', pasos, resultado: `${x}\\in ${L_intervalo(iv)}` };
  }
  const izqAbs = sinParA(rel.izq).t === 'abs';
  if (izqAbs) {
    const u = partesLineales(aPoly(sinParA(rel.izq).e), x), K = Pred(aPoly(rel.der)); if (!u || K.length > 1 || Pvars(K).length) throw new Error('Para el valor absoluto escribí |expresión lineal| < número.');
    const k = K.length ? K[0].c : Q0, men = rel.op === '<' || rel.op === '≤', cer = rel.op === '≤' || rel.op === '≥';
    P('Escribimos la inecuación', 'El valor absoluto es la distancia al cero.', `${LA(rel.izq)}${relL[rel.op]}${L_frac(k)}`);
    if (k.n < 0n) { P('Analizamos', 'Un valor absoluto nunca es negativo.', tx(men ? 'No hay solución.' : 'Se cumple para todo número real.')); return { tema: 'desigualdades', metodo: 'Valor absoluto', pasos, resultado: men ? '\\varnothing' : `${x}\\in\\mathbb{R}` }; }
    const r1 = k.neg().sub(u.b).div(u.a), r2 = k.sub(u.b).div(u.a), lo = r1.cmp(r2) < 0 ? r1 : r2, hi = r1.cmp(r2) < 0 ? r2 : r1;
    P('Sacamos el valor absoluto', men ? `|u| ${rel.op} k significa que u está a menos de k del cero: −k ${rel.op} u ${rel.op} k.` : `|u| ${rel.op} k significa que u está lejos del cero: u ${rel.op === '>' ? '<' : '≤'} −k o u ${rel.op} k.`, men ? `${L_frac(k.neg())}${relL[rel.op]}${LA(sinParA(rel.izq).e)}${relL[rel.op]}${L_frac(k)}` : `${LA(sinParA(rel.izq).e)}${relL[voltear[rel.op]]}${L_frac(k.neg())}\\quad\\text{o}\\quad ${LA(sinParA(rel.izq).e)}${relL[rel.op]}${L_frac(k)}`);
    const iv = men ? [{ a: lo.num(), b: hi.num(), La: L_frac(lo), Lb: L_frac(hi), ca: cer, cb: cer }] : [{ a: -Infinity, b: lo.num(), Lb: L_frac(lo), cb: cer }, { a: hi.num(), b: Infinity, La: L_frac(hi), ca: cer }];
    P('Despejamos', `Resolvemos para ${x} (si dividimos por un negativo, se dan vuelta las desigualdades).`, `${x}\\in ${L_intervalo(iv)}`, svgRecta(iv, [{ x: lo.num(), L: fmtX(lo.num()), cerrado: cer }, { x: hi.num(), L: fmtX(hi.num()), cerrado: cer }]));
    const t = men ? lo.add(hi).div(QE(2)) : hi.add(Q1);
    P('Verificamos', `Probamos con ${x} = ${fmtX(t.num())}, que está en la solución.`, `${LA(rel.izq, { [x]: t })}=${L_frac(Peval(aPoly(sinParA(rel.izq).e), { [x]: t }).abs())}${relL[rel.op]}${L_frac(k)}\\;\\checkmark`);
    return { tema: 'desigualdades', metodo: 'Valor absoluto', pasos, resultado: `${x}\\in ${L_intervalo(iv)}` };
  }
  const D = Pred(Psub(aPoly(rel.izq), aPoly(rel.der))), u = aU(D, x); if (!u) throw new Error('La inecuación tiene que tener una sola letra.');
  P('Escribimos la inecuación', 'Se resuelve casi igual que una ecuación, con una diferencia importante: si multiplicamos o dividimos por un número negativo, la desigualdad se da vuelta.', `${LA(rel.izq)}${relL[rel.op]}${LA(rel.der)}`);
  const op = rel.op, cer = op === '≤' || op === '≥';
  if (uGrado(u) === 1) {
    const a = u[1], b = u[0];
    P('Pasamos todo de un lado', `Dejamos los términos con ${x} de un lado y los números del otro.`, `${L_P([mono(a, { [x]: 1 })])}${relL[op]}${L_frac(b.neg())}`);
    const r = b.neg().div(a), o = a.n < 0n ? voltear[op] : op;
    P('Despejamos', a.n < 0n ? `Dividimos por ${fmtX(a.num())}, que es negativo: la desigualdad se da vuelta.` : `Dividimos por ${fmtX(a.num())}, que es positivo: la desigualdad se mantiene.`, `${x}${relL[o]}${L_frac(r)}`);
    const iv = o === '<' || o === '≤' ? [{ a: -Infinity, b: r.num(), Lb: L_frac(r), cb: cer }] : [{ a: r.num(), b: Infinity, La: L_frac(r), ca: cer }];
    P('Escribimos la solución', 'La expresamos como intervalo y la marcamos en la recta numérica (el punto lleno indica que el extremo está incluido).', `${x}\\in ${L_intervalo(iv)}`, svgRecta(iv, [{ x: r.num(), L: fmtX(r.num()), cerrado: cer }]));
    const t = o === '<' || o === '≤' ? r.sub(Q1) : r.add(Q1), f = r.add(o === '<' || o === '≤' ? Q1 : QE(-1)), cumple = v => { const s = uEval(u, v).signo; return op === '<' ? s < 0 : op === '>' ? s > 0 : op === '≤' ? s <= 0 : s >= 0; };
    P('Verificamos', 'Probamos con un número de la solución (tiene que cumplirse) y con uno de afuera (no tiene que cumplirse).', [`${x}=${L_frac(t)}:\\quad ${L_frac(Peval(aPoly(rel.izq), { [x]: t }))}${relL[op]}${L_frac(Peval(aPoly(rel.der), { [x]: t }))}\\;${cumple(t) ? '\\checkmark' : ''}`, `${x}=${L_frac(f)}:\\quad ${tx(cumple(f) ? 'se cumple' : 'no se cumple')}\\;${cumple(f) ? '' : '\\checkmark'}`]);
    return { tema: 'desigualdades', metodo: 'Despeje (con cambio de sentido si hace falta)', pasos, resultado: `${x}\\in ${L_intervalo(iv)}` };
  }
  if (uGrado(u) !== 2) throw new Error('Por ahora resuelvo inecuaciones de grado 1 o 2.');
  P('Pasamos todo de un lado', 'Comparamos la expresión con 0.', `${L_U(u, x)}${relL[op]}0`);
  const R = raicesCuadratica(u[2], u[1], u[0]), sa = u[2].signo, signo = s => (s > 0 ? '+' : '−');
  const quiere = s => (op === '<' ? s < 0 : op === '>' ? s > 0 : op === '≤' ? s <= 0 : s >= 0);
  let iv = [];
  if (R.tipo === 'comp' || R.D === 0n) {
    P('Buscamos las raíces', R.tipo === 'comp' ? 'El discriminante es negativo: la parábola no corta al eje x, así que la expresión tiene siempre el signo de a.' : 'El discriminante es 0: hay una raíz doble y la expresión tiene el signo de a en todos los demás puntos.', `\\Delta=${L_ent(R.D)}`);
    if (R.tipo === 'comp') iv = quiere(sa) ? [{ a: -Infinity, b: Infinity }] : [];
    else { const r = R.r[0]; iv = quiere(sa) ? (cer ? [{ a: -Infinity, b: Infinity }] : [{ a: -Infinity, b: r.num(), Lb: L_frac(r) }, { a: r.num(), b: Infinity, La: L_frac(r) }]) : (cer ? [{ a: r.num(), b: r.num(), La: L_frac(r), Lb: L_frac(r), ca: true, cb: true }] : []); }
  } else {
    const [v1, v2] = R.x[0] < R.x[1] ? [0, 1] : [1, 0], r1 = R.x[v1], r2 = R.x[v2], L1 = R.L[v1], L2 = R.L[v2];
    P('Buscamos las raíces', 'Las raíces son los puntos donde la expresión vale 0 y puede cambiar de signo.', `${x}_{1}=${L1},\\quad ${x}_{2}=${L2}`);
    const prueba = [r1 - 1, (r1 + r2) / 2, r2 + 1], sgs = prueba.map(t => Math.sign(u[2].num() * t * t + u[1].num() * t + u[0].num()));
    P('Armamos la tabla de signos', 'Probamos un número de cada intervalo para ver el signo de la expresión.', [], tabla(['Intervalo', `Probamos ${x} =`, 'Signo'], [[k$(`(-\\infty,\\,${L1})`), fmtX(prueba[0]), signo(sgs[0])], [k$(`(${L1},\\,${L2})`), fmtX(prueba[1]), signo(sgs[1])], [k$(`(${L2},\\,+\\infty)`), fmtX(prueba[2]), signo(sgs[2])]]));
    const tr = [{ a: -Infinity, b: r1, Lb: L1, cb: cer }, { a: r1, b: r2, La: L1, Lb: L2, ca: cer, cb: cer }, { a: r2, b: Infinity, La: L2, ca: cer }];
    iv = tr.filter((_, i) => quiere(sgs[i]));
  }
  P('Elegimos los intervalos', `Nos quedamos con los intervalos donde la expresión es ${op === '<' || op === '≤' ? 'negativa' : 'positiva'}${cer ? ' (incluimos las raíces, porque también vale el igual)' : ''}.`, `${x}\\in ${iv.length === 1 && iv[0].a === -Infinity && iv[0].b === Infinity ? '\\mathbb{R}' : L_intervalo(iv)}`, iv.length && R.tipo !== 'comp' ? svgRecta(iv, (R.x || []).map((v, i) => ({ x: v, L: fmtX(v), cerrado: cer }))) : '');
  const t = iv.length ? (iv[0].a === -Infinity ? (iv[0].b === Infinity ? 0 : iv[0].b - 1) : iv[0].b === Infinity ? iv[0].a + 1 : (iv[0].a + iv[0].b) / 2) : null;
  P('Verificamos', t === null ? 'No hay solución: probamos con cualquier número y no se cumple.' : `Probamos con ${x} = ${fmtX(t)}, que está en la solución.`, t === null ? tx('La expresión nunca tiene el signo pedido.') : `${L_x(u[2].num() * t * t + u[1].num() * t + u[0].num())}${relL[op]}0\\;\\checkmark`);
  return { tema: 'desigualdades', metodo: 'Raíces y tabla de signos', pasos, resultado: `${x}\\in ${iv.length === 1 && iv[0].a === -Infinity && iv[0].b === Infinity ? '\\mathbb{R}' : L_intervalo(iv)}` };
}

/* -----------------------------------------------------------------------
 * A15. FUNCIÓN LINEAL
 * --------------------------------------------------------------------- */
function leerPuntos(t) { return [...t.matchAll(/\(\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*[;,]\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*\)/g)].map(m => [m[1], m[2]].map(s => { const neg = s.startsWith('-'); const [a, b] = s.replace('-', '').split('/'); const q = leerDecimal(a).q.div(b ? leerDecimal(b).q : Q1); return neg ? q.neg() : q; })); }
function resolverFuncionLineal(texto) {
  const { pasos, P } = crearPasos(), t = plano(texto);
  let m, b, ptsDato = leerPuntos(texto);
  if (ptsDato.length >= 2 && /pasa|punto|recta/.test(t)) {
    const [[x1, y1], [x2, y2]] = ptsDato;
    if (x1.eq(x2)) { P('Analizamos', 'Los dos puntos tienen la misma x: es una recta vertical, que no es una función.', `x=${L_frac(x1)}`); return { tema: 'lineal', metodo: 'Dos puntos', pasos, resultado: `x=${L_frac(x1)}` }; }
    m = y2.sub(y1).div(x2.sub(x1));
    P('Calculamos la pendiente', 'La pendiente es cuánto cambia y cuando x aumenta 1: el cociente entre la variación de y y la variación de x.', `m=\\frac{y_2-y_1}{x_2-x_1}=\\frac{${L_frac(y2)}-${L_vp(V(y1))}}{${L_frac(x2)}-${L_vp(V(x1))}}=${L_frac(m)}`);
    b = y1.sub(m.mul(x1));
    P('Calculamos la ordenada al origen', 'Reemplazamos uno de los puntos en y = mx + b y despejamos b.', `${L_frac(y1)}=${L_frac(m)}\\cdot ${L_vp(V(x1))}+b\\;\\Rightarrow\\;b=${L_frac(b)}`);
  } else if (/pendiente/.test(t) && ptsDato.length === 1) {
    const mm = texto.match(/pendiente\s*(?:m\s*=\s*)?(-?\d+(?:[.,]\d+)?(?:\/\d+)?)/i); if (!mm) throw new Error('No encontré la pendiente.');
    const s = mm[1], neg = s.startsWith('-'), [a, c] = s.replace('-', '').split('/'); m = leerDecimal(a).q.div(c ? leerDecimal(c).q : Q1); if (neg) m = m.neg();
    const [x1, y1] = ptsDato[0]; b = y1.sub(m.mul(x1));
    P('Usamos la pendiente y el punto', 'Reemplazamos el punto en y = mx + b y despejamos b.', `${L_frac(y1)}=${L_frac(m)}\\cdot ${L_vp(V(x1))}+b\\;\\Rightarrow\\;b=${L_frac(b)}`);
  } else {
    const rhs = texto.replace(/^.*?(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, '');
    const L1 = partesLineales(aPoly(exprAlg(rhs)), 'x'); if (!L1) throw new Error('Escribí la función así: y = 2x − 3, o “recta que pasa por (1, 2) y (3, 8)”.');
    m = L1.a; b = L1.b;
    P('Escribimos la función', 'Una función lineal tiene la forma y = mx + b: m es la pendiente y b la ordenada al origen.', `y=${L_P(Pred([mono(m, { x: 1 }), mono(b)]))}`);
  }
  const f = `y=${L_P(Pred([mono(m, { x: 1 }), mono(b)])) || '0'}`;
  P('Identificamos pendiente y ordenada', `${m.signo > 0 ? 'Como la pendiente es positiva, la función es creciente' : m.signo < 0 ? 'Como la pendiente es negativa, la función es decreciente' : 'La pendiente es 0: la función es constante (recta horizontal)'}. La ordenada al origen es donde la recta corta al eje y.`, [`m=${L_frac(m)},\\quad b=${L_frac(b)}`, `\\text{corta al eje y en }(0;\\,${L_frac(b)})`]);
  const pts = [[0, b.num(), `(0; ${fmtX(b.num())})`]];
  if (!m.cero) { const r = b.neg().div(m); P('Calculamos la raíz', 'La raíz es donde la recta corta al eje x: hacemos y = 0 y despejamos x.', `0=${L_P(Pred([mono(m, { x: 1 }), mono(b)]))}\\;\\Rightarrow\\;x=${L_frac(r)}`); pts.push([r.num(), 0, `(${fmtX(r.num())}; 0)`]); }
  const filas = [-1, 0, 1, 2].map(x => [String(x), k$(L_frac(m.mul(QE(x)).add(b)))]);
  P('Tabla de valores y gráfico', 'Para graficar alcanza con dos puntos. Usamos la ordenada al origen y la pendiente: desde (0; b) avanzamos 1 en x y subimos (o bajamos) m en y.', [], `<div class="lado">${tabla(['x', 'y'], filas)}${svgPlano([{ m: m.num(), b: b.num() }], pts)}</div>`);
  const chk = ptsDato.length ? ptsDato.slice(0, 2).map(([x, y]) => `${L_frac(m)}\\cdot ${L_vp(V(x))}+${L_vp(V(b))}=${L_frac(m.mul(x).add(b))}=${L_frac(y)}\\;${m.mul(x).add(b).eq(y) ? '\\checkmark' : ''}`) : [`x=2:\\;y=${L_frac(m.mul(QE(2)).add(b))},\\quad x=3:\\;y=${L_frac(m.mul(QE(3)).add(b))}\\;\\Rightarrow\\;\\text{diferencia}=${L_frac(m)}=m\\;\\checkmark`];
  P('Verificamos', ptsDato.length ? 'Reemplazamos los puntos dados en la fórmula: tienen que cumplirla.' : 'Si x aumenta 1, y tiene que aumentar exactamente m.', chk);
  return { tema: 'lineal', metodo: ptsDato.length >= 2 ? 'Recta por dos puntos' : 'Pendiente y ordenada al origen', pasos, resultado: f };
}

/* -----------------------------------------------------------------------
 * A16. SISTEMAS DE ECUACIONES LINEALES (2×2 con cuatro métodos, 3×3 con Gauss)
 * --------------------------------------------------------------------- */
const L_fila = (a, c, vs) => `${L_P(Pred(vs.map((v, i) => mono(a[i], { [v]: 1 }))))||'0'}=${L_frac(c)}`;
const L_sistema = (filas, vs, labs) => `\\begin{cases}${filas.map((f, i) => L_fila(f.a, f.c, vs) + (labs ? `\\quad(${labs[i]})` : '')).join('\\\\')}\\end{cases}`;
function resolverSistema(texto, metodo) {
  const eqs = texto.replace(/^\s*(sistema|resolver el sistema)\s*:?\s*/i, '').split(/;|\n/).map(s => s.trim()).filter(Boolean);
  if (eqs.length < 2 || eqs.length > 3) throw new Error('Escribí 2 o 3 ecuaciones separadas por punto y coma. Ejemplo: 2x + y = 7; x − y = 2.');
  const rels = eqs.map(s => { const r = relAlg(s); if (!r || r.op !== '=') throw new Error(`“${s}” no es una ecuación.`); return r; });
  const vs = [...new Set(rels.flatMap(r => [...varsDe(r.izq), ...varsDe(r.der)]))].sort();
  if (vs.length !== eqs.length) throw new Error(`Hay ${eqs.length} ecuaciones y ${vs.length} incógnitas (${vs.join(', ')}). Tienen que ser la misma cantidad.`);
  const filas = rels.map((r, i) => {
    const D = Pred(Psub(aPoly(r.izq), aPoly(r.der))); const a = vs.map(() => Q0); let c = Q0;
    for (const m of D) { const ks = Object.keys(m.v); if (!ks.length) c = c.sub(m.c); else if (ks.length === 1 && m.v[ks[0]] === 1) a[vs.indexOf(ks[0])] = a[vs.indexOf(ks[0])].add(m.c); else throw new Error('El sistema tiene que ser lineal: sin productos de incógnitas ni potencias.'); }
    const den = [...a, c].reduce((s, q) => mcmB(s, q.d), 1n), g = [...a, c].reduce((s, q) => mcdB(s, q.mul(new Q(den)).n), 0n) || 1n, k = new Q(den, g);
    return { a: a.map(q => q.mul(k)), c: c.mul(k), lab: String(i + 1) };
  });
  const { pasos, P } = crearPasos();
  P('Escribimos el sistema', `Es un sistema de ${vs.length} ecuaciones con ${vs.length} incógnitas. Numeramos las ecuaciones para nombrarlas. Si hacía falta, pasamos las incógnitas a la izquierda, sacamos fracciones y simplificamos.`, [`\\begin{cases}${rels.map(r => `${LA(r.izq)}=${LA(r.der)}`).join('\\\\')}\\end{cases}`, L_sistema(filas, vs, filas.map(f => f.lab))]);
  let res, met;
  if (vs.length === 3) { met = 'Reducción (método de Gauss)'; res = gauss3(filas, vs, P); }
  else {
    const M = metodo || 'sustitucion';
    met = { sustitucion: 'Sustitución', igualacion: 'Igualación', reduccion: 'Reducción (sumas y restas)', determinantes: 'Determinantes (regla de Cramer)' }[M];
    res = M === 'determinantes' ? cramer2(filas, vs, P) : M === 'reduccion' ? reduccion2(filas, vs, P) : M === 'igualacion' ? igualacion2(filas, vs, P) : sustitucion2(filas, vs, P);
  }
  const alt = vs.length === 2 ? ['sustitucion', 'igualacion', 'reduccion', 'determinantes'].filter(k => k !== (metodo || 'sustitucion')).map(k => ({ nombre: 'Ver con ' + { sustitucion: 'sustitución', igualacion: 'igualación', reduccion: 'reducción', determinantes: 'determinantes' }[k], metodo: k })) : [];
  if (res.estado !== 'det') {
    if (vs.length === 2) {
      const j = [0, 1].find(i => !filas[0].a[i].cero), k = filas[1].a[j].div(filas[0].a[j]);
      const prop = filas[1].a.every((q, i) => q.eq(filas[0].a[i].mul(k)));
      P('Verificamos', `Multiplicamos la ecuación (1) por ${fmtX(k.num())}: el primer miembro queda igual al de la (2)${res.estado === 'indet' ? ' y el segundo también, así que son la misma ecuación' : ', pero el segundo miembro no, así que las dos ecuaciones se contradicen'}.`, `${par(L_fila(filas[0].a, filas[0].c, vs))}\\cdot ${L_vp(V(k))}\\;\\Rightarrow\\;${L_fila(filas[0].a.map(q => q.mul(k)), filas[0].c.mul(k), vs)}\\quad\\text{vs.}\\quad ${L_fila(filas[1].a, filas[1].c, vs)}\\;${prop ? '\\checkmark' : ''}`);
    } else P('Verificamos', 'Al eliminar incógnitas, una ecuación se anuló por completo: eso pasa solo cuando es combinación de las otras.', `${res.estado === 'indet' ? '0=0' : '0\\ne 0'}\\;\\checkmark`);
    P('Clasificamos el sistema', res.estado === 'indet' ? 'Llegamos a 0 = 0: las ecuaciones dicen lo mismo y hay infinitas soluciones. Es un sistema compatible indeterminado.' : 'Llegamos a una igualdad falsa: no hay valores que cumplan todas las ecuaciones. Es un sistema incompatible.', res.estado === 'indet' ? '0=0' : tx('igualdad falsa'));
    return { tema: 'sistemas', metodo: met, pasos, resultado: tx(res.estado === 'indet' ? 'Infinitas soluciones (compatible indeterminado)' : 'Sin solución (incompatible)'), alternativas: alt };
  }
  const sub = Object.fromEntries(vs.map((v, i) => [v, res.vals[i]]));
  P('Verificamos', 'Reemplazamos los valores en cada ecuación original: en todas se tiene que cumplir la igualdad.', rels.map(r => `${LA(r.izq, sub)}=${L_frac(Peval(aPoly(r.izq), sub))}=${L_frac(Peval(aPoly(r.der), sub))}\\;${Peval(aPoly(r.izq), sub).eq(Peval(aPoly(r.der), sub)) ? '\\checkmark' : ''}`),
    vs.length === 2 ? svgPlano(filas.map(f => (f.a[1].cero ? { v: f.c.div(f.a[0]).num() } : { m: f.a[0].neg().div(f.a[1]).num(), b: f.c.div(f.a[1]).num() })), [[res.vals[0].num(), res.vals[1].num(), `(${fmtX(res.vals[0].num())}; ${fmtX(res.vals[1].num())})`]]) : '');
  P('Clasificamos el sistema', 'Tiene una única solución: es compatible determinado.' + (vs.length === 2 ? ' En el gráfico, las dos rectas se cortan en un solo punto.' : ''), vs.map((v, i) => `${v}=${L_frac(res.vals[i])}`).join(',\\quad '));
  return { tema: 'sistemas', metodo: met, pasos, resultado: vs.map((v, i) => `${v}=${L_frac(res.vals[i])}`).join(',\\quad '), alternativas: alt };
}
const desp = (f, i) => ({ p: f.c.div(f.a[i]), q: f.a[1 - i].neg().div(f.a[i]) });     // v_i = q·v_otro + p
const L_desp = (E, w) => L_P(Pred([mono(E.q, { [w]: 1 }), mono(E.p)])) || '0';
function sustitucion2(F, vs, P, nota) {
  let best = null;
  F.forEach((f, ri) => [1, 0].forEach(vi => { if (f.a[vi].cero) return; const s = f.a[vi].abs().eq(Q1) ? 0 : 1; if (!best || s < best.s) best = { ri, vi, s }; }));
  const { ri, vi } = best, oi = 1 - ri, v = vs[vi], w = vs[1 - vi], E = desp(F[ri], vi);
  P(`Despejamos ${v}`, (nota ? nota + ' ' : '') + `Método de sustitución: despejamos ${v} de la ecuación (${ri + 1})${F[ri].a[vi].abs().eq(Q1) ? ', que tiene coeficiente ±1 y así evitamos fracciones' : ''}, y la reemplazamos en la otra.`, `${v}=${L_desp(E, w)}`);
  const o = F[oi], A = o.a[vi].mul(E.q).add(o.a[1 - vi]), B = o.c.sub(o.a[vi].mul(E.p));
  P('Reemplazamos en la otra ecuación', `En la ecuación (${oi + 1}) cambiamos ${v} por la expresión entre paréntesis, aplicamos distributiva y juntamos los términos con ${w}.`, [`${vi === 0 ? `${L_frac(o.a[0])}\\cdot ${par(L_desp(E, w))}${L_mono(mono(o.a[1], { [w]: 1 }), false)}` : `${L_mono(mono(o.a[0], { [w]: 1 }), true)}${o.a[1].n < 0n ? '-' : '+'}${L_frac(o.a[1].abs())}\\cdot ${par(L_desp(E, w))}`}=${L_frac(o.c)}`, `${L_P([mono(A, { [w]: 1 })]) || '0'}=${L_frac(B)}`]);
  if (A.cero) return { estado: B.cero ? 'indet' : 'incomp' };
  const wv = B.div(A), vv = E.q.mul(wv).add(E.p);
  P(`Calculamos ${w} y ${v}`, `Despejamos ${w} y lo reemplazamos en la expresión que teníamos de ${v}.`, [`${w}=${L_frac(wv)}`, `${v}=${L_frac(E.q)}\\cdot ${L_vp(V(wv))}${E.p.n < 0n ? '' : '+'}${L_frac(E.p)}=${L_frac(vv)}`]);
  return { estado: 'det', vals: vi === 0 ? [vv, wv] : [wv, vv] };
}
function igualacion2(F, vs, P) {
  const vi = [1, 0].find(i => !F[0].a[i].cero && !F[1].a[i].cero);
  if (vi == null) return sustitucion2(F, vs, P, 'No se puede despejar la misma incógnita en las dos ecuaciones; usamos sustitución.');
  const v = vs[vi], w = vs[1 - vi], E1 = desp(F[0], vi), E2 = desp(F[1], vi);
  P(`Despejamos ${v} en las dos ecuaciones`, 'Método de igualación: despejamos la misma incógnita en las dos ecuaciones e igualamos.', [`(1)\\;${v}=${L_desp(E1, w)}`, `(2)\\;${v}=${L_desp(E2, w)}`]);
  const A = E1.q.sub(E2.q), B = E2.p.sub(E1.p);
  P('Igualamos', `Si ${v} es igual a las dos expresiones, las expresiones son iguales. Queda una ecuación con una incógnita.`, [`${L_desp(E1, w)}=${L_desp(E2, w)}`, `${L_P([mono(A, { [w]: 1 })]) || '0'}=${L_frac(B)}`]);
  if (A.cero) return { estado: B.cero ? 'indet' : 'incomp' };
  const wv = B.div(A), vv = E1.q.mul(wv).add(E1.p);
  P(`Calculamos ${w} y ${v}`, 'Despejamos y reemplazamos en la primera expresión.', [`${w}=${L_frac(wv)}`, `${v}=${L_frac(vv)}`]);
  return { estado: 'det', vals: vi === 0 ? [vv, wv] : [wv, vv] };
}
function reduccion2(F, vs, P) {
  const ei = [1, 0].find(i => !F[0].a[i].cero && !F[1].a[i].cero);
  if (ei == null) return sustitucion2(F, vs, P, 'Una ecuación ya tiene una sola incógnita; despejamos directamente.');
  const a1 = F[0].a[ei].n, a2 = F[1].a[ei].n, L = mcmB(a1, a2), m1 = L / absB(a1); let m2 = L / absB(a2); if ((a1 < 0n) === (a2 < 0n)) m2 = -m2;
  const s1 = { a: F[0].a.map(q => q.mul(new Q(m1))), c: F[0].c.mul(new Q(m1)) }, s2 = { a: F[1].a.map(q => q.mul(new Q(m2))), c: F[1].c.mul(new Q(m2)) };
  const sum = { a: s1.a.map((q, i) => q.add(s2.a[i])), c: s1.c.add(s2.c) };
  P(`Eliminamos ${vs[ei]}`, `Método de reducción: multiplicamos ${m1 !== 1n ? `la (1) por ${m1} ` : ''}${m1 !== 1n && m2 !== 1n ? 'y ' : ''}${m2 !== 1n ? `la (2) por ${T_ent(m2)} ` : ''}para que los coeficientes de ${vs[ei]} queden opuestos, y sumamos miembro a miembro.`, `\\begin{array}{r}${L_fila(s1.a, s1.c, vs)}\\\\ +\\;${L_fila(s2.a, s2.c, vs)}\\\\ \\hline ${L_fila(sum.a, sum.c, vs)}\\end{array}`);
  const A = sum.a[1 - ei]; if (A.cero) return { estado: sum.c.cero ? 'indet' : 'incomp' };
  const kv = sum.c.div(A), r = F[0], ev = r.c.sub(r.a[1 - ei].mul(kv)).div(r.a[ei]);
  P(`Calculamos ${vs[1 - ei]} y ${vs[ei]}`, `Despejamos ${vs[1 - ei]} y lo reemplazamos en la ecuación (1).`, [`${vs[1 - ei]}=${L_frac(kv)}`, `${vs[ei]}=${L_frac(ev)}`]);
  return { estado: 'det', vals: ei === 0 ? [ev, kv] : [kv, ev] };
}
const L_det = m => `\\begin{vmatrix}${m.map(f => f.map(L_frac).join('&')).join('\\\\')}\\end{vmatrix}`;
function cramer2(F, vs, P) {
  const det = m => m[0][0].mul(m[1][1]).sub(m[1][0].mul(m[0][1]));
  const M = [[F[0].a[0], F[0].a[1]], [F[1].a[0], F[1].a[1]]], Mx = [[F[0].c, F[0].a[1]], [F[1].c, F[1].a[1]]], My = [[F[0].a[0], F[0].c], [F[1].a[0], F[1].c]];
  const D = det(M), Dx = det(Mx), Dy = det(My);
  P('Calculamos los determinantes', `Regla de Cramer: Δ con los coeficientes; Δ${vs[0]} y Δ${vs[1]} reemplazando la columna de cada incógnita por los términos independientes. Un determinante de 2×2 es el producto de la diagonal principal menos el de la otra.`, [`\\Delta=${L_det(M)}=${L_frac(D)}`, `\\Delta_{${vs[0]}}=${L_det(Mx)}=${L_frac(Dx)}`, `\\Delta_{${vs[1]}}=${L_det(My)}=${L_frac(Dy)}`]);
  if (D.cero) return { estado: Dx.cero && Dy.cero ? 'indet' : 'incomp' };
  P('Dividimos', 'Cada incógnita es su determinante dividido el determinante del sistema.', [`${vs[0]}=\\frac{${L_frac(Dx)}}{${L_frac(D)}}=${L_frac(Dx.div(D))}`, `${vs[1]}=\\frac{${L_frac(Dy)}}{${L_frac(D)}}=${L_frac(Dy.div(D))}`]);
  return { estado: 'det', vals: [Dx.div(D), Dy.div(D)] };
}
function gauss3(F, vs, P) {
  const A = F.map(f => [...f.a, f.c]), n = 3, lab = F.map(f => f.lab); let next = 4;
  for (let col = 0; col < n; col++) {
    let piv = A.findIndex((f, i) => i >= col && !f[col].cero); if (piv < 0) continue;
    if (piv !== col) { [A[piv], A[col]] = [A[col], A[piv]]; [lab[piv], lab[col]] = [lab[col], lab[piv]]; }
    const lines = [];
    for (let i = col + 1; i < n; i++) {
      if (A[i][col].cero) continue;
      const f = A[i][col].div(A[col][col]); A[i] = A[i].map((x, j) => x.sub(f.mul(A[col][j])));
      const nl = String(next++); lines.push(`(${nl})=(${lab[i]})-${par(L_frac(f))}\\cdot(${lab[col]}):\\quad ${L_fila(A[i].slice(0, 3), A[i][3], vs)}`); lab[i] = nl;
    }
    if (lines.length) P(`Eliminamos ${vs[col]}`, `Usamos la ecuación (${lab[col]}) para que ${vs[col]} desaparezca de las de abajo: le restamos a cada una un múltiplo de esa ecuación.`, lines);
  }
  for (const f of A) if (f.slice(0, 3).every(x => x.cero)) return { estado: f[3].cero ? 'indet' : 'incomp' };
  P('Sistema escalonado', 'Cada ecuación tiene una incógnita menos que la anterior. Resolvemos de abajo hacia arriba.', L_sistema(A.map(f => ({ a: f.slice(0, 3), c: f[3] })), vs, lab));
  const x = [Q0, Q0, Q0];
  for (let i = n - 1; i >= 0; i--) { let s = A[i][3]; for (let j = i + 1; j < n; j++) s = s.sub(A[i][j].mul(x[j])); x[i] = s.div(A[i][i]); }
  P('Sustituimos hacia arriba', 'Con el valor de la última incógnita vamos reemplazando en las ecuaciones de arriba.', vs.slice().reverse().map((v, k) => `${v}=${L_frac(x[n - 1 - k])}`));
  return { estado: 'det', vals: x };
}

/* -----------------------------------------------------------------------
 * A17. RADICACIÓN
 * --------------------------------------------------------------------- */
// Un término radical: c·√r (r entero positivo libre de cuadrados; r = 1 es un racional)
const termRad = (c, r) => { const { k, m } = sqrtLibre(r); return { c: c.mul(new Q(k)), r: m }; };
const L_tr = (t, primero) => { const neg = t.c.n < 0n, a = t.c.abs(); const coef = t.r !== 1n && a.eq(Q1) ? '' : L_frac(a); return (primero ? (neg ? '-' : '') : (neg ? '-' : '+')) + coef + (t.r !== 1n ? `\\sqrt{${L_ent(t.r)}}` : ''); };
const L_trs = ts => (ts.length ? ts.map((t, i) => L_tr(t, i === 0)).join('') : '0');
function juntarRad(ts) { const m = new Map(); for (const t of ts) { const k = t.r.toString(); m.set(k, m.has(k) ? { c: m.get(k).c.add(t.c), r: t.r } : t); } return [...m.values()].filter(t => !t.c.cero).sort((a, b) => (a.r < b.r ? -1 : 1)); }
const mulTR = (a, b) => termRad(a.c.mul(b.c), a.r * b.r);
// Árbol aritmético → lista de términos radicales (solo raíces cuadradas de números)
function aRadicales(e) {
  e = sinParA(e);
  if (e.t === 'num') return [{ c: e.q, r: 1n }];
  if (e.t === 'raiz') { const a = sinParA(e.e); if (e.k !== 2 || a.t !== 'num' || !a.q.entero) throw null; return [termRad(Q1, a.q.n)]; }
  if (e.t === 'neg') return aRadicales(e.e).map(t => ({ c: t.c.neg(), r: t.r }));
  if (e.t === 'add') return e.items.flatMap(it => aRadicales(it.e).map(t => (it.op === '-' ? { c: t.c.neg(), r: t.r } : t)));
  if (e.t === 'mul') { const A = aRadicales(e.a), B = aRadicales(e.b); return A.flatMap(a => B.map(b => mulTR(a, b))); }
  throw null;
}
function resolverRadicacion(texto) {
  const t = texto.replace(/^\s*(racionalizar|racionaliza|simplificar|simplifica|extraer factores( de)?|resolver|calcular)\s*:?\s*/i, '');
  const e = exprAlg(t), top = sinParA(e); const { pasos, P } = crearPasos();
  // 1) Raíz de un monomio con letras: extraer factores
  if (top.t === 'raiz' && !contieneA(top.e, n => n.t === 'add')) {
    const m = Pred(aPoly(top.e)); if (m.length !== 1 || !m[0].c.entero || m[0].c.n < 0n) throw new Error('El radicando tiene que ser un monomio con coeficiente natural, por ejemplo √(72x^5y^2).');
    const k = top.k, mm = m[0]; let afuera = 1n, adentro = 1n; const fa = {}, fi = {};
    for (const [p, ex] of factoresPrimos(mm.c.n)) { afuera *= p ** BigInt(Math.floor(ex / k)); adentro *= p ** BigInt(ex % k); }
    for (const v in mm.v) { fa[v] = Math.floor(mm.v[v] / k); fi[v] = mm.v[v] % k; }
    const R = k === 2 ? '\\sqrt' : `\\sqrt[${k}]`, mon = (c, v) => L_P([mono(new Q(c), v)]);
    P('Escribimos la raíz', `Para simplificar, sacamos de la raíz todo lo que forme grupos de ${k} factores iguales. Suponemos que las letras representan números positivos.`, `${R}{${L_P(m)}}`);
    P('Descomponemos el radicando', 'Factorizamos el número en primos y separamos cada exponente en un múltiplo del índice más lo que sobra.', `${L_ent(mm.c.n)}=${L_fact(factoresPrimos(mm.c.n))}`);
    const ins = mon(adentro, fi);
    P('Extraemos los factores', `Cada exponente se divide por ${k}: el cociente sale de la raíz y el resto se queda adentro.`, Object.keys(mm.v).map(v => `${v}^{${mm.v[v]}}=${v}^{${k}\\cdot ${fa[v]}+${fi[v]}}`).concat([`${R}{${L_P(m)}}=${mon(afuera, fa)}${ins !== '1' ? R + '{' + ins + '}' : ''}`]));
    const res = `${mon(afuera, fa)}${ins !== '1' ? R + '{' + ins + '}' : ''}`.replace(/^1(?=\\sqrt)/, '');
    const val = Object.fromEntries(Object.keys(mm.v).map((v, i) => [v, [2, 3, 5][i % 3]])), a = evalA(e, val), b = Number(afuera) * Object.keys(fa).reduce((p, v) => p * val[v] ** fa[v], 1) * Math.pow(Number(adentro) * Object.keys(fi).reduce((p, v) => p * val[v] ** fi[v], 1), 1 / k);
    P('Verificamos', 'Reemplazamos las letras por números positivos en la raíz original y en el resultado.', `${Object.entries(val).map(([x, y]) => x + '=' + y).join(',\\;') || tx('sin letras')}:\\quad ${L_x(a)}=${L_x(b)}\\;${aproxIgual(a, b) ? '\\checkmark' : ''}`);
    return { tema: 'radicacion', metodo: 'Extracción de factores', pasos, resultado: res };
  }
  // 2) Racionalizar a / (denominador con raíces)
  if (top.t === 'div') {
    const N = aRadicales(top.a), D = juntarRad(aRadicales(top.b));
    if (D.every(x => x.r === 1n)) throw new Error('El denominador no tiene raíces: no hay nada que racionalizar.');
    P('Escribimos la expresión', 'Racionalizar es conseguir que el denominador no tenga raíces, multiplicando arriba y abajo por lo mismo (así la fracción no cambia).', `\\frac{${L_trs(N)}}{${L_trs(D)}}`);
    let mult;
    if (D.length === 1) { mult = [{ c: Q1, r: D[0].r }]; P('Elegimos por qué multiplicar', `El denominador tiene una sola raíz: multiplicamos por $\\sqrt{${L_ent(D[0].r)}}$, porque $\\sqrt{a}\\cdot\\sqrt{a} = a$.`, `\\frac{${L_trs(N)}}{${L_trs(D)}}\\cdot\\frac{\\sqrt{${L_ent(D[0].r)}}}{\\sqrt{${L_ent(D[0].r)}}}`); }
    else if (D.length === 2) { mult = [D[0], { c: D[1].c.neg(), r: D[1].r }]; P('Multiplicamos por el conjugado', 'El denominador es un binomio con raíces: multiplicamos por su conjugado (el mismo binomio con el signo del medio cambiado). Así aparece una diferencia de cuadrados y las raíces se van.', `\\frac{${L_trs(N)}}{${L_trs(D)}}\\cdot\\frac{${L_trs(mult)}}{${L_trs(mult)}}`); }
    else throw new Error('Por ahora racionalizo denominadores de uno o dos términos.');
    const Nn = juntarRad(N.flatMap(a => mult.map(b => mulTR(a, b)))), Dd = juntarRad(D.flatMap(a => mult.map(b => mulTR(a, b))));
    if (Dd.some(x => x.r !== 1n)) throw new Error('No pude racionalizar este denominador.');
    const den = Dd.length ? Dd[0].c : Q0;
    P('Multiplicamos', 'Arriba aplicamos distributiva; abajo queda un número sin raíces.', `\\frac{${L_trs(Nn)}}{${L_frac(den)}}`);
    const fin = juntarRad(Nn.map(x => ({ c: x.c.div(den), r: x.r })));
    P('Simplificamos', 'Dividimos cada término del numerador por el denominador.', L_trs(fin));
    const a = evalA(e, {}), b = fin.reduce((s, x) => s + x.c.num() * Math.sqrt(Number(x.r)), 0);
    P('Verificamos', 'Calculamos con decimales la expresión original y el resultado: tienen que dar lo mismo.', `${L_x(a)}=${L_x(b)}\\;${aproxIgual(a, b) ? '\\checkmark' : ''}`);
    return { tema: 'radicacion', metodo: D.length === 1 ? 'Racionalización (una raíz)' : 'Racionalización con el conjugado', pasos, resultado: L_trs(fin) };
  }
  // 3) Suma, resta y producto de radicales numéricos
  let ts; try { ts = aRadicales(e); } catch (err) { throw new Error('En radicación resuelvo: extraer factores (√(72x^5)), sumar radicales (3√2 + 5√8 − √18) y racionalizar (3/√2, 4/(3 − √5)).'); }
  P('Escribimos la expresión', 'Para sumar o restar raíces tienen que ser semejantes (mismo índice y mismo radicando). Primero simplificamos cada una sacando factores.', LA(e));
  P('Simplificamos cada raíz', 'Buscamos el mayor cuadrado perfecto que divide a cada radicando y lo sacamos afuera.', L_trs(ts));
  const fin = juntarRad(ts);
  P('Sumamos las semejantes', 'Las raíces con el mismo radicando se suman como términos semejantes: sumamos los números de adelante.', L_trs(fin));
  const a = evalA(e, {}), b = fin.reduce((s, x) => s + x.c.num() * Math.sqrt(Number(x.r)), 0);
  P('Verificamos', 'Calculamos con decimales la expresión original y el resultado.', `${L_x(a)}=${L_x(b)}\\;${aproxIgual(a, b) ? '\\checkmark' : ''}`);
  return { tema: 'radicacion', metodo: 'Radicales semejantes', pasos, resultado: L_trs(fin) };
}

/* -----------------------------------------------------------------------
 * A18. NÚMEROS COMPLEJOS
 * --------------------------------------------------------------------- */
class C { constructor(re, im) { this.re = re; this.im = im; }
  add(o) { return new C(this.re.add(o.re), this.im.add(o.im)); } sub(o) { return new C(this.re.sub(o.re), this.im.sub(o.im)); }
  mul(o) { return new C(this.re.mul(o.re).sub(this.im.mul(o.im)), this.re.mul(o.im).add(this.im.mul(o.re))); }
  conj() { return new C(this.re, this.im.neg()); } norma() { return this.re.mul(this.re).add(this.im.mul(this.im)); }
  div(o) { const n = o.norma(); if (n.cero) throw new Error('No se puede dividir por 0.'); const p = this.mul(o.conj()); return new C(p.re.div(n), p.im.div(n)); }
  pow(k) { let r = new C(Q1, Q0); for (let i = 0; i < k; i++) r = r.mul(this); return r; } }
const L_C = z => { if (z.im.cero) return L_frac(z.re); const im = (z.im.abs().eq(Q1) ? '' : L_frac(z.im.abs())) + 'i'; return z.re.cero ? (z.im.n < 0n ? '-' : '') + im : `${L_frac(z.re)}${z.im.n < 0n ? '-' : '+'}${im}`; };
function aComplejo(e) {
  e = sinParA(e);
  switch (e.t) {
    case 'num': return new C(e.q, Q0);
    case 'var': if (e.n !== 'i') throw new Error('En complejos la única letra es i.'); return new C(Q0, Q1);
    case 'neg': { const z = aComplejo(e.e); return new C(z.re.neg(), z.im.neg()); }
    case 'add': return e.items.reduce((s, it) => (it.op === '-' ? s.sub(aComplejo(it.e)) : s.add(aComplejo(it.e))), new C(Q0, Q0));
    case 'mul': return aComplejo(e.a).mul(aComplejo(e.b));
    case 'div': return aComplejo(e.a).div(aComplejo(e.b));
    case 'pow': { const k = Pred(aPoly(e.b)); const n = k.length ? Number(k[0].c.n) : 0; if (n < 0 || n > 60) throw new Error('El exponente tiene que ser natural.'); return aComplejo(e.a).pow(n); }
  }
  throw new Error('Esa expresión no es un número complejo.');
}
function resolverComplejos(texto) {
  const t = plano(texto); const { pasos, P } = crearPasos();
  const expr = texto.replace(/^.*?\b(modulo|módulo|argumento|forma polar|polar|conjugado|forma trigonometrica|forma trigonométrica)\b\s*(de|del)?\s*:?\s*/i, '').replace(/^\s*(calcular|resolver|operar)\s*:?\s*/i, '');
  const e = exprAlg(expr), top = sinParA(e);
  if (/modulo|argumento|polar|trigonometric|conjugado/.test(t)) {
    const z = aComplejo(e), a = z.re.num(), b = z.im.num(), mod2 = z.norma(), md = raizExacta(mod2, 2), arg = Math.atan2(b, a) * 180 / Math.PI, argN = arg < 0 ? arg + 360 : arg;
    P('Escribimos el número', 'Un complejo en forma binómica es a + bi: a es la parte real y b la parte imaginaria. Lo podemos pensar como el punto (a; b) del plano.', [`z=${L_C(z)}`, `a=${L_frac(z.re)},\\quad b=${L_frac(z.im)}`], svgPlano([], [[a, b, `(${fmtX(a)}; ${fmtX(b)})`]]));
    P('Calculamos el módulo', 'El módulo es la distancia al origen: por Pitágoras, la raíz de a² + b².', `|z|=\\sqrt{${L_vp(V(z.re))}^{2}+${L_vp(V(z.im))}^{2}}=\\sqrt{${L_frac(mod2)}}${md ? '=' + L_frac(md) : '\\approx ' + L_x(Math.sqrt(mod2.num()))}`);
    P('Calculamos el argumento', 'El argumento es el ángulo con el eje real positivo. Usamos tg α = b/a y miramos en qué cuadrante está el punto.', `\\alpha\\approx ${fmtX(argN, 2).replace(',', '{,}')}^{\\circ}`);
    const modL = md ? L_frac(md) : `\\sqrt{${L_frac(mod2)}}`;
    P('Escribimos la forma polar y el conjugado', 'Forma polar: módulo y argumento. El conjugado cambia el signo de la parte imaginaria (es el simétrico respecto del eje real).', [`z=${modL}_{${fmtX(argN, 2).replace(',', '{,}')}^{\\circ}}=${modL}\\left(\\cos ${fmtX(argN, 2).replace(',', '{,}')}^{\\circ}+i\\,\\text{sen}\\,${fmtX(argN, 2).replace(',', '{,}')}^{\\circ}\\right)`, `\\bar{z}=${L_C(z.conj())}`]);
    const ra = Math.sqrt(mod2.num()) * Math.cos(argN * Math.PI / 180), rb = Math.sqrt(mod2.num()) * Math.sin(argN * Math.PI / 180);
    P('Verificamos', 'Volvemos de la forma polar a la binómica: a = |z|·cos α y b = |z|·sen α.', `${L_x(ra)}+${L_x(rb)}i\\approx ${L_C(z)}\\;${aproxIgual(ra, a) && aproxIgual(rb, b) ? '\\checkmark' : ''}`);
    return { tema: 'complejos', metodo: 'Módulo, argumento y forma polar', pasos, resultado: `|z|=${md ? L_frac(md) : `\\sqrt{${L_frac(mod2)}}`},\\quad\\alpha\\approx ${fmtX(argN, 2).replace(',', '{,}')}^{\\circ}` };
  }
  P('Escribimos la operación', 'Los números complejos tienen parte real y parte imaginaria. La clave es que $i^2 = -1$.', LA(e));
  if (top.t === 'pow' && sinParA(top.a).t === 'var') {
    const n = Number(Pred(aPoly(top.b))[0].c.n), r = n % 4;
    P('Usamos que las potencias de i se repiten', 'Las potencias de i se repiten cada 4: $i^0 = 1$, $i^1 = i$, $i^2 = -1$, $i^3 = -i$. Dividimos el exponente por 4 y nos quedamos con el resto.', [`${n}=4\\cdot ${Math.floor(n / 4)}+${r}`, `i^{${n}}=i^{${r}}=${['1', 'i', '-1', '-i'][r]}`]);
    P('Verificamos', 'Multiplicamos i por sí mismo de a uno y vemos el ciclo.', `i^{${r}}\\cdot (i^{4})^{${Math.floor(n / 4)}}=${['1', 'i', '-1', '-i'][r]}\\cdot 1\\;\\checkmark`);
    return { tema: 'complejos', metodo: 'Potencias de i (ciclo de 4)', pasos, resultado: ['1', 'i', '-1', '-i'][r] };
  }
  const z = aComplejo(e);
  if (top.t === 'div') {
    const a = aComplejo(top.a), b = aComplejo(top.b);
    P('Multiplicamos por el conjugado', `Para dividir, multiplicamos arriba y abajo por el conjugado del denominador ($${L_C(b.conj())}$). Abajo queda un número real.`, `\\frac{${L_C(a)}}{${L_C(b)}}\\cdot\\frac{${L_C(b.conj())}}{${L_C(b.conj())}}=\\frac{${L_C(a.mul(b.conj()))}}{${L_frac(b.norma())}}`);
    P('Separamos parte real e imaginaria', 'Dividimos cada parte por el denominador.', L_C(z));
    P('Verificamos', 'Multiplicamos el resultado por el divisor: tiene que dar el dividendo.', `${par(L_C(z))}\\cdot ${par(L_C(b))}=${L_C(z.mul(b))}\\;${z.mul(b).re.eq(a.re) && z.mul(b).im.eq(a.im) ? '\\checkmark' : ''}`);
    return { tema: 'complejos', metodo: 'División con el conjugado', pasos, resultado: L_C(z) };
  }
  const sin = Pred(aPoly(e)), maxI = Math.max(0, ...sin.map(m => m.v.i || 0));
  if (maxI >= 2) P('Aplicamos distributiva', 'Multiplicamos como si i fuera una letra.', L_P(sin));
  const reem = sin.map(m => { const k = m.v.i || 0, s = [1, 0, -1, 0][k % 4] || 0; return k % 2 ? mono(m.c.mul(QE(k % 4 === 1 ? 1 : -1)), { i: 1 }) : mono(m.c.mul(QE(s)), {}); });
  if (maxI >= 2) P('Reemplazamos i² por −1', 'Donde aparece $i^2$ ponemos −1 (y $i^3 = -i$, $i^4 = 1$).', L_P(reem));
  P('Juntamos parte real e imaginaria', 'Sumamos por un lado los números sin i y por otro los que tienen i.', L_C(z));
  const red = Pred(reem), re = red.filter(m => !m.v.i).reduce((s, m) => s.add(m.c), Q0), im = red.filter(m => m.v.i).reduce((s, m) => s.add(m.c), Q0), ok = re.eq(z.re) && im.eq(z.im);
  P('Verificamos', 'Rehacemos la cuenta por otro camino, con la fórmula de cada operación: (a + bi)(c + di) = (ac − bd) + (ad + bc)i. Tiene que dar lo mismo.', `${LA(e)}=${L_C(z)}\\;${ok ? '\\checkmark' : ''}`);
  return { tema: 'complejos', metodo: 'Operaciones en forma binómica', pasos, resultado: L_C(z) };
}

/* -----------------------------------------------------------------------
 * A19. LOGARITMOS: propiedades, ecuaciones exponenciales y logarítmicas
 * --------------------------------------------------------------------- */
const L_log = b => (b === 'e' ? '\\ln' : !b || b.eq(QE(10)) ? '\\log' : `\\log_{${L_frac(b)}}`);
const baseNum = b => (b === 'e' ? Math.E : b ? b.num() : 10);
function potenciaComun(q) {                         // q = p^k con p entero lo más chico posible
  if (q.signo <= 0) return null; if (q.eq(Q1)) return { p: null, k: 0 };
  const inv = q.n === 1n && q.d > 1n, n = inv ? q.d : q.n; if (!q.entero && !inv) return null;
  const f = factoresPrimos(n); const g = [...f.values()].reduce((a, b) => { while (b) [a, b] = [b, a % b]; return a; });
  const p = [...f].reduce((s, [pr, e]) => s * pr ** BigInt(e / g), 1n);
  return { p, k: inv ? -g : g };
}
function desarrollarLog(e) {
  const { pasos, P } = crearPasos(), b = e.base, LB = L_log(b);
  const factores = [];
  (function rec(n, s, mult) { n = sinParA(n);
    if (n.t === 'mul') { rec(n.a, s, mult); rec(n.b, s, mult); return; }
    if (n.t === 'div') { rec(n.a, s, mult); rec(n.b, -s, mult); return; }
    if (n.t === 'pow') { const k = Pred(aPoly(n.b)); const q = k.length ? k[0].c : Q0; rec(n.a, s, mult.mul(q)); return; }
    if (n.t === 'raiz') { rec(n.e, s, mult.div(QE(n.k))); return; }
    factores.push({ n, s, mult }); })(e.e, 1, Q1);
  P('Escribimos el logaritmo', 'Vamos a usar las propiedades: el logaritmo de un producto es la suma de los logaritmos, el de un cociente es la resta, y el de una potencia baja el exponente multiplicando.', LA(e));
  const sep = factores.map((f, i) => (i ? (f.s < 0 ? '-' : '+') : f.s < 0 ? '-' : '') + LB + par(LA(f.n) + (f.mult.eq(Q1) ? '' : `^{${L_frac(f.mult)}}`)));
  P('Separamos productos y cocientes', 'Cada factor que multiplica suma su logaritmo y cada factor que divide lo resta. Las raíces son potencias de exponente fraccionario.', '=' + sep.join(''));
  const fin = factores.map((f, i) => {
    const sg = (i ? (f.s < 0 ? '-' : '+') : f.s < 0 ? '-' : ''); const nn = sinParA(f.n);
    if (nn.t === 'num' && b !== 'e') { const ex = logExacto(b || QE(10), nn.q); if (ex) return { L: sg + L_frac(ex.mul(f.mult)), v: f.s * ex.mul(f.mult).num() }; }
    return { L: sg + (f.mult.eq(Q1) ? '' : L_frac(f.mult)) + LB + par(LA(f.n)), f };
  });
  P('Bajamos los exponentes', 'El exponente de cada factor pasa a multiplicar al logaritmo. Si algún logaritmo es exacto (por ejemplo, el de una potencia de la base), lo calculamos.', '=' + fin.map(x => x.L).join(''));
  const vars = varsDe(e.e), val = Object.fromEntries(vars.map((v, i) => [v, [2, 3, 5, 7][i % 4]]));
  const a = evalA(e, val), lg = x => Math.log(x) / Math.log(baseNum(b));
  const c = factores.reduce((s, f) => s + f.s * f.mult.num() * lg(evalA(f.n, val)), 0);
  P('Verificamos', 'Reemplazamos las letras por números positivos y calculamos con la calculadora las dos expresiones.', `${vars.map(v => v + '=' + val[v]).join(',\\;') || tx('sin letras')}:\\quad ${L_x(a)}=${L_x(c)}\\;${aproxIgual(a, c) ? '\\checkmark' : ''}`);
  return { tema: 'logaritmos', metodo: 'Propiedades de los logaritmos', pasos, resultado: fin.map(x => x.L).join('') };
}
function ladoLog(e) {                                 // suma de k·log(arg) + constante
  e = sinParA(e); const items = e.t === 'add' ? e.items : [{ op: '+', e }]; const logs = []; let c = Q0;
  for (const it of items) {
    let n = sinParA(it.e), k = it.op === '-' ? QE(-1) : Q1;
    if (n.t === 'mul' && sinParA(n.a).t === 'num' && sinParA(n.b).t === 'log') { k = k.mul(sinParA(n.a).q); n = sinParA(n.b); }
    if (n.t === 'log') logs.push({ k, base: n.base, arg: n.e });
    else { const p = Pred(aPoly(n)); if (Pvars(p).length) throw new Error('En la ecuación logarítmica, lo que no está dentro de un logaritmo tiene que ser un número.'); c = c.add(k.mul(p.length ? p[0].c : Q0)); }
  }
  return { logs, c };
}
function resolverEcLog(rel, x) {
  const { pasos, P } = crearPasos();
  const I = ladoLog(rel.izq), D = ladoLog(rel.der), logs = [...I.logs, ...D.logs.map(l => ({ ...l, k: l.k.neg() }))], K = D.c.sub(I.c);
  const b0 = logs[0].base; if (logs.some(l => (l.base === 'e') !== (b0 === 'e') || (l.base !== 'e' && !(l.base || QE(10)).eq(b0 === 'e' ? Q1 : b0 || QE(10))))) throw new Error('Todos los logaritmos tienen que tener la misma base.');
  const B = b0 === 'e' ? null : b0 || QE(10), LB = L_log(b0);
  P('Escribimos la ecuación', 'En una ecuación logarítmica la incógnita está dentro de un logaritmo.', `${LA(rel.izq)}=${LA(rel.der)}`);
  P('Condiciones de existencia', 'Solo existe el logaritmo de números positivos: todo lo que está adentro de cada logaritmo tiene que ser mayor que 0. Lo revisamos al final.', logs.map(l => `${LA(l.arg)}>0`).join(',\\quad '));
  if (logs.some(l => !l.k.entero)) throw new Error('Los coeficientes de los logaritmos tienen que ser enteros.');
  const pos = logs.filter(l => l.k.signo > 0), neg = logs.filter(l => l.k.signo < 0);
  const arg = l => (l.k.abs().eq(Q1) ? LA(l.arg) : `${par(LA(l.arg))}^{${L_frac(l.k.abs())}}`);
  const LP = pos.map(arg).join('\\cdot ') || '1', LN = neg.map(arg).join('\\cdot ');
  P('Juntamos en un solo logaritmo', 'Pasamos los logaritmos de un lado y los números del otro. La suma de logaritmos es el logaritmo del producto, la resta es el del cociente, y un número adelante pasa como exponente.', `${LB}${par(neg.length ? `\\frac{${LP}}{${LN}}` : LP)}=${L_frac(K)}`);
  if (!K.entero && B) throw new Error('El número del otro lado tiene que ser entero para resolverlo en forma exacta.');
  if (!B && !K.cero) throw new Error('Con logaritmo natural, el otro miembro tiene que ser 0 para resolverlo en forma exacta.');
  const bk = B ? B.pow(Number(K.n)) : Q1;
  const prod = ls => ls.reduce((s, l) => Pred(Pmul(s, Ppow(aPoly(l.arg), Number(l.k.abs().n)))), Pc(Q1));
  const Ppos = prod(pos), Pneg = prod(neg), ec = Pred(Psub(Ppos, Pscale(Pneg, bk)));
  P('Usamos la definición de logaritmo', `$\\log_b A = c$ significa que $A = b^c$. Así desaparece el logaritmo y queda una ecuación polinómica.`, [`${neg.length ? `\\frac{${LP}}{${LN}}` : LP}=${B ? L_frac(B) : 'e'}^{${L_frac(K)}}=${L_frac(bk)}`, `${L_P(Ppos)}${neg.length ? `=${L_frac(bk)}\\cdot ${L_Pp(Pneg)}` : `=${L_frac(bk)}`}`, `${L_P(ec)}=0`]);
  const u = aU(ec, x); let cands = [];
  if (uGrado(u) === 1) cands = [u[0].neg().div(u[1])];
  else if (uGrado(u) === 2) { const R = raicesCuadratica(u[2], u[1], u[0]); if (R.tipo === 'rac') cands = R.r.filter((r, i) => !i || !r.eq(R.r[0])); else if (R.tipo === 'irr') cands = R.x.map(v => ({ aprox: v })); }
  else { const { pasos: pp, P: Pp } = crearPasos(); const f = factorizarPoly(ec, Pp); f.fs.forEach(fc => { if (!fc.irr) { const v = aU(fc.P, x); if (uGrado(v) === 1) cands.push(v[0].neg().div(v[1])); } }); }
  P('Resolvemos', 'Resolvemos la ecuación que quedó.', cands.length ? cands.map((c, i) => `${x}_{${i + 1}}${c.aprox != null ? '\\approx ' + L_x(c.aprox) : '=' + L_frac(c)}`) : [tx('No tiene soluciones reales.')]);
  const val = c => (c.aprox != null ? c.aprox : c.num());
  const buenas = cands.filter(c => logs.every(l => evalA(l.arg, { [x]: val(c) }) > 0));
  P('Verificamos (y revisamos las condiciones)', 'Descartamos las soluciones que hacen negativo o cero algún argumento. Las que quedan las reemplazamos en la ecuación original.', cands.map(c => { const ok = logs.every(l => evalA(l.arg, { [x]: val(c) }) > 0); if (!ok) return `${x}=${c.aprox != null ? L_x(c.aprox) : L_frac(c)}:\\;${tx('no sirve (algún argumento queda ≤ 0)')}`; const a = evalA(rel.izq, { [x]: val(c) }), d = evalA(rel.der, { [x]: val(c) }); return `${x}=${c.aprox != null ? L_x(c.aprox) : L_frac(c)}:\\;${L_x(a)}=${L_x(d)}\\;${aproxIgual(a, d) ? '\\checkmark' : ''}`; }));
  return { tema: 'logaritmos', metodo: 'Propiedades y definición de logaritmo', pasos, resultado: buenas.length ? buenas.map(c => `${x}${c.aprox != null ? '\\approx ' + L_x(c.aprox) : '=' + L_frac(c)}`).join(',\\;') : tx('No tiene solución') };
}
function resolverEcExp(rel, x) {
  const { pasos, P } = crearPasos();
  const ladoExp = e => { e = sinParA(e); if (e.t === 'pow' && !varsDe(e.a).length) return { base: Pred(aPoly(e.a))[0].c, ex: aPoly(e.b) }; const p = Pred(aPoly(e)); if (Pvars(p).length) throw new Error('Escribí la ecuación exponencial como potencia = número (por ejemplo 2^(x+1) = 32).'); return { base: p.length ? p[0].c : Q0, ex: Pc(Q1) }; };
  const A = ladoExp(rel.izq), B = ladoExp(rel.der);
  P('Escribimos la ecuación', `Es una ecuación exponencial: la incógnita está en el exponente.`, `${LA(rel.izq)}=${LA(rel.der)}`);
  const pa = potenciaComun(A.base), pb = potenciaComun(B.base);
  let ec, met;
  if (pa && pb && (pa.p === pb.p || pa.p === null || pb.p === null)) {
    const p = pa.p || pb.p;
    met = 'Igualación de bases';
    P('Escribimos todo con la misma base', `Escribimos las dos bases como potencias de ${p}. Si las bases son iguales, los exponentes también tienen que ser iguales.`, `${p}^{${par(L_P(Pscale(A.ex, QE(pa.k))))}}=${p}^{${L_P(Pscale(B.ex, QE(pb.k)))}}`.replace(/\{\\left\((-?\d+)\\right\)\}/, '{$1}'));
    ec = Pred(Psub(Pscale(A.ex, QE(pa.k)), Pscale(B.ex, QE(pb.k))));
    P('Igualamos los exponentes', 'Queda una ecuación sin potencias.', `${L_P(Pscale(A.ex, QE(pa.k)))}=${L_P(Pscale(B.ex, QE(pb.k)))}`);
  } else {
    met = 'Aplicando logaritmos';
    if (A.base.signo <= 0 || B.base.signo <= 0) throw new Error('Las bases y el otro miembro tienen que ser positivos.');
    const la = Math.log(A.base.num()), lb = Math.log(B.base.num());
    P('Aplicamos logaritmo en los dos miembros', 'No se pueden escribir con la misma base, así que tomamos logaritmo y bajamos el exponente con la propiedad de la potencia.', `${par(L_P(A.ex))}\\cdot\\ln ${L_frac(A.base)}=${par(L_P(B.ex))}\\cdot\\ln ${L_frac(B.base)}`);
    const pa2 = partesLineales(A.ex, x) || { a: Q0, b: Q0 }, pb2 = partesLineales(B.ex, x) || { a: Q0, b: Q0 };
    const coef = pa2.a.num() * la - pb2.a.num() * lb, cte = pb2.b.num() * lb - pa2.b.num() * la; const sol = cte / coef;
    P('Despejamos', 'Dividimos por el número que multiplica a la incógnita.', `${x}=\\frac{${L_x(cte)}}{${L_x(coef)}}\\approx ${L_x(sol)}`);
    const a = evalA(rel.izq, { [x]: sol }), d = evalA(rel.der, { [x]: sol });
    P('Verificamos', 'Reemplazamos el valor aproximado.', `${L_x(a)}\\approx ${L_x(d)}\\;${Math.abs(a - d) < 1e-6 * Math.max(1, Math.abs(d)) ? '\\checkmark' : ''}`);
    return { tema: 'logaritmos', metodo: met, pasos, resultado: `${x}\\approx ${L_x(sol)}` };
  }
  const u = aU(ec, x); if (!u || uGrado(u) !== 1) throw new Error('Por ahora resuelvo exponenciales cuyo exponente es lineal.');
  const sol = u[0].neg().div(u[1]);
  P('Despejamos', '', `${x}=${L_frac(sol)}`);
  const a = evalA(rel.izq, { [x]: sol.num() }), d = evalA(rel.der, { [x]: sol.num() });
  P('Verificamos', 'Reemplazamos en la ecuación original.', `${LA(rel.izq, { [x]: sol })}=${L_x(a)}=${L_x(d)}\\;${aproxIgual(a, d) ? '\\checkmark' : ''}`);
  return { tema: 'logaritmos', metodo: met, pasos, resultado: `${x}=${L_frac(sol)}` };
}
function resolverLogaritmos(texto) {
  const t = texto.replace(/^\s*(desarrollar|desarrolla|aplicar propiedades|resolver|calcular)\s*:?\s*/i, '');
  const rel = /=/.test(t) ? relAlg(t) : null;
  if (rel) {
    const x = [...new Set([...varsDe(rel.izq), ...varsDe(rel.der)])]; if (x.length !== 1) throw new Error('La ecuación tiene que tener una sola incógnita.');
    return contieneA(rel.izq, n => n.t === 'log') || contieneA(rel.der, n => n.t === 'log') ? resolverEcLog(rel, x[0]) : resolverEcExp(rel, x[0]);
  }
  const e = exprAlg(t);
  if (sinParA(e).t === 'log' && varsDe(e).length) return desarrollarLog(sinParA(e));
  if (!varsDe(e).length) { const r = resolverExpresion(t, 'cientifica'); r.tema = 'logaritmos'; return r; }
  throw new Error('En logaritmos resuelvo: desarrollar log(x^2·y/z), ecuaciones como log_2(x) + log_2(x − 2) = 3, exponenciales como 2^(x+1) = 32, y cálculos como log_3(81).');
}

/* -----------------------------------------------------------------------
 * A20. PROGRESIONES ARITMÉTICAS Y GEOMÉTRICAS
 * --------------------------------------------------------------------- */
function numDe(s) { s = s.trim().replace(/\s/g, ''); const neg = s.startsWith('-'); const [a, b] = s.replace('-', '').split('/'); const q = leerDecimal(a).q.div(b ? leerDecimal(b).q : Q1); return neg ? q.neg() : q; }
function resolverProgresion(texto) {
  const t = plano(texto).replace(/[−–]/g, '-'); const { pasos, P } = crearPasos();
  const NUM = '(-?\\d+(?:[.,]\\d+)?(?:\\/\\d+)?)';
  const get = re => { const m = t.match(new RegExp(re + '\\s*=?\\s*' + NUM)); return m ? numDe(m[1]) : null; };
  let a1 = get('\\ba_?\\(?1\\)?'), d = get('\\bd'), r = get('\\br'), terms = [];
  const lista = t.replace(/progresion|aritmetica|geometrica|sucesion|:/g, ' ').split(/(?:\.\.\.|…|termino|suma|hallar|calcular|a_?\(?\d|s_?\(?\d)/)[0];
  if (a1 === null) {
    const sep = lista.includes(';') ? ';' : ',';
    terms = lista.split(sep).map(s => s.trim()).filter(s => /^-?\d+(?:[.,]\d+)?(?:\/\d+)?$/.test(s.replace(/\s/g, ''))).map(numDe);
    if (terms.length < 3) throw new Error('Escribí al menos tres términos (por ejemplo: 3, 7, 11, 15, …) o los datos (a1 = 5, d = 3).');
    a1 = terms[0];
  }
  const mN = t.match(/termino\s*(?:n\s*=\s*)?(\d+)|\ba_?\(?(\d+)\)?(?!\s*=)/), nAsk = mN ? (mN[1] || mN[2]) : null;
  const mS = t.match(/suma de (?:los )?(?:primeros )?(\d+)|\bs_?\(?(\d+)\)?/), sAsk = mS ? (mS[1] || mS[2]) : null;
  let tipo;
  if (terms.length) {
    const dif = terms.slice(1).map((x, i) => x.sub(terms[i])), rat = terms.every(x => !x.cero) ? terms.slice(1).map((x, i) => x.div(terms[i])) : null;
    P('Miramos cómo cambian los términos', 'Si siempre se suma lo mismo, es aritmética (diferencia d). Si siempre se multiplica por lo mismo, es geométrica (razón r).', [`\\text{diferencias: }${dif.map(L_frac).join(',\\;')}`, ...(rat ? [`\\text{cocientes: }${rat.map(L_frac).join(',\\;')}`] : [])]);
    if (dif.every(x => x.eq(dif[0]))) { tipo = 'a'; d = dif[0]; } else if (rat && rat.every(x => x.eq(rat[0]))) { tipo = 'g'; r = rat[0]; }
    else throw new Error('No es una progresión aritmética ni geométrica: no se suma ni se multiplica siempre lo mismo.');
  } else { tipo = r !== null && /geometric/.test(t) || (r !== null && d === null) ? 'g' : 'a'; if (tipo === 'a' && d === null) throw new Error('Falta la diferencia d.'); if (tipo === 'g' && r === null) throw new Error('Falta la razón r.'); }
  const an = n => (tipo === 'a' ? a1.add(d.mul(QE(n - 1))) : a1.mul(r.pow(n - 1)));
  if (tipo === 'a') P('Es una progresión aritmética', `Cada término se obtiene sumando d = ${fmtX(d.num())} al anterior. El término general es $a_n = a_1 + (n - 1)\\cdot d$.`, `a_n=${L_frac(a1)}+(n-1)\\cdot ${L_vp(V(d))}=${L_P(Pred([mono(d, { n: 1 }), mono(a1.sub(d))]))}`);
  else P('Es una progresión geométrica', `Cada término se obtiene multiplicando el anterior por r = ${fmtX(r.num())}. El término general es $a_n = a_1\\cdot r^{\\,n-1}$.`, `a_n=${L_frac(a1)}\\cdot ${L_vp(V(r))}^{\\,n-1}`);
  const n = nAsk ? +nAsk : (sAsk ? null : 10), out = [];
  if (n) { const v = an(n); out.push(`a_{${n}}=${L_frac(v)}`); P(`Calculamos el término ${n}`, 'Reemplazamos n en el término general.', tipo === 'a' ? `a_{${n}}=${L_frac(a1)}+${n - 1}\\cdot ${L_vp(V(d))}=${L_frac(v)}` : `a_{${n}}=${L_frac(a1)}\\cdot ${L_vp(V(r))}^{${n - 1}}=${L_frac(v)}`); }
  const ns = sAsk ? +sAsk : n;
  let S;
  if (tipo === 'a') { S = a1.add(an(ns)).mul(QE(ns)).div(QE(2)); P(`Sumamos los primeros ${ns} términos`, 'La suma de una aritmética es la cantidad de términos por el promedio entre el primero y el último: $S_n = \\frac{n\\,(a_1 + a_n)}{2}$.', `S_{${ns}}=\\frac{${ns}\\cdot\\left(${L_frac(a1)}+${L_vp(V(an(ns)))}\\right)}{2}=${L_frac(S)}`); }
  else if (r.eq(Q1)) { S = a1.mul(QE(ns)); P(`Sumamos los primeros ${ns} términos`, 'Con r = 1 todos los términos son iguales.', `S_{${ns}}=${ns}\\cdot ${L_vp(V(a1))}=${L_frac(S)}`); }
  else { S = a1.mul(r.pow(ns).sub(Q1)).div(r.sub(Q1)); P(`Sumamos los primeros ${ns} términos`, 'Para una geométrica: $S_n = a_1\\cdot\\frac{r^n - 1}{r - 1}$.', `S_{${ns}}=${L_frac(a1)}\\cdot\\frac{${L_vp(V(r))}^{${ns}}-1}{${L_vp(V(r))}-1}=${L_frac(S)}`); }
  out.push(`S_{${ns}}=${L_frac(S)}`);
  const lim = Math.min(ns, 12), lst = Array.from({ length: lim }, (_, i) => an(i + 1));
  P('Verificamos', ns <= 12 ? 'Escribimos todos los términos y los sumamos uno por uno.' : 'Escribimos los primeros términos y comprobamos que siguen la regla.', ns <= 12 ? `${lst.map(L_vp).map(s => s.replace(/^\\left\(|\\right\)$/g, '')).join('+').replace(/\+-/g, '-')}=${L_frac(lst.reduce((s, x) => s.add(x), Q0))}\\;${lst.reduce((s, x) => s.add(x), Q0).eq(S) ? '\\checkmark' : ''}` : `${lst.map(L_frac).join(',\\;')},\\ldots\\;\\checkmark`);
  return { tema: 'progresiones', metodo: tipo === 'a' ? 'Progresión aritmética' : 'Progresión geométrica', pasos, resultado: out.join(',\\quad ') };
}

/* -----------------------------------------------------------------------
 * A21. MATRICES
 * --------------------------------------------------------------------- */
function leerMatrices(t) {
  const ms = [...t.matchAll(/\[\s*\[[^\]]*\](?:\s*,\s*\[[^\]]*\])*\s*\]/g)].map(m => {
    const filas = [...m[0].matchAll(/\[([^\[\]]*)\]/g)].map(f => { const sep = f[1].includes(';') ? ';' : ','; return f[1].split(sep).map(c => { const v = valorDeTexto(c.trim()); if (!v.q) throw new Error('Los elementos de la matriz tienen que ser números exactos.'); return v.q; }); });
    if (filas.some(f => f.length !== filas[0].length)) throw new Error('Todas las filas de la matriz tienen que tener la misma cantidad de elementos.');
    return { M: filas, idx: m.index, len: m[0].length };
  });
  return ms;
}
const L_M = M => `\\begin{pmatrix}${M.map(f => f.map(L_frac).join('&')).join('\\\\')}\\end{pmatrix}`;
const dims = M => `${M.length}\\times ${M[0].length}`;
const identidad = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? Q1 : Q0)));
const mMul = (A, B) => A.map(f => B[0].map((_, j) => f.reduce((s, a, k) => s.add(a.mul(B[k][j])), Q0)));
function detGauss(M) { const A = M.map(f => f.slice()); let d = Q1; const n = A.length; for (let c = 0; c < n; c++) { let p = A.findIndex((f, i) => i >= c && !f[c].cero); if (p < 0) return Q0; if (p !== c) { [A[p], A[c]] = [A[c], A[p]]; d = d.neg(); } d = d.mul(A[c][c]); for (let i = c + 1; i < n; i++) { const f = A[i][c].div(A[c][c]); A[i] = A[i].map((x, j) => x.sub(f.mul(A[c][j]))); } } return d; }
function resolverMatrices(texto, metodo) {
  const t = plano(texto), ms = leerMatrices(texto); if (!ms.length) throw new Error('Escribí las matrices así: [[1, 2], [3, 4]]. Para decimales, separá los elementos con punto y coma: [[1,5; 2], [3; 4]].');
  const { pasos, P } = crearPasos(); const A = ms[0].M, n = A.length, cuad = A.every(f => f.length === n);
  if (/det/.test(t)) {
    if (!cuad) throw new Error('El determinante solo existe para matrices cuadradas.');
    P('Escribimos la matriz', `Es una matriz de ${dims(A)}.`, `\\det A=${L_det(A)}`);
    let d;
    if (n === 1) d = A[0][0];
    else if (n === 2) { d = A[0][0].mul(A[1][1]).sub(A[1][0].mul(A[0][1])); P('Calculamos el determinante de 2×2', 'Producto de la diagonal principal menos producto de la otra diagonal.', `${L_frac(A[0][0])}\\cdot ${L_vp(V(A[1][1]))}-${L_vp(V(A[1][0]))}\\cdot ${L_vp(V(A[0][1]))}=${L_frac(d)}`); }
    else if (n === 3 && metodo !== 'cofactores') {
      const g = (i, j) => A[i][j], pos = [[0, 0, 1, 1, 2, 2], [0, 1, 1, 2, 2, 0], [0, 2, 1, 0, 2, 1]], neg = [[0, 2, 1, 1, 2, 0], [0, 0, 1, 2, 2, 1], [0, 1, 1, 0, 2, 2]];
      const pr = c => g(c[0], c[1]).mul(g(c[2], c[3])).mul(g(c[4], c[5])), Lp = c => `${L_vp(V(g(c[0], c[1])))}\\cdot ${L_vp(V(g(c[2], c[3])))}\\cdot ${L_vp(V(g(c[4], c[5])))}`;
      d = pos.reduce((s, c) => s.add(pr(c)), Q0).sub(neg.reduce((s, c) => s.add(pr(c)), Q0));
      P('Aplicamos la regla de Sarrus', 'Sumamos los productos de las tres diagonales que bajan hacia la derecha y restamos los de las tres que bajan hacia la izquierda.', [`${pos.map(Lp).join('+')}`, `-\\left(${neg.map(Lp).join('+')}\\right)`, `=${pos.map(c => L_vp(V(pr(c)))).join('+')}-\\left(${neg.map(c => L_vp(V(pr(c)))).join('+')}\\right)=${L_frac(d)}`]);
    } else {
      const menor = (M, i, j) => M.filter((_, r) => r !== i).map(f => f.filter((_, c) => c !== j));
      const terms = A[0].map((a, j) => ({ a, s: j % 2 ? -1 : 1, m: menor(A, 0, j), d: detGauss(menor(A, 0, j)) }));
      d = terms.reduce((s, x) => s.add(x.a.mul(x.d).mul(QE(x.s))), Q0);
      P('Desarrollamos por cofactores', 'Por la primera fila: cada elemento por el determinante que queda al tachar su fila y su columna, con signos alternados (+, −, +, …).', [terms.map((x, j) => `${j ? (x.s < 0 ? '-' : '+') : ''}${L_vp(V(x.a))}\\cdot ${L_det(x.m)}`).join(''), `=${terms.map((x, j) => `${j ? (x.s < 0 ? '-' : '+') : ''}${L_vp(V(x.a))}\\cdot ${L_vp(V(x.d))}`).join('')}=${L_frac(d)}`]);
    }
    const g = detGauss(A);
    P('Verificamos', 'Calculamos el determinante de otra forma: llevamos la matriz a forma triangular con operaciones de fila y multiplicamos la diagonal.', `\\det A=${L_frac(g)}\\;${g.eq(d) ? '\\checkmark' : ''}`);
    return { tema: 'matrices', metodo: n === 3 ? (metodo === 'cofactores' ? 'Desarrollo por cofactores' : 'Regla de Sarrus') : n === 2 ? 'Diagonales' : 'Cofactores', pasos, resultado: `\\det A=${L_frac(d)}`, alternativas: n === 3 ? [{ nombre: metodo === 'cofactores' ? 'Ver con Sarrus' : 'Ver por cofactores', metodo: metodo === 'cofactores' ? 'sarrus' : 'cofactores' }] : [] };
  }
  if (/invers/.test(t)) {
    if (!cuad) throw new Error('Solo las matrices cuadradas pueden tener inversa.');
    const d = detGauss(A);
    P('Escribimos la matriz y su determinante', 'Una matriz tiene inversa solo si su determinante no es 0.', [`A=${L_M(A)}`, `\\det A=${L_frac(d)}`]);
    if (d.cero) { P('Conclusión', 'El determinante es 0: la matriz no tiene inversa.', tx('A no es inversible')); return { tema: 'matrices', metodo: 'Determinante', pasos, resultado: tx('No tiene inversa') }; }
    const M = A.map((f, i) => [...f, ...identidad(n)[i]]);
    const L_aum = () => `\\left(\\begin{array}{${'c'.repeat(n)}|${'c'.repeat(n)}}${M.map(f => f.map(L_frac).join('&')).join('\\\\')}\\end{array}\\right)`;
    P('Armamos la matriz ampliada', 'Método de Gauss-Jordan: ponemos A a la izquierda y la identidad a la derecha. Con operaciones de fila llevamos A a la identidad; lo que queda a la derecha es la inversa.', L_aum());
    for (let c = 0; c < n; c++) {
      const p = M.findIndex((f, i) => i >= c && !f[c].cero); const ops = [];
      if (p !== c) { [M[p], M[c]] = [M[c], M[p]]; ops.push(`F_{${c + 1}}\\leftrightarrow F_{${p + 1}}`); }
      const piv = M[c][c]; if (!piv.eq(Q1)) { M[c] = M[c].map(x => x.div(piv)); ops.push(`F_{${c + 1}}\\to F_{${c + 1}}:${L_vp(V(piv))}`); }
      for (let i = 0; i < n; i++) if (i !== c && !M[i][c].cero) { const f = M[i][c]; M[i] = M[i].map((x, j) => x.sub(f.mul(M[c][j]))); ops.push(`F_{${i + 1}}\\to F_{${i + 1}}-${L_vp(V(f))}F_{${c + 1}}`); }
      if (ops.length) P(`Columna ${c + 1}`, `Conseguimos un 1 en la posición (${c + 1}, ${c + 1}) y ceros en el resto de la columna.`, [ops.join(',\\;'), L_aum()]);
    }
    const inv = M.map(f => f.slice(n)), prod = mMul(A, inv), ok = prod.every((f, i) => f.every((x, j) => x.eq(i === j ? Q1 : Q0)));
    P('Verificamos', 'Multiplicamos A por la inversa: tiene que dar la matriz identidad.', `A\\cdot A^{-1}=${L_M(prod)}\\;${ok ? '\\checkmark' : ''}`);
    return { tema: 'matrices', metodo: 'Gauss-Jordan', pasos, resultado: `A^{-1}=${L_M(inv)}` };
  }
  if (/transpuest/.test(t)) {
    const T = A[0].map((_, j) => A.map(f => f[j]));
    P('Transponemos', 'La transpuesta cambia filas por columnas: la fila 1 pasa a ser la columna 1, y así.', `A=${L_M(A)}\\;\\Rightarrow\\;A^{t}=${L_M(T)}`);
    P('Verificamos', 'Si transponemos de nuevo, volvemos a la matriz original.', `(A^{t})^{t}=${L_M(T[0].map((_, j) => T.map(f => f[j])))}=A\\;\\checkmark`);
    return { tema: 'matrices', metodo: 'Transposición', pasos, resultado: `A^{t}=${L_M(T)}` };
  }
  if (ms.length >= 2) {
    const B = ms[1].M, entre = texto.slice(ms[0].idx + ms[0].len, ms[1].idx).trim(), op = /[+]/.test(entre) ? '+' : /[-−]/.test(entre) ? '-' : '*';
    P('Escribimos la operación', `A es de ${dims(A)} y B es de ${dims(B)}.`, `${L_M(A)}${op === '*' ? '\\cdot ' : op}${L_M(B)}`);
    if (op !== '*') {
      if (A.length !== B.length || A[0].length !== B[0].length) throw new Error('Para sumar o restar, las dos matrices tienen que tener el mismo tamaño.');
      const R = A.map((f, i) => f.map((a, j) => (op === '+' ? a.add(B[i][j]) : a.sub(B[i][j]))));
      P(op === '+' ? 'Sumamos elemento a elemento' : 'Restamos elemento a elemento', 'Se opera cada elemento con el que está en la misma posición.', `\\begin{pmatrix}${A.map((f, i) => f.map((a, j) => `${L_frac(a)}${op}${L_vp(V(B[i][j]))}`).join('&')).join('\\\\')}\\end{pmatrix}=${L_M(R)}`);
      const back = R.map((f, i) => f.map((x, j) => (op === '+' ? x.sub(B[i][j]) : x.add(B[i][j]))));
      P('Verificamos', `Hacemos la operación inversa: ${op === '+' ? '(A + B) − B' : '(A − B) + B'} tiene que dar A.`, `${L_M(back)}=A\\;${back.every((f, i) => f.every((x, j) => x.eq(A[i][j]))) ? '\\checkmark' : ''}`);
      return { tema: 'matrices', metodo: op === '+' ? 'Suma de matrices' : 'Resta de matrices', pasos, resultado: L_M(R) };
    }
    if (A[0].length !== B.length) throw new Error(`No se pueden multiplicar: las columnas de A (${A[0].length}) tienen que ser tantas como las filas de B (${B.length}).`);
    const R = mMul(A, B);
    P('Multiplicamos filas por columnas', `El resultado es de ${A.length}×${B[0].length}. Cada elemento (i, j) es la fila i de A por la columna j de B: multiplicamos elemento a elemento y sumamos.`, R.length * R[0].length <= 9 ? R.flatMap((f, i) => f.map((x, j) => `c_{${i + 1}${j + 1}}=${A[i].map((a, k) => `${L_vp(V(a))}\\cdot ${L_vp(V(B[k][j]))}`).join('+')}=${L_frac(x)}`)) : [L_M(R)]);
    P('Escribimos el resultado', '', `A\\cdot B=${L_M(R)}`);
    const v = B[0].map((_, i) => QE(i + 1)), Bv = B.map(f => f.reduce((s, x, k) => s.add(x.mul(v[k])), Q0)), ABv = A.map(f => f.reduce((s, x, k) => s.add(x.mul(Bv[k])), Q0)), Rv = R.map(f => f.reduce((s, x, k) => s.add(x.mul(v[k])), Q0));
    P('Verificamos', 'Multiplicamos por un vector cualquiera v: tiene que dar lo mismo A·(B·v) que (A·B)·v.', `v=${L_M(v.map(q => [q]))}:\\quad A(Bv)=${L_M(ABv.map(q => [q]))}=(AB)v\\;${ABv.every((x, i) => x.eq(Rv[i])) ? '\\checkmark' : ''}`);
    return { tema: 'matrices', metodo: 'Producto de matrices', pasos, resultado: L_M(R) };
  }
  const esc = texto.slice(0, ms[0].idx).match(/(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*[*·]?\s*$/);
  if (esc) {
    const k = numDe(esc[1]), R = A.map(f => f.map(a => a.mul(k)));
    P('Multiplicamos por un número', 'Cada elemento de la matriz se multiplica por el número.', `${L_frac(k)}\\cdot ${L_M(A)}=${L_M(R)}`);
    P('Verificamos', 'Dividimos el resultado por el mismo número: vuelve a dar la matriz original.', `${L_M(R.map(f => f.map(x => x.div(k))))}\\;\\checkmark`);
    return { tema: 'matrices', metodo: 'Producto por un escalar', pasos, resultado: L_M(R) };
  }
  throw new Error('Con matrices puedo calcular: det [[…]], inversa [[…]], transpuesta [[…]], [[…]] + [[…]], [[…]] · [[…]] o 3·[[…]].');
}

/* -----------------------------------------------------------------------
 * A22. CONJUNTOS Y LÓGICA
 * --------------------------------------------------------------------- */
function resolverConjuntos(texto) {
  const defs = {}; for (const m of texto.matchAll(/([A-Z])\s*=\s*\{([^}]*)\}/g)) defs[m[1]] = [...new Set(m[2].split(/[,;]/).map(s => s.trim()).filter(Boolean))];
  if (Object.keys(defs).length < 1) throw new Error('Definí los conjuntos así: A = {1, 2, 3}; B = {2, 3, 4}; A ∪ B.');
  let ex = texto.replace(/[A-Z]\s*=\s*\{[^}]*\}/g, ' ').replace(/[;,]/g, ' ').trim();
  ex = plano(ex).replace(/union( de)?/g, '∪').replace(/interseccion( de)?/g, '∩').replace(/diferencia simetrica( de)?/g, 'Δ').replace(/diferencia( de)?/g, '−').replace(/complemento de ([a-z])/g, "$1'").replace(/\by\b/g, ' ').replace(/\^c/g, "'").replace(/\\/g, '−').replace(/-/g, '−').toUpperCase().replace(/\s+/g, '');
  const nombres = Object.keys(defs).filter(k => k !== 'U');
  if (!ex) ex = nombres.length >= 2 ? '' : nombres[0];
  const U = defs.U || [...new Set(Object.values(defs).flat())];
  const { pasos, P } = crearPasos(), Ls = a => `\\{${a.join(',\\,') || ''}\\}`.replace('\\{\\}', '\\varnothing');
  P('Escribimos los conjuntos', 'Un conjunto es una colección de elementos sin repetir y sin importar el orden.' + (defs.U ? ' U es el conjunto universal.' : ''), Object.entries(defs).map(([k, v]) => `${k}=${Ls(v)}`));
  const OPS = { '∪': ['unión', (a, b) => [...new Set([...a, ...b])], 'La unión tiene los elementos que están en uno, en otro o en los dos.'], '∩': ['intersección', (a, b) => a.filter(x => b.includes(x)), 'La intersección tiene solo los elementos que están en los dos a la vez.'], '−': ['diferencia', (a, b) => a.filter(x => !b.includes(x)), 'La diferencia A − B tiene los elementos de A que no están en B.'], 'Δ': ['diferencia simétrica', (a, b) => [...a.filter(x => !b.includes(x)), ...b.filter(x => !a.includes(x))], 'La diferencia simétrica tiene los elementos que están en uno solo de los dos.'] };
  const calcular = expr => {
    let i = 0;
    const prim = () => { let r; if (expr[i] === '(') { i++; r = union(); i++; } else { const k = expr[i++]; if (!defs[k]) throw new Error(`No definiste el conjunto ${k}.`); r = { v: defs[k], L: k, f: x => defs[k].includes(x) }; }
      while (expr[i] === "'") { i++; const v = U.filter(x => !r.v.includes(x)); P(`Complemento de ${r.L}`, 'El complemento tiene los elementos del universal que no están en el conjunto.', `${r.L}'=${Ls(v)}`); const g = r.f; r = { v, L: `${r.L.length > 1 ? par(r.L) : r.L}'`, f: x => !g(x) }; } return r; };
    const inter = () => { let a = prim(); while (expr[i] === '∩') { i++; const b = prim(); a = paso('∩', a, b); } return a; };
    const union = () => { let a = inter(); while ('∪−Δ'.includes(expr[i] || '#')) { const o = expr[i++]; const b = inter(); a = paso(o, a, b); } return a; };
    const paso = (o, a, b) => { const v = OPS[o][1](a.v, b.v), L_ = `${a.L.length > 2 ? par(a.L) : a.L}${o === '−' ? '-' : o === 'Δ' ? '\\,\\triangle\\,' : o === '∪' ? '\\cup ' : '\\cap '}${b.L.length > 2 ? par(b.L) : b.L}`; P(`Calculamos la ${OPS[o][0]}`, OPS[o][2], `${L_}=${Ls(v)}`); const fa = a.f, fb = b.f; const f = o === '∪' ? x => fa(x) || fb(x) : o === '∩' ? x => fa(x) && fb(x) : o === '−' ? x => fa(x) && !fb(x) : x => fa(x) !== fb(x); return { v, L: L_, f }; };
    const r = union(); if (i < expr.length) throw new Error('No entendí la operación entre conjuntos.'); return r;
  };
  let res;
  if (ex) res = calcular(ex);
  else { const [a, b] = nombres; for (const o of ['∪', '∩', '−']) calcular(`${a}${o}${b}`); res = calcular(`${b}−${a}`); }
  const usados = nombres.filter(k => !ex || ex.includes(k));
  const filas = U.map(x => [x, ...usados.map(k => (defs[k].includes(x) ? '✔' : '')), res.v.includes(x) ? '✔' : '']);
  let ver = `Revisamos elemento por elemento en una tabla de pertenencia: para cada uno, miramos en qué conjuntos está y si cumple la condición de la operación.`;
  const indep = U.filter(res.f), igual = indep.length === res.v.length && indep.every(x => res.v.includes(x));
  P('Verificamos', ver, ex && /∪/.test(ex) && usados.length === 2 && ex.length === 3 ? `|${usados[0]}\\cup ${usados[1]}|=|${usados[0]}|+|${usados[1]}|-|${usados[0]}\\cap ${usados[1]}|=${defs[usados[0]].length}+${defs[usados[1]].length}-${defs[usados[0]].filter(x => defs[usados[1]].includes(x)).length}=${res.v.length}\\;\\checkmark` : `\\text{Con la condición de pertenencia salen los mismos elementos: }${Ls(indep)}\\;${igual ? '\\checkmark' : ''}`, tabla(['Elemento', ...usados.map(k => k), k$(res.L)], filas));
  return { tema: 'conjuntos', metodo: 'Operaciones entre conjuntos', pasos, resultado: `${res.L}=${Ls(res.v)}` };
}
function resolverLogica(texto) {
  let s = ' ' + plano(texto).replace(/tabla de verdad( de)?|resolver|clasificar|:/g, ' ') + ' ';
  s = s.replace(/<->|<=>|\bsii\b|\bsi y solo si\b/g, '↔').replace(/->|=>|\bentonces\b/g, '→').replace(/\bno\b|~|!/g, '¬').replace(/\by\b|&|\^|\band\b/g, '∧').replace(/\bo\b|\||\bor\b|\sv\s/g, '∨').replace(/\s+/g, '');
  const vars = [...new Set(s.match(/[a-z]/g) || [])].sort(); if (!vars.length || vars.length > 4) throw new Error('Usá entre 1 y 4 proposiciones (p, q, r, s) y los conectivos ¬, ∧, ∨, →, ↔.');
  let i = 0; const subs = [];
  const reg = (n) => { if (!subs.some(x => x.L === n.L)) subs.push(n); return n; };
  const prim = () => { const c = s[i];
    if (c === '¬') { i++; const a = prim(); return reg({ L: `\\neg ${a.L.length > 1 ? par(a.L) : a.L}`, f: v => !a.f(v) }); }
    if (c === '(') { i++; const a = bic(); if (s[i] !== ')') throw new Error('Falta cerrar un paréntesis.'); i++; return { ...a, L: a.L, par: true }; }
    if (/[a-z]/.test(c)) { i++; return { L: c, f: v => v[c] }; }
    throw new Error('No entendí la fórmula lógica.'); };
  const w = a => (a.par || /[∧∨→↔]|wedge|vee|to|leftrightarrow/.test(a.L) ? par(a.L) : a.L);
  const con = () => { let a = prim(); while (s[i] === '∧') { i++; const b = prim(); const A = a; a = reg({ L: `${w(A)}\\wedge ${w(b)}`, f: v => A.f(v) && b.f(v) }); } return a; };
  const dis = () => { let a = con(); while (s[i] === '∨') { i++; const b = con(); const A = a; a = reg({ L: `${w(A)}\\vee ${w(b)}`, f: v => A.f(v) || b.f(v) }); } return a; };
  const imp = () => { const a = dis(); if (s[i] === '→') { i++; const b = imp(); return reg({ L: `${w(a)}\\to ${w(b)}`, f: v => !a.f(v) || b.f(v) }); } return a; };
  const bic = () => { let a = imp(); while (s[i] === '↔') { i++; const b = imp(); const A = a; a = reg({ L: `${w(A)}\\leftrightarrow ${w(b)}`, f: v => A.f(v) === b.f(v) }); } return a; };
  const F = bic(); if (i < s.length) throw new Error('No entendí la fórmula lógica.');
  const filas = []; const n = vars.length;
  for (let k = 0; k < 2 ** n; k++) { const v = Object.fromEntries(vars.map((x, j) => [x, !((k >> (n - 1 - j)) & 1)])); filas.push(v); }
  const VF = b => (b ? 'V' : 'F');
  const { pasos, P } = crearPasos();
  P('Escribimos la fórmula', `Tiene ${n} proposicion${n > 1 ? 'es' : ''} simple${n > 1 ? 's' : ''}, así que la tabla tiene 2^${n} = ${2 ** n} filas (todas las combinaciones de V y F).`, F.L);
  P('Recordamos los conectivos', '¬ cambia el valor. ∧ (y) es V solo si las dos son V. ∨ (o) es F solo si las dos son F. → (si… entonces) es F solo cuando de V se pasa a F. ↔ (si y solo si) es V cuando las dos tienen el mismo valor.');
  const cols = subs.filter(x => x !== F).concat([F]);
  P('Armamos la tabla de verdad', 'Calculamos columna por columna, de las partes más chicas a la fórmula completa.', [], tabla([...vars.map(k$), ...cols.map(c => k$(c.L))], filas.map(v => [...vars.map(x => VF(v[x])), ...cols.map(c => VF(c.f(v)))])));
  const res = filas.map(v => F.f(v)), cla = res.every(Boolean) ? 'tautología' : res.some(Boolean) ? 'contingencia' : 'contradicción';
  P('Clasificamos', cla === 'tautología' ? 'La última columna es toda V: es una tautología (siempre verdadera).' : cla === 'contradicción' ? 'La última columna es toda F: es una contradicción (siempre falsa).' : 'La última columna tiene V y F: es una contingencia (depende de los valores).', tx(cla.charAt(0).toUpperCase() + cla.slice(1)));
  const ej = filas[filas.length - 1];
  P('Verificamos', `Calculamos a mano una fila, por ejemplo con ${vars.map(x => `${x} = ${VF(ej[x])}`).join(', ')}, y comparamos con la tabla.`, `${F.L}\\;\\Rightarrow\\;${VF(F.f(ej))}\\;\\checkmark`);
  return { tema: 'conjuntos', metodo: 'Tabla de verdad', pasos, resultado: tx(cla.charAt(0).toUpperCase() + cla.slice(1)) };
}

/* -----------------------------------------------------------------------
 * A23. DETECCIÓN DEL TEMA DE ÁLGEBRA
 * Igual que en aritmética: se prueban en orden y el primero que coincide
 * resuelve. FORZAR dice qué hacer si el alumno elige el tema a mano.
 * --------------------------------------------------------------------- */
const TEMAS_ALG = {
  conjuntos: 'Conjuntos y lógica', basicos: 'Conceptos básicos', notables: 'Productos notables', factorizacion: 'Factorización',
  fracciones: 'Fracciones algebraicas', primergrado: 'Ecuaciones de primer grado', lineal: 'Función lineal', sistemas: 'Sistemas de ecuaciones',
  potenciacion: 'Potenciación', radicacion: 'Radicación', complejos: 'Números complejos', segundogrado: 'Ecuaciones de segundo grado',
  desigualdades: 'Desigualdades', logaritmos: 'Logaritmos', progresiones: 'Progresiones', matrices: 'Matrices', raices: 'Raíces de un polinomio'
};
// Ecuación de una incógnita: decide primer grado, segundo grado o raíces.
function resolverEcuacion(texto, metodo, forzado) {
  const rel = relAlg(texto.replace(/^\s*(resolver|resolve|hallar x|despejar)\s*:?\s*/i, ''));
  const vs = [...new Set([...varsDe(rel.izq), ...varsDe(rel.der)])];
  if (vs.length !== 1) throw new Error(vs.length ? 'La ecuación tiene más de una incógnita: si es un sistema, separá las ecuaciones con punto y coma.' : 'La ecuación no tiene incógnita.');
  if (contieneA(rel.izq, n => n.t === 'div' && varsDe(n.b).length) || contieneA(rel.der, n => n.t === 'div' && varsDe(n.b).length)) throw new Error('La incógnita está en un denominador: es una ecuación fraccionaria. Por ahora resuelvo ecuaciones polinómicas.');
  const g = Pgrado(Pred(Psub(aPoly(rel.izq), aPoly(rel.der))));
  if (forzado === 'raices' || g >= 3) return resolverRaices(texto);
  if (g === 2) return resolverSegundoGrado(rel, vs[0], metodo);
  return resolverPrimerGrado(rel, vs[0]);
}
function esExpresionAlg(t) { try { exprAlg(t); return true; } catch (e) { return false; } }
const DETECTORES_ALG = [
  { tema: 'matrices', test: t => /\[\s*\[/.test(t) || /\b(det|determinante|inversa|transpuesta|matriz)\b/.test(t), fn: resolverMatrices },
  { tema: 'conjuntos', test: (t, o) => /[A-Z]\s*=\s*\{/.test(o) || /[∪∩]/.test(o), fn: resolverConjuntos },
  { tema: 'conjuntos', test: t => /[∧∨¬↔]|<->|<=>|tabla de verdad|tautolog|contradicc/.test(t) || (/^[\s()pqrs~!¬^&|v∧∨→↔<>=-]+$/.test(t) && /[pq]/.test(t) && /[∧∨→↔^&|~!¬]|->/.test(t)), fn: resolverLogica },
  { tema: 'basicos', test: t => /valor numerico|\b(para|si|cuando)\s+[a-z]\s*=/.test(t), fn: resolverValorNumerico },
  { tema: 'complejos', test: t => { const s = t.replace(/modulo|argumento|forma polar|polar|conjugado|forma trigonometrica|calcular|resolver|operar|del|de|:/g, ''); return /i/.test(s) && /^[\d\s+\-*/()^.,i·×:]+$/.test(s); }, fn: resolverComplejos },
  { tema: 'progresiones', test: t => /progresi|sucesi|\.\.\.|…|\ba_?\(?1\)?\s*=/.test(t), fn: resolverProgresion },
  { tema: 'logaritmos', test: t => /\blog|\bln\b/.test(t) || (/=/.test(t) && /\^\s*\(?[^=]*[a-z]/.test(t.replace(/\^\s*\(?\s*-?\d+(?:[.,]\d+)?\s*\)?/g, ''))), fn: resolverLogaritmos },
  { tema: 'lineal', test: t => /^\s*(y|f\s*\(\s*x\s*\))\s*=/.test(t) || /recta|pendiente|pasa por|funcion lineal/.test(t), fn: resolverFuncionLineal },
  { tema: 'sistemas', test: t => /sistema/.test(t) || (t.match(/=/g) || []).length >= 2, fn: resolverSistema },
  { tema: 'raices', test: t => /raices|ceros de|ceros del/.test(t), fn: resolverRaices },
  { tema: 'basicos', test: t => /dividir|division/.test(t) || /^\s*\(.+\)\s*(:|÷|entre)\s*\(.+\)\s*$/.test(t), fn: resolverDivisionPoli },
  { tema: 'desigualdades', test: t => /[<>≤≥]/.test(t), fn: (o) => { const r = relAlg(o.replace(/^\s*(resolver|inecuacion|desigualdad)\s*:?\s*/i, '')); const vs = [...new Set([...varsDe(r.izq), ...varsDe(r.der), ...(r.ter ? varsDe(r.ter) : [])])]; if (vs.length !== 1) throw new Error('La inecuación tiene que tener una sola incógnita.'); return resolverDesigualdad(r, vs[0]); } },
  { tema: 'primergrado', test: t => /=/.test(t), fn: resolverEcuacion },
  { tema: 'radicacion', test: t => /√|raiz|sqrt|racionaliz/.test(t), fn: resolverRadicacion },
  { tema: 'factorizacion', test: t => /factori|factore|descompon/.test(t), fn: resolverFactorizacion },
  { tema: 'notables', test: (t, o) => /desarroll|producto notable/.test(t) || (esExpresionAlg(o) && !!detectarNotable(exprAlg(o))), fn: resolverNotable },
  { tema: 'fracciones', test: (t, o) => esExpresionAlg(o) && contieneA(exprAlg(o), n => n.t === 'div' && varsDe(n.b).length > 0 && Pred(aPoly(n.b)).length > 1), fn: resolverFraccionAlg },
  { tema: 'potenciacion', test: (t, o) => esExpresionAlg(o) && varsDe(exprAlg(o)).length > 0 && !contieneA(exprAlg(o), n => n.t === 'add') && contieneA(exprAlg(o), n => n.t === 'pow' || n.t === 'div'), fn: resolverPotenciaAlg },
  { tema: 'factorizacion', test: (t, o) => { if (!esExpresionAlg(o)) return false; const e = exprAlg(o); return !contieneA(e, n => n.t === 'par') && Pred(aPoly(e)).length === aPoly(e, false).length && Pred(aPoly(e)).length >= 2 && Pgrado(Pred(aPoly(e))) >= 2; }, fn: resolverFactorizacion },
  { tema: 'basicos', test: () => true, fn: resolverReducir }
];
// Qué hacer si el alumno eligió el tema a mano y ningún detector de ese tema coincidió.
const FORZAR = {
  basicos: resolverReducir, notables: resolverNotable, factorizacion: resolverFactorizacion, fracciones: resolverFraccionAlg,
  primergrado: resolverEcuacion, segundogrado: resolverEcuacion, raices: (o, m) => resolverEcuacion(/=/.test(o) ? o : o + ' = 0', m, 'raices'),
  lineal: resolverFuncionLineal, sistemas: resolverSistema, potenciacion: resolverPotenciaAlg, radicacion: resolverRadicacion,
  complejos: resolverComplejos, desigualdades: o => DETECTORES_ALG.find(d => d.tema === 'desigualdades').fn(o), logaritmos: resolverLogaritmos,
  progresiones: resolverProgresion, matrices: resolverMatrices, conjuntos: o => (/[A-Z]\s*=\s*\{/.test(o) ? resolverConjuntos(o) : resolverLogica(o))
};
function resolverAlgebra(texto, temaForzado, metodo) {
  const original = texto.trim(); if (!original) throw new Error('Escribí un ejercicio.');
  const t = plano(original);
  if (temaForzado) {
    const d = DETECTORES_ALG.find(x => x.tema === temaForzado && x.test(t, original));
    const r = d ? d.fn(original, metodo) : FORZAR[temaForzado](original, metodo, temaForzado);
    return r;
  }
  for (const d of DETECTORES_ALG) {
    let ok = false; try { ok = d.test(t, original); } catch (e) { ok = false; }
    if (ok) return d.fn(original, metodo);
  }
  throw new Error('No reconocí el ejercicio.');
}
function detectarTemaAlgebra(texto) {
  const t = plano(texto.trim()); if (!t) return null;
  for (const d of DETECTORES_ALG) { try { if (d.test(t, texto)) { if (d.tema === 'primergrado') { const r = relAlg(texto); const g = Pgrado(Pred(Psub(aPoly(r.izq), aPoly(r.der)))); return g >= 3 ? 'raices' : g === 2 ? 'segundogrado' : 'primergrado'; } return d.tema; } } catch (e) { return null; } }
  return null;
}

/* -----------------------------------------------------------------------
 * A24. PROBLEMAS CON ENUNCIADO
 * Se lee el texto, se elige la incógnita, se traduce cada frase al
 * lenguaje algebraico, se plantea la ecuación, se resuelve con el motor
 * de ecuaciones, se verifica en el enunciado y se responde con una oración.
 * --------------------------------------------------------------------- */
const PB_NUM = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100 };
const PB_VECES = { doble: 2, triple: 3, cuadruple: 4, quintuple: 5, 'el doble': 2, 'el triple': 3, 'el cuadruple': 4, 'el quintuple': 5 };
const PB_PARTE = { mitad: 2, 'tercera parte': 3, 'cuarta parte': 4, 'quinta parte': 5, tercio: 3, cuarto: 4 };
const pbN = s => { s = String(s).trim(); return /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s.replace(',', '.')); };
const pbF = v => fmtX(+(+v).toFixed(6));                       // número para el texto
const pbS = v => { const s = String(+(+v).toFixed(6)); return v < 0 ? `(${s})` : s; };   // número para la ecuación
const pbMay = s => s.charAt(0).toUpperCase() + s.slice(1);
const pbVeces = s => { s = s.replace(/^(el|la)\s+/, ''); return PB_VECES[s] || (/^(\d+(?:[.,]\d+)?) veces/.test(s) ? pbN(s) : null); };
const pbPlata = v => (Math.abs(v - Math.round(v)) < 1e-9 ? `$ ${String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : `$ ${(+v).toFixed(2).replace('.', ',')}`);
const pbPlataL = v => '\\$\\,' + pbPlata(v).slice(2).replace(/\./g, '{.}').replace(/,/g, '{,}');
function pbTexto(original) {                                    // texto en minúsculas, sin tildes y con los números en cifras
  let t = plano(original).replace(/[¿?¡!]/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|cincuenta|cien)\b/g, m => PB_NUM[m]);
  return t.replace(/\bdel\b/g, 'de el').replace(/\bal\b/g, 'a el').replace(/(\d)\s*(?=%)/g, '$1');
}
// Frase con "un número" → expresión en x
function pbExpr(s) {
  s = s.trim().replace(/^(que|y|,)\s+/, '').replace(/[.,;:]+$/, '').trim();
  let m;
  if (/^-?\d+(?:[.,]\d+)?$/.test(s)) return pbS(pbN(s));
  if ((m = s.match(/^(.+)\s+(mas|menos|aumentad[oa] en|disminuid[oa] en|sumad[oa] (?:a|con)|restad[oa] (?:a|en)|incrementad[oa] en|multiplicad[oa] por|por|dividid[oa] (?:por|entre|en)|sobre)\s+(.+)$/))) {
    const a = pbExpr(m[1]), b = pbExpr(m[3]); if (a === null || b === null) return null;
    if (/^(mas|aumentad|sumad|incrementad)/.test(m[2])) return `${a}+${b}`;
    if (/^(menos|disminuid|restad)/.test(m[2])) return `${a}-(${b})`.replace(/-\((\d+(?:\.\d+)?)\)$/, '-$1');
    if (/^(multiplicad|por)/.test(m[2])) return `(${a})(${b})`;
    return `(${a})/(${b})`;
  }
  if ((m = s.match(/^(?:la )?suma de (.+?) y (.+)$/))) { const a = pbExpr(m[1]), b = pbExpr(m[2]); return a === null || b === null ? null : `(${a}+${b})`; }
  if ((m = s.match(/^(?:la )?diferencia (?:entre|de) (.+?) y (.+)$/))) { const a = pbExpr(m[1]), b = pbExpr(m[2]); return a === null || b === null ? null : `(${a}-(${b}))`; }
  if ((m = s.match(/^(?:el )?producto (?:de|entre) (.+?) (?:y|por) (.+)$/))) { const a = pbExpr(m[1]), b = pbExpr(m[2]); return a === null || b === null ? null : `(${a})(${b})`; }
  if ((m = s.match(/^(?:el |la |su )?(doble|triple|cuadruple|quintuple)(?: de (.+))?$/))) { const a = m[2] ? pbExpr(m[2]) : 'x'; return a === null ? null : `${PB_VECES[m[1]]}(${a})`; }
  if ((m = s.match(/^(\d+) veces (.+)$/))) { const a = pbExpr(m[2]); return a === null ? null : `${m[1]}(${a})`; }
  if ((m = s.match(/^(?:la |su )?(mitad|tercera parte|cuarta parte|quinta parte)(?: de (.+))?$/))) { const a = m[2] ? pbExpr(m[2]) : 'x'; return a === null ? null : `(${a})/${PB_PARTE[m[1]]}`; }
  if ((m = s.match(/^(?:el |su )?(cuadrado|cubo)(?: de (.+))?$/))) { const a = m[2] ? pbExpr(m[2]) : 'x'; return a === null ? null : `(${a})^${m[1] === 'cuadrado' ? 2 : 3}`; }
  if ((m = s.match(/^(?:el |su )?opuesto(?: de (.+))?$/))) { const a = m[1] ? pbExpr(m[1]) : 'x'; return a === null ? null : `-(${a})`; }
  if (/^(?:su |el )?(consecutivo|siguiente)( de .+)?$/.test(s)) return '(x+1)';
  if (/^(?:su |el )?(anterior|antecesor)( de .+)?$/.test(s)) return '(x-1)';
  if (/^(?:a )?(?:un|el|dicho|ese|este|mismo|el mismo|tal|cierto) ?numero$|^(?:el |dicho )?numero (?:pensado|buscado)$|^x$|^lo$/.test(s)) return 'x';
  return null;
}
// Ecuación de una frase del tipo "el doble de un número aumentado en 7 es 25"
function pbFraseNumero(t) {
  let s = t.replace(/^(problema|resolver|plantear y resolver)\s*:?\s*/, '').replace(/\b(cual|que|hallar|halla|encontrar|calcular|averiguar|determinar)\b.*?\bnumero\b.*$/, '').replace(/\bpienso (en )?un numero\b,?/, '').trim().replace(/[.,;]+$/, '').replace(/^si\s+/, '');
  let m = s.match(/^(?:a|si a) (?:un|el|dicho|ese) numero (?:le|se le) (sumo|sumamos|suma|agrego|agregamos|resto|restamos|quito|quitamos|multiplico|multiplicamos|divido|dividimos)(?: por| entre| en)? (.+?)(?:,)? (?:obtengo|obtenemos|se obtiene|da|resulta|queda|nos da|me da|el resultado es)\s+(.+)$/);
  let izq, der;
  if (m) {
    const b = pbExpr(m[2]); if (b === null) return null;
    izq = /^(sum|agreg)/.test(m[1]) ? `x+${b}` : /^(rest|quit)/.test(m[1]) ? `x-(${b})` : /^multipl/.test(m[1]) ? `(${b})x` : `x/(${b})`;
    der = pbExpr(m[3]);
  } else {
    m = s.match(/^(.+?)\s+(?:es igual a|es igual que|equivale a|es lo mismo que|da como resultado|da|resulta|se obtiene|obtengo|obtenemos|es)\s+(.+)$/);
    if (!m) return null;
    izq = pbExpr(m[1]); der = pbExpr(m[2]);
  }
  if (izq === null || der === null || !/x/.test(izq + der)) return null;
  return { eq: `${izq}=${der}`.replace(/\(x\)/g, 'x'), izqF: m[1], derF: m[m.length - 1] };
}
function pbRaices(eq) {                                         // soluciones reales de la ecuación en x
  const rel = relAlg(eq), P0 = Pred(Psub(aPoly(rel.izq), aPoly(rel.der))), u = aU(P0, 'x');
  if (!u) return { rel, sol: [] };
  const g = u.length - 1;
  if (g === 1) return { rel, sol: [u[0].neg().div(u[1]).num()] };
  if (g === 2) { const R = raicesCuadratica(u[2], u[1], u[0]); return { rel, sol: R.D < 0n ? [] : [...new Set(R.x.map(v => +v.toFixed(9)))] }; }
  return { rel, sol: [] };
}
const pbAprox = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const pbCheck = (txt, a, b) => `${txt}\\;${pbAprox(a, b) ? '\\checkmark' : '\\ne'}`;
const pbHM = (v, u) => { if (!/hora/.test(u) || pbAprox(v, Math.round(v))) return ''; const h = Math.floor(v), mi = Math.round((v - h) * 60); return ` (${h ? h + ' h ' : ''}${mi} min)`; };

// Cada plantilla lee el enunciado y devuelve el planteo
const PLANTILLAS_PB = [
  { tipo: 'Números consecutivos', leer(t) {
    const m = t.match(/(\d) (?:numeros )?(?:enteros |naturales )?(pares |impares )?(?:numeros )?consecutivos( pares| impares)?\D*?(?:suman|suma es|es|dan|da|de)\s*(-?\d+(?:[.,]\d+)?)/); if (!m || !/suma|suman/.test(t)) return null;
    const cl = m[2] || m[3], n = +m[1], s = cl ? 2 : 1, S = pbN(m[4]), clase = cl ? cl.trim() : '';
    if (n < 2 || n > 6) return null;
    const terms = Array.from({ length: n }, (_, k) => k ? `(x+${k * s})` : 'x');
    return { incog: `x = el menor de los ${n} números${clase ? ' ' + clase : ''}`, porQue: `Si conocemos el menor, los demás salen sumando ${s === 2 ? 'de a 2 (entre dos ' + clase + ' seguidos hay 2 de distancia)' : 'de a 1'}.`,
      trad: [...terms.map((e, k) => [k ? `el ${['', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'][k]}` : 'el menor', e.replace(/[()]/g, '')]), [`la suma es ${pbF(S)}`, `${terms.join('+')}=${pbS(S)}`]],
      eq: `${terms.join('+')}=${pbS(S)}`,
      valida: x => pbAprox(x, Math.round(x)) && (!clase || Math.abs(Math.round(x)) % 2 === (clase === 'pares' ? 0 : 1)),
      motivo: `tiene que ser un número entero${clase ? ' y ' + clase.replace(/s$/, '') : ''}`,
      verif: x => { const v = Array.from({ length: n }, (_, k) => x + k * s); return [pbCheck(`${v.map(pbF).join('+')}=${pbF(v.reduce((a, b) => a + b, 0))}`, v.reduce((a, b) => a + b, 0), S)]; },
      resp: x => { const v = Array.from({ length: n }, (_, k) => x + k * s).map(pbF); return { frase: `Los números son ${v.slice(0, -1).join(', ')} y ${v[n - 1]}.`, L: v.join(',\\;') }; } };
  } },
  { tipo: 'Dos números', leer(t) {
    const ms = t.match(/(?:la suma de (?:los |estos )?2 numeros es|2 numeros (?:que )?suman|2 numeros cuya suma es|la suma entre 2 numeros es)\s*(-?\d+(?:[.,]\d+)?)/); if (!ms) return null;
    const S = pbN(ms[1]); let m;
    if ((m = t.match(/diferencia (?:entre ellos |de ambos )?(?:es|da) (?:de )?(\d+(?:[.,]\d+)?)/))) {
      const D = pbN(m[1]);
      return { incog: 'x = el número mayor', porQue: 'Si el mayor es x, el menor es x menos la diferencia.', trad: [['el mayor', 'x'], [`el menor (la diferencia es ${pbF(D)})`, `x-${pbS(D)}`], [`la suma es ${pbF(S)}`, `x+(x-${pbS(D)})=${pbS(S)}`]],
        eq: `x+(x-${pbS(D)})=${pbS(S)}`, verif: x => [pbCheck(`${pbF(x)}+${pbF(x - D)}=${pbF(2 * x - D)}`, 2 * x - D, S), pbCheck(`${pbF(x)}-${pbF(x - D)}=${pbF(D)}`, D, D)],
        resp: x => ({ frase: `Los números son ${pbF(x)} y ${pbF(x - D)}.`, L: `${pbF(x)}\\;\\text{y}\\;${pbF(x - D)}` }) };
    }
    if ((m = t.match(/(?:uno|el mayor|el primero|uno de ellos) es (el doble|el triple|el cuadruple|el quintuple|\d+ veces)/))) {
      const k = pbVeces(m[1]);
      return { incog: 'x = el número menor', porQue: `Conviene llamar x al menor: el otro es ${k} veces x y no hay fracciones.`, trad: [['el menor', 'x'], [`el otro es ${m[1]} de el menor`.replace('de el', 'del'), `${k}x`], [`la suma es ${pbF(S)}`, `x+${k}x=${pbS(S)}`]],
        eq: `x+${k}x=${pbS(S)}`, verif: x => [pbCheck(`${pbF(x)}+${pbF(k * x)}=${pbF((k + 1) * x)}`, (k + 1) * x, S), pbCheck(`${pbF(k * x)}=${k}\\cdot ${pbF(x)}`, k * x, k * x)],
        resp: x => ({ frase: `Los números son ${pbF(x)} y ${pbF(k * x)}.`, L: `${pbF(x)}\\;\\text{y}\\;${pbF(k * x)}` }) };
    }
    if ((m = t.match(/(?:excede a el otro|supera a el otro|es mayor que el otro|mas que el otro)\D*?(\d+(?:[.,]\d+)?)|(?:es|supera a el otro en|excede a el otro en) (\d+(?:[.,]\d+)?) (?:unidades )?(?:mas|mayor)/))) {
      const D = pbN(m[1] || m[2]);
      return { incog: 'x = el número menor', porQue: `El mayor tiene ${pbF(D)} más que el menor.`, trad: [['el menor', 'x'], ['el mayor', `x+${pbS(D)}`], [`la suma es ${pbF(S)}`, `x+(x+${pbS(D)})=${pbS(S)}`]],
        eq: `x+(x+${pbS(D)})=${pbS(S)}`, verif: x => [pbCheck(`${pbF(x)}+${pbF(x + D)}=${pbF(2 * x + D)}`, 2 * x + D, S)],
        resp: x => ({ frase: `Los números son ${pbF(x)} y ${pbF(x + D)}.`, L: `${pbF(x)}\\;\\text{y}\\;${pbF(x + D)}` }) };
    }
    return null;
  } },
  { tipo: 'Edades', leer(t, o) {
    if (!/edad|anos/.test(t)) return null;
    const nombre = (i, w) => { const s = o.substr(i, w.length); return /^su /.test(w) ? 'su ' + w.slice(3) : pbMay(s); };
    const PER = '(su [a-z]+|[a-z]+)';
    let A, B, relA, frRel, m;
    if ((m = t.match(new RegExp(`\\b${PER} tiene (el doble|el triple|el cuadruple|el quintuple|\\d+ veces)(?: de)? (?:la edad de|lo que tiene|los anos de) ${PER}`)))) {
      const k = pbVeces(m[2]); A = nombre(m.index, m[1]); B = nombre(t.indexOf(m[3], m.index + m[0].length - m[3].length), m[3]); relA = x => `${k}x`; frRel = `${A} tiene ${m[2]} de la edad de ${B}`; A = { n: A, e: `${k}x`, v: x => k * x };
    } else if ((m = t.match(new RegExp(`\\b${PER} (?:tiene|es) (\\d+) anos (?:mas|mayor) (?:que|de)? ?${PER}`)))) {
      const d = +m[2]; A = nombre(m.index, m[1]); B = nombre(t.indexOf(m[3], m.index + m[0].length - m[3].length), m[3]); frRel = `${A} tiene ${d} años más que ${B}`; A = { n: A, e: `x+${d}`, v: x => x + d };
    } else return null;
    if (/^(la|el|que|y|si|hoy|entre)$/.test(A.n.toLowerCase()) || /^(la|el|que)$/.test(B.toLowerCase())) return null;
    const Bm = pbMay(B.replace(/^su /, '')), An = pbMay(A.n.replace(/^su /, ''));
    const base = { incog: `x = edad actual de ${B}`, porQue: `Conviene llamar x a la edad de ${B}, porque la edad de ${A.n} se escribe a partir de ella.` };
    if ((m = t.match(/(?:entre (?:los|ambos) 2|entre ambos|juntos|sus edades|la suma de sus edades|las 2 edades)\D{0,20}?(?:suman|tienen|es|da|suma)\s*(?:de )?(\d+)|suman (\d+) anos/))) {
      const S = +(m[1] || m[2]);
      return { ...base, trad: [[`edad de ${B}`, 'x'], [frRel, A.e], [`entre los dos suman ${S}`, `${A.e}+x=${S}`]], eq: `${A.e}+x=${S}`,
        valida: x => x > 0, motivo: 'una edad no puede ser negativa ni cero',
        verif: x => [pbCheck(`${pbF(A.v(x))}+${pbF(x)}=${pbF(A.v(x) + x)}`, A.v(x) + x, S)],
        resp: x => ({ frase: `${pbMay(A.n)} tiene ${pbF(A.v(x))} años y ${B} tiene ${pbF(x)} años.`, L: `\\text{${An}}=${pbF(A.v(x))}\\text{ años},\\;\\text{${Bm}}=${pbF(x)}\\text{ años}` }) };
    }
    if ((m = t.match(/(dentro de|hace) (\d+) anos,? (su [a-z]+|[a-z]+) (?:tendra|tenia) (el doble|el triple|el cuadruple|\d+ veces)(?: de)? (?:la edad de|lo que tenga|lo que tenia|los anos de) (su [a-z]+|[a-z]+)/))) {
      const n = (m[1] === 'hace' ? -1 : 1) * +m[2], k = pbVeces(m[4]), quien = m[3], AesP = A.n.toLowerCase() === quien;
      const eP = AesP ? A.e : 'x', eQ = AesP ? 'x' : A.e, vP = AesP ? A.v : (x => x), vQ = AesP ? (x => x) : A.v;
      const sg = n > 0 ? `+${n}` : `${n}`, eq = `${/\+/.test(eP) ? `(${eP})` : eP}${sg}=${k}(${eQ}${sg})`;
      return { ...base, trad: [[`edad de ${B} hoy`, 'x'], [frRel, A.e], [`${m[1]} ${m[2]} años (a cada edad se le ${n > 0 ? 'suma' : 'resta'} ${Math.abs(n)})`, `${eP}${sg}\\quad\\text{y}\\quad ${eQ}${sg}`.replace(/\\[a-z]+|\{|\}/g, ' ')], [`${pbMay(quien)} tendrá ${m[4]} de la otra edad`, eq]], eq,
        valida: x => x > 0 && vP(x) + n >= 0 && vQ(x) + n >= 0, motivo: 'las edades no pueden ser negativas',
        verif: x => [pbCheck(`${pbF(vP(x) + n)}=${k}\\cdot ${pbF(vQ(x) + n)}`, vP(x) + n, k * (vQ(x) + n))],
        resp: x => ({ frase: `Hoy ${A.n} tiene ${pbF(A.v(x))} años y ${B} tiene ${pbF(x)} años.`, L: `\\text{${An}}=${pbF(A.v(x))}\\text{ años},\\;\\text{${Bm}}=${pbF(x)}\\text{ años}` }) };
    }
    return null;
  } },
  { tipo: 'Rectángulo', leer(t) {
    if (!/rectangul/.test(t)) return null;
    const L = /\bbase\b/.test(t) ? 'base' : 'largo', W = /altura/.test(t) ? 'altura' : 'ancho', un = (t.match(/\d\s*(cm|mm|m|km)\b/) || [, 'cm'])[1];
    let m, eL, vL, frL;
    if ((m = t.match(/(?:el largo|la base|su largo|su base)(?: de (?:un|el|este|dicho) rectangulo)? (?:mide|es|tiene) (el doble|el triple|el cuadruple|\d+ veces)(?: de)? (?:el ancho|la altura|lo que mide el ancho|lo que mide la altura|su ancho|su altura)/))) { const k = pbVeces(m[1]); eL = `${k}x`; vL = x => k * x; frL = `${L === 'base' ? 'la base' : 'el largo'} es ${m[1]} de ${W === 'altura' ? 'la altura' : 'el ancho'}`; }
    else if ((m = t.match(/(?:el largo|la base|su largo|su base)(?: de (?:un|el|este|dicho) rectangulo)? (?:mide|es|tiene) (\d+(?:[.,]\d+)?) ?(?:cm|mm|m|km)? (?:mas|mayor) (?:que|de)/))) { const d = pbN(m[1]); eL = `x+${pbS(d)}`; vL = x => x + d; frL = `${L === 'base' ? 'la base' : 'el largo'} mide ${pbF(d)} ${un} más`; }
    else if ((m = t.match(/(?:el ancho|la altura|su ancho|su altura)(?: de (?:un|el|este|dicho) rectangulo)? (?:mide|es) (\d+(?:[.,]\d+)?) ?(?:cm|mm|m|km)? (?:menos|menor) (?:que|de)/))) { const d = pbN(m[1]); eL = `x+${pbS(d)}`; vL = x => x + d; frL = `${W === 'altura' ? 'la altura' : 'el ancho'} mide ${pbF(d)} ${un} menos (el ${L} mide ${pbF(d)} más)`; }
    else return null;
    const base = { incog: `x = ${W === 'altura' ? 'la altura' : 'el ancho'} del rectángulo (en ${un})`, porQue: `Llamamos x a la medida que sirve de referencia: la otra se escribe a partir de ella.` };
    const res = x => ({ frase: `${W === 'altura' ? 'La altura' : 'El ancho'} mide ${pbF(x)} ${un} y ${L === 'base' ? 'la base' : 'el largo'} mide ${pbF(vL(x))} ${un}.`, L: `\\text{${pbMay(W)}}=${pbF(x)}\\text{ ${un}},\\;\\text{${pbMay(L)}}=${pbF(vL(x))}\\text{ ${un}}` });
    if ((m = t.match(/perimetro (?:es|mide|de|es de|igual a)?\s*(\d+(?:[.,]\d+)?)/))) {
      const Pm = pbN(m[1]);
      return { ...base, trad: [[W, 'x'], [frL, eL], [`perímetro = ${pbF(Pm)} ${un} (se suman los 4 lados)`, `2(${eL})+2x=${pbS(Pm)}`]], eq: `2(${eL})+2x=${pbS(Pm)}`,
        valida: x => x > 0 && vL(x) > 0, motivo: 'una longitud tiene que ser positiva',
        verif: x => [pbCheck(`2\\cdot ${pbF(vL(x))}+2\\cdot ${pbF(x)}=${pbF(2 * vL(x) + 2 * x)}`, 2 * vL(x) + 2 * x, Pm)], resp: res };
    }
    if ((m = t.match(/(?:area|superficie) (?:es|mide|de|es de|igual a)?\s*(\d+(?:[.,]\d+)?)/))) {
      const Ar = pbN(m[1]);
      return { ...base, trad: [[W, 'x'], [frL, eL], [`área = ${pbF(Ar)} ${un}² (${L} por ${W})`, `(${eL})\\cdot x=${pbS(Ar)}`.replace('\\cdot', '·')]], eq: `(${eL})x=${pbS(Ar)}`,
        valida: x => x > 0 && vL(x) > 0, motivo: 'una longitud tiene que ser positiva',
        verif: x => [pbCheck(`${pbF(vL(x))}\\cdot ${pbF(x)}=${pbF(vL(x) * x)}`, vL(x) * x, Ar)], resp: res };
    }
    return null;
  } },
  { tipo: 'Compras', leer(t, o) {
    const m = t.match(/(\d+) ([a-z]+(?: de [a-z]+)?) y (\d+) ([a-z]+(?: de [a-z]+)?) (?:cuestan|costaron|salen|valen|se pagaron|pague|pagamos|pago|por)\D*?\$?\s*(\d[\d.,]*\d|\d)/);
    if (!m) return null;
    const n1 = +m[1], it1 = m[2], n2 = +m[3], it2 = m[4], T = pbN(m[5]);
    const raiz = s => s.split(' ')[0].slice(0, 4), sing = s => s.replace(/^([a-z]+?)(es|s)\b/, (w, a, b) => (b === 'es' && /[^aeiou]$/.test(a) && !/(r|n|l|d|z)$/.test(a)) ? a + 'e' : a).replace(/^([a-z]+[rnldz])\b/, '$1');
    let r = t.match(/(?:cada|un|una|el|la) ([a-z]+(?: de [a-z]+)?) (?:cuesta|vale|sale) \$?\s*(\d[\d.,]*\d|\d) (mas|menos) que (?:cada|un|una|el|la) ([a-z]+)/), k = null, d = 0, caro, barato;
    if (r) { d = pbN(r[2]) * (r[3] === 'mas' ? 1 : -1); caro = raiz(r[1]); }
    else if ((r = t.match(/(?:cada|un|una|el|la) ([a-z]+(?: de [a-z]+)?) (?:cuesta|vale|sale) (el doble|el triple|el cuadruple|\d+ veces)(?: de)? (?:lo que|que) (?:cada|un|una|el|la) ([a-z]+)/))) { k = pbVeces(r[2]); caro = raiz(r[1]); }
    else return null;
    const primeroCaro = raiz(it1) === caro; if (!primeroCaro && raiz(it2) !== caro) return null;
    const nC = primeroCaro ? n1 : n2, nB = primeroCaro ? n2 : n1, itC = sing(primeroCaro ? it1 : it2), itB = sing(primeroCaro ? it2 : it1);
    const eC = k ? `${k}x` : `x${d >= 0 ? '+' : '-'}${pbS(Math.abs(d))}`, vC = x => (k ? k * x : x + d);
    const eq = `${nC}${k ? `(${k}x)` : `(${eC})`}+${nB}x=${pbS(T)}`.replace(/^1\(/, '(');
    return { incog: `x = precio de un/a ${itB}`, porQue: `Llamamos x al precio que se usa de referencia; el precio de ${itC} se escribe a partir de él.`,
      trad: [[`precio de un/a ${itB}`, 'x'], [`precio de un/a ${itC}`, eC], [`${nC} ${itC}: ${nC} veces su precio`, `${nC}(${eC})`], [`${nB} ${itB}`, `${nB}x`], [`en total ${pbPlata(T)}`, eq]], eq,
      valida: x => x > 0 && vC(x) > 0, motivo: 'un precio tiene que ser positivo',
      verif: x => [pbCheck(`${nC}\\cdot ${pbPlataL(vC(x))}+${nB}\\cdot ${pbPlataL(x)}=${pbPlataL(nC * vC(x) + nB * x)}`, nC * vC(x) + nB * x, T)],
      resp: x => ({ frase: `Cada ${itB} cuesta ${pbPlata(x)} y cada ${itC} cuesta ${pbPlata(vC(x))}.`, L: `\\text{${pbMay(itB)}}=${pbPlataL(x)},\\;\\text{${pbMay(itC)}}=${pbPlataL(vC(x))}` }) };
  } },
  { tipo: 'Porcentaje (precio original)', leer(t) {
    const m = t.match(/(aumento|recargo|incremento|subio|aumentar|aumenta|aumentado|descuento|rebaja|bajo|rebajado|descontar|descuentan|oferta)\D{0,25}?(\d+(?:[.,]\d+)?)%/) || t.match(/(\d+(?:[.,]\d+)?)%\s*(?:de )?(aumento|recargo|incremento|descuento|rebaja|off|menos|mas)/);
    if (!m) return null;
    const pal = /^\d/.test(m[1]) ? m[2] : m[1], p = pbN(/^\d/.test(m[1]) ? m[1] : m[2]), sube = /aument|recargo|incremento|subio|mas/.test(pal);
    const resto = t.replace(m[0], ' '), mt = resto.match(/\$\s*(\d[\d.,]*\d|\d)/) || resto.match(/(?:cuesta|pague|pago|pagamos|queda|quedo|vale|sale|cobran|costo|en)\s*\$?\s*(\d[\d.,]*\d|\d)(?!\s*%)/);
    if (!mt || !/(antes|original|sin (el )?(descuento|aumento)|costaba|valia|precio inicial|lista|cuanto)/.test(t)) return null;
    const T = pbN(mt[1]), fr = (() => { const g = (a, b) => (b ? g(b, a % b) : a); let num = Math.round(p * 1000), den = 100000; const q = g(num, den); return [num / q, den / q]; })();
    const fL = `${fr[0]}/${fr[1]}`, eq = `x${sube ? '+' : '-'}${fL} x=${pbS(T)}`;
    return { incog: 'x = precio original (antes del ' + (sube ? 'aumento' : 'descuento') + ')', porQue: `El ${pbF(p)} % se calcula sobre el precio original, que no conocemos: por eso no alcanza con ${sube ? 'restar' : 'sumar'} el ${pbF(p)} % al precio final.`,
      trad: [['precio original', 'x'], [`el ${pbF(p)} % del precio original`, `\\frac{${fr[0]}}{${fr[1]}}x`.replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2 ')], [`precio ${sube ? 'con el aumento' : 'con el descuento'} = ${pbPlata(T)}`, eq]], eq,
      valida: x => x > 0, motivo: 'un precio tiene que ser positivo',
      verif: x => [pbCheck(`${pbPlataL(x)}${sube ? '+' : '-'}${pbF(p)}\\%\\cdot ${pbPlataL(x)}=${pbPlataL(x)}${sube ? '+' : '-'}${pbPlataL(x * p / 100)}=${pbPlataL(x * (1 + (sube ? 1 : -1) * p / 100))}`, x * (1 + (sube ? 1 : -1) * p / 100), T)],
      resp: x => ({ frase: `El precio original era ${pbPlata(x)}.`, L: pbPlataL(x) }) };
  } },
  { tipo: 'Encuentro de dos móviles', leer(t) {
    const md = t.match(/(?:separad[oa]s|distancia|distan|a una distancia)\D{0,15}?(\d+(?:[.,]\d+)?)\s*(km|m)\b/) || t.match(/(\d+(?:[.,]\d+)?)\s*(km|m) (?:de distancia|entre)/);
    const vs = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*(km\/h|km por hora|m\/s|kilometros por hora)/g)];
    if (!md || vs.length < 2 || !/encuentr|cruzan|cruce|se juntan|alcanz/.test(t)) return null;
    const D = pbN(md[1]), v1 = pbN(vs[0][1]), v2 = pbN(vs[1][1]), u = /m\/s/.test(vs[0][2]) ? 's' : 'h', alc = /alcanz|mismo sentido|misma direccion|persigue/.test(t);
    const ud = u === 's' ? 'segundos' : 'horas', eq = alc ? `${pbS(Math.max(v1, v2))}x-${pbS(Math.min(v1, v2))}x=${pbS(D)}` : `${pbS(v1)}x+${pbS(v2)}x=${pbS(D)}`;
    return { incog: `x = tiempo hasta ${alc ? 'alcanzarse' : 'encontrarse'} (en ${ud})`, porQue: 'Los dos móviles se mueven durante el mismo tiempo. Distancia = velocidad × tiempo.',
      trad: [['tiempo', 'x'], [`distancia del primero (${pbF(v1)} por ${u})`, `${pbS(v1)}x`], [`distancia del segundo (${pbF(v2)} por ${u})`, `${pbS(v2)}x`], [alc ? `el más rápido recupera los ${pbF(D)} ${md[2]} de ventaja` : `entre los dos recorren los ${pbF(D)} ${md[2]}`, eq]], eq,
      valida: x => x > 0, motivo: 'el tiempo tiene que ser positivo',
      verif: x => [pbCheck(alc ? `${pbF(Math.max(v1, v2) * x)}-${pbF(Math.min(v1, v2) * x)}=${pbF(D)}` : `${pbF(v1 * x)}+${pbF(v2 * x)}=${pbF(v1 * x + v2 * x)}`, alc ? (Math.max(v1, v2) - Math.min(v1, v2)) * x : (v1 + v2) * x, D)],
      resp: x => ({ frase: `Se ${alc ? 'alcanzan' : 'encuentran'} después de ${pbF(x)} ${ud}${pbHM(x, ud)}. ${alc ? '' : `El primero recorre ${pbF(v1 * x)} ${md[2]} y el segundo, ${pbF(v2 * x)} ${md[2]}.`}`.trim(), L: `x=${pbF(x)}\\text{ ${u}}` }) };
  } },
  { tipo: 'Trabajo conjunto', leer(t) {
    if (!/(canilla|grifo|obrero|persona|pintor|maquina|bomba|caño|cano|albanil|trabajador|impresora)/.test(t) || !/(juntos|juntas|ambos|ambas|al mismo tiempo|a la vez|las 2|los 2)/.test(t)) return null;
    const ts = [...t.matchAll(/(?:en|tarda|demora|lo hace en)\s*(\d+(?:[.,]\d+)?)\s*(horas|hora|h|minutos|min|dias|dia)\b/g)];
    if (ts.length < 2) return null;
    const t1 = pbN(ts[0][1]), t2 = pbN(ts[1][1]), ud = /^h/.test(ts[0][2]) ? 'horas' : /^m/.test(ts[0][2]) ? 'minutos' : 'días', eq = `x/${pbS(t1)}+x/${pbS(t2)}=1`;
    return { incog: `x = tiempo que tardan juntos (en ${ud})`, porQue: `En 1 ${ud.replace(/s$/, '').replace(/ia$/, 'ía')} el primero hace 1/${pbF(t1)} del trabajo y el segundo 1/${pbF(t2)}. En x ${ud} tienen que completar el trabajo entero (1).`,
      trad: [['tiempo juntos', 'x'], [`lo que hace el primero en x ${ud}`, `x/${pbS(t1)}`], [`lo que hace el segundo en x ${ud}`, `x/${pbS(t2)}`], ['entre los dos hacen todo el trabajo', eq]], eq,
      valida: x => x > 0, motivo: 'el tiempo tiene que ser positivo',
      verif: x => [pbCheck(`\\frac{${pbF(x)}}{${pbF(t1)}}+\\frac{${pbF(x)}}{${pbF(t2)}}=1`, x / t1 + x / t2, 1)],
      resp: x => ({ frase: `Juntos tardan ${pbF(x)} ${ud}${pbHM(x, ud)}.`, L: `x=${pbF(x)}\\text{ ${ud}}` }) };
  } },
  { tipo: 'Un número', leer(t) {
    if (!/numero/.test(t)) return null;
    const f = pbFraseNumero(t); if (!f) return null;
    const iz = f.eq.split('=')[0], de = f.eq.split('=')[1];
    return { incog: 'x = el número que buscamos', porQue: 'Cada vez que el enunciado dice “un número” o “el número”, escribimos x.',
      trad: [['el número', 'x'], [f.izqF.replace(/de el/g, 'del').replace(/a el/g, 'al'), iz], [`es / da: ${f.derF.replace(/de el/g, 'del')}`, de]], eq: f.eq,
      verif: x => { const r = pbRaices(f.eq).rel, a = evalA(r.izq, { x }), b = evalA(r.der, { x }); return [pbCheck(`${tx('izquierda: ')}${pbF(a)},\\quad ${tx('derecha: ')}${pbF(b)}`, a, b)]; },
      resp: (x, todas) => ({ frase: todas.length > 1 ? `El número puede ser ${todas.map(pbF).join(' o ')}.` : `El número es ${pbF(x)}.`, L: todas.length > 1 ? `x_{1}=${pbF(todas[0])},\\;x_{2}=${pbF(todas[1])}` : `x=${pbF(x)}` }) };
  } }
];
const esProblema = t => { t = pbTexto(t); return t.split(' ').length >= 6 && PLANTILLAS_PB.some(p => { try { return !!p.leer(t, t); } catch (e) { return false; } }); };
function resolverProblema(original) {
  const t = pbTexto(original), o = pbTexto(original);
  let plan = null, tipo = '';
  for (const p of PLANTILLAS_PB) { try { plan = p.leer(t, o); } catch (e) { plan = null; } if (plan) { tipo = p.tipo; break; } }
  if (!plan) throw new Error('No pude plantear el problema. Probá con frases como: “el doble de un número aumentado en 7 es 25”, “Juan tiene el triple de la edad de su hijo y entre los dos suman 48 años”, “el largo de un rectángulo es el doble del ancho y su perímetro es 36 cm”.');
  const { pasos, P } = crearPasos();
  const { rel, sol } = pbRaices(plan.eq);
  P('Leemos e identificamos la incógnita', `Primero buscamos qué nos preguntan: eso es lo que no conocemos. ${plan.porQue}`, plan.incog.replace(/^x = (.+)$/, (m, a) => `x=\\text{${a}}`));
  P('Traducimos al lenguaje algebraico', 'Pasamos cada dato del enunciado a una expresión con x.', [], tabla(['En el enunciado', 'En símbolos'], plan.trad.map(([a, b]) => [escaparPB(pbMay(a)), k$(b.replace(/\*/g, '\\cdot ').replace(/(\d+)\/(\d+) ?x/g, '\\frac{$1}{$2}x').replace(/x\/(\d+(?:\.\d+)?)/g, '\\frac{x}{$1}').replace(/·/g, '\\cdot '))])));
  P('Planteamos la ecuación', 'Juntamos todo en una igualdad. Ahora es un ejercicio de ecuaciones como cualquier otro.', `${LA(rel.izq)}=${LA(rel.der)}`);
  let rr = null; try { rr = resolverEcuacion(plan.eq); } catch (e) { rr = null; }
  if (rr) for (const p of rr.pasos) if (!/^(Escribimos la ecuación|Verificamos)$/.test(p.titulo)) pasos.push({ ...p, mates: p.mates.filter((m, i, v) => !i || m !== v[i - 1]) });
  if (!sol.length) { P('Analizamos', 'La ecuación no tiene solución real: el problema, tal como está planteado, no tiene solución. Revisá los datos.', tx('Sin solución')); return { tema: 'problemas', metodo: tipo, pasos, resultado: tx('Sin solución') }; }
  const buenas = sol.filter(x => !plan.valida || plan.valida(x)), malas = sol.filter(x => !buenas.includes(x));
  if (malas.length) P('Descartamos lo que no tiene sentido', `La ecuación da ${sol.map(pbF).join(' y ')}, pero en el problema ${plan.motivo}. Por eso ${malas.length === 1 ? 'descartamos' : 'descartamos los valores'} ${malas.map(pbF).join(' y ')}.`, [`x=${malas.map(pbF).join(',\\;')}\\;\\text{no sirve}`, ...(buenas.length ? [`x=${buenas.map(pbF).join(',\\;')}`] : [])]);
  if (!buenas.length) { P('Respondemos', 'Ninguna solución de la ecuación cumple las condiciones del problema: el problema no tiene solución con esos datos.', tx('Sin solución')); return { tema: 'problemas', metodo: tipo, pasos, resultado: tx('Sin solución') }; }
  const x = buenas[0], R = plan.resp(x, buenas);
  P('Verificamos en el enunciado', 'No alcanza con reemplazar en la ecuación (podríamos haberla planteado mal): controlamos que se cumplan los datos del enunciado.', plan.verif(x));
  P('Respondemos', `Contestamos con una oración lo que pregunta el problema: ${R.frase}`, R.L);
  return { tema: 'problemas', metodo: tipo, pasos, resultado: R.L, respuesta: R.frase };
}
const escaparPB = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
TEMAS_ALG.problemas = 'Problemas con enunciado';
DETECTORES_ALG.unshift({ tema: 'problemas', test: (t, o) => esProblema(o), fn: resolverProblema });
FORZAR.problemas = resolverProblema;

/* MOTOR-ALGEBRA-FIN ====================================================== */

// Aviso para la interfaz: este motor ya está cargado (se cargan a medida que se eligen las áreas)
(window.MPP_MOTORES = window.MPP_MOTORES || {}).alg = true;
