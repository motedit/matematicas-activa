/* =======================================================================
 * EXPORTAR LA RESOLUCIÓN A WORD (.docx) Y A LaTeX (.tex)
 *  · Word: las fórmulas quedan como ecuaciones de Word (editables con el
 *    editor de ecuaciones), las tablas como tablas y los gráficos como
 *    imágenes. Se arma el .docx acá mismo, sin servidor ni librerías:
 *    KaTeX da la fórmula en MathML y se traduce a OMML (el formato de
 *    ecuaciones de Word); después se empaqueta todo en un ZIP.
 *  · LaTeX: un .tex listo para compilar (pdflatex u Overleaf).
 * ===================================================================== */
'use strict';

/* ---------- 1. ZIP mínimo (sin compresión) ---------- */
const TABLA_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLA_CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function armarZip(archivos) {                       // [{ nombre, datos: Uint8Array | string }]
  const enc = new TextEncoder(), partes = [], central = []; let pos = 0;
  const f = new Date(), hora = (f.getHours() << 11) | (f.getMinutes() << 5) | (f.getSeconds() >> 1), dia = ((f.getFullYear() - 1980) << 9) | ((f.getMonth() + 1) << 5) | f.getDate();
  for (const a of archivos) {
    const nom = enc.encode(a.nombre), d = typeof a.datos === 'string' ? enc.encode(a.datos) : a.datos, crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, hora, 2], [12, dia, 2], [14, crc, 4], [18, d.length, 4], [22, d.length, 4], [26, nom.length, 2], [28, 0, 2]].forEach(([o, v, n]) => n === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
    const c = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, hora, 2], [14, dia, 2], [16, crc, 4], [20, d.length, 4], [24, d.length, 4], [28, nom.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, pos, 4]].forEach(([o, v, n]) => n === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true));
    partes.push(new Uint8Array(h.buffer), nom, d); central.push(new Uint8Array(c.buffer), nom); pos += 30 + nom.length + d.length;
  }
  const tam = central.reduce((s, x) => s + x.length, 0), fin = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, archivos.length, 2], [10, archivos.length, 2], [12, tam, 4], [16, pos, 4], [20, 0, 2]].forEach(([o, v, n]) => n === 4 ? fin.setUint32(o, v, true) : fin.setUint16(o, v, true));
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/* ---------- 2. Fórmulas: MathML (KaTeX) → OMML (Word) ---------- */
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const GRANDES = '∑∏∐∫∬∭∮⋃⋂⋁⋀';
const ACENTOS = { '^': '\u0302', 'ˆ': '\u0302', '~': '\u0303', '˜': '\u0303', '→': '\u20D7', '⃗': '\u20D7', '˙': '\u0307', '¨': '\u0308', 'ˇ': '\u030C', '´': '\u0301', '`': '\u0300', '˘': '\u0306' };
function mRun(texto, estilo) {
  if (!texto) return '';
  const pr = estilo === 'ds' ? '<m:rPr><m:scr m:val="double-struck"/><m:sty m:val="p"/></m:rPr>' : estilo === 'nor' ? '<m:rPr><m:nor/></m:rPr>' : estilo ? `<m:rPr><m:sty m:val="${estilo}"/></m:rPr>` : '';
  return `<m:r>${pr}<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><m:t xml:space="preserve">${xml(texto)}</m:t></m:r>`;
}
const hijos = n => [...n.children].filter(c => c.localName !== 'annotation' && c.localName !== 'annotation-xml');
const textoDe = n => (n.textContent || '').replace(/\u2061|\u2062|\u2063/g, '');
const esGrande = n => n && n.localName === 'mo' && GRANDES.includes(textoDe(n).trim());
// Texto común dentro de una fórmula (KaTeX parte "años" en "a" + ñ acentuada + "os"): se vuelve a juntar
function textoPlano(n) {
  if (!n) return null;
  if (n.localName === 'mtext') return textoDe(n).replace(/\u00a0/g, ' ');
  if (n.localName === 'mover' && n.getAttribute('accent') === 'true') { const [b, ac] = hijos(n); const c = ACENTOS[textoDe(ac).trim()];
    if (b && /^(mtext|mi)$/.test(b.localName) && textoDe(b).length === 1 && c && (textoDe(b) + c).normalize('NFC').length === 1) return (textoDe(b) + c).normalize('NFC'); }
  return null;
}
function omFila(lista) {                             // convierte una fila de nodos; ∑ e ∫ se "comen" lo que sigue
  let out = '';
  for (let i = 0; i < lista.length; i++) {
    if (textoPlano(lista[i]) !== null && (lista[i].localName === 'mtext' || textoPlano(lista[i - 1]) !== null || textoPlano(lista[i + 1]) !== null)) {
      let s = ''; while (i < lista.length && textoPlano(lista[i]) !== null) s += textoPlano(lista[i++]);
      i--; out += mRun(s, 'nor'); continue;
    }
    const n = lista[i], base = ['msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover'].includes(n.localName) ? hijos(n)[0] : null;
    if (esGrande(n) || (base && esGrande(base))) {
      const h = hijos(n), chr = textoDe(esGrande(n) ? n : base).trim();
      let sub = '', sup = '';
      if (/^(msub|munder)$/.test(n.localName)) sub = om(h[1]);
      if (/^(msup|mover)$/.test(n.localName)) sup = om(h[1]);
      if (/^(msubsup|munderover)$/.test(n.localName)) { sub = om(h[1]); sup = om(h[2]); }
      out += `<m:nary><m:naryPr><m:chr m:val="${xml(chr)}"/><m:limLoc m:val="${/^mu/.test(n.localName) ? 'undOvr' : 'subSup'}"/>${sub ? '' : '<m:subHide m:val="1"/>'}${sup ? '' : '<m:supHide m:val="1"/>'}</m:naryPr><m:sub>${sub}</m:sub><m:sup>${sup}</m:sup><m:e>${omFila(lista.slice(i + 1))}</m:e></m:nary>`;
      return out;
    }
    // 6{,}25 → un solo número (KaTeX lo parte en número, coma y número)
    const sig = lista[i + 1], sol = x => (x && x.localName === 'mrow' && hijos(x).length === 1 ? hijos(x)[0] : x), coma = sol(sig);
    if (n.localName === 'mn' && coma && coma.localName === 'mo' && /^[,.]$/.test(textoDe(coma)) && lista[i + 2] && lista[i + 2].localName === 'mn') { out += mRun(textoDe(n) + textoDe(coma) + textoDe(lista[i + 2]), 'p'); i += 2; continue; }
    out += om(n);
  }
  return out;
}
function om(n) {
  if (!n) return '';
  const h = hijos(n), t = n.localName;
  switch (t) {
    case 'math': case 'semantics': case 'mstyle': case 'mpadded': case 'mrow': case 'mtd': {
      if (t === 'semantics') return om(h[0]);
      const a = h[0], z = h[h.length - 1];
      if (h.length >= 2 && a.localName === 'mo' && z.localName === 'mo' && a.getAttribute('fence') === 'true' && z.getAttribute('fence') === 'true')
        return `<m:d><m:dPr><m:begChr m:val="${xml(textoDe(a))}"/><m:endChr m:val="${xml(textoDe(z))}"/></m:dPr><m:e>${omFila(h.slice(1, -1))}</m:e></m:d>`;
      return omFila(h);
    }
    case 'mi': { const v = n.getAttribute('mathvariant'), s = textoDe(n); return mRun(s, v === 'double-struck' ? 'ds' : v === 'bold' || v === 'bold-italic' ? 'b' : v === 'normal' || s.length > 1 ? 'p' : null); }
    case 'mn': case 'mo': return mRun(textoDe(n), 'p');
    case 'mtext': case 'ms': return mRun(textoDe(n).replace(/\u00a0/g, ' '), 'nor');
    case 'mspace': { const w = parseFloat(n.getAttribute('width') || '0'); return w >= 0.2 ? mRun(w >= 0.9 ? '  ' : ' ', 'p') : ''; }
    case 'mphantom': case 'none': case 'mprescripts': return '';
    case 'msup': return `<m:sSup><m:e>${om(h[0])}</m:e><m:sup>${om(h[1])}</m:sup></m:sSup>`;
    case 'msub': return `<m:sSub><m:e>${om(h[0])}</m:e><m:sub>${om(h[1])}</m:sub></m:sSub>`;
    case 'msubsup': return `<m:sSubSup><m:e>${om(h[0])}</m:e><m:sub>${om(h[1])}</m:sub><m:sup>${om(h[2])}</m:sup></m:sSubSup>`;
    case 'mfrac': return `<m:f>${/^0/.test(n.getAttribute('linethickness') || '') ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : ''}<m:num>${om(h[0])}</m:num><m:den>${om(h[1])}</m:den></m:f>`;
    case 'msqrt': return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${omFila(h)}</m:e></m:rad>`;
    case 'mroot': return `<m:rad><m:deg>${om(h[1])}</m:deg><m:e>${om(h[0])}</m:e></m:rad>`;
    case 'mover': case 'munder': {
      const marca = textoDe(h[1]).trim(), arriba = t === 'mover';
      if (/^[‾¯ˉ_―─]$/.test(marca)) return `<m:bar><m:barPr><m:pos m:val="${arriba ? 'top' : 'bot'}"/></m:barPr><m:e>${om(h[0])}</m:e></m:bar>`;
      if (arriba && (n.getAttribute('accent') === 'true' || ACENTOS[marca]) && ACENTOS[marca]) return `<m:acc><m:accPr><m:chr m:val="${ACENTOS[marca]}"/></m:accPr><m:e>${om(h[0])}</m:e></m:acc>`;
      if (/^[⏟⏞︸︷]$/.test(marca)) return `<m:groupChr><m:groupChrPr><m:chr m:val="${marca}"/><m:pos m:val="${arriba ? 'top' : 'bot'}"/></m:groupChrPr><m:e>${om(h[0])}</m:e></m:groupChr>`;
      return arriba ? `<m:limUpp><m:e>${om(h[0])}</m:e><m:lim>${om(h[1])}</m:lim></m:limUpp>` : `<m:limLow><m:e>${om(h[0])}</m:e><m:lim>${om(h[1])}</m:lim></m:limLow>`;
    }
    case 'munderover': return `<m:limUpp><m:e><m:limLow><m:e>${om(h[0])}</m:e><m:lim>${om(h[1])}</m:lim></m:limLow></m:e><m:lim>${om(h[2])}</m:lim></m:limUpp>`;
    case 'menclose': {
      const no = n.getAttribute('notation') || '';
      if (/strike/.test(no)) return `<m:borderBox><m:borderBoxPr><m:hideTop m:val="1"/><m:hideBot m:val="1"/><m:hideLeft m:val="1"/><m:hideRight m:val="1"/><m:strikeBLTR m:val="1"/></m:borderBoxPr><m:e>${omFila(h)}</m:e></m:borderBox>`;
      return `<m:borderBox><m:e>${omFila(h)}</m:e></m:borderBox>`;
    }
    case 'mtable': {
      const filas = h.filter(x => x.localName === 'mtr' || x.localName === 'mlabeledtr'), cols = Math.max(1, ...filas.map(f => hijos(f).length));
      return `<m:m><m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="${cols}"/><m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs></m:mPr>${filas.map(f => { const cs = hijos(f); return `<m:mr>${Array.from({ length: cols }, (_, i) => `<m:e>${cs[i] ? om(cs[i]) : ''}</m:e>`).join('')}</m:mr>`; }).join('')}</m:m>`;
    }
    default: return omFila(h);
  }
}
function latexAOmml(lx) {
  let html;
  try { html = katex.renderToString(lx, { output: 'mathml', throwOnError: false, displayMode: false }); } catch (e) { return mRun(lx, 'p'); }
  const doc = new DOMParser().parseFromString(html, 'text/html'), m = doc.querySelector('math');
  return m ? `<m:oMath>${om(m)}</m:oMath>` : `<m:oMath>${mRun(lx, 'p')}</m:oMath>`;
}

/* ---------- 3. Partes del documento Word ---------- */
const wTexto = (s, pr = '') => s ? `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(s)}</w:t></w:r>` : '';
// Texto con fórmulas entre $…$ (igual que conFormulas en la página)
function wEnLinea(s, pr = '') {
  let out = '', ult = 0; const re = /\$([^$]+)\$/g; let m;
  while ((m = re.exec(s))) { out += wTexto(s.slice(ult, m.index), pr) + latexAOmml(m[1]); ult = re.lastIndex; }
  return out + wTexto(s.slice(ult), pr);
}
const wParrafo = (contenido, estilo = '', extra = '') => `<w:p>${estilo || extra ? `<w:pPr>${estilo ? `<w:pStyle w:val="${estilo}"/>` : ''}${extra}</w:pPr>` : ''}${contenido}</w:p>`;
const wFormula = lx => `<w:p><w:pPr><w:pStyle w:val="Formula"/></w:pPr><m:oMathPara><m:oMathParaPr><m:jc m:val="left"/></m:oMathParaPr>${latexAOmml(lx)}</m:oMathPara></w:p>`;
function wTabla(tabla) {
  const filas = [...tabla.querySelectorAll('tr')]; if (!filas.length) return '';
  const cols = Math.max(...filas.map(f => [...f.children].reduce((s, c) => s + (+c.getAttribute('colspan') || 1), 0)));
  const ancho = Math.floor(9600 / cols), borde = v => `<w:${v} w:val="single" w:sz="4" w:space="0" w:color="B9CCE0"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(borde).join('')}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${Array.from({ length: cols }, () => `<w:gridCol w:w="${ancho}"/>`).join('')}</w:tblGrid>${filas.map(f => {
    const cab = !!f.closest('thead') || [...f.children].every(c => c.localName === 'th');
    return `<w:tr>${cab ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${[...f.children].map(c => { const cs = +c.getAttribute('colspan') || 1, th = c.localName === 'th';
      return `<w:tc><w:tcPr>${cs > 1 ? `<w:gridSpan w:val="${cs}"/>` : ''}${th ? '<w:shd w:val="clear" w:color="auto" w:fill="E8F0F8"/>' : ''}</w:tcPr>${wParrafo(wEnLinea(c.textContent.replace(/\s+/g, ' ').trim(), th ? '<w:b/>' : ''), 'Celda')}</w:tc>`; }).join('')}</w:tr>`;
  }).join('')}</w:tbl>${wParrafo('', 'Normal')}`;
}
function wImagen(img, id) {
  const max = 6000000, esc = Math.min(1, max / (img.w * 9525)), cx = Math.round(img.w * 9525 * esc), cy = Math.round(img.h * 9525 * esc);
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Gráfico ${id}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="grafico${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}
// Gráfico SVG de la página → PNG (copiando los colores de la hoja de estilos, en tema claro)
const PROPS_SVG = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'visibility', 'display'];
function svgAPng(vivo) {
  return new Promise((ok, mal) => {
    const raiz = document.documentElement, tema = raiz.getAttribute('data-theme'); raiz.setAttribute('data-theme', 'light');
    const copia = vivo.cloneNode(true), orig = [vivo, ...vivo.querySelectorAll('*')], dest = [copia, ...copia.querySelectorAll('*')];
    orig.forEach((o, i) => { const cs = getComputedStyle(o); dest[i].setAttribute('style', PROPS_SVG.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';')); });
    tema === null ? raiz.removeAttribute('data-theme') : raiz.setAttribute('data-theme', tema);
    const vb = (vivo.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    let w = vb.length === 4 ? vb[2] : +vivo.getAttribute('width') || 400, h = vb.length === 4 ? vb[3] : +vivo.getAttribute('height') || 300;
    const k = Math.max(1, 560 / w); w = Math.round(w * k); h = Math.round(h * k);
    copia.setAttribute('width', w); copia.setAttribute('height', h); copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const im = new Image();
    im.onload = () => { const c = document.createElement('canvas'), z = 2; c.width = w * z; c.height = h * z; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(b => (b ? b.arrayBuffer().then(ab => ok({ datos: new Uint8Array(ab), w, h })) : mal(new Error('No se pudo convertir el gráfico.'))), 'image/png'); };
    im.onerror = () => mal(new Error('No se pudo convertir el gráfico.'));
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copia));
  });
}
// Recorre el HTML de un paso: tablas, gráficos y texto, en orden
function bloquesHTML(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html'), out = [];
  const rec = n => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) { const s = c.textContent.replace(/\s+/g, ' ').trim(); if (s) out.push({ tipo: 'texto', s }); continue; }
      if (c.nodeType !== 1) continue;
      const t = c.localName;
      if (t === 'table') out.push({ tipo: 'tabla', nodo: c });
      else if (t === 'svg') out.push({ tipo: 'svg' });
      else if (t === 'style' || t === 'script') continue;
      else if (c.querySelector('table, svg')) rec(c);
      else { const s = c.textContent.replace(/\s+/g, ' ').trim(); if (s) out.push({ tipo: 'texto', s }); }
    }
  };
  rec(doc.body.firstChild); return out;
}
const datosHoja = () => {
  const r = actual; if (!r) throw new Error('Primero resolvé un ejercicio.');
  let tema = r.tema, areaN = ''; try { tema = temasArea()[r.tema] || r.tema; areaN = datosArea(area).nombre || ''; } catch (e) { /* nombres por defecto */ }
  const sitio = (typeof PLATAFORMA !== 'undefined' && PLATAFORMA.sitio && (PLATAFORMA.sitio.nombre || PLATAFORMA.sitio.url)) || 'Matemáticas Activa';
  return { r, tema, areaN, entrada: String(ultimaEntrada || ''), sitio, fecha: new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) };
};
const nombreArchivo = (e, ext) => `resolucion-${(e || 'ejercicio').replace(/[^\wáéíóúñ]+/gi, '-').slice(0, 40).replace(/^-+|-+$/g, '') || 'ejercicio'}.${ext}`;
function bajar(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

async function armarWord() {
  const { r, tema, areaN, entrada, sitio, fecha } = datosHoja(), imagenes = [];
  const vivos = [...$('#pasos').children].map(li => [...li.querySelectorAll('svg')].filter(s => !s.closest('.katex')));
  let cuerpo = wParrafo(wTexto('Matemática paso a paso'), 'Title') +
    wParrafo(wTexto(`${areaN ? areaN + ' · ' : ''}${tema} · ${r.metodo}`), 'Subtitulo') +
    wParrafo(wTexto('Ejercicio: ', '<w:b/>') + wTexto(entrada), 'Normal');
  for (let i = 0; i < r.pasos.length; i++) {
    const p = r.pasos[i];
    cuerpo += wParrafo(wTexto(`Paso ${i + 1}. `) + wTexto(p.titulo), 'Heading2');
    if (p.texto) cuerpo += wParrafo(wEnLinea(p.texto), 'Normal');
    for (const m of p.mates) cuerpo += wFormula(m);
    if (p.html) {
      let k = 0;
      for (const b of bloquesHTML(p.html)) {
        if (b.tipo === 'texto') cuerpo += wParrafo(wEnLinea(b.s), 'Normal');
        else if (b.tipo === 'tabla') cuerpo += wTabla(b.nodo);
        else { const v = (vivos[i] || [])[k++]; if (!v) continue; try { const im = await svgAPng(v), id = imagenes.length + 1; imagenes.push(im); cuerpo += wImagen(im, id); } catch (e) { cuerpo += wParrafo(wTexto('(Gráfico: ver en la calculadora)', '<w:i/>'), 'Normal'); } }
      }
    }
  }
  cuerpo += wParrafo(wTexto('Resultado'), 'Heading1') + wFormula(r.resultado);
  if (r.respuesta) cuerpo += wParrafo(wTexto('Respuesta: ', '<w:b/>') + wTexto(r.respuesta), 'Normal');
  cuerpo += wParrafo(wTexto(`Hecho con Matemática paso a paso · ${sitio} · ${fecha}`), 'Pie');
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS}><w:body>${cuerpo}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const fuente = (f, t) => `<w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}"/>${t}</w:rPr>`;
  const estilo = (id, nombre, pPr, rPr, base = 'Normal') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nombre}"/>${id !== 'Normal' ? `<w:basedOn w:val="${base}"/><w:next w:val="Normal"/>` : ''}<w:qFormat/>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${rPr}</w:style>`;
  const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault>${fuente('Calibri', '<w:sz w:val="23"/><w:lang w:val="es-AR"/>')}</w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
    estilo('Normal', 'Normal', '', '<w:rPr/>') +
    estilo('Title', 'Title', '<w:spacing w:after="40"/>', '<w:rPr><w:b/><w:color w:val="12558F"/><w:sz w:val="40"/></w:rPr>') +
    estilo('Subtitulo', 'Subtitle', '<w:spacing w:after="200"/>', '<w:rPr><w:color w:val="4B6479"/><w:sz w:val="22"/></w:rPr>') +
    estilo('Heading1', 'heading 1', '<w:keepNext/><w:spacing w:before="280" w:after="80"/><w:outlineLvl w:val="0"/>', '<w:rPr><w:b/><w:color w:val="0F7D74"/><w:sz w:val="28"/></w:rPr>') +
    estilo('Heading2', 'heading 2', '<w:keepNext/><w:spacing w:before="220" w:after="60"/><w:outlineLvl w:val="1"/>', '<w:rPr><w:b/><w:color w:val="1B6EC2"/><w:sz w:val="24"/></w:rPr>') +
    estilo('Formula', 'Fórmula', '<w:spacing w:before="40" w:after="80"/><w:ind w:left="360"/>', '<w:rPr/>') +
    estilo('Celda', 'Celda', '<w:spacing w:before="20" w:after="20"/><w:jc w:val="center"/>', '<w:rPr><w:sz w:val="20"/></w:rPr>') +
    estilo('Pie', 'Pie', '<w:spacing w:before="400"/>', '<w:rPr><w:i/><w:color w:val="4B6479"/><w:sz w:val="18"/></w:rPr>') + '</w:styles>';
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rEst" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${imagenes.map((_, i) => `<Relationship Id="rImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/grafico${i + 1}.png"/>`).join('')}</Relationships>`;
  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const raiz = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(`Resolución: ${entrada}`.slice(0, 200))}</dc:title><dc:creator>Matemática paso a paso</dc:creator><dc:language>es-AR</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`;
  return armarZip([{ nombre: '[Content_Types].xml', datos: tipos }, { nombre: '_rels/.rels', datos: raiz }, { nombre: 'docProps/core.xml', datos: core }, { nombre: 'word/document.xml', datos: doc }, { nombre: 'word/styles.xml', datos: estilos }, { nombre: 'word/_rels/document.xml.rels', datos: rels }, ...imagenes.map((im, i) => ({ nombre: `word/media/grafico${i + 1}.png`, datos: im.datos }))]);
}

/* ---------- 4. LaTeX ---------- */
const texEsc = s => String(s).replace(/\\/g, '\u0000').replace(/([{}$&%#_])/g, '\\$1').replace(/\^/g, '\\^{}').replace(/~/g, '\\~{}').replace(/\u0000/g, '\\textbackslash{}')
  .replace(/[“”]/g, '"').replace(/✓/g, '\\checkmark{}').replace(/→/g, '$\\to$').replace(/·/g, '$\\cdot$').replace(/≤/g, '$\\le$').replace(/≥/g, '$\\ge$').replace(/≠/g, '$\\ne$').replace(/×/g, '$\\times$').replace(/÷/g, '$\\div$').replace(/−/g, '$-$').replace(/π/g, '$\\pi$').replace(/√/g, '$\\surd$').replace(/°/g, '$^\\circ$').replace(/±/g, '$\\pm$').replace(/∞/g, '$\\infty$').replace(/Δ/g, '$\\Delta$').replace(/[👍👎]/gu, '');
function texEnLinea(s) {                              // texto con $…$: el texto se escapa, las fórmulas quedan
  let out = '', ult = 0; const re = /\$([^$]+)\$/g; let m;
  while ((m = re.exec(s))) { out += texEsc(s.slice(ult, m.index)) + `$${m[1]}$`; ult = re.lastIndex; }
  return out + texEsc(s.slice(ult));
}
function texTabla(tabla) {
  const filas = [...tabla.querySelectorAll('tr')]; if (!filas.length) return '';
  const cols = Math.max(...filas.map(f => [...f.children].reduce((s, c) => s + (+c.getAttribute('colspan') || 1), 0)));
  const cuerpo = filas.map((f, i) => [...f.children].map(c => { const cs = +c.getAttribute('colspan') || 1, x = texEnLinea(c.textContent.replace(/\s+/g, ' ').trim()), v = c.localName === 'th' ? `\\textbf{${x}}` : x; return cs > 1 ? `\\multicolumn{${cs}}{|c|}{${v}}` : v; }).join(' & ') + ' \\\\' + (i === 0 || f.closest('thead') ? ' \\hline' : '')).join('\n');
  const t = `\\begin{tabular}{|${'c|'.repeat(cols)}}\n\\hline\n${cuerpo}\n\\hline\n\\end{tabular}`;
  return `\\begin{center}\n${cols >= 6 ? `\\resizebox{\\linewidth}{!}{%\n${t}}` : t}\n\\end{center}\n`;
}
// Caracteres especiales que pdflatex no conoce: se declaran solos (los que aparecen en este documento)
const UNI_TEX = { '✔': '\\checkmark', '✘': '\\times', 'ŷ': '\\hat{y}', 'ȳ': '\\bar{y}', 'ˣ': '^{x}', 'ᵐ': '^{m}', 'ᵖ': '^{p}', 'Φ': '\\Phi', 'Γ': '\\Gamma', 'Λ': '\\Lambda', 'Ψ': '\\Psi', 'Θ': '\\Theta', 'ψ': '\\psi', 'χ': '\\chi', 'η': '\\eta', 'ζ': '\\zeta', 'κ': '\\kappa', 'ν': '\\nu', 'ξ': '\\xi', 'ι': '\\iota', 'υ': '\\upsilon', '↗': '\\nearrow', '↘': '\\searrow', '↑': '\\uparrow', '↓': '\\downarrow', '∘': '\\circ', '⊕': '\\oplus', '⊗': '\\otimes', '⋯': '\\cdots', '⋮': '\\vdots', '∓': '\\mp', '≪': '\\ll', '≫': '\\gg', '∝': '\\propto', '⟹': '\\Longrightarrow', '⟺': '\\Longleftrightarrow', '∄': '\\nexists', '⊄': '\\not\\subset', '⊃': '\\supset', '∆': '\\Delta', 'ℓ': '\\ell', '′': "'", '″': "''", 'ⁱ': '^{i}', 'ⁿ': '^{n}', '⁺': '^{+}', '⁻': '^{-}', 'ᵢ': '_{i}', 'ⱼ': '_{j}', '₊': '_{+}', '₋': '_{-}', '₍': '_{(}', '₎': '_{)}', 'ₐ': '_{a}', 'ₑ': '_{e}', 'ₒ': '_{o}', 'ₓ': '_{x}', 'ₕ': '_{h}', 'ₖ': '_{k}', 'ₗ': '_{l}', 'ₘ': '_{m}', 'ₙ': '_{n}', 'ₚ': '_{p}', 'ₛ': '_{s}', 'ₜ': '_{t}' };
'₀₁₂₃₄₅₆₇₈₉'.split('').forEach((c, i) => { UNI_TEX[c] = `_{${i}}`; }); '⁰¹²³⁴⁵⁶⁷⁸⁹'.split('').forEach((c, i) => { UNI_TEX[c] = `^{${i}}`; });
function completarUnicode(doc) {
  doc = doc.replace(/(.)̄/g, '\\ensuremath{\\bar{$1}}').replace(/(.)̂/g, '\\ensuremath{\\hat{$1}}').replace(/(.)⃗/g, '\\ensuremath{\\vec{$1}}').replace(/(.)̃/g, '\\ensuremath{\\tilde{$1}}');
  const ya = new Set([...doc.matchAll(/DeclareUnicodeCharacter\{([0-9A-F]{4,5})\}/g)].map(m => m[1]));
  const nuevos = [...new Set([...doc].filter(c => c.codePointAt(0) > 0xFF))].map(c => [c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'), c])
    .filter(([h]) => !ya.has(h) && !/^(201[3489CD]|2026|20AC)$/.test(h));
  return doc.replace('%%UNICODE%%', nuevos.map(([h, c]) => `\\DeclareUnicodeCharacter{${h}}{${UNI_TEX[c] ? `\\ensuremath{${UNI_TEX[c]}}` : '?'}}`).join('\n'));
}
function armarLatex() {
  const { r, tema, areaN, entrada, sitio, fecha } = datosHoja();
  const pasos = r.pasos.map(p => {
    let s = `\\item \\textbf{${texEsc(p.titulo)}}\\par\n`;
    if (p.texto) s += texEnLinea(p.texto) + '\n';
    for (const m of p.mates) s += `\\[ ${m} \\]\n`;
    if (p.html) for (const b of bloquesHTML(p.html)) s += b.tipo === 'texto' ? texEnLinea(b.s) + '\\par\n' : b.tipo === 'tabla' ? texTabla(b.nodo) : '\\emph{(Gráfico: se puede ver en la calculadora.)}\\par\n';
    return s;
  }).join('\n');
  return completarUnicode(`% Resolución exportada desde Matemática paso a paso (${sitio}) · ${fecha}
