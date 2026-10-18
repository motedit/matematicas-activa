/* Pizarra en el celular: botones de Opciones, Deshacer y Alumnos (solo se ven en pantallas chicas, ver css/movil.css) */
(function () {
  "use strict";
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const rail = document.querySelector(".toolrail");
  if (!rail) return;

  // Al principio de la fila de herramientas: Opciones (colores, grosor, fondo, guardar) y Deshacer
  const grupo = document.createElement("div");
  grupo.className = "group pz-movil-solo"; grupo.style.cssText = "display:flex;flex-direction:row;gap:2px";
  grupo.innerHTML = `<button class="tbtn" id="mvOpciones" aria-label="Opciones: color, grosor, fondo y guardar" title="Opciones" style="position:relative">
      <span id="mvColor" style="position:absolute;right:7px;bottom:7px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #94a3b8"></span>
      ${svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>')}</button>
    <button class="tbtn" id="mvDeshacer" aria-label="Deshacer" title="Deshacer">${svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/>')}</button>
    <div class="sep"></div>`;
  rail.prepend(grupo);
  document.getElementById("mvDeshacer").onclick = () => undo();
  const abrirOpciones = (on) => { document.body.classList.toggle("pz-opciones", on); document.getElementById("mvOpciones").classList.toggle("active", on); };
  document.getElementById("mvOpciones").onclick = () => abrirOpciones(!document.body.classList.contains("pz-opciones"));
  // al tocar la hoja (o elegir otra herramienta) se cierra el panel
  document.getElementById("stage").addEventListener("pointerdown", () => abrirOpciones(false), true);
  rail.addEventListener("click", (e) => { if (e.target.closest(".tbtn") && !e.target.closest("#mvOpciones")) abrirOpciones(false); });

  // El puntito muestra el color elegido
  const pintarColor = () => { const c = document.getElementById("mvColor"); if (c) c.style.background = typeof color !== "undefined" ? color : "#0f2540"; };
  ["setColor", "setCustomColor"].forEach((n) => { const f = window[n]; if (typeof f === "function") window[n] = function () { const r = f.apply(this, arguments); pintarColor(); return r; }; });
  setTimeout(pintarColor, 300);

  // Alumnos y archivos: botón en la barra de arriba y pantalla aparte con "cerrar"
  const bAl = document.createElement("button");
  bAl.className = "calc-launch pz-movil-solo"; bAl.id = "mvAlumnos"; bAl.title = "Alumnos y archivos"; bAl.setAttribute("aria-label", "Alumnos y archivos");
  bAl.innerHTML = svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>');
  const roles = document.querySelector(".role-switch");
  if (roles) roles.before(bAl);
  bAl.onclick = () => document.body.classList.add("pz-panel");
  const panel = document.querySelector(".panel");
  if (panel) {
    const x = document.createElement("button"); x.className = "pz-cerrar-panel pz-movil-solo"; x.textContent = "✕"; x.setAttribute("aria-label", "Volver a la pizarra");
    x.onclick = () => document.body.classList.remove("pz-panel");
    panel.style.position = panel.style.position || "relative"; panel.prepend(x);
  }
  // Al girar el celular o abrir/cerrar paneles, la hoja recalcula su tamaño
  addEventListener("orientationchange", () => setTimeout(() => window.dispatchEvent(new Event("resize")), 300));
})();
