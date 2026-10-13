'use strict';
/* =======================================================================
 * INTERFAZ
 * Todo lo que toca la página está acá. Los motores (js/motor-*.js) no saben
 * nada de botones ni de HTML: reciben texto y devuelven pasos.
 * Para agregar un área nueva: un botón en el HTML (data-area), su motor,
 * su entrada en datos/ejemplos.json y una rama en temasArea / resolverArea /
 * detectarArea.
 * ===================================================================== */
const $ = s => document.querySelector(s);
const campoMath = $('#campoMath'), campoTexto = $('#campoTexto');
let area = 'est', temaForzado = null, actual = null, mostrados = 0, ultimaEntrada = '';

/* ---------- Datos de ejemplos (datos/ejemplos.json) ----------
 * Con la página en un servidor se lee el .json; abierta con doble clic
 * (file://) se usa la copia datos/ejemplos.js, que ya está cargada. */
let DATOS = null;
async function cargarDatos() {
  if (location.protocol !== 'file:' && window.fetch) {
    try { const r = await fetch('datos/ejemplos.json', { cache: 'no-cache' }); if (r.ok) { DATOS = await r.json(); return; } } catch (e) { /* usamos la copia */ }
  }
  if (window.DATOS_EJEMPLOS) { DATOS = window.DATOS_EJEMPLOS; return; }
  throw new Error('No pude cargar datos/ejemplos.json ni datos/ejemplos.js.');
}
const datosArea = a => (DATOS && DATOS.areas[a]) || { placeholder: '', tip: '', auto: [], porTema: {} };

/* ---------- Utilidades: guardar en el navegador y avisos ---------- */
const guardado = {
  leer(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  escribir(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* navegador sin almacenamiento */ } }
};
let avisoTimer = null;
function avisar(msg) {                       // cartelito abajo de la pantalla (como el "toast" de la pizarra)
  const t = $('#aviso'); if (!t) return; t.textContent = msg; t.classList.add('ver');
  clearTimeout(avisoTimer); avisoTimer = setTimeout(() => t.classList.remove('ver'), 2200);
}
const nombreArea = a => (datosArea(a).nombre || a);

// Atajos para usar el motor del área elegida
/* ---------- Motores: se cargan recién cuando se elige su área ----------
 * DEPENDE dice qué motor necesita cada uno (se cargan en ese orden).
 * Aritmética es la base y ya viene cargada desde el HTML. */
const MOTORES = { arit: 'motor-aritmetica', alg: 'motor-algebra', geo: 'motor-geometria-analitica', trig: 'motor-trigonometria', calc: 'motor-calculo-diferencial', integ: 'motor-calculo-integral', est: 'motor-estadistica' };
const DEPENDE = { arit: [], alg: ['arit'], geo: ['alg'], trig: ['geo'], calc: ['trig'], integ: ['calc'], est: ['arit'] };
const motorListo = a => !!(window.MPP_MOTORES && window.MPP_MOTORES[a]) && DEPENDE[a].every(motorListo);
const cargasEnCurso = {};
function cargarMotor(a) {
  if (motorListo(a)) return Promise.resolve();
  if (cargasEnCurso[a]) return cargasEnCurso[a];
  return (cargasEnCurso[a] = Promise.all(DEPENDE[a].map(cargarMotor)).then(() => (window.MPP_MOTORES && window.MPP_MOTORES[a]) ? null : new Promise((ok, mal) => {
    const sc = document.createElement('script'); sc.src = `js/${MOTORES[a]}.js`; sc.onload = ok;
    sc.onerror = () => { delete cargasEnCurso[a]; mal(new Error(`No pude cargar el motor de ${nombreArea(a)}. Revisá que la carpeta js esté completa.`)); };
    document.body.appendChild(sc);
  })));
}
// Ejecuta fn con el motor listo: en el momento si ya está cargado (sin demoras), o cuando termine de cargar.
function conMotor(a, fn) {
  if (motorListo(a)) return fn();
  $('#cargando').hidden = false;
  cargarMotor(a).then(() => { $('#cargando').hidden = true; fn(); }).catch(e => { $('#cargando').hidden = true; $('#error').textContent = e.message; });
}
// Los nombres de abajo existen recién cuando el motor de esa área está cargado (por eso son funciones).
const TEMAS_POR_AREA = { arit: () => TEMAS, alg: () => TEMAS_ALG, geo: () => TEMAS_GEO, trig: () => TEMAS_TRIG, calc: () => TEMAS_CALC, integ: () => TEMAS_INTEG, est: () => TEMAS_EST };
const RESOLVEDORES = { arit: () => resolver, alg: () => resolverAlgebra, geo: () => resolverGeo, trig: () => resolverTrig, calc: () => resolverCalc, integ: () => resolverInteg, est: () => resolverEst };
const DETECTORES_AREA = { arit: () => detectarTema, alg: () => detectarTemaAlgebra, geo: () => detectarTemaGeo, trig: () => detectarTemaTrig, calc: () => detectarTemaCalc, integ: () => detectarTemaInteg, est: () => detectarTemaEst };
const temasArea = (a = area) => (motorListo(a) ? TEMAS_POR_AREA[a]() : {});
const resolverEn = (a, t, tema, m) => RESOLVEDORES[a]()(t, tema, m);          // resolver en cualquier área (lo usan las fichas)
const resolverArea = (t, tema, m) => resolverEn(area, t, tema, m);
const detectarArea = t => (motorListo(area) ? DETECTORES_AREA[area]()(t) : null);

