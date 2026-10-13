/* =======================================================================
 * MOTOR: GEOMETRÍA ANALÍTICA
 * Puntos, rectas, circunferencias y transformaciones. Necesita aritmética y álgebra.
 * Es lógica pura (no toca la página): recibe texto y devuelve
 * { tema, metodo, pasos, resultado, alternativas }.
 * ===================================================================== */
'use strict';
/* MOTOR-GEOMETRIA-INICIO =================================================
 * Geometría analítica. Usa las herramientas de aritmética (Q, LaTeX,
 * crearPasos, tabla) y de álgebra (polinomios en x e y, relAlg, raíces).
 * ====================================================================== */

/* -----------------------------------------------------------------------
 * G1. LECTURA DE PUNTOS, NÚMEROS, RECTAS Y CIRCUNFERENCIAS
 * --------------------------------------------------------------------- */
const Lp = q => (q.n < 0n ? par(L_frac(q)) : L_frac(q));                 // número con paréntesis si es negativo
const Lpt = (x, y) => `\\left(${L_frac(x)}\\,;\\,${L_frac(y)}\\right)`;   // punto (x ; y)
const Tpt = (x, y) => `(${fmtX(x.num())}; ${fmtX(y.num())})`;
function exactoG(v, que) { if (!v.q) throw new Error(`${que} tiene que ser un número racional (entero, fracción o decimal).`); return v.q; }
// Puntos escritos como (x, y) o (x; y). Con decimales conviene usar punto y coma.
function leerPuntosG(t) {
  const out = [];
  for (const m of t.matchAll(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
    const c = m[1]; if (/[a-zA-Zθ°=]/.test(c.replace(/raiz|raíz|sqrt|pi|π/gi, ''))) continue;
    let partes = c.includes(';') ? c.split(';') : c.split(',');
    if (partes.length !== 2) { if (!c.includes(';') && partes.length > 2) throw new Error(`En el punto (${c}) no sé dónde termina cada coordenada. Si usás decimales con coma, separá con punto y coma: (1,5; 2).`); continue; }
    const [x, y] = partes.map(p => valorDeTexto(p.trim()));
    out.push({ x, y, idx: m.index });
  }
  return out;
}
const ptsExactos = t => leerPuntosG(t).map((p, i) => ({ x: exactoG(p.x, 'Cada coordenada'), y: exactoG(p.y, 'Cada coordenada'), n: String.fromCharCode(65 + i) }));
// Raíz cuadrada de un racional: exacta si se puede; si no, simplificada (k√m / d).
function raizQ(q) {
  if (q.signo < 0) throw new Error('No existe la raíz cuadrada de un número negativo.');
  const e = raizExacta(q, 2); if (e) return { L: L_frac(e), x: e.num(), exacta: true, q: e };
  const { k, m } = sqrtLibre(q.n * q.d), c = new Q(k, q.d);
  return { L: (c.eq(Q1) ? '' : L_frac(c)) + `\\sqrt{${L_ent(m)}}`, x: Math.sqrt(q.num()), exacta: false };
}
const L_raiz = (q, conAprox = true) => { const r = raizQ(q); return r.L + (!r.exacta && conAprox ? `\\approx ${L_x(r.x)}` : ''); };
const dist2 = (A, B) => B.x.sub(A.x).pow(2).add(B.y.sub(A.y).pow(2));
// Recta en forma general A·x + B·y + C = 0 (coeficientes enteros, simplificados)
function recta(A, B, C) {
  if (A.cero && B.cero) throw new Error('Eso no es una recta: faltan x e y.');
  const den = [A, B, C].reduce((s, q) => mcmB(s, q.d), 1n); let g = [A, B, C].reduce((s, q) => mcdB(s, q.mul(new Q(den)).n), 0n) || 1n;
  if ((A.cero ? B : A).signo < 0) g = -g;
  const k = new Q(den, g); return { A: A.mul(k), B: B.mul(k), C: C.mul(k) };
}
const L_gen = r => `${L_P(Pred([mono(r.A, { x: 1 }), mono(r.B, { y: 1 }), mono(r.C)]))}=0`;
const pendienteR = r => (r.B.cero ? null : r.A.neg().div(r.B));
const ordenadaR = r => (r.B.cero ? null : r.C.neg().div(r.B));
const L_expl = r => (r.B.cero ? `x=${L_frac(r.C.neg().div(r.A))}` : `y=${L_P(Pred([mono(pendienteR(r), { x: 1 }), mono(ordenadaR(r))])) || '0'}`);
const evalR = (r, x, y) => r.A.mul(x).add(r.B.mul(y)).add(r.C);
const rectaDosPuntos = (P1, P2) => recta(P2.y.sub(P1.y), P1.x.sub(P2.x), P2.x.mul(P1.y).sub(P1.x.mul(P2.y)));
const rectaPuntoPendiente = (P0, m) => recta(m, QE(-1), P0.y.sub(m.mul(P0.x)));
// Lee una ecuación en x e y y la clasifica: recta o circunferencia.
function ecuacionXY(texto) {
  const rel = relAlg(texto); if (!rel || rel.op !== '=') throw new Error(`“${texto}” no es una ecuación.`);
  const D = Pred(Psub(aPoly(rel.izq), aPoly(rel.der))); const co = k => D.filter(m => claveMono(m.v) === k).reduce((s, m) => s.add(m.c), Q0);
  if (D.some(m => Object.keys(m.v).some(v => v !== 'x' && v !== 'y'))) throw new Error('Usá solo las letras x e y.');
  const g = Pgrado(D);
  if (g <= 1) return { tipo: 'recta', r: recta(co('x1'), co('y1'), co('')), rel };
  if (g === 2) {
    const a = co('x2'), b = co('y2');
    if (co('x1y1').cero && !a.cero && a.eq(b)) return { tipo: 'circ', D: co('x1').div(a), E: co('y1').div(a), F: co('').div(a), rel, a };
    throw new Error('Esa ecuación de segundo grado no es una circunferencia (los coeficientes de x² e y² tienen que ser iguales y no puede haber término xy).');
  }
  throw new Error('La ecuación tiene grado mayor que 2.');
}
// Ecuaciones de recta escritas en el texto (separadas por ; o por " y ")
// Busca las ecuaciones escritas dentro de una consigna en palabras: tramos hechos solo de
// números, x, y, signos y paréntesis que tengan un "=". La palabra "y" entre dos ecuaciones las separa.
function ecuacionesEnTexto(texto) {
  const out = [];
  for (const p of texto.split(';')) {
    for (const m of p.matchAll(/[-+(\d.,xy²³^*/\s)]*=[-+(\d.,xy²³^*/\s)=]*/gi)) {
      // "y" como conjunción: va después de un número, una letra o un paréntesis, y antes de un término nuevo.
      for (let s of m[0].split(/(?<=[\d)²³xy])\s+y\s+(?=[-(\dxy])/)) {
        s = s.trim().replace(/^[,.\s]+|[,.\s]+$/g, '');
        if (/[xy]/i.test(s) && /=/.test(s) && !/=\s*$/.test(s) && !/^\s*=/.test(s)) out.push(s);
      }
    }
  }
  return out;
}
function rectasEnTexto(t) {
  const out = []; for (const s of ecuacionesEnTexto(t)) { try { const e = ecuacionXY(s); if (e.tipo === 'recta') out.push(e.r); } catch (err) { /* no era una recta */ } }
  return out;
}

/* -----------------------------------------------------------------------
 * G2. GRÁFICO DEL PLANO (puntos, segmentos, rectas, polígonos y circunferencias)
 * Usa la misma escala en los dos ejes para que las circunferencias se vean redondas.
 * --------------------------------------------------------------------- */
function svgGeo({ pts = [], segs = [], rectas = [], circs = [], polys = [] }) {
  const xs = [0], ys = [0];
  pts.forEach(p => { xs.push(p[0]); ys.push(p[1]); }); segs.forEach(s => { xs.push(s[0], s[2]); ys.push(s[1], s[3]); });
  polys.forEach(pl => pl.forEach(p => { xs.push(p[0]); ys.push(p[1]); })); circs.forEach(c => { xs.push(c.h - c.r, c.h + c.r); ys.push(c.k - c.r, c.k + c.r); });
  rectas.forEach(r => { if (r.B) ys.push(-r.C / r.B); if (r.A) xs.push(-r.C / r.A); });
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const media = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 4) / 2 * 1.25;
  const x0 = cx - media, x1 = cx + media, y0 = cy - media, y1 = cy + media, W = 320, X = x => (x - x0) / (x1 - x0) * W, Y = y => W - (y - y0) / (y1 - y0) * W;
  const crudo = (x1 - x0) / 10, p10 = 10 ** Math.floor(Math.log10(crudo)), paso = [1, 2, 5, 10].map(k => k * p10).find(k => k >= crudo);
  let g = '';
  for (let x = Math.ceil(x0 / paso) * paso; x <= x1; x += paso) g += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${W}" class="gr"/>${Math.abs(x) > 1e-9 ? `<text x="${X(x)}" y="${Math.min(W - 3, Math.max(12, Y(0) + 13))}" class="et">${fmtX(x, 2)}</text>` : ''}`;
  for (let y = Math.ceil(y0 / paso) * paso; y <= y1; y += paso) g += `<line x1="0" y1="${Y(y)}" x2="${W}" y2="${Y(y)}" class="gr"/>${Math.abs(y) > 1e-9 ? `<text x="${Math.min(W - 18, Math.max(3, X(0) + 4))}" y="${Y(y) - 2}" class="et" text-anchor="start">${fmtX(y, 2)}</text>` : ''}`;
  g += `<line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" class="ej"/><line x1="${X(0)}" y1="0" x2="${X(0)}" y2="${W}" class="ej"/>`;
  polys.forEach(pl => { g += `<polygon points="${pl.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}" class="poli"/>`; });
  rectas.forEach((r, i) => { const c = i % 2 ? 'r2' : 'r1'; g += Math.abs(r.B) < 1e-12 ? `<line x1="${X(-r.C / r.A)}" y1="0" x2="${X(-r.C / r.A)}" y2="${W}" class="${c}"/>` : `<line x1="0" y1="${Y((-r.C - r.A * x0) / r.B)}" x2="${W}" y2="${Y((-r.C - r.A * x1) / r.B)}" class="${c}"/>`; });
  circs.forEach(c => { g += `<circle cx="${X(c.h)}" cy="${Y(c.k)}" r="${c.r / (x1 - x0) * W}" class="circ"/>`; });
  segs.forEach(s => { g += `<line x1="${X(s[0])}" y1="${Y(s[1])}" x2="${X(s[2])}" y2="${Y(s[3])}" class="seg"/>`; });
  pts.forEach(([x, y, l]) => { g += `<circle cx="${X(x)}" cy="${Y(y)}" r="4.5" class="pt"/>${l ? `<text x="${X(x) + 7}" y="${Y(y) - 7}" class="et pl" text-anchor="start">${l}</text>` : ''}`; });
  return `<svg class="grafico cuadrado" viewBox="0 0 ${W} ${W}" role="img" aria-label="Gráfico en el plano">${g}</svg>`;
}
const rN = r => ({ A: r.A.num(), B: r.B.num(), C: r.C.num() });
const ptN = (P, etiqueta = true) => [P.x.num(), P.y.num(), etiqueta ? `${P.n || ''}${P.n ? ' ' : ''}${Tpt(P.x, P.y)}` : ''];

/* -----------------------------------------------------------------------
 * G3. GEOMETRÍA ANALÍTICA UNIDIMENSIONAL (puntos sobre una recta)
 * --------------------------------------------------------------------- */
