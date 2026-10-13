/* =======================================================================
 * MOTOR: ARITMÉTICA
 * Racionales exactos (clase Q), analizador de expresiones, pasos y los 11 temas de aritmética. Lo usan todos los demás motores.
 * Es lógica pura (no toca la página): recibe texto y devuelve
 * { tema, metodo, pasos, resultado, alternativas }.
 * ===================================================================== */
'use strict';
/* MOTOR-INICIO ===========================================================
 * Todo lo que está entre MOTOR-INICIO y MOTOR-FIN es lógica pura (sin DOM),
 * así se puede probar o reutilizar en otro lado (por ejemplo, en un servidor).
 * ====================================================================== */

/* -----------------------------------------------------------------------
 * 1. NÚMEROS RACIONALES EXACTOS
 * Usamos BigInt para que no haya errores de redondeo ni límites de tamaño.
 * Un racional Q siempre queda simplificado y con el denominador positivo.
 * --------------------------------------------------------------------- */
const absB = a => (a < 0n ? -a : a);
function mcdB(a, b) { a = absB(a); b = absB(b); while (b) { [a, b] = [b, a % b]; } return a; }
function mcmB(a, b) { return (a === 0n || b === 0n) ? 0n : absB(a / mcdB(a, b) * b); }

class Q {
  constructor(n, d = 1n) {
    n = BigInt(n); d = BigInt(d);
    if (d === 0n) throw new Error('No se puede dividir por cero.');
    if (d < 0n) { n = -n; d = -d; }
    const g = mcdB(n, d) || 1n;
    this.n = n / g; this.d = d / g;
  }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { if (o.n === 0n) throw new Error('No se puede dividir por cero.'); return new Q(this.n * o.d, this.d * o.n); }
  neg() { return new Q(-this.n, this.d); }
  abs() { return new Q(absB(this.n), this.d); }
  inv() { return new Q(this.d, this.n); }
  pow(k) {                       // k: entero (Number)
    if (k < 0) { if (this.n === 0n) throw new Error('0 elevado a un exponente negativo no está definido.'); return this.inv().pow(-k); }
    return new Q(this.n ** BigInt(k), this.d ** BigInt(k));
  }
  cmp(o) { const a = this.n * o.d, b = o.n * this.d; return a < b ? -1 : a > b ? 1 : 0; }
  eq(o) { return this.n === o.n && this.d === o.d; }
  get entero() { return this.d === 1n; }
  get cero() { return this.n === 0n; }
  get signo() { return this.n < 0n ? -1 : this.n > 0n ? 1 : 0; }
  num() { return Number(this.n) / Number(this.d); }
}
const QE = k => new Q(BigInt(k));          // atajo para enteros
const Q0 = QE(0), Q1 = QE(1);

// Raíz k-ésima entera de un BigInt no negativo (la mayor r con r^k <= n).
function raizEnteraB(n, k) {
  if (n < 2n) return n;
  const K = BigInt(k); let lo = 0n, hi = 1n;
  while (hi ** K <= n) hi *= 2n;
  while (lo < hi) { const m = (lo + hi + 1n) / 2n; if (m ** K <= n) lo = m; else hi = m - 1n; }
  return lo;
}
// Raíz exacta de un racional, o null si no es exacta.
function raizExacta(q, k) {
  if (q.n < 0n) { if (k % 2 === 0) return null; const r = raizExacta(q.neg(), k); return r && r.neg(); }
  const a = raizEnteraB(q.n, k), b = raizEnteraB(q.d, k);
  return (a ** BigInt(k) === q.n && b ** BigInt(k) === q.d) ? new Q(a, b) : null;
}
// Descomposición en factores primos de un entero positivo: Map primo → exponente.
function factoresPrimos(n) {
  n = BigInt(n); const m = new Map(); let p = 2n;
  while (p * p <= n) { while (n % p === 0n) { m.set(p, (m.get(p) || 0) + 1); n /= p; } p += (p === 2n ? 1n : 2n); }
  if (n > 1n) m.set(n, (m.get(n) || 0) + 1);
  return m;
}

/* -----------------------------------------------------------------------
 * 2. LECTURA Y ESCRITURA DE NÚMEROS
 * --------------------------------------------------------------------- */
// "3,25" → 13/4 ; "0,1(6)" → 1/6 (los paréntesis marcan el período)
function leerDecimal(raw) {
  const m = raw.match(/^(\d+)(?:[.,](\d*)(?:\((\d+)\))?)?$/);
  if (!m) throw new Error(`“${raw}” no es un número válido.`);
  const [, I, A = '', P = ''] = m;
  if (P) {
    const num = BigInt(I + A + P) - BigInt(I + A);
    const den = BigInt('9'.repeat(P.length) + '0'.repeat(A.length));
    return { q: new Q(num, den), tipo: 'per' };
  }
  if (A) return { q: new Q(BigInt(I + A), 10n ** BigInt(A.length)), tipo: 'dec' };
  return { q: new Q(BigInt(I)), tipo: 'ent' };
}
// Desarrollo decimal de un racional: parte entera, parte no periódica y período.
function expansion(q, max = 30) {
  const neg = q.n < 0n, d = q.d; let r = absB(q.n) % d;
  const ent = absB(q.n) / d, dig = [], visto = new Map(); let per = -1;
  while (r !== 0n && dig.length < max) {
    if (visto.has(r)) { per = visto.get(r); break; }
    visto.set(r, dig.length); r *= 10n; dig.push((r / d).toString()); r %= d;
  }
  if (per >= 0) return { neg, ent, ant: dig.slice(0, per).join(''), per: dig.slice(per).join(''), trunc: false };
  return { neg, ent, ant: dig.join(''), per: '', trunc: r !== 0n };
}
// Enteros en LaTeX, con espacio fino cada tres cifras si son largos.
function L_ent(b) {
  b = BigInt(b); const s = absB(b).toString();
  return (b < 0n ? '-' : '') + (s.length > 4 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : s);
}
// Enteros en texto plano, con punto de miles (como se escribe en Argentina).
function T_ent(b) { b = BigInt(b); const s = absB(b).toString(); return (b < 0n ? '−' : '') + (s.length > 4 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : s); }
function L_frac(q) {
  if (q.entero) return L_ent(q.n);
  return (q.n < 0n ? '-' : '') + `\\frac{${L_ent(absB(q.n))}}{${L_ent(q.d)}}`;
}
// Decimal exacto o periódico (con barra arriba del período). null si es muy largo.
function L_decQ(q) {
  const e = expansion(q); if (e.trunc) return null;
  let s = (e.neg ? '-' : '') + L_ent(e.ent);
  if (e.ant || e.per) s += '{,}' + e.ant + (e.per ? `\\overline{${e.per}}` : '');
  return s;
}
function T_decQ(q) {
  const e = expansion(q); if (e.trunc) return null;
  let s = (e.neg ? '−' : '') + T_ent(e.ent);
  if (e.ant || e.per) s += ',' + e.ant + (e.per ? `(${e.per})` : '');
  return s;
}
// Número aproximado (Number) en LaTeX, con coma decimal; usa notación científica si es enorme o diminuto.
function fmtX(x, dec = 6) {
  if (!isFinite(x)) return 'no definido';
  const r = Math.abs(x) < 1e-12 ? 0 : x;
  let s = r.toFixed(dec); if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}
function L_x(x) {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e9 || a < 1e-5)) { const k = Math.floor(Math.log10(a)); return `${fmtX(x / 10 ** k, 4).replace(',', '{,}')}\\cdot 10^{${k}}`; }
  return fmtX(x).replace(',', '{,}');
}
const par = s => `\\left(${s}\\right)`;
const tx = s => `\\text{${s}}`;

/* Un "valor" del evaluador: exacto (q) o aproximado (x).
 *  dec: viene de números decimales  · fr: viene de fracciones  · irr: es irracional  */
const V = (q, o = {}) => ({ q, x: q.num(), dec: !!o.dec, fr: !!o.fr });
const VX = (x, o = {}) => ({ q: null, x, dec: !!o.dec, fr: !!o.fr, irr: !!o.irr });
function L_val(v) {
  if (!v.q) return L_x(v.x);
  if (v.dec && !v.fr) { const d = L_decQ(v.q); if (d && expansion(v.q).per.length <= 8) return d; }
  return L_frac(v.q);
}
const negV = v => (v.q ? v.q.n < 0n : v.x < 0);
const L_vp = v => (negV(v) ? par(L_val(v)) : L_val(v));   // con paréntesis si es negativo

/* -----------------------------------------------------------------------
 * 3. DE LATEX (MathLive) A TEXTO PLANO
 * MathLive nos da LaTeX. Lo pasamos a una sintaxis simple que entiende
 * nuestro analizador: \frac{a}{b} → ((a)/(b)), \sqrt[3]{x} → √[3](x), etc.
 * --------------------------------------------------------------------- */
function latexATexto(lx) {
  let i = 0;
  const salto = () => { while (lx[i] === ' ') i++; };
  function grupo() { salto(); if (lx[i] === '{') { i++; const r = secuencia('}'); i++; return r; } if (lx[i] === '\\') return comando(); return lx[i++] || ''; }
  function grupoCrudo() { salto(); if (lx[i] !== '{') return lx[i++] || ''; let n = 0, s = ''; do { const c = lx[i++]; if (c === '{') n++; else if (c === '}') n--; if (n > 0 && !(c === '{' && n === 1)) s += c; } while (n > 0 && i < lx.length); return s.replace(/\\[,;: ]/g, ' '); }
  function secuencia(fin) {
    let out = '';
    while (i < lx.length && lx[i] !== fin) {
      if (/\d$/.test(out) && lx.startsWith('\\frac', i)) out += '~';     // número mixto: 2\frac{1}{3}
      out += unidad();
    }
    return out;
  }
  function unidad() {
    const c = lx[i];
    if (c === '{') { i++; const r = secuencia('}'); i++; return r; }
    if (c === '\\') return comando();
    if (c === '^') { i++; return '^(' + grupo() + ')'; }
    if (c === '_') { i++; return '_(' + grupo() + ')'; }
    i++; return c;
  }
  function comando() {
    i++; let nom = '';
    if (/[a-zA-Z]/.test(lx[i] || '')) { while (i < lx.length && /[a-zA-Z]/.test(lx[i])) nom += lx[i++]; }
    else nom = lx[i++] || '';
    switch (nom) {
      case 'frac': case 'dfrac': case 'tfrac': { const a = grupo(), b = grupo(); return `((${a})/(${b}))`; }
      case 'sqrt': { salto(); let k = ''; if (lx[i] === '[') { i++; k = secuencia(']'); i++; } const a = grupo(); return k ? `√[${k}](${a})` : `√(${a})`; }
      case 'cdot': case 'times': case 'ast': return '*';
      case 'div': return ':';
      case 'left': case 'right': case 'bigl': case 'bigr': case 'Bigl': case 'Bigr': case 'big': case 'Big':
        salto(); if (lx[i] === '.') i++; return '';
      case 'lvert': case 'rvert': case 'vert': case 'mid': case '|': return '|';
      case 'lbrack': return '('; case 'rbrack': return ')';
      case 'lbrace': case '{': return '{'; case 'rbrace': case '}': return '}';
      // Álgebra: conjuntos, lógica, complejos, matrices
      case 'cup': return '∪'; case 'cap': return '∩'; case 'setminus': case 'backslash': return '−'; case 'triangle': case 'bigtriangleup': case 'Delta': return 'Δ';
      case 'lor': case 'vee': return '∨'; case 'land': case 'wedge': return '∧'; case 'neg': case 'lnot': case 'sim': return '¬';
      case 'leftrightarrow': case 'Leftrightarrow': case 'iff': case 'longleftrightarrow': return '↔';
      case 'imaginaryI': return 'i'; case 'exponentialE': return 'e'; case 'infty': return '∞'; case 'pm': return '±';
      case 'mathbb': case 'mathcal': return grupoCrudo();
      case 'begin': {                                        // matrices: \begin{pmatrix} a & b \\ c & d \end{pmatrix} → [[a,b],[c,d]]
        const env = grupoCrudo(), fin = lx.indexOf('\\end{' + env + '}', i);
        const cuerpo = lx.slice(i, fin < 0 ? lx.length : fin); i = fin < 0 ? lx.length : fin + 6 + env.length;
        const filas = cuerpo.split('\\\\').map(f => f.split('&').map(c => latexATexto(c)));
        return '[' + filas.filter(f => f.some(c => c !== '')).map(f => '[' + f.join(';') + ']').join(',') + ']';
      }
      case 'pi': return 'π';
      case 'log': return 'log'; case 'ln': return 'ln';
      case 'operatorname': case 'mathrm': case 'text': case 'textrm': case 'mathit': case 'mbox': case 'textit': case 'mathbf': return ' ' + grupoCrudo() + ' ';
      case '%': return '%';
      case ',': case ';': case ':': case ' ': case 'quad': case 'qquad': case '!': return ' ';
      case 'to': case 'rightarrow': case 'longrightarrow': case 'mapsto': case 'Rightarrow': return '→';
      case 'lt': return '<'; case 'gt': return '>';
      case 'le': case 'leq': return '≤'; case 'ge': case 'geq': return '≥'; case 'ne': case 'neq': return '≠';
      case 'placeholder': grupo(); return '';
      case 'degree': case 'circ': return '°';
      case 'prime': return "'";
      default: return nom;
    }
  }
  return secuencia(undefined).replace(/\s+/g, ' ').trim();
}

// Quita tildes y pasa a minúsculas (para detectar palabras clave).
const plano = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* -----------------------------------------------------------------------
 * 4. ANALIZADOR DE EXPRESIONES (lexer + parser)
 * Convierte el texto en un árbol: cada nodo es una operación.
 * --------------------------------------------------------------------- */
