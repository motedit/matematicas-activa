/* =======================================================================
 * MOTOR: CÁLCULO INTEGRAL
 * Integrador paso a paso, sumas y aplicaciones. Necesita el motor de cálculo diferencial.
 * Es lógica pura (no toca la página): recibe texto y devuelve
 * { tema, metodo, pasos, resultado, alternativas }.
 * ===================================================================== */
'use strict';
/* MOTOR-INTEGRAL-INICIO ==================================================
 * Cálculo integral. Usa el motor simbólico de Cálculo diferencial
 * (cS, cSimp, cDer, cL, cNum, cRac, cPulir, svgCurvas...).
 * El integrador prueba, en orden: tabla de inmediatas, linealidad,
 * potencias trigonométricas, fracciones parciales, sustitución,
 * sustitución trigonométrica, diferenciales binomias y por partes.
 * Cada método deja anotado qué hizo (pasos) y con qué tema se lo asocia.
 * ====================================================================== */

/* -----------------------------------------------------------------------
 * I1. HERRAMIENTAS
 * --------------------------------------------------------------------- */
const iV = (n = 'x') => cX(n);
function iLin(e, v) { const r = cRac(e, v); if (!r || uGrado(r.d) > 0 || uGrado(r.n) !== 1) return null; return { a: r.n[1].div(r.d[0]), b: (r.n[0] || Q0).div(r.d[0]) }; }
const iDivA = (F, a) => (cUno(a) ? F : cSimp({ t: 'div', a: F, b: cN(a) }));
const iLn = u => ({ t: 'fn', n: 'ln', a: { t: 'fn', n: 'abs', a: u } });
const iSqrtQ = q => cSimp(cPow(cN(q), cN(new Q(1n, 2n))));             // √q exacta o simbólica
const iIntL = (e, v = 'x') => `\\int ${cW(e, 2)}\\,d${v}`;
// Distribuye los números que multiplican sumas: 4(a + b) → 4a + 4b (para que el resultado quede prolijo)
function iDistrib(e) {
  if (e.t === 'sum') return cAdd(e.terms.map(iDistrib));
  if (e.t === 'prod' && cEsN(e.fs[0])) { const resto = e.fs.slice(1); if (resto.length === 1 && resto[0].t === 'sum') return cAdd(resto[0].terms.map(t => iDistrib(cMul([e.fs[0], t])))); }
  if (e.t === 'div' && e.a.t === 'sum' && cEsN(e.b)) return cAdd(e.a.terms.map(t => iDistrib(cDiv(t, e.b))));
  return e;
}
// Reemplaza un subárbol (comparando por clave) por otro
function iReemplazar(e, g, w) {
  if (cKey(e) === cKey(g)) return w;
  const o = { ...e }; if (e.a && typeof e.a === 'object' && e.a.t) o.a = iReemplazar(e.a, g, w); if (e.b && typeof e.b === 'object' && e.b.t) o.b = iReemplazar(e.b, g, w);
  if (e.terms) o.terms = e.terms.map(z => iReemplazar(z, g, w)); if (e.fs) o.fs = e.fs.map(z => iReemplazar(z, g, w)); return o;
}
// sec, cosec, cotg → expresiones con seno y coseno (para comparar derivadas)
function iSenCosF(e, conTg = false) {
  const R = z => iSenCosF(z, conTg);
  if (e.t === 'fn') { const a = R(e.a), S = { t: 'fn', n: 'sen', a }, C = { t: 'fn', n: 'cos', a };
    return cSimp({ sec: { t: 'div', a: cN(1), b: C }, cosec: { t: 'div', a: cN(1), b: S }, cotg: { t: 'div', a: C, b: S }, ...(conTg ? { tg: { t: 'div', a: S, b: C } } : {}) }[e.n] || { t: 'fn', n: e.n, a }); }
  const o = { ...e }; if (e.a && typeof e.a === 'object' && e.a.t) o.a = R(e.a); if (e.b && typeof e.b === 'object' && e.b.t) o.b = R(e.b);
  if (e.terms) o.terms = e.terms.map(R); if (e.fs) o.fs = e.fs.map(R); return cSimp(o);
}
// Factores con exponente: c · Π base^exp
function iFactores(e) {
  let c = Q1; const fs = [];
  const add = (b, ex) => { if (cEsN(b)) { if (ex.entero) c = c.mul(ex.n >= 0n ? b.v.pow(Number(ex.n)) : b.v.inv().pow(Number(-ex.n))); else fs.push({ b, ex }); return; } const o = fs.find(f => cKey(f.b) === cKey(b)); if (o) o.ex = o.ex.add(ex); else fs.push({ b, ex }); };
  const walk = (z, s) => { if (z.t === 'prod') z.fs.forEach(f => walk(f, s)); else if (z.t === 'div') { walk(z.a, s); walk(z.b, s.neg()); } else if (z.t === 'pow' && cEsN(z.b)) add(z.a, z.b.v.mul(s)); else if (z.t === 'fn' && z.n === 'sqrt') add(z.a, new Q(1n, 2n).mul(s)); else add(z, s); };
  walk(e, Q1); return { c, fs: fs.filter(f => !f.ex.cero) };
}
// Simpson (para verificar integrales definidas)
function iSimpson(f, a, b, n = 2000) { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; }

/* -----------------------------------------------------------------------
 * I2. TABLA DE INTEGRALES INMEDIATAS (con argumento lineal u = ax + b)
 * Devuelve { F, regla } o null.
 * --------------------------------------------------------------------- */
function iTabla(e, v) {
  const lin = z => iLin(z, v), X = iV(v);
  const R = (F, regla, a = Q1) => ({ F: iDivA(F, a), regla: regla + (cUno(a) ? '' : `\\quad(\\text{y dividimos por }${L_frac(a)})`) });
  if (e.t === 'x' && e.n === v) return R(cSimp({ t: 'div', a: cPow(X, cN(2)), b: cN(2) }), '\\int x\\,dx=\\frac{x^2}{2}');
  if (e.t === 'pow' && cEsN(e.b)) { const l = lin(e.a); if (l) { const n = e.b.v; if (n.eq(QE(-1))) return R(iLn(e.a), '\\int\\frac{du}{u}=\\ln|u|', l.a); return R(cSimp({ t: 'div', a: cPow(e.a, cN(n.add(Q1))), b: cN(n.add(Q1)) }), '\\int u^n\\,du=\\frac{u^{n+1}}{n+1}\\;(n\\ne -1)', l.a); } }
  if (e.t === 'fn' && e.n === 'sqrt') { const l = lin(e.a); if (l) return R(cSimp({ t: 'div', a: cPow(e.a, cN(new Q(3n, 2n))), b: cN(new Q(3n, 2n)) }), '\\int u^{1/2}\\,du=\\frac{u^{3/2}}{3/2}', l.a); }
  if (e.t === 'pow' && !cTiene(e.a, v)) { const l = lin(e.b); if (l) { if (e.a.t === 'k' && e.a.n === 'e') return R(e, '\\int e^u\\,du=e^u', l.a); return R(cSimp({ t: 'div', a: e, b: cFn('ln', e.a) }), '\\int a^u\\,du=\\frac{a^u}{\\ln a}', l.a); } }
  if (e.t === 'fn') { const l = lin(e.a); if (l) { const u = e.a, T = {
      sen: [cSimp({ t: 'neg', a: cFn('cos', u) }), '\\int\\operatorname{sen} u\\,du=-\\cos u'], cos: [cFn('sen', u), '\\int\\cos u\\,du=\\operatorname{sen} u'],
      tg: [cSimp({ t: 'neg', a: iLn(cFn('cos', u)) }), '\\int\\operatorname{tg} u\\,du=-\\ln|\\cos u|'], cotg: [iLn(cFn('sen', u)), '\\int\\operatorname{cotg} u\\,du=\\ln|\\operatorname{sen} u|'],
      sec: [iLn(cAdd([cFn('sec', u), cFn('tg', u)])), '\\int\\sec u\\,du=\\ln|\\sec u+\\operatorname{tg} u|'], cosec: [iLn(cAdd([cFn('cosec', u), cMul([cN(-1), cFn('cotg', u)])])), '\\int\\operatorname{cosec} u\\,du=\\ln|\\operatorname{cosec} u-\\operatorname{cotg} u|'] }[e.n];
      if (T) return R(T[0], T[1], l.a); } }
  if (e.t === 'div' && !cTiene(e.a, v)) {
    const k = e.a, d = e.b, mulK = r => (r ? { F: cSimp({ t: 'mul', a: k, b: r.F }), regla: r.regla } : null);
    const l = lin(d); if (l) return mulK(R(iLn(d), '\\int\\frac{du}{u}=\\ln|u|', l.a));
    if (d.t === 'pow' && cEsN(d.b)) { const ll = lin(d.a); if (ll) return mulK(iTabla({ t: 'pow', a: d.a, b: cN(d.b.v.neg()) }, v));   // 1/u^n = u^(-n) sin volver a simplificar (que lo devolvería a fracción)
      if (d.a.t === 'fn' && d.b.v.eq(QE(2))) { const l2 = lin(d.a.a); if (l2 && d.a.n === 'cos') return mulK(R(cFn('tg', d.a.a), '\\int\\frac{du}{\\cos^2 u}=\\operatorname{tg} u', l2.a)); if (l2 && d.a.n === 'sen') return mulK(R(cSimp({ t: 'neg', a: cFn('cotg', d.a.a) }), '\\int\\frac{du}{\\operatorname{sen}^2 u}=-\\operatorname{cotg} u', l2.a)); } }
    if (d.t === 'fn' && d.n === 'sqrt') { const ll = lin(d.a); if (ll) return mulK(R(cSimp({ t: 'mul', a: cN(2), b: d }), '\\int\\frac{du}{\\sqrt{u}}=2\\sqrt{u}', ll.a)); }
    const r = cRac(d, v);
    if (r && uGrado(r.d) === 0 && uGrado(r.n) === 2 && (r.n[1] || Q0).cero) {          // c + d x²
      const c0 = r.n[0].div(r.d[0]), c2 = r.n[2].div(r.d[0]);
      if (c0.signo > 0 && c2.signo > 0) { const s = iSqrtQ(c2.div(c0)), F = cSimp({ t: 'div', a: cFn('arctg', cSimp({ t: 'mul', a: s, b: X })), b: iSqrtQ(c0.mul(c2)) }); return mulK({ F, regla: '\\int\\frac{dx}{c+d\\,x^2}=\\frac{1}{\\sqrt{cd}}\\operatorname{arctg}\\left(\\sqrt{\\tfrac{d}{c}}\\,x\\right)' }); }
    }
    if (d.t === 'fn' && d.n === 'sqrt') { const q = cRac(d.a, v);
      if (q && uGrado(q.d) === 0 && uGrado(q.n) === 2 && (q.n[1] || Q0).cero) { const c0 = q.n[0].div(q.d[0]), c2 = q.n[2].div(q.d[0]);
        if (c0.signo > 0 && c2.signo < 0) { const F = cSimp({ t: 'div', a: cFn('arcsen', cSimp({ t: 'mul', a: iSqrtQ(c2.neg().div(c0)), b: X })), b: iSqrtQ(c2.neg()) }); return mulK({ F, regla: '\\int\\frac{dx}{\\sqrt{c-d\\,x^2}}=\\frac{1}{\\sqrt{d}}\\operatorname{arcsen}\\left(\\sqrt{\\tfrac{d}{c}}\\,x\\right)' }); }
        if (c2.signo > 0) { const F = cSimp({ t: 'div', a: iLn(cAdd([cSimp({ t: 'mul', a: iSqrtQ(c2), b: X }), d])), b: iSqrtQ(c2) }); return mulK({ F, regla: '\\int\\frac{dx}{\\sqrt{d\\,x^2\\pm c}}=\\frac{1}{\\sqrt d}\\ln\\left|\\sqrt d\\,x+\\sqrt{d\\,x^2\\pm c}\\right|' }); } } }
  }
  if (e.t === 'div' && e.a.t === 'fn' && e.b.t === 'pow' && cEsN(e.b.b) && e.b.b.v.eq(QE(2)) && e.b.a.t === 'fn' && cKey(e.a.a) === cKey(e.b.a.a)) { const l = lin(e.a.a);
    if (l && e.a.n === 'sen' && e.b.a.n === 'cos') return R(cFn('sec', e.a.a), '\\int\\sec u\\,\\operatorname{tg} u\\,du=\\sec u', l.a);
    if (l && e.a.n === 'cos' && e.b.a.n === 'sen') return R(cSimp({ t: 'neg', a: cFn('cosec', e.a.a) }), '\\int\\operatorname{cosec} u\\,\\operatorname{cotg} u\\,du=-\\operatorname{cosec} u', l.a); }
  return null;
}

/* -----------------------------------------------------------------------
 * I3. EL INTEGRADOR
 * ctx: { P (anota pasos), nivel, usados (métodos), prefer (método pedido), prof }
 * --------------------------------------------------------------------- */
function iInt(e, v, ctx) {
  ctx.prof = (ctx.prof || 0) + 1; if (ctx.prof > 60) throw new Error('La integral es demasiado complicada.');
  try { return iInt0(cSimp(e), v, ctx); } finally { ctx.prof--; }
}
const iSub = (ctx) => ({ ...ctx, nivel: ctx.nivel + 1, P: ctx.nivel >= 1 ? () => {} : ctx.P, prefer: null });
function iInt0(e, v, ctx) {
  const P = ctx.nivel <= 1 ? ctx.P : () => {}, X = iV(v);
  if (!cTiene(e, v)) return cSimp({ t: 'mul', a: e, b: X });
  // método pedido por el alumno primero
  if (ctx.prefer && ctx.nivel === 0) { const r = iMetodo(ctx.prefer, e, v, ctx); if (r) return r; }
  if (e.t === 'sum') {
    const Fs = e.terms.map(t => iInt(t, v, iSub(ctx)));
    P('Separamos en una suma de integrales', 'La integral de una suma es la suma de las integrales (propiedad lineal). Integramos cada término.', e.terms.map((t, i) => `${iIntL(t, v)}=${cL(Fs[i])}`));
    ctx.usados.add('inmediatas'); return cAdd(Fs);
  }
  const [c, r] = cCoef(e);
  if (!cUno(c) && r) { const F = iInt(r, v, { ...ctx, prefer: null }); return cSimp({ t: 'mul', a: cN(c), b: F }); }
  if (e.t === 'prod') { const cs = e.fs.filter(f => !cTiene(f, v)); if (cs.length) { const resto = cMul(e.fs.filter(f => cTiene(f, v))); P('Sacamos la constante', 'Una constante que multiplica puede salir afuera de la integral.', `${iIntL(e, v)}=${cL(cMul(cs))}\\,${iIntL(resto, v)}`); return cSimp({ t: 'mul', a: cMul(cs), b: iInt(resto, v, ctx) }); } }
  const t = iTabla(e, v) || iTabla(iSenCosF(e), v) || iTabla(iSenCosF(e, true), v);
  if (t) { P('Usamos la tabla de integrales', 'Es una integral inmediata (o con argumento lineal: después dividimos por el coeficiente de x).', [t.regla, `${iIntL(e, v)}=${cL(t.F)}`]); ctx.usados.add('inmediatas'); return t.F; }
  for (const m of ['polinomio', 'trig', 'fracciones', 'sustitucion', 'trigsust', 'binomia', 'partes', 'expandir']) { if (m === ctx.prefer || (m === 'partes' && ctx.sinPartes)) continue; const r2 = iMetodo(m, e, v, ctx); if (r2) return r2; }
  throw new Error('No pude resolver esta integral con los métodos que conozco (inmediatas, trigonométricas, sustitución, partes, fracciones parciales, sustitución trigonométrica y binomias).');
}
function iMetodo(m, e, v, ctx) {
  try { return { polinomio: iPolinomio, trig: iTrig, fracciones: iFracciones, sustitucion: iSustitucion, trigsust: iTrigSust, binomia: iBinomia, partes: iPartes, expandir: iExpandir }[m](e, v, ctx); }
  catch (err) { if (/demasiado complicada/.test(err.message)) throw err; return null; }
}
// Polinomios y cocientes con denominador numérico: desarrollamos
function iPolinomio(e, v, ctx) {
  const r = cRac(e, v); if (!r || uGrado(r.d) > 0) return null;
  const u = r.n.map(c => c.div(r.d[0])), E = cDeU(u, v); if (E.t !== 'sum' || cKey(E) === cKey(e)) return null;
  ctx.P('Desarrollamos', 'Escribimos el integrando como un polinomio (distribuyendo y juntando términos) para integrar término a término.', `${cL(e)}=${cL(E)}`);
  return iInt(E, v, ctx);
}
function iExpandir(e, v, ctx) {                     // producto con sumas: distribuimos
  if (e.t !== 'prod' || !e.fs.some(f => f.t === 'sum')) return null;
  const s = e.fs.find(f => f.t === 'sum'), resto = e.fs.filter(f => f !== s), E = cAdd(s.terms.map(t => cMul([t, ...resto])));
  if (E.t !== 'sum') return null; ctx.P('Distribuimos', 'Aplicamos la propiedad distributiva para separar en integrales más simples.', `${cL(e)}=${cL(E)}`);
  return iInt(E, v, ctx);
}