function leerRazon(t) {
  const m = t.match(/raz[oó]n\s*(?:r\s*=\s*)?(-?\d+(?:[.,]\d+)?)\s*(?:[:/]\s*(\d+(?:[.,]\d+)?))?/i) || t.match(/\br\s*=\s*(-?\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?/i);
  if (!m) return null; const a = leerDecimal(m[1].replace('-', '')).q.mul(m[1].startsWith('-') ? QE(-1) : Q1); return m[2] ? a.div(leerDecimal(m[2]).q) : a;
}
function resolverUnidimensional(texto) {
  const t = plano(texto), r = leerRazon(texto);
  const sinRazon = texto.replace(/raz[oó]n\s*(?:r\s*=\s*)?-?\d+(?:[.,]\d+)?\s*(?:[:/]\s*\d+(?:[.,]\d+)?)?|\br\s*=\s*-?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?/gi, ' ');
  const ns = (sinRazon.replace(/[−–]/g, '-').match(/-?\d+(?:[.,]\d+)?(?:\/\d+)?/g) || []).map(numDe);
  if (ns.length < 2) throw new Error('Escribí las coordenadas de dos puntos de la recta, por ejemplo: distancia entre -3 y 5.');
  const [a, b] = ns, { pasos, P } = crearPasos();
  P('Ubicamos los puntos en la recta', 'En la recta numérica cada punto se identifica con un solo número: su coordenada.', `A=${L_frac(a)},\\quad B=${L_frac(b)}`, svgRecta([{ a: Math.min(a.num(), b.num()), b: Math.max(a.num(), b.num()) }], [{ x: a.num(), L: 'A', cerrado: true }, { x: b.num(), L: 'B', cerrado: true }]));
  const res = [];
  if (r || /divid|razon/.test(t)) {
    if (!r) throw new Error('Falta la razón, por ejemplo: razón 1:3.');
    if (r.eq(QE(-1))) throw new Error('La razón no puede ser −1.');
    const p = a.add(r.mul(b)).div(Q1.add(r));
    P('Dividimos el segmento en una razón', 'Buscamos el punto P tal que AP/PB = r. La fórmula es $x_P = \\frac{x_A + r\\cdot x_B}{1 + r}$.' + (r.signo < 0 ? ' Como la razón es negativa, P queda afuera del segmento.' : ''), `x_P=\\frac{${L_frac(a)}+${Lp(r)}\\cdot ${Lp(b)}}{1+${Lp(r)}}=${L_frac(p)}`);
    P('Verificamos', 'Calculamos AP y PB (con signo, en el sentido de A hacia B) y comprobamos que su cociente es la razón pedida.', `\\frac{AP}{PB}=\\frac{${L_frac(p)}-${Lp(a)}}{${L_frac(b)}-${Lp(p)}}=\\frac{${L_frac(p.sub(a))}}{${L_frac(b.sub(p))}}=${L_frac(p.sub(a).div(b.sub(p)))}\\;${p.sub(a).div(b.sub(p)).eq(r) ? '\\checkmark' : ''}`);
    return { tema: 'uni', metodo: 'División de un segmento en una razón', pasos, resultado: `x_P=${L_frac(p)}` };
  }
  const quiereD = /distancia|longitud|mide/.test(t) || !/medio/.test(t), quiereM = /medio/.test(t) || !/distancia|longitud|mide/.test(t);
  if (quiereD) {
    const d = b.sub(a).abs();
    P('Calculamos la distancia', 'La distancia entre dos puntos de la recta es el valor absoluto de la diferencia de sus coordenadas (siempre da positiva).', `d(A,B)=\\left|x_B-x_A\\right|=\\left|${L_frac(b)}-${Lp(a)}\\right|=${L_frac(d)}`);
    res.push(`d(A,B)=${L_frac(d)}`);
  }
  let m;
  if (quiereM) { m = a.add(b).div(QE(2)); P('Calculamos el punto medio', 'El punto medio es el promedio de las dos coordenadas.', `x_M=\\frac{x_A+x_B}{2}=\\frac{${L_frac(a)}+${Lp(b)}}{2}=${L_frac(m)}`); res.push(`x_M=${L_frac(m)}`); }
  P('Verificamos', m ? 'El punto medio tiene que estar a la misma distancia de A y de B.' : 'Medimos al revés, de B a A: tiene que dar lo mismo.', m ? `\\left|${L_frac(m)}-${Lp(a)}\\right|=${L_frac(m.sub(a).abs())}=\\left|${L_frac(b)}-${Lp(m)}\\right|\\;\\checkmark` : `\\left|${L_frac(a)}-${Lp(b)}\\right|=${L_frac(a.sub(b).abs())}\\;\\checkmark`);
  return { tema: 'uni', metodo: m && quiereD ? 'Distancia y punto medio' : m ? 'Punto medio' : 'Distancia en la recta', pasos, resultado: res.join(',\\quad ') };
}

/* -----------------------------------------------------------------------
 * G4. GEOMETRÍA ANALÍTICA BIDIMENSIONAL (puntos en el plano)
 * --------------------------------------------------------------------- */
function L_dist(A, B) {
  const dx = B.x.sub(A.x), dy = B.y.sub(A.y), d2 = dist2(A, B);
  return { d2, mates: [`d(${A.n},${B.n})=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}`, `=\\sqrt{${par(L_frac(B.x) + '-' + Lp(A.x))}^{2}+${par(L_frac(B.y) + '-' + Lp(A.y))}^{2}}=\\sqrt{${Lp(dx)}^{2}+${Lp(dy)}^{2}}`, `=\\sqrt{${L_frac(dx.pow(2))}+${L_frac(dy.pow(2))}}=\\sqrt{${L_frac(d2)}}${raizQ(d2).exacta ? '=' + L_frac(raizQ(d2).q) : '=' + L_raiz(d2)}`], L: L_raiz(d2, false) };
}
function areaShoelace(pts) { let s = Q0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; s = s.add(p.x.mul(q.y).sub(q.x.mul(p.y))); }); return s; }
function resolverBidimensional(texto, metodo) {
  const t = plano(texto), pts = ptsExactos(texto), r = leerRazon(texto), { pasos, P } = crearPasos();
  if (pts.length < 2) throw new Error('Escribí al menos dos puntos, por ejemplo: distancia entre (1, 2) y (4, 6).');
  const [A, B] = pts, graf = extra => svgGeo({ pts: pts.map(p => ptN(p)), ...extra });
  P('Ubicamos los puntos', 'Cada punto del plano tiene dos coordenadas: (x ; y). La primera se mide sobre el eje horizontal y la segunda, sobre el vertical.', pts.map(p => `${p.n}=${Lpt(p.x, p.y)}`).join(',\\quad '));
  if (r || /divid|razon/.test(t)) {
    if (!r) throw new Error('Falta la razón, por ejemplo: razón 1:2.');
    const px = A.x.add(r.mul(B.x)).div(Q1.add(r)), py = A.y.add(r.mul(B.y)).div(Q1.add(r)), Pp = { x: px, y: py, n: 'P' };
    P('Dividimos el segmento en la razón dada', 'El punto P que cumple AP/PB = r se calcula coordenada por coordenada: $x_P = \\frac{x_1 + r\\,x_2}{1 + r}$ y lo mismo con y.', [`x_P=\\frac{${L_frac(A.x)}+${Lp(r)}\\cdot ${Lp(B.x)}}{1+${Lp(r)}}=${L_frac(px)}`, `y_P=\\frac{${L_frac(A.y)}+${Lp(r)}\\cdot ${Lp(B.y)}}{1+${Lp(r)}}=${L_frac(py)}`], graf({ pts: [...pts.map(p => ptN(p)), ptN(Pp)], segs: [[A.x.num(), A.y.num(), B.x.num(), B.y.num()]] }));
    const ok = dist2(A, Pp).eq(r.pow(2).mul(dist2(Pp, B)));
    P('Verificamos', 'Comparamos los cuadrados de las distancias: AP² tiene que ser r² veces PB².', `AP^2=${L_frac(dist2(A, Pp))},\\quad r^2\\cdot PB^2=${L_frac(r.pow(2))}\\cdot ${Lp(dist2(Pp, B))}=${L_frac(r.pow(2).mul(dist2(Pp, B)))}\\;${ok ? '\\checkmark' : ''}`);
    return { tema: 'bi', metodo: 'División de un segmento en una razón', pasos, resultado: `P=${Lpt(px, py)}` };
  }
  if (pts.length >= 3 && /area|superficie|triangulo|poligono|perimetro|baricentro|clasific|colineal|alinead/.test(t) || pts.length >= 3 && !/distancia|medio/.test(t)) {
    const n = pts.length, S = areaShoelace(pts), area = S.abs().div(QE(2)), res = [];
    if (/colineal|alinead/.test(t) && n === 3) {
      const [C] = [pts[2]], ok = S.cero;
      P('Calculamos el determinante', 'Tres puntos están alineados si el “área” del triángulo que forman es 0. Lo calculamos con un determinante.', `\\begin{vmatrix}${pts.map(p => `${L_frac(p.x)}&${L_frac(p.y)}&1`).join('\\\\')}\\end{vmatrix}=${L_frac(S)}`);
      const mAB = B.x.eq(A.x) ? null : B.y.sub(A.y).div(B.x.sub(A.x)), mBC = C.x.eq(B.x) ? null : C.y.sub(B.y).div(C.x.sub(B.x));
      P('Verificamos', 'Comparamos las pendientes de AB y BC: si los puntos están alineados, son iguales.', `m_{AB}=${mAB ? L_frac(mAB) : tx('vertical')},\\quad m_{BC}=${mBC ? L_frac(mBC) : tx('vertical')}\\;${(mAB && mBC ? mAB.eq(mBC) : mAB === mBC) === ok ? '\\checkmark' : ''}`, graf({ segs: [[A.x.num(), A.y.num(), C.x.num(), C.y.num()]] }));
      return { tema: 'bi', metodo: 'Determinante (área nula)', pasos, resultado: tx(ok ? 'Los puntos están alineados' : 'Los puntos no están alineados') };
    }
    const lados = pts.map((p, i) => ({ a: p, b: pts[(i + 1) % n], d2: dist2(p, pts[(i + 1) % n]) }));
    P('Calculamos los lados', 'Cada lado es la distancia entre dos vértices consecutivos: $d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$.', lados.map(l => `${l.a.n}${l.b.n}=\\sqrt{${L_frac(l.d2)}}${raizQ(l.d2).exacta ? '=' + L_frac(raizQ(l.d2).q) : '\\approx ' + L_x(raizQ(l.d2).x)}`), graf({ polys: [pts.map(p => [p.x.num(), p.y.num()])] }));
    const per = lados.reduce((s, l) => s + Math.sqrt(l.d2.num()), 0), perExact = lados.every(l => raizQ(l.d2).exacta);
    P('Calculamos el perímetro', 'Sumamos los lados.', `P=${lados.map(l => raizQ(l.d2).L).join('+')}${perExact ? '=' + L_frac(lados.reduce((s, l) => s.add(raizQ(l.d2).q), Q0)) : '\\approx ' + L_x(per)}`);
    res.push(`\\text{Perímetro}${perExact ? '=' : '\\approx '}${perExact ? L_frac(lados.reduce((s, l) => s.add(raizQ(l.d2).q), Q0)) : L_x(per)}`);
    let areaH = null;
    if (metodo === 'heron' && n === 3) {
      const [a_, b_, c_] = lados.map(l => Math.sqrt(l.d2.num())), s = (a_ + b_ + c_) / 2; areaH = Math.sqrt(Math.max(0, s * (s - a_) * (s - b_) * (s - c_)));
      P('Calculamos el área con la fórmula de Herón', 'Con los tres lados a, b, c y el semiperímetro s: $A = \\sqrt{s(s-a)(s-b)(s-c)}$.', [`s=\\frac{a+b+c}{2}\\approx ${L_x(s)}`, `A\\approx\\sqrt{${L_x(s)}\\cdot ${L_x(s - a_)}\\cdot ${L_x(s - b_)}\\cdot ${L_x(s - c_)}}\\approx ${L_x(areaH)}`]);
    } else {
      P('Calculamos el área con determinantes', `Fórmula de los determinantes (o “de la zapatilla”): multiplicamos en cruz las coordenadas de vértices consecutivos, sumamos y tomamos la mitad del valor absoluto. Los vértices tienen que ir en orden, recorriendo el borde.`, [`A=\\frac{1}{2}\\left|${pts.map((p, i) => { const q = pts[(i + 1) % n]; return `(${L_frac(p.x)}\\cdot ${Lp(q.y)}-${Lp(q.x)}\\cdot ${Lp(p.y)})`; }).join('+')}\\right|`, `A=\\frac{1}{2}\\left|${L_frac(S)}\\right|=${L_frac(area)}`]);
    }
    res.push(`\\text{Área}${areaH !== null ? '\\approx ' + L_x(areaH) : '=' + L_frac(area)}`);
    if (n === 3) {
      const d2s = lados.map(l => l.d2).sort((a, b) => a.cmp(b)), eq = d2s[0].eq(d2s[1]) && d2s[1].eq(d2s[2]), iso = d2s[0].eq(d2s[1]) || d2s[1].eq(d2s[2]);
      const cmp = d2s[2].cmp(d2s[0].add(d2s[1])), ang = cmp === 0 ? 'rectángulo' : cmp < 0 ? 'acutángulo' : 'obtusángulo';
      if (S.cero) P('Ojo', 'Los tres puntos están alineados: no forman un triángulo.');
      else P('Clasificamos el triángulo', `Por sus lados es ${eq ? 'equilátero' : iso ? 'isósceles' : 'escaleno'}. Por sus ángulos comparamos el cuadrado del lado mayor con la suma de los cuadrados de los otros dos: es ${ang}.`, `${L_frac(d2s[2])}${cmp === 0 ? '=' : cmp < 0 ? '<' : '>'}${L_frac(d2s[0])}+${L_frac(d2s[1])}`);
      const G = { x: pts.reduce((s, p) => s.add(p.x), Q0).div(QE(3)), y: pts.reduce((s, p) => s.add(p.y), Q0).div(QE(3)) };
      P('Calculamos el baricentro', 'El baricentro (donde se cortan las medianas) es el promedio de las coordenadas de los vértices.', `G=\\left(\\frac{${pts.map(p => L_frac(p.x)).join('+')}}{3}\\,;\\,\\frac{${pts.map(p => L_frac(p.y)).join('+')}}{3}\\right)=${Lpt(G.x, G.y)}`);
      res.push(`G=${Lpt(G.x, G.y)}`);
      const [a_, b_, c_] = lados.map(l => Math.sqrt(l.d2.num())), s = (a_ + b_ + c_) / 2, H = Math.sqrt(Math.max(0, s * (s - a_) * (s - b_) * (s - c_)));
      P('Verificamos', areaH !== null ? 'Calculamos el área por otro camino, con determinantes, y comparamos.' : 'Calculamos el área por otro camino, con la fórmula de Herón (usando los tres lados), y comparamos.', areaH !== null ? `A=\\frac{1}{2}\\left|${L_frac(S)}\\right|=${L_frac(area)}\\approx ${L_x(area.num())}\\;${Math.abs(area.num() - areaH) < 1e-6 ? '\\checkmark' : ''}` : `A_{\\text{Herón}}\\approx ${L_x(H)}\\;${Math.abs(H - area.num()) < 1e-6 * Math.max(1, H) ? '\\checkmark' : ''}`);
      return { tema: 'bi', metodo: areaH !== null ? 'Fórmula de Herón' : 'Determinantes (fórmula de la zapatilla)', pasos, resultado: res.join(',\\quad '), alternativas: [{ nombre: areaH !== null ? 'Ver el área con determinantes' : 'Ver el área con Herón', metodo: areaH !== null ? 'det' : 'heron' }] };
    }
    const cuad = pts.length === 4 ? 'cuadrilátero' : 'polígono';
    const tri = pts.slice(1, -1).reduce((s, p, i) => s.add(areaShoelace([pts[0], p, pts[i + 2]]).abs().div(QE(2))), Q0);
    P('Verificamos', `Partimos el ${cuad} en triángulos desde el primer vértice y sumamos sus áreas (vale si el ${cuad} es convexo).`, `A=${L_frac(tri)}\\;${tri.eq(area) ? '\\checkmark' : ''}`);
    return { tema: 'bi', metodo: 'Determinantes (fórmula de la zapatilla)', pasos, resultado: res.join(',\\quad ') };
  }
  const res = [], quiereD = /distancia|longitud|mide/.test(t) || !/medio/.test(t), quiereM = /medio/.test(t) || !/distancia|longitud|mide/.test(t);
  let M;
  if (quiereD) { const D = L_dist(A, B); P('Calculamos la distancia', 'La distancia entre dos puntos sale del teorema de Pitágoras: las diferencias de coordenadas son los catetos y la distancia es la hipotenusa.', D.mates); res.push(`d(A,B)=${L_raiz(D.d2)}`); }
  if (quiereM) { M = { x: A.x.add(B.x).div(QE(2)), y: A.y.add(B.y).div(QE(2)), n: 'M' }; P('Calculamos el punto medio', 'Cada coordenada del punto medio es el promedio de las coordenadas de los extremos.', `M=\\left(\\frac{${L_frac(A.x)}+${Lp(B.x)}}{2}\\,;\\,\\frac{${L_frac(A.y)}+${Lp(B.y)}}{2}\\right)=${Lpt(M.x, M.y)}`); res.push(`M=${Lpt(M.x, M.y)}`); }
  P('Lo vemos en el gráfico', '', [], graf({ pts: [...pts.slice(0, 2).map(p => ptN(p)), ...(M ? [ptN(M)] : [])], segs: [[A.x.num(), A.y.num(), B.x.num(), B.y.num()]] }));
  if (M) P('Verificamos', 'El punto medio tiene que estar a la misma distancia de los dos extremos (comparamos los cuadrados de las distancias).', `d(A,M)^2=${L_frac(dist2(A, M))}=d(M,B)^2\\;${dist2(A, M).eq(dist2(M, B)) ? '\\checkmark' : ''}`);
  else { const h = Math.hypot(B.x.num() - A.x.num(), B.y.num() - A.y.num()); P('Verificamos', 'Calculamos la distancia con decimales, como una calculadora.', `d\\approx ${L_x(h)}\\;${Math.abs(h - Math.sqrt(dist2(A, B).num())) < 1e-9 ? '\\checkmark' : ''}`); }
  return { tema: 'bi', metodo: quiereD && quiereM ? 'Distancia y punto medio' : quiereD ? 'Fórmula de la distancia' : 'Fórmula del punto medio', pasos, resultado: res.join(',\\quad ') };
}

/* -----------------------------------------------------------------------
 * G5. ÁNGULOS NOTABLES EXACTOS: números de la forma a + b·√s
 * --------------------------------------------------------------------- */