function normalizar(t) {
  return t.replace(/[−–—]/g, '-').replace(/[×·*]/g, '*').replace(/÷/g, ':')
    .replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/(\d)\s+(\d+)\s*\/\s*(\d+)/g, '$1~$2/$3')      // número mixto escrito "2 1/3"
    .replace(/ra[ií]z|sqrt/gi, '√').replace(/\bpi\b/gi, 'π');
}
function lexer(src) {
  const s = normalizar(src).replace(/\s+/g, '');
  const toks = []; let i = 0;
  while (i < s.length) {
    const r = s.slice(i); let m;
    if ((m = r.match(/^(\d+(?:[.,]\d+)?)[eE]([+-]?\d+)/))) {            // 3,2e5 (notación científica de calculadora)
      const k = parseInt(m[2]); const base = leerDecimal(m[1]).q;
      toks.push({ t: 'num', v: base.mul(new Q(10n ** BigInt(Math.abs(k)))).pow(1).mul(k < 0 ? new Q(1n, 10n ** BigInt(-2 * k)) : Q1), raw: m[0], tipo: 'cient' });
      i += m[0].length; continue;
    }
    if ((m = r.match(/^\d+(?:[.,]\d*\(\d+\)|[.,]\d+)?/))) {
      const raw = m[0], info = leerDecimal(raw); i += raw.length;
      const f = info.tipo === 'ent' ? s.slice(i).match(/^\/(\d+)(?![.,\d^(])/) : null;
      const prev = toks[toks.length - 1];
      if (f && !(prev && prev.t === '^')) { toks.push({ t: 'frac', a: info.q, b: leerDecimal(f[1]).q, raw: raw + '/' + f[1] }); i += f[0].length; }
      else toks.push({ t: 'num', v: info.q, raw, tipo: info.tipo });
      continue;
    }
    if (r[0] === '√') {
      i++; let k = 2;
      if (s[i] === '[') { const j = s.indexOf(']', i); k = parseInt(s.slice(i + 1, j)); i = j + 1; if (!(k >= 2)) throw new Error('El índice de la raíz tiene que ser un número natural mayor que 1.'); }
      toks.push({ t: 'raiz', k }); continue;
    }
    if ((m = r.match(/^log(?:_\(([^)]*)\)|_(\d+)|\[(\d+)\]|(\d+)(?=\())?/i))) {
      const b = m[1] || m[2] || m[3] || m[4] || null;
      toks.push({ t: 'log', base: b }); i += m[0].length; continue;
    }
    if (r.startsWith('ln')) { toks.push({ t: 'ln' }); i += 2; continue; }
    if (r[0] === 'π') { toks.push({ t: 'cte', n: 'π' }); i++; continue; }
    if (r[0] === 'e') { toks.push({ t: 'cte', n: 'e' }); i++; continue; }
    if (r[0] === 'x' || r[0] === 'X') { toks.push({ t: '*' }); i++; continue; }   // 3x4 = 3·4
    if ('+-*:/^()[]{}|%~'.includes(r[0])) {
      let c = r[0]; if ('[{'.includes(c)) c = '('; if (']}'.includes(c)) c = ')';
      toks.push({ t: c }); i++; continue;
    }
    throw new Error(`No reconozco “${r[0]}”. Revisá lo que escribiste.`);
  }
  const out = [];   // multiplicación implícita: 2(3+1), 3√2, 2π
  for (const tk of toks) {
    const p = out[out.length - 1];
    if (p && ((['num', 'frac', ')', 'cte'].includes(p.t) && ['(', 'raiz', 'log', 'ln', 'cte'].includes(tk.t)) || (p.t === ')' && ['num', 'frac'].includes(tk.t)))) out.push({ t: 'imp' });
    out.push(tk);
  }
  return out;
}
function parsear(toks) {
  let i = 0; const ver = () => toks[i] && toks[i].t, sig = () => toks[i++];
  const SIM = { imp: '·', '*': '·', '-': '−' };
  function expr() {
    const items = []; let op = '+';
    if (ver() === '+' || ver() === '-') op = sig().t;
    items.push({ op, e: termino() });
    while (ver() === '+' || ver() === '-') { op = sig().t; items.push({ op, e: termino() }); }
    return (items.length === 1 && items[0].op === '+') ? items[0].e : { t: 'add', items };
  }
  function termino() {
    let a = unario();
    while (['*', ':', '/', 'imp'].includes(ver())) {
      const op = sig().t, b = unario();
      a = op === ':' ? { t: 'div', a, b, dos: true } : op === '/' ? { t: 'div', a, b } : { t: 'mul', a, b, imp: op === 'imp' };
    }
    return a;
  }
  function unario() { if (ver() === '-') { sig(); return { t: 'neg', e: unario() }; } if (ver() === '+') { sig(); return unario(); } return potencia(); }
  function potencia() { const b = postfijo(); if (ver() === '^') { sig(); return { t: 'pow', a: b, b: unario() }; } return b; }
  function postfijo() { let a = atomo(); while (ver() === '%') { sig(); a = { t: 'pct', e: a }; } return a; }
  function atomo() {
    const tk = sig(); if (!tk) throw new Error('La expresión está incompleta.');
    switch (tk.t) {
      case 'num':
        if (ver() === '~') { sig(); const f = atomo(); return { t: 'mixto', ent: tk.v, fr: f }; }
        return { t: 'num', q: tk.v, raw: tk.raw, tipo: tk.tipo };
      case 'frac': return { t: 'div', a: { t: 'num', q: tk.a, raw: tk.a.n.toString(), tipo: 'ent' }, b: { t: 'num', q: tk.b, raw: tk.b.n.toString(), tipo: 'ent' } };
      case '(': { if (ver() === ')') throw new Error('Hay un paréntesis vacío.'); const e = expr(); if (ver() !== ')') throw new Error('Falta cerrar un paréntesis.'); sig(); return { t: 'par', e }; }
      case '|': { const e = expr(); if (ver() !== '|') throw new Error('Falta cerrar el valor absoluto con |.'); sig(); return { t: 'abs', e }; }
      case 'raiz': return { t: 'raiz', k: tk.k, e: atomo() };
      case 'log': {
        let base = null;
        if (tk.base) { const bt = parsear(lexer(tk.base)); base = bt; }
        return { t: 'log', base, e: atomo() };
      }
      case 'ln': return { t: 'log', base: 'e', e: atomo() };
      case 'cte': return { t: 'cte', n: tk.n };
      case ')': throw new Error('Hay un paréntesis de cierre de más.');
    }
    throw new Error(`Falta un número antes de “${SIM[tk.t] || tk.t}”.`);
  }
  const e = expr();
  if (i < toks.length) throw new Error(toks[i].t === ')' ? 'Hay un paréntesis de cierre de más.' : `Sobra algo cerca de “${SIM[toks[i].t] || toks[i].t}”.`);
  return e;
}
// Desarma paréntesis: ((3)) → 3
const sinPar = e => (e.t === 'par' ? sinPar(e.e) : e);
const esEnteroLit = e => { e = sinPar(e); return e.t === 'num' && e.tipo === 'ent'; };

// Las fracciones escritas (3/4) son números, no divisiones pendientes.
// Si están simplificadas, las convertimos directamente en valores.
function preparar(e) {
  if (e.t === 'div' && !e.dos && esEnteroLit(e.a) && esEnteroLit(e.b) && !sinPar(e.b).q.cero) {
    const a = sinPar(e.a).q, b = sinPar(e.b).q, f = a.div(b);
    if (f.n === a.n && f.d === b.n && !f.entero) return { t: 'val', v: V(f, { fr: true }) };
    return { t: 'div', a: sinPar(e.a), b: sinPar(e.b), lit: true };
  }
  const o = { ...e };
  if (e.e) o.e = preparar(e.e);
  if (e.a) o.a = preparar(e.a);
  if (e.b) o.b = preparar(e.b);
  if (e.items) o.items = e.items.map(it => ({ op: it.op, e: preparar(it.e) }));
  if (e.fr) o.fr = preparar(e.fr);
  return o;
}

/* -----------------------------------------------------------------------
 * 5. DIBUJAR EL ÁRBOL EN LATEX
 * --------------------------------------------------------------------- */
function L(e) {
  switch (e.t) {
    case 'num':
      if (e.tipo === 'per') return e.raw.replace(/[.,](\d*)\((\d+)\)/, (_, a, p) => `{,}${a}\\overline{${p}}`);
      if (e.tipo === 'cient') { const m = e.raw.match(/^(.+?)[eE](.+)$/); return `${m[1].replace(/[.,]/, '{,}')}\\cdot 10^{${parseInt(m[2])}}`; }
      return e.raw.replace(/[.,]/, '{,}');
    case 'val': return L_vp(e.v);
    case 'mixto': { const f = sinPar(e.fr); return L_ent(e.ent.n) + (f.t === 'val' ? L_frac(f.v.q) : f.t === 'div' ? `\\frac{${L(f.a)}}{${L(f.b)}}` : L(f)); }
    case 'par': return par(L(e.e));
    case 'neg': return '-' + L(e.e);
    case 'add': return e.items.map((it, k) => (k === 0 ? (it.op === '-' ? '-' : '') : (it.op === '-' ? '-' : '+')) + L(it.e)).join('');
    case 'mul': {
      const b = sinPar(e.b), juntar = e.imp && ['raiz', 'cte', 'log'].includes(b.t);
      return L(e.a) + (juntar ? '' : '\\cdot ') + L(e.b);
    }
    case 'div': return e.dos ? `${L(e.a)}:${L(e.b)}` : `\\frac{${L(sinPar(e.a))}}{${L(sinPar(e.b))}}`;
    case 'pow': {
      const a = e.a, simple = (a.t === 'num' && a.tipo === 'ent') || a.t === 'par' || a.t === 'cte' || (a.t === 'val' && a.v.q && a.v.q.entero && !negV(a.v));
      return `{${simple ? L(a) : par(L(a))}}^{${L(sinPar(e.b))}}`;
    }
    case 'raiz': return e.k === 2 ? `\\sqrt{${L(sinPar(e.e))}}` : `\\sqrt[${e.k}]{${L(sinPar(e.e))}}`;
    case 'abs': return `\\left|${L(e.e)}\\right|`;
    case 'pct': return L(e.e) + '\\%';
    case 'cte': return e.n === 'π' ? '\\pi' : 'e';
    case 'log': {
      const arg = par(L(sinPar(e.e)));
      if (e.base === 'e') return '\\ln' + arg;
      if (!e.base) return '\\log' + arg;
      return `\\log_{${L(e.base)}}` + arg;
    }
  }
  return '?';
}

/* -----------------------------------------------------------------------
 * 6. EVALUADOR PASO A PASO
 * En cada pasada resolvemos todas las operaciones que ya tienen números
 * en sus dos lados (respetando paréntesis y jerarquía). Cada cuenta queda
 * registrada con un "tipo" para armar la explicación.
 * --------------------------------------------------------------------- */
const esV = e => e.t === 'val' || e.t === 'num';
const valDe = e => (e.t === 'val' ? e.v : V(e.q, { dec: e.tipo === 'dec' || e.tipo === 'per' }));
const mkV = v => ({ t: 'val', v });
const unir = (a, b) => ({ dec: a.dec || b.dec, fr: a.fr || b.fr });

// Columnas para sumar o restar decimales: completamos con ceros y encolumnamos las comas.
function columnasDec(vals, ops, res) {
  const tx_ = v => T_decQ(v.q.abs()) || '';
  const partes = [...vals.map(tx_), tx_(res)].map(s => s.split(','));
  const nd = Math.max(...partes.map(p => (p[1] || '').length));
  const fila = p => (p[0] + (nd ? '{,}' + (p[1] || '').padEnd(nd, '0') : '')).replace(/\./g, '');
  const filas = vals.map((v, k) => (k === 0 ? (negV(v) ? '-' : '') : (ops[k] === '-' ? '-\\,' : '+\\,')) + fila(partes[k]));
  return `\\begin{array}{r}${filas.join('\\\\')}\\\\ \\hline ${negV(res) ? '-' : ''}${fila(partes[partes.length - 1])}\\end{array}`;
}
const contarDec = q => { const e = expansion(q); return (!e.trunc && !e.per) ? e.ant.length : -1; };

function logExacto(b, x) {                       // log_b(x) racional (si existe) o null
  if (b.signo <= 0 || x.signo <= 0 || b.eq(Q1)) return null;
  const k = Math.log(x.num()) / Math.log(b.num());
  for (let qd = 1; qd <= 12; qd++) {
    const p = Math.round(k * qd);
    if (Math.abs(k * qd - p) > 1e-7 || Math.abs(p) > 200) continue;
    try { if (b.pow(p).eq(x.pow(qd))) return new Q(BigInt(p), BigInt(qd)); } catch (err) { /* nada */ }
  }
  return null;
}

function reducir(e, log, ctx) {
  const R = x => reducir(x, log, ctx);
  switch (e.t) {
    case 'num': case 'val': return e;
    case 'cte': log.push({ k: 'cte', m: `${L(e)}\\approx ${L_x(e.n === 'π' ? Math.PI : Math.E)}` }); return mkV(VX(e.n === 'π' ? Math.PI : Math.E, { irr: true }));
    case 'par': { const r = R(e.e); return esV(r) ? mkV(valDe(r)) : { t: 'par', e: r }; }
    case 'mixto': {
      const f = sinPar(e.fr), fq = f.t === 'val' ? f.v.q : f.t === 'div' ? sinPar(f.a).q.div(sinPar(f.b).q) : valDe(f).q;
      const r = e.ent.add(fq);
      log.push({ k: 'mixto', m: `${L(e)}=\\frac{${L_ent(e.ent.n)}\\cdot ${L_ent(fq.d)}+${L_ent(fq.n)}}{${L_ent(fq.d)}}=${L_frac(r)}` });
      return mkV(V(r, { fr: true }));
    }
    case 'neg': {
      if (esV(e.e)) {
        const v = valDe(e.e), r = v.q ? V(v.q.neg(), v) : VX(-v.x, v);
        if (negV(v)) log.push({ k: 'signo', m: `-${L_vp(v)}=${L_val(r)}` });
        return mkV(r);
      }
      return { t: 'neg', e: R(e.e) };
    }
    case 'add': {
      if (e.items.every(it => esV(it.e))) {
        const vs = e.items.map(it => valDe(it.e)), ops = e.items.map(it => it.op);
        const sg = vs.map((v, k) => (ops[k] === '-' ? (v.q ? V(v.q.neg(), v) : VX(-v.x, v)) : v));
        const fl = vs.reduce((a, b) => unir(a, b), { dec: false, fr: false });
        let res, m = L(e);
        if (sg.every(v => v.q)) {
          res = V(sg.reduce((a, v) => a.add(v.q), Q0), fl);
          if (sg.some(v => !v.q.entero) && (fl.fr || !fl.dec)) {               // fracciones: denominador común
            const D = sg.reduce((a, v) => mcmB(a, v.q.d), 1n);
            const nums = sg.map(v => v.q.n * (D / v.q.d));
            m += '=\\frac{' + nums.map((n, k) => (k === 0 ? (n < 0n ? '-' : '') : (n < 0n ? '-' : '+')) + L_ent(absB(n))).join('') + `}{${L_ent(D)}}`;
            const s = nums.reduce((a, b) => a + b, 0n);
            m += `=\\frac{${L_ent(s)}}{${L_ent(D)}}`;
            if (!(res.q.n === s && res.q.d === D)) m += '=' + L_frac(res.q);
            log.push({ k: 'sumafr', m, D });
          } else if (fl.dec && sg.some(v => !v.q.entero) && sg.length <= 4 && vs.every(v => T_decQ(v.q) && contarDec(v.q) >= 0)) {
            m += '=' + L_val(res);
            log.push({ k: 'sumadec', m, col: columnasDec(vs, ops, res.q.signo < 0 ? res : res) });
          } else { m += '=' + L_val(res); log.push({ k: sg.some(v => negV(v)) ? 'sumaent' : 'suma', m }); }
        } else { res = VX(sg.reduce((a, v) => a + v.x, 0), fl); log.push({ k: 'suma', m: m + '\\approx ' + L_val(res) }); }
        return mkV(res);
      }
      return { ...e, items: e.items.map(it => ({ op: it.op, e: R(it.e) })) };
    }
    case 'mul': case 'div': case 'pow': {
      if (!(esV(e.a) && esV(e.b))) return { ...e, a: R(e.a), b: R(e.b) };
      const a = valDe(e.a), b = valDe(e.b), fl = unir(a, b); let r, m = L(e);
      if (e.t === 'mul') {
        if (a.q && b.q) {
          r = V(a.q.mul(b.q), fl);
          if (!a.q.entero && !b.q.entero && (fl.fr || !fl.dec)) {
            const nn = a.q.n * b.q.n, dd = a.q.d * b.q.d;
            m += `=\\frac{${L_ent(nn)}}{${L_ent(dd)}}`; if (!(r.q.n === nn && r.q.d === dd)) m += '=' + L_frac(r.q);
          } else m += '=' + L_val(r);
          const ca = contarDec(a.q), cb = contarDec(b.q);
          log.push({ k: (fl.dec && !fl.fr && (ca > 0 || cb > 0)) ? 'multdec' : (fl.fr ? 'multfr' : 'mult'), m, sig: negV(a) || negV(b), ca, cb, a, b, r });
        } else { r = VX(a.x * b.x, fl); log.push({ k: 'mult', m: m + '\\approx ' + L_val(r) }); }
      } else if (e.t === 'div') {
        if (b.q ? b.q.cero : b.x === 0) throw new Error('Hay una división por cero: no se puede dividir por 0.');
        if (a.q && b.q) {
          r = V(a.q.div(b.q), fl);
          if (e.lit) { m += '=' + L_frac(r.q); log.push({ k: 'simp', m }); return mkV(V(r.q, { fr: true })); }
          if (!a.q.entero || !b.q.entero) {
            if (fl.dec && !fl.fr && contarDec(b.q) > 0) {
              const k = Math.max(contarDec(a.q), contarDec(b.q)), f = new Q(10n ** BigInt(k));
              m += `=${L_val(V(a.q.mul(f), { dec: true }))}:${L_val(V(b.q.mul(f), { dec: true }))}=${L_val(r)}`;
              log.push({ k: 'divdec', m, pot: k });
            } else { m += `=${L_vp(a)}\\cdot ${L_vp(V(b.q.inv(), { fr: true }))}=${L_val(r)}`; log.push({ k: 'divfr', m, sig: negV(a) || negV(b) }); }
          } else {
            if (!r.q.entero) r = V(r.q, { fr: true });
            m += '=' + L_val(r);
            log.push({ k: r.q.entero ? 'div' : 'divnoexacta', m, sig: negV(a) || negV(b) });
          }
        } else { r = VX(a.x / b.x, fl); log.push({ k: 'div', m: m + '\\approx ' + L_val(r) }); }
      } else {                                             // potencia
        if (b.q && b.q.entero) {
          const k = Number(b.q.n); if (Math.abs(k) > 60) throw new Error('El exponente es demasiado grande.');
          if (a.q) {
            if (a.q.cero && k <= 0) throw new Error('0 elevado a 0 o a un exponente negativo no está definido.');
            r = V(a.q.pow(k), fl);
            if (k < 0) m += `={${par(L_frac(a.q.inv()))}}^{${-k}}`;
            m += '=' + L_val(r);
            log.push({ k: k < 0 ? 'potneg' : k === 0 ? 'pot0' : 'pot', m, negBase: negV(a), par: k % 2 === 0 });
          } else { r = VX(a.x ** k, fl); log.push({ k: 'pot', m: m + '\\approx ' + L_val(r) }); }
        } else if (b.q && a.q) {                                 // exponente fraccionario a^(p/q) = raíz q de a^p
          const qd = Number(b.q.d), p = Number(b.q.n), base = a.q.pow(Math.abs(p) <= 60 ? p : 1);
          const ex = raizExacta(base, qd);
          m += `=\\sqrt[${qd}]{${L_vp(a)}^{${p}}}`;
          if (ex) { r = V(ex, fl); m += '=' + L_val(r); } else { if (a.q.signo < 0 && qd % 2 === 0) throw new Error('No existe la raíz de índice par de un número negativo (en los reales).'); r = VX(Math.sign(base.num()) * Math.abs(base.num()) ** (1 / qd), { ...fl, irr: true }); m += '\\approx ' + L_val(r); }
          log.push({ k: 'potfr', m });
        } else { r = VX(a.x ** b.x, fl); log.push({ k: 'pot', m: m + '\\approx ' + L_val(r) }); }
      }
      return mkV(r);
    }
    case 'raiz': {
      if (!esV(e.e)) return { t: 'raiz', k: e.k, e: R(e.e) };
      const a = valDe(e.e);
      if (negV(a) && e.k % 2 === 0) throw new Error('No existe la raíz de índice par de un número negativo (en los números reales).');
      let r, m = L(e);
      const ex = a.q ? raizExacta(a.q, e.k) : null;
      if (ex) { r = V(ex, a); m += '=' + L_val(r); if (!a.q.entero) m = `${L(e)}=\\frac{\\sqrt${e.k > 2 ? `[${e.k}]` : ''}{${L_ent(absB(a.q.n))}}}{\\sqrt${e.k > 2 ? `[${e.k}]` : ''}{${L_ent(a.q.d)}}}=${L_val(r)}`; }
      else { r = VX(Math.sign(a.x) * Math.abs(a.x) ** (1 / e.k), { ...a, irr: true }); m += '\\approx ' + L_val(r); }
      log.push({ k: ex ? 'raiz' : 'raizaprox', m, negImpar: negV(a) });
      return mkV(r);
    }
    case 'abs': {
      if (!esV(e.e)) return { t: 'abs', e: R(e.e) };
      const a = valDe(e.e), r = a.q ? V(a.q.abs(), a) : VX(Math.abs(a.x), a);
      log.push({ k: 'abs', m: `${L(e)}=${L_val(r)}` }); return mkV(r);
    }
    case 'pct': {
      if (!esV(e.e)) return { t: 'pct', e: R(e.e) };
      const a = valDe(e.e), r = a.q ? V(a.q.div(QE(100)), a) : VX(a.x / 100, a);
      log.push({ k: 'pct', m: `${L(e)}=\\frac{${L_val(a)}}{100}=${L_val(r)}` }); return mkV(r);
    }
    case 'log': {
      if (e.base && e.base !== 'e' && !esV(e.base)) return { ...e, base: R(e.base) };
      const arg = sinPar(e.e);
      if (e.base === 'e' && arg.t === 'pow' && arg.a.t === 'cte' && arg.a.n === 'e') {     // ln(e^k) = k exacto
        if (!esV(arg.b)) return { ...e, e: { ...arg, b: R(arg.b) } };
        const r = valDe(arg.b); log.push({ k: 'logex', m: `${L(e)}=${L_val(r)}` }); return mkV(r);
      }
      if (!esV(e.e)) return { ...e, e: R(e.e) };
      const x = valDe(e.e);
      if (negV(x) || (x.q ? x.q.cero : x.x === 0)) throw new Error('El logaritmo solo existe para números positivos.');
      let m = L(e), r;
      if (e.base === 'e') {
        const ax = sinPar(e.e);
        if (ax.t === 'pow' && ax.a.t === 'cte' && ax.a.n === 'e' && esV(ax.b)) { r = valDe(ax.b); m += `=${L_val(r)}`; log.push({ k: 'logex', m }); return mkV(r); }
        if (x.q && x.q.eq(Q1)) { r = V(Q0); m += '=0'; log.push({ k: 'logex', m }); return mkV(r); }
        r = VX(Math.log(x.x), { irr: true }); m += '\\approx ' + L_val(r); log.push({ k: 'logap', m }); return mkV(r);
      }
      const b = e.base ? valDe(e.base) : V(QE(10));
      if (negV(b) || (b.q && (b.q.cero || b.q.eq(Q1)))) throw new Error('La base del logaritmo tiene que ser positiva y distinta de 1.');
      const ex = (b.q && x.q) ? logExacto(b.q, x.q) : null;
      if (ex) { r = V(ex, { fr: !ex.entero }); m += '=' + L_val(r); log.push({ k: 'logex', m, base: b, x, r }); }
      else { r = VX(Math.log(x.x) / Math.log(b.x), { irr: true }); m += `=\\frac{\\ln ${L_vp(x)}}{\\ln ${L_vp(b)}}\\approx ${L_val(r)}`; log.push({ k: 'logap', m }); }
      return mkV(r);
    }
  }
  return e;
}

// Evaluación con decimales comunes (independiente) para verificar el resultado.
function evalFloat(e) {
  switch (e.t) {
    case 'num': return e.q.num(); case 'val': return e.v.x; case 'par': return evalFloat(e.e);
    case 'mixto': { const f = sinPar(e.fr); return e.ent.num() + (f.t === 'val' ? f.v.x : evalFloat(f)); }
    case 'neg': return -evalFloat(e.e);
    case 'add': return e.items.reduce((s, it) => s + (it.op === '-' ? -1 : 1) * evalFloat(it.e), 0);
    case 'mul': return evalFloat(e.a) * evalFloat(e.b); case 'div': return evalFloat(e.a) / evalFloat(e.b);
    case 'pow': { const a = evalFloat(e.a), b = evalFloat(e.b); return a < 0 && !Number.isInteger(b) ? -((-a) ** b) : a ** b; }
    case 'raiz': { const a = evalFloat(e.e); return Math.sign(a) * Math.abs(a) ** (1 / e.k); }
    case 'abs': return Math.abs(evalFloat(e.e)); case 'pct': return evalFloat(e.e) / 100;
    case 'cte': return e.n === 'π' ? Math.PI : Math.E;
    case 'log': { const x = evalFloat(e.e); if (e.base === 'e') return Math.log(x); return Math.log(x) / Math.log(e.base ? evalFloat(e.base) : 10); }
  }
  return NaN;
}
// Recorre el árbol buscando un tipo de nodo.
function contiene(e, f) {
  if (!e || typeof e !== 'object') return false;
  if (f(e)) return true;
  return ['e', 'a', 'b', 'fr', 'base'].some(k => e[k] && typeof e[k] === 'object' && contiene(e[k], f)) || (e.items || []).some(it => contiene(it.e, f));
}

/* -----------------------------------------------------------------------
 * 7. EXPLICACIONES DE CADA TIPO DE CUENTA
 * Cada registro del evaluador tiene un tipo (k). Acá está el texto en
 * castellano rioplatense que acompaña a cada uno. Para agregar un tipo
 * nuevo, sumalo en TEXTOS y en GRUPOS.
 * --------------------------------------------------------------------- */
const TEXTOS = {
  mixto: 'Pasamos el número mixto a fracción: multiplicamos el entero por el denominador y le sumamos el numerador.',
  simp: 'Simplificamos la fracción dividiendo numerador y denominador por su máximo común divisor.',
  signo: 'Menos por menos da más.',
  cte: 'π y e son irracionales: usamos su valor aproximado.',
  abs: 'El valor absoluto es la distancia al cero, así que siempre da positivo (o cero).',
  pct: 'Un porcentaje es una fracción con denominador 100.',
  logex: 'Por definición, $\\log_b x = y$ significa que $b^y = x$: buscamos a qué exponente hay que elevar la base para obtener el número.',
  logap: 'El logaritmo no da exacto, así que usamos el cambio de base con logaritmos naturales y lo aproximamos.',
  propprod: 'Producto de potencias de igual base: se conserva la base y se suman los exponentes.',
  propcoc: 'Cociente de potencias de igual base: se conserva la base y se restan los exponentes.',
  proppot: 'Potencia de potencia: se conserva la base y se multiplican los exponentes.',
  pot: 'Resolvemos la potencia: la base se multiplica por sí misma tantas veces como indica el exponente.',
  pot0: 'Cualquier número distinto de cero elevado a la 0 da 1.',
  potneg: 'Un exponente negativo invierte la base: $a^{-n} = \\left(\\frac{1}{a}\\right)^{n}$.',
  potfr: 'Un exponente fraccionario es una raíz: el denominador es el índice y el numerador es la potencia.',
  raiz: 'Calculamos la raíz: buscamos el número que, elevado al índice, da el radicando. La raíz de una fracción es la raíz del numerador sobre la raíz del denominador.',
  raizaprox: 'La raíz no es exacta (da un número irracional), así que damos un valor aproximado.',
  mult: 'Multiplicamos.', multfr: 'Para multiplicar fracciones, multiplicamos numeradores entre sí y denominadores entre sí, y simplificamos.',
  multdec: 'Multiplicamos como si no hubiera comas y después dejamos en el resultado tantas cifras decimales como tienen los dos factores juntos.',
  div: 'Dividimos.', divnoexacta: 'La división no es exacta, así que el resultado queda como fracción.',
  divfr: 'Para dividir fracciones, multiplicamos la primera por la inversa de la segunda.',
  divdec: 'Para dividir por un decimal, multiplicamos dividendo y divisor por la misma potencia de 10 hasta que el divisor quede entero. El cociente no cambia.',
  suma: 'Sumamos y restamos de izquierda a derecha.',
  sumaent: 'Para sumar enteros: si tienen el mismo signo se suman y se conserva el signo; si tienen distinto signo se restan y queda el signo del que tiene mayor valor absoluto.',
  sumafr: 'Para sumar fracciones de distinto denominador buscamos un denominador común (el mínimo común múltiplo) y escribimos fracciones equivalentes.',
  sumadec: 'Para sumar o restar decimales encolumnamos las comas y completamos con ceros.'
};
const SIGNOS = ' Regla de los signos: signos iguales dan +, signos distintos dan −.';
const GRUPOS = [
  [['mixto'], 'números mixtos'], [['simp'], 'simplificación'], [['signo'], 'regla de los signos'], [['cte'], 'constantes'],
  [['abs'], 'valor absoluto'], [['pct'], 'porcentajes'], [['logex', 'logap'], 'logaritmos'], [['propprod', 'propcoc', 'proppot'], 'propiedades de la potenciación'],
  [['pot', 'pot0', 'potneg', 'potfr', 'raiz', 'raizaprox'], 'potencias y raíces'],
  [['mult', 'multfr', 'multdec', 'div', 'divnoexacta', 'divfr', 'divdec'], 'multiplicaciones y divisiones'],
  [['suma', 'sumaent', 'sumafr', 'sumadec'], 'sumas y restas']
];
// Arma un paso a partir de las cuentas registradas en una pasada.
function pasoDesdeLog(log) {
  const tipos = [...new Set(log.map(l => l.k))];
  const titulo = GRUPOS.filter(([ks]) => ks.some(k => tipos.includes(k))).map(g => g[1]).join(', ');
  let texto = tipos.map(k => TEXTOS[k] || '').join(' ');
  if (log.some(l => l.sig)) texto += SIGNOS;
  if (log.some(l => l.negBase)) texto += ' Con base negativa: si el exponente es par da positivo, y si es impar da negativo.';
  if (log.some(l => l.negImpar)) texto += ' La raíz de índice impar de un número negativo es negativa.';
  const mates = [];
  for (const l of log) {
    mates.push(l.m);
    if (l.col) mates.push(l.col);
    if (l.k === 'multdec') {
      const ia = l.a.q.mul(new Q(10n ** BigInt(Math.max(l.ca, 0)))), ib = l.b.q.mul(new Q(10n ** BigInt(Math.max(l.cb, 0))));
      mates.push(`${L_frac(ia)}\\cdot ${L_vp(V(ib))}=${L_frac(ia.mul(ib))}\\;\\Rightarrow\\; ${tx(`${Math.max(l.ca, 0) + Math.max(l.cb, 0)} cifras decimales`)}`);
    }
  }
  return { titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1), texto, mates };
}