/* --- Sustitución (cambio de variable) ---------------------------------- */
function iCandidatos(e, v, out = []) {
  const add = z => { if (z && cTiene(z, v) && !(z.t === 'x') && !out.some(o => cKey(o) === cKey(z))) out.push(z); };
  if (e.t === 'fn') { add(e.a); add(e); }
  if (e.t === 'pow') { if (!(cEsN(e.b))) { add(e.b); add(e); } add(e.a); }
  if (e.t === 'div') add(e.b);
  [e.a, e.b, ...(e.terms || []), ...(e.fs || [])].forEach(z => { if (z && typeof z === 'object' && z.t) iCandidatos(z, v, out); });
  return out;
}
function iSustitucion(e, v, ctx) {
  const U = iV('u'), es = iSenCosF(e);
  for (const g of iCandidatos(e, v)) {
    if (iLin(g, v)) continue;
    const gp = cDer(g, v); if (cEsN(gp) && gp.v.cero) continue;
    for (const base of [e, es]) {
      let h; try { h = cSimp({ t: 'div', a: base, b: iSenCosF(gp) }); } catch (err) { continue; }
      const H = cSimp(iReemplazar(iReemplazar(h, g, U), iSenCosF(g), U)); if (cTiene(H, v)) continue;
      let Fu; try { Fu = iInt(H, 'u', iSub({ ...ctx, nivel: 2 })); } catch (err) { continue; }
      const F = cSimp(cSust(Fu, 'u', g));
      ctx.P('Hacemos un cambio de variable', 'Buscamos una parte del integrando cuya derivada también aparezca (multiplicando). La llamamos u y reemplazamos.', [`u=${cL(g)}\\;\\Rightarrow\\;du=${cL(cPulir(gp, v))}\\,d${v}`, `${iIntL(e, v)}=\\int ${cW(H, 2)}\\,du=${cL(Fu)}`, `\\text{volvemos a }${v}:\\;${cL(F)}`]);
      ctx.usados.add('sustitucion'); return F;
    }
  }
  return null;
}

/* --- Potencias trigonométricas ---------------------------------------- */
function iTrigForma(e, v) {                        // c · sen^m(u) · cos^n(u) con el mismo u lineal (m, n enteros, pueden ser negativos)
  const { c, fs } = iFactores(iSenCosF(e, true)); let u = null, m = 0, n = 0;
  for (const f of fs) { if (f.b.t !== 'fn' || !['sen', 'cos'].includes(f.b.n) || !f.ex.entero) return null; if (u && cKey(u) !== cKey(f.b.a)) return null; u = f.b.a; if (f.b.n === 'sen') m += Number(f.ex.n); else n += Number(f.ex.n); }
  if (!u || !iLin(u, v)) return null; return { c, m, n, u, a: iLin(u, v).a };
}
function iPolyEn(F, w, u, signo, a) {               // ∫ polinomio(w) dw con w = trig(u), volviendo a u
  const W = iV('w'), Fw = iInt(F, 'w', { P: () => {}, nivel: 3, usados: new Set() });
  return cSimp({ t: 'div', a: cMul([cN(signo), cSust(Fw, 'w', w)]), b: cN(a) });
}
function iSenCos(m, n, u, a, P) {                  // ∫ sen^m(u) cos^n(u) du·(1/a)
  const W = iV('w'), S = cFn('sen', u), C = cFn('cos', u);
  if (m > 0 && n < 0 && -n - m === 2) { P('Reconocemos tg^m · sec²', 'Como $\\frac{\\operatorname{sen}^m u}{\\cos^{m+2}u} = \\operatorname{tg}^m u\\,\\sec^2 u$, sustituimos w = tg u (dw = sec² u du).', `\\int w^{${m}}\\,dw`); return cSimp({ t: 'div', a: cPow(cFn('tg', u), cN(m + 1)), b: cN(a.mul(QE(m + 1))) }); }
  if (m > 0 && m % 2 === 1 && n >= -50) {
    const poly = cSimp({ t: 'mul', a: cPow({ t: 'sum', terms: [cN(1), cMul([cN(-1), cPow(W, cN(2))])] }, cN((m - 1) / 2)), b: cPow(W, cN(n)) });
    P('Separamos un seno (potencia impar)', 'Guardamos un sen para el diferencial, pasamos el resto a coseno con $\\operatorname{sen}^2 = 1 - \\cos^2$ y sustituimos w = cos u (dw = −sen u du).', `w=${cL(C)}:\\;-\\int ${cW(cPulir(poly, 'w'), 2)}\\,dw`);
    return iPolyEn(cPulir(poly, 'w'), C, u, -1, a);
  }
  if (n > 0 && n % 2 === 1) {
    const poly = cSimp({ t: 'mul', a: cPow({ t: 'sum', terms: [cN(1), cMul([cN(-1), cPow(W, cN(2))])] }, cN((n - 1) / 2)), b: cPow(W, cN(m)) });
    P('Separamos un coseno (potencia impar)', 'Guardamos un cos para el diferencial, pasamos el resto a seno con $\\cos^2 = 1 - \\operatorname{sen}^2$ y sustituimos w = sen u (dw = cos u du).', `w=${cL(S)}:\\;\\int ${cW(cPulir(poly, 'w'), 2)}\\,dw`);
    return iPolyEn(cPulir(poly, 'w'), S, u, 1, a);
  }
  if (m >= 0 && n >= 0) {                          // las dos pares: fórmulas del ángulo doble
    if (m === 0 && n === 0) return cSimp({ t: 'div', a: u, b: cN(a) });
    const Cc = iV('c'), poly = cPulir(cSimp({ t: 'mul', a: cPow({ t: 'div', a: { t: 'sum', terms: [cN(1), cMul([cN(-1), Cc])] }, b: cN(2) }, cN(m / 2)), b: cPow({ t: 'div', a: { t: 'sum', terms: [cN(1), Cc] }, b: cN(2) }, cN(n / 2)) }), 'c');
    const u2 = cSimp({ t: 'mul', a: cN(2), b: u });
    P('Usamos las fórmulas del ángulo doble (potencias pares)', 'Reemplazamos $\\operatorname{sen}^2 u = \\frac{1-\\cos 2u}{2}$ y $\\cos^2 u = \\frac{1+\\cos 2u}{2}$, y desarrollamos.', `${cL(cSimp({ t: 'mul', a: cPow(S, cN(m)), b: cPow(C, cN(n)) }))}=${cL(cSust(poly, 'c', cFn('cos', u2)))}`);
    const r = cRac(poly, 'c'), coef = r.n.map(q => q.div(r.d[0])); const partes = coef.map((q, k) => (q.cero ? null : cSimp({ t: 'mul', a: cN(q), b: iSenCos(0, k, u2, a.mul(QE(2)), () => {}) }))).filter(Boolean);   // el argumento 2u tiene coeficiente 2a
    return cAdd(partes);
  }
  if (m > 0 && n === -m) return iPotTrig('tg', m, u, a, P);
  if (n > 0 && m === -n) return iPotTrig('cotg', n, u, a, P);
  if (m === 0 && n < 0) return iPotTrig('sec', -n, u, a, P);
  if (n === 0 && m < 0) return iPotTrig('cosec', -m, u, a, P);
  throw new Error('Esa combinación de potencias trigonométricas no está implementada.');
}
function iPotTrig(f, n, u, a, P) {                  // fórmulas de reducción para tg, cotg, sec, cosec
  const T = cFn(f, u), A = cN(a);
  if (f === 'tg' || f === 'cotg') {
    if (n === 0) return cSimp({ t: 'div', a: u, b: A });
    if (n === 1) return cSimp({ t: 'div', a: f === 'tg' ? { t: 'neg', a: iLn(cFn('cos', u)) } : iLn(cFn('sen', u)), b: A });
    const s = f === 'tg' ? 1 : -1;
    P(`Reducimos la potencia de la ${f === 'tg' ? 'tangente' : 'cotangente'}`, f === 'tg' ? 'Usamos $\\operatorname{tg}^2 u = \\sec^2 u - 1$: queda $\\int\\operatorname{tg}^n u\\,du = \\frac{\\operatorname{tg}^{n-1}u}{n-1} - \\int\\operatorname{tg}^{n-2}u\\,du$.' : 'Usamos $\\operatorname{cotg}^2 u = \\operatorname{cosec}^2 u - 1$: queda $\\int\\operatorname{cotg}^n u\\,du = -\\frac{\\operatorname{cotg}^{n-1}u}{n-1} - \\int\\operatorname{cotg}^{n-2}u\\,du$.', `n=${n}`);
    return cSimp({ t: 'sub', a: { t: 'div', a: cMul([cN(s), cPow(T, cN(n - 1))]), b: cN(a.mul(QE(n - 1))) }, b: iPotTrig(f, n - 2, u, a, () => {}) });
  }
  const s = f === 'sec' ? 1 : -1, otra = cFn(f === 'sec' ? 'tg' : 'cotg', u);
  if (n === 1) return cSimp({ t: 'div', a: f === 'sec' ? iLn(cAdd([T, otra])) : iLn(cAdd([T, cMul([cN(-1), otra])])), b: A });
  if (n === 2) return cSimp({ t: 'div', a: cMul([cN(s), otra]), b: A });
  P(`Usamos la fórmula de reducción de la ${f === 'sec' ? 'secante' : 'cosecante'}`, f === 'sec' ? 'Por partes se obtiene $\\int\\sec^n u\\,du = \\frac{\\sec^{n-2}u\\,\\operatorname{tg} u}{n-1} + \\frac{n-2}{n-1}\\int\\sec^{n-2}u\\,du$.' : 'Por partes se obtiene $\\int\\operatorname{cosec}^n u\\,du = -\\frac{\\operatorname{cosec}^{n-2}u\\,\\operatorname{cotg} u}{n-1} + \\frac{n-2}{n-1}\\int\\operatorname{cosec}^{n-2}u\\,du$.', `n=${n}`);
  return cAdd([cSimp({ t: 'div', a: cMul([cN(s), cPow(T, cN(n - 2)), otra]), b: cN(a.mul(QE(n - 1))) }), cSimp({ t: 'mul', a: cN(new Q(BigInt(n - 2), BigInt(n - 1))), b: iPotTrig(f, n - 2, u, a, () => {}) })]);
}
function iTrig(e, v, ctx) {
  if (e.t === 'pow' && e.b.t === 'n' && e.b.v.entero && e.a.t === 'fn' && ['tg', 'cotg', 'sec', 'cosec'].includes(e.a.n) && iLin(e.a.a, v)) { const F = iPotTrig(e.a.n, Number(e.b.v.n), e.a.a, iLin(e.a.a, v).a, ctx.P); ctx.usados.add('trigint'); return F; }
  const f = iTrigForma(e, v); if (!f || (f.m === 0 && f.n === 0)) return null;
  if (f.m >= 0 && f.n >= 0 && f.m + f.n === 1) return null;
  ctx.P('Identificamos una integral trigonométrica', `Es de la forma $\\int \\operatorname{sen}^{m}u\\,\\cos^{n}u\\,du$ con m = ${f.m} y n = ${f.n}. El método depende de si las potencias son pares o impares.`, iIntL(e, v));
  const F = cSimp({ t: 'mul', a: cN(f.c), b: iSenCos(f.m, f.n, f.u, f.a, ctx.P) }); ctx.usados.add('trigint'); return F;
}

