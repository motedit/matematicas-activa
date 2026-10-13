/* =======================================================================
 * NUBE (Supabase): progreso de los alumnos entre dispositivos y códigos
 * de la versión completa validados en el servidor.
 * Se activa poniendo en datos/plataforma.json:
 *   "nube": { "url": "https://xxxx.supabase.co", "clave": "<anon key>", "curso": "3B-2026" }
 * El servidor se crea con servidor/supabase.sql. Sin url, todo sigue local.
 * Quién es el alumno: lo manda la Pizarra Docente (?alumno=&nombre=&curso=)
 * o lo escribe el alumno una vez en "Mi progreso".
 * ===================================================================== */
'use strict';

// Configuración: la de datos/plataforma.json o, dentro de la pizarra, la que manda ella (?nube=&nk=&curso=)
const nubeCfg = () => { const q = new URLSearchParams(location.search), c = (PLATAFORMA && PLATAFORMA.nube) || {}; return q.get('nube') && q.get('nk') ? { url: q.get('nube'), clave: q.get('nk'), curso: q.get('curso') || c.curso || '' } : c; };
const nubeActiva = () => !!(nubeCfg().url && nubeCfg().clave);
const CLAVE_ALUMNO = 'mpp-alumno', CLAVE_PENDIENTES = 'mpp-nube-pendientes';
// Identidad: primero la que manda la pizarra, si no la guardada en este navegador
function alumnoActual() {
  const q = new URLSearchParams(location.search), g = guardado.leer(CLAVE_ALUMNO, {});
  return { codigo: q.get('alumno') || g.codigo || '', nombre: q.get('nombre') || g.nombre || '', curso: q.get('curso') || g.curso || nubeCfg().curso || '' };
}
async function nubePedir(ruta, cuerpo, extra = {}) {
  const c = nubeCfg(), r = await fetch(c.url.replace(/\/$/, '') + ruta, {
    method: 'POST', headers: { apikey: c.clave, Authorization: `Bearer ${c.clave}`, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(cuerpo)
  });
  if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
// Intentos: se mandan al servidor; si no hay conexión quedan en espera y se mandan después
async function nubeEnviarProgreso(reg) {
  if (!nubeActiva() || (typeof docenteVisible === 'function' && !docenteVisible())) return;   // compartir con un curso es parte docente
  const al = alumnoActual(); if (!al.curso) return;                 // sin curso no hay a quién mandárselo
  const fila = { curso_id: al.curso, alumno_codigo: al.codigo || null, alumno_nombre: al.nombre || null, area: reg.a, tema: reg.tema, nombre_tema: reg.nombreTema, ejercicio: String(reg.e || '').slice(0, 300), correcto: !!reg.ok, practica: !!reg.practica };
  const pendientes = [...guardado.leer(CLAVE_PENDIENTES, []), fila];
  try { await nubePedir('/rest/v1/progreso', pendientes, { Prefer: 'return=minimal' }); guardado.escribir(CLAVE_PENDIENTES, []); }
  catch (e) { guardado.escribir(CLAVE_PENDIENTES, pendientes.slice(-200)); }
  pintarNube();
}
async function nubeValidarCodigo(codigo) { return !!(await nubePedir('/rest/v1/rpc/validar_codigo', { codigo })); }
window.addEventListener('online', () => { if (nubeActiva() && guardado.leer(CLAVE_PENDIENTES, []).length) nubePedir('/rest/v1/progreso', guardado.leer(CLAVE_PENDIENTES, []), { Prefer: 'return=minimal' }).then(() => { guardado.escribir(CLAVE_PENDIENTES, []); pintarNube(); }).catch(() => {}); });

/* ---------- "Mi progreso": nombre y curso del alumno (solo con la nube activa) ---------- */
function pintarNube() {
  const caja = $('#nubeAlumno'); if (!caja) return;
  const usar = nubeActiva() && (typeof docenteVisible !== 'function' || docenteVisible());
  caja.hidden = !usar; if (!usar) return;
  const al = alumnoActual(), desdePizarra = new URLSearchParams(location.search).has('alumno'), pend = guardado.leer(CLAVE_PENDIENTES, []).length;
  $('#nubeNombre').value = al.nombre; $('#nubeCurso').value = al.curso; $('#nubeNombre').disabled = $('#nubeCurso').disabled = desdePizarra;
  $('#nubeEstado').textContent = !al.curso ? 'Escribí el código de tu curso para que tu profe vea tu progreso.' : pend ? `${pend} intento${pend > 1 ? 's' : ''} esperando conexión.` : `Tu progreso se comparte con el curso ${al.curso}.`;
}
$('#nubeGuardar').addEventListener('click', () => { guardado.escribir(CLAVE_ALUMNO, { nombre: $('#nubeNombre').value.trim(), curso: $('#nubeCurso').value.trim().toUpperCase(), codigo: guardado.leer(CLAVE_ALUMNO, {}).codigo || '' }); pintarNube(); avisar('Datos guardados'); });
plataformaLista.then(pintarNube);
