/* =======================================================================
 * PLATAFORMA (sección 5)
 *   1. Versión gratuita y versión completa (datos/plataforma.json → planes)
 *   2. "Ver la clase de este tema" (datos/plataforma.json → clases)
 *   3. Foto del ejercicio: reconocimiento con Tesseract (gratis, en el
 *      navegador) o con Mathpix (servicio pago, mejor con fórmulas).
 * Se carga después de docente.js. La configuración se lee de
 * datos/plataforma.json (en un servidor) o de datos/plataforma.js (doble clic).
 * ===================================================================== */
'use strict';

let PLATAFORMA = window.DATOS_PLATAFORMA || { planes: { activo: false }, clases: {}, foto: { proveedor: 'tesseract' } };
const plataformaLista = (async () => {
  if (location.protocol !== 'file:' && window.fetch) {
    try { const r = await fetch('datos/plataforma.json', { cache: 'no-cache' }); if (r.ok) PLATAFORMA = await r.json(); } catch (e) { /* usamos la copia */ }
  }
})();

/* -----------------------------------------------------------------------
 * 1. PLANES
 * --------------------------------------------------------------------- */
const CLAVE_PLAN = 'mpp-plan', CLAVE_USO = 'mpp-uso-diario';
// Qué botón corresponde a cada función que puede ser de la versión completa
const FUNCION_BOTON = { fichas: '#botonFichas', imagen: '#botonImagen', pdf: '#botonImprimir', practica: '#botonParecido', voz: '#botonVoz', progreso: '.historial.progreso > summary', historial: '.historial:not(.progreso) > summary', enlace: '#botonEnlace', foto: '#botonFoto', asistente: '.preguntar' };
const NOMBRE_FUNCION = { fichas: 'el generador de fichas', imagen: 'la imagen de la resolución', pdf: 'imprimir o guardar en PDF', practica: 'la práctica con ejercicios parecidos', voz: 'la lectura en voz alta', progreso: 'el seguimiento de tu progreso', historial: 'el historial', enlace: 'los enlaces a ejercicios', foto: 'la foto del ejercicio', asistente: 'el asistente con IA' };
const planesActivos = () => !!(PLATAFORMA.planes && PLATAFORMA.planes.activo);
const tienePlanCompleto = () => !planesActivos() || (guardado.leer(CLAVE_PLAN, {}).plan === 'completa');
const funcionBloqueada = f => planesActivos() && !tienePlanCompleto() && (PLATAFORMA.planes.funcionesCompletas || []).includes(f)
  && !(f === 'progreso' && typeof nubeActiva === 'function' && nubeActiva());     // con servidor, el progreso siempre se comparte con el docente