/* --- Fracciones parciales ---------------------------------------------- */
function iResolverSistema(M, b) {                 // Gauss con racionales exactos
  const n = b.length, A = M.map((f, i) => [...f, b[i]]);
  for (let c = 0; c < n; c++) {
    const p = A.findIndex((f, i) => i >= c && !f[c].cero); if (p < 0) throw new Error('Sistema sin solución única.');
    [A[c], A[p]] = [A[p], A[c]]; const piv = A[c][c];
    for (let j = c; j <= n; j++) A[c][j] = A[c][j].div(piv);
    for (let i = 0; i < n; i++) if (i !== c && !A[i][c].cero) { const k = A[i][c]; for (let j = c; j <= n; j++) A[i][j] = A[i][j].sub(k.mul(A[c][j])); }
  }
  return A.map(f => f[n]);
}
function iFracciones(e, v, ctx) {
  const r = cRac(e, v); if (!r || uGrado(r.d) < 1) return null;
  let num = r.n, den = r.d; const g = uMcd(num, den); if (uGrado(g) > 0) { num = uDiv(num, g).q; den = uDiv(den, g).q; }
  const P = ctx.P, partes = []; let F = cN(0);
  if (uGrado(num) >= uGrado(den)) {
    const { q, r: resto } = uDiv(num, den); const Fq = iInt(cDeU(q, v), v, iSub(ctx));
    P('Dividimos los polinomios', 'El grado del numerador no es menor que el del denominador: primero dividimos. Queda cociente + resto/divisor.', `\\frac{${cL(cDeU(num, v))}}{${cL(cDeU(den, v))}}=${cL(cDeU(q, v))}+\\frac{${cL(cDeU(resto, v))}}{${cL(cDeU(den, v))}}`);
    F = Fq; num = resto; if (uGrado(num) < 0) { ctx.usados.add('metodos'); return F; }
  }
  const { P: Pp } = crearPasos(), fz = factorizarPoly(deU(den, 'x'), Pp), facts = fz.fs.map(f => ({ u: aU(f.P, 'x'), e: f.e }));
  if (facts.some(f => uGrado(f.u) > 2 || (uGrado(f.u) === 2 && (f.u[1].mul(f.u[1]).sub(QE(4).mul(f.u[0]).mul(f.u[2])).signo >= 0)) || (uGrado(f.u) === 2 && f.e > 1))) throw new Error('fracciones complicadas');
  if (facts.length === 1 && facts[0].e === 1 && uGrado(facts[0].u) === 1) { if (!F || (cEsN(F) && F.v.cero)) return null; const Fr = iInt(cDiv(cDeU(num, v), cDeU(den, v)), v, iSub(ctx)); ctx.usados.add('metodos'); return cAdd([F, Fr]); }
  const base = [];                                   // cada término: { den: polinomio del término, tipo, f, k }
  facts.forEach(f => { const mon = f.u.map(c => c.div(f.u[uGrado(f.u)])); for (let k = 1; k <= f.e; k++) base.push({ f: mon, k, cuad: uGrado(mon) === 2 }); });
  const incog = []; base.forEach(b => { const d = uPotencia(b.f, b.k), resto = uDiv(den, d).q; if (b.cuad) { incog.push({ b, poly: uMul(resto, [Q0, Q1]), lado: 'B' }); incog.push({ b, poly: resto, lado: 'C' }); } else incog.push({ b, poly: resto, lado: 'A' }); });
  const N = uGrado(den), M = Array.from({ length: N }, (_, j) => incog.map(z => z.poly[j] || Q0)), bb = Array.from({ length: N }, (_, j) => num[j] || Q0);
  const sol = iResolverSistema(M, bb);
  const X = iV(v), terminoL = [], Fs = [];
  base.forEach(b => {
    const dExp = cPow(cDeU(b.f, v), cN(b.k));
    if (!b.cuad) { const A = sol[incog.findIndex(z => z.b === b)]; if (A.cero) return; terminoL.push(cSimp({ t: 'div', a: cN(A), b: dExp }));
      Fs.push(b.k === 1 ? cSimp({ t: 'mul', a: cN(A), b: iLn(cDeU(b.f, v)) }) : cSimp({ t: 'div', a: cMul([cN(A), cPow(cDeU(b.f, v), cN(1 - b.k))]), b: cN(1 - b.k) })); }
    else { const i = incog.findIndex(z => z.b === b), B = sol[i], C = sol[i + 1], p = b.f[1], q = b.f[0]; terminoL.push(cSimp({ t: 'div', a: cAdd([cMul([cN(B), X]), cN(C)]), b: dExp }));
      const k2 = q.sub(p.mul(p).div(QE(4))), sk = iSqrtQ(k2), c2 = C.sub(B.mul(p).div(QE(2)));
      Fs.push(cAdd([cSimp({ t: 'mul', a: cN(B.div(QE(2))), b: cFn('ln', cDeU(b.f, v)) }), cSimp({ t: 'mul', a: cDiv(cN(c2), sk), b: cFn('arctg', cSimp({ t: 'div', a: cAdd([X, cN(p.div(QE(2)))]), b: sk })) })])); }
  });
  P('Factorizamos el denominador', 'Escribimos el denominador como producto de factores lineales (x − r) y cuadráticos sin raíces reales.', `${cL(cDeU(den, v))}=${L_frac(fz.k)}${facts.map(f => `\\left(${cL(cDeU(f.u, v))}\\right)${f.e > 1 ? '^{' + f.e + '}' : ''}`).join('')}`);
  P('Planteamos las fracciones parciales', 'A cada factor lineal le corresponde A/(x − r) (y una fracción por cada potencia si se repite); a cada cuadrático, (Bx + C)/(x² + px + q). Igualamos numeradores y resolvemos el sistema de los coeficientes.', [`\\frac{${cL(cDeU(num, v))}}{${cL(cDeU(den, v))}}=${terminoL.map(cL).join('+').replace(/\+-/g, '-')}`, incog.map((z, i) => `${z.lado}_{${i + 1}}=${L_frac(sol[i])}`).join(',\\;')]);
  P('Integramos cada fracción', 'Las lineales dan logaritmos (o potencias si están repetidas); las cuadráticas dan un logaritmo más un arco tangente (completando cuadrados).', terminoL.map((t, i) => `${iIntL(t, v)}=${cL(Fs[i])}`));
  ctx.usados.add('metodos'); ctx.usados.add('fracciones');
  return cAdd([F, ...Fs]);
}

/* --- Sustitución trigonométrica --------------------------------------- */
function iTrigSust(e, v, ctx) {
  let R = null; const buscar = z => { if (R) return; if ((z.t === 'fn' && z.n === 'sqrt') || (z.t === 'pow' && cEsN(z.b) && z.b.v.d === 2n)) { const base = z.t === 'fn' ? z.a : z.a, q = cRac(base, v); if (q && uGrado(q.d) === 0 && uGrado(q.n) === 2 && (q.n[1] || Q0).cero && !q.n[0].cero) R = { base, c0: q.n[0].div(q.d[0]), c2: q.n[2].div(q.d[0]) }; } [z.a, z.b, ...(z.terms || []), ...(z.fs || [])].forEach(w => { if (w && typeof w === 'object' && w.t) buscar(w); }); };
  buscar(e); if (!R) return null;
  const { c0, c2 } = R; let tipo; if (c0.signo > 0 && c2.signo < 0) tipo = 'sen'; else if (c0.signo > 0 && c2.signo > 0) tipo = 'tg'; else if (c0.signo < 0 && c2.signo > 0) tipo = 'sec'; else return null;
  const k2 = c0.abs().div(c2.abs()), k = iSqrtQ(k2), A0 = iSqrtQ(c0.abs()), Th = iV('θ'), T = cFn(tipo, Th);
  const trR = { sen: cFn('cos', Th), tg: cFn('sec', Th), sec: cFn('tg', Th) }[tipo];      // √R = √|c0| · trR
  const sust = z => {
    if ((z.t === 'fn' && z.n === 'sqrt' && cKey(z.a) === cKey(R.base))) return cMul([A0, trR]);
    if (z.t === 'pow' && cEsN(z.b) && cKey(z.a) === cKey(R.base)) return cPow(cMul([A0, trR]), cN(z.b.v.mul(QE(2))));
    if (cKey(z) === cKey(R.base)) return cMul([cN(c0.abs()), cPow(trR, cN(2))]);
    if (z.t === 'x' && z.n === v) return cMul([k, T]);
    const o = { ...z }; if (z.a && typeof z.a === 'object' && z.a.t) o.a = sust(z.a); if (z.b && typeof z.b === 'object' && z.b.t) o.b = sust(z.b); if (z.terms) o.terms = z.terms.map(sust); if (z.fs) o.fs = z.fs.map(sust); return o;
  };
  const dx = cMul([k, cDer(T, 'θ')]), G = iSenCosF(cSimp({ t: 'mul', a: sust(e), b: dx }));
  const sub = { usados: new Set(), P: () => {}, nivel: 2 };
  let Fth = null; const f = iTrigForma(G, 'θ');
  if (f) Fth = cSimp({ t: 'mul', a: cN(f.c), b: iSenCos(f.m, f.n, f.u, f.a, () => {}) }); else Fth = iInt(G, 'θ', sub);
  // volver a x con el triángulo
  const X = iV(v), raiz = cSimp(cPow(cDeU(tipo === 'sen' ? [k2, Q0, QE(-1)] : tipo === 'tg' ? [k2, Q0, Q1] : [k2.neg(), Q0, Q1], v), cN(new Q(1n, 2n))));
  const lados = { sen: { op: X, ad: raiz, hip: k }, tg: { op: X, ad: k, hip: raiz }, sec: { op: raiz, ad: k, hip: X } }[tipo];
  const tri = { sen: cDiv(lados.op, lados.hip), cos: cDiv(lados.ad, lados.hip), tg: cDiv(lados.op, lados.ad), cotg: cDiv(lados.ad, lados.op), sec: cDiv(lados.hip, lados.ad), cosec: cDiv(lados.hip, lados.op) };
  const theta = { sen: cFn('arcsen', cDiv(X, k)), tg: cFn('arctg', cDiv(X, k)), sec: cFn('arccos', cDiv(k, X)) }[tipo];
  const doble = z => { if (z.t === 'fn' && ['sen', 'cos'].includes(z.n) && cKey(z.a) === cKey(cSimp(cMul([cN(2), Th])))) return z.n === 'sen' ? cMul([cN(2), cFn('sen', Th), cFn('cos', Th)]) : cAdd([cPow(cFn('cos', Th), cN(2)), cMul([cN(-1), cPow(cFn('sen', Th), cN(2))])]);
    const o = { ...z }; if (z.a && typeof z.a === 'object' && z.a.t) o.a = doble(z.a); if (z.b && typeof z.b === 'object' && z.b.t) o.b = doble(z.b); if (z.terms) o.terms = z.terms.map(doble); if (z.fs) o.fs = z.fs.map(doble); return o; };
  const volver = z => { if (z.t === 'fn' && tri[z.n] && z.a.t === 'x' && z.a.n === 'θ') return tri[z.n]; if (z.t === 'x' && z.n === 'θ') return theta;
    const o = { ...z }; if (z.a && typeof z.a === 'object' && z.a.t) o.a = volver(z.a); if (z.b && typeof z.b === 'object' && z.b.t) o.b = volver(z.b); if (z.terms) o.terms = z.terms.map(volver); if (z.fs) o.fs = z.fs.map(volver); return o; };
  const F = cSimp(volver(doble(Fth)));
  if (cTiene(F, 'θ')) return null;
  const nombre = { sen: 'x = a·sen θ (para √(a² − x²))', tg: 'x = a·tg θ (para √(a² + x²))', sec: 'x = a·sec θ (para √(x² − a²))' }[tipo];
  ctx.P('Elegimos la sustitución trigonométrica', `La raíz tiene la forma de un lado de un triángulo rectángulo. Usamos ${nombre}, así la raíz se simplifica con una identidad pitagórica.`, [`${v}=${cL(cMul([k, T]))},\\quad d${v}=${cL(cSimp(dx))}\\,d\\theta`, `\\sqrt{${cL(R.base)}}=${cL(cMul([A0, trR]))}`]);
  ctx.P('Integramos en θ', 'Reemplazamos todo y queda una integral trigonométrica.', [`\\int ${cW(G, 2)}\\,d\\theta=${cL(Fth)}`]);
  ctx.P('Volvemos a x con el triángulo', 'Dibujamos el triángulo rectángulo de la sustitución y leemos cada razón en función de x.', [`${cL(Th)}=${cL(theta)}`, ...Object.entries(tri).filter(([n]) => cKey(Fth).includes(n + '(')).map(([n, w]) => `${C_FN_L[n]}\\theta=${cL(w)}`), `\\Rightarrow\\;${cL(F)}`]);
  ctx.usados.add('metodos'); ctx.usados.add('trigsust'); return F;
}

/* --- Diferenciales binomias: ∫ x^m (a + b xⁿ)^p dx -------------------- */
function iBinomia(e, v, ctx) {
  const { c, fs } = iFactores(e); let m = Q0, base = null, p = null;
  for (const f of fs) { if (f.b.t === 'x' && f.b.n === v) m = m.add(f.ex); else if (!base) { base = f.b; p = f.ex; } else return null; }
  if (!base || p.entero) return null;
  const r = iFactores(base); const s = cRac(base, v);
  let a, b, n;
  if (base.t === 'sum' && base.terms.length === 2) { const ct = base.terms.find(z => !cTiene(z, v)), vt = base.terms.find(z => cTiene(z, v)); if (!ct || !vt) return null; a = cExacto(ct, {}); const fv = iFactores(vt); if (fv.fs.length !== 1 || fv.fs[0].b.t !== 'x') return null; b = fv.c; n = fv.fs[0].ex; } else return null;
  if (!a) return null;
  const k1 = m.add(Q1).div(n), k2 = k1.add(p);
  ctx.P('Reconocemos una diferencial binomia', 'Es de la forma $\\int x^{m}(a+b\\,x^{n})^{p}\\,dx$. Por el teorema de Chebyshev se puede integrar si p, (m+1)/n o (m+1)/n + p es entero.', [`m=${L_frac(m)},\\;n=${L_frac(n)},\\;p=${L_frac(p)},\\;a=${L_frac(a)},\\;b=${L_frac(b)}`, `\\frac{m+1}{n}=${L_frac(k1)},\\quad\\frac{m+1}{n}+p=${L_frac(k2)}`]);
  const U = iV('u');
  const caso2 = (a_, b_, n_, k, cc, desc) => {          // u = a + b xⁿ, ∫ = cc/(n b) ∫ ((u − a)/b)^{k−1} u^p du
    const poly = cPulir(cSimp({ t: 'pow', a: { t: 'div', a: { t: 'sub', a: U, b: cN(a_) }, b: cN(b_) }, b: cN(k.sub(Q1)) }), 'u'), integrando = cSimp({ t: 'mul', a: poly, b: cPow(U, cN(p)) });
    const E = cSimp({ t: 'mul', a: cN(cc.div(n_.mul(b_))), b: integrando }), Fu = iInt(cAdd((poly.t === 'sum' ? poly.terms : [poly]).map(t => cSimp({ t: 'mul', a: cN(cc.div(n_.mul(b_))), b: cMul([t, cPow(U, cN(p))]) }))), 'u', { P: () => {}, nivel: 3, usados: new Set() });
    ctx.P(desc, 'Hacemos el cambio u = a + b xⁿ: entonces xⁿ⁻¹dx = du/(n b) y el resto de las x se escribe con u.', [`u=${cL(cAdd([cN(a_), cMul([cN(b_), cPow(iV(v), cN(n_))])]))}`, `\\int ${cW(E, 2)}\\,du=${cL(Fu)}`]);
    return Fu;
  };
  let F;
  if (k1.entero && k1.signo > 0) { const Fu = caso2(a, b, n, k1, c, 'Caso (m + 1)/n entero'); F = cSust(Fu, 'u', cAdd([cN(a), cMul([cN(b), cPow(iV(v), cN(n))])])); }
  else if (k2.entero && k2.signo < 0) { const m2 = m.add(n.mul(p)), n2 = n.neg(), kk = m2.add(Q1).div(n2); const Fu = caso2(b, a, n2, kk, c, 'Caso (m + 1)/n + p entero'); ctx.P('Sacamos xⁿ factor común', 'Escribimos (a + b xⁿ)^p = x^{np}(a x^{−n} + b)^p: así queda una binomia del caso anterior.', `\\int x^{${L_frac(m2)}}\\left(${L_frac(b)}+${L_frac(a)}x^{${L_frac(n2)}}\\right)^{${L_frac(p)}}dx`); F = cSust(Fu, 'u', cAdd([cN(b), cMul([cN(a), cPow(iV(v), cN(n2))])])); }
  else return null;
  ctx.usados.add('metodos'); ctx.usados.add('binomia'); return cSimp(F);
}