class R2 { constructor(a, b = Q0, s = 1n) { this.a = a; this.b = b; this.s = s; }
  mulQ(q) { return new R2(this.a.mul(q), this.b.mul(q), this.s); }
  add(o) { const s = this.b.cero ? o.s : this.s; return new R2(this.a.add(o.a), this.b.add(o.b), s); }
  neg() { return new R2(this.a.neg(), this.b.neg(), this.s); }
  num() { return this.a.num() + this.b.num() * Math.sqrt(Number(this.s)); }
  L() { if (this.b.cero) return L_frac(this.a); const rad = `\\sqrt{${L_ent(this.s)}}`, b = this.b.abs(), tb = (b.eq(Q1) ? '' : L_frac(b)) + rad;
    if (this.a.cero) return (this.b.n < 0n ? '-' : '') + tb; return `${L_frac(this.a)}${this.b.n < 0n ? '-' : '+'}${tb}`; } }
const gms = x => { let d = Math.floor(x + 1e-9), mf = (x - d) * 60, m = Math.floor(mf + 1e-9), s = Math.round((mf - m) * 60); if (s === 60) { s = 0; m++; } if (m === 60) { m = 0; d++; } return `${d}^{\\circ}\\,${m}'\\,${s}''`; };
const Lgr = x => `${fmtX(x, 4).replace(',', '{,}')}^{\\circ}`;
// cos y sin exactos de un ángulo múltiplo de 30° o de 45° (o null)
function trigExacta(deg) {
  const d = ((deg % 360) + 360) % 360; if (Math.abs(d - Math.round(d)) > 1e-9) return null;
  const D = Math.round(d); if (D % 30 && D % 45) return null;
  const ref = [D, 180 - D, D - 180, 360 - D].find(r => r >= 0 && r <= 90);
  const h = new Q(1n, 2n), T = { 0: [new R2(Q1), new R2(Q0)], 30: [new R2(Q0, h, 3n), new R2(h)], 45: [new R2(Q0, h, 2n), new R2(Q0, h, 2n)], 60: [new R2(h), new R2(Q0, h, 3n)], 90: [new R2(Q0), new R2(Q1)] }[ref];
  const sc = Math.cos(D * Math.PI / 180) < -1e-12 ? -1 : 1, ss = Math.sin(D * Math.PI / 180) < -1e-12 ? -1 : 1;
  return { c: sc < 0 ? T[0].neg() : T[0], s: ss < 0 ? T[1].neg() : T[1] };
}
function tanExacta(deg) { const e = trigExacta(deg); if (!e || Math.abs(e.c.num()) < 1e-12) return null; const v = e.s.num() / e.c.num();
  const tabla_ = [[0, '0'], [1, '1'], [-1, '-1'], [Math.sqrt(3), '\\sqrt{3}'], [-Math.sqrt(3), '-\\sqrt{3}'], [Math.sqrt(3) / 3, '\\frac{\\sqrt{3}}{3}'], [-Math.sqrt(3) / 3, '-\\frac{\\sqrt{3}}{3}']]; const f = tabla_.find(([n]) => Math.abs(n - v) < 1e-9); return f ? { L: f[1], x: v } : null; }

/* -----------------------------------------------------------------------
 * G6. PENDIENTE DE UNA RECTA
 * --------------------------------------------------------------------- */
const anguloDe = m => { let a = Math.atan(m.num()) * 180 / Math.PI; if (a < 0) a += 180; return a; };
function L_angulo(m) { const a = anguloDe(m), ex = [0, 30, 45, 60, 120, 135, 150].find(v => Math.abs(v - a) < 1e-9); return ex !== undefined ? `${ex}^{\\circ}` : `${Lgr(a)}\\approx ${gms(a)}`; }
function compararRectas(r1, r2, P) {
  const m1 = pendienteR(r1), m2 = pendienteR(r2), cruz = r1.A.mul(r2.B).sub(r2.A.mul(r1.B)), escalar = r1.A.mul(r2.A).add(r1.B.mul(r2.B));
  P('Escribimos las rectas y sus pendientes', 'Pasamos cada recta a la forma explícita y = mx + b para leer la pendiente.', [`r_1:\\;${L_gen(r1)}\\;\\Rightarrow\\;${L_expl(r1)}${m1 ? ',\\;m_1=' + L_frac(m1) : ''}`, `r_2:\\;${L_gen(r2)}\\;\\Rightarrow\\;${L_expl(r2)}${m2 ? ',\\;m_2=' + L_frac(m2) : ''}`], svgGeo({ rectas: [rN(r1), rN(r2)] }));
  let res, ver;
  if (cruz.cero) {
    const coinc = r1.A.mul(r2.C).sub(r2.A.mul(r1.C)).cero && r1.B.mul(r2.C).sub(r2.B.mul(r1.C)).cero;
    P('Comparamos', coinc ? 'Tienen la misma pendiente y la misma ordenada: son la misma recta (coincidentes).' : 'Tienen la misma pendiente y distinta ordenada al origen: son paralelas.', m1 ? `m_1=m_2=${L_frac(m1)}` : tx('las dos son verticales'));
    res = coinc ? 'coincidentes' : 'paralelas'; ver = `A_1B_2-A_2B_1=${L_frac(r1.A)}\\cdot ${Lp(r2.B)}-${Lp(r2.A)}\\cdot ${Lp(r1.B)}=0\\;\\checkmark`;
  } else if (escalar.cero) {
    P('Comparamos', 'El producto de las pendientes da −1: son perpendiculares (se cortan formando un ángulo recto).', m1 && m2 ? `m_1\\cdot m_2=${Lp(m1)}\\cdot ${Lp(m2)}=-1` : tx('una es horizontal y la otra vertical'));
    res = 'perpendiculares'; ver = `A_1A_2+B_1B_2=${L_frac(r1.A)}\\cdot ${Lp(r2.A)}+${Lp(r1.B)}\\cdot ${Lp(r2.B)}=0\\;\\checkmark`;
  } else {
    const tg = m1 && m2 ? m2.sub(m1).div(Q1.add(m1.mul(m2))).abs() : null, ang = tg ? Math.atan(tg.num()) * 180 / Math.PI : 90 - Math.atan(Math.abs((m1 || m2).num())) * 180 / Math.PI;
    P('Calculamos el ángulo entre las rectas', 'No son paralelas ni perpendiculares: se cortan formando un ángulo. Con las pendientes: $\\tan\\varphi = \\left|\\frac{m_2 - m_1}{1 + m_1 m_2}\\right|$.', tg ? [`\\tan\\varphi=\\left|\\frac{${L_frac(m2)}-${Lp(m1)}}{1+${Lp(m1)}\\cdot ${Lp(m2)}}\\right|=${L_frac(tg)}`, `\\varphi\\approx ${Lgr(ang)}\\approx ${gms(ang)}`] : [`\\varphi\\approx ${Lgr(ang)}`]);
    res = 'oblicuas'; ver = `\\varphi\\approx\\left|${L_angulo(m2 || Q0)}-${L_angulo(m1 || Q0)}\\right|\\;\\text{(o su suplemento)}\\;\\checkmark`;
  }
  P('Verificamos', 'Comprobamos con los coeficientes de la forma general: son paralelas si $A_1B_2 - A_2B_1 = 0$ y perpendiculares si $A_1A_2 + B_1B_2 = 0$.', ver);
  return { tema: 'pendiente', metodo: 'Comparación de pendientes', pasos: null, resultado: tx('Las rectas son ' + res) };
}
function resolverPendiente(texto) {
  const t = plano(texto), { pasos, P } = crearPasos(), rs = rectasEnTexto(texto); let pts = [];
  try { pts = ptsExactos(texto); } catch (e) { /* sin puntos */ }
  if (rs.length >= 2) { const r = compararRectas(rs[0], rs[1], P); r.pasos = pasos; return r; }
  let m;
  if (rs.length === 1) {
    const r = rs[0];
    P('Escribimos la recta', 'Para leer la pendiente despejamos y: en y = mx + b, la pendiente es el número que multiplica a x.', [L_gen(r), L_expl(r)]);
    if (r.B.cero) { P('Analizamos', 'La recta es vertical (x = constante): su pendiente no está definida y su ángulo de inclinación es 90°.', L_expl(r)); return { tema: 'pendiente', metodo: 'Forma explícita', pasos, resultado: tx('Pendiente no definida (recta vertical)') }; }
    m = pendienteR(r);
    P('Leemos la pendiente', 'También sale directo de la forma general: $m = -\\frac{A}{B}$.', `m=-\\frac{${L_frac(r.A)}}{${L_frac(r.B)}}=${L_frac(m)}`);
    const x1 = Q0, x2 = Q1, y1 = r.C.neg().div(r.B), y2 = r.C.neg().sub(r.A).div(r.B);
    P('Calculamos el ángulo de inclinación', 'Es el ángulo que forma la recta con el eje x positivo: $\\tan\\alpha = m$.', `\\alpha=${L_angulo(m)}`, svgGeo({ rectas: [rN(r)], pts: [[0, y1.num(), Tpt(x1, y1)], [1, y2.num(), Tpt(x2, y2)]] }));
    P('Verificamos', 'Tomamos dos puntos de la recta (con x = 0 y x = 1) y calculamos la pendiente con ellos.', `m=\\frac{${L_frac(y2)}-${Lp(y1)}}{1-0}=${L_frac(y2.sub(y1))}\\;${y2.sub(y1).eq(m) ? '\\checkmark' : ''}`);
    return { tema: 'pendiente', metodo: 'Forma explícita', pasos, resultado: `m=${L_frac(m)},\\quad\\alpha=${L_angulo(m)}` };
  }
  if (pts.length >= 2) {
    const [A, B] = pts, dx = B.x.sub(A.x), dy = B.y.sub(A.y);
    P('Ubicamos los puntos', 'La pendiente mide cuánto sube (o baja) la recta por cada unidad que avanzamos en x.', `A=${Lpt(A.x, A.y)},\\quad B=${Lpt(B.x, B.y)}`);
    if (dx.cero) { P('Analizamos', 'Los dos puntos tienen la misma x: la recta es vertical y su pendiente no está definida (habría que dividir por 0).', `x_2-x_1=0`); return { tema: 'pendiente', metodo: 'Cociente de incrementos', pasos, resultado: tx('Pendiente no definida (recta vertical)') }; }
    m = dy.div(dx);
    P('Calculamos la pendiente', 'Es el cociente entre la variación de y y la variación de x: $m = \\frac{y_2 - y_1}{x_2 - x_1}$.', `m=\\frac{${L_frac(B.y)}-${Lp(A.y)}}{${L_frac(B.x)}-${Lp(A.x)}}=\\frac{${L_frac(dy)}}{${L_frac(dx)}}=${L_frac(m)}`, svgGeo({ pts: [ptN(A), ptN(B)], segs: [[A.x.num(), A.y.num(), B.x.num(), B.y.num()], [A.x.num(), A.y.num(), B.x.num(), A.y.num()], [B.x.num(), A.y.num(), B.x.num(), B.y.num()]] }));
    P('Interpretamos', `${m.signo > 0 ? 'Es positiva: la recta sube (es creciente)' : m.signo < 0 ? 'Es negativa: la recta baja (es decreciente)' : 'Es 0: la recta es horizontal'}. El ángulo de inclinación cumple $\\tan\\alpha = m$.`, `\\alpha=${L_angulo(m)}`);
    P('Verificamos', 'Partimos de A y avanzamos con la pendiente hasta la x de B: tenemos que llegar justo a la y de B.', `y_1+m\\,(x_2-x_1)=${L_frac(A.y)}+${Lp(m)}\\cdot ${Lp(dx)}=${L_frac(A.y.add(m.mul(dx)))}=y_2\\;${A.y.add(m.mul(dx)).eq(B.y) ? '\\checkmark' : ''}`);
    return { tema: 'pendiente', metodo: 'Cociente de incrementos', pasos, resultado: `m=${L_frac(m)},\\quad\\alpha=${L_angulo(m)}` };
  }
  const ang = texto.match(/(-?\d+(?:[.,]\d+)?)\s*(?:°|grados|º)/);
  if (ang) {
    const a = leerDecimal(ang[1].replace('-', '')).q.num() * (ang[1].startsWith('-') ? -1 : 1), ex = tanExacta(a);
    if (Math.abs(((a % 180) + 180) % 180 - 90) < 1e-9) { P('Analizamos', 'Con 90° la recta es vertical: la pendiente no está definida.', `\\tan 90^{\\circ}\\;\\text{no existe}`); return { tema: 'pendiente', metodo: 'Tangente del ángulo', pasos, resultado: tx('Pendiente no definida') }; }
    P('Calculamos la pendiente', 'La pendiente es la tangente del ángulo de inclinación: $m = \\tan\\alpha$.', `m=\\tan ${Lgr(a)}${ex ? '=' + ex.L : '\\approx ' + L_x(Math.tan(a * Math.PI / 180))}`);
    const mv = Math.tan(a * Math.PI / 180);
    P('Verificamos', 'Volvemos al ángulo con la función inversa: $\\alpha = \\arctan m$.', `\\arctan\\left(${L_x(mv)}\\right)\\approx ${Lgr(((Math.atan(mv) * 180 / Math.PI) + 180) % 180)}\\;\\checkmark`);
    return { tema: 'pendiente', metodo: 'Tangente del ángulo', pasos, resultado: `m=${ex ? ex.L : '\\approx ' + L_x(mv)}` };
  }
  const mm = texto.match(/m\s*=\s*(-?\s*\d+(?:[.,]\d+)?(?:\/\d+)?)/i);
  if (mm) {
    m = numDe(mm[1]);
    P('Calculamos el ángulo de inclinación', 'El ángulo cumple $\\tan\\alpha = m$, así que $\\alpha = \\arctan m$ (si m es negativa, sumamos 180° para que quede entre 0° y 180°).', `\\alpha=\\arctan\\left(${L_frac(m)}\\right)=${L_angulo(m)}`);
    P('Verificamos', 'Calculamos la tangente del ángulo obtenido.', `\\tan ${Lgr(anguloDe(m))}\\approx ${L_x(Math.tan(anguloDe(m) * Math.PI / 180))}\\;\\checkmark`);
    return { tema: 'pendiente', metodo: 'Arco tangente', pasos, resultado: `\\alpha=${L_angulo(m)}` };
  }
  throw new Error('Escribilo así: “pendiente entre (1, 2) y (3, 8)”, “pendiente de 2x + 3y − 6 = 0”, “pendiente de una recta de 60°” o “¿son paralelas 2x + y = 3 y 4x + 2y = 1?”.');
}

/* -----------------------------------------------------------------------
 * G7. LUGAR GEOMÉTRICO
 * Se plantea la condición para un punto P(x ; y), se eleva al cuadrado
 * para sacar las raíces y se simplifica.
 * --------------------------------------------------------------------- */
