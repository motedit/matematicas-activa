/* =======================================================================
 * EXPERIENCIA DE LECTURA (nuevas mejoras, sección A)
 *   1. Resaltado de lo que cambia de un paso al siguiente.
 *   2. "Ojo con…": errores comunes del tema (js/errores-comunes.js).
 *   3. Nivel de explicación: Secundaria / Universidad.
 *   4. Opciones de lectura: tema claro/oscuro, tamaño de letra y
 *      tipografía fácil de leer (OpenDyslexic).
 * La interfaz llama a despuesDeArmar(r) cada vez que arma una resolución.
 * ===================================================================== */
'use strict';

const CLAVE_OPCIONES = 'mpp-opciones';
const OPCIONES_BASE = { nivel: 'secundaria', tema: 'auto', letra: 'normal', facil: false, resaltar: true };
let opciones = { ...OPCIONES_BASE, ...guardado.leer(CLAVE_OPCIONES, {}) };

/* ---------- 1. Resaltado de cambios ----------
 * Se comparan los “ladrillos” de texto de la fórmula del paso con los de la
 * última fórmula del paso anterior (subsecuencia común más larga). Lo que no
 * estaba antes queda marcado. Si las fórmulas no se parecen, no se marca nada. */
function hojasDe(formula) {
  const html = formula && formula.querySelector('.katex-html'); if (!html) return [];
  return [...html.querySelectorAll('span')].filter(s => !s.children.length && s.textContent.trim() && !s.closest('.katex-mathml'));
}
function resaltarCambios() {
  const pasos = [...$('#pasos').children];
  pasos.forEach(li => li.querySelectorAll('.cambio').forEach(s => s.classList.remove('cambio')));
  if (!opciones.resaltar) return;
  for (let i = 1; i < pasos.length; i++) {
    const propias = li => li.querySelectorAll(':scope > div > .formula');      // sin las fórmulas de “¿Por qué?”
    const antes = propias(pasos[i - 1]), ahora = propias(pasos[i]);
    if (!antes.length || !ahora.length) continue;
    const A = hojasDe(antes[antes.length - 1]).map(s => s.textContent.trim()), hojas = hojasDe(ahora[0]), B = hojas.map(s => s.textContent.trim());
    if (!A.length || !B.length || A.length * B.length > 40000) continue;
    const L = Array.from({ length: A.length + 1 }, () => new Uint16Array(B.length + 1));    // tabla de la subsecuencia común
    for (let x = A.length - 1; x >= 0; x--) for (let y = B.length - 1; y >= 0; y--) L[x][y] = A[x] === B[y] ? L[x + 1][y + 1] + 1 : Math.max(L[x + 1][y], L[x][y + 1]);
    const comunes = L[0][0]; if (comunes / B.length < 0.35 || comunes === B.length) continue;
    let x = 0, y = 0; const quedan = new Set();
    while (x < A.length && y < B.length) { if (A[x] === B[y]) { quedan.add(y); x++; y++; } else if (L[x + 1][y] >= L[x][y + 1]) x++; else y++; }
    hojas.forEach((s, k) => { if (!quedan.has(k) && !/^[=+\-−·(),;\s]$/.test(B[k])) s.classList.add('cambio'); });
  }
}

/* ---------- 2. "Ojo con…" ---------- */
function ojoConHTML(r) {
  const E = window.ERRORES_COMUNES || {}, lista = E[`${area}.${r.tema}`] || E[area]; if (!lista || !lista.length) return '';
  return `<div class="ojo"><b>Ojo con…</b><ul>${lista.map(t => `<li>${escapar(t)}</li>`).join('')}</ul></div>`;
}

/* ---------- 3. Nivel de explicación ----------
 * Secundaria: la explicación completa más una idea clave del glosario.
 * Universidad: la primera oración, vocabulario formal y el nombre y el enunciado de la propiedad. */
