/* =======================================================================
 * TRABAJADOR (Web Worker) · resuelve los ejercicios en segundo plano
 * Así la página no se congela con ejercicios pesados (integrales largas,
 * factoriales grandes) y se puede cancelar. Carga solo los motores que
 * necesita cada área, igual que la página.
 * Mensaje de entrada:  { id, area, texto, tema, metodo }
 * Mensaje de salida:   { id, ok: true, r }  o  { id, ok: false, error }
 * ===================================================================== */
'use strict';
self.window = self;                                   // los motores avisan en window.MPP_MOTORES
const MOTORES = { arit: 'motor-aritmetica', alg: 'motor-algebra', geo: 'motor-geometria-analitica', trig: 'motor-trigonometria', calc: 'motor-calculo-diferencial', integ: 'motor-calculo-integral', est: 'motor-estadistica' };
const DEPENDE = { arit: [], alg: ['arit'], geo: ['alg'], trig: ['geo'], calc: ['trig'], integ: ['calc'], est: ['arit'] };
const cargados = new Set();
function cargar(a) { if (cargados.has(a)) return; DEPENDE[a].forEach(cargar); importScripts(`${MOTORES[a]}.js`); cargados.add(a); }
const RESOLVER = { arit: () => resolver, alg: () => resolverAlgebra, geo: () => resolverGeo, trig: () => resolverTrig, calc: () => resolverCalc, integ: () => resolverInteg, est: () => resolverEst };
self.onmessage = e => {
  const { id, area, texto, tema, metodo } = e.data || {};
  try {
    if (!MOTORES[area]) throw new Error('Área desconocida.');
    try { cargar(area); } catch (err) { self.postMessage({ id, ok: false, carga: true, error: err.message }); return; }   // no se pudo cargar un motor: la página resuelve sola
    const r = RESOLVER[area]()(texto, tema || null, metodo);
    self.postMessage({ id, ok: true, r: JSON.parse(JSON.stringify(r)) });   // solo datos (sin funciones)
  } catch (err) { self.postMessage({ id, ok: false, error: err && err.message ? err.message : String(err) }); }
};