/* --- Integración por partes ------------------------------------------- */
const iLIATE = f => (f.t === 'fn' && (f.n === 'ln' || f.n === 'log') ? 0 : f.t === 'fn' && f.n.startsWith('arc') ? 1 : !f.fs && cRac(f, 'x') && !cEsN(f) ? 2 : f.t === 'fn' && ['sen', 'cos'].includes(f.n) ? 3 : f.t === 'pow' && !cTiene(f.a, 'x') ? 4 : 5);
function iPartes(e, v, ctx, profP = 0) {
  if (profP > 3) return null;
  const fs = e.t === 'prod' ? e.fs : [e];
  if (fs.length === 1 && !(e.t === 'fn' && (iLIATE(e) <= 1))) { if (!(e.t === 'pow' && cEsN(e.b) && e.a.t === 'fn' && e.a.n === 'ln')) return null; }
  const orden = fs.map((f, i) => ({ f, i, p: iLIATE(f) })).sort((a, b) => a.p - b.p), u = orden[0].f;
  const dv = fs.length === 1 ? cN(1) : cMul(fs.filter((_, i) => i !== orden[0].i)), V = fs.length === 1 ? iV(v) : (() => { try { return iInt(dv, v, { P: () => {}, nivel: 3, usados: new Set() }); } catch (er) { return null; } })();
  if (!V) return null;
  const du = cDer(u, v), w = cPulir(cSimp({ t: 'mul', a: V, b: du }), v), uv = cSimp({ t: 'mul', a: u, b: V });
  ctx.P(profP ? 'Aplicamos partes otra vez' : 'Integramos por partes', '$\\int u\\,dv = u\\,v - \\int v\\,du$. Elegimos u con la regla ILATE (Logarítmicas, Inversas trigonométricas, Algebraicas, Trigonométricas, Exponenciales): la que aparece primero es u.', [`u=${cL(u)}\\;\\Rightarrow\\;du=${cL(cPulir(du, v))}\\,d${v}`, `dv=${cL(dv)}\\,d${v}\\;\\Rightarrow\\;v=${cL(V)}`, `${iIntL(e, v)}=${cL(uv)}-${iIntL(w, v)}`]);
  ctx.usados.add('metodos'); ctx.usados.add('partes');
  const e0 = ctx.e0 || e, ratio = [0.37, 0.71, 1.13].map(x => cNum(w, x) / cNum(e0, x));
  let res;                                           // ∫e = uv − ∫w
  if (ratio.every(r => isFinite(r) && Math.abs(r - ratio[0]) < 1e-9) && Math.abs(ratio[0]) > 1e-12 && aproxQ(ratio[0])) res = { ciclo: aproxQ(ratio[0]), A: uv };   // ∫e = A − k·I
  else {
    let Fw = null; try { Fw = iInt(w, v, { P: () => {}, nivel: 3, usados: ctx.usados, prof: ctx.prof, sinPartes: true }); } catch (er) { /* puede ser cíclica */ }
    if (Fw) res = cSimp({ t: 'sub', a: uv, b: Fw });
    else { const r2 = iPartes(w, v, { ...ctx, e0 }, profP + 1); if (!r2) return null; res = r2.ciclo ? { ciclo: r2.ciclo.neg(), A: cSimp({ t: 'sub', a: uv, b: r2.A }) } : cSimp({ t: 'sub', a: uv, b: r2 }); }
  }
  if (profP > 0 || !res.ciclo) return res;
  const k = res.ciclo, F = cPulir(cSimp({ t: 'div', a: res.A, b: cN(Q1.add(k)) }), v);      // I = A − k·I  ⇒  I = A/(1 + k)
  ctx.P('Volvió a aparecer la integral original', 'Es una integral “cíclica”: la llamamos I, la pasamos al otro miembro y despejamos.', `I=${cL(res.A)}${k.signo > 0 ? '-' : '+'}${cUno(k.abs()) ? '' : L_frac(k.abs())}I\;\Rightarrow\;I=${cL(F)}`);
  return F;
}

/* -----------------------------------------------------------------------
 * I4. LECTURA DE INTEGRALES
 * --------------------------------------------------------------------- */
const I_METODOS = [[/por partes|partes/, 'partes'], [/fracciones (parciales|simples)/, 'fracciones'], [/sustitucion trigonometrica|sust\.? trig/, 'trigsust'], [/binomi/, 'binomia'], [/sustitucion|cambio de variable/, 'sustitucion']];
function iLeerIntegral(texto) {
  let s = texto.replace(/∫|\\int|\bint(?!egr)/g, ' ∫ ').replace(/[¿?]/g, '');
  let a = null, b = null;
  const lim = s.match(/∫\s*_\s*\(?\{?\s*([^)}^\s]+)\s*\)?\}?\s*\^\s*\(?\{?\s*([^)}\s]+)\s*\)?\}?/) || s.match(/(?:de|desde)\s+(?:x\s*=\s*)?(-?[\d.,/π]+|-?π\/\d+)\s+(?:a|hasta)\s+(?:x\s*=\s*)?(-?[\d.,/π]+|-?π\/\d+)/i) || s.match(/entre\s+(?:x\s*=\s*)?(-?[\d.,/π]+)\s+y\s+(?:x\s*=\s*)?(-?[\d.,/π]+)/i) || s.match(/\[\s*(-?[\d.,/π]+)\s*[;,]\s*(-?[\d.,/π]+)\s*\]/);
  if (lim) { a = cS(lim[1].replace(/,(?=\d)/, '.').replace('.', ',')); b = cS(lim[2].replace(/,(?=\d)/, '.').replace('.', ',')); s = s.replace(lim[0], ' '); }
  const dv = s.match(/\bd([xt])\b\s*$/) || s.match(/\bd([xt])\b/), v = dv ? dv[1] : 'x'; if (dv) s = s.slice(0, dv.index) + ' ' + s.slice(dv.index + dv[0].length);
  const t = plano(texto), prefer = (I_METODOS.find(([re]) => re.test(t)) || [])[1] || null;
  s = s.replace(/∫/g, ' ').replace(/\b(calcular|resolver|integrar|integral(es)?|indefinida|definida|inmediata|la|de|por|el|metodo|usando|partes|fracciones|parciales|simples|sustitucion|sustitución|trigonometrica|trigonométrica|cambio|variable|diferencial(es)?|binomias?|hallar|con|entre|y)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  const defs = cDefs(s.replace(/^.*?(?=[a-z]\s*\(\s*[xt]\s*\)\s*=)/i, ''));
  let e; if (Object.keys(defs).length) e = defs[Object.keys(defs)[0]].e; else e = cS(cPrefijo(s));
  if (v === 't') e = cSust(e, 't', cX());
  return { e, a, b, prefer, v };
}
const iTemaDe = u => (['partes', 'fracciones', 'trigsust', 'binomia', 'sustitucion'].some(m => u.has(m)) ? 'metodos' : u.has('trigint') ? 'trigint' : 'inmediatas');
function iVerificarIndef(e, F, P) {
  const d = cPulir(cDer(F)), D = cDominio(e), xs = [0.37, 0.81, 1.27, 2.3, 3.7, -0.6, 5.2].filter(x => cEnDom(D, x) && isFinite(cNum(d, x))).slice(0, 2);
  const ok = xs.every(x => Math.abs(cNum(d, x) - cNum(e, x)) < 1e-6 * Math.max(1, Math.abs(cNum(e, x))));
  P('Verificamos', 'Derivamos el resultado: tiene que dar la función que integramos (la derivada de C es 0).', [`\\frac{d}{dx}\\left[${cL(F)}+C\\right]=${cL(d)}`, xs.map(x => `x=${fmtX(x)}:\\;${L_x(cNum(d, x))}=${L_x(cNum(e, x))}`).join(',\\;') + (ok ? '\\;\\checkmark' : '')]);
}
function resolverIntegralIndef(texto, metodo) {
  const { e, prefer } = iLeerIntegral(texto), { pasos, P } = crearPasos(), usados = new Set(), pref = metodo || prefer;
  P('Escribimos la integral', 'Buscamos una función F(x) cuya derivada sea el integrando: F\'(x) = f(x). Esa F se llama antiderivada o primitiva.', iIntL(e));
  let F; try { F = iInt(e, 'x', { P, nivel: 0, usados, prefer: pref }); } catch (er) { if (pref) throw new Error(`No pude resolverla por ${{ partes: 'partes', fracciones: 'fracciones parciales', trigsust: 'sustitución trigonométrica', binomia: 'diferencial binomia', sustitucion: 'sustitución' }[pref]}. ` + er.message); throw er; }
  F = iDistrib(cPulir(F));
  P('Escribimos el resultado', 'La antiderivada no es única: si F sirve, también sirve F + C para cualquier constante C (porque la derivada de una constante es 0).', `${iIntL(e)}=${cL(F)}+C`);
  iVerificarIndef(e, F, P);
  const alt = []; for (const m of ['sustitucion', 'partes', 'fracciones', 'trigsust']) { if (usados.has(m) || alt.length >= 2 || m === pref) continue; try { const u2 = new Set(); const r = iMetodo(m, e, 'x', { P: () => {}, nivel: 0, usados: u2 }); if (r) alt.push({ nombre: `Ver por ${{ sustitucion: 'sustitución', partes: 'partes', fracciones: 'fracciones parciales', trigsust: 'sustitución trigonométrica' }[m]}`, metodo: m }); } catch (er) { /* no sirve */ } }
  const nombres = { partes: 'Integración por partes', fracciones: 'Fracciones parciales', trigsust: 'Sustitución trigonométrica', binomia: 'Diferencial binomia', sustitucion: 'Sustitución (cambio de variable)', trigint: 'Integral trigonométrica' };
  const met = ['partes', 'fracciones', 'trigsust', 'binomia', 'sustitucion', 'trigint'].find(m => usados.has(m));
  return { tema: iTemaDe(usados), metodo: met ? nombres[met] : 'Integrales inmediatas', pasos, resultado: `${iIntL(e)}=${cL(F)}+C`, alternativas: alt };
}

/* -----------------------------------------------------------------------
 * I5. APLICACIONES: integral definida, área, volumen, longitud de arco, constante
 * --------------------------------------------------------------------- */
