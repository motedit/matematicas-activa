/* =======================================================================
 * DICTADO POR VOZ (sección 3 · punto 11)
 * Botón de micrófono junto al campo del ejercicio: el alumno dice el
 * ejercicio ("x al cuadrado menos cinco x más seis igual a cero") y se
 * escribe en la calculadora ("x^2 - 5x + 6 = 0"). Usa el reconocimiento de
 * voz del navegador (Chrome, Edge, Safari y Android); si no existe, el
 * botón no aparece. vozATexto() es la traducción de palabras a símbolos.
 * ===================================================================== */
'use strict';

/* ---------- 1. Números dichos en palabras → cifras ---------- */
const NUM_UNIDADES = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900 };
const ORDINAL_EXP = { cuadrado: 2, cubo: 3, cuarta: 4, quinta: 5, sexta: 6, septima: 7, octava: 8, novena: 9, decima: 10 };
const DENOMINADOR = { medio: 2, medios: 2, tercio: 3, tercios: 3, cuarto: 4, cuartos: 4, quinto: 5, quintos: 5, sexto: 6, sextos: 6, septimo: 7, septimos: 7, octavo: 8, octavos: 8, noveno: 9, novenos: 9, decimo: 10, decimos: 10 };
const sinTildes = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
// Junta palabras numéricas seguidas ("trescientos veinticinco" → 325, "dos mil uno" → 2001)
function numerosEnPalabras(palabras) {
  const out = []; let i = 0;
  while (i < palabras.length) {
    const p = palabras[i]; let total = 0, actual = 0, usadas = 0;
    for (let j = i; j < palabras.length; j++) {
      const w = palabras[j];
      if (NUM_UNIDADES[w] !== undefined) { actual += NUM_UNIDADES[w]; usadas = j - i + 1; }
      else if (w === 'y' && usadas && NUM_UNIDADES[palabras[j + 1]] !== undefined && NUM_UNIDADES[palabras[j + 1]] < 10 && actual % 10 === 0 && actual >= 30) continue;   // "treinta y cinco"
      else if (w === 'mil' && (usadas || j === i)) { total += (actual || 1) * 1000; actual = 0; usadas = j - i + 1; }
      else if ((w === 'millon' || w === 'millones') && usadas) { total += actual * 1e6; actual = 0; usadas = j - i + 1; }
      else break;
    }
    if (usadas && !(p === 'un' || p === 'una') || (usadas && /^(medio|tercio|cuarto|quinto|sexto|septimo|octavo|noveno|decimo)s?$/.test(palabras[i + usadas] || ''))) { out.push(String(total + actual)); i += usadas; }
    else if (usadas && (p === 'un' || p === 'una')) { out.push(NUM_UNIDADES[palabras[i + 1]] === undefined && palabras[i + 1] !== 'mil' ? 'un' : String(total + actual)); i += usadas; }
    else { out.push(p); i++; }
  }
  return out;
}