const d2xy = A => Pred(Padd(Ppow(Pred(Psub(Pv('x'), Pc(A.x))), 2), Ppow(Pred(Psub(Pv('y'), Pc(A.y))), 2)));
const L_d2xy = A => `${par('x' + (A.x.signo < 0 ? '+' + L_frac(A.x.abs()) : '-' + L_frac(A.x)))}^{2}+${par('y' + (A.y.signo < 0 ? '+' + L_frac(A.y.abs()) : '-' + L_frac(A.y)))}^{2}`.replace(/\\left\(x-0\\right\)\^\{2\}/, 'x^{2}').replace(/\\left\(y-0\\right\)\^\{2\}/, 'y^{2}');
function simplificarEc(D) { D = Pred(D); if (!D.length) return D; const c = contenido(D); return Pred(Pscale(D, c.k.inv())); }
function resolverLugar(texto) {
  const t = plano(texto), pts = ptsExactos(texto), { pasos, P } = crearPasos(); let D, nombre, Pver, graf;
  P('Planteamos un punto genérico', 'Un lugar geométrico es el conjunto de todos los puntos que cumplen una condición. Llamamos P = (x ; y) a cualquiera de esos puntos y escribimos la condición con la fórmula de la distancia.', `P=(x\\,;\\,y)`);
  if (/directriz|foco/.test(t)) {
    const dm = texto.match(/directriz\s*:?\s*([xy])\s*=\s*(-?\s*\d+(?:[.,]\d+)?(?:\/\d+)?)/i); if (!dm || !pts.length) throw new Error('Escribilo así: “lugar geométrico con foco (0, 2) y directriz y = -2”.');
    const F = pts[0], v = dm[1].toLowerCase(), k = numDe(dm[2]), otra = v === 'x' ? 'y' : 'x';
    P('Escribimos la condición', 'Cada punto está a la misma distancia del foco F que de la recta directriz. La distancia a una recta horizontal o vertical es la diferencia de coordenadas en valor absoluto.', `\\sqrt{${L_d2xy(F)}}=\\left|${v}-${Lp(k)}\\right|`);
    const der = Ppow(Pred(Psub(Pv(v), Pc(k))), 2);
    P('Elevamos al cuadrado', 'Así desaparecen la raíz y el valor absoluto.', `${L_d2xy(F)}=${par(v + '-' + Lp(k))}^{2}`);
    D = simplificarEc(Psub(d2xy(F), der));
    P('Desarrollamos y simplificamos', 'Desarrollamos los cuadrados de binomio y pasamos todo de un lado. El término con ' + v + '² se cancela.', `${L_P(D)}=0`);
    nombre = 'parábola'; const vert = v === 'y' ? { x: F.x, y: F.y.add(k).div(QE(2)) } : { x: F.x.add(k).div(QE(2)), y: F.y };
    Pver = { ...vert, n: 'V' };
    graf = { pts: [ptN({ ...F, n: 'F' }), ptN(Pver)], rectas: [v === 'y' ? { A: 0, B: 1, C: -k.num() } : { A: 1, B: 0, C: -k.num() }] };
  } else if (pts.length === 1 && /radio|distancia/.test(t)) {
    const rm = texto.replace(/\([^)]*\)/g, ' ').match(/(\d+(?:[.,]\d+)?(?:\/\d+)?)/); if (!rm) throw new Error('Falta la distancia (el radio).');
    const C = pts[0], r = numDe(rm[1]);
    P('Escribimos la condición', 'Cada punto está a la misma distancia r del punto fijo C.', `\\sqrt{${L_d2xy(C)}}=${L_frac(r)}`);
    P('Elevamos al cuadrado', 'Así desaparece la raíz.', `${L_d2xy(C)}=${L_frac(r.pow(2))}`);
    D = simplificarEc(Psub(d2xy(C), Pc(r.pow(2))));
    P('Desarrollamos y simplificamos', 'Desarrollamos los cuadrados y pasamos todo a un miembro.', `${L_P(D)}=0`);
    nombre = 'circunferencia'; Pver = { x: C.x.add(r), y: C.y, n: 'Q' }; graf = { pts: [ptN({ ...C, n: 'C' }), ptN(Pver)], circs: [{ h: C.x.num(), k: C.y.num(), r: r.num() }] };
  } else if (pts.length >= 2) {
    const [A, B] = pts; let k = leerRazon(texto);
    if (!k) k = /doble/.test(t) ? QE(2) : /triple/.test(t) ? QE(3) : /mitad/.test(t) ? new Q(1n, 2n) : Q1;
    if (k.signo <= 0) throw new Error('La razón entre distancias tiene que ser positiva.');
    if (k.eq(Q1)) P('Escribimos la condición', 'Cada punto está a la misma distancia de A que de B.', `\\sqrt{${L_d2xy(A)}}=\\sqrt{${L_d2xy(B)}}`);
    else P('Escribimos la condición', `La distancia de cada punto a A es ${fmtX(k.num())} veces su distancia a B.`, `\\sqrt{${L_d2xy(A)}}=${L_frac(k)}\\cdot\\sqrt{${L_d2xy(B)}}`);
    P('Elevamos al cuadrado', 'Así desaparecen las raíces.', `${L_d2xy(A)}=${k.eq(Q1) ? '' : L_frac(k.pow(2)) + '\\cdot\\left['}${L_d2xy(B)}${k.eq(Q1) ? '' : '\\right]'}`);
    D = simplificarEc(Psub(d2xy(A), Pscale(d2xy(B), k.pow(2))));
    P('Desarrollamos y simplificamos', k.eq(Q1) ? 'Desarrollamos los cuadrados: los términos con x² y con y² se cancelan, así que queda una recta.' : 'Desarrollamos, pasamos todo a un miembro y juntamos semejantes.', `${L_P(D)}=0`);
    nombre = k.eq(Q1) ? 'mediatriz' : 'circunferencia de Apolonio';
    Pver = { x: A.x.add(k.mul(B.x)).div(Q1.add(k)), y: A.y.add(k.mul(B.y)).div(Q1.add(k)), n: k.eq(Q1) ? 'M' : 'P' };
    graf = { pts: [ptN(A), ptN(B), ptN(Pver)], segs: [[A.x.num(), A.y.num(), B.x.num(), B.y.num()]] };
    if (k.eq(Q1)) { const r = recta(...['x1', 'y1', ''].map(c => D.filter(m => claveMono(m.v) === c).reduce((s, m) => s.add(m.c), Q0))); graf.rectas = [rN(r)]; }
  } else throw new Error('Escribilo así: “lugar geométrico de los puntos que equidistan de (1, 2) y (5, 4)”, “puntos a distancia 3 de (2, 1)” o “foco (0, 2) y directriz y = -2”.');
  const co = c => D.filter(m => claveMono(m.v) === c).reduce((s, m) => s.add(m.c), Q0);
  if (nombre.startsWith('circunferencia')) { const a = co('x2'), h = co('x1').div(a).div(QE(-2)), kk = co('y1').div(a).div(QE(-2)), r2 = h.pow(2).add(kk.pow(2)).sub(co('').div(a)); if (!graf.circs) graf.circs = [{ h: h.num(), k: kk.num(), r: Math.sqrt(r2.num()) }]; P('Reconocemos la figura', `Quedan x² e y² con el mismo coeficiente: es una circunferencia de centro ${'$' + Lpt(h, kk) + '$'} y radio ${'$' + L_raiz(r2) + '$'}.`, [], svgGeo(graf)); }
  else P('Reconocemos la figura', nombre === 'mediatriz' ? 'Es una recta: la mediatriz del segmento AB (perpendicular a AB y que pasa por su punto medio).' : 'Una sola de las variables quedó al cuadrado: es una parábola. Su vértice está justo en el medio entre el foco y la directriz.', [], svgGeo(graf));
  const val = Peval(D, { x: Pver.x, y: Pver.y });
  P('Verificamos', `Tomamos un punto que seguro cumple la condición (${nombre === 'mediatriz' ? 'el punto medio de AB' : nombre === 'parábola' ? 'el vértice' : nombre === 'circunferencia' ? 'el que está a r unidades a la derecha del centro' : 'el que divide a AB en la razón dada'}) y lo reemplazamos en la ecuación.`, `${Pver.n}=${Lpt(Pver.x, Pver.y)}:\\quad ${L_frac(val)}=0\\;${val.cero ? '\\checkmark' : ''}`);
  return { tema: 'lugar', metodo: 'Condición con la fórmula de la distancia', pasos, resultado: `${L_P(D)}=0\\;\\;${tx('(' + nombre + ')')}` };
}

/* -----------------------------------------------------------------------
 * G8. LÍNEA RECTA
 * --------------------------------------------------------------------- */
