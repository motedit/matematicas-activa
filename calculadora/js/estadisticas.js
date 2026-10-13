/* =======================================================================
 * ESTADÍSTICAS DE USO ANÓNIMAS (nuevas mejoras, sección 4 · punto 16)
 * Registra qué se usa (temas, pistas, errores al comprobar, ejercicios que
 * no se reconocen…) SIN datos personales: ni nombre, ni curso, ni código.
 *   · Siempre se guardan en este navegador (últimos 3000 eventos).
 *   · Si está configurado datos/plataforma.json → estadisticas.url/clave
 *     (Supabase), se mandan de a tandas, salvo que la persona lo apague en
 *     Opciones o tenga activado "No rastrear" en el navegador.
 * El panel herramientas/estadisticas.html muestra los resultados.
 * ===================================================================== */
'use strict';

const CLAVE_EVENTOS = 'mpp-eventos', CLAVE_COMPARTIR = 'mpp-compartir-estadisticas';
const SESION = Math.random().toString(36).slice(2, 10);            // cambia en cada visita: no identifica a nadie
let colaEnvio = [];
const estCfg = () => (typeof PLATAFORMA !== 'undefined' && PLATAFORMA.estadisticas) || {};
const noRastrear = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
const compartirActivo = () => guardado.leer(CLAVE_COMPARTIR, true) && !noRastrear();
function registrarEvento(ev, datos = {}) {
  const e = { f: Date.now(), s: SESION, ev, ...datos };
  for (const k of Object.keys(e)) if (typeof e[k] === 'string') e[k] = e[k].slice(0, 120);    // nada largo
  const lista = guardado.leer(CLAVE_EVENTOS, []); lista.push(e); guardado.escribir(CLAVE_EVENTOS, lista.slice(-3000));
  if (estCfg().url && estCfg().clave && compartirActivo()) { colaEnvio.push(e); if (colaEnvio.length >= 20) enviarEventos(); }
}
function enviarEventos(alSalir) {
  const c = estCfg(); if (!colaEnvio.length || !c.url || !c.clave) return;
  const filas = colaEnvio.map(e => ({ evento: e.ev, sesion: e.s, area: e.a || null, tema: e.tema || null, datos: e })); colaEnvio = [];
  fetch(c.url.replace(/\/$/, '') + '/rest/v1/eventos', { method: 'POST', keepalive: !!alSalir, headers: { apikey: c.clave, Authorization: `Bearer ${c.clave}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(filas) }).catch(() => {});
}
setInterval(() => enviarEventos(), 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviarEventos(true); });

/* ---------- Dónde se registra cada cosa (sin tocar el resto del código) ---------- */
const nombreDe = t => { try { return temasArea()[t] || t; } catch (e) { return t; } };
const temaActual = () => (actual ? { a: area, tema: actual.tema, nt: nombreDe(actual.tema) } : { a: area });
// 1. Ejercicio resuelto (con el método) — envolvemos mostrarResolucion
const _mostrarResolucion = window.mostrarResolucion;
window.mostrarResolucion = function (r, op = {}) { const v = _mostrarResolucion.apply(this, arguments); if (!op.sinRegistro) registrarEvento(op.practica ? 'practica' : 'resolver', { a: area, tema: r.tema, nt: nombreDe(r.tema), metodo: r.metodo, pasos: r.pasos.length }); return v; };
// 2. Ejercicio no reconocido: cuando aparece un error debajo del campo
new MutationObserver(() => { const t = $('#error').textContent.trim(); if (t && ultimaEntrada) registrarEvento('no_reconocido', { a: area, texto: String(ultimaEntrada).slice(0, 80) }); }).observe($('#error'), { childList: true, characterData: true, subtree: true });
// 3. Comprobación de respuestas: tipo de resultado y el primer error detectado
const _comprobarRespuesta = window.comprobarRespuesta;
window.comprobarRespuesta = function () { const c = _comprobarRespuesta.apply(this, arguments); const nota = (c.filas || []).find(f => !f.ok && f.nota); registrarEvento('comprobar', { ...temaActual(), resultado: c.tipo, nota: nota ? nota.nota.split(/[.:]/)[0] : '' }); return c; };
// 4. Botones (delegación: un solo oyente para todos)
const BOTONES = { botonPista: 'pista', botonTodo: 'ver_todo', botonParecido: 'parecido', botonEnlace: 'enlace', botonVoz: 'voz', botonImprimir: 'pdf', botonImagen: 'imagen', botonGraficar: 'grafico', botonGraficador: 'graficador', botonFoto: 'foto', botonFichas: 'fichas', botonPizarra: 'pizarra', botonWord: 'word', botonLatex: 'latex' };
document.addEventListener('click', e => {
  const b = e.target.closest('button, a'); if (!b) return;
  if (BOTONES[b.id]) registrarEvento(BOTONES[b.id], { ...temaActual(), ...(b.id === 'botonPista' ? { paso: mostrados + 1, total: actual ? actual.pasos.length : 0 } : {}) });
  else if (b.dataset.porque !== undefined && b.getAttribute('aria-expanded') === 'true') { const g = actual && typeof buscarGlosario === 'function' ? buscarGlosario(actual.pasos[+b.dataset.porque]) : null; registrarEvento('porque', { ...temaActual(), concepto: g ? g.t : '' }); }
  else if (b.dataset.area) registrarEvento('area', { a: b.dataset.area });
  else if (b.classList.contains('ver-clase')) registrarEvento('ver_clase', temaActual());
});

/* ---------- Opción para no compartir, y exportar ---------- */
function exportarEventos() {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(guardado.leer(CLAVE_EVENTOS, []))], { type: 'application/json' }));
  a.download = `estadisticas-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove();
}
(function () {
  const chk = $('#opEstadisticas'); if (!chk) return;
  chk.checked = compartirActivo(); chk.disabled = noRastrear();
  if (noRastrear()) chk.closest('label').title = 'Tu navegador tiene activado “No rastrear”: no se comparte nada.';
  chk.addEventListener('change', () => guardado.escribir(CLAVE_COMPARTIR, chk.checked));
  $('#exportarEstadisticas').addEventListener('click', exportarEventos);
})();
