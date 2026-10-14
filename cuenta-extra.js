/* Matemáticas Activas — Mi perfil (accesos y pagos, Invitá a un amigo, correos)
   y el campo "¿Tenés un cupón?" de los planes.
   Se carga después de scripts.js. */
(function () {
  "use strict";

  var SITIO = "https://matematicasactivas.com";
  var PRECIOS = { basico: 8000, premium: 16000, calculadora: 5000 };
  var NOMBRES = { basico: "Plan Básico", premium: "Plan Premium", calculadora: "Calculadora 7 días", medida: "Plan a Medida" };

  function cliente() { return window.MA_SUPABASE && window.MA_SUPABASE.sb; }
  function perfil() { try { return appState.perfilActual; } catch (e) { return null; } }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pesos(n) { return "$ " + Number(n).toLocaleString("es-AR"); }
  function conDescuento(precio, porc) { return Math.max(100, Math.round(precio * (100 - porc) / 100 / 100) * 100); }
  function fecha(ts) { return ts ? new Date(ts).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "—"; }
  function guardar(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function toast(m, t) { if (typeof mostrarToast === "function") mostrarToast(m, t || "info"); }

  // ── 1) Link de invitación: matematicasactivas.com/?ref=CODIGO ──
  (function capturarRef() {
    var q = new URLSearchParams(location.search);
    var ref = (q.get("ref") || "").trim().toUpperCase();
    if (/^[A-Z0-9]{4,12}$/.test(ref)) {
      guardar("ma-ref", JSON.stringify({ c: ref, t: Date.now() }));
      q.delete("ref");
      var resto = q.toString();
      history.replaceState({}, "", location.pathname + (resto ? "?" + resto : "") + location.hash);
    }
  })();
  // Código de quien invitó (vale 30 días desde que se abrió el link)
  window.MA_REF = function () {
    try {
      var r = JSON.parse(leer("ma-ref") || "null");
      if (r && r.c && Date.now() - r.t < 30 * 86400000) return r.c;
    } catch (e) {}
    return null;
  };

  // ── 2) Cupón de descuento en los planes ────────────────────────
  window.MA_CUPON = null;
  try { window.MA_CUPON = JSON.parse(sessionStorage.getItem("ma-cupon") || "null"); } catch (e) {}

  function cajaCuponHtml() {
    return '<div class="cupon-caja">' +
      '<div class="cupon-invitado" hidden></div>' +
      '<form class="cupon-form" onsubmit="return MA_aplicarCupon(this)">' +
      '<label class="cupon-label">🎟️ ¿Tenés un cupón de descuento?</label>' +
      '<div class="cupon-fila"><input type="text" class="cupon-input" maxlength="30" placeholder="Ej: BIENVENIDA10" autocomplete="off" autocapitalize="characters" aria-label="Código del cupón">' +
      '<button type="submit" class="cupon-btn">Aplicar</button></div>' +
      '<div class="cupon-msj" role="status" aria-live="polite"></div></form></div>';
  }
  window.MA_cajaCuponHtml = cajaCuponHtml;

  function pintarCupon(caja) {
    var msj = caja.querySelector(".cupon-msj");
    var input = caja.querySelector(".cupon-input");
    var c = window.MA_CUPON;
    if (!c) { msj.innerHTML = ""; msj.className = "cupon-msj"; return; }
    input.value = c.codigo;
    var vale = function (plan) { return !c.planes || c.planes.indexOf(plan) >= 0; };
    var lineas = ["basico", "premium", "calculadora"].filter(vale).map(function (p) {
      return NOMBRES[p] + ": <s>" + pesos(PRECIOS[p]) + "</s> <b>" + pesos(conDescuento(PRECIOS[p], c.porcentaje)) + "</b>";
    });
    if (vale("medida")) lineas.push("Plan a Medida: " + c.porcentaje + "% menos sobre el total");
    msj.className = "cupon-msj ok";
    msj.innerHTML = "✅ <b>" + esc(c.codigo) + "</b> aplicado: " + esc(c.mensaje) + ". Se descuenta al pagar." +
      '<div class="cupon-precios">' + lineas.join("<br>") + "</div>" +
      '<button type="button" class="cupon-quitar" onclick="MA_quitarCupon()">Quitar cupón</button>';
  }
  function pintarTodas() {
    document.querySelectorAll(".cupon-caja").forEach(pintarCupon);
    pintarInvitado();
  }

  window.MA_aplicarCupon = function (form) {
    var caja = form.closest(".cupon-caja");
    var input = caja.querySelector(".cupon-input");
    var msj = caja.querySelector(".cupon-msj");
    var cod = input.value.trim().toUpperCase();
    if (!cod) { msj.className = "cupon-msj error"; msj.textContent = "Escribí el código del cupón."; return false; }
    var sb = cliente();
    if (!sb) { msj.className = "cupon-msj error"; msj.textContent = "No hay conexión. Probá de nuevo."; return false; }
    msj.className = "cupon-msj"; msj.textContent = "Verificando…";
    sb.rpc("validar_cupon", { p_codigo: cod, p_plan: null }).then(function (r) {
      var d = r.data;
      if (r.error || !d || !d.ok) {
        msj.className = "cupon-msj error";
        msj.textContent = (d && d.mensaje) || "No pudimos verificar el cupón. Probá de nuevo.";
        return;
      }
      window.MA_CUPON = { codigo: d.codigo, porcentaje: d.porcentaje, planes: d.planes, mensaje: d.mensaje };
      try { sessionStorage.setItem("ma-cupon", JSON.stringify(window.MA_CUPON)); } catch (e) {}
      pintarTodas();
    });
    return false;
  };
  window.MA_quitarCupon = function () {
    window.MA_CUPON = null;
    try { sessionStorage.removeItem("ma-cupon"); } catch (e) {}
    document.querySelectorAll(".cupon-caja .cupon-input").forEach(function (i) { i.value = ""; });
    pintarTodas();
  };
  // El cupón que corresponde a un plan (lo usa iniciarPagoMP)
  window.MA_cuponPara = function (plan) {
    var c = window.MA_CUPON;
    if (!c) return null;
    if (c.planes && c.planes.indexOf(plan) < 0) return null;
    return c.codigo;
  };

  var _referidos = null;
  function pintarInvitado() {
    var d = _referidos;
    document.querySelectorAll(".cupon-invitado").forEach(function (el) {
      if (d && d.tengo_descuento) {
        el.hidden = false;
        el.innerHTML = "🎁 <b>Viniste invitado por un amigo:</b> tenés 10% de descuento en tu primera compra. Se aplica solo al pagar" +
          (window.MA_CUPON ? " (si usás un cupón, se aplica el cupón en su lugar; no se suman)." : ".");
      } else el.hidden = true;
    });
  }

  // Inserta la caja de cupón en la ventana "Elegí tu plan" (en el inicio la pone scripts.js)
  function insertarCajas() {
    var el = document.getElementById("modal-planes");
    if (el && !(el.previousElementSibling && el.previousElementSibling.classList.contains("cupon-caja"))) {
      el.insertAdjacentHTML("beforebegin", cajaCuponHtml());
    }
    pintarTodas();
  }

  // ── 3) Mi perfil ───────────────────────────────────────────────
  function accesosHtml(p) {
    var ahora = Date.now();
    var vig = function (h) { return h && new Date(h).getTime() > ahora; };
    var filas = [];
    if (p.plan && p.plan !== "gratis" && vig(p.plan_hasta)) filas.push([NOMBRES[p.plan] || p.plan, p.plan_hasta]);
    var mods = p.modulos || {};
    var nom = function (id) {
      var m = window.MA_PLANES && window.MA_PLANES.MODULOS.find(function (x) { return x.id === id; });
      return m ? m.nombre : id;
    };
    Object.keys(mods).forEach(function (m) { if (vig(mods[m])) filas.push([nom(m) + " (Plan a Medida)", mods[m]]); });
    if (vig(p.calculadora_hasta) && !(mods.calculadora && vig(mods.calculadora))) filas.push(["Calculadora", p.calculadora_hasta]);
    if (!filas.length) {
      return '<p class="pe-vacio">Estás en el <b>plan Gratis</b>.</p>' +
        '<button type="button" class="btn-auth btn-primary pe-btn" onclick="MA_irAPlanes()">Ver planes</button>';
    }
    return '<ul class="pe-accesos">' + filas.map(function (f) {
      var dias = Math.ceil((new Date(f[1]).getTime() - ahora) / 86400000);
      return "<li><span>" + esc(f[0]) + "</span><span class=\"" + (dias <= 3 ? "pe-pronto" : "") + "\">hasta el " + fecha(f[1]) +
        " · " + (dias <= 1 ? "vence mañana" : "quedan " + dias + " días") + "</span></li>";
    }).join("") + "</ul>" +
      '<button type="button" class="btn-auth btn-secondary pe-btn" onclick="MA_irAPlanes()">Renovar o sumar días</button>';
  }

  function pagosHtml(pagos) {
    if (!pagos.length) return '<p class="pe-vacio">Todavía no hiciste ningún pago.</p>';
    return '<ul class="pe-pagos">' + pagos.map(function (x, i) {
      var concepto = x.concepto || ("Acceso de " + x.dias_activados + " días");
      var extra = x.cupon ? ' <span class="pe-chip">cupón ' + esc(x.cupon) + "</span>" : (x.descuento ? ' <span class="pe-chip">−' + x.descuento + "%</span>" : "");
      return "<li><div><b>" + esc(concepto) + "</b>" + extra + "<small>" + fecha(x.creado_en) + " · " + x.dias_activados + " días · " +
        (x.tipo === "renovacion" ? "renovación" : "activación") + "</small></div>" +
        '<div class="pe-monto">' + esc(x.monto) + '<button type="button" class="pe-recibo" title="Ver comprobante" aria-label="Ver comprobante" onclick="MA_comprobante(' + i + ')">🧾</button></div></li>';
    }).join("") + "</ul>";
  }

  var _pagos = [];
  window.MA_comprobante = function (i) {
    var x = _pagos[i], p = perfil() || {};
    if (!x) return;
    var w = window.open("", "_blank", "width=520,height=640");
    if (!w) { toast("Permití las ventanas emergentes para ver el comprobante", "warn"); return; }
    w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Comprobante de pago</title>' +
      '<style>body{font-family:Arial,sans-serif;color:#0f172a;max-width:440px;margin:32px auto;padding:0 16px}h1{font-size:20px;margin:0 0 4px}' +
      'p.s{color:#64748b;margin:0 0 20px;font-size:13px}table{width:100%;border-collapse:collapse;font-size:14px}td{padding:9px 0;border-bottom:1px solid #e2e8f0}' +
      'td:last-child{text-align:right;font-weight:700}.n{font-size:12px;color:#64748b;margin-top:18px}button{margin-top:18px;padding:10px 18px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}' +
      '@media print{button{display:none}}</style></head><body>' +
      "<h1>Matemáticas Activas</h1><p class=\"s\">Comprobante de pago · matematicasactivas.com</p><table>" +
      "<tr><td>Fecha</td><td>" + esc(fecha(x.creado_en)) + "</td></tr>" +
      "<tr><td>Usuario</td><td>" + esc(p.nombre_completo || p.username || "") + "</td></tr>" +
      "<tr><td>Concepto</td><td>" + esc(x.concepto || "Acceso") + "</td></tr>" +
      "<tr><td>Días de acceso</td><td>" + esc(x.dias_activados) + "</td></tr>" +
      (x.cupon ? "<tr><td>Cupón</td><td>" + esc(x.cupon) + (x.descuento ? " (−" + esc(x.descuento) + "%)" : "") + "</td></tr>" : "") +
      "<tr><td>Total pagado</td><td>" + esc(x.monto) + " " + esc(x.moneda || "ARS") + "</td></tr>" +
      (x.mp_payment_id ? "<tr><td>N.º de operación MercadoPago</td><td>" + esc(x.mp_payment_id) + "</td></tr>" : "") +
      '</table><p class="n">Este comprobante no es una factura. El pago se procesó con MercadoPago.</p>' +
      '<button onclick="window.print()">Imprimir o guardar en PDF</button></body></html>');
    w.document.close();
  };

  window.MA_irAPlanes = function () {
    var m = document.getElementById("modal-perfil"); if (m) m.style.display = "none";
    var s = document.getElementById("suscripcion");
    if (s) s.scrollIntoView({ behavior: "smooth" }); else location.href = "index.html#suscripcion";
  };

  function invitarHtml(d) {
    if (!d || !d.codigo) return '<p class="pe-vacio">No pudimos cargar tu código. Probá cerrar y abrir tu perfil.</p>';
    var link = SITIO + "/?ref=" + d.codigo;
    var texto = "Te paso Matemáticas Activas: tiene una calculadora que explica cada paso y teoría de todas las materias. Registrate con mi link y tenés 10% en tu primera compra: " + link;
    return '<p class="pe-texto">Compartí tu link. Tu amigo tiene <b>10% de descuento</b> en su primera compra y, cuando paga, vos recibís <b>7 días de Premium gratis</b>.</p>' +
      '<div class="pe-link"><input type="text" readonly value="' + esc(link) + '" aria-label="Tu link de invitación" onclick="this.select()">' +
      '<button type="button" class="cupon-btn" onclick="MA_copiarLink(this)">Copiar</button></div>' +
      '<a class="pe-wa" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Compartir por WhatsApp</a>' +
      '<p class="pe-stats">👥 Se registraron con tu link: <b>' + d.invitados + "</b> · 🎁 Premios ganados: <b>" + d.premios + "</b> (" + (d.premios * 7) + " días)</p>";
  }
  window.MA_copiarLink = function (btn) {
    var input = btn.parentNode.querySelector("input");
    var ok = function () { btn.textContent = "¡Copiado!"; setTimeout(function () { btn.textContent = "Copiar"; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(ok, function () { input.select(); document.execCommand("copy"); ok(); });
    else { input.select(); document.execCommand("copy"); ok(); }
  };

  function correosHtml(p) {
    return '<label class="notif-toggle"><input type="checkbox" id="pe-correos-promo"' + (p.correos_promo === false ? "" : " checked") +
      '><span>Novedades, ofertas y cupones (como mucho, unos pocos por mes)</span></label>' +
      '<label class="notif-toggle"><input type="checkbox" checked disabled><span>Aviso cuando tu plan está por vencer <small>(siempre activo si pagaste)</small></span></label>' +
      '<button type="button" class="btn-auth btn-secondary" onclick="MA_guardarCorreos(this)" style="margin-top:8px;font-size:12px">Guardar preferencias</button>';
  }
  window.MA_guardarCorreos = function (btn) {
    var p = perfil(), sb = cliente();
    if (!p || !sb) return;
    var v = document.getElementById("pe-correos-promo").checked;
    btn.disabled = true;
    sb.from("perfiles").update({ correos_promo: v }).eq("id", p.id).then(function (r) {
      btn.disabled = false;
      if (r.error) { toast("No se pudieron guardar las preferencias", "error"); return; }
      p.correos_promo = v;
      toast(v ? "Vas a recibir novedades ✓" : "No te vamos a mandar novedades ✓", "ok");
    });
  };

  function asegurarSecciones() {
    var modal = document.getElementById("modal-perfil");
    if (!modal || document.getElementById("pe-accesos")) return;
    var ancla = modal.querySelector(".perfil-section");
    ancla.insertAdjacentHTML("beforebegin",
      '<div class="perfil-section" id="pe-accesos"><h4>💳 Mis accesos y pagos</h4><div class="pe-cont"></div>' +
      '<h4 class="pe-sub">Historial de pagos</h4><div class="pe-hist"></div></div>' +
      '<div class="perfil-section" id="pe-invitar"><h4>🎁 Invitá a un amigo</h4><div class="pe-cont"></div></div>');
    var notif = document.getElementById("perfil-notif-config");
    if (notif) notif.innerHTML = '<div id="pe-correos"></div>';
  }

  function cargarPerfilExtra() {
    var p = perfil(), sb = cliente();
    if (!p || !sb) return;
    asegurarSecciones();
    var cont = document.querySelector("#pe-accesos .pe-cont");
    var hist = document.querySelector("#pe-accesos .pe-hist");
    var inv = document.querySelector("#pe-invitar .pe-cont");
    var corr = document.getElementById("pe-correos");
    cont.innerHTML = accesosHtml(p);
    hist.innerHTML = '<p class="pe-vacio">Cargando…</p>';
    inv.innerHTML = '<p class="pe-vacio">Cargando…</p>';
    if (corr) corr.innerHTML = correosHtml(p);

    sb.from("historial_pagos").select("creado_en, concepto, monto, moneda, dias_activados, tipo, mp_payment_id, cupon, descuento")
      .eq("usuario_id", p.id).order("creado_en", { ascending: false }).limit(50)
      .then(function (r) {
        if (r.error) {   // por si todavía no se corrió el SQL nuevo (sin columnas concepto/cupón)
          return sb.from("historial_pagos").select("creado_en, monto, moneda, dias_activados, tipo, mp_payment_id")
            .eq("usuario_id", p.id).order("creado_en", { ascending: false }).limit(50);
        }
        return r;
      })
      .then(function (r) { _pagos = (r && r.data) || []; hist.innerHTML = pagosHtml(_pagos); });

    sb.rpc("mis_referidos").then(function (r) {
      _referidos = r.data || null;
      inv.innerHTML = invitarHtml(_referidos);
      pintarInvitado();
    });
    sb.from("perfiles").select("correos_promo").eq("id", p.id).maybeSingle().then(function (r) {
      if (r.data && corr) { p.correos_promo = r.data.correos_promo; corr.innerHTML = correosHtml(p); }
    });
  }
  window.MA_cargarPerfilExtra = cargarPerfilExtra;

  // Engancharse a abrirPerfil() de scripts.js
  if (typeof window.abrirPerfil === "function") {
    var original = window.abrirPerfil;
    window.abrirPerfil = function (e) {
      var r = original.apply(this, arguments);
      try { cargarPerfilExtra(); } catch (err) { console.error(err); }
      return r;
    };
  }
  // El aviso de "viniste invitado" en los planes necesita saber si hay sesión
  function cargarReferidosSiHaySesion(intentos) {
    var p = perfil(), sb = cliente();
    if (p && sb) { sb.rpc("mis_referidos").then(function (r) { _referidos = r.data || null; pintarInvitado(); }); return; }
    if ((intentos || 0) < 20) setTimeout(function () { cargarReferidosSiHaySesion((intentos || 0) + 1); }, 500);
  }

  function iniciar() { insertarCajas(); cargarReferidosSiHaySesion(0); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  window.MA_pintarCupones = pintarTodas;
})();