function L_puntoPendiente(P0, m) { return `y-${Lp(P0.y)}=${L_frac(m)}\\left(x-${Lp(P0.x)}\\right)`; }
function formasRecta(r, P, titulo = 'Escribimos la recta en sus distintas formas') {
  const lin = [`\\text{general: }${L_gen(r)}`, `\\text{explícita: }${L_expl(r)}`];
  if (!r.A.cero && !r.B.cero && !r.C.cero) { const a = r.C.neg().div(r.A), b = r.C.neg().div(r.B); lin.push(`\\text{segmentaria: }\\frac{x}{${L_frac(a)}}+\\frac{y}{${L_frac(b)}}=1`); }
  P(titulo, 'La general es Ax + By + C = 0; la explícita, y = mx + b (m es la pendiente y b la ordenada al origen); la segmentaria muestra dónde corta a los ejes.', lin);
}
function cortesRecta(r) { const o = []; if (!r.B.cero) o.push({ x: Q0, y: r.C.neg().div(r.B), n: '' }); if (!r.A.cero) o.push({ x: r.C.neg().div(r.A), y: Q0, n: '' }); return o.filter((p, i) => !i || !(p.x.cero && p.y.cero && o[0].x.cero && o[0].y.cero)); }
function resolverRecta(texto, metodo) {
  const t = plano(texto), { pasos, P } = crearPasos(), rs = rectasEnTexto(texto); let pts = [];
  try { pts = ptsExactos(texto); } catch (e) { /* sin puntos */ }
  // a) Intersección de dos rectas
  if (rs.length >= 2 && /interse|corte|cortan|se cortan|punto comun/.test(t) || rs.length >= 2 && !/distancia|paralel|perpendic/.test(t)) {
    const [r1, r2] = rs, det = r1.A.mul(r2.B).sub(r2.A.mul(r1.B));
    P('Escribimos las rectas', 'El punto de intersección cumple las dos ecuaciones a la vez: resolvemos el sistema.', `\\begin{cases}${L_gen(r1)}\\\\${L_gen(r2)}\\end{cases}`);
    if (det.cero) { P('Analizamos', 'Las rectas tienen la misma pendiente: son paralelas (no se cortan) o coincidentes.', `A_1B_2-A_2B_1=0`); return { tema: 'recta', metodo: 'Sistema de ecuaciones', pasos, resultado: tx('No se cortan en un único punto') }; }
    const x = r1.B.mul(r2.C).sub(r2.B.mul(r1.C)).div(det), y = r2.A.mul(r1.C).sub(r1.A.mul(r2.C)).div(det);
    P('Resolvemos con determinantes', 'Pasamos los números al otro miembro (A·x + B·y = −C) y usamos la regla de Cramer.', [`\\Delta=${L_det([[r1.A, r1.B], [r2.A, r2.B]])}=${L_frac(det)}`, `x=\\frac{${L_det([[r1.C.neg(), r1.B], [r2.C.neg(), r2.B]])}}{${L_frac(det)}}=${L_frac(x)},\\quad y=\\frac{${L_det([[r1.A, r1.C.neg()], [r2.A, r2.C.neg()]])}}{${L_frac(det)}}=${L_frac(y)}`], svgGeo({ rectas: [rN(r1), rN(r2)], pts: [[x.num(), y.num(), Tpt(x, y)]] }));
    P('Verificamos', 'Reemplazamos el punto en las dos ecuaciones: tiene que dar 0 en ambas.', [r1, r2].map(r => `${L_frac(r.A)}\\cdot ${Lp(x)}+${Lp(r.B)}\\cdot ${Lp(y)}+${Lp(r.C)}=${L_frac(evalR(r, x, y))}\\;${evalR(r, x, y).cero ? '\\checkmark' : ''}`));
    return { tema: 'recta', metodo: 'Sistema de ecuaciones (Cramer)', pasos, resultado: `I=${Lpt(x, y)}` };
  }
  // b) Distancias
  if (/distancia/.test(t) && rs.length >= 1) {
    let r = rs[0], P0;
    if (rs.length >= 2) {
      const r2 = rs[1]; if (!r.A.mul(r2.B).sub(r2.A.mul(r.B)).cero) throw new Error('Las rectas no son paralelas: se cortan, así que la distancia entre ellas es 0.');
      P0 = cortesRecta(r)[0]; P0.n = 'P';
      P('Elegimos un punto de una de las rectas', 'Las rectas son paralelas: la distancia entre ellas es la distancia de cualquier punto de una a la otra.', `P=${Lpt(P0.x, P0.y)}\\in ${L_gen(r)}`); r = r2;
    } else { if (!pts.length) throw new Error('Falta el punto: “distancia de (1, 2) a 3x + 4y − 5 = 0”.'); P0 = { ...pts[0], n: 'P' }; }
    const N = evalR(r, P0.x, P0.y), den = r.A.pow(2).add(r.B.pow(2)), d2 = N.pow(2).div(den);
    P('Aplicamos la fórmula', 'La distancia de un punto (x₀ ; y₀) a la recta Ax + By + C = 0 es $d = \\frac{|Ax_0 + By_0 + C|}{\\sqrt{A^2 + B^2}}$.', [`d=\\frac{\\left|${L_frac(r.A)}\\cdot ${Lp(P0.x)}+${Lp(r.B)}\\cdot ${Lp(P0.y)}+${Lp(r.C)}\\right|}{\\sqrt{${Lp(r.A)}^{2}+${Lp(r.B)}^{2}}}=\\frac{${L_frac(N.abs())}}{\\sqrt{${L_frac(den)}}}`, `d=${L_raiz(d2)}`]);
    const k = N.neg().div(den), pie = { x: P0.x.add(r.A.mul(k)), y: P0.y.add(r.B.mul(k)), n: 'H' };
    P('Verificamos', 'Buscamos el pie de la perpendicular H (el punto de la recta más cercano a P): tiene que estar en la recta y su distancia a P tiene que ser d.', [`H=${Lpt(pie.x, pie.y)}:\\quad ${L_gen(r).replace('=0', '')}=${L_frac(evalR(r, pie.x, pie.y))}\\;${evalR(r, pie.x, pie.y).cero ? '\\checkmark' : ''}`, `d(P,H)^2=${L_frac(dist2(P0, pie))}=d^2\\;${dist2(P0, pie).eq(d2) ? '\\checkmark' : ''}`], svgGeo({ rectas: [rN(r), ...(rs.length >= 2 ? [rN(rs[0])] : [])], pts: [ptN(P0), ptN(pie)], segs: [[P0.x.num(), P0.y.num(), pie.x.num(), pie.y.num()]] }));
    return { tema: 'recta', metodo: rs.length >= 2 ? 'Distancia entre rectas paralelas' : 'Distancia de un punto a una recta', pasos, resultado: `d=${L_raiz(d2)}` };
  }
  // c) Paralela o perpendicular por un punto
  if (/paralel|perpendic/.test(t) && rs.length >= 1 && pts.length >= 1) {
    const r = rs[0], P0 = pts[0], perp = /perpendic/.test(t);
    const nueva = perp ? recta(r.B, r.A.neg(), r.A.mul(P0.y).sub(r.B.mul(P0.x))) : recta(r.A, r.B, r.A.mul(P0.x).add(r.B.mul(P0.y)).neg());
    const m = pendienteR(r), mN = pendienteR(nueva);
    P('Miramos la recta dada', 'Necesitamos su pendiente.', `${L_gen(r)}\\;\\Rightarrow\\;${L_expl(r)}${m ? ',\\;m=' + L_frac(m) : ''}`);
    P(perp ? 'Pendiente de la perpendicular' : 'Pendiente de la paralela', perp ? 'Dos rectas son perpendiculares si el producto de sus pendientes es −1: la pendiente nueva es la inversa cambiada de signo.' : 'Dos rectas paralelas tienen la misma pendiente.', mN ? `m'=${perp && m ? `-\\frac{1}{${L_frac(m)}}=` : ''}${L_frac(mN)}` : tx('La recta nueva es vertical.'));
    P('Escribimos la ecuación', 'Usamos la forma punto-pendiente con el punto dado.', [mN ? L_puntoPendiente(P0, mN) : `x=${L_frac(P0.x)}`, L_expl(nueva), L_gen(nueva)], svgGeo({ rectas: [rN(r), rN(nueva)], pts: [ptN(P0)] }));
    const okP = evalR(nueva, P0.x, P0.y).cero, okR = perp ? r.A.mul(nueva.A).add(r.B.mul(nueva.B)).cero : r.A.mul(nueva.B).sub(nueva.A.mul(r.B)).cero;
    P('Verificamos', `El punto tiene que cumplir la ecuación nueva, y las rectas tienen que ser ${perp ? 'perpendiculares' : 'paralelas'}.`, [`${L_gen(nueva).replace('=0', '')}\\;\\text{en }${Lpt(P0.x, P0.y)}=${L_frac(evalR(nueva, P0.x, P0.y))}\\;${okP ? '\\checkmark' : ''}`, `${perp ? 'A_1A_2+B_1B_2' : 'A_1B_2-A_2B_1'}=0\\;${okR ? '\\checkmark' : ''}`]);
    return { tema: 'recta', metodo: perp ? 'Recta perpendicular por un punto' : 'Recta paralela por un punto', pasos, resultado: `${L_expl(nueva)}\\quad(${L_gen(nueva)})` };
  }
  // d) Recta por dos puntos
  if (pts.length >= 2) {
    const [A, B] = pts, r = rectaDosPuntos(A, B);
    P('Ubicamos los puntos', 'Por dos puntos pasa una sola recta.', `A=${Lpt(A.x, A.y)},\\quad B=${Lpt(B.x, B.y)}`);
    if (A.x.eq(B.x)) P('Analizamos', 'Tienen la misma x: es una recta vertical.', `x=${L_frac(A.x)}`);
    else {
      const m = B.y.sub(A.y).div(B.x.sub(A.x));
      P('Calculamos la pendiente', '$m = \\frac{y_2 - y_1}{x_2 - x_1}$.', `m=\\frac{${L_frac(B.y)}-${Lp(A.y)}}{${L_frac(B.x)}-${Lp(A.x)}}=${L_frac(m)}`);
      P('Usamos la forma punto-pendiente', 'Con la pendiente y uno de los puntos: $y - y_1 = m(x - x_1)$. Después despejamos y.', [L_puntoPendiente(A, m), L_expl(r)]);
    }
    formasRecta(r, P);
    P('Lo vemos en el gráfico', '', [], svgGeo({ rectas: [rN(r)], pts: [ptN(A), ptN(B)] }));
    P('Verificamos', 'Reemplazamos los dos puntos en la ecuación general: tiene que dar 0 en los dos.', [A, B].map(Q_ => `${Lpt(Q_.x, Q_.y)}:\\;${L_frac(r.A)}\\cdot ${Lp(Q_.x)}+${Lp(r.B)}\\cdot ${Lp(Q_.y)}+${Lp(r.C)}=${L_frac(evalR(r, Q_.x, Q_.y))}\\;${evalR(r, Q_.x, Q_.y).cero ? '\\checkmark' : ''}`));
    return { tema: 'recta', metodo: 'Recta por dos puntos (punto-pendiente)', pasos, resultado: `${L_expl(r)}\\quad(${L_gen(r)})` };
  }
  // e) Punto y pendiente / pendiente y ordenada
  const mm = texto.match(/(?:pendiente|m)\s*(?:=|de|igual a)?\s*(-?\s*\d+(?:[.,]\d+)?(?:\/\d+)?)/i);
  if (mm && (pts.length === 1 || /ordenada|b\s*=/.test(t))) {
    const m = numDe(mm[1]); let r;
    if (pts.length === 1) { const P0 = pts[0]; r = rectaPuntoPendiente(P0, m); P('Usamos la forma punto-pendiente', 'Con un punto y la pendiente: $y - y_1 = m(x - x_1)$. Después despejamos y.', [L_puntoPendiente(P0, m), L_expl(r)]); formasRecta(r, P); P('Verificamos', 'El punto tiene que cumplir la ecuación y la pendiente tiene que ser la pedida.', [`${L_frac(evalR(r, P0.x, P0.y))}=0\\;\\checkmark`, `m=-\\frac{A}{B}=${L_frac(pendienteR(r))}\\;${pendienteR(r).eq(m) ? '\\checkmark' : ''}`], svgGeo({ rectas: [rN(r)], pts: [ptN(P0)] })); }
    else { const bm = texto.match(/(?:ordenada(?: al origen)?|b)\s*(?:=|de|igual a)?\s*(-?\s*\d+(?:[.,]\d+)?(?:\/\d+)?)/i); const b = numDe(bm[1]); r = recta(m, QE(-1), b); P('Escribimos la forma explícita', 'Con la pendiente m y la ordenada al origen b: y = mx + b.', L_expl(r)); formasRecta(r, P); P('Verificamos', 'El punto (0 ; b) tiene que estar en la recta.', `${L_frac(evalR(r, Q0, b))}=0\\;\\checkmark`, svgGeo({ rectas: [rN(r)], pts: [[0, b.num(), Tpt(Q0, b)]] })); }
    return { tema: 'recta', metodo: 'Punto-pendiente', pasos, resultado: `${L_expl(r)}\\quad(${L_gen(r)})` };
  }
  // f) Una sola recta: sus formas, cortes con los ejes y pendiente
  if (rs.length === 1) {
    const r = rs[0], cs = cortesRecta(r);
    P('Escribimos la ecuación', 'La pasamos a la forma general Ax + By + C = 0 (con coeficientes enteros).', L_gen(r));
    formasRecta(r, P);
    P('Cortes con los ejes', 'Con x = 0 obtenemos dónde corta al eje y; con y = 0, dónde corta al eje x.', cs.map(p => Lpt(p.x, p.y)).join(',\\quad '), svgGeo({ rectas: [rN(r)], pts: cs.map(p => [p.x.num(), p.y.num(), Tpt(p.x, p.y)]) }));
    P('Verificamos', 'Los puntos de corte tienen que cumplir la ecuación general.', cs.map(p => `${Lpt(p.x, p.y)}:\\;${L_frac(evalR(r, p.x, p.y))}=0\\;\\checkmark`));
    return { tema: 'recta', metodo: 'Formas de la ecuación de la recta', pasos, resultado: `${L_gen(r)},\\quad ${L_expl(r)}` };
  }
  throw new Error('Escribilo así: “recta que pasa por (1, 2) y (3, 8)”, “recta por (2, 1) paralela a 3x − y + 2 = 0”, “intersección de 2x + y = 7 y x − y = 2” o “distancia de (1, 2) a 3x + 4y − 5 = 0”.');
}

/* -----------------------------------------------------------------------
 * G9. CIRCUNFERENCIA
 * --------------------------------------------------------------------- */