/* ---------- Dibujo de fórmulas (KaTeX, con plan B si no cargó) ---------- */
const escapar = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function katexHTML(lx, display) {
  if (window.katex) { try { return katex.renderToString(lx, { displayMode: display, throwOnError: false }); } catch (e) { /* sigue abajo */ } }
  return `<code>${escapar(lx)}</code>`;
}
// Reemplaza $...$ por fórmulas dentro de un texto (o de una tabla generada por el motor).
const conFormulas = (s, esHTML) => (esHTML ? s : escapar(s)).replace(/\$([^$]+)\$/g, (_, f) => katexHTML(f, false));

/* ---------- Leer lo que escribió el alumno ---------- */
const hayMathLive = () => !!(window.customElements && customElements.get('math-field')) && !$('#cajaMath').hidden;
function leerEntrada() {
  const t = campoTexto.value.trim();
  if (t) return t;
  if (hayMathLive()) return latexATexto(campoMath.getValue('latex'));
  return '';
}

/* ---------- Mostrar la resolución ---------- */
function mostrarResolucion(r, opciones = {}) {
  actual = r; mostrados = 0; practica = !!opciones.practica; respuestaContada = false;
  $('#cabecera').innerHTML = `<span>Tema: <b>${escapar(temasArea()[r.tema] || r.tema)}</b></span><span>Método: <b>${escapar(r.metodo)}</b></span>`;
  $('#pasos').innerHTML = r.pasos.map((p, i) => `<li class="paso" hidden><span class="num" aria-hidden="true">${i + 1}</span><div>
      <h3>${escapar(p.titulo)}</h3>${p.texto ? `<p>${conFormulas(p.texto)}</p>` : ''}
      ${p.mates.map(m => `<div class="formula">${katexHTML(m, true)}</div>`).join('')}
      ${p.html ? `<div class="envoltorio">${conFormulas(p.html, true)}</div>` : ''}
      ${typeof ayudaPasoHTML === 'function' ? ayudaPasoHTML(p, i) : ''}</div></li>`).join('');
  $('#pasos').querySelectorAll('[data-porque]').forEach(b => b.addEventListener('click', () => {      // "¿Por qué?"
    const caja = $('#explica' + b.dataset.porque), abrir = caja.hidden; caja.hidden = !abrir; b.setAttribute('aria-expanded', String(abrir));
  }));
  $('#campoRespuesta').value = ''; $('#devolucion').innerHTML = '';
  $('#miRespuesta').classList.toggle('destacada', practica); $('#puntaje').hidden = !practica; if (practica) pintarPuntaje();
  const alt = (r.alternativas || []).map((a, i) => `<button class="secundario" data-alt="${i}">${escapar(a.nombre)}</button>`).join('');
  $('#resultado').innerHTML = `<h3>Resultado</h3><div class="marca">${katexHTML(r.resultado, true)}</div>${alt ? `<div class="alternativas">${alt}</div>` : ''}`;
  if (typeof extrasResultado === 'function') $('#resultado').insertAdjacentHTML('beforeend', extrasResultado(r));   // "Ver la clase de este tema"
  if (typeof despuesDeArmar === 'function') despuesDeArmar(r);        // nivel, "Ojo con…" y resaltado (js/experiencia.js)
  $('#resultado').querySelectorAll('[data-alt]').forEach(b => b.addEventListener('click', () => resolverAhora((r.alternativas[+b.dataset.alt]).metodo)));
  $('#resultado').hidden = true; $('#hoja').hidden = false; resultadoVisto = false; pararVoz();
  mostrarHasta(practica ? 0 : 1, false);
  $('#hoja').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}
