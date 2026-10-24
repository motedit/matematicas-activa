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
  /* ---------- división de polinomios (Ruffini o división larga) y factorización ---------- */
  const tablaR = (filas) => `<table class="tabla ruffini">${filas.map((f) => `<tr>${f.map((c) => `<td>${c === "" ? "" : "$" + c + "$"}</td>`).join("")}</tr>`).join("")}</table>`;
  function ruffini(P, a) {          // divide P por (x − a); devuelve {q, r, tabla}
    const co = P.c.slice().reverse();  // de mayor a menor grado
    const baja = [co[0]], prod = [""];
    for (let i = 1; i < co.length; i++) { const m = baja[i - 1].por(a); prod.push(m); baja.push(co[i].mas(m)); }
    const r = baja[baja.length - 1], q = new Pol(baja.slice(0, -1).reverse());
    const tabla = tablaR([["", ...co.map(Lfr)], [Lfr(a), ...prod.map((v) => (v === "" ? "" : Lfr(v)))], ["", ...baja.map(Lfr)]]);
    return { q, r, tabla };
  }
  function divisionPasos(P, D, v, Pasar) {
    let R = new Pol(P.c.slice()); const lineas = [];
    let Q = Pol.k(0);
    while (!R.cero() && R.g >= D.g) {
      const k = R.lider().entre(D.lider()), d = R.g - D.g;
      const t = new Pol(Array(d).fill(0).map(() => F(0)).concat([k]));
      Q = Q.mas(t);
      const nuevo = R.menos(D.por(t));
      lineas.push(`\\frac{${polTex(new Pol(Array(R.g).fill(0).map(() => F(0)).concat([R.lider()])), v)}}{${polTex(new Pol(Array(D.g).fill(0).map(() => F(0)).concat([D.lider()])), v)}}=${polTex(t, v)}\\;\\Rightarrow\\;(${polTex(R, v)})-${polTex(t, v) === "1" ? "" : `(${polTex(t, v)})\\cdot`}(${polTex(D, v)})=${polTex(nuevo, v)}`);
      R = nuevo;
    }
    Pasar("Dividimos paso a paso", "En cada paso dividimos el término de mayor grado del resto por el de mayor grado del divisor, multiplicamos y restamos.", lineas);
    return { q: Q, r: R };
  }
  // División "común" en la disposición clásica (dividendo | divisor, cociente abajo del divisor)
  function galera(P, D, v) {
    const grados = []; for (let g = P.g; g >= 0; g--) grados.push(g);
    const termino = (c, g, primero) => { if (c === undefined) return ""; const neg = c.n < 0, ab = F(Math.abs(c.n), c.d); const coef = g > 0 && ab.n === 1 && ab.d === 1 ? "" : Lfr(ab); return (neg ? "-" : primero ? "" : "+") + coef + (g === 0 ? "" : g === 1 ? v : `${v}^{${g}}`); };
    const fila = (pol, desde, hasta, primeroSigno) => grados.map((g) => (g <= desde && g >= hasta ? termino(pol.c[g] || F(0), g, primeroSigno && g === desde) : ""));
    const filas = [];
    let R = new Pol(P.c.slice()), Q = Pol.k(0), paso = 0;
    filas.push({ celdas: fila(P, P.g, 0, true), linea: false });
    while (!R.cero() && R.g >= D.g) {
      const k = R.lider().entre(D.lider()), d = R.g - D.g, t = new Pol(Array(d).fill(0).map(() => F(0)).concat([k]));
      Q = Q.mas(t);
      const resta = D.por(t).por(Pol.k(-1));
      filas.push({ celdas: fila(resta, R.g, d, false), linea: false });
      R = R.menos(D.por(t));
      const hasta = Math.max(0, R.g - D.g >= 0 ? 0 : 0);
      filas.push({ celdas: fila(R.cero() ? Pol.k(0) : R, R.cero() ? 0 : Math.min(R.g, P.g), hasta, true).map((c, i) => (R.cero() && grados[i] === 0 ? "0" : c)), linea: true });
      paso++;
    }
    const der = [`${polTex(D, v)}`, `${polTex(Q, v)}`];
    const html = `<table class="tabla galera">${filas.map((f, i) => `<tr class="${f.linea ? "res" : ""}">${f.celdas.map((c) => `<td>${c ? "$" + c + "$" : ""}</td>`).join("")}<td class="${i === 0 ? "div" : i === 1 ? "coc" : ""}">${i < 2 ? "$" + der[i] + "$" : ""}</td></tr>`).join("")}</table>`;
    return { q: Q, r: R, html };
  }
  function resolverDivision(texto, metodo) {
    let s = String(texto || "").replace(/[−–—]/g, "-").replace(/[·×]/g, "*").replace(/÷/g, ":").replace(/²/g, "^2").replace(/³/g, "^3").replace(/⁴/g, "^4");
    const palabras = /(dividir|divid|division|división|ruffini|cociente|resto)/i.test(s);
    s = s.replace(/\b(por|usando|aplicando|con|mediante)\s+(la\s+)?((regla|m[eé]todo|teorema)\s+(de\s+)?)?ruffini\b/gi, " ");
    const pideComun = metodo === "div-larga" || metodo !== "div-ruffini" && /(sin\s+(usar\s+|utilizar\s+)?ruffini|divisi[oó]n\s+(larga|com[uú]n|tradicional|cl[aá]sica|entera)|galera|m[eé]todo\s+(tradicional|cl[aá]sico|com[uú]n))/i.test(s);
    s = s.replace(/\bsin\s+(usar\s+|utilizar\s+)?ruffini\b/gi, " ").replace(/\b(larga|com[uú]n|tradicional|cl[aá]sica|cl[aá]sico|entera|galera|m[eé]todo|usar|utilizar|utilizando)\b/gi, " ");
    s = s.replace(/\b(calcular|calcul[aá]|resolver|resolv[eé]|hallar|hall[aá]|realizar|realiz[aá]|hacer|hac[eé]|efectuar|efectu[aá]|el|la|los|las|de|del|polinomio|polinomios|division|división|dividir|divid[ií]|dividiendo|cociente|y|resto|usando|aplicando|con|por la regla de|regla de|ruffini|método de|metodo de)\b/gi, " ");
    // "P por Q", "P entre Q", "P : Q" → (P):(Q)
    const partes = s.split(/\s+(?:por|entre|en|sobre)\s+|:|÷/i);
    if (partes.length === 2 && partes[0].trim() && partes[1].trim()) s = `(${partes[0]}):(${partes[1]})`;
    s = s.replace(/\s+/g, "");
    if (/[=<>]/.test(s)) return null;
    const letras = [...new Set((s.match(/[a-zA-Z]/g) || []))];
    if (letras.length !== 1) return null;
    const v = letras[0];
    let ast; try { ast = parse(tokens(s, v)); } catch (e) { return null; }
    if (ast.o !== "/" || !esPol(ast.a) || !esPol(ast.b)) return null;
    const P = valor(ast.a).n, D = valor(ast.b).n;
    if (D.g < 1 || P.g < D.g) return null;
    const conDosPuntos = /:/.test(s) || palabras;
    if (!conDosPuntos && !(D.g === 1)) return null;  // "P/Q" solo si el divisor es de grado 1 (Ruffini)
    const pasos = []; const Pp = (titulo, texto, mates = [], html = "") => pasos.push({ titulo, texto, mates: [].concat(mates), html });
    const completo = new Pol(P.c);  // ya incluye los ceros
    const faltan = P.c.some((c) => c.cero());
    Pp("Ordenamos y completamos el dividendo", faltan ? "Escribimos los términos de mayor a menor grado y completamos con 0 los que faltan (es clave para no correr las columnas)." : "Los términos ya están ordenados de mayor a menor grado y completos.", [`P(${v})=${polTex(P, v)}`, `${tx("coeficientes: ")}${P.c.slice().reverse().map(Lfr).join(",\\;")}`, `Q(${v})=${polTex(D, v)}`]);
    let q, r, a = null;
    let alternativas = [];
    if (D.g === 1 && pideComun) {
      a = D.c[0].por(-1).entre(D.lider());
      const gl = galera(P, D, v); q = gl.q; r = gl.r;
      Pp("Hacemos la división común", "En cada paso dividimos el primer término del resto por el primer término del divisor, multiplicamos ese resultado por todo el divisor, lo escribimos con el signo cambiado y sumamos.", [], gl.html);
      divisionPasos(P, D, v, (t, x, m) => Pp("Los pasos, uno por uno", x, m));
      alternativas = [{ nombre: "Ver con Ruffini", metodo: "div-ruffini" }];
    } else if (D.g === 1 && D.lider().v === 1) {
      a = D.c[0].por(-1);
      alternativas = [{ nombre: "Ver con división común (sin Ruffini)", metodo: "div-larga" }];
      const rf = ruffini(P, a); q = rf.q; r = Pol.k(rf.r);
      Pp("Aplicamos la regla de Ruffini", `El divisor es ${v} − a con a = ${Lfr(a)}: bajamos el primer coeficiente, lo multiplicamos por a, lo sumamos al siguiente, y así hasta el final. El último número es el resto.`.replace("− a con a = -", "+ a con a = -"), [], rf.tabla);
    } else if (D.g === 1) {
      a = D.c[0].por(-1).entre(D.lider());
      const rf = ruffini(P, a); q = rf.q.por(Pol.k(F(1).entre(D.lider()))); r = Pol.k(rf.r);
      alternativas = [{ nombre: "Ver con división común (sin Ruffini)", metodo: "div-larga" }];
      Pp("Aplicamos Ruffini con el divisor dividido por su coeficiente", `Como el divisor es ${polTex(D, v)}, usamos Ruffini con a = ${Lfr(a)} y después dividimos el cociente por ${Lfr(D.lider())}.`, [], rf.tabla);
    } else {
      const gl = galera(P, D, v); q = gl.q; r = gl.r;
      Pp("Hacemos la división", "En cada paso dividimos el primer término del resto por el primer término del divisor, multiplicamos ese resultado por todo el divisor, lo escribimos con el signo cambiado y sumamos.", [], gl.html);
      divisionPasos(P, D, v, (t, x, m) => Pp("Los pasos, uno por uno", x, m));
    }
    Pp("Cociente y resto", "", [`C(${v})=${polTex(q, v)}`, `R(${v})=${polTex(r, v)}`]);
    if (a !== null) Pp("Comprobamos con el teorema del resto", `El resto de dividir por ${polTex(D, v)} es el valor del polinomio en ${v} = ${Lfr(a)}.`, [`P(${Lfr(a)})=${Lfr(P.val(a))}`]);
    Pp("Verificamos", "Dividendo = divisor · cociente + resto.", [`(${polTex(D, v)})(${polTex(q, v)})${r.cero() ? "" : `+(${polTex(r, v)})`}=${polTex(D.por(q).mas(r), v)}\\;\\checkmark`]);
    let resultado = `C(${v})=${polTex(q, v)},\\;R=${polTex(r, v)}`;
    if (r.cero()) {
      const fq = factorizar(q), fD = factorizar(D), fz = factorizar(P);
      Pp("Factorizamos", `El resto es 0: la división es exacta, así que ${polTex(D, v)} es un factor de P(${v}). Seguimos factorizando el cociente (buscando sus raíces).`, [`P(${v})=(${polTex(D, v)})(${polTex(q, v)})`, q.g >= 1 ? `=${factTex(fz, v)}` : ""].filter(Boolean));
      resultado = `C(${v})=${polTex(q, v)},\\;R=0`;
      Pp("Resultado", "", [`C(${v})=${polTex(q, v)},\\quad R=0`, `P(${v})=${factTex(fz, v)}`]);
    } else Pp("Resultado", "La división no es exacta: el divisor no es factor del polinomio.", [`P(${v})=(${polTex(D, v)})(${polTex(q, v)})+(${polTex(r, v)})`]);
    return { tema: "polinomios", metodo: alternativas[0] && alternativas[0].metodo === "div-larga" ? "División de polinomios (Ruffini)" : "División de polinomios (división común)", pasos, resultado, alternativas };
  }
  // Factorizar por Ruffini (o Gauss): divisiones sucesivas por cada raíz racional
  function resolverFactorRuffini(texto) {
    let s = String(texto || "").replace(/[−–—]/g, "-").replace(/²/g, "^2").replace(/³/g, "^3").replace(/⁴/g, "^4");
    if (!/factori/i.test(s)) return null;
    s = s.replace(/\b(factorizar|factoriza|factorizá|factorizacion|factorización|el|polinomio|por|usando|aplicando|con|ruffini|gauss|la|regla|de|teorema|metodo|método)\b/gi, " ").replace(/\s+/g, "");
    const letras = [...new Set((s.match(/[a-zA-Z]/g) || []))];
    if (letras.length !== 1) return null;
    const v = letras[0];
    let ast; try { ast = parse(tokens(s, v)); } catch (e) { return null; }
    if (!esPol(ast)) return null;
    let P = valor(ast).n;
    if (P.g < 3) return null;
    const pasos = []; const Pp = (titulo, texto, mates = [], html = "") => pasos.push({ titulo, texto, mates: [].concat(mates), html });
    const pr = primitivo(P);
    Pp("Ordenamos y completamos el polinomio", "De mayor a menor grado, con 0 en los términos que faltan.", [`P(${v})=${polTex(P, v)}`]);
    let q = pr.p, raices = [];
    let cx = 0; while (q.g > 0 && q.c[0].cero()) { q = new Pol(q.c.slice(1)); cx++; }
    if (cx) Pp("Sacamos factor común", "", [`P(${v})=${Lfr(pr.k) === "1" ? "" : Lfr(pr.k)}${v}${cx > 1 ? `^{${cx}}` : ""}(${polTex(q, v)})`]);
    const cand = () => { const a0 = Math.abs(q.c[0].n), an = Math.abs(q.lider().n), out = []; divisores(a0).forEach((pp) => divisores(an).forEach((qq) => [1, -1].forEach((sg) => { const r = F(sg * pp, qq); if (!out.some((o) => o.v === r.v)) out.push(r); }))); return out; };
    if (q.g >= 2) Pp("Posibles raíces (teorema de Gauss)", "Las raíces racionales están entre los divisores del término independiente sobre los divisores del coeficiente principal.", [`\\pm ${tx("divisores de ")}${Math.abs(q.c[0].n)}\\;/\\;${tx("divisores de ")}${Math.abs(q.lider().n)}:\\;${cand().map(Lfr).slice(0, 16).join(",\\;")}`]);
    let encontro = true;
    while (q.g >= 2 && encontro) {
      encontro = false;
      for (const r of cand()) if (q.val(r).cero()) {
        const rf = ruffini(q, r);
        Pp(`Dividimos por (${polTex(new Pol([r.por(-1), F(1)]), v)})`, `P(${Lfr(r)}) = 0, así que ${Lfr(r)} es raíz. Dividimos por Ruffini.`, [], rf.tabla);
        raices.push(r); q = rf.q; encontro = true; break;
      }
    }
    if (!raices.length) return null;
    const fz = factorizar(P);
    Pp("Resultado", q.g >= 2 ? "El último cociente no tiene raíces racionales: queda así." : "", [`P(${v})=${factTex(fz, v)}`]);
    return { tema: "factorizacion", metodo: "Factorización por Ruffini (Gauss)", pasos, resultado: `P(${v})=${factTex(fz, v)}` };
  }

  /* =====================================================================
     Casos de factoreo: factor común, factor común por grupos, diferencia de cuadrados,
     suma o diferencia de cubos, trinomio cuadrado perfecto, trinomio x²+bx+c, trinomio ax²+bx+c
     (también con varias letras: 9a² − 25b², x² + 5xy + 6y², …) y, si no alcanza, Ruffini.
     ===================================================================== */
  // Polinomio en varias letras: Map "a:2,b:1" → coeficiente
  const claveDe = (e) => Object.keys(e).filter((k) => e[k]).sort().map((k) => `${k}:${e[k]}`).join(",");
  const expDe = (k) => { const e = {}; if (k) k.split(",").forEach((p) => { const [l, n] = p.split(":"); e[l] = +n; }); return e; };
  class MP {
    constructor(m) { this.m = new Map(); if (m) for (const [k, v] of m) if (!v.cero()) this.m.set(k, v); }
    static k(v) { const p = new MP(); if (!Fr.de(v).cero()) p.m.set("", Fr.de(v)); return p; }
    static letra(l) { const p = new MP(); p.m.set(`${l}:1`, F(1)); return p; }
    mas(o) { const r = new MP(this.m); for (const [k, v] of o.m) { const n = (r.m.get(k) || F(0)).mas(v); if (n.cero()) r.m.delete(k); else r.m.set(k, n); } return r; }
    por(o) {
      if (!(o instanceof MP)) o = MP.k(o);
      let r = new MP();
      for (const [k1, v1] of this.m) for (const [k2, v2] of o.m) {
        const e = expDe(k1), e2 = expDe(k2); for (const l in e2) e[l] = (e[l] || 0) + e2[l];
        r = r.mas(new MP(new Map([[claveDe(e), v1.por(v2)]])));
      }
      return r;
    }
    menos(o) { return this.mas(o.por(MP.k(-1))); }
    cero() { return this.m.size === 0; }
    terminos() { return [...this.m].map(([k, v]) => ({ k: v, e: expDe(k) })).sort(ordenTerm); }
    letras() { return [...new Set([...this.m.keys()].flatMap((k) => Object.keys(expDe(k))))].sort(); }
    grado() { return Math.max(0, ...[...this.m.keys()].map((k) => Object.values(expDe(k)).reduce((a, b) => a + b, 0))); }
    igual(o) { return this.menos(o).cero(); }
  }
  const gradoT = (t) => Object.values(t.e).reduce((a, b) => a + b, 0);
  const ordenTerm = (a, b) => {
    const d = gradoT(b) - gradoT(a); if (d) return d;
    const L = [...new Set([...Object.keys(a.e), ...Object.keys(b.e)])].sort();
    for (const l of L) { const x = (b.e[l] || 0) - (a.e[l] || 0); if (x) return -x < 0 ? 1 : -1; }
    return 0;
  };
  const mon = (k, e) => new MP(new Map([[claveDe(e), Fr.de(k)]]));
  function monoTex(t, primero, conSigno = true) {
    const neg = t.k.n < 0, ab = F(Math.abs(t.k.n), t.k.d), letras = Object.keys(t.e).filter((l) => t.e[l]).sort();
    const lt = letras.map((l) => (t.e[l] === 1 ? l : `${l}^{${t.e[l]}}`)).join("");
    const co = lt && ab.n === 1 && ab.d === 1 ? "" : Lfr(ab);
    return (neg ? "-" : primero || !conSigno ? "" : "+") + co + lt;
  }
  const mpTex = (p) => (p.cero() ? "0" : p.terminos().map((t, i) => monoTex(t, i === 0)).join(""));
  // análisis de texto en varias letras
  function parseMP(s) {
    const tk = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/\d/.test(c)) { const m = s.slice(i).match(/^\d+(?:[.,]\d+)?/); const [e, d = ""] = m[0].replace(",", ".").split("."); tk.push({ t: "n", v: F(parseInt(e + d, 10), 10 ** d.length) }); i += m[0].length; continue; }
      if (/[a-zA-Z]/.test(c)) { tk.push({ t: "l", v: c }); i++; continue; }
      if ("+-*/^()".includes(c)) { tk.push({ t: c }); i++; continue; }
      throw new Error("símbolo");
    }
    let p = 0;
    const tomar = (t) => (tk[p] && tk[p].t === t ? (p++, true) : false), empieza = (k) => k && (k.t === "n" || k.t === "l" || k.t === "(");
    function suma() { let a = prod(); for (;;) { if (tomar("+")) a = a.mas(prod()); else if (tomar("-")) a = a.menos(prod()); else return a; } }
    function prod() { let a = signo(); for (;;) { if (tomar("*")) a = a.por(signo()); else if (tomar("/")) { const b = signo(); if (b.m.size !== 1 || !b.m.has("")) throw new Error("div"); a = a.por(MP.k(F(1).entre(b.m.get("")))); } else if (empieza(tk[p])) a = a.por(pot()); else return a; } }
    function signo() { if (tomar("-")) return signo().por(MP.k(-1)); if (tomar("+")) return signo(); return pot(); }
    function pot() { const b = atomo(); if (tomar("^")) { const e = atomo(); if (e.m.size !== 1 || !e.m.has("")) throw new Error("exp"); const n = e.m.get(""); if (n.d !== 1 || n.n < 0 || n.n > 12) throw new Error("exp"); let r = MP.k(1); for (let j = 0; j < n.n; j++) r = r.por(b); return r; } return b; }
    function atomo() { const k = tk[p++]; if (!k) throw new Error("fin"); if (k.t === "n") return MP.k(k.v); if (k.t === "l") return MP.letra(k.v); if (k.t === "(") { const a = suma(); if (!tomar(")")) throw new Error(")"); return a; } throw new Error("tok"); }
    const r = suma(); if (p < tk.length) throw new Error("sobra"); return r;
  }
  // raíz entera exacta de un monomio (cuadrada o cúbica)
  function raizMono(t, n) {
    const ab = Math.abs(t.k.n), d = t.k.d;
    if (n === 2 && t.k.n < 0) return null;
    const r1 = Math.round(Math.pow(ab, 1 / n)), r2 = Math.round(Math.pow(d, 1 / n));
    if (r1 ** n !== ab || r2 ** n !== d) return null;
    const e = {}; for (const l in t.e) { if (t.e[l] % n) return null; e[l] = t.e[l] / n; }
    return { k: F((n === 3 && t.k.n < 0 ? -1 : 1) * r1, r2), e };
  }
  const monoMP = (t) => mon(t.k, t.e);
  const enParen = (p) => (p.m.size > 1 ? `(${mpTex(p)})` : mpTex(p));

  // un paso de factorización: devuelve {caso, explicacion, mates, factores:[MP...], constante?} o null
  function pasoFactor(P, preferido) {
    const T = P.terminos();
    if (T.length < 2) return null;
    // 1) factor común
    const ints = T.every((t) => t.k.d === 1);
    let g = ints ? T.reduce((a, t) => mcd(a, t.k.n), 0) : 1;
    if (T[0].k.n < 0 && T.every((t) => t.k.n < 0)) g = -g;
    const eMin = {}; P.letras().forEach((l) => { eMin[l] = Math.min(...T.map((t) => t.e[l] || 0)); });
    const hayLetra = Object.values(eMin).some((v) => v > 0);
    if (Math.abs(g) > 1 || g < 0 || hayLetra) {
      const fc = mon(g, eMin), resto = new MP(); let r = resto;
      for (const t of T) { const e = {}; for (const l in t.e) e[l] = t.e[l] - (eMin[l] || 0); r = r.mas(mon(t.k.entre(g), e)); }
      return { caso: "Factor común", explicacion: "Buscamos lo que se repite en todos los términos: el mayor divisor común de los números y cada letra con su menor exponente. Lo sacamos afuera y dividimos cada término por él.", mates: [`${mpTex(P)}=${mpTex(fc)}\\,(${mpTex(r)})`], factores: [fc, r] };
    }
    // 2) factor común por grupos (4 o 6 términos)
    if (T.length === 4 || T.length === 6) {
      const n = T.length, grupos = n === 4 ? [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]] : [[[0, 1, 2], [3, 4, 5]], [[0, 1], [2, 3], [4, 5]]];
      for (const gr of grupos) {
        const partes = gr.map((idx) => idx.reduce((a, i) => a.mas(monoMP(T[i])), new MP()));
        const pasos = partes.map((q) => pasoFactor(q, null)).map((ps, i) => (ps && ps.caso === "Factor común" ? ps : { factores: [MP.k(1), partes[i]] }));
        let base = pasos[0].factores[1];
        const ok = pasos.every((ps) => { const b = ps.factores[1]; if (b.igual(base)) return true; if (b.igual(base.por(MP.k(-1)))) { ps.factores = [ps.factores[0].por(MP.k(-1)), base]; return true; } return false; });
        if (ok && base.m.size > 1) {
          const otro = pasos.reduce((a, ps) => a.mas(ps.factores[0]), new MP());
          return { caso: "Factor común por grupos", explicacion: "Armamos grupos de términos que tengan algo en común, sacamos factor común en cada grupo y aparece un paréntesis repetido, que sacamos como factor común.", mates: [`${mpTex(P)}=${partes.map((q) => `(${mpTex(q)})`).join("+")}`, `=${pasos.map((ps) => `${enParen(ps.factores[0])}\\,(${mpTex(base)})`).join("+")}`, `=(${mpTex(base)})(${mpTex(otro)})`], factores: [base, otro] };
        }
      }
    }
    // 3) binomios: diferencia de cuadrados / suma o diferencia de cubos
    if (T.length === 2) {
      const [t1, t2] = T;
      const cuad = () => {
        const pos = T.find((t) => t.k.n > 0), neg = T.find((t) => t.k.n < 0);
        if (!pos || !neg) return null;
        const A = raizMono(pos, 2), B = raizMono({ k: neg.k.por(-1), e: neg.e }, 2);
        if (!A || !B) return null;
        const a = monoMP(A), b = monoMP(B);
        return { caso: "Diferencia de cuadrados", explicacion: "Es una resta de dos cuadrados perfectos: a² − b² = (a − b)(a + b). Sacamos la raíz cuadrada de cada término.", mates: [`${tx("raíces: ")}\\sqrt{${monoTex(pos, true)}}=${mpTex(a)},\\quad \\sqrt{${monoTex({ k: neg.k.por(-1), e: neg.e }, true)}}=${mpTex(b)}`, `${mpTex(P)}=(${mpTex(a.menos(b))})(${mpTex(a.mas(b))})`], factores: [a.menos(b), a.mas(b)] };
      };
      const cub = () => {
        const A = raizMono(t1, 3), B = raizMono(t2, 3);
        if (!A || !B) return null;
        const a = monoMP(A), b = monoMP(B);           // t1 + t2 = a³ + b³ (b ya trae el signo)
        const f1 = a.mas(b), f2 = a.por(a).menos(a.por(b)).mas(b.por(b));
        const sumaC = B.k.n > 0;
        return { caso: sumaC ? "Suma de cubos" : "Diferencia de cubos", explicacion: sumaC ? "Es una suma de cubos perfectos: a³ + b³ = (a + b)(a² − ab + b²). Sacamos la raíz cúbica de cada término." : "Es una resta de cubos perfectos: a³ − b³ = (a − b)(a² + ab + b²). Sacamos la raíz cúbica de cada término.", mates: [`${tx("raíces cúbicas: ")}${mpTex(a)}\\;${tx("y")}\\;${mpTex(sumaC ? b : b.por(MP.k(-1)))}`, `${mpTex(P)}=(${mpTex(f1)})(${mpTex(f2)})`], factores: [f1, f2] };
      };
      const orden = preferido === "cubos" ? [cub, cuad] : [cuad, cub];
      for (const f of orden) { const r = f(); if (r) return r; }
      if (T.every((t) => t.k.n > 0) && raizMono(t1, 2) && raizMono(t2, 2)) return { caso: "Suma de cuadrados", explicacion: "Una suma de dos cuadrados no se puede factorizar con números reales.", mates: [mpTex(P)], factores: [P], final: true };
    }
    // 4) trinomios
    if (T.length === 3) {
      const [t1, t2, t3] = T;
      // trinomio cuadrado perfecto
      const A = raizMono(t1, 2), C = raizMono(t3, 2);
      if (A && C) {
        const a = monoMP(A), c = monoMP(C), dob = a.por(c).por(MP.k(2));
        const sg = monoMP(t2).igual(dob) ? 1 : monoMP(t2).igual(dob.por(MP.k(-1))) ? -1 : 0;
        if (sg) {
          const base = sg > 0 ? a.mas(c) : a.menos(c);
          return { caso: "Trinomio cuadrado perfecto", explicacion: "El primer y el último término son cuadrados perfectos y el del medio es el doble producto de sus raíces: a² ± 2ab + b² = (a ± b)².", mates: [`\\sqrt{${monoTex(t1, true)}}=${mpTex(a)},\\quad \\sqrt{${monoTex(t3, true)}}=${mpTex(c)}`, `2\\cdot ${enParen(a)}\\cdot ${enParen(c)}=${mpTex(dob)}\\;${tx("(coincide con el término del medio)")}`, `${mpTex(P)}=(${mpTex(base)})^{2}`], factores: [base, base] };
        }
      }
      // trinomio de la forma ax² + bx + c en U (y V): t1 = a·U², t2 = b·U·V, t3 = c·V²
      const U = raizMono({ k: F(1), e: t1.e }, 2), V = raizMono({ k: F(1), e: t3.e }, 2);
      if (U && V && t1.k.d === 1 && t2.k.d === 1 && t3.k.d === 1) {
        const uv = {}; for (const l of new Set([...Object.keys(U.e), ...Object.keys(V.e)])) uv[l] = (U.e[l] || 0) + (V.e[l] || 0);
        if (claveDe(uv) === claveDe(t2.e)) {
          const a = t1.k.n, b = t2.k.n, c = t3.k.n, u = monoMP(U), v = monoMP(V), ac = a * c;
          let par = null;
          for (let m = -Math.abs(ac) - Math.abs(b); m <= Math.abs(ac) + Math.abs(b) && !par; m++) { const n = b - m; if (m * n === ac) par = [m, n]; }
          const uT = mpTex(u), vT = mpTex(v) === "1" ? "" : mpTex(v);
          if (par && a === 1) {
            const [p1, p2] = par.sort((x, y) => y - x);
            const f1 = u.mas(v.por(MP.k(p1))), f2 = u.mas(v.por(MP.k(p2)));
            return { caso: "Trinomio de la forma x² + bx + c", explicacion: `Buscamos dos números que multiplicados den ${c} y sumados den ${b}.`, mates: [`${p1}\\cdot ${p2 < 0 ? `(${p2})` : p2}=${c},\\qquad ${p1}${p2 < 0 ? "" : "+"}${p2}=${b}`, `${mpTex(P)}=(${mpTex(f1)})(${mpTex(f2)})`], factores: [f1, f2] };
          }
          if (par) {
            const [m, n] = par;
            // a t² + m t + n t + c  →  agrupamos
            const g1 = mcd(a, m) * (a < 0 ? -1 : 1), A1 = a / g1, M1 = m / g1;
            const g2 = A1 !== 0 && n % A1 === 0 ? n / A1 : null;
            if (g2 !== null && M1 * g2 === c) {
              const f1 = u.por(MP.k(A1)).mas(v.por(MP.k(M1))), f2 = u.por(MP.k(g1)).mas(v.por(MP.k(g2)));
              const tt = (k, s) => (k === 1 ? s : k === -1 ? `-${s}` : `${k}${s}`);
              return { caso: "Trinomio de la forma ax² + bx + c", explicacion: `Multiplicamos a·c = ${a}·${c} = ${ac} y buscamos dos números que multiplicados den ${ac} y sumados den ${b}: son ${m} y ${n}. Con ellos partimos el término del medio y factorizamos por grupos.`, mates: [`${mpTex(P)}=${tt(a, `${uT}^{2}`).replace(`${uT}^{2}`, uT.includes("^") || uT.length > 1 ? `(${uT})^{2}` : `${uT}^{2}`)}${m < 0 ? "" : "+"}${tt(m, uT + vT)}${n < 0 ? "" : "+"}${tt(n, uT + vT)}${c < 0 ? "" : "+"}${mpTex(monoMP(t3))}`, `=${enParen(u.por(MP.k(g1)))}(${mpTex(f1)})${g2 < 0 ? "" : "+"}${mpTex(v.por(MP.k(g2)))}(${mpTex(f1)})`, `=(${mpTex(f1)})(${mpTex(f2)})`], factores: [f1, f2] };
            }
          }
          if (!par && b * b - 4 * a * c < 0) return { caso: a === 1 ? "Trinomio de la forma x² + bx + c" : "Trinomio de la forma ax² + bx + c", explicacion: `No hay dos números enteros que sirvan: el discriminante b² − 4ac = ${b * b - 4 * a * c} es negativo, así que no se puede factorizar con números reales.`, mates: [`b^2-4ac=${b * b - 4 * a * c}<0`], factores: [P], final: true };
          if (!par) return { caso: a === 1 ? "Trinomio de la forma x² + bx + c" : "Trinomio de la forma ax² + bx + c", explicacion: `No hay dos números enteros que sirvan (b² − 4ac = ${b * b - 4 * a * c} no es un cuadrado perfecto): no se puede factorizar con números racionales.`, mates: [`b^2-4ac=${b * b - 4 * a * c}`], factores: [P], final: true };
        }
      }
    }
    return null;
  }

  const CASOS = [["comun", /factor com[uú]n(?! por grupos)/i], ["grupos", /por grupos|agrupaci/i], ["cuadrados", /diferencia de cuadrados/i], ["cubos", /(suma|diferencia) de cubos/i], ["tcp", /trinomio cuadrado perfecto/i], ["trinomio", /trinomio de la forma|trinomio/i]];
  function resolverCasos(texto) {
    const t0 = String(texto || "");
    if (!/factor|diferencia de cuadrados|(suma|diferencia) de cubos|trinomio/i.test(t0)) return null;
    let s = t0.replace(/[−–—]/g, "-").replace(/[·×]/g, "*").replace(/²/g, "^2").replace(/³/g, "^3").replace(/⁴/g, "^4").replace(/⁵/g, "^5").replace(/⁶/g, "^6");
    const pref = (CASOS.find(([, re]) => re.test(s)) || [])[0] || null;
    s = s.replace(/\b(factorizar|factoriz[aá]|factorear|factore[aá]|factoreo|factorizaci[oó]n|factorizando|el|la|los|las|de|del|por|polinomio|expresi[oó]n|siguiente|siguientes|caso|casos|usando|aplicando|con|completamente|totalmente|al m[aá]ximo|factor|com[uú]n|grupos|agrupaci[oó]n|diferencia|suma|cuadrados|cubos|trinomio|cuadrado|perfecto|forma|ruffini|gauss)\b/gi, " ");
    s = s.replace(/^[\s:,.]+|[\s:.,]+$/g, "").replace(/\s+/g, "");
    if (!s || /[=<>]/.test(s) || !/[a-zA-Z]/.test(s)) return null;
    let P; try { P = parseMP(s); } catch (e) { return null; }
    if (P.m.size < 2 || P.grado() < 2 && P.m.size < 2) return null;
    const pasos = []; const Pp = (titulo, texto, mates = [], html = "") => pasos.push({ titulo, texto, mates: [].concat(mates), html });
    Pp("Ordenamos el polinomio", "Escribimos los términos de mayor a menor grado y nos fijamos cuántos términos tiene: eso orienta qué caso usar (1.º siempre el factor común).", [mpTex(P)]);
    // factorización recursiva
    const finales = [];   // MP irreducibles
    const cola = [P];
    let vueltas = 0, primero = true;
    while (cola.length && vueltas++ < 30) {
      const Q = cola.shift();
      if (Q.m.size === 1 && Q.grado() === 0) { finales.push(Q); continue; }
      const ps = pasoFactor(Q, primero ? pref : null);
      primero = false;
      if (!ps) {
        // una sola letra y grado ≥ 3: Ruffini
        const L = Q.letras();
        if (L.length === 1 && Q.grado() >= 3) {
          const v = L[0], co = []; for (const t of Q.terminos()) co[t.e[v] || 0] = t.k;
          const pol = new Pol(Array.from({ length: Q.grado() + 1 }, (_, i) => co[i] || F(0)));
          const cand = []; const a0 = Math.abs(pol.c[0].n), an = Math.abs(pol.lider().n);
          if (a0) for (const pp of divisores(a0)) for (const qq of divisores(an)) for (const sg of [1, -1]) cand.push(F(sg * pp, qq));
          const raiz = cand.find((r) => pol.val(r).cero());
          if (raiz) {
            const rf = ruffini(pol, raiz);
            const lin = MP.letra(v).menos(MP.k(raiz)), coc = rf.q.c.reduce((acc, c, i) => acc.mas(mon(c, i ? { [v]: i } : {})), new MP());
            Pp(`Ruffini (teorema de Gauss)`, `Ningún caso anterior sirve directamente. Probamos con los divisores del término independiente: ${v} = ${Lfr(raiz)} anula el polinomio, así que dividimos por (${mpTex(lin)}).`, [`${mpTex(Q)}=(${mpTex(lin)})(${mpTex(coc)})`], rf.tabla);
            cola.unshift(lin, coc); continue;
          }
        }
        finales.push(Q); continue;
      }
      Pp(`Caso: ${ps.caso}`, ps.explicacion, ps.mates);
      if (ps.final) { finales.push(Q); continue; }
      // los factores que todavía se pueden seguir factorizando vuelven a la cola
      for (const f of ps.factores) cola.push(f);
    }
    if (pasos.length < 2) return null;
    // armamos el resultado: constantes juntas, factores repetidos como potencia
    let k = F(1); const lista = [];
    for (const f of finales) {
      if (f.m.size === 1 && f.m.has("")) { k = k.por(f.m.get("")); continue; }
      // normalizamos el signo del primer término
      let g = f; if (g.terminos()[0].k.n < 0) { g = g.por(MP.k(-1)); k = k.por(-1); }
      const ex = lista.find((x) => x.p.igual(g)); if (ex) ex.e++; else lista.push({ p: g, e: 1 });
    }
    lista.sort((a, b) => a.p.m.size - b.p.m.size || a.p.grado() - b.p.grado());
    const solo = lista.length === 1 && lista[0].e === 1 && k.v === 1;
    const res = (k.v === 1 ? "" : k.v === -1 ? "-" : Lfr(k)) + lista.map(({ p, e }) => { const b = p.m.size > 1 && !solo ? `(${mpTex(p)})` : mpTex(p); return e > 1 ? (p.m.size > 1 ? `${b}^{${e}}` : `\\left(${b}\\right)^{${e}}`) : b; }).join("");
    Pp("Resultado", "Lo dejamos como producto de factores que ya no se pueden descomponer más.", [`${mpTex(P)}=${res}`]);
    // verificación: multiplicamos todo
    let prod = MP.k(k); for (const { p, e } of lista) for (let i = 0; i < e; i++) prod = prod.por(p);
    if (!prod.igual(P)) return null;
    Pp("Verificamos", "Si multiplicamos todos los factores, tiene que volver a dar el polinomio original.", [`${res}=${mpTex(prod)}\\;\\checkmark`]);
    return { tema: "factorizacion", metodo: "Casos de factoreo", pasos, resultado: res };
  }

  /* =====================================================================
     Radicales con letras: productos y cocientes de raíces (con distinto índice),
     por potencias de exponente fraccionario. Ej.: √2·∛(x²y²)·√3 / (∛(x²y³)·⁴√(xy))
     ===================================================================== */
  const primos = (n) => { const r = {}; for (let p = 2; p * p <= n; p++) while (n % p === 0) { r[p] = (r[p] || 0) + 1; n /= p; } if (n > 1) r[n] = (r[n] || 0) + 1; return r; };
  function resolverRadicales(texto) {
    const s0 = String(texto || "").replace(/[−–—]/g, "-").replace(/[·×]/g, "*").replace(/÷/g, ":").replace(/²/g, "^2").replace(/³/g, "^3")
      .replace(/\\sqrt\[(\d+)\]/g, "√[$1]").replace(/\\sqrt/g, "√").replace(/\braiz\b/gi, "√").replace(/[{]/g, "(").replace(/[}]/g, ")").replace(/\s+/g, "");
    if (!/√/.test(s0) || !/[a-zA-Z]/.test(s0) || /[+=<>]|(?<![(^*/:√\]])-/.test(s0)) return null;
    // tokens
    const tk = []; let i = 0;
    while (i < s0.length) {
      const c = s0[i];
      if (/\d/.test(c)) { const m = s0.slice(i).match(/^\d+/); tk.push({ t: "n", v: +m[0] }); i += m[0].length; continue; }
      if (/[a-zA-Z]/.test(c)) { tk.push({ t: "l", v: c }); i++; continue; }
      if (c === "√") { let n = 2; if (s0[i + 1] === "[") { const m = s0.slice(i + 2).match(/^(\d+)\]/); if (!m) return null; n = +m[1]; i += m[0].length + 1; } tk.push({ t: "r", n }); i++; continue; }
      if ("*/:^()-".includes(c)) { tk.push({ t: c === ":" ? "/" : c }); i++; continue; }
      if (c === "~") { i++; continue; }
      return null;
    }
    // valor: Map base → [contribuciones Fr]; hojas: radicales para mostrar
    const hojas = [];
    const V = () => new Map();
    const mul = (a, b, sg = 1) => { const r = new Map([...a].map(([k, v]) => [k, v.slice()])); for (const [k, v] of b) r.set(k, (r.get(k) || []).concat(v.map((x) => x.por(sg)))); return r; };
    const esc = (a, f) => new Map([...a].map(([k, v]) => [k, v.map((x) => x.por(f))]));
    const num = (n) => { const m = V(); for (const [p, e] of Object.entries(primos(n))) m.set(p, [F(e)]); return m; };
    const tex = (a) => { const parts = []; for (const [k, v] of a) { const e = v.reduce((x, y) => x.mas(y), F(0)); if (e.cero()) continue; parts.push(e.v === 1 ? k : `${k}^{${Lfr(e)}}`); } return parts.join("\\cdot ") || "1"; };
    let p = 0;
    const tomar = (t) => (tk[p] && tk[p].t === t ? (p++, true) : false);
    const empieza = (k) => k && ["n", "l", "(", "r"].includes(k.t);
    function prod() { let a = pot(); for (;;) { if (tomar("*")) a = mul(a, pot()); else if (tomar("/")) a = mul(a, pot(), -1); else if (empieza(tk[p])) a = mul(a, pot()); else return a; } }
    function pot() { let b = atomo(); if (tomar("^")) { let neg = tomar("-"); const k = tk[p++]; let e; if (k && k.t === "n") e = F(k.v); else if (k && k.t === "(") { const m = tk[p++]; if (!m || m.t !== "n") throw 0; let d = 1; if (tomar("/")) { const q = tk[p++]; d = q.v; } if (!tomar(")")) throw 0; e = F(m.v, d); } else throw 0; if (neg) e = e.por(-1); b = esc(b, e); } return b; }
    function atomo() {
      const k = tk[p++]; if (!k) throw 0;
      if (k.t === "n") return num(k.v);
      if (k.t === "l") return new Map([[k.v, [F(1)]]]);
      if (k.t === "(") { const a = prod(); if (!tomar(")")) throw 0; return a; }
      if (k.t === "r") {
        const ini = p; const a = atomo();
        const dentro = tex(a);
        const r = esc(a, F(1, k.n));
        hojas.push({ raiz: k.n === 2 ? `\\sqrt{${dentro}}` : `\\sqrt[${k.n}]{${dentro}}`, pot: tex(r) });
        return r;
      }
      throw 0;
    }
    let val; try { val = prod(); if (p < tk.length) return null; } catch (e) { return null; }
    if (!hojas.length) return null;
    const pasos = []; const Pp = (titulo, texto, mates = [], html = "") => pasos.push({ titulo, texto, mates: [].concat(mates), html });
    Pp("Pasamos cada raíz a potencia de exponente fraccionario", "Una raíz es una potencia con exponente fraccionario: el exponente de adentro va arriba y el índice va abajo.", [`\\sqrt[n]{a^{m}}=a^{\\frac{m}{n}}`, ...hojas.map((h) => `${h.raiz}=${h.pot}`)]);
    // agrupamos por base
    const filas = [], tot = new Map();
    const orden = [...val.keys()].sort((a, b) => (isNaN(a) - isNaN(b)) || (isNaN(a) ? a.localeCompare(b) : a - b));
    for (const k of orden) {
      const cs = val.get(k), e = cs.reduce((x, y) => x.mas(y), F(0));
      tot.set(k, e);
      if (cs.length > 1) filas.push(`${k}^{${cs.map((c, i) => (i && c.n >= 0 ? "+" : "") + Lfr(c)).join("")}}=${e.cero() ? "1" : `${k}^{${Lfr(e)}}`}`);
    }
    if (filas.length) Pp("Agrupamos las potencias de igual base", "Al multiplicar potencias de igual base se suman los exponentes; al dividir, se restan.", filas);
    const potTex = [...tot].filter(([, e]) => !e.cero()).map(([k, e]) => (e.v === 1 ? k : `${k}^{${Lfr(e)}}`)).join("\\cdot ");
    Pp("Juntamos todo", "", [potTex || "1"]);
    // volvemos a radical: parte entera afuera, el resto con índice común
    let N = 1; const afueraN = [], afueraD = [], adentroN = [], adentroD = [];
    for (const [, e] of tot) { const f = F(((e.n % e.d) + e.d) % e.d, e.d); if (!f.cero()) N = mcm(N, f.d); }
    for (const [k, e] of tot) {
      if (e.cero()) continue;
      const ent = Math.floor(e.v + 1e-12), fr = e.menos(F(ent));
      const exp = (n) => (n === 1 ? k : `${k}^{${n}}`);
      if (e.n < 0) {
        // exponente negativo: va al denominador
        const pos = e.por(-1), ent2 = Math.floor(pos.v + 1e-12), fr2 = pos.menos(F(ent2));
        if (ent2) afueraD.push([k, ent2]); if (!fr2.cero()) adentroD.push([k, fr2.por(N).n]);
      } else { if (ent) afueraN.push([k, ent]); if (!fr.cero()) adentroN.push([k, fr.por(N).n]); }
    }
    const numeros = (lista) => { let prodN = 1, ok = true; const resto = []; for (const [k, n] of lista) { if (!isNaN(k)) { prodN *= Math.pow(+k, n); if (prodN > 1e9) ok = false; } else resto.push([k, n]); } return { prodN, ok, resto, lista }; };
    const armar = (lista) => {
      const nm = numeros(lista), letras = nm.resto.map(([k, n]) => (n === 1 ? k : `${k}^{${n}}`)).join("");
      const ns = lista.filter(([k]) => !isNaN(k));
      let nums = "";
      if (ns.length) {
        const g = ns.reduce((a, [, n]) => mcd(a, n), 0), base = ns.reduce((a, [k, n]) => a * Math.pow(+k, n / g), 1);
        nums = g > 1 ? `${base}^{${g}}` : nm.ok ? String(nm.prodN) : ns.map(([k, n]) => (n === 1 ? k : `${k}^{${n}}`)).join("\\cdot ");
      }
      return (nums && letras ? nums + (/[}\d]$/.test(nums) && /^\d/.test(letras) ? "\\cdot " : "") + letras : nums + letras) || "1";
    };
    // cada parte (numerador y denominador) con su propio índice, el menor posible
    const indice = (lista, NN) => { let g = NN; for (const [, n] of lista) g = mcd(g, n); return g; };
    const rad = (lista) => { if (!lista.length) return ""; const g = indice(lista, N), n = N / g, l2 = lista.map(([k, e]) => [k, e / g]); return n === 1 ? armar(l2) : n === 2 ? `\\sqrt{${armar(l2)}}` : `\\sqrt[${n}]{${armar(l2)}}`; };
    const numT = [afueraN.length ? armar(afueraN) : "", rad(adentroN)].filter(Boolean).join("\\,") || "1";
    const denT = [afueraD.length ? armar(afueraD) : "", rad(adentroD)].filter(Boolean).join("\\,");
    const final = denT ? `\\frac{${numT}}{${denT}}` : numT;
    const unaRaiz = !afueraN.length && !afueraD.length && adentroN.length && adentroD.length ? `=\\sqrt[${N}]{\\frac{${armar(adentroN)}}{${armar(adentroD)}}}`.replace("\\sqrt[2]", "\\sqrt") : "";
    Pp("Volvemos a escribirlo con raíces", `Los exponentes negativos pasan al denominador con exponente positivo. Las partes enteras de los exponentes quedan fuera de la raíz, y las fracciones se llevan a común índice ${N} (el mínimo común múltiplo de los denominadores).`, [`${potTex || "1"}=${final}${unaRaiz}`]);
    return { tema: "radicacion", metodo: "Radicales: potencias de exponente fraccionario", pasos, resultado: final + unaRaiz };
  }

  window.MA_FRACCIONES = { resolver: resolverFracciones, division: resolverDivision, factorRuffini: resolverFactorRuffini, casos: resolverCasos, radicales: resolverRadicales };

  /* ---------- enganche: el motor primero; si no puede, este ---------- */
  if (typeof window.resolverAhora !== "function") return;
  const anterior = window.resolverAhora;
  let pendiente = null;
  window.resolverAhora = function (metodo) {
    let texto = ""; try { texto = leerEntrada(); pendiente = !metodo && texto ? { t: texto, cuando: Date.now(), area } : null; } catch (e) { pendiente = null; }
    // División de polinomios: la resolvemos directamente (con Ruffini cuando se puede)
    let rd = null; try { rd = texto && !metodo ? (resolverRadicales(texto) || resolverCasos(texto)) : null; } catch (e) { rd = null; }
    // En Aritmética no hay letras: si el ejercicio tiene variables, lo pasamos a Álgebra
    if (!rd && !metodo && texto && area === "arit" && pareceAlgebra(texto) && typeof cambiarArea === "function") {
      cambiarArea("alg"); campoTexto.value = texto;
      if (typeof avisar === "function") avisar("Tiene letras (variables): lo resolvemos en Álgebra.");
      return window.resolverAhora(metodo);
    }
    if (!rd) try { rd = texto && (!metodo || /^div-/.test(metodo)) ? resolverDivision(texto, metodo) : null; } catch (e) { rd = null; }
    if (rd) { pendiente = null; mostrarPropio(texto, rd, "alg", !!metodo); return; }
    return anterior.apply(this, arguments);
  };
  function pareceAlgebra(t) {
    const u = String(t).replace(/√|\\sqrt|\b(raiz|sqrt|log|ln|sen|sin|cos|tg|tan|pi|mcd|mcm|dcm|mcm)\b/gi, " ");
    if (/[a-záéíóúñ]{3,}/i.test(u)) return false;                       // hay palabras: es una consigna en palabras
    const sinUnid = u.replace(/\b(km|hm|dam|dm|cm|mm|kg|hg|mg|ml|cl|dl|m|g|l|h|s|a)\b(?![\^(])/gi, " ");
    if (!/[a-zA-Z]/.test(sinUnid)) return false;
    return /\d\s*[a-zA-Z]|[a-zA-Z]\s*[\^(*/]|[(*/^+\-=]\s*[a-zA-Z]/.test(sinUnid);
  }
  const NOMBRE = { radicacion: "Radicación", fracciones: "Fracciones algebraicas", polinomios: "Polinomios", factorizacion: "Factorización" };
  async function mostrarPropio(texto, r, destino, sinCobrar) {
    const er = document.getElementById("error");
    if (!sinCobrar && window.MA_CALC && typeof MA_CALC.usar === "function") { try { if (!(await MA_CALC.usar())) return; } catch (e) { if (er) er.textContent = e.message; return; } }
    if (destino && area !== destino && typeof cambiarArea === "function") { cambiarArea(destino); campoTexto.value = texto; }
    if (er) er.textContent = "";
    ultimaEntrada = texto;
    mostrarExito(texto, r);
    const cab = document.querySelector("#cabecera b");
    if (cab && NOMBRE[cab.textContent]) cab.textContent = NOMBRE[cab.textContent];
  }
  const err = document.getElementById("error");
  if (!err || !window.MutationObserver) return;
  new MutationObserver(() => {
    const msg = err.textContent.trim();
    if (/^(null|undefined)$/i.test(msg) && (!pendiente || Date.now() - pendiente.cuando > 60000)) { err.textContent = "No pude resolver este ejercicio. Revisá que esté bien escrito o elegí el tema a mano y probá de nuevo."; return; }
    if (!msg || !pendiente || Date.now() - pendiente.cuando > 60000) return;
    if (/(sesi[oó]n|gratis|plan|conectar|servidor|cancel|tarda demasiado)/i.test(msg)) { pendiente = null; return; }
    const texto = pendiente.t; pendiente = null;
    let r = null; try { r = resolverRadicales(texto) || resolverFactorRuffini(texto) || resolverFracciones(texto); } catch (e) { r = null; }
    if (!r) { if (/^(null|undefined|\[object Object\])$/i.test(msg)) err.textContent = "No pude resolver este ejercicio. Revisá que esté bien escrito o elegí el tema a mano y probá de nuevo."; return; }
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
