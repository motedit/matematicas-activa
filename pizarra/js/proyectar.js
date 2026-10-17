/* =================================================================
   Pizarra · herramientas para proyectar en el aula
   - Puntero láser: un trazo rojo que se desvanece solo (no ensucia la pizarra).
   - Figura a mano: dibujás un círculo, línea, triángulo o rectángulo a mano y se endereza solo.
   - Cortina: tapa la pizarra y la vas destapando de a poco.
   - Cronómetro: cuenta regresiva grande, con aviso al terminar.
   ================================================================= */
(function () {
  "use strict";
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  // ── Botones en la barra de herramientas ──
  const rail = document.querySelector(".toolrail");
  const grupoTrazo = rail.querySelector(".group");
  const bFig = document.createElement("button");
  bFig.className = "tbtn tool"; bFig.dataset.tool = "smart"; bFig.dataset.tip = "Figura a mano: se endereza sola (F)"; bFig.setAttribute("aria-label", "Figura a mano (F)");
  bFig.innerHTML = svg('<path d="M4 18c3-9 6-12 9-11s2 6 7 3"/><path d="M14 20l6-6" stroke-dasharray="2 3"/>');
  bFig.onclick = () => setTool("smart", bFig);
  grupoTrazo.appendChild(bFig);

  rail.insertAdjacentHTML("beforeend", `<div class="sep"></div><div class="group" id="grupoProyectar"><span class="glabel">Clase</span>
    <button class="tbtn tool" data-tool="laser" data-tip="Puntero láser (P)" aria-label="Puntero láser (P)" style="color:#e11d48">${svg('<circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>')}</button>
    <button class="tbtn" id="btnCortina" data-tip="Cortina: tapar y destapar" aria-label="Cortina">${svg('<path d="M3 3h18"/><path d="M5 3v12c0 2 2 3 3 3M19 3v12c0 2-2 3-3 3"/><path d="M8 18v3M16 18v3" stroke-dasharray="1 2"/>')}</button>
    <button class="tbtn" id="btnCrono" data-tip="Cronómetro" aria-label="Cronómetro">${svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/>')}</button>
  </div>`);
  const bLaser = rail.querySelector('[data-tool="laser"]');
  bLaser.onclick = () => setTool("laser", bLaser);
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase(); if (tag === "input" || tag === "textarea" || e.ctrlKey || e.metaKey) return;
    if (!document.getElementById("teacherView").classList.contains("active")) return;
    if (e.key.toLowerCase() === "p") setTool("laser", bLaser);
    else if (e.key.toLowerCase() === "f") setTool("smart", bFig);
  });

  // Capa transparente encima de la pizarra para el láser
  const capa = document.createElement("canvas");
  capa.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:30";
  stage.appendChild(capa);
  const cc = capa.getContext("2d");
  function medirCapa() { const r = stage.getBoundingClientRect(), d = Math.max(1, devicePixelRatio || 1); capa.width = r.width * d; capa.height = r.height * d; cc.setTransform(d, 0, 0, d, 0, 0); }
  addEventListener("resize", medirCapa); setTimeout(medirCapa, 50);

  // ── Puntero láser ──
  const rastro = []; let laserAbajo = false, animando = false;
  function puntoStage(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; }
  function animarLaser() {
    const r = stage.getBoundingClientRect(); cc.clearRect(0, 0, r.width, r.height);
    const ahora = performance.now();
    while (rastro.length && ahora - rastro[0].t > 900) rastro.shift();
    for (let i = 1; i < rastro.length; i++) {
      const a = rastro[i - 1], b = rastro[i]; if (b.corte) continue;
      const vida = 1 - (ahora - b.t) / 900;
      cc.strokeStyle = `rgba(239,68,68,${vida})`; cc.lineWidth = 3 + 6 * vida; cc.lineCap = "round";
      cc.shadowColor = "#ef4444"; cc.shadowBlur = 16; cc.beginPath(); cc.moveTo(a.x, a.y); cc.lineTo(b.x, b.y); cc.stroke();
    }
    const ult = rastro[rastro.length - 1];
    if (ult && ahora - ult.t < 900) { cc.fillStyle = "#ef4444"; cc.shadowBlur = 20; cc.beginPath(); cc.arc(ult.x, ult.y, 7, 0, 7); cc.fill(); }
    cc.shadowBlur = 0;
    window.dispatchEvent(new CustomEvent("pz-laser", { detail: ult && ahora - ult.t < 900 ? { x: ult.x / r.width, y: ult.y / r.height } : null }));
    if (rastro.length) requestAnimationFrame(animarLaser); else { animando = false; window.dispatchEvent(new CustomEvent("pz-laser", { detail: null })); }
  }
  function agregarLaser(p, corte) { p.corte = corte; rastro.push(p); if (!animando) { animando = true; requestAnimationFrame(animarLaser); } }

  // ── Figura a mano ──
  let trazo = null, fotoAntes = null;
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function largo(p) { let s = 0; for (let i = 1; i < p.length; i++) s += dist(p[i - 1], p[i]); return s; }
  // Simplificación de Ramer–Douglas–Peucker
  function rdp(p, eps) {
    if (p.length < 3) return p;
    const a = p[0], b = p[p.length - 1]; let max = 0, idx = 0;
    const L = dist(a, b) || 1;
    for (let i = 1; i < p.length - 1; i++) {
      const d = Math.abs((b.y - a.y) * p[i].x - (b.x - a.x) * p[i].y + b.x * a.y - b.y * a.x) / L;
      if (d > max) { max = d; idx = i; }
    }
    if (max <= eps) return [a, b];
    return rdp(p.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(p.slice(idx), eps));
  }
  function reconocer(p) {
    if (p.length < 6) return null;
    const L = largo(p), cerrada = dist(p[0], p[p.length - 1]) < Math.max(25, L * 0.12);
    if (!cerrada) {
      if (dist(p[0], p[p.length - 1]) / L > 0.92) return { tipo: "linea", a: p[0], b: p[p.length - 1] };
      return null;
    }
    // Polígono: se corta el trazo cerrado en los dos puntos más alejados y se simplifica cada mitad
    const cx = p.reduce((s, q) => s + q.x, 0) / p.length, cy = p.reduce((s, q) => s + q.y, 0) / p.length;
    let i0 = 0; p.forEach((q, i) => { if (Math.hypot(q.x - cx, q.y - cy) > Math.hypot(p[i0].x - cx, p[i0].y - cy)) i0 = i; });
    const rot = p.slice(i0).concat(p.slice(0, i0));
    let i1 = 0; rot.forEach((q, i) => { if (dist(q, rot[0]) > dist(rot[i1], rot[0])) i1 = i; });
    const eps = Math.max(8, L * 0.035);
    let v = rdp(rot.slice(0, i1 + 1), eps).slice(0, -1).concat(rdp(rot.slice(i1).concat([rot[0]]), eps).slice(0, -1));
    // unir vértices muy cercanos (también el último con el primero)
    v = v.filter((q, i) => i === 0 || dist(q, v[i - 1]) > L * 0.07);
    while (v.length > 2 && dist(v[0], v[v.length - 1]) < L * 0.07) v.pop();
    // sacar vértices casi rectos (ángulo cercano a 180°)
    let cambio = true;
    while (cambio && v.length > 3) {
      cambio = false;
      for (let i = 0; i < v.length; i++) {
        const a = v[(i - 1 + v.length) % v.length], b = v[i], c = v[(i + 1) % v.length];
        const ang = Math.abs(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)) * 180 / Math.PI;
        const interior = ang > 180 ? 360 - ang : ang;
        if (interior > 155) { v.splice(i, 1); cambio = true; break; }
      }
    }
    // ¿Círculo o elipse? Radio parejo respecto de su propio ancho y alto
    const xs = p.map((q) => q.x), ys = p.map((q) => q.y);
    const bx = (Math.max(...xs) + Math.min(...xs)) / 2, by = (Math.max(...ys) + Math.min(...ys)) / 2;
    const rx = (Math.max(...xs) - Math.min(...xs)) / 2, ry = (Math.max(...ys) - Math.min(...ys)) / 2;
    const rn = p.map((q) => Math.hypot((q.x - bx) / (rx || 1), (q.y - by) / (ry || 1)));
    const media = rn.reduce((s, x) => s + x, 0) / rn.length;
    const desv = Math.sqrt(rn.reduce((s, x) => s + (x - media) ** 2, 0) / rn.length) / media;
    if (v.length === 3) return { tipo: "poligono", v };
    if (v.length === 4 && desv > 0.045) {
      const recto = v.every((q, i) => { const n = v[(i + 1) % 4], ang = Math.abs(Math.atan2(n.y - q.y, n.x - q.x) * 180 / Math.PI) % 90; return ang < 15 || ang > 75; });
      if (recto) return { tipo: "rect", x: Math.min(...v.map((q) => q.x)), y: Math.min(...v.map((q) => q.y)), w: Math.max(...v.map((q) => q.x)) - Math.min(...v.map((q) => q.x)), h: Math.max(...v.map((q) => q.y)) - Math.min(...v.map((q) => q.y)) };
      return { tipo: "poligono", v };
    }
    if (desv < 0.09) {
      if (Math.abs(rx - ry) / Math.max(rx, ry) < 0.15) return { tipo: "circulo", cx: bx, cy: by, r: (rx + ry) / 2 };
      return { tipo: "elipse", cx: bx, cy: by, rx, ry };
    }
    if (v.length >= 5 && v.length <= 6) return { tipo: "poligono", v };
    return null;
  }
  function dibujarFigura(f) {
    ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
    if (f.tipo === "linea") { ctx.moveTo(f.a.x, f.a.y); ctx.lineTo(f.b.x, f.b.y); }
    else if (f.tipo === "rect") ctx.rect(f.x, f.y, f.w, f.h);
    else if (f.tipo === "circulo") ctx.arc(f.cx, f.cy, f.r, 0, Math.PI * 2);
    else if (f.tipo === "elipse") ctx.ellipse(f.cx, f.cy, f.rx, f.ry, 0, 0, Math.PI * 2);
    else { ctx.moveTo(f.v[0].x, f.v[0].y); f.v.slice(1).forEach((q) => ctx.lineTo(q.x, q.y)); ctx.closePath(); }
    ctx.stroke(); ctx.restore();
  }
  const NOMBRES = { linea: "Línea", rect: "Rectángulo", circulo: "Círculo", elipse: "Elipse", poligono: "Figura" };

  // Escucha en la fase de captura: estas herramientas no pasan por el dibujo normal
  stage.addEventListener("pointerdown", (e) => {
    if (e.target !== canvas && e.target !== stage) return;
    if (tool === "laser") { e.stopPropagation(); laserAbajo = true; agregarLaser(puntoStage(e), true); return; }
    if (tool === "smart") {
      e.stopPropagation(); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      pushUndo(); fotoAntes = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const q = pos(e); trazo = [q];
      ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(q.x, q.y);
    }
  }, true);
  stage.addEventListener("pointermove", (e) => {
    if (tool === "laser") { e.stopPropagation(); if (laserAbajo || e.pointerType === "mouse") agregarLaser(puntoStage(e), false); return; }
    if (tool === "smart" && trazo) { e.stopPropagation(); const q = pos(e); trazo.push(q); ctx.lineTo(q.x, q.y); ctx.stroke(); }
  }, true);
  const terminar = (e) => {
    if (tool === "laser") { laserAbajo = false; e.stopPropagation(); return; }
    if (tool !== "smart" || !trazo) return;
    e.stopPropagation();
    const f = reconocer(trazo);
    if (f) { ctx.putImageData(fotoAntes, 0, 0); dibujarFigura(f); showReading((f.tipo === "poligono" ? (["", "", "", "Triángulo", "Cuadrilátero", "Pentágono", "Hexágono"][f.v.length] || "Polígono") : NOMBRES[f.tipo]) + " ✔"); clearTimeout(window._tLect); window._tLect = setTimeout(hideReading, 900); }
    trazo = null; fotoAntes = null; persistCanvas();
  };
  stage.addEventListener("pointerup", terminar, true); stage.addEventListener("pointercancel", terminar, true);
  const setToolOriginal = window.setTool;
  window.setTool = function (t, btn) { setToolOriginal(t, btn); canvas.style.cursor = t === "laser" ? "none" : t === "text" ? "text" : "crosshair"; if (t !== "laser") { rastro.length = 0; } };

  // ── Cortina ──
  const cortina = document.createElement("div");
  cortina.id = "cortina";
  cortina.style.cssText = "position:absolute;left:0;right:0;bottom:0;top:0;z-index:35;display:none;background:repeating-linear-gradient(90deg,#334155 0 28px,#3b4a5f 28px 56px);box-shadow:0 -6px 18px rgba(0,0,0,.35)";
  cortina.innerHTML = `<div id="cortinaManija" style="position:absolute;left:50%;top:-2px;transform:translate(-50%,0);background:#0f172a;color:#fff;font:700 13px Inter,system-ui,sans-serif;padding:8px 16px;border-radius:0 0 12px 12px;cursor:ns-resize;touch-action:none;user-select:none;display:flex;gap:10px;align-items:center">⇕ Arrastrá para destapar <span id="cortinaCerrar" style="cursor:pointer;opacity:.8" title="Quitar la cortina">✕</span></div>`;
  stage.appendChild(cortina);
  const manija = cortina.querySelector("#cortinaManija");
  let yCortina = 0;
  function ponerCortina(y) { const h = stage.getBoundingClientRect().height; yCortina = Math.max(0, Math.min(h - 40, y)); cortina.style.top = yCortina + "px"; }
  document.getElementById("btnCortina").onclick = () => {
    const on = cortina.style.display === "none"; cortina.style.display = on ? "block" : "none";
    document.getElementById("btnCortina").classList.toggle("active", on); if (on) ponerCortina(0);
    window.dispatchEvent(new CustomEvent("pz-cortina", { detail: on ? yCortina / stage.getBoundingClientRect().height : null }));
  };
  manija.addEventListener("pointerdown", (e) => {
    if (e.target.id === "cortinaCerrar") return;
    e.preventDefault(); e.stopPropagation(); manija.setPointerCapture(e.pointerId);
    const r = stage.getBoundingClientRect(), off = e.clientY - r.top - yCortina;
    const mover = (ev) => { ponerCortina(ev.clientY - r.top - off); window.dispatchEvent(new CustomEvent("pz-cortina", { detail: yCortina / r.height })); };
    const fin = () => { manija.removeEventListener("pointermove", mover); manija.removeEventListener("pointerup", fin); };
    manija.addEventListener("pointermove", mover); manija.addEventListener("pointerup", fin);
  });
  cortina.querySelector("#cortinaCerrar").onclick = (e) => { e.stopPropagation(); document.getElementById("btnCortina").click(); };

  // ── Cronómetro ──
  const crono = document.createElement("div");
  crono.id = "crono";
  crono.style.cssText = "position:absolute;right:16px;top:16px;z-index:45;display:none;background:#0f172a;color:#fff;border-radius:16px;padding:10px 14px;box-shadow:0 14px 34px rgba(0,0,0,.35);font:600 13px Inter,system-ui,sans-serif;min-width:210px;touch-action:none";
  crono.innerHTML = `<div id="crArr" style="display:flex;justify-content:space-between;align-items:center;cursor:move;margin-bottom:4px;color:#94a3b8"><span>⏱ Cronómetro</span><span id="crCerrar" style="cursor:pointer;font-size:16px" title="Cerrar">✕</span></div>
    <div id="crTiempo" style="font:700 46px 'Space Mono',monospace;text-align:center;letter-spacing:1px;line-height:1.1">05:00</div>
    <div style="display:flex;gap:5px;justify-content:center;margin:6px 0">${[1, 3, 5, 10, 15].map((m) => `<button data-m="${m}" style="border:0;border-radius:8px;padding:5px 8px;background:#1e293b;color:#e2e8f0;font:600 12px Inter;cursor:pointer">${m}′</button>`).join("")}</div>
    <div style="display:flex;gap:6px;justify-content:center"><button id="crIniciar" style="flex:1;border:0;border-radius:10px;padding:8px;background:#16a34a;color:#fff;font:700 14px Inter;cursor:pointer">▶ Iniciar</button><button id="crReiniciar" style="border:0;border-radius:10px;padding:8px 12px;background:#334155;color:#fff;font:700 14px Inter;cursor:pointer" title="Volver a empezar">↺</button></div>`;
  stage.appendChild(crono);
  let total = 300, resta = 300, marcha = false, ultimo = 0, intervalo = null;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function pintarCrono() {
    const t = document.getElementById("crTiempo"); t.textContent = fmt(Math.ceil(resta));
    t.style.color = resta <= 0 ? "#f87171" : resta <= 10 ? "#fbbf24" : "#fff";
    document.getElementById("crIniciar").textContent = marcha ? "⏸ Pausa" : resta <= 0 ? "▶ Otra vez" : "▶ Iniciar";
    document.getElementById("crIniciar").style.background = marcha ? "#ca8a04" : "#16a34a";
  }
  function pitido() {
    try { const ac = new (window.AudioContext || window.webkitAudioContext)(); [0, .3, .6].forEach((t) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; o.connect(g).connect(ac.destination); g.gain.setValueAtTime(.2, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + t + .25); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + .26); }); } catch (e) {}
  }
  function tic() {
    const ahora = performance.now(); resta -= (ahora - ultimo) / 1000; ultimo = ahora;
    if (resta <= 0) { resta = 0; marcha = false; clearInterval(intervalo); pitido(); crono.animate && crono.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 400, iterations: 3 }); toast("⏰ ¡Se terminó el tiempo!"); }
    pintarCrono();
  }
  crono.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { total = resta = +b.dataset.m * 60; marcha = false; clearInterval(intervalo); pintarCrono(); });
  document.getElementById("crIniciar").onclick = () => {
    if (resta <= 0) resta = total;
    marcha = !marcha; clearInterval(intervalo);
    if (marcha) { ultimo = performance.now(); intervalo = setInterval(tic, 200); }
    pintarCrono();
  };
  document.getElementById("crReiniciar").onclick = () => { marcha = false; clearInterval(intervalo); resta = total; pintarCrono(); };
  document.getElementById("btnCrono").onclick = () => { const on = crono.style.display === "none"; crono.style.display = on ? "block" : "none"; document.getElementById("btnCrono").classList.toggle("active", on); pintarCrono(); };
  document.getElementById("crCerrar").onclick = (e) => { e.stopPropagation(); document.getElementById("btnCrono").click(); };
  const arr = document.getElementById("crArr");
  arr.addEventListener("pointerdown", (e) => {
    if (e.target.id === "crCerrar") return;
    e.stopPropagation(); arr.setPointerCapture(e.pointerId);
    const r = stage.getBoundingClientRect(), c = crono.getBoundingClientRect(), ox = e.clientX - c.left, oy = e.clientY - c.top;
    const mover = (ev) => { crono.style.right = "auto"; crono.style.left = Math.max(0, Math.min(r.width - c.width, ev.clientX - r.left - ox)) + "px"; crono.style.top = Math.max(0, Math.min(r.height - c.height, ev.clientY - r.top - oy)) + "px"; };
    const fin = () => { arr.removeEventListener("pointermove", mover); arr.removeEventListener("pointerup", fin); };
    arr.addEventListener("pointermove", mover); arr.addEventListener("pointerup", fin);
  });
  // que no se dibuje al tocar el cronómetro o la cortina
  [crono, cortina].forEach((el) => el.addEventListener("pointerdown", (e) => e.stopPropagation()));

  window.PZ_PROYECTAR = { reconocer };
})();