// Botón "pista": revela de a un paso. Al llegar al final aparece el resultado.
function mostrarHasta(n, desplazar = true) {
  const items = $('#pasos').children, total = items.length, antes = mostrados;
  mostrados = Math.max(practica ? 0 : 1, Math.min(n, total));
  for (let i = 0; i < total; i++) { items[i].hidden = i >= mostrados; items[i].classList.toggle('nuevo', i >= antes && i < mostrados && antes > 0); }
  const fin = mostrados >= total, clase = modoClase();
  $('#botonPista').hidden = fin; $('#botonTodo').hidden = fin || clase;
  $('#contador').textContent = fin ? `${total} pasos` : mostrados === 0 ? 'Intentalo vos: pedí una pista si la necesitás' : `Paso ${mostrados} de ${total}`;
  // En modo clase el resultado no aparece solo: lo muestra el docente con su botón.
  $('#resultado').hidden = !fin || (clase && !resultadoVisto);
  $('#botonResultado').hidden = !(fin && clase && !resultadoVisto);
  if (desplazar && antes > 0 && mostrados > 0) (fin ? $('#resultado') : items[mostrados - 1]).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
/* ---------- Resolver en segundo plano (Web Worker, js/trabajador.js) ----------
 * Con la página publicada (http/https) los ejercicios se resuelven en un proceso aparte:
 * la página no se congela y, si algo tarda, aparece "Resolviendo…" con un botón para cancelar.
 * Abriendo el archivo con doble clic (file://) el navegador no permite trabajadores: se resuelve como siempre. */
let trabajador = null, pedidoId = 0, pendiente = null, sinTrabajador = false;
const TIEMPO_MAXIMO = 20000;
const usarTrabajador = () => !sinTrabajador && typeof Worker !== 'undefined' && /^https?:$/.test(location.protocol);
function obtenerTrabajador() {
  if (trabajador) return trabajador;
  trabajador = new Worker('js/trabajador.js');
  trabajador.onmessage = e => { const m = e.data; if (!pendiente || m.id !== pendiente.id) return; const p = pendiente; pendiente = null; clearTimeout(p.reloj); if (m.carga) sinTrabajador = true; m.ok ? p.ok(m.r) : p.mal(Object.assign(new Error(m.error), { reintentar: !!m.carga })); };
  trabajador.onerror = ev => { ev.preventDefault(); sinTrabajador = true; detenerTrabajador(); if (pendiente) { const p = pendiente; pendiente = null; clearTimeout(p.reloj); p.mal(Object.assign(new Error('sin trabajador'), { reintentar: true })); } };
  return trabajador;
}
function detenerTrabajador() { if (trabajador) { trabajador.terminate(); trabajador = null; } }
function resolverEnSegundoPlano(a, texto, tema, metodo) {
  return new Promise((ok, mal) => {
    if (pendiente) { clearTimeout(pendiente.reloj); pendiente.mal(Object.assign(new Error('reemplazado'), { silencio: true })); detenerTrabajador(); }   // uno nuevo reemplaza al anterior
    const id = ++pedidoId;
    pendiente = { id, ok, mal, reloj: setTimeout(() => cancelarResolucion('El ejercicio tarda demasiado. Probá con números más chicos o elegí el tema a mano.'), TIEMPO_MAXIMO) };
    obtenerTrabajador().postMessage({ id, area: a, texto, tema, metodo });
  });
}
function cancelarResolucion(motivo) {
  if (!pendiente) return; const p = pendiente; pendiente = null; clearTimeout(p.reloj);
  detenerTrabajador();                                   // cortamos el cálculo; el próximo ejercicio crea un trabajador nuevo
  p.mal(Object.assign(new Error(motivo || 'Cancelaste el cálculo.'), { cancelado: true }));
}
let relojAviso = null;
function avisoResolviendo(ver) { clearTimeout(relojAviso); if (ver) relojAviso = setTimeout(() => { $('#resolviendo').hidden = false; }, 150); else $('#resolviendo').hidden = true; }
function mostrarExito(entrada, r, metodo) {
  mostrarResolucion(r); guardarEnHistorial(entrada, r); actualizarEnlace(entrada, metodo);
  if (typeof contarResolucion === 'function') contarResolucion();
}
function resolverAhora(metodo) {
  if (typeof puedeResolver === 'function' && !puedeResolver()) return;      // versión gratuita: límite diario (js/plataforma.js)
  if (!motorListo(area)) { conMotor(area, () => resolverAhora(metodo)); return; }
  $('#error').textContent = '';
  const entrada = leerEntrada(); ultimaEntrada = entrada;
  if (area !== 'alg' && !temaForzado && pareceProblema(entrada)) {           // un problema con enunciado se resuelve en Álgebra
    cambiarArea('alg'); campoTexto.value = entrada; actualizarDeteccion();
    if (typeof avisar === 'function') avisar('Es un problema con enunciado: lo resolvemos en Álgebra.');
    resolverAhora(metodo); return;
  }
  const enPagina = () => {
    try { mostrarExito(entrada, resolverArea(entrada, temaForzado, metodo), metodo); }
    catch (e) { $('#hoja').hidden = true; $('#error').textContent = e.message; }
  };
  if (!usarTrabajador() || !entrada) { enPagina(); return; }
  const a = area; avisoResolviendo(true);
  resolverEnSegundoPlano(a, entrada, temaForzado, metodo).then(r => {
    avisoResolviendo(false); if (area !== a) return;       // si cambiaron de área mientras tanto, no mostramos nada
    mostrarExito(entrada, r, metodo);
  }).catch(e => {
    if (e.silencio) return; avisoResolviendo(false);
    if (e.reintentar) { enPagina(); return; }               // el navegador no pudo crear el trabajador: resolvemos en la página
    if (area !== a) return; $('#hoja').hidden = true; $('#error').textContent = e.message;
  });
}
// Mientras se escribe, mostramos qué tema detectamos.
function actualizarDeteccion() {
  const e = leerEntrada(); $('#error').textContent = '';
  if (!e) { $('#detectado').textContent = ''; return; }
  const t = temaForzado || detectarArea(e);
  $('#detectado').innerHTML = t ? `Tema ${temaForzado ? 'elegido' : 'detectado'}: <b>${escapar(temasArea()[t])}</b>` : 'Seguí escribiendo…';
}

/* ---------- Temas y ejemplos ---------- */
function pintarTemas() {
  const caja = $('#temas');
  caja.innerHTML = [['', 'Detectar automáticamente'], ...Object.entries(temasArea())].map(([k, n]) => `<button type="button" data-tema="${k}" aria-pressed="${String((temaForzado || '') === k)}">${n}</button>`).join('');
  caja.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { temaForzado = b.dataset.tema || null; pintarTemas(); pintarEjemplos(); actualizarDeteccion(); }));
}
function pintarEjemplos() {
  const d = datosArea(area), lista = (temaForzado ? d.porTema[temaForzado] : d.auto) || [], caja = $('#ejemplos');
  caja.innerHTML = '<span>Probá con:</span>';
  lista.forEach(ej => {
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = ej.lx ? katexHTML(ej.lx, false) : escapar(ej.t);
    if (ej.lx) b.setAttribute('aria-label', 'Ejemplo: ' + latexATexto(ej.lx));      // para lectores de pantalla
    b.addEventListener('click', () => {
      if (ej.lx && hayMathLive()) { campoMath.setValue(ej.lx); campoTexto.value = ''; }
      else { campoTexto.value = ej.t || latexATexto(ej.lx); if (hayMathLive()) campoMath.setValue(''); }
      actualizarDeteccion(); resolverAhora();
    });
    caja.appendChild(b);
  });
}

