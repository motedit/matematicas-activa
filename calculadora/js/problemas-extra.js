/* Calculadora Inteligente · más tipos de problemas con enunciado
 *
 * Tipos nuevos (se prueban antes que los del motor):
 *   Álgebra: gallinas y conejos (cabezas y patas, ruedas), entradas o billetes de dos precios,
 *            dos artículos con dos compras, ángulos complementarios/suplementarios, persecución (un móvil alcanza a otro).
 *   Aritmética (gratis): regla de tres simple directa e inversa, ¿qué porcentaje es…?, nota que falta para un promedio,
 *            fracciones de un total (gastó 1/3 y después 1/4 del resto…).
 * Si el texto no encaja en ninguno, sigue todo como antes (lo resuelve el motor).
 */
(function () {
  "use strict";

  /* ---------- fracciones exactas ---------- */
  const mcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  class Fr {
    constructor(n, d = 1) {
      if (d === 0) throw new Error("No se puede dividir por cero.");
      if (d < 0) { n = -n; d = -d; }
      const g = mcd(n, d) || 1;
      this.n = n / g; this.d = d / g;
    }
    static de(x) { return x instanceof Fr ? x : new Fr(x, 1); }
    mas(o) { o = Fr.de(o); return new Fr(this.n * o.d + o.n * this.d, this.d * o.d); }
    menos(o) { o = Fr.de(o); return new Fr(this.n * o.d - o.n * this.d, this.d * o.d); }
    por(o) { o = Fr.de(o); return new Fr(this.n * o.n, this.d * o.d); }
    entre(o) { o = Fr.de(o); return new Fr(this.n * o.d, this.d * o.n); }
    get v() { return this.n / this.d; }
    get entero() { return this.d === 1; }
    cero() { return this.n === 0; }
  }
  const F = (n, d) => new Fr(n, d);

  function leerNum(raw) {
    raw = raw.replace(/\s/g, "");
    let t = raw;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(",", ".");
    const [ent, dec = ""] = t.split(".");
    return F(parseInt(ent + dec, 10), 10 ** dec.length);
  }

  /* ---------- formato ---------- */
  const miles = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, "{.}");
  function decimalExacto(f) {
    let d = f.d; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5;
    return d === 1;
  }
  function L(f, sinMiles) {          // LaTeX
    f = Fr.de(f);
    const neg = f.n < 0, a = Math.abs(f.n);
    let s;
    if (f.d === 1) s = sinMiles ? String(a) : miles(String(a));
    else if (decimalExacto(f) && f.d <= 10000) {
      const txt = (a / f.d).toFixed(Math.round(Math.log10(f.d * 16))).replace(/0+$/, "").replace(/\.$/, "");
      const [e, d] = txt.split(".");
      s = (sinMiles ? e : miles(e)) + (d ? "{,}" + d : "");
    } else s = `\\frac{${a}}{${f.d}}`;
    return (neg ? "-" : "") + s;
  }
  const aprox = (f) => { f = Fr.de(f); return f.entero || decimalExacto(f) ? L(f) : `${L(f)}\\approx ${miles(String(Math.round(f.v * 100) / 100).replace(".", "{,}"))}`; };
  const R = (f) => { f = Fr.de(f); return f.entero || decimalExacto(f) ? L(f, true) : `${L(f, true)}\\approx ${String(Math.round(f.v * 100) / 100).replace(".", "{,}")}`; };
  const PESO = "\\text{\\textdollar}\\,";
  const din = (f) => PESO + L(f);
  const tx = (s) => `\\text{${s}}`;
  const m$ = (s) => `$${s}$`;
  const ok = "\\;\\checkmark";
  const tabla = (cab, filas) => `<table class="tabla"><thead><tr>${cab.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function pasos() { const p = []; return { p, P: (titulo, texto, mates = [], html = "") => p.push({ titulo, texto, mates: [].concat(mates), html }) }; }
  const problema = (msg) => Object.assign(new Error(msg), { propio: true });

  /* ---------- lectura del texto ---------- */
  // Igual largo que el original (sirve para recortar nombres con tildes del texto original)
  const plano = (s) => s.toLowerCase().replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n");
  const RE_NUM = /(\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?/g;
  function numeros(p) {
    const out = []; let m;
    RE_NUM.lastIndex = 0;
    while ((m = RE_NUM.exec(p))) {
      const fin = m.index + m[0].length;
      const despues = p.slice(fin, fin + 30);
      let v = leerNum(m[2]), frac = false;
      if (m[3]) { v = v.entre(leerNum(m[3])); frac = true; }
      out.push({ v, i: m.index, fin, frac, dinero: !!m[1] || /^\s*(pesos|\$)/.test(despues), despues, antes: p.slice(Math.max(0, m.index - 40), m.index), pct: /^\s*(%|por ?ciento)/.test(despues) });
    }
    return out;
  }
  const PALABRAS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12 };
  const unidad = (n) => (n.despues.match(/^\s*(?:de\s+)?([a-z/]+)/) || [, ""])[1].replace(/^km\/h$/, "km/h");
  const raiz = (w) => w.replace(/(es|s)$/, "").slice(0, 5);

  /* =====================================================================
     1) Cabezas y patas (o vehículos y ruedas)
     ===================================================================== */
  const ANIMALES = [
    ["gallina", 2, "gallinas"], ["pollo", 2, "pollos"], ["pato", 2, "patos"], ["pavo", 2, "pavos"], ["ganso", 2, "gansos"],
    ["avestruz", 2, "avestruces"], ["loro", 2, "loros"], ["paloma", 2, "palomas"], ["ave", 2, "aves"], ["pajaro", 2, "pájaros"],
    ["conejo", 4, "conejos"], ["vaca", 4, "vacas"], ["cerdo", 4, "cerdos"], ["chancho", 4, "chanchos"], ["caballo", 4, "caballos"],
    ["perro", 4, "perros"], ["gato", 4, "gatos"], ["oveja", 4, "ovejas"], ["cabra", 4, "cabras"], ["burro", 4, "burros"],
    ["arana", 8, "arañas"], ["escarabajo", 6, "escarabajos"], ["hormiga", 6, "hormigas"],
    ["bicicleta", 2, "bicicletas"], ["moto", 2, "motos"], ["triciclo", 3, "triciclos"], ["auto", 4, "autos"], ["camioneta", 4, "camionetas"],
  ];
  function cantidadJunto(p, palabras) {
    const re1 = new RegExp(`(\\d[\\d.]*)\\s*(?:${palabras})`), re2 = new RegExp(`(?:${palabras})[^\\d]{0,25}?(\\d[\\d.]*)`);
    const m = p.match(re1) || p.match(re2);
    return m ? leerNum(m[1]) : null;
  }
  function cabezasPatas(p) {
    const ruedas = /ruedas/.test(p);
    if (!((/cabezas/.test(p) && /patas/.test(p)) || (ruedas && /(vehiculos|bicicletas|autos|motos|triciclos)/.test(p)))) return null;
    const vistos = [];
    for (const a of ANIMALES) {
      const m = p.match(new RegExp(`\\b${a[0]}(s|es)?\\b`));
      if (m && !vistos.some((v) => v.nombre === a[0])) vistos.push({ nombre: a[0], patas: a[1], plural: a[2], i: m.index });
    }
    vistos.sort((x, y) => x.i - y.i);
    const [A, B] = vistos.filter((v, i, arr) => arr.findIndex((w) => w.patas === v.patas) === i);
    if (!A || !B) return null;
    const H = cantidadJunto(p, ruedas ? "vehiculos|cabezas" : "cabezas|animales");
    const T = cantidadJunto(p, ruedas ? "ruedas" : "patas");
    if (!H || !T) return null;
    const pata = ruedas ? "ruedas" : "patas", cabeza = ruedas ? "vehículos" : "cabezas";
    const x = T.menos(H.por(B.patas)).entre(A.patas - B.patas), y = H.menos(x);
    if (!x.entero || !y.entero || x.n < 0 || y.n < 0) throw problema(`Con ${L(H)} ${cabeza} y ${L(T)} ${pata} no sale una cantidad entera de ${A.plural} y ${B.plural}. Revisá los números del enunciado.`);
    const { p: ps, P } = pasos();
    P("Leemos el problema y anotamos los datos", ruedas ? "Cada vehículo cuenta una vez; las ruedas dependen del tipo de vehículo." : "Cada animal tiene una sola cabeza, pero la cantidad de patas depende de qué animal es.", [],
      tabla(["Dato", "Valor"], [[`Total de ${cabeza}`, m$(L(H))], [`Total de ${pata}`, m$(L(T))], [`${pata[0].toUpperCase() + pata.slice(1)} de cada ${A.nombre === "arana" ? "araña" : A.nombre}`, m$(A.patas)], [`${pata[0].toUpperCase() + pata.slice(1)} de cada ${B.nombre === "arana" ? "araña" : B.nombre}`, m$(B.patas)]]));
    P("Elegimos las incógnitas", `Lo que no conocemos son las dos cantidades: $x$ = cantidad de ${A.plural}, $y$ = cantidad de ${B.plural}.`, [`x=${tx("cantidad de " + A.plural)}`, `y=${tx("cantidad de " + B.plural)}`]);
    P("Planteamos el sistema de ecuaciones", `Una ecuación cuenta los ${cabeza} y la otra cuenta las ${pata}.`, [`\\begin{cases}x+y=${L(H)}\\\\ ${A.patas}x+${B.patas}y=${L(T)}\\end{cases}`]);
    P("Resolvemos por sustitución", `Despejamos $y$ de la primera ecuación y la reemplazamos en la segunda.`, [
      `y=${L(H)}-x`, `${A.patas}x+${B.patas}(${L(H)}-x)=${L(T)}`, `${A.patas}x+${L(H.por(B.patas))}-${B.patas}x=${L(T)}`,
      `${A.patas - B.patas}x=${L(T)}-${L(H.por(B.patas))}=${L(T.menos(H.por(B.patas)))}`, `x=\\frac{${L(T.menos(H.por(B.patas)))}}{${A.patas - B.patas}}=${L(x)}`, `y=${L(H)}-${L(x)}=${L(y)}`]);
    P("Verificamos en el enunciado", "Reemplazamos en los datos originales: tienen que dar los totales.", [`${L(x)}+${L(y)}=${L(H)}${ok}`, `${A.patas}\\cdot ${L(x)}+${B.patas}\\cdot ${L(y)}=${L(x.por(A.patas))}+${L(y.por(B.patas))}=${L(T)}${ok}`]);
    P("Respondemos con una oración", `Hay ${m$(L(x))} ${A.plural} y ${m$(L(y))} ${B.plural}.`);
    return { tema: "problemas", metodo: "Sistema de ecuaciones (cabezas y " + pata + ")", pasos: ps, resultado: `${tx(A.plural)}=${L(x, true)},\\;${tx(B.plural)}=${L(y, true)}`, area: "alg" };
  }

  /* =====================================================================
     2) Dos precios: cantidad total y dinero total (entradas, billetes, monedas…)
     ===================================================================== */
  function etiquetaPrecio(orig, p, n) {
    const antes = p.slice(Math.max(0, n.i - 40), n.i);
    const m = antes.match(/(?:de|para|los|las)\s+([a-z]+)\s*(?:cuestan|cuesta|valen|vale|salen|sale|pagan|paga|a|:|de)?\s*$/);
    const malas = /^(cuestan|cuesta|valen|vale|a|de|la|las|los|el|y|entradas|boletos|billetes|monedas|tickets|pasajes|precio)$/;
    if (m && !malas.test(m[1])) { const ini = n.i - antes.length + antes.lastIndexOf(m[1]); return orig.slice(ini, ini + m[1].length); }
    return null;
  }
  function dosPrecios(orig, p) {
    if (!/(entradas|boletos|billetes|monedas|tickets|pasajes|articulos|productos|remeras|libros|cuadernos|unidades|bonos|rifas|platos|viandas|empanadas|docenas)/.test(p)) return null;
    if (!/(recaud|suman|sumaron|en total|total|junt|reun|cobr|obtuv|pag|gast|tiene|tengo|hay)/.test(p)) return null;
    const ns = numeros(p).filter((n) => !n.frac && !n.pct);
    const plata = ns.filter((n) => n.dinero), cant = ns.filter((n) => !n.dinero);
    if (plata.length !== 3 || cant.length !== 1) return null;
    const total = plata.reduce((a, b) => (b.v.v > a.v.v ? b : a));
    const [p1, p2] = plata.filter((n) => n !== total);
    const N = cant[0].v, T = total.v;
    if (p1.v.v === p2.v.v || !N.entero) return null;
    const cosa = (p.slice(cant[0].fin).match(/^\s*([a-z]+)/) || [, "unidades"])[1];
    const cosaO = orig.slice(cant[0].fin).match(/^\s*([^\s,.;]+)/)?.[1] || cosa;
    const e1 = etiquetaPrecio(orig, p, p1), e2 = etiquetaPrecio(orig, p, p2);
    const lab = (e, pr) => (e ? `de ${e}` : `de ${m$(din(pr.v))}`);
    const t1 = `${cosaO} ${lab(e1, p1)}`, t2 = `${cosaO} ${lab(e2, p2)}`;
    const x = T.menos(N.por(p2.v)).entre(p1.v.menos(p2.v)), y = N.menos(x);
    if (!x.entero || !y.entero || x.n < 0 || y.n < 0) throw problema(`Con esos datos no sale una cantidad entera de ${cosaO}. Revisá los precios y el total.`);
    const { p: ps, P } = pasos();
    P("Leemos el problema y anotamos los datos", "Hay dos tipos con precios distintos. Sabemos cuántos hay en total y cuánta plata suman.", [],
      tabla(["Dato", "Valor"], [[`Cantidad total de ${esc(cosaO)}`, m$(L(N))], [`Precio ${e1 ? "de " + esc(e1) : "1"}`, m$(din(p1.v))], [`Precio ${e2 ? "de " + esc(e2) : "2"}`, m$(din(p2.v))], ["Dinero total", m$(din(T))]]));
    P("Elegimos las incógnitas", `Llamamos $x$ a la cantidad de ${t1} y $y$ a la cantidad de ${t2}.`, [`x+y=${L(N)}`]);
    P("Planteamos el sistema de ecuaciones", "Una ecuación cuenta las unidades; la otra suma la plata (precio por cantidad).", [`\\begin{cases}x+y=${L(N)}\\\\ ${L(p1.v)}\\,x+${L(p2.v)}\\,y=${L(T)}\\end{cases}`]);
    P("Resolvemos por sustitución", "Despejamos $y$ de la primera ecuación y la reemplazamos en la segunda.", [
      `y=${L(N)}-x`, `${L(p1.v)}\\,x+${L(p2.v)}\\,(${L(N)}-x)=${L(T)}`, `${L(p1.v)}\\,x+${L(N.por(p2.v))}-${L(p2.v)}\\,x=${L(T)}`,
      `${L(p1.v.menos(p2.v))}\\,x=${L(T.menos(N.por(p2.v)))}`, `x=${L(x)}`, `y=${L(N)}-${L(x)}=${L(y)}`]);
    P("Verificamos en el enunciado", "Las cantidades y la plata tienen que coincidir con los datos.", [`${L(x)}+${L(y)}=${L(N)}${ok}`, `${L(p1.v)}\\cdot ${L(x)}+${L(p2.v)}\\cdot ${L(y)}=${L(x.por(p1.v))}+${L(y.por(p2.v))}=${L(T)}${ok}`]);
    P("Respondemos con una oración", `Son ${m$(L(x))} ${t1} y ${m$(L(y))} ${t2}.`);
    return { tema: "problemas", metodo: "Sistema de ecuaciones (cantidad y dinero)", pasos: ps, resultado: `x=${L(x, true)},\\;y=${L(y, true)}`, area: "alg" };
  }

  /* =====================================================================
     3) Dos artículos y dos compras: "3 lápices y 2 gomas cuestan $1300; 1 lápiz y 4 gomas $1100"
     ===================================================================== */
  function dosArticulos(orig, p) {
    if (!/(cuest|cost|val|pag|sal|gast)/.test(p)) return null;
    const cant = "(\\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)";
    const re = new RegExp(`${cant}\\s+([a-z]+)\\s+(?:y|mas)\\s+${cant}\\s+([a-z]+)[^$\\d]{0,40}?\\$?\\s*(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?)`, "g");
    const ms = [...p.matchAll(re)];
    if (ms.length !== 2) return null;
    const q = (s) => (PALABRAS[s] !== undefined ? F(PALABRAS[s]) : leerNum(s));
    const [m1, m2] = ms;
    const pre = (w) => w.slice(0, 4);
    const r = [pre(m1[2]), pre(m1[4])];
    if (r[0] === r[1]) return null;
    const pos = (w) => r.indexOf(pre(w));
    if (pos(m2[2]) < 0 || pos(m2[4]) < 0 || pos(m2[2]) === pos(m2[4])) return null;
    const a1 = q(m1[1]), b1 = q(m1[3]), c1 = leerNum(m1[5]);
    let a2, b2; if (pos(m2[2]) === 0) { a2 = q(m2[1]); b2 = q(m2[3]); } else { a2 = q(m2[3]); b2 = q(m2[1]); }
    const c2 = leerNum(m2[5]);
    const det = a1.por(b2).menos(a2.por(b1));
    if (det.cero()) throw problema("Las dos compras dicen lo mismo (son proporcionales), así que no alcanza para saber cada precio.");
    const y = a1.por(c2).menos(a2.por(c1)).entre(det), x = c1.menos(b1.por(y)).entre(a1);
    if (x.n < 0 || y.n < 0) throw problema("Con esos datos un precio da negativo. Revisá los números del enunciado.");
    // nombres como están escritos (singular aproximado)
    const nombreO = (m, k) => { const ini = m.index + m[0].indexOf(m[k], m[0].indexOf(m[k - 1]) + m[k - 1].length); return orig.slice(ini, ini + m[k].length); };
    const N1 = nombreO(m1, 2), N2 = nombreO(m1, 4);
    const { p: ps, P } = pasos();
    P("Leemos el problema y anotamos los datos", "Tenemos dos compras distintas con los mismos dos artículos.", [], tabla(["Compra", esc(N1), esc(N2), "Total"], [["1.ª", m$(L(a1)), m$(L(b1)), m$(din(c1))], ["2.ª", m$(L(a2)), m$(L(b2)), m$(din(c2))]]));
    P("Elegimos las incógnitas", `$x$ = precio de una unidad de ${N1}, $y$ = precio de una unidad de ${N2}.`);
    P("Planteamos el sistema de ecuaciones", "Cada compra da una ecuación: cantidad por precio, sumado, es lo que se pagó.", [`\\begin{cases}${L(a1)}x+${L(b1)}y=${L(c1)}\\\\ ${L(a2)}x+${L(b2)}y=${L(c2)}\\end{cases}`]);
    P("Resolvemos por reducción", `Multiplicamos la 1.ª ecuación por ${m$(L(a2))} y la 2.ª por ${m$(L(a1))} para que la $x$ tenga el mismo coeficiente, y restamos.`, [
      `${L(a1.por(a2))}x+${L(b1.por(a2))}y=${L(c1.por(a2))}`, `${L(a1.por(a2))}x+${L(b2.por(a1))}y=${L(c2.por(a1))}`,
      `(${L(b1.por(a2))}-${L(b2.por(a1))})\\,y=${L(c1.por(a2))}-${L(c2.por(a1))}`, `y=\\frac{${L(c1.por(a2).menos(c2.por(a1)))}}{${L(b1.por(a2).menos(b2.por(a1)))}}=${L(y)}`,
      `${L(a1)}x+${L(b1)}\\cdot ${L(y)}=${L(c1)}\\;\\Rightarrow\\;x=\\frac{${L(c1)}-${L(b1.por(y))}}{${L(a1)}}=${L(x)}`]);
    P("Verificamos en el enunciado", "Con esos precios, las dos compras tienen que dar lo que se pagó.", [`${L(a1)}\\cdot ${L(x)}+${L(b1)}\\cdot ${L(y)}=${L(c1)}${ok}`, `${L(a2)}\\cdot ${L(x)}+${L(b2)}\\cdot ${L(y)}=${L(c2)}${ok}`]);
    P("Respondemos con una oración", `Cada unidad de ${N1} cuesta ${m$(PESO + aprox(x))} y cada unidad de ${N2} cuesta ${m$(PESO + aprox(y))}.`);
    return { tema: "problemas", metodo: "Sistema de ecuaciones (dos compras)", pasos: ps, resultado: `x=${R(x)},\\;y=${R(y)}`, area: "alg" };
  }

  /* =====================================================================
     4) Ángulos complementarios / suplementarios
     ===================================================================== */
  function angulos(p) {
    const comp = /complement/.test(p), sup = /suplement/.test(p);
    if (!comp && !sup) return null;
    const S = comp ? 90 : 180, nom = comp ? "complementarios" : "suplementarios", uno = comp ? "complemento" : "suplemento";
    const ns = numeros(p).filter((n) => !n.frac);
    const { p: ps, P } = pasos();
    // a) "¿cuál es el complemento de 35°?"
    if (/(complemento|suplemento)\s+de\s+(un\s+angulo\s+de\s+)?\d/.test(p) && ns.length === 1 && !/otro/.test(p)) {
      const a = ns[0].v;
      if (a.v >= S) throw problema(`Un ángulo de ${a.v}° no tiene ${uno}: tiene que medir menos de ${S}°.`);
      P("Recordamos la definición", `Dos ángulos son ${nom} si suman ${S}°.`, [`\\alpha+\\beta=${S}^\\circ`]);
      P("Planteamos y resolvemos", `Al ángulo dado le falta lo que lo completa hasta ${S}°.`, [`\\beta=${S}^\\circ-${L(a)}^\\circ=${L(F(S).menos(a))}^\\circ`]);
      P("Verificamos", "", [`${L(a)}^\\circ+${L(F(S).menos(a))}^\\circ=${S}^\\circ${ok}`]);
      P("Respondemos con una oración", `El ${uno} de ${m$(L(a) + "^\\circ")} es ${m$(L(F(S).menos(a)) + "^\\circ")}.`);
      return { tema: "problemas", metodo: `Ángulos ${nom}`, pasos: ps, resultado: `\\beta=${R(F(S).menos(a))}^\\circ`, area: "alg" };
    }
    // b) relación entre los dos ángulos
    const K = { doble: 2, triple: 3, cuadruple: 4, quintuple: 5, mitad: F(1, 2), tercera: F(1, 3) };
    let k = F(1), d = F(0), desc = [];
    const mk = p.match(/\b(doble|triple|cuadruple|quintuple|mitad|tercera parte)\b/) || p.match(/(\d+)\s*veces/);
    if (mk) { k = mk[1] in K ? Fr.de(K[mk[1]]) : mk[1] === "tercera parte" ? F(1, 3) : leerNum(mk[1]); }
    const md = p.match(/(\d+(?:[.,]\d+)?)\s*°?\s*(?:grados)?\s*(mas|menos)\b/) || p.match(/\b(mas|menos)\s+(\d+(?:[.,]\d+)?)/) || p.match(/(difieren|diferencia|excede|supera)\D{0,15}(\d+(?:[.,]\d+)?)/);
    if (md) {
      if (/^\d/.test(md[1])) d = leerNum(md[1]).por(md[2] === "menos" ? -1 : 1);
      else if (md[1] === "mas" || md[1] === "menos") d = leerNum(md[2]).por(md[1] === "menos" ? -1 : 1);
      else d = leerNum(md[2]);
    }
    if (!mk && !md) return null;
    const expr = `${k.n === k.d ? "" : L(k)}x${d.cero() ? "" : (d.n > 0 ? "+" : "-") + L(F(Math.abs(d.n), d.d))}`;
    const coef = k.mas(1), x = F(S).menos(d).entre(coef), y = F(S).menos(x);
    if (x.n <= 0 || y.n <= 0) throw problema("Con esos datos un ángulo da cero o negativo. Revisá el enunciado.");
    P("Recordamos la definición", `Dos ángulos son ${nom} si suman ${S}°.`, [`\\alpha+\\beta=${S}^\\circ`]);
    P("Elegimos la incógnita", "Llamamos $x$ al ángulo más simple y escribimos el otro según el enunciado.", [`\\alpha=x`, `\\beta=${expr}`]);
    P("Planteamos la ecuación", "La suma de los dos tiene que dar el total.", [`x+${expr}=${S}`]);
    P("Resolvemos", "Agrupamos las $x$ y despejamos.", [`${L(coef)}x${d.cero() ? "" : (d.n > 0 ? "+" : "-") + L(F(Math.abs(d.n), d.d))}=${S}`, `${L(coef)}x=${L(F(S).menos(d))}`, `x=${aprox(x)}`, `\\beta=${aprox(y)}`]);
    P("Verificamos en el enunciado", "", [`${aprox(x)}^\\circ+${aprox(y)}^\\circ=${S}^\\circ${ok}`]);
    P("Respondemos con una oración", `Los ángulos miden ${m$(aprox(x) + "^\\circ")} y ${m$(aprox(y) + "^\\circ")}.`);
    return { tema: "problemas", metodo: `Ángulos ${nom}`, pasos: ps, resultado: `\\alpha=${R(x)}^\\circ,\\;\\beta=${R(y)}^\\circ`, area: "alg" };
  }

  /* =====================================================================
     5) Persecución: uno sale antes y otro más rápido lo alcanza
     ===================================================================== */
  const horasYMin = (t) => { const h = Math.floor(t.v + 1e-9), mi = Math.round((t.v - h) * 60); return mi === 60 ? `${h + 1} h` : h && mi ? `${h} h ${mi} min` : h ? `${h} h` : `${mi} min`; };
  function persecucion(p) {
    if (!/alcanz/.test(p) || !/(km\/h|km por hora|kilometros por hora)/.test(p)) return null;
    if (!/(despues|mas tarde|ventaja|delante|adelante|antes)/.test(p) || /separad|encuentr|cruzan/.test(p)) return null;
    const ns = numeros(p);
    const vel = ns.filter((n) => /^\s*(km\/h|km por hora|kilometros por hora)/.test(n.despues));
    if (vel.length !== 2) return null;
    const [v1, v2] = vel.map((n) => n.v);
    const tiempo = ns.find((n) => /^\s*(h\b|hs\b|horas?|minutos?|min\b)/.test(n.despues));
    const vent = ns.find((n) => /^\s*(km|kilometros)\b(?!\s*\/|\s*por)/.test(n.despues) && !vel.includes(n));
    let t0 = null, d;
    if (tiempo) { t0 = /^\s*min/.test(tiempo.despues) ? tiempo.v.entre(60) : tiempo.v; d = v1.por(t0); }
    else if (vent) d = vent.v; else return null;
    if (v2.v <= v1.v) throw problema("El que sale después no es más rápido, así que nunca lo alcanza.");
    const dv = v2.menos(v1), t = d.entre(dv), dist = v2.por(t);
    const { p: ps, P } = pasos();
    P("Leemos el problema y anotamos los datos", "Los dos van en el mismo sentido. El primero tiene ventaja; el segundo, más velocidad.", [], tabla(["Dato", "Valor"], [["Velocidad del primero", m$(`${L(v1)}\\,${tx("km/h")}`)], ["Velocidad del segundo", m$(`${L(v2)}\\,${tx("km/h")}`)], t0 ? ["Sale antes", m$(`${aprox(t0)}\\,${tx("h")}`)] : ["Ventaja", m$(`${L(d)}\\,${tx("km")}`)]]));
    if (t0) P("Calculamos la ventaja", "Mientras el segundo todavía no salió, el primero avanza.", [`d=v\\cdot t=${L(v1)}\\cdot ${aprox(t0)}=${L(d)}\\,${tx("km")}`]);
    P("Elegimos la incógnita", "Llamamos $t$ al tiempo (en horas) desde que sale el segundo hasta que lo alcanza.", [`t=?`]);
    P("Planteamos la ecuación", "Cuando lo alcanza, los dos están en el mismo lugar: lo que recorre el segundo es la ventaja más lo que recorre el primero.", [`${L(v2)}\\,t=${L(d)}+${L(v1)}\\,t`]);
    P("Resolvemos", "Pasamos las $t$ a un lado: la diferencia de velocidades es lo que se acerca por hora.", [`${L(v2)}\\,t-${L(v1)}\\,t=${L(d)}`, `${L(dv)}\\,t=${L(d)}`, `t=\\frac{${L(d)}}{${L(dv)}}=${aprox(t)}\\,${tx("h")}`, `${tx("distancia")}=${L(v2)}\\cdot ${aprox(t)}=${aprox(dist)}\\,${tx("km")}`]);
    P("Verificamos en el enunciado", "En ese momento los dos tienen que estar a la misma distancia del punto de partida.", [`${tx("Primero: ")}${L(d)}+${L(v1)}\\cdot ${aprox(t)}=${aprox(d.mas(v1.por(t)))}\\,${tx("km")}`, `${tx("Segundo: ")}${L(v2)}\\cdot ${aprox(t)}=${aprox(dist)}\\,${tx("km")}${ok}`]);
    P("Respondemos con una oración", `Lo alcanza ${horasYMin(t)} después de salir el segundo, a ${m$(aprox(dist))} km del punto de partida.`);
    return { tema: "problemas", metodo: "Movimiento: alcance", pasos: ps, resultado: `t=${R(t)}\\,${tx("h")},\\;d=${R(dist)}\\,${tx("km")}`, area: "alg" };
  }

  /* =====================================================================
     6) Regla de tres simple (directa o inversa)
     ===================================================================== */
  const PERSONAS = /^(obrer|trabaj|person|pintor|albani|maqui|opera|canil|grifo|bomba|camio|emple|alumn|hombr|mujer|chico|nino|gente|cocin|amigo|equip|caball|vaca|anima|grupo)/;
  const TIEMPOS = /^(dia|hora|seman|minut|mes|ano|hs|h)$/;
  function reglaDeTres(orig, p) {
    if (!/(\?|cuant|que cantidad|calcul)/.test(p)) return null;
    if (/(%|por ciento|juntos|juntas|ambos|ambas|separad|edad|cabezas|promedio|repart|consecutiv|complement|suplement)/.test(p)) return null;
    if (/alcanz/.test(p) && /km\/h|km por hora/.test(p) && /(despues|ventaja)/.test(p)) return null;
    const ns = numeros(p).filter((n) => !n.frac);
    if (ns.length !== 3) return null;
    const u = ns.map((n) => (n.dinero ? "pesos" : unidad(n)));
    const ur = u.map((w) => raiz(w));
    let a1 = ns[0], b1 = ns[1], dado = ns[2], buscoB = true;
    if (ur[2] && ur[2] === ur[1] && ur[2] !== ur[0]) buscoB = false;
    if (!ur[2]) { const q = p.slice(p.lastIndexOf("cuant")).match(/cuant[oa]s?\s+([a-z]+)/); if (q && raiz(q[1]) === ur[0] && ur[0] !== ur[1]) buscoB = false; }
    const A = { u: u[0], v: a1.v }, B = { u: u[1], v: b1.v };
    if (!A.u || !B.u || ur[0] === ur[1]) return null;
    // ¿inversa?
    const esPer = (w) => PERSONAS.test(w), esTie = (w) => TIEMPOS.test(raiz(w));
    let inversa = /inversa/.test(p) || (esPer(A.u) && esTie(B.u)) || (esTie(A.u) && esPer(B.u)) ||
      (/km\/h|velocidad/.test(p) && (esTie(A.u) || esTie(B.u)) && !/(km|kilometros)$/.test(A.u + B.u)) || (/alcanza|dura/.test(p) && (esPer(A.u) || esPer(B.u)));
    if (/directa/.test(p)) inversa = false;
    const cual = buscoB ? B : A, otro = buscoB ? A : B;
    const nuevoOtro = dado.v;
    const x = inversa ? otro.v.por(cual.v).entre(nuevoOtro) : cual.v.por(nuevoOtro).entre(otro.v);
    const uO = (w, n) => { const ini = n.fin + (orig.slice(n.fin).match(/^\s*(?:de\s+)?/)[0].length); return w === "pesos" ? "$" : orig.slice(ini, ini + w.length); };
    const nomA = uO(u[0], ns[0]) || "A", nomB = uO(u[1], ns[1]) || "B";
    const nomC = buscoB ? nomB : nomA, nomO = buscoB ? nomA : nomB;
    const { p: ps, P } = pasos();
    P("Leemos el problema y anotamos los datos", "Ubicamos las dos magnitudes y armamos la tabla. La $x$ va donde está lo que nos preguntan.", [], tabla([esc(nomO), esc(nomC)], [[m$(L(otro.v)), m$(L(cual.v))], [m$(L(nuevoOtro)), m$("x")]]));
    P(inversa ? "Decidimos: es proporcionalidad inversa" : "Decidimos: es proporcionalidad directa",
      inversa ? `Si aumenta una magnitud, la otra disminuye (por ejemplo, más ${nomO} → menos ${nomC}). Entonces el producto se mantiene constante.`
        : `Si una magnitud aumenta, la otra aumenta en la misma proporción (el doble de ${nomO} → el doble de ${nomC}). Entonces el cociente se mantiene constante.`,
      inversa ? [`${L(otro.v)}\\cdot ${L(cual.v)}=${L(nuevoOtro)}\\cdot x`] : [`\\frac{${L(cual.v)}}{${L(otro.v)}}=\\frac{x}{${L(nuevoOtro)}}`]);
    P("Resolvemos", "Despejamos la $x$.", inversa ? [`x=\\frac{${L(otro.v)}\\cdot ${L(cual.v)}}{${L(nuevoOtro)}}=\\frac{${L(otro.v.por(cual.v))}}{${L(nuevoOtro)}}=${aprox(x)}`] : [`x=\\frac{${L(cual.v)}\\cdot ${L(nuevoOtro)}}{${L(otro.v)}}=\\frac{${L(cual.v.por(nuevoOtro))}}{${L(otro.v)}}=${aprox(x)}`]);
    P("Verificamos", inversa ? "El producto tiene que ser el mismo en las dos filas." : "El cociente tiene que ser el mismo en las dos filas.",
      inversa ? [`${L(otro.v)}\\cdot ${L(cual.v)}=${L(otro.v.por(cual.v))}`, `${L(nuevoOtro)}\\cdot ${aprox(x)}=${L(nuevoOtro.por(x))}${ok}`] : [`\\frac{${L(cual.v)}}{${L(otro.v)}}=\\frac{${aprox(x)}}{${L(nuevoOtro)}}=${aprox(cual.v.entre(otro.v))}${ok}`]);
    const nota = !x.entero && esPer(raiz(cual.u)) ? " Como no hay fracciones de personas, en la práctica se redondea hacia arriba." : "";
    P("Respondemos con una oración", (cual.u === "pesos" ? `El resultado es ${m$(din(x))}.` : `El resultado es ${m$(aprox(x))} ${nomC}.`) + nota);
    return { tema: "proporciones", metodo: inversa ? "Regla de tres simple inversa" : "Regla de tres simple directa", pasos: ps, resultado: `x=${R(x)}`, area: "arit" };
  }

  /* =====================================================================
     7) ¿Qué porcentaje…? (parte y total bien ubicados)
     ===================================================================== */
  function quePorcentaje(p) {
    if (!/(que|cual es el)\s+(porcentaje|por ?ciento|%)|(porcentaje|%)\s+(represent|corresponde|es)|que %/.test(p)) return null;
    const ns = numeros(p).filter((n) => !n.frac && !n.pct);
    if (ns.length !== 2) return null;
    let total = ns.find((n) => /(\bde|del total de|sobre|entre|un total de|de los|de las)\s*\$?\s*$/.test(n.antes) && !/(\?|que|cual)\s*$/.test(n.antes));
    // "de 30 alumnos aprobaron 24": el total es el que viene después de "de" al principio
    if (!total) total = ns.reduce((a, b) => (b.v.v > a.v.v ? b : a));
    const parte = ns.find((n) => n !== total);
    // "¿qué porcentaje es 30 de 120?": el de "de" es el total (ya)
    const pct = parte.v.por(100).entre(total.v);
    const { p: ps, P } = pasos();
    P("Leemos el problema y anotamos los datos", "Separamos la parte (lo que nos interesa) y el total (el 100 %).", [], tabla(["", "Valor"], [["Total (100 %)", m$(L(total.v))], ["Parte", m$(L(parte.v))]]));
    P("Planteamos", "El porcentaje es la parte dividida por el total, por 100.", [`\\%=\\frac{${tx("parte")}}{${tx("total")}}\\cdot 100`]);
    P("Resolvemos", "", [`\\frac{${L(parte.v)}}{${L(total.v)}}\\cdot 100=${aprox(pct)}\\%`]);
    P("Verificamos", "Calculamos ese porcentaje del total y tiene que dar la parte.", [`${aprox(pct)}\\%\\;${tx("de")}\\;${L(total.v)}=\\frac{${aprox(pct)}}{100}\\cdot ${L(total.v)}=${L(parte.v)}${ok}`]);
    P("Respondemos con una oración", `${m$(L(parte.v))} es el ${m$(aprox(pct) + "\\%")} de ${m$(L(total.v))}.`);
    return { tema: "razonamiento", metodo: "Parte sobre total por 100", pasos: ps, resultado: `${R(pct)}\\%`, area: "arit" };
  }

  /* =====================================================================
     8) Nota que falta para llegar a un promedio
     ===================================================================== */
  function promedioFaltante(p) {
    if (!/promedio/.test(p) || !/(necesit|tiene que|tengo que|debe|deberia|cuanto|que nota|minim|para (llegar|tener|alcanzar|sacar))/.test(p)) return null;
    if (!/(proxim|cuart|quint|tercer|ultim|siguiente|otra|falta|necesit|deb|tiene que|tengo que)/.test(p)) return null;
    const mt = p.match(/promedio(?:\s+(?:final|minimo|general))?\s*(?:de|igual a|mayor o igual a|de al menos|al menos)?\s*(\d+(?:[.,]\d+)?)/);
    if (!mt) return null;
    const objetivo = leerNum(mt[1]);
    const posObj = p.indexOf(mt[0]) + mt[0].lastIndexOf(mt[1]);
    const notas = numeros(p).filter((n) => !n.frac && n.i !== posObj && !/^\s*(pruebas|examenes|notas|evaluaciones|parciales|trimestres|materias|trabajos)/.test(n.despues));
    if (notas.length < 1) return null;
    const n = notas.length + 1, suma = notas.reduce((a, b) => a.mas(b.v), F(0));
    const x = objetivo.por(n).menos(suma);
    const { p: ps, P } = pasos();
    P("Leemos el problema y anotamos los datos", "Tenemos las notas que ya hay y el promedio que se quiere alcanzar.", [], tabla(["Notas que ya tiene", "Promedio buscado", "Cantidad de notas en total"], [[m$(notas.map((t) => L(t.v)).join(";\\;")), m$(L(objetivo)), m$(n)]]));
    P("Elegimos la incógnita", "Llamamos $x$ a la nota que falta.", [`x=?`]);
    P("Planteamos la ecuación", "El promedio es la suma de todas las notas dividida por la cantidad de notas.", [`\\frac{${notas.map((t) => L(t.v)).join("+")}+x}{${n}}=${L(objetivo)}`]);
    P("Resolvemos", `Multiplicamos los dos lados por ${n} y despejamos.`, [`${L(suma)}+x=${L(objetivo)}\\cdot ${n}=${L(objetivo.por(n))}`, `x=${L(objetivo.por(n))}-${L(suma)}=${aprox(x)}`]);
    P("Verificamos en el enunciado", "", [`\\frac{${L(suma)}+${aprox(x)}}{${n}}=\\frac{${L(objetivo.por(n))}}{${n}}=${L(objetivo)}${ok}`]);
    const extra = x.v > 10 ? " Como pasa de 10, con una sola nota no le alcanza para llegar a ese promedio." : x.v <= 0 ? " Ya tiene ese promedio asegurado aunque saque la nota mínima." : "";
    P("Respondemos con una oración", `Necesita sacar ${m$(aprox(x))} en la nota que falta.` + extra);
    return { tema: "razonamiento", metodo: "Nota necesaria para un promedio", pasos: ps, resultado: `x=${R(x)}`, area: "arit" };
  }

  /* =====================================================================
     9) Fracciones de un total: "gastó 1/3 y luego 1/4 de lo que le quedaba…"
     ===================================================================== */
  const FR_PAL = { "la mitad": F(1, 2), "un medio": F(1, 2), "un tercio": F(1, 3), "la tercera parte": F(1, 3), "un cuarto": F(1, 4), "la cuarta parte": F(1, 4),
    "un quinto": F(1, 5), "la quinta parte": F(1, 5), "un sexto": F(1, 6), "la sexta parte": F(1, 6), "un octavo": F(1, 8), "la octava parte": F(1, 8),
    "dos tercios": F(2, 3), "las dos terceras partes": F(2, 3), "tres cuartos": F(3, 4), "las tres cuartas partes": F(3, 4), "dos quintos": F(2, 5), "tres quintos": F(3, 5), "cuatro quintos": F(4, 5) };
  function fraccionesDelTotal(p) {
    if (!/(resto|restante|quedaba|queda|quedan|quedaron|quedo|sobra|sobran|sobro|sobraron|le faltan)/.test(p)) return null;
    const re = new RegExp(`(\\d+)\\s*\\/\\s*(\\d+)|\\b(${Object.keys(FR_PAL).join("|")})\\b`, "g");
    const fr = [...p.matchAll(re)].map((m) => {
      const v = m[1] ? F(+m[1], +m[2]) : FR_PAL[m[3]];
      const despues = p.slice(m.index + m[0].length, m.index + m[0].length + 45);
      return { v, i: m.index, fin: m.index + m[0].length, delResto: /^\s*(del|de lo|de la parte|de los|de las|de eso)?\s*(resto|restante|que (le )?(quedaba|quedo|sobraba|sobro)|que (les )?(quedaba|quedo)|sobrante)/.test(despues) };
    });
    if (!fr.length || fr.some((f) => f.v.v >= 1 || f.v.v <= 0)) return null;
    const enFraccion = (n) => fr.some((f) => n.i >= f.i && n.i < f.fin);
    const otros = numeros(p).filter((n) => !n.frac && !enFraccion(n) && !n.pct);
    if (otros.length !== 1) return null;
    const dato = otros[0];
    const pregunta = p.slice(Math.max(p.lastIndexOf("?") > 0 ? p.lastIndexOf("¿") : p.length - 60, 0));
    const haciaAdelante = /(queda|quedo|sobra|sobro|resta|falta)/.test(pregunta) && !/(tenia|habia|total|cobro|ganaba|era)/.test(pregunta);
    let resto = F(1); const filas = [], expr = [];
    for (const f of fr) {
      const parte = f.delResto ? f.v.por(resto) : f.v;
      filas.push([m$(L(f.v) + (f.delResto ? `\\;${tx("del resto")}\\;(${L(f.v)}\\cdot ${L(resto)})` : `\\;${tx("del total")}`)), m$(`${L(parte)}\\,x`), m$(`${L(resto.menos(parte))}\\,x`)]);
      expr.push(`${L(resto)}-${L(parte)}=${L(resto.menos(parte))}`);
      resto = resto.menos(parte);
    }
    if (resto.n <= 0) throw problema("Con esas fracciones no queda nada (o queda negativo). Revisá el enunciado.");
    const { p: ps, P } = pasos();
    if (haciaAdelante) {
      const T = dato.v, queda = T.por(resto);
      P("Leemos el problema y anotamos los datos", "Conocemos el total y las fracciones que se van sacando. Ojo: “del resto” se calcula sobre lo que queda, no sobre el total.", [`${tx("Total")}=${L(T)}`]);
      P("Calculamos qué fracción del total queda", "Llamamos $x$ al total y vamos restando cada parte.", expr, tabla(["Se saca", "Equivale a", "Queda"], filas));
      P("Resolvemos", "Multiplicamos esa fracción por el total.", [`${L(resto)}\\cdot ${L(T)}=${aprox(queda)}`]);
      P("Verificamos", "Sumamos lo que se sacó y lo que queda: tiene que dar el total.", [`${L(T.menos(queda))}+${L(queda)}=${L(T)}${ok}`]);
      P("Respondemos con una oración", `Quedan ${dato.dinero ? m$(din(queda)) : m$(aprox(queda))}.`);
      return { tema: "razonamiento", metodo: "Fracciones de un total", pasos: ps, resultado: `${R(queda)}`, area: "arit" };
    }
    const Q = dato.v, x = Q.entre(resto);
    P("Leemos el problema y anotamos los datos", "No conocemos el total. Sabemos qué fracciones se sacaron y cuánto quedó. Ojo: “del resto” se calcula sobre lo que queda, no sobre el total.", [`${tx("Queda")}=${L(Q)}`]);
    P("Elegimos la incógnita", "Llamamos $x$ al total que había al principio.", [`x=${tx("total")}`]);
    P("Calculamos qué fracción del total queda", "Vamos restando cada parte, siempre como fracción de $x$.", expr, tabla(["Se saca", "Equivale a", "Queda"], filas));
    P("Planteamos la ecuación", "Lo que queda (como fracción del total) es igual al dato.", [`${L(resto)}\\,x=${L(Q)}`]);
    P("Resolvemos", "Dividimos por la fracción (o multiplicamos por su inversa).", [`x=${L(Q)}:${L(resto)}=${L(Q)}\\cdot ${L(F(resto.d, resto.n))}=${aprox(x)}`]);
    let r = x; const ver = [];
    for (const f of fr) { const parte = f.delResto ? f.v.por(r) : f.v.por(x); ver.push(`${L(r)}-${L(parte)}=${L(r.menos(parte))}`); r = r.menos(parte); }
    P("Verificamos en el enunciado", "Hacemos el recorrido con el total que encontramos: tiene que quedar el dato.", ver.concat(`${L(r)}=${L(Q)}${ok}`));
    P("Respondemos con una oración", `Al principio había ${dato.dinero ? m$(din(x)) : m$(aprox(x))}.`);
    return { tema: "razonamiento", metodo: "Fracciones de un total (hacia atrás)", pasos: ps, resultado: `x=${R(x)}`, area: "arit" };
  }

  /* =====================================================================
     10) Geometría analítica con enunciado: punto medio, otro extremo, distancias,
         perímetro / área / tipo de triángulo, punto que divide en una razón, puntos alineados
     ===================================================================== */
  const RE_COORD = "(-?\\s*\\d+(?:[.,]\\d+)?(?:\\s*\\/\\s*\\d+)?)";
  function leerCoord(s) {
    s = s.replace(/\s/g, "");
    const neg = s.startsWith("-"); if (neg) s = s.slice(1);
    let v; if (s.includes("/")) { const [a, b] = s.split("/"); v = leerNum(a).entre(leerNum(b)); } else v = leerNum(s);
    return neg ? v.por(-1) : v;
  }
  function puntos(orig) {
    const out = [];
    const re = new RegExp(`(?:\\b([A-Z])(?:_?(\\d))?\\s*)?\\(\\s*${RE_COORD}\\s*([;,])\\s*${RE_COORD}\\s*\\)`, "g");
    let m;
    while ((m = re.exec(orig))) {
      // "(1,5; 2)" → coma decimal si hay punto y coma
      out.push({ nombre: m[1] ? m[1] + (m[2] ? `_${m[2]}` : "") : null, x: leerCoord(m[3]), y: leerCoord(m[5]), i: m.index, fin: m.index + m[0].length });
    }
    const libres = "ABCDEFGHPQRST".split("").filter((l) => !out.some((q) => q.nombre === l));
    out.forEach((q) => { if (!q.nombre) q.nombre = libres.shift(); });
    return out;
  }
  const Lp = (q) => `${q.nombre}(${L(q.x)},\\,${L(q.y)})`;
  const par = (f) => (f.n < 0 ? `(${L(f)})` : L(f));
  // raíz exacta de una fracción: devuelve {tex, v}
  function raizFr(f) {
    // √(n/d) = √(n·d)/d
    let n = f.n * f.d, d = f.d, fuera = 1;
    for (let k = 2; k * k <= n; k++) while (n % (k * k) === 0) { n /= k * k; fuera *= k; }
    const g = mcd(fuera, d); fuera /= g; d /= g;
    const v = (fuera * Math.sqrt(n)) / d;
    let tex = n === 1 ? String(fuera) : `${fuera === 1 ? "" : fuera}\\sqrt{${n}}`;
    if (d !== 1) tex = `\\frac{${tex}}{${d}}`;
    const ap = String(Math.round(v * 100) / 100).replace(".", "{,}");
    return { tex: n === 1 ? tex : `${tex}\\approx ${ap}`, v, exacto: n === 1 && d === 1 ? fuera : null, sola: tex };
  }
  function distPasos(A, B) {
    const dx = B.x.menos(A.x), dy = B.y.menos(A.y), d2 = dx.por(dx).mas(dy.por(dy)), r = raizFr(d2);
    return { d2, r, mates: [`d(${A.nombre},${B.nombre})=\\sqrt{(${L(B.x)}-${par(A.x)})^2+(${L(B.y)}-${par(A.y)})^2}`, `=\\sqrt{${par(dx)}^2+${par(dy)}^2}=\\sqrt{${L(dx.por(dx))}+${L(dy.por(dy))}}=\\sqrt{${L(d2)}}`, `=${r.tex}`] };
  }
  const FORM_MEDIO = "M=\\left(\\frac{x_1+x_2}{2}\\,;\\,\\frac{y_1+y_2}{2}\\right)", FORM_DIST = "d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}";
  function medio(A, B, nombre = "M") { return { nombre, x: A.x.mas(B.x).entre(2), y: A.y.mas(B.y).entre(2) }; }
  const RP = (q) => `${q.nombre}=(${R(q.x)};\\,${R(q.y)})`;
  function geometria(orig, p) {
    const pts = puntos(orig.replace(/[−–—]/g, "-"));
    if (pts.length < 2) return null;
    const { p: ps, P } = pasos();
    const geo = (metodo, resultado) => ({ tema: "uni", metodo, pasos: ps, resultado, area: "geo" });
    const cerca = (q, re) => re.test(plano(orig.slice(Math.max(0, q.i - 45), q.i)));
    // a) otro extremo conociendo un extremo y el punto medio
    if (/extremo/.test(p) && /medio/.test(p) && pts.length === 2) {
      let M = pts.find((q) => q.nombre === "M") || pts.find((q) => cerca(q, /medio[^()]*$/));
      if (!M) M = pts[1];
      const A = pts.find((q) => q !== M);
      const nB = ["B", "Q", "C", "R"].find((l) => l !== A.nombre && l !== M.nombre);
      const B = { nombre: nB, x: M.x.por(2).menos(A.x), y: M.y.por(2).menos(A.y) };
      P("Leemos el problema y anotamos los datos", `Conocemos un extremo ${m$(Lp(A))} y el punto medio ${m$(Lp(M))}. Buscamos el otro extremo ${m$(`${nB}(x,\\,y)`)}.`);
      P("Usamos la fórmula del punto medio", "Cada coordenada del punto medio es el promedio de las coordenadas de los extremos.", [FORM_MEDIO]);
      P("Planteamos una ecuación para cada coordenada", "", [`\\frac{${L(A.x)}+x}{2}=${L(M.x)}`, `\\frac{${L(A.y)}+y}{2}=${L(M.y)}`]);
      P("Resolvemos", "Multiplicamos por 2 y despejamos.", [`${L(A.x)}+x=${L(M.x.por(2))}\;\\Rightarrow\;x=${L(M.x.por(2))}-${par(A.x)}=${L(B.x)}`, `${L(A.y)}+y=${L(M.y.por(2))}\;\\Rightarrow\;y=${L(M.y.por(2))}-${par(A.y)}=${L(B.y)}`]);
      P("Verificamos", `Calculamos el punto medio entre ${A.nombre} y ${nB}: tiene que dar ${M.nombre}.`, [`\\left(\\frac{${L(A.x)}+${par(B.x)}}{2}\\,;\\,\\frac{${L(A.y)}+${par(B.y)}}{2}\\right)=(${L(M.x)},\\,${L(M.y)})${ok}`]);
      P("Respondemos", `El otro extremo del segmento es ${m$(Lp(B))}.`);
      return geo("Punto medio: otro extremo", RP(B));
    }
    // b) distancia de un punto al punto medio de un segmento
    if (/distancia/.test(p) && /medio/.test(p) && pts.length === 3) {
      // el punto suelto es el que aparece antes de "medio" o el que no está en el segmento
      const posMedio = plano(orig).indexOf("medio");
      let Pt = pts.find((q) => q.i < posMedio) || pts[0];
      const [A, B] = pts.filter((q) => q !== Pt);
      const M = medio(A, B);
      const dd = distPasos(Pt, M);
      P("Leemos el problema y anotamos los datos", `Tenemos el punto ${m$(Lp(Pt))} y el segmento de extremos ${m$(Lp(A))} y ${m$(Lp(B))}. Primero hay que encontrar el punto medio y después medir la distancia.`);
      P("Hallamos el punto medio del segmento", "Promediamos las coordenadas de los extremos.", [FORM_MEDIO, `M=\\left(\\frac{${L(A.x)}+${par(B.x)}}{2}\\,;\\,\\frac{${L(A.y)}+${par(B.y)}}{2}\\right)=(${L(M.x)},\\,${L(M.y)})`]);
      P(`Calculamos la distancia de ${Pt.nombre} a M`, "Usamos la fórmula de distancia entre dos puntos.", [FORM_DIST, ...dd.mates]);
      P("Respondemos", `La distancia entre ${Pt.nombre} y el punto medio de ${A.nombre}${B.nombre} es ${m$(dd.r.tex)} unidades.`);
      return geo("Punto medio y distancia", `d=${dd.r.sola}`);
    }
    // c) punto que divide un segmento en una razón
    if (/divid|divide|razon/.test(p) && /razon/.test(p) && pts.length === 2) {
      const mr = plano(orig).match(/razon\D{0,25}?(-?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|-?\d+\s*:\s*\d+)/);
      if (!mr) return null;
      let r = mr[1].includes(":") ? (([a, b]) => leerNum(a).entre(leerNum(b)))(mr[1].replace(/\s/g, "").split(":")) : leerCoord(mr[1]);
      const [A, B] = pts, uno = F(1).mas(r);
      if (uno.cero()) throw problema("Con razón −1 no existe ese punto.");
      const Q = { nombre: "P", x: A.x.mas(r.por(B.x)).entre(uno), y: A.y.mas(r.por(B.y)).entre(uno) };
      if (Q.nombre === A.nombre || Q.nombre === B.nombre) Q.nombre = "Q";
      P("Leemos el problema y anotamos los datos", `Extremos ${m$(Lp(A))} y ${m$(Lp(B))}; razón ${m$(`r=\\frac{${A.nombre}${Q.nombre}}{${Q.nombre}${B.nombre}}=${L(r)}`)}.`);
      P("Usamos la fórmula del punto que divide un segmento en una razón", "", [`x=\\frac{x_1+r\\,x_2}{1+r},\\qquad y=\\frac{y_1+r\\,y_2}{1+r}`]);
      P("Reemplazamos y resolvemos", "", [`x=\\frac{${L(A.x)}+${L(r)}\\cdot ${par(B.x)}}{1+${L(r)}}=${L(Q.x)}`, `y=\\frac{${L(A.y)}+${L(r)}\\cdot ${par(B.y)}}{1+${L(r)}}=${L(Q.y)}`]);
      P("Respondemos", `El punto buscado es ${m$(Lp(Q))}.`);
      return geo("Punto que divide un segmento en una razón", RP(Q));
    }
    // d) puntos alineados
    if (/(colineal|alinead|misma recta)/.test(p) && pts.length === 3) {
      const [A, B, C] = pts;
      const det = B.x.menos(A.x).por(C.y.menos(A.y)).menos(B.y.menos(A.y).por(C.x.menos(A.x)));
      const si = det.cero();
      P("Leemos el problema y anotamos los datos", `Los puntos son ${m$(Lp(A))}, ${m$(Lp(B))} y ${m$(Lp(C))}.`);
      P("Comparamos las pendientes", `Si ${A.nombre}${B.nombre} y ${A.nombre}${C.nombre} tienen la misma pendiente, los tres puntos están en la misma recta. Para no dividir por cero, comparamos los productos cruzados.`, [`(x_B-x_A)(y_C-y_A)-(y_B-y_A)(x_C-x_A)`, `=${par(B.x.menos(A.x))}\\cdot ${par(C.y.menos(A.y))}-${par(B.y.menos(A.y))}\\cdot ${par(C.x.menos(A.x))}=${L(det)}`]);
      P("Respondemos", si ? "Da 0: los tres puntos están alineados (son colineales)." : `Da ${m$(L(det))}, distinto de 0: los puntos no están alineados.`);
      return geo("Puntos alineados", si ? tx("Sí, son colineales") : tx("No son colineales"));
    }
    // e) triángulo: perímetro, área o clasificación
    if (/triangulo/.test(p) && pts.length === 3 && /(perimetro|area|superficie|tipo|clasific|isosceles|escaleno|equilatero|rectangulo)/.test(p)) {
      const [A, B, C] = pts;
      const lados = [[A, B], [B, C], [C, A]].map(([U, W]) => ({ U, W, ...distPasos(U, W) }));
      P("Leemos el problema y anotamos los datos", `Vértices: ${m$(Lp(A))}, ${m$(Lp(B))} y ${m$(Lp(C))}.`);
      P("Calculamos la longitud de cada lado", "Con la fórmula de distancia entre dos puntos.", [FORM_DIST, ...lados.map((l) => `\\overline{${l.U.nombre}${l.W.nombre}}=\\sqrt{${L(l.d2)}}${l.r.exacto !== null ? "=" + l.r.exacto : "\\approx " + String(Math.round(l.r.v * 100) / 100).replace(".", "{,}")}`)]);
      const res = [];
      if (/(perimetro)/.test(p)) {
        const per = lados.reduce((a, l) => a + l.r.v, 0);
        const todosEnteros = lados.every((l) => l.r.exacto !== null);
        P("Calculamos el perímetro", "Sumamos los tres lados.", [`${tx("Per")}=${lados.map((l) => l.r.exacto !== null ? l.r.exacto : `\\sqrt{${L(l.d2)}}`).join("+")}${todosEnteros ? "=" + per : "\\approx " + String(Math.round(per * 100) / 100).replace(".", "{,}")}`]);
        res.push(`${tx("Per")}${todosEnteros ? "=" + per : "\\approx " + String(Math.round(per * 100) / 100).replace(".", "{,}")}`);
      }
      if (/(area|superficie)/.test(p)) {
        const det = B.x.menos(A.x).por(C.y.menos(A.y)).menos(B.y.menos(A.y).por(C.x.menos(A.x)));
        const area = F(Math.abs(det.n), det.d).entre(2);
        P("Calculamos el área", "Usamos la fórmula del determinante (la mitad del valor absoluto).", [`A=\\frac{1}{2}\\left|(x_B-x_A)(y_C-y_A)-(y_B-y_A)(x_C-x_A)\\right|`, `=\\frac{1}{2}\\left|${par(B.x.menos(A.x))}\\cdot ${par(C.y.menos(A.y))}-${par(B.y.menos(A.y))}\\cdot ${par(C.x.menos(A.x))}\\right|=\\frac{1}{2}\\cdot ${L(F(Math.abs(det.n), det.d))}=${L(area)}`]);
        res.push(`A=${R(area)}`);
      }
      if (/(tipo|clasific|isosceles|escaleno|equilatero|rectangulo)/.test(p)) {
        const c2 = lados.map((l) => l.d2.v).sort((a, b) => a - b);
        const iguales = (c2[0] === c2[1]) + (c2[1] === c2[2]);
        const porLados = iguales === 2 ? "equilátero" : iguales === 1 ? "isósceles" : "escaleno";
        const rect = Math.abs(c2[0] + c2[1] - c2[2]) < 1e-9, obt = c2[0] + c2[1] < c2[2] - 1e-9;
        const porAng = rect ? "rectángulo" : obt ? "obtusángulo" : "acutángulo";
        P("Clasificamos el triángulo", "Por sus lados comparamos las longitudes; por sus ángulos comparamos el cuadrado del lado mayor con la suma de los cuadrados de los otros dos (Pitágoras).", [`${c2[0]}+${c2[1]}${rect ? "=" : obt ? "<" : ">"}${c2[2]}`]);
        res.push(tx(`${porLados} y ${porAng}`));
      }
      P("Respondemos", `Resultado: ${res.map((r) => m$(r)).join(" ; ")}.`);
      return geo("Triángulo dado por sus vértices", res.join(",\\;"));
    }
    // f) punto medio o distancia simple con puntos con nombre
    if (pts.length === 2 && /medio/.test(p) && !/distancia/.test(p)) {
      const [A, B] = pts, M = medio(A, B);
      P("Leemos el problema y anotamos los datos", `Extremos ${m$(Lp(A))} y ${m$(Lp(B))}.`);
      P("Usamos la fórmula del punto medio", "Promediamos las coordenadas.", [FORM_MEDIO, `M=\\left(\\frac{${L(A.x)}+${par(B.x)}}{2}\\,;\\,\\frac{${L(A.y)}+${par(B.y)}}{2}\\right)=(${L(M.x)},\\,${L(M.y)})`]);
      P("Respondemos", `El punto medio es ${m$(Lp(M))}.`);
      return geo("Punto medio de un segmento", RP(M));
    }
    if (pts.length === 2 && /distancia/.test(p) && !/medio/.test(p)) {
      const [A, B] = pts, dd = distPasos(A, B);
      P("Leemos el problema y anotamos los datos", `Puntos ${m$(Lp(A))} y ${m$(Lp(B))}.`);
      P("Calculamos la distancia", "Usamos la fórmula de distancia entre dos puntos (sale de Pitágoras).", [FORM_DIST, ...dd.mates]);
      P("Respondemos", `La distancia entre ${A.nombre} y ${B.nombre} es ${m$(dd.r.tex)} unidades.`);
      return geo("Distancia entre dos puntos", `d=${dd.r.sola}`);
    }
    return null;
  }

  /* =====================================================================
     11) Trigonometría con enunciado: triángulos (rectángulos y oblicuángulos), alturas con
         ángulo de elevación, sombras, dos observaciones, polígonos regulares, compás, dos edificios
     ===================================================================== */
  const RAD = Math.PI / 180;
  const sen = (g) => Math.sin(g * RAD), cos = (g) => Math.cos(g * RAD), tg = (g) => Math.tan(g * RAD);
  const asen = (x) => Math.asin(x) / RAD, acos = (x) => Math.acos(x) / RAD, atg = (x) => Math.atan(x) / RAD;
  const d2 = (v, n = 2) => { const r = Math.round(v * 10 ** n) / 10 ** n; return String(r).replace(".", "{,}"); };
  const g2 = (v) => `${d2(v)}^\\circ`;
  const SEN = "\\operatorname{sen}", TG = "\\operatorname{tg}";
  const numT = (s) => parseFloat(String(s).replace(",", "."));
  const RE_ANG = /(\d+(?:[.,]\d+)?)\s*(?:°|º|grados)/g;
  const RE_LONG = /(\d+(?:[.,]\d+)?)\s*(m|metros?|cm|centimetros?|km|kilometros?|mm|pies)\b/g;
  const angulosEn = (p) => [...p.matchAll(RE_ANG)].map((m) => ({ v: numT(m[1]), i: m.index }));
  const largosEn = (p) => [...p.matchAll(RE_LONG)].map((m) => ({ v: numT(m[1]), u: m[2].replace(/^metros?$/, "m").replace(/^centimetros?$/, "cm").replace(/^kilometros?$/, "km"), i: m.index }));
  const tri = (metodo, resultado, ps, tema = "rectangulos") => ({ tema, metodo, pasos: ps, resultado, area: "trig" });

  // --- resolución general de un triángulo con datos a, b, c, A, B, C ---
  function resolverTriangulo(datos, u, P) {
    const L3 = ["a", "b", "c"], A3 = ["A", "B", "C"], s = { ...datos };
    const op = (x) => x.toUpperCase(), lado = (X) => X.toLowerCase();
    let aviso = "";
    const ang0 = A3.filter((X) => s[X] !== undefined), lad0 = L3.filter((x) => s[x] !== undefined);
    const ssa = ang0.length === 1 && lad0.length === 2 && lad0.includes(lado(ang0[0]));
    for (let vuelta = 0; vuelta < 12; vuelta++) {
      const angC = A3.filter((X) => s[X] !== undefined), ladC = L3.filter((x) => s[x] !== undefined);
      if (angC.length === 3 && ladC.length === 3) break;
      if (angC.length === 2) {
        const X = A3.find((Y) => s[Y] === undefined); s[X] = 180 - angC.reduce((t, Y) => t + s[Y], 0);
        if (s[X] <= 0) throw problema("Los ángulos suman 180° o más: así no existe el triángulo.");
        P(`Calculamos el ángulo ${X}`, "Los tres ángulos de un triángulo suman 180°.", [`${X}=180^\\circ-${angC.map((Y) => g2(s[Y])).join("-")}=${g2(s[X])}`]);
        continue;
      }
      const recto = A3.find((X) => s[X] !== undefined && Math.abs(s[X] - 90) < 1e-9);
      if (recto && ladC.length === 2) {
        const h = lado(recto), falta = L3.find((x) => s[x] === undefined), otros = L3.filter((x) => x !== h);
        if (falta === h) { s[h] = Math.hypot(s[otros[0]], s[otros[1]]); P(`Calculamos la hipotenusa ${h} (Pitágoras)`, "En un triángulo rectángulo, la hipotenusa al cuadrado es la suma de los cuadrados de los catetos.", [`${h}=\\sqrt{${otros[0]}^2+${otros[1]}^2}=\\sqrt{${d2(s[otros[0]])}^2+${d2(s[otros[1]])}^2}=${d2(s[h])}\\,${u}`]); }
        else {
          const o = otros.find((x) => x !== falta);
          if (s[h] <= s[o]) throw problema("La hipotenusa tiene que ser el lado más largo: revisá los datos.");
          s[falta] = Math.sqrt(s[h] ** 2 - s[o] ** 2);
          P(`Calculamos el cateto ${falta} (Pitágoras)`, "Despejamos el cateto del teorema de Pitágoras.", [`${falta}=\\sqrt{${h}^2-${o}^2}=\\sqrt{${d2(s[h])}^2-${d2(s[o])}^2}=${d2(s[falta])}\\,${u}`]);
        }
        continue;
      }
      // dos lados y el ángulo comprendido → teorema del coseno
      const xFal = L3.find((x) => s[x] === undefined && s[op(x)] !== undefined && L3.filter((y) => y !== x).every((y) => s[y] !== undefined));
      if (xFal) {
        const [y, z] = L3.filter((w) => w !== xFal), X = op(xFal);
        s[xFal] = Math.sqrt(s[y] ** 2 + s[z] ** 2 - 2 * s[y] * s[z] * cos(s[X]));
        P(`Calculamos el lado ${xFal} (teorema del coseno)`, `Conocemos dos lados y el ángulo que forman entre ellos.`, [`${xFal}^2=${y}^2+${z}^2-2\\,${y}\\,${z}\\cos ${X}`, `${xFal}^2=${d2(s[y])}^2+${d2(s[z])}^2-2\\cdot ${d2(s[y])}\\cdot ${d2(s[z])}\\cdot\\cos ${g2(s[X])}=${d2(s[xFal] ** 2)}`, `${xFal}=${d2(s[xFal])}\\,${u}`]);
        continue;
      }
      const par = L3.find((x) => s[x] !== undefined && s[op(x)] !== undefined);
      if (ladC.length === 3 && !par) {
        const X = A3.find((Y) => s[Y] === undefined), x = lado(X), [y, z] = L3.filter((w) => w !== x);
        const c0 = (s[y] ** 2 + s[z] ** 2 - s[x] ** 2) / (2 * s[y] * s[z]);
        if (Math.abs(c0) > 1) throw problema("Con esos tres lados no se forma un triángulo (no cumple la desigualdad triangular).");
        s[X] = acos(c0);
        P(`Calculamos el ángulo ${X} (teorema del coseno)`, "Conocemos los tres lados: despejamos el coseno del ángulo.", [`\\cos ${X}=\\frac{${y}^2+${z}^2-${x}^2}{2\\,${y}\\,${z}}=\\frac{${d2(s[y])}^2+${d2(s[z])}^2-${d2(s[x])}^2}{2\\cdot ${d2(s[y])}\\cdot ${d2(s[z])}}=${d2(c0, 4)}`, `${X}=${g2(s[X])}`]);
        continue;
      }
      if (par) {
        const X = op(par), rec = Math.abs(s[X] - 90) < 1e-9;
        // lado que falta con su ángulo conocido
        const y = L3.find((w) => s[w] === undefined && s[op(w)] !== undefined);
        if (y) {
          const Y = op(y); s[y] = (s[par] * sen(s[Y])) / sen(s[X]);
          P(`Calculamos el lado ${y} (${rec ? "seno en el triángulo rectángulo" : "teorema del seno"})`, rec ? `En un triángulo rectángulo, ${"$" + SEN + " " + Y + "=\\frac{" + y + "}{" + par + "}$"} (cateto opuesto sobre hipotenusa).` : "Cada lado es proporcional al seno del ángulo opuesto.",
            rec ? [`${y}=${par}\\cdot ${SEN} ${Y}=${d2(s[par])}\\cdot ${SEN} ${g2(s[Y])}=${d2(s[y])}\\,${u}`] : [`\\frac{${y}}{${SEN} ${Y}}=\\frac{${par}}{${SEN} ${X}}`, `${y}=\\frac{${d2(s[par])}\\cdot ${SEN} ${g2(s[Y])}}{${SEN} ${g2(s[X])}}=${d2(s[y])}\\,${u}`]);
          continue;
        }
        const Y = A3.filter((W) => s[W] === undefined && s[lado(W)] !== undefined).sort((P1, P2) => s[lado(P1)] - s[lado(P2)])[0];
        if (Y) {
          const y2 = lado(Y), sv = (s[y2] * sen(s[X])) / s[par];
          if (sv > 1 + 1e-12) throw problema("Con esos datos no existe el triángulo (el seno daría mayor que 1).");
          s[Y] = asen(Math.min(1, sv));
          if (ssa && !rec && s[y2] > s[par] && s[Y] < 90) aviso = ` Atención: como ${y2} > ${par}, también podría existir otro triángulo con ${Y} = ${d2(180 - s[Y])}°.`;
          P(`Calculamos el ángulo ${Y} (${rec ? "seno en el triángulo rectángulo" : "teorema del seno"})`, rec ? "Cateto opuesto sobre hipotenusa." : "Despejamos el seno del ángulo.",
            [`${SEN} ${Y}=\\frac{${rec ? y2 : y2 + "\\cdot " + SEN + " " + X}}{${par}}=\\frac{${rec ? d2(s[y2]) : d2(s[y2]) + "\\cdot " + SEN + " " + g2(s[X])}}{${d2(s[par])}}=${d2(sv, 4)}`, `${Y}=${g2(s[Y])}`]);
          continue;
        }
      }
      throw problema("Faltan datos para resolver el triángulo: se necesitan tres datos y al menos uno tiene que ser un lado.");
    }
    return { s, aviso };
  }
  function datosTriangulo(orig, p) {
    const d = {};
    for (const m of orig.matchAll(/(?<![A-Za-zÁ-ú])([abc])\s*=\s*(\d+(?:[.,]\d+)?)/g)) d[m[1]] = numT(m[2]);
    for (const m of orig.matchAll(/(?<![A-Za-zÁ-ú])([ABC])\s*=\s*(\d+(?:[.,]\d+)?)\s*(?:°|º)?/g)) d[m[1]] = numT(m[2]);
    for (const m of orig.matchAll(/[áa]ngulo\s+([ABC])([ABC])([ABC])\s*(?:es|=|mide|de)?\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/gi)) d[m[2].toUpperCase()] = numT(m[4]);
    for (const m of orig.matchAll(/(?:distancia|lado|camino)\s+(?:de|entre)\s+([ABC])\s+(?:a|y)\s+([ABC])\s*(?:es|=|mide)?\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/gi)) {
      const fal = ["A", "B", "C"].find((X) => X !== m[1].toUpperCase() && X !== m[2].toUpperCase()); d[fal.toLowerCase()] = numT(m[3]);
    }
    const r = p.match(/rectangulo en (?:el )?(?:angulo |vertice )?([abc])\b/);
    if (r) d[r[1].toUpperCase()] = 90;
    return d;
  }

  function trigonometria(orig, p) {
    const o = orig.replace(/[−–—]/g, "-");
    const angs = angulosEn(p), longs = largosEn(p);
    const { p: ps, P } = pasos();
    const u0 = (longs[0] && longs[0].u) || "";
    const U = u0 ? `\\,${tx(u0)}` : "";

    // a) dos edificios: desde la azotea del alto y desde su base
    if (/edificio/.test(p) && /azotea/.test(p) && angs.length === 2 && longs.length >= 1) {
      const c = longs[0].v, posBase = p.search(/desde la base|desde el pie|base del mismo/);
      const aBe = posBase >= 0 ? (angs.find((x) => x.i > posBase) || angs[1]) : angs[1], al = (angs.find((x) => x !== aBe) || angs[0]).v, be = aBe.v;
      const hB = c * tg(be), dif = c / tg(al), hA = hB + dif;
      P("Leemos el problema y anotamos los datos", "Distancia entre los edificios, el ángulo desde la azotea del alto (medido desde la pared) y el ángulo de elevación desde su base.", [`c=${d2(c)}${U},\\quad \\alpha=${g2(al)},\\quad \\beta=${g2(be)}`]);
      P("Altura del edificio bajo", "Desde la base del alto se forma un triángulo rectángulo: cateto opuesto = altura del bajo, cateto adyacente = distancia.", [`${TG}\\,\\beta=\\frac{h_B}{c}\\Rightarrow h_B=${d2(c)}\\cdot ${TG}\\,${g2(be)}=${d2(hB)}${U}`]);
      P("Diferencia de alturas", "Desde la azotea, el ángulo se mide desde la pared: la distancia horizontal es el cateto opuesto y la diferencia de alturas el adyacente.", [`${TG}\\,\\alpha=\\frac{c}{h_A-h_B}\\Rightarrow h_A-h_B=\\frac{${d2(c)}}{${TG}\\,${g2(al)}}=${d2(dif)}${U}`]);
      P("Altura del edificio alto", "Sumamos.", [`h_A=${d2(hB)}+${d2(dif)}=${d2(hA)}${U}`]);
      P("Respondemos", `Sí, se puede. El edificio alto mide ${m$(d2(hA) + U)} y el bajo ${m$(d2(hB) + U)}.`);
      return tri("Dos edificios (tangente)", `h_A=${d2(hA)},\\;h_B=${d2(hB)}`, ps);
    }
    // b) polígono regular: radios inscrito y circunscrito
    const POL = { "triangulo equilatero": 3, cuadrado: 4, pentagono: 5, hexagono: 6, heptagono: 7, octagono: 8, octogono: 8, eneagono: 9, nonagono: 9, decagono: 10, dodecagono: 12 };
    const mp = p.match(/\b(triangulo equilatero|cuadrado|pentagono|hexagono|heptagono|octagono|octogono|eneagono|nonagono|decagono|dodecagono)\b/) || p.match(/poligono regular de (\d+) lados/);
    if (mp && /(inscrit|circunscrit|apotema|radio)/.test(p)) {
      const n = POL[mp[1]] || +mp[1], ml = p.match(/lados?\s+(?:que\s+)?(?:miden|mide|de)\s+(\d+(?:[.,]\d+)?)/) || p.match(/(\d+(?:[.,]\d+)?)\s*(?:m|cm|metros|centimetros)?\s*de lado/);
      if (!ml) return null;
      const l = numT(ml[1]), th = 180 / n, ap = l / (2 * tg(th)), R = l / (2 * sen(th));
      const uu = (p.slice(p.indexOf(ml[0])).match(/\b(m|metros|cm|centimetros|km)\b/) || [, ""])[1].replace("metros", "m").replace("centimetros", "cm"), UU = uu ? `\\,${tx(uu)}` : "";
      P("Leemos el problema y anotamos los datos", `Polígono regular de ${n} lados, cada lado mide ${m$(d2(l) + UU)}.`);
      P("Dividimos el polígono en triángulos", `Uniendo el centro con los vértices quedan ${n} triángulos isósceles iguales. El ángulo central de cada uno es 360°/${n}; trazando la apotema lo partimos en dos triángulos rectángulos.`, [`\\frac{360^\\circ}{${n}}=${g2(360 / n)},\\qquad \\frac{${g2(360 / n)}}{2}=${g2(th)}`]);
      P("Radio de la circunferencia inscrita (apotema)", "La apotema es el cateto adyacente al ángulo; medio lado es el opuesto.", [`${TG}\\,${g2(th)}=\\frac{l/2}{ap}\\Rightarrow ap=\\frac{${d2(l / 2)}}{${TG}\\,${g2(th)}}=${d2(ap)}${UU}`]);
      P("Radio de la circunferencia circunscrita", "El radio es la hipotenusa del mismo triángulo.", [`${SEN}\\,${g2(th)}=\\frac{l/2}{R}\\Rightarrow R=\\frac{${d2(l / 2)}}{${SEN}\\,${g2(th)}}=${d2(R)}${UU}`]);
      const extra = /(area|superficie)/.test(p) ? ` El área es ${m$(`\\frac{P\\cdot ap}{2}=\\frac{${d2(n * l)}\\cdot ${d2(ap)}}{2}=${d2((n * l * ap) / 2)}`)}.` : "";
      P("Respondemos", `Radio de la inscrita (apotema): ${m$(d2(ap) + UU)}. Radio de la circunscrita: ${m$(d2(R) + UU)}.` + extra);
      return tri("Polígono regular", `r=${d2(ap)},\\;R=${d2(R)}`, ps);
    }
    // c) compás o triángulo isósceles: dos lados iguales y el ángulo entre ellos
    if ((/compas/.test(p) || /lados iguales/.test(p)) && angs.length === 1 && longs.length >= 1) {
      const l = longs[0].v, t = angs[0].v, R = 2 * l * sen(t / 2);
      P("Leemos el problema y anotamos los datos", "Los dos brazos (lados iguales) y el ángulo que forman arman un triángulo isósceles. El lado que falta es el radio buscado.", [`${tx("brazos")}=${d2(l)}${U},\\quad ${tx("ángulo")}=${g2(t)}`]);
      P("Partimos el triángulo isósceles en dos rectángulos", "La altura desde el vértice divide al ángulo y a la base por la mitad.", [`\\frac{${g2(t)}}{2}=${g2(t / 2)}`]);
      P("Calculamos media base con el seno", "Cateto opuesto = brazo · seno del medio ángulo.", [`\\frac{R}{2}=${d2(l)}\\cdot ${SEN}\\,${g2(t / 2)}=${d2(R / 2)}`, `R=2\\cdot ${d2(R / 2)}=${d2(R)}${U}`]);
      P("Verificamos con el teorema del coseno", "", [`R^2=${d2(l)}^2+${d2(l)}^2-2\\cdot ${d2(l)}^2\\cos ${g2(t)}=${d2(R * R)}\\Rightarrow R=${d2(R)}`]);
      P("Respondemos", `El radio de la circunferencia es ${m$(d2(R) + U)}.`);
      return tri("Triángulo isósceles (seno del medio ángulo)", `R=${d2(R)}`, ps, "oblicuangulos");
    }
    // d) dos observaciones: me acerco/alejo una distancia y el ángulo cambia
    if (angs.length === 2 && longs.length >= 1 && /(acerca|aleja|avanza|retrocede|camina|caminamos|nos movemos|desplaz)/.test(p) && !/(sombra|azotea)/.test(p)) {
      const [t1, t2] = [Math.min(angs[0].v, angs[1].v), Math.max(angs[0].v, angs[1].v)], d = longs[0].v;
      const h = (d * tg(t1) * tg(t2)) / (tg(t2) - tg(t1)), x = h / tg(t2);
      P("Leemos el problema y anotamos los datos", "Desde lejos se ve con el ángulo menor; al acercarse, con el mayor. Llamamos h a la altura y x a la distancia desde el punto más cercano.", [`\\alpha=${g2(t1)},\\quad \\beta=${g2(t2)},\\quad d=${d2(d)}${U}`]);
      P("Planteamos dos ecuaciones con la tangente", "En cada triángulo rectángulo: tangente = altura / distancia horizontal.", [`${TG}\\,${g2(t2)}=\\frac{h}{x}\\Rightarrow h=x\\cdot ${TG}\\,${g2(t2)}`, `${TG}\\,${g2(t1)}=\\frac{h}{x+${d2(d)}}\\Rightarrow h=(x+${d2(d)})\\cdot ${TG}\\,${g2(t1)}`]);
      P("Igualamos y despejamos x", "", [`x\\cdot ${d2(tg(t2), 4)}=(x+${d2(d)})\\cdot ${d2(tg(t1), 4)}`, `x=\\frac{${d2(d)}\\cdot ${d2(tg(t1), 4)}}{${d2(tg(t2), 4)}-${d2(tg(t1), 4)}}=${d2(x)}${U}`]);
      P("Calculamos la altura", "", [`h=${d2(x)}\\cdot ${TG}\\,${g2(t2)}=${d2(h)}${U}`]);
      P("Respondemos", `La altura es ${m$(d2(h) + U)}. Desde el punto más cercano, la base está a ${m$(d2(x) + U)}.`);
      return tri("Dos ángulos de elevación", `h=${d2(h)}`, ps);
    }
    // e) triángulo con datos por letras o catetos/hipotenusa
    let datos = datosTriangulo(o, p);
    const mc = p.match(/catetos?\D{0,30}?(\d+(?:[.,]\d+)?)\s*(?:m|cm|metros)?\D{1,25}?(\d+(?:[.,]\d+)?)/);
    if (Object.keys(datos).length < 3 && /cateto/.test(p) && /rectangulo/.test(p)) {
      const mh = p.match(/hipotenusa\s*(?:mide|de|es|=)?\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/);
      if (mh) { const m1 = p.match(/cateto\s*(?:mide|de|es|=)?\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/); if (m1) datos = { A: 90, a: numT(mh[1]), b: numT(m1[1]) }; }
      else if (mc) datos = { A: 90, b: numT(mc[1]), c: numT(mc[2]) };
      if (datos.A === 90 && !datos.B && angs.length === 1 && Object.keys(datos).length === 2) { const ml = longs[0]; if (ml) datos.b = ml.v; }
    }
    const nd = Object.keys(datos).length, hayLado = ["a", "b", "c"].some((x) => datos[x] !== undefined);
    if (nd >= 3 && hayLado && /triangulo|ciudad|vertice|lado|cateto/.test(p)) {
      const u = u0 ? tx(u0) : "";
      const lista = Object.entries(datos).map(([k, v]) => (/[ABC]/.test(k) ? `${k}=${g2(v)}` : `${k}=${d2(v)}\\,${u}`)).join(",\\quad ");
      P("Leemos el problema y anotamos los datos", "Los lados se nombran con minúscula y cada uno es opuesto al ángulo de la misma letra en mayúscula.", [lista]);
      const recto = Object.values(datos).includes(90);
      const { s, aviso } = resolverTriangulo(datos, u, P);
      P("Verificamos", "Los ángulos suman 180° y el lado mayor está frente al ángulo mayor.", [`A+B+C=${d2(s.A)}+${d2(s.B)}+${d2(s.C)}=180^\\circ${ok}`]);
      P("Respondemos", `Lados: ${m$(`a=${d2(s.a)},\\;b=${d2(s.b)},\\;c=${d2(s.c)}`)}${u0 ? " " + u0 : ""}. Ángulos: ${m$(`A=${g2(s.A)},\\;B=${g2(s.B)},\\;C=${g2(s.C)}`)}.` + aviso);
      return tri(recto ? "Resolución de triángulo rectángulo" : "Resolución de triángulo (teoremas del seno y del coseno)", `a=${d2(s.a)},\\;b=${d2(s.b)},\\;c=${d2(s.c)},\\;A=${d2(s.A)}^\\circ,\\;B=${d2(s.B)}^\\circ,\\;C=${d2(s.C)}^\\circ`, ps, recto ? "rectangulos" : "oblicuangulos");
    }
    if (angs.length !== 1 && !(/sombra/.test(p) && longs.length === 2)) return null;
    const t = angs[0] && angs[0].v;
    // f) sombra
    if (/sombra/.test(p) && longs.length >= 1) {
      const lS = longs.find((l) => /sombra[^.]{0,25}$/.test(p.slice(Math.max(0, l.i - 30), l.i))) || (longs.length === 1 && !/(alto|altura|mide)\D{0,15}$/.test(p.slice(Math.max(0, longs[0].i - 20), longs[0].i)) ? longs[0] : null);
      const lH = longs.find((l) => l !== lS);
      if (lS && t !== undefined && !lH) {
        const h = lS.v * tg(t);
        P("Leemos el problema y anotamos los datos", "El objeto, su sombra y el rayo de sol forman un triángulo rectángulo. La sombra es el cateto adyacente al ángulo de elevación del sol; la altura es el opuesto.", [`${tx("sombra")}=${d2(lS.v)}${U},\\quad \\alpha=${g2(t)}`]);
        P("Elegimos la razón trigonométrica", "Relaciona cateto opuesto (altura) con cateto adyacente (sombra): la tangente.", [`${TG}\\,\\alpha=\\frac{h}{${tx("sombra")}}`]);
        P("Resolvemos", "", [`h=${d2(lS.v)}\\cdot ${TG}\\,${g2(t)}=${d2(lS.v)}\\cdot ${d2(tg(t), 4)}=${d2(h)}${U}`]);
        P("Respondemos", `La altura es ${m$(d2(h) + U)}.`);
        return tri("Sombra y ángulo de elevación (tangente)", `h=${d2(h)}`, ps);
      }
      if (lH && t !== undefined && !lS) {
        const s = lH.v / tg(t);
        P("Leemos el problema y anotamos los datos", "La altura es el cateto opuesto al ángulo del sol y la sombra el adyacente.", [`h=${d2(lH.v)}${U},\\quad \\alpha=${g2(t)}`]);
        P("Resolvemos con la tangente", "", [`${TG}\\,\\alpha=\\frac{h}{s}\\Rightarrow s=\\frac{${d2(lH.v)}}{${TG}\\,${g2(t)}}=${d2(s)}${U}`]);
        P("Respondemos", `La sombra mide ${m$(d2(s) + U)}.`);
        return tri("Sombra y ángulo de elevación (tangente)", `s=${d2(s)}`, ps);
      }
      if (lS && lH && t === undefined) {
        const a = atg(lH.v / lS.v);
        P("Leemos el problema y anotamos los datos", "Altura (cateto opuesto) y sombra (cateto adyacente).", [`h=${d2(lH.v)}${U},\\quad s=${d2(lS.v)}${U}`]);
        P("Resolvemos con la tangente", "", [`${TG}\\,\\alpha=\\frac{${d2(lH.v)}}{${d2(lS.v)}}=${d2(lH.v / lS.v, 4)}\\Rightarrow \\alpha=${g2(a)}`]);
        P("Respondemos", `El ángulo de elevación del sol es ${m$(g2(a))}.`);
        return tri("Sombra y ángulo de elevación (tangente)", `\\alpha=${d2(a)}^\\circ`, ps);
      }
      return null;
    }
    if (longs.length !== 1 || t === undefined) return null;
    const L0 = longs[0].v;
    // g) cuerda, escalera, cable… (hipotenusa) con ángulo
    if (/(cuerda|escalera|cable|hilo|rampa|tobogan|tirante|soga|cometa|barrilete|piolin|alambre|viga|tabla)/.test(p)) {
      const conPared = /(con la pared|con el muro|con la vertical)/.test(p);
      const h = conPared ? L0 * cos(t) : L0 * sen(t), b = conPared ? L0 * sen(t) : L0 * cos(t);
      const quiereBase = /(distancia|separ|pie|horizontal|base)/.test(p) && !/altura/.test(p);
      P("Leemos el problema y anotamos los datos", `Se forma un triángulo rectángulo: la ${(p.match(/(cuerda|escalera|cable|hilo|rampa|tobogan|tirante|soga|piolin|alambre|viga|tabla)/) || ["", "cuerda"])[1]} es la hipotenusa${conPared ? " y el ángulo se mide desde la pared" : " y el ángulo se mide desde el piso"}.`, [`${tx("hipotenusa")}=${d2(L0)}${U},\\quad \\alpha=${g2(t)}`]);
      P("Elegimos la razón trigonométrica", conPared ? "La altura es el cateto adyacente al ángulo: usamos el coseno." : "La altura es el cateto opuesto al ángulo: usamos el seno.", [conPared ? `\\cos\\alpha=\\frac{h}{${tx("hip")}}` : `${SEN}\\,\\alpha=\\frac{h}{${tx("hip")}}`]);
      P("Resolvemos", "", [`h=${d2(L0)}\\cdot ${conPared ? "\\cos" : SEN}\\,${g2(t)}=${d2(h)}${U}`, `${tx("distancia horizontal")}=${d2(L0)}\\cdot ${conPared ? SEN : "\\cos"}\\,${g2(t)}=${d2(b)}${U}`]);
      P("Respondemos", quiereBase ? `La distancia horizontal es ${m$(d2(b) + U)} (y la altura alcanzada, ${m$(d2(h) + U)}).` : `La altura es ${m$(d2(h) + U)}.`);
      return tri("Triángulo rectángulo (seno y coseno)", quiereBase ? `d=${d2(b)}` : `h=${d2(h)}`, ps);
    }
    // h) ángulo de elevación o depresión con una distancia
    if (/(elevacion|depresion|se ve|se observa|observa)/.test(p)) {
      const antes = p.slice(Math.max(0, longs[0].i - 30), longs[0].i + 30);
      const esAltura = /(altura|alto|de alto|mide|faro|torre de|edificio de|acantilado de)/.test(antes) && !/(de la base|del pie|distancia|se encuentra a|esta a|a\s*$)/.test(p.slice(Math.max(0, longs[0].i - 25), longs[0].i));
      if (esAltura) {
        const x = L0 / tg(t);
        P("Leemos el problema y anotamos los datos", "La altura es el cateto opuesto al ángulo y la distancia horizontal es el adyacente.", [`h=${d2(L0)}${U},\\quad \\alpha=${g2(t)}`]);
        P("Resolvemos con la tangente", "", [`${TG}\\,\\alpha=\\frac{h}{d}\\Rightarrow d=\\frac{${d2(L0)}}{${TG}\\,${g2(t)}}=${d2(x)}${U}`]);
        P("Respondemos", `La distancia horizontal es ${m$(d2(x) + U)}.`);
        return tri("Ángulo de elevación/depresión (tangente)", `d=${d2(x)}`, ps);
      }
      const h = L0 * tg(t);
      P("Leemos el problema y anotamos los datos", "La distancia horizontal es el cateto adyacente al ángulo y la altura el opuesto.", [`d=${d2(L0)}${U},\\quad \\alpha=${g2(t)}`]);
      P("Resolvemos con la tangente", "", [`${TG}\\,\\alpha=\\frac{h}{d}\\Rightarrow h=${d2(L0)}\\cdot ${TG}\\,${g2(t)}=${d2(h)}${U}`]);
      P("Respondemos", `La altura es ${m$(d2(h) + U)}.`);
      return tri("Ángulo de elevación/depresión (tangente)", `h=${d2(h)}`, ps);
    }
    return null;
  }

  /* ---------- detección ---------- */
  const TIPOS = [geometria, trigonometria, (o, p) => angulos(p), (o, p) => cabezasPatas(p), (o, p) => persecucion(p), (o, p) => promedioFaltante(p),
    (o, p) => fraccionesDelTotal(p), dosArticulos, dosPrecios, (o, p) => quePorcentaje(p), reglaDeTres];
  function resolver(texto) {
    const orig = String(texto || "").replace(/\s+/g, " ").trim();
    if (orig.split(" ").length < 5) return null;
    const p = plano(orig);
    for (const t of TIPOS) {
      const r = t(orig, p);
      if (r) return r;
    }
    return null;
  }
  window.MA_PROBLEMAS = { resolver, Fr };

  /* ---------- enganche con la calculadora ---------- */
  if (typeof window.resolverAhora !== "function") return;
  const original = window.resolverAhora;
  window.resolverAhora = function (metodo) {
    let texto = "", tf = null;
    try { texto = leerEntrada(); tf = typeof temaForzado !== "undefined" ? temaForzado : null; } catch (e) { return original.apply(this, arguments); }
    if (metodo || !texto || (tf && tf !== "problemas" && tf !== "proporciones" && tf !== "razonamiento")) return original.apply(this, arguments);
    let r = null;
    try { r = resolver(texto); } catch (e) {
      if (e && e.propio) { const er = document.getElementById("error"); if (er) er.textContent = e.message; const h = document.getElementById("hoja"); if (h) h.hidden = true; return; }
      r = null;
    }
    if (!r) return original.apply(this, arguments);
    const destino = r.area; delete r.area;
    (async () => {
      const er = document.getElementById("error");
      if (destino !== "arit" && window.MA_CALC && typeof MA_CALC.usar === "function") {
        try { if (!(await MA_CALC.usar())) return; } catch (e) { if (er) er.textContent = e.message; return; }
      }
      if (area !== destino && typeof cambiarArea === "function") {
        cambiarArea(destino);
        campoTexto.value = texto;
        if (typeof avisar === "function") avisar({ alg: "Es un problema con enunciado: lo resolvemos en Álgebra.", geo: "Lo resolvemos en Geometría analítica.", trig: "Lo resolvemos en Geometría y trigonometría.", arit: "Este problema se resuelve con aritmética (gratis)." }[destino] || "Problema reconocido.");
      }
      ultimaEntrada = texto;
      if (er) er.textContent = "";
      mostrarExito(texto, r, metodo);
      // si los temas del área todavía no cargaron, mostramos el nombre lindo del tema
      const NOMBRES = { rectangulos: "Triángulos rectángulos", oblicuangulos: "Triángulos oblicuángulos", uni: "Geometría analítica unidimensional", problemas: "Problemas con enunciado", proporciones: "Razones y proporciones", razonamiento: "Razonamiento aritmético" };
      const cab = document.querySelector("#cabecera b");
      if (cab && cab.textContent === r.tema && NOMBRES[r.tema]) cab.textContent = NOMBRES[r.tema];
    })();
  };
})();
