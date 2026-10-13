/* =======================================================================
 * COMPARAR MÉTODOS Y "¿TE SIRVIÓ?"
 *  · Comparar métodos: cuando un ejercicio se puede resolver de varias
 *    formas, muestra los métodos lado a lado (columnas), marca el más corto
 *    y controla que lleguen al mismo resultado.
 *  · ¿Te sirvió?: 👍 / 👎 en cada paso. Con 👎 se elige el motivo. Se
 *    registra como evento "opinion" (js/estadisticas.js) y aparece en el
 *    panel herramientas/estadisticas.html → "Explicaciones a revisar".
 * ===================================================================== */
'use strict';

/* ---------- 1. Comparar métodos ---------- */
// Números que aparecen en un resultado (para ver si dos métodos dan lo mismo aunque se escriban distinto)
function numerosDe(lx) {
  const t = (typeof latexATexto === 'function' ? latexATexto(lx) : lx).replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2').replace(/,(\d)/g, '.$1');
  return (t.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}
function mismoResultado(a, b) {
  const lim = s => s.replace(/\\[,;:! ]|\\quad|\\qquad|\s/g, '');
  if (lim(a) === lim(b)) return true;
  const x = numerosDe(a), y = numerosDe(b);
  if (!x.length || x.length !== y.length) return false;
  const ord = v => [...v].sort((p, q) => p - q);
  return ord(x).every((v, i) => Math.abs(v - ord(y)[i]) <= 1e-6 * Math.max(1, Math.abs(v)));
}
function compararMetodos(r) {
  const lista = [{ r, nombre: r.metodo }];
  for (const a of r.alternativas || []) {
    try { const s = resolverArea(ultimaEntrada, temaForzado, a.metodo); if (s && s.metodo !== r.metodo && !lista.some(x => x.r.metodo === s.metodo)) lista.push({ r: s, nombre: s.metodo }); } catch (e) { /* ese método no aplica */ }
  }
  return lista;
}
function htmlComparacion(lista) {
  const min = Math.min(...lista.map(x => x.r.pasos.length)), base = lista[0].r.resultado;
  const iguales = lista.every(x => mismoResultado(x.r.resultado, base));
  const col = ({ r }, i) => {
    const corto = r.pasos.length === min && lista.some(x => x.r.pasos.length > min);
    return `<article class="metodo-col${corto ? ' corto' : ''}" aria-label="${escapar(r.metodo)}">
      <header><h4>${escapar(r.metodo)}</h4><div class="insignias">${i === 0 ? '<span class="ins actual">El que estás viendo</span>' : ''}${corto ? '<span class="ins corto">Más corto</span>' : ''}<span class="ins">${r.pasos.length} pasos</span></div></header>
      <ol class="mini-pasos">${r.pasos.map(p => `<li><b>${escapar(p.titulo)}</b>${p.mates.length ? `<div class="mini-formula" tabindex="0">${katexHTML(p.mates[p.mates.length - 1], false)}</div>` : ''}</li>`).join('')}</ol>
      <footer><span>Resultado</span><div class="mini-formula" tabindex="0">${katexHTML(r.resultado, false)}</div>${i > 0 ? `<button type="button" class="secundario ver-metodo" data-metodo-i="${i}">Ver este método completo</button>` : ''}</footer>
    </article>`;
  };
  return `<div class="comparacion-veredicto ${iguales ? 'ok' : 'distinto'}" role="status">${iguales ? '✓ Todos los métodos llegan al mismo resultado.' : '≠ Los métodos dan resultados distintos: cada uno responde algo diferente (mirá el resultado de cada columna).'}${lista.some(x => x.r.pasos.length > min) ? ` El más corto tiene ${min} pasos.` : ' Tienen la misma cantidad de pasos.'}</div>
    <div class="comparacion-cols" style="--cols:${lista.length}">${lista.map(col).join('')}</div>`;
}
function agregarBotonComparar(r) {
  const caja = $('#resultado .alternativas'); if (!caja || !(r.alternativas || []).length) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'secundario comparar'; b.id = 'botonComparar';
  b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'comparacion');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></svg>Comparar métodos';
  caja.appendChild(b);
  const sec = document.createElement('section'); sec.id = 'comparacion'; sec.className = 'comparacion'; sec.hidden = true; sec.setAttribute('aria-label', 'Comparación de métodos');
  caja.after(sec);
  let lista = null;
  b.addEventListener('click', () => {
    const abrir = sec.hidden;
    if (abrir && !lista) { lista = compararMetodos(r); sec.innerHTML = `<h3>Comparación de métodos</h3>${htmlComparacion(lista)}`;
      sec.querySelectorAll('[data-metodo-i]').forEach(v => v.addEventListener('click', () => { const s = lista[+v.dataset.metodoI].r; mostrarResolucion(s, { sinRegistro: true }); mostrarHasta(s.pasos.length); }));
      if (typeof registrarEvento === 'function') registrarEvento('comparar', { a: area, tema: r.tema, metodos: lista.length });
    }
    sec.hidden = !abrir; b.setAttribute('aria-expanded', String(abrir));
    if (abrir) sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  });
}

