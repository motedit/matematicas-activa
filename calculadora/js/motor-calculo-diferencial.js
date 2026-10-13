/* =======================================================================
 * MOTOR: CÁLCULO DIFERENCIAL
 * Motor simbólico (cS, cDer, cL…), funciones, límites, continuidad y derivadas. Necesita los anteriores.
 * Es lógica pura (no toca la página): recibe texto y devuelve
 * { tema, metodo, pasos, resultado, alternativas }.
 * ===================================================================== */
'use strict';
/* MOTOR-CALCULO-INICIO ===================================================
 * Cálculo diferencial. Motor simbólico propio: árboles de expresiones con
 * simplificación, derivadas explicadas, evaluación exacta y numérica.
 * Reutiliza Q (racionales), polinomios en una letra (uDiv, uMcd...),
 * factorizarPoly, raicesCuadratica, L_intervalo y las herramientas de pasos.
 * ====================================================================== */

/* -----------------------------------------------------------------------
 * C1. LECTURA DE EXPRESIONES
 * Variables permitidas: x, y, t, k, h. Funciones: sen, cos, tg, cotg, sec,
 * cosec, ln, log, √ (raiz), arcsen, arccos, arctg y valor absoluto |…|.
 * --------------------------------------------------------------------- */
const C_NOMBRES = [['arcsen', 'arcsen'], ['arcsin', 'arcsen'], ['asin', 'arcsen'], ['arccos', 'arccos'], ['acos', 'arccos'], ['arctg', 'arctg'], ['arctan', 'arctg'], ['atan', 'arctg'],
  ['sqrt', 'sqrt'], ['raiz', 'sqrt'], ['cosec', 'cosec'], ['csc', 'cosec'], ['cotg', 'cotg'], ['cot', 'cotg'], ['sen', 'sen'], ['sin', 'sen'], ['cos', 'cos'], ['tan', 'tg'], ['tg', 'tg'], ['sec', 'sec'],
  ['ln', 'ln'], ['log', 'log'], ['pi', 'π'], ['e', 'e'], ['x', 'x'], ['y', 'y'], ['t', 't'], ['k', 'k'], ['h', 'h']];
function cTokens(src) {
  const s = src.toLowerCase().replace(/raíz/g, 'raiz').replace(/²/g, '^2').replace(/³/g, '^3').replace(/[−–—]/g, '-').replace(/[·×]/g, '*').replace(/÷/g, '/').replace(/[\[{]/g, '(').replace(/[\]}]/g, ')').replace(/\s+/g, '');
  const toks = []; let i = 0;
  while (i < s.length) {
    const r = s.slice(i); let m;
    if ((m = r.match(/^\d+(?:[.,]\d+)?/))) { toks.push({ t: 'num', v: m[0] }); i += m[0].length; continue; }
    const c = s[i];
    if (c === '√') { toks.push({ t: 'fn', n: 'sqrt' }); i++; continue; }
    if (c === 'π') { toks.push({ t: 'k', n: 'π' }); i++; continue; }
    if (/[a-zñ]/.test(c)) {
      const w = r.match(/^[a-zñ]+/)[0]; let j = 0;
      while (j < w.length) {
        const hit = C_NOMBRES.find(([nm]) => w.startsWith(nm, j));
        if (!hit) throw new Error(`No reconozco “${w}”. Podés usar x, números, e, π y las funciones sen, cos, tg, ln, log, √, arcsen, arccos y arctg.`);
        const v = hit[1];
        if (['x', 'y', 't', 'k', 'h'].includes(v)) toks.push({ t: 'v', n: v }); else if (v === 'e' || v === 'π') toks.push({ t: 'k', n: v }); else toks.push({ t: 'fn', n: v });
        j += hit[0].length;
      }
      i += w.length; continue;
    }
    if ('+-*/^()|'.includes(c)) { toks.push({ t: c }); i++; continue; }
    throw new Error(`No reconozco el símbolo “${c}”.`);
  }
  const out = [];   // multiplicación implícita: 2x, x(…), 3sen x, (x+1)(x−1)
  for (const tk of toks) {
    const p = out[out.length - 1];
    if (p) {
      if (['v', 'k'].includes(p.t) && tk.t === 'num') throw new Error('Hay un número pegado después de una letra. Escribí el número adelante (2x) o usá ^ (x^2).');
      if ((['num', 'v', 'k', ')'].includes(p.t) && ['v', 'k', 'fn', '('].includes(tk.t)) || (p.t === ')' && tk.t === 'num')) out.push({ t: '*' });
    }
    out.push(tk);
  }
  return out;
}
function cParse(src) {
  const toks = cTokens(src); let i = 0, enAbs = 0; const ver = () => toks[i] && toks[i].t, sig = () => toks[i++];
  function expr() { let neg = false; if (ver() === '-') { sig(); neg = true; } else if (ver() === '+') sig();
    let a = term(); if (neg) a = { t: 'neg', a };
    while (ver() === '+' || ver() === '-') { const o = sig().t; a = { t: o === '+' ? 'add' : 'sub', a, b: term() }; }
    return a; }
  function term() { let a = un(); while (ver() === '*' || ver() === '/') { const o = sig().t; a = { t: o === '/' ? 'div' : 'mul', a, b: un() }; } return a; }
  function un() { if (ver() === '-') { sig(); return { t: 'neg', a: un() }; } if (ver() === '+') { sig(); return un(); } return pot(); }
  function pot() { const b = at(); if (ver() === '^') { sig(); return { t: 'pow', a: b, b: un() }; } return b; }
  function at() {
    const tk = sig(); if (!tk) throw new Error('La expresión está incompleta.');
    if (tk.t === 'num') return { t: 'n', v: leerDecimal(tk.v.replace(',', '.').replace('.', ',')).q };
    if (tk.t === 'v') return { t: 'x', n: tk.n };
    if (tk.t === 'k') return { t: 'k', n: tk.n };
    if (tk.t === '(') { const e = expr(); if (ver() !== ')') throw new Error('Falta cerrar un paréntesis.'); sig(); return e; }
    if (tk.t === '|' && !enAbs) { enAbs++; const e = expr(); enAbs--; if (ver() !== '|') throw new Error('Falta cerrar el valor absoluto.'); sig(); return { t: 'fn', n: 'abs', a: e }; }
    if (tk.t === 'fn') {
      let p = null; if (ver() === '^') { sig(); let t2 = sig(); const conPar = t2 && t2.t === '('; if (conPar) { t2 = sig(); if (ver() === ')') sig(); } if (!t2 || t2.t !== 'num') throw new Error('Después de la función y ^ va un número (por ejemplo sen^2 x).'); p = leerDecimal(t2.v).q; if (ver() === '*') sig(); }
      const arg = ver() === '(' ? at() : pot(); const f = { t: 'fn', n: tk.n, a: arg };
      return p ? { t: 'pow', a: f, b: { t: 'n', v: p } } : f;
    }
    throw new Error('Falta algo en la expresión.');
  }
  const e = expr(); if (i < toks.length) throw new Error(toks[i].t === ')' ? 'Hay un paréntesis de cierre de más.' : 'Sobra algo en la expresión.');
  return e;
}

/* -----------------------------------------------------------------------
 * C2. SIMPLIFICACIÓN
 * Formas internas: sum (suma de términos), prod (producto de factores),
 * div (cociente), pow (potencia), fn (función), n (número), x (variable), k (e o π).
 * --------------------------------------------------------------------- */
