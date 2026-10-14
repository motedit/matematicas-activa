/* =================================================================
   Pizarra virtual · modo prueba
   - Sin compra: se puede usar todo (dibujar, escribir, ecuaciones, calculadora…)
     pero NO guardar ni descargar: no se guarda la pizarra para la próxima vez,
     no se descarga PNG/PDF, no se suben archivos ni se arma la lista de alumnos.
   - Con el módulo "Pizarra" del Plan a Medida vigente (o cuenta admin): completa.
   La sesión es la misma de matematicasactivas.com (mismo sitio).
   ================================================================= */
(function () {
  "use strict";
  var URL_API = "https://yidrpuizgtqpswefwdaa.supabase.co";
  var CLAVE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHJwdWl6Z3RxcHN3ZWZ3ZGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzk4MTcsImV4cCI6MjA5NDYxNTgxN30.kRuZoCIkvXhDNdlfumkWY7JK2qsU1nObr6eegBboFds";

  var completa = false;      // ¿tiene la pizarra comprada?
  var conSesion = false;

  // ---------- Banner ----------
  function crearBanner() {
    var css = document.createElement("style");
    css.textContent =
      ".pz-prueba{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:linear-gradient(90deg,#fffbeb,#fef3c7);border-bottom:1px solid #fde68a;color:#78350f;font:500 13.5px Inter,system-ui,sans-serif;padding:8px 16px}" +
      ".pz-prueba b{color:#92400e}.pz-prueba .pz-txt{flex:1;min-width:220px}" +
      ".pz-prueba a{display:inline-flex;align-items:center;padding:6px 12px;border-radius:8px;font-weight:700;text-decoration:none;white-space:nowrap}" +
      ".pz-prueba .pz-comprar{background:linear-gradient(135deg,#0d9488,#0e7490);color:#fff}" +
      ".pz-prueba .pz-ingresar{background:#fff;color:#0f172a;border:1px solid #fcd34d}" +
      ".pz-prueba .pz-cerrar{background:none;border:0;font-size:18px;line-height:1;color:#92400e;cursor:pointer;padding:2px 6px}" +
      ".pz-aviso{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:100000;padding:16px}" +
      ".pz-aviso .caja{background:#fff;border-radius:16px;max-width:420px;width:100%;padding:24px;font:15px/1.5 Inter,system-ui,sans-serif;color:#0f172a;box-shadow:0 24px 64px rgba(0,0,0,.3);text-align:center}" +
      ".pz-aviso h3{font:700 19px Sora,Inter,sans-serif;margin:6px 0 8px}.pz-aviso p{color:#475569;margin:0 0 16px}" +
      ".pz-aviso .fila{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}" +
      ".pz-aviso a,.pz-aviso button{padding:10px 16px;border-radius:10px;font-weight:700;text-decoration:none;border:0;cursor:pointer;font-size:14px}" +
      ".pz-aviso .comprar{background:linear-gradient(135deg,#0d9488,#0e7490);color:#fff}.pz-aviso .ingresar{background:#f1f5f9;color:#0f172a}.pz-aviso .seguir{background:none;color:#64748b}";
    document.head.appendChild(css);

    var b = document.createElement("div");
    b.className = "pz-prueba";
    b.id = "pzPrueba";
    b.setAttribute("role", "status");
    b.innerHTML =
      '<span class="pz-txt">✏️ <b>Modo prueba:</b> usá la pizarra todo lo que quieras. Para <b>guardar, descargar y armar tu lista de alumnos</b>, sumá la Pizarra a tu plan ($ 5.000 · 30 días).</span>' +
      '<a class="pz-ingresar" id="pzIngresar" href="../index.html">Ingresar</a>' +
      '<a class="pz-comprar" href="../index.html#plan-pizarra">Comprar la Pizarra</a>' +
      '<button type="button" class="pz-cerrar" aria-label="Ocultar aviso" title="Ocultar">×</button>';
    b.querySelector(".pz-cerrar").addEventListener("click", function () { b.style.display = "none"; });
    var barra = document.querySelector(".topbar");
    if (barra && barra.parentNode) barra.parentNode.insertBefore(b, barra.nextSibling);
    else document.body.insertBefore(b, document.body.firstChild);
  }

  function actualizarBanner() {
    var b = document.getElementById("pzPrueba");
    if (!b) return;
    b.style.display = completa ? "none" : "";
    var ing = document.getElementById("pzIngresar");
    if (ing) ing.style.display = conSesion ? "none" : "";
    // la pizarra calcula su tamaño con el espacio disponible
    try { window.dispatchEvent(new Event("resize")); } catch (e) {}
  }

  function avisar(accion) {
    var v = document.createElement("div");
    v.className = "pz-aviso";
    v.innerHTML =
      '<div class="caja" role="dialog" aria-modal="true"><div style="font-size:38px">🔒</div>' +
      "<h3>" + accion + " es parte de la Pizarra completa</h3>" +
      "<p>En el modo prueba podés usar todas las herramientas, pero no guardar ni descargar. Sumá la Pizarra a tu plan por $ 5.000 (30 días)" +
      (conSesion ? "." : " o ingresá si ya la compraste.") + "</p>" +
      '<div class="fila"><a class="comprar" href="../index.html#plan-pizarra">Comprar la Pizarra</a>' +
      (conSesion ? "" : '<a class="ingresar" href="../index.html">Ingresar</a>') +
      '<button type="button" class="seguir">Seguir probando</button></div></div>';
    v.addEventListener("click", function (e) { if (e.target === v || e.target.classList.contains("seguir")) v.remove(); });
    document.body.appendChild(v);
  }

  // ---------- Candados ----------
  function candado(nombre, accion) {
    var original = window[nombre];
    if (typeof original !== "function") return;
    window[nombre] = function () {
      if (completa) return original.apply(this, arguments);
      avisar(accion);
    };
  }

  function instalarCandados() {
    candado("downloadBoard", "Descargar la pizarra");
    candado("openSaveFile", "Guardar la clase");
    candado("confirmSaveFile", "Guardar la clase");
    candado("handleUpload", "Subir archivos");
    candado("addStudent", "Armar la lista de alumnos");
    // Que la pizarra no quede guardada para la próxima visita
    var persistir = window.persistCanvas;
    if (typeof persistir === "function") {
      window.persistCanvas = function () { if (completa) return persistir.apply(this, arguments); };
    }
    // Enlaces "Descargar" dentro de la vista previa de archivos
    document.addEventListener("click", function (e) {
      if (completa) return;
      var a = e.target.closest && e.target.closest("a[download]");
      if (a) { e.preventDefault(); e.stopPropagation(); avisar("Descargar archivos"); }
    }, true);
    // Atajo del navegador para guardar la página
    document.addEventListener("keydown", function (e) {
      if (!completa && (e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === "s") { e.preventDefault(); avisar("Guardar"); }
    }, true);
  }

  // ---------- Verificar compra ----------
  function cargarSdk() {
    return new Promise(function (ok) {
      if (window.supabase && window.supabase.createClient) return ok(true);
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = function () { ok(true); };
      s.onerror = function () { ok(false); };
      document.head.appendChild(s);
    });
  }

  async function verificar() {
    if (!(await cargarSdk())) return;
    try {
      var sb = window.supabase.createClient(URL_API, CLAVE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      var ses = (await sb.auth.getSession()).data.session;
      if (!ses) return;
      conSesion = true;
      var r = await sb.from("perfiles").select("rol, modulos").eq("id", ses.user.id).single();
      var p = r.data || {};
      var hasta = p.modulos && p.modulos.pizarra;
      completa = p.rol === "admin" || (!!hasta && new Date(hasta).getTime() > Date.now());
    } catch (e) { /* sin conexión: queda en modo prueba */ }
  }

  function iniciar() {
    instalarCandados();
    crearBanner();
    verificar().then(actualizarBanner);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