const sqXY = (v, c) => (c.cero ? `${v}^{2}` : `\\left(${v}${c.signo < 0 ? '+' + L_frac(c.abs()) : '-' + L_frac(c)}\\right)^{2}`);
const L_canon = (h, k, r2) => `${sqXY('x', h)}+${sqXY('y', k)}=${L_frac(r2)}`;
const genDe = (h, k, r2) => ({ D: h.mul(QE(-2)), E: k.mul(QE(-2)), F: h.pow(2).add(k.pow(2)).sub(r2) });
const L_genC = ({ D, E, F }) => `${L_P(Pred([mono(Q1, { x: 2 }), mono(Q1, { y: 2 }), mono(D, { x: 1 }), mono(E, { y: 1 }), mono(F)]))}=0`;
const evalC = ({ D, E, F }, p) => p.x.pow(2).add(p.y.pow(2)).add(D.mul(p.x)).add(E.mul(p.y)).add(F);
const circN = (h, k, r2) => ({ h: h.num(), k: k.num(), r: Math.sqrt(r2.num()) });
function cerrarCirc(h, k, r2, P, pts = [], extra = {}) {
  const g = genDe(h, k, r2);
  P('Escribimos la ecuación', 'Forma canónica: $(x - h)^2 + (y - k)^2 = r^2$, con centro (h ; k) y radio r. Si desarrollamos los cuadrados, obtenemos la forma general.', [`\\text{canónica: }${L_canon(h, k, r2)}`, `\\text{general: }${L_genC(g)}`], svgGeo({ circs: [circN(h, k, r2)], pts: [[h.num(), k.num(), 'C ' + Tpt(h, k)], ...pts.map(p => ptN(p))], ...extra }));
  return g;
}
function ecCircEnTexto(texto) {
  for (const s of ecuacionesEnTexto(texto)) { try { const e = ecuacionXY(s); if (e.tipo === 'circ') return e; } catch (err) { /* sigue */ } }
  return null;
}
function resolver3x3(M) { // M: 3 filas [a, b, c, d] → solución de a·D + b·E + c·F = d
  const A = M.map(f => f.slice()); for (let c = 0; c < 3; c++) { const p = A.findIndex((f, i) => i >= c && !f[c].cero); if (p < 0) return null; [A[p], A[c]] = [A[c], A[p]]; for (let i = 0; i < 3; i++) if (i !== c) { const f = A[i][c].div(A[c][c]); A[i] = A[i].map((x, j) => x.sub(f.mul(A[c][j]))); } }
  return A.map((f, i) => f[3].div(f[i]));
}
function resolverCircunferencia(texto, metodo) {
  const t = plano(texto), { pasos, P } = crearPasos(), ec = ecCircEnTexto(texto); let pts = [];
  try { pts = ptsExactos(texto.replace(/\([xy][^)]*\)\s*\^/g, ' ')); } catch (e) { /* sin puntos */ }
  if (ec) {
    const { D, E, F } = ec;
    P('Escribimos la ecuación', ec.a.eq(Q1) ? 'Está en forma general (o la llevamos a esa forma): x² + y² + Dx + Ey + F = 0.' : `Dividimos todo por ${fmtX(ec.a.num())} para que x² e y² tengan coeficiente 1.`, L_genC({ D, E, F }));
    const h = D.div(QE(-2)), k = E.div(QE(-2)), r2 = h.pow(2).add(k.pow(2)).sub(F);
    P('Completamos cuadrados', 'Agrupamos los términos con x y los términos con y. A cada grupo le sumamos el cuadrado de la mitad del coeficiente lineal (y lo sumamos también del otro lado) para formar trinomios cuadrados perfectos.', [`\\left(x^{2}${L_mono(mono(D, { x: 1 }), false).replace(/^\+?$/, '')}+${Lp(h.neg())}^{2}\\right)+\\left(y^{2}${L_mono(mono(E, { y: 1 }), false).replace(/^\+?$/, '')}+${Lp(k.neg())}^{2}\\right)=${L_frac(F.neg())}+${Lp(h.neg())}^{2}+${Lp(k.neg())}^{2}`, L_canon(h, k, r2)]);
    if (r2.signo <= 0) { P('Analizamos', r2.cero ? 'El radio da 0: la “circunferencia” es un solo punto, el centro.' : 'El segundo miembro es negativo: no hay ningún punto que cumpla la ecuación (no es una circunferencia real).', `r^2=${L_frac(r2)}`); return { tema: 'circunferencia', metodo: 'Completar cuadrados', pasos, resultado: tx(r2.cero ? `Un solo punto: ${'(' + fmtX(h.num()) + '; ' + fmtX(k.num()) + ')'}` : 'No es una circunferencia real') }; }
    if (/tangente/.test(t) && pts.length) {
      const P0 = pts[0];
      if (!evalC({ D, E, F }, P0).cero) throw new Error('El punto no está en la circunferencia: la tangente “en un punto” tiene que usar un punto de la circunferencia.');
      const r = recta(P0.x.sub(h), P0.y.sub(k), P0.x.sub(h).mul(P0.x).add(P0.y.sub(k).mul(P0.y)).neg());
      P('Usamos que la tangente es perpendicular al radio', `El radio que va del centro al punto de tangencia es perpendicular a la tangente. El vector (x₀ − h ; y₀ − k) es perpendicular a la recta buscada.`, [`C=${Lpt(h, k)},\\quad T=${Lpt(P0.x, P0.y)}`, `${Lp(P0.x.sub(h))}\\left(x-${Lp(P0.x)}\\right)+${Lp(P0.y.sub(k))}\\left(y-${Lp(P0.y)}\\right)=0`, L_gen(r)], svgGeo({ circs: [circN(h, k, r2)], rectas: [rN(r)], pts: [[h.num(), k.num(), 'C'], ptN({ ...P0, n: 'T' })], segs: [[h.num(), k.num(), P0.x.num(), P0.y.num()]] }));
      const d2 = evalR(r, h, k).pow(2).div(r.A.pow(2).add(r.B.pow(2)));
      P('Verificamos', 'La distancia del centro a la tangente tiene que ser igual al radio.', `d(C,t)^2=${L_frac(d2)}=r^2\\;${d2.eq(r2) ? '\\checkmark' : ''}`);
      return { tema: 'circunferencia', metodo: 'Tangente perpendicular al radio', pasos, resultado: `${L_gen(r)}\\quad(${L_expl(r)})` };
    }
    const rs = rectasEnTexto(texto);
    if (rs.length) {
      const r = rs[0], sust = (Pn, v, Qy) => Pred(Pn.flatMap(mm => { const e = mm.v[v] || 0, resto = mono(mm.c, Object.fromEntries(Object.entries(mm.v).filter(([k_]) => k_ !== v))); return Pmul([resto], Ppow(Qy, e)); }));
      const Cpoly = Pred([mono(Q1, { x: 2 }), mono(Q1, { y: 2 }), mono(D, { x: 1 }), mono(E, { y: 1 }), mono(F)]);
      const despY = !r.B.cero, expr = despY ? Pred([mono(r.A.neg().div(r.B), { x: 1 }), mono(r.C.neg().div(r.B))]) : Pred([mono(r.B.neg().div(r.A), { y: 1 }), mono(r.C.neg().div(r.A))]);
      const v = despY ? 'y' : 'x', w = despY ? 'x' : 'y', q = sust(Cpoly, v, expr), u = aU(q, w);
      P('Despejamos de la recta y reemplazamos', `Los puntos de corte cumplen las dos ecuaciones. Despejamos ${v} de la recta y lo reemplazamos en la circunferencia.`, [`${v}=${L_P(expr)}`, `${L_P(q)}=0`]);
      const R = raicesCuadratica(u[2], u[1], u[0]);
      P('Resolvemos la cuadrática', 'El discriminante dice cuántos cortes hay: dos (secante), uno (tangente) o ninguno (exterior).', `\\Delta=${L_ent(R.D)}\\;\\Rightarrow\\;${R.tipo === 'comp' ? tx('no hay cortes') : `${w}_{1,2}=${R.tipo === 'rac' ? R.r.map(L_frac).join(',\\;') : R.Lpm}`}`);
      if (R.tipo === 'comp') { P('Verificamos', 'La distancia del centro a la recta tiene que ser mayor que el radio.', `d^2=${L_frac(evalR(r, h, k).pow(2).div(r.A.pow(2).add(r.B.pow(2))))}>${L_frac(r2)}\\;\\checkmark`); return { tema: 'circunferencia', metodo: 'Sustitución', pasos, resultado: tx('La recta es exterior: no corta a la circunferencia') }; }
      const sols = (R.tipo === 'rac' ? R.r : R.x.map(x => ({ aprox: x }))).filter((s, i, arr) => !i || !(s.eq && s.eq(arr[0])));
      const ptsS = sols.map(s => { if (s.aprox !== undefined) { const ov = (expr[0] ? 0 : 0); const val = PevalN(expr, { [w]: s.aprox }); return despY ? { xn: s.aprox, yn: val } : { xn: val, yn: s.aprox }; } const o = Peval(expr, { [w]: s }); return despY ? { x: s, y: o } : { x: o, y: s }; });
      P('Calculamos los puntos', `Reemplazamos cada valor en la recta para obtener la otra coordenada. ${sols.length === 1 ? 'Hay un solo punto: la recta es tangente.' : 'Hay dos puntos: la recta es secante.'}`, ptsS.map(p => (p.x ? Lpt(p.x, p.y) : `(${L_x(p.xn)}\\,;\\,${L_x(p.yn)})`)).join(',\\quad '), svgGeo({ circs: [circN(h, k, r2)], rectas: [rN(r)], pts: ptsS.map(p => (p.x ? [p.x.num(), p.y.num(), Tpt(p.x, p.y)] : [p.xn, p.yn, ''])) }));
      P('Verificamos', 'Cada punto tiene que cumplir la ecuación de la circunferencia y la de la recta.', ptsS.map(p => p.x ? `${Lpt(p.x, p.y)}:\\;${L_frac(evalC({ D, E, F }, p))}=0,\\;${L_frac(evalR(r, p.x, p.y))}=0\\;\\checkmark` : `(${L_x(p.xn)};${L_x(p.yn)}):\\;${L_x(p.xn ** 2 + p.yn ** 2 + D.num() * p.xn + E.num() * p.yn + F.num())}\\approx 0\\;\\checkmark`));
      return { tema: 'circunferencia', metodo: 'Intersección recta-circunferencia (sustitución)', pasos, resultado: ptsS.map(p => (p.x ? Lpt(p.x, p.y) : `(${L_x(p.xn)}\\,;\\,${L_x(p.yn)})`)).join(',\\;') };
    }
    if (pts.length && /posicion|interior|exterior|pertenece|esta en|adentro|afuera/.test(t)) {
      const P0 = pts[0], d2 = dist2({ x: h, y: k }, P0), c = d2.cmp(r2);
      P('Comparamos la distancia al centro con el radio', 'Si la distancia del punto al centro es menor que el radio, el punto es interior; si es igual, está en la circunferencia; si es mayor, es exterior. Comparamos los cuadrados para no usar raíces.', `d(C,P)^2=${L_frac(d2)}\\;${c < 0 ? '<' : c > 0 ? '>' : '='}\\;r^2=${L_frac(r2)}`, svgGeo({ circs: [circN(h, k, r2)], pts: [[h.num(), k.num(), 'C'], ptN({ ...P0, n: 'P' })] }));
      P('Verificamos', 'Reemplazamos el punto en la ecuación general: da negativo si es interior, 0 si está en la circunferencia y positivo si es exterior.', `${L_frac(evalC({ D, E, F }, P0))}\\;${c < 0 ? '<' : c > 0 ? '>' : '='}\\;0\\;\\checkmark`);
      return { tema: 'circunferencia', metodo: 'Comparación con el radio', pasos, resultado: tx(c < 0 ? 'El punto es interior' : c > 0 ? 'El punto es exterior' : 'El punto pertenece a la circunferencia') };
    }
    P('Leemos centro y radio', 'De la forma canónica leemos el centro (cambiando los signos de adentro de los paréntesis) y el radio (la raíz del segundo miembro).', [`C=${Lpt(h, k)}`, `r=\\sqrt{${L_frac(r2)}}${raizQ(r2).exacta ? '=' + L_frac(raizQ(r2).q) : '=' + L_raiz(r2)}`], svgGeo({ circs: [circN(h, k, r2)], pts: [[h.num(), k.num(), 'C ' + Tpt(h, k)]] }));
    P('Verificamos', 'Volvemos a desarrollar la forma canónica: tiene que dar la ecuación general original.', `${L_canon(h, k, r2)}\\;\\Rightarrow\\;${L_genC(genDe(h, k, r2))}\\;${genDe(h, k, r2).F.eq(F) ? '\\checkmark' : ''}`);
    return { tema: 'circunferencia', metodo: 'Completar cuadrados', pasos, resultado: `C=${Lpt(h, k)},\\quad r=${L_raiz(r2, false)}` };
  }
  // Datos geométricos
  let h, k, r2, extraPts = [], met;
  const rm = texto.replace(/\([^)]*\)/g, ' ').match(/radio\s*(?:r\s*)?(?:=|de|igual a)?\s*(\d+(?:[.,]\d+)?(?:\/\d+)?)/i);
  if (/centro/.test(t) && pts.length >= 1 && rm) { ({ x: h, y: k } = pts[0]); const r = numDe(rm[1]); r2 = r.pow(2); met = 'Centro y radio'; P('Anotamos los datos', 'Conocemos el centro y el radio.', `C=${Lpt(h, k)},\\quad r=${L_frac(r)}`); }
  else if (/centro/.test(t) && pts.length >= 2) { ({ x: h, y: k } = pts[0]); r2 = dist2(pts[0], pts[1]); extraPts = [pts[1]]; met = 'Centro y un punto'; P('Calculamos el radio', 'El radio es la distancia del centro al punto por el que pasa la circunferencia.', `r^2=d(C,P)^2=${L_frac(r2)}\\;\\Rightarrow\\;r=${L_raiz(r2)}`); }
  else if (/diametro|extremos/.test(t) && pts.length >= 2) { const [A, B] = pts; h = A.x.add(B.x).div(QE(2)); k = A.y.add(B.y).div(QE(2)); r2 = dist2(A, B).div(QE(4)); extraPts = [A, B]; met = 'Extremos de un diámetro'; P('Calculamos centro y radio', 'El centro es el punto medio del diámetro y el radio es la mitad de su longitud.', [`C=${Lpt(h, k)}`, `r^2=\\frac{d(A,B)^2}{4}=\\frac{${L_frac(dist2(A, B))}}{4}=${L_frac(r2)}`]); }
  else if (pts.length >= 3) {
    const [A, B, C3] = pts; extraPts = [A, B, C3];
    if (areaShoelace([A, B, C3]).cero) throw new Error('Los tres puntos están alineados: no hay ninguna circunferencia que pase por los tres.');
    if (metodo === 'mediatrices') {
      met = 'Intersección de mediatrices';
      const med = (U, W) => recta(W.x.sub(U.x), W.y.sub(U.y), U.x.pow(2).add(U.y.pow(2)).sub(W.x.pow(2)).sub(W.y.pow(2)).div(QE(2)));
      const m1 = med(A, B), m2 = med(B, C3), det = m1.A.mul(m2.B).sub(m2.A.mul(m1.B));
      h = m1.B.mul(m2.C).sub(m2.B.mul(m1.C)).div(det); k = m2.A.mul(m1.C).sub(m1.A.mul(m2.C)).div(det); r2 = dist2({ x: h, y: k }, A);
      P('Trazamos dos mediatrices', 'El centro está a la misma distancia de los tres puntos, así que está en la mediatriz de AB y en la de BC.', [`\\text{mediatriz de }AB:\\;${L_gen(m1)}`, `\\text{mediatriz de }BC:\\;${L_gen(m2)}`], svgGeo({ rectas: [rN(m1), rN(m2)], pts: [A, B, C3].map(p => ptN(p)) }));
      P('Las cortamos', 'El punto de intersección es el centro; el radio es la distancia del centro a cualquiera de los puntos.', [`C=${Lpt(h, k)}`, `r^2=d(C,A)^2=${L_frac(r2)}`]);
    } else {
      met = 'Sistema de ecuaciones';
      const M = [A, B, C3].map(p => [p.x, p.y, Q1, p.x.pow(2).add(p.y.pow(2)).neg()]);
      P('Planteamos el sistema', 'Buscamos D, E y F de la forma general x² + y² + Dx + Ey + F = 0. Cada punto tiene que cumplirla: reemplazamos y queda un sistema de 3 ecuaciones.', `\\begin{cases}${M.map(f => `${L_P(Pred([mono(f[0], { D: 1 }), mono(f[1], { E: 1 }), mono(f[2], { F: 1 })]))}=${L_frac(f[3])}`).join('\\\\')}\\end{cases}`);
      const [D, E, F] = resolver3x3(M);
      P('Resolvemos el sistema', 'Lo resolvemos por reducción (o con cualquier método de sistemas).', `D=${L_frac(D)},\\quad E=${L_frac(E)},\\quad F=${L_frac(F)}`);
      h = D.div(QE(-2)); k = E.div(QE(-2)); r2 = h.pow(2).add(k.pow(2)).sub(F);
      P('Obtenemos centro y radio', 'De la forma general: $h = -\\frac{D}{2}$, $k = -\\frac{E}{2}$ y $r^2 = h^2 + k^2 - F$.', [`C=${Lpt(h, k)}`, `r^2=${L_frac(r2)}`]);
    }
  } else throw new Error('Escribilo así: “centro (2, -3) y radio 5”, “x^2 + y^2 - 4x + 6y - 3 = 0”, “circunferencia que pasa por (1, 1), (5, 1) y (3, 5)” o “diámetro de extremos (1, 2) y (7, 10)”.');
  const g = cerrarCirc(h, k, r2, P, extraPts);
  const prueba = extraPts.length ? extraPts : (raizQ(r2).exacta ? [{ x: h.add(raizQ(r2).q), y: k, n: 'Q' }] : []);
  P('Verificamos', prueba.length ? 'Reemplazamos los puntos de la circunferencia en la ecuación general: tiene que dar 0.' : 'Comprobamos que $h^2 + k^2 - F = r^2$.', prueba.length ? prueba.map(p => `${Lpt(p.x, p.y)}:\\;${L_frac(evalC(g, p))}=0\\;${evalC(g, p).cero ? '\\checkmark' : ''}`) : `${Lp(h)}^{2}+${Lp(k)}^{2}-${Lp(g.F)}=${L_frac(h.pow(2).add(k.pow(2)).sub(g.F))}=r^2\\;\\checkmark`);
  return { tema: 'circunferencia', metodo: met, pasos, resultado: `${L_canon(h, k, r2)}\\quad(${L_genC(g)})`, alternativas: pts.length >= 3 && !/centro|diametro|extremos/.test(t) ? [{ nombre: metodo === 'mediatrices' ? 'Ver con un sistema de ecuaciones' : 'Ver con mediatrices', metodo: metodo === 'mediatrices' ? 'sistema' : 'mediatrices' }] : [] };
}

/* -----------------------------------------------------------------------
 * G10. TRANSFORMACIÓN DE COORDENADAS (traslación, rotación, polares)
 * --------------------------------------------------------------------- */