/* ---------- 2. Frases → símbolos ---------- */
// Reglas en orden: [patrón sobre el texto sin tildes, reemplazo]
const FRASES = [
  [/\bpor ciento\b/g, ' % '], [/\bmas o menos\b/g, ' ± '],
  [/\b(abre|abrir|abro) (el )?parentesis\b/g, ' ( '], [/\b(cierra|cerrar|cierro) (el )?parentesis\b/g, ' ) '],
  [/\bmayor o igual (que|a)\b/g, ' ≥ '], [/\bmenor o igual (que|a)\b/g, ' ≤ '], [/\b(es )?mayor (que|a)\b/g, ' > '], [/\b(es )?menor (que|a)\b/g, ' < '], [/\b(es )?distinto (de|a)\b/g, ' ≠ '],
  [/\b(es )?igual a\b|\bigual\b/g, ' = '],
  [/\b(multiplicado|multiplicada) por\b|\bpor\b(?! ciento)|\bpor\b/g, ' * '], [/\b(dividido|dividida) (por|entre|en)\b|\b(dividido|dividida)\b/g, ' / '], [/\bsobre\b/g, ' SOBRE '],
  [/\bmas\b/g, ' + '], [/\bmenos\b/g, ' - '],
  [/\bal cuadrado\b/g, ' ^2 '], [/\bal cubo\b/g, ' ^3 '], [/\b(elevado )?a la (cuarta|quinta|sexta|septima|octava|novena|decima)\b/g, (m, e, o) => ` ^${ORDINAL_EXP[o]} `],
  [/\belevad[oa] (a )?(la )?/g, ' ^ '], [/\ba la (?=\d|menos|\(|x\b|n\b)/g, ' ^ '],
  [/\braiz cubica (de )?/g, ' CUBICA '], [/\braiz cuadrada (de )?|\braiz (de )?/g, ' √ '],
  [/\blogaritmo natural (de )?|\bln (de )?/g, ' ln '], [/\blogaritmo (en )?base (\d+) (de )?/g, (m, a, b) => ` log_${b} `], [/\blogaritmo (de )?/g, ' log '],
  [/\bseno (de )?/g, ' sen '], [/\bcoseno (de )?/g, ' cos '], [/\btangente (de )?/g, ' tg '],
  [/\bequis\b/g, ' x '], [/\bi griega\b|\by griega\b/g, ' Y '], [/\bzeta\b/g, ' z '], [/\bpi\b/g, ' π '], [/\binfinito\b/g, ' ∞ '], [/\bgrados?\b/g, ' ° '],
  [/\bfactorial de (\d+)\b/g, ' $1! '], [/\b(\d+) factorial\b/g, ' $1! '],
  [/\blimite cuando (\w) tiende a (\S+) de\b/g, ' lim $1→$2 LIMDE '], [/\blimite cuando (\w) tiende a (\S+)/g, ' lim $1→$2 LIMDE '],
  [/\bintegral (definida )?(de|desde) (\S+) (a|hasta) (\S+) de (.+?) (diferencial de|de|d) x\b/g, ' ∫_$3\u0001$5 INTDE $6 dx '], [/\bintegral (de )?(.+?) (diferencial de|de|d) x\b/g, ' ∫ $2 dx '], [/\bintegral (de )?/g, ' ∫ '],
  [/\bcoma\b/g, ' COMA ']
];
function vozATexto(frase) {
  let t = ' ' + sinTildes(String(frase).toLowerCase()).replace(/[¿?¡!]/g, (c, k, s) => (c === '!' && /\d$/.test(s.slice(0, k)) ? '!' : ' ')) + ' ';
  t = t.replace(/\bpor ciento\b/g, ' % ').replace(/^\s*(el|la|los|las|calcular|calcula|resolver|resolve|cuanto es|cuanto da)\s+/, ' ');   // antes de leer números ("ciento" no es 100 acá)
  t = numerosEnPalabras(t.trim().split(/\s+/)).join(' ');
  // fracciones dichas: "tres cuartos" → 3/4, "un medio" → 1/2
  t = t.replace(/\b(\d+|un|una) (medios?|tercios?|cuartos?|quintos?|sextos?|septimos?|octavos?|novenos?|decimos?)\b/g, (m, n, d) => ` (${n === 'un' || n === 'una' ? 1 : n}/${DENOMINADOR[d]}) `);
  for (const [re, r] of FRASES) t = t.replace(re, r);
  // coma: decimal si está entre cifras pegadas ("3 coma 5" → 3,5); si no, separador
  t = t.replace(/\d+(?:\s*COMA\s*\d+){2,}/g, m => m.replace(/\s*COMA\s*/g, ' LISTA '));          // "4 coma 7 coma 5": es una lista
  t = t.replace(/(\d)\s*COMA\s*(\d)/g, '$1,$2').replace(/\s*LISTA\s*/g, ', ').replace(/\s*COMA\s*/g, ', ');
  // raíz cúbica: CUBICA a → (a)^(1/3)
  t = t.replace(/CUBICA\s*(\([^()]*\)|[\d.,]+|[a-z])/g, '($1)^(1/3)');
  // "a sobre b" sin paréntesis: todo lo de antes sobre todo lo de después (en cada lado del =)
  t = t.split('=').map(lado => { const partes = lado.split('SOBRE'); if (partes.length !== 2) return lado.replace(/SOBRE/g, '/');
    const pre = (partes[0].match(/^(.*(?:LIMDE|INTDE|\bde\b))/) || ['', ''])[1], izq = partes[0].slice(pre.length).trim(), m = partes[1].match(/^(.*?)(\s+dx\s*)?$/);
    const par = x => (/^[\w.,√π]+$/.test(x) ? x : `(${x})`); return `${pre} ${par(izq)}/${par(m[1].trim())}${m[2] || ''} `; }).join('=');
  t = t.replace(/\b(LIMDE|INTDE)\b/g, ' ');
  // log en base: "log_2 8" → "log_2(8)"
  t = t.replace(/log_(\d+)\s+(\([^()]*\)|[\w.,]+)/g, (m, b, a) => `log_${b}(${a.replace(/^\(|\)$/g, '')})`);
  // espacios: "2 x" → "2x", "x ^2" → "x^2", "( 3" → "(3"
  t = t.replace(/\s+/g, ' ').replace(/\s*\^\s*/g, '^').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/√\s+/g, '√').replace(/(?<![→\u0001\w])(\d+)\s+([a-xzY])(?![\wñ])/g, '$1$2').replace(/\s*°/g, '°')
    .replace(/\s*!/g, '!').replace(/\s+%/g, '%').replace(/\s*,\s*/g, (m, k, s) => (/\d,\d/.test(s.slice(k - 1, k + 2)) ? ',' : ', ')).replace(/\s*;\s*/g, '; ').replace(/_\s+/g, '_');
  return t.replace(/\u0001(\S+)\s*/g, '^$1 ').replace(/\bY\b/g, 'y').replace(/\s*\*\s*/g, ' · ').replace(/\s+/g, ' ').trim();
}

