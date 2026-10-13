/* =======================================================================
 * HERRAMIENTAS DOCENTES (sección 3)
 *   1. Imagen de la resolución (PNG) y "Llevar a la pizarra".
 *   2. Progreso: registro de respuestas por tema (local y hacia la pizarra).
 *   3. Generador de fichas con soluciones (para imprimir o guardar en PDF).
 * Se carga DESPUÉS de interfaz.js porque usa sus funciones y variables.
 * Comunicación con la Pizarra Docente: window.postMessage con
 *   { tipo: 'mpp-imagen', url, ancho, alto }  → dibuja la resolución
 *   { tipo: 'mpp-progreso', registro }         → guarda el intento del alumno
 * ===================================================================== */
'use strict';

// ¿Estamos dentro de la pizarra? (la pizarra abre la calculadora con ?embed=1)
const EMBEBIDA = new URLSearchParams(location.search).has('embed') && window.parent !== window;
if (EMBEBIDA) {
  document.body.classList.add('embebida');
  // Dentro de otra página el teclado de MathLive intentaría abrirse en la ventana de afuera:
  // usamos solo la barra de símbolos propia (ver js/aprendizaje.js).
  window.addEventListener('DOMContentLoaded', () => { const mf = document.getElementById('campoMath'); if (mf) mf.mathVirtualKeyboardPolicy = 'manual'; });
  // Con los archivos abiertos con doble clic (file://), MathLive no puede funcionar dentro de otra página:
  // dejamos solo el campo de texto. En un servidor (http/https) funciona normalmente.
  if (location.protocol === 'file:') { $('#cajaMath').hidden = true; $('#etiquetaTexto').hidden = false; $('#campoMath').remove(); }
}
const avisarPizarra = msg => { if (EMBEBIDA) window.parent.postMessage(msg, '*'); };

/* -----------------------------------------------------------------------
 * 1. IMAGEN DE LA RESOLUCIÓN
 * Se arma un SVG con el contenido en HTML (fórmulas en MathML, que el
 * navegador dibuja sin fuentes externas) y se pasa a un lienzo PNG.
 * --------------------------------------------------------------------- */