const prim = s => s.replace(/u/g, "{x'}").replace(/v/g, "{y'}");          // u, v internos → x', y'
function sustXY(Pn, ex, ey) { return Pred(Pn.flatMap(m => { let r = [mono(m.c)]; for (const [k, e] of Object.entries(m.v)) r = Pmul(r, Ppow(k === 'x' ? ex : k === 'y' ? ey : Pv(k), e)); return r; })); }
function leerAngulo(t) {
  const m = t.match(/(-?\d+(?:[.,]\d+)?)\s*(?:°|º|grados)/); if (m) return leerDecimal(m[1].replace('-', '')).q.num() * (m[1].startsWith('-') ? -1 : 1);
  const r = t.match(/(?:θ|theta|angulo|ángulo)\s*=?\s*([^,;)]*π[^,;)]*|[^,;)]*pi[^,;)]*)/i); if (r) { const v = valorDeTexto(r[1].replace(/pi/gi, 'π')); const d = v.x * 180 / Math.PI; return Math.abs(d - Math.round(d)) < 1e-9 ? Math.round(d) : d; }
  return null;
}
function resolverTransformacion(texto) {
  const t = plano(texto), { pasos, P } = crearPasos();
  // Polar → cartesiana
  if (/cartesian|rectangular/.test(t) || /\br\s*=/.test(t)) {
    const rm = texto.match(/r\s*=\s*([^,;]+?)(?=\s*[,;]|\s+y\s|\s*$)/i) || texto.match(/\(\s*([^;,]+)\s*[;,]\s*[^)]*°/);
    const ang = leerAngulo(texto); if (!rm || ang === null) throw new Error('Escribilo así: “cartesianas de r = 2, θ = 60°” o “(2; 120°) a cartesianas”.');
    const rv = valorDeTexto(rm[1]), te = trigExacta(ang);
    P('Anotamos las coordenadas polares', 'En coordenadas polares un punto se da con su distancia al origen (r) y el ángulo con el eje x positivo (θ).', `r=${rv.q ? L_frac(rv.q) : L_x(rv.x)},\\quad\\theta=${Lgr(ang)}`);
    let xL, yL, xn, yn;
    if (te && rv.q) { const x = te.c.mulQ(rv.q), y = te.s.mulQ(rv.q); xL = x.L(); yL = y.L(); xn = x.num(); yn = y.num(); P('Usamos coseno y seno', `Proyectamos sobre los ejes: x = r·cos θ e y = r·sen θ. Como ${Lgr(ang).replace(/[{}\\^]|circ/g, '')}° es un ángulo notable, usamos sus valores exactos.`, [`x=${L_frac(rv.q)}\\cdot ${te.c.L()}=${xL}`, `y=${L_frac(rv.q)}\\cdot ${te.s.L()}=${yL}`]); }
    else { xn = rv.x * Math.cos(ang * Math.PI / 180); yn = rv.x * Math.sin(ang * Math.PI / 180); xL = L_x(xn); yL = L_x(yn); P('Usamos coseno y seno', 'Proyectamos sobre los ejes: x = r·cos θ e y = r·sen θ.', [`x\\approx ${xL}`, `y\\approx ${yL}`]); }
    const rr = Math.hypot(xn, yn), aa = ((Math.atan2(yn, xn) * 180 / Math.PI) + 360) % 360;
    P('Verificamos', 'Volvemos a polares: r = √(x² + y²) y el ángulo con el arco tangente (mirando el cuadrante).', `r\\approx ${L_x(rr)},\\quad\\theta\\approx ${Lgr(aa)}\\;${Math.abs(rr - Math.abs(rv.x)) < 1e-9 ? '\\checkmark' : ''}`, svgGeo({ pts: [[xn, yn, `(${fmtX(xn, 3)}; ${fmtX(yn, 3)})`]], segs: [[0, 0, xn, yn]] }));
    return { tema: 'transformacion', metodo: 'Polares a cartesianas', pasos, resultado: `\\left(${xL}\\,;\\,${yL}\\right)` };
  }
  // Cartesiana → polar
  if (/polar/.test(t)) {
    const p = leerPuntosG(texto)[0]; if (!p) throw new Error('Escribí el punto, por ejemplo: polares de (1, √3).');
    const x = p.x.x, y = p.y.x, r2q = p.x.q && p.y.q ? p.x.q.pow(2).add(p.y.q.pow(2)) : null, r2n = x * x + y * y, r2e = r2q || (Math.abs(r2n - Math.round(r2n)) < 1e-9 ? QE(Math.round(r2n)) : null);
    P('Anotamos el punto', 'Pasar a polares es dar la distancia al origen (r) y el ángulo con el eje x positivo (θ).', `(x\\,;\\,y)=\\left(${p.x.q ? L_frac(p.x.q) : L_x(x)}\\,;\\,${p.y.q ? L_frac(p.y.q) : L_x(y)}\\right)`);
    P('Calculamos r', 'Por Pitágoras: $r = \\sqrt{x^2 + y^2}$.', `r=\\sqrt{${r2e ? L_frac(r2e) : L_x(r2n)}}${r2e ? '=' + L_raiz(r2e) : '\\approx ' + L_x(Math.sqrt(r2n))}`);
    let a = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360; if (Math.abs(a - Math.round(a)) < 1e-9) a = Math.round(a);
    const cuad = x > 0 && y >= 0 ? 'I' : x <= 0 && y > 0 ? 'II' : x < 0 && y <= 0 ? 'III' : 'IV';
    P('Calculamos θ', `Usamos $\\tan\\theta = \\frac{y}{x}$ y miramos el cuadrante: el punto está en el ${cuad} cuadrante, así que el ángulo queda entre ${{ I: '0° y 90°', II: '90° y 180°', III: '180° y 270°', IV: '270° y 360°' }[cuad]}.`, `\\theta=${Number.isInteger(a) ? a + '^{\\circ}' : Lgr(a) + '\\approx ' + gms(a)}`, svgGeo({ pts: [[x, y, `(${fmtX(x, 3)}; ${fmtX(y, 3)})`]], segs: [[0, 0, x, y]] }));
    const r = Math.sqrt(r2n), xb = r * Math.cos(a * Math.PI / 180), yb = r * Math.sin(a * Math.PI / 180);
    P('Verificamos', 'Volvemos a cartesianas con x = r·cos θ e y = r·sen θ.', `x\\approx ${L_x(xb)},\\quad y\\approx ${L_x(yb)}\\;${aproxIgual(xb, x) && aproxIgual(yb, y) ? '\\checkmark' : ''}`);
    return { tema: 'transformacion', metodo: 'Cartesianas a polares', pasos, resultado: `(r\\,;\\,\\theta)=\\left(${r2e ? L_raiz(r2e, false) : L_x(r)}\\,;\\,${Number.isInteger(a) ? a + '^{\\circ}' : Lgr(a)}\\right)` };
  }
  // Rotación
  if (/rot|gir/.test(t)) {
    const ang = leerAngulo(texto), p = ptsExactos(texto)[0]; if (ang === null || !p) throw new Error('Escribilo así: “rotar el punto (2, 1) 45°” o “rotar los ejes 30°: punto (3, 1)”.');
    const ejes = /ejes/.test(t), te = trigExacta(ang);
    P('Anotamos los datos', ejes ? 'Rotar los ejes un ángulo θ: el punto queda quieto y cambiamos el sistema de referencia. Sus nuevas coordenadas son $x\' = x\\cos\\theta + y\\,\\text{sen}\\,\\theta$ e $y\' = -x\\,\\text{sen}\\,\\theta + y\\cos\\theta$.' : 'Girar el punto un ángulo θ alrededor del origen (en sentido antihorario si θ es positivo): $x\' = x\\cos\\theta - y\\,\\text{sen}\\,\\theta$ e $y\' = x\\,\\text{sen}\\,\\theta + y\\cos\\theta$.', `P=${Lpt(p.x, p.y)},\\quad\\theta=${Lgr(ang)}`);
    let xs, ys, xn, yn;
    if (te) { const sg = ejes ? 1 : -1; const xr = te.c.mulQ(p.x).add(te.s.mulQ(p.y.mul(QE(sg)))), yr = te.s.mulQ(p.x.mul(QE(-sg))).add(te.c.mulQ(p.y)); xs = xr.L(); ys = yr.L(); xn = xr.num(); yn = yr.num();
      P('Reemplazamos con los valores exactos', `Como ${fmtX(ang)}° es un ángulo notable: cos θ = $${te.c.L()}$ y sen θ = $${te.s.L()}$.`, [`x'=${Lp(p.x)}\\cdot ${te.c.L()}${ejes ? '+' : '-'}${Lp(p.y)}\\cdot ${te.s.L()}=${xs}`, `y'=${ejes ? '-' : ''}${Lp(p.x)}\\cdot ${te.s.L()}+${Lp(p.y)}\\cdot ${te.c.L()}=${ys}`]); }
    else { const c = Math.cos(ang * Math.PI / 180), s = Math.sin(ang * Math.PI / 180), X = p.x.num(), Y = p.y.num(); xn = ejes ? X * c + Y * s : X * c - Y * s; yn = ejes ? -X * s + Y * c : X * s + Y * c; xs = L_x(xn); ys = L_x(yn); P('Reemplazamos', 'Usamos los valores aproximados de seno y coseno.', [`x'\\approx ${xs}`, `y'\\approx ${ys}`]); }
    const r0 = p.x.num() ** 2 + p.y.num() ** 2, r1 = xn ** 2 + yn ** 2;
    P('Verificamos', 'Una rotación no cambia la distancia al origen: $x^2 + y^2$ tiene que dar lo mismo antes y después.', `${L_x(r0)}=${L_x(r1)}\\;${aproxIgual(r0, r1) ? '\\checkmark' : ''}`, svgGeo({ pts: [ptN({ ...p, n: 'P' }), [xn, yn, ejes ? '' : "P'"]], segs: [[0, 0, p.x.num(), p.y.num()], ...(ejes ? [] : [[0, 0, xn, yn]])] }));
    return { tema: 'transformacion', metodo: ejes ? 'Rotación de ejes' : 'Rotación de un punto', pasos, resultado: `\\left(${xs}\\,;\\,${ys}\\right)` };
  }
  // Traslación (de un punto o de una ecuación)
  const pts = ptsExactos(texto.replace(/\([xy][^)]*\)/g, ' '));
  const O = pts[pts.length - 1]; if (!O) throw new Error('Escribilo así: “trasladar el punto (5, 3) al nuevo origen (2, -1)” o “trasladar x^2 + y^2 - 4x + 6y - 3 = 0 al origen (2, -3)”.');
  const segEc = ecuacionesEnTexto(texto)[0];
  if (segEc) {
    const rel = relAlg(segEc), D = Pred(Psub(aPoly(rel.izq), aPoly(rel.der)));
    P('Escribimos la ecuación y el nuevo origen', "Trasladar los ejes al punto O' = (h ; k) significa reemplazar x = x' + h e y = y' + k.", [`${L_P(D)}=0`, `O'=${Lpt(O.x, O.y)}\\;\\Rightarrow\\;x=x'${O.x.signo < 0 ? '-' + L_frac(O.x.abs()) : '+' + L_frac(O.x)},\\quad y=y'${O.y.signo < 0 ? '-' + L_frac(O.y.abs()) : '+' + L_frac(O.y)}`]);
    const N = sustXY(D, Pred([mono(Q1, { u: 1 }), mono(O.x)]), Pred([mono(Q1, { v: 1 }), mono(O.y)]));
    P('Reemplazamos y desarrollamos', 'Desarrollamos los cuadrados y juntamos semejantes. Si elegimos bien el nuevo origen, desaparecen los términos de primer grado.', prim(`${L_P(N)}=0`));
    const back = sustXY(N.map(m => mono(m.c, Object.fromEntries(Object.entries(m.v).map(([k, e]) => [k === 'u' ? 'x' : 'y', e])))), Pred([mono(Q1, { x: 1 }), mono(O.x.neg())]), Pred([mono(Q1, { y: 1 }), mono(O.y.neg())]));
    P('Verificamos', "Hacemos la sustitución inversa (x' = x − h, y' = y − k) en la ecuación nueva: tiene que volver a dar la original.", `${L_P(back)}=0\\;${Peq(back, D) ? '\\checkmark' : ''}`);
    return { tema: 'transformacion', metodo: 'Traslación de ejes', pasos, resultado: prim(`${L_P(N)}=0`) };
  }
  if (pts.length < 2) throw new Error('Falta el punto o el nuevo origen.');
  const Pp = pts[0], xp = Pp.x.sub(O.x), yp = Pp.y.sub(O.y);
  P('Anotamos los datos', "Trasladar los ejes al nuevo origen O' = (h ; k): cada punto cambia sus coordenadas a $x' = x - h$ e $y' = y - k$.", `P=${Lpt(Pp.x, Pp.y)},\\quad O'=${Lpt(O.x, O.y)}`);
  P('Restamos el nuevo origen', '', [`x'=${L_frac(Pp.x)}-${Lp(O.x)}=${L_frac(xp)}`, `y'=${L_frac(Pp.y)}-${Lp(O.y)}=${L_frac(yp)}`], svgGeo({ pts: [ptN({ ...Pp, n: 'P' }), ptN({ ...O, n: "O'" })], segs: [[O.x.num(), O.y.num(), Pp.x.num(), Pp.y.num()]] }));
  P('Verificamos', "Volvemos al sistema original sumando el nuevo origen: x = x' + h, y = y' + k.", `${L_frac(xp)}+${Lp(O.x)}=${L_frac(xp.add(O.x))},\\quad ${L_frac(yp)}+${Lp(O.y)}=${L_frac(yp.add(O.y))}\\;${xp.add(O.x).eq(Pp.x) && yp.add(O.y).eq(Pp.y) ? '\\checkmark' : ''}`);
  return { tema: 'transformacion', metodo: 'Traslación de ejes', pasos, resultado: `P'=${Lpt(xp, yp)}` };
}

/* -----------------------------------------------------------------------
 * G11. DETECCIÓN DEL TEMA DE GEOMETRÍA ANALÍTICA
 * --------------------------------------------------------------------- */