/* ---------- 3. Botón de micrófono ---------- */
(function () {
  const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition, boton = $('#botonVoz2');
  if (!boton) return;
  if (!Reconocedor) { boton.hidden = true; return; }
  let rec = null, escuchando = false;
  const parar = () => { escuchando = false; boton.classList.remove('escuchando'); boton.setAttribute('aria-pressed', 'false'); boton.title = 'Dictar el ejercicio'; $('#vozEstado').hidden = true; };
  boton.addEventListener('click', () => {
    if (escuchando) { rec && rec.stop(); return; }
    rec = new Reconocedor(); rec.lang = 'es-AR'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    let final = '';
    rec.onresult = e => {
      let parcial = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) final += r[0].transcript + ' '; else parcial += r[0].transcript; }
      const dicho = (final + parcial).trim(); $('#vozEstado').textContent = '🎙 ' + dicho;
      campoTexto.value = vozATexto(dicho); if (typeof hayMathLive === 'function' && hayMathLive()) campoMath.setValue(''); actualizarDeteccion();
    };
    rec.onerror = e => { parar(); if (e.error === 'not-allowed' || e.error === 'service-not-allowed') avisar('Para dictar, permití el uso del micrófono en tu navegador'); else if (e.error === 'no-speech') avisar('No escuché nada: probá de nuevo más cerca del micrófono'); else if (e.error !== 'aborted') avisar('No pude usar el micrófono'); };
    rec.onend = () => { const listo = escuchando && campoTexto.value.trim(); parar(); if (listo) { avisar('Revisá lo que escribí y tocá Resolver'); campoTexto.focus(); } };
    try { rec.start(); escuchando = true; boton.classList.add('escuchando'); boton.setAttribute('aria-pressed', 'true'); boton.title = 'Dejar de escuchar'; $('#vozEstado').hidden = false; $('#vozEstado').textContent = '🎙 Te escucho… decí el ejercicio'; } catch (e) { parar(); }
  });
})();
