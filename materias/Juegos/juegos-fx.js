// Capa de efectos para los juegos clásicos de Matemáticas Activas.
// No cambia la lógica de cada juego: observa cuándo un botón queda "correcto" o "incorrecto"
// (o cuando aparece un mensaje de victoria) y le suma sonido, chispas, racha y puntos para el ranking.
// Necesita arcade-comun.js (sonidos y puntos).
(function () {
  "use strict";
  const A = window.ARCADE;
  if (!A) return;
  const MOV_REDUCIDO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const JUEGO = document.body.dataset.juego || (location.pathname.split("/").pop() || "juegos").replace(".html", "");

  // ── Estilos de los efectos ──
  const css = document.createElement("style");
  css.textContent = `
  .fx-chispa{position:fixed;width:8px;height:8px;border-radius:50%;pointer-events:none;z-index:9999;will-change:transform,opacity}
  .fx-flota{position:fixed;pointer-events:none;z-index:9999;font:800 22px "Baloo 2",Nunito,system-ui,sans-serif;color:#16a34a;text-shadow:0 2px 8px rgba(255,255,255,.8);transform:translate(-50%,-50%);animation:fxFlota .9s ease-out forwards}
  @keyframes fxFlota{to{transform:translate(-50%,-160%);opacity:0}}
  .fx-racha{position:fixed;left:50%;top:14px;transform:translate(-50%,-140%);background:linear-gradient(135deg,#f97316,#db2777);color:#fff;font:800 17px "Baloo 2",Nunito,system-ui,sans-serif;padding:8px 18px;border-radius:999px;box-shadow:0 10px 24px rgba(219,39,119,.35);z-index:9999;transition:transform .35s cubic-bezier(.3,1.5,.5,1),opacity .25s;pointer-events:none;opacity:0}
  .fx-racha.ver{transform:translate(-50%,0);opacity:1}
  .fx-pop{animation:fxPop .35s cubic-bezier(.3,1.6,.5,1)}
  @keyframes fxPop{40%{transform:scale(1.12)}}
  .fx-temblor{animation:fxTemblor .35s}
  @keyframes fxTemblor{20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
  .fx-sonido{position:fixed;right:12px;bottom:12px;z-index:9998;width:42px;height:42px;border-radius:12px;border:1px solid rgba(148,163,184,.4);background:rgba(15,23,42,.75);color:#fff;font-size:18px;cursor:pointer;backdrop-filter:blur(4px)}
  @media (prefers-reduced-motion:reduce){.fx-pop,.fx-temblor,.fx-flota{animation:none}}`;
  document.head.appendChild(css);

  // Botón de sonido flotante
  const bs = document.createElement("button");
  bs.className = "fx-sonido"; bs.type = "button"; bs.setAttribute("aria-label", "Sonido");
  document.body.appendChild(bs); A.botonSonido(bs);
  document.addEventListener("pointerdown", () => A.activarAudio(), { once: true });

  // ── Efectos ──
  function centro(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function chispas(x, y, colores, n) {
    if (MOV_REDUCIDO) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("div"); s.className = "fx-chispa";
      s.style.background = colores[i % colores.length]; s.style.left = x + "px"; s.style.top = y + "px";
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
      s.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 30}px)) scale(.2)`, opacity: 0 }],
        { duration: 600 + Math.random() * 300, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => s.remove();
    }
  }
  function flota(texto, x, y, color) {
    const f = document.createElement("div"); f.className = "fx-flota"; f.textContent = texto; f.style.left = x + "px"; f.style.top = y + "px";
    if (color) f.style.color = color; document.body.appendChild(f); setTimeout(() => f.remove(), 950);
  }
  function animar(el, clase) { if (!el || MOV_REDUCIDO) return; el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase); setTimeout(() => el.classList.remove(clase), 400); }

  let racha = 0, aciertos = 0, pendientes = 0;
  const cartel = document.createElement("div"); cartel.className = "fx-racha"; document.body.appendChild(cartel);
  let tCartel = null;
  function mostrarRacha() {
    cartel.textContent = racha >= 10 ? `🔥🔥 ¡Racha de ${racha}! Imparable` : `🔥 Racha de ${racha}`;
    cartel.classList.add("ver"); clearTimeout(tCartel); tCartel = setTimeout(() => cartel.classList.remove("ver"), 1500);
  }

  function bien(el) {
    racha++; aciertos++; pendientes++;
    A.SFX.bien();
    if (el) { const c = centro(el); chispas(c.x, c.y, ["#22c55e", "#86efac", "#fde047", "#38bdf8"], 16); flota(racha >= 3 ? `+1 🔥${racha}` : "+1", c.x, c.y - 10); animar(el, "fx-pop"); }
    if ([3, 5, 10, 15, 20].includes(racha)) { mostrarRacha(); A.SFX.nivel(); }
    if (pendientes >= 10) enviar();
  }
  function mal(el) {
    racha = 0; A.SFX.mal();
    if (el) animar(el, "fx-temblor");
    try { navigator.vibrate && navigator.vibrate(60); } catch (e) {}
  }
  function victoria(el) {
    A.SFX.nivel();
    if (el) { const c = centro(el); chispas(c.x, c.y, ["#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"], 40); animar(el, "fx-pop"); }
  }

  // Puntos para el ranking: 1 por acierto, se mandan de a tandas (el servidor pone el tope diario)
  function enviar() {
    if (!pendientes || document.body.dataset.fxPuntos === "no") return;
    const n = pendientes; pendientes = 0;
    try {
      const api = window.MA_SUPABASE;
      if (api && api.sb) api.sbUsuario().then((u) => { if (u) { api.sbSumarPuntos(n); api.sbRegistrarEvento("juego_jugado", { juego: JUEGO, puntos: n, fx: true }); } }).catch(() => {});
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) enviar(); });
  addEventListener("pagehide", enviar);

  // ── Observador: detecta aciertos y errores sin tocar el código de cada juego ──
  const CLASES_BIEN = ["correct", "correcta"], CLASES_MAL = ["wrong", "incorrecta"];
  const vistos = new WeakMap();
  const tieneAlguna = (el, lista) => lista.some((c) => el.classList.contains(c));
  new MutationObserver((muts) => {
    for (const m of muts) {
      const el = m.target;
      if (!(el instanceof HTMLElement)) continue;
      const antes = m.oldValue || "";
      const nueva = (c) => el.classList.contains(c) && !antes.split(/\s+/).includes(c);
      // Botones de respuesta (juegos de la carpeta "mas" y el quiz)
      // (el quiz de estadística se cuenta por su mensaje, porque también marca la correcta cuando erraste)
      if (el.tagName === "BUTTON" && !el.closest("#qz-ops")) {
        if (CLASES_BIEN.some(nueva) && !vistos.get(el)) {
          vistos.set(el, 1); bien(el); setTimeout(() => vistos.delete(el), 500);
        } else if (CLASES_MAL.some(nueva)) mal(el);
      }
      // Mensajes de los juegos clásicos
      if (el.classList.contains("jm-msg")) {
        const txt = el.textContent || "";
        // cada vez que el juego vuelve a asignar la clase cuenta (aunque ya estuviera en "win" por el acierto anterior)
        if (el.classList.contains("win")) { if (/🎉|🏁/.test(txt)) victoria(el); else if (/Correcto/.test(txt)) bien(el); }
        else if (el.classList.contains("lose") && /❌|Era|Hay errores|no es correcta|no es una ecuación|inválida/i.test(txt)) mal(el);
      }
      // Memoria: par encontrado
      if (el.classList.contains("mem-carta") && nueva("hecha")) { A.nota(880, 0, .08, "triangle", .08); A.nota(1175, .07, .12, "triangle", .08); const c = centro(el); chispas(c.x, c.y, ["#a78bfa", "#f0abfc"], 8); }
    }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });

  // API por si un juego quiere avisar directo
  window.JUEGOS_FX = { bien, mal, victoria, chispas, flota, enviar };
})();
