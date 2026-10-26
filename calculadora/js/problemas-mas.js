/* Calculadora Inteligente · más situaciones problemáticas (armadas a partir de guías reales de secundaria)
 *
 * Edades (suma, diferencia, "dentro de" / "hace"), inversión en dos fondos, ida y vuelta con dos velocidades,
 * rectángulo con perímetro o área, examen con puntos a favor y en contra, dos tipos con cantidades por unidad
 * (huerta, abono…), mezclas con costo total, fracciones de un total (con o sin cantidades), reparto proporcional,
 * acotar con "sobra / falta", ¿cuántos entran?, recta numérica, probabilidad condicional, globo (teorema del coseno).
 */
(function () {
  "use strict";
  const PR = window.MA_PROBLEMAS;
  if (!PR || !PR.h) return;
  const { F, leerNum, L, aprox, R, PESO, din, tx, m$, ok, tabla, pasos, problema, numeros, PALABRAS, d2, g2, cos, mcd } = PR.h;
  const Fr = PR.Fr;

  /* ---------- utilidades ---------- */
  const lin = (pares) => { let s = ""; for (const [c, v] of pares) { if (c.cero()) continue; const neg = c.n < 0, a = F(Math.abs(c.n), c.d), co = v && a.n === a.d ? "" : L(a); s += (neg ? "-" : s ? "+" : "") + co + (v ? (co && /\d$/.test(co) && /^\\/.test(v) ? "\\," : "") + v : ""); } return s || "0"; };
  const PAL = { ...PALABRAS, medio: F(1, 2), media: F(1, 2), "un cuarto": F(1, 4) };
  const veces = (w) => ({ doble: 2, triple: 3, cuadruple: 4, quintuple: 5, mitad: F(1, 2), "tercera parte": F(1, 3), "cuarta parte": F(1, 4) }[w]);
  const frDe = (v) => Fr.de(v);
  // sistema a1x+b1y=c1 ; a2x+b2y=c2 por sustitución, con pasos
  function sistema(e1, e2, P, X = "x", Y = "y") {
    const [a1, b1, c1] = e1, [a2, b2, c2] = e2;
    const det = a1.por(b2).menos(a2.por(b1));
    if (det.cero()) throw problema("Las dos condiciones del problema dicen lo mismo (o se contradicen): el sistema no tiene una única solución.");
    const x = c1.por(b2).menos(c2.por(b1)).entre(det), y = a1.por(c2).menos(a2.por(c1)).entre(det);
    P("Planteamos el sistema de ecuaciones", "Cada condición del enunciado es una ecuación.", [`\\begin{cases}${lin([[a1, X], [b1, Y]])}=${L(c1)}\\\\ ${lin([[a2, X], [b2, Y]])}=${L(c2)}\\end{cases}`]);
    // despejamos la variable con coeficiente ±1 si hay
    let desp = "x";
    if (!(a1.v === 1 || a1.v === -1) && (b1.v === 1 || b1.v === -1)) desp = "y";
    const m = [];
    if (desp === "x") {
      const k = F(1).entre(a1);
      m.push(`${X}=${lin([[c1.por(k), ""], [b1.por(k).por(-1), Y]])}`);
      m.push(`${lin([[a2, ""]])}\\,(${lin([[c1.por(k), ""], [b1.por(k).por(-1), Y]])})${b2.n < 0 ? "" : "+"}${lin([[b2, Y]])}=${L(c2)}`);
      const cy = b2.menos(a2.por(b1).por(k)), cc = c2.menos(a2.por(c1).por(k));
      const bk = b1.por(k).por(-1);
      m.push(`${lin([[cy, Y]])}=${L(cc)}\\;\\Rightarrow\\;${Y}=${aprox(y)}`, bk.cero() ? `${X}=${aprox(x)}` : `${X}=${L(c1.por(k))}${bk.n < 0 ? "-" : "+"}${L(F(Math.abs(bk.n), bk.d))}\\cdot ${aprox(y)}=${aprox(x)}`);
    } else {
      const k = F(1).entre(b1);
      m.push(`${Y}=${lin([[c1.por(k), ""], [a1.por(k).por(-1), X]])}`);
      const cx = a2.menos(b2.por(a1).por(k)), cc = c2.menos(b2.por(c1).por(k));
      m.push(`${lin([[a2, X]])}${b2.n < 0 ? "" : "+"}${lin([[b2, ""]])}\\,(${lin([[c1.por(k), ""], [a1.por(k).por(-1), X]])})=${L(c2)}`, `${lin([[cx, X]])}=${L(cc)}\\;\\Rightarrow\\;${X}=${aprox(x)}`, `${Y}=${aprox(y)}`);
    }
    P("Resolvemos por sustitución", `Despejamos ${desp === "x" ? X : Y} de la primera ecuación y lo reemplazamos en la segunda.`, m);
    P("Verificamos en el enunciado", "Reemplazamos los valores en las dos ecuaciones.", [`${lin([[a1, ""]])}\\cdot ${aprox(x)}${b1.n < 0 ? "-" : "+"}${L(F(Math.abs(b1.n), b1.d))}\\cdot ${aprox(y)}=${L(c1)}${ok}`, `${lin([[a2, ""]])}\\cdot ${aprox(x)}${b2.n < 0 ? "-" : "+"}${L(F(Math.abs(b2.n), b2.d))}\\cdot ${aprox(y)}=${L(c2)}${ok}`]);
    return { x, y };
  }
  const res = (metodo, resultado, ps, area = "alg", tema = "problemas") => ({ tema, metodo, pasos: ps, resultado, area });
  const frases = (p) => p.split(/(?<=[.;?!])\s+|\s+(?=¿)/);

  /* =====================================================================
     Edades
     ===================================================================== */
  const MAYORES = ["abuelo", "abuela", "padre", "madre", "papa", "mama", "tio", "tia", "profesor", "profesora", "jefe"];
  const MENORES = ["nieto", "nieta", "hijo", "hija", "sobrino", "sobrina", "alumno", "alumna"];
  function edades(orig, p) {
    if (!/edad|anos/.test(p) || /(cabezas|km\/h|%)/.test(p)) return null;
    const pm = (lista) => { let best = null; for (const w of lista) { const m = p.match(new RegExp(`\\b${w}s?\\b`)); if (m && (!best || m.index < best.i)) best = { w, i: m.index }; } return best; };
    let may = pm(MAYORES), men = pm(MENORES);
    const NOPROP = /^(La|El|Los|Las|Un|Una|Si|Hace|Dentro|Calcular|Calcula|Hallar|Halla|Cual|Cuál|Cuales|Cuáles|En|Se|Hoy|Entre|Dos|Sabiendo|Además|Cuántos|Cuantos|Qué|Que)$/;
    const propio = [...orig.matchAll(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/g)].map((m) => m[1]).find((w) => !NOPROP.test(w));
    const prop = propio || null;
    const nomMay = may ? orig.substr(may.i, may.w.length).toLowerCase() : men && prop ? prop : null;
    const nomMen = men ? orig.substr(men.i, men.w.length).toLowerCase() : prop;
    const art = (w) => (w && w === w.toLowerCase() ? (/a$/.test(w) ? "la " : "el ") + w : w);
    const X = art(nomMay) || "el mayor", Y = art(nomMen) || "el menor";
    const eqs = [], desc = [];
    const clausulas = frases(p).flatMap((f) => f.split(/\s+y\s+(?=(?:entre|hoy|la suma|dentro|hace|la diferencia|se llevan|juntos|juntas|ademas)\b)/));
    for (const f of clausulas) {
      const num = (re) => { const m = f.match(re); return m ? leerNum(m[1]) : null; };
      const fut = f.match(/dentro de (\d+) anos/), pas = f.match(/hace (\d+) anos/);
      const n = fut ? leerNum(fut[1]) : pas ? leerNum(pas[1]).por(-1) : F(0);
      const kw = f.match(/\b(doble|triple|cuadruple|quintuple|mitad|tercera parte|cuarta parte)\b/) || f.match(/(\d+) veces/);
      const S = num(/suma de (?:las |sus |ambas )?edades[^0-9]{0,40}?(\d+)/) || num(/entre (?:los|las|ambos|ambas) (?:dos )?(?:suman|tienen|juntan)[^0-9]{0,10}(\d+)/) || num(/(?:juntos|juntas) (?:suman|tienen)[^0-9]{0,10}(\d+)/);
      const D = num(/se llevan (\d+) anos/) || num(/diferencia de (?:las |sus )?edades[^0-9]{0,25}?(\d+)/) || num(/(\d+) anos mayor/) || num(/(\d+) anos (?:mas|menos) que/);
      if (S) { eqs.push([F(1), F(1), S.menos(n.por(2))]); desc.push(n.cero() ? `${tx("suma de las edades: ")}x+y=${L(S)}` : `(x${n.n > 0 ? "+" : ""}${L(n)})+(y${n.n > 0 ? "+" : ""}${L(n)})=${L(S)}`); }
      if (D && !S) { eqs.push([F(1), F(-1), D]); desc.push(`${tx("diferencia de edades: ")}x-y=${L(D)}`); }
      if (kw && !S && !D) {
        const k = kw[1] && /^\d/.test(kw[1]) ? leerNum(kw[1]) : frDe(veces(kw[1]));
        // x + n = k (y + n)  →  x − k·y = k·n − n
        const kk = k.v < 1 ? F(1).entre(k) : k;   // "la mitad": y = x/2 → x = 2y
        eqs.push([F(1), kk.por(-1), kk.por(n).menos(n)]);
        const ex = n.cero() ? "" : n.n > 0 ? `+${L(n)}` : L(n);
        desc.push(`${n.cero() ? tx("hoy: ") : n.n > 0 ? tx(`dentro de ${L(n)} años: `) : tx(`hace ${L(F(-n.n, n.d))} años: `)}x${ex}=${L(kk)}\\,(y${ex})`);
      }
    }
    const mq = p.match(/(dentro de|hace) cuantos anos/);
    if (mq) {
      const ed = [...p.matchAll(/(\d+)(?:\s*anos)?/g)].map((m) => leerNum(m[1])).filter((v) => v.v > 0);
      const kw = p.match(/\b(doble|triple|cuadruple|quintuple)\b/) || p.match(/(\d+) veces/);
      if (ed.length < 2 || !kw) return null;
      const k = /^\d/.test(kw[1]) ? leerNum(kw[1]) : frDe(veces(kw[1])), [a, b] = ed[0].v >= ed[1].v ? [ed[0], ed[1]] : [ed[1], ed[0]];
      const fut = mq[1] === "dentro de", n = fut ? a.menos(k.por(b)).entre(k.menos(1)) : k.por(b).menos(a).entre(k.menos(1));
      const { p: ps, P } = pasos();
      P("Elegimos la incógnita", `Llamamos $n$ a la cantidad de años. Hoy ${X} tiene ${m$(L(a))} y ${Y} ${m$(L(b))}.`);
      P("Planteamos la ecuación", fut ? "Dentro de n años los dos tendrán n años más." : "Hace n años los dos tenían n años menos.", [fut ? `${L(a)}+n=${L(k)}\\,(${L(b)}+n)` : `${L(a)}-n=${L(k)}\\,(${L(b)}-n)`]);
      P("Resolvemos", "Distribuimos y despejamos n.", [fut ? `${L(a)}+n=${L(k.por(b))}+${L(k)}n\\Rightarrow ${L(a.menos(k.por(b)))}=${L(k.menos(1))}n` : `${L(a)}-n=${L(k.por(b))}-${L(k)}n\\Rightarrow ${L(k.menos(1))}n=${L(k.por(b).menos(a))}`, `n=${aprox(n)}`]);
      if (n.n < 0) { P("Respondemos con una oración", fut ? "Da negativo: eso pasó en el pasado, no va a ocurrir en el futuro." : "Da negativo: eso va a pasar en el futuro, no ocurrió antes."); return res("Edades (ecuación)", `n=${R(n)}`, ps); }
      P("Verificamos", "", [fut ? `${L(a)}+${aprox(n)}=${aprox(a.mas(n))},\\quad ${L(b)}+${aprox(n)}=${aprox(b.mas(n))},\\quad ${aprox(a.mas(n))}=${L(k)}\\cdot ${aprox(b.mas(n))}${ok}` : `${L(a)}-${aprox(n)}=${aprox(a.menos(n))}=${L(k)}\\cdot ${aprox(b.menos(n))}${ok}`]);
      P("Respondemos con una oración", `${fut ? "Dentro de" : "Hace"} ${m$(aprox(n))} años.`);
      return res("Edades (ecuación)", `n=${R(n)}`, ps);
    }
    if (eqs.length !== 2) return null;
    const { p: ps, P } = pasos();
    P("Leemos el problema y elegimos las incógnitas", `Llamamos $x$ a la edad actual de ${X} y $y$ a la edad actual de ${Y}. Si el problema habla de "dentro de" o "hace", a las dos edades les sumamos o restamos esos años.`, desc);
    const { x, y } = sistema(eqs[0], eqs[1], P);
    if (x.n < 0 || y.n < 0) throw problema("Con esos datos una edad da negativa: revisá el enunciado.");
    P("Respondemos con una oración", `Hoy ${X} tiene ${m$(aprox(x))} años y ${Y} tiene ${m$(aprox(y))} años.`);
    return res("Edades (sistema de ecuaciones)", `x=${R(x)},\\;y=${R(y)}`, ps);
  }

  /* =====================================================================
     Inversión en dos fondos / dos tasas
     ===================================================================== */
  function inversion(orig, p) {
    if (!/(invert|fondo|plazo fijo|interes|rendimiento|ganancia|deposit|prest)/.test(p)) return null;
    const ns = numeros(p).filter((n) => !n.frac);
    const pct = ns.filter((n) => n.pct), plata = ns.filter((n) => !n.pct);
    if (pct.length !== 2 || plata.length !== 2) return null;
    const [C, G] = plata[0].v.v >= plata[1].v.v ? [plata[0].v, plata[1].v] : [plata[1].v, plata[0].v];
    const r1 = pct[0].v.entre(100), r2 = pct[1].v.entre(100);
    const nom = (i) => ((p.match(/fondo ([a-z])\b/g) || [])[i] || `la opción al ${L(pct[i].v)}%`).replace(/^fondo ([a-z])$/, (m, l) => `el fondo ${l.toUpperCase()}`);
    const { p: ps, P } = pasos();
    P("Leemos el problema y elegimos las incógnitas", `$x$ = dinero en ${nom(0)} (al ${L(pct[0].v)} %), $y$ = dinero en ${nom(1)} (al ${L(pct[1].v)} %).`, [`${L(pct[0].v)}\\%=${L(r1)},\\quad ${L(pct[1].v)}\\%=${L(r2)}`]);
    const { x, y } = sistema([F(1), F(1), C], [r1, r2, G], P);
    if (x.n < 0 || y.n < 0) throw problema("Con esas tasas no se puede lograr esa ganancia: revisá los datos.");
    P("Respondemos con una oración", `Tiene que invertir ${m$(din(x))} en ${nom(0)} y ${m$(din(y))} en ${nom(1)}.`);
    return res("Inversión en dos opciones (sistema)", `x=${R(x)},\\;y=${R(y)}`, ps);
  }

  /* =====================================================================
     Ida y vuelta (dos tramos) con dos velocidades y tiempo total
     ===================================================================== */
  function idaVuelta(orig, p) {
    if (!/(ida|vuelta|tramo|primera parte|segunda parte)/.test(p) || !/km\/h|km por hora/.test(p) || /alcanz/.test(p)) return null;
    const ns = numeros(p);
    const vel = ns.filter((n) => /^\s*(km\/h|km por hora)/.test(n.despues));
    const dist = ns.find((n) => /^\s*(km|kilometros)\b(?!\s*\/|\s*por)/.test(n.despues));
    const tiempo = ns.find((n) => /^\s*(h\b|hs\b|horas?)/.test(n.despues));
    if (vel.length !== 2 || !dist || !tiempo) return null;
    const [v1, v2] = vel.map((n) => n.v), D = dist.v, T = tiempo.v;
    const { p: ps, P } = pasos();
    P("Leemos el problema y elegimos las incógnitas", "Llamamos $x$ a la distancia del primer tramo (ida) e $y$ a la del segundo (vuelta). Como tiempo = distancia ÷ velocidad, el tiempo de cada tramo es x/v.", [`v_1=${L(v1)}\\,${tx("km/h")},\\quad v_2=${L(v2)}\\,${tx("km/h")},\\quad ${tx("total")}=${L(D)}\\,${tx("km")},\\quad T=${L(T)}\\,${tx("h")}`]);
    const { x, y } = sistema([F(1), F(1), D], [F(1).entre(v1), F(1).entre(v2), T], P);
    if (x.n < 0 || y.n < 0) throw problema("Con esas velocidades no se puede hacer el recorrido en ese tiempo: revisá los datos.");
    P("Respondemos con una oración", `La ida mide ${m$(aprox(x))} km (tarda ${m$(aprox(x.entre(v1)))} h) y la vuelta ${m$(aprox(y))} km (tarda ${m$(aprox(y.entre(v2)))} h).`);
    return res("Movimiento en dos tramos (sistema)", `x=${R(x)},\\;y=${R(y)}`, ps);
  }

  /* =====================================================================
     Rectángulo: un lado en función del otro y perímetro (o área)
     ===================================================================== */
  function rectangulo(orig, p) {
    if (!/rectangul/.test(p) || !/(perimetro|area|superficie)/.test(p)) return null;
    const lado = "(base|altura|largo|ancho|lado mayor|lado menor)";
    const m = p.match(new RegExp(`${lado}[^.]{0,30}?(\\d+(?:[.,]\\d+)?)\\s*(?:cm|m|metros|centimetros)?\\s*(mas|menos)\\s*(?:que|de)\\s*(?:su |la |el )?${lado}`)) ;
    const md = p.match(new RegExp(`${lado}[^.]{0,30}?(?:es |mide )?(?:el |la )?(doble|triple|cuadruple|mitad)\\s*(?:de|que)\\s*(?:su |la |el )?${lado}`));
    const per = p.match(/perimetro[^0-9]{0,25}?(\d+(?:[.,]\d+)?)/), ar = p.match(/(?:area|superficie)[^0-9]{0,25}?(\d+(?:[.,]\d+)?)/);
    if (!(m || md) || !(per || ar)) return null;
    const uni = (p.match(/\d\s*(cm|m|metros|centimetros)\b/) || [, ""])[1].replace("metros", "m").replace("centimetros", "cm");
    const U = uni ? `\\,${tx(uni)}` : "";
    let otro, base, k = F(1), d = F(0);
    if (m) { otro = m[1]; base = m[4]; d = leerNum(m[2]).por(m[3] === "menos" ? -1 : 1); } else { otro = md[1]; base = md[3]; k = frDe(veces(md[2])); }
    const { p: ps, P } = pasos();
    const expr = `${k.v === 1 ? "" : L(k)}x${d.cero() ? "" : (d.n > 0 ? "+" : "-") + L(F(Math.abs(d.n), d.d))}`;
    P("Elegimos la incógnita", `Llamamos $x$ a ${base === "lado menor" ? "el lado menor" : "la " + base}; ${otro === "lado mayor" ? "el lado mayor" : "la " + otro} se escribe en función de x.`, [`${tx(base)}=x,\\quad ${tx(otro)}=${expr}`]);
    let x;
    if (per) {
      const Pm = leerNum(per[1]);
      P("Planteamos la ecuación", "El perímetro es la suma de los cuatro lados: 2·base + 2·altura.", [`2x+2(${expr})=${L(Pm)}`, `${L(F(2).mas(k.por(2)))}x${d.cero() ? "" : (d.n > 0 ? "+" : "-") + L(F(Math.abs(d.n * 2), d.d))}=${L(Pm)}`]);
      x = Pm.menos(d.por(2)).entre(F(2).mas(k.por(2)));
      P("Resolvemos", "", [`x=${aprox(x)}`]);
    } else {
      const A = leerNum(ar[1]);
      // x (k x + d) = A  →  k x² + d x − A = 0
      const disc = d.por(d).mas(k.por(A).por(4));
      const rz = Math.sqrt(disc.v); x = F(Math.round(((-d.v + rz) / (2 * k.v)) * 1e6), 1e6);
      P("Planteamos la ecuación", "El área es base por altura: queda una ecuación cuadrática.", [`x\\,(${expr})=${L(A)}`, `${L(k)}x^2${d.cero() ? "" : (d.n > 0 ? "+" : "-") + L(F(Math.abs(d.n), d.d)) + "x"}-${L(A)}=0`]);
      P("Resolvemos con la fórmula resolvente", "Nos quedamos con la solución positiva (un lado no puede ser negativo).", [`x=\\frac{-b+\\sqrt{b^2-4ac}}{2a}=${aprox(x)}`]);
    }
    const y = k.por(x).mas(d);
    if (x.n <= 0 || y.n <= 0) throw problema("Con esos datos un lado da cero o negativo: revisá el enunciado.");
    P("Verificamos en el enunciado", "", [per ? `2\\cdot ${aprox(x)}+2\\cdot ${aprox(y)}=${aprox(x.mas(y).por(2))}${ok}` : `${aprox(x)}\\cdot ${aprox(y)}=${aprox(x.por(y))}${ok}`]);
    P("Respondemos con una oración", `${base[0].toUpperCase() + base.slice(1)}: ${m$(aprox(x) + U)}; ${otro}: ${m$(aprox(y) + U)}.`);
    return res("Rectángulo (ecuación)", `${tx(base)}=${R(x)},\\;${tx(otro)}=${R(y)}`, ps);
  }

  /* =====================================================================
     Examen con puntos a favor y en contra / dos tipos con cantidad total y valor por unidad
     ===================================================================== */
  const UNIDADES = { g: ["g", F(1)], gr: ["g", F(1)], gramo: ["g", F(1)], gramos: ["g", F(1)], kg: ["g", F(1000)], kilo: ["g", F(1000)], kilos: ["g", F(1000)], kilogramos: ["g", F(1000)], ml: ["ml", F(1)], l: ["ml", F(1000)], litro: ["ml", F(1000)], litros: ["ml", F(1000)], cm: ["cm", F(1)], m: ["cm", F(100)], metro: ["cm", F(100)], metros: ["cm", F(100)], min: ["min", F(1)], minutos: ["min", F(1)], h: ["min", F(60)], horas: ["min", F(60)] };
  function examen(orig, p) {
    if (!/(correct|bien|acierto)/.test(p) || !/(incorrect|mal|error|equivoc)/.test(p) || !/punto/.test(p)) return null;
    const val = (re) => { const m = p.match(re); if (!m) return null; const w = m[1]; return /^\d/.test(w) ? leerNum(w) : w === "medio" ? F(1, 2) : PAL[w] ? Fr.de(PAL[w]) : null; };
    const a = val(/(?:correct\w*|bien|acierto\w*)[^.]{0,30}?(?:suman?|valen?|dan|otorgan|se suman?)\s+(\d+(?:[.,]\d+)?|un|una|dos|tres|medio)\s+punto/) || F(1);
    const b = val(/(?:incorrect\w*|mal|error\w*)[^.]{0,30}?(?:restan?|descuentan?|quitan?|se restan?)\s+(\d+(?:[.,]\d+)?|un|una|dos|tres|medio)\s+(?:punto|medio)/) || val(/(?:restan?|descuentan?|quitan?)\s+(\d+(?:[.,]\d+)?|un|una|dos|tres|medio)\s+punto/);
    const N = (p.match(/(\d+)\s+preguntas/) || [])[1], T = (p.match(/(?:obtuvo|saco|consiguio|tiene|logro|total de)\s+(\d+(?:[.,]\d+)?)\s+puntos/) || [])[1];
    if (!b || !N || !T) return null;
    const n = leerNum(N), t = leerNum(T);
    const { p: ps, P } = pasos();
    P("Leemos el problema y elegimos las incógnitas", `$x$ = preguntas correctas (suman ${L(a)} cada una), $y$ = incorrectas (restan ${L(b)} cada una). Como hay que contestar todas, entre las dos suman ${L(n)}.`);
    const { x, y } = sistema([F(1), F(1), n], [a, b.por(-1), t], P);
    if (!x.entero || !y.entero || x.n < 0 || y.n < 0) throw problema("Con esos datos no sale una cantidad entera de preguntas: revisá el enunciado.");
    P("Respondemos con una oración", `Contestó ${m$(L(x))} preguntas correctas y ${m$(L(y))} incorrectas.`);
    return res("Sistema de ecuaciones (puntaje)", `x=${R(x)},\\;y=${R(y)}`, ps);
  }
  function cantidadesPorUnidad(orig, p) {
    // "360 plantas entre lechugas y acelgas. Cada lechuga necesita 40 g y cada acelga 90 g. En total 21,4 kg"
    const mN = p.match(/(\d+(?:\.\d{3})*)\s+([a-z]+)\s+(?:entre|de dos tipos|en total)/);
    const mc = [...p.matchAll(/cada\s+([a-z]+)[^.]{0,40}?(\d+(?:[.,]\d+)?)\s*([a-z]+)/g)];
    const mt = p.match(/(?:en total|total de|se usaron|se utilizaron|se gastaron|suman|pesan|en conjunto)[^0-9]{0,30}(\d+(?:[.,]\d+)?)\s*([a-z]+)/);
    if (!mN || mc.length < 2 || !mt) return null;
    const conv = (u) => UNIDADES[u] || [u, F(1)];
    const [u1, f1] = conv(mc[0][3]), [u2, f2] = conv(mc[1][3]), [ut, ft] = conv(mt[2]);
    if (u1 !== u2 || u1 !== ut) return null;
    const N = leerNum(mN[1]), v1 = leerNum(mc[0][2]).por(f1), v2 = leerNum(mc[1][2]).por(f2), T = leerNum(mt[1]).por(ft);
    if (v1.v === v2.v) return null;
    const ori = (w) => { const i = orig.toLowerCase().indexOf(w); return i >= 0 ? orig.substr(i, w.length) : w; };
    const A = ori(mc[0][1]), B = ori(mc[1][1]);
    const { p: ps, P } = pasos();
    const pasoU = !(f1.v === 1 && f2.v === 1 && ft.v === 1) ? [`${L(leerNum(mt[1]))}\\,${tx(mt[2])}=${L(T)}\\,${tx(u1)}`] : [];
    P("Leemos el problema y elegimos las incógnitas", `$x$ = cantidad de ${A}, $y$ = cantidad de ${B}.${pasoU.length ? " Antes pasamos todo a la misma unidad." : ""}`, pasoU);
    const { x, y } = sistema([F(1), F(1), N], [v1, v2, T], P);
    if (!x.entero || !y.entero || x.n < 0 || y.n < 0) throw problema("Con esos datos no sale una cantidad entera: revisá el enunciado.");
    P("Respondemos con una oración", `Hay ${m$(L(x))} de ${A} y ${m$(L(y))} de ${B}.`);
    return res("Sistema de ecuaciones (cantidad y total)", `x=${R(x)},\\;y=${R(y)}`, ps);
  }

  /* =====================================================================
     Mezcla donde se da el costo total (no el precio por kg)
     ===================================================================== */
  function mezclaCostoTotal(orig, p) {
    if (!/mezcl/.test(p) || !/(costo|costaron|cuesta en total|total|completa)/.test(p)) return null;
    const ns = numeros(p).filter((n) => !n.frac);
    const plata = ns.filter((n) => n.dinero), cants = ns.filter((n) => !n.dinero && /^\s*(kg|kilos?|litros?|l\b)/.test(n.despues));
    if (plata.length !== 3 || cants.length !== 1) return null;
    const ord = plata.slice().sort((a, b) => b.v.v - a.v.v), T = ord[0].v, Q = cants[0].v, pm = T.entre(Q);
    const [p1, p2] = [plata.find((n) => n !== ord[0]), plata.filter((n) => n !== ord[0])[1]];
    if (!(pm.v > Math.min(p1.v.v, p2.v.v) && pm.v < Math.max(p1.v.v, p2.v.v))) return null;
    const nom = (n) => { const m = orig.slice(Math.max(0, n.i - 30), n.i).match(/(?:variedad|tipo|calidad|clase)\s+([A-Za-z0-9]+)/i); return m ? `la variedad ${m[1]}` : `la de ${m$(din(n.v))}`; };
    const { p: ps, P } = pasos();
    P("Leemos el problema y elegimos las incógnitas", `$x$ = kg de ${nom(p1)}, $y$ = kg de ${nom(p2)}. Sabemos el total de kilos y lo que costó toda la mezcla.`);
    const { x, y } = sistema([F(1), F(1), Q], [p1.v, p2.v, T], P);
    if (x.n < 0 || y.n < 0) throw problema("Con esos datos una cantidad da negativa: revisá el enunciado.");
    P("Respondemos con una oración", `Se usaron ${m$(aprox(x))} kg de ${nom(p1)} y ${m$(aprox(y))} kg de ${nom(p2)} (la mezcla sale ${m$(din(pm))} el kg).`);
    return res("Sistema de ecuaciones (mezcla)", `x=${R(x)},\\;y=${R(y)}`, ps);
  }

  /* =====================================================================
     Fracciones de un total (con varias preguntas: fracción, porcentaje, total desde lo que queda)
     ===================================================================== */
  const FR_PAL = { "la mitad": F(1, 2), "un medio": F(1, 2), "un tercio": F(1, 3), "la tercera parte": F(1, 3), "un cuarto": F(1, 4), "la cuarta parte": F(1, 4), "un quinto": F(1, 5), "la quinta parte": F(1, 5), "dos tercios": F(2, 3), "las dos terceras partes": F(2, 3), "tres cuartos": F(3, 4), "las tres cuartas partes": F(3, 4), "dos quintos": F(2, 5), "tres quintos": F(3, 5) };
  function fracciones(orig, p) {
    const L = (x) => (x.d === 1 ? PR.h.L(x) : `${x.n < 0 ? "-" : ""}\\frac{${Math.abs(x.n)}}{${x.d}}`);
    const pc = (x) => `${d2(x.v * 100)}\\%`;
    const re = new RegExp(`(\\d+)\\s*\\/\\s*(\\d+)|\\b(${Object.keys(FR_PAL).join("|")})\\b`, "g");
    const fr = [...p.matchAll(re)].map((m) => { const v = m[1] ? F(+m[1], +m[2]) : FR_PAL[m[3]]; const desp = p.slice(m.index + m[0].length, m.index + m[0].length + 45); return { v, i: m.index, fin: m.index + m[0].length, delResto: /^\s*(del|de lo|de la parte|de los|de las|de eso)?\s*(resto|restante|que (le )?(quedaba|quedo|sobraba|sobro)|sobrante)/.test(desp) }; });
    if (fr.length < 2 || fr.some((f) => f.v.v >= 1)) return null;
    if (!/(resto|quedo|queda|quedan|sobr|del total|extra|saca|carg|gast|vend|usa)/.test(p)) return null;
    const enF = (n) => fr.some((f) => n.i >= f.i && n.i < f.fin);
    const otros = numeros(p).filter((n) => !n.frac && !enF(n) && !n.pct && !/^\s*%/.test(n.despues));
    if (otros.length > 1) return null;
    const { p: ps, P } = pasos();
    let resto = F(1); const filas = [], partes = [];
    for (const f of fr) { const parte = f.delResto ? f.v.por(resto) : f.v; partes.push(parte); filas.push([m$(L(f.v) + (f.delResto ? `\\;${tx("del resto")}` : `\\;${tx("del total")}`)), m$(f.delResto ? `${L(f.v)}\\cdot ${L(resto)}=${L(parte)}` : L(parte)), m$(L(resto.menos(parte)))]); resto = resto.menos(parte); }
    if (resto.n < 0) throw problema("Las fracciones suman más que el total: revisá el enunciado.");
    const usado = F(1).menos(resto);
    P("Pensamos todo como fracciones del total", "Tomamos el total como 1 (el entero). Ojo: “del resto” se calcula sobre lo que va quedando, no sobre el total.", [], tabla(["Se saca", "Fracción del total", "Queda"], filas));
    P("Sumamos lo que se sacó y lo que queda", "", [`${partes.map(L).join("+")}=${L(usado)}`, `1-${L(usado)}=${L(resto)}`]);
    P("Lo pasamos a porcentaje", "Multiplicamos la fracción por 100.", [`${L(usado)}\\cdot 100\\approx ${pc(usado)}\\quad ${tx("(se sacó)")}`, `${L(resto)}\\cdot 100\\approx ${pc(resto)}\\quad ${tx("(queda)")}`]);
    const extra = [];
    if (otros.length === 1) {
      const q = otros[0], antes = p.slice(Math.max(0, q.i - 30), q.i);
      if (/(quedan|quedaron|queda|quedo|sobran|sobraron|sobra|restan)\s*(aun\s*)?\$?\s*$/.test(antes) || /aun quedan/.test(antes)) {
        const total = q.v.entre(resto);
        P("Calculamos el total a partir de lo que queda", `Lo que queda es ${m$(L(resto))} del total: dividimos por esa fracción.`, [`${L(resto)}\\cdot x=${L(q.v)}\\Rightarrow x=${L(q.v)}:${L(resto)}=${aprox(total)}`]);
        extra.push(`el total es ${m$(q.dinero ? din(total) : aprox(total))}`);
      } else {
        const total = q.v;
        P("Calculamos cada parte con el total", "", partes.map((pt, i) => `${L(pt)}\\cdot ${L(total)}=${aprox(pt.por(total))}`).concat(`${tx("queda: ")}${L(resto)}\\cdot ${L(total)}=${aprox(resto.por(total))}`));
        extra.push(`queda ${m$(q.dinero ? din(resto.por(total)) : aprox(resto.por(total)))}`);
      }
    }
    const segunda = partes.length > 1 ? `La segunda parte es ${m$(L(partes[1]))} del total. ` : "";
    P("Respondemos con una oración", `${segunda}En total se sacó ${m$(L(usado))} (${m$(pc(usado))}) y queda ${m$(L(resto))} (${m$(pc(resto))})${extra.length ? "; " + extra.join("; ") : ""}.`);
    return res("Fracciones de un total", `${tx("queda")}=${R(resto)}`, ps, "arit", "racionales");
  }

  /* =====================================================================
     Reparto proporcional (directo o inverso)
     ===================================================================== */
  function reparto(orig, p) {
    if (!/(repart|distribu|divid)/.test(p) || !/proporci/.test(p)) return null;
    const ns = numeros(p).filter((n) => !n.frac && !n.pct);
    if (ns.length < 3) return null;
    const total = ns.find((n) => n.dinero) || ns[0], partes = ns.filter((n) => n !== total);
    const inv = /inversa/.test(p);
    const w = partes.map((n) => (inv ? F(1).entre(n.v) : n.v)), suma = w.reduce((a, b) => a.mas(b), F(0));
    const k = total.v.entre(suma), vals = w.map((x) => x.por(k));
    const { p: ps, P } = pasos();
    P("Leemos el problema", `Hay que repartir ${m$(total.dinero ? din(total.v) : L(total.v))} en partes ${inv ? "inversamente" : "directamente"} proporcionales a ${partes.map((n) => m$(L(n.v))).join(", ")}.${inv ? " En el reparto inverso, le toca más al que tiene el número menor: usamos los inversos." : ""}`);
    P(inv ? "Sumamos los inversos" : "Sumamos las partes", "", [`${w.map(L).join("+")}=${L(suma)}`]);
    P("Calculamos la constante de proporcionalidad", "Es lo que le toca a cada “parte”.", [`k=\\frac{${L(total.v)}}{${L(suma)}}=${aprox(k)}`]);
    P("Calculamos lo que le toca a cada uno", "", w.map((x, i) => `${L(x)}\\cdot ${aprox(k)}=${aprox(vals[i])}`));
    P("Verificamos", "La suma de las partes tiene que dar el total.", [`${vals.map(aprox).join("+")}=${L(total.v)}${ok}`]);
    P("Respondemos con una oración", `Le corresponde ${vals.map((v, i) => `${m$(total.dinero ? din(v) : aprox(v))} al de ${m$(L(partes[i].v))}`).join(" y ")}.`);
    return res(inv ? "Reparto inversamente proporcional" : "Reparto directamente proporcional", vals.map(R).join(",\\;"), ps, "arit", "proporciones");
  }

  /* =====================================================================
     Acotar con "sobra" y "falta": ¿cuántos eran?
     ===================================================================== */
  function sobraFalta(orig, p) {
    if (!/sobra/.test(p) || !/falta/.test(p)) return null;
    const plata = numeros(p).filter((n) => n.dinero);
    if (plata.length !== 3) return null;
    const M = plata.reduce((a, b) => (b.v.v > a.v.v ? b : a));
    const otros = plata.filter((n) => n !== M);
    const sob = otros.find((n) => /sobra/.test(p.slice(n.fin, n.fin + 40))) || otros[0], fal = otros.find((n) => n !== sob);
    const lo = M.v.entre(fal.v), hi = M.v.entre(sob.v);
    const cand = []; for (let n = Math.floor(lo.v) + 1; n < hi.v; n++) cand.push(n);
    const { p: ps, P } = pasos();
    P("Planteamos las dos condiciones", "Llamamos $n$ a la cantidad. Si con el precio más barato sobra, el gasto es menor que el dinero; si con el más caro falta, el gasto es mayor.", [`${L(sob.v)}\\,n<${L(M.v)}\\quad ${tx("y")}\\quad ${L(fal.v)}\\,n>${L(M.v)}`]);
    P("Despejamos n en cada una", "", [`n<\\frac{${L(M.v)}}{${L(sob.v)}}=${aprox(hi)}\\qquad n>\\frac{${L(M.v)}}{${L(fal.v)}}=${aprox(lo)}`, `${aprox(lo)}<n<${aprox(hi)}`]);
    if (!cand.length) throw problema("No hay ningún número entero que cumpla las dos condiciones: revisá los datos.");
    P("Buscamos los números enteros en ese intervalo", "La cantidad de personas tiene que ser un número entero.", [`n=${cand.join(",\\;")}`]);
    const amigas = /amig|companer|herman|primos/.test(p) && /(sus amig|y sus|con sus)/.test(p);
    P("Respondemos con una oración", cand.length === 1 ? `Son ${m$(cand[0])} entradas${amigas ? `: fueron ${m$(cand[0] - 1)} amigas además de ella` : ""}.` : `Pueden ser ${cand.join(", ")}.`);
    return res("Inecuaciones (acotar una cantidad)", `n=${cand.join(",\\;")}`, ps, "alg", "desigualdades");
  }

  /* =====================================================================
     ¿Cuántos entran / cuántos hacen falta? (con conversión de unidades)
     ===================================================================== */
  function cuantosEntran(orig, p) {
    if (!/cuant/.test(p) || !/(como minimo|como maximo|necesit|entran|alcanza|caben|hacen falta|se pueden)/.test(p)) return null;
    const L1 = [...p.matchAll(/(\d+(?:[.,]\d+)?)\s*(km|metros?|m|cm|mm|litros?|l|ml|kg|kilos?|g|gramos?)\b/g)];
    if (L1.length !== 2) return null;
    const conv = (u) => { const t = { km: [100000, "cm"], metro: [100, "cm"], metros: [100, "cm"], m: [100, "cm"], cm: [1, "cm"], mm: [0.1, "cm"], litro: [1000, "ml"], litros: [1000, "ml"], l: [1000, "ml"], ml: [1, "ml"], kg: [1000, "g"], kilo: [1000, "g"], kilos: [1000, "g"], g: [1, "g"], gramo: [1, "g"], gramos: [1, "g"] }[u]; return t; };
    const [a, b] = L1.map((m) => ({ v: leerNum(m[1]), u: m[2], c: conv(m[2]) }));
    if (!a.c || !b.c || a.c[1] !== b.c[1]) return null;
    const va = a.v.por(F(Math.round(a.c[0] * 10), 10)), vb = b.v.por(F(Math.round(b.c[0] * 10), 10));
    const [grande, chico] = va.v >= vb.v ? [va, vb] : [vb, va];
    const q = grande.entre(chico), ent = Math.floor(q.v + 1e-9), minimo = /(como minimo|necesit|hacen falta)/.test(p);
    const r = q.entero ? q.n : minimo ? ent + 1 : ent;
    const { p: ps, P } = pasos();
    P("Pasamos todo a la misma unidad", "", [`${L(a.v)}\\,${tx(a.u)}=${L(va)}\\,${tx(a.c[1])},\\quad ${L(b.v)}\\,${tx(b.u)}=${L(vb)}\\,${tx(b.c[1])}`]);
    P("Dividimos", "Vemos cuántas veces entra la cantidad chica en la grande.", [`${L(grande)}:${L(chico)}=${aprox(q)}`]);
    if (!q.entero) P(minimo ? "Redondeamos para arriba" : "Redondeamos para abajo", minimo ? "Como se necesita cubrir todo, no alcanza con una parte: se redondea al entero siguiente." : "Solo cuentan los que entran completos.", [`${aprox(q)}\\to ${r}`]);
    P("Respondemos con una oración", `${minimo ? "Como mínimo hacen falta" : "Entran"} ${m$(r)}.`);
    return res("¿Cuántos entran? (división con unidades)", `${r}`, ps, "arit", "metrico");
  }

  /* =====================================================================
     Recta numérica: distancia, enteros entre dos números, moverse
     ===================================================================== */
  function rectaNumerica(orig, p) {
    const o = orig.replace(/[−–—]/g, "-");
    const nums = [...o.matchAll(/-?\d+(?:[.,]\d+)?/g)].map((m) => leerNum(m[0].replace("-", "")).por(m[0].startsWith("-") ? -1 : 1));
    const { p: ps, P } = pasos();
    if (/distancia/.test(p) && nums.length === 2 && !/(km|metros|punto [a-z]\b|\()/.test(p)) {
      const [a, b] = nums, d = b.menos(a); const D = F(Math.abs(d.n), d.d);
      P("Usamos la distancia en la recta", "La distancia entre dos números es el valor absoluto de su diferencia (siempre positiva).", [`d=|${L(b)}-(${L(a)})|=|${L(d)}|=${L(D)}`]);
      P("Respondemos con una oración", `La distancia entre ${m$(L(a))} y ${m$(L(b))} es ${m$(L(D))}.`);
      return res("Distancia en la recta numérica", L(D), ps, "arit", "enteros");
    }
    if (/cuantos (numeros )?enteros hay entre/.test(p) && nums.length === 2) {
      const [a, b] = nums.map((x) => x.v).sort((x, y) => x - y), lista = []; for (let k = Math.floor(a) + 1; k < b; k++) lista.push(k);
      P("Contamos los enteros que están entre los dos (sin contarlos a ellos)", "", [lista.join(",\\;")]);
      P("Respondemos con una oración", `Hay ${m$(lista.length)} números enteros entre ${m$(a)} y ${m$(b)}.`);
      return res("Enteros entre dos números", `${lista.length}`, ps, "arit", "enteros");
    }
    if (/(te mueves|me muevo|avanz|retroced|te desplazas)/.test(p) && /unidades/.test(p) && nums.length === 2) {
      const [a, s] = nums, der = /derecha|adelante|avanz/.test(p), f = der ? a.mas(s) : a.menos(s);
      P("Movernos en la recta numérica", der ? "Hacia la derecha se suma." : "Hacia la izquierda se resta.", [`${L(a)}${der ? "+" : "-"}${L(s)}=${L(f)}`]);
      P("Respondemos con una oración", `Terminás en ${m$(L(f))}.`);
      return res("Movimiento en la recta numérica", L(f), ps, "arit", "enteros");
    }
    return null;
  }

  /* =====================================================================
     Probabilidad condicional con porcentajes
     ===================================================================== */
  const VACIAS = new Set("el la los las de del a al y que le les un una unos unas en se han ha aprobado aprobaron aprobo gusta gustan tiene tienen son es estudiantes alumnos amigos tus sus colegio escuela personas tambien ademas mientras".split(" "));
  function condicional(orig, p) {
    if (!/probabilidad/.test(p)) return null;
    const pcts = numeros(p).filter((n) => n.pct);
    if (pcts.length < 2 || pcts.length > 3) return null;
    const ctx = (n) => { const fin = p.indexOf("%", n.i) + 1; const s = p.slice(fin, fin + 70).split(/[.,;]|\s(?:mientras|y el|y al|ademas)\s/)[0]; return s; };
    const palabras = (s) => s.split(/[^a-z]+/).filter((w) => w.length > 3 && !VACIAS.has(w));
    const items = pcts.map((n) => { const c = ctx(n), w = palabras(c); return { n, v: n.v.entre(100), c, w, conj: /\by\b|ambas|ambos|las dos/.test(c) || /(?:^|\s)y\s/.test(p.slice(Math.max(0, n.i - 50), n.i).slice(-50)) && /\by\b/.test(c) }; });
    // la intersección: la que menciona dos cosas ("historia y matemática") o la menor si son 2
    let inter = items.find((it) => /\by\b/.test(it.c) && it.w.length >= 2) || (items.length === 2 ? items.reduce((a, b) => (b.v.v < a.v.v ? b : a)) : null);
    if (!inter) return null;
    const simples = items.filter((it) => it !== inter);
    const cond = p.split(/\bsi\b|dado que|sabiendo que|que a un|que le gust|habiendo/).slice(1).join(" ");
    if (!cond) return null;
    let dado = simples.find((it) => it.w.some((w) => cond.includes(w.slice(0, 5))));
    if (!dado && simples.length === 1) dado = simples[0];
    if (!dado) return null;
    const otraW = inter.w.find((w) => !dado.w.some((d) => d.slice(0, 5) === w.slice(0, 5))) || "el otro suceso";
    const dadoW = dado.w[0] || "la condición";
    const r = inter.v.entre(dado.v);
    const { p: ps, P } = pasos();
    P("Identificamos los sucesos", `A = “${otraW}”, B = “${dadoW}” (lo que ya sabemos que pasó).`, [`P(A\\cap B)=${L(inter.n.v)}\\%=${L(inter.v)}`, `P(B)=${L(dado.n.v)}\\%=${L(dado.v)}`]);
    P("Usamos la probabilidad condicional", "Si ya sabemos que pasó B, el “total” pasa a ser B: dividimos los casos en que pasan las dos cosas por los casos de B.", [`P(A\\mid B)=\\frac{P(A\\cap B)}{P(B)}=\\frac{${L(inter.v)}}{${L(dado.v)}}=${aprox(r)}`]);
    P("Respondemos con una oración", `La probabilidad es ${m$(aprox(r))}, es decir, aproximadamente ${m$(d2(r.v * 100) + "\\%")}.`);
    return res("Probabilidad condicional", `P(A\\mid B)=${R(r)}`, ps, "est", "condicional");
  }

  /* =====================================================================
     Globo (o avión) que ve dos puntos en lados opuestos: teorema del coseno
     ===================================================================== */
  function globo(orig, p) {
    if (!/(globo|avion|helicoptero|dron|torre|faro|cima|edificio)/.test(p) || !/(otro lado|lados opuestos|distancia entre|distancia de)/.test(p)) return null;
    const ang = [...p.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:°|º|grados)/g)].map((m) => parseFloat(m[1].replace(",", ".")));
    const dis = [...p.matchAll(/(\d+(?:[.,]\d+)?)\s*(km|kilometros|metros|m)\b/g)].map((m) => ({ v: parseFloat(m[1].replace(",", ".")), u: m[2] }));
    const dis2 = dis.length === 1 ? (() => { const m = p.match(/y a (\d+(?:[.,]\d+)?)\s+del/); return m ? [dis[0], { v: parseFloat(m[1].replace(",", ".")), u: dis[0].u }] : dis; })() : dis;
    if (ang.length !== 2 || dis2.length !== 2) return null;
    const [a, b] = ang, [d1, d2v] = dis2.map((d) => d.v), C = 180 - a - b;
    if (C <= 0) return null;
    const c = Math.sqrt(d1 * d1 + d2v * d2v - 2 * d1 * d2v * cos(C));
    const u = /km|kilom/.test(dis2[0].u) ? "km" : "m";
    const { p: ps, P } = pasos();
    P("Leemos el problema y hacemos el dibujo", "El globo y los dos pueblos forman un triángulo. Conocemos dos lados (las distancias del globo a cada pueblo) y los ángulos con que se ve cada pueblo.", [`${tx("lados: ")}${d2(d1)}\\,${tx(u)}\\;${tx("y")}\\;${d2(d2v)}\\,${tx(u)},\\quad ${tx("ángulos: ")}${g2(a)}\\;${tx("y")}\\;${g2(b)}`]);
    P("Calculamos el ángulo en el globo", "Los ángulos de observación (de depresión) miden respecto de la horizontal; el ángulo entre las dos visuales, en el globo, completa los 180°.", [`\\hat{G}=180^\\circ-${g2(a)}-${g2(b)}=${g2(C)}`]);
    P("Aplicamos el teorema del coseno", "Conocemos dos lados y el ángulo comprendido entre ellos.", [`d^2=${d2(d1)}^2+${d2(d2v)}^2-2\\cdot ${d2(d1)}\\cdot ${d2(d2v)}\\cdot\\cos ${g2(C)}`, `d^2=${d2(c * c)}\\Rightarrow d=${d2(c)}\\,${tx(u)}`]);
    P("Respondemos con una oración", `La distancia entre los dos pueblos es de aproximadamente ${m$(d2(c))} ${u}.`);
    return res("Teorema del coseno", `d=${d2(c)}`, ps, "trig", "oblicuangulos");
  }

  /* =====================================================================
     Inecuación con figura: "el perímetro de un cuadrado es menor o igual que 20"
     ===================================================================== */
  function inecuacionFigura(orig, p) {
    const m = p.match(/(perimetro|area) de un (cuadrado|triangulo equilatero|rectangulo)[^0-9]*?(menor o igual|mayor o igual|menor|mayor|no supera|como maximo|como minimo|al menos)[^0-9]*(\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    const N = leerNum(m[4]), sig = { "menor o igual": "\\le", "no supera": "\\le", "como maximo": "\\le", "mayor o igual": "\\ge", "como minimo": "\\ge", "al menos": "\\ge", menor: "<", mayor: ">" }[m[3]];
    const fig = m[2], uni = (p.match(/\d\s*(cm|m|metros)\b/) || [, ""])[1].replace("metros", "m");
    const { p: ps, P } = pasos();
    let resT;
    if (m[1] === "perimetro" && fig !== "rectangulo") {
      const k = fig === "cuadrado" ? 4 : 3, l = N.entre(k);
      P("Planteamos la inecuación", `El perímetro de un ${fig} es ${k} veces el lado $x$.`, [`${k}x${sig}${L(N)}`]);
      P("Resolvemos", `Dividimos por ${k} (positivo: la desigualdad no cambia de sentido). Además, un lado tiene que ser positivo.`, [`x${sig}${aprox(l)}`, `0<x${sig}${aprox(l)}`]);
      resT = `0<x${sig}${R(l)}`;
      P("Respondemos con una oración", `El lado puede medir ${sig === "\\le" ? "hasta" : sig === "<" ? "menos de" : sig === "\\ge" ? "como mínimo" : "más de"} ${m$(aprox(l))} ${uni} (${m$(resT)}).`);
    } else if (m[1] === "area" && fig === "cuadrado") {
      const r = Math.sqrt(N.v);
      P("Planteamos la inecuación", "El área de un cuadrado es lado al cuadrado.", [`x^2${sig}${L(N)}`]);
      P("Resolvemos", "Como el lado es positivo, sacamos raíz cuadrada.", [`x${sig}\\sqrt{${L(N)}}=${d2(r)}`]);
      resT = `0<x${sig}${d2(r)}`;
      P("Respondemos con una oración", `El lado cumple ${m$(resT)} ${uni}.`);
    } else return null;
    return res("Inecuación (figura)", resT, ps, "alg", "desigualdades");
  }

  // registramos (el último agregado se prueba primero)
  [sobraFalta, rectaNumerica, cuantosEntran, inecuacionFigura, globo, condicional, reparto, fracciones, mezclaCostoTotal, cantidadesPorUnidad, examen, rectangulo, idaVuelta, inversion, edades].forEach((fn) => PR.agregar((o, p) => fn(o, p)));
  window.MA_PROBLEMAS_MAS = { edades, inversion, idaVuelta, rectangulo, examen, cantidadesPorUnidad, mezclaCostoTotal, fracciones, reparto, sobraFalta, cuantosEntran, rectaNumerica, condicional, globo, inecuacionFigura };
})();
