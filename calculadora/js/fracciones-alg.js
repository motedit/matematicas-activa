/* Calculadora Inteligente · respaldo para operaciones con fracciones algebraicas
 *
 * Resuelve sumas, restas, multiplicaciones y divisiones de fracciones algebraicas en una variable
 * (por ejemplo (x²−9)/(x²−3x) : (x+3)/(x−3) + …), paso a paso: restricciones, factorización,
 * inversa del divisor, simplificación y denominador común.
 * Funciona como respaldo: primero intenta el motor; si el motor no puede, entra este.
 */
(function () {
  "use strict";
  const PR = window.MA_PROBLEMAS;
  if (!PR || !PR.Fr) return;
  const Fr = PR.Fr;
  const F = (n, d = 1) => new Fr(n, d);
  const mcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const mcm = (a, b) => (a / mcd(a, b)) * b;

  /* ---------- polinomios en una variable (coeficientes fraccionarios) ---------- */
  class Pol {
    constructor(c) { this.c = c.map((x) => Fr.de(x)); while (this.c.length > 1 && this.c[this.c.length - 1].cero()) this.c.pop(); if (!this.c.length) this.c = [F(0)]; }
    static k(v) { return new Pol([Fr.de(v)]); }
    get g() { return this.cero() ? -1 : this.c.length - 1; }
    cero() { return this.c.length === 1 && this.c[0].cero(); }
    lider() { return this.c[this.c.length - 1]; }
    mas(o) { const n = Math.max(this.c.length, o.c.length), r = []; for (let i = 0; i < n; i++) r.push((this.c[i] || F(0)).mas(o.c[i] || F(0))); return new Pol(r); }
    menos(o) { return this.mas(o.por(Pol.k(-1))); }
    por(o) { if (!(o instanceof Pol)) o = Pol.k(o); const r = Array(this.c.length + o.c.length - 1).fill(0).map(() => F(0)); this.c.forEach((a, i) => o.c.forEach((b, j) => { r[i + j] = r[i + j].mas(a.por(b)); })); return new Pol(r); }
    divmod(o) {
      let r = new Pol(this.c.slice()); const q = Array(Math.max(1, this.g - o.g + 1)).fill(0).map(() => F(0));
      while (!r.cero() && r.g >= o.g) { const k = r.lider().entre(o.lider()), d = r.g - o.g; q[d] = k; const t = Array(d).fill(0).map(() => F(0)).concat([k]); r = r.menos(o.por(new Pol(t))); }
      return [new Pol(q), r];
    }
    monico() { return this.cero() ? this : this.por(Pol.k(F(1).entre(this.lider()))); }
    igual(o) { return this.menos(o).cero(); }
    val(x) { return this.c.reduce((acc, a, i) => acc.mas(a.por(potFr(x, i))), F(0)); }
  }
  const potFr = (x, n) => { let r = F(1); for (let i = 0; i < n; i++) r = r.por(x); return r; };
  function mcdPol(a, b) { a = a.monico(); b = b.monico(); while (!b.cero()) { const [, r] = a.divmod(b); a = b; b = r.monico(); } return a.monico(); }
  // coeficientes enteros primitivos (y su factor)
  function primitivo(p) {
    if (p.cero()) return { k: F(0), p };
    const den = p.c.reduce((a, f) => mcm(a, f.d), 1), ints = p.c.map((f) => f.por(den).n), g = ints.reduce((a, b) => mcd(a, b), 0) || 1;
    let s = ints[ints.length - 1] < 0 ? -1 : 1;
    return { k: F(g * s, den), p: new Pol(ints.map((v) => F(v / g / s))) };
  }

  /* ---------- factorización (raíces racionales) ---------- */
  const divisores = (n) => { n = Math.abs(n); const r = []; for (let i = 1; i <= Math.min(n, 100000); i++) if (n % i === 0) r.push(i); return r; };
  function factorizar(p) {
    const { k, p: q0 } = primitivo(p);
    let q = q0; const fs = [];
    let cx = 0; while (q.g > 0 && q.c[0].cero()) { q = new Pol(q.c.slice(1)); cx++; }
    if (cx) fs.push({ p: new Pol([0, 1]), e: cx });
    let seguir = true;
    while (q.g >= 1 && seguir) {
      seguir = false;
      if (q.g === 1) break;
      const a0 = q.c[0].n, an = q.lider().n;
      for (const pp of divisores(a0)) { for (const qq of divisores(an)) { for (const sg of [1, -1]) {
        const r = F(sg * pp, qq);
        if (q.val(r).cero()) {
          const lin = new Pol([F(-r.n), F(r.d)]);          // (d·x − n)
          const [cociente] = q.divmod(lin);
          const ex = fs.find((f) => f.p.igual(lin)); if (ex) ex.e++; else fs.push({ p: lin, e: 1 });
          q = cociente; seguir = true; break;
        } } if (seguir) break; } if (seguir) break; }
    }
    if (q.g >= 1) { const pr = primitivo(q), ex = fs.find((f) => f.p.igual(pr.p)); if (ex) ex.e++; else fs.push({ p: pr.p, e: 1 }); return { k: k.por(pr.k), fs: ordenar(fs) }; }
    return { k: k.por(q.c[0]), fs: ordenar(fs) };
  }
  const ordenar = (fs) => fs.sort((a, b) => a.p.g - b.p.g || (a.p.c[0].v - b.p.c[0].v));

  /* ---------- LaTeX ---------- */
  function Lfr(f) {
    const neg = f.n < 0, a = Math.abs(f.n);
    return (neg ? "-" : "") + (f.d === 1 ? String(a) : `\\frac{${a}}{${f.d}}`);
  }
  function polTex(p, v = "x") {
    if (p.cero()) return "0";
    let s = "";
    for (let i = p.c.length - 1; i >= 0; i--) {
      const a = p.c[i]; if (a.cero()) continue;
      const neg = a.n < 0, ab = F(Math.abs(a.n), a.d);
      const coef = i > 0 && ab.n === 1 && ab.d === 1 ? "" : Lfr(ab);
      const vv = i === 0 ? "" : i === 1 ? v : `${v}^{${i}}`;
      s += (neg ? "-" : s ? "+" : "") + coef + vv;
    }
    return s;
  }
  function factTex(fz, v = "x") {
    const partes = fz.fs.map((f) => {
      const t = polTex(f.p, v), solo = f.p.g === 1 && f.p.c[0].cero() && f.p.lider().v === 1;
      const base = solo || (fz.fs.length === 1 && f.e === 1 && fz.k.v === 1) ? t : `(${t})`;
      return f.e > 1 ? `${base}^{${f.e}}` : base;
    });
    const k = fz.k;
    if (!partes.length) return Lfr(k);
    const pref = k.v === 1 ? "" : k.v === -1 ? "-" : Lfr(k);
    return pref + partes.join("");
  }
  function enteros(n, d) {
    const L = n.c.concat(d.c).reduce((a, f) => mcm(a, f.d), 1);
    n = n.por(Pol.k(L)); d = d.por(Pol.k(L));
    const g = n.c.concat(d.c).reduce((a, f) => mcd(a, f.n), 0) || 1;
    const sg = d.lider().n < 0 ? -1 : 1;
    return [n.por(Pol.k(F(sg, g))), d.por(Pol.k(F(sg, g)))];
  }
  const fracTex = (n0, d0, v) => {
    if (n0.cero()) return "0";
    const [n, d] = enteros(n0, d0);
    const fn = factorizar(n), fd = factorizar(d);
    if (d.g === 0) return polTex(n.por(Pol.k(F(1).entre(d.c[0]))), v) ;
    return `\\frac{${factTex(fn, v)}}{${factTex(fd, v)}}`;
  };

  const sinSimplificar = (n0, d0, v) => { const [n, d] = enteros(n0, d0); return `\\frac{${factTex(factorizar(n), v)}}{${factTex(factorizar(d), v)}}`; };

  /* ---------- análisis de la expresión ---------- */
  function tokens(s, v) {
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s|~/.test(c)) { i++; continue; }
      if (/\d|\./.test(c)) { const m = s.slice(i).match(/^\d+(?:[.,]\d+)?/); const [e, d = ""] = m[0].replace(",", ".").split("."); out.push({ t: "n", v: F(parseInt(e + d, 10), 10 ** d.length) }); i += m[0].length; continue; }
      if (c === v) { out.push({ t: "v" }); i++; continue; }
      if ("+-*/:^()".includes(c)) { out.push({ t: c }); i++; continue; }
      throw new Error("símbolo");
    }
    return out;
  }
  function parse(tk) {
    let p = 0;
    const ver = () => tk[p], tomar = (t) => (tk[p] && tk[p].t === t ? (p++, true) : false);
    const empieza = (k) => k && (k.t === "n" || k.t === "v" || k.t === "(");
    function suma() { let a = divs(); for (;;) { if (tomar("+")) a = { o: "+", a, b: divs() }; else if (tomar("-")) a = { o: "-", a, b: divs() }; else return a; } }
    // "A/B : C/D" se lee como (A/B) : (C/D)
    function divs() { let a = prod(); while (tomar(":")) a = { o: "/", a, b: prod() }; return a; }
    function prod() { let a = signo(); for (;;) { if (tomar("*")) a = { o: "*", a, b: signo() }; else if (tomar("/")) a = { o: "/", a, b: signo() }; else if (empieza(ver())) a = { o: "*", a, b: pot() }; else return a; } }
    function signo() { if (tomar("-")) return { o: "neg", a: signo() }; if (tomar("+")) return signo(); return pot(); }
    function pot() { const b = atomo(); if (tomar("^")) { const e = atomo(); const ev = valor(e); if (!ev || ev.d.g !== 0 || ev.n.g !== 0) throw new Error("exp"); const n = ev.n.c[0].entre(ev.d.c[0]); if (n.d !== 1 || n.n < 0 || n.n > 12) throw new Error("exp"); return { o: "^", a: b, n: n.n }; } return b; }
    function atomo() { const k = tk[p++]; if (!k) throw new Error("fin"); if (k.t === "n") return { o: "k", v: k.v }; if (k.t === "v") return { o: "x" }; if (k.t === "(") { const a = suma(); if (!tomar(")")) throw new Error(")"); return a; } throw new Error("tok"); }
    const r = suma(); if (p < tk.length) throw new Error("sobra"); return r;
  }
  // valor racional {n,d} reducido
  function reducir(n, d) {
    if (d.cero()) throw new Error("div0");
    if (n.cero()) return { n: Pol.k(0), d: Pol.k(1) };
    const g = mcdPol(n, d); n = n.divmod(g)[0]; d = d.divmod(g)[0];
    const ld = d.lider(); n = n.por(Pol.k(F(1).entre(ld))); d = d.por(Pol.k(F(1).entre(ld)));
    return { n, d };
  }
  function valor(e) {
    switch (e.o) {
      case "k": return { n: Pol.k(e.v), d: Pol.k(1) };
      case "x": return { n: new Pol([0, 1]), d: Pol.k(1) };
      case "neg": { const a = valor(e.a); return { n: a.n.por(Pol.k(-1)), d: a.d }; }
      case "^": { const a = valor(e.a); let n = Pol.k(1), d = Pol.k(1); for (let i = 0; i < e.n; i++) { n = n.por(a.n); d = d.por(a.d); } return reducir(n, d); }
      case "+": case "-": { const a = valor(e.a), b = valor(e.b), n = a.n.por(b.d)[e.o === "+" ? "mas" : "menos"](b.n.por(a.d)); return reducir(n, a.d.por(b.d)); }
      case "*": { const a = valor(e.a), b = valor(e.b); return reducir(a.n.por(b.n), a.d.por(b.d)); }
      case "/": { const a = valor(e.a), b = valor(e.b); if (b.n.cero()) throw new Error("div0"); return reducir(a.n.por(b.d), a.d.por(b.n)); }
    }
  }
  const tieneDiv = (e) => e && (e.o === "/" || ["a", "b"].some((k) => tieneDiv(e[k])));
  const tieneX = (e) => e && (e.o === "x" || ["a", "b"].some((k) => tieneX(e[k])));
  const divConX = (e) => e && ((e.o === "/" && tieneX(e.b)) || ["a", "b"].some((k) => divConX(e[k])));
  // ¿es un "polinomio" (sin divisiones)?
  const esPol = (e) => !tieneDiv(e);
  // LaTeX de un nodo, con fracciones "hoja" factorizadas o no
  function nodoTex(e, v, fact, padre = "") {
    const pr = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, "^": 4, k: 5, x: 5 };
    let s;
    if (e.o === "/" && (esPol(e.a) && esPol(e.b))) {
      const a = valor(e.a), b = valor(e.b);
      if (fact === "red") { const r = valor(e); return r.d.g === 0 ? `\\left(${fracTex(r.n, r.d, v)}\\right)` : fracTex(r.n, r.d, v); }
      s = fact ? `\\frac{${factTex(factorizar(a.n), v)}}{${factTex(factorizar(b.n), v)}}` : `\\frac{${polTex(a.n, v)}}{${polTex(b.n, v)}}`;
      return s;
    }
    if (esPol(e) && e.o !== "k" && e.o !== "x") { const a = valor(e); s = fact ? factTex(factorizar(a.n), v) : polTex(a.n, v); return pr[padre] >= 2 && a.n.c.filter((c) => !c.cero()).length > 1 ? `(${s})` : s; }
    switch (e.o) {
      case "k": return Lfr(e.v);
      case "x": return v;
      case "neg": return `-${nodoTex(e.a, v, fact, "neg")}`;
      case "^": return `\\left(${nodoTex(e.a, v, fact)}\\right)^{${e.n}}`;
      case "+": return `${nodoTex(e.a, v, fact, "+")}+${nodoTex(e.b, v, fact, "+")}`;
      case "-": { const b = nodoTex(e.b, v, fact, "-"); return `${nodoTex(e.a, v, fact, "+")}-${/^[^(\\]*[+-]/.test(b) ? `\\left(${b}\\right)` : b}`; }
      case "*": return `${envolver(e.a, v, fact)}\\cdot ${envolver(e.b, v, fact)}`;
      case "/": return `${envolver(e.a, v, fact)}:${envolver(e.b, v, fact)}`;
    }
  }
  const envolver = (e, v, fact) => { const t = nodoTex(e, v, fact, "*"); return e.o === "+" || e.o === "-" ? `\\left(${t}\\right)` : t; };

  /* ---------- resolución paso a paso ---------- */
  function resolverFracciones(texto) {
    let s = String(texto || "").replace(/[−–—]/g, "-").replace(/[·×]/g, "*").replace(/÷/g, ":").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\s+/g, "");
    if (/[=<>≤≥]/.test(s)) return null;
    const letras = [...new Set((s.match(/[a-zA-Z]/g) || []))];
    if (letras.length !== 1) return null;
    const v = letras[0];
    let ast; try { ast = parse(tokens(s, v)); } catch (e) { return null; }
    if (!divConX(ast)) return null;
    let res; try { res = valor(ast); } catch (e) { return null; }
    const pasos = [];
    const P = (titulo, texto, mates = []) => pasos.push({ titulo, texto, mates: [].concat(mates), html: "" });
    // restricciones: todo lo que queda en un denominador (o es divisor) no puede ser 0
    const prohibidos = [];
    (function rec(e) {
      if (!e || typeof e !== "object") return;
      if (e.o === "/") { const b = valor(e.b); [b.n, b.d].forEach((pp) => { if (pp.g >= 1) { const fz = factorizar(pp); fz.fs.forEach((f) => { if (f.p.g === 1) { const r = f.p.c[0].por(-1).entre(f.p.c[1]); if (!prohibidos.some((q) => q.v === r.v)) prohibidos.push(r); } }); } }); }
      rec(e.a); rec(e.b);
    })(ast);
    prohibidos.sort((a, b) => a.v - b.v);
    P("Escribimos el ejercicio", "Lo pasamos a notación con fracciones para verlo claro.", [nodoTex(ast, v, false)]);
    P("Factorizamos numeradores y denominadores", "Sacamos factor común, diferencia de cuadrados, trinomios… Así se ve qué se puede simplificar.", [nodoTex(ast, v, true)]);
    const t1 = nodoTex(ast, v, true), t2 = nodoTex(ast, v, "red");
    if (t1 !== t2) P("Simplificamos cada fracción", "En cada fracción tachamos los factores que se repiten arriba y abajo.", [t2]);
    if (prohibidos.length) P("Anotamos las restricciones", "Ningún denominador (ni ningún divisor) puede valer 0: esos valores de " + v + " quedan excluidos.", [`${v}\\neq ${prohibidos.map(Lfr).join(",\\;")}`]);
    // operaciones de abajo hacia arriba
    (function rec(e) {
      if (!e || typeof e !== "object" || esPol(e) || (e.o === "/" && esPol(e.a) && esPol(e.b))) return;
      rec(e.a); rec(e.b);
      if (!["*", "/", "+", "-"].includes(e.o)) return;
      const a = valor(e.a), b = valor(e.b), r = valor(e);
      const fa = fracTex(a.n, a.d, v), fb = fracTex(b.n, b.d, v), fr = fracTex(r.n, r.d, v);
      if (e.o === "/") {
        P("Dividimos: multiplicamos por la inversa", "Dividir por una fracción es multiplicar por su inversa (damos vuelta la segunda).", [`${fa}:${fb}=${fa}\\cdot ${fracTex(b.d, b.n, v)}`]);
        P("Simplificamos", "Juntamos todo en una fracción y tachamos los factores que aparecen arriba y abajo.", [`=${sinSimplificar(a.n.por(b.d), a.d.por(b.n), v)}=${fr}`]);
      } else if (e.o === "*") {
        P("Multiplicamos y simplificamos", "Numerador por numerador y denominador por denominador; tachamos los factores repetidos.", [`${fa}\\cdot ${fb}=${sinSimplificar(a.n.por(b.n), a.d.por(b.d), v)}=${fr}`]);
      } else {
        const den = r.d.g >= 0 ? (function () { const g = mcdPol(a.d, b.d); return a.d.por(b.d).divmod(g)[0]; })() : null;
        const fden = factTex(factorizar(den), v);
        const na = a.n.por(den.divmod(a.d)[0]), nb = b.n.por(den.divmod(b.d)[0]);
        const tot = e.o === "+" ? na.mas(nb) : na.menos(nb);
        P(e.o === "+" ? "Sumamos con denominador común" : "Restamos con denominador común", "El denominador común es el mínimo común múltiplo de los denominadores (todos los factores, sin repetir, con el mayor exponente). Cada numerador se multiplica por lo que le falta a su denominador.",
          [`${fa}${e.o}${fb}=\\frac{${polTex(na, v) === "0" ? "0" : `(${polTex(na, v)})`}${e.o}${`(${polTex(nb, v)})`}}{${fden}}`, `=\\frac{${polTex(tot, v)}}{${fden}}`].concat(fr === `\\frac{${polTex(tot, v)}}{${fden}}` ? [] : [`=${fr}`]));
      }
    })(ast);
    const final = fracTex(res.n, res.d, v);
    const expand = res.d.g === 0 ? polTex(res.n.por(Pol.k(F(1).entre(res.d.c[0]))), v) : `\\frac{${polTex(res.n, v)}}{${polTex(res.d, v)}}`;
    P("Resultado", prohibidos.length ? `Recordá que vale para ${v} distinto de ${prohibidos.map((q) => "$" + Lfr(q) + "$").join(", ")}.` : "", [final === expand ? final : `${final}=${expand}`]);
    // verificación numérica en un valor permitido
    const prueba = [F(2), F(5), F(7, 2), F(-3), F(11)].find((t) => !prohibidos.some((q) => q.v === t.v) && !res.d.val(t).cero());
    if (prueba) {
      const e0 = (function ev(e) { switch (e.o) { case "k": return e.v; case "x": return prueba; case "neg": return ev(e.a).por(-1); case "^": return potFr(ev(e.a), e.n); case "+": return ev(e.a).mas(ev(e.b)); case "-": return ev(e.a).menos(ev(e.b)); case "*": return ev(e.a).por(ev(e.b)); case "/": return ev(e.a).entre(ev(e.b)); } })(ast);
      P("Verificamos con un número", `Reemplazamos ${v} = ${Lfr(prueba)} en el ejercicio original y en el resultado: tienen que dar lo mismo.`, [`${tx("original")}=${Lfr(e0)},\\qquad ${tx("resultado")}=${Lfr(res.n.val(prueba).entre(res.d.val(prueba)))}\\;\\checkmark`]);
    }
    return { tema: "fracciones", metodo: "Operaciones con fracciones algebraicas", pasos, resultado: final };
  }
  const tx = (s) => `\\text{${s}}`;
  window.MA_FRACCIONES = { resolver: resolverFracciones };

  /* ---------- enganche: el motor primero; si no puede, este ---------- */
  if (typeof window.resolverAhora !== "function") return;
  const anterior = window.resolverAhora;
  let pendiente = null;
  window.resolverAhora = function (metodo) {
    try { const t = leerEntrada(); pendiente = !metodo && t ? { t, cuando: Date.now(), area } : null; } catch (e) { pendiente = null; }
    return anterior.apply(this, arguments);
  };
  const err = document.getElementById("error");
  if (!err || !window.MutationObserver) return;
  new MutationObserver(() => {
    const msg = err.textContent.trim();
    if (!msg || !pendiente || Date.now() - pendiente.cuando > 60000) return;
    if (/(sesi[oó]n|gratis|plan|conectar|servidor|cancel|tarda demasiado)/i.test(msg)) { pendiente = null; return; }
    const texto = pendiente.t; pendiente = null;
    let r = null; try { r = resolverFracciones(texto); } catch (e) { r = null; }
    if (!r) return;
    (async () => {
      if (window.MA_CALC && typeof MA_CALC.usar === "function" && area !== "arit") { try { if (!(await MA_CALC.usar())) return; } catch (e) { return; } }
      err.textContent = "";
      ultimaEntrada = texto;
      mostrarExito(texto, r);
      const cab = document.querySelector("#cabecera b");
      if (cab && cab.textContent === "fracciones") cab.textContent = "Fracciones algebraicas";
    })();
  }).observe(err, { childList: true, characterData: true, subtree: true });
})();
