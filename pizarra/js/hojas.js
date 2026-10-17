/* =================================================================
   Pizarra · varias hojas, fotos y PDF de fondo, zoom y PDF de la clase
   - Cada hoja guarda su dibujo, su fondo (cuadrícula, cartesiano, lisa) y, si tiene, una foto o página de PDF.
   - Las fotos y PDF quedan DEBAJO del dibujo: el borrador no las borra.
   - Las hojas se guardan en este navegador (IndexedDB) solo con la Pizarra completa (lo controla acceso.js).
   ================================================================= */
(function () {
  "use strict";
  const H = { hojas: [], i: 0, z: 1, px: 0, py: 0, imgs: new Map(), mover: false };
  window.PZ_HOJAS = H;

  // El dibujo viejo (una sola hoja) pasa a ser la hoja 1. Se saca de localStorage antes de que arranque la pizarra.
  let dibujoViejo = null;
  try { dibujoViejo = JSON.parse(localStorage.getItem("pd_canvas") || "null"); localStorage.removeItem("pd_canvas"); } catch (e) {}

  // ── Guardado en IndexedDB ──
  const BD = { abrir() { return new Promise((ok, mal) => { const r = indexedDB.open("pizarra-docente", 1); r.onupgradeneeded = () => r.result.createObjectStore("datos"); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); }); },
    async leer(k) { try { const db = await this.abrir(); return await new Promise((ok) => { const q = db.transaction("datos").objectStore("datos").get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ok(null); }); } catch (e) { return null; } },
    async escribir(k, v) { try { const db = await this.abrir(); await new Promise((ok) => { const t = db.transaction("datos", "readwrite"); t.objectStore("datos").put(v, k); t.oncomplete = ok; t.onerror = ok; }); } catch (e) {} } };

  function capturar() { try { H.hojas[H.i].dibujo = canvas.toDataURL(); H.hojas[H.i].bg = bgMode; } catch (e) {} }
  let tGuardar = null;
  // Reemplaza el guardado de una sola hoja (acceso.js lo bloquea en el modo prueba)
  window.persistCanvas = function () {
    clearTimeout(tGuardar);
    tGuardar = setTimeout(() => { capturar(); BD.escribir("hojas", { hojas: H.hojas, i: H.i }); }, 700);
  };

  // ── Fondo: foto o página de PDF debajo del dibujo ──
  function imagen(src) {
    if (H.imgs.has(src)) return H.imgs.get(src);
    const p = new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
    H.imgs.set(src, p); return p;
  }
  // La foto/PDF va en una <img> propia entre la cuadrícula y el dibujo: el navegador la dibuja desde
  // su resolución original, así se ve nítida aunque se haga zoom.
  const fondoImg = document.createElement("img");
  fondoImg.id = "fondoHoja"; fondoImg.alt = "";
  fondoImg.style.cssText = "position:absolute;z-index:1;display:none;pointer-events:none;user-select:none;box-shadow:0 4px 18px rgba(0,0,0,.18);image-rendering:auto";
  bg.after(fondoImg);
  H.rectFondo = null;   // dónde está la foto, en píxeles de la pizarra
  function ubicarFondo() {
    const hoja = H.hojas[H.i];
    if (!hoja || !hoja.fondo) { fondoImg.style.display = "none"; H.rectFondo = null; return; }
    const pintar = () => {
      if (!fondoImg.naturalWidth || H.hojas[H.i] !== hoja) return;
      const r = stage.getBoundingClientRect(), m = 12;
      const k = Math.min((r.width - 2 * m) / fondoImg.naturalWidth, (r.height - 2 * m) / fondoImg.naturalHeight);
      const w = fondoImg.naturalWidth * k, h = fondoImg.naturalHeight * k, x = (r.width - w) / 2, y = (r.height - h) / 2;
      H.rectFondo = { x, y, w, h };
      Object.assign(fondoImg.style, { display: "block", left: x + "px", top: y + "px", width: w + "px", height: h + "px", transformOrigin: `${-x}px ${-y}px`,
        transform: H.z === 1 ? "" : `translate(${H.px}px,${H.py}px) scale(${H.z})` });
      window.dispatchEvent(new Event("pz-fondo"));
    };
    if (fondoImg.dataset.src !== String(hoja.fondo.length) + hoja.fondo.slice(-40)) {
      fondoImg.dataset.src = String(hoja.fondo.length) + hoja.fondo.slice(-40);
      fondoImg.onload = pintar; fondoImg.src = hoja.fondo;
    } else pintar();
  }
  const dibujarBgOriginal = window.drawBg;
  window.drawBg = function () { dibujarBgOriginal(); ubicarFondo(); };

  // Imagen completa de la hoja (cuadrícula + foto + dibujo). "escala" agranda la salida (para el PDF).
  function componer(escala, tipo, calidad) {
    escala = escala || 1;
    const out = document.createElement("canvas"); out.width = Math.round(canvas.width * escala); out.height = Math.round(canvas.height * escala);
    const o = out.getContext("2d"); o.imageSmoothingQuality = "high";
    o.fillStyle = stage.classList.contains("dark") ? "#143028" : "#ffffff"; o.fillRect(0, 0, out.width, out.height);
    o.drawImage(bg, 0, 0, out.width, out.height);
    const f = H.rectFondo, k = (canvas.width / stage.getBoundingClientRect().width) * escala;
    if (f && fondoImg.naturalWidth && fondoImg.style.display !== "none") o.drawImage(fondoImg, f.x * k, f.y * k, f.w * k, f.h * k);
    o.drawImage(canvas, 0, 0, out.width, out.height);
    return out.toDataURL(tipo || "image/png", calidad);
  }
  window.exportComposite = function () { return componer(1); };
  H.componer = componer; H.fondoImg = fondoImg;

  // ── Cambiar de hoja ──
  async function cargar(j) {
    H.i = j; const hoja = H.hojas[j];
    bgMode = hoja.bg || bgMode;
    document.getElementById("bgLabel").textContent = bgMode === "plain" ? "Lisa" : bgMode === "grid" ? "Cuadrícula" : "Cartesiano";
    const r = stage.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    drawBg();
    if (hoja.dibujo) { const im = await imagen(hoja.dibujo); if (im && H.hojas[H.i] === hoja) ctx.drawImage(im, 0, 0, r.width, r.height); H.imgs.delete(hoja.dibujo); }
    undoStack = []; redoStack = []; updoButtons();
    pintarBarra();
  }
  function ir(j) { if (j < 0 || j >= H.hojas.length || j === H.i) return; capturar(); cargar(j); persistCanvas(); window.dispatchEvent(new Event("pz-hoja")); }
  function nueva(fondo) { capturar(); H.hojas.splice(H.i + 1, 0, { dibujo: null, fondo: fondo || null, bg: fondo ? "plain" : bgMode }); cargar(H.i + 1); persistCanvas(); window.dispatchEvent(new Event("pz-hoja")); }
  function borrarHoja() {
    if (H.hojas.length === 1) { clearBoard(); H.hojas[0].fondo = null; drawBg(); return; }
    if (!confirm(`¿Borrar la hoja ${H.i + 1}?`)) return;
    H.hojas.splice(H.i, 1); cargar(Math.min(H.i, H.hojas.length - 1)); persistCanvas(); window.dispatchEvent(new Event("pz-hoja"));
  }
  // Cambiar el fondo de cuadrícula se guarda por hoja
  const cicloOriginal = window.cycleBg;
  window.cycleBg = function () { cicloOriginal(); if (H.hojas[H.i]) H.hojas[H.i].bg = bgMode; drawBg(); persistCanvas(); };
  // Limpiar también saca la foto de fondo (con confirmación)
  const limpiarOriginal = window.clearBoard;
  window.clearBoard = function () {
    const hoja = H.hojas[H.i];
    if (hoja && hoja.fondo && confirm("¿Sacar también la foto o PDF de fondo de esta hoja?")) { hoja.fondo = null; drawBg(); }
    limpiarOriginal();
  };

  // ── Insertar foto o PDF ──
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  function cargarScript(src) { return new Promise((ok, mal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s); }); }
  async function insertar(file) {
    if (!file) return;
    if (file.type === "application/pdf") {
      toast("Abriendo el PDF…");
      try {
        if (!window.pdfjsLib) await cargarScript(PDFJS + "pdf.min.js");
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const n = Math.min(pdf.numPages, 30);
        for (let k = 1; k <= n; k++) {
          const pag = await pdf.getPage(k), vp0 = pag.getViewport({ scale: 1 });
          const vp = pag.getViewport({ scale: Math.min(4, 2600 / vp0.width) });   // ~2600 px de ancho: texto nítido con zoom
          const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
          const c2 = cv.getContext("2d"); c2.fillStyle = "#fff"; c2.fillRect(0, 0, cv.width, cv.height);
          await pag.render({ canvasContext: c2, viewport: vp }).promise;
          nueva(cv.toDataURL("image/jpeg", 0.93));
        }
        cargar(H.i - n + 1); toast(`Listo: ${n} hoja${n > 1 ? "s" : ""} del PDF${pdf.numPages > 30 ? " (máximo 30)" : ""}`);
      } catch (e) { toast("No se pudo abrir el PDF"); }
      return;
    }
    if (!file.type.startsWith("image/")) { toast("Elegí una foto o un PDF"); return; }
    const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(file); });
    const im = await imagen(url); if (!im) { toast("No se pudo abrir la imagen"); return; }
    // se achica a 3000 px como máximo (más que eso no se nota y pesa mucho)
    const k = Math.min(1, 3000 / Math.max(im.width, im.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
    const c3 = cv.getContext("2d"); c3.imageSmoothingQuality = "high"; c3.drawImage(im, 0, 0, cv.width, cv.height);
    const vacia = !H.hojas[H.i].dibujo || esVacia();
    const datos = (k === 1 && file.size < 2500000) ? url : cv.toDataURL("image/jpeg", 0.93);   // si ya es chica, se usa la original sin recomprimir
    if (vacia && !H.hojas[H.i].fondo) { H.hojas[H.i].fondo = datos; H.hojas[H.i].bg = "plain"; bgMode = "plain"; drawBg(); persistCanvas(); pintarBarra(); }
    else nueva(datos);
    toast("Foto puesta de fondo: escribí encima");
  }
  function esVacia() {
    try { const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data; for (let i = 3; i < d.length; i += 64) if (d[i]) return false; } catch (e) {}
    return true;
  }

  // ── Zoom y mover ──
  function aplicarZoom() {
    const r = stage.getBoundingClientRect();
    H.px = Math.min(0, Math.max(r.width * (1 - H.z), H.px)); H.py = Math.min(0, Math.max(r.height * (1 - H.z), H.py));
    [bg, canvas].forEach((cv) => { cv.style.transformOrigin = "0 0"; cv.style.transform = H.z === 1 ? "" : `translate(${H.px}px,${H.py}px) scale(${H.z})`; });
    if (H.rectFondo) fondoImg.style.transform = H.z === 1 ? "" : `translate(${H.px}px,${H.py}px) scale(${H.z})`;
    const z = document.getElementById("hjZoom"); if (z) z.textContent = Math.round(H.z * 100) + "%";
    document.getElementById("hjMover")?.classList.toggle("on", H.mover);
    if (H.z !== 1) document.querySelectorAll(".instrument:not(.hidden)").forEach((el) => { el.classList.add("hidden"); document.querySelector(`.tool-inst[data-inst="${el.id}"]`)?.classList.remove("active"); });
  }
  function zoom(f, cxp, cyp) {
    const r = stage.getBoundingClientRect(); cxp = cxp ?? r.width / 2; cyp = cyp ?? r.height / 2;
    const nz = Math.min(4, Math.max(1, Math.round(H.z * f * 100) / 100));
    H.px = cxp - (cxp - H.px) * (nz / H.z); H.py = cyp - (cyp - H.py) * (nz / H.z); H.z = nz;
    if (H.z === 1) { H.px = 0; H.py = 0; H.mover = false; }
    aplicarZoom();
  }
  // Coordenadas del puntero teniendo en cuenta el zoom
  window.pos = function (e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / H.z, y: (e.clientY - r.top) / H.z }; };
  stage.addEventListener("wheel", (e) => {
    if (!e.ctrlKey && H.z === 1) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    if (e.ctrlKey) zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    else { H.px -= e.deltaX; H.py -= e.deltaY; aplicarZoom(); }
  }, { passive: false });
  // Mover la hoja (con la mano o con dos dedos)
  let arrastre = null; const dedos = new Map();
  stage.addEventListener("pointerdown", (e) => {
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2 || (H.mover && H.z > 1)) {
      e.stopPropagation(); e.preventDefault();
      if (dedos.size === 2 && typeof drawing !== "undefined" && drawing) { drawing = false; undo(); }   // el segundo dedo cancela el trazo
      const pts = [...dedos.values()];
      arrastre = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length, px: H.px, py: H.py, d: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0, z: H.z };
    }
  }, true);
  stage.addEventListener("pointermove", (e) => {
    if (dedos.has(e.pointerId)) dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!arrastre) return;
    e.stopPropagation();
    const pts = [...dedos.values()], mx = pts.reduce((s, p) => s + p.x, 0) / pts.length, my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    if (pts.length === 2 && arrastre.d) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), r = stage.getBoundingClientRect();
      const nz = Math.min(4, Math.max(1, arrastre.z * d / arrastre.d)), cx0 = arrastre.x - r.left, cy0 = arrastre.y - r.top;
      H.px = cx0 - (cx0 - arrastre.px) * (nz / arrastre.z) + (mx - arrastre.x); H.py = cy0 - (cy0 - arrastre.py) * (nz / arrastre.z) + (my - arrastre.y); H.z = nz;
    } else { H.px = arrastre.px + (mx - arrastre.x); H.py = arrastre.py + (my - arrastre.y); }
    aplicarZoom();
  }, true);
  const soltar = (e) => { dedos.delete(e.pointerId); if (arrastre && dedos.size < (H.mover ? 1 : 2)) { arrastre = null; if (H.z < 1.02) zoom(1 / H.z); } };
  stage.addEventListener("pointerup", soltar, true); stage.addEventListener("pointercancel", soltar, true);

  // ── PDF de toda la clase ──
  const JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  async function descargarPDF() {
    if (window.PZ_ACCESO && !window.PZ_ACCESO.completa) return window.PZ_ACCESO.avisar("Descargar la clase en PDF");
    toast("Armando el PDF…");
    try { if (!window.jspdf) await cargarScript(JSPDF); } catch (e) { toast("No se pudo preparar el PDF. Revisá la conexión."); return; }
    capturar();
    const volver = H.i, zz = H.z; H.z = 1; aplicarZoom();
    const r = stage.getBoundingClientRect(), orient = r.width >= r.height ? "landscape" : "portrait";
    const doc = new window.jspdf.jsPDF({ orientation: orient, unit: "pt", format: [r.width * 0.75, r.height * 0.75] });
    for (let k = 0; k < H.hojas.length; k++) {
      await cargar(k); await new Promise((ok) => setTimeout(ok, 120));
      if (k) doc.addPage([r.width * 0.75, r.height * 0.75], orient);
      doc.addImage(componer(2, "image/jpeg", 0.9), "JPEG", 0, 0, r.width * 0.75, r.height * 0.75, undefined, "FAST");
    }
    await cargar(volver); H.z = zz; aplicarZoom();
    doc.save(`pizarra-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast(`PDF descargado (${H.hojas.length} hoja${H.hojas.length > 1 ? "s" : ""})`);
  }

  // ── Barra de hojas ──
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  function crearBarra() {
    const css = document.createElement("style");
    css.textContent = `.hojabar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:7px 12px;background:var(--panel,#fff);border-top:1px solid var(--line,#e2e8f0);font:600 13px Inter,system-ui,sans-serif;color:var(--ink,#0f2540)}
    .hojabar button{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line,#e2e8f0);background:#fff;border-radius:9px;padding:6px 10px;font:600 13px Inter,system-ui,sans-serif;color:inherit;cursor:pointer}
    .hojabar button:hover{background:#f1f5f9}.hojabar button:disabled{opacity:.4;cursor:default}
    .hojabar button.on{background:#0f2540;color:#fff;border-color:#0f2540}
    .hojabar svg{width:16px;height:16px}.hojabar .sep{width:1px;height:22px;background:var(--line,#e2e8f0);margin:0 4px}
    .hojabar .num{min-width:78px;text-align:center}.hojabar .esp{flex:1}
    .hojabar .mini{display:flex;gap:4px;overflow-x:auto;max-width:40vw;scrollbar-width:thin}
    .hojabar .mini button{width:30px;height:24px;padding:0;justify-content:center;font-size:11px}
    .hojabar .mini button.act{border-color:#1f5f8b;background:#e0f2fe;color:#0c4a6e}`;
    document.head.appendChild(css);
    const b = document.createElement("div"); b.className = "hojabar"; b.id = "hojabar";
    b.innerHTML = `<button id="hjAnt" title="Hoja anterior (Re Pág)">${svg('<path d="M15 18l-6-6 6-6"/>')}</button>
      <span class="num" id="hjNum">Hoja 1 de 1</span>
      <button id="hjSig" title="Hoja siguiente (Av Pág)">${svg('<path d="M9 18l6-6-6-6"/>')}</button>
      <div class="mini" id="hjMini"></div>
      <button id="hjNueva" title="Hoja nueva">${svg('<path d="M12 5v14M5 12h14"/>')}Hoja</button>
      <button id="hjBorrar" title="Borrar esta hoja">${svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>')}</button>
      <span class="sep"></span>
      <button id="hjFoto" title="Poner una foto o un PDF para escribir encima">${svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-8 7"/>')}Foto o PDF</button>
      <input type="file" id="hjArchivo" accept="image/*,application/pdf" hidden>
      <span class="sep"></span>
      <button id="hjMenos" title="Alejar">${svg('<circle cx="11" cy="11" r="7"/><path d="M8 11h6M21 21l-5-5"/>')}</button>
      <button id="hjZoom" title="Volver al 100%">100%</button>
      <button id="hjMas" title="Acercar (Ctrl + rueda)">${svg('<circle cx="11" cy="11" r="7"/><path d="M8 11h6M11 8v6M21 21l-5-5"/>')}</button>
      <button id="hjMover" title="Mover la hoja (también con dos dedos)">${svg('<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>')}</button>
      <span class="esp"></span>
      <button id="hjPDF" title="Descargar todas las hojas en un PDF">${svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/>')}PDF de la clase</button>`;
    stage.after(b);
    const $ = (id) => document.getElementById(id);
    $("hjAnt").onclick = () => ir(H.i - 1); $("hjSig").onclick = () => ir(H.i + 1);
    $("hjNueva").onclick = () => nueva(); $("hjBorrar").onclick = borrarHoja;
    $("hjFoto").onclick = () => $("hjArchivo").click();
    $("hjArchivo").onchange = (e) => { insertar(e.target.files[0]); e.target.value = ""; };
    $("hjMas").onclick = () => zoom(1.25); $("hjMenos").onclick = () => zoom(1 / 1.25); $("hjZoom").onclick = () => zoom(1 / H.z);
    $("hjMover").onclick = () => { if (H.z === 1) zoom(1.5); H.mover = !H.mover; aplicarZoom(); };
    $("hjPDF").onclick = descargarPDF;
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase(); if (tag === "input" || tag === "textarea") return;
      if (e.key === "PageDown") { e.preventDefault(); H.i < H.hojas.length - 1 ? ir(H.i + 1) : nueva(); }
      else if (e.key === "PageUp") { e.preventDefault(); ir(H.i - 1); }
    });
  }
  function pintarBarra() {
    const $ = (id) => document.getElementById(id); if (!$("hjNum")) return;
    $("hjNum").textContent = `Hoja ${H.i + 1} de ${H.hojas.length}`;
    $("hjAnt").disabled = H.i === 0; $("hjSig").disabled = H.i >= H.hojas.length - 1;
    $("hjMini").innerHTML = H.hojas.length > 1 ? H.hojas.map((h, k) => `<button class="${k === H.i ? "act" : ""}" data-k="${k}" title="Hoja ${k + 1}">${h.fondo ? "📄" : k + 1}</button>`).join("") : "";
    $("hjMini").querySelectorAll("button").forEach((b) => b.onclick = () => ir(+b.dataset.k));
  }

  // ── Arranque (después de que la pizarra se prepara) ──
  crearBarra();
  window.addEventListener("load", async () => {
    await new Promise((ok) => setTimeout(ok, 30));
    resizeBoard();
    const guardado = await BD.leer("hojas");
    if (guardado && guardado.hojas && guardado.hojas.length) { H.hojas = guardado.hojas; await cargar(Math.min(guardado.i || 0, H.hojas.length - 1)); }
    else { H.hojas = [{ dibujo: dibujoViejo, fondo: null, bg: bgMode }]; await cargar(0); if (dibujoViejo) persistCanvas(); }
    window.dispatchEvent(new Event("pz-hoja"));
  });
  window.PZ_HOJAS.api = { ir, nueva, cargar, capturar, descargarPDF, insertar };
})();