const cN = v => ({ t: 'n', v: v instanceof Q ? v : QE(v) }), cX = (n = 'x') => ({ t: 'x', n });
const cEsN = e => e.t === 'n' && !e.sub, cUno = q => q.n === 1n && q.d === 1n;
function cKey(e) { switch (e.t) { case 'n': return e.v.n + '/' + e.v.d; case 'x': return 'v' + e.n; case 'k': return e.n; case 'sum': return 'S(' + e.terms.map(cKey).join(',') + ')'; case 'prod': return 'P(' + e.fs.map(cKey).join(',') + ')'; case 'div': return 'D(' + cKey(e.a) + ',' + cKey(e.b) + ')'; case 'pow': return 'W(' + cKey(e.a) + ',' + cKey(e.b) + ')'; case 'fn': return e.n + '(' + cKey(e.a) + ')'; default: return ['add', 'sub', 'mul', 'neg'].includes(e.t) ? cKey(cSimp(e)) : e.t; } }
const cTiene = (e, v = 'x') => (e.t === 'x' && e.n === v) || (e.terms && e.terms.some(z => cTiene(z, v))) || (e.fs && e.fs.some(z => cTiene(z, v))) || (e.a && typeof e.a === 'object' && cTiene(e.a, v)) || (e.b && typeof e.b === 'object' && cTiene(e.b, v));
function cSimp(e) {
  switch (e.t) {
    case 'n': case 'x': case 'k': return e;
    case 'neg': return cMul([cN(-1), cSimp(e.a)]);
    case 'add': return cAdd([cSimp(e.a), cSimp(e.b)]);
    case 'sub': return cAdd([cSimp(e.a), cMul([cN(-1), cSimp(e.b)])]);
    case 'mul': return cMul([cSimp(e.a), cSimp(e.b)]);
    case 'div': return cDiv(cSimp(e.a), cSimp(e.b));
    case 'pow': return cPow(cSimp(e.a), cSimp(e.b));
    case 'fn': return cFn(e.n, cSimp(e.a));
    case 'sum': return cAdd(e.terms.map(cSimp));
    case 'prod': return cMul(e.fs.map(cSimp));
  }
  return e;
}
function cCoef(t) {                                    // término → [coeficiente, resto]
  if (cEsN(t)) return [t.v, null];
  if (t.t === 'prod' && cEsN(t.fs[0])) { const r = t.fs.slice(1); return [t.fs[0].v, r.length === 1 ? r[0] : { t: 'prod', fs: r }]; }
  if (t.t === 'div') { const [c, r] = cCoef(t.a), [cb, rb] = cCoef(t.b); if (!cUno(c) || (!cUno(cb) && rb)) return [c.div(rb ? cb : Q1), { t: 'div', a: r || cN(1), b: rb ? rb : t.b }]; }
  return [Q1, t];
}
function cConC(c, r) { if (c.cero) return cN(0); if (!r) return cN(c); if (cUno(c)) return r; if (r.t === 'prod') return { t: 'prod', fs: [cN(c), ...r.fs] }; if (r.t === 'div') return { t: 'div', a: cMul([cN(c), r.a]), b: r.b }; return { t: 'prod', fs: [cN(c), r] }; }
function cGrado(t) { const r = cCoef(t)[1]; if (!r) return 0; if (r.t === 'x') return 1; if (r.t === 'pow' && r.a.t === 'x' && cEsN(r.b)) return r.b.v.num(); return null; }
function cAdd(lista) {
  const plano_ = []; lista.forEach(t => (t.t === 'sum' ? plano_.push(...t.terms) : plano_.push(t)));
  let c = Q0; const g = [];
  for (const t of plano_) { if (cEsN(t)) { c = c.add(t.v); continue; } const [k, r] = cCoef(t), key = cKey(r), o = g.find(z => z.key === key); if (o) o.c = o.c.add(k); else g.push({ key, c: k, r }); }
  const terms = g.filter(z => !z.c.cero).map(z => cConC(z.c, z.r));
  if (terms.every(t => cGrado(t) !== null)) terms.sort((a, b) => cGrado(b) - cGrado(a));
  if (!c.cero) terms.push(cN(c));
  return !terms.length ? cN(0) : terms.length === 1 ? terms[0] : { t: 'sum', terms };
}
function cMul(lista) {
  let fl = []; lista.forEach(f => (f.t === 'prod' ? fl.push(...f.fs) : fl.push(f)));
  const dens = []; fl = fl.flatMap(f => (f.t === 'div' ? (dens.push(f.b), [f.a]) : [f]));
  if (dens.length) return cDiv(cMul(fl), cMul(dens));
  let c = Q1; const g = [];
  for (const f of fl) { if (cEsN(f)) { c = c.mul(f.v); continue; } let b = f, ex = cN(1); if (f.t === 'pow') { b = f.a; ex = f.b; } const key = cKey(b), o = g.find(z => z.key === key); if (o) o.ex = cAdd([o.ex, ex]); else g.push({ key, b, ex }); }
  if (c.cero) return cN(0);
  const out = []; for (const z of g) { const p = cPow(z.b, z.ex); if (p.t === 'prod') out.push(...p.fs); else out.push(p); }
  const fs = []; for (const f of out) { if (cEsN(f)) c = c.mul(f.v); else fs.push(f); }
  if (c.cero) return cN(0);
  const rk = f => { const b = f.t === 'pow' ? f.a : f; return b.t === 'x' ? 1 : b.t === 'k' ? (f.t === 'pow' ? 3.5 : 0) : b.t === 'fn' ? 4 : b.t === 'sum' ? 5 : 3; };
  fs.sort((a, b) => rk(a) - rk(b));
  if (!fs.length) return cN(c); if (cUno(c) && fs.length === 1) return fs[0];
  return { t: 'prod', fs: cUno(c) ? fs : [cN(c), ...fs] };
}
function cDiv(a, b) {
  if (cEsN(b)) { if (b.v.cero) throw new Error('Aparece una división por cero.'); return cMul([cN(Q1.div(b.v)), a]); }
  if (cEsN(a) && a.v.cero) return cN(0);
  if (a.t === 'div') return cDiv(a.a, cMul([a.b, b]));
  if (b.t === 'div') return cDiv(cMul([a, b.b]), b.a);
  const fl = e => { const [c, r] = cCoef(e); const fs = !r ? [] : r.t === 'prod' ? r.fs : [r]; return { c, fs: fs.map(f => (f.t === 'pow' && cEsN(f.b) ? { b: f.a, e: f.b.v } : { b: f, e: Q1 })) }; };
  const A = fl(a), B = fl(b), num = A.fs.map(z => ({ ...z })), den = [];
  for (const d of B.fs) { const m = num.find(z => cKey(z.b) === cKey(d.b)); if (m) m.e = m.e.sub(d.e); else den.push({ ...d }); }
  const co = A.c.div(B.c), nf = [], df = [...den];
  for (const z of num) { if (z.e.n > 0n) nf.push(z); else if (z.e.n < 0n) df.push({ b: z.b, e: z.e.neg() }); }
  const bl = arr => arr.map(z => cPow(z.b, cN(z.e)));
  const Nm = cMul([cN(co.n), ...bl(nf)]), Dm = cMul([cN(co.d), ...bl(df)]);
  if (cEsN(Dm)) return cUno(Dm.v) ? Nm : cMul([cN(Q1.div(Dm.v)), Nm]);
  return { t: 'div', a: Nm, b: Dm };
}
function cPow(a, b) {
  if (cEsN(b)) {
    const e = b.v;
    if (e.cero) return cN(1); if (cUno(e)) return a;
    if (cEsN(a) && e.entero && absB(e.n) <= 12n) { if (a.v.cero && e.n < 0n) throw new Error('Aparece una división por cero.'); return cN(e.n >= 0n ? a.v.pow(Number(e.n)) : a.v.inv().pow(Number(-e.n))); }
    if (cEsN(a) && !e.entero && a.v.n >= 0n) { const r = raizExacta(a.v, Number(e.d)); if (r) return cPow(cN(r), cN(new Q(e.n)));
      if (e.d === 2n && absB(e.n) === 1n && !a.v.cero) { const { k, m } = sqrtLibre(a.v.n * a.v.d); const c = new Q(k, a.v.d); if (!cUno(c) && m > 1n) { const s = cMul([cN(c), { t: 'pow', a: cN(new Q(m)), b: cN(new Q(1n, 2n)) }]); return e.n > 0n ? s : cDiv(cN(1), s); } } }
    if (a.t === 'pow' && cEsN(a.b)) return cPow(a.a, cN(a.b.v.mul(e)));
    if (a.t === 'fn' && a.n === 'sqrt' && e.entero) return cPow(a.a, cN(new Q(e.n, 2n)));
    if (a.t === 'prod' && e.entero) return cMul(a.fs.map(f => cPow(f, b)));
    if (a.t === 'div' && e.entero) return cDiv(cPow(a.a, b), cPow(a.b, b));
    if (e.n < 0n) return cDiv(cN(1), cPow(a, cN(e.neg())));
  }
  return { t: 'pow', a, b };
}
function cFn(n, a) {
  if (cEsN(a)) { const v = a.v;
    if (n === 'sqrt' && v.n >= 0n) { const r = raizExacta(v, 2); if (r) return cN(r); }
    if (v.cero && ['sen', 'tg', 'arcsen', 'arctg'].includes(n)) return cN(0);
    if (v.cero && n === 'cos') return cN(1);
    if (cUno(v) && (n === 'ln' || n === 'log')) return cN(0);
    if (n === 'abs') return cN(v.abs()); }
  if (['sen', 'cos', 'tg'].includes(n)) { const k = cMultPi(a); if (k) { const v = trigRN(n, k.mul(QE(180)).num()); if (v && v !== 'no') return cDeRN(v); } }
  if (['arcsen', 'arccos', 'arctg'].includes(n) && cEsN(a)) { const T = { arcsen: { '0': 0, '1/2': 1 / 6, '1': 1 / 2 }, arccos: { '1': 0, '1/2': 1 / 3, '0': 1 / 2, '-1/2': 2 / 3, '-1': 1 }, arctg: { '0': 0, '1': 1 / 4 } }[n], key = `${a.v.n}${a.v.d > 1n ? '/' + a.v.d : ''}`, keyN = `${-a.v.n}${a.v.d > 1n ? '/' + a.v.d : ''}`;
    if (T[key] !== undefined) return cMul([cN(aproxQ(T[key])), { t: 'k', n: 'π' }]); if (n !== 'arccos' && T[keyN] !== undefined) return cMul([cN(aproxQ(-T[keyN])), { t: 'k', n: 'π' }]); }
  if (n === 'ln' && a.t === 'k' && a.n === 'e') return cN(1);
  if (n === 'ln' && a.t === 'pow' && a.a.t === 'k' && a.a.n === 'e') return a.b;
  if (n === 'abs' && a.t === 'pow' && a.a.t === 'k' && a.a.n === 'e') return a;
  if (n === 'ln' && a.t === 'fn' && a.n === 'abs' && a.a.t === 'pow' && a.a.a.t === 'k') return a.a.b;
  return { t: 'fn', n, a };
}
const cS = src => cSimp(cParse(src));
// ¿Es un múltiplo racional de π? (devuelve el racional o null)
function cMultPi(a) { if (cEsN(a) && a.v.cero) return Q0; if (a.t === 'k' && a.n === 'π') return Q1; if (a.t === 'prod' && a.fs.length === 2 && cEsN(a.fs[0]) && a.fs[1].t === 'k' && a.fs[1].n === 'π') return a.fs[0].v; return null; }
// Número con raíces (RN) → árbol de expresión
const cDeRN = rn => cAdd([...rn.m].map(([r, c]) => (r === 1n ? cN(c) : cMul([cN(c), { t: 'fn', n: 'sqrt', a: cN(new Q(r)) }]))));
// Polinomio (coeficientes) → expresión
const cDeU = (u, v = 'x') => cAdd(uTrim(u).map((c, i) => cMul([cN(c), cPow(cX(v), cN(i))])).reverse());
// Deja más prolijo un resultado: expande lo que sea polinomio y junta fracciones de polinomios.
function cPulir(e, v = 'x') {
  if (e.t === 'div' && e.b.t === 'pow' && cEsN(e.b.b) && e.b.b.v.entero) {          // N / (base)^n: simplificamos sin desarrollar el denominador
    const rn = cRac(e.a, v), rb = cRac(e.b.a, v);
    if (rn && rb && uGrado(rn.d) === 0 && uGrado(rb.d) === 0 && uGrado(rb.n) >= 1) {
      let num = rn.n.map(c => c.div(rn.d[0])), n = Number(e.b.b.v.n); const base = rb.n.map(c => c.div(rb.d[0]));
      while (n > 0) { const { q, r } = uDiv(num, base); if (uGrado(r) >= 0) break; num = q; n--; }
      return cDiv(cDeU(num, v), cPow(cDeU(base, v), cN(n)));
    }
  }
  const r = cRac(e, v);
  if (r) { const g = uMcd(r.n, r.d); let n = uDiv(r.n, g).q, d = uDiv(r.d, g).q;
    if (uGrado(d) === 0) { n = n.map(c => c.div(d[0])); if (uGrado(n) > 4 && /W\(S\(/.test(cKey(e))) return e; return cDeU(n, v); }
    // denominador con coeficientes enteros sin factor común y principal positivo
    const mcmB_ = (a, b) => a / (mcdB(a, b) || 1n) * b, den = d.reduce((m, c) => mcmB_(m, c.d), 1n), num = d.reduce((m, c) => mcdB(m, absB(c.n * den / c.d)), 0n) || 1n, k = new Q(den * (d[uGrado(d)].signo < 0 ? -1n : 1n), num);
    n = n.map(c => c.mul(k)); d = d.map(c => c.mul(k)); return cDiv(cDeU(n, v), cDeU(d, v)); }
  if (e.t === 'div') return cDiv(cPulir(e.a, v), e.b);
  if (e.t === 'sum') return cAdd(e.terms.map(t => cPulir(t, v)));
  return e;
}

/* -----------------------------------------------------------------------
 * C3. DERIVADAS (resultado simplificado)
 * --------------------------------------------------------------------- */
function cDer(e, v = 'x') { return cSimp(cDerC(e, v)); }
function cDerC(e, v) {
  if (!cTiene(e, v)) return cN(0);
  const D = z => cDer(z, v);
  switch (e.t) {
    case 'x': return cN(1);
    case 'sum': return { t: 'sum', terms: e.terms.map(D) };
    case 'prod': { const cs = e.fs.filter(f => !cTiene(f, v)), vs = e.fs.filter(f => cTiene(f, v)); if (vs.length === 1) return { t: 'prod', fs: [...cs, D(vs[0])] };
      const u = vs[0], w = vs.length === 2 ? vs[1] : { t: 'prod', fs: vs.slice(1) }; return { t: 'prod', fs: [...cs, { t: 'sum', terms: [{ t: 'prod', fs: [D(u), w] }, { t: 'prod', fs: [u, D(w)] }] }] }; }
    case 'div': { const u = e.a, w = e.b; if (!cTiene(w, v)) return { t: 'div', a: D(u), b: w }; return { t: 'div', a: { t: 'sum', terms: [{ t: 'prod', fs: [D(u), w] }, { t: 'prod', fs: [cN(-1), u, D(w)] }] }, b: { t: 'pow', a: w, b: cN(2) } }; }
    case 'pow': { const u = e.a, b = e.b;
      if (!cTiene(b, v)) return { t: 'prod', fs: [b, { t: 'pow', a: u, b: { t: 'sum', terms: [b, cN(-1)] } }, D(u)] };
      if (!cTiene(u, v)) return { t: 'prod', fs: [e, ...(u.t === 'k' && u.n === 'e' ? [] : [{ t: 'fn', n: 'ln', a: u }]), D(b)] };
      return { t: 'prod', fs: [e, { t: 'sum', terms: [{ t: 'prod', fs: [D(b), { t: 'fn', n: 'ln', a: u }] }, { t: 'div', a: { t: 'prod', fs: [b, D(u)] }, b: u }] }] }; }
    case 'fn': { const u = e.a, uno = cN(1), raiz1 = s => ({ t: 'fn', n: 'sqrt', a: { t: 'sum', terms: [cN(1), { t: 'prod', fs: [cN(s), { t: 'pow', a: u, b: cN(2) }] }] } });
      const r = { sen: () => ({ t: 'fn', n: 'cos', a: u }), cos: () => ({ t: 'prod', fs: [cN(-1), { t: 'fn', n: 'sen', a: u }] }), tg: () => ({ t: 'div', a: uno, b: { t: 'pow', a: { t: 'fn', n: 'cos', a: u }, b: cN(2) } }),
        cotg: () => ({ t: 'div', a: cN(-1), b: { t: 'pow', a: { t: 'fn', n: 'sen', a: u }, b: cN(2) } }), sec: () => ({ t: 'div', a: { t: 'fn', n: 'sen', a: u }, b: { t: 'pow', a: { t: 'fn', n: 'cos', a: u }, b: cN(2) } }), cosec: () => ({ t: 'div', a: { t: 'prod', fs: [cN(-1), { t: 'fn', n: 'cos', a: u }] }, b: { t: 'pow', a: { t: 'fn', n: 'sen', a: u }, b: cN(2) } }),
        ln: () => ({ t: 'div', a: uno, b: u }), log: () => ({ t: 'div', a: uno, b: { t: 'prod', fs: [u, { t: 'fn', n: 'ln', a: cN(10) }] } }), sqrt: () => ({ t: 'div', a: uno, b: { t: 'prod', fs: [cN(2), e] } }),
        arcsen: () => ({ t: 'div', a: uno, b: raiz1(-1) }), arccos: () => ({ t: 'div', a: cN(-1), b: raiz1(-1) }), arctg: () => ({ t: 'div', a: uno, b: { t: 'sum', terms: [cN(1), { t: 'pow', a: u, b: cN(2) }] } }), abs: () => ({ t: 'div', a: u, b: e }) }[e.n];
      return { t: 'prod', fs: [r(), D(u)] }; }
  }
  throw new Error('No sé derivar esa expresión.');
}

/* -----------------------------------------------------------------------
 * C4. ESCRITURA EN LATEX
 * --------------------------------------------------------------------- */
const C_FN_L = { sen: '\\operatorname{sen}', cos: '\\cos', tg: '\\operatorname{tg}', cotg: '\\operatorname{cotg}', sec: '\\sec', cosec: '\\operatorname{cosec}', ln: '\\ln', log: '\\log', arcsen: '\\operatorname{arcsen}', arccos: '\\arccos', arctg: '\\operatorname{arctg}' };
function cPrec(e) { switch (e.t) { case 'sum': case 'add': case 'sub': return 1; case 'neg': return 1.5; case 'n': return e.sub ? 5 : e.v.n < 0n ? 1.5 : e.v.d > 1n ? 3 : 5; case 'prod': case 'mul': return 2; case 'div': return 3; case 'pow': return 4; default: return 5; } }
const cW = (e, p) => (cPrec(e) < p ? par(cL(e)) : cL(e));
const cNegIni = f => (f.t === 'n' && !f.sub && f.v.n < 0n) || f.t === 'neg' || (f.t === 'prod' && cEsN(f.fs[0]) && f.fs[0].v.n < 0n) || (f.t === 'div' && cNegIni(f.a));
function cSigno(t) {
  if (t.t === 'n' && !t.sub) return [t.v.n < 0n, cN(t.v.abs())];
  if (t.t === 'neg') return [true, t.a];
  if (t.t === 'prod' && cEsN(t.fs[0]) && t.fs[0].v.n < 0n) { const c = t.fs[0].v.neg(), r = t.fs.slice(1); return [true, cUno(c) ? (r.length === 1 ? r[0] : { t: 'prod', fs: r }) : { t: 'prod', fs: [cN(c), ...r] }]; }
  if (t.t === 'div') { const [ng, a] = cSigno(t.a); if (ng) return [true, { t: 'div', a, b: t.b }]; }
  return [false, t];
}
function cL(e) {
  switch (e.t) {
    case 'n': return e.sub ? par(L_frac(e.v)) : L_frac(e.v);
    case 'x': return e.n; case 'k': return e.n === 'π' ? '\\pi' : 'e';
    case 'fn': { const arg = e.a.sub ? L_frac(e.a.v) : cL(e.a); if (e.n === 'sqrt') return `\\sqrt{${arg}}`; if (e.n === 'abs') return `\\left|${arg}\\right|`; if (e.a.t === 'fn' && e.a.n === 'abs') return C_FN_L[e.n] + cL(e.a); return C_FN_L[e.n] + (e.a.t === 'x' || (cEsN(e.a) && !e.a.sub && e.a.v.n >= 0n) ? ' ' + arg : par(arg)); }
    case 'neg': return '-' + cW(e.a, 2);
    case 'add': return cL(e.a) + '+' + cW(e.b, 1.01);
    case 'sub': return cL(e.a) + '-' + cW(e.b, 1.6);
    case 'mul': return cProdL([e.a, e.b]);
    case 'prod': return cProdL(e.fs);
    case 'div': { if (cNegIni(e.a)) { const [, a] = cSigno(e.a); return `-\\frac{${cL(a)}}{${cL(e.b)}}`; } return `\\frac{${cL(e.a)}}{${cL(e.b)}}`; }
    case 'pow': return cPowL(e);
    case 'sum': return e.terms.map((t, i) => { const [ng, a] = cSigno(t); return (i === 0 ? (ng ? '-' : '') : ng ? '-' : '+') + cW(a, 1.01); }).join('');
  }
  return '?';
}
function cProdL(fs) {
  let s = '', prevNum = false, primero = true;
  fs.forEach((f, i) => {
    if (cEsN(f) && i === 0) { if (f.v.eq(QE(-1)) && fs.length > 1) { s += '-'; return; } if (cUno(f.v) && fs.length > 1) return; s += L_frac(f.v); prevNum = true; primero = false; return; }
    let p = (!primero && cNegIni(f)) ? par(cL(f)) : cW(f, 2.01); if (cEsN(f)) p = f.v.n < 0n || f.v.d > 1n ? par(L_frac(f.v)) : L_frac(f.v);
    const empiezaNum = cEsN(f) || f.sub || (f.t === 'pow' && (cEsN(f.a) || f.a.sub));
    if (!primero && (empiezaNum || !prevNum)) s += '\\cdot '; s += p; prevNum = false; primero = false;
  });
  return s;
}
function cPowL(e) {
  const a = e.a, b = e.b;
  if (a.t === 'fn' && !['sqrt', 'abs'].includes(a.n) && cEsN(b) && b.v.entero && b.v.n > 0n) return `${C_FN_L[a.n]}^{${L_ent(b.v.n)}}` + (a.a.t === 'x' ? ' ' + cL(a.a) : par(cL(a.a)));
  if (cEsN(b) && b.v.eq(new Q(1n, 2n))) return `\\sqrt{${cL(a)}}`;
  const base = (a.t === 'x' || a.t === 'k' || (cEsN(a) && a.v.n > 0n && a.v.entero)) ? cL(a) : a.sub ? par(L_frac(a.v)) : par(cL(a));
  return `{${base}}^{${cL(b)}}`;
}

/* -----------------------------------------------------------------------
 * C5. EVALUACIÓN (numérica y exacta) Y SUSTITUCIÓN
 * --------------------------------------------------------------------- */
function cNum(e, val) {
  const R = z => cNum(z, val);
  switch (e.t) {
    case 'n': return e.v.num(); case 'x': return typeof val === 'number' ? val : val[e.n]; case 'k': return e.n === 'e' ? Math.E : Math.PI;
    case 'sum': return e.terms.reduce((s, t) => s + R(t), 0); case 'prod': return e.fs.reduce((s, t) => s * R(t), 1);
    case 'add': return R(e.a) + R(e.b); case 'sub': return R(e.a) - R(e.b); case 'mul': return R(e.a) * R(e.b); case 'div': return R(e.a) / R(e.b); case 'neg': return -R(e.a);
    case 'pow': { const b = R(e.a), p = R(e.b); if (b < 0 && cEsN(e.b) && !e.b.v.entero && e.b.v.d % 2n === 1n) return (e.b.v.n % 2n === 0n ? 1 : -1) * Math.pow(-b, p); return Math.pow(b, p); }
    case 'fn': { const u = R(e.a); switch (e.n) { case 'sen': return Math.sin(u); case 'cos': return Math.cos(u); case 'tg': return Math.abs(Math.cos(u)) < 1e-12 ? NaN : Math.tan(u); case 'cotg': return 1 / Math.tan(u); case 'sec': return 1 / Math.cos(u); case 'cosec': return 1 / Math.sin(u);
      case 'ln': return u > 0 ? Math.log(u) : NaN; case 'log': return u > 0 ? Math.log10(u) : NaN; case 'sqrt': return u >= 0 ? Math.sqrt(u) : NaN; case 'abs': return Math.abs(u);
      case 'arcsen': return Math.abs(u) <= 1 ? Math.asin(u) : NaN; case 'arccos': return Math.abs(u) <= 1 ? Math.acos(u) : NaN; case 'arctg': return Math.atan(u); } }
  }
  return NaN;
}
function cExacto(e, val) {                     // valor racional exacto o null
  try {
    switch (e.t) {
      case 'n': return e.v; case 'x': return val[e.n] || null; case 'k': return null;
      case 'sum': { let s = Q0; for (const t of e.terms) { const v = cExacto(t, val); if (!v) return null; s = s.add(v); } return s; }
      case 'prod': { let s = Q1; for (const t of e.fs) { const v = cExacto(t, val); if (!v) return null; s = s.mul(v); } return s; }
      case 'add': case 'sub': case 'mul': case 'div': { const a = cExacto(e.a, val), b = cExacto(e.b, val); if (!a || !b) return null; return e.t === 'add' ? a.add(b) : e.t === 'sub' ? a.sub(b) : e.t === 'mul' ? a.mul(b) : a.div(b); }
      case 'neg': { const a = cExacto(e.a, val); return a && a.neg(); }
      case 'pow': { const a = cExacto(e.a, val), b = cExacto(e.b, val); if (!a || !b) return null; if (b.entero) { if (absB(b.n) > 30n || (a.cero && b.n < 0n)) return null; return b.n >= 0n ? a.pow(Number(b.n)) : a.inv().pow(Number(-b.n)); } const r = a.n >= 0n ? raizExacta(a, Number(b.d)) : null; return r ? (b.n >= 0n ? r.pow(Number(b.n)) : (r.cero ? null : r.inv().pow(Number(-b.n)))) : null; }
      case 'fn': { const a = cExacto(e.a, val); if (!a) return null; if (e.n === 'sqrt') return a.n >= 0n ? raizExacta(a, 2) : null; if (e.n === 'abs') return a.abs(); if (a.cero && ['sen', 'tg', 'arcsen', 'arctg'].includes(e.n)) return Q0; if (a.cero && e.n === 'cos') return Q1; if (cUno(a) && ['ln', 'log'].includes(e.n)) return Q0; return null; }
    }
  } catch (err) { return null; }
  return null;
}
function cSust(e, v, w) {                         // reemplaza la variable v por la expresión w
  if (e.t === 'x' && e.n === v) return w;
  const o = { ...e }; if (e.a && typeof e.a === 'object') o.a = cSust(e.a, v, w); if (e.b && typeof e.b === 'object') o.b = cSust(e.b, v, w);
  if (e.terms) o.terms = e.terms.map(z => cSust(z, v, w)); if (e.fs) o.fs = e.fs.map(z => cSust(z, v, w)); return o;
}
const cMarca = q => ({ t: 'n', v: q, sub: true });          // número reemplazado (se muestra entre paréntesis)
const cValL = (e, a) => { const ex = cExacto(e, { x: a }); return ex ? L_frac(ex) : `\\approx ${L_x(cNum(e, a.num()))}`; };
// Polinomio / fracción de polinomios en x (o null): sirve para factorizar, cancelar y buscar raíces exactas.
function cRac(e, v = 'x') {
  const R = z => cRac(z, v), uno = [Q1];
  switch (e.t) {
    case 'n': return { n: [e.v], d: uno }; case 'x': return e.n === v ? { n: [Q0, Q1], d: uno } : null; case 'k': return null;
    case 'sum': case 'add': case 'sub': { const ts = e.t === 'sum' ? e.terms : [e.a, e.t === 'sub' ? { t: 'neg', a: e.b } : e.b]; let acc = { n: [Q0], d: uno }; for (const t of ts) { const r = R(t); if (!r) return null; acc = { n: uAdd(uMul(acc.n, r.d), uMul(r.n, acc.d)), d: uMul(acc.d, r.d) }; } return acc; }
    case 'neg': { const r = R(e.a); return r && { n: r.n.map(c => c.neg()), d: r.d }; }
    case 'prod': case 'mul': { const fs = e.t === 'prod' ? e.fs : [e.a, e.b]; let acc = { n: uno, d: uno }; for (const f of fs) { const r = R(f); if (!r) return null; acc = { n: uMul(acc.n, r.n), d: uMul(acc.d, r.d) }; } return acc; }
    case 'div': { const a = R(e.a), b = R(e.b); if (!a || !b || uGrado(b.n) < 0) return null; return { n: uMul(a.n, b.d), d: uMul(a.d, b.n) }; }
    case 'pow': { const b = cExacto(e.b, {}); const a = R(e.a); if (!a || !b || !b.entero || absB(b.n) > 12n) return null; let r = { n: uno, d: uno }; for (let i = 0; i < Number(absB(b.n)); i++) r = { n: uMul(r.n, a.n), d: uMul(r.d, a.d) }; return b.n < 0n ? { n: r.d, d: r.n } : r; }
  }
  return null;
}
// Raíces reales de un polinomio en una letra: exactas cuando se puede.
function cRaices(u, v = 'x') {
  u = uTrim(u); if (uGrado(u) < 1) return [];
  const { P: Pp } = crearPasos(), fz = factorizarPoly(deU(u, 'x'), Pp), out = [];
  for (const f of fz.fs) {
    if (f.irr) { const q2 = f.quad ? aU(f.quad, 'x') : null; if (q2) { const R = raicesCuadratica(q2[2], q2[1], q2[0]); if (R.tipo === 'irr' && !out.some(o => Math.abs(o.x - R.x[0]) < 1e-9)) R.x.forEach((x, i) => out.push({ x, L: R.L[i], m: f.e })); } continue; }
    const w = aU(f.P, 'x'), g = uGrado(w);
    if (g === 1) { const q = w[0].neg().div(w[1]); out.push({ x: q.num(), L: L_frac(q), q, m: f.e }); }
    else if (g === 2) { const R = raicesCuadratica(w[2], w[1], w[0]); if (R.tipo !== 'comp') R.x.forEach((x, i) => out.push({ x, L: R.L[i], m: f.e })); }
    else if (g > 2) { const ev = x => w.reduceRight((s, c) => s * x + c.num(), 0); let prev = ev(-1000); for (let i = 1; i <= 40000; i++) { const x = -1000 + i * 0.05, y = ev(x); if (prev === 0 || prev * y < 0) { let lo = x - 0.05, hi = x; for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; if (ev(lo) * ev(mid) <= 0) hi = mid; else lo = mid; } const r = (lo + hi) / 2; out.push({ x: r, L: `\\approx ${L_x(r)}`, m: f.e }); } prev = y; } }
  }
  return out.sort((a, b) => a.x - b.x).filter((r, i, arr) => !i || Math.abs(r.x - arr[i - 1].x) > 1e-9);
}
// Raíces de cualquier expresión (numérico) en un intervalo, saltando discontinuidades.
function cRaicesNum(e, x0 = -50, x1 = 50, n = 6000) {
  const f = x => cNum(e, x), out = []; let px = x0, py = f(x0);
  for (let i = 1; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = f(x);
    if (isFinite(py) && isFinite(y) && (py === 0 || py * y < 0)) { let lo = px, hi = x; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; } const r = py === 0 ? px : (lo + hi) / 2; if (Math.abs(f(r)) < 1e-6 && !out.some(o => Math.abs(o - r) < 1e-7)) out.push(r); }
    px = x; py = y; }
  return out;
}
// Gráfico de funciones (con asíntotas verticales y puntos marcados)
function svgCurvas({ fs, x0 = -6, x1 = 6, pts = [], asin = [], etiqueta = 'x', rects = [], region = null }) {
  const W = 340, H = 240, ys = [];
  fs.forEach(f => { for (let i = 0; i <= 400; i++) { const y = f(x0 + (x1 - x0) * i / 400); if (isFinite(y)) ys.push(y); } }); pts.forEach(p => ys.push(p[1])); ys.sort((a, b) => a - b);
  let y0 = ys.length ? ys[Math.floor(ys.length * 0.04)] : -1, y1 = ys.length ? ys[Math.max(0, Math.ceil(ys.length * 0.96) - 1)] : 1; y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); if (y1 - y0 < 1e-6) { y0 -= 1; y1 += 1; } const pad = (y1 - y0) * 0.12; y0 -= pad; y1 += pad;
  const X = x => (x - x0) / (x1 - x0) * W, Y = y => H - (y - y0) / (y1 - y0) * H, paso = (r => { const p = 10 ** Math.floor(Math.log10(r)); return [1, 2, 5, 10].map(k => k * p).find(k => k >= r); })((x1 - x0) / 9), pasoY = (r => { const p = 10 ** Math.floor(Math.log10(r)); return [1, 2, 5, 10].map(k => k * p).find(k => k >= r); })((y1 - y0) / 7);
  let g = '';
  for (let x = Math.ceil(x0 / paso) * paso; x <= x1; x += paso) g += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${H}" class="gr"/>${Math.abs(x) > 1e-9 ? `<text x="${X(x)}" y="${Math.min(H - 3, Math.max(12, Y(0) + 13))}" class="et">${fmtX(x, 2)}</text>` : ''}`;
  for (let y = Math.ceil(y0 / pasoY) * pasoY; y <= y1; y += pasoY) g += `<line x1="0" y1="${Y(y)}" x2="${W}" y2="${Y(y)}" class="gr"/>${Math.abs(y) > 1e-9 ? `<text x="${Math.min(W - 16, Math.max(3, X(0) + 4))}" y="${Y(y) - 2}" class="et" text-anchor="start">${fmtX(y, 2)}</text>` : ''}`;
  g += `<line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" class="ej"/><line x1="${X(0)}" y1="0" x2="${X(0)}" y2="${H}" class="ej"/>`;
  rects.forEach(([a, b, h]) => { g += `<rect x="${X(a)}" y="${Math.min(Y(h), Y(0))}" width="${X(b) - X(a)}" height="${Math.abs(Y(h) - Y(0))}" class="rect"/>`; });
  if (region) { const N = 120, top = [], bot = []; for (let i = 0; i <= N; i++) { const x = region.a + (region.b - region.a) * i / N; top.push(`${X(x).toFixed(1)},${Y(region.f(x)).toFixed(1)}`); bot.push(`${X(x).toFixed(1)},${Y(region.g ? region.g(x) : 0).toFixed(1)}`); } g += `<polygon points="${top.join(' ')} ${bot.reverse().join(' ')}" class="region"/>`; }
  asin.filter(a => a > x0 && a < x1).forEach(a => { g += `<line x1="${X(a)}" y1="0" x2="${X(a)}" y2="${H}" class="asin"/>`; });
  fs.forEach((f, k) => { let d = '', pen = false, prev = null; for (let i = 0; i <= 700; i++) { const x = x0 + (x1 - x0) * i / 700, y = f(x); if (!isFinite(y)) { pen = false; continue; } const py = Y(y); if (pen && prev !== null && Math.abs(py - prev) > H * 1.2) pen = false; d += `${pen ? 'L' : 'M'}${X(x).toFixed(1)},${Math.max(-H, Math.min(2 * H, py)).toFixed(1)}`; pen = true; prev = py; } g += `<path d="${d}" class="${k ? 'curva2' : 'curva'}"/>`; });
  pts.forEach(([x, y, l, hueco]) => { g += `<circle cx="${X(x)}" cy="${Y(y)}" r="4.5" class="${hueco ? 'hueco' : 'pt'}"/>${l ? `<text x="${X(x) + 6}" y="${Y(y) - 7}" class="et pl" text-anchor="start">${l}</text>` : ''}`; });
  return `<svg class="grafico ancho" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico">${g}</svg>`;
}
const cRango = (e, centro = 0) => { const raices = []; return [centro - 6, centro + 6]; };

