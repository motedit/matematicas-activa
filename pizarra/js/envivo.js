/* =================================================================
   Pizarra en vivo: los alumnos ven en su celular lo que escribe el profe.
   - El profe toca "En vivo" y aparece un PIN y un QR.
   - Los alumnos entran a matematicasactivas.com/pizarra/ver.html y ponen el PIN.
   - Se manda una imagen liviana de la hoja cada vez que cambia (y el láser y la cortina al instante).
   - Usa los canales en vivo de Supabase: no guarda nada en la base de datos.
   ================================================================= */
(function () {
  "use strict";
  const V = { canal: null, pin: null, sucio: false, ultimoEnvio: 0, timer: null, vistos: 0, cortina: null };
  window.PZ_VIVO = V;
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  // Botón en la barra de arriba
  const btn = document.createElement("button");
  btn.className = "calc-launch"; btn.id = "btnVivo"; btn.style.marginRight = "8px"; btn.title = "Transmitir la pizarra a los celulares de los alumnos";
  btn.innerHTML = svg('<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>') + "<span>En vivo</span>";
  const calc = document.querySelector(".topbar .calc-launch:last-of-type");
  (calc || document.querySelector(".topbar")).insertAdjacentElement(calc ? "beforebegin" : "beforeend", btn);

  // Panel con el PIN
  const panel = document.createElement("div");
  panel.id = "panelVivo";
  panel.style.cssText = "position:fixed;right:16px;top:74px;z-index:9000;background:#fff;color:#0f172a;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.3);padding:16px 18px;width:300px;display:none;font:500 14px Inter,system-ui,sans-serif";
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b style="font:700 16px Sora,Inter,sans-serif">📡 Pizarra en vivo</b><button id="vivoCerrar" style="border:0;background:none;font-size:18px;cursor:pointer" title="Ocultar">✕</button></div>
    <p style="margin:8px 0 4px;color:#475569;overflow-wrap:anywhere">Los alumnos entran a <b>matematicasactivas.com/vivo</b> (o escanean el QR) y escriben:</p>
    <div id="vivoPin" style="font:800 46px 'Space Mono',monospace;letter-spacing:6px;color:#0f766e;text-align:center">·····</div>
    <div id="vivoQR" style="width:150px;height:150px;margin:6px auto"></div>
    <p id="vivoEstado" style="margin:6px 0;text-align:center;font-weight:700;color:#475569">Conectando…</p>
    <button id="vivoTerminar" style="width:100%;border:0;border-radius:10px;padding:10px;background:#dc2626;color:#fff;font:700 14px Inter;cursor:pointer">Terminar la transmisión</button>`;
  document.body.appendChild(panel);
  const $ = (id) => document.getElementById(id);
  $("vivoCerrar").onclick = () => { panel.style.display = "none"; };

  function cargarScript(src) { return new Promise((ok, mal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s); }); }
  function estado(t, color) { $("vivoEstado").textContent = t; $("vivoEstado").style.color = color || "#475569"; }

  btn.onclick = async () => {
    if (V.canal) { panel.style.display = panel.style.display === "none" ? "block" : "none"; return; }
    panel.style.display = "block"; estado("Conectando…");
    const sb = window.PZ_ACCESO && await window.PZ_ACCESO.cliente();
    if (!sb) { estado("⚠️ Sin conexión a internet", "#dc2626"); return; }
    V.pin = String(10000 + Math.floor(Math.random() * 90000));
    $("vivoPin").textContent = V.pin;
    const url = `https://matematicasactivas.com/vivo/?pin=${V.pin}`;
    try { if (!window.qrcode) await cargarScript("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"); const q = qrcode(0, "M"); q.addData(url); q.make(); $("vivoQR").innerHTML = q.createSvgTag({ cellSize: 4, margin: 1, scalable: true }); } catch (e) { $("vivoQR").style.display = "none"; }
    V.canal = sb.channel("ma-pizarra-" + V.pin, { config: { broadcast: { self: false, ack: false }, presence: { key: "docente" } } });
    V.canal
      .on("presence", { event: "sync" }, () => {
        const n = Object.keys(V.canal.presenceState()).filter((k) => k !== "docente").length;
        if (n > V.vistos) { V.sucio = true; V.baseClave = null; }   // alguien entró: le mandamos todo de nuevo
        V.vistos = n; estado(`👀 ${n} alumno${n === 1 ? "" : "s"} mirando`, "#0f766e");
      })
      .on("broadcast", { event: "hola" }, () => { V.sucio = true; V.baseClave = null; })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED") { await V.canal.track({ rol: "docente" }); estado("✅ Transmitiendo · 0 alumnos mirando", "#0f766e"); V.sucio = true; }
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") estado("⚠️ Se cortó la conexión, reintentando…", "#b45309");
      });
    btn.classList.add("vivo-on"); btn.querySelector("span").textContent = "En vivo ●";
    V.timer = setInterval(bucle, 250);
  };
  $("vivoTerminar").onclick = () => {
    if (!V.canal) return;
    try { V.canal.send({ type: "broadcast", event: "fin", payload: {} }); } catch (e) {}
    setTimeout(() => { try { V.canal.unsubscribe(); } catch (e) {} V.canal = null; }, 300);
    clearInterval(V.timer); panel.style.display = "none";
    btn.classList.remove("vivo-on"); btn.querySelector("span").textContent = "En vivo";
    toast("Transmisión terminada");
  };
  const css = document.createElement("style");
  css.textContent = "#btnVivo.vivo-on{background:#dc2626!important;color:#fff!important;animation:vivoLatido 1.6s infinite}@keyframes vivoLatido{50%{box-shadow:0 0 0 6px rgba(220,38,38,.25)}}";
  document.head.appendChild(css);

  // ── Qué cambia en la pizarra ──
  const marcar = () => { V.sucio = true; };
  stage.addEventListener("pointerup", marcar); stage.addEventListener("pointermove", (e) => { if (e.buttons) marcar(); });
  ["undo", "redo", "clearBoard", "drawBg", "restoreData", "placeText", "traceEdge", "toggleBoardColor", "persistCanvas"].forEach((n) => {
    const f = window[n]; if (typeof f !== "function") return;
    window[n] = function () { const r = f.apply(this, arguments); marcar(); return r; };
  });
  window.addEventListener("pz-hoja", marcar); window.addEventListener("pz-fondo", marcar);

  // Se manda en dos capas, para que en el celular se vea nítido:
  //  · "base": la cuadrícula y la foto/PDF de fondo, en alta calidad, partida en pedazos. Solo cuando cambia de hoja o de fondo.
  //  · "trazos": solo lo que escribe el profe (imagen transparente, liviana). Cada vez que cambia.
  const PEDAZO = 90000;
  const H = () => window.PZ_HOJAS;
  function claveBase() {
    const h = H(), hoja = h && h.hojas[h.i], r = stage.getBoundingClientRect();
    const f = hoja && hoja.fondo ? hoja.fondo.length + hoja.fondo.slice(-30) : "";
    return [h ? h.i : 0, bgMode, stage.classList.contains("dark") ? 1 : 0, f, Math.round(r.width), Math.round(r.height)].join("|");
  }
  function imagenBase() {
    const r = stage.getBoundingClientRect(), h = H(), fi = h && h.fondoImg, rf = h && h.rectFondo;
    const conFoto = !!(rf && fi && fi.naturalWidth && fi.style.display !== "none");
    // con foto: hasta 2000 px de ancho (lo que haga falta para no perder detalle); sin foto alcanza con menos
    const ancho = conFoto ? Math.min(2000, Math.max(canvas.width, Math.round(r.width * fi.naturalWidth / rf.w))) : Math.min(1200, canvas.width);
    const k = ancho / r.width, out = document.createElement("canvas");
    out.width = Math.round(r.width * k); out.height = Math.round(r.height * k);
    const o = out.getContext("2d"); o.imageSmoothingQuality = "high";
    o.fillStyle = stage.classList.contains("dark") ? "#143028" : "#ffffff"; o.fillRect(0, 0, out.width, out.height);
    o.drawImage(bg, 0, 0, out.width, out.height);
    if (conFoto) o.drawImage(fi, rf.x * k, rf.y * k, rf.w * k, rf.h * k);
    return out.toDataURL("image/jpeg", conFoto ? 0.9 : 0.8);
  }
  function imagenTrazos() {
    let w = Math.min(1600, canvas.width), url = "";
    const out = document.createElement("canvas");
    for (let k = 0; k < 4; k++) {
      out.width = w; out.height = Math.round(canvas.height * w / canvas.width);
      const o = out.getContext("2d"); o.clearRect(0, 0, out.width, out.height); o.imageSmoothingQuality = "high";
      o.drawImage(canvas, 0, 0, out.width, out.height);
      url = out.toDataURL("image/png");
      if (url.length > 180000) { const wp = out.toDataURL("image/webp", 0.85); if (wp.startsWith("data:image/webp") && wp.length < url.length) url = wp; }
      if (url.length < 180000) break;
      w = Math.round(w * 0.8);
    }
    return url;
  }
  // Con la Pizarra comprada y la nube activa, el fondo se sube una vez y a los celulares les llega solo el enlace
  async function subirBase(dataUrl, n) {
    const N = window.PZ_NUBE, A = window.PZ_ACCESO;
    if (!N || !N.activa || !N.sb || !A || !A.completa) return null;
    const h = H(), hoja = h && h.hojas[h.i];
    if (!hoja || !hoja.fondo) return null;          // sin foto la base es liviana: va por el canal
    try {
      const blob = await (await fetch(dataUrl)).blob(), ruta = `${N.uid}/vivo/hoja-${n}.jpg`;
      const { error } = await N.sb.storage.from("pizarra").upload(ruta, blob, { contentType: "image/jpeg", upsert: true });
      if (error) return null;
      return `${A.URL_API}/storage/v1/object/public/pizarra/${ruta}?v=${Date.now().toString(36)}`;
    } catch (e) { return null; }
  }
  let enviando = false;
  async function bucle() {
    if (!V.canal || enviando || !V.sucio || performance.now() - V.ultimoEnvio < 500) return;
    V.sucio = false; enviando = true; V.ultimoEnvio = performance.now();
    try {
      const h = H(), info = { n: h ? h.i + 1 : 1, total: h ? h.hojas.length : 1 };
      const clave = claveBase();
      if (clave !== V.baseClave) {
        const d = imagenBase();
        const url = await subirBase(d, info.n);
        if (url) await V.canal.send({ type: "broadcast", event: "base", payload: { clave, url } });
        else {
          // sin la nube: se manda en pedazos, despacio para no pasar el límite de mensajes
          const partes = Math.ceil(d.length / PEDAZO);
          for (let i = 0; i < partes; i++) {
            await V.canal.send({ type: "broadcast", event: "base", payload: { clave, i, partes, d: d.slice(i * PEDAZO, (i + 1) * PEDAZO) } });
            if (partes > 1) await new Promise((ok) => setTimeout(ok, 250));
          }
        }
        V.baseClave = clave;
      }
      await V.canal.send({ type: "broadcast", event: "trazos", payload: { clave, img: imagenTrazos(), cortina: V.cortina, ...info } });
    } catch (e) { V.sucio = true; V.baseClave = null; }
    enviando = false;
  }

  // Láser y cortina, al instante
  let tLaser = 0, pendLaser = null;
  window.addEventListener("pz-laser", (e) => {
    if (!V.canal) return; pendLaser = e.detail;
    const ahora = performance.now();
    if (ahora - tLaser > 60 || !e.detail) { tLaser = ahora; V.canal.send({ type: "broadcast", event: "laser", payload: { p: pendLaser } }); }
  });
  window.addEventListener("pz-cortina", (e) => {
    V.cortina = e.detail;
    if (V.canal) V.canal.send({ type: "broadcast", event: "cortina", payload: { y: e.detail } });
  });
})();