const ESTILO_IMAGEN = `
.mi{font:15px/1.5 Inter,'Segoe UI',Roboto,Arial,sans-serif;color:#0e1f33;background:#fff;padding:22px 26px;width:760px;box-sizing:border-box}
.mi *{box-sizing:border-box}
.mi .cab{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1b6ec2;padding-bottom:8px;margin-bottom:12px}
.mi .cab b{font-size:17px}.mi .cab span{font-size:12px;color:#5a748c}
.mi .consigna{font-size:14px;margin:0 0 12px;color:#5a748c}.mi .consigna code{font-family:'Space Mono',monospace;color:#0e1f33}
.mi .p{display:flex;gap:12px;border:1px solid #e4ecf3;border-radius:10px;padding:10px 12px;margin-bottom:8px}
.mi .n{flex:0 0 26px;height:26px;border-radius:8px;background:#1b6ec2;color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center}
.mi h3{margin:1px 0 2px;font-size:15px}.mi p{margin:0 0 4px;color:#5a748c;font-size:13.5px}
.mi math[display=block]{margin:4px 0;text-align:left;font-size:18px}
.mi table{border-collapse:collapse;font-size:13px;margin:4px 0}.mi td,.mi th{border:1px solid #e4ecf3;padding:3px 9px;text-align:center}.mi th{background:#eef3f8}
.mi svg{max-width:360px;height:auto}.mi .gr{stroke:#e4ecf3}.mi .ej2,.mi .ej{stroke:#5a748c}.mi .curva,.mi .circ,.mi .r1{fill:none;stroke:#1b6ec2;stroke-width:2.6}
.mi .curva2,.mi .asin{fill:none;stroke:#e5604a;stroke-width:2;stroke-dasharray:6 4}.mi .r2,.mi .seg{stroke:#17a398;stroke-width:2.6}.mi .pt{fill:#0e1f33}
.mi .region{fill:#17a398;fill-opacity:.2}.mi .rect{fill:#e0a53a;fill-opacity:.3;stroke:#c4862a}.mi .poli{fill:rgba(224,165,58,.28);stroke:#c4862a}.mi .et{font:11px sans-serif;fill:#5a748c;text-anchor:middle}.mi .pl{fill:#0e1f33;font-weight:700}
.mi .res{margin-top:10px;border-radius:10px;overflow:hidden;border:1px solid #e4ecf3}.mi .res div:first-child{background:#0d1b2a;color:#fff;font-size:12px;font-weight:700;letter-spacing:.6px;padding:6px 12px}
.mi .res div:last-child{padding:6px 12px;background:#fdf3e0}`;
const mathML = (lx, disp) => { try { return katex.renderToString(lx, { output: 'mathml', displayMode: disp, throwOnError: false }); } catch (e) { return escapar(lx); } };
const conMathML = s => s.replace(/\$([^$]+)\$/g, (_, f) => mathML(f, false));
function htmlImagen(r, cantidad, conResultado) {
  const pasos = r.pasos.slice(0, cantidad).map((p, i) => `<div class="p"><div class="n">${i + 1}</div><div style="flex:1;min-width:0"><h3>${escapar(p.titulo)}</h3>${p.texto ? `<p>${conMathML(escapar(p.texto))}</p>` : ''}${p.mates.map(m => mathML(m, true)).join('')}${p.html ? conMathML(p.html) : ''}</div></div>`).join('');
  return `<div class="mi"><style>${ESTILO_IMAGEN}</style><div class="cab"><b>Matemáticas Activa · paso a paso</b><span>${escapar(nombreArea(area))} · ${escapar(temasArea()[r.tema] || r.tema)}</span></div>
    <p class="consigna">Ejercicio: <code>${escapar(ultimaEntrada)}</code></p>${pasos}${conResultado ? `<div class="res"><div>RESULTADO</div><div>${mathML(r.resultado, true)}</div></div>` : ''}</div>`;
}
async function resolucionAImagen() {
  if (!actual || !window.katex) throw new Error('Primero resolvé un ejercicio.');
  const visibles = Math.max(1, mostrados), conRes = !$('#resultado').hidden;
  const caja = document.createElement('div'); caja.style.cssText = 'position:fixed;left:-20000px;top:0;width:760px';
  caja.innerHTML = htmlImagen(actual, visibles, conRes); document.body.appendChild(caja);
  const nodo = caja.firstElementChild, alto = Math.ceil(nodo.getBoundingClientRect().height) + 24;
  const xml = new XMLSerializer().serializeToString(nodo); caja.remove();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${alto}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No pude armar la imagen.')); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const k = 2, c = document.createElement('canvas'); c.width = 760 * k; c.height = alto * k;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.scale(k, k); g.drawImage(img, 0, 0);
  return { url: c.toDataURL('image/png'), ancho: 760, alto };
}
async function descargarImagen() {
  try { const im = await resolucionAImagen(), a = document.createElement('a'); a.href = im.url; a.download = `resolucion-${(ultimaEntrada || 'ejercicio').replace(/[^\wáéíóúñ]+/gi, '-').slice(0, 40)}.png`; document.body.appendChild(a); a.click(); a.remove(); avisar('Imagen descargada'); }
  catch (e) { avisar(e.message); }
}
async function llevarAPizarra() {
  try { const im = await resolucionAImagen(); avisarPizarra({ tipo: 'mpp-imagen', ...im }); avisar('Resolución enviada a la pizarra'); }
  catch (e) { avisar(e.message); }
}

/* -----------------------------------------------------------------------
 * 2. PROGRESO
 * Cada primer intento de comprobar una respuesta queda registrado:
 * { f: fecha, a: área, tema, nombreTema, e: ejercicio, ok: acierto, practica }
 * --------------------------------------------------------------------- */