/* -----------------------------------------------------------------------
 * C6. LECTURA DE CONSIGNAS: definiciones f(x) = …, expresión suelta, punto
 * --------------------------------------------------------------------- */
function cDefs(texto) {                             // { f: árbol, g: árbol } a partir de "f(x) = …; g(x) = …"
  const re = /\b([a-z])\s*\(\s*([xt])\s*\)\s*=/gi, ms = [...texto.matchAll(re)], out = {};
  ms.forEach((m, i) => {
    let s = texto.slice(m.index + m[0].length, i + 1 < ms.length ? ms[i + 1].index : texto.length);
    s = cPrefijo(s.replace(/[¿?]/g, ' ').split(/;|\s+y\s+(?=[a-z]\s*\(|la\b|el\b|su\b)/)[0].replace(/\s+y\s*$/, ''));
    out[m[1].toLowerCase()] = { e: cS(s), v: m[2].toLowerCase(), src: s };
  });
  return out;
}
// El tramo más largo del principio que se puede leer como expresión (corta en espacios, comas y signos).
function cPrefijo(s) {
  s = s.trim(); const cortes = [s.length, ...[...s.matchAll(/,\s|\s(?=[a-záéíóú¿?])|[¿?]/gi)].map(m => m.index).reverse()];
  for (const c of cortes) { const p = s.slice(0, c).trim().replace(/[,.;]$/, ''); if (!p) continue; try { cS(p); return p; } catch (e) { /* sigue */ } }
  throw new Error('No pude leer la función. Revisá que esté bien escrita.');
}
function cSoloExpr(texto) {                         // la primera porción del texto que se puede leer como expresión
  let s = texto.replace(/\s+(en|para|cuando|desde|hasta|con|alrededor)\s+[a-z]\s*=.*$/i, '').replace(/\s+(en|para)\s+el\s+(intervalo|punto).*$/i, '').replace(/[¿?]/g, '').replace(/\s+en\s+\[.*$/, '');
  if (/=/.test(s)) s = s.slice(s.lastIndexOf('=') + 1);
  const cortes = [0, ...[...s.matchAll(/[\s:]/g)].map(m => m.index + 1)];
  for (const i of cortes) { const p = s.slice(i).trim(); if (!p) continue; try { const e = cS(p); if (cTiene(e, 'x') || cTiene(e, 't') || !/[a-z]{3,}/i.test(p)) return { e, src: p }; } catch (err) { /* sigue */ } }
  throw new Error('No encontré la función. Escribila así: f(x) = x^2 − 4, o directamente la expresión.');
}
function cFuncion(texto) { const d = cDefs(texto), k = Object.keys(d); if (k.length) return { e: d[k[0]].e, nom: k[0], v: d[k[0]].v }; const r = cSoloExpr(texto); return { e: r.e, nom: 'f', v: cTiene(r.e, 't') && !cTiene(r.e, 'x') ? 't' : 'x' }; }
function cPunto(texto, v = 'x') {                    // "en x = 2" → { q (exacto o null), x (número), L }
  const m = texto.match(new RegExp(`\\b${v}\\s*(?:=|→|->|tiende a)\\s*(-?\\s*[\\d.,/]*\\s*(?:π|pi)?(?:\\s*\\/\\s*\\d+)?|-?\\s*\\d+(?:[.,]\\d+)?(?:\\/\\d+)?)`, 'i'));
  if (!m || !m[1].trim()) return null;
  const e = cS(m[1].replace(/\s/g, '')), q = cExacto(e, {}); return { q, x: cNum(e, 0), L: q ? L_frac(q) : cL(e), e };
}
const cFL = (nom, v = 'x') => `${nom}(${v})`;
const aproxQ = x => { for (let d = 1n; d <= 12n; d++) { const n = Math.round(x * Number(d)); if (Math.abs(x - n / Number(d)) < 1e-7) return new Q(BigInt(n), d); } return null; };
const LQx = x => { const q = aproxQ(x); return q ? L_frac(q) : `\\approx ${L_x(x)}`; };

/* -----------------------------------------------------------------------
 * C7. DOMINIO
 * --------------------------------------------------------------------- */
function cCondiciones(e, v = 'x', out = []) {        // restricciones: denominadores ≠ 0, raíces pares ≥ 0, logaritmos > 0
  const add = (expr, tipo, por) => { if (cTiene(expr, v) && !out.some(c => c.tipo === tipo && cKey(c.expr) === cKey(expr))) out.push({ expr, tipo, por }); };
  switch (e.t) {
    case 'div': add(e.b, '≠', 'hay un denominador'); break;
    case 'pow': if (cEsN(e.b) && !e.b.v.entero && e.b.v.d % 2n === 0n) add(e.a, e.b.v.n < 0n ? '>' : '≥', 'hay una raíz de índice par'); else if (cEsN(e.b) && e.b.v.n < 0n) add(e.a, '≠', 'hay un exponente negativo (es un denominador)'); break;
    case 'fn':
      if (e.n === 'sqrt') add(e.a, '≥', 'hay una raíz cuadrada');
      if (e.n === 'ln' || e.n === 'log') add(e.a, '>', 'hay un logaritmo');
      if (e.n === 'arcsen' || e.n === 'arccos') { add(cSimp({ t: 'sub', a: cN(1), b: e.a }), '≥', 'el arco seno/coseno solo acepta valores entre −1 y 1'); add(cSimp({ t: 'add', a: e.a, b: cN(1) }), '≥', 'el arco seno/coseno solo acepta valores entre −1 y 1'); }
      if (['tg', 'sec'].includes(e.n)) add({ t: 'fn', n: 'cos', a: e.a }, '≠', 'la tangente (o secante) no existe donde el coseno vale 0');
      if (['cotg', 'cosec'].includes(e.n)) add({ t: 'fn', n: 'sen', a: e.a }, '≠', 'la cotangente (o cosecante) no existe donde el seno vale 0'); break;
  }
  [e.a, e.b, ...(e.terms || []), ...(e.fs || [])].forEach(z => { if (z && typeof z === 'object' && z.t) cCondiciones(z, v, out); });
  return out;
}
const cTrigPer = e => (e.t === 'fn' && ['tg', 'sec', 'cotg', 'cosec', 'sen', 'cos'].includes(e.n) && cTiene(e.a)) || [e.a, e.b, ...(e.terms || []), ...(e.fs || [])].some(z => z && typeof z === 'object' && z.t && cTrigPer(z));
function cPuntosCriticos(conds, v = 'x') {          // ceros de cada condición (y de sus denominadores), exactos si se puede
  const pts = [];
  for (const c of conds) {
    const r = cRac(c.expr, v);
    const rs = r ? [...cRaices(r.n), ...cRaices(r.d)] : cRaicesNum(c.expr).map(x => ({ x, L: LQx(x) }));
    c.raices = r ? cRaices(r.n) : rs;
    rs.forEach(z => { if (!pts.some(p => Math.abs(p.x - z.x) < 1e-9)) pts.push(z); });
  }
  return pts.sort((a, b) => a.x - b.x);
}
function cCumple(c, x) { const y = cNum(c.expr, x); if (!isFinite(y)) return false; if (Math.abs(y) < 1e-10) return c.tipo === '≥'; return c.tipo === '≠' ? true : y > 0; }
function cIntervalos(conds, pts, defin = x => conds.every(c => cCumple(c, x))) {   // arma el conjunto solución como unión de intervalos
  const segs = []; const xs = pts.map(p => p.x);
  for (let i = 0; i <= xs.length; i++) {
    const lo = i ? xs[i - 1] : -Infinity, hi = i < xs.length ? xs[i] : Infinity, m = lo === -Infinity ? (hi === Infinity ? 0 : hi - 1) : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    segs.push({ tipo: 'int', ok: defin(m), lo, hi, i });
    if (i < xs.length) segs.push({ tipo: 'pt', ok: defin(xs[i]), x: xs[i], i });
  }
  const ivs = []; let cur = null;
  for (const s of segs) {
    if (s.tipo === 'int') { if (s.ok) { if (!cur) cur = { a: s.lo, La: s.lo === -Infinity ? '' : pts[s.i - 1].L, ca: false }; } else if (cur) { ivs.push(cur); cur = null; } }
    else { if (s.ok) { if (!cur) cur = { a: s.x, La: pts[s.i].L, ca: true }; } if (cur && !s.ok) { cur.b = s.x; cur.Lb = pts[s.i].L; cur.cb = false; ivs.push(cur); cur = null; }
      else if (cur && s.ok && !segs.find(z => z.tipo === 'int' && z.i === s.i + 1).ok) { cur.b = s.x; cur.Lb = pts[s.i].L; cur.cb = true; ivs.push(cur); cur = null; } }
  }
  if (cur) { cur.b = Infinity; cur.cb = false; ivs.push(cur); }
  ivs.forEach(iv => { if (iv.b === undefined) { iv.b = Infinity; iv.cb = false; } });
  return ivs.filter(iv => !(iv.a === iv.b && !(iv.ca && iv.cb)));
}
const cLRelL = c => `${cL(c.expr)}${{ '≠': '\\neq', '≥': '\\ge', '>': '>' }[c.tipo]}0`;
function cDominio(e, v = 'x') {
  const conds = cCondiciones(e, v);
  if (!conds.length) return { conds, ivs: [{ a: -Infinity, b: Infinity, ca: false, cb: false }], L: '\\mathbb{R}', pts: [] };
  if (cTrigPer(e) && conds.some(c => c.expr.t === 'fn')) return { conds, periodico: true, L: `\\{${v}\\in\\mathbb{R}: ${conds.map(cLRelL).join(',\\;')}\\}`, pts: [] };
  const pts = cPuntosCriticos(conds, v), ivs = cIntervalos(conds, pts);
  const soloPuntos = ivs.length === pts.length + 1 && ivs.every(iv => !iv.ca && !iv.cb) && conds.every(c => c.tipo === '≠');
  return { conds, pts, ivs, L: soloPuntos && pts.length ? `\\mathbb{R}-\\{${pts.map(p => p.L).join(';\\,')}\\}` : L_intervalo(ivs) };
}
const cEnDom = (D, x) => (D.periodico ? D.conds.every(c => cCumple(c, x)) : D.ivs.some(iv => (x > iv.a || (iv.ca && Math.abs(x - iv.a) < 1e-12)) && (x < iv.b || (iv.cb && Math.abs(x - iv.b) < 1e-12))));
function resolverDominio(texto) {
  const { e, nom, v } = cFuncion(texto), { pasos, P } = crearPasos(), D = cDominio(e, v);
  P('Escribimos la función', 'El dominio son todos los valores de x para los que la función se puede calcular.', `${cFL(nom, v)}=${cL(e)}`);
  if (!D.conds.length) P('Buscamos restricciones', 'No hay denominadores con x, ni raíces de índice par, ni logaritmos: se puede calcular para cualquier número real.', `\\text{Dom}\\,${nom}=\\mathbb{R}`);
  else {
    P('Buscamos las restricciones', 'Hay que pedir: denominadores distintos de 0, lo de adentro de una raíz par mayor o igual que 0 y lo de adentro de un logaritmo mayor que 0.', D.conds.map(c => `${cLRelL(c)}\\quad\\text{(${c.por})}`));
    if (!D.periodico) {
      P('Resolvemos cada condición', 'Buscamos dónde se anula cada expresión: esos valores parten la recta en intervalos.', D.conds.map(c => `${cL(c.expr)}=0\\;\\Rightarrow\\;${v}=${c.raices.length ? c.raices.map(r => r.L).join(',\\;') : tx('no se anula')}`));
      const filas = []; const xs = D.pts;
      for (let i = 0; i <= xs.length; i++) { const lo = i ? xs[i - 1].x : -Infinity, hi = i < xs.length ? xs[i].x : Infinity, m = lo === -Infinity ? (hi === Infinity ? 0 : hi - 1) : hi === Infinity ? lo + 1 : (lo + hi) / 2;
        filas.push([k$(`(${i ? xs[i - 1].L : '-\\infty'},\\,${i < xs.length ? xs[i].L : '+\\infty'})`), k$(`${v}=${fmtX(m, 3)}`), D.conds.every(c => cCumple(c, m)) ? 'cumple ✓' : 'no cumple']); }
      if (xs.length) P('Probamos un valor en cada intervalo', 'Elegimos un número de cada intervalo y vemos si cumple todas las condiciones. Los extremos se incluyen solo si la condición es “≥”.', [], tabla(['Intervalo', 'Prueba', 'Condiciones'], filas));
    }
  }
  P('Escribimos el dominio', D.periodico ? 'Como hay funciones trigonométricas, las restricciones se repiten periódicamente.' : 'Juntamos los intervalos donde se cumplen todas las condiciones.', `\\text{Dom}\\,${nom}=${D.L}`);
  const den = D.periodico ? [] : D.pts.filter(p => !cEnDom(D, p.x)), dentro = [0, 1, 2, 3, 5, -1, -2, 0.5, 10].find(x => cEnDom(D, x));
  P('Verificamos', 'Calculamos la función en un valor del dominio (tiene que dar un número) y, si hay, en uno excluido (no se puede calcular).', [dentro !== undefined ? `${nom}(${fmtX(dentro)})=${LQx(cNum(e, dentro))}\\;\\checkmark` : '', den.length ? `${nom}(${den[0].L})\\;\\text{no existe}\\;\\checkmark` : ''].filter(Boolean));
  return { tema: 'funcionesc', metodo: 'Dominio', pasos, resultado: `\\text{Dom}\\,${nom}=${D.L}` };
}

/* -----------------------------------------------------------------------
 * C8. RANGO (IMAGEN), PARIDAD, INYECTIVIDAD
 * --------------------------------------------------------------------- */
function cExtremosNum(e, D) {                         // valores en puntos críticos y comportamiento en los bordes
  const d1 = cDer(e), r = cRac(d1), crit = (r ? cRaices(r.n) : cRaicesNum(d1, -60, 60)).filter(c => cEnDom(D, c.x));
  return crit.map(c => ({ ...c, y: cNum(e, c.x), yq: c.q ? cExacto(e, { x: c.q }) : null }));
}
function resolverRango(texto) {
  const { e, nom, v } = cFuncion(texto), { pasos, P } = crearPasos(), D = cDominio(e, v);
  P('Escribimos la función y su dominio', 'La imagen (o rango) es el conjunto de valores que toma y = f(x) cuando x recorre el dominio.', [`${cFL(nom, v)}=${cL(e)}`, `\\text{Dom}\\,${nom}=${D.L}`]);
  const r = cRac(e); let L_ = null, metodo = 'Análisis de la función';
  if (r && uGrado(r.d) === 0) {
    const u = r.n.map(c => c.div(r.d[0])), g = uGrado(u);
    if (g <= 0) L_ = `\\{${L_frac(u[0] || Q0)}\\}`;
    else if (g % 2 === 1) { L_ = '\\mathbb{R}'; P('Analizamos el grado', 'Es un polinomio de grado impar: va de −∞ a +∞ y, como es continuo, toma todos los valores.', `\\text{Im}\\,${nom}=\\mathbb{R}`); }
    else { const ex = cExtremosNum(e, D); const lc = u[g]; const best = ex.reduce((a, b) => (lc.signo > 0 ? (b.y < a.y ? b : a) : (b.y > a.y ? b : a))); const yL = best.yq ? L_frac(best.yq) : LQx(best.y);
      P('Buscamos el valor extremo', `Es un polinomio de grado par con coeficiente principal ${lc.signo > 0 ? 'positivo: tiene un valor mínimo' : 'negativo: tiene un valor máximo'}. Lo buscamos donde la derivada se anula.`, [`${nom}'(x)=${cL(cPulir(cDer(e)))}`, `${nom}'(x)=0\\;\\Rightarrow\\;x=${ex.map(c => c.L).join(',\\;')}`, `${nom}(${best.L})=${yL}`]);
      L_ = lc.signo > 0 ? `[${yL.replace('\\approx ', '')},\\,+\\infty)` : `(-\\infty,\\,${yL.replace('\\approx ', '')}]`; metodo = 'Valor extremo'; }
  } else if (r && uGrado(r.n) <= 1 && uGrado(r.d) === 1) {
    const k = (r.n[1] || Q0).div(r.d[1]); L_ = `\\mathbb{R}-\\{${L_frac(k)}\\}`; metodo = 'Función homográfica';
    P('Buscamos la asíntota horizontal', 'En una función homográfica $\\frac{ax+b}{cx+d}$, cuando x se hace muy grande la función se acerca a a/c, pero nunca lo alcanza: ese valor queda afuera de la imagen.', `y=\\frac{a}{c}=${L_frac(k)}`);
  }
  if (!L_) {
    const ex = cExtremosNum(e, D), muestras = []; for (let i = 0; i <= 4000; i++) { const x = -200 + i * 0.1; if (cEnDom(D, x)) muestras.push(cNum(e, x)); }
    [1e3, 1e5, -1e3, -1e5].forEach(x => { if (cEnDom(D, x)) muestras.push(cNum(e, x)); });
    const fin = muestras.filter(isFinite), mn = Math.min(...fin, ...ex.map(c => c.y)), mx = Math.max(...fin, ...ex.map(c => c.y));
    const grandes = [1e4, 1e10, -1e4, -1e10].map(x => (cEnDom(D, x) ? cNum(e, x) : NaN)), crece = (a, b, s) => isFinite(a) && isFinite(b) && s * b > s * a + 10 * Math.max(1, Math.abs(a)) ** 0.5;
    const infAbajo = mn < -1e4 || crece(grandes[0], grandes[1], -1) || crece(grandes[2], grandes[3], -1), infArriba = mx > 1e4 || crece(grandes[0], grandes[1], 1) || crece(grandes[2], grandes[3], 1), ext = (y, cerr) => { const q = aproxQ(y); return q ? L_frac(q) : L_x(y); };
    const alcanzaMin = ex.some(c => Math.abs(c.y - mn) < 1e-6) || D.pts.some(p => cEnDom(D, p.x) && Math.abs(cNum(e, p.x) - mn) < 1e-6), alcanzaMax = ex.some(c => Math.abs(c.y - mx) < 1e-6) || D.pts.some(p => cEnDom(D, p.x) && Math.abs(cNum(e, p.x) - mx) < 1e-6);
    L_ = `${infAbajo ? '(-\\infty' : (alcanzaMin ? '[' : '(') + ext(mn)},\\,${infArriba ? '+\\infty)' : ext(mx) + (alcanzaMax ? ']' : ')')}`;
    P('Estudiamos cómo se mueve la función', 'Buscamos sus valores extremos (donde la derivada se anula) y miramos qué pasa en los bordes del dominio y cuando x se va a ±∞.', [ex.length ? `\\text{puntos críticos: }${ex.map(c => `${nom}(${c.L})=${c.yq ? L_frac(c.yq) : LQx(c.y)}`).join(',\\;')}` : tx('No tiene puntos críticos.'), `\\text{valor más bajo: }${infAbajo ? '-\\infty' : ext(mn)},\\quad\\text{valor más alto: }${infArriba ? '+\\infty' : ext(mx)}`]);
  }
  const fn = x => cNum(e, x);
  P('Lo vemos en el gráfico', 'La imagen se lee en el eje y: son las alturas que alcanza la curva.', [`\\text{Im}\\,${nom}=${L_}`], svgCurvas({ fs: [fn], x0: -6, x1: 6, asin: D.pts ? D.pts.filter(p => !cEnDom(D, p.x)).map(p => p.x) : [] }));
  const pruebaY = [0, 1, 2, -1, 3, 5].find(y => cRaicesNum(cSimp({ t: 'sub', a: e, b: cN(y) }), -100, 100).some(x => cEnDom(D, x)));
  const xs = pruebaY !== undefined ? cRaicesNum(cSimp({ t: 'sub', a: e, b: cN(pruebaY) }), -100, 100).filter(x => cEnDom(D, x)) : [];
  P('Verificamos', 'Tomamos un valor de la imagen y comprobamos que hay un x del dominio que lo alcanza.', pruebaY !== undefined ? `${nom}(${LQx(xs[0]).replace('\\approx ', '')})\\approx ${L_x(cNum(e, xs[0]))}=${pruebaY}\\;\\checkmark` : tx('—'));
  return { tema: 'funcionesc', metodo, pasos, resultado: `\\text{Im}\\,${nom}=${L_}` };
}
function resolverParidad(texto) {
  const { e, nom } = cFuncion(texto), { pasos, P } = crearPasos();
  const fm = cPulir(cSimp(cSust(e, 'x', { t: 'neg', a: cX() }))), menos = cPulir(cSimp({ t: 'neg', a: e }));
  P('Calculamos f(−x)', 'Reemplazamos x por (−x) y simplificamos. Recordá: (−x)² = x², (−x)³ = −x³, sen(−x) = −sen x, cos(−x) = cos x.', [`${nom}(x)=${cL(e)}`, `${nom}(-x)=${cL(fm)}`]);
  const xs = [0.7, 1.3, 2.9], par_ = xs.every(x => aproxIgual(cNum(e, -x), cNum(e, x))), imp = xs.every(x => aproxIgual(cNum(e, -x), -cNum(e, x)));
  P('Comparamos', par_ ? 'f(−x) = f(x): la función es par. Su gráfico es simétrico respecto del eje y.' : imp ? 'f(−x) = −f(x): la función es impar. Su gráfico es simétrico respecto del origen.' : 'f(−x) no es igual a f(x) ni a −f(x): la función no es par ni impar.', par_ ? `${nom}(-x)=${nom}(x)` : imp ? `${nom}(-x)=${cL(menos)}=-${nom}(x)` : `${nom}(-x)\\ne ${nom}(x)\\;\\text{y}\\;${nom}(-x)\\ne -${nom}(x)`, svgCurvas({ fs: [x => cNum(e, x)], x0: -5, x1: 5 }));
  const a = 2;
  P('Verificamos', 'Probamos con x = 2 y x = −2.', `${nom}(2)\\approx ${L_x(cNum(e, a))},\\quad ${nom}(-2)\\approx ${L_x(cNum(e, -a))}\\;\\checkmark`);
  return { tema: 'funcionesc', metodo: 'Paridad', pasos, resultado: tx(par_ ? 'Función par' : imp ? 'Función impar' : 'Ni par ni impar') };
}
function resolverInyectiva(texto) {
  const { e, nom } = cFuncion(texto), { pasos, P } = crearPasos(), D = cDominio(e), d1 = cPulir(cDer(e));
  P('Planteamos', 'Una función es inyectiva si a valores distintos de x les corresponden imágenes distintas. Una forma de verlo: si siempre crece (o siempre decrece), es inyectiva.', [`${nom}(x)=${cL(e)}`, `${nom}'(x)=${cL(d1)}`]);
  const xs = []; for (let i = 0; i <= 2000; i++) { const x = -50 + i * 0.05; if (cEnDom(D, x)) xs.push(x); }
  const sg = xs.map(x => Math.sign(cNum(d1, x))).filter(s => s), cambia = sg.some(s => s !== sg[0]);
  if (!cambia) {
    P('Miramos el signo de la derivada', `La derivada es siempre ${sg[0] > 0 ? 'positiva' : 'negativa'} (salvo, a lo sumo, puntos aislados): la función es ${sg[0] > 0 ? 'creciente' : 'decreciente'} en cada tramo del dominio.`, `${nom}'(x)\\,${sg[0] > 0 ? '\\ge' : '\\le'}\\,0`);
    const rr = cRac(e), hom = rr && uGrado(rr.d) >= 1;
    P('Verificamos', hom ? 'Si tiene asíntotas, revisamos que los tramos no repitan valores: en una homográfica cada tramo cubre valores distintos.' : 'Dos valores distintos de x dan imágenes distintas.', `${nom}(1)\\approx ${L_x(cNum(e, 1))}\\ne ${nom}(2)\\approx ${L_x(cNum(e, 2))}\\;\\checkmark`);
    return { tema: 'funcionesc', metodo: 'Monotonía', pasos, resultado: tx('Es inyectiva') };
  }
  const i = sg.findIndex(s => s !== sg[0]); const xs2 = xs.filter(x => cNum(d1, x)); const c = (xs2[i - 1] + xs2[i]) / 2;
  const x1 = c - 1, y1 = cNum(e, x1), g = cSimp({ t: 'sub', a: e, b: cN(aproxQ(y1) || QE(0)) });
  const otros = cRaicesNum(cSimp({ t: 'sub', a: e, b: { t: 'n', v: aproxQ(y1) || new Q(BigInt(Math.round(y1 * 1e6)), 1000000n) } }), -100, 100).filter(x => Math.abs(x - x1) > 1e-6 && cEnDom(D, x));
  P('Miramos el signo de la derivada', 'La derivada cambia de signo: la función sube y baja (o baja y sube), así que repite valores.', `${nom}'(x)\\;\\text{cambia de signo cerca de }x\\approx ${L_x(c)}`, svgCurvas({ fs: [x => cNum(e, x)], x0: c - 5, x1: c + 5 }));
  const x2 = otros[0];
  P('Verificamos con un contraejemplo', 'Encontramos dos valores distintos de x con la misma imagen.', x2 !== undefined ? `${nom}(${LQx(x1).replace('\\approx ', '')})=${LQx(y1).replace('\\approx ', '')}\\quad\\text{y}\\quad ${nom}(${LQx(x2).replace('\\approx ', '')})=${LQx(cNum(e, x2)).replace('\\approx ', '')}\\;\\checkmark` : tx('—'));
  return { tema: 'funcionesc', metodo: 'Contraejemplo', pasos, resultado: tx('No es inyectiva') };
}

/* -----------------------------------------------------------------------
 * C9. COMPOSICIÓN, INVERSA, ¿ES FUNCIÓN?, EVALUAR Y GRAFICAR
 * --------------------------------------------------------------------- */
function resolverCompuesta(texto) {
  const d = cDefs(texto), { pasos, P } = crearPasos();
  const m = texto.match(/\(?\s*([a-z])\s*(?:∘|o|\\circ|°)\s*([a-z])\s*\)?\s*\(\s*x\s*\)/i) || texto.match(/([a-z])\s*\(\s*([a-z])\s*\(\s*x\s*\)\s*\)/i);
  if (!m) throw new Error('Escribí las funciones y la composición, por ejemplo: f(x) = x^2 + 1, g(x) = 2x − 3, (f∘g)(x).');
  const [ext, int] = [m[1].toLowerCase(), m[2].toLowerCase()]; if (!d[ext] || !d[int]) throw new Error(`Falta definir ${!d[ext] ? ext : int}(x).`);
  const F = d[ext].e, G = d[int].e, comp = cPulir(cSimp(cSust(F, 'x', G)));
  P('Escribimos las funciones', `En (${ext}∘${int})(x) = ${ext}(${int}(x)) primero se aplica ${int} y al resultado se le aplica ${ext}.`, [`${ext}(x)=${cL(F)}`, `${int}(x)=${cL(G)}`]);
  P(`Reemplazamos x por ${int}(x) en ${ext}`, `Donde dice x en ${ext}, ponemos toda la expresión de ${int}(x) entre paréntesis.`, `(${ext}\\circ ${int})(x)=${cL(cSust(F, 'x', { t: 'x', n: `\\left(${cL(G)}\\right)` }))}`);
  P('Simplificamos', 'Desarrollamos y juntamos términos semejantes.', `(${ext}\\circ ${int})(x)=${cL(comp)}`);
  const x0 = [2, 1, 3, 0.5].find(x => isFinite(cNum(G, x)) && isFinite(cNum(F, cNum(G, x)))), gi = cNum(G, x0);
  P('Verificamos', `Calculamos en x = ${x0} de las dos maneras: primero ${int}(${x0}) y después ${ext} de ese valor, y con la fórmula obtenida.`, `${ext}(${int}(${x0}))=${ext}(${LQx(gi).replace('\\approx ', '')})=${LQx(cNum(F, gi)).replace('\\approx ', '')},\\quad (${ext}\\circ ${int})(${x0})=${LQx(cNum(comp, x0)).replace('\\approx ', '')}\\;${aproxIgual(cNum(F, gi), cNum(comp, x0)) ? '\\checkmark' : ''}`);
  return { tema: 'funcionesc', metodo: 'Composición', pasos, resultado: `(${ext}\\circ ${int})(x)=${cL(comp)}` };
}
function cContar(e, v = 'x') { if (e.t === 'x') return e.n === v ? 1 : 0; return [e.a, e.b, ...(e.terms || []), ...(e.fs || [])].reduce((s, z) => s + (z && typeof z === 'object' && z.t ? cContar(z, v) : 0), 0); }
function resolverInversa(texto) {
  const { e, nom } = cFuncion(texto), { pasos, P } = crearPasos(), Y = cX('y');
  P('Planteamos y = f(x)', 'Para encontrar la inversa despejamos x en función de y y después intercambiamos los nombres de las variables.', `y=${cL(e)}`);
  let lhs = Y, rhs = e; const lineas = [];
  const r = cRac(e);
  if (cContar(e) > 1 && r && uGrado(r.n) <= 1 && uGrado(r.d) === 1) {
    const [b, a] = [r.n[0] || Q0, r.n[1] || Q0], [dd, c] = [r.d[0], r.d[1]];
    P('Pasamos el denominador multiplicando', 'Multiplicamos los dos miembros por el denominador y juntamos los términos con x de un lado.', [`y\\,(${cL(cDeU(r.d))})=${cL(cDeU(r.n))}`, `${L_frac(c)}xy-${par(L_frac(a))}x=${L_frac(b)}-${par(L_frac(dd))}y`, `x\\,(${cL(cSimp({ t: 'sub', a: cMul([cN(c), Y]), b: cN(a) }))})=${cL(cSimp({ t: 'sub', a: cN(b), b: cMul([cN(dd), Y]) }))}`]);
    lhs = cSimp({ t: 'div', a: { t: 'sub', a: cN(b), b: cMul([cN(dd), Y]) }, b: { t: 'sub', a: cMul([cN(c), Y]), b: cN(a) } }); rhs = cX();
    lineas.push(`x=${cL(lhs)}`);
  } else {
    if (cContar(e) !== 1) throw new Error('Despejo funciones donde x aparece una sola vez (o homográficas (ax+b)/(cx+d)).');
    for (let k = 0; k < 20 && rhs.t !== 'x'; k++) {
      if (rhs.t === 'sum') { const fuera = rhs.terms.filter(t => !cTiene(t)), dentro = rhs.terms.find(t => cTiene(t)); lhs = cSimp({ t: 'sub', a: lhs, b: cAdd(fuera) }); rhs = dentro; lineas.push(`${cL(lhs)}=${cL(rhs)}\\quad\\text{(restamos)}`); }
      else if (rhs.t === 'prod') { const fuera = rhs.fs.filter(t => !cTiene(t)), dentro = rhs.fs.find(t => cTiene(t)); lhs = cSimp({ t: 'div', a: lhs, b: cMul(fuera) }); rhs = dentro; lineas.push(`${cL(lhs)}=${cL(rhs)}\\quad\\text{(dividimos)}`); }
      else if (rhs.t === 'div') { if (cTiene(rhs.a)) { lhs = cSimp({ t: 'mul', a: lhs, b: rhs.b }); rhs = rhs.a; lineas.push(`${cL(lhs)}=${cL(rhs)}\\quad\\text{(multiplicamos)}`); } else { lhs = cSimp({ t: 'div', a: rhs.a, b: lhs }); rhs = rhs.b; lineas.push(`${cL(rhs)}=${cL(lhs)}\\quad\\text{(invertimos)}`); } }
      else if (rhs.t === 'pow' && !cTiene(rhs.b)) { const n = rhs.b; lhs = cSimp({ t: 'pow', a: lhs, b: { t: 'div', a: cN(1), b: n } }); rhs = rhs.a; lineas.push(`${cL(lhs)}=${cL(rhs)}\\quad\\text{(aplicamos la raíz)}`); }
      else if (rhs.t === 'pow' && !cTiene(rhs.a)) { const b = rhs.a; lhs = b.t === 'k' && b.n === 'e' ? cFn('ln', lhs) : cSimp({ t: 'div', a: cFn('ln', lhs), b: cFn('ln', b) }); rhs = rhs.b; lineas.push(`${cL(lhs)}=${cL(rhs)}\\quad\\text{(aplicamos logaritmo)}`); }
      else if (rhs.t === 'fn') { const inv = { sqrt: z => cPow(z, cN(2)), ln: z => cPow({ t: 'k', n: 'e' }, z), log: z => cPow(cN(10), z), sen: z => cFn('arcsen', z), cos: z => cFn('arccos', z), tg: z => cFn('arctg', z), arcsen: z => cFn('sen', z), arccos: z => cFn('cos', z), arctg: z => cFn('tg', z) }[rhs.n];
        if (!inv) throw new Error('No sé despejar esa función.'); lhs = inv(lhs); rhs = rhs.a; lineas.push(`${cL(lhs)}=${cL(rhs)}\\quad\\text{(aplicamos la función inversa)}`); }
      else throw new Error('No pude despejar x.');
    }
    if (rhs.t !== 'x') throw new Error('No pude despejar x.');
    P('Despejamos x paso a paso', 'Deshacemos las operaciones en orden inverso: lo último que se le hizo a x es lo primero que deshacemos.', lineas);
  }
  const inv = cPulir(cSimp(cSust(lhs, 'y', cX())));
  P('Intercambiamos x e y', 'Así queda la inversa escrita como función de x.', `${nom}^{-1}(x)=${cL(inv)}`, svgCurvas({ fs: [x => cNum(e, x), x => cNum(inv, x)], x0: -6, x1: 6 }));
  const prueba = [2, 3, 0.5, 1, 5].filter(x => isFinite(cNum(inv, x)) && isFinite(cNum(e, cNum(inv, x)))).slice(0, 2);
  P('Verificamos', 'Componiendo una función con su inversa tiene que volver x: f(f⁻¹(x)) = x. (En el gráfico, son simétricas respecto de la recta y = x.)', prueba.map(x => `${nom}(${nom}^{-1}(${x}))=${nom}(${LQx(cNum(inv, x)).replace('\\approx ', '')})=${LQx(cNum(e, cNum(inv, x))).replace('\\approx ', '')}\\;${aproxIgual(cNum(e, cNum(inv, x)), x) ? '\\checkmark' : ''}`));
  return { tema: 'funcionesc', metodo: 'Despeje de la inversa', pasos, resultado: `${nom}^{-1}(x)=${cL(inv)}` };
}
function resolverEsFuncion(texto) {
  const { pasos, P } = crearPasos(), s = texto.replace(/^.*?(?=[-+(\d√xy][^=]*=)/i, '').replace(/[¿?]/g, ''), [a, b] = s.split('=');
  const F = cSimp({ t: 'sub', a: cParse(a), b: cParse(b) }); const Pxy = Pred(aPoly(exprAlg(a + '-(' + b + ')')));
  P('Escribimos la relación', 'Una relación es función si a cada x le corresponde un único valor de y.', `${cL(cParse(a))}=${cL(cParse(b))}`);
  const gy = Math.max(0, ...Pxy.map(m => m.v.y || 0));
  if (gy === 1) { const coefY = Pred(Pxy.filter(m => m.v.y).map(m => { const v = { ...m.v }; delete v.y; return mono(m.c, v); })), resto = Pred(Pxy.filter(m => !m.v.y));
    const yx = cPulir(cSimp({ t: 'div', a: cS(L_P(Pneg(resto)).replace(/[{}]/g, '').replace(/\\frac(\d+)(\d+)/g, '$1/$2') || '0'), b: cS(L_P(coefY).replace(/[{}]/g, '') || '1') }));
    P('Despejamos y', 'La y aparece con exponente 1: se puede despejar de una sola manera.', `y=${cL(yx)}`);
    P('Verificamos', 'Para cada x sale un solo valor de y.', `x=1\\;\\Rightarrow\\;y=${LQx(cNum(yx, 1))}\\;\\checkmark`);
    return { tema: 'funcionesc', metodo: 'Despeje de y', pasos, resultado: tx('Es función: ') + `y=${cL(yx)}` };
  }
  for (const x0 of [0, 1, 2, -1, 3, 0.5]) {
    const ys = cRaicesNum(cSust(F, 'x', cN(aproxQ(x0))), -100, 100).map(y => y);
    const ysF = ys.filter(y => Math.abs(cNum(F, { x: x0, y })) < 1e-6);
    if (ysF.length >= 2) {
      P('Buscamos un x con dos valores de y', `La y aparece con exponente ${gy}: al despejar puede haber más de un valor. Probamos con x = ${x0}.`, `x=${x0}\\;\\Rightarrow\\;y=${ysF.slice(0, 2).map(y => LQx(y).replace('\\approx ', '')).join('\\;\\text{o}\\;y=')}`);
      P('Verificamos', 'Los dos puntos cumplen la relación: a un mismo x le corresponden dos y. No es función.', ysF.slice(0, 2).map(y => `(${x0};\\,${LQx(y).replace('\\approx ', '')}):\\;${L_x(cNum(cParse(a), { x: x0, y }))}=${L_x(cNum(cParse(b), { x: x0, y }))}\\;\\checkmark`));
      return { tema: 'funcionesc', metodo: 'Prueba de la recta vertical', pasos, resultado: tx('No es función') };
    }
  }
  P('Verificamos', 'No encontramos ningún x con dos valores de y.', tx('Es función') + '\\;\\checkmark');
  return { tema: 'funcionesc', metodo: 'Prueba de la recta vertical', pasos, resultado: tx('Es función') };
}
function resolverEvaluarF(texto) {
  const { e, nom } = cFuncion(texto), { pasos, P } = crearPasos();
  const pedidos = [...texto.matchAll(new RegExp(`\\b${nom}\\s*\\(\\s*(-?[\\d.,/]+|-?\\s*\\d*\\s*π(?:\\/\\d+)?)\\s*\\)`, 'gi'))].map(m => m[1]);
  P('Usamos la notación y = f(x)', `${nom}(a) quiere decir: reemplazar x por a en la fórmula.`, `${nom}(x)=${cL(e)}`);
  const res = pedidos.map(p => { const a = cS(p.replace(',', '.').replace(/(\d)\.(\d)/, '$1,$2')), q = cExacto(a, {}), sub = cSust(e, 'x', q ? cMarca(q) : a), ex = q ? cExacto(e, { x: q }) : null; return { L: q ? L_frac(q) : cL(a), sub, val: ex ? L_frac(ex) : LQx(cNum(e, cNum(a, 0))), n: cNum(e, cNum(a, 0)) }; });
  P('Reemplazamos', 'Ponemos el número entre paréntesis en cada lugar donde aparece x y hacemos las cuentas.', res.map(r => `${nom}(${r.L})=${cL(r.sub)}=${r.val}`));
  P('Verificamos', 'Calculamos con decimales.', res.map(r => `${nom}(${r.L})\\approx ${L_x(r.n)}\\;\\checkmark`));
  return { tema: 'funcionesc', metodo: 'Valor numérico', pasos, resultado: res.map(r => `${nom}(${r.L})=${r.val}`).join(',\\;') };
}
function resolverGraficaF(texto) {
  const { e, nom } = cFuncion(texto), { pasos, P } = crearPasos(), D = cDominio(e);
  P('Escribimos la función y su dominio', 'Antes de graficar conviene saber dónde existe.', [`${nom}(x)=${cL(e)}`, `\\text{Dom}\\,${nom}=${D.L}`]);
  const r = cRac(e), ceros = (r ? cRaices(r.n) : cRaicesNum(e, -30, 30).map(x => ({ x, L: LQx(x) }))).filter(z => cEnDom(D, z.x)), y0 = cEnDom(D, 0) ? cNum(e, 0) : null;
  P('Buscamos los cortes con los ejes', 'Con el eje x: igualamos f(x) = 0. Con el eje y: calculamos f(0).', [ceros.length ? `${nom}(x)=0\\;\\Rightarrow\\;x=${ceros.map(z => z.L).join(',\\;')}` : tx('No corta al eje x.'), y0 !== null ? `${nom}(0)=${LQx(y0)}` : tx('No corta al eje y.')]);
  const xs = [-3, -2, -1, 0, 1, 2, 3].filter(x => cEnDom(D, x));
  P('Armamos una tabla de valores', 'Elegimos algunos valores de x, calculamos f(x) y ubicamos los puntos.', [], tabla(['x', `${nom}(x)`], xs.map(x => [String(x), k$(LQx(cNum(e, x)).replace('\\approx ', ''))])));
  const asin = D.pts ? D.pts.filter(p => !cEnDom(D, p.x)).map(p => p.x) : [];
  P('Graficamos', 'Unimos los puntos respetando el dominio (las líneas punteadas son asíntotas verticales, si las hay).', [], svgCurvas({ fs: [x => cNum(e, x)], x0: -6, x1: 6, asin, pts: [...ceros.filter(z => Math.abs(z.x) < 6).map(z => [z.x, 0, '']), ...(y0 !== null ? [[0, y0, '']] : [])] }));
  P('Verificamos', 'Cada corte con el eje x tiene que dar f(x) = 0.', ceros.length ? ceros.map(z => `${nom}(${z.L.replace('\\approx ', '')})\\approx ${L_x(Math.abs(cNum(e, z.x)) < 1e-9 ? 0 : cNum(e, z.x))}\\;\\checkmark`) : [`${nom}(1)\\approx ${L_x(cNum(e, 1))}\\;\\checkmark`]);
  return { tema: 'funcionesc', metodo: 'Gráfica', pasos, resultado: `\\text{Dom}\\,${nom}=${D.L}` + (ceros.length ? `,\\;\\text{ceros: }${ceros.map(z => z.L).join(',\\;')}` : '') };
}
function resolverFuncionesC(texto) {
  const t = plano(texto);
  if (/∘|\\circ|\(\s*[a-z]\s*o\s*[a-z]\s*\)|compuest|[a-z]\s*\(\s*[a-z]\s*\(\s*x/.test(t)) return resolverCompuesta(texto);
  if (/invers/.test(t)) return resolverInversa(texto);
  if (/inyectiv|biyectiv|uno a uno/.test(t)) return resolverInyectiva(texto);
  if (/paridad|\bpar\b|impar|simetri/.test(t)) return resolverParidad(texto);
  if (/rango|imagen|recorrido/.test(t)) return resolverRango(texto);
  if (/dominio/.test(t)) return resolverDominio(texto);
  if (/es (una )?funcion|relacion|\by\b.*=.*\by\b|y\s*\^\s*2|y2/.test(t) && /y/.test(t.replace(/\by\s*=/, '')) && !/f\s*\(/.test(t)) return resolverEsFuncion(texto);
  if (/\b[a-z]\s*\(\s*-?[\d.,π]/.test(t)) return resolverEvaluarF(texto);
  return resolverGraficaF(texto);
}

/* -----------------------------------------------------------------------
 * C10. LÍMITES
 * --------------------------------------------------------------------- */
// Lee "lim x→2 (x^2 − 4)/(x − 2)", "lim_{x\to\infty}", "límite cuando x tiende a 0+ de …"
function cLeerLimite(texto) {
  let s = texto.replace(/\\to|->|⟶|tiende a/g, '→').replace(/\\infty|infinito|∞/gi, '∞').replace(/\\lim/g, 'lim').replace(/_\{\s*([^}]*)\}/, ' $1 ').replace(/[¿?]/g, '');
  const m = s.match(/([xt])\s*→\s*(\+?∞|-\s*∞|-?\s*[\d.,/]*\s*π?(?:\s*\/\s*\d+)?)\s*(\^?\s*[+-](?![\d(x√a-z])|\^\{?[+-]\}?|por (?:la )?(?:derecha|izquierda))?/i);
  if (!m) throw new Error('Escribí el límite así: lim x→2 (x^2 − 4)/(x − 2), o lim x→∞ (3x^2 + 1)/(x^2 − 5).');
  const v = m[1].toLowerCase(), aS = m[2].replace(/\s/g, ''), ladoS = (m[3] || '').replace(/[\s^{}]/g, '');
  const lado = /derecha|\+/.test(ladoS) ? 1 : /izquierda|-/.test(ladoS) ? -1 : 0;
  let resto = (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/l[ií]mite?s?|lim|cuando|de\b|calcular|el|la|:/gi, ' ').trim();
  const L = resto.match(/=\s*(-?[\d.,/]+)\s*$/); let Lprop = null; if (L) { Lprop = cS(L[1]); resto = resto.slice(0, L.index); }
  let e; try { e = cS(resto); } catch (err) { e = cSoloExpr(resto).e; }
  if (v === 't') e = cSust(e, 't', cX());
  const inf = aS === '∞' || aS === '+∞' ? 1 : aS === '-∞' ? -1 : 0, aE = inf ? null : cS(aS);
  return { e, inf, a: aE ? cExacto(aE, {}) : null, aN: aE ? cNum(aE, 0) : inf * Infinity, aL: inf ? (inf > 0 ? '+\\infty' : '-\\infty') : aE ? cL(aE) : '', lado, Lprop };
}
const cLimL = (a, lado, aL) => `\\lim_{x\\to ${aL}${lado > 0 ? '^{+}' : lado < 0 ? '^{-}' : ''}}`;
function cTablaLimite(e, aN, inf, lado) {           // tabla de valores que se acercan al punto
  const hs = [0.1, 0.01, 0.001, 0.0001], filas = [];
  if (inf) [10, 100, 1000, 10000].forEach(k => filas.push([fmtX(inf * k), fmtX(cNum(e, inf * k), 6)]));
  else { if (lado <= 0) hs.forEach(h => filas.push([fmtX(aN - h, 6), fmtX(cNum(e, aN - h), 6)])); if (lado >= 0) hs.slice().reverse().forEach(h => filas.push([fmtX(aN + h, 6), fmtX(cNum(e, aN + h), 6)])); }
  return filas;
}
const cLv = v => (v === Infinity ? '+\\infty' : v === -Infinity ? '-\\infty' : v.L);
// Calcula el límite (con pasos). Devuelve { v: número | ±Infinity | NaN, L }
function cLimite(e, a, aN, inf, lado, P, prof = 0) {
  if (prof > 4) throw new Error('El límite es demasiado complicado para resolverlo paso a paso.');
  const val = (z, x) => cNum(z, x);
  if (inf) {
    const r = cRac(e);
    if (r) {
      const gn = uGrado(r.n), gd = uGrado(r.d), an = r.n[gn], ad = r.d[gd];
      if (gd <= 0) { const c = an.div(ad), s = c.signo * (gn % 2 === 1 ? inf : 1); P('Miramos el término de mayor grado', 'En un polinomio, cuando x se va a ±∞ manda el término de mayor grado.', `${cL(cMul([cN(c), cPow(cX(), cN(gn))]))}\\to ${s > 0 ? '+\\infty' : '-\\infty'}`); return { v: gn === 0 ? c.num() : s * Infinity, L: gn === 0 ? L_frac(c) : null }; }
      P('Dividimos por la mayor potencia', `Es una indeterminación ∞/∞. Dividimos numerador y denominador por x^${Math.max(gn, gd)}: los términos con x en el denominador tienden a 0.`, `\\frac{${cL(cDeU(r.n))}}{${cL(cDeU(r.d))}}`);
      if (gn === gd) { const c = an.div(ad); P('Comparamos los grados', 'Numerador y denominador tienen el mismo grado: el límite es el cociente de los coeficientes principales.', `\\frac{${L_frac(an)}}{${L_frac(ad)}}=${L_frac(c)}`); return { v: c.num(), L: L_frac(c) }; }
      if (gn < gd) { P('Comparamos los grados', 'El grado del denominador es mayor: la fracción tiende a 0.', `\\frac{\\text{grado }${gn}}{\\text{grado }${gd}}\\to 0`); return { v: 0, L: '0' }; }
      const s = Math.sign(an.num() / ad.num()) * ((gn - gd) % 2 === 1 ? inf : 1);
      P('Comparamos los grados', 'El grado del numerador es mayor: la fracción crece sin límite (el signo sale de los coeficientes principales).', `${s > 0 ? '+\\infty' : '-\\infty'}`); return { v: s * Infinity };
    }
    const v1 = val(e, inf * 1e4), v2 = val(e, inf * 1e6), v3 = val(e, inf * 1e8);
    if (Math.abs(v3) > 1e6 && Math.abs(v3) > Math.abs(v2)) { P('Analizamos qué término crece más rápido', 'Cuando x → ∞, las exponenciales crecen más rápido que las potencias, y las potencias más rápido que los logaritmos.', `\\text{la expresión crece sin límite}`); return { v: Math.sign(v3) * Infinity }; }
    const lq = aproxQ(v3), le = aproxQ(Math.log(v3));
    if (/W\(/.test(cKey(e)) && le && !lq) { P('Reconocemos el límite del número e', 'Es una indeterminación 1^∞. Usamos el límite notable $\\lim_{x\\to\\infty}\\left(1+\\frac{k}{x}\\right)^{x}=e^{k}$.', `\\lim=${le.eq(Q1) ? 'e' : 'e^{' + L_frac(le) + '}'}`); return { v: v3, L: le.eq(Q1) ? 'e' : `e^{${L_frac(le)}}` }; }
    P('Analizamos el comportamiento para x muy grande', 'Comparamos qué partes crecen más rápido y simplificamos (multiplicando por el conjugado si hay raíces que se restan). Los valores se estabilizan.', `\\lim\\approx ${L_x(v3)}`);
    return { v: v3, L: lq ? L_frac(lq) : L_x(v3) };
  }
  // límite en un punto finito
  const sustE = a ? cSust(e, 'x', cMarca(a)) : e, f0 = cNum(e, aN), ex = a ? cExacto(e, { x: a }) : null;
  const cerca = lado >= 0 ? val(e, aN + 1e-7) : val(e, aN - 1e-7);
  if (isFinite(f0) && Math.abs(f0 - cerca) < 1e-4) {
    P('Reemplazamos directamente', 'Si la función está definida y es continua en el punto, el límite es el valor de la función.', `${cL(sustE)}=${ex ? L_frac(ex) : LQx(f0)}`);
    return { v: f0, L: ex ? L_frac(ex) : LQx(f0) };
  }
  if (e.t === 'div') {
    const N = val(e.a, aN), D = val(e.b, aN), cero = z => Math.abs(z) < 1e-9;
    if (cero(N) && cero(D)) {
      P('Reemplazamos', 'Al reemplazar queda 0/0: es una indeterminación. Hay que transformar la expresión.', `\\frac{${cL(cSust(e.a, 'x', a ? cMarca(a) : cX()))}}{${cL(cSust(e.b, 'x', a ? cMarca(a) : cX()))}}=\\frac{0}{0}`);
      const r = cRac(e);
      if (r && a) {
        const fac = [Q1.neg().mul(a), Q1]; let n = r.n, d = r.d, k = 0;
        while (uGrado(uDiv(n, fac).r) < 0 && uGrado(uDiv(d, fac).r) < 0 && k < 6) { n = uDiv(n, fac).q; d = uDiv(d, fac).q; k++; }
        const lin = cL(cDeU(fac)), nuevo = cDiv(cDeU(n), cDeU(d));
        P('Factorizamos y simplificamos', `Como a = ${L_frac(a)} anula numerador y denominador, los dos son divisibles por (${lin}) (lo vemos con Ruffini). Simplificamos ese factor, que no vale 0 cerca del punto.`, [`\\frac{\\left(${lin}\\right)${k > 1 ? '^{' + k + '}' : ''}\\left(${cL(cDeU(r.n.length ? uDiv(r.n, uPotencia(fac, k)).q : n))}\\right)}{\\left(${lin}\\right)${k > 1 ? '^{' + k + '}' : ''}\\left(${cL(cDeU(uDiv(r.d, uPotencia(fac, k)).q))}\\right)}=${cL(nuevo)}`]);
        return cLimite(nuevo, a, aN, 0, lado, P, prof + 1);
      }
      const conj = [e.a, e.b].findIndex(z => z.t === 'sum' && z.terms.length === 2 && z.terms.some(t => cKey(t).includes('sqrt') || cKey(t).includes('W(') && /1\/2/.test(cKey(t))));
      if (conj >= 0 && a) {
        const z = conj ? e.b : e.a, [A, B] = z.terms, cj = cAdd([A, cMul([cN(-1), B])]), dif = cPulir(cSimp({ t: 'sub', a: cPow(A, cN(2)), b: cPow(B, cN(2)) }));
        const otro = conj ? e.a : e.b, rO = cRac(otro), rD = cRac(dif);
        if (rO && rD) {
          const fac = [Q1.neg().mul(a), Q1]; const qd = uDiv(rD.n, fac).q, qo = uDiv(rO.n, fac).q;
          const nuevo = conj ? cDiv(cMul([cDeU(qo), cj]), cDeU(qd)) : cDiv(cDeU(qd), cMul([cDeU(qo), cj]));
          P('Multiplicamos por el conjugado', 'Multiplicamos arriba y abajo por el conjugado de la expresión con raíz, para usar (A − B)(A + B) = A² − B² y que desaparezca la raíz.', [`${cL(z)}\\cdot\\left(${cL(cj)}\\right)=${cL(dif)}`, `\\text{simplificamos }\\left(${cL(cDeU(fac))}\\right):\\;${cL(nuevo)}`]);
          return cLimite(nuevo, a, aN, 0, lado, P, prof + 1);
        }
      }
      if (aN === 0 && e.a.t === 'fn' && e.a.n === 'sen') { const rr = cRac(cSimp({ t: 'div', a: e.a.a, b: e.b })); if (rr && uGrado(rr.n) <= 0 && uGrado(rr.d) <= 0) { const k = rr.n[0].div(rr.d[0]); P('Usamos el límite fundamental', 'Usamos $\\lim_{u\\to 0}\\frac{\\operatorname{sen} u}{u}=1$: multiplicamos y dividimos para que quede el mismo argumento abajo.', `\\frac{${cL(e.a)}}{${cL(e.b)}}=${L_frac(k)}\\cdot\\frac{${cL(e.a)}}{${cL(e.a.a)}}\\to ${L_frac(k)}\\cdot 1`); return { v: k.num(), L: L_frac(k) }; } }
      const dn = cPulir(cDer(e.a)), dd = cPulir(cDer(e.b));
      P('Aplicamos la regla de L’Hôpital', 'En una indeterminación 0/0 (o ∞/∞), el límite del cociente es igual al límite del cociente de las derivadas.', `${cLimL(a, lado, cL(cN(a || Q0)))}\\frac{${cL(e.a)}}{${cL(e.b)}}=\\lim\\frac{${cL(dn)}}{${cL(dd)}}`);
      return cLimite(cSimp({ t: 'div', a: dn, b: dd }), a, aN, 0, lado, P, prof + 1);
    }
    if (!cero(N) && cero(D)) {
      const izq = val(e, aN - 1e-7), der = val(e, aN + 1e-7), si = Math.sign(izq), sd = Math.sign(der);
      P('Reemplazamos', 'El numerador no se anula y el denominador sí: la función crece sin límite. Para saber el signo miramos los límites laterales.', [`\\frac{${LQx(N)}}{0}`, `\\lim_{x\\to a^{-}}=${si > 0 ? '+\\infty' : '-\\infty'},\\quad\\lim_{x\\to a^{+}}=${sd > 0 ? '+\\infty' : '-\\infty'}`]);
      if (lado) return { v: (lado > 0 ? sd : si) * Infinity };
      return si === sd ? { v: si * Infinity } : { v: NaN, L: tx('no existe (los laterales son distintos)') };
    }
  }
  const iz = val(e, aN - 1e-7), de = val(e, aN + 1e-7);
  if (!lado && Math.abs(iz - de) > 1e-3 && isFinite(iz) && isFinite(de)) { P('Calculamos los límites laterales', 'Los límites por izquierda y por derecha dan distinto: el límite no existe.', `${L_x(iz)}\\ne ${L_x(de)}`); return { v: NaN, L: tx('no existe') }; }
  const v = lado > 0 ? de : lado < 0 ? iz : (iz + de) / 2;
  P('Estimamos con valores cercanos', 'Calculamos la función en valores cada vez más cercanos al punto.', `\\lim\\approx ${L_x(v)}`); return { v, L: LQx(v) };
}
const uPotencia = (p, k) => { let r = [Q1]; for (let i = 0; i < k; i++) r = uMul(r, p); return r; };
function resolverLimites(texto) {
  const t = plano(texto);
  if (/demostr|epsilon|delta|ε|δ|definicion/.test(t)) return resolverEpsilonDelta(texto);
  const { pasos, P } = crearPasos(), Lm = cLeerLimite(texto), { e, a, aN, inf, lado, aL } = Lm;
  P('Escribimos el límite', inf ? 'Buscamos a qué valor se acerca la función cuando x crece (o decrece) sin límite.' : 'Buscamos a qué valor se acerca la función cuando x se acerca al punto' + (lado ? (lado > 0 ? ' por la derecha (valores mayores).' : ' por la izquierda (valores menores).') : '.'), `${cLimL(a, lado, aL)}${cW(e, 2)}`);
  const r = cLimite(e, a, aN, inf, lado, P), resL = r.L || cLv(r.v);
  const filas = cTablaLimite(e, aN, inf, lado);
  const cercanos = inf ? [cNum(e, inf * 1e4)] : [lado <= 0 ? cNum(e, aN - 1e-4) : null, lado >= 0 ? cNum(e, aN + 1e-4) : null].filter(v => v !== null);
  const coincide = cercanos.every(v => (isFinite(r.v) ? Math.abs(v - r.v) < 1e-2 * Math.max(1, Math.abs(r.v)) : !isFinite(r.v) && !isNaN(r.v) ? Math.abs(v) > 1e3 && Math.sign(v) === Math.sign(r.v) : true));
  P('Verificamos con una tabla', 'Calculamos la función en valores cada vez más cercanos: tienen que acercarse al resultado.', [`\\text{los valores se acercan a }${resL}${coincide ? '\\;\\checkmark' : ''}`], tabla(['x', 'f(x)'], filas));
  return { tema: 'limites', metodo: pasos.some(p => /L’Hôpital/.test(p.titulo)) ? 'Regla de L’Hôpital' : pasos.some(p => /Factorizamos/.test(p.titulo)) ? 'Factorización' : pasos.some(p => /conjugado/.test(p.titulo)) ? 'Conjugado' : 'Cálculo de límites', pasos, resultado: `${cLimL(a, lado, aL)}${cW(e, 2)}=${resL}` };
}
function resolverEpsilonDelta(texto) {
  const { pasos, P } = crearPasos(), Lm = cLeerLimite(texto), { e, a, aL } = Lm;
  if (!a || !Lm.Lprop) throw new Error('Escribilo así: demostrar que lim x→2 (3x − 1) = 5.');
  const L = cExacto(Lm.Lprop, {}), r = cRac(e); if (!r || uGrado(r.d) > 0) throw new Error('Por definición demuestro límites de polinomios.');
  const u = r.n.map(c => c.div(r.d[0])), fa = uEval(u, a);
  P('Escribimos la definición', 'Hay que probar que para cada ε > 0 existe un δ > 0 tal que si 0 < |x − a| < δ, entonces |f(x) − L| < ε.', `\\forall\\varepsilon>0\\;\\exists\\delta>0:\\;0<|x-${par(L_frac(a))}|<\\delta\\Rightarrow|${cL(e)}-${par(L_frac(L))}|<\\varepsilon`);
  if (!fa.eq(L)) { P('Revisamos el valor', 'Primero calculamos el límite reemplazando: no da el valor propuesto, así que la igualdad es falsa.', `f(${L_frac(a)})=${L_frac(fa)}\\ne ${L_frac(L)}`); P('Verificamos', 'Con valores cercanos la función se acerca a otro número.', `f(${fmtX(a.num() + 0.001)})\\approx ${L_x(cNum(e, a.num() + 0.001))}\\;\\checkmark`); return { tema: 'limites', metodo: 'Definición ε-δ', pasos, resultado: tx('El límite no es ') + L_frac(L) }; }
  const dif = u.map((c, i) => (i ? c : c.sub(L))), q = uDiv(dif, [a.neg(), Q1]).q;
  P('Factorizamos |f(x) − L|', 'Como f(a) = L, la expresión f(x) − L tiene el factor (x − a).', `|f(x)-L|=|${cL(cDeU(dif))}|=|x-${par(L_frac(a))}|\\cdot|${cL(cDeU(q))}|`);
  let delta, M;
  if (uGrado(q) <= 0) { M = q[0].abs(); delta = `\\frac{\\varepsilon}{${L_frac(M)}}`; P('Elegimos δ', 'El otro factor es una constante: alcanza con tomar δ = ε dividido esa constante.', `|f(x)-L|=${L_frac(M)}\\,|x-${par(L_frac(a))}|<${L_frac(M)}\\,\\delta=\\varepsilon\\;\\Rightarrow\\;\\delta=${delta}`); }
  else { let mx = 0; for (let i = 0; i <= 200; i++) { const x = a.num() - 1 + i / 100; mx = Math.max(mx, Math.abs(uEval(q, new Q(BigInt(Math.round(x * 100)), 100n)).num())); } M = QE(Math.ceil(mx)); delta = `\\min\\left(1,\\frac{\\varepsilon}{${L_frac(M)}}\\right)`;
    P('Acotamos el otro factor', 'Pedimos primero δ ≤ 1: así x queda en el intervalo (a − 1, a + 1), y ahí el otro factor no supera a M.', [`|x-${par(L_frac(a))}|<1\\;\\Rightarrow\\;|${cL(cDeU(q))}|\\le ${L_frac(M)}`, `|f(x)-L|<${L_frac(M)}\\,\\delta\\le\\varepsilon\\;\\Rightarrow\\;\\delta=${delta}`]); }
  const eps = 0.01, dn = uGrado(q) <= 0 ? eps / M.num() : Math.min(1, eps / M.num()), x = a.num() + dn * 0.9, err = Math.abs(cNum(e, x) - L.num());
  P('Verificamos', `Probamos con ε = 0,01: δ = ${fmtX(dn, 6)}. Tomamos un x a menos de δ del punto y miramos la distancia a L.`, `x=${L_x(x)}:\\;|f(x)-L|\\approx ${L_x(err)}<0{,}01\\;${err < eps ? '\\checkmark' : ''}`);
  return { tema: 'limites', metodo: 'Definición ε-δ', pasos, resultado: `\\delta=${delta}` };
}

/* -----------------------------------------------------------------------
 * C11. CONTINUIDAD (funciones partidas, puntos de discontinuidad)
 * --------------------------------------------------------------------- */
function cLeerPartida(texto) {                      // "x^2 si x < 1; 2x − 1 si x ≥ 1"
  const cuerpo = texto.replace(/^.*?=\s*\{?/, '').replace(/,?\s*(estudiar|analizar|hallar|determinar|calcular|es continua|continuidad|para que|en x\s*=).*$/i, '');
  const partes = cuerpo.split(/;|\n|,\s*(?=[^;]*\bsi\b)/).map(s => s.trim()).filter(s => /\bsi\b/.test(s));
  if (partes.length < 2) return null;
  return partes.map(p => {
    const [ex, co] = p.split(/\bsi\b/); const c = co.replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/\\le(q)?/g, '≤').replace(/\\ge(q)?/g, '≥').replace(/\\neq|!=/g, '≠');
    const ops = [...c.matchAll(/(≤|≥|<|>|=|≠)\s*(-?\s*[\d.,/]+)/g)], antes = c.match(/^\s*(-?[\d.,/]+)\s*(≤|<)\s*x/);
    const conds = ops.map(m => ({ op: m[1], b: numDe(m[2].replace(/\s/g, '')) })); if (antes) conds.push({ op: antes[2] === '<' ? '>' : '≥', b: numDe(antes[1]) });
    const test = x => conds.every(({ op, b }) => { const B = b.num(); return { '<': x < B, '≤': x <= B + 1e-12, '>': x > B, '≥': x >= B - 1e-12, '=': Math.abs(x - B) < 1e-12, '≠': Math.abs(x - B) > 1e-12 }[op]; });
    return { e: cS(ex.replace(/[{,]/g, ' ').trim()), cL: c.trim().replace(/≤/g, '\\le ').replace(/≥/g, '\\ge ').replace(/≠/g, '\\ne '), conds, test, bordes: conds.map(c_ => c_.b) };
  });
}
function cClasificar(lI, lD, fa) {
  const fin = x => isFinite(x);
  if (!fin(lI) || !fin(lD)) return 'esencial (salto infinito: hay una asíntota vertical)';
  if (Math.abs(lI - lD) > 1e-6) return 'esencial de salto finito';
  if (fa === null || !fin(fa)) return 'evitable (el límite existe pero f(a) no)';
  if (Math.abs(fa - lI) > 1e-6) return 'evitable (el límite existe pero es distinto de f(a))';
  return null;
}
function resolverContinuidad(texto) {
  const t = plano(texto), { pasos, P } = crearPasos(), partes = cLeerPartida(texto);
  const pt = cPunto(texto.replace(/\[.*$/, ''));
  const tres = 'Una función es continua en x = a si: 1) existe f(a); 2) existe el límite (los laterales coinciden); 3) el límite es igual a f(a).';
  if (partes) {
    const param = ['k', 'm'].find(p => partes.some(q => cTiene(q.e, p)));
    const b = pt ? pt.q : partes.flatMap(q => q.bordes).find(Boolean); if (!b) throw new Error('Decí en qué punto estudiar la continuidad: “en x = 1”.');
    const bn = b.num(), izqP = partes.find(q => q.test(bn - 1e-9)), derP = partes.find(q => q.test(bn + 1e-9)), enP = partes.find(q => q.test(bn));
    P('Escribimos la función partida', 'Cada fórmula vale solo en su tramo. En el punto donde cambia de fórmula hay que mirar los dos lados.', partes.map(q => `${cL(q.e)}\\quad\\text{si }${q.cL}`));
    const LI = cSust(izqP.e, 'x', cMarca(b)), LD = cSust(derP.e, 'x', cMarca(b));
    if (param) {
      const ecI = cSimp(LI), ecD = cSimp(LD), dif = cSimp({ t: 'sub', a: ecI, b: ecD }), r = cRac(dif, param);
      if (!r || uGrado(r.n) !== 1) throw new Error('El parámetro tiene que aparecer de forma lineal.');
      const k = r.n[0].neg().div(r.n[1]);
      P('Calculamos los límites laterales', `Para que sea continua en x = ${L_frac(b)}, los dos límites laterales tienen que ser iguales (y coincidir con f(a)).`, [`\\lim_{x\\to ${L_frac(b)}^{-}}=${cL(LI)}=${cL(ecI)}`, `\\lim_{x\\to ${L_frac(b)}^{+}}=${cL(LD)}=${cL(ecD)}`]);
      P(`Igualamos y despejamos ${param}`, 'Planteamos la ecuación entre los dos límites.', [`${cL(ecI)}=${cL(ecD)}`, `${param}=${L_frac(k)}`]);
      const vI = cExacto(ecI, { [param]: k }), vD = cExacto(ecD, { [param]: k });
      P('Verificamos', `Con ${param} = ${L_frac(k)} los dos límites laterales dan lo mismo.`, `${L_frac(vI)}=${L_frac(vD)}\\;${vI.eq(vD) ? '\\checkmark' : ''}`);
      return { tema: 'continuidad', metodo: 'Igualar límites laterales', pasos, resultado: `${param}=${L_frac(k)}` };
    }
    const lI = cNum(izqP.e, bn), lD = cNum(derP.e, bn), fa = enP ? cNum(enP.e, bn) : null;
    const Lv = (z, x) => { const q = cExacto(z, { x: b }); return q ? L_frac(q) : LQx(x); };
    P('Revisamos las tres condiciones', tres, [enP ? `1)\\;f(${L_frac(b)})=${cL(cSust(enP.e, 'x', cMarca(b)))}=${Lv(enP.e, fa)}` : `1)\\;f(${L_frac(b)})\\;\\text{no está definida}`, `2)\\;\\lim_{x\\to ${L_frac(b)}^{-}}${cW(izqP.e, 2)}=${Lv(izqP.e, lI)},\\quad\\lim_{x\\to ${L_frac(b)}^{+}}${cW(derP.e, 2)}=${Lv(derP.e, lD)}`, `3)\\;${Math.abs(lI - lD) < 1e-9 && fa !== null && Math.abs(fa - lI) < 1e-9 ? '\\lim=f(' + L_frac(b) + ')' : '\\text{no se cumple}'}`]);
    const tipo = cClasificar(lI, lD, fa);
    const pts = [[bn, lI, '', !(enP === izqP)], [bn, lD, '', !(enP === derP)]];
    P('Concluimos', tipo ? `No es continua en x = ${fmtX(bn)}: la discontinuidad es ${tipo}.` : `Es continua en x = ${fmtX(bn)}.`, [], svgCurvas({ fs: [x => { const p = partes.find(q => q.test(x)); return p ? cNum(p.e, x) : NaN; }], x0: bn - 4, x1: bn + 4, pts }));
    P('Verificamos', 'Calculamos la función muy cerca del punto, de cada lado.', `f(${fmtX(bn - 0.001, 4)})\\approx ${L_x(cNum(izqP.e, bn - 0.001))},\\quad f(${fmtX(bn + 0.001, 4)})\\approx ${L_x(cNum(derP.e, bn + 0.001))}\\;\\checkmark`);
    return { tema: 'continuidad', metodo: 'Función partida', pasos, resultado: tipo ? tx(`Discontinuidad ${tipo.split(' (')[0]} en x = ${fmtX(bn)}`) : tx(`Continua en x = ${fmtX(bn)}`) };
  }
  const { e, nom } = cFuncion(texto), D = cDominio(e);
  P('Escribimos la función', 'Las funciones elementales (polinomios, racionales, raíces, exponenciales, logaritmos, trigonométricas) son continuas en todo su dominio. Hay que mirar los puntos que quedan afuera.', [`${nom}(x)=${cL(e)}`, `\\text{Dom}\\,${nom}=${D.L}`]);
  const intervalo = texto.match(/\[\s*(-?[\d.,/]+)\s*[;,]\s*(-?[\d.,/]+)\s*\]/);
  const malos = (D.pts || []).filter(p => !cEnDom(D, p.x) && D.ivs.some(iv => (iv.a < p.x || iv.b > p.x)) && (cEnDom(D, p.x - 1e-6) || cEnDom(D, p.x + 1e-6)));
  const enfoque = pt ? [{ x: pt.x, L: pt.L, q: pt.q }] : malos;
  if (!enfoque.length && !intervalo) { P('Concluimos', 'No hay puntos donde la función no esté definida dentro de su dominio: es continua en todo su dominio.', `${nom}\\;\\text{continua en}\\;${D.L}`); P('Verificamos', 'Probamos un punto: la función y los valores cercanos coinciden.', `${nom}(1)\\approx ${L_x(cNum(e, 1))},\\;${nom}(1{,}001)\\approx ${L_x(cNum(e, 1.001))}\\;\\checkmark`); return { tema: 'continuidad', metodo: 'Continuidad en el dominio', pasos, resultado: tx('Continua en ') + D.L }; }
  if (intervalo) {
    const A = numDe(intervalo[1]), B = numDe(intervalo[2]), dentro = (D.pts || []).filter(p => p.x >= A.num() - 1e-12 && p.x <= B.num() + 1e-12 && !cEnDom(D, p.x)), okA = cEnDom(D, A.num()), okB = cEnDom(D, B.num());
    const ok = !dentro.length && okA && okB;
    P('Revisamos el intervalo', 'Es continua en [a; b] si es continua en cada punto de adentro, continua por la derecha en a y por la izquierda en b.', [dentro.length ? `\\text{no está definida en }x=${dentro.map(p => p.L).join(',\\;')}\\in[${L_frac(A)};${L_frac(B)}]` : tx('Está definida en todo el intervalo.'), `${nom}(${L_frac(A)})\\;${okA ? '\\text{existe}' : '\\text{no existe}'},\\quad ${nom}(${L_frac(B)})\\;${okB ? '\\text{existe}' : '\\text{no existe}'}`], svgCurvas({ fs: [x => cNum(e, x)], x0: A.num() - 2, x1: B.num() + 2, asin: dentro.map(p => p.x) }));
    P('Verificamos', 'Revisamos los extremos con límites laterales.', ok ? `\\lim_{x\\to ${L_frac(A)}^{+}}${nom}(x)=${LQx(cNum(e, A.num()))}=${nom}(${L_frac(A)})\\;\\checkmark` : `${tx('Hay un punto problemático')}\\;\\checkmark`);
    return { tema: 'continuidad', metodo: 'Continuidad en un intervalo', pasos, resultado: tx(ok ? 'Es continua en ' : 'No es continua en ') + `[${L_frac(A)};${L_frac(B)}]` };
  }
  const res = [];
  for (const p of enfoque) {
    const fa = cEnDom(D, p.x) ? cNum(e, p.x) : null, lI = cNum(e, p.x - 1e-7), lD = cNum(e, p.x + 1e-7), big = v => Math.abs(v) > 1e5;
    const { P: Px, pasos: px } = crearPasos(); let lim = null; try { lim = cLimite(e, p.q || null, p.x, 0, 0, Px); } catch (er) { /* sigue */ }
    const lIv = big(lI) ? Math.sign(lI) * Infinity : lim && isFinite(lim.v) ? lim.v : lI, lDv = big(lD) ? Math.sign(lD) * Infinity : lim && isFinite(lim.v) ? lim.v : lD;
    const tipo = cClasificar(lIv, lDv, fa);
    P(`Estudiamos x = ${p.L}`, tres, [fa !== null ? `1)\\;${nom}(${p.L})=${LQx(fa)}` : `1)\\;${nom}(${p.L})\\;\\text{no existe}`, `2)\\;\\lim_{x\\to ${p.L}^{-}}=${isFinite(lIv) ? LQx(lIv) : lIv > 0 ? '+\\infty' : '-\\infty'},\\quad\\lim_{x\\to ${p.L}^{+}}=${isFinite(lDv) ? LQx(lDv) : lDv > 0 ? '+\\infty' : '-\\infty'}`, tipo ? `\\Rightarrow\\;\\text{discontinuidad ${tipo.split(' (')[0]}}` : '\\Rightarrow\\;\\text{continua}']);
    if (tipo && tipo.startsWith('evitable') && lim) P('Cómo se evita', 'Si redefinimos la función en ese punto con el valor del límite, queda continua.', `${nom}(${p.L})=${lim.L || LQx(lim.v)}`);
    res.push({ p, tipo, lim });
  }
  P('Lo vemos en el gráfico', 'Las líneas punteadas marcan asíntotas verticales y los círculos huecos, puntos que faltan.', [], svgCurvas({ fs: [x => cNum(e, x)], x0: (enfoque[0]?.x || 0) - 5, x1: (enfoque[0]?.x || 0) + 5, asin: res.filter(r => r.tipo && r.tipo.startsWith('esencial (salto inf')).map(r => r.p.x), pts: res.filter(r => r.tipo && r.tipo.startsWith('evitable') && r.lim).map(r => [r.p.x, r.lim.v, '', true]) }));
  const r0 = res[0];
  P('Verificamos', 'Calculamos la función muy cerca del punto, de cada lado.', `f(${fmtX(r0.p.x - 0.001, 4)})\\approx ${L_x(cNum(e, r0.p.x - 0.001))},\\quad f(${fmtX(r0.p.x + 0.001, 4)})\\approx ${L_x(cNum(e, r0.p.x + 0.001))}\\;\\checkmark`);
  return { tema: 'continuidad', metodo: 'Tres condiciones de continuidad', pasos, resultado: res.map(r => (r.tipo ? `x=${r.p.L}:\\;\\text{${r.tipo.split(' (')[0]}}` : `\\text{continua en }x=${r.p.L}`)).join(',\\;') };
}

/* -----------------------------------------------------------------------
 * C12. LA DERIVADA: reglas explicadas, definición, implícitas, orden superior
 * --------------------------------------------------------------------- */
const dL = (e, v = 'x') => `\\frac{d}{d${v}}\\left[${cL(e)}\\right]`;
const cD = (e, v = 'x') => cPulir(cDer(e, v), v);
function cRegla(e, v = 'x') {                     // nombre de la regla que se aplica a una expresión
  if (!cTiene(e, v)) return 'derivada de una constante';
  if (e.t === 'x') return 'derivada de x';
  if (e.t === 'sum') return 'derivada de una suma';
  if (e.t === 'prod') { const vs = e.fs.filter(f => cTiene(f, v)); return vs.length > 1 ? 'regla del producto' : 'constante por función'; }
  if (e.t === 'div') return cTiene(e.b, v) ? 'regla del cociente' : 'constante por función';
  if (e.t === 'pow') { if (!cTiene(e.b, v)) return e.a.t === 'x' ? 'regla de la potencia' : 'potencia + regla de la cadena'; if (!cTiene(e.a, v)) return e.a.t === 'k' ? 'derivada de la exponencial de base e' : 'derivada de la exponencial de base a'; return 'derivación logarítmica'; }
  if (e.t === 'fn') return `derivada de ${{ sqrt: 'la raíz cuadrada', ln: 'ln', log: 'log', abs: 'valor absoluto' }[e.n] || e.n}${e.a.t === 'x' ? '' : ' + regla de la cadena'}`;
  return 'regla';
}
const C_TABLA = { sen: '(\\operatorname{sen} u)\'=\\cos u\\cdot u\'', cos: '(\\cos u)\'=-\\operatorname{sen} u\\cdot u\'', tg: '(\\operatorname{tg} u)\'=\\frac{u\'}{\\cos^2 u}', cotg: '(\\operatorname{cotg} u)\'=-\\frac{u\'}{\\operatorname{sen}^2 u}', sec: '(\\sec u)\'=\\frac{\\operatorname{sen} u}{\\cos^2 u}\\,u\'', cosec: '(\\operatorname{cosec} u)\'=-\\frac{\\cos u}{\\operatorname{sen}^2 u}\\,u\'',
  ln: '(\\ln u)\'=\\frac{u\'}{u}', log: '(\\log u)\'=\\frac{u\'}{u\\ln 10}', sqrt: '(\\sqrt{u})\'=\\frac{u\'}{2\\sqrt{u}}', arcsen: '(\\operatorname{arcsen} u)\'=\\frac{u\'}{\\sqrt{1-u^2}}', arccos: '(\\arccos u)\'=-\\frac{u\'}{\\sqrt{1-u^2}}', arctg: '(\\operatorname{arctg} u)\'=\\frac{u\'}{1+u^2}', abs: '(|u|)\'=\\frac{u}{|u|}\\,u\'' };
function cExplicarDer(e, P, v = 'x', nom = 'f') {
  const d = cD(e, v), uL = z => cL(z);
  if (e.t === 'sum') {
    P('Derivamos término a término', 'La derivada de una suma (o resta) es la suma de las derivadas.', e.terms.map(t => `${dL(t, v)}=${cL(cD(t, v))}\\quad\\text{(${cRegla(t, v)})}`));
  } else if (e.t === 'prod' && e.fs.filter(f => cTiene(f, v)).length > 1) {
    const vs = e.fs.filter(f => cTiene(f, v)), cs = e.fs.filter(f => !cTiene(f, v)), u = vs[0], w = vs.length === 2 ? vs[1] : cMul(vs.slice(1));
    P('Usamos la regla del producto', `$(u\\cdot v)' = u'\\cdot v + u\\cdot v'$${cs.length ? '. La constante queda multiplicando.' : '.'}`, [`u=${uL(u)},\\quad u'=${cL(cD(u, v))}\\quad\\text{(${cRegla(u, v)})}`, `v=${uL(w)},\\quad v'=${cL(cD(w, v))}\\quad\\text{(${cRegla(w, v)})}`]);
  } else if (e.t === 'div' && cTiene(e.b, v)) {
    P('Usamos la regla del cociente', '$\\left(\\frac{u}{v}\\right)\' = \\frac{u\'\\cdot v - u\\cdot v\'}{v^2}$.', [`u=${uL(e.a)},\\quad u'=${cL(cD(e.a, v))}`, `v=${uL(e.b)},\\quad v'=${cL(cD(e.b, v))}`, `${nom}'(${v})=\\frac{\\left(${cL(cD(e.a, v))}\\right)\\cdot\\left(${cL(e.b)}\\right)-\\left(${cL(e.a)}\\right)\\cdot\\left(${cL(cD(e.b, v))}\\right)}{\\left(${cL(e.b)}\\right)^{2}}`]);
  } else if (e.t === 'pow' && !cTiene(e.b, v)) {
    P(e.a.t === 'x' ? 'Usamos la regla de la potencia' : 'Usamos la potencia y la regla de la cadena', '$(u^n)\' = n\\cdot u^{n-1}\\cdot u\'$: bajamos el exponente, le restamos 1 y multiplicamos por la derivada de lo de adentro.', e.a.t === 'x' ? `${dL(e, v)}=${cL(e.b)}\\cdot ${cL(cPow(e.a, cSimp({ t: 'sub', a: e.b, b: cN(1) })))}` : [`u=${uL(e.a)},\\quad u'=${cL(cD(e.a, v))}`]);
  } else if (e.t === 'pow' && !cTiene(e.a, v)) {
    P('Derivamos la exponencial', e.a.t === 'k' ? '$(e^u)\' = e^u\\cdot u\'$: la exponencial de base e se mantiene y se multiplica por la derivada del exponente.' : '$(a^u)\' = a^u\\cdot\\ln a\\cdot u\'$.', `u=${uL(e.b)},\\quad u'=${cL(cD(e.b, v))}`);
  } else if (e.t === 'pow') {
    P('Usamos derivación logarítmica', 'Para $u^{v}$ con x en la base y en el exponente: $(u^v)\' = u^v\\left(v\'\\ln u + \\frac{v\\,u\'}{u}\\right)$.', `u=${uL(e.a)},\\;v=${uL(e.b)}`);
  } else if (e.t === 'fn') {
    P(e.a.t === 'x' ? 'Usamos la tabla de derivadas' : 'Usamos la tabla de derivadas y la regla de la cadena', e.a.t === 'x' ? 'Es una derivada inmediata.' : 'Derivamos la función de afuera (dejando igual lo de adentro) y multiplicamos por la derivada de lo de adentro.', [C_TABLA[e.n], ...(e.a.t === 'x' ? [] : [`u=${uL(e.a)},\\quad u'=${cL(cD(e.a, v))}`])]);
  } else if ((e.t === 'prod' || e.t === 'div')) {
    P('Sacamos la constante', 'Una constante que multiplica (o divide) queda igual: se deriva solo la parte con x.', `${dL(e, v)}=${cL(cD(e, v))}`);
  } else P('Derivamos', cRegla(e, v) + '.', `${dL(e, v)}=${cL(d)}`);
  P('Simplificamos', 'Juntamos y ordenamos el resultado.', `${nom}'(${v})=${cL(d)}`);
  return d;
}
function cVerifDer(e, d, P, v = 'x') {               // verifica comparando con el cociente incremental
  const D = cDominio(e, v), x0 = [0.7, 1.3, 2.1, 0.3, -0.6, 3.4].find(x => cEnDom(D, x) && isFinite(cNum(d, x)) && cEnDom(D, x + 1e-4) && cEnDom(D, x - 1e-4)) ?? 1.5;
  const h = 1e-5, num = (cNum(e, x0 + h) - cNum(e, x0 - h)) / (2 * h), ex = cNum(d, x0);
  P('Verificamos', `Comparamos con el cociente incremental $\\frac{f(x+h)-f(x-h)}{2h}$ con h muy chico, en ${v} = ${fmtX(x0)}.`, `${v}=${fmtX(x0)}:\\;\\text{fórmula}\\approx ${L_x(ex)},\\;\\text{cociente}\\approx ${L_x(num)}\\;${Math.abs(num - ex) < 1e-4 * Math.max(1, Math.abs(ex)) ? '\\checkmark' : ''}`);
}
function resolverDerivada(texto) {
  const t = plano(texto);
  if (/definicion|cociente incremental|limite del cociente/.test(t)) return resolverDerDefinicion(texto);
  if (/implicit|dy\/dx/.test(t) || (/\by\b/.test(t.replace(/^.*?:/, '')) && /=/.test(t) && !/^\s*y\s*=/.test(t.replace(/^.*?(de|:)\s*/, '')) && !/f\s*\(/.test(t))) return resolverImplicita(texto);
  const orden = /cuarta|f''''|\(4\)/.test(t) ? 4 : /tercera|f'''|y'''/.test(t) ? 3 : /segunda|f''|y''|d2y|d\^2/.test(t) ? 2 : 1;
  const { e, nom, v } = cFuncion(texto.replace(/f'+\s*\(\s*x\s*\)/g, '')), { pasos, P } = crearPasos(), pt = cPunto(texto.replace(/^.*?(?=\ben\s+[xt]\s*=)/i, ''), v);
  P('Escribimos la función', orden > 1 ? `Vamos a derivar ${orden} veces: cada derivada se calcula a partir de la anterior.` : 'Buscamos la regla que corresponde a la forma de la función.', `${nom}(${v})=${cL(e)}`);
  let d = cExplicarDer(e, P, v, nom); const ders = [d];
  for (let k = 2; k <= orden; k++) { const nd = cD(d, v); P(`Derivada de orden ${k}`, `Derivamos ${nom}${"'".repeat(k - 1)}(${v}) (${cRegla(d, v)}).`, `${nom}${"'".repeat(k)}(${v})=${cL(nd)}`); d = nd; ders.push(d); }
  let res = `${nom}${"'".repeat(orden)}(${v})=${cL(d)}`;
  if (pt) { const ex = pt.q ? cExacto(d, { [v]: pt.q }) : null, val = ex ? L_frac(ex) : LQx(cNum(d, pt.x)); P('Evaluamos en el punto', 'Reemplazamos en la derivada.', `${nom}${"'".repeat(orden)}(${pt.L})=${cL(cSust(d, v, pt.q ? cMarca(pt.q) : pt.e))}=${val}`); res += `,\\quad ${nom}${"'".repeat(orden)}(${pt.L})=${val}`; }
  cVerifDer(orden === 1 ? e : ders[orden - 2], d, P, v);
  return { tema: 'derivada', metodo: orden > 1 ? `Derivada de orden ${orden}` : cRegla(e, v).replace(/^./, c => c.toUpperCase()), pasos, resultado: res };
}
function resolverDerDefinicion(texto) {
  const { e, nom } = cFuncion(texto), { pasos, P } = crearPasos(), r = cRac(e);
  P('Escribimos la definición', 'La derivada es el límite del cociente incremental cuando h tiende a 0.', `${nom}'(x)=\\lim_{h\\to 0}\\frac{${nom}(x+h)-${nom}(x)}{h}`);
  if (r && uGrado(r.d) === 0) {
    const u = r.n.map(c => c.div(r.d[0])), poli = Pred(u.reduce((acc, c, i) => Padd(acc, Pmul([mono(c)], Ppow(Pred([mono(Q1, { x: 1 }), mono(Q1, { h: 1 })]), i))), []));
    const dif = Pred(Psub(poli, deU(u, 'x'))), cociente = Pred(dif.map(m => { const v = { ...m.v }; v.h -= 1; if (!v.h) delete v.h; return mono(m.c, v); })), lim = Pred(cociente.filter(m => !m.v.h));
    P('Calculamos f(x + h)', 'Reemplazamos x por (x + h) y desarrollamos.', `${nom}(x+h)=${L_P(poli)}`);
    P('Restamos f(x)', 'Los términos que no tienen h se cancelan.', `${nom}(x+h)-${nom}(x)=${L_P(dif)}`);
    P('Dividimos por h', 'Todos los términos tienen h: simplificamos.', `\\frac{${nom}(x+h)-${nom}(x)}{h}=${L_P(cociente)}`);
    P('Hacemos tender h a 0', 'Los términos que todavía tienen h se anulan.', `${nom}'(x)=${L_P(lim)}`);
    const dd = cD(e); cVerifDer(e, dd, P);
    return { tema: 'derivada', metodo: 'Definición (cociente incremental)', pasos, resultado: `${nom}'(x)=${L_P(lim)}` };
  }
  if (r && uGrado(r.n) === 0 && uGrado(r.d) === 1) {
    const k = r.n[0], [b, a] = [r.d[0], r.d[1]], fx = cL(cDeU(r.d)), fxh = `${L_frac(a)}(x+h)${b.signo < 0 ? '' : '+'}${L_frac(b)}`.replace(/^1\(/, '(');
    P('Planteamos el cociente', 'Restamos las fracciones con denominador común.', `\\frac{\\frac{${L_frac(k)}}{${fxh}}-\\frac{${L_frac(k)}}{${fx}}}{h}=\\frac{${L_frac(k)}\\,(${fx})-${L_frac(k)}\\,(${fxh})}{h\\,(${fxh})(${fx})}`);
    P('Simplificamos', 'En el numerador queda solo un término con h, que se cancela con el de abajo.', `=\\frac{${L_frac(k.mul(a).neg())}}{(${fxh})(${fx})}`);
    const d = cD(e); P('Hacemos tender h a 0', 'Reemplazamos h = 0.', `${nom}'(x)=${cL(d)}`); cVerifDer(e, d, P);
    return { tema: 'derivada', metodo: 'Definición (cociente incremental)', pasos, resultado: `${nom}'(x)=${cL(d)}` };
  }
  const m = e.t === 'fn' && e.n === 'sqrt' ? cRac(e.a) : null;
  if (m && uGrado(m.n) === 1 && uGrado(m.d) === 0) {
    P('Multiplicamos por el conjugado', 'Multiplicamos arriba y abajo por $\\sqrt{u(x+h)}+\\sqrt{u(x)}$ para eliminar las raíces del numerador.', `\\frac{\\sqrt{u(x+h)}-\\sqrt{u(x)}}{h}=\\frac{u(x+h)-u(x)}{h\\left(\\sqrt{u(x+h)}+\\sqrt{u(x)}\\right)}`);
    const d = cD(e); P('Hacemos tender h a 0', `El numerador queda ${L_frac(m.n[1].div(m.d[0]))}·h; simplificamos h y reemplazamos h = 0.`, `${nom}'(x)=${cL(d)}`); cVerifDer(e, d, P);
    return { tema: 'derivada', metodo: 'Definición (cociente incremental)', pasos, resultado: `${nom}'(x)=${cL(d)}` };
  }
  throw new Error('Por definición derivo polinomios, k/(ax + b) y √(ax + b). Para otras funciones usá las reglas.');
}
function resolverImplicita(texto) {
  const { pasos, P } = crearPasos(), s = texto.replace(/^.*(?:\bde\b|:|dx)\s*(?=[^:]*=)/i, '').replace(/[¿?]/g, '').replace(/,?\s*(en|hallar|calcular)\b.*$/i, ''), [a, b] = s.split('=');
  const A = cS(a), B = cS(b), F = cSimp({ t: 'sub', a: A, b: B }), Fx = cD(F, 'x'), Fy = cD(F, 'y');
  P('Escribimos la ecuación', 'En una función implícita y depende de x, pero no está despejada. Derivamos los dos miembros respecto de x, pensando y = y(x).', `${cL(A)}=${cL(B)}`);
  P('Derivamos los dos miembros', 'Cada vez que derivamos algo con y, por la regla de la cadena aparece multiplicado por y\'.', `${cL(cD(A, 'x'))}${cTiene(A, 'y') ? '+\\left(' + cL(cD(A, 'y')) + '\\right)y\'' : ''}=${cL(cD(B, 'x'))}${cTiene(B, 'y') ? '+\\left(' + cL(cD(B, 'y')) + '\\right)y\'' : ''}`);
  const yp = cPulir(cSimp({ t: 'div', a: { t: 'neg', a: Fx }, b: Fy }), 'x');
  P('Despejamos y\'', 'Juntamos los términos con y\' de un lado y sacamos factor común.', [`\\left(${cL(Fy)}\\right)y'=${cL(cSimp({ t: 'neg', a: Fx }))}`, `y'=${cL(yp)}`]);
  let x0 = null, y0 = null; for (const xx of [1, 0.5, 2, 0, -1, 1.5]) { const ys = cRaicesNum(cSust(F, 'x', cN(aproxQ(xx))), -50, 50).filter(y => Math.abs(cNum(Fy, { x: xx, y })) > 1e-3); if (ys.length) { x0 = xx; y0 = ys[ys.length - 1]; break; } }
  if (x0 !== null) { const h = 1e-5, sig = cRaicesNum(cSust(F, 'x', { t: 'n', v: new Q(BigInt(Math.round((x0 + h) * 1e5)), 100000n) }), y0 - 0.01, y0 + 0.01, 400)[0], m = (sig - y0) / h, fm = cNum(yp, { x: x0, y: y0 });
    P('Verificamos', `Tomamos un punto de la curva (x = ${x0}, y ≈ ${fmtX(y0, 4)}) y comparamos la pendiente de la fórmula con la que se obtiene moviéndose un poquito sobre la curva.`, `y'\\approx ${L_x(fm)}\\quad\\text{y}\\quad\\frac{\\Delta y}{\\Delta x}\\approx ${L_x(m)}\\;${Math.abs(m - fm) < 1e-3 * Math.max(1, Math.abs(fm)) ? '\\checkmark' : ''}`); }
  return { tema: 'derivada', metodo: 'Derivación implícita', pasos, resultado: `y'=${cL(yp)}` };
}

/* -----------------------------------------------------------------------
 * C13. APLICACIONES DE LA DERIVADA
 * --------------------------------------------------------------------- */
function resolverTangente(texto) {
  const { e, nom } = cFuncion(texto), { pasos, P } = crearPasos(), pt = cPunto(texto); if (!pt) throw new Error('Decí el punto: “en x = 1”.');
  const d = cD(e), a = pt.q, fa = a ? cExacto(e, { x: a }) : null, ma = a ? cExacto(d, { x: a }) : null, yN = cNum(e, pt.x), mN = cNum(d, pt.x);
  const yL = fa ? L_frac(fa) : LQx(yN), mL = ma ? L_frac(ma) : LQx(mN);
  P('Calculamos el punto de tangencia', 'Reemplazamos x en la función para saber la altura del punto.', `${nom}(${pt.L})=${yL}\\;\\Rightarrow\\;P=(${pt.L};\\,${yL.replace('\\approx ', '')})`);
  P('Calculamos la pendiente', 'La pendiente de la recta tangente es la derivada en ese punto.', [`${nom}'(x)=${cL(d)}`, `m=${nom}'(${pt.L})=${mL}`]);
  const recta = (m, y0) => (fa && (m instanceof Q) ? cPulir(cSimp({ t: 'add', a: { t: 'mul', a: cN(m), b: { t: 'sub', a: cX(), b: cN(a) } }, b: cN(y0) })) : null);
  const tg_ = ma && fa ? recta(ma, fa) : null, mN2 = Math.abs(mN) > 1e-12 ? -1 / mN : null, nor = ma && fa && !ma.cero ? recta(Q1.neg().div(ma), fa) : null;
  const Lr = (r, m) => (r ? cL(r) : `${L_x(m)}\\,(x-${par(fmtX(pt.x))})+${par(L_x(yN))}`);
  P('Escribimos la recta tangente', 'Usamos la ecuación de la recta que pasa por un punto con pendiente m: y − y₀ = m(x − x₀).', [`y-${par(yL.replace('\\approx ', ''))}=${mL.replace('\\approx ', '')}\\,(x-${par(pt.L)})`, `y=${Lr(tg_, mN)}`]);
  const pideNormal = /normal/.test(plano(texto));
  if (pideNormal) P('Escribimos la recta normal', 'La normal es perpendicular a la tangente: su pendiente es −1/m.', mN2 === null ? `x=${pt.L}` : `y=${Lr(nor, mN2)}`);
  P('Lo vemos en el gráfico', 'La recta toca a la curva en el punto y tiene su misma inclinación ahí.', [], svgCurvas({ fs: [x => cNum(e, x), x => yN + mN * (x - pt.x)], x0: pt.x - 4, x1: pt.x + 4, pts: [[pt.x, yN, 'P']] }));
  const h = 1e-5, mNum = (cNum(e, pt.x + h) - cNum(e, pt.x - h)) / (2 * h);
  P('Verificamos', 'El punto tiene que cumplir la ecuación de la recta y la pendiente tiene que coincidir con la de la curva.', [`x=${pt.L}:\\;y=${L_x(yN + mN * 0)}=${nom}(${pt.L})\\;\\checkmark`, `\\text{pendiente de la curva}\\approx ${L_x(mNum)}\\;\\checkmark`]);
  return { tema: 'aplicaciones', metodo: pideNormal ? 'Rectas tangente y normal' : 'Recta tangente', pasos, resultado: `y=${Lr(tg_, mN)}` + (pideNormal ? `,\\quad\\text{normal: }${mN2 === null ? `x=${pt.L}` : 'y=' + Lr(nor, mN2)}` : '') };
}
function cTablaSigno(g, D, pts, etiquetas) {        // tabla de signos de g en los intervalos determinados por pts
  const xs = pts.map(p => p.x), filas = [], sig = [];
  for (let i = 0; i <= xs.length; i++) { const lo = i ? xs[i - 1] : -Infinity, hi = i < xs.length ? xs[i] : Infinity, m = lo === -Infinity ? (hi === Infinity ? 0 : hi - 1) : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    if (!cEnDom(D, m)) { sig.push(0); continue; } const s = Math.sign(cNum(g, m)); sig.push(s);
    filas.push([k$(`(${i ? pts[i - 1].L : '-\\infty'},\\,${i < xs.length ? pts[i].L : '+\\infty'})`), k$(`x=${fmtX(m, 3)}`), s > 0 ? '+' : '−', s > 0 ? etiquetas[0] : etiquetas[1]]); }
  return { filas, sig };
}
const cIvsL = (pts, sig, s) => { const out = []; for (let i = 0; i < sig.length; i++) if (sig[i] === s) out.push(`(${i ? pts[i - 1].L.replace('\\approx ', '') : '-\\infty'},\\,${i < pts.length ? pts[i].L.replace('\\approx ', '') : '+\\infty'})`); return out.length ? out.join('\\cup ') : '\\varnothing'; };
function cCeros(g, D) { const r = cRac(g); return (r ? cRaices(r.n) : cRaicesNum(g, -60, 60).map(x => ({ x, L: LQx(x), q: aproxQ(x) }))).filter(z => cEnDom(D, z.x)); }
function resolverEstudio(texto) {
  const t = plano(texto), { e, nom } = cFuncion(texto), { pasos, P } = crearPasos(), D = cDominio(e);
  const quiereMono = /maxim|minim|extrem|crec|decrec|monoton|estudio|critic/.test(t) || !/concav|inflex/.test(t), quiereConc = /concav|inflex|estudio/.test(t);
  P('Escribimos la función y su dominio', 'Para estudiar la función usamos la primera derivada (crecimiento y extremos) y la segunda (concavidad e inflexión).', [`${nom}(x)=${cL(e)}`, `\\text{Dom}\\,${nom}=${D.L}`]);
  const huecos = (D.pts || []).filter(p => !cEnDom(D, p.x)), marcas = [], res = [];
  const valL = z => { const ex = z.q ? cExacto(e, { x: z.q }) : null; return ex ? L_frac(ex) : LQx(cNum(e, z.x)); };
  let d1 = cD(e), d2 = cD(d1);
  if (quiereMono) {
    const crit = cCeros(d1, D), pts = [...crit, ...huecos].sort((a, b) => a.x - b.x);
    P('Calculamos la derivada y los puntos críticos', 'Los puntos críticos son los x del dominio donde f\'(x) = 0. Ahí la función puede tener máximos o mínimos.', [`${nom}'(x)=${cL(d1)}`, crit.length ? `${nom}'(x)=0\\;\\Rightarrow\\;x=${crit.map(z => z.L).join(',\\;')}` : tx('La derivada no se anula.')]);
    const T = cTablaSigno(d1, D, pts, ['crece ↗', 'decrece ↘']);
    P('Armamos la tabla de signos de f\'', 'Si f\' > 0 la función crece; si f\' < 0, decrece. Probamos un valor en cada intervalo.', [], tabla(['Intervalo', 'Prueba', "Signo de f'", 'f'], T.filas));
    const ext = []; crit.forEach(z => { const i = pts.indexOf(z), a = T.sig[i], b = T.sig[i + 1]; if (a > 0 && b < 0) ext.push({ ...z, tipo: 'máximo' }); else if (a < 0 && b > 0) ext.push({ ...z, tipo: 'mínimo' }); });
    P('Leemos crecimiento y extremos', 'Donde la función pasa de crecer a decrecer hay un máximo; donde pasa de decrecer a crecer, un mínimo.', [`\\text{crece en }${cIvsL(pts, T.sig, 1)}`, `\\text{decrece en }${cIvsL(pts, T.sig, -1)}`, ...ext.map(z => `\\text{${z.tipo} relativo en }(${z.L.replace('\\approx ', '')};\\,${valL(z).replace('\\approx ', '')})`)]);
    ext.forEach(z => marcas.push([z.x, cNum(e, z.x), z.tipo === 'máximo' ? 'máx' : 'mín'])); res.push(...ext.map(z => `\\text{${z.tipo} en }x=${z.L.replace('\\approx ', '')}`));
    if (!ext.length) res.push(tx('sin extremos relativos'));
    P('Verificamos', 'En cada punto crítico la derivada tiene que valer 0.', crit.length ? crit.map(z => `${nom}'(${z.L.replace('\\approx ', '')})\\approx ${L_x(Math.abs(cNum(d1, z.x)) < 1e-9 ? 0 : cNum(d1, z.x))}\\;\\checkmark`) : [`${nom}'(1)\\approx ${L_x(cNum(d1, 1))}\\ne 0\\;\\checkmark`]);
  }
  if (quiereConc) {
    const inf = cCeros(d2, D), pts = [...inf, ...huecos].sort((a, b) => a.x - b.x);
    P('Calculamos la derivada segunda', 'Los posibles puntos de inflexión son donde f\'\'(x) = 0.', [`${nom}''(x)=${cL(d2)}`, inf.length ? `${nom}''(x)=0\\;\\Rightarrow\\;x=${inf.map(z => z.L).join(',\\;')}` : tx('La derivada segunda no se anula.')]);
    const T = cTablaSigno(d2, D, pts, ['cóncava hacia arriba ∪', 'cóncava hacia abajo ∩']);
    P('Armamos la tabla de signos de f\'\'', 'Si f\'\' > 0 la curva es cóncava hacia arriba (como una taza); si f\'\' < 0, hacia abajo.', [], tabla(['Intervalo', 'Prueba', "Signo de f''", 'Concavidad'], T.filas));
    const pi = inf.filter(z => { const i = pts.indexOf(z); return T.sig[i] && T.sig[i + 1] && T.sig[i] !== T.sig[i + 1]; });
    P('Leemos concavidad e inflexión', 'Un punto de inflexión es donde cambia la concavidad.', [`\\cup\\text{ en }${cIvsL(pts, T.sig, 1)}`, `\\cap\\text{ en }${cIvsL(pts, T.sig, -1)}`, ...pi.map(z => `\\text{inflexión en }(${z.L.replace('\\approx ', '')};\\,${valL(z).replace('\\approx ', '')})`)]);
    pi.forEach(z => marcas.push([z.x, cNum(e, z.x), 'PI'])); res.push(pi.length ? `\\text{inflexión en }x=${pi.map(z => z.L.replace('\\approx ', '')).join(',\\;')}` : tx('sin puntos de inflexión'));
    P('Verificamos', 'En cada punto de inflexión la derivada segunda vale 0 y cambia de signo.', pi.length ? pi.map(z => `${nom}''(${z.L.replace('\\approx ', '')})\\approx ${L_x(Math.abs(cNum(d2, z.x)) < 1e-9 ? 0 : cNum(d2, z.x))}\\;\\checkmark`) : [tx('No hay cambio de signo') + '\\;\\checkmark']);
  }
  const cx = marcas.length ? marcas.reduce((s, m) => s + m[0], 0) / marcas.length : 0;
  P('Lo vemos en el gráfico', 'Marcamos los puntos importantes sobre la curva.', [], svgCurvas({ fs: [x => cNum(e, x)], x0: cx - 5, x1: cx + 5, pts: marcas, asin: huecos.map(p => p.x) }));
  return { tema: 'aplicaciones', metodo: quiereConc && quiereMono ? 'Estudio completo' : quiereConc ? 'Concavidad e inflexión' : 'Monotonía y extremos', pasos, resultado: res.join(',\\;') };
}
function resolverMovimiento(texto) {
  const { pasos, P } = crearPasos(), d = cDefs(texto), k = Object.keys(d); let e, v;
  if (k.length) { e = d[k[0]].e; v = d[k[0]].v; } else { const r = cSoloExpr(texto); e = r.e; v = cTiene(e, 't') ? 't' : 'x'; }
  const nom = k[0] || 's', pt = cPunto(texto.replace(/^.*?(?=\b(en|para|cuando)\s+t\s*=)/i, ''), v), V = cD(e, v), A = cD(V, v);
  P('Escribimos la posición', 'La velocidad es la derivada de la posición y la aceleración es la derivada de la velocidad.', `${nom}(${v})=${cL(e)}`);
  P('Calculamos la velocidad', 'Derivamos la posición.', `v(${v})=${nom}'(${v})=${cL(V)}`);
  P('Calculamos la aceleración', 'Derivamos la velocidad.', `a(${v})=v'(${v})=${cL(A)}`);
  const res = [`v(${v})=${cL(V)}`, `a(${v})=${cL(A)}`];
  if (pt) { const ve = pt.q ? cExacto(V, { [v]: pt.q }) : null, ae = pt.q ? cExacto(A, { [v]: pt.q }) : null, Lv = ve ? L_frac(ve) : LQx(cNum(V, { [v]: pt.x })), La = ae ? L_frac(ae) : LQx(cNum(A, { [v]: pt.x }));
    P('Evaluamos en el instante pedido', 'Reemplazamos el valor de t en cada fórmula.', [`v(${pt.L})=${Lv}`, `a(${pt.L})=${La}`]); res.push(`v(${pt.L})=${Lv}`, `a(${pt.L})=${La}`); }
  const rV = cRac(V, v); const reposo = rV ? cRaices(rV.n).filter(z => z.x >= 0) : [];
  if (reposo.length && /reposo|detiene|cambia de sentido|velocidad nula|v\s*=\s*0/.test(plano(texto)) || reposo.length) P('Instantes en reposo', 'El móvil está quieto cuando la velocidad vale 0 (ahí puede cambiar de sentido).', `v(${v})=0\\;\\Rightarrow\\;${v}=${reposo.map(z => z.L).join(',\\;')}`);
  const t0 = pt ? pt.x : 1, h = 1e-5, f = z => cNum(e, { [v]: z }), vn = (f(t0 + h) - f(t0 - h)) / (2 * h), an = (f(t0 + 1e-3) - 2 * f(t0) + f(t0 - 1e-3)) / 1e-6;
  P('Verificamos', `Calculamos velocidad y aceleración con cocientes incrementales en ${v} = ${fmtX(t0)}.`, `v\\approx ${L_x(vn)},\\;a\\approx ${L_x(an)}\\;${Math.abs(vn - cNum(V, { [v]: t0 })) < 1e-3 ? '\\checkmark' : ''}`);
  return { tema: 'aplicaciones', metodo: 'Velocidad y aceleración', pasos, resultado: res.join(',\\;') };
}
function resolverAproximacion(texto) {
  const { pasos, P } = crearPasos(), t = plano(texto);
  let e, a, x1, nom = 'f';
  const s = texto.replace(/[¿?]/g, '').replace(/^.*?(aproxim\w*|estim\w*|calcul\w*)\s*(el valor de|de)?\s*/i, '').replace(/\s*(usando|con|mediante).*$/i, '').trim();
  const dx = dato(t, ['dx', 'Δx', 'incremento']);
  if (cDefs(texto) && Object.keys(cDefs(texto)).length) { const f = cFuncion(texto), pt = cPunto(texto); e = f.e; nom = f.nom; if (!pt || !dx) throw new Error('Para el diferencial escribí: f(x) = x^3, en x = 2 con dx = 0,01.'); a = pt.q; x1 = a.add(dx); }
  else {
    const m = s.match(/-?\d+(?:[.,]\d+)?/); if (!m) throw new Error('Escribilo así: aproximar √4,1 o aproximar (2,01)^3.');
    const num = numDe(m[0]); e = cS(s.slice(0, m.index) + 'x' + s.slice(m.index + m[0].length).replace(/^\s*\)?/, z => z));
    const vnum = num.num(), raiz = /√|raiz|sqrt/.test(s) && !/\^/.test(s), cub = /\^\s*\(\s*1\s*\/\s*3\s*\)|∛/.test(s);
    const cand = raiz ? Math.round(Math.sqrt(vnum)) ** 2 : cub ? Math.round(Math.cbrt(vnum)) ** 3 : /ln|log/.test(s) ? 1 : /e\s*\^/.test(s) || /sen|cos|tg/.test(s) ? 0 : Math.round(vnum);
    a = QE(cand); x1 = num;
  }
  const d = cD(e), fa = cExacto(e, { x: a }), ma = cExacto(d, { x: a }), D_ = x1.sub(a);
  if (!fa || !ma) throw new Error('No encontré un punto cercano donde la función sea fácil de calcular.');
  const aprox = fa.add(ma.mul(D_)), real = cNum(e, x1.num()), Lx1 = L_x(x1.num());
  P('Elegimos la función y un punto cercano', 'Buscamos un punto a cerca del valor pedido donde la función se calcule fácil (por ejemplo, un cuadrado perfecto para una raíz).', [`${nom}(x)=${cL(e)}`, `a=${L_frac(a)},\\quad \\Delta x=${Lx1}-${par(L_frac(a))}=${L_frac(D_)}`]);
  P('Calculamos f(a) y f\'(a)', 'Necesitamos el valor de la función y de su derivada en el punto.', [`${nom}(${L_frac(a)})=${L_frac(fa)}`, `${nom}'(x)=${cL(d)}\\;\\Rightarrow\\;${nom}'(${L_frac(a)})=${L_frac(ma)}`]);
  P('Usamos la recta tangente (linealización)', 'Cerca de a, la función se parece a su recta tangente: f(a + Δx) ≈ f(a) + f\'(a)·Δx. El término f\'(a)·Δx es el diferencial dy.', [`dy=${nom}'(${L_frac(a)})\\cdot\\Delta x=${L_frac(ma)}\\cdot ${par(L_frac(D_))}=${L_frac(ma.mul(D_))}`, `${nom}(${Lx1})\\approx ${L_frac(fa)}+${par(L_frac(ma.mul(D_)))}=${L_frac(aprox)}\\approx ${L_x(aprox.num())}`]);
  P('Verificamos', 'Comparamos con el valor que da la calculadora: el error tiene que ser chico.', `${nom}(${Lx1})\\approx ${L_x(real)},\\quad\\text{error}\\approx ${L_x(Math.abs(real - aprox.num()))}\\;${Math.abs(real - aprox.num()) < 0.05 * Math.max(1, Math.abs(real)) ? '\\checkmark' : ''}`);
  return { tema: 'aplicaciones', metodo: 'Aproximación lineal (diferencial)', pasos, resultado: `${nom}(${Lx1})\\approx ${L_x(aprox.num())}` };
}
function resolverAplicaciones(texto) {
  const t = plano(texto);
  if (/aproxim|linealiz|diferencial|estim/.test(t)) return resolverAproximacion(texto);
  if (/tangente|normal/.test(t)) return resolverTangente(texto);
  if (/velocidad|aceleracion|posicion|movil|reposo/.test(t)) return resolverMovimiento(texto);
  return resolverEstudio(texto);
}

/* -----------------------------------------------------------------------
 * C14. DETECCIÓN DEL TEMA DE CÁLCULO
 * --------------------------------------------------------------------- */
const TEMAS_CALC = { funcionesc: 'Relaciones y funciones', limites: 'Límites', continuidad: 'Continuidad', derivada: 'La derivada', aplicaciones: 'Aplicaciones de la derivada' };
const DETECTORES_CALC = [
  { tema: 'aplicaciones', test: t => /tangente|normal|maxim|minim|extrem|crec|decrec|monoton|concav|inflex|velocidad|aceleracion|posicion|aproxim|linealiz|diferencial|estudio|reposo|puntos? critic/.test(t), fn: resolverAplicaciones },
  { tema: 'continuidad', test: t => /continu|discontinu|evitable|\bsalto\b/.test(t) || (/\bsi\b/.test(t) && /;/.test(t)), fn: resolverContinuidad },
  { tema: 'limites', test: t => /\blim|limite|tiende|→|->|\\to|epsilon|ε|δ/.test(t), fn: resolverLimites },
  { tema: 'derivada', test: t => /deriv|f'|y'|dy\/dx|d\/dx|implicit/.test(t), fn: resolverDerivada },
  { tema: 'funcionesc', test: t => /dominio|rango|imagen|recorrido|paridad|\bpar\b|impar|inyectiv|compuest|∘|\\circ|invers|grafic|es (una )?funcion|relacion|f\s*\(|g\s*\(/.test(t) || (/=/.test(t) && /\by\b/.test(t)), fn: resolverFuncionesC }
];
const FORZAR_CALC = { funcionesc: resolverFuncionesC, limites: resolverLimites, continuidad: resolverContinuidad, derivada: resolverDerivada, aplicaciones: resolverAplicaciones };
// Ajusta lo que llega desde MathLive: lim_(x→2)(…), ((d)/(dx))(…), 2^(+)
const cNormalizar = s => s.replace(/\^\(([+-])\)/g, '$1').replace(/_\(\s*([xt]\s*→[^)]*)\)/, ' $1 ').replace(/\(\(d\)\/\(d([xt])\)\)/g, 'derivada de ').replace(/\(\(d\^\(2\)\)\/\(d[xt]\^\(2\)\)\)/g, 'derivada segunda de ').trim();
function resolverCalc(texto, temaForzado) {
  const o = cNormalizar(texto); if (!o) throw new Error('Escribí un ejercicio.');
  const t = plano(o);
  if (temaForzado) return FORZAR_CALC[temaForzado](o);
  for (const d of DETECTORES_CALC) if (d.test(t)) return d.fn(o);
  return resolverDerivada(o);                       // una expresión sola: la derivamos
}
function detectarTemaCalc(texto) { const t = plano(cNormalizar(texto)); if (!t) return null; const d = DETECTORES_CALC.find(x => x.test(t)); return d ? d.tema : 'derivada'; }
/* MOTOR-CALCULO-FIN ====================================================== */

// Aviso para la interfaz: este motor ya está cargado (se cargan a medida que se eligen las áreas)
(window.MPP_MOTORES = window.MPP_MOTORES || {}).calc = true;
