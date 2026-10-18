/* Graficador: lector de fórmulas propio, de respaldo.
   Si el motor de la calculadora no logra leer la función (o no terminó de cargar),
   el graficador igual dibuja la curva con este lector simple.
   Entiende: + − * / ^, paréntesis, multiplicación sin signo (2x, 3(x+1), a x^2),
   sen/sin, cos, tg/tan, cotg, sec, cosec, ln, log, raiz/sqrt, √, abs, exp, arcsen, arccos, arctg, π/pi, e. */
(function () {
  "use strict";
  if (typeof window.grLeer !== "function" || typeof window.grValor !== "function") return;
  const leerMotor = window.grLeer, valorMotor = window.grValor;
  const LETRAS = (typeof GR_LETRAS_MOTOR !== "undefined" && GR_LETRAS_MOTOR) || ["k", "h", "t", "y"];

  const F = {
    sen: Math.sin, sin: Math.sin, cos: Math.cos, tg: Math.tan, tan: Math.tan,
    cotg: (v) => 1 / Math.tan(v), cot: (v) => 1 / Math.tan(v), sec: (v) => 1 / Math.cos(v),
    cosec: (v) => 1 / Math.sin(v), csc: (v) => 1 / Math.sin(v),
    ln: Math.log, log: Math.log10, sqrt: Math.sqrt, raiz: Math.sqrt, abs: Math.abs, exp: Math.exp,
    arcsen: Math.asin, arcsin: Math.asin, asin: Math.asin, arccos: Math.acos, acos: Math.acos,
    arctg: Math.atan, arctan: Math.atan, atan: Math.atan,
  };
  const NOMBRES = Object.keys(F).sort((a, b) => b.length - a.length);

  function normalizar(t) {
    return String(t)
      .replace(/^\s*(?:[fghy]\s*\(\s*x\s*\)|y)\s*=\s*/i, "")
      .replace(/[−–—]/g, "-").replace(/[·×]/g, "*").replace(/÷/g, "/")
      .replace(/²/g, "^2").replace(/³/g, "^3").replace(/π/g, "pi").replace(/√/g, "raiz")
      .replace(/\*\*/g, "^").replace(/(\d),(\d)/g, "$1.$2")
      .replace(/\\left|\\right|\\,/g, "").replace(/\\cdot/g, "*").replace(/[{\[]/g, "(").replace(/[}\]]/g, ")")
      .trim();
  }

  // Tokens: números, nombres de funciones, letras sueltas, operadores
  function tokens(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
        if (!m) throw new Error("número");
        // "2e" no es notación científica si no sigue un número
        const num = m[2] ? m[0] : m[1];
        out.push({ t: "n", v: parseFloat(num) }); i += num.length; continue;
      }
      if (/[a-záéíóúñ]/i.test(c)) {
        const resto = s.slice(i).toLowerCase();
        const fn = NOMBRES.find((n) => resto.startsWith(n));
        if (fn) { out.push({ t: "f", v: fn }); i += fn.length; continue; }
        if (resto.startsWith("pi")) { out.push({ t: "n", v: Math.PI }); i += 2; continue; }
        out.push({ t: "v", v: c.toLowerCase() }); i++; continue;
      }
      if ("+-*/^()|".includes(c)) { out.push({ t: c }); i++; continue; }
      throw new Error("símbolo " + c);
    }
    return out;
  }

  // Análisis: suma > producto (con multiplicación implícita) > signo > potencia > átomo
  function compilar(texto) {
    const tk = tokens(normalizar(texto));
    if (!tk.length) throw new Error("vacío");
    let p = 0;
    const ver = () => tk[p], tomar = (t) => { if (tk[p] && tk[p].t === t) { p++; return true; } return false; };
    const empiezaAtomo = (k) => k && (k.t === "n" || k.t === "v" || k.t === "f" || k.t === "(" || (k.t === "|" && !dentroBarra));
    let dentroBarra = 0;

    function suma() {
      let a = producto();
      for (;;) {
        if (tomar("+")) { const x = a, y = producto(); a = (s) => x(s) + y(s); }
        else if (tomar("-")) { const x = a, y = producto(); a = (s) => x(s) - y(s); }
        else return a;
      }
    }
    function producto() {
      let a = signo();
      for (;;) {
        if (tomar("*")) { const x = a, y = signo(); a = (s) => x(s) * y(s); }
        else if (tomar("/")) { const x = a, y = signo(); a = (s) => x(s) / y(s); }
        else if (empiezaAtomo(ver())) { const x = a, y = potencia(); a = (s) => x(s) * y(s); }
        else return a;
      }
    }
    function signo() {
      if (tomar("-")) { const x = signo(); return (s) => -x(s); }
      if (tomar("+")) return signo();
      return potencia();
    }
    function potencia() {
      const base = atomo();
      if (tomar("^")) { const e = signo(); return (s) => Math.pow(base(s), e(s)); }   // a^b^c = a^(b^c)
      return base;
    }
    function atomo() {
      const k = tk[p++];
      if (!k) throw new Error("falta algo al final");
      if (k.t === "n") { const v = k.v; return () => v; }
      if (k.t === "v") {
        const n = k.v;
        if (n === "e") return () => Math.E;
        return (s) => { const v = s[n]; return v === undefined ? NaN : v; };
      }
      if (k.t === "(") { const a = suma(); if (!tomar(")")) throw new Error("falta )"); return a; }
      if (k.t === "|") { dentroBarra++; const a = suma(); dentroBarra--; if (!tomar("|")) throw new Error("falta |"); return (s) => Math.abs(a(s)); }
      if (k.t === "f") {
        const f = F[k.v];
        let exp = null;
        if (tomar("^")) exp = signo();                 // sen^2(x)
        const arg = ver() && ver().t === "(" ? atomo() : potencia();   // sen(x) o sen x
        return exp ? (s) => Math.pow(f(arg(s)), exp(s)) : (s) => f(arg(s));
      }
      throw new Error("no esperaba " + k.t);
    }
    const r = suma();
    if (p < tk.length) throw new Error("sobra " + tk[p].t);
    return r;
  }

  // Mismo reparto de letras que el motor: a, b, c… → deslizadores
  function letras(texto) {
    const s = normalizar(texto).toLowerCase();
    let limpio = s;
    NOMBRES.concat(["pi"]).forEach((n) => { limpio = limpio.split(n).join(" "); });
    const vistas = [...new Set((limpio.match(/[a-df-wz]/g) || []))].slice(0, 4);
    const mapa = {};
    vistas.forEach((l, i) => { mapa[l] = LETRAS[i]; });
    return mapa;
  }

  function propio(texto) {
    const fn = compilar(texto);
    const mapa = letras(texto);
    return { e: { __propio: fn }, mapa };
  }

  const PRUEBA = [-2.3, -0.7, 0.4, 1.1, 2.9];
  function sirveMotor(r) {
    if (!r || !r.e) return false;
    try {
      const vals = PRUEBA.map((x) => valorMotor(r, x));
      return vals.some((v) => typeof v === "number" && isFinite(v));
    } catch (e) { return false; }
  }

  window.grLeer = function (texto) {
    let r = null;
    try { r = leerMotor(texto); } catch (e) { r = null; }
    if (sirveMotor(r)) return r;
    try { return propio(texto); } catch (e) { return r; }
  };

  window.grValor = function (f, x) {
    if (f && f.e && f.e.__propio) {
      const s = { x };
      for (const [letra] of Object.entries(f.mapa || {})) {
        const v = typeof gr !== "undefined" && gr.params ? gr.params[letra] : undefined;
        s[letra] = v === undefined ? 1 : v;
      }
      try { const v = f.e.__propio(s); return typeof v === "number" ? v : NaN; } catch (e) { return NaN; }
    }
    return valorMotor(f, x);
  };

  window.MA_GRAF_RESPALDO = { compilar, propio };
})();