const CLAVE_PROG = 'mpp-progreso';
function registrarProgreso(reg) {
  const r = { f: Date.now(), ...reg }, lista = guardado.leer(CLAVE_PROG, []);
  lista.push(r); guardado.escribir(CLAVE_PROG, lista.slice(-500)); pintarProgreso();
  avisarPizarra({ tipo: 'mpp-progreso', registro: r });
  if (typeof nubeEnviarProgreso === 'function') nubeEnviarProgreso(r);          // servidor (js/nube.js), si está configurado
}
function resumenProgreso(lista) {                    // agrupa por área y tema
  const g = {};
  lista.forEach(r => { const k = r.a + '|' + r.tema; (g[k] = g[k] || { a: r.a, tema: r.nombreTema || r.tema, n: 0, ok: 0, ult: 0 }); g[k].n++; if (r.ok) g[k].ok++; g[k].ult = Math.max(g[k].ult, r.f); });
  return Object.values(g).sort((x, y) => x.ok / x.n - y.ok / y.n || y.n - x.n);
}
function pintarProgreso() {
  const lista = guardado.leer(CLAVE_PROG, []), caja = $('#tablaProgreso'); if (!caja) return;
  $('#cantProgreso').textContent = lista.length;
  if (!lista.length) { caja.innerHTML = '<p class="h-vacio">Comprobá tus respuestas (o usá “Parecido”) y acá vas a ver cómo te va en cada tema.</p>'; $('#accionesProgreso').hidden = true; return; }
  const res = resumenProgreso(lista), tot = lista.filter(r => r.ok).length;
  caja.innerHTML = `<p class="prog-total">${tot} de ${lista.length} correctas (${Math.round(100 * tot / lista.length)} %)</p>` + res.map(t => { const pc = Math.round(100 * t.ok / t.n); return `<div class="prog-fila"><div><b>${escapar(t.tema)}</b><small>${escapar(nombreArea(t.a))} · ${t.ok}/${t.n}</small></div><div class="barra"><span style="width:${pc}%" class="${pc >= 70 ? 'alta' : pc >= 40 ? 'media' : 'baja'}"></span></div><span class="pc">${pc}%</span></div>`; }).join('');
  $('#accionesProgreso').hidden = false;
}
function exportarCSV(filas, nombre) {
  const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
}
function exportarProgreso() {
  const lista = guardado.leer(CLAVE_PROG, []);
  exportarCSV([['Fecha', 'Área', 'Tema', 'Ejercicio', 'Correcto', 'Práctica'], ...lista.map(r => [new Date(r.f).toLocaleString('es-AR'), nombreArea(r.a), r.nombreTema || r.tema, r.e, r.ok ? 'sí' : 'no', r.practica ? 'sí' : 'no'])], 'progreso-matematica.csv');
}

/* -----------------------------------------------------------------------
 * 3. GENERADOR DE FICHAS
 * Toma los ejemplos del tema elegido como base y arma ejercicios parecidos
 * hasta llegar a la cantidad pedida. Cada uno se resuelve para las soluciones.
 * --------------------------------------------------------------------- */
