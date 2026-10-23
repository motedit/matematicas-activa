/* Matemáticas Activas — registro de errores en vivo.
   Si algo falla en la computadora o el celular de un alumno, se guarda un aviso
   (página, mensaje, navegador) en Supabase y el admin recibe un resumen por mail.
   No guarda nada personal: ni lo que escribe el alumno, ni contraseñas. */
(function () {
  "use strict";
  if (window.__MA_ERRORES__) return;
  window.__MA_ERRORES__ = true;

  var URL_SB = "https://yidrpuizgtqpswefwdaa.supabase.co";
  var CLAVE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHJwdWl6Z3RxcHN3ZWZ3ZGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzk4MTcsImV4cCI6MjA5NDYxNTgxN30.kRuZoCIkvXhDNdlfumkWY7JK2qsU1nObr6eegBboFds";
  var MAX_POR_PAGINA = 5;
  var enviados = 0;
  var vistos = {};
  var saliendo = false;
  window.addEventListener("pagehide", function () { saliendo = true; });
  window.addEventListener("beforeunload", function () { saliendo = true; });

  // Solo se registra en el sitio real (no al probar en tu compu)
  var host = location.hostname;
  if (!/(^|\.)matematicasactivas\.com$/.test(host)) return;

  // Ruido conocido que no es un error del sitio
  var IGNORAR = [
    /^Script error\.?$/i,                 // error de otro dominio sin detalles
    /ResizeObserver loop/i,
    /extension|chrome-extension|moz-extension|safari-extension/i,
    /Non-Error promise rejection captured/i,
    /AbortError|The operation was aborted/i,
    /Failed to fetch|NetworkError|Load failed|network error/i, // sin internet
    /ethereum|web3|metamask|solana|phantom|tronWeb|__gCrWeb|webkit\.messageHandlers|standardSelectors/i // billeteras cripto y navegadores de apps (Instagram, Facebook) que inyectan código propio
  ];

  function recortar(t, n) { t = String(t == null ? "" : t); return t.length > n ? t.slice(0, n) : t; }

  function enviar(mensaje, fuente, linea, columna, pila) {
    try {
      mensaje = recortar(mensaje, 500);
      if (!mensaje) return;
      for (var i = 0; i < IGNORAR.length; i++) if (IGNORAR[i].test(mensaje) || IGNORAR[i].test(fuente || "")) return;
      var clave = mensaje + "|" + fuente + "|" + linea;
      if (vistos[clave] || enviados >= MAX_POR_PAGINA) return;
      vistos[clave] = 1; enviados++;
      var datos = {
        pagina: recortar(location.pathname + location.hash.replace(/access_token=[^&]*/g, ""), 300),
        mensaje: mensaje,
        fuente: recortar((fuente || "").replace(location.origin, ""), 300),
        linea: linea || null,
        columna: columna || null,
        pila: recortar(pila, 2000) || null,
        navegador: recortar(navigator.userAgent, 300)
      };
      fetch(URL_SB + "/rest/v1/errores_sitio", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", apikey: CLAVE, Authorization: "Bearer " + CLAVE, Prefer: "return=minimal" },
        body: JSON.stringify(datos)
      }).catch(function () {});
    } catch (e) { /* nunca romper la página por registrar un error */ }
  }

  window.addEventListener("error", function (ev) {
    // Errores de carga de recursos (imagen, script, css que no existe)
    var t = ev.target;
    if (t && t !== window && (t.src || t.href)) {
      // la página se está cerrando o recargando: las cargas que quedan a medio camino se cortan solas
      if (saliendo) return;
      // imágenes vacías que meten los bloqueadores de contenido del navegador (no son del sitio)
      if (/^(data|blob|about):/i.test(t.src || t.href || "")) return;
      enviar("No cargó el recurso: " + (t.tagName || "").toLowerCase(), t.src || t.href, null, null, null);
      return;
    }
    enviar(ev.message, ev.filename, ev.lineno, ev.colno, ev.error && ev.error.stack);
  }, true);

  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev.reason;
    var msg = r && (r.message || r.error_description || r.msg) ? (r.message || r.error_description || r.msg) : String(r);
    enviar("Promesa sin manejar: " + msg, "", null, null, r && r.stack);
  });

  // Para registrar errores a mano desde otros scripts: MA_ERROR("texto")
  window.MA_ERROR = function (texto, detalle) { enviar(texto, "manual", null, null, detalle ? JSON.stringify(detalle) : null); };
})();
