#!/usr/bin/env node
/* =======================================================================
 * GENERADOR DE PÁGINAS POR TEMA (para buscadores)
 * Crea una página fija por cada tema, con sus ejemplos resueltos paso a
 * paso (las fórmulas ya dibujadas), conceptos clave, errores comunes y un
 * cuadro para resolver un ejercicio propio en la calculadora. También arma
 * temas/index.html, sitemap.xml y robots.txt, y agrega a la calculadora los
 * datos para Google (MathSolver) cuando se indica la dirección del sitio.
 *
 * Uso (desde la carpeta Calculadora, con Node instalado):
 *   node herramientas/generar-paginas.js https://tusitio.com/calculadora/
 * Sin dirección usa la de datos/plataforma.json → sitio.url (si está vacía,
 * genera todo igual, pero sin sitemap con direcciones completas).
 * Volvé a correrlo cada vez que agregues ejemplos o temas.
 * ===================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RAIZ = path.resolve(__dirname, '..'), leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const escribir = (f, s) => { fs.mkdirSync(path.dirname(path.join(RAIZ, f)), { recursive: true }); fs.writeFileSync(path.join(RAIZ, f), s); };
const CONFIG = JSON.parse(leer('datos/plataforma.json')), SITIO = CONFIG.sitio || {};
let URL_BASE = (process.argv[2] || SITIO.url || '').trim(); if (URL_BASE && !URL_BASE.endsWith('/')) URL_BASE += '/';
const NOMBRE = SITIO.nombre || 'Matemáticas Activa', CALC = 'Matem%C3%A1tica%20paso%20a%20paso.html';

/* ---------- Motores, glosario y errores comunes (los mismos de la calculadora) ---------- */
const ctx = { console: { ...console, warn() {} }, Math, JSON, Date }; ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(leer('lib/katex/katex.min.js'), ctx);
vm.runInContext(`var escapar=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var katexHTML=(lx,d)=>{try{return katex.renderToString(lx,{displayMode:d,throwOnError:false,strict:'ignore',output:'html'})}catch(e){return escapar(lx)}};
  var guardado={leer:(k,d)=>d,escribir(){}};var datosArea=a=>({nombre:a});`, ctx);
for (const f of ['motor-aritmetica', 'motor-algebra', 'motor-geometria-analitica', 'motor-trigonometria', 'motor-calculo-diferencial', 'motor-calculo-integral', 'motor-estadistica', 'aprendizaje', 'errores-comunes'])
  vm.runInContext(leer(`js/${f}.js`).replace(/^'use strict';/m, ''), ctx, { filename: f });
vm.runInContext(`this.R={arit:resolver,alg:resolverAlgebra,geo:resolverGeo,trig:resolverTrig,calc:resolverCalc,integ:resolverInteg,est:resolverEst};
  this.T={arit:TEMAS,alg:TEMAS_ALG,geo:TEMAS_GEO,trig:TEMAS_TRIG,calc:TEMAS_CALC,integ:TEMAS_INTEG,est:TEMAS_EST};this.BG=buscarGlosario;this.LT=latexATexto;`, ctx);
const DATOS = JSON.parse(leer('datos/ejemplos.json'));