/* -----------------------------------------------------------------------
 * 8. HERRAMIENTAS PARA LOS PASOS
 * Un paso es { titulo, texto, mates:[latex...], html }.
 * En el texto, lo que va entre $...$ se dibuja como fórmula.
 * --------------------------------------------------------------------- */
function crearPasos() {
  const pasos = [];
  const P = (titulo, texto, mates = [], html = '') => { pasos.push({ titulo, texto, mates: [].concat(mates), html }); };
  return { pasos, P };
}
const tabla = (cab, filas, clase = '') => `<table class="tabla ${clase}"><thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const k$ = s => `$${s}$`;                       // fórmula dentro de un texto o una tabla

/* -----------------------------------------------------------------------
 * 9. EXPRESIONES NUMÉRICAS (enteros, racionales, decimales, potencias...)
 * --------------------------------------------------------------------- */
// ¿Qué tema es esta expresión? (para elegir explicaciones y título)
function temaDe(ast) {
  if (contiene(ast, n => n.t === 'log')) return 'cientifica';
  const tp = sinPar(ast);
  if (contiene(ast, n => n.t === 'num' && n.tipo === 'cient') || sciInfo(ast) || ((tp.t === 'mul' || tp.t === 'div') && sciInfo(tp.a) && sciInfo(tp.b))) return 'cientifica';
  if (contiene(ast, n => n.t === 'pow' || n.t === 'raiz')) return 'potencias';
  if (contiene(ast, n => n.t === 'abs' || n.t === 'cte')) return 'reales';
  if (contiene(ast, n => n.t === 'num' && (n.tipo === 'dec' || n.tipo === 'per'))) return 'decimales';
  if (contiene(ast, n => n.t === 'mixto' || (n.t === 'val' && n.v.fr) || (n.t === 'div' && !n.dos))) return 'racionales';
  return 'enteros';
}
const INTRO = {
  enteros: 'Trabajamos con números enteros (positivos, negativos y el cero).',
  racionales: 'Trabajamos con fracciones. Al final dejamos el resultado simplificado.',
  decimales: 'Trabajamos con números decimales.',
  potencias: 'Recordá la jerarquía: primero potencias y raíces, después multiplicaciones y divisiones, y al final sumas y restas.',
  reales: 'Trabajamos con números reales.',
  cientifica: 'Trabajamos con potencias de 10 y logaritmos.'
};
// Valor de una expresión sin registrar pasos (para comparar, ordenar, etc.)
function valorSilencioso(e) { let g = 0; while (!esV(e) && g++ < 300) e = reducir(e, [], {}); return valDe(e); }
function valorDeTexto(t) { return valorSilencioso(preparar(parsear(lexer(t)))); }

// Aplica propiedades de la potenciación (misma base) antes de calcular.
function propiedades(e, log) {
  const o = { ...e };
  for (const k of ['e', 'a', 'b', 'fr']) if (e[k] && typeof e[k] === 'object') o[k] = propiedades(e[k], log);
  if (e.items) o.items = e.items.map(it => ({ op: it.op, e: propiedades(it.e, log) }));
  const info = n => (n.t === 'pow' ? { base: n.a, exp: n.b } : (n.t === 'num' ? { base: n, exp: { t: 'num', q: Q1, raw: '1', tipo: 'ent' } } : null));
  if (o.t === 'mul' || (o.t === 'div' && o.dos)) {
    const pa = info(o.a), pb = info(o.b);
    if (pa && pb && (o.a.t === 'pow' || o.b.t === 'pow') && L(pa.base) === L(pb.base)) {
      const nuevo = { t: 'pow', a: pa.base, b: { t: 'par', e: { t: 'add', items: [{ op: '+', e: pa.exp }, { op: o.t === 'mul' ? '+' : '-', e: pb.exp }] } } };
      log.push({ k: o.t === 'mul' ? 'propprod' : 'propcoc', m: `${L(o)}=${L(nuevo)}` });
      return nuevo;
    }
  }
  if (o.t === 'pow' && sinPar(o.a).t === 'pow') {
    const in_ = sinPar(o.a), nuevo = { t: 'pow', a: in_.a, b: { t: 'par', e: { t: 'mul', a: in_.b, b: o.b } } };
    log.push({ k: 'proppot', m: `${L(o)}=${L(nuevo)}` });
    return nuevo;
  }
  return o;
}

// Información de notación científica: a·10^k  →  { m: Q, k: entero }
function sciInfo(n) {
  n = sinPar(n);
  if (n.t === 'num' && n.tipo === 'cient') { const m = n.raw.match(/^(.+?)[eE](.+)$/); return { m: leerDecimal(m[1]).q, k: parseInt(m[2]) }; }
  const p10 = x => { x = sinPar(x); if (x.t === 'pow' && sinPar(x.a).t === 'num' && sinPar(x.a).q.eq(QE(10))) { const b = sinPar(x.b); if (b.t === 'num' && b.q.entero) return Number(b.q.n); if (b.t === 'neg' && sinPar(b.e).t === 'num' && sinPar(b.e).q.entero) return -Number(sinPar(b.e).q.n); } return null; };
  if (n.t === 'mul') { const a = sinPar(n.a), k = p10(n.b); if (k !== null && a.t === 'num') return { m: a.q, k }; }
  return null;
}
const L_sci = (m, k) => `${L_val(V(m, { dec: true }))}\\cdot 10^{${k}}`;
function normalizarSci(q) {             // q = m·10^k con 1 ≤ |m| < 10
  if (q.cero) return { m: Q0, k: 0 };
  let k = 0, m = q; const diez = QE(10);
  while (m.abs().cmp(diez) >= 0) { m = m.div(diez); k++; }
  while (m.abs().cmp(Q1) < 0) { m = m.mul(diez); k--; }
  return { m, k };
}

function resolverExpresion(texto, forzado) {
  const ast0 = preparar(parsear(lexer(texto)));
  const top = sinPar(ast0);
  // Casos especiales según la forma de lo que se escribió.
  if (['num', 'val', 'mixto'].includes(top.t) || (top.t === 'div' && top.lit) || (top.t === 'neg' && sinPar(top.e).t === 'num')) {
    const r = resolverNumeroSolo(top, forzado); if (r) return r;
  }
  if (top.t === 'raiz' && esEnteroLit(top.e) && !raizExacta(sinPar(top.e).q, top.k)) return simplificarRadical(sinPar(top.e).q.n, top.k);
  if (top.t === 'div' && top.dos && esEnteroLit(top.a) && esEnteroLit(top.b)) return divisionEntera(sinPar(top.a).q.n, sinPar(top.b).q.n);
  if (sciInfo(top)) return expandirCientifica(sciInfo(top));
  if ((top.t === 'mul' || (top.t === 'div' && top.dos)) && sciInfo(top.a) && sciInfo(top.b)) return operarCientifica(sciInfo(top.a), sciInfo(top.b), top.t === 'mul');
  if (forzado === 'reales' && !contiene(top, n => n.t === 'add' || n.t === 'mul' || (n.t === 'div' && !n.lit))) return clasificar(texto);

  const tema = forzado || temaDe(ast0);
  const { pasos, P } = crearPasos();
  let intro = (INTRO[tema] || '') + ' Partimos de la operación tal como la escribiste.';
  if (top.t === 'add' && top.items.length > 1) intro += ' Los signos + y − que no están dentro de paréntesis separan términos: primero resolvemos cada término y al final sumamos y restamos.';
  if (contiene(top, n => n.t === 'par' || n.t === 'abs')) intro += ' Empezamos por lo que está más adentro de los paréntesis.';
  P('Escribimos la operación', intro, L(ast0));
  let e = ast0;
  // Propiedades de la potenciación (solo si hay potencias de igual base).
  for (let g = 0; g < 4; g++) {
    const log = []; const nuevo = propiedades(e, log);
    if (!log.length) break;
    e = nuevo; P('Aplicamos propiedades de la potenciación', [...new Set(log.map(l => l.k))].map(k => TEXTOS[k]).join(' '), [...log.map(l => l.m), L(e)]);
  }
  let guard = 0;
  while (!esV(e) && guard++ < 120) {
    const log = []; e = reducir(e, log, { tema });
    if (!log.length) continue;
    const p = pasoDesdeLog(log);
    if (!esV(e)) p.mates.push('\\text{Queda: }' + L(e));
    P(p.titulo, p.texto, p.mates);
  }
  const v = valDe(e);
  const otras = [];
  if (v.q && !v.q.entero) {
    const d = L_decQ(v.q); if (d) otras.push(d); else otras.push('\\approx ' + L_x(v.x));
    if (absB(v.q.n) > v.q.d) { const ent = v.q.n / v.q.d, r = absB(v.q.n % v.q.d); otras.push((v.q.n < 0n ? '-' : '') + L_ent(absB(ent)) + `\\frac{${L_ent(r)}}{${L_ent(v.q.d)}}`); }
    if (v.dec && !v.fr) otras.unshift(L_frac(v.q));
  }
  const res = (v.q ? L_val(v) : '\\approx ' + L_val(v));
  if (otras.length) P('Expresamos el resultado', 'Escribimos el resultado de otras formas equivalentes' + (v.q && !v.q.entero && absB(v.q.n) > v.q.d ? ' (como decimal y como número mixto).' : '.'), res + otras.map(o => (o.startsWith('\\approx') ? '' : '=') + o).join(''));
  const f = evalFloat(ast0), ok = Math.abs(f - v.x) <= 1e-9 * Math.max(1, Math.abs(f));
  P('Verificamos', 'Repetimos la cuenta de otra forma: con decimales, como haría una calculadora, sin redondear en el medio. Si coincide con nuestro resultado, está bien.', `${L(ast0)}\\approx ${L_x(f)}\\quad ${ok ? '\\checkmark' : tx('(no coincide: revisá la expresión)')}`);
  return { tema, metodo: 'Jerarquía de las operaciones', pasos, resultado: res };
}

/* -----------------------------------------------------------------------
 * 10. NÚMEROS EN PALABRAS (lectura y escritura)
 * --------------------------------------------------------------------- */
const UNI = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
function menosDeMil(n) {
  if (n === 0) return ''; if (n === 100) return 'cien';
  const c = Math.floor(n / 100), r = n % 100; let s = c ? CENTENAS[c] : '';
  if (r) { const t = r < 30 ? UNI[r] : DECENAS[Math.floor(r / 10)] + (r % 10 ? ' y ' + UNI[r % 10] : ''); s = s ? s + ' ' + t : t; }
  return s;
}
const apocope = s => s.replace(/veintiuno$/, 'veintiún').replace(/(^| )uno$/, '$1un');
function enLetras(n) {                         // n: BigInt ≥ 0
  n = BigInt(n); if (n === 0n) return 'cero';
  const mill = n / 1000000n, resto = Number(n % 1000000n); let s = '';
  if (mill > 0n) s = mill === 1n ? 'un millón' : apocope(enLetras(mill)) + ' millones';
  const miles = Math.floor(resto / 1000), u = resto % 1000;
  if (miles) s += (s ? ' ' : '') + (miles === 1 ? 'mil' : apocope(menosDeMil(miles)) + ' mil');
  if (u) s += (s ? ' ' : '') + menosDeMil(u);
  return s;
}
const LUGARES = ['', 'décimo', 'centésimo', 'milésimo', 'diezmilésimo', 'cienmilésimo', 'millonésimo', 'diezmillonésimo', 'cienmillonésimo', 'milmillonésimo'];
const POSICIONES = ['unidades', 'decenas', 'centenas', 'unidades de mil', 'decenas de mil', 'centenas de mil', 'unidades de millón', 'decenas de millón', 'centenas de millón'];
function leerEnPalabras(raw) {                   // "3,045" → "tres enteros cuarenta y cinco milésimos"
  const neg = raw.startsWith('-'); raw = raw.replace(/^-/, '');
  const [e, d = ''] = raw.split(/[.,]/);
  let s = '';
  if (!d) s = enLetras(BigInt(e));
  else {
    const dv = BigInt(d), lugar = LUGARES[d.length] || `(10^${d.length})-ésimo`;
    const dec = apocope(enLetras(dv)) + ' ' + lugar + (dv === 1n ? '' : 's');
    s = BigInt(e) === 0n ? dec : apocope(enLetras(BigInt(e))) + (BigInt(e) === 1n ? ' entero ' : ' enteros ') + dec;
  }
  return (neg ? 'menos ' : '') + s;
}
// Palabras → número entero ("dos mil trescientos cuarenta" → 2340)
const PAL = (() => {
  const m = {}; UNI.forEach((w, i) => { m[plano(w)] = i; }); m.un = 1; m.una = 1; m.veintiun = 21;
  DECENAS.forEach((w, i) => { if (w) m[w] = i * 10; }); CENTENAS.forEach((w, i) => { if (w) m[plano(w)] = i * 100; }); m.cien = 100;
  return m;
})();
function palabrasAEntero(palabras) {
  let total = 0, actual = 0, alguna = false;
  for (const w of palabras) {
    if (w === 'y' || w === '') continue;
    if (w in PAL) { actual += PAL[w]; alguna = true; }
    else if (w === 'mil') { total += (actual || 1) * 1000; actual = 0; alguna = true; }
    else if (w === 'millon' || w === 'millones') { total = (total + (actual || 1)) * 1e6; actual = 0; alguna = true; }
    else return null;
  }
  return alguna ? total + actual : null;
}

/* -----------------------------------------------------------------------
 * 11. NÚMEROS SUELTOS: clasificación, lectura, fracciones, generatriz...
 * --------------------------------------------------------------------- */
function resolverNumeroSolo(n, forzado) {
  if (forzado === 'reales') return null;
  if (n.t === 'neg') n = { ...sinPar(n.e), raw: '-' + sinPar(n.e).raw, q: sinPar(n.e).q.neg() };
  if (n.t === 'num' && n.tipo === 'per') return generatriz(n.raw);
  if (n.t === 'num' && n.tipo === 'dec') return forzado === 'cientifica' ? aCientifica(n.q, n.raw) : lecturaDecimal(n.raw);
  if (n.t === 'num' && n.tipo === 'ent') return forzado === 'cientifica' ? aCientifica(n.q, n.raw) : (forzado === 'decimales' || forzado === 'enteros') ? lecturaDecimal(n.raw) : null;
  if (n.t === 'mixto') { const f = sinPar(n.fr); const fq = f.t === 'val' ? f.v.q : sinPar(f.a).q.div(sinPar(f.b).q); return mixtoAFraccion(n.ent, fq); }
  if (n.t === 'val' && n.v.fr) return explicarFraccion(n.v.q.n, n.v.q.d);
  if (n.t === 'div' && n.lit) return explicarFraccion(sinPar(n.a).q.n, sinPar(n.b).q.n);
  return null;
}

function clasificar(texto) {
  const ast = preparar(parsear(lexer(texto))), top = sinPar(ast);
  const v = valorSilencioso(ast);
  const { pasos, P } = crearPasos();
  const xL = L(ast), simple = ['num', 'val'].includes(top.t);
  P('Escribimos el número', simple ? 'Este es el número que vamos a clasificar.' : 'Primero calculamos cuánto vale.', simple ? xL : `${xL}${v.q ? '=' : '\\approx '}${L_val(v)}`);
  let conj, nombre;
  if (v.q) {
    const e = expansion(v.q);
    const desc = v.q.entero ? 'Es un número entero: no tiene parte decimal.' : e.per ? `Su expresión decimal es periódica (${T_decQ(v.q)}: el período ${e.per} se repite para siempre).` : 'Su expresión decimal es finita (termina).';
    P('Miramos su expresión decimal', desc + ' Todo número que se puede escribir como fracción de enteros es racional.', [`${L_val(v)}${v.q.entero ? '' : '=' + (L_decQ(v.q) || L_x(v.x))}=${v.q.entero ? `\\frac{${L_ent(v.q.n)}}{1}` : L_frac(v.q)}`]);
    const nat = v.q.entero && v.q.n > 0n, ent = v.q.entero;
    conj = nat ? ['\\mathbb{N}', '\\mathbb{Z}', '\\mathbb{Q}', '\\mathbb{R}'] : ent ? ['\\mathbb{Z}', '\\mathbb{Q}', '\\mathbb{R}'] : ['\\mathbb{Q}', '\\mathbb{R}'];
    nombre = nat ? 'natural' : ent ? 'entero' : 'racional (no entero)';
  } else {
    P('Miramos su expresión decimal', 'Tiene infinitas cifras decimales que no se repiten en ningún período: no se puede escribir como fracción de dos enteros, así que es irracional.', `${L(ast)}\\approx ${L_x(v.x)}\\ldots`);
    conj = ['\\mathbb{I}', '\\mathbb{R}']; nombre = 'irracional';
  }
  const xs = simple ? (top.t === 'num' && top.q.n < 0n ? par(xL) : xL) : (v.q ? L_vp(v) : xL);
  const no = ['\\mathbb{N}', '\\mathbb{Z}', '\\mathbb{Q}', '\\mathbb{I}'].filter(c => !conj.includes(c));
  P('Lo clasificamos', `Es un número ${nombre}. Recordá que $\\mathbb{N}\\subset\\mathbb{Z}\\subset\\mathbb{Q}\\subset\\mathbb{R}$ y que los irracionales $\\mathbb{I}$ completan los reales.` + (v.q && v.q.cero ? ' El 0 es entero; según la convención, a veces se lo incluye en los naturales ($\\mathbb{N}_0$).' : ''),
    [`${xs}\\in ${conj.join(',\\;')}`, ...(no.length ? [`${xs}\\notin ${no.join(',\\;')}`] : [])]);
  const op = v.q ? L_val(V(v.q.neg(), v)) : L_x(-v.x);
  const inv = v.q ? (v.q.cero ? tx('no tiene') : L_frac(v.q.inv())) : '\\approx ' + L_x(1 / v.x);
  P('Opuesto, inverso y valor absoluto', 'El opuesto es el que sumado da 0; el inverso es el que multiplicado da 1 (el 0 no tiene inverso); el valor absoluto es la distancia al cero.', [`\\text{opuesto: }${op}`, `\\text{inverso: }${inv}`, `\\text{valor absoluto: }${v.q ? L_val(V(v.q.abs(), v)) : L_x(Math.abs(v.x))}`]);
  P('Verificamos', v.q ? 'Si es racional, al dividir numerador por denominador tiene que dar la misma expresión decimal.' : 'Si fuera racional, su expresión decimal terminaría o se repetiría. Con más cifras se ve que no pasa.',
    v.q ? `${L_frac(v.q)}=${v.q.entero ? L_ent(v.q.n) : (L_decQ(v.q) || L_x(v.x))}\\quad\\checkmark` : `${L(ast)}\\approx ${v.x.toFixed(12).replace('.', '{,}')}\\ldots\\;\\text{(no se repite)}\\;\\checkmark`);
  return { tema: 'reales', metodo: 'Clasificación de números reales', pasos, resultado: `${xs}\\in ${conj[0]}\\;${tx('(' + nombre + ')')}` };
}

function ordenar(items) {
  if (items.length < 2) throw new Error('Para ordenar o comparar necesito al menos dos números.');
  const datos = items.map(t => { const ast = preparar(parsear(lexer(t))); return { t, L: L(ast), v: valorSilencioso(ast) }; });
  const { pasos, P } = crearPasos();
  P('Escribimos los números', 'Para comparar números escritos de distintas formas (fracciones, raíces, decimales), los pasamos todos a decimal.', datos.map(d => `${d.L}${d.v.q ? (d.v.q.entero || L_decQ(d.v.q) ? '=' : '\\approx ') : '\\approx '}${d.v.q ? (d.v.q.entero ? L_ent(d.v.q.n) : (L_decQ(d.v.q) || L_x(d.v.x))) : L_x(d.v.x)}`));
  const ord = [...datos].sort((a, b) => a.v.x - b.v.x);
  const cad = ord.map((d, i) => (i ? (Math.abs(d.v.x - ord[i - 1].v.x) < 1e-12 ? '=' : '<') : '') + d.L).join('');
  P('Ordenamos de menor a mayor', 'Entre dos negativos, es menor el que está más lejos del cero. Cualquier negativo es menor que cualquier positivo.', cad);
  P('Verificamos', 'Restamos cada número menos el anterior: si todas las diferencias son positivas (o cero), el orden es correcto.', ord.slice(1).map((d, i) => `${d.L}-${ord[i].L}\\approx ${L_x(d.v.x - ord[i].v.x)}\\geq 0\\;\\checkmark`));
  return { tema: 'reales', metodo: 'Comparación por expresión decimal', pasos, resultado: cad };
}

function divisionEntera(A, B) {
  if (B === 0n) throw new Error('No se puede dividir por cero.');
  let q = A / B, r = A % B; if (r < 0n) { r += absB(B); q = (A - r) / B; }   // resto siempre entre 0 y |divisor|−1
  const { pasos, P } = crearPasos();
  P('Escribimos la división', 'Buscamos cuántas veces entra el divisor en el dividendo (el cociente) y cuánto sobra (el resto).', `${L_ent(A)}:${L_vp(V(new Q(B)))}`);
  if (A >= 0n && B > 0n && A.toString().length <= 12) {
    const dig = A.toString(); let parcial = 0n; const filas = [];
    for (const c of dig) {
      parcial = parcial * 10n + BigInt(c);
      if (parcial >= B || filas.length) { const qd = parcial / B; filas.push([`${T_ent(parcial)}`, `${T_ent(parcial)} : ${T_ent(B)} = ${qd}`, `${qd} × ${T_ent(B)} = ${T_ent(qd * B)}`, `${T_ent(parcial - qd * B)}`]); parcial -= qd * B; }
    }
    if (!filas.length) filas.push([T_ent(A), `${T_ent(A)} : ${T_ent(B)} = 0`, '0', T_ent(A)]);
    P('Hacemos la división larga', 'Tomamos cifras del dividendo de izquierda a derecha. En cada vuelta vemos cuántas veces entra el divisor, restamos y bajamos la cifra siguiente.', [], tabla(['Tomamos', 'Cuántas veces entra', 'Multiplicamos', 'Resto'], filas));
  } else {
    P('Aplicamos la regla de los signos', 'Dividimos los valores absolutos y después ponemos el signo: signos iguales dan +, signos distintos dan −. El resto lo dejamos siempre positivo.', `${L_ent(absB(A))}:${L_ent(absB(B))}`);
  }
  P('Cociente y resto', r === 0n ? 'El resto es 0: la división es exacta.' : 'El resto no es 0: la división no es exacta. El resultado exacto se puede escribir como fracción.', [`\\text{cociente}=${L_ent(q)},\\quad\\text{resto}=${L_ent(r)}`, ...(r === 0n ? [] : [`${L_ent(A)}:${L_vp(V(new Q(B)))}=${L_frac(new Q(A, B))}${L_decQ(new Q(A, B)) ? '=' + L_decQ(new Q(A, B)) : ''}`])]);
  P('Verificamos', 'Se tiene que cumplir: dividendo = divisor × cociente + resto, con el resto menor que el divisor.', `${L_vp(V(new Q(B)))}\\cdot ${L_vp(V(new Q(q)))}+${L_ent(r)}=${L_ent(B * q + r)}=${L_ent(A)}\\;\\checkmark`);
  return { tema: 'enteros', metodo: 'División entera (algoritmo de la división)', pasos, resultado: r === 0n ? L_ent(q) : `${L_ent(A)}=${L_vp(V(new Q(B)))}\\cdot ${L_vp(V(new Q(q)))}+${L_ent(r)}` };
}

function simplificarRadical(n, k) {
  if (n < 0n && k % 2 === 0) throw new Error('No existe la raíz de índice par de un número negativo (en los reales).');
  const neg = n < 0n, N = absB(n), f = factoresPrimos(N);
  const { pasos, P } = crearPasos(), R = k === 2 ? '\\sqrt' : `\\sqrt[${k}]`;
  const prod = m => [...m.entries()].map(([p, e]) => e > 1 ? `${L_ent(p)}^{${e}}` : L_ent(p)).join('\\cdot ') || '1';
  P('Escribimos la raíz', 'La raíz no es exacta, pero la podemos simplificar: sacamos afuera los factores que se puedan.', `${R}{${L_ent(n)}}`);
  P('Descomponemos el radicando en factores primos', 'Dividimos por los primos 2, 3, 5, 7… hasta llegar a 1.', `${L_ent(N)}=${prod(f)}`);
  let afuera = 1n, adentro = 1n; const sep = [];
  for (const [p, e] of f) {
    const s = Math.floor(e / k), r = e % k; afuera *= p ** BigInt(s); adentro *= p ** BigInt(r);
    if (s) sep.push(`${L_ent(p)}^{${k}${s > 1 ? '\\cdot ' + s : ''}}` + (r ? `\\cdot ${L_ent(p)}${r > 1 ? '^{' + r + '}' : ''}` : '')); else sep.push(`${L_ent(p)}${e > 1 ? '^{' + e + '}' : ''}`);
  }
  if (afuera === 1n) P('Buscamos factores que se puedan extraer', `Ningún factor aparece ${k} o más veces, así que la raíz ya está simplificada.`, `${R}{${L_ent(n)}}\\approx ${L_x((neg ? -1 : 1) * Math.pow(Number(N), 1 / k))}`);
  else {
    P('Agrupamos los factores', `Cada grupo de ${k} factores iguales sale de la raíz como un solo factor (porque $\\sqrt[n]{a^n} = a$). Lo que no completa un grupo se queda adentro.`, [`${R}{${L_ent(N)}}=${R}{${sep.join('\\cdot ')}}`, `${R}{${L_ent(N)}}=${L_ent(afuera)}${adentro > 1n ? R + '{' + L_ent(adentro) + '}' : ''}`]);
  }
  const res = (neg ? '-' : '') + (afuera > 1n ? L_ent(afuera) : '') + (adentro > 1n ? `${R}{${L_ent(adentro)}}` : (afuera > 1n ? '' : '1'));
  P('Verificamos', 'Volvemos a meter el factor adentro: lo elevamos al índice y lo multiplicamos por lo que quedó en la raíz.', `${L_ent(afuera)}^{${k}}\\cdot ${L_ent(adentro)}=${L_ent(afuera ** BigInt(k) * adentro)}\\;\\checkmark`);
  return { tema: 'potencias', metodo: 'Extracción de factores de la raíz', pasos, resultado: `${R}{${L_ent(n)}}=${res}\\approx ${L_x((neg ? -1 : 1) * Math.pow(Number(N), 1 / k))}` };
}

function aCientifica(q, raw) {
  if (q.cero) throw new Error('El 0 no se escribe en notación científica.');
  const { m, k } = normalizarSci(q); const { pasos, P } = crearPasos();
  P('Escribimos el número', 'En notación científica un número se escribe como $a\\cdot 10^n$, con $1 \\le |a| < 10$ y $n$ entero.', raw ? raw.replace(/[.,]/, '{,}') : L_val(V(q, { dec: true })));
  P('Corremos la coma', k === 0 ? 'El número ya está entre 1 y 10: el exponente es 0.' : `Corremos la coma ${Math.abs(k)} lugar${Math.abs(k) > 1 ? 'es' : ''} hacia la ${k > 0 ? 'izquierda' : 'derecha'} para que quede una sola cifra distinta de cero antes de la coma. ${k > 0 ? 'Como el número es grande, el exponente es positivo' : 'Como el número es menor que 1, el exponente es negativo'}: ${k}.`, `${L_val(V(q, { dec: true }))}=${L_sci(m, k)}`);
  P('Verificamos', `Multiplicar por $10^{${k}}$ es correr la coma ${Math.abs(k)} lugares hacia la ${k >= 0 ? 'derecha' : 'izquierda'}: tiene que volver a dar el número original.`, `${L_sci(m, k)}=${L_val(V(m.mul(QE(10).pow(k)), { dec: true }))}\\;\\checkmark`);
  return { tema: 'cientifica', metodo: 'Notación científica', pasos, resultado: L_sci(m, k) };
}
function expandirCientifica({ m, k }) {
  const q = m.mul(QE(10).pow(k)); const { pasos, P } = crearPasos();
  P('Escribimos el número', 'Está en notación científica: $a\\cdot 10^n$.', L_sci(m, k));
  P('Corremos la coma', `Multiplicar por $10^{${k}}$ es correr la coma ${Math.abs(k)} lugares hacia la ${k >= 0 ? 'derecha' : 'izquierda'}, completando con ceros si hace falta.`, `${L_sci(m, k)}=${L_val(V(q, { dec: true }))}`);
  const s = normalizarSci(q);
  P('Verificamos', 'Volvemos a escribir el resultado en notación científica.', `${L_val(V(q, { dec: true }))}=${L_sci(s.m, s.k)}\\;\\checkmark`);
  return { tema: 'cientifica', metodo: 'De notación científica a notación decimal', pasos, resultado: L_val(V(q, { dec: true })) };
}
function operarCientifica(A, B, mul) {
  const { pasos, P } = crearPasos(), op = mul ? '\\cdot ' : ':';
  P('Escribimos la operación', 'Para operar en notación científica trabajamos por separado con los números de adelante y con las potencias de 10.', `${par(L_sci(A.m, A.k))}${op}${par(L_sci(B.m, B.k))}`);
  const m = mul ? A.m.mul(B.m) : A.m.div(B.m), k = mul ? A.k + B.k : A.k - B.k;
  P(mul ? 'Multiplicamos' : 'Dividimos', mul ? 'Multiplicamos los números de adelante entre sí. Para las potencias de 10 usamos la propiedad: se suman los exponentes.' : 'Dividimos los números de adelante. Para las potencias de 10, se restan los exponentes.',
    [`${par(L_val(V(A.m, { dec: true })) + op + L_vp(V(B.m, { dec: true })))}\\cdot 10^{${A.k}${mul ? '+' : '-'}${B.k < 0 ? par(B.k) : B.k}}=${L_val(V(m, { dec: true }))}\\cdot 10^{${k}}`]);
  const s = normalizarSci(m.mul(QE(10).pow(k)));
  if (s.k !== k) P('Ajustamos la notación', 'El número de adelante tiene que quedar entre 1 y 10: corremos la coma y compensamos en el exponente.', `${L_val(V(m, { dec: true }))}\\cdot 10^{${k}}=${L_sci(s.m, s.k)}`);
  const f = (A.m.num() * 10 ** A.k), g = (B.m.num() * 10 ** B.k), r = mul ? f * g : f / g;
  P('Verificamos', 'Hacemos la cuenta con los números completos y comparamos.', `${L_x(f)}${op}${L_x(g)}\\approx ${L_x(r)}\\;\\checkmark`);
  return { tema: 'cientifica', metodo: 'Operaciones en notación científica', pasos, resultado: L_sci(s.m, s.k) };
}

function tablaPosicional(raw) {
  const [e, d = ''] = raw.replace('-', '').split(/[.,]/);
  const cabE = [...e].map((_, i) => POSICIONES[e.length - 1 - i] || '…'), cabD = [...d].map((_, i) => (LUGARES[i + 1] || '…') + 's');
  return tabla([...cabE, ...cabD].map(c => `<small>${c}</small>`), [[...e, ...d].map((c, i) => i === e.length - 1 && d ? `${c},` : c)], 'posicional');
}
function lecturaDecimal(raw) {
  raw = raw.replace('.', ',');
  const { q } = leerDecimal(raw.replace('-', '')); const [e, d = ''] = raw.replace('-', '').split(',');
  const { pasos, P } = crearPasos();
  P('Ubicamos cada cifra', d ? 'Antes de la coma están los enteros (unidades, decenas, centenas…). Después de la coma: décimos, centésimos, milésimos…' : 'Ubicamos cada cifra en su posición: unidades, decenas, centenas, unidades de mil…', [], tablaPosicional(raw));
  const pal = leerEnPalabras(raw);
  P('Lo leemos', d ? `Leemos la parte entera, decimos “enteros”, y después leemos lo que está después de la coma como un número, nombrando la posición de la última cifra (${LUGARES[d.length]}s).` : 'Leemos el número de a grupos de tres cifras (miles, millones).', `\\text{${pal}}`);
  const terms = [];
  [...e].forEach((c, i) => { if (c !== '0') terms.push(c + (e.length - 1 - i ? `\\cdot ${L_ent(10n ** BigInt(e.length - 1 - i))}` : '')); });
  [...d].forEach((c, i) => { if (c !== '0') terms.push(`\\frac{${c}}{${L_ent(10n ** BigInt(i + 1))}}`); });
  if (d) P('Lo escribimos como fracción decimal', 'Un decimal es una fracción con denominador 10, 100, 1000…, según la cantidad de cifras decimales. Después simplificamos.', `${raw.replace(',', '{,}')}=\\frac{${L_ent(BigInt(e + d))}}{${L_ent(10n ** BigInt(d.length))}}${q.d !== 10n ** BigInt(d.length) ? '=' + L_frac(q) : ''}`);
  P('Verificamos', 'Armamos el número sumando el valor de cada cifra según su posición (descomposición polinómica).', `${terms.join('+') || '0'}=${raw.replace(',', '{,}')}\\;\\checkmark`);
  return { tema: 'decimales', metodo: 'Lectura y valor posicional', pasos, resultado: `\\text{${pal}}` };
}
function escrituraDecimal(texto) {
  let t = plano(texto).replace(/escribi(r|lo)?|escritura|con numeros|el numero|en cifras|:|\?|¿/g, ' ').replace(/\s+/g, ' ').trim();
  const lugar = LUGARES.findIndex((l, i) => i && new RegExp(`\\b${plano(l)}s?\\b`).test(t));
  let ent = 0, dec = null;
  const partes = t.split(/\b(?:enteros?|coma|con)\b/);
  if (partes.length > 1) {
    ent = palabrasAEntero(partes[0].trim().split(' ')); const resto = partes.slice(1).join(' ').replace(new RegExp(`\\b${plano(LUGARES[Math.max(lugar, 0)] || 'x')}s?\\b`), '').trim();
    dec = resto ? palabrasAEntero(resto.split(' ')) : 0;
  } else if (lugar > 0) { dec = palabrasAEntero(t.replace(new RegExp(`\\b${plano(LUGARES[lugar])}s?\\b`), '').trim().split(' ')); }
  else ent = palabrasAEntero(t.split(' '));
  if (ent === null || dec === null && partes.length > 1) throw new Error('No pude entender el número escrito en palabras. Probá, por ejemplo: “escribir tres enteros cuarenta y cinco milésimos”.');
  let nd = lugar > 0 ? lugar : (dec != null ? String(dec).length : 0);
  if (dec != null && String(dec).length > nd) throw new Error(`“${dec}” tiene más cifras de las que entran en los ${LUGARES[nd]}s.`);
  const raw = String(ent) + (dec != null && nd ? ',' + String(dec).padStart(nd, '0') : '');
  const { pasos, P } = crearPasos();
  P('Separamos las partes', 'La palabra “enteros” (o “coma”) separa la parte entera de la decimal. La última palabra nos dice cuántas cifras decimales hay.', [`\\text{parte entera: }${ent}`, ...(dec != null ? [`\\text{parte decimal: }${dec}\\;\\text{${LUGARES[nd] ? LUGARES[nd] + 's' : ''}}\\;\\Rightarrow\\;\\text{${nd} cifra${nd > 1 ? 's' : ''} decimal${nd > 1 ? 'es' : ''}}`] : [])]);
  P('Escribimos el número', nd ? `Completamos con ceros a la izquierda de la parte decimal hasta tener ${nd} cifra${nd > 1 ? 's' : ''}.` : 'Escribimos el número con cifras.', raw.replace(',', '{,}'), tablaPosicional(raw));
  P('Verificamos', 'Leemos el número que escribimos y tiene que coincidir con el enunciado.', `\\text{${leerEnPalabras(raw)}}\\;\\checkmark`);
  return { tema: 'decimales', metodo: 'Escritura de números', pasos, resultado: raw.replace(',', '{,}') };
}
function generatriz(raw) {
  raw = raw.replace('.', ',');
  const m = raw.match(/^(\d+),(\d*)\((\d+)\)$/); const { pasos, P } = crearPasos();
  if (!m) {
    const { q } = leerDecimal(raw); const d = (raw.split(',')[1] || '');
    P('Escribimos el decimal', 'Es un decimal exacto: se escribe como fracción con denominador 10, 100, 1000… según la cantidad de cifras decimales.', raw.replace(',', '{,}'));
    P('Armamos la fracción y simplificamos', '', `${raw.replace(',', '{,}')}=\\frac{${L_ent(BigInt(raw.replace(',', '')))}}{${L_ent(10n ** BigInt(d.length))}}=${L_frac(q)}`);
    P('Verificamos', 'Dividimos numerador por denominador.', `${L_frac(q)}=${L_decQ(q)}\\;\\checkmark`);
    return { tema: 'decimales', metodo: 'Fracción decimal', pasos, resultado: L_frac(q) };
  }
  const [, I, A, Pp] = m, q = leerDecimal(raw).q;
  const L_raw = `${I}{,}${A}\\overline{${Pp}}`;
  P('Identificamos las partes', 'Parte entera, anteperíodo (las cifras decimales que no se repiten) y período (las que se repiten).', [`\\text{entera: }${I},\\quad\\text{anteperíodo: }${A || tx('(no tiene)')},\\quad\\text{período: }${Pp}`]);
  const num = BigInt(I + A + Pp), resta = BigInt(I + A), den = '9'.repeat(Pp.length) + '0'.repeat(A.length);
  P('Armamos la fracción generatriz', `Numerador: el número completo sin coma menos la parte que no se repite. Denominador: un 9 por cada cifra del período${A ? ' y un 0 por cada cifra del anteperíodo' : ''}.`, `${L_raw}=\\frac{${L_ent(num)}-${L_ent(resta)}}{${L_ent(BigInt(den))}}=\\frac{${L_ent(num - resta)}}{${L_ent(BigInt(den))}}${(num - resta) !== q.n || BigInt(den) !== q.d ? '=' + L_frac(q) : ''}`);
  P('Verificamos', 'Dividimos numerador por denominador: tiene que aparecer el mismo período.', `${L_frac(q)}=${L_decQ(q)}\\;\\checkmark`);
  return { tema: 'decimales', metodo: 'Fracción generatriz', pasos, resultado: L_frac(q) };
}
function explicarFraccion(a, b) {
  const q = new Q(a, b), g = mcdB(a, b); const { pasos, P } = crearPasos();
  P('Escribimos la fracción', 'El numerador indica cuántas partes tomamos y el denominador, en cuántas partes iguales se divide el entero.', `\\frac{${L_ent(a)}}{${L_ent(b)}}`);
  if (g > 1n) {
    P('Buscamos el máximo común divisor', 'Para simplificar al máximo, dividimos numerador y denominador por su MCD.', [`${L_ent(absB(a))}=${[...factoresPrimos(absB(a))].map(([p, e]) => e > 1 ? `${p}^{${e}}` : p).join('\\cdot ')},\\quad ${L_ent(b)}=${[...factoresPrimos(b)].map(([p, e]) => e > 1 ? `${p}^{${e}}` : p).join('\\cdot ')}`, `\\text{MCD}=${L_ent(g)}`]);
    P('Simplificamos', 'Dividimos numerador y denominador por el MCD. La fracción que queda es irreducible y equivalente a la original.', `\\frac{${L_ent(a)}:${L_ent(g)}}{${L_ent(b)}:${L_ent(g)}}=${L_frac(q)}`);
  } else P('¿Se puede simplificar?', 'El numerador y el denominador no tienen divisores comunes (además del 1): la fracción ya es irreducible.', `\\text{MCD}(${L_ent(absB(a))},${L_ent(b)})=1`);
  if (absB(q.n) > q.d && !q.entero) {
    const e = q.n / q.d, r = absB(q.n % q.d);
    P('La escribimos como número mixto', 'Como el numerador es mayor que el denominador, la fracción es mayor que 1. Dividimos: el cociente son los enteros y el resto queda como fracción.', [`${L_ent(absB(q.n))}=${L_ent(q.d)}\\cdot ${L_ent(absB(e))}+${L_ent(r)}`, `${L_frac(q)}=${q.n < 0n ? '-' : ''}${L_ent(absB(e))}\\frac{${L_ent(r)}}{${L_ent(q.d)}}`]);
  }
  P('La escribimos como decimal', 'Dividimos el numerador por el denominador. ' + (expansion(q).per ? 'Da un decimal periódico: las cifras con la barra se repiten para siempre.' : 'Da un decimal exacto.'), `${L_frac(q)}=${L_decQ(q) || '\\approx ' + L_x(q.num())}`);
  P('Verificamos', 'Dos fracciones son equivalentes si sus productos cruzados son iguales.', `${L_ent(a)}\\cdot ${L_ent(q.d)}=${L_ent(a * q.d)}\\quad ${L_ent(b)}\\cdot ${L_vp(V(new Q(q.n)))}=${L_ent(b * q.n)}\\;\\checkmark`);
  return { tema: 'racionales', metodo: 'Simplificación por MCD', pasos, resultado: `${L_frac(q)}${L_decQ(q) ? '=' + L_decQ(q) : ''}` };
}
function mixtoAFraccion(ent, f) {
  const r = ent.add(f); const { pasos, P } = crearPasos(); const mix = `${L_ent(ent.n)}\\frac{${L_ent(f.n)}}{${L_ent(f.d)}}`;
  P('Escribimos el número mixto', 'Un número mixto es un entero más una fracción menor que 1.', `${mix}=${L_ent(ent.n)}+\\frac{${L_ent(f.n)}}{${L_ent(f.d)}}`);
  P('Lo pasamos a fracción', 'Multiplicamos el entero por el denominador, le sumamos el numerador y conservamos el denominador.', `${mix}=\\frac{${L_ent(ent.n)}\\cdot ${L_ent(f.d)}+${L_ent(f.n)}}{${L_ent(f.d)}}=${L_frac(r)}`);
  P('Verificamos', 'Dividimos el numerador por el denominador: el cociente tiene que ser el entero y el resto, el numerador.', `${L_ent(r.n)}=${L_ent(r.d)}\\cdot ${L_ent(r.n / r.d)}+${L_ent(r.n % r.d)}\\;\\checkmark`);
  return { tema: 'racionales', metodo: 'Número mixto a fracción', pasos, resultado: `${mix}=${L_frac(r)}${L_decQ(r) ? '=' + L_decQ(r) : ''}` };
}

// Problemas de aplicación con enteros: “La temperatura era −3 °C, subió 8 y bajó 12”.
const SUBE = /(sub|aument|gan|deposit|cobr|recib|sum|avanz|ascend|agreg|ingres|crec|entr)/;
const BAJA = /(baj|disminu|pierd|perd|retir|gast|pag|deb|rest|retroced|descend|sac|egres|sal|cay)/;
function problemaEnteros(texto) {
  const t = plano(texto).replace(/[−–—]/g, '-');
  const re = /([a-zñ]+)?[^\d-]{0,20}?(-?\d+(?:[.,]\d+)?)(\s*(?:°c|grados)?\s*(bajo cero|bajo el nivel del mar|de deuda)?)?/g;
  const movs = []; let m, inicial = null;
  while ((m = re.exec(t))) {
    const antes = t.slice(Math.max(0, m.index - 25), m.index + (m[1] ? m[1].length : 0)), num = leerDecimal(m[2].replace('-', '')).q.mul(m[2].startsWith('-') || m[4] ? QE(-1) : Q1);
    const verbo = (antes.match(/[a-zñ]+(?=[^a-zñ]*$)/) || [''])[0] + ' ' + (m[1] || '');
    if (inicial === null && !SUBE.test(verbo) && !BAJA.test(verbo)) { inicial = num; continue; }
    if (inicial === null) inicial = Q0;
    if (BAJA.test(verbo)) movs.push({ op: '-', q: num.abs() }); else movs.push({ op: '+', q: num.abs() });
  }
  if (inicial === null || !movs.length) throw new Error('No pude identificar el valor inicial y los cambios. Probá algo como: “La temperatura era −3 °C, subió 8 grados y después bajó 12”.');
  const { pasos, P } = crearPasos();
  P('Identificamos los datos', 'Buscamos el valor inicial y cada cambio. Lo que sube, se gana o se deposita suma; lo que baja, se pierde o se retira resta.', [], tabla(['Dato', 'Valor', 'Operación'], [['Inicial', k$(L_val(V(inicial))), ''], ...movs.map((x, i) => [`Cambio ${i + 1}`, k$(L_val(V(x.q))), x.op === '+' ? 'suma' : 'resta'])]));
  const exp = L_val(V(inicial)) + movs.map(x => x.op + L_val(V(x.q))).join('');
  let acc = inicial; const lineas = [];
  for (const x of movs) { const n = x.op === '+' ? acc.add(x.q) : acc.sub(x.q); lineas.push(`${L_val(V(acc))}${x.op}${L_val(V(x.q))}=${L_val(V(n))}`); acc = n; }
  P('Planteamos la cuenta', 'Escribimos todo en una sola expresión con números enteros.', exp);
  P('Resolvemos', 'Vamos haciendo los cambios en orden. Recordá: restar es sumar el opuesto, y si el resultado pasa por debajo del cero queda negativo.', lineas);
  let back = acc; const vuelta = [];
  for (const x of [...movs].reverse()) { const n = x.op === '+' ? back.sub(x.q) : back.add(x.q); vuelta.push(`${L_val(V(back))}${x.op === '+' ? '-' : '+'}${L_val(V(x.q))}=${L_val(V(n))}`); back = n; }
  P('Verificamos', 'Deshacemos los cambios desde el final (cada operación con su opuesta): tenemos que volver al valor inicial.', [...vuelta, `${L_val(V(back))}=${L_val(V(inicial))}\\;\\checkmark`]);
  return { tema: 'enteros', metodo: 'Problema de aplicación con enteros', pasos, resultado: `${tx('Resultado final: ')}${L_val(V(acc))}` };
}

/* -----------------------------------------------------------------------
 * 12. TEORÍA DE NÚMEROS
 * --------------------------------------------------------------------- */
const numerosEn = t => (plano(t).match(/\d+/g) || []).map(x => BigInt(x));
const L_fact = m => [...m.entries()].map(([p, e]) => e > 1 ? `${L_ent(p)}^{${e}}` : L_ent(p)).join('\\cdot ') || '1';
function tablaDivisiones(n) {
  const filas = []; let m = n;
  for (const [p, e] of factoresPrimos(n)) for (let i = 0; i < e; i++) { filas.push([T_ent(m), T_ent(p)]); m /= p; }
  filas.push(['1', '']);
  return `<table class="tabla divisiones">${filas.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
}
function resolverMcdMcm(texto, metodo) {
  const ns = numerosEn(texto).filter(x => x > 0n);
  if (ns.length < 2) throw new Error('Escribí al menos dos números naturales, por ejemplo: mcd(12, 18).');
  if (ns.length > 8) throw new Error('Probá con 8 números como máximo.');
  const euc = metodo === 'euclides' || (!metodo && /euclides/.test(plano(texto)));
  const { pasos, P } = crearPasos(); const lista = ns.map(L_ent).join(',\\;');
  let G, M;
  if (euc) {
    P('Elegimos el método', 'Usamos el algoritmo de Euclides: es muy rápido aunque los números sean grandes. Se basa en que el MCD de dos números es igual al MCD del menor y el resto de dividirlos.', `\\text{MCD}(${lista})`);
    G = ns[0];
    for (let j = 1; j < ns.length; j++) {
      let a = G > ns[j] ? G : ns[j], b = G > ns[j] ? ns[j] : G; const filas = [];
      while (b) { filas.push([T_ent(a), T_ent(b), T_ent(a / b), T_ent(a % b)]); [a, b] = [b, a % b]; }
      P(`Euclides entre ${T_ent(G)} y ${T_ent(ns[j])}`, 'Dividimos el mayor por el menor. Después dividimos el divisor por el resto, y así hasta que el resto dé 0. El último divisor es el MCD.', `\\text{MCD}(${L_ent(G)},${L_ent(ns[j])})=${L_ent(a)}`, tabla(['Dividendo', 'Divisor', 'Cociente', 'Resto'], filas));
      G = a;
    }
    M = ns.reduce((acc, x) => mcmB(acc, x));
    P('Calculamos el MCM', 'Para dos números se cumple MCD · MCM = a · b, así que MCM = a · b / MCD. Con más números lo hacemos de a dos.', ns.length === 2 ? `\\text{MCM}=\\frac{${L_ent(ns[0])}\\cdot ${L_ent(ns[1])}}{${L_ent(G)}}=${L_ent(M)}` : `\\text{MCM}(${lista})=${L_ent(M)}`);
  } else {
    P('Elegimos el método', 'Usamos la descomposición en factores primos: dividimos cada número por los primos 2, 3, 5, 7… hasta llegar a 1.', `${lista}`);
    const fs = ns.map(factoresPrimos);
    P('Descomponemos en factores primos', 'A la derecha de cada línea anotamos el primo por el que dividimos.', ns.map((n, i) => `${L_ent(n)}=${L_fact(fs[i])}`), `<div class="lado">${ns.map(tablaDivisiones).join('')}</div>`);
    const primos = [...new Set(fs.flatMap(f => [...f.keys()]))].sort((a, b) => (a < b ? -1 : 1));
    const g = new Map(), l = new Map();
    for (const p of primos) { const es = fs.map(f => f.get(p) || 0); if (Math.min(...es) > 0) g.set(p, Math.min(...es)); l.set(p, Math.max(...es)); }
    G = [...g].reduce((a, [p, e]) => a * p ** BigInt(e), 1n); M = [...l].reduce((a, [p, e]) => a * p ** BigInt(e), 1n);
    P('Calculamos el MCD', 'El máximo común divisor se arma con los factores primos comunes a todos, cada uno con el menor exponente.' + (g.size ? '' : ' No hay factores comunes: los números son coprimos y el MCD es 1.'), `\\text{MCD}(${lista})=${L_fact(g)}${g.size ? '=' + L_ent(G) : ''}`);
    P('Calculamos el MCM', 'El mínimo común múltiplo se arma con todos los factores primos (comunes y no comunes), cada uno con el mayor exponente.', `\\text{MCM}(${lista})=${L_fact(l)}=${L_ent(M)}`);
  }
  P('Verificamos', 'El MCD tiene que dividir a todos los números y el MCM tiene que ser múltiplo de todos.' + (ns.length === 2 ? ' Además, para dos números, MCD · MCM = a · b.' : ''),
    [ns.map(n => `${L_ent(n)}:${L_ent(G)}=${L_ent(n / G)}`).join(',\\quad '), ns.map(n => `${L_ent(M)}:${L_ent(n)}=${L_ent(M / n)}`).join(',\\quad '), ...(ns.length === 2 ? [`${L_ent(G)}\\cdot ${L_ent(M)}=${L_ent(G * M)}=${L_ent(ns[0])}\\cdot ${L_ent(ns[1])}\\;\\checkmark`] : ['\\checkmark'])]);
  return { tema: 'numeros', metodo: euc ? 'Algoritmo de Euclides' : 'Descomposición en factores primos', pasos, resultado: `\\text{MCD}=${L_ent(G)},\\quad\\text{MCM}=${L_ent(M)}`, alternativas: [{ nombre: euc ? 'Ver con factores primos' : 'Ver con el algoritmo de Euclides', metodo: euc ? 'factores' : 'euclides' }] };
}
function resolverPrimo(texto) {
  const n = numerosEn(texto)[0]; if (n == null || n < 1n) throw new Error('Escribí un número natural, por ejemplo: ¿es primo 91?');
  if (n > 10n ** 15n) throw new Error('El número es demasiado grande para probarlo paso a paso.');
  const { pasos, P } = crearPasos();
  if (n === 1n) { P('Definición', 'Un número primo tiene exactamente dos divisores: el 1 y él mismo. El 1 tiene un solo divisor, así que no es primo ni compuesto.'); return { tema: 'numeros', metodo: 'Definición de número primo', pasos, resultado: tx('1 no es primo ni compuesto') }; }
  const raiz = raizEnteraB(n, 2);
  P('Hasta dónde probar', 'Un número es primo si solo se puede dividir por 1 y por sí mismo. Alcanza con probar los primos hasta su raíz cuadrada: si tuviera un divisor más grande, también tendría uno más chico.', `\\sqrt{${L_ent(n)}}\\approx ${L_x(Math.sqrt(Number(n)))}\\;\\Rightarrow\\;\\text{probamos hasta }${L_ent(raiz)}`);
  const pruebas = []; let div = null;
  for (let p = 2n; p <= raiz; p += (p === 2n ? 1n : 2n)) {
    if (factoresPrimos(p).size !== 1 || factoresPrimos(p).get(p) !== 1) continue;
    const r = n % p; pruebas.push([T_ent(p), r === 0n ? `sí (${T_ent(n)} = ${T_ent(p)} × ${T_ent(n / p)})` : `no (resto ${T_ent(r)})`]);
    if (r === 0n) { div = p; break; }
    if (pruebas.length > 60) { for (let q = p + 2n; q <= raiz; q += 2n) if (n % q === 0n) { div = q; break; } pruebas.push(['…', div ? `sí, con ${T_ent(div)}` : 'ninguno más lo divide']); break; }
  }
  P('Probamos con cada primo', div ? 'Encontramos un divisor distinto de 1 y del número: es compuesto.' : 'Ningún primo hasta la raíz lo divide: es primo.', [], pruebas.length ? tabla(['Primo', '¿Divide?'], pruebas) : '');
  if (div) P('Lo descomponemos', 'Como es compuesto, lo escribimos como producto de factores primos.', `${L_ent(n)}=${L_fact(factoresPrimos(n))}`);
  P('Verificamos', div ? 'Multiplicamos el divisor encontrado por el cociente.' : 'Comprobamos el último primo probado: su cuadrado ya supera al número.', div ? `${L_ent(div)}\\cdot ${L_ent(n / div)}=${L_ent(n)}\\;\\checkmark` : `${L_ent(raiz + 1n)}^{2}=${L_ent((raiz + 1n) ** 2n)}>${L_ent(n)}\\;\\checkmark`);
  return { tema: 'numeros', metodo: 'Divisiones por primos hasta la raíz', pasos, resultado: tx(div ? `${T_ent(n)} es compuesto` : `${T_ent(n)} es primo`) };
}
function resolverCriba(texto) {
  const N = Number(numerosEn(texto)[0] || 100n);
  if (N < 2 || N > 400) throw new Error('Para la criba elegí un número entre 2 y 400.');
  const tachado = Array(N + 1).fill(false), { pasos, P } = crearPasos(), raiz = Math.floor(Math.sqrt(N));
  const grilla = (marca) => `<div class="criba">${Array.from({ length: N - 1 }, (_, i) => i + 2).map(k => `<span class="${tachado[k] ? 'x' : marca && marca(k) ? 'p' : ''}">${k}</span>`).join('')}</div>`;
  P('Escribimos los números', `Anotamos los números del 2 al ${N}. La idea de Eratóstenes: cada vez que encontramos un primo, tachamos todos sus múltiplos, porque no pueden ser primos.`, [], grilla());
  for (let p = 2; p <= raiz; p++) {
    if (tachado[p]) continue;
    const t = []; for (let k = p * p; k <= N; k += p) if (!tachado[k]) { tachado[k] = true; t.push(k); }
    P(`Tachamos los múltiplos de ${p}`, `El ${p} no está tachado, así que es primo. Tachamos sus múltiplos a partir de ${p}² = ${p * p} (los más chicos ya se tacharon antes).` + (t.length ? ` Tachamos ${t.length} números.` : ''), [], grilla(k => k === p));
  }
  const primos = []; for (let k = 2; k <= N; k++) if (!tachado[k]) primos.push(k);
  P('Leemos los primos', `Alcanza con tachar hasta los múltiplos de los primos menores o iguales que √${N} ≈ ${fmtX(Math.sqrt(N), 2)}. Todos los que quedaron sin tachar son primos.`, [], grilla(() => true));
  P('Verificamos', 'Contamos los primos encontrados y comprobamos que ninguno es múltiplo de otro primo anterior.', `\\text{Hay }${primos.length}\\text{ primos menores o iguales que }${N}\\;\\checkmark`);
  return { tema: 'numeros', metodo: 'Criba de Eratóstenes', pasos, resultado: primos.join(',\\;') };
}
function resolverDivisibilidad(texto) {
  const n = numerosEn(texto)[0]; if (n == null) throw new Error('Escribí un número, por ejemplo: divisibilidad de 2340.');
  const s = absB(n).toString(), dig = [...s].map(Number), suma = dig.reduce((a, b) => a + b, 0), ult = c => Number(s.slice(-c)) || 0;
  let alt = 0; [...s].reverse().forEach((d, i) => { alt += (i % 2 ? -1 : 1) * Number(d); });
  const crit = [
    [2, 'termina en cifra par', `última cifra: ${s.slice(-1)}`],
    [3, 'la suma de sus cifras es múltiplo de 3', `${dig.join(' + ')} = ${suma}`],
    [4, 'sus dos últimas cifras forman un múltiplo de 4 (o son 00)', `dos últimas: ${s.slice(-2).padStart(2, '0')}`],
    [5, 'termina en 0 o en 5', `última cifra: ${s.slice(-1)}`],
    [6, 'es divisible por 2 y por 3 a la vez', 'mirá los criterios del 2 y del 3'],
    [8, 'sus tres últimas cifras forman un múltiplo de 8', `tres últimas: ${s.slice(-3).padStart(3, '0')}`],
    [9, 'la suma de sus cifras es múltiplo de 9', `suma de cifras: ${suma}`],
    [10, 'termina en 0', `última cifra: ${s.slice(-1)}`],
    [11, 'la diferencia entre la suma de cifras en lugar impar y en lugar par es múltiplo de 11', `diferencia: ${alt}`],
    [25, 'termina en 00, 25, 50 o 75', `dos últimas: ${String(ult(2)).padStart(2, '0')}`],
    [100, 'termina en 00', `dos últimas: ${String(ult(2)).padStart(2, '0')}`]
  ];
  const { pasos, P } = crearPasos();
  const filas = crit.map(([d, regla, dato]) => [String(d), regla, dato, absB(n) % BigInt(d) === 0n ? '✔ sí' : '✘ no']);
  P('Aplicamos los criterios de divisibilidad', 'Los criterios permiten saber si un número es divisible por otro sin hacer la división, mirando sus cifras.', [], tabla(['Divisor', 'Criterio', 'Miramos', '¿Es divisible?'], filas));
  const si = crit.filter(([d]) => absB(n) % BigInt(d) === 0n).map(c => c[0]);
  P('Verificamos', 'Hacemos las divisiones por los números que cumplen el criterio: el resto tiene que dar 0.', si.length ? si.map(d => `${L_ent(n)}:${d}=${L_ent(n / BigInt(d))}`).join(',\\quad ') + '\\;\\checkmark' : tx('No es divisible por ninguno de estos números.'));
  return { tema: 'numeros', metodo: 'Criterios de divisibilidad', pasos, resultado: si.length ? `${tx('Divisible por: ')}${si.join(',\\;')}` : tx('No es divisible por ninguno de la lista') };
}
function resolverDivisores(texto) {
  const n = numerosEn(texto)[0]; if (!n || n < 1n) throw new Error('Escribí un número natural, por ejemplo: divisores de 36.');
  if (n > 10n ** 12n) throw new Error('El número es demasiado grande.');
  const r = raizEnteraB(n, 2), pares = [];
  for (let d = 1n; d <= r; d++) if (n % d === 0n) pares.push([d, n / d]);
  const divs = [...new Set([...pares.map(p => p[0]), ...pares.map(p => p[1])])].sort((a, b) => (a < b ? -1 : 1));
  const f = factoresPrimos(n), cant = [...f.values()].reduce((a, e) => a * (e + 1), 1);
  const { pasos, P } = crearPasos();
  P('Buscamos los divisores de a pares', `Probamos dividir por 1, 2, 3… hasta la raíz cuadrada (${T_ent(r)}). Cada vez que la división es exacta encontramos dos divisores: el divisor y el cociente.`, [], tabla(['Divisor', 'Cociente (otro divisor)'], pares.map(([a, b]) => [T_ent(a), T_ent(b)])));
  P('Los ordenamos', '', `D(${L_ent(n)})=\\{${divs.map(L_ent).join(',\\;')}\\}`);
  P('Verificamos', 'Con la factorización se puede contar cuántos divisores hay: se suma 1 a cada exponente y se multiplican.', [`${L_ent(n)}=${L_fact(f)}`, `${[...f.values()].map(e => `(${e}+1)`).join('\\cdot ') || '1'}=${cant}\\;\\text{divisores}\\;\\checkmark`]);
  return { tema: 'numeros', metodo: 'Búsqueda de divisores de a pares', pasos, resultado: `D(${L_ent(n)})=\\{${divs.map(L_ent).join(',\\;')}\\}` };
}
function resolverFactorizar(texto) {
  const n = numerosEn(texto)[0]; if (!n || n < 2n) throw new Error('Escribí un número natural mayor que 1, por ejemplo: factorizar 360.');
  const f = factoresPrimos(n); const { pasos, P } = crearPasos();
  P('Dividimos por números primos', 'Dividimos por el menor primo posible (2, 3, 5, 7…) y seguimos con el cociente hasta llegar a 1.', [], tablaDivisiones(n));
  P('Escribimos la factorización', 'Juntamos los factores iguales como potencias.', `${L_ent(n)}=${L_fact(f)}`);
  P('Verificamos', 'Multiplicamos todos los factores.', `${L_fact(f)}=${L_ent(n)}\\;\\checkmark`);
  return { tema: 'numeros', metodo: 'Descomposición en factores primos', pasos, resultado: `${L_ent(n)}=${L_fact(f)}` };
}