/* ---------- 2. ¿Te sirvió esta explicación? ---------- */
const MOTIVOS_OPINION = ['No lo entendí', 'Es muy largo', 'Falta un paso', 'Tiene un error'];
const CLAVE_OPINIONES = 'mpp-opiniones';
function agregarOpiniones(r) {
  const yaDadas = guardado.leer(CLAVE_OPINIONES, {});
  $('#pasos').querySelectorAll('li.paso > div').forEach((div, i) => {
    const p = r.pasos[i]; if (!p) return;
    const clave = `${area}|${r.tema}|${p.titulo}`, previa = yaDadas[clave];
    const caja = document.createElement('div'); caja.className = 'opinion'; caja.setAttribute('role', 'group'); caja.setAttribute('aria-label', `¿Te sirvió el paso ${i + 1}?`);
    caja.innerHTML = `<span class="op-pregunta">¿Te sirvió?</span>
      <button type="button" class="op si" data-op="1" aria-pressed="${previa === 1}" title="Sí, me sirvió"><span aria-hidden="true">👍</span><span class="sr">Sí</span></button>
      <button type="button" class="op no" data-op="0" aria-pressed="${previa === 0}" title="No me sirvió"><span aria-hidden="true">👎</span><span class="sr">No</span></button>
      <span class="op-motivos" hidden>${MOTIVOS_OPINION.map(m => `<button type="button" class="op-motivo">${m}</button>`).join('')}</span>
      <span class="op-gracias" role="status"></span>`;
    div.appendChild(caja);
    const gracias = caja.querySelector('.op-gracias'), motivos = caja.querySelector('.op-motivos');
    const guardar = (util, motivo = '') => {
      const d = guardado.leer(CLAVE_OPINIONES, {}); d[clave] = util; guardado.escribir(CLAVE_OPINIONES, d);
      if (typeof registrarEvento === 'function') registrarEvento('opinion', { a: area, tema: r.tema, nt: (temasArea()[r.tema] || r.tema), metodo: r.metodo, paso: p.titulo, n: i + 1, util, motivo });
    };
    caja.querySelectorAll('[data-op]').forEach(bt => bt.addEventListener('click', () => {
      const util = +bt.dataset.op;
      caja.querySelectorAll('[data-op]').forEach(x => x.setAttribute('aria-pressed', String(x === bt)));
      if (util) { motivos.hidden = true; gracias.textContent = '¡Gracias!'; guardar(1); }
      else { motivos.hidden = false; gracias.textContent = '¿Qué faltó?'; }
    }));
    motivos.querySelectorAll('.op-motivo').forEach(bt => bt.addEventListener('click', () => {
      guardar(0, bt.textContent); motivos.hidden = true;
      gracias.textContent = bt.textContent === 'No lo entendí' && document.querySelector(`#pasos li:nth-child(${i + 1}) .preguntar`) ? 'Gracias. Probá con “No entiendo este paso”.' : '¡Gracias! Lo vamos a revisar.';
    }));
  });
}

/* ---------- 3. Se engancha a mostrarResolucion ---------- */
const _mostrarResolucionCmp = window.mostrarResolucion;
window.mostrarResolucion = function (r) {
  const v = _mostrarResolucionCmp.apply(this, arguments);
  try { agregarBotonComparar(r); } catch (e) { /* sin comparación */ }
  try { agregarOpiniones(r); } catch (e) { /* sin opiniones */ }
  return v;
};