let ficha = null;
function llenarTemasFicha() {
  const a = $('#fArea').value, sel = $('#fTema'), d = datosArea(a);
  if (!motorListo(a)) { sel.innerHTML = '<option>Cargando…</option>'; conMotor(a, llenarTemasFicha); return; }
  sel.innerHTML = '<option value="">Todos los temas (variados)</option>' + Object.entries(temasArea(a)).filter(([k]) => (d.porTema[k] || []).length).map(([k, n]) => `<option value="${k}">${escapar(n)}</option>`).join('');
}
function mezclar(v) { const a = [...v]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function generarFicha() {
  if (!motorListo($('#fArea').value)) { conMotor($('#fArea').value, generarFicha); return; }
  const a = $('#fArea').value, tema = $('#fTema').value || null, cant = Math.max(1, Math.min(30, +$('#fCantidad').value || 8)), d = datosArea(a);
  const semillas = mezclar((tema ? d.porTema[tema] || [] : Object.values(d.porTema).flat()).map(ej => ej.t || latexATexto(ej.lx)));
  const lista = [], vistos = new Set();
  const agregar = (t, r) => { const k = t.replace(/\s+/g, ''); if (vistos.has(k)) return false; vistos.add(k); lista.push({ t, r }); return true; };
  for (const s0 of semillas) { if (lista.length >= Math.ceil(cant / 2)) break; try { agregar(s0, resolverEn(a, s0, tema)); } catch (e) { /* ejemplo que no aplica */ } }
  let vueltas = 0;
  while (lista.length < cant && vueltas++ < cant * 6 && semillas.length) {
    const base = lista.length ? lista[vueltas % lista.length] : null; if (!base) break;
    let p = null;                                     // probamos varias veces para quedarnos con resultados “lindos” (enteros o fracciones)
    for (let k = 0; k < 4; k++) { const q = ejercicioParecido(base.t, t => resolverEn(a, t, tema), base.r.tema, base.r.resultado); if (q) { p = q; if (!/\\approx|\\sqrt|\\pm|[0-9}]i\b/.test(q.r.resultado) || /\\approx|\\sqrt|\\pm/.test(base.r.resultado)) break; } }
    if (p) agregar(p.texto, p.r);
  }
  if (!lista.length) { avisar('No pude armar ejercicios para ese tema'); return; }
  ficha = { a, tema, lista, titulo: $('#fTitulo').value.trim() || `Ficha de ${tema ? temasArea(a)[tema] : nombreArea(a)}`, curso: $('#fCurso').value.trim(), sol: $('#fSoluciones').value };
  $('#fichaVista').innerHTML = htmlFicha(ficha); $('#botonImprimirFicha').disabled = false;
}
function enunciado(x) {                              // la consigna; si es una cuenta, también la fórmula del primer paso
  const palabras = (x.t.match(/[a-záéíóúñ]{4,}/gi) || []).length, f = x.r.pasos[0] && /^(escribimos|leemos|planteamos)/i.test(x.r.pasos[0].titulo) ? x.r.pasos[0].mates[0] : null;
  return f && palabras <= 1 ? `<div class="f-mate">${katexHTML(f, false)}</div>` : `<span class="f-texto">${escapar(x.t)}</span>`;
}
function htmlFicha(F) {
  const cab = `<header class="f-cab"><div><b>${escapar(F.titulo)}</b><small>Matemáticas Activa${F.curso ? ' · ' + escapar(F.curso) : ''}</small></div><div class="f-datos"><span>Nombre: ______________________</span><span>Fecha: ____/____/______</span></div></header>`;
  const ejercicios = F.lista.map((x, i) => `<li><span class="f-num">${i + 1}</span><div>${enunciado(x)}<div class="f-espacio"></div></div></li>`).join('');
  const sol = F.sol === 'no' ? '' : `<section class="f-sol"><h3>Soluciones</h3><ol>${F.lista.map((x, i) => `<li><span class="f-num">${i + 1}</span><div><div class="f-res" tabindex="0">${katexHTML(x.r.resultado, false)}</div>${F.sol === 'completa' ? `<div class="f-pasos">${x.r.pasos.map(p => `<div><b>${escapar(p.titulo)}</b>${p.mates.slice(0, 3).map(m => `<span class="f-f">${katexHTML(m, false)}</span>`).join('')}</div>`).join('')}</div>` : ''}</div></li>`).join('')}</ol></section>`;
  return `${cab}<ol class="f-lista">${ejercicios}</ol>${sol}`;
}
function imprimirFicha() {
  if (!ficha) return;
  $('#fichaImpresion').innerHTML = htmlFicha(ficha); document.body.classList.add('imprimir-ficha');
  const fin = () => { document.body.classList.remove('imprimir-ficha'); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin); window.print(); setTimeout(fin, 1500);
}
function abrirFichas() {
  const sel = $('#fArea'); sel.innerHTML = Object.keys(DATOS.areas).map(a => `<option value="${a}"${a === area ? ' selected' : ''}>${escapar(nombreArea(a))}</option>`).join('');
  llenarTemasFicha(); if (temaForzado && [...$('#fTema').options].some(o => o.value === temaForzado)) $('#fTema').value = temaForzado;
  $('#dlgFichas').showModal();
}

/* ---------- Conexión con los botones ---------- */
$('#botonImagen').addEventListener('click', descargarImagen);
$('#botonPizarra').addEventListener('click', llevarAPizarra);
$('#botonFichas').addEventListener('click', abrirFichas);
$('#fArea').addEventListener('change', llenarTemasFicha);
$('#botonGenerarFicha').addEventListener('click', generarFicha);
$('#botonImprimirFicha').addEventListener('click', imprimirFicha);
$('#cerrarFichas').addEventListener('click', () => $('#dlgFichas').close());
$('#exportarProgreso').addEventListener('click', exportarProgreso);
$('#borrarProgreso').addEventListener('click', () => { guardado.escribir(CLAVE_PROG, []); pintarProgreso(); avisar('Progreso borrado'); });
pintarProgreso();