const FORMAL = [[/pasamos (restando|sumando)/gi, (_, v) => (v.toLowerCase() === 'restando' ? 'restamos' : 'sumamos') + ' en ambos miembros'], [/pasamos (dividiendo|multiplicando)/gi, (_, v) => (v.toLowerCase() === 'dividiendo' ? 'dividimos' : 'multiplicamos') + ' ambos miembros'],
  [/\bla cuenta\b/gi, 'el cálculo'], [/\bjuntamos\b/gi, 'agrupamos'], [/\bsacamos\b/gi, 'extraemos'], [/\bvos\b/gi, 'usted'], [/\bfijate\b/gi, 'obsérvese']];
const primeraOracion = t => { const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/); return m ? m[0] : t; };
function aplicarNivel(r) {
  const uni = opciones.nivel === 'universidad';
  [...$('#pasos').children].forEach((li, i) => {
    const p = r.pasos[i], g = typeof buscarGlosario === 'function' ? buscarGlosario(p) : null, caja = li.querySelector(':scope > div'), parrafo = caja.querySelector(':scope > p');
    if (uni) {
      if (parrafo && p.texto) { let t = primeraOracion(p.texto); FORMAL.forEach(([re, f]) => { t = t.replace(re, f); }); parrafo.innerHTML = conFormulas(t); }
      if (g) caja.querySelector('h3').insertAdjacentHTML('afterend', `<div class="propiedad"><span class="prop-nombre">${escapar(g.t)}</span>${/^\\checkmark$/.test(g.e) ? '' : katexHTML(g.e, false)}</div>`);
    } else if (g && p.texto) {
      caja.querySelector('h3').parentNode.insertBefore(Object.assign(document.createElement('p'), { className: 'idea', innerHTML: '💡 ' + conFormulas(escapar(primeraOracion(g.x))) }), parrafo ? parrafo.nextSibling : caja.querySelector('h3').nextSibling);
    }
  });
}

/* ---------- La interfaz llama acá después de armar cada resolución ---------- */
function despuesDeArmar(r) {
  aplicarNivel(r);
  $('#resultado').insertAdjacentHTML('beforeend', ojoConHTML(r));
  resaltarCambios();
}

/* ---------- 4. Opciones de lectura ---------- */
function aplicarOpciones() {
  const raiz = document.documentElement;
  if (opciones.tema === 'auto') raiz.removeAttribute('data-theme'); else raiz.setAttribute('data-theme', opciones.tema);
  raiz.style.fontSize = { normal: '', grande: '112.5%', enorme: '125%' }[opciones.letra] || '';
  document.body.classList.toggle('letra-facil', !!opciones.facil);
  document.body.classList.toggle('resaltar', !!opciones.resaltar);
  document.querySelectorAll('[data-op]').forEach(b => b.setAttribute('aria-pressed', String(String(opciones[b.dataset.op]) === b.dataset.valor)));
  const chk = $('#opFacil'); if (chk) chk.checked = !!opciones.facil; const chk2 = $('#opResaltar'); if (chk2) chk2.checked = !!opciones.resaltar;
}
function cambiarOpcion(k, v) {
  const nivelAntes = opciones.nivel; opciones = { ...opciones, [k]: v }; guardado.escribir(CLAVE_OPCIONES, opciones); aplicarOpciones();
  if (actual && !$('#hoja').hidden && (k === 'nivel' && v !== nivelAntes || k === 'resaltar')) {            // volvemos a armar la resolución con el nuevo nivel
    const n = mostrados, visto = resultadoVisto; mostrarResolucion(actual, { practica, sinRegistro: true }); resultadoVisto = visto; mostrarHasta(n, false);
  }
}
document.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', () => cambiarOpcion(b.dataset.op, b.dataset.valor)));
$('#opFacil').addEventListener('change', e => cambiarOpcion('facil', e.target.checked));
$('#opResaltar').addEventListener('change', e => cambiarOpcion('resaltar', e.target.checked));
$('#botonOpciones').addEventListener('click', () => { const p = $('#panelOpciones'), abrir = p.hidden; p.hidden = !abrir; $('#botonOpciones').setAttribute('aria-expanded', String(abrir)); });
document.addEventListener('click', e => { const p = $('#panelOpciones'); if (!p.hidden && !e.target.closest('#panelOpciones, #botonOpciones')) { p.hidden = true; $('#botonOpciones').setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#panelOpciones').hidden) { $('#panelOpciones').hidden = true; $('#botonOpciones').focus(); } });
aplicarOpciones();