% Se compila con pdflatex (o en Overleaf).
\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\IfFileExists{spanish.ldf}{\\usepackage[spanish,es-noshorthands,es-nodecimaldot]{babel}}{}
\\usepackage{amsmath,amssymb,mathtools}
\\usepackage{cancel,xcolor,graphicx,enumitem}
\\usepackage[margin=2.2cm]{geometry}
\\DeclareUnicodeCharacter{00B7}{\\ensuremath{\\cdot}}
\\DeclareUnicodeCharacter{2212}{\\ensuremath{-}}
\\DeclareUnicodeCharacter{2264}{\\ensuremath{\\le}}
\\DeclareUnicodeCharacter{2265}{\\ensuremath{\\ge}}
\\DeclareUnicodeCharacter{2260}{\\ensuremath{\\ne}}
\\DeclareUnicodeCharacter{00D7}{\\ensuremath{\\times}}
\\DeclareUnicodeCharacter{00F7}{\\ensuremath{\\div}}
\\DeclareUnicodeCharacter{03C0}{\\ensuremath{\\pi}}
\\DeclareUnicodeCharacter{221E}{\\ensuremath{\\infty}}
\\DeclareUnicodeCharacter{2192}{\\ensuremath{\\to}}
\\DeclareUnicodeCharacter{21D2}{\\ensuremath{\\Rightarrow}}
\\DeclareUnicodeCharacter{2208}{\\ensuremath{\\in}}
\\DeclareUnicodeCharacter{2229}{\\ensuremath{\\cap}}
\\DeclareUnicodeCharacter{222A}{\\ensuremath{\\cup}}
\\DeclareUnicodeCharacter{2205}{\\ensuremath{\\varnothing}}
\\DeclareUnicodeCharacter{221A}{\\ensuremath{\\surd}}
\\DeclareUnicodeCharacter{03B1}{\\ensuremath{\\alpha}}
\\DeclareUnicodeCharacter{03B2}{\\ensuremath{\\beta}}
\\DeclareUnicodeCharacter{03B8}{\\ensuremath{\\theta}}
\\DeclareUnicodeCharacter{03BC}{\\ensuremath{\\mu}}
\\DeclareUnicodeCharacter{03C3}{\\ensuremath{\\sigma}}
\\DeclareUnicodeCharacter{03BB}{\\ensuremath{\\lambda}}
\\DeclareUnicodeCharacter{0394}{\\ensuremath{\\Delta}}
\\DeclareUnicodeCharacter{2248}{\\ensuremath{\\approx}}
\\DeclareUnicodeCharacter{2026}{\\ldots}
\\DeclareUnicodeCharacter{2713}{\\ensuremath{\\checkmark}}
\\DeclareUnicodeCharacter{00B2}{\\ensuremath{^2}}
\\DeclareUnicodeCharacter{00B3}{\\ensuremath{^3}}
\\DeclareUnicodeCharacter{2032}{\\ensuremath{'}}
\\DeclareUnicodeCharacter{222B}{\\ensuremath{\\int}}
\\DeclareUnicodeCharacter{2211}{\\ensuremath{\\sum}}
\\DeclareUnicodeCharacter{220F}{\\ensuremath{\\prod}}
\\DeclareUnicodeCharacter{2202}{\\ensuremath{\\partial}}
\\DeclareUnicodeCharacter{2200}{\\ensuremath{\\forall}}
\\DeclareUnicodeCharacter{2203}{\\ensuremath{\\exists}}
\\DeclareUnicodeCharacter{2282}{\\ensuremath{\\subset}}
\\DeclareUnicodeCharacter{2286}{\\ensuremath{\\subseteq}}
\\DeclareUnicodeCharacter{2227}{\\ensuremath{\\wedge}}
\\DeclareUnicodeCharacter{2228}{\\ensuremath{\\vee}}
\\DeclareUnicodeCharacter{00AC}{\\ensuremath{\\neg}}
\\DeclareUnicodeCharacter{2194}{\\ensuremath{\\leftrightarrow}}
\\DeclareUnicodeCharacter{21D4}{\\ensuremath{\\Leftrightarrow}}
\\DeclareUnicodeCharacter{2220}{\\ensuremath{\\angle}}
\\DeclareUnicodeCharacter{25B3}{\\ensuremath{\\triangle}}
\\DeclareUnicodeCharacter{2261}{\\ensuremath{\\equiv}}
\\DeclareUnicodeCharacter{22C5}{\\ensuremath{\\cdot}}
\\DeclareUnicodeCharacter{2219}{\\ensuremath{\\cdot}}
\\DeclareUnicodeCharacter{2209}{\\ensuremath{\\notin}}
\\DeclareUnicodeCharacter{2216}{\\ensuremath{\\setminus}}
\\DeclareUnicodeCharacter{2213}{\\ensuremath{\\mp}}
\\DeclareUnicodeCharacter{00B1}{\\ensuremath{\\pm}}
\\DeclareUnicodeCharacter{03B3}{\\ensuremath{\\gamma}}
\\DeclareUnicodeCharacter{03B4}{\\ensuremath{\\delta}}
\\DeclareUnicodeCharacter{03B5}{\\ensuremath{\\varepsilon}}
\\DeclareUnicodeCharacter{03C1}{\\ensuremath{\\rho}}
\\DeclareUnicodeCharacter{03C6}{\\ensuremath{\\varphi}}
\\DeclareUnicodeCharacter{03C9}{\\ensuremath{\\omega}}
\\DeclareUnicodeCharacter{03C4}{\\ensuremath{\\tau}}
\\DeclareUnicodeCharacter{03A3}{\\ensuremath{\\Sigma}}
\\DeclareUnicodeCharacter{03A9}{\\ensuremath{\\Omega}}
\\DeclareUnicodeCharacter{03A0}{\\ensuremath{\\Pi}}
\\DeclareUnicodeCharacter{211D}{\\ensuremath{\\mathbb{R}}}
\\DeclareUnicodeCharacter{2115}{\\ensuremath{\\mathbb{N}}}
\\DeclareUnicodeCharacter{2124}{\\ensuremath{\\mathbb{Z}}}
\\DeclareUnicodeCharacter{211A}{\\ensuremath{\\mathbb{Q}}}
\\DeclareUnicodeCharacter{2102}{\\ensuremath{\\mathbb{C}}}
\\DeclareUnicodeCharacter{00BD}{\\ensuremath{\\tfrac{1}{2}}}
\\DeclareUnicodeCharacter{00BC}{\\ensuremath{\\tfrac{1}{4}}}
\\DeclareUnicodeCharacter{00BE}{\\ensuremath{\\tfrac{3}{4}}}
\\DeclareUnicodeCharacter{2070}{\\ensuremath{^{0}}}
\\DeclareUnicodeCharacter{00B9}{\\ensuremath{^{1}}}
\\DeclareUnicodeCharacter{2074}{\\ensuremath{^{4}}}
\\DeclareUnicodeCharacter{207B}{\\ensuremath{^{-}}}
\\DeclareUnicodeCharacter{223C}{\\ensuremath{\\sim}}
\\DeclareUnicodeCharacter{2225}{\\ensuremath{\\parallel}}
\\DeclareUnicodeCharacter{22A5}{\\ensuremath{\\perp}}
\\DeclareUnicodeCharacter{2245}{\\ensuremath{\\cong}}
\\DeclareUnicodeCharacter{221D}{\\ensuremath{\\propto}}
\\DeclareUnicodeCharacter{27E8}{\\ensuremath{\\langle}}
\\DeclareUnicodeCharacter{27E9}{\\ensuremath{\\rangle}}
\\DeclareUnicodeCharacter{2016}{\\ensuremath{\\|}}
\\DeclareUnicodeCharacter{2223}{\\ensuremath{\\mid}}
\\DeclareUnicodeCharacter{00B0}{\\ensuremath{^\\circ}}
\\DeclareUnicodeCharacter{2190}{\\ensuremath{\\leftarrow}}
\\DeclareUnicodeCharacter{21A6}{\\ensuremath{\\mapsto}}
%%UNICODE%%
\\DeclareUnicodeCharacter{00A0}{~}
\\DeclareUnicodeCharacter{2009}{\\,}
\\DeclareUnicodeCharacter{202F}{\\,}
% Comandos que usa KaTeX y no trae LaTeX
\\providecommand{\\R}{\\mathbb{R}}\\providecommand{\\N}{\\mathbb{N}}\\providecommand{\\Z}{\\mathbb{Z}}\\providecommand{\\Q}{\\mathbb{Q}}\\providecommand{\\C}{\\mathbb{C}}
\\providecommand{\\sen}{\\operatorname{sen}}\\providecommand{\\tg}{\\operatorname{tg}}\\providecommand{\\cotg}{\\operatorname{cotg}}\\providecommand{\\cosec}{\\operatorname{cosec}}
\\providecommand{\\arcsen}{\\operatorname{arcsen}}\\providecommand{\\arctg}{\\operatorname{arctg}}\\providecommand{\\arccot}{\\operatorname{arccot}}
\\providecommand{\\sech}{\\operatorname{sech}}\\providecommand{\\csch}{\\operatorname{csch}}\\providecommand{\\arcsinh}{\\operatorname{arcsinh}}\\providecommand{\\arccosh}{\\operatorname{arccosh}}\\providecommand{\\arctanh}{\\operatorname{arctanh}}
\\providecommand{\\degree}{^\\circ}\\providecommand{\\llbracket}{[\\![}\\providecommand{\\rrbracket}{]\\!]}
\\setlength{\\parindent}{0pt}
\\begin{document}
{\\Large\\bfseries Matemática paso a paso}\\\\[2pt]
{\\small\\color{gray} ${texEsc(`${areaN ? areaN + ' · ' : ''}${tema} · ${r.metodo}`)}}

\\medskip
\\textbf{Ejercicio:} ${texEsc(entrada)}

\\begin{enumerate}[leftmargin=*,label=\\textbf{\\arabic*.},itemsep=8pt]
${pasos}
\\end{enumerate}

\\section*{Resultado}
\\[ \\boxed{${r.resultado}} \\]
${r.respuesta ? `\\textbf{Respuesta:} ${texEsc(r.respuesta)}\n` : ''}
\\vfill{\\footnotesize\\itshape Hecho con Matemática paso a paso · ${texEsc(sitio)} · ${texEsc(fecha)}}
\\end{document}
`);
}

/* ---------- 5. Botones ---------- */
async function exportarWord() {
  try { const b = await armarWord(); bajar(b, nombreArchivo(ultimaEntrada, 'docx')); avisar('Documento de Word descargado'); }
  catch (e) { avisar(e.message || 'No se pudo armar el documento.'); }
}
function exportarLatex() {
  try { bajar(new Blob([armarLatex()], { type: 'application/x-tex;charset=utf-8' }), nombreArchivo(ultimaEntrada, 'tex')); avisar('Archivo LaTeX descargado'); }
  catch (e) { avisar(e.message || 'No se pudo armar el archivo.'); }
}
(function () {
  const w = $('#botonWord'), l = $('#botonLatex');
  if (w) w.addEventListener('click', exportarWord);
  if (l) l.addEventListener('click', exportarLatex);
})();
