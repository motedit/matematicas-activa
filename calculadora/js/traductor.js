/* Calculadora Inteligente · traductor de lenguaje coloquial a lenguaje simbólico
 *
 * Lee el enunciado frase por frase y lo pasa a ecuaciones (o inecuaciones) sin tener el problema cargado:
 * "el doble de un número aumentado en 5", "la suma de tres números consecutivos", "si al triple de un número
 * le restamos 7 obtenemos…", "pensé un número, lo multipliqué por 3, le sumé 5 y obtuve 26",
 * "un número de dos cifras…", "Juan tiene el doble que Pedro y entre los dos tienen…", "su cociente es 3",
 * "excede en 12", "es mayor que"… Después decide el método (ecuación lineal, cuadrática, sistema,
 * inecuación), resuelve paso a paso y verifica.
 * Se prueba al final, sólo si ningún tipo de problema más específico reconoció el enunciado.
 */
(function () {
  "use strict";
  const PR = window.MA_PROBLEMAS;
  if (!PR || !PR.h || !PR.alFinal) return;
  const { F, L, aprox, tx, m$, ok, pasos, problema, plano } = PR.h;
  const Fr = PR.Fr;

  /* ---------- polinomios en x, y con coeficientes fraccionarios ---------- */
  class P {
    constructor(m) { this.m = m || new Map(); }
    static c(k) { const p = new P(); k = Fr.de(k); if (!k.cero()) p.m.set("0,0", k); return p; }
    static v(i) { const p = new P(); p.m.set(i === 0 ? "1,0" : "0,1", F(1)); return p; }
    mas(o) { o = o instanceof P ? o : P.c(o); const r = new P(new Map(this.m)); for (const [k, v] of o.m) { const s = (r.m.get(k) || F(0)).mas(v); s.cero() ? r.m.delete(k) : r.m.set(k, s); } return r; }
    por(o) {
      o = o instanceof P ? o : P.c(o); const r = new P();
      for (const [k1, v1] of this.m) for (const [k2, v2] of o.m) {
        const [a, b] = k1.split(",").map(Number), [c, d] = k2.split(",").map(Number), k = a + c + "," + (b + d);
        const s = (r.m.get(k) || F(0)).mas(v1.por(v2)); s.cero() ? r.m.delete(k) : r.m.set(k, s);
      }
      return r;
    }
    menos(o) { return this.mas((o instanceof P ? o : P.c(o)).por(-1)); }
    entre(o) { o = o instanceof P ? o : P.c(o); if (o.grado > 0 || o.k.cero()) return null; return this.por(F(1).entre(o.k)); }
    get grado() { let g = 0; for (const k of this.m.keys()) { const [a, b] = k.split(",").map(Number); g = Math.max(g, a + b); } return g; }
    get k() { return this.m.get("0,0") || F(0); }
    co(a, b) { return this.m.get(a + "," + b) || F(0); }
    usa(i) { for (const k of this.m.keys()) if (+k.split(",")[i] > 0) return true; return false; }
    gradoEn(i) { let g = 0; for (const k of this.m.keys()) g = Math.max(g, +k.split(",")[i]); return g; }
    cero() { return this.m.size === 0; }
    ev(x, y) { let s = 0; for (const [k, v] of this.m) { const [a, b] = k.split(",").map(Number); s += v.v * Math.pow(x, a) * Math.pow(y || 0, b); } return s; }
    evF(x, y) { let s = F(0); for (const [k, v] of this.m) { const [a, b] = k.split(",").map(Number); let t = v; for (let i = 0; i < a; i++) t = t.por(x); for (let i = 0; i < b; i++) t = t.por(y); s = s.mas(t); } return s; }
    // reemplaza la variable i por el polinomio q
    sust(i, q) { let r = P.c(0); for (const [k, v] of this.m) { const e = k.split(",").map(Number); let t = P.c(v); const otra = new P(); otra.m.set(i === 0 ? "0," + e[1] : e[0] + ",0", F(1)); t = t.por(otra); for (let j = 0; j < e[i]; j++) t = t.por(q); r = r.mas(t); } return r; }
    tex(N = ["x", "y"]) {
      const ks = [...this.m.keys()].sort((p, q) => { const [a, b] = p.split(",").map(Number), [c, d] = q.split(",").map(Number); return c + d - (a + b) || c - a; });
      if (!ks.length) return "0";
      let s = "";
      for (const k of ks) {
        const v = this.m.get(k), [a, b] = k.split(",").map(Number);
        const varte = (a ? N[0] + (a > 1 ? `^{${a}}` : "") : "") + (b ? N[1] + (b > 1 ? `^{${b}}` : "") : "");
        const neg = v.n < 0, ab = F(Math.abs(v.n), v.d);
        let co = varte && ab.n === ab.d ? "" : L(ab);
        if (varte && co && /frac/.test(co)) co += "\\,";
        s += (neg ? "-" : s ? "+" : "") + co + varte;
      }
      return s;
    }
  }
  const X = P.v(0), Y = P.v(1);

  /* ---------- números escritos con letras ---------- */
  const NUMW = { cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veinticuatro: 24, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, quinientos: 500, mil: 1000 };
  const NUM_RE = `(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?(?:\\s*\\/\\s*\\d+)?|${Object.keys(NUMW).filter((w) => w !== "uno").join("|")})(?![a-z])`;
  function numVal(s) {
    if (NUMW[s] !== undefined) return F(NUMW[s]);
    const m = s.match(/^(.+?)\s*\/\s*(\d+)$/); if (m) return PR.h.leerNum(m[1]).entre(+m[2]);
    return PR.h.leerNum(s);
  }
  const VECES = { doble: 2, duplo: 2, triple: 3, cuadruple: 4, quintuple: 5, sextuple: 6 };
  const PARTE = { mitad: F(1, 2), medio: F(1, 2), "tercera parte": F(1, 3), tercio: F(1, 3), "cuarta parte": F(1, 4), cuarto: F(1, 4), "quinta parte": F(1, 5), quinto: F(1, 5), "sexta parte": F(1, 6), sexto: F(1, 6), "octava parte": F(1, 8), "decima parte": F(1, 10) };
  const ORD = { terceras: 3, tercios: 3, cuartas: 4, cuartos: 4, quintas: 5, quintos: 5, sextas: 6, sextos: 6, septimas: 7, octavas: 8, decimas: 10 };
  const CANT = { dos: 2, tres: 3, cuatro: 4, cinco: 5, 2: 2, 3: 3, 4: 4, 5: 5 };

  /* ---------- lector ---------- */
  class Lector {
    constructor(s, ctx) { this.s = s; this.i = 0; this.ctx = ctx; }
    m(re) { const r = new RegExp("\\s*(?:" + re.source + ")", "y"); r.lastIndex = this.i; const x = r.exec(this.s); if (x) { this.i = r.lastIndex; return x; } return null; }
    mc(re) { const r = new RegExp("[\\s,]*(?:" + re.source + ")", "y"); r.lastIndex = this.i; const x = r.exec(this.s); if (x) { this.i = r.lastIndex; return x; } return null; }
    ve(re) { const r = new RegExp("\\s*(?:" + re.source + ")", "y"); r.lastIndex = this.i; return r.test(this.s); }
    fin() { return /^[\s.,;:?!)]*$/.test(this.s.slice(this.i)); }

    // expresión: término y modificadores ("aumentado en", "más", "menos", "multiplicado por", "al cuadrado"…)
    expr() {
      let a = this.termino(); if (!a) return null;
      for (;;) {
        const g = this.i; let b;
        if (this.mc(/(?:aumentad[oa]s?|incrementad[oa]s?|sumad[oa]s?)\s+(?:en|a|con)\s+|mas\s+(?!que\b|de\b|grande|chico|pequen)/)) { b = this.termino(); if (!b || b.q || a.q) { this.i = g; break; } a = a.mas(b); continue; }
        if (this.mc(/(?:disminuid[oa]s?|reducid[oa]s?|restad[oa]s?)\s+(?:en|a|con)\s+|menos\s+(?!que\b|de\b)/)) { b = this.termino(); if (!b || b.q || a.q) { this.i = g; break; } a = a.menos(b); continue; }
        if (this.mc(/(?:multiplicad[oa]s?\s+)?por\s+(?=\d|el |la |su |dos |tres |cuatro |cinco |si mismo)/)) { if (this.m(/si mismo/)) { a = a.por(a); continue; } b = this.termino(); if (!b || b.q || a.q) { this.i = g; break; } a = a.por(b); continue; }
        if (this.mc(/dividid[oa]s?\s+(?:por|entre|en)\s+/)) { b = this.termino(); if (!b || b.q || a.q) { this.i = g; break; } const c = a.entre(b); if (!c) a = { q: [a, b] }; else a = c; continue; }
        if (this.mc(/(?:elevad[oa]s?\s+)?al cuadrado/)) { if (a.q) { this.i = g; break; } a = a.por(a); continue; }
        if (this.m(/(?:elevad[oa]s?\s+)?al cubo/)) { if (a.q) { this.i = g; break; } a = a.por(a).por(a); continue; }
        break;
      }
      return a;
    }
    actual() { return this.ctx.cur || this.ctx.base(); }
    de() { if (this.ctx.modo === "nombres" && this.m(/(?:de|del)\s+(?:[a-z]+\s+){1,2}?que\s+(?:el |la |lo que tiene )?/)) return true; return this.m(/(?:de|del|de la|de los|de las|que|que el|que la)\s+/); }
    termino() {
      const c = this.ctx, g = this.i;
      let x;
      // números (y "3 veces", "el 20 % de", "3/4 de")
      if ((x = this.m(new RegExp(`(?:el |los |las |un )?${NUM_RE}`)))) {
        const v = numVal(x[1]);
        if (this.m(/(?:%|por ?ciento)\s+(?:de|del)\s+/)) { const t = this.termino(); if (!t || t.q) { this.i = g; return null; } return t.por(v.entre(100)); }
        if (/\//.test(x[1]) && this.m(/(?:de|del)\s+/)) { const t = this.termino(); if (!t || t.q) { this.i = g; return null; } return t.por(v); }
        if ((x = this.m(/(terceras|tercios|cuartas|cuartos|quintas|quintos|sextas|sextos|septimas|octavas|decimas)(?:\s+partes)?\s+(?:de|del)\s+/))) { const t = this.termino(); if (!t || t.q) { this.i = g; return null; } return t.por(v.entre(ORD[x[1]])); }
        if (this.m(/veces\s+(?:el |la |lo |un |una )?(?:de\s+)?/)) { const t = this.termino() || this.actual(); return t.por(v); }
        if (this.ve(/(?:numeros|cifras|digitos)\b/)) { this.i = g; } else { this.m(/(?:unidades?|anos|pesos)\b/); return P.c(v); }
      }
      // doble, triple…
      if ((x = this.m(/(?:el |su |al |del |un )?(doble|duplo|triple|cuadruple|quintuple|sextuple)\b/))) { const k = VECES[x[1]]; const t = this.de() ? this.termino() : this.actual(); if (!t || t.q) { this.i = g; return null; } return t.por(k); }
      // las dos terceras partes, tres cuartos
      if ((x = this.m(/(?:las |los |sus )?(dos|tres|cuatro|cinco|2|3|4|5)\s+(terceras|tercios|cuartas|cuartos|quintas|quintos|sextas|sextos|septimas|octavas|decimas)(?:\s+partes)?/))) { const k = F(CANT[x[1]], ORD[x[2]]); const t = this.de() ? this.termino() : this.actual(); if (!t || t.q) { this.i = g; return null; } return t.por(k); }
      // números consecutivos: el menor, el mayor, el del medio…
      if (c.modo === "consec" && (x = this.m(/(?:el |al |del )?(menor|primero|primer numero|mayor|ultimo|segundo|del medio|intermedio|tercero|cuarto)(?:\s+(?:de ellos|de los \w+|de estos numeros|de dichos numeros|numero))?\b/))) {
        const i = { menor: 0, primero: 0, "primer numero": 0, segundo: 1, "del medio": 1, intermedio: 1, tercero: 2, cuarto: 3, mayor: c.k - 1, ultimo: c.k - 1 }[x[1]];
        return c.n(i);
      }
      if (c.modo === "consec" && this.m(/(?:el |al |del )?(?:siguiente|consecutivo|sucesor)(?!\s+de)/)) return c.n(1);
      // la mitad, la tercera parte…
      if ((x = this.m(/(?:la |su |una |un |el |a la |de la )?(mitad|tercera parte|cuarta parte|quinta parte|sexta parte|octava parte|decima parte|tercio|cuarto|quinto|sexto|medio)\b/))) { const k = PARTE[x[1]]; const t = this.de() ? this.termino() : this.actual(); if (!t || t.q) { this.i = g; return null; } return t.por(k); }
      // cuadrado, cubo
      if ((x = this.m(/(?:el |su |al |del )?(cuadrado|cubo)\b/))) { const t = this.de() ? this.termino() : this.actual(); if (!t || t.q) { this.i = g; return null; } return x[1] === "cuadrado" ? t.por(t) : t.por(t).por(t); }
      // siguiente, anterior, opuesto
      if ((x = this.m(/(?:el |su |al |del )?(siguiente|consecutivo|sucesor|anterior|antecesor|predecesor|opuesto)\b/))) { const t = this.de() ? this.termino() : this.actual(); if (!t || t.q) { this.i = g; return null; } return x[1] === "opuesto" ? t.por(-1) : /anterior|antecesor|predecesor/.test(x[1]) ? t.menos(1) : t.mas(1); }
      // suma, diferencia, producto, cociente
      if ((x = this.m(/(?:la |su |a la |de la |el |del |al |sus |los )?(suma|diferencia|resta|producto|cociente|division|razon)\b/))) {
        const op = x[1], su = /su /.test(x[0]);
        if (c.modo === "cifras" && op === "suma" && this.m(/de (?:sus|las|ambas|dichas) cifras/)) return X.mas(Y);
        if ((su || c.modo !== "uno") && !this.ve(/(?:de|entre|del)\s/) || this.m(/(?:de|entre) (?:ambos|ambas|los dos|las dos|ellos|dichos numeros|esos numeros|estos numeros|los numeros|ambos numeros|los (?:dos|tres|cuatro|\d) numeros(?: \w+)*?|(?:dos|tres|cuatro|\d) numeros(?: naturales| enteros| positivos)?(?: pares| impares)?(?: consecutivos)?)\b/)) {
          const vs = c.todos(); if (!vs || vs.length < 2) { this.i = g; return null; }
          if (op === "suma") return vs.reduce((a, b) => a.mas(b));
          if (op === "producto") return vs.reduce((a, b) => a.por(b));
          if (vs.length !== 2) { this.i = g; return null; }
          if (op === "diferencia" || op === "resta") return vs[0].menos(vs[1]);
          return { q: [vs[0], vs[1]] };
        }
        // "la suma de los cuadrados de dos números", "el producto de sus dobles"
        if (c.modo !== "uno" && (x = this.m(/(?:de|entre)\s+(?:los |sus )?(cuadrados|cubos|dobles|triples|opuestos|mitades)(?:\s+de\s+(?:los |dichos |estos |esos |ambos |sus )?(?:(?:dos|tres|\d)\s+)?numeros(?: naturales| enteros| positivos)?(?: pares| impares)?(?: consecutivos)?)?/))) {
          const f = { cuadrados: (t) => t.por(t), cubos: (t) => t.por(t).por(t), dobles: (t) => t.por(2), triples: (t) => t.por(3), opuestos: (t) => t.por(-1), mitades: (t) => t.por(F(1, 2)) }[x[1]];
          const vs = c.todos().map(f);
          if (op === "suma") return vs.reduce((a, b) => a.mas(b));
          if (op === "producto") return vs.reduce((a, b) => a.por(b));
          if (vs.length === 2 && (op === "diferencia" || op === "resta")) return vs[0].menos(vs[1]);
          this.i = g; return null;
        }
        if (!this.m(/(?:de|entre|del)\s+/)) { this.i = g; return null; }
        const a = this.termino(); if (!a || a.q) { this.i = g; return null; }
        if (!this.m(op === "producto" ? /(?:y|e|por|con)\s+/ : op === "suma" ? /(?:y|e|con|mas)\s+/ : /(?:y|e|menos|con)\s+/)) { this.i = g; return null; }
        const b = this.termino(); if (!b || b.q) { this.i = g; return null; }
        if (op === "suma") return a.mas(b);
        if (op === "producto") return a.por(b);
        if (op === "diferencia" || op === "resta") return a.menos(b);
        return a.entre(b) || { q: [a, b] };
      }
      // número de dos cifras
      if (c.modo === "cifras") {
        if (this.m(/(?:la )?cifra de las decenas|(?:el )?digito de las decenas/)) return X;
        if (this.m(/(?:la )?cifra de las unidades|(?:el )?digito de las unidades/)) return Y;
        if (this.m(/(?:el )?numero (?:que (?:se obtiene|resulta)|obtenido|que queda)\s+(?:al|si se|cuando se)\s+(?:invierte|invierten|invertir|intercambia|intercambian|intercambiar|cambia|cambian|cambiar)\s+(?:el orden de\s+)?(?:sus|las|ambas)\s+cifras|(?:el )?numero (?:invertido|con las cifras invertidas)|(?:el )?numero que resulta de invertir(?: el orden de)? (?:sus|las) cifras/)) return Y.por(10).mas(X);
        if (c.invierte && this.m(/(?:el )?(?:nuevo numero|numero (?:que (?:se obtiene|resulta|queda)|obtenido|resultante|nuevo))\b/)) return Y.por(10).mas(X);
        if (this.m(/(?:el |dicho |ese |este |del |al )?(?:mismo )?numero(?: original| inicial| primitivo| dado)?\b/)) return X.por(10).mas(Y);
      }
      // nombres propios (Juan, Pedro…)
      if (c.modo === "nombres") {
        x = this.m(new RegExp(`(?:lo que (?:tiene|tenia|gana|cobra|ahorro|pesa)|la edad de|el dinero de|los ahorros de|el sueldo de|el peso de|la cantidad de)?\\s*(?:a |de )?(${c.nombres.join("|")})\\b`));
        if (x) { const i = c.nombres.indexOf(x[1]); c.cur = i ? Y : X; return i ? Y : X; }
      }
      // "dos números suman 65", "tres números consecutivos multiplicados dan…"
      if (c.modo !== "uno" && c.modo !== "nombres" && (x = this.m(/(?:los |dichos |estos |esos |sus |cuyos )?(?:dos|tres|cuatro|\d) numeros(?: naturales| enteros| positivos)?(?: pares| impares)?(?: consecutivos)?(?=\s+(?:suman|sumados|multiplicados|restados))/))) {
        const vs = c.todos();
        if (this.ve(/multiplicados/)) { this.m(/multiplicados/); return vs.reduce((a, b) => a.por(b)); }
        if (this.ve(/restados/) && vs.length === 2) { this.m(/restados/); return vs[0].menos(vs[1]); }
        this.m(/sumados/);
        return vs.reduce((a, b) => a.mas(b));
      }
      // dos números
      if (c.modo === "dos") {
        if (this.m(/(?:el |al |del |un |a |de )?(?:otro|segundo|menor)(?: numero)?\b(?! de ellos)/) || this.m(/(?:el |al |del )?(?:menor|segundo) de (?:ellos|los dos|ambos)/)) { c.cur = Y; return Y; }
        if (this.m(/(?:el |al |del |un |uno )?(?:primer|primero|mayor)(?: numero| de ellos| de los dos)?\b|uno de (?:ellos|los numeros|los dos)|uno\b(?! de)/)) { c.cur = X; return X; }
      }
      // un número / el número / dicho número / el mismo
      if (this.m(/(?:(?:un|el|del|al|dicho|ese|este|aquel|cierto|un cierto|a un|de un|a dicho|al mismo|del mismo|el mismo)\s+)*(?:mismo\s+)?numero(?:\s+(?:natural|entero|real|positivo|negativo|desconocido|buscado|pensado|original))?\b/)) {
        if (c.modo === "nombres") { this.i = g; return null; }
        const b = c.modo === "consec" ? c.n(0) : X; c.cur = b; return b;
      }
      if (this.m(/(?:el mismo|la misma|dicho valor|ese valor|este valor|el valor)\b/)) return this.actual();
      if (this.m(/x\b/)) return X;
      this.i = g; return null;
    }
  }

  /* ---------- frases → ecuaciones ---------- */
  const REL_EQ = /(?:es igual|equivale|corresponde)\s+a(?:l\b)?|da como resultado|se obtiene|obtenemos|obtengo|obtuvo|obtuve|resulta(?: ser)?|es de|es|son|sea|sean|resulte|resulten|da|dan|de como resultado|vale|valen|suman|sumen|sumados dan|multiplicados dan|totalizan|tiene|tienen|posee|poseen|pesa|mide|cobra|gana|recibe|ahorro|tendra|tenia/;
  const CONECT = /^\s*(?:[,;.?!]|y\b|e\b|pero\b|mientras\b|ademas\b|$)/;
  function ecuacion(s, i, ctx) {
    const lx = new Lector(s, ctx); lx.i = i;
    ctx.cur = null;
    // "si al doble de un número le restamos 7…" y "pensé un número, lo multipliqué por 3…"
    const cad = cadena(lx);
    if (cad) return cad;
    lx.i = i; ctx.cur = null;
    const A = lx.expr(); if (!A) return null;
    let x, B, tipo = "=";
    lx.m(/,/);
    const g = lx.i;
    // "es 5 más que", "tiene 300 pesos menos que"
    if ((x = lx.m(new RegExp(`(?:es|son|tiene|tienen|posee|pesa|mide|gana|cobra|vale|cuesta|ahorro|recibe)\\s+${NUM_RE}\\s*(?:unidades\\s+|anos\\s+|pesos\\s+|kg\\s+|kilos\\s+)?(mas|mayor|menos|menor)\\s+(?:que|de lo que|a)\\s+(?:el |la |lo que tiene )?`)))) {
      const n = numVal(x[1]); B = lx.expr(); if (!B || B.q || A.q) return null;
      return fin(lx, { L: A, R: B.mas(/mas|mayor/.test(x[2]) ? n : n.por(-1)), tipo });
    }
    lx.i = g;
    // "excede a otro en 12", "supera en 5 a…"
    if (lx.m(/(?:excede|supera|sobrepasa)\s+/)) {
      let N = null;
      if (lx.m(/en\s+/)) { N = lx.termino(); lx.m(/(?:a|al)\s+/); B = lx.expr(); }
      else { lx.m(/(?:a\s+|al\s+)/); B = lx.expr(); if (lx.m(/en\s+/)) N = lx.termino(); }
      if (!B || B.q || A.q) return null;
      if (N) return fin(lx, { L: A.menos(B), R: N, tipo });
      return fin(lx, { L: A, R: B, tipo: ">" });
    }
    // desigualdades
    if ((x = lx.m(/(?:es|son|resulta|da)\s+(mayor|menor)\s+(o igual\s+)?(?:que|a)\s+(?:el |la )?/))) { B = lx.expr(); if (!B || B.q || A.q) return null; return fin(lx, { L: A, R: B, tipo: (x[1] === "mayor" ? ">" : "<") + (x[2] ? "=" : "") }); }
    if (lx.m(/no (?:supera|excede|sobrepasa)(?:\s+a\b|\s+al\b)?|es (?:como maximo|a lo sumo)|no es mayor que|no debe superar(?:\s+a)?/)) { B = lx.expr(); if (!B || B.q || A.q) return null; return fin(lx, { L: A, R: B, tipo: "<=" }); }
    if (lx.m(/es (?:como minimo|al menos|por lo menos)|no es menor que/)) { B = lx.expr(); if (!B || B.q || A.q) return null; return fin(lx, { L: A, R: B, tipo: ">=" }); }
    // igualdades
    if (!lx.m(REL_EQ)) return null;
    lx.m(/igual\s+a(?:l\b)?|a\s+(?=\d)/);
    if (lx.ve(/(?:mayor|menor|mas|menos)\b/)) return null;
    B = lx.expr(); if (!B) return null;
    return fin(lx, { L: A, R: B, tipo });
  }
  function fin(lx, e) {
    lx.m(/(?:unidades?|anos|pesos|kg|kilos|en total|entre (?:los dos|ambos|ambas))\b/);
    if (!CONECT.test(lx.s.slice(lx.i))) return null;
    // cociente con variable: a/b = c → a = c·b
    if (e.L.q || e.R.q) {
      if (e.L.q && e.R.q) return null;
      const [q, o] = e.L.q ? [e.L, e.R] : [e.R, e.L];
      e = { L: q.q[0], R: o.por(q.q[1]), tipo: e.tipo, cociente: true };
    }
    const d = e.L.menos(e.R);
    if (d.grado === 0) return null;   // sin incógnitas
    e.fin = lx.i;
    return e;
  }
  const OPS = [
    [/(?:lo\s+)?multipli(?:c|qu)\w*\s+(?:por\s+)?/, (a, b) => a.por(b)],
    [/(?:divid\w*|parti\w*)\s+(?:por|entre|en)\s+/, (a, b) => a.entre(b)],
    [/(?:sum\w*|agreg\w*|anad\w*|adicion\w*|aument\w*(?:\s+en)?)\s+(?:a\s+(?:eso|esto)\s+)?/, (a, b) => a.mas(b)],
    [/(?:rest\w*|quit\w*|sa(?:c|qu)\w*|descont\w*|disminu\w*(?:\s+en)?)\s+/, (a, b) => a.menos(b)],
  ];
  const FIN_CAD = /(?:y\s+)?(?:(?:asi|entonces|finalmente|al final)\s+)?(?:obtuve|obtengo|obtuvo|obtiene|obtenemos|obtuvimos|se obtiene|se obtuvo|me dio|me da|nos da|da|dio|resulta|resulto|queda|quedo|obteniendo|dando|resultando|el resultado (?:es|fue|da|sera)|es igual a(?:l\b)?|equivale a(?:l\b)?|es)\s+(?:como resultado\s+)?(?:a\s+)?/;
  function cadena(lx) {
    const c = lx.ctx, g = lx.i;
    let v;
    if (lx.m(/(?:pens\w*|eleg\w*|escog\w*|tom\w*|escrib\w*|se piensa|se elige)\s+(?:en\s+)?un numero/)) v = c.modo === "nombres" ? null : X;
    else if (lx.m(/si\s+(?:a\s+|al\s+|a la\s+|a los\s+|se\s+)?/)) { v = lx.termino(); }
    else if (lx.ve(/(?:a\s+)?un numero\s*,?\s*(?:se\s+|lo\s+|le\s+|se le\s+)(?:multipli(?:c|qu)|divid|sum|agreg|rest|quit|elev|dupli(?:c|qu)|tripli(?:c|qu))/)) { lx.m(/a\s+/); v = lx.termino(); }
    if (!v || v.q) { lx.i = g; return null; }
    let n = 0;
    for (;;) {
      const h = lx.i;
      lx.m(/[,\s]*(?:y\s+)?(?:luego|despues|a continuacion|ademas|entonces)?\s*,?\s*(?:a\s+(?:ese|este|dicho)\s+resultado|al resultado(?: obtenido)?|a eso|a lo obtenido|a ese numero|a este numero|a ese valor|a lo que (?:queda|quedo))?\s*,?\s*(?:se\s+)?(?:lo|le|la|les|los)?\s*(?:se\s+)?(?:lo\s+|le\s+)?/);
      if (lx.m(/elev\w*\s+al cuadrado/)) { v = v.por(v); n++; continue; }
      if (lx.m(/dupli(?:c|qu)\w*/)) { v = v.por(2); n++; continue; }
      if (lx.m(/tripli(?:c|qu)\w*/)) { v = v.por(3); n++; continue; }
      let hecho = false;
      for (const [re, f] of OPS) {
        if (lx.m(re)) { const t = lx.termino(); if (!t || t.q) { lx.i = h; break; } const r = f(v, t); if (!r) { lx.i = h; break; } v = r; n++; hecho = true; break; }
      }
      if (hecho) continue;
      lx.i = h; break;
    }
    if (!n) { lx.i = g; return null; }
    lx.m(/[,\s]*/);
    if (!lx.m(FIN_CAD)) { lx.i = g; return null; }
    const B = lx.expr(); if (!B || B.q) { lx.i = g; return null; }
    return fin(lx, { L: v, R: B, tipo: "=" });
  }
  // "entre los dos tienen 900", "Juan y Pedro tienen en total 900"
  function totalNombres(s, i, ctx) {
    if (ctx.modo !== "nombres") return null;
    const r = new RegExp(`(?:entre (?:los|las) (?:dos|tres)|entre ambos|entre ambas|juntos|juntas|en total|entre todos|(?:${ctx.nombres.join("|")}) (?:y|e) (?:${ctx.nombres.join("|")}))\\s*,?\\s*(?:tienen|suman|juntan|poseen|reunen|ahorraron|pesan|miden|cobran|ganan|tendran|reunieron|juntaron)\\s+(?:en total\\s+|entre los dos\\s+|juntos\\s+)?(?:\\$\\s*)?${NUM_RE}`, "y");
    r.lastIndex = i; const m = r.exec(s); if (!m) return null;
    return { L: X.mas(Y), R: P.c(numVal(m[1])), tipo: "=", fin: r.lastIndex };
  }

  /* ---------- contexto: qué incógnitas hay ---------- */
  const COMUNES = new Set(["si", "un", "una", "el", "la", "los", "las", "en", "hallar", "halla", "calcular", "calcula", "determinar", "determina", "encontrar", "encuentra", "cual", "cuales", "cuanto", "cuantos", "cuanta", "cuantas", "que", "se", "de", "entre", "dos", "tres", "ademas", "sabiendo", "plantear", "plantea", "resolver", "resuelve", "indicar", "indica", "escribir", "pense", "pensé", "luego", "despues", "finalmente", "por", "para", "al", "con", "y", "hoy", "juntos", "ambos", "lo", "le", "su", "sus", "este", "esta", "ese", "esa", "dicho", "dicha"]);
  function contexto(orig, p) {
    const ctx = { modo: "uno", nombres: [], cur: null };
    let m;
    if ((m = p.match(/(\w+) numeros (?:naturales |enteros )?(pares |impares )?(?:naturales |enteros )?consecutivos/))) {
      const k = CANT[m[1]] || NUMW[m[1]] || +m[1] || 2;
      ctx.modo = "consec"; ctx.k = k; ctx.paso = m[2] ? 2 : 1;
      ctx.n = (i) => X.mas(F(i * ctx.paso));
      ctx.todos = () => Array.from({ length: k }, (_, i) => ctx.n(i));
      ctx.base = () => X;
    } else if (/numero (?:natural )?de dos (?:cifras|digitos)/.test(p)) {
      ctx.modo = "cifras"; ctx.invierte = /invi?ert|intercambi|permut/.test(p); ctx.todos = () => [X, Y]; ctx.base = () => X.por(10).mas(Y);
    } else {
      // nombres propios: palabras con mayúscula que se repiten o que hacen algo ("Juan tiene")
      const cand = [...orig.matchAll(/(?<![.?!¿¡]\s|^)\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})\b|\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})(?=\s+(?:tiene|tenia|gana|cobra|pesa|mide|ahorro|recibe|posee|y\s+[A-ZÁÉÍÓÚÑ]))/g)].map((x) => plano(x[1] || x[2]));
      const nombres = [...new Set(cand)].filter((w) => !COMUNES.has(w) && !/^(numero|suma|doble|triple|mitad)/.test(w));
      if (nombres.length >= 2 && !/\bnumeros?\b/.test(p)) { ctx.modo = "nombres"; ctx.nombres = nombres.slice(0, 2); ctx.todos = () => [X, Y]; ctx.base = () => X; }
      else if (/\bdos numeros\b|\b2 numeros\b|\botro numero\b|\bel otro\b|\botro\b|\bambos numeros\b|\bnumeros suman\b|\bel segundo numero\b|\bel primer numero\b|\buno de ellos\b/.test(p)) { ctx.modo = "dos"; ctx.todos = () => [X, Y]; ctx.base = () => X; }
      else { ctx.todos = () => null; ctx.base = () => X; }
    }
    return ctx;
  }

  /* ---------- resolución ---------- */
  const raizExacta = (f) => { if (f.n < 0) return null; const a = Math.round(Math.sqrt(f.n)), b = Math.round(Math.sqrt(f.d)); return a * a === f.n && b * b === f.d ? F(a, b) : null; };
  const num = (r) => (r.fr ? aprox(r.fr) : String(Math.round(r.f * 100) / 100).replace(".", "{,}") );
  const Sol = (fr, f) => ({ fr, f: fr ? fr.v : f });
  // resuelve un polinomio en una variable (índice i) igualado a 0. Devuelve { raices, mates, metodo }
  function resolverUna(Q, i, N) {
    const v = N[i], a2 = i === 0 ? Q.co(2, 0) : Q.co(0, 2), a1 = i === 0 ? Q.co(1, 0) : Q.co(0, 1), a0 = Q.k;
    const g = i === 0 ? Q.gradoEn(0) : Q.gradoEn(1);
    if (g > 2) return null;
    if (g === 1) {
      const r = a0.por(-1).entre(a1);
      return { metodo: "Ecuación lineal", raices: [Sol(r)], mates: [`${L(a1).replace(/^1$/, "").replace(/^-1$/, "-")}${v}=${L(a0.por(-1))}`, `${v}=${aprox(r)}`] };
    }
    if (g === 2) {
      const D = a1.por(a1).menos(a2.por(a0).por(4));
      const ms = [`${Q.tex(N)}=0`, `a=${L(a2)},\\;b=${L(a1)},\\;c=${L(a0)}`, `\\Delta=b^2-4ac=${L(D)}`];
      if (D.n < 0) return { metodo: "Ecuación cuadrática", raices: [], mates: [...ms, tx("El discriminante es negativo: no hay solución real.")] };
      const rz = raizExacta(D);
      let raices;
      if (a1.cero() && a0.cero()) raices = [Sol(F(0))];
      else if (rz) raices = [Sol(a1.por(-1).mas(rz).entre(a2.por(2))), Sol(a1.por(-1).menos(rz).entre(a2.por(2)))];
      else { const s = Math.sqrt(D.v); raices = [Sol(null, (-a1.v + s) / (2 * a2.v)), Sol(null, (-a1.v - s) / (2 * a2.v))]; }
      if (D.cero()) raices = raices.slice(0, 1);
      ms.push(`${v}=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}=\\frac{${L(a1.por(-1))}\\pm\\sqrt{${L(D)}}}{${L(a2.por(2))}}`, raices.map((r, k) => `${v}_{${k + 1}}=${num(r)}`).join(",\\quad "));
      return { metodo: "Ecuación cuadrática (fórmula resolvente)", raices, mates: ms };
    }
    return null;
  }
  const TEX_REL = { "=": "=", "<": "<", ">": ">", "<=": "\\le ", ">=": "\\ge " };
  function frase(orig, p, a, b) { return orig.slice(a, b).replace(/^[\s,;.y]+|[\s,;.]+$/g, "").replace(/^(?:y|e|si|ademas|sabiendo que|se sabe que)\s+/i, ""); }

  function traducir(orig, p) {
    // normalización: "¿" y espacios
    const s = p.replace(/[¿¡]/g, " ").replace(/\s+/g, " ");
    const o = orig.replace(/[¿¡]/g, " ").replace(/\s+/g, " ");
    if (s.length !== o.length) return null;
    const ctx = contexto(o, s);
    if (ctx.modo === "uno" && !/\b(numeros?|x|pense|doble|triple|cuadruple|mitad|tercera parte|cuarta parte|suma|producto|cociente|cuadrado|cubo|consecutivo|excede|supera|siguiente|anterior|opuesto)\b/.test(s)) return null;
    // recorremos el texto: en cada palabra probamos si empieza una frase con relación
    const eqs = [];
    let i = 0;
    while (i < s.length) {
      if (/[a-z0-9$]/.test(s[i]) && (i === 0 || !/[a-z0-9]/.test(s[i - 1]))) {
        const e = totalNombres(s, i, ctx) || ecuacion(s, i, ctx);
        if (e) { e.ini = i; e.txt = frase(o, s, i, e.fin); eqs.push(e); i = e.fin; continue; }
      }
      i++;
    }
    if (!eqs.length) return null;
    // quitamos repetidas
    const unicas = []; for (const e of eqs) { const k = e.L.menos(e.R).tex() + e.tipo; if (!unicas.some((u) => u.L.menos(u.R).tex() + u.tipo === k)) unicas.push(e); }
    const usaY = unicas.some((e) => e.L.usa(1) || e.R.usa(1));
    const nInc = usaY ? 2 : 1;
    const igual = unicas.filter((e) => e.tipo === "="), des = unicas.filter((e) => e.tipo !== "=");
    if (nInc === 2 && igual.length < 2) return null;
    if (nInc === 1 && !igual.length && !des.length) return null;
    return armar(o, s, ctx, unicas, nInc);
  }

  function armar(o, s, ctx, eqs, nInc) {
    const N = ["x", "y"];
    const { p: ps, P: Pp } = pasos();
    const natural = /\bnatural(es)?\b/.test(s) || ctx.modo === "consec" || ctx.modo === "cifras", entero = natural || /\benteros?\b/.test(s), positivo = natural || /\bpositiv/.test(s) || ctx.modo === "nombres";
    // incógnitas
    let inc;
    if (ctx.modo === "consec") { const lst = Array.from({ length: ctx.k }, (_, i) => (i ? `x+${i * ctx.paso}` : "x")); inc = `Llamamos $x$ al menor de los números. Como son ${ctx.paso === 2 ? "pares (o impares) " : ""}consecutivos, los demás se escriben a partir de él: ${m$(lst.join(",\\;"))}.`; }
    else if (ctx.modo === "cifras") inc = "Llamamos $x$ a la cifra de las decenas e $y$ a la cifra de las unidades. El número vale $10x+y$ y, con las cifras invertidas, $10y+x$.";
    else if (ctx.modo === "nombres") inc = `Llamamos $x$ a lo de ${cap(ctx.nombres[0])} e $y$ a lo de ${cap(ctx.nombres[1])}.`;
    else if (nInc === 2) inc = "Hay dos números desconocidos: los llamamos $x$ (el primero o mayor) e $y$ (el otro).";
    else inc = "Llamamos $x$ al número desconocido.";
    Pp("Leemos el problema y elegimos la incógnita", inc);
    // traducción frase por frase
    const filas = eqs.map((e) => `<tr><td>${esc(e.txt)}</td><td>$${e.L.tex(N)}${TEX_REL[e.tipo]}${e.R.tex(N)}$</td></tr>`).join("");
    Pp("Traducimos al lenguaje simbólico", "Pasamos cada frase del enunciado a una expresión con la incógnita.", [], `<table class="tabla"><thead><tr><th>Lenguaje coloquial</th><th>Lenguaje simbólico</th></tr></thead><tbody>${filas}</tbody></table>`);
    const igual = eqs.filter((e) => e.tipo === "="), des = eqs.filter((e) => e.tipo !== "=");
    let sols = [], metodo = "";
    if (nInc === 1 && igual.length) {
      const e = igual[0], Q = e.L.menos(e.R);
      // si hay x en el denominador ya se multiplicó: lo avisamos
      if (e.cociente) Pp("Sacamos la incógnita del denominador", "Multiplicamos los dos miembros por el divisor.", [`${e.L.tex(N)}=${e.R.tex(N)}`]);
      const r = resolverUna(Q, 0, N); if (!r) return null;
      metodo = r.metodo;
      Pp(r.metodo === "Ecuación lineal" ? "Resolvemos la ecuación" : "Resolvemos la ecuación cuadrática", r.metodo === "Ecuación lineal" ? "Distribuimos, agrupamos los términos con x en un miembro y los números en el otro, y despejamos." : "Pasamos todo a un miembro (igualado a cero) y aplicamos la fórmula resolvente.", [`${e.L.tex(N)}=${e.R.tex(N)}`, ...r.mates]);
      sols = r.raices.map((x) => ({ x }));
    } else if (nInc === 2) {
      const [e1, e2] = igual; const Q1 = e1.L.menos(e1.R), Q2 = e2.L.menos(e2.R);
      // buscamos una ecuación lineal en alguna variable para despejar
      let dsp = null;
      for (const [Qa, Qb] of [[Q1, Q2], [Q2, Q1]]) for (const vi of [0, 1]) {
        if (dsp) break;
        const lin = vi === 0 ? Qa.gradoEn(0) === 1 && Qa.co(1, 1).cero() : Qa.gradoEn(1) === 1 && Qa.co(1, 1).cero();
        if (!lin) continue;
        const cv = vi === 0 ? Qa.co(1, 0) : Qa.co(0, 1); if (cv.cero()) continue;
        // var = -(Qa - cv·var)/cv
        const resto = Qa.menos((vi === 0 ? X : Y).por(cv));
        if (resto.usa(vi)) continue;
        dsp = { vi, expr: resto.por(F(-1).entre(cv)), Qb };
      }
      if (!dsp) return null;
      const ot = 1 - dsp.vi, V = N[dsp.vi], W = N[ot];
      metodo = "Sistema de ecuaciones (sustitución)";
      Pp("Planteamos el sistema de ecuaciones", "Cada condición del enunciado es una ecuación.", [`\\begin{cases}${e1.L.tex(N)}=${e1.R.tex(N)}\\\\ ${e2.L.tex(N)}=${e2.R.tex(N)}\\end{cases}`]);
      const Qs = dsp.Qb.sust(dsp.vi, dsp.expr);
      const r = resolverUna(Qs, ot, N); if (!r) return null;
      Pp("Resolvemos por sustitución", `Despejamos $${V}$ de una ecuación y lo reemplazamos en la otra: queda una ecuación con una sola incógnita.`, [`${V}=${dsp.expr.tex(N)}`, `${Qs.tex(N)}=0`, ...r.mates.slice(r.metodo === "Ecuación lineal" ? 0 : 1)]);
      sols = r.raices.map((w) => { let vx; if (w.fr) vx = Sol(ot === 0 ? dsp.expr.evF(w.fr, F(0)) : dsp.expr.evF(F(0), w.fr)); else vx = Sol(null, ot === 0 ? dsp.expr.ev(w.f, 0) : dsp.expr.ev(0, w.f)); return dsp.vi === 0 ? { x: vx, y: w } : { x: w, y: vx }; });
      if (sols.length) Pp("Calculamos la otra incógnita", `Reemplazamos en $${V}=${dsp.expr.tex(N)}$.`, sols.map((s) => `${V}=${num(dsp.vi === 0 ? s.x : s.y)}`));
    } else if (nInc === 1 && des.length) {
      return inecuacion(o, s, ctx, des[0], { natural, entero, positivo }, ps, Pp);
    }
    // condiciones del problema (naturales, cifras…)
    const esEnt = (r) => (r.fr ? r.fr.entero : Math.abs(r.f - Math.round(r.f)) < 1e-9);
    const valida = (sl) => [sl.x, sl.y].filter(Boolean).every((r) => (!entero || esEnt(r)) && (!positivo || r.f >= 0)) && (ctx.modo !== "cifras" || (sl.x.f >= 1 && sl.x.f <= 9 && sl.y.f >= 0 && sl.y.f <= 9));
    // en dos números simétricos ((14; 6) y (6; 14)) nos quedamos con el par ordenado de mayor a menor
    if (nInc === 2 && ctx.modo === "dos" && sols.length === 2 && Math.abs(sols[0].x.f - sols[1].y.f) < 1e-9 && Math.abs(sols[0].y.f - sols[1].x.f) < 1e-9) sols = [sols[0].x.f >= sols[0].y.f ? sols[0] : sols[1]];
    const buenas = sols.filter(valida), descartadas = sols.filter((x) => !valida(x));
    if (!sols.length) throw problema("La ecuación no tiene solución real: revisá los datos del enunciado.");
    if (descartadas.length && buenas.length) Pp("Elegimos las soluciones que tienen sentido", ctx.modo === "cifras" ? "Las cifras tienen que ser números naturales del 0 al 9 (y la de las decenas, distinta de 0)." : entero ? "El problema habla de números naturales o enteros, así que descartamos las soluciones que no lo son." : "Descartamos las soluciones negativas: no tienen sentido en este problema.", [`${tx("descartamos: ")}${descartadas.map((d) => (nInc === 2 ? `(${num(d.x)};\\,${num(d.y)})` : num(d.x))).join(",\\;")}`]);
    if (!buenas.length) throw problema(entero ? "La solución no da un número natural (o entero), así que con esos datos el problema no tiene solución: revisá el enunciado." : "La solución no tiene sentido en el problema (da negativa): revisá el enunciado.");
    // verificación
    const ver = [];
    for (const sl of buenas.slice(0, 2)) for (const e of eqs) {
      const xv = sl.x, yv = sl.y || Sol(F(0));
      const izq = xv.fr && yv.fr ? e.L.evF(xv.fr, yv.fr) : null, der = xv.fr && yv.fr ? e.R.evF(xv.fr, yv.fr) : null;
      const li = izq ? izq.v : e.L.ev(xv.f, yv.f), ri = der ? der.v : e.R.ev(xv.f, yv.f);
      const cumple = e.tipo === "=" ? Math.abs(li - ri) < 1e-6 : e.tipo === "<" ? li < ri : e.tipo === ">" ? li > ri : e.tipo === "<=" ? li <= ri + 1e-9 : li >= ri - 1e-9;
      ver.push(`${izq ? aprox(izq) : num(Sol(null, li))}${TEX_REL[e.tipo]}${der ? aprox(der) : num(Sol(null, ri))}${cumple ? ok : ""}`);
    }
    Pp("Verificamos en el enunciado", "Reemplazamos la solución en cada condición del problema.", ver);
    // respuesta
    const resp = buenas.map((sl) => respuesta(ctx, sl, nInc));
    Pp("Respondemos con una oración", (buenas.length > 1 ? "Hay dos soluciones posibles. " : "") + resp.join(" También: ") + ` Conjunto solución: ${m$(`S=\\{${buenas.map((sl) => (nInc === 2 ? `(${num(sl.x)};\\,${num(sl.y)})` : num(sl.x))).join(";\\,")}\\}`)}.`);
    const res = ctx.modo === "cifras" ? buenas.map((sl) => `${tx("número")}=${Math.round(sl.x.f * 10 + sl.y.f)}`).join(",\\;") : ctx.modo === "consec" ? buenas.map((sl) => Array.from({ length: ctx.k }, (_, i) => num(Sol(sl.x.fr ? sl.x.fr.mas(i * ctx.paso) : null, sl.x.f + i * ctx.paso))).join(",\\;")).join(";\\;") : buenas.map((sl) => (nInc === 2 ? `x=${num(sl.x)},\\;y=${num(sl.y)}` : `x=${num(sl.x)}`)).join(",\\;");
    return { tema: "problemas", metodo: `Traducción al lenguaje simbólico · ${metodo}`, pasos: ps, resultado: res, area: "alg" };
  }
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  function respuesta(ctx, sl, nInc) {
    if (ctx.modo === "consec") { const ns = Array.from({ length: ctx.k }, (_, i) => num(Sol(sl.x.fr ? sl.x.fr.mas(i * ctx.paso) : null, sl.x.f + i * ctx.paso))); return `Los números son ${ns.slice(0, -1).map(m$).join(", ")} y ${m$(ns[ns.length - 1])}.`; }
    if (ctx.modo === "cifras") return `La cifra de las decenas es ${m$(num(sl.x))} y la de las unidades ${m$(num(sl.y))}: el número es ${m$(String(Math.round(sl.x.f * 10 + sl.y.f)))}.`;
    if (ctx.modo === "nombres") return `${cap(ctx.nombres[0])}: ${m$(num(sl.x))}; ${cap(ctx.nombres[1])}: ${m$(num(sl.y))}.`;
    if (nInc === 2) return `Los números son ${m$(num(sl.x))} y ${m$(num(sl.y))}.`;
    return `El número es ${m$(num(sl.x))}.`;
  }
  function inecuacion(o, s, ctx, e, cond, ps, Pp) {
    const Q = e.L.menos(e.R);
    if (Q.gradoEn(0) !== 1 || Q.usa(1)) return null;
    const a = Q.co(1, 0), b = Q.k, k = b.por(-1).entre(a);
    let t = e.tipo; const flip = a.n < 0;
    const inv = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" };
    const t2 = flip ? inv[t] : t;
    Pp("Resolvemos la inecuación", `Despejamos $x$ igual que en una ecuación.${flip ? " Ojo: al dividir por un número negativo se da vuelta el signo de la desigualdad." : ""}`, [`${e.L.tex()}${TEX_REL[t]}${e.R.tex()}`, `${L(a)}x${TEX_REL[t]}${L(b.por(-1))}`, `x${TEX_REL[t2]}${aprox(k)}`]);
    const abierto = t2.length === 1, mayor = t2[0] === ">";
    let interv = mayor ? `${abierto ? "(" : "["}${aprox(k)};\\,+\\infty)` : `(-\\infty;\\,${aprox(k)}${abierto ? ")" : "]"}`;
    let resp = `Los números que cumplen la condición son los $x$ ${mayor ? "mayores" : "menores"} ${abierto ? "que" : "o iguales a"} ${m$(aprox(k))}: ${m$(`S=${interv}`)}.`;
    if (cond.natural) {
      const lim = mayor ? (abierto ? Math.floor(k.v) + 1 : Math.ceil(k.v)) : (abierto ? Math.ceil(k.v) - 1 : Math.floor(k.v));
      if (!mayor) { const lista = []; for (let n = 1; n <= lim && lista.length < 30; n++) lista.push(n); resp = lista.length ? `Los números naturales que cumplen son ${m$(`S=\\{${lista.join(";\\,")}\\}`)}.` : "Ningún número natural cumple la condición."; }
      else resp = `Los números naturales que cumplen son ${m$(`S=\\{${lim};\\,${lim + 1};\\,${lim + 2};\\,\\ldots\\}`)}.`;
    }
    Pp("Respondemos con una oración", resp);
    return { tema: "problemas", metodo: "Traducción al lenguaje simbólico · Inecuación lineal", pasos: ps, resultado: `x${TEX_REL[t2]}${aprox(k)}`, area: "alg" };
  }
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  PR.alFinal((o, p) => traducir(o, p));
  window.MA_TRADUCTOR = { traducir, P, contexto, ecuacion, totalNombres, Lector };
})();