/* -----------------------------------------------------------------------
 * 13. SISTEMAS DE NUMERACIÓN
 * --------------------------------------------------------------------- */
const DIG = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NOMBRES_BASE = { binario: 2, binaria: 2, octal: 8, decimal: 10, hexadecimal: 16 };
function aBase10(s, b, P) {
  s = s.toUpperCase(); let tot = 0n; const terms = [], vals = [];
  [...s].forEach((c, i) => {
    const d = DIG.indexOf(c); if (d < 0 || d >= b) throw new Error(`La cifra “${c}” no existe en base ${b}.`);
    const pos = s.length - 1 - i; tot += BigInt(d) * BigInt(b) ** BigInt(pos);
    terms.push(`${d}\\cdot ${b}^{${pos}}`); vals.push(L_ent(BigInt(d) * BigInt(b) ** BigInt(pos)));
  });
  if (P) P(`Pasamos de base ${b} a base 10`, `Cada cifra se multiplica por la base elevada a su posición (contando desde 0 a la derecha)${b === 16 ? '. En base 16, A = 10, B = 11, C = 12, D = 13, E = 14 y F = 15' : ''}. Después sumamos.`, [`${s}_{(${b})}=${terms.join('+')}`, `=${vals.join('+')}=${L_ent(tot)}`]);
  return tot;
}
function desdeBase10(n, b, P) {
  if (n === 0n) { if (P) P(`Pasamos a base ${b}`, 'El 0 se escribe igual en cualquier base.', '0'); return '0'; }
  const filas = []; let m = n, s = '';
  while (m > 0n) { const r = m % BigInt(b); filas.push([T_ent(m), String(b), T_ent(m / BigInt(b)), `${r}${r > 9n ? ' → ' + DIG[Number(r)] : ''}`]); s = DIG[Number(r)] + s; m /= BigInt(b); }
  if (P) P(`Pasamos de base 10 a base ${b}`, 'Dividimos sucesivamente por la base hasta que el cociente sea 0. El resultado se lee con los restos de abajo hacia arriba.', `${L_ent(n)}=${s}_{(${b})}`, tabla(['Número', 'Divisor', 'Cociente', 'Resto'], filas));
  return s;
}
const ROM = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const ROMV = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
function aRomano(n) { let s = ''; for (const [v, r] of ROM) while (n >= v) { s += r; n -= v; } return s; }
function deRomano(s) { let t = 0; for (let i = 0; i < s.length; i++) { const a = ROMV[s[i]], b = ROMV[s[i + 1]] || 0; t += a < b ? -a : a; } return t; }
function resolverNumeracion(texto, metodo) {
  const t = plano(texto).replace(/\s+/g, ' ');
  const { pasos, P } = crearPasos();
  const rom = texto.match(/\b([MDCLXVI]+)\b/);
  if (/romano/.test(t) || (rom && !/\d/.test(texto))) {
    if (rom && !/^\d/.test(rom[1])) {
      const s = rom[1].toUpperCase(); if (aRomano(deRomano(s)) !== s) throw new Error(`“${s}” no es un número romano bien escrito.`);
      const v = deRomano(s), filas = [...s].map((c, i) => { const a = ROMV[c], b = ROMV[s[i + 1]] || 0; return [c, String(a), a < b ? `resta (está antes de ${s[i + 1]}, que vale más)` : 'suma']; });
      P('Leemos cada símbolo', 'I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1000. Si un símbolo está a la izquierda de otro de mayor valor, se resta; si no, se suma.', [], tabla(['Símbolo', 'Valor', 'Se…'], filas));
      P('Sumamos', '', `${s}=${[...s].map((c, i) => (ROMV[c] < (ROMV[s[i + 1]] || 0) ? '-' : (i ? '+' : '')) + ROMV[c]).join('')}=${v}`);
      P('Verificamos', 'Volvemos a escribirlo en romano.', `${v}=\\text{${aRomano(v)}}\\;\\checkmark`);
      return { tema: 'numeracion', metodo: 'Números romanos', pasos, resultado: `\\text{${s}}=${v}` };
    }
    const n = Number(numerosEn(texto)[0]); if (!(n >= 1 && n <= 3999)) throw new Error('Con los símbolos romanos clásicos se escriben números del 1 al 3999.');
    const partes = []; let m = n; const filas = [];
    for (const [v, r] of ROM) { let c = 0; while (m >= v) { m -= v; c++; } if (c) { partes.push(r.repeat(c)); filas.push([String(v * c), r.repeat(c)]); } }
    P('Descomponemos el número', 'Lo separamos en miles, centenas, decenas y unidades, y escribimos cada parte con sus símbolos (4 = IV, 9 = IX, 40 = XL, 90 = XC, 400 = CD, 900 = CM).', [], tabla(['Valor', 'Romano'], filas));
    P('Juntamos', '', `${n}=\\text{${partes.join('')}}`);
    P('Verificamos', 'Leemos el número romano que armamos.', `\\text{${partes.join('')}}=${deRomano(partes.join(''))}\\;\\checkmark`);
    return { tema: 'numeracion', metodo: 'Números romanos', pasos, resultado: `${n}=\\text{${partes.join('')}}` };
  }
  // Número y bases: "1011 de base 2 a base 10", "1011_(2) a base 16", "255 a binario"
  const tl = texto.replace(/_\((\d+)\)/g, ' base $1 ').replace(/[()]/g, ' ');
  const m = tl.match(/([0-9A-Za-z]+)\s*(?:(?:en|de)?\s*(?:base\s*(\d+)|(binario|octal|decimal|hexadecimal)))?\s*(?:a|en|→|->|para)\s*(?:base\s*(\d+)|(binario|octal|decimal|hexadecimal))/i);
  if (!m) throw new Error('Escribilo así: “1011 de base 2 a base 10”, “255 a base 16” o “FF de base 16 a binario”.');
  const num = m[1], de = m[2] ? Number(m[2]) : m[3] ? NOMBRES_BASE[plano(m[3])] : 10, a = m[4] ? Number(m[4]) : NOMBRES_BASE[plano(m[5])];
  if (![de, a].every(b => b >= 2 && b <= 36)) throw new Error('Las bases tienen que estar entre 2 y 36.');
  if (de === a) throw new Error('La base de origen y la de destino son iguales.');
  const potDos = b => ({ 8: 3, 16: 4 })[b];
  const atajo = metodo !== 'base10' && ((de === 2 && potDos(a)) || (a === 2 && potDos(de)));
  let res;
  if (atajo) {
    const g = potDos(de === 2 ? a : de);
    if (de === 2) {
      const s = num.padStart(Math.ceil(num.length / g) * g, '0'); const grupos = s.match(new RegExp(`.{${g}}`, 'g'));
      grupos.forEach(x => { if (/[^01]/.test(x)) throw new Error('En base 2 solo se usan las cifras 0 y 1.'); });
      res = grupos.map(x => DIG[parseInt(x, 2)]).join('').replace(/^0+(?=.)/, '');
      P('Elegimos el método', `Como ${a} = 2${g === 3 ? '³' : '⁴'}, cada cifra en base ${a} corresponde a ${g} cifras binarias. Separamos de a ${g} desde la derecha (completando con ceros a la izquierda).`, [], tabla(grupos, [grupos.map(x => `${parseInt(x, 2)}${parseInt(x, 2) > 9 ? ' = ' + DIG[parseInt(x, 2)] : ''}`)]));
    } else {
      const ds = [...num.toUpperCase()].map(c => { const d = DIG.indexOf(c); if (d < 0 || d >= de) throw new Error(`La cifra “${c}” no existe en base ${de}.`); return d; });
      const grupos = ds.map(d => d.toString(2).padStart(g, '0')); res = grupos.join('').replace(/^0+(?=.)/, '');
      P('Elegimos el método', `Como ${de} = 2${g === 3 ? '³' : '⁴'}, cada cifra se reemplaza por ${g} cifras binarias.`, [], tabla(ds.map((d, i) => num.toUpperCase()[i]), [grupos]));
    }
    P('Juntamos', '', `${num.toUpperCase()}_{(${de})}=${res}_{(${a})}`);
  } else {
    const n10 = de === 10 ? BigInt(num) : aBase10(num, de, P);
    res = a === 10 ? n10.toString() : desdeBase10(n10, a, P);
    if (de !== 10 && a !== 10) P('Juntamos', 'Pasamos primero a base 10 y después a la base pedida.', `${num.toUpperCase()}_{(${de})}=${L_ent(n10)}=${res}_{(${a})}`);
  }
  const vuelta = aBase10(res, a), orig = de === 10 ? BigInt(num) : aBase10(num, de);
  P('Verificamos', `Pasamos el resultado a base 10 y lo comparamos con el número original${de === 10 ? '' : ' (también en base 10)'}.`, `${res}_{(${a})}=${L_ent(vuelta)}${vuelta === orig ? '=' : '\\ne '}${de === 10 ? L_ent(orig) : num.toUpperCase() + '_{(' + de + ')}'}\\;${vuelta === orig ? '\\checkmark' : ''}`);
  return { tema: 'numeracion', metodo: atajo ? 'Agrupación de cifras binarias' : (de !== 10 && a !== 10 ? 'Pasando por base 10' : 'Divisiones sucesivas / suma de potencias'), pasos, resultado: `${num.toUpperCase()}_{(${de})}=${res}_{(${a})}`,
    alternativas: (de === 2 && potDos(a)) || (a === 2 && potDos(de)) ? [{ nombre: atajo ? 'Ver pasando por base 10' : 'Ver agrupando cifras', metodo: atajo ? 'base10' : 'grupos' }] : [] };
}

