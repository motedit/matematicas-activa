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
        if (n > V.vistos) V.sucio = true;   // alguien entró: le mandamos la hoja actual
        V.vistos = n; estado(`👀 ${n} alumno${n === 1 ? "" : "s"} mirando`, "#0f766e");
      })
      .on("broadcast", { event: "hola" }, () => { V.sucio = true; })
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

  // Imagen liviana de la hoja (menos de ~200 KB)
  function foto() {
    const src = document.createElement("canvas"); const full = new Image();
    return new Promise((ok) => {
      full.onload = () => {
        let w = Math.min(1100, full.width), q = 0.62, url;
        for (let k = 0; k < 4; k++) {
          const h = Math.round(full.height * w / full.width); src.width = w; src.height = h;
          src.getContext("2d").drawImage(full, 0, 0, w, h);
          url = src.toDataURL("image/jpeg", q);
          if (url.length < 200000) break;
          w = Math.round(w * 0.8); q = Math.max(0.4, q - 0.08);
        }
        ok({ img: url, w: src.width, h: src.height });
      };
      full.src = exportComposite();
    });
  }
  let enviando = false;
  async function bucle() {
    if (!V.canal || enviando || !V.sucio || performance.now() - V.ultimoEnvio < 600) return;
    V.sucio = false; enviando = true; V.ultimoEnvio = performance.now();
    try {
      const f = await foto(), H = window.PZ_HOJAS;
      await V.canal.send({ type: "broadcast", event: "hoja", payload: { ...f, n: H ? H.i + 1 : 1, total: H ? H.hojas.length : 1, cortina: V.cortina } });
    } catch (e) { V.sucio = true; }
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