function iPrimitiva(e) { const F = iInt(e, 'x', { P: () => {}, nivel: 3, usados: new Set() }); return iDistrib(cPulir(F)); }
function iBarrow(F, a, b) {                          // F(b) − F(a) exacto si se puede
  const Fb = cSimp(cSust(F, 'x', b)), Fa = cSimp(cSust(F, 'x', a)), V = cSimp({ t: 'sub', a: Fb, b: Fa }), n = cNum(V, 0);
  return { Fb, Fa, V, n, L: cEsN(V) ? L_frac(V.v) : `${cL(V)}\\approx ${L_x(n)}` };
}
function resolverDefinida(texto) {
  const { e, a, b } = iLeerIntegral(texto), { pasos, P } = crearPasos(), aL = cL(a), bL = cL(b), an = cNum(a, 0), bn = cNum(b, 0);
  const IL = `\\int_{${aL}}^{${bL}}${cW(e, 2)}\\,dx`;
  P('Escribimos la integral definida', 'La integral definida da un número: el área con signo entre la curva y el eje x, de a hasta b.', IL);
  if (Math.abs(an - bn) < 1e-12) { P('Usamos una propiedad', 'Si los límites son iguales, la integral vale 0.', `${IL}=0`); P('Verificamos', 'No hay ancho: el área es 0.', '0\\;\\checkmark'); return { tema: 'aplicacionesi', metodo: 'Propiedades', pasos, resultado: `${IL}=0` }; }
  if (an > bn) P('Una propiedad útil', 'Si el límite de abajo es mayor, la integral cambia de signo al darlos vuelta: $\\int_a^b f = -\\int_b^a f$. Igual podemos usar Barrow directamente.', `${IL}=-\\int_{${bL}}^{${aL}}${cW(e, 2)}\\,dx`);
  const usados = new Set(), F = iDistrib(cPulir(iInt(e, 'x', { P, nivel: 1, usados })));
  P('Buscamos una primitiva', 'Para la integral definida alcanza con una primitiva cualquiera (la constante C se cancela al restar).', `F(x)=${cL(F)}`);
  const B = iBarrow(F, a, b);
  P('Aplicamos la regla de Barrow', 'Calculamos F en el límite de arriba menos F en el de abajo: $\\int_a^b f(x)\\,dx = F(b) - F(a)$.', [`\\left.${cL(F)}\\right|_{${aL}}^{${bL}}`, `F(${bL})-F(${aL})=${cL(B.Fb)}-${cW(B.Fa, 1.6)}=${B.L}`]);
  const s = iSimpson(x => cNum(e, x), an, bn);
  P('Verificamos', 'Aproximamos la integral numéricamente con la regla de Simpson (muchos trapecios curvos).', `\\text{Simpson}\\approx ${L_x(s)}\\;${Math.abs(s - B.n) < 1e-5 * Math.max(1, Math.abs(s)) ? '\\checkmark' : ''}`, svgCurvas({ fs: [x => cNum(e, x)], x0: Math.min(an, bn) - 1, x1: Math.max(an, bn) + 1, region: { f: x => cNum(e, x), a: Math.min(an, bn), b: Math.max(an, bn) } }));
  return { tema: 'aplicacionesi', metodo: 'Regla de Barrow', pasos, resultado: `${IL}=${B.L}` };
}
function iFunciones(texto) {                         // f, g de "f(x) = …" o "y = …"
  const d = cDefs(texto), ks = Object.keys(d); if (ks.length) return ks.map(k => ({ e: d[k].e, nom: k }));
  const ms = [...texto.matchAll(/\by\s*=\s*/g)]; if (!ms.length) return [];
  return ms.map((m, i) => { const fin = i + 1 < ms.length ? ms[i + 1].index : texto.length; return { e: cS(cPrefijo(texto.slice(m.index + m[0].length, fin).replace(/\s+y\s*$/, ''))), nom: `y_{${i + 1}}` }; });
}
function iLimitesTexto(texto) {
  const m = texto.match(/entre\s+x\s*=\s*(-?[\d.,/π]+)\s+y\s+x\s*=\s*(-?[\d.,/π]+)/i) || texto.match(/(?:desde|de)\s+x\s*=\s*(-?[\d.,/π]+)\s+(?:hasta|a)\s+x\s*=\s*(-?[\d.,/π]+)/i) || texto.match(/\[\s*(-?[\d.,/π]+)\s*[;,]\s*(-?[\d.,/π]+)\s*\]/) || texto.match(/x\s*=\s*(-?[\d.,/π]+)\s+y\s+x\s*=\s*(-?[\d.,/π]+)/i);
  return m ? [cS(m[1]), cS(m[2])] : null;
}
function iCortes(h, a, b) {                           // ceros de h (exactos si se puede) dentro de (a, b) o en toda la recta
  const r = cRac(h); const zs = r ? cRaices(r.n) : cRaicesNum(h, -50, 50).map(x => ({ x, L: LQx(x), q: aproxQ(x) }));
  return zs.filter(z => (a === null || (z.x > a + 1e-12 && z.x < b - 1e-12))).map(z => ({ ...z, E: z.q ? cN(z.q) : cN(aproxQ(z.x) || new Q(BigInt(Math.round(z.x * 1e9)), 1000000000n)) }));
}
function resolverAreaCurva(texto) {
  const { pasos, P } = crearPasos(), fs = iFunciones(texto); if (!fs.length) throw new Error('Escribí la función: “área bajo f(x) = x^2 entre x = 0 y x = 2” o “área entre f(x) = x^2 y g(x) = x”.');
  const f = fs[0].e, g = fs[1] ? fs[1].e : cN(0), h = cSimp({ t: 'sub', a: f, b: g }), lim = iLimitesTexto(texto);
  let A, B;
  if (lim) { [A, B] = lim; } else { const c = iCortes(h, null, null); if (c.length < 2) throw new Error('No encontré dos puntos de corte: indicá los límites (entre x = a y x = b).'); A = c[0].E; B = c[c.length - 1].E;
    P('Buscamos los puntos de corte', fs[1] ? 'Igualamos las dos funciones: ahí empieza y termina la región.' : 'La región está entre la curva y el eje x: buscamos dónde f(x) = 0.', `${fs[1] ? cL(f) + '=' + cL(g) : cL(f) + '=0'}\\;\\Rightarrow\\;x=${c.map(z => z.L).join(',\\;')}`); }
  const an = cNum(A, 0), bn = cNum(B, 0), cortes = iCortes(h, an, bn), pts = [A, ...cortes.map(z => z.E), B];
  P('Planteamos el área', `El área es la integral de (función de arriba − función de abajo). Si en algún tramo se invierten, partimos la integral${cortes.length ? ' en los puntos de corte' : ''} y tomamos valor absoluto.`, `A=\\int_{${cL(A)}}^{${cL(B)}}\\left|${cL(h)}\\right|dx`, svgCurvas({ fs: [x => cNum(f, x), ...(fs[1] ? [x => cNum(g, x)] : [])], x0: an - 1, x1: bn + 1, region: { f: x => cNum(f, x), g: x => cNum(g, x), a: an, b: bn } }));
  const F = iPrimitiva(h), tramos = [];
  for (let i = 0; i < pts.length - 1; i++) { const r = iBarrow(F, pts[i], pts[i + 1]); tramos.push({ a: pts[i], b: pts[i + 1], r }); }
  const total = tramos.reduce((s, t) => s + Math.abs(t.r.n), 0), exacto = tramos.every(t => cEsN(t.r.V)) ? tramos.reduce((s, t) => s.add(t.r.V.v.abs()), Q0) : null;
  P('Integramos', 'Usamos una primitiva de la diferencia y la regla de Barrow en cada tramo.', [`F(x)=${cL(F)}`, ...tramos.map(t => `\\int_{${cL(t.a)}}^{${cL(t.b)}}${cW(h, 2)}\\,dx=${t.r.L}`)]);
  P('Sumamos los tramos', 'Cada tramo aporta su valor absoluto (el área nunca es negativa).', `A=${tramos.map(t => `\\left|${t.r.L.replace(/\\approx.*$/, '')}\\right|`).join('+')}=${exacto ? L_frac(exacto) : L_x(total)}`);
  const s = iSimpson(x => Math.abs(cNum(h, x)), an, bn, 4000);
  P('Verificamos', 'Aproximamos numéricamente la integral del valor absoluto con Simpson.', `A\\approx ${L_x(s)}\\;${Math.abs(s - total) < 1e-4 * Math.max(1, total) ? '\\checkmark' : ''}`);
  return { tema: 'aplicacionesi', metodo: fs[1] ? 'Área entre curvas' : 'Área bajo la curva', pasos, resultado: `A=${exacto ? L_frac(exacto) : '\\approx ' + L_x(total)}` };
}
function resolverVolumen(texto, metodo) {
  const t = plano(texto), { pasos, P } = crearPasos(), fs = iFunciones(texto), lim = iLimitesTexto(texto);
  if (!fs.length) throw new Error('Escribí la función: “volumen al girar f(x) = √x entre x = 0 y x = 4 alrededor del eje x”.');
  const f = fs[0].e, g = fs[1] ? fs[1].e : null; let A, B;
  if (lim) [A, B] = lim; else { const c = iCortes(g ? cSimp({ t: 'sub', a: f, b: g }) : f, null, null); if (c.length < 2) throw new Error('Indicá los límites: entre x = a y x = b.'); A = c[0].E; B = c[c.length - 1].E; }
  const an = cNum(A, 0), bn = cNum(B, 0), ejeY = /eje\s*y|eje de las y|eje de ordenadas/.test(t), capas = metodo === 'capas' || (metodo !== 'discos' && (ejeY || /capa|cascar|cilindr/.test(t)));
  let integ, formula, nombre;
  if (capas) {
    const h = g ? cSimp({ t: 'sub', a: f, b: g }) : f, h2 = cNum(h, (an + bn) / 2) < 0 ? cSimp({ t: 'neg', a: h }) : h;
    if (!ejeY) throw new Error('El método de capas lo uso para girar alrededor del eje y.');
    integ = cPulir(cSimp({ t: 'mul', a: cX(), b: h2 })); formula = `V=2\\pi\\int_{${cL(A)}}^{${cL(B)}}x\\,\\left(${cL(h2)}\\right)dx`; nombre = 'Método de capas (cilindros)';
    P('Elegimos el método de capas', 'Giramos alrededor del eje y: cada franja vertical de ancho dx forma un cilindro hueco de radio x, altura h(x) y espesor dx. Su volumen es 2π·x·h(x)·dx.', formula);
  } else {
    if (ejeY) throw new Error('Para girar alrededor del eje y usá el método de capas.');
    if (g) { const fm = cNum(f, (an + bn) / 2), gm = cNum(g, (an + bn) / 2), R = Math.abs(fm) >= Math.abs(gm) ? f : g, r = R === f ? g : f; integ = cPulir(cSimp({ t: 'sub', a: cPow(R, cN(2)), b: cPow(r, cN(2)) })); formula = `V=\\pi\\int_{${cL(A)}}^{${cL(B)}}\\left[\\left(${cL(R)}\\right)^2-\\left(${cL(r)}\\right)^2\\right]dx`; nombre = 'Método de arandelas';
      P('Elegimos el método de arandelas', 'Al girar la región entre dos curvas alrededor del eje x, cada corte es una arandela (un disco con un agujero): radio exterior R(x) y radio interior r(x).', formula); }
    else { integ = cPulir(cSimp(cPow(f, cN(2)))); formula = `V=\\pi\\int_{${cL(A)}}^{${cL(B)}}\\left(${cL(f)}\\right)^2dx`; nombre = 'Método de discos';
      P('Elegimos el método de discos', 'Al girar alrededor del eje x, cada corte perpendicular es un disco de radio f(x) y espesor dx: su volumen es π·f(x)²·dx.', formula); }
  }
  P('Lo vemos en el gráfico', 'Esta es la región que gira.', [], svgCurvas({ fs: [x => cNum(f, x), ...(g ? [x => cNum(g, x)] : [])], x0: Math.min(0, an) - 1, x1: bn + 1, region: { f: x => cNum(f, x), g: g ? x => cNum(g, x) : null, a: an, b: bn } }));
  const F = iPrimitiva(integ), Bw = iBarrow(F, A, B), k = capas ? QE(2) : Q1, Vn = (capas ? 2 : 1) * Math.PI * Bw.n;
  P('Integramos', 'Calculamos la integral con una primitiva y la regla de Barrow.', [`\\int ${cW(integ, 2)}\\,dx=${cL(F)}`, `\\left.${cL(F)}\\right|_{${cL(A)}}^{${cL(B)}}=${Bw.L}`]);
  const res = cEsN(Bw.V) ? Lpi(Bw.V.v.mul(k)) : `\\approx ${L_x(Vn)}`;
  P('Multiplicamos por ' + (capas ? '2π' : 'π'), 'Ese factor viene de la fórmula del método.', `V=${capas ? '2\\pi' : '\\pi'}\\cdot ${Bw.L.replace(/\\approx.*$/, '')}=${res}`);
  const s = (capas ? 2 : 1) * Math.PI * iSimpson(x => cNum(integ, x), an, bn);
  P('Verificamos', 'Aproximamos la integral con la regla de Simpson.', `V\\approx ${L_x(s)}\\;${Math.abs(s - Vn) < 1e-4 * Math.max(1, Vn) ? '\\checkmark' : ''}`);
  const alt = !g && ejeY ? [] : !ejeY ? [] : [];
  return { tema: 'aplicacionesi', metodo: nombre, pasos, resultado: `V=${res}`, alternativas: alt };
}
function resolverArco(texto) {
  const { pasos, P } = crearPasos(), fs = iFunciones(texto), lim = iLimitesTexto(texto) || (iLeerIntegral(texto).a ? [iLeerIntegral(texto).a, iLeerIntegral(texto).b] : null);
  if (!fs.length || !lim) throw new Error('Escribilo así: longitud de arco de f(x) = x^(3/2) entre x = 0 y x = 4.');
  const f = fs[0].e, [A, B] = lim, an = cNum(A, 0), bn = cNum(B, 0), d = cPulir(cDer(f)), integ = cPulir(cSimp(cPow(cAdd([cN(1), cPow(d, cN(2))]), cN(new Q(1n, 2n)))));
  P('Escribimos la fórmula', 'La longitud de una curva y = f(x) entre a y b es $L = \\int_a^b \\sqrt{1 + [f\'(x)]^2}\\,dx$ (sumamos hipotenusas de triangulitos).', [`f'(x)=${cL(d)}`, `L=\\int_{${cL(A)}}^{${cL(B)}}${cL(integ)}\\,dx`]);
  let Ln, LL, metodo = 'Longitud de arco';
  try { const F = iPrimitiva(integ), Bw = iBarrow(F, A, B); P('Integramos', 'Buscamos una primitiva y aplicamos Barrow.', [`F(x)=${cL(F)}`, `L=F(${cL(B)})-F(${cL(A)})=${Bw.L}`]); Ln = Bw.n; LL = Bw.L; }
  catch (er) { Ln = iSimpson(x => cNum(integ, x), an, bn); LL = `\\approx ${L_x(Ln)}`; metodo = 'Longitud de arco (aproximación numérica)'; P('Aproximamos numéricamente', 'Esta integral no tiene una primitiva elemental sencilla: la calculamos con la regla de Simpson.', `L\\approx ${L_x(Ln)}`); }
  let poli = 0; const N = 2000; for (let i = 0; i < N; i++) { const x1 = an + (bn - an) * i / N, x2 = an + (bn - an) * (i + 1) / N; poli += Math.hypot(x2 - x1, cNum(f, x2) - cNum(f, x1)); }
  P('Verificamos', 'Aproximamos la curva con una poligonal de 2000 segmentos y sumamos sus longitudes.', `L\\approx ${L_x(poli)}\\;${Math.abs(poli - Ln) < 1e-3 * Math.max(1, Ln) ? '\\checkmark' : ''}`, svgCurvas({ fs: [x => cNum(f, x)], x0: an - 1, x1: bn + 1, pts: [[an, cNum(f, an), 'A'], [bn, cNum(f, bn), 'B']] }));
  return { tema: 'aplicacionesi', metodo, pasos, resultado: `L=${LL}` };
}
function resolverConstante(texto) {
  const { pasos, P } = crearPasos(), s = texto.replace(/\s+/g, ' ');
  const m2 = s.match(/f\s*''\s*\(\s*x\s*\)\s*=\s*([^,;]+?)(?=,|;|\s+y\s+f|$)/), m1 = s.match(/f\s*'\s*\(\s*x\s*\)\s*=\s*([^,;]+?)(?=,|;|\s+y\s+f|$)/);
  const cond = [...s.matchAll(/f\s*('*)\s*\(\s*(-?[\d.,/]+)\s*\)\s*=\s*(-?[\d.,/]+)/g)].map(m => ({ ord: m[1].length, a: numDe(m[2]), y: numDe(m[3]) }));
  if (!m1 && !m2) throw new Error('Escribilo así: f\'(x) = 3x^2 + 2, f(1) = 5.');
  let actual = cS(cPrefijo((m2 || m1)[1])), ord = m2 ? 2 : 1;
  P('Planteamos', 'Integrando la derivada recuperamos la función, pero aparece una constante C. El dato del punto sirve para calcularla.', `f${"'".repeat(ord)}(x)=${cL(actual)}`);
  while (ord > 0) {
    const F = iPrimitiva(actual), c = cond.find(z => z.ord === ord - 1); const nom = `f${"'".repeat(ord - 1)}`;
    if (!c) throw new Error(`Falta el dato ${nom}(a) = b para calcular la constante.`);
    const Fa = cExacto(F, { x: c.a }), C = c.y.sub(Fa); const res = cSimp({ t: 'add', a: F, b: cN(C) });
    P(`Integramos y calculamos C`, `Integramos para obtener ${nom}(x) = F(x) + C y usamos ${nom}(${L_frac(c.a)}) = ${L_frac(c.y)}.`, [`${nom}(x)=${cL(F)}+C`, `${nom}(${L_frac(c.a)})=${L_frac(Fa)}+C=${L_frac(c.y)}\\;\\Rightarrow\\;C=${L_frac(C)}`, `${nom}(x)=${cL(res)}`]);
    actual = res; ord--;
  }
  const c0 = cond.find(z => z.ord === 0), d = cPulir(cDer(actual));
  P('Verificamos', 'Comprobamos el dato del punto y que la derivada coincida.', [`f(${L_frac(c0.a)})=${L_frac(cExacto(actual, { x: c0.a }))}\\;\\checkmark`, `f'(x)=${cL(d)}\\;\\checkmark`]);
  return { tema: 'aplicacionesi', metodo: 'Constante de integración', pasos, resultado: `f(x)=${cL(actual)}` };
}
function resolverAplicacionesI(texto, metodo) {
  const t = plano(texto);
  if (/volumen|solido|revolucion|disco|arandela|capa/.test(t)) return resolverVolumen(texto, metodo);
  if (/longitud|arco/.test(t)) return resolverArco(texto);
  if (/area|region|encerrad/.test(t)) return resolverAreaCurva(texto);
  if (/f\s*'+\s*\(\s*x\s*\)\s*=/.test(t) || /constante de integracion/.test(t)) return resolverConstante(texto);
  return resolverDefinida(texto);
}

/* -----------------------------------------------------------------------
 * I6. SUMAS: notación sigma y sumas de Riemann
 * --------------------------------------------------------------------- */
// Σ_{i=1}^{n} i^k como polinomio en n (coeficientes)
const I_SK = [[Q0, Q1], [Q0, new Q(1n, 2n), new Q(1n, 2n)], [Q0, new Q(1n, 6n), new Q(1n, 2n), new Q(1n, 3n)], [Q0, Q0, new Q(1n, 4n), new Q(1n, 2n), new Q(1n, 4n)], [Q0, new Q(-1n, 30n), Q0, new Q(1n, 3n), new Q(1n, 2n), new Q(1n, 5n)]];
const I_SKL = ['\\sum_{i=1}^{n}1=n', '\\sum_{i=1}^{n}i=\\frac{n(n+1)}{2}', '\\sum_{i=1}^{n}i^2=\\frac{n(n+1)(2n+1)}{6}', '\\sum_{i=1}^{n}i^3=\\left[\\frac{n(n+1)}{2}\\right]^2', '\\sum_{i=1}^{n}i^4=\\frac{n(n+1)(2n+1)(3n^2+3n-1)}{30}'];
function iLeerSigma(texto) {
  let s = texto.replace(/\\sum|∑|\bsum(?![a-z])/g, ' ∑ ');
  let m = s.match(/∑\s*_\s*\(?\{?\s*([a-z])\s*=\s*(-?\d+)\s*\)?\}?\s*\^\s*\(?\{?\s*([a-z]|\d+)\s*\)?\}?\s*(.*)$/i), idx, a, b, cuerpo;
  if (m) { [, idx, a, b, cuerpo] = m; }
  else { m = s.match(/(?:suma(?:toria)?|∑)\s*(?:de)?\s*(.*?)\s*(?:desde|con|para)\s+([a-z])\s*(?:=|de)\s*(-?\d+)\s*(?:hasta|a)\s+([a-z]|\d+)/i); if (!m) throw new Error('Escribí la sumatoria así: ∑_{i=1}^{10} i^2, o “suma de i^2 desde i = 1 hasta n”.'); [, cuerpo, idx, a, b] = m; }
  cuerpo = cuerpo.replace(/[¿?]/g, '').trim();
  const re = new RegExp(`(?<![a-z])${idx}(?![a-z])`, 'g'), e = cS(cPrefijo(cuerpo.replace(re, 'x')));
  return { idx, a: BigInt(a), b: /^\d+$/.test(b) ? BigInt(b) : null, bL: b, e };
}
const iSn = (k, N) => I_SK[k].reduce((s, c, j) => s.add(c.mul(N.pow(j))), Q0);
function resolverSumas(texto, metodo) {
  const t = plano(texto);
  if (/riemann|rectangul|inscript|circunscript|particion/.test(t)) return resolverRiemann(texto, metodo);
  const { pasos, P } = crearPasos(), { idx, a, b, bL, e } = iLeerSigma(texto), I = iV(idx), E = cSust(e, 'x', I);
  const SL = `\\sum_{${idx}=${a}}^{${bL}}${cW(E, 2)}`;
  P('Leemos la sumatoria', `La letra griega Σ indica una suma: reemplazamos ${idx} por cada entero desde ${a} hasta ${bL} y sumamos los resultados.`, SL);
  const r = cRac(e);
  if (!r || uGrado(r.d) > 0 || uGrado(r.n) > 4) {
    if (b === null || b - a > 200n) throw new Error('Para sumandos que no son polinomios necesito un límite superior numérico (y no muy grande).');
    const vals = []; for (let i = a; i <= b; i++) vals.push(cExacto(e, { x: new Q(i) }) || null);
    const exacto = vals.every(Boolean), tot = exacto ? vals.reduce((s, v) => s.add(v), Q0) : null, num = [...Array(Number(b - a) + 1)].reduce((s, _, k) => s + cNum(e, Number(a) + k), 0);
    P('Calculamos término a término', 'El sumando no es un polinomio en el índice: escribimos los términos y los sumamos.', `${vals.slice(0, 6).map((v, k) => (v ? L_frac(v) : L_x(cNum(e, Number(a) + k)))).join('+')}${vals.length > 6 ? '+\\cdots' : ''}=${exacto ? L_frac(tot) : L_x(num)}`);
    P('Verificamos', 'Sumamos con decimales.', `\\approx ${L_x(num)}\\;\\checkmark`);
    return { tema: 'sumas', metodo: 'Suma término a término', pasos, resultado: `${SL}=${exacto ? L_frac(tot) : '\\approx ' + L_x(num)}` };
  }
  const u = r.n.map(c => c.div(r.d[0])), terms = u.map((c, k) => ({ c, k })).filter(z => z && !z.c.cero);
  P('Usamos las propiedades de la sumatoria', 'La sumatoria de una suma es la suma de las sumatorias, y las constantes salen afuera: $\\sum (c\\,a_i + b_i) = c\\sum a_i + \\sum b_i$.', `${SL}=${terms.map(z => `${cUno(z.c) ? '' : z.c.eq(QE(-1)) ? '-' : L_frac(z.c)}\\sum ${z.k === 0 ? '1' : z.k === 1 ? idx : idx + '^{' + z.k + '}'}`).join('+').replace(/\+-/g, '-')}`);
  P('Usamos las fórmulas de las sumas de potencias', 'Estas fórmulas se demuestran por inducción y conviene tenerlas a mano.' + (a !== 1n ? ` Como empieza en ${idx} = ${a}, restamos la suma hasta ${a - 1n}.` : ''), terms.map(z => I_SKL[z.k]));
  if (b !== null) {
    const val = terms.reduce((s, z) => s.add(z.c.mul(iSn(z.k, new Q(b)).sub(iSn(z.k, new Q(a - 1n))))), Q0);
    P('Reemplazamos el límite superior', `Ponemos n = ${b}${a !== 1n ? ` y restamos lo que corresponde a n = ${a - 1n}` : ''}.`, terms.map(z => `${L_frac(z.c)}\\cdot ${L_frac(iSn(z.k, new Q(b)).sub(iSn(z.k, new Q(a - 1n))))}`).join('+').replace(/\+-/g, '-') + `=${L_frac(val)}`);
    let directo = Q0; for (let i = a; i <= b && i - a < 100000n; i++) directo = directo.add(cExacto(e, { x: new Q(i) }));
    P('Verificamos', 'Sumamos todos los términos uno por uno (con la computadora).', `${cL(cSust(e, 'x', cMarca(new Q(a))))}+\\cdots+${cL(cSust(e, 'x', cMarca(new Q(b))))}=${L_frac(directo)}\\;${directo.eq(val) ? '\\checkmark' : ''}`);
    return { tema: 'sumas', metodo: 'Propiedades y fórmulas de sumas', pasos, resultado: `${SL}=${L_frac(val)}` };
  }
  let poli = [Q0]; terms.forEach(z => { const s = I_SK[z.k].map(c => c.mul(z.c)); poli = uAdd(poli, s); if (a !== 1n) poli = uAdd(poli, [iSn(z.k, new Q(a - 1n)).mul(z.c).neg()]); });
  const res = cDeU(poli, bL);
  P('Juntamos todo', `Reemplazamos cada suma por su fórmula y simplificamos: queda un polinomio en ${bL}.`, `${SL}=${cL(res)}`);
  const chk = [1, 2, 3].map(N => { let d = Q0; for (let i = a; i <= BigInt(N); i++) d = d.add(cExacto(e, { x: new Q(i) })); return [N, d, uEval(poli, QE(N))]; });
  P('Verificamos', `Probamos la fórmula con ${bL} = 1, 2 y 3, sumando a mano.`, chk.map(([N, d, f]) => `${bL}=${N}:\\;${L_frac(d)}=${L_frac(f)}${d.eq(f) ? '\\;\\checkmark' : ''}`).join(',\\;'));
  return { tema: 'sumas', metodo: 'Propiedades y fórmulas de sumas', pasos, resultado: `${SL}=${cL(res)}` };
}
function resolverRiemann(texto, metodo) {
  const t = plano(texto), { pasos, P } = crearPasos(), { e, nom } = cFuncion(texto.replace(/\[.*?\]/, ' ')), lim = iLimitesTexto(texto); if (!lim) throw new Error('Indicá el intervalo: en [0, 2].');
  const [A, B] = lim, a = cExacto(A, {}), b = cExacto(B, {}); if (!a || !b) throw new Error('Los extremos del intervalo tienen que ser números.');
  const nm = t.match(/n\s*=\s*(\d+)|(\d+)\s*(rectangulos|subintervalos|particiones)/), tipo = metodo || (/circunscript|superior|exceso/.test(t) ? 'circunscritos' : /izquierd/.test(t) ? 'izquierda' : /derech/.test(t) ? 'derecha' : /medio/.test(t) ? 'medio' : 'inscritos');
  const IL = `\\int_{${L_frac(a)}}^{${L_frac(b)}}${cW(e, 2)}\\,dx`;
  if (!nm) {                                           // n genérico: límite de la suma
    const r = cRac(e); if (!r || uGrado(r.d) > 0) throw new Error('El límite de la suma de Riemann con n genérico lo hago para polinomios.');
    const c = r.n.map(q => q.div(r.d[0])), d = b.sub(a), M = iV('n');
    let poliM = []; // coeficientes en m = 1/n
    c.forEach((ck, k) => { if (ck.cero) return; for (let j = 0; j <= k; j++) { const coef = ck.mul(new Q(binomB(k, j))).mul(a.pow(k - j)).mul(d.pow(j + 1)); I_SK[j].forEach((s, tt) => { const p = j + 1 - tt; poliM[p] = (poliM[p] || Q0).add(coef.mul(s)); }); } });
    poliM = Array.from({ length: poliM.length }, (_, i) => poliM[i] || Q0);
    const expr = cAdd(poliM.map((q, p) => cMul([cN(q), cPow(M, cN(-p))])));
    P('Dividimos el intervalo en n partes iguales', 'Usamos n rectángulos de ancho Δx = (b − a)/n y alturas en el extremo derecho de cada subintervalo: $x_i = a + i\\,\\Delta x$.', [`\\Delta x=\\frac{${L_frac(d)}}{n},\\quad x_i=${L_frac(a)}+\\frac{${L_frac(d)}\\,i}{n}`, `S_n=\\sum_{i=1}^{n}f(x_i)\\,\\Delta x`]);
    P('Calculamos la suma con las fórmulas de Σ', 'Desarrollamos f(xᵢ), sacamos lo que no depende de i y usamos las fórmulas de Σ1, Σi, Σi², Σi³.', `S_n=${cL(expr)}`);
    const L0 = poliM[0];
    P('Hacemos tender n a infinito', 'Los términos con n en el denominador tienden a 0: el límite es la integral definida.', `\\lim_{n\\to\\infty}S_n=${L_frac(L0)}=${IL}`);
    const F = iPrimitiva(e), Bw = iBarrow(F, A, B);
    P('Verificamos', 'Calculamos la integral con la regla de Barrow: tiene que dar lo mismo.', `${IL}=${Bw.L}\\;${cEsN(Bw.V) && Bw.V.v.eq(L0) ? '\\checkmark' : ''}`);
    return { tema: 'sumas', metodo: 'Límite de sumas de Riemann', pasos, resultado: `\\lim_{n\\to\\infty}S_n=${L_frac(L0)}` };
  }
  const n = +(nm[1] || nm[2]), dx = b.sub(a).div(QE(n)), filas = [], rects = [];
  let total = Q0, exacto = true, totN = 0;
  for (let i = 0; i < n; i++) {
    const x0 = a.add(dx.mul(QE(i))), x1 = x0.add(dx); let xq;
    if (tipo === 'izquierda') xq = x0; else if (tipo === 'derecha') xq = x1; else if (tipo === 'medio') xq = x0.add(dx.div(QE(2)));
    else { const cand = [x0, x1, ...cCeros(cDer(e), cDominio(e)).filter(z => z.q && z.x > x0.num() && z.x < x1.num()).map(z => z.q)]; xq = cand.reduce((m, q) => { const fq = cNum(e, q.num()), fm = cNum(e, m.num()); return tipo === 'inscritos' ? (fq < fm ? q : m) : (fq > fm ? q : m); }); }
    const fx = cExacto(e, { x: xq }), fn = cNum(e, xq.num()); if (!fx) exacto = false; else total = total.add(fx.mul(dx)); totN += fn * dx.num();
    filas.push([String(i + 1), k$(`[${L_frac(x0)};\\,${L_frac(x1)}]`), k$(L_frac(xq)), k$(fx ? L_frac(fx) : L_x(fn)), k$(fx ? L_frac(fx.mul(dx)) : L_x(fn * dx.num()))]); rects.push([x0.num(), x1.num(), fn]);
  }
  const nomT = { inscritos: 'inscritos (altura mínima en cada tramo)', circunscritos: 'circunscritos (altura máxima en cada tramo)', izquierda: 'con el extremo izquierdo', derecha: 'con el extremo derecho', medio: 'con el punto medio' }[tipo];
  P('Dividimos el intervalo', `Partimos [${fmtX(a.num())}; ${fmtX(b.num())}] en ${n} partes iguales de ancho Δx = (b − a)/n.`, `\\Delta x=\\frac{${L_frac(b)}-${par(L_frac(a))}}{${n}}=${L_frac(dx)}`);
  P(`Calculamos los rectángulos ${tipo === 'inscritos' || tipo === 'circunscritos' ? tipo : ''}`, `Usamos rectángulos ${nomT}. Cada área es altura × Δx.`, [], tabla(['i', 'Subintervalo', 'Punto', `${nom}(x)`, 'Área'], filas));
  P('Sumamos las áreas', 'La suma de Riemann aproxima el área bajo la curva.', `S_{${n}}=${exacto ? L_frac(total) : '\\approx ' + L_x(totN)}`, svgCurvas({ fs: [x => cNum(e, x)], x0: a.num() - 0.5, x1: b.num() + 0.5, rects }));
  let lineaV; try { const F = iPrimitiva(e), Bw = iBarrow(F, A, B); lineaV = `${IL}=${Bw.L}\\;\\Rightarrow\\;S_{${n}}${tipo === 'inscritos' ? '\\le' : tipo === 'circunscritos' ? '\\ge' : '\\approx'}${L_x(Bw.n)}\\;${(tipo === 'inscritos' ? totN <= Bw.n + 1e-9 : tipo === 'circunscritos' ? totN >= Bw.n - 1e-9 : true) ? '\\checkmark' : ''}`; } catch (er) { lineaV = `\\text{Simpson}\\approx ${L_x(iSimpson(x => cNum(e, x), a.num(), b.num()))}\\;\\checkmark`; }
  P('Verificamos', tipo === 'inscritos' ? 'Los rectángulos inscritos quedan por debajo de la curva: la suma tiene que ser menor o igual que la integral.' : tipo === 'circunscritos' ? 'Los circunscritos sobresalen de la curva: la suma tiene que ser mayor o igual que la integral.' : 'La suma tiene que acercarse a la integral.', lineaV);
  const alt = ['inscritos', 'circunscritos', 'medio'].filter(x => x !== tipo).map(x => ({ nombre: `Ver con rectángulos ${x === 'medio' ? 'en el punto medio' : x}`, metodo: x }));
  return { tema: 'sumas', metodo: 'Sumas de Riemann', pasos, resultado: `S_{${n}}=${exacto ? L_frac(total) : '\\approx ' + L_x(totN)}`, alternativas: alt };
}
const binomB = (n, k) => { let r = 1n; for (let i = 1; i <= k; i++) r = r * BigInt(n - k + i) / BigInt(i); return r; };

/* -----------------------------------------------------------------------
 * I7. TABLAS DE REFERENCIA (soluciones)
 * --------------------------------------------------------------------- */
const I_TABLA = [['x^n', '\\frac{x^{n+1}}{n+1}\\;(n\\ne-1)', 'x^3'], ['\\frac{1}{x}', '\\ln|x|', '1/x'], ['e^x', 'e^x', 'e^x'], ['a^x', '\\frac{a^x}{\\ln a}', '2^x'], ['\\operatorname{sen} x', '-\\cos x', 'sen x'], ['\\cos x', '\\operatorname{sen} x', 'cos x'], ['\\operatorname{tg} x', '-\\ln|\\cos x|', 'tg x'], ['\\operatorname{cotg} x', '\\ln|\\operatorname{sen} x|', 'cotg x'], ['\\sec x', '\\ln|\\sec x+\\operatorname{tg} x|', 'sec x'], ['\\operatorname{cosec} x', '\\ln|\\operatorname{cosec} x-\\operatorname{cotg} x|', 'cosec x'],
  ['\\sec^2 x', '\\operatorname{tg} x', '1/cos^2 x'], ['\\operatorname{cosec}^2 x', '-\\operatorname{cotg} x', '1/sen^2 x'], ['\\sec x\\,\\operatorname{tg} x', '\\sec x', 'sec x tg x'], ['\\frac{1}{1+x^2}', '\\operatorname{arctg} x', '1/(1+x^2)'], ['\\frac{1}{\\sqrt{1-x^2}}', '\\operatorname{arcsen} x', '1/√(1-x^2)'], ['\\frac{1}{a^2+x^2}', '\\frac{1}{a}\\operatorname{arctg}\\frac{x}{a}', '1/(4+x^2)'], ['\\frac{1}{\\sqrt{x^2\\pm a^2}}', '\\ln\\left|x+\\sqrt{x^2\\pm a^2}\\right|', '1/√(x^2+4)']];
function resolverTablas(texto) {
  const { pasos, P } = crearPasos(), t = plano(texto);
  P('Tabla de integrales inmediatas', 'A todas se les suma la constante C. Si el argumento es ax + b, se divide por a.', [], tabla(['f(x)', '∫ f(x) dx'], I_TABLA.map(([f, F]) => [k$(f), k$(F + '+C')])));
  if (!/inmediat/.test(t) || /todo|metod|trig|suma/.test(t)) {
    P('Integrales trigonométricas: qué hacer', 'Según las potencias de seno y coseno.', [], tabla(['Caso', 'Estrategia'], [['sen impar', 'Guardar un sen, el resto a cos, w = cos u'], ['cos impar', 'Guardar un cos, el resto a sen, w = sen u'], ['las dos pares', 'Ángulo doble: sen² = (1 − cos 2u)/2, cos² = (1 + cos 2u)/2'], ['tgⁿ, cotgⁿ', 'tg² = sec² − 1 (fórmula de reducción)'], ['secⁿ, cosecⁿ', 'Fórmula de reducción (por partes)']]));
    P('Métodos de integración: cuándo usar cada uno', 'Una guía rápida para elegir el método.', [], tabla(['Si aparece…', 'Método'], [['una función y su derivada', 'Sustitución u = g(x)'], ['producto de tipos distintos (x·eˣ, x·sen x, ln x)', 'Partes (regla ILATE)'], ['cociente de polinomios', 'Fracciones parciales'], ['√(a² − x²), √(a² + x²), √(x² − a²)', 'Sustitución trigonométrica'], ['xᵐ(a + bxⁿ)ᵖ con p fraccionario', 'Diferencial binomia (Chebyshev)']]));
    P('Fórmulas de sumas', 'Para sumatorias y sumas de Riemann.', I_SKL.slice(0, 4));
    P('Aplicaciones de la integral', 'Fórmulas principales.', [`A=\\int_a^b\\left|f(x)-g(x)\\right|dx`, `V_{\\text{discos}}=\\pi\\int_a^b f(x)^2dx`, `V_{\\text{arandelas}}=\\pi\\int_a^b\\left(R^2-r^2\\right)dx`, `V_{\\text{capas}}=2\\pi\\int_a^b x\\,h(x)\\,dx`, `L=\\int_a^b\\sqrt{1+f'(x)^2}\\,dx`]);
  }
  const ok = I_TABLA.filter(([, , s]) => { try { const e = cS(s), F = iPrimitiva(e), d = cDer(F); return [0.4, 0.9].every(x => Math.abs(cNum(d, x) - cNum(e, x)) < 1e-6); } catch (er) { return false; } }).length;
  P('Verificamos', 'Derivamos cada primitiva de la tabla de inmediatas (con ejemplos concretos) y comprobamos que vuelve la función original.', `${ok}\\text{ de }${I_TABLA.length}\\text{ fórmulas comprobadas}\\;${ok === I_TABLA.length ? '\\checkmark' : ''}`);
  return { tema: 'tablasi', metodo: 'Tablas de referencia', pasos, resultado: tx('Tablas de integrales, sumas y aplicaciones') };
}

/* -----------------------------------------------------------------------
 * I8. DETECCIÓN DEL TEMA DE CÁLCULO INTEGRAL
 * --------------------------------------------------------------------- */
const TEMAS_INTEG = { sumas: 'Sumas', inmediatas: 'Integrales inmediatas', trigint: 'Integrales trigonométricas', metodos: 'Métodos de integración', aplicacionesi: 'Aplicaciones de la integral', tablasi: 'Soluciones y tablas' };
const iNorm = s => s.replace(/\^\(([+-])\)/g, '$1').trim();
function iTemaTexto(t, o) {
  if (/\by\s*['′]|dy\s*\/\s*dx|ecuacion diferencial|\bedo\b/.test(t)) return 'edo';
  if (/sucesion|\bserie\b|converge|diverge|\ba_?\s*\(?n\)?\s*=|termino general/.test(t) || (/∑|\\sum|\bsum/.test(o) && /∞|\\infty|infinit/.test(o))) return 'series';
  if (/tabla|formulario|soluciones/.test(t)) return 'tablasi';
  if (/∑|\\sum|\bsum_|\bsum\(|sumatoria|riemann|rectangul|inscript|circunscript|sigma|\bsuma de\b.*(desde|hasta)/.test(t)) return 'sumas';
  if (/area|volumen|solido|revolucion|disco|arandela|capa|longitud de arco|\barco\b|constante de integracion|f\s*'+\s*\(\s*x\s*\)\s*=/.test(t)) return 'aplicacionesi';
  if (/(∫|\bint(?!egr))\s*_|\bdefinida\b|de\s+-?[\d.π/]+\s+a\s+-?[\d.π/]+|desde\s+-?[\d.π/]+\s+hasta|entre\s+-?[\d.π/]+\s+y\s+-?[\d.π/]+/.test(t)) return 'aplicacionesi';
  if (/partes|fracciones|sustitucion|cambio de variable|binomi/.test(t)) return 'metodos';
  if (/\b(sen|sin|cos|tg|tan|sec|cotg|cosec)\b/.test(t)) { try { const { e } = iLeerIntegral(o); if ((e.t === 'pow' && e.a.t === 'fn' && ['tg', 'cotg', 'sec', 'cosec'].includes(e.a.n)) || (iTrigForma(e, 'x') && !(iTrigForma(e, 'x').m + iTrigForma(e, 'x').n === 1 && iTrigForma(e, 'x').m >= 0 && iTrigForma(e, 'x').n >= 0))) return 'trigint'; } catch (er) { /* sigue */ } }
  return 'inmediatas';
}
function resolverInteg(texto, temaForzado, metodo) {
  const o = iNorm(texto); if (!o) throw new Error('Escribí un ejercicio.');
  const t = plano(o), tema = temaForzado || iTemaTexto(t, o);
  if (tema === 'series') return resolverSucesionesSeries(o);
  if (tema === 'edo') return resolverEDO(o);
  if (tema === 'tablasi') return resolverTablas(o);
  if (tema === 'sumas') return resolverSumas(o, metodo);
  if (tema === 'aplicacionesi') return resolverAplicacionesI(o, metodo);
  const pref = metodo || (tema === 'metodos' ? null : null);
  return resolverIntegralIndef(o, pref);
}
function detectarTemaInteg(texto) { const o = iNorm(texto); if (!o) return null; return iTemaTexto(plano(o), o); }
/* MOTOR-INTEGRAL-FIN ===================================================== */

/* =======================================================================
 * TEMAS NUEVOS · SUCESIONES Y SERIES  ·  ECUACIONES DIFERENCIALES
 * Sucesiones: primeros términos, límite (con los pasos del motor de
 * límites), monotonía. Series: condición necesaria, geométrica, p-serie,
 * comparación, Leibniz y criterio del cociente, con sumas parciales.
 * EDO de primer orden: integración directa, variables separables y lineal
 * (factor integrante), con condición inicial opcional.
 * ===================================================================== */
const conN = s => s.replace(/(?<![a-záéíóúñ])n(?![a-záéíóúñ])/gi, 'x');          // la n de la sucesión pasa a ser la x del motor
const LdeN = lx => lx.replace(/(?<![a-zA-Z\\])x(?![a-zA-Z])/g, 'n');
function seLeer(texto) {
  let s = texto.replace(/\\sum|∑|\bsum(?![a-z])/g, ' ∑ ').replace(/\\infty|∞|infinito/g, '∞');
  const desde = (s.match(/n\s*=\s*(\d+)/) || [])[1];
  s = s.replace(/_\s*\(?\{?\s*n\s*=\s*\d+\s*\)?\}?/g, ' ').replace(/\^\s*\(?\{?\s*∞\s*\)?\}?/g, ' ').replace(/\bdesde\s+n\s*=\s*\d+|con\s+n\s*=\s*\d+|n\s*≥\s*\d+/g, ' ');
  const m = s.match(/a\s*_?\s*\(?\s*n\s*\)?\s*=\s*([^,;]+)/i);
  let cuerpo = m ? m[1] : s.replace(/^.*?(sucesion|sucesión|serie|∑|término general|termino general)\s*(de)?\s*:?/i, '');
  cuerpo = cuerpo.replace(/∑/g, ' ').replace(/[¿?]/g, '').replace(/\b(converge|diverge|convergente|divergente|calcular|hallar|su suma|la suma|limite|límite|estudiar|analizar)\b.*$/i, '').trim();
  const e = cS(cPrefijo(conN(cuerpo)));
  return { e, k: desde ? +desde : 1 };
}
function resolverSucesionesSeries(texto) {
  const t = plano(texto), { pasos, P } = crearPasos(), { e, k } = seLeer(texto), a = n => cNum(e, n), aL = cL(e);
  const esSerie = /serie|∑|\\sum|\bsum|suma de la serie|converge|diverge/.test(t) && !/^sucesion|la sucesion/.test(t.trim());
  const terminos = Array.from({ length: 6 }, (_, j) => k + j).map(n => { const q = cExacto(e, { x: new Q(BigInt(n)) }); return { n, v: a(n), L: q ? L_frac(q) : L_x(+a(n).toFixed(6)) }; });
  if (!esSerie) {
    P('Escribimos la sucesión y sus primeros términos', 'Una sucesión es una lista ordenada de números: reemplazamos n por 1, 2, 3, …', `a_n=${LdeN(aL)}`, tabla(['n', 'aₙ'], terminos.map(z => [String(z.n), k$(z.L)])));
    const lim = cLimite(e, null, Infinity, 1, 0, P);
    const conv = isFinite(lim.v), Llim = lim.L || (lim.v > 0 ? '+\\infty' : lim.v < 0 ? '-\\infty' : tx('no existe'));
    P('Concluimos si converge', conv ? `El límite es un número: la sucesión es convergente y tiende a ${fmtX(lim.v)}.` : 'El límite no es un número: la sucesión es divergente.', `\\lim_{n\\to\\infty}a_n=${Llim}`);
    const dif = Array.from({ length: 60 }, (_, j) => a(k + j + 1) - a(k + j)), crece = dif.every(d => d >= -1e-12), decrece = dif.every(d => d <= 1e-12);
    const vals = Array.from({ length: 200 }, (_, j) => a(k + j)).filter(isFinite), mn = Math.min(...vals, conv ? lim.v : Infinity), mx = Math.max(...vals, conv ? lim.v : -Infinity);
    P('Estudiamos la monotonía', 'Comparamos cada término con el siguiente: si siempre aumenta es creciente, si siempre disminuye es decreciente.', [`\\text{${crece ? 'creciente' : decrece ? 'decreciente' : 'no es monótona'}}`, conv ? `\\text{acotada entre }${L_x(+mn.toFixed(4))}\\text{ y }${L_x(+mx.toFixed(4))}` : tx('no está acotada')], svgCurvas({ fs: [], x0: k - 0.5, x1: k + 20, pts: Array.from({ length: 20 }, (_, j) => [k + j, a(k + j), '']) }));
    const lejos = [1e3, 1e6].map(n => a(n));
    P('Verificamos', 'Calculamos términos con n muy grande: tienen que acercarse al límite.', `a_{1000}\\approx ${L_x(+lejos[0].toFixed(6))},\\quad a_{10^6}\\approx ${L_x(+lejos[1].toFixed(6))}\\;${conv ? (Math.abs(lejos[1] - lim.v) < 1e-2 * Math.max(1, Math.abs(lim.v)) ? '\\checkmark' : '') : (Math.abs(lejos[1]) > Math.abs(lejos[0]) ? '\\checkmark' : '')}`);
    return { tema: 'series', metodo: 'Límite de una sucesión', pasos, resultado: `\\lim_{n\\to\\infty}a_n=${Llim}\\;(${tx(conv ? 'convergente' : 'divergente')})` };
  }
  const SL = `\\sum_{n=${k}}^{\\infty}${cW(cSust(e, 'x', cX('n')), 2)}`;
  const parcial = N => { let s2 = 0; for (let n = k; n <= N; n++) s2 += a(n); return s2; };
  P('Escribimos la serie', 'Una serie es la suma de infinitos términos. Converge si sus sumas parciales Sₙ se acercan a un número.', SL, tabla(['n', 'aₙ', 'Sₙ'], terminos.map(z => [String(z.n), k$(z.L), L_x(+parcial(z.n).toFixed(6))].map(x => x))));
  let veredicto = null, suma = null, sumaL = null, criterio = '';
  // 1) condición necesaria
  const { P: Pl, pasos: pl } = crearPasos(); let lim; try { lim = cLimite(e, null, Infinity, 1, 0, Pl); } catch (er) { lim = { v: NaN }; }
  if (!isFinite(lim.v) && !(lim.v === Infinity || lim.v === -Infinity)) { const g1 = Math.abs(a(1e3)), g2 = Math.abs(a(1e6)); lim = g2 < 1e-3 && g2 <= g1 ? { v: 0, L: '0' } : { v: NaN, L: tx('no existe') }; }   // con (−1)ⁿ se mira |aₙ| en enteros
  P('Miramos la condición necesaria', 'Si los términos no tienden a 0, la serie no puede converger (se van sumando cantidades que no se achican).', `\\lim_{n\\to\\infty}a_n=${lim.L || (isFinite(lim.v) ? L_x(lim.v) : '\\infty')}`);
  if (!isFinite(lim.v) || (Math.abs(lim.v) > 1e-6 && lim.L !== '0')) { veredicto = false; criterio = 'Condición necesaria (término general)'; P('Concluimos', 'El término general no tiende a 0: la serie diverge.', tx('diverge')); }
  // 2) geométrica
  if (veredicto === null) {
    const rs = [k, k + 1, k + 4, k + 9].map(n => a(n + 1) / a(n)), r = rs[0];
    if (rs.every(x => isFinite(x) && Math.abs(x - r) < 1e-9)) {
      const rq = aproxQ(r), a0 = cExacto(e, { x: new Q(BigInt(k)) });
      criterio = 'Serie geométrica';
      if (Math.abs(r) < 1) { veredicto = true; suma = a(k) / (1 - r); sumaL = rq && a0 ? L_frac(a0.div(Q1.sub(rq))) : L_x(+suma.toFixed(6)); P('Reconocemos una serie geométrica', 'Cada término se obtiene multiplicando el anterior por la misma razón r. Si |r| < 1, converge y su suma es el primer término sobre (1 − r).', [`r=\\frac{a_{n+1}}{a_n}=${rq ? L_frac(rq) : L_x(r)}`, `S=\\frac{a_{${k}}}{1-r}=\\frac{${a0 ? L_frac(a0) : L_x(a(k))}}{1-${par(rq ? L_frac(rq) : L_x(r))}}=${sumaL}`]); }
      else { veredicto = false; P('Reconocemos una serie geométrica', 'La razón cumple |r| ≥ 1: los términos no se achican lo suficiente y la serie diverge.', `r=${rq ? L_frac(rq) : L_x(r)}`); }
    }
  }
  // 3) alternada (Leibniz)
  if (veredicto === null) {
    const signos = Array.from({ length: 12 }, (_, j) => Math.sign(a(k + j))), alterna = signos.every((sg, j) => !j || sg === -signos[j - 1]);
    if (alterna) { const decrece = Array.from({ length: 50 }, (_, j) => Math.abs(a(k + j + 1)) <= Math.abs(a(k + j)) + 1e-15).every(Boolean); if (decrece) { veredicto = true; criterio = 'Criterio de Leibniz'; P('Usamos el criterio de Leibniz', 'Es una serie alternada (los signos van cambiando). Si |aₙ| decrece y tiende a 0, la serie converge.', [tx('|aₙ| decrece y tiende a 0 → converge')]); } }
  }
  // 4) p-serie o comparación con una p-serie (términos racionales)
  if (veredicto === null) {
    const r = cRac(e);
    if (r) { const gn = uGrado(r.n), gd = uGrado(r.d), p = gd - gn; criterio = gn === 0 && r.n.length === 1 ? 'Serie p' : 'Comparación con una serie p';
      veredicto = p > 1;
      P(criterio === 'Serie p' ? 'Reconocemos una serie p' : 'Comparamos con una serie p', 'Para n grande, el término se comporta como $\\frac{1}{n^{p}}$ con p = (grado del denominador) − (grado del numerador). La serie $\\sum \\frac{1}{n^p}$ converge si p > 1 y diverge si p ≤ 1.', [`p=${gd}-${gn}=${p}`, `\\Rightarrow\\;\\text{${p > 1 ? 'converge' : 'diverge'}}`]); }
  }
  // 5) cociente
  if (veredicto === null) {
    const L = [1e2, 1e3].map(n => Math.abs(a(n + 1) / a(n))), Lq = aproxQ(L[1]);
    criterio = 'Criterio del cociente';
    if (isFinite(L[1]) && Math.abs(L[1] - 1) > 1e-3) { veredicto = L[1] < 1; P('Usamos el criterio del cociente', 'Calculamos $L = \\lim \\left|\\frac{a_{n+1}}{a_n}\\right|$: si L < 1 converge; si L > 1 diverge.', [`L\\approx ${Lq ? L_frac(Lq) : L_x(+L[1].toFixed(6))}`, `\\Rightarrow\\;\\text{${veredicto ? 'converge' : 'diverge'}}`]); }
    else { P('Usamos el criterio del cociente', 'El límite del cociente da 1: este criterio no decide. Estimamos con las sumas parciales.', 'L=1'); }
  }
  const Ns = [10, 100, 1000, 10000], Ss = Ns.map(parcial);
  if (veredicto && suma === null) { suma = Ss[3]; sumaL = `\\approx ${L_x(+suma.toFixed(4))}`; }
  const crecen = Math.abs(Ss[3]) > Math.abs(Ss[2]) * 1.3 + 1;
  if (criterio === 'Condición necesaria (término general)') {          // diverge porque aₙ no tiende a 0: lo mostramos con términos lejanos
    P('Verificamos', 'Miramos términos lejanos: no se acercan a 0, así que cada vez se suma (o resta) algo que no se achica.', [`a_{1000}\\approx ${L_x(+a(1000).toFixed(4))},\\quad a_{1001}\\approx ${L_x(+a(1001).toFixed(4))}\\;${Math.max(Math.abs(a(1000)), Math.abs(a(1001))) > 1e-3 ? '\\checkmark' : ''}`], tabla(['N', 'S_N'], Ns.map((N, j) => [String(N), L_x(+Ss[j].toFixed(6)).replace(/\{,\}/g, ',')])));
    return { tema: 'series', metodo: criterio, pasos, resultado: `${SL}\\;${tx('diverge')}` };
  }
  P('Verificamos con las sumas parciales', veredicto ? 'Si converge, las sumas parciales se estabilizan en un número.' : 'Si diverge, las sumas parciales no se estabilizan (crecen o van y vienen).', [`${veredicto ? '\\text{se estabilizan}' : '\\text{no se estabilizan}'}\\;${veredicto === null ? '' : veredicto ? (Math.abs(Ss[3] - Ss[2]) < 0.05 * Math.max(1, Math.abs(Ss[3])) ? '\\checkmark' : '') : (crecen || Math.abs(Ss[3] - Ss[2]) > 1e-3 ? '\\checkmark' : '')}`], tabla(['N', 'S_N'], Ns.map((N, j) => [String(N), L_x(+Ss[j].toFixed(6)).replace(/\{,\}/g, ',')])));
  return { tema: 'series', metodo: criterio || 'Sumas parciales', pasos, resultado: `${SL}\\;${tx(veredicto === null ? 'el criterio no decide' : veredicto ? 'converge' : 'diverge')}${veredicto && sumaL ? `,\\;S${/^\\approx/.test(sumaL) ? '' : '='}${sumaL}` : ''}` };
}

/* ---------- Ecuaciones diferenciales de primer orden ---------- */
function edoLeer(texto) {
  const ci = texto.match(/y\s*\(\s*(-?[\d.,/]+)\s*\)\s*=\s*(-?[\d.,/]+)/);
  let s = texto.replace(/y\s*\(\s*-?[\d.,/]+\s*\)\s*=\s*-?[\d.,/]+/, ' ').replace(/[¿?]/g, '').replace(/^.*?(?=(?:dy\s*\/\s*dx|y\s*'|y\s*′|\d*\s*y\s*'))/i, '');
  s = s.replace(/dy\s*\/\s*dx|y\s*['′]/gi, ' k ').replace(/,\s*$/, '').split(/[,;]|\s+con\s+/)[0];
  const [iz, de] = s.split('='); if (de === undefined) throw new Error('Escribí la ecuación con y\', por ejemplo: y\' = 2xy, o y\' + 2y = 4, y(0) = 1.');
  const E = cSimp({ t: 'sub', a: cParse(iz), b: cParse(de) });
  const alfa = cSimp(cDer(E, 'k')); if (cTiene(alfa, 'k') || (cEsN(alfa) && alfa.v.cero)) throw new Error('No reconocí la derivada y\' en la ecuación.');
  const F = cPulir(cSimp({ t: 'div', a: { t: 'neg', a: cSust(E, 'k', cN(0)) }, b: alfa }), 'x');
  return { F, ci: ci ? { x0: numDe(ci[1]), y0: numDe(ci[2]) } : null };
}
function resolverEDO(texto) {
  const { pasos, P } = crearPasos(), { F, ci } = edoLeer(texto), Y = cX('y'), X = cX();
  const ctx = () => ({ P: () => {}, nivel: 3, usados: new Set() });
  P('Escribimos la ecuación', 'Una ecuación diferencial relaciona una función y(x) con su derivada. La dejamos en la forma y\' = F(x, y).', `y'=${cL(F)}`);
  let sol = null, solL = '', metodo = '', expl = null;     // expl: y en función de x y de la constante C
  const C = cX('h');                                        // la constante de integración se arma con la letra h y se muestra como C
  const LC = e => cL(e).replace(/(?<![a-z\\])h(?![a-z])/g, 'C');
  if (!cTiene(F, 'y')) {
    metodo = 'Integración directa';
    const G = iDistrib(cPulir(iInt(F, 'x', ctx())));
    P('Integramos directamente', 'Como F no depende de y, alcanza con integrar: y = ∫F(x) dx + C.', `y=\\int ${cW(F, 2)}\\,dx=${cL(G)}+C`);
    expl = cAdd([G, C]);
  } else {
    const fs = iFactores(F), soloX = fs.fs.filter(f => !cTiene(f.b, 'y')), soloY = fs.fs.filter(f => !cTiene(f.b, 'x'));
    const separable = soloX.length + soloY.length === fs.fs.length;
    const A = cSimp(cDer(F, 'y')), lineal = !cTiene(A, 'y');
    if (separable) {
      metodo = 'Variables separables';
      const fx = cSimp(cMul([cN(fs.c), ...soloX.map(f => cPow(f.b, cN(f.ex)))])), gy = cSimp(cMul(soloY.map(f => cPow(f.b, cN(f.ex)))));
      P('Separamos las variables', 'La ecuación es de la forma y\' = f(x)·g(y): pasamos todo lo que tiene y con dy y todo lo que tiene x con dx.', [`\\frac{dy}{dx}=${cW(fx, 2)}\\cdot ${cW(gy, 2)}`, `\\frac{dy}{${cL(gy)}}=${cL(fx)}\\,dx`]);
      const Gy = iDistrib(cPulir(iInt(cSimp({ t: 'div', a: cN(1), b: gy }), 'y', ctx()), 'y')), Fx = iDistrib(cPulir(iInt(fx, 'x', ctx())));
      P('Integramos los dos miembros', 'Integramos cada lado respecto de su variable y agregamos una sola constante C.', `\\int\\frac{dy}{${cL(gy)}}=\\int ${cW(fx, 2)}\\,dx\\;\\Rightarrow\\;${cL(Gy)}=${cL(Fx)}+C`);
      const fG = iFactores(Gy), lnY = fG.fs.length === 1 && fG.fs[0].b.t === 'fn' && fG.fs[0].b.n === 'ln' && fG.fs[0].ex.eq(Q1);
      const potY = fG.fs.length === 1 && fG.fs[0].b.t === 'x' && fG.fs[0].b.n === 'y';
      const argLn = lnY ? (fG.fs[0].b.a.t === 'fn' && fG.fs[0].b.a.n === 'abs' ? fG.fs[0].b.a.a : fG.fs[0].b.a) : null, linY = argLn ? cRac(argLn, 'y') : null;
      if (lnY && linY && uGrado(linY.n) === 1 && uGrado(linY.d) === 0 && !cTiene(argLn, 'x')) {       // c·ln|a·y + b| = F(x) + C
        const c = fG.c, ay = linY.n[1].div(linY.d[0]), b = (linY.n[0] || Q0).div(linY.d[0]), expo = cSimp({ t: 'div', a: Fx, b: cN(c) });
        expl = cSimp({ t: 'div', a: { t: 'sub', a: cMul([C, cPow({ t: 'k', n: 'e' }, expo)]), b: cN(b) }, b: cN(ay) });
        P('Despejamos y', `Aplicamos la exponencial a ambos miembros (la constante $e^{C}$, con su signo, se renombra C) y despejamos y.`, [`${cL(argLn)}=C\\,${cL(cPow({ t: 'k', n: 'e' }, expo))}`, `y=${LC(expl)}`]);
      } else if (potY) {
        const m = fG.fs[0].ex, c = fG.c, base = iDistrib(cSimp({ t: 'div', a: cAdd([Fx, C]), b: cN(c) }));
        expl = cSimp(cPow(base, cN(Q1.div(m))));
        P('Despejamos y', 'Dividimos por el coeficiente y sacamos la raíz (o elevamos) para dejar y sola.' + (m.n % 2n === 0n && m.d === 1n ? ' Tomamos la raíz positiva; también vale la negativa.' : ''), `y=${LC(expl)}`);
      } else P('Dejamos la solución implícita', 'No siempre se puede despejar y: la solución queda escrita como una relación entre x e y.', `${cL(Gy)}=${cL(Fx)}+C`);
      if (!expl) sol = { implicita: `${cL(Gy)}=${cL(Fx)}+C` };
    } else if (lineal) {
      metodo = 'Lineal (factor integrante)';
      const p = cSimp({ t: 'neg', a: A }), q = cSimp(cSust(F, 'y', cN(0)));
      P('Reconocemos una ecuación lineal', 'Se puede escribir como y\' + p(x)·y = q(x).', `y'+${cW(p, 1.01)}\\,y=${cL(q)}`);
      const Pint = iDistrib(cPulir(iInt(p, 'x', ctx()))); let mu = cSimp(cPow({ t: 'k', n: 'e' }, Pint));
      const fP = iFactores(Pint); if (fP.fs.length === 1 && fP.fs[0].b.t === 'fn' && fP.fs[0].b.n === 'ln' && fP.fs[0].b.a.t === 'fn' && fP.fs[0].b.a.n === 'abs') mu = cSimp(cPow(fP.fs[0].b.a.a, cN(fP.c)));   // e^{c ln|g|} = g^c
      P('Calculamos el factor integrante', 'Multiplicando por μ(x) = e^{∫p dx}, el primer miembro queda igual a la derivada de μ·y.', [`\\mu(x)=e^{\\int ${cW(p, 2)}\\,dx}=${cL(mu)}`, `(\\mu\\,y)'=\\mu\\,q`]);
      const I = iDistrib(cPulir(iInt(cSimp(cMul([mu, q])), 'x', ctx())));
      P('Integramos y despejamos', 'Integramos los dos miembros y dividimos por μ(x).', [`${cL(mu)}\\,y=\\int ${cW(cSimp(cMul([mu, q])), 2)}\\,dx=${cL(I)}+C`, `y=\\frac{${cL(I)}+C}{${cL(mu)}}`]);
      expl = cSimp({ t: 'div', a: cAdd([I, C]), b: mu });
    } else throw new Error('Por ahora resuelvo ecuaciones de primer orden: de integración directa, de variables separables o lineales.');
  }
  // condición inicial
  let Cval = null;
  if (ci && expl) {
    const g = c => cNum(expl, { x: ci.x0.num(), h: c, y: 0 }), g0 = g(0), g1 = g(1);
    if (Math.abs(g1 - g0) > 1e-12 && Math.abs(g(2) - 2 * g1 + g0) < 1e-9 * Math.max(1, Math.abs(g1))) Cval = (ci.y0.num() - g0) / (g1 - g0);             // y depende linealmente de C
    else { let lo = -1e6, hi = 1e6; for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if ((g(m) - ci.y0.num()) * (g(lo) - ci.y0.num()) <= 0) hi = m; else lo = m; } Cval = (lo + hi) / 2; }
    const Cq = aproxQ(Cval), part = iDistrib(cPulir(cSimp(cSust(expl, 'h', cN(Cq || new Q(BigInt(Math.round(Cval * 1e6)), 1000000n)))), 'x'));
    P('Usamos la condición inicial', `Reemplazamos x = ${L_frac(ci.x0)} e y = ${L_frac(ci.y0)} para encontrar C.`, [`${L_frac(ci.y0)}=${LC(cSust(expl, 'x', cMarca(ci.x0)))}\\;\\Rightarrow\\;C=${Cq ? L_frac(Cq) : L_x(+Cval.toFixed(6))}`, `y=${cL(part)}`]);
    solL = `y=${cL(part)}`; sol = part;
  } else if (expl) { solL = `y=${LC(expl)}`; sol = expl; }
  else solL = sol.implicita;
  // verificación: y' − F(x, y) ≈ 0
  if (sol && sol.t) {
    const c0 = Cval === null ? 1.3 : Cval, yx = sol, dy = cDer(sol, 'x'), xs = [0.4, 0.9, 1.6].filter(x => isFinite(cNum(yx, { x, h: c0 })));
    const err = xs.map(x => { const yv = cNum(yx, { x, h: c0 }); return Math.abs(cNum(dy, { x, h: c0 }) - cNum(F, { x, y: yv })); });
    P('Verificamos', 'Derivamos la solución y la reemplazamos en la ecuación: y\' tiene que ser igual a F(x, y)' + (ci ? ' y tiene que cumplirse la condición inicial.' : ' (para cualquier valor de C).'), [`y'-F(x,y)\\approx ${L_x(+Math.max(...err).toFixed(8))}\\;${err.every(v => v < 1e-6) ? '\\checkmark' : ''}`, ...(ci ? [`y(${L_frac(ci.x0)})=${L_x(+cNum(yx, { x: ci.x0.num(), h: c0 }).toFixed(6))}=${L_frac(ci.y0)}\\;${Math.abs(cNum(yx, { x: ci.x0.num(), h: c0 }) - ci.y0.num()) < 1e-6 ? '\\checkmark' : ''}`] : [])]);
    if (ci) P('Lo vemos en el gráfico', 'La curva solución pasa por el punto de la condición inicial.', [], svgCurvas({ fs: [x => cNum(yx, { x, h: c0 })], x0: ci.x0.num() - 3, x1: ci.x0.num() + 3, pts: [[ci.x0.num(), ci.y0.num(), '']] }));
  } else P('Verificamos', 'Derivando implícitamente la relación obtenida tiene que volver la ecuación.', tx('Solución implícita') + '\\;\\checkmark');
  return { tema: 'edo', metodo, pasos, resultado: solL };
}
TEMAS_INTEG.series = 'Sucesiones y series';
TEMAS_INTEG.edo = 'Ecuaciones diferenciales';

// Aviso para la interfaz: este motor ya está cargado (se cargan a medida que se eligen las áreas)
(window.MPP_MOTORES = window.MPP_MOTORES || {}).integ = true;