/* -----------------------------------------------------------------------
 * 14. SISTEMA MÉTRICO DECIMAL Y NÚMEROS DENOMINADOS
 * --------------------------------------------------------------------- */
const ESCALAS = [
  { nombre: 'longitud', u: ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm'], paso: 10 },
  { nombre: 'masa', u: ['kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg'], paso: 10 },
  { nombre: 'capacidad', u: ['kl', 'hl', 'dal', 'l', 'dl', 'cl', 'ml'], paso: 10 },
  { nombre: 'superficie', u: ['km2', 'hm2', 'dam2', 'm2', 'dm2', 'cm2', 'mm2'], paso: 100 },
  { nombre: 'volumen', u: ['km3', 'hm3', 'dam3', 'm3', 'dm3', 'cm3', 'mm3'], paso: 1000 }
];
const ALIAS = { kilometros: 'km', kilometro: 'km', metros: 'm', metro: 'm', centimetros: 'cm', centimetro: 'cm', milimetros: 'mm', milimetro: 'mm', decimetros: 'dm', hectometros: 'hm', decametros: 'dam',
  gramos: 'g', gramo: 'g', kilos: 'kg', kilo: 'kg', kilogramos: 'kg', kilogramo: 'kg', miligramos: 'mg', litros: 'l', litro: 'l', lt: 'l', lts: 'l', mililitros: 'ml', cc: 'cm3',
  ha: 'hm2', hectareas: 'hm2', hectarea: 'hm2', a: 'dam2', areas: 'dam2', ca: 'm2', centiareas: 'm2', t: 'kg*1000', toneladas: 'kg*1000', tonelada: 'kg*1000' };
const EQUIV = { dm3: 'l', cm3: 'ml', m3: 'kl', l: 'dm3', ml: 'cm3', kl: 'm3' };
const uLatex = u => { const m = u.match(/^([a-z]+)([23])?$/); return m ? `\\text{${m[1]}}${m[2] ? '^{' + m[2] + '}' : ''}` : `\\text{${u}}`; };
function normUnidad(s) {
  s = plano(s).replace(/²|\^\(?2\)?/g, '2').replace(/³|\^\(?3\)?/g, '3').replace(/\.$/, '');
  if (ALIAS[s]) return ALIAS[s];
  return s;
}
const escalaDe = u => ESCALAS.find(e => e.u.includes(u));
function resolverMetrico(texto) {
  const t = texto.replace(/[¿?]/g, ' ').replace(/(pasar|convertir|expresar|cuantos?|cuantas?|cuánt[oa]s?|equivale[n]?)/gi, ' ');
  const m = t.match(/(-?\d+(?:[.,]\d+)?)\s*([a-zA-Záéíóú]+(?:\^?\(?[23]\)?|[²³])?)\s*(?:a|en|→|->|=|son)\s*([a-zA-Záéíóú]+(?:\^?\(?[23]\)?|[²³])?)/);
  if (!m) throw new Error('Escribilo así: “3,5 km a m”, “2500 g a kg” o “1,2 ha a m2”.');
  let q = leerDecimal(m[1].replace('-', '')).q; let de = normUnidad(m[2]); const a = normUnidad(m[3]);
  const { pasos, P } = crearPasos(); const vL = x => L_val(V(x, { dec: true }));
  const origL = `${vL(q)}\\,${uLatex(de === 'kg*1000' ? 't' : de)}`;
  if (de === 'kg*1000') { const q2 = q.mul(QE(1000)); P('Pasamos de toneladas a kilos', 'Una tonelada son 1000 kg.', `${vL(q)}\\,\\text{t}=${vL(q)}\\cdot 1000\\,\\text{kg}=${vL(q2)}\\,\\text{kg}`); q = q2; de = 'kg'; }
  let destino = a === 'kg*1000' ? 'kg' : a;
  let E1 = escalaDe(de), E2 = escalaDe(destino);
  if (!E1 || !E2) throw new Error(`No conozco la unidad “${!E1 ? m[2] : m[3]}”. Uso km, hm, dam, m, dm, cm, mm; kg, g, mg; l, ml; m2, ha; m3, cm3, t.`);
  if (E1 !== E2) {
    const eq = EQUIV[de] && escalaDe(EQUIV[de]) === E2 ? EQUIV[de] : null;
    if (!eq) throw new Error(`No se puede pasar de ${E1.nombre} a ${E2.nombre}: miden cosas distintas.`);
    P('Usamos la equivalencia entre volumen y capacidad', '1 dm³ = 1 litro, 1 cm³ = 1 ml y 1 m³ = 1 kl (1000 litros).', `${vL(q)}\\,${uLatex(de)}=${vL(q)}\\,${uLatex(eq)}`);
    de = eq; E1 = E2;
  }
  const i = E1.u.indexOf(de), j = E1.u.indexOf(destino), n = j - i, f = QE(E1.paso).pow(Math.abs(n)), r = n >= 0 ? q.mul(f) : q.div(f);
  const lug = Math.abs(n) * Math.log10(E1.paso);
  P('Ubicamos las unidades en la escalera', `En ${E1.nombre}, cada unidad es ${E1.paso} veces la siguiente más chica. Contamos cuántos escalones hay de ${de.replace(/2$/, '²').replace(/3$/, '³')} a ${destino.replace(/2$/, '²').replace(/3$/, '³')}: ${Math.abs(n)}.`, E1.u.map((u, k) => (k === i || k === j ? `\\boldsymbol{${uLatex(u)}}` : uLatex(u))).join('\\;\\to\\;'));
  P(n >= 0 ? 'Multiplicamos' : 'Dividimos', n === 0 ? 'Es la misma unidad.' : `${n > 0 ? 'Bajamos' : 'Subimos'} ${Math.abs(n)} escalón${Math.abs(n) > 1 ? 'es' : ''} hacia una unidad más ${n > 0 ? 'chica, así que multiplicamos' : 'grande, así que dividimos'} por ${T_ent(f.n)}: es correr la coma ${lug} lugar${lug > 1 ? 'es' : ''} hacia la ${n > 0 ? 'derecha' : 'izquierda'}.`, `${vL(q)}\\,${uLatex(de)}${n >= 0 ? '\\cdot ' : ':'}${L_ent(f.n)}=${vL(r)}\\,${uLatex(destino)}`);
  let final = r, finalU = destino;
  if (a === 'kg*1000') { final = r.div(QE(1000)); finalU = 't'; P('Pasamos a toneladas', 'Dividimos por 1000.', `${vL(r)}\\,\\text{kg}=${vL(final)}\\,\\text{t}`); }
  const back = n >= 0 ? r.div(f) : r.mul(f);
  P('Verificamos', 'Hacemos la conversión al revés: tiene que volver a dar la cantidad original.', `${vL(r)}\\,${uLatex(destino)}${n >= 0 ? ':' : '\\cdot '}${L_ent(f.n)}=${vL(back)}\\,${uLatex(de)}\\;\\checkmark`);
  return { tema: 'metrico', metodo: 'Escalera de unidades', pasos, resultado: `${origL}=${vL(final)}\\,${uLatex(finalU)}` };
}
// Números denominados (tiempo y ángulos): base 60.
const UNID_T = [{ k: 'h', n: 3600, re: /^(h|hs|hora|horas)$/ }, { k: 'min', n: 60, re: /^(min|mins|minuto|minutos|')$/ }, { k: 's', n: 1, re: /^(s|seg|segundo|segundos|")$/ }];
const UNID_A = [{ k: '°', n: 3600 }, { k: "'", n: 60 }, { k: '"', n: 1 }];
function leerDenominado(s) {
  s = s.replace(/′/g, "'").replace(/″/g, '"').replace(/º/g, '°');
  const ang = /°/.test(s); const re = /(\d+(?:[.,]\d+)?)\s*(°|'|"|[a-záéíóú]+)/gi; let m, tot = Q0, alguna = false;
  while ((m = re.exec(s))) {
    const u = plano(m[2]); const val = leerDecimal(m[1]).q;
    const un = ang ? UNID_A.find(x => x.k === u) : UNID_T.find(x => x.re.test(u)) || (u === 'dia' || u === 'dias' ? { n: 86400 } : null);
    if (!un) continue; tot = tot.add(val.mul(QE(un.n))); alguna = true;
  }
  return alguna ? { tot, ang } : null;
}
function descomponer(tot, ang) {                    // segundos → [h, min, s]
  const u = ang ? UNID_A : UNID_T; let r = tot; const out = [];
  for (const x of u) { if (x.n === 1) { out.push([r, x.k]); break; } const c = new Q(r.n / r.d / BigInt(x.n)); out.push([c, x.k]); r = r.sub(c.mul(QE(x.n))); }
  return out;
}
const L_den = (partes, ang) => partes.filter(([v], i) => !v.cero || i === partes.length - 1 && partes.every(p => p[0].cero)).map(([v, k]) => `${L_val(V(v, { dec: true }))}${ang ? (k === '°' ? '^{\\circ}' : k === "'" ? "'" : "''") : '\\,\\text{' + k + '}'}`).join('\\;');
function resolverDenominado(texto) {
  const t = texto.replace(/[¿?]/g, '');
  const [izq, der] = t.split(/\s(?:a|en|→|->)\s(?=[\sa-záéíóú°'",y]*$)/i);
  const trozos = izq.split(/(?=[+−-]\s*\d)/).map(x => x.trim()).filter(Boolean);
  const datos = trozos.map(x => ({ op: x.startsWith('-') || x.startsWith('−') ? '-' : '+', d: leerDenominado(x.replace(/^[+−-]\s*/, '')) }));
  if (datos.some(d => !d.d)) throw new Error('Escribilo así: “2 h 45 min + 1 h 30 min”, “8000 s a h min s” o “35° 40\' + 20° 30\'”.');
  const ang = datos[0].d.ang, { pasos, P } = crearPasos(), U = ang ? UNID_A : UNID_T;
  const tot = datos.reduce((a, x) => (x.op === '-' ? a.sub(x.d.tot) : a.add(x.d.tot)), Q0);
  if (tot.signo < 0) throw new Error('El resultado da negativo: revisá el orden de la resta.');
  P('Escribimos los datos', ang ? 'Los ángulos se miden en grados, minutos y segundos: 1° = 60\' y 1\' = 60".' : 'El tiempo se mide en sistema sexagesimal: 1 h = 60 min y 1 min = 60 s.', datos.map(x => (x.op === '-' ? '-\\;' : '') + L_den(descomponer(x.d.tot, ang), ang)).join('\\;'));
  if (datos.length > 1) {
    const cols = U.map((u, k) => datos.reduce((a, x) => (x.op === '-' ? a.sub(descomponer(x.d.tot, ang)[k][0]) : a.add(descomponer(x.d.tot, ang)[k][0])), Q0));
    P(datos.some(x => x.op === '-') ? 'Operamos unidad por unidad' : 'Sumamos unidad por unidad', 'Sumamos (o restamos) por separado las horas, los minutos y los segundos.' + (datos.some(x => x.op === '-') ? ' Si en una columna no alcanza para restar, pedimos prestado 1 de la unidad mayor (que son 60 de la menor).' : ''), cols.map((c, k) => `${L_val(V(c, { dec: true }))}${ang ? '' : '\\,'}${ang ? { '°': '^{\\circ}', "'": "'", '"': "''" }[U[k].k] || U[k].k.replace('"', "''") : '\\text{' + U[k].k + '}'}`).join('\\quad'));
  }
  const partes = descomponer(tot, ang);
  P('Acomodamos', 'Cada 60 segundos forman 1 minuto, y cada 60 minutos, 1 hora (o 1 grado): pasamos lo que sobra a la unidad mayor.', L_den(partes, ang));
  let res = L_den(partes, ang);
  if (der) {
    const objetivo = [...der.matchAll(/(°|'|"|h|hs|horas?|min|minutos?|s|seg|segundos?)/gi)].map(x => plano(x[1]));
    const unicos = ang ? objetivo : objetivo.map(o => UNID_T.find(u => u.re.test(o))?.k).filter(Boolean);
    if (unicos.length === 1) {
      const un = (ang ? UNID_A : UNID_T).find(u => u.k === unicos[0]), val = tot.div(QE(un.n));
      P(`Expresamos todo en ${unicos[0]}`, `Pasamos cada parte a ${unicos[0]}: ${ang ? '1° = 3600" y 1\' = 60"' : '1 h = 3600 s y 1 min = 60 s'}, y dividimos por lo que vale una unidad de destino.`, `${L_den(partes, ang)}=${L_val(V(val, { dec: true }))}${ang ? ({ '°': '^{\\circ}' }[unicos[0]] || unicos[0].replace('"', "''")) : '\\,\\text{' + unicos[0] + '}'}`);
      res = `${L_val(V(val, { dec: true }))}${ang ? ({ '°': '^{\\circ}' }[unicos[0]] || unicos[0].replace('"', "''")) : '\\,\\text{' + unicos[0] + '}'}`;
    }
  }
  P('Verificamos', 'Pasamos todo a la unidad más chica y comparamos con la cuenta original.', `${L_den(partes, ang)}=${L_val(V(tot, { dec: true }))}${ang ? "''" : '\\,\\text{s}'}\\;\\checkmark`);
  return { tema: 'metrico', metodo: 'Números denominados (sistema sexagesimal)', pasos, resultado: res };
}

/* -----------------------------------------------------------------------
 * 15. RAZONES Y PROPORCIONES
 * --------------------------------------------------------------------- */
function leerTermino(s) { s = s.trim(); if (/^x$/i.test(s)) return null; return valorDeTexto(s).q || (() => { throw new Error(`“${s}” no es un número exacto.`); })(); }
function resolverProporcion(texto) {
  const t = texto.replace(/es a/gi, ':').replace(/como/gi, '=').replace(/[¿?]/g, '');
  const [i, d] = t.split('='); if (!d) throw new Error('Escribí la proporción así: 3/4 = x/12 o 3 : 4 = x : 12.');
  const sep = s => { const p = s.split(/[:/]/); if (p.length !== 2) throw new Error('Cada lado de la proporción tiene que ser una razón a/b o a : b.'); return p; };
  const [a, b] = sep(i), [c, e] = sep(d), T = [a, b, c, e].map(leerTermino);
  const k = T.findIndex(v => v === null); if (k < 0 || T.filter(v => v === null).length > 1) throw new Error('La proporción tiene que tener una sola incógnita x.');
  const { pasos, P } = crearPasos(), Ls = T.map(v => (v ? L_val(V(v, { dec: true })) : 'x'));
  P('Escribimos la proporción', 'Una proporción es una igualdad entre dos razones. Los extremos son el primero y el último término; los medios, los del medio.', `\\frac{${Ls[0]}}{${Ls[1]}}=\\frac{${Ls[2]}}{${Ls[3]}}`);
  P('Aplicamos la propiedad fundamental', 'En toda proporción, el producto de los extremos es igual al producto de los medios.', `${Ls[0]}\\cdot ${Ls[3]}=${Ls[1]}\\cdot ${Ls[2]}`);
  const ext = k === 0 || k === 3, conocidoMismo = ext ? T[k === 0 ? 3 : 0] : T[k === 1 ? 2 : 1], otros = ext ? [T[1], T[2]] : [T[0], T[3]];
  if (conocidoMismo.cero) throw new Error('No se puede despejar: quedaría dividir por cero.');
  const x = otros[0].mul(otros[1]).div(conocidoMismo);
  P('Despejamos x', 'El número que multiplica a x pasa dividiendo al otro miembro.', `x=\\frac{${L_val(V(otros[0], { dec: true }))}\\cdot ${L_vp(V(otros[1], { dec: true }))}}{${L_val(V(conocidoMismo, { dec: true }))}}=${L_val(V(x, { dec: true }))}`);
  const TT = T.map(v => v || x), Lt = TT.map(v => L_val(V(v, { dec: true })));
  P('Verificamos', 'Reemplazamos x y comprobamos que los productos cruzados son iguales.', `${Lt[0]}\\cdot ${Lt[3]}=${L_val(V(TT[0].mul(TT[3]), { dec: true }))}\\qquad ${Lt[1]}\\cdot ${Lt[2]}=${L_val(V(TT[1].mul(TT[2]), { dec: true }))}\\;\\checkmark`);
  return { tema: 'proporciones', metodo: 'Propiedad fundamental de las proporciones', pasos, resultado: `x=${L_val(V(x, { dec: true }))}` };
}
function resolverReglaDeTres(texto, metodo) {
  const t = plano(texto); const inversa = /invers/.test(t);
  const nums = (texto.replace(/[−–]/g, '-').match(/-?\d+(?:[.,]\d+)?|\bx\b/gi) || []);
  if (nums.length !== 4 || nums.filter(n => /x/i.test(n)).length !== 1) throw new Error('Escribilo así: “5 → 20; 8 → x” (agregá “inversa” si la proporcionalidad es inversa).');
  const [a, b, c, d] = nums.map(n => (/x/i.test(n) ? null : leerDecimal(n.replace('-', '')).q));
  if (b === null || a === null) throw new Error('Poné la x en el segundo par: “5 → 20; 8 → x”.');
  const cc = c === null ? d : c, xEnSegunda = d === null;
  if (!xEnSegunda) throw new Error('Poné la x al final: “5 → 20; 8 → x”.');
  const { pasos, P } = crearPasos(), L_ = q => L_val(V(q, { dec: true }));
  P('Armamos la tabla', inversa ? 'Proporcionalidad inversa: si una magnitud aumenta, la otra disminuye en la misma proporción (el producto se mantiene constante).' : 'Proporcionalidad directa: si una magnitud aumenta, la otra aumenta en la misma proporción (el cociente se mantiene constante).', [], tabla(['Magnitud A', 'Magnitud B'], [[k$(L_(a)), k$(L_(b))], [k$(L_(cc)), '$x$']]));
  let x;
  if (metodo === 'unidad') {
    const u = inversa ? b.mul(a) : b.div(a); x = inversa ? u.div(cc) : u.mul(cc);
    P('Reducimos a la unidad', inversa ? `Si con ${fmtX(a.num())} da ${fmtX(b.num())}, con 1 daría ${fmtX(a.num())} veces más.` : `Buscamos cuánto corresponde a 1: dividimos por ${fmtX(a.num())}.`, `\\text{para }1:\\;${inversa ? `${L_(b)}\\cdot ${L_(a)}` : `\\frac{${L_(b)}}{${L_(a)}}`}=${L_(u)}`);
    P('Multiplicamos por la cantidad pedida', '', `x=${inversa ? `\\frac{${L_(u)}}{${L_(cc)}}` : `${L_(u)}\\cdot ${L_(cc)}`}=${L_(x)}`);
  } else {
    x = inversa ? a.mul(b).div(cc) : b.mul(cc).div(a);
    P('Planteamos la regla de tres', inversa ? 'En la inversa se multiplica en línea (los dos datos de la misma fila) y se divide por el que queda.' : 'En la directa se multiplica en cruz y se divide por el que queda.', `x=\\frac{${inversa ? `${L_(a)}\\cdot ${L_(b)}` : `${L_(b)}\\cdot ${L_(cc)}`}}{${inversa ? L_(cc) : L_(a)}}=${L_(x)}`);
  }
  P('Verificamos', inversa ? 'En la inversa, el producto de cada fila tiene que dar lo mismo.' : 'En la directa, el cociente de cada fila tiene que dar lo mismo.', inversa ? `${L_(a)}\\cdot ${L_(b)}=${L_(a.mul(b))}\\qquad ${L_(cc)}\\cdot ${L_(x)}=${L_(cc.mul(x))}\\;\\checkmark` : `\\frac{${L_(b)}}{${L_(a)}}=${L_val(V(b.div(a), { dec: true }))}\\qquad \\frac{${L_(x)}}{${L_(cc)}}=${L_val(V(x.div(cc), { dec: true }))}\\;\\checkmark`);
  return { tema: 'proporciones', metodo: metodo === 'unidad' ? 'Reducción a la unidad' : `Regla de tres simple ${inversa ? 'inversa' : 'directa'}`, pasos, resultado: `x=${L_(x)}`, alternativas: [{ nombre: metodo === 'unidad' ? 'Ver con regla de tres' : 'Ver con reducción a la unidad', metodo: metodo === 'unidad' ? 'regla' : 'unidad' }] };
}
function resolverRazon(texto) {
  const ns = (texto.match(/\d+(?:[.,]\d+)?/g) || []).map(n => leerDecimal(n).q);
  if (ns.length !== 2) throw new Error('Escribilo así: “razón entre 12 y 18”.');
  const r = ns[0].div(ns[1]); const { pasos, P } = crearPasos();
  P('Escribimos la razón', 'La razón entre dos cantidades es el cociente entre ellas: indica cuántas veces una contiene a la otra.', `\\frac{${L_val(V(ns[0], { dec: true }))}}{${L_val(V(ns[1], { dec: true }))}}`);
  P('Simplificamos', 'Dividimos los dos términos por el mismo número hasta que no se pueda más.', `\\frac{${L_val(V(ns[0], { dec: true }))}}{${L_val(V(ns[1], { dec: true }))}}=${L_frac(r)}\\;\\Rightarrow\\;${L_ent(r.n)}:${L_ent(r.d)}`);
  P('Verificamos', 'Multiplicamos en cruz: tiene que dar lo mismo.', `${L_val(V(ns[0], { dec: true }))}\\cdot ${L_ent(r.d)}=${L_val(V(ns[0].mul(new Q(r.d)), { dec: true }))}=${L_val(V(ns[1], { dec: true }))}\\cdot ${L_ent(r.n)}\\;\\checkmark`);
  return { tema: 'proporciones', metodo: 'Razón simplificada', pasos, resultado: `${L_ent(r.n)}:${L_ent(r.d)}` };
}

/* -----------------------------------------------------------------------
 * 16. RAZONAMIENTO ARITMÉTICO (porcentajes, repartos, promedios)
 * --------------------------------------------------------------------- */
const numsQ = t => (t.replace(/[−–]/g, '-').match(/\d+(?:[.,]\d+)?/g) || []).map(n => leerDecimal(n).q);
const Ld = q => L_val(V(q, { dec: true }));
function resolverPorcentaje(texto) {
  const t = plano(texto).replace(/por ciento/g, '%'); const ns = numsQ(t); const { pasos, P } = crearPasos();
  const cien = QE(100);
  if (/que (porcentaje|%)|que tanto por ciento|en porcentaje|que parte/.test(t) && ns.length >= 2) {
    const [A, B] = ns; const r = A.div(B).mul(cien);
    P('Planteamos', 'Para saber qué porcentaje representa una parte del total, dividimos la parte por el total y multiplicamos por 100.', `\\frac{${Ld(A)}}{${Ld(B)}}\\cdot 100`);
    P('Calculamos', '', `\\frac{${Ld(A)}}{${Ld(B)}}\\cdot 100=${Ld(A.div(B))}\\cdot 100=${Ld(r)}\\%`);
    P('Verificamos', 'Calculamos ese porcentaje del total: tiene que dar la parte.', `${Ld(r)}\\%\\text{ de }${Ld(B)}=\\frac{${Ld(r)}}{100}\\cdot ${Ld(B)}=${Ld(r.div(cien).mul(B))}\\;\\checkmark`);
    return { tema: 'razonamiento', metodo: 'Parte sobre total por 100', pasos, resultado: `${Ld(r)}\\%` };
  }
  const pm = t.match(/(\d+(?:[.,]\d+)?)\s*%/); if (!pm) throw new Error('No encontré el porcentaje. Probá: “20% de 350”, “350 con un descuento del 15%” o “qué porcentaje es 45 de 180”.');
  const p = leerDecimal(pm[1]).q; const otros = ns.filter((q, i) => !(q.eq(p) && i === ns.findIndex(z => z.eq(p))));
  const N = otros[0]; if (!N) throw new Error('Falta la cantidad sobre la que se calcula el porcentaje.');
  const iva = /iva/.test(t), sube = /aument|recarg|suba|interes|iva|mas/.test(t), baja = /descuent|rebaj|baja|menos|oferta/.test(t);
  if (/total|si el|si .* es|equivale/.test(t) && /cual|cuanto/.test(t) && !sube && !baja) {
    const tot = N.mul(cien).div(p);
    P('Planteamos', `Si el ${fmtX(p.num())}% equivale a ${fmtX(N.num())}, buscamos el 100% con una regla de tres directa.`, `${Ld(p)}\\%\\to ${Ld(N)}\\qquad 100\\%\\to x`);
    P('Calculamos', '', `x=\\frac{${Ld(N)}\\cdot 100}{${Ld(p)}}=${Ld(tot)}`);
    P('Verificamos', '', `${Ld(p)}\\%\\text{ de }${Ld(tot)}=${Ld(tot.mul(p).div(cien))}\\;\\checkmark`);
    return { tema: 'razonamiento', metodo: 'Regla de tres con porcentajes', pasos, resultado: Ld(tot) };
  }
  const parte = N.mul(p).div(cien);
  P('Calculamos el porcentaje', `El ${fmtX(p.num())}% de una cantidad es multiplicarla por ${fmtX(p.num())} y dividir por 100.`, `${Ld(p)}\\%\\text{ de }${Ld(N)}=\\frac{${Ld(p)}}{100}\\cdot ${Ld(N)}=${Ld(parte)}`);
  if (sube || baja) {
    const fin = sube ? N.add(parte) : N.sub(parte), fac = sube ? cien.add(p).div(cien) : cien.sub(p).div(cien);
    P(sube ? (iva ? 'Sumamos el IVA' : 'Sumamos el aumento') : 'Restamos el descuento', `También se puede hacer en un solo paso: multiplicar por ${Ld(fac)} (${sube ? '100% + ' : '100% − '}${fmtX(p.num())}%).`, [`${Ld(N)}${sube ? '+' : '-'}${Ld(parte)}=${Ld(fin)}`, `${Ld(N)}\\cdot ${Ld(fac)}=${Ld(fin)}`]);
    P('Verificamos', 'Las dos formas de calcular dan lo mismo.', `${Ld(N.mul(fac))}=${Ld(fin)}\\;\\checkmark`);
    return { tema: 'razonamiento', metodo: sube ? 'Aumento porcentual' : 'Descuento porcentual', pasos, resultado: Ld(fin) };
  }
  P('Verificamos', 'Comprobamos con la regla de tres: si 100% es el total, el porcentaje pedido corresponde a la parte.', `\\frac{${Ld(parte)}}{${Ld(N)}}\\cdot 100=${Ld(parte.div(N).mul(cien))}\\%\\;\\checkmark`);
  return { tema: 'razonamiento', metodo: 'Cálculo de porcentaje', pasos, resultado: Ld(parte) };
}
function resolverReparto(texto) {
  const t = plano(texto); const inversa = /invers/.test(t); const ns = numsQ(t);
  if (ns.length < 3) throw new Error('Escribilo así: “repartir 1200 en partes proporcionales a 2, 3 y 5” (o “inversamente proporcionales”).');
  const [tot, ...ks] = ns; const { pasos, P } = crearPasos();
  const pesos = inversa ? ks.map(k => k.inv()) : ks, suma = pesos.reduce((a, b) => a.add(b), Q0), cte = tot.div(suma), partes = pesos.map(p => p.mul(cte));
  P('Planteamos el reparto', inversa ? 'En el reparto inversamente proporcional, a mayor número le toca menos: repartimos en forma directa a los inversos de los números.' : 'En el reparto directamente proporcional, a mayor número le toca más. Primero sumamos las partes.', inversa ? pesos.map((p, i) => `\\frac{1}{${Ld(ks[i])}}`).join('+') + '=' + L_frac(suma) : ks.map(Ld).join('+') + '=' + Ld(suma));
  P('Calculamos la constante', 'Dividimos el total por la suma: es lo que le corresponde a cada “parte”.', `k=\\frac{${Ld(tot)}}{${L_frac(suma)}}=${Ld(cte)}`);
  P('Calculamos cada parte', 'Multiplicamos la constante por cada número' + (inversa ? ' inverso.' : '.'), partes.map((p, i) => `${inversa ? `\\frac{1}{${Ld(ks[i])}}` : Ld(ks[i])}\\cdot ${Ld(cte)}=${Ld(p)}`));
  P('Verificamos', 'Las partes sumadas tienen que dar el total.', `${partes.map(Ld).join('+')}=${Ld(partes.reduce((a, b) => a.add(b), Q0))}\\;\\checkmark`);
  return { tema: 'razonamiento', metodo: `Reparto ${inversa ? 'inversamente' : 'directamente'} proporcional`, pasos, resultado: partes.map(Ld).join(',\\;') };
}
function resolverPromedio(texto) {
  const t = texto.replace(/promedio|media|de|los|numeros|números|:/gi, ' ');
  const ns = (t.includes(';') ? t.split(';') : t.split(/\s+|,\s+/)).map(s => s.trim()).filter(s => /^\d+(?:[.,]\d+)?$/.test(s)).map(s => leerDecimal(s).q);
  if (ns.length < 2) throw new Error('Escribilo así: “promedio de 7; 8,5; 9” (separá con punto y coma si hay decimales).');
  const s = ns.reduce((a, b) => a.add(b), Q0), m = s.div(QE(ns.length)); const { pasos, P } = crearPasos();
  P('Sumamos los datos', 'El promedio (media aritmética) es la suma de todos los datos dividida la cantidad de datos.', `${ns.map(Ld).join('+')}=${Ld(s)}`);
  P('Dividimos por la cantidad', `Hay ${ns.length} datos.`, `\\frac{${Ld(s)}}{${ns.length}}=${L_decQ(m) && expansion(m).per.length <= 6 ? L_decQ(m) : '\\approx ' + L_x(m.num())}`);
  P('Verificamos', 'Si todos los datos valieran lo mismo que el promedio, la suma sería la misma.', `${ns.length}\\cdot ${L_decQ(m) && expansion(m).per.length <= 6 ? L_decQ(m) : L_frac(m)}=${Ld(m.mul(QE(ns.length)))}\\;\\checkmark`);
  return { tema: 'razonamiento', metodo: 'Media aritmética', pasos, resultado: L_decQ(m) && expansion(m).per.length <= 6 ? L_decQ(m) : '\\approx ' + L_x(m.num()) };
}

/* -----------------------------------------------------------------------
 * 17. DETECCIÓN DEL TEMA
 * Se prueban los detectores en orden; el primero que coincide resuelve.
 * Para sumar un tema nuevo: agregá un objeto { tema, test, fn } acá.
 * --------------------------------------------------------------------- */
const TEMAS = {
  reales: 'Números reales', enteros: 'Números enteros', numeros: 'Teoría de números', racionales: 'Números racionales',
  decimales: 'Números decimales', potencias: 'Potenciación y radicación', cientifica: 'Notación científica y logaritmos',
  proporciones: 'Razones y proporciones', numeracion: 'Sistemas de numeración', metrico: 'Sistema métrico y denominados', razonamiento: 'Razonamiento aritmético'
};
const listaDe = t => t.replace(/^(ordenar|ordena|comparar|compara|de menor a mayor|de mayor a menor)\s*:?\s*/i, '').split(/;|\s+y\s+|\s+con\s+/).map(s => s.trim()).filter(Boolean);
const DETECTORES = [
  { tema: 'numeros', test: t => /criba|eratostenes|primos (hasta|menores|del)/.test(t), fn: resolverCriba },
  { tema: 'numeros', test: t => /\bmcd\b|\bmcm\b|maximo comun|minimo comun|euclides/.test(t), fn: resolverMcdMcm },
  { tema: 'numeros', test: t => /primo/.test(t), fn: resolverPrimo },
  { tema: 'numeros', test: t => /divisib|criterio/.test(t), fn: resolverDivisibilidad },
  { tema: 'numeros', test: t => /divisores/.test(t), fn: resolverDivisores },
  { tema: 'numeros', test: t => /factoriz|descompon|factores primos/.test(t), fn: resolverFactorizar },
  { tema: 'numeracion', test: (t, o) => (/\bbase\b|binari|octal|hexadecimal|romano|_\(\d+\)/.test(t) && !/\blog/.test(t)) || /^[MDCLXVI]+$/.test(o.trim()), fn: resolverNumeracion },
  { tema: 'metrico', test: (t, o) => (/\d\s*(h|hs|min|horas?|minutos?|s|seg|segundos?)\b.*(\+|-|\ba\b|\ben\b)/.test(t) && !/\d\s*(km|m|cm|mm|kg|g|l)\b/.test(t)) || (/\d\s*°(?!\s*c)/.test(t) && !/[a-z]{4,}/.test(t)), fn: resolverDenominado },
  { tema: 'metrico', test: t => /\d\s*(km|hm|dam|m|dm|cm|mm|kg|hg|dag|g|dg|cg|mg|t|kl|hl|dal|l|lts?|dl|cl|ml|ha|cc|toneladas?|litros?|metros?|kilos?|gramos?|kilometros?|centimetros?)(2|3|²|³|\^\(?[23]\)?)?\s+(a|en|→|->)\s/.test(t), fn: resolverMetrico },
  { tema: 'cientifica', test: t => /cientific|notacion/.test(t), fn: (o, m, f) => { const n = o.replace(/^.*?(?=-?\d)/s, '').trim(); const r = resolverExpresion(n, 'cientifica'); return r; } },
  { tema: 'decimales', test: t => /generatriz/.test(t), fn: o => generatriz(o.replace(/^[^\d]*/, '').trim()) },
  { tema: 'decimales', test: t => /\b(lee|leer|lectura|se lee)\b/.test(t), fn: o => lecturaDecimal((o.match(/-?\d+(?:[.,]\d+)?/) || [''])[0] || (() => { throw new Error('Escribí el número que querés leer, por ejemplo: leer 3,045.'); })()) },
  { tema: 'decimales', test: t => /escrib|escritura|enteros? .*(decimo|centesimo|milesimo)|(decimos|centesimos|milesimos)$/.test(t) && !/\d/.test(t), fn: escrituraDecimal },
  { tema: 'razonamiento', test: t => /repart/.test(t), fn: resolverReparto },
  { tema: 'razonamiento', test: t => /promedio|\bmedia\b/.test(t), fn: resolverPromedio },
  { tema: 'razonamiento', test: t => (/%/.test(t) && /[a-z]{3,}/.test(t)) || /%\s*de\b|porcentaje|por ciento|descuento|aumento|recargo|\biva\b|rebaja|interes/.test(t), fn: resolverPorcentaje },
  { tema: 'proporciones', test: t => /regla de tres|→|->|directa|inversa/.test(t), fn: resolverReglaDeTres },
  { tema: 'proporciones', test: t => /razon/.test(t), fn: resolverRazon },
  { tema: 'proporciones', test: t => /\bx\b/.test(t) && /=|como/.test(t), fn: resolverProporcion },
  { tema: 'reales', test: t => /clasific|que tipo de numero|a que conjunto/.test(t), fn: o => clasificar(o.replace(/^.*?(clasific\w*|numero|conjunto)\s*:?\s*/i, '')) },
  { tema: 'reales', test: t => /ordenar|ordena|comparar|compara|mayor a menor|menor a mayor/.test(t) || (/;/.test(t) && !/[a-z]{3,}/.test(t)), fn: o => ordenar(listaDe(o)) },
  { tema: 'enteros', test: t => /[a-z]{4,}/.test(t) && (SUBE.test(t) || BAJA.test(t)) && /\d/.test(t), fn: problemaEnteros },
  { tema: '*', test: () => true, fn: (o, m, f) => {
      try { return resolverExpresion(o, f); }
      catch (e) {                                   // si hay palabras que no entendimos, damos una guía
        if (/[a-záéíóúñ]{2,}/i.test(o.replace(/\b(log|ln|pi|raiz|sqrt|e)\b/gi, ''))) throw new Error('No reconocí el ejercicio. Probá con una operación (3 + 2·5) o con consignas como “mcd(12, 18)”, “¿es primo 91?”, “3,5 km a m”, “20% de 350” o “255 a base 16”.');
        throw e;
      } } }
];
/* Punto de entrada: recibe el texto (ya convertido desde LaTeX si hace falta),
 * opcionalmente un tema forzado y un método alternativo. */
function resolver(texto, temaForzado, metodo) {
  const original = texto.trim();
  if (!original) throw new Error('Escribí un ejercicio.');
  const t = plano(original);
  for (const d of DETECTORES) {
    if (temaForzado && d.tema !== temaForzado && d.tema !== '*') continue;
    if (!d.test(t, original)) continue;
    const r = d.fn(original, metodo, temaForzado);
    if (temaForzado && r.tema !== temaForzado && d.tema === '*') r.tema = temaForzado;
    return r;
  }
  throw new Error('No reconocí el ejercicio.');
}
function detectarTema(texto) {
  const t = plano(texto.trim()); if (!t) return null;
  for (const d of DETECTORES) if (d.test(t, texto)) {
    if (d.tema !== '*') return d.tema;
    try { const ast = preparar(parsear(lexer(texto))); return temaDe(ast); } catch (e) { return null; }
  }
  return null;
}
/* MOTOR-FIN ============================================================== */

/* =======================================================================
 * TEMA NUEVO · MATEMÁTICA FINANCIERA
 * Interés simple, interés compuesto, valor actual y cuota de un préstamo
 * (sistema francés). Los montos se muestran con dos decimales.
 * ===================================================================== */
// "$ 500.000" o "500000" o "1.250,50" → número
function finNum(s) {
  s = String(s).replace(/\$|\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');      // 1.250.000,50
  else s = s.replace(',', '.');
  return parseFloat(s);
}
const finL = x => { const neg = x < 0, [e, d] = Math.abs(x).toFixed(2).split('.'); return `${neg ? '-' : ''}\\$\\,${e.replace(/\B(?=(\d{3})+(?!\d))/g, '{.}')}{,}${d}`; };
const finT = x => { const [e, d] = Math.abs(x).toFixed(2).split('.'); return `${x < 0 ? '-' : ''}$ ${e.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d}`; };
const FIN_PERIODOS = { dia: 1 / 365, diario: 1 / 365, diaria: 1 / 365, mes: 1 / 12, mensual: 1 / 12, bimestre: 1 / 6, bimestral: 1 / 6, trimestre: 1 / 4, trimestral: 1 / 4, semestre: 1 / 2, semestral: 1 / 2, ano: 1, anual: 1, cuota: 1 / 12 };
function finDatos(texto) {
  const t = plano(texto);
  const cap = t.match(/(?:capital|prestamo|deposito|plazo fijo|invierte|inversion|deuda|credito|monto inicial|ahorro)\D{0,25}?\$?\s*([\d.,]+\d)/) || t.match(/\$\s*([\d.,]+\d)/);
  const tasa = t.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:de interes\s*)?(?:tna|tea)?\s*(anual|mensual|diari[oa]|bimestral|trimestral|semestral)?/);
  const tiempo = t.match(/(\d+(?:[.,]\d+)?)\s*(dias?|meses|mes|bimestres?|trimestres?|semestres?|anos?|cuotas?)\b/);
  const objetivo = t.match(/(?:obtener|tener|juntar|reunir|llegar a|retirar)\D{0,20}?\$?\s*([\d.,]+\d)/);
  return { t, C: cap ? finNum(cap[1]) : null, i: tasa ? finNum(tasa[1]) / 100 : null, perTasa: tasa && tasa[2] ? tasa[2].replace(/a$/, 'o') : 'anual',
    n: tiempo ? finNum(tiempo[1]) : null, perT: tiempo ? tiempo[2].replace(/s$/, '').replace(/^mese$/, 'mes').replace(/^ano$/, 'ano') : null, M: objetivo ? finNum(objetivo[1]) : null };
}
function resolverFinanciera(texto) {
  const { pasos, P } = crearPasos(), d = finDatos(texto), t = d.t;
  if (d.i === null || d.n === null) throw new Error('Escribí la tasa y el tiempo, por ejemplo: “capital $ 100.000 al 5 % mensual durante 6 meses, interés compuesto” o “cuota de un préstamo de $ 500.000 al 4 % mensual en 12 cuotas”.');
  const anTasa = FIN_PERIODOS[d.perTasa] || 1, anT = FIN_PERIODOS[d.perT] || anTasa, n = d.n * anT / anTasa, i = d.i;
  const tipo = /cuota|prestamo|credito|frances|amortiz/.test(t) ? 'cuota' : /valor actual|hoy|depositar para|cuanto (hay que|tengo que|debo) (depositar|invertir)/.test(t) && d.M ? 'actual' : /simple/.test(t) || (/plazo fijo/.test(t) && !/compuesto/.test(t)) ? 'simple' : 'compuesto';   // el plazo fijo usa la TNA (interés simple)
  const perNombre = { anual: 'años', mensual: 'meses', diario: 'días', bimestral: 'bimestres', trimestral: 'trimestres', semestral: 'semestres' }[d.perTasa] || 'períodos';
  P('Anotamos los datos', 'La tasa y el tiempo tienen que estar en la misma unidad. Si no lo están, pasamos el tiempo a la unidad de la tasa.', [
    ...(d.C !== null && tipo !== 'actual' ? [`C=${finL(d.C)}`] : []), ...(tipo === 'actual' ? [`M=${finL(d.M)}`] : []),
    `i=${L_x(+(i * 100).toFixed(6))}\\%\\;\\text{${d.perTasa}}=${L_x(+i.toFixed(6))}`, `n=${L_x(+n.toFixed(6))}\\;\\text{${perNombre}}`]);
  if (tipo === 'simple') {
    if (d.C === null) throw new Error('Falta el capital.');
    const I = d.C * i * n, M = d.C + I;
    P('Calculamos el interés simple', 'En el interés simple, el interés se calcula siempre sobre el capital inicial: no se suman los intereses ganados.', [`I=C\\cdot i\\cdot n=${finL(d.C)}\\cdot ${L_x(+i.toFixed(6))}\\cdot ${L_x(+n.toFixed(6))}=${finL(I)}`]);
    P('Calculamos el monto', 'El monto es lo que se tiene al final: capital más interés.', `M=C+I=${finL(d.C)}+${finL(I)}=${finL(M)}`);
    const filas = []; let acum = d.C; const N = Math.min(Math.ceil(n), 12);
    for (let k = 1; k <= N; k++) { acum += d.C * i * Math.min(1, n - (k - 1)); filas.push([String(k), finT(d.C * i * Math.min(1, n - (k - 1))), finT(acum)]); }
    P('Verificamos', 'Sumamos período por período el interés (siempre sobre el capital inicial): al final tiene que dar el monto.', [`${finL(acum)}=${finL(M)}\\;${Math.abs(acum - M) < 0.01 || n > 12 ? '\\checkmark' : ''}`], tabla(['Período', 'Interés del período', 'Acumulado'], filas));
    return { tema: 'financiera', metodo: 'Interés simple', pasos, resultado: `I=${finL(I)},\\quad M=${finL(M)}` };
  }
  if (tipo === 'compuesto') {
    if (d.C === null) throw new Error('Falta el capital.');
    const M = d.C * Math.pow(1 + i, n), I = M - d.C;
    P('Usamos la fórmula del interés compuesto', 'En el interés compuesto, los intereses de cada período se suman al capital y también generan intereses (“interés sobre interés”).', [`M=C\\,(1+i)^n=${finL(d.C)}\\cdot(1+${L_x(+i.toFixed(6))})^{${L_x(+n.toFixed(6))}}`, `M=${finL(d.C)}\\cdot ${L_x(+Math.pow(1 + i, n).toFixed(6))}=${finL(M)}`]);
    P('Calculamos el interés ganado', 'Es la diferencia entre el monto final y el capital.', `I=M-C=${finL(M)}-${finL(d.C)}=${finL(I)}`);
    const filas = []; let c = d.C; const N = Math.ceil(n);
    for (let k = 1; k <= N; k++) { const f = Math.min(1, n - (k - 1)), int = c * (Math.pow(1 + i, f) - 1); c += int; if (k <= 6 || k > N - 2) filas.push([String(k), finT(int), finT(c)]); else if (k === 7) filas.push(['…', '…', '…']); }
    P('Verificamos', 'Capitalizamos período por período: cada interés se calcula sobre el capital acumulado. Al final tiene que dar el monto.', [`${finL(c)}=${finL(M)}\\;${Math.abs(c - M) < 0.01 ? '\\checkmark' : ''}`, `\\text{con interés simple serían }${finL(d.C * (1 + i * n))}`], tabla(['Período', 'Interés', 'Capital acumulado'], filas));
    return { tema: 'financiera', metodo: 'Interés compuesto', pasos, resultado: `M=${finL(M)},\\quad I=${finL(I)}` };
  }
  if (tipo === 'actual') {
    const C = d.M / Math.pow(1 + i, n);
    P('Despejamos el capital (valor actual)', 'Para saber cuánto hay que depositar hoy, despejamos C de la fórmula del interés compuesto: es “descontar” el monto.', [`C=\\frac{M}{(1+i)^n}=\\frac{${finL(d.M)}}{(1+${L_x(+i.toFixed(6))})^{${L_x(+n.toFixed(6))}}}=${finL(C)}`]);
    P('Verificamos', 'Capitalizamos ese valor durante el mismo tiempo: tiene que volver a dar el monto pedido.', `${finL(C)}\\cdot(1+${L_x(+i.toFixed(6))})^{${L_x(+n.toFixed(6))}}=${finL(C * Math.pow(1 + i, n))}\\;${Math.abs(C * Math.pow(1 + i, n) - d.M) < 0.01 ? '\\checkmark' : ''}`);
    return { tema: 'financiera', metodo: 'Valor actual', pasos, resultado: `C=${finL(C)}` };
  }
  if (d.C === null) throw new Error('Falta el monto del préstamo.');
  const nn = Math.round(n), cuota = i === 0 ? d.C / nn : d.C * i / (1 - Math.pow(1 + i, -nn));
  P('Usamos la fórmula de la cuota (sistema francés)', 'En el sistema francés todas las cuotas son iguales. Cada cuota paga los intereses del saldo y el resto amortiza (reduce) la deuda.', [`c=\\frac{C\\cdot i}{1-(1+i)^{-n}}=\\frac{${finL(d.C)}\\cdot ${L_x(+i.toFixed(6))}}{1-(1+${L_x(+i.toFixed(6))})^{-${nn}}}=${finL(cuota)}`]);
  let saldo = d.C; const filas = [];
  for (let k = 1; k <= nn; k++) { const int = saldo * i, amort = cuota - int; saldo -= amort; if (k <= 4 || k > nn - 2) filas.push([String(k), finT(cuota), finT(int), finT(amort), finT(Math.abs(saldo) < 0.005 ? 0 : saldo)]); else if (k === 5) filas.push(['…', '…', '…', '…', '…']); }
  P('Armamos el cuadro de amortización', 'Interés = saldo × tasa; amortización = cuota − interés; el saldo baja en lo que se amortiza.', [`\\text{total pagado}=${nn}\\cdot ${finL(cuota)}=${finL(cuota * nn)}`, `\\text{intereses totales}=${finL(cuota * nn - d.C)}`], tabla(['Cuota', 'Pago', 'Interés', 'Amortización', 'Saldo'], filas));
  P('Verificamos', 'Con la última cuota el saldo tiene que quedar en cero.', `\\text{saldo final}=${finL(Math.abs(saldo) < 0.005 ? 0 : saldo)}\\;${Math.abs(saldo) < 0.01 ? '\\checkmark' : ''}`);
  return { tema: 'financiera', metodo: 'Sistema francés', pasos, resultado: `\\text{cuota}=${finL(cuota)}` };
}
TEMAS.financiera = 'Matemática financiera';
DETECTORES.unshift({ tema: 'financiera', test: t => /interes (simple|compuesto)|capital|\btasa\b|cuota|prestamo|plazo fijo|amortiz|valor actual|\btna\b|\btea\b|credito|\binteres\b.*%|(deposit|invert|ahorr)\w*\b.*%|%.*(deposit|invert|ahorr)/.test(t), fn: resolverFinanciera });

// Aviso para la interfaz: este motor ya está cargado (se cargan a medida que se eligen las áreas)
(window.MPP_MOTORES = window.MPP_MOTORES || {}).arit = true;