const hoy = () => new Date().toISOString().slice(0, 10);
function usoDeHoy() { const u = guardado.leer(CLAVE_USO, {}); return u.fecha === hoy() ? u.n : 0; }
// La interfaz pregunta antes de resolver y avisa después de resolver
function puedeResolver() {
  if (!planesActivos() || tienePlanCompleto()) return true;
  const lim = PLATAFORMA.planes.limiteDiarioGratis || 0;
  if (lim && usoDeHoy() >= lim) { abrirPlan(`Llegaste a los ${lim} ejercicios gratis de hoy. Mañana tenés ${lim} más, o pasate a la versión completa para seguir ahora.`); return false; }
  return true;
}
function contarResolucion() { if (!planesActivos() || tienePlanCompleto()) return; guardado.escribir(CLAVE_USO, { fecha: hoy(), n: usoDeHoy() + 1 }); pintarPlan(); }
function pintarPlan() {
  const chip = $('#chipPlan'); if (!chip) return;
  chip.hidden = !planesActivos();
  if (!planesActivos()) return;
  const lim = PLATAFORMA.planes.limiteDiarioGratis || 0;
  chip.classList.toggle('completa', tienePlanCompleto());
  chip.innerHTML = tienePlanCompleto() ? `<span class="estrella">★</span> ${escapar(PLATAFORMA.planes.nombreCompleta || 'Completa')}` : `Gratis${lim ? ` · <b>${Math.max(0, lim - usoDeHoy())}</b> de ${lim} hoy` : ''}`;
  for (const [f, sel] of Object.entries(FUNCION_BOTON)) document.querySelectorAll(sel).forEach(el => el.classList.toggle('bloqueado', funcionBloqueada(f)));
}
function abrirPlan(motivo) {
  const P_ = PLATAFORMA.planes || {};
  $('#planMotivo').textContent = motivo || `Esta función es parte de la ${P_.nombreCompleta || 'versión completa'}.`;
  $('#planBeneficios').innerHTML = (P_.beneficios || []).map(b => `<li>${escapar(b)}</li>`).join('');
  $('#planPrecio').textContent = P_.precio || '';
  const link = $('#planSuscribir'); link.hidden = !P_.enlaceSuscripcion; if (P_.enlaceSuscripcion) link.href = P_.enlaceSuscripcion;
  $('#planCodigo').value = ''; $('#planError').textContent = '';
  $('#dlgPlan').showModal();
}
async function huella(texto) {                      // SHA-256 en hexadecimal (para comparar códigos sin guardarlos en claro)
  const datos = new TextEncoder().encode(texto.trim().toUpperCase());
  if (!(window.crypto && crypto.subtle)) throw new Error('Este navegador no puede validar códigos.');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', datos))].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function activarCodigo() {
  const c = $('#planCodigo').value; if (!c.trim()) { $('#planCodigo').focus(); return; }
  try {
    const h = await huella(c);
    // Con servidor (js/nube.js) el código se valida allá; si no, contra las huellas de la configuración
    const valido = typeof nubeActiva === 'function' && nubeActiva() ? await nubeValidarCodigo(c) : (PLATAFORMA.planes.codigos || []).includes(h);
    if (!valido) { $('#planError').textContent = 'Ese código no es válido (o ya se usó en demasiados dispositivos). Revisalo o escribile a tu profe.'; return; }
    guardado.escribir(CLAVE_PLAN, { plan: 'completa', h, f: Date.now() }); $('#dlgPlan').close(); pintarPlan(); avisar('¡Listo! Ya tenés la versión completa');
  } catch (e) { $('#planError').textContent = e.message; }
}
// Bloqueo: se intercepta el clic (fase de captura) antes de que llegue a la función
document.addEventListener('click', e => {
  if (!planesActivos() || tienePlanCompleto()) return;
  for (const [f, sel] of Object.entries(FUNCION_BOTON)) {
    const el = e.target.closest(sel);
    if (el && funcionBloqueada(f)) { e.preventDefault(); e.stopImmediatePropagation(); abrirPlan(`Para usar ${NOMBRE_FUNCION[f]} necesitás la ${PLATAFORMA.planes.nombreCompleta || 'versión completa'}.`); return; }
  }
}, true);

/* -----------------------------------------------------------------------
 * 2. "VER LA CLASE DE ESTE TEMA"
 * --------------------------------------------------------------------- */
function enlaceClase(a, tema) {
  const C = PLATAFORMA.clases || {}, puntual = (C.porTema || {})[`${a}.${tema}`];
  if (puntual) return puntual;
  return C.baseUrl ? `${C.baseUrl.replace(/\/$/, '')}/${a}/${tema}` : null;
}
function extrasResultado(r) {                        // lo agrega la interfaz al final del resultado
  const url = enlaceClase(area, r.tema); if (!url) return '';
  return `<a class="ver-clase" href="${escapar(url)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>${escapar((PLATAFORMA.clases || {}).textoBoton || 'Ver la clase de este tema')}<small>${escapar(temasArea()[r.tema] || r.tema)}</small></a>`;
}

/* -----------------------------------------------------------------------
 * 3. FOTO DEL EJERCICIO
 * --------------------------------------------------------------------- */
let tesseractCargado = null, lectorOCR = null, fotoURL = null;
function cargarTesseract() {
  if (window.Tesseract) return Promise.resolve();
  return tesseractCargado || (tesseractCargado = new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'lib/tesseract/tesseract.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No pude cargar el lector de fotos (lib/tesseract).')); document.body.appendChild(s); }));
}
// Limpia lo que devuelve el lector: símbolos raros → los que entiende la calculadora
function limpiarOCR(t) {
  return t.replace(/[−–—]/g, '-').replace(/[×✕]/g, '·').replace(/÷/g, '/').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/(\d)\s*[xX]\s*(?=\d)/g, '$1·').replace(/\b[oO](?=\d)|(?<=\d)[oO]\b/g, '0').replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
