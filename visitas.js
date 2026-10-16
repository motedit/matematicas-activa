/* Matemáticas Activas — estadísticas de visitas propias.
   Anota, sin datos personales, qué página se abrió, qué tema se leyó, de dónde
   vino la visita (Google, Instagram, directo…) y si es celular, tablet o PC.
   Para contar "visitantes únicos" guarda un número al azar en este navegador.
   No usa cookies, no guarda la IP ni nada que identifique a la persona. */
(function () {
  "use strict";
  if (window.MA_VISITA) return;

  var URL_SB = "https://yidrpuizgtqpswefwdaa.supabase.co";
  var CLAVE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHJwdWl6Z3RxcHN3ZWZ3ZGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzk4MTcsImV4cCI6MjA5NDYxNTgxN30.kRuZoCIkvXhDNdlfumkWY7JK2qsU1nObr6eegBboFds";
  var MAX_POR_PAGINA = 25;
  var enviados = 0, ultimoTema = null;

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var activo = /(^|\.)matematicasactivas\.com$/.test(location.hostname) &&   // solo el sitio real
    !navigator.webdriver &&                                                     // robots automáticos
    !/bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i.test(navigator.userAgent || "") &&
    leer("ma-no-contar") !== "1";                                               // el admin puede excluirse

  // Número al azar de este navegador (no es personal: se borra al limpiar datos del navegador)
  var nuevo = false;
  var visitante = leer("ma-vid");
  if (!visitante || !/^[a-z0-9]{8,32}$/.test(visitante)) {
    visitante = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 20).replace(/[^a-z0-9]/g, "0");
    nuevo = true;
    guardar("ma-vid", visitante);
  }

  function dispositivo() {
    var ua = navigator.userAgent || "";
    if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
    if (/Mobi|iPhone|Android/i.test(ua)) return "movil";
    return "pc";
  }

  function origen() {
    try {
      var p = new URLSearchParams(location.search);
      var utm = p.get("utm_source") || (p.get("fbclid") ? "facebook" : p.get("gclid") ? "google" : null);
      if (utm) return utm.toLowerCase().slice(0, 100);
      if (!document.referrer) return null;
      var h = new URL(document.referrer).hostname.replace(/^www\.|^m\.|^l\.|^lm\./, "");
      if (/(^|\.)matematicasactivas\.com$/.test(h)) return "(interno)";   // pasó de una página del sitio a otra
      if (/google\./.test(h)) return "google";
      if (/instagram\./.test(h)) return "instagram";
      if (/facebook\.|fb\./.test(h)) return "facebook";
      if (/t\.co$|twitter\.|x\.com/.test(h)) return "x (twitter)";
      if (/youtube\./.test(h)) return "youtube";
      if (/whatsapp\./.test(h)) return "whatsapp";
      if (/bing\./.test(h)) return "bing";
      return h.slice(0, 100);
    } catch (e) { return null; }
  }

  function pagina() {
    var p = location.pathname || "/";
    try { p = decodeURIComponent(p); } catch (e) {}
    p = p.replace(/\/index\.html$/, "/");
    return p.slice(0, 200) || "/";
  }

  function conCuenta() {
    try {
      for (var i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token$/.test(localStorage.key(i))) return true;
    } catch (e) {}
    return false;
  }

  function enviar(temaId) {
    if (!activo || enviados >= MAX_POR_PAGINA) return;
    enviados++;
    var fila = {
      pagina: pagina(), tema_id: temaId || null, origen: enviados === 1 ? origen() : null,
      dispositivo: dispositivo(), visitante: visitante, nuevo: nuevo && enviados === 1, con_cuenta: conCuenta()
    };
    try {
      fetch(URL_SB + "/rest/v1/visitas", {
        method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json", apikey: CLAVE, Authorization: "Bearer " + CLAVE, Prefer: "return=minimal" },
        body: JSON.stringify(fila)
      }).catch(function () {});
    } catch (e) {}
  }

  window.MA_VISITA = {
    // Lo llama materia.js cuando el alumno abre un tema
    tema: function (temaId) {
      if (!/^[0-9a-f-]{36}$/i.test(temaId || "") || temaId === ultimoTema) return;
      ultimoTema = temaId;
      enviar(temaId);
    },
    // Para el panel de admin: no contar las visitas de este aparato
    noContarme: function (si) { guardar("ma-no-contar", si ? "1" : "0"); activo = activo && !si; },
    excluido: function () { return leer("ma-no-contar") === "1"; }
  };

  if (document.readyState === "complete") enviar(null);
  else window.addEventListener("load", function () { enviar(null); });
})();