/* =====================================================================
 * SECCIÓN 1 · Herramientas de uso diario
 * ===================================================================== */

/* ---------- 1. Enlace al ejercicio: #a=área&e=ejercicio(&t=tema)(&m=método) ---------- */
let resultadoVisto = false, cargandoEnlace = false, practica = false, respuestaContada = false;
function actualizarEnlace(entrada, metodo) {
  if (!entrada) return;
  const p = new URLSearchParams({ a: area, e: entrada }); if (temaForzado) p.set('t', temaForzado); if (metodo) p.set('m', metodo);
  try { history.replaceState(null, '', '#' + p.toString()); } catch (e) { location.hash = p.toString(); }
}
function enlaceActual() { return location.href.split('#')[0] + location.hash; }
async function copiarEnlace() {
  const url = enlaceActual();
  try { await navigator.clipboard.writeText(url); avisar('Enlace copiado: pegalo en WhatsApp o en el aula virtual'); }
  catch (e) { prompt('Copiá este enlace:', url); }
}
/* Áreas posibles para un ejercicio que llega sin área (desde un buscador: ?e=… o ?q=…).
 * Se prueban en orden; queda la primera cuyo motor lo resuelve. */
// Enunciados en castellano (edades, números, rectángulos, compras…): van a Álgebra › Problemas con enunciado
const RE_PROBLEMA = /consecutivos|\bedad|\banos (mas|mayor)|(doble|triple|mitad|cuadruple) (de|del) (un|el|la|lo)|(la|el) (suma|diferencia) de (dos|2) numeros|(dos|2) numeros (que )?suman|rectangulo.*(largo|ancho|base|altura).*(perimetro|area)|(aumento|descuento|recargo|rebaja)\D{0,25}\d+ ?%.*(antes|original|costaba|valia)|separad[oa]s .*km.*(encuentran|cruzan|alcanza)|(canilla|grifo|obrero|pintor|maquina|bomba)[^.]*\d+ (horas|minutos|dias).*(juntos|juntas|ambos|ambas)|(cuestan|costaron).*(mas|menos|doble) que (un|una|cada)|^(el|la|si a|a) .*\bun numero\b.*\b(es|da|obtengo|resulta)\b|^un numero (mas|menos|por|aumentado|disminuido) .*\b(es|da)\b/;
const pareceProblema = texto => { const t = plano(String(texto || '')); return t.split(/\s+/).length >= 6 && RE_PROBLEMA.test(t); };
function areasCandidatas(texto) {
  const t = plano(texto), out = [], si = (a, re) => { if (re.test(t) && !out.includes(a)) out.push(a); };
  if (pareceProblema(texto)) out.push('alg');
  si('integ', /∫|\\int|∑|\\sum|integral|primitiva|serie\b|sucesion|\by\s*['′]|dy\s*\/\s*dx|riemann|ecuacion diferencial/);
  si('calc', /\blim|derivad|d\s*\/\s*dx|\\frac\{d\}|f\s*['′]|dominio|continu|tangente|maximos|minimos|asintota|concavidad/);
  si('est', /media|mediana|moda|varianza|desvi|probab|\bp\s*\(|binomial|normal|poisson|frecuencia|cuartil|percentil|hipotesis|confianza|regresion|\b[cvp]\s*\(\s*\d|\d\s*!|permutac|combinac|anagrama/);
  si('trig', /\b(sen|sin|cos|tg|tan|sec|cotg|cosec)\b|°|triangulo|angulo|perimetro|poligono|volumen|cuadrilater/);
  si('geo', /\(\s*-?[\d.,/]+\s*[,;]\s*-?[\d.,/]+\s*(?:[,;]\s*-?[\d.,/]+\s*)?\)|distancia|punto medio|pendiente|recta|circunferencia|vector/);
  si('arit', /capital|interes|prestamo|cuota|plazo fijo|mcd|mcm|primo|base \d|%|notacion cientifica/);
  si('alg', /[a-z]/);
  for (const a of ['arit', 'alg', 'calc', 'integ', 'trig', 'geo', 'est']) if (!out.includes(a)) out.push(a);
  return out;
}
// Lo que mandan los buscadores (LaTeX, AsciiMath o texto) → texto que entienden los motores
function deBuscador(e) {
  e = String(e).trim()
    .replace(/\\frac\s*\{\s*d\s*\}\s*\{\s*d([a-z])\s*\}|\bd\s*\/\s*d([a-z])\b/g, 'derivada de ')
    .replace(/^\((.+)\)\s*['′]$/, 'derivada de $1')
    .replace(/\\int(?![a-z])/g, '∫').replace(/\\sum(?![a-z])/g, '∑').replace(/\\(?:rightarrow|to)(?![a-z])/g, '→').replace(/\\infty/g, '∞');
  if (/\\[a-zA-Z]/.test(e)) e = latexATexto(e);
  return e.replace(/\s+/g, ' ').trim();
}
function resolverEnAlgunaArea(texto, candidatas) {      // carga los motores necesarios y prueba cada área
  const a = candidatas.shift(); if (!a) { $('#error').textContent = 'No reconocí el ejercicio del enlace.'; campoTexto.value = texto; return; }
  conMotor(a, () => {
    try { resolverEn(a, texto); } catch (e) { resolverEnAlgunaArea(texto, candidatas); return; }
    cargandoEnlace = true; cambiarArea(a); campoTexto.value = texto; actualizarDeteccion(); resolverAhora(); cargandoEnlace = false;
  });
}
function leerEnlace() {                       // al abrir la página con un enlace, carga y resuelve el ejercicio
  const p = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams(location.search);
  let a = p.get('a') || q.get('a'), e = p.get('e') || q.get('e') || q.get('q');
  if (!e) return false;
  e = deBuscador(e);
  if (!a || !(DATOS && DATOS.areas[a])) { resolverEnAlgunaArea(e, areasCandidatas(e)); return true; }
  if (!motorListo(a)) { conMotor(a, leerEnlace); return true; }
  cargandoEnlace = true; cambiarArea(a);
  const t = p.get('t') || q.get('t'); if (t && temasArea()[t]) { temaForzado = t; pintarTemas(); pintarEjemplos(); }
  campoTexto.value = e; actualizarDeteccion(); resolverAhora(p.get('m') || undefined); cargandoEnlace = false;
  return true;
}

/* ---------- 2. Historial (últimos 25 ejercicios, guardados en este navegador) ---------- */
const CLAVE_HIST = 'mpp-historial';
function guardarEnHistorial(entrada, r) {
  if (!entrada) return;
  const h = guardado.leer(CLAVE_HIST, []).filter(x => !(x.a === area && x.e === entrada));
  h.unshift({ a: area, e: entrada, t: temasArea()[r.tema] || r.tema, f: Date.now() });
  guardado.escribir(CLAVE_HIST, h.slice(0, 25)); pintarHistorial();
}
function pintarHistorial() {
  const h = guardado.leer(CLAVE_HIST, []), lista = $('#listaHistorial'); if (!lista) return;
  $('#cantHistorial').textContent = h.length;
  lista.innerHTML = h.length ? h.map((x, i) => `<li><button type="button" data-h="${i}"><span class="h-ej">${escapar(x.e)}</span><span class="h-meta">${escapar(nombreArea(x.a))} · ${escapar(x.t || '')}</span></button></li>`).join('') : '<li class="h-vacio">Todavía no resolviste ningún ejercicio.</li>';
  lista.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => { const x = h[+b.dataset.h]; cambiarArea(x.a); campoTexto.value = x.e; actualizarDeteccion(); resolverAhora(); }));
  $('#borrarHistorial').hidden = !h.length;
}

/* ---------- 3. Escuchar la resolución (voz del navegador) ---------- */
let hablando = false;
function textoHablado(lx) {                    // fórmula LaTeX → texto para leer en voz alta
  try { if (window.MathfieldElement && MathfieldElement.computeEngine !== undefined && window.MathLive && MathLive.convertLatexToSpeakableText) return MathLive.convertLatexToSpeakableText(lx); } catch (e) { /* sigue */ }
  return lx.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1 sobre $2').replace(/\\sqrt\{([^{}]*)\}/g, 'raíz de $1').replace(/\^\{?2\}?/g, ' al cuadrado').replace(/\^\{?3\}?/g, ' al cubo').replace(/\^/g, ' a la ')
    .replace(/\\cdot|\\times/g, ' por ').replace(/\\le/g, ' menor o igual que ').replace(/\\ge/g, ' mayor o igual que ').replace(/\\pi/g, 'pi').replace(/\\checkmark/g, '').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}]/g, ' ').replace(/-/g, ' menos ').replace(/=/g, ' igual a ').replace(/\s+/g, ' ');
}
function pararVoz() { try { speechSynthesis.cancel(); } catch (e) { /* sin voz */ } hablando = false; const b = $('#botonVoz'); if (b) { b.setAttribute('aria-pressed', 'false'); b.querySelector('span').textContent = 'Escuchar'; } }
function escuchar() {
  if (!('speechSynthesis' in window)) { avisar('Este navegador no puede leer en voz alta'); return; }
  if (hablando) { pararVoz(); return; }
  const partes = [];
  [...$('#pasos').children].filter(li => !li.hidden).forEach((li, i) => {
    const p = actual.pasos[i]; partes.push(`Paso ${i + 1}. ${p.titulo}.`);
    if (p.texto) partes.push(p.texto.replace(/\$([^$]+)\$/g, (_, f) => textoHablado(f)));
    p.mates.slice(0, 3).forEach(m => partes.push(textoHablado(m)));
  });
  if (!$('#resultado').hidden) partes.push('Resultado: ' + textoHablado(actual.resultado));
  const voces = speechSynthesis.getVoices(), voz = voces.find(v => /es[-_]AR/i.test(v.lang)) || voces.find(v => /^es/i.test(v.lang));
  speechSynthesis.cancel(); hablando = true;
  const b = $('#botonVoz'); b.setAttribute('aria-pressed', 'true'); b.querySelector('span').textContent = 'Detener';
  partes.forEach((t, i) => { const u = new SpeechSynthesisUtterance(t); u.lang = voz ? voz.lang : 'es-AR'; if (voz) u.voice = voz; u.rate = 0.95; if (i === partes.length - 1) u.onend = pararVoz; speechSynthesis.speak(u); });
}

/* ---------- 4. Imprimir o guardar en PDF ---------- */
function imprimir() {
  const antes = mostrados; mostrarHasta(Infinity, false); $('#resultado').hidden = false;
  $('#impEjercicio').textContent = ultimaEntrada; $('#impArea').textContent = nombreArea(area);
  $('#impFecha').textContent = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  window.print();
  if (modoClase() && !resultadoVisto) mostrarHasta(antes, false);
}

/* ---------- 5. Modo clase: el docente revela los pasos y el resultado cuando quiere ---------- */
const modoClase = () => document.body.classList.contains('modo-clase');
function ponerModoClase(on) {
  document.body.classList.toggle('modo-clase', on); guardado.escribir('mpp-modo-clase', on);
  $('#botonClase').setAttribute('aria-pressed', String(on));
  if (actual && !$('#hoja').hidden) mostrarHasta(mostrados, false);
}

/* =====================================================================
 * SECCIÓN 2 · Aprendizaje (las funciones están en js/aprendizaje.js)
 * ===================================================================== */
function pintarPuntaje() { const p = leerPuntaje(); $('#puntaje').innerHTML = `Aciertos <b>${p.aciertos}/${p.intentos}</b> · Racha <b>${p.racha}</b> · Mejor racha <b>${p.mejor}</b>`; }
function comprobar() {
  const v = $('#campoRespuesta').value.trim(); if (!v || !actual) { $('#campoRespuesta').focus(); return; }
  if (!motorListo('calc')) { conMotor('calc', comprobar); return; }       // la comparación usa el motor simbólico de cálculo
  const c = comprobarRespuesta(v, actual); $('#devolucion').innerHTML = devolucionHTML(c);
  if (!respuestaContada && (c.tipo === 'bien' || c.tipo === 'parcial' || c.tipo === 'mal')) {   // se cuenta solo el primer intento de cada ejercicio
    respuestaContada = true; if (practica) { anotarPuntaje(c.todoBien); pintarPuntaje(); }
    if (typeof registrarProgreso === 'function') registrarProgreso({ a: area, tema: actual.tema, nombreTema: temasArea()[actual.tema] || actual.tema, e: ultimaEntrada, ok: c.todoBien, practica });
  }
  if (c.todoBien) { resultadoVisto = true; mostrarHasta(Infinity, false); }
}
function practicarParecido() {
  if (!actual || !ultimaEntrada) return;
  const base = ultimaEntrada, nuevo = ejercicioParecido(base, t => resolverArea(t, temaForzado), actual.tema, actual.resultado);
  if (!nuevo) { avisar('No pude armar un ejercicio parecido a este'); return; }
  campoTexto.value = nuevo.texto; if (hayMathLive()) campoMath.setValue(''); ultimaEntrada = nuevo.texto; actualizarDeteccion();
  mostrarResolucion(nuevo.r, { practica: true }); actualizarEnlace(nuevo.texto);
  $('#campoRespuesta').focus({ preventScroll: true }); avisar('Ejercicio nuevo: resolvelo y comprobá tu respuesta');
}

/* ---------- Arranque ---------- */
$('#botonComprobar').addEventListener('click', comprobar);
$('#campoRespuesta').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); comprobar(); } });
$('#botonParecido').addEventListener('click', practicarParecido);
$('#botonEnlace').addEventListener('click', copiarEnlace);
$('#botonVoz').addEventListener('click', escuchar);
$('#botonImprimir').addEventListener('click', imprimir);
$('#botonClase').addEventListener('click', () => { ponerModoClase(!modoClase()); avisar(modoClase() ? 'Modo clase: el resultado se muestra recién cuando lo pedís' : 'Modo clase desactivado'); });
$('#botonResultado').addEventListener('click', () => { resultadoVisto = true; mostrarHasta(Infinity, false); $('#resultado').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
$('#borrarHistorial').addEventListener('click', () => { guardado.escribir(CLAVE_HIST, []); pintarHistorial(); avisar('Historial borrado'); });
window.addEventListener('hashchange', () => { if (!cargandoEnlace && DATOS) leerEnlace(); });
ponerModoClase(guardado.leer('mpp-modo-clase', false)); pintarHistorial();
$('#botonResolver').addEventListener('click', () => resolverAhora());
$('#cancelarCalculo').addEventListener('click', () => cancelarResolucion());
$('#botonPista').addEventListener('click', () => mostrarHasta(mostrados + 1));
$('#botonTodo').addEventListener('click', () => mostrarHasta(Infinity));
campoTexto.addEventListener('input', actualizarDeteccion);
campoTexto.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); resolverAhora(); } });
campoMath.addEventListener('input', () => { if (campoMath.getValue) { campoTexto.value = ''; actualizarDeteccion(); } });
campoMath.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); resolverAhora(); } });
// Cambiar de área: limpia el ejercicio y muestra los temas y ejemplos del área.
function cambiarArea(a) {
  area = a; temaForzado = null; $('#hoja').hidden = true; pararVoz(); $('#error').textContent = ''; campoTexto.value = '';
  if (hayMathLive()) campoMath.setValue('');
  $('#areas').querySelectorAll('button').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.area === a)); b.tabIndex = b.dataset.area === a ? 0 : -1; });
  campoTexto.placeholder = datosArea(a).placeholder; $('#tips').textContent = datosArea(a).tip;
  if (!motorListo(a)) { $('#temas').innerHTML = ''; $('#ejemplos').innerHTML = ''; conMotor(a, () => { if (area === a) completarArea(a); }); return; }
  completarArea(a);
}
function completarArea(a) {                       // lo que necesita el motor del área ya cargado
  const activo = $('#areas [aria-selected="true"]'), barra = $('#areas');   // en pantallas chicas, centramos el área elegida en la barra
  if (activo && barra.scrollWidth > barra.clientWidth) barra.scrollLeft = activo.offsetLeft - (barra.clientWidth - activo.offsetWidth) / 2;
  pintarTemas(); pintarEjemplos(); actualizarDeteccion();
  if (typeof tecladoArea === 'function') tecladoArea(a);          // teclado virtual con los símbolos del área
  if (typeof pintarSimbolos === 'function') pintarSimbolos(a);    // barra de símbolos debajo del campo
}
$('#areas').querySelectorAll('button').forEach(b => b.addEventListener('click', () => cambiarArea(b.dataset.area)));
// Arranque: primero cargamos los ejemplos y después mostramos el área inicial.
// Si la página se abrió con un enlace a un ejercicio, lo resolvemos cuando KaTeX ya cargó (si no, las fórmulas saldrían como texto).
const cuandoCargue = fn => (document.readyState === 'complete' ? fn() : window.addEventListener('load', fn, { once: true }));
cargarDatos().catch(e => { $('#error').textContent = e.message; }).finally(() => {
  pintarHistorial(); cambiarArea((DATOS && DATOS.areaInicial) || 'est');
  if (location.hash.length > 1 || /[?&](e|q)=/.test(location.search)) cuandoCargue(leerEnlace);
  else {                                          // accesos directos de la app instalada: ?area=alg · ?graficador
    const q = new URLSearchParams(location.search), a = q.get('area');
    if (a && DATOS && DATOS.areas[a]) cambiarArea(a);
    if (q.has('graficador')) cuandoCargue(() => { const b = $('#botonGraficador'); if (b) b.click(); });
  }
});
window.addEventListener('load', () => {
  // Si MathLive no cargó (sin internet o bloqueado), queda solo el campo de texto.
  if (!(window.customElements && customElements.get('math-field'))) { $('#cajaMath').hidden = true; $('#etiquetaTexto').hidden = false; }
  else if (window.MathfieldElement) { try { MathfieldElement.decimalSeparator = ','; } catch (e) { /* versiones viejas */ } campoMath.mathVirtualKeyboardPolicy = document.body.classList.contains('embebida') ? 'manual' : 'auto';
    // Accesibilidad: el campo interno de MathLive también necesita nombre para los lectores de pantalla
    setTimeout(() => { try { const sink = campoMath.shadowRoot && campoMath.shadowRoot.querySelector('.ML__keyboard-sink'); if (sink) sink.setAttribute('aria-label', 'Operación matemática'); } catch (e) { /* sin acceso */ } }, 300); if (typeof tecladoArea === 'function') tecladoArea(area); }
  pintarEjemplos();
});