async function reconocerTesseract(imagen, progreso) {
  if (location.protocol === 'file:') throw new Error('La foto funciona con la página publicada (http/https). Abriendo el archivo con doble clic el navegador no deja usar el lector.');
  await cargarTesseract();
  if (!lectorOCR) lectorOCR = await Tesseract.createWorker('spa', 1, { workerPath: 'lib/tesseract/worker.min.js', corePath: 'lib/tesseract/core', langPath: 'lib/tesseract/idiomas', gzip: true, logger: m => { if (m.status === 'recognizing text') progreso(Math.round(m.progress * 100)); } });
  const { data } = await lectorOCR.recognize(imagen);
  return limpiarOCR(data.text || '');
}
async function reconocerMathpix(dataURL) {
  const k = (PLATAFORMA.foto || {}).mathpix || {};
  const r = await fetch('https://api.mathpix.com/v3/text', { method: 'POST', headers: { 'Content-Type': 'application/json', app_id: k.app_id, app_key: k.app_key }, body: JSON.stringify({ src: dataURL, formats: ['text', 'latex_styled'], math_inline_delimiters: ['$', '$'] }) });
  if (!r.ok) throw new Error('El servicio de reconocimiento no respondió.');
  const d = await r.json(); if (d.error) throw new Error(d.error);
  if (d.latex_styled) return limpiarOCR(latexATexto(d.latex_styled));
  return limpiarOCR((d.text || '').replace(/\$([^$]+)\$/g, (_, f) => latexATexto(f)));
}
async function reconocerFoto() {
  if (!fotoURL) return;
  const usaMathpix = (PLATAFORMA.foto || {}).proveedor === 'mathpix' && ((PLATAFORMA.foto.mathpix || {}).app_id);
  $('#fotoEstado').textContent = 'Leyendo la foto…'; $('#fotoEstado').hidden = false; $('#botonReconocer').disabled = true;
  try {
    const t = usaMathpix ? await reconocerMathpix(fotoURL) : await reconocerTesseract(fotoURL, p => { $('#fotoEstado').textContent = `Leyendo la foto… ${p} %`; });
    $('#fotoTexto').value = t; $('#fotoEstado').textContent = t ? 'Revisá el texto y corregí lo que haga falta antes de resolver.' : 'No encontré texto en la foto. Probá con más luz y la hoja derecha.';
    $('#botonUsarFoto').disabled = !t;
  } catch (e) { $('#fotoEstado').textContent = e.message; }
  finally { $('#botonReconocer').disabled = false; }
}
function elegirFoto(archivo) {
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = () => {
    // Achicamos la foto (las de celular son enormes) para leer más rápido
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); fotoURL = c.toDataURL('image/jpeg', 0.92);
      $('#fotoVista').src = fotoURL; $('#fotoTexto').value = ''; $('#botonUsarFoto').disabled = true; $('#fotoEstado').hidden = true;
      $('#dlgFoto').showModal(); reconocerFoto();
    }; img.src = lector.result;
  };
  lector.readAsDataURL(archivo);
}

/* ---------- Conexión con los botones ---------- */
$('#botonPlanCodigo').addEventListener('click', activarCodigo);
$('#planCodigo').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); activarCodigo(); } });
$('#cerrarPlan').addEventListener('click', () => $('#dlgPlan').close());
$('#chipPlan').addEventListener('click', () => (tienePlanCompleto() ? avisar('Ya tenés la versión completa') : abrirPlan()));
$('#botonFoto').addEventListener('click', () => $('#archivoFoto').click());
$('#archivoFoto').addEventListener('change', e => { elegirFoto(e.target.files[0]); e.target.value = ''; });
$('#botonReconocer').addEventListener('click', reconocerFoto);
$('#cerrarFoto').addEventListener('click', () => $('#dlgFoto').close());
$('#botonUsarFoto').addEventListener('click', () => {
  const t = $('#fotoTexto').value.trim(); if (!t) return;
  $('#dlgFoto').close(); campoTexto.value = t; if (hayMathLive()) campoMath.setValue(''); actualizarDeteccion(); resolverAhora();
});
/* -----------------------------------------------------------------------
 * 4. PARTE DOCENTE (para más adelante)
 * Con "docente.activo": false se ocultan Fichas, Modo clase y compartir el
 * progreso con un curso. Dentro de la Pizarra Docente (uso personal) se ven.
 * --------------------------------------------------------------------- */
const docenteVisible = () => !!((PLATAFORMA.docente || {}).activo) || (typeof EMBEBIDA !== 'undefined' && EMBEBIDA);
function aplicarDocente() {
  const ver = docenteVisible();
  ['#botonFichas', '#botonClase'].forEach(sel => { const el = $(sel); if (el) el.hidden = !ver; });
  if (!ver && document.body.classList.contains('modo-clase') && typeof ponerModoClase === 'function') ponerModoClase(false);
}
plataformaLista.then(() => { pintarPlan(); aplicarDocente(); });