/* ---------- Ayudas ---------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kx = (lx, d) => { try { return ctx.katex.renderToString(lx, { displayMode: d, throwOnError: false, strict: 'ignore', output: 'html' }); } catch (e) { return esc(lx); } };
const conFormulas = (s, esHTML) => (esHTML ? s : esc(s)).replace(/\$([^$]+)\$/g, (_, f) => kx(f, false));
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SLUG_AREA = { arit: 'aritmetica', alg: 'algebra', geo: 'geometria-analitica', trig: 'geometria-y-trigonometria', calc: 'calculo-diferencial', integ: 'calculo-integral', est: 'estadistica-y-probabilidad' };
const NIVEL = { arit: 'Secundaria', alg: 'Secundaria', geo: 'Secundaria', trig: 'Secundaria', calc: 'Universidad', integ: 'Universidad', est: 'Secundaria y universidad' };
const absoluta = r => (URL_BASE ? URL_BASE + r : null);
const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13h3l3 7 5-16h7"/></svg>';
function cabeza({ titulo, desc, ruta, nivel, ld }) {
  const pre = '../'.repeat(nivel), can = absoluta(ruta);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
${can ? `<link rel="canonical" href="${can}">\n<meta property="og:url" content="${can}">\n` : ''}<meta property="og:type" content="article">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:locale" content="es_AR">
<meta property="og:site_name" content="${esc(NOMBRE)}">
${URL_BASE ? `<meta property="og:image" content="${URL_BASE}iconos/icono-512.png">\n` : ''}<meta name="theme-color" content="#0d1b2a">
<link rel="icon" type="image/png" href="${pre}iconos/favicon-32.png">
<link rel="stylesheet" href="${pre}lib/fuentes/fuentes.css">
<link rel="stylesheet" href="${pre}lib/katex/katex.min.css">
<link rel="stylesheet" href="${pre}css/estilos.css">
<link rel="stylesheet" href="${pre}temas/temas.css">
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body class="pagina-tema">
<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="topbar">
  <a class="brand" href="${pre}temas/index.html"><div class="mark">${LOGO}</div><div><b>Matemática paso a paso</b><small>${esc(NOMBRE)}</small></div></a>
  <a class="boton-barra" href="${pre}${CALC}">Abrir la calculadora</a>
</header>`;
}
const pie = nivel => `<footer class="pt-pie"><p>${esc(NOMBRE)} · Matemática paso a paso · <a href="${'../'.repeat(nivel)}privacidad.html">Privacidad</a> · <a href="${'../'.repeat(nivel)}temas/index.html">Todos los temas</a></p></footer>
</body>
</html>
`;
function pasoHTML(p, i) {
  return `<li class="paso"><span class="num" aria-hidden="true">${i + 1}</span><div><h3>${esc(p.titulo)}</h3>${p.texto ? `<p>${conFormulas(p.texto)}</p>` : ''}${p.mates.map(m => `<div class="formula" tabindex="0">${kx(m, true)}</div>`).join('')}${p.html ? `<div class="envoltorio">${conFormulas(p.html, true)}</div>` : ''}</div></li>`;
}
const enlaceCalc = (nivel, a, t, e) => `${'../'.repeat(nivel)}${CALC}#${new URLSearchParams({ a, t, e }).toString()}`;

/* ---------- Páginas por tema ---------- */
const paginas = [], indice = {};
for (const [a, area] of Object.entries(DATOS.areas)) {
  indice[a] = [];
  for (const [tema, nombre] of Object.entries(ctx.T[a])) {
    const resueltos = [];
    for (const ej of area.porTema[tema] || []) {
      const t = ej.t || ctx.LT(ej.lx), ver = ej.lx ? kx(ej.lx, false) : esc(t), corto = (ej.t || t).replace(/\^\((\w+)\)/g, '^$1');
      try { const r = ctx.R[a](t, tema); if (r.pasos && r.pasos.length) resueltos.push({ t, r, ver, corto }); } catch (e) { /* ese ejemplo no aplica */ }
    }
    if (!resueltos.length) continue;
    const ruta = `temas/${SLUG_AREA[a]}/${slug(nombre)}.html`;
    // Conceptos clave: los del glosario que usan los pasos, ordenados por relación con el tema y por frecuencia
    const GENERICOS = /^(¿Por qué verificar\?|Plantear bien|Hacer la cuenta|Elegir el camino|Leer una función|Ordenar la información)$/, BASICOS = /^(Propiedades de las potencias|Términos semejantes|Despejar|Jerarquía de las operaciones|Simplificar|Propiedad distributiva|Raíces)$/;
    const palabrasTema = slug(nombre).split('-').filter(w => w.length > 3).map(w => w.slice(0, 6)), cuenta = new Map();
    resueltos.forEach(({ r }) => r.pasos.forEach(p => { const g = ctx.BG(p); if (g && !GENERICOS.test(g.t)) cuenta.set(g, (cuenta.get(g) || 0) + 1); }));
    const puntaje = g => cuenta.get(g) + (palabrasTema.some(w => slug(g.t).includes(w)) ? 100 : 0) - (BASICOS.test(g.t) ? 50 : 0);
    const conceptos = [...cuenta.keys()].sort((x, y) => puntaje(y) - puntaje(x));
    const errores = ctx.ERRORES_COMUNES[`${a}.${tema}`] || ctx.ERRORES_COMUNES[a] || [];
    const intro = conceptos[0] ? conceptos[0].x : `Ejercicios de ${nombre.toLowerCase()} resueltos y explicados paso a paso.`;
    paginas.push({ a, tema, nombre, ruta, resueltos, conceptos: conceptos.slice(0, 6), errores, intro });
    indice[a].push({ nombre, ruta, n: resueltos.length });
  }
}
for (const pg of paginas) {
  const { a, tema, nombre, ruta, resueltos, conceptos, errores, intro } = pg, area = DATOS.areas[a].nombre, nivel = 2;
  const titulo = `${nombre}: ejercicios resueltos paso a paso | ${NOMBRE}`;
  const desc = `${nombre} (${area}): ${resueltos.length} ejemplos resueltos paso a paso, explicados y verificados. Por ejemplo: ${resueltos[0].corto}. Resolvé el tuyo gratis.`.slice(0, 300);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Temas', ...(URL_BASE ? { item: absoluta('temas/index.html') } : {}) }, { '@type': 'ListItem', position: 2, name: area, ...(URL_BASE ? { item: absoluta('temas/index.html') + '#' + SLUG_AREA[a] } : {}) }, { '@type': 'ListItem', position: 3, name: nombre, ...(URL_BASE ? { item: absoluta(ruta) } : {}) }] },
    { '@context': 'https://schema.org', '@type': 'LearningResource', name: `${nombre}: ejercicios resueltos paso a paso`, description: desc, inLanguage: 'es', learningResourceType: 'Ejercicios resueltos', educationalLevel: NIVEL[a], teaches: [nombre, ...conceptos.map(c => c.t)], isAccessibleForFree: true, ...(URL_BASE ? { url: absoluta(ruta) } : {}), provider: { '@type': 'Organization', name: NOMBRE } }
  ];
  const otros = paginas.filter(o => o.a === a && o !== pg);
  const html = cabeza({ titulo, desc, ruta, nivel, ld }) + `
<main class="pt" id="contenido">
  <nav class="migas" aria-label="Ubicación"><a href="../index.html">Temas</a> › <a href="../index.html#${SLUG_AREA[a]}">${esc(area)}</a> › <span aria-current="page">${esc(nombre)}</span></nav>
  <h1>${esc(nombre)}: ejercicios resueltos paso a paso</h1>
  <p class="pt-intro">${conFormulas(intro)} Acá tenés ${resueltos.length} ejemplo${resueltos.length > 1 ? 's' : ''} resuelto${resueltos.length > 1 ? 's' : ''}, con cada paso explicado y verificado.</p>
  <form class="pt-resolver card" action="../../${CALC}" method="get">
    <label for="e"><b>Resolvé tu ejercicio de ${esc(nombre.toLowerCase())}</b></label>
    <div class="fila"><input class="texto" id="e" name="e" required placeholder="Por ejemplo: ${esc(resueltos[0].corto)}" autocomplete="off" spellcheck="false"><input type="hidden" name="a" value="${a}"><input type="hidden" name="t" value="${tema}"><button class="resolver" type="submit">Resolver paso a paso</button></div>
  </form>
  ${conceptos.length ? `<section class="pt-conceptos" aria-labelledby="conc"><h2 id="conc">Conceptos clave</h2><div class="pt-grilla">${conceptos.map(c => `<div class="card pt-concepto"><h3>${esc(c.t)}</h3><p>${esc(c.x)}</p><div class="formula" tabindex="0">${kx(c.e, true)}</div></div>`).join('')}</div></section>` : ''}
  <section aria-labelledby="ejs"><h2 id="ejs">Ejemplos resueltos</h2>
  ${resueltos.map(({ t, r, ver }, k) => `<article class="card hoja pt-ejemplo" id="ejemplo-${k + 1}">
    <h3 class="pt-titulo-ej">Ejemplo ${k + 1}: <span>${ver}</span></h3>
    <p class="pt-metodo">Método: <b>${esc(r.metodo)}</b></p>
    <ol class="pasos">${r.pasos.map(pasoHTML).join('')}</ol>
    <div class="resultado"><h3>Resultado</h3><div class="marca">${kx(r.resultado, true)}</div></div>
    <p><a class="secundario pt-abrir" href="${enlaceCalc(nivel, a, tema, t)}">Abrir en la calculadora (con pistas y comprobación)</a></p>
  </article>`).join('\n  ')}
  </section>
  ${errores.length ? `<section class="ojo pt-ojo" aria-labelledby="ojo"><h2 id="ojo">Ojo con…</h2><ul>${errores.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
  ${otros.length ? `<section aria-labelledby="mas"><h2 id="mas">Más temas de ${esc(area)}</h2><ul class="pt-chips">${otros.map(o => `<li><a href="${path.basename(o.ruta)}">${esc(o.nombre)}</a></li>`).join('')}</ul></section>` : ''}
</main>
` + pie(nivel);
  escribir(ruta, html);
}

/* ---------- Índice de temas ---------- */
const totalEj = paginas.reduce((s, p) => s + p.resueltos.length, 0);
escribir('temas/index.html', cabeza({ titulo: `Temas de matemática con ejercicios resueltos paso a paso | ${NOMBRE}`, desc: `${paginas.length} temas de matemática de secundaria y universidad con ${totalEj} ejercicios resueltos paso a paso: aritmética, álgebra, geometría, trigonometría, cálculo y estadística.`, ruta: 'temas/index.html', nivel: 1,
  ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Temas de matemática paso a paso', inLanguage: 'es', ...(URL_BASE ? { url: absoluta('temas/index.html') } : {}) }] }) + `
<main class="pt" id="contenido">
  <h1>Temas de matemática paso a paso</h1>
  <p class="pt-intro">${paginas.length} temas con ${totalEj} ejercicios resueltos, explicados y verificados. Elegí un tema o <a href="../${CALC}">abrí la calculadora</a> y escribí tu propio ejercicio.</p>
  ${Object.entries(indice).filter(([, l]) => l.length).map(([a, l]) => `<section class="pt-area" id="${SLUG_AREA[a]}" aria-labelledby="h-${a}"><h2 id="h-${a}">${esc(DATOS.areas[a].nombre)}</h2><ul class="pt-chips">${l.map(t => `<li><a href="${t.ruta.replace('temas/', '')}">${esc(t.nombre)} <small>${t.n}</small></a></li>`).join('')}</ul></section>`).join('\n  ')}
</main>
` + pie(1));

/* ---------- sitemap.xml y robots.txt ---------- */
const hoy = new Date().toISOString().slice(0, 10);
if (URL_BASE) {
  const urls = [CALC, 'temas/index.html', ...paginas.map(p => p.ruta), 'privacidad.html'];
  escribir('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${URL_BASE}${u}</loc><lastmod>${hoy}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  escribir('robots.txt', `User-agent: *\nAllow: /\nDisallow: ${new URL(URL_BASE).pathname}pruebas/\nDisallow: ${new URL(URL_BASE).pathname}herramientas/\n\nSitemap: ${URL_BASE}sitemap.xml\n`);
} else escribir('robots.txt', 'User-agent: *\nAllow: /\nDisallow: /pruebas/\nDisallow: /herramientas/\n# Falta la dirección del sitio: corré  node herramientas/generar-paginas.js https://tusitio.com/calculadora/\n');

/* ---------- Datos para Google en la calculadora (MathSolver), solo con dirección del sitio ---------- */
const TIPOS = ['Arithmetic', 'Algebra', 'Linear Equation', 'Quadratic Equation', 'Polynomial Equation', 'Polynomial Expression', 'System of Equations', 'Linear Inequality', 'Quadratic Inequality', 'Logarithmic Equation', 'Matrix', 'Function', 'Slope', 'Line Equation', 'Distance', 'Midpoint', 'Circle', 'Geometry', 'Trigonometry', 'Limit', 'Derivative', 'Integral', 'Differential Equation', 'Statistics', 'Calculus'];
let calc = leer('Matemática paso a paso.html').replace(/\n?<!-- DATOS-BUSCADORES -->[\s\S]*?<!-- \/DATOS-BUSCADORES -->/, '');
if (URL_BASE) {
  const ldCalc = { '@context': 'https://schema.org', '@type': ['MathSolver', 'LearningResource'], name: 'Matemática paso a paso', url: URL_BASE + CALC, usageInfo: URL_BASE + 'privacidad.html', inLanguage: 'es', learningResourceType: 'Math solver', isAccessibleForFree: true,
    potentialAction: [{ '@type': 'SolveMathAction', target: URL_BASE + CALC + '?e={math_expression_string}', 'mathExpression-input': 'required name=math_expression_string', eduQuestionType: TIPOS }] };
  calc = calc.replace('</head>', `<!-- DATOS-BUSCADORES -->\n<link rel="canonical" href="${URL_BASE}${CALC}">\n<meta property="og:title" content="Matemática paso a paso · ${esc(NOMBRE)}">\n<meta property="og:description" content="Calculadora que detecta el tema, resuelve paso a paso, explica y verifica.">\n<meta property="og:url" content="${URL_BASE}${CALC}">\n<meta property="og:image" content="${URL_BASE}iconos/icono-512.png">\n<meta property="og:locale" content="es_AR">\n<script type="application/ld+json">${JSON.stringify(ldCalc)}</script>\n<!-- /DATOS-BUSCADORES -->\n</head>`);
}
fs.writeFileSync(path.join(RAIZ, 'Matemática paso a paso.html'), calc);
console.log(`Listo: ${paginas.length} páginas de temas, ${totalEj} ejemplos resueltos${URL_BASE ? `, sitemap para ${URL_BASE}` : ' (sin dirección del sitio: falta el sitemap)'}.`);