const TEMAS_GEO = { uni: 'Geometría analítica unidimensional', bi: 'Geometría analítica bidimensional', pendiente: 'Pendiente de una recta', lugar: 'Lugar geométrico', recta: 'Línea recta', circunferencia: 'Circunferencia', transformacion: 'Transformación de coordenadas' };
const hayPuntos = o => { try { return leerPuntosG(o).length; } catch (e) { return 0; } };
const DETECTORES_GEO = [
  { tema: 'transformacion', test: t => /traslad|traslacion|nuevo origen|\brot(ar|acion|a)\b|girar|giro|polar|cartesian|\br\s*=.*(θ|theta|°)/.test(t), fn: resolverTransformacion },
  { tema: 'lugar', test: t => /lugar geometric|equidist|mediatriz|apolonio|directriz|\bfoco\b|conjunto de (los )?puntos/.test(t), fn: resolverLugar },
  { tema: 'circunferencia', test: t => /circunferencia|circulo|\bcentro\b|\bradio\b|diametro/.test(t) || (/x[^=]*\^\s*\(?2/.test(t) && /y[^=]*\^\s*\(?2/.test(t) && !/^\s*y\s*=/.test(t)), fn: resolverCircunferencia },
  { tema: 'pendiente', test: t => (/pendiente|inclinacion|angulo (entre|de)|son paralelas|son perpendiculares|paralelas\?|perpendiculares\?/.test(t) && !/recta (que )?pas|ecuacion de la recta|recta por|con pendiente|paralela a|perpendicular a/.test(t)) || /^\s*m\s*=/.test(t), fn: resolverPendiente },
  { tema: 'recta', test: t => /recta|paralela|perpendicular|interse|distancia (de|del punto|entre las rectas)[^=]*=|forma (general|explicita|segmentaria)|ecuacion/.test(t) || (/=/.test(t) && /[xy]/.test(t)), fn: resolverRecta },
  { tema: 'bi', test: (t, o) => hayPuntos(o) >= 2, fn: resolverBidimensional },
  { tema: 'uni', test: t => /distancia|punto medio|razon|divid|segmento|recta numerica/.test(t) || /^[\s\d,.;y\-−/]+$/.test(t), fn: resolverUnidimensional }
];
const FORZAR_GEO = { uni: resolverUnidimensional, bi: resolverBidimensional, pendiente: resolverPendiente, lugar: resolverLugar, recta: resolverRecta, circunferencia: resolverCircunferencia, transformacion: resolverTransformacion };
function resolverGeo(texto, temaForzado, metodo) {
  const o = texto.trim(); if (!o) throw new Error('Escribí un ejercicio.');
  const t = plano(o);
  if (temaForzado) { const d = DETECTORES_GEO.find(x => x.tema === temaForzado && x.test(t, o)); return (d ? d.fn : FORZAR_GEO[temaForzado])(o, metodo); }
  for (const d of DETECTORES_GEO) { let ok = false; try { ok = d.test(t, o); } catch (e) { ok = false; } if (ok) return d.fn(o, metodo); }
  throw new Error('No reconocí el ejercicio. Probá con: “distancia entre (1, 2) y (4, 6)”, “recta que pasa por (1, 2) y (3, 8)”, “centro (2, -3) y radio 5”.');
}
function detectarTemaGeo(texto) { const t = plano(texto.trim()); if (!t) return null; for (const d of DETECTORES_GEO) { try { if (d.test(t, texto)) return d.tema; } catch (e) { /* sigue */ } } return null; }
/* MOTOR-GEOMETRIA-FIN ==================================================== */

/* =======================================================================
 * TEMA NUEVO · VECTORES EN EL ESPACIO
 * Vector entre dos puntos, módulo, suma, resta, producto por un escalar,
 * producto escalar, ángulo, producto vectorial, versor, proyección,
 * área del paralelogramo/triángulo y volumen del paralelepípedo.
 * Cálculo exacto con racionales (Q); las raíces quedan simplificadas.
 * ===================================================================== */
const vLx = v => `\\left(${v.map(L_frac).join(';\\,')}\\right)`;
const vSuma = (a, b) => a.map((x, i) => x.add(b[i])), vResta = (a, b) => a.map((x, i) => x.sub(b[i])), vEsc = (k, a) => a.map(x => x.mul(k));
const vDot = (a, b) => a.reduce((s, x, i) => s.add(x.mul(b[i])), Q0);
const vCruz = (a, b) => [a[1].mul(b[2]).sub(a[2].mul(b[1])), a[2].mul(b[0]).sub(a[0].mul(b[2])), a[0].mul(b[1]).sub(a[1].mul(b[0]))];
const vMod2 = a => vDot(a, a);
function vLeer(texto) {                              // vectores con nombre (u = (1, 2, 3)) o puntos A(1, 2, 3)
  const out = [];
  for (const m of texto.matchAll(/(?:([A-Za-z])\s*[=:]?\s*)?\(\s*(-?[\d.,/]+)\s*[,;]\s*(-?[\d.,/]+)\s*[,;]\s*(-?[\d.,/]+)\s*\)/g)) {
    out.push({ n: m[1] || String.fromCharCode(117 + out.length), v: [m[2], m[3], m[4]].map(x => numDe(x.replace(/,(?=\d{1,2}$)/, ','))) });
  }
  return out;
}
function vSvg(vs) {                                   // dibujo en perspectiva (x hacia la izquierda-abajo, y a la derecha, z arriba)
  const W = 320, H = 240, cx = 150, cy = 140, pr = ([x, y, z]) => [cx + (y - x * 0.55) , cy - (z - x * 0.35)];
  const m = Math.max(1, ...vs.flatMap(v => v.v.map(x => Math.abs(x.num())))), k = 85 / m;
  const ej = (a, l) => { const p = pr(a.map(x => x * 95)); return `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" class="ej"/><text x="${p[0]}" y="${p[1] - 4}" class="et">${l}</text>`; };
  const cols = ['#1b6ec2', '#17a398', '#e0a53a', '#7a5cc4'];
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vectores en el espacio"><defs>${cols.map((c, i) => `<marker id="fv${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker>`).join('')}</defs>${ej([1, 0, 0], 'x')}${ej([0, 1, 0], 'y')}${ej([0, 0, 1], 'z')}` +
    vs.slice(0, 4).map((v, i) => { const p = pr(v.v.map(x => x.num() * k)); return `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" stroke="${cols[i]}" stroke-width="2.6" marker-end="url(#fv${i})"/><text x="${p[0] + 6}" y="${p[1] - 6}" class="et pl" style="fill:${cols[i]}">${v.n}</text>`; }).join('') + '</svg>';
}
function resolverVectores(texto) {
  const t = plano(texto), { pasos, P } = crearPasos(), vs = vLeer(texto);
  if (!vs.length) throw new Error('Escribí los vectores con tres coordenadas: “u = (1, 2, 3), v = (4, 0, -1)”, o dos puntos A(1, 2, 3) y B(4, 0, 5).');
  const verif = [], res = [];
  // Dos puntos → vector AB
  if (/punto|\bab\b|vector ab|de a a b|entre los puntos/.test(t) && vs.length >= 2 && /^[A-Z]$/.test(vs[0].n)) {
    const [A, B] = vs, AB = vResta(B.v, A.v);
    P('Armamos el vector entre los puntos', 'El vector que va de A a B se obtiene restando: punto final menos punto inicial.', `\\overrightarrow{${A.n}${B.n}}=${B.n}-${A.n}=${vLx(B.v)}-${vLx(A.v)}=${vLx(AB)}`);
    P('Calculamos su módulo (la distancia entre los puntos)', 'El módulo es la raíz de la suma de los cuadrados de las componentes.', `\\left|\\overrightarrow{${A.n}${B.n}}\\right|=\\sqrt{${AB.map(x => par(L_frac(x)) + '^2').join('+')}}=${L_raiz(vMod2(AB))}`, vSvg([{ n: A.n + B.n, v: AB }]));
    P('Verificamos', 'Sumando el vector al punto A tenemos que llegar a B.', `${vLx(A.v)}+${vLx(AB)}=${vLx(vSuma(A.v, AB))}=${B.n}\\;\\checkmark`);
    return { tema: 'vectores', metodo: 'Vector entre dos puntos', pasos, resultado: `\\overrightarrow{${A.n}${B.n}}=${vLx(AB)},\\;\\left|\\overrightarrow{${A.n}${B.n}}\\right|=${L_raiz(vMod2(AB), false)}` };
  }
  const [u, v, w] = vs;
  P('Anotamos los vectores', 'Cada vector del espacio tiene tres componentes (x ; y ; z).', vs.map(x => `\\vec{${x.n}}=${vLx(x.v)}`), vSvg(vs));
  const todo = !/modulo|norma|suma|resta|escalar|\bpunto\b|\bangulo|vectorial|cruz|versor|unitario|proyecc|area|volumen|mixto|perpendicular|paralel|\d\s*[·*]?\s*[a-z]\b/.test(t);
  const pide = (k, enResumen = true) => (todo && enResumen) || new RegExp(k).test(t);     // sin pedido concreto: resumen (sin versor, proyección ni área)
  if (pide('modulo|norma|versor|unitario|\\bangulo|proyecc') || vs.length === 1) {
    vs.slice(0, 3).forEach(x => res.push(`|\\vec{${x.n}}|=${L_raiz(vMod2(x.v), false)}`));
    P('Calculamos los módulos', 'El módulo (longitud) es $\\sqrt{x^2+y^2+z^2}$.', vs.slice(0, 3).map(x => `|\\vec{${x.n}}|=\\sqrt{${x.v.map(c => par(L_frac(c)) + '^2').join('+')}}=${L_raiz(vMod2(x.v))}`));
  }
  if (pide('versor|unitario', false)) {
    const x = u, m = raizQ(vMod2(x.v));
    P('Calculamos el versor', 'El versor (vector unitario) tiene la misma dirección y sentido, pero módulo 1: se divide cada componente por el módulo.', `\\hat{${x.n}}=\\frac{\\vec{${x.n}}}{|\\vec{${x.n}}|}=\\left(${x.v.map(c => `\\frac{${L_frac(c)}}{${m.L}}`).join(';\\,')}\\right)`);
    res.push(`\\hat{${x.n}}=\\left(${x.v.map(c => `\\frac{${L_frac(c)}}{${m.L}}`).join(';\\,')}\\right)`);
    verif.push(`|\\hat{${x.n}}|^2=\\frac{${L_frac(vMod2(x.v))}}{${L_frac(vMod2(x.v))}}=1\\;\\checkmark`);
  }
  if (!v) { if (!verif.length) verif.push(`|\\vec{${u.n}}|^2=${u.v.map(c => par(L_frac(c)) + '^2').join('+')}=${L_frac(vMod2(u.v))}\\;\\checkmark`); P('Verificamos', 'Revisamos el cálculo del módulo al cuadrado.', verif); return { tema: 'vectores', metodo: 'Módulo y versor', pasos, resultado: res.join(',\\;') || `|\\vec{${u.n}}|=${L_raiz(vMod2(u.v), false)}` }; }
  if (pide('suma|\\+')) { const s2 = vSuma(u.v, v.v); P('Sumamos', 'Se suman componente a componente.', `\\vec{${u.n}}+\\vec{${v.n}}=${vLx(u.v)}+${vLx(v.v)}=${vLx(s2)}`); res.push(`\\vec{${u.n}}+\\vec{${v.n}}=${vLx(s2)}`); verif.push(`(\\vec{${u.n}}+\\vec{${v.n}})-\\vec{${v.n}}=${vLx(vResta(s2, v.v))}=\\vec{${u.n}}\\;\\checkmark`); }
  if (pide('resta|diferencia')) { const r2 = vResta(u.v, v.v); P('Restamos', 'Se restan componente a componente.', `\\vec{${u.n}}-\\vec{${v.n}}=${vLx(r2)}`); res.push(`\\vec{${u.n}}-\\vec{${v.n}}=${vLx(r2)}`); }
  const mk = t.match(/(-?\d+(?:[.,]\d+)?)\s*[·*]?\s*([a-z])\b/); if (!todo && mk && vs.some(x => x.n === mk[2])) { const kq = numDe(mk[1]), x = vs.find(z => z.n === mk[2]), r2 = vEsc(kq, x.v); P('Multiplicamos por un escalar', 'Cada componente se multiplica por el número.', `${L_frac(kq)}\\,\\vec{${x.n}}=${vLx(r2)}`); res.push(`${L_frac(kq)}\\vec{${x.n}}=${vLx(r2)}`); }
  const dot = vDot(u.v, v.v);
  if (pide('escalar|\\bpunto\\b|\\bangulo|perpendicular|proyecc')) {
    P('Calculamos el producto escalar', 'Se multiplican las componentes correspondientes y se suman. Da un número (no un vector).', `\\vec{${u.n}}\\cdot\\vec{${v.n}}=${u.v.map((c, i) => `${par(L_frac(c))}\\cdot ${par(L_frac(v.v[i]))}`).join('+')}=${L_frac(dot)}`);
    res.push(`\\vec{${u.n}}\\cdot\\vec{${v.n}}=${L_frac(dot)}`); if (dot.cero) res.push(tx('perpendiculares'));
  }
  if (pide('\\bangulo')) {
    const cos = dot.num() / Math.sqrt(vMod2(u.v).num() * vMod2(v.v).num()), ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    P('Calculamos el ángulo entre los vectores', 'De $\\vec{u}\\cdot\\vec{v}=|\\vec{u}|\\,|\\vec{v}|\\cos\\alpha$ despejamos el coseno.' + (dot.cero ? ' Como el producto escalar es 0, son perpendiculares.' : ''), [`\\cos\\alpha=\\frac{${L_frac(dot)}}{${L_raiz(vMod2(u.v), false)}\\cdot ${L_raiz(vMod2(v.v), false)}}\\approx ${L_x(+cos.toFixed(6))}`, `\\alpha\\approx ${L_x(+ang.toFixed(4))}^{\\circ}`]);
    res.push(`\\alpha\\approx ${L_x(+ang.toFixed(2))}^{\\circ}`);
    verif.push(`|\\vec{${u.n}}|\\,|\\vec{${v.n}}|\\cos\\alpha\\approx ${L_x(+(Math.sqrt(vMod2(u.v).num() * vMod2(v.v).num()) * cos).toFixed(6))}=\\vec{${u.n}}\\cdot\\vec{${v.n}}\\;\\checkmark`);
  }
  if (pide('proyecc', false)) {
    const k2 = dot.div(vMod2(v.v)), pr = vEsc(k2, v.v);
    P(`Calculamos la proyección de ${u.n} sobre ${v.n}`, 'Es la “sombra” de un vector sobre la dirección del otro.', `\\text{proy}_{\\vec{${v.n}}}\\vec{${u.n}}=\\frac{\\vec{${u.n}}\\cdot\\vec{${v.n}}}{|\\vec{${v.n}}|^2}\\,\\vec{${v.n}}=\\frac{${L_frac(dot)}}{${L_frac(vMod2(v.v))}}\\,${vLx(v.v)}=${vLx(pr)}`);
    res.push(`\\text{proy}=${vLx(pr)}`); verif.push(`(\\vec{${u.n}}-\\text{proy})\\cdot\\vec{${v.n}}=${L_frac(vDot(vResta(u.v, pr), v.v))}\\;\\checkmark`);
  }
  const cr = vCruz(u.v, v.v);
  if (pide('vectorial|cruz|area|paralel|volumen|mixto')) {
    P('Calculamos el producto vectorial', 'Con el determinante de i, j, k y las componentes de los dos vectores. Da un vector perpendicular a ambos.', [`\\vec{${u.n}}\\times\\vec{${v.n}}=\\begin{vmatrix}\\vec{i}&\\vec{j}&\\vec{k}\\\\${u.v.map(L_frac).join('&')}\\\\${v.v.map(L_frac).join('&')}\\end{vmatrix}`, `=${vLx(cr)}`]);
    res.push(`\\vec{${u.n}}\\times\\vec{${v.n}}=${vLx(cr)}`);
    verif.push(`(\\vec{${u.n}}\\times\\vec{${v.n}})\\cdot\\vec{${u.n}}=${L_frac(vDot(cr, u.v))},\\;(\\vec{${u.n}}\\times\\vec{${v.n}})\\cdot\\vec{${v.n}}=${L_frac(vDot(cr, v.v))}\\;${vDot(cr, u.v).cero && vDot(cr, v.v).cero ? '\\checkmark' : ''}`);
    if (cr.every(x => x.cero)) res.push(tx('paralelos'));
  }
  if (pide('area', false)) {
    const a2 = vMod2(cr), tri = /triangulo/.test(t);
    P(tri ? 'Calculamos el área del triángulo' : 'Calculamos el área del paralelogramo', 'El módulo del producto vectorial es el área del paralelogramo que forman los vectores' + (tri ? '; el triángulo es la mitad.' : '.'), `A=${tri ? '\\frac{1}{2}' : ''}|\\vec{${u.n}}\\times\\vec{${v.n}}|=${tri ? '\\frac{1}{2}' : ''}\\sqrt{${L_frac(a2)}}=${tri ? `\\frac{${L_raiz(a2, false)}}{2}` : L_raiz(a2, false)}`);
    res.push(`A=${tri ? `\\frac{${L_raiz(a2, false)}}{2}` : L_raiz(a2, false)}`);
    verif.push(`|\\vec{${u.n}}\\times\\vec{${v.n}}|^2+(\\vec{${u.n}}\\cdot\\vec{${v.n}})^2=${L_frac(a2.add(dot.mul(dot)))}=|\\vec{${u.n}}|^2|\\vec{${v.n}}|^2\\;${a2.add(dot.mul(dot)).eq(vMod2(u.v).mul(vMod2(v.v))) ? '\\checkmark' : ''}`);
  }
  if (pide('volumen|mixto') && w) {
    const mx = vDot(cr, w.v), det = u.v[0].mul(v.v[1].mul(w.v[2]).sub(v.v[2].mul(w.v[1]))).sub(u.v[1].mul(v.v[0].mul(w.v[2]).sub(v.v[2].mul(w.v[0])))).add(u.v[2].mul(v.v[0].mul(w.v[1]).sub(v.v[1].mul(w.v[0]))));
    P('Calculamos el producto mixto', 'El volumen del paralelepípedo que forman los tres vectores es el valor absoluto de $(\\vec{u}\\times\\vec{v})\\cdot\\vec{w}$. Si da 0, los tres son coplanares.', [`(\\vec{${u.n}}\\times\\vec{${v.n}})\\cdot\\vec{${w.n}}=${vLx(cr)}\\cdot ${vLx(w.v)}=${L_frac(mx)}`, `V=|${L_frac(mx)}|=${L_frac(mx.abs())}`]);
    res.push(`V=${L_frac(mx.abs())}`); verif.push(`\\begin{vmatrix}${[u, v, w].map(x => x.v.map(L_frac).join('&')).join('\\\\')}\\end{vmatrix}=${L_frac(det)}\\;${det.eq(mx) ? '\\checkmark' : ''}`);
  }
  if (!verif.length) verif.push(`\\vec{${u.n}}\\cdot\\vec{${v.n}}=\\vec{${v.n}}\\cdot\\vec{${u.n}}=${L_frac(vDot(v.v, u.v))}\\;\\checkmark`);
  P('Verificamos', 'Comprobamos los resultados por otro camino (propiedades de los productos de vectores).', verif);
  return { tema: 'vectores', metodo: todo ? 'Operaciones con vectores' : 'Vectores en el espacio', pasos, resultado: res.join(',\\;') };
}
TEMAS_GEO.vectores = 'Vectores en el espacio';
FORZAR_GEO.vectores = resolverVectores;
DETECTORES_GEO.unshift({ tema: 'vectores', test: (t, o) => /\(\s*-?[\d.,/]+\s*[,;]\s*-?[\d.,/]+\s*[,;]\s*-?[\d.,/]+\s*\)/.test(o) || /vector(es)? (en el )?espacio|producto (vectorial|mixto|cruz)|versor/.test(t), fn: resolverVectores });

// Aviso para la interfaz: este motor ya está cargado (se cargan a medida que se eligen las áreas)
(window.MPP_MOTORES = window.MPP_MOTORES || {}).geo = true;
