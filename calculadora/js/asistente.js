/* =======================================================================
 * ASISTENTE CON IA (nuevas mejoras, sección 4 · punto 17)
 * Botón "No entiendo este paso" en cada paso: el alumno escribe su duda y
 * recibe una explicación de ese paso (Claude, a través de la función de
 * servidor servidor/asistente/index.ts). Se activa poniendo la dirección
 * en datos/plataforma.json → asistente.url. Sin dirección, no aparece.
 * Si los planes están activos, es parte de la versión completa
 * (planes.funcionesCompletas incluye "asistente").
 * ===================================================================== */
'use strict';

const asisCfg = () => (typeof PLATAFORMA !== 'undefined' && PLATAFORMA.asistente) || {};
const asisActivo = () => !!asisCfg().url;
const charlas = new Map();                     // paso → [{ rol, texto }] (se reinicia con cada ejercicio)
const SUGERENCIAS = ['¿De dónde sale esto?', 'Explicámelo más fácil', 'Dame un ejemplo con otros números'];
// Respuesta → HTML: párrafos, listas con guiones y fórmulas $…$
function respuestaHTML(t) {
  const bloques = String(t).trim().split(/\n{2,}/);
  return bloques.map(b => {
    const lineas = b.split('\n'); if (lineas.every(l => /^\s*[-•*]\s+/.test(l))) return `<ul>${lineas.map(l => `<li>${conFormulas(l.replace(/^\s*[-•*]\s+/, ''))}</li>`).join('')}</ul>`;
    return `<p>${lineas.map(l => conFormulas(l).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')).join('<br>')}</p>`;
  }).join('');
}
function pintarCharla(i) {
  const caja = $('#asis' + i); if (!caja) return; const lista = charlas.get(i) || [];
  caja.querySelector('.asis-log').innerHTML = lista.map(m => `<div class="asis-msj ${m.rol}">${m.rol === 'asistente' ? respuestaHTML(m.texto) : `<p>${escapar(m.texto)}</p>`}</div>`).join('') || `<p class="asis-hola">Contame qué parte del paso ${i + 1} no te cierra. También podés tocar una de estas preguntas.</p>`;
  caja.querySelector('.asis-sug').hidden = lista.length > 0;
}
async function preguntar(i, pregunta) {
  pregunta = pregunta.trim(); if (!pregunta || !actual) return;
  const caja = $('#asis' + i), lista = charlas.get(i) || []; charlas.set(i, lista);
  const historial = lista.slice(-6); lista.push({ rol: 'alumno', texto: pregunta }); pintarCharla(i);
  const enviar = caja.querySelector('button[type="submit"]'), campo = caja.querySelector('input'); enviar.disabled = true; campo.value = '';
  const pensando = document.createElement('div'); pensando.className = 'asis-msj asistente pensando'; pensando.innerHTML = '<span></span><span></span><span></span>'; pensando.setAttribute('aria-label', 'Pensando…');
  caja.querySelector('.asis-log').appendChild(pensando);
  try {
    const r = await fetch(asisCfg().url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(asisCfg().clave ? { apikey: asisCfg().clave, Authorization: `Bearer ${asisCfg().clave}` } : {}) },
      body: JSON.stringify({ ejercicio: ultimaEntrada, area: nombreArea(area), tema: actual.tema, nombreTema: temasArea()[actual.tema] || actual.tema, nivel: (typeof opciones !== 'undefined' && opciones.nivel) || 'secundaria',
        pasos: actual.pasos.map(p => ({ titulo: p.titulo, texto: p.texto, mates: p.mates })), paso: i, resultado: actual.resultado, pregunta, historial }) });
    const j = await r.json().catch(() => ({}));
    lista.push({ rol: 'asistente', texto: r.ok && j.texto ? j.texto : (j.error || 'No pude responder ahora. Probá de nuevo en un rato.') });
  } catch (e) { lista.push({ rol: 'asistente', texto: 'No hay conexión con el asistente. Revisá tu internet y probá de nuevo.' }); }
  enviar.disabled = false; pintarCharla(i); campo.focus();
  if (typeof registrarEvento === 'function') registrarEvento('asistente', { a: area, tema: actual.tema, nt: temasArea()[actual.tema], paso: i + 1 });
}
function abrirAsistente(i, boton) {
  let caja = $('#asis' + i);
  if (!caja) {
    caja = document.createElement('div'); caja.className = 'asistente'; caja.id = 'asis' + i;
    caja.innerHTML = `<div class="asis-cab"><b>Asistente</b><small>Puede equivocarse: revisá siempre con tu profe.</small></div><div class="asis-log" aria-live="polite"></div>
      <div class="asis-sug">${SUGERENCIAS.map(s => `<button type="button" class="asis-chip">${escapar(s)}</button>`).join('')}</div>
      <form class="asis-form"><input class="texto" maxlength="500" placeholder="Escribí tu duda sobre este paso…" aria-label="Tu duda sobre el paso ${i + 1}"><button class="primario" type="submit">Preguntar</button></form>`;
    boton.insertAdjacentElement('afterend', caja);
    caja.querySelector('form').addEventListener('submit', e => { e.preventDefault(); preguntar(i, caja.querySelector('input').value); });
    caja.querySelectorAll('.asis-chip').forEach(b => b.addEventListener('click', () => preguntar(i, b.textContent)));
    pintarCharla(i);
  }
  const abrir = caja.hidden !== false || !boton.classList.contains('abierto'); caja.hidden = !abrir; boton.classList.toggle('abierto', abrir); boton.setAttribute('aria-expanded', String(abrir));
  if (abrir) caja.querySelector('input').focus({ preventScroll: true });
}
// Agregamos el botón a cada paso cada vez que se arma una resolución
const _mostrarResolucionAsis = window.mostrarResolucion;
window.mostrarResolucion = function (r) {
  const v = _mostrarResolucionAsis.apply(this, arguments); charlas.clear();
  if (asisActivo()) [...$('#pasos').children].forEach((li, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'preguntar'; b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>No entiendo este paso';
    b.addEventListener('click', () => abrirAsistente(i, b));
    const ancla = li.querySelector('.porque') || li.querySelector(':scope > div').lastElementChild; (ancla && ancla.classList.contains('porque') ? ancla : li.querySelector(':scope > div').lastElementChild).insertAdjacentElement('afterend', b);
  });
  return v;
};