/* =====================================================================
 * SECCIÓN 4 · App instalable, sin internet y accesible
 * ===================================================================== */
// Service worker: guarda todo en el dispositivo (solo con la página publicada en http/https).
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo sin conexión */ }));
// Botón "Instalar" (Chrome, Edge y Android lo ofrecen cuando la página está publicada)
let pedidoInstalar = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedidoInstalar = e; $('#botonInstalar').hidden = false; });
$('#botonInstalar').addEventListener('click', async () => { if (!pedidoInstalar) return; pedidoInstalar.prompt(); await pedidoInstalar.userChoice.catch(() => null); pedidoInstalar = null; $('#botonInstalar').hidden = true; });
window.addEventListener('appinstalled', () => avisar('¡Listo! La calculadora quedó instalada como app'));
// Pestañas de áreas con el teclado: flechas, Inicio y Fin (patrón de “tablist” accesible)
$('#areas').addEventListener('keydown', e => {
  const bs = [...$('#areas').querySelectorAll('button')], i = bs.indexOf(document.activeElement); if (i < 0) return;
  const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: bs.length - 1 }[e.key]; if (j === undefined) return;
  e.preventDefault(); const b = bs[(j + bs.length) % bs.length]; b.focus(); cambiarArea(b.dataset.area);
});
