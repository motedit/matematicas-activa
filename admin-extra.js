/* Matemáticas Activas — pestañas nuevas del Panel de admin:
   🐞 Errores (lo que falla en los navegadores de los alumnos)
   🎟️ Cupones (crear, pausar y borrar cupones de descuento)
   ✉️ Correos (estado de Resend, vista previa, pruebas y envío manual)
   📈 Visitas (estadísticas propias: cuántos entran, qué leen, de dónde vienen) */
(function () {
  "use strict";
  var URL_FN = "https://yidrpuizgtqpswefwdaa.supabase.co/functions/v1/correos";
  var PLANES = [["basico", "Básico"], ["premium", "Premium"], ["calculadora", "Calculadora 7 días"], ["medida", "Plan a Medida"]];

  function sb() { return window.MA_SUPABASE && window.MA_SUPABASE.sb; }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function cuando(ts) { return new Date(ts).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  function toast(m, t) { if (typeof mostrarToast === "function") mostrarToast(m, t || "info"); }
  function navegador(ua) {
    ua = ua || "";
    var so = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "";
    var n = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Otro";
    return so ? n + " · " + so : n;
  }
  function faltaSql(err) {
    return err && /does not exist|schema cache|Could not find/i.test(err.message || "") ?
      '<p class="ax-aviso">Falta correr el archivo <b>APLICAR-MEJORAS-14-10-EN-SUPABASE.sql</b> en Supabase.</p>' : "";
  }

  // ── 🐞 Errores ────────────────────────────────────────────────
  var _grupos = [];
  async function renderErrores() {
    var c = document.getElementById("admin-errores-cont"); if (!c) return;
    c.innerHTML = '<p class="ax-cargando">Cargando…</p>';
    var r = await sb().from("errores_sitio").select("*").order("creado_en", { ascending: false }).limit(500);
    if (r.error) { c.innerHTML = faltaSql(r.error) || '<p class="ax-aviso">' + esc(r.error.message) + "</p>"; return; }
    var filas = r.data || [];
    var hace24 = Date.now() - 86400000;
    var mapa = {};
    filas.forEach(function (e) {
      var k = e.mensaje + "|" + (e.pagina || "").split("#")[0];
      if (!mapa[k]) mapa[k] = { mensaje: e.mensaje, pagina: e.pagina, veces: 0, hoy: 0, ultimo: e.creado_en, ej: e, navs: {} };
      var g = mapa[k]; g.veces++; if (new Date(e.creado_en).getTime() > hace24) g.hoy++;
      g.navs[navegador(e.navegador)] = 1;
    });
    _grupos = Object.keys(mapa).map(function (k) { return mapa[k]; }).sort(function (a, b) { return b.hoy - a.hoy || b.veces - a.veces; });
    var hoy = filas.filter(function (e) { return new Date(e.creado_en).getTime() > hace24; }).length;
    c.innerHTML =
      '<div class="ax-resumen"><div><b>' + hoy + '</b><span>últimas 24 h</span></div><div><b>' + filas.length + '</b><span>últimos 30 días</span></div><div><b>' + _grupos.length + '</b><span>errores distintos</span></div></div>' +
      (filas.length ? '<div class="ax-acciones"><button type="button" class="ax-btn" onclick="MA_adminCopiarErrores()">📋 Copiar para pasarle a Claude</button>' +
        '<button type="button" class="ax-btn ax-peligro" onclick="MA_adminBorrarErrores()">🗑️ Borrar todos (ya los arreglé)</button></div>' : "") +
      (_grupos.length ? _grupos.map(function (g, i) {
        var e = g.ej;
        return '<details class="ax-error"><summary><span class="ax-veces' + (g.hoy ? " ax-hoy" : "") + '">' + g.veces + "×</span>" +
          '<span class="ax-msj">' + esc(g.mensaje) + '<small>' + esc(g.pagina || "(sin página)") + " · " + esc(Object.keys(g.navs).join(", ")) + " · último: " + cuando(g.ultimo) + "</small></span></summary>" +
          '<pre class="ax-pila">' + esc((e.fuente ? e.fuente + (e.linea ? ":" + e.linea + (e.columna ? ":" + e.columna : "") : "") + "\n" : "") + (e.pila || "(sin detalle)") + "\n\n" + (e.navegador || "")) + "</pre></details>";
      }).join("") : '<p class="ax-ok">✅ No hay errores registrados. ¡Todo funciona bien!</p>');
  }
  window.MA_adminCopiarErrores = function () {
    var txt = "Errores de matematicasactivas.com (agrupados):\n\n" + _grupos.slice(0, 30).map(function (g) {
      var e = g.ej;
      return g.veces + "× " + g.mensaje + "\n   Página: " + (g.pagina || "-") + "\n   Archivo: " + (e.fuente || "-") + (e.linea ? ":" + e.linea : "") +
        "\n   Navegadores: " + Object.keys(g.navs).join(", ") + (e.pila ? "\n   Detalle: " + e.pila.split("\n").slice(0, 4).join(" | ") : "");
    }).join("\n\n");
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
      function () { toast("Copiado. Pegalo en el chat con Claude 📋", "ok"); },
      function () { toast("No se pudo copiar automáticamente", "warn"); });
  };
  window.MA_adminBorrarErrores = async function () {
    if (!confirm("¿Borrar todos los errores registrados? Hacelo solo después de corregirlos.")) return;
    var r = await sb().from("errores_sitio").delete().gt("id", 0);
    if (r.error) toast("No se pudieron borrar: " + r.error.message, "error"); else { toast("Errores borrados ✓", "ok"); renderErrores(); }
  };

  // ── 🎟️ Cupones ────────────────────────────────────────────────
  async function renderCupones() {
    var c = document.getElementById("admin-cupones-cont"); if (!c) return;
    c.innerHTML = '<p class="ax-cargando">Cargando…</p>';
    var r = await sb().from("cupones").select("*").order("creado_en", { ascending: false });
    if (r.error) { c.innerHTML = faltaSql(r.error) || '<p class="ax-aviso">' + esc(r.error.message) + "</p>"; return; }
    var hoy = new Date().toISOString().slice(0, 10);
    var lista = (r.data || []).map(function (x) {
      var vencido = x.vence && x.vence < hoy, agotado = x.usos_max && x.usos >= x.usos_max;
      var estado = !x.activo ? "Pausado" : vencido ? "Vencido" : agotado ? "Agotado" : "Activo";
      var planes = x.planes ? x.planes.map(function (p) { var f = PLANES.find(function (q) { return q[0] === p; }); return f ? f[1] : p; }).join(", ") : "Todos los planes";
      return '<div class="ax-cupon' + (estado === "Activo" ? "" : " ax-off") + '"><div class="ax-cupon-cod"><b>' + esc(x.codigo) + "</b><span>−" + x.porcentaje + "%</span></div>" +
        '<div class="ax-cupon-info">' + esc(x.descripcion || "") + "<small>" + esc(planes) + (x.solo_primera_compra ? " · solo 1.ª compra" : "") +
        " · usado " + x.usos + (x.usos_max ? "/" + x.usos_max : "") + " veces" + (x.vence ? " · vence " + new Date(x.vence + "T12:00:00").toLocaleDateString("es-AR") : "") + "</small></div>" +
        '<span class="ax-estado">' + estado + "</span>" +
        '<div class="ax-cupon-btns"><button type="button" class="ax-btn" onclick="MA_adminCuponActivo(\'' + esc(x.codigo) + "'," + (!x.activo) + ')">' + (x.activo ? "Pausar" : "Activar") + "</button>" +
        '<button type="button" class="ax-btn ax-peligro" onclick="MA_adminCuponBorrar(\'' + esc(x.codigo) + "')\">Borrar</button></div></div>";
    }).join("");
    c.innerHTML =
      '<form class="ax-form" onsubmit="return MA_adminCuponCrear(this)"><h4>Crear cupón</h4>' +
      '<div class="ax-grid"><label>Código<input name="codigo" required maxlength="30" pattern="[A-Za-z0-9_-]{3,30}" placeholder="PROFE20" style="text-transform:uppercase"></label>' +
      '<label>% de descuento<input name="porcentaje" type="number" min="1" max="90" required value="10"></label>' +
      '<label class="ax-ancho">Texto que ve el alumno<input name="descripcion" maxlength="120" placeholder="20% para alumnos del profe Juan"></label>' +
      '<label>Vence (opcional)<input name="vence" type="date"></label>' +
      '<label>Máximo de usos (opcional)<input name="usos_max" type="number" min="1" placeholder="Sin límite"></label></div>' +
      '<fieldset class="ax-planes"><legend>Vale para (si no marcás ninguno, vale para todos)</legend>' +
      PLANES.map(function (p) { return '<label><input type="checkbox" name="planes" value="' + p[0] + '"> ' + p[1] + "</label>"; }).join("") + "</fieldset>" +
      '<label class="ax-check"><input type="checkbox" name="primera"> Solo para la primera compra</label>' +
      '<button type="submit" class="btn-auth btn-primary">Crear cupón</button>' +
      '<p class="ax-nota">Cada alumno puede usar un mismo cupón una sola vez. El descuento se calcula en el servidor de pagos, así que nadie puede cambiar el precio desde el navegador.</p></form>' +
      "<h4>Cupones</h4>" + (lista || '<p class="ax-cargando">Todavía no hay cupones.</p>');
  }
  window.MA_adminCuponCrear = function (f) {
    var planes = Array.prototype.slice.call(f.querySelectorAll('input[name="planes"]:checked')).map(function (i) { return i.value; });
    var datos = {
      codigo: f.codigo.value.trim().toUpperCase(),
      porcentaje: parseInt(f.porcentaje.value, 10),
      descripcion: f.descripcion.value.trim() || null,
      vence: f.vence.value || null,
      usos_max: f.usos_max.value ? parseInt(f.usos_max.value, 10) : null,
      planes: planes.length ? planes : null,
      solo_primera_compra: f.primera.checked
    };
    sb().from("cupones").insert(datos).then(function (r) {
      if (r.error) toast(/duplicate|unique/i.test(r.error.message) ? "Ya existe un cupón con ese código" : "No se pudo crear: " + r.error.message, "error");
      else { toast("Cupón " + datos.codigo + " creado ✓", "ok"); renderCupones(); }
    });
    return false;
  };
  window.MA_adminCuponActivo = function (cod, activo) {
    sb().from("cupones").update({ activo: activo }).eq("codigo", cod).then(function (r) {
      if (r.error) toast(r.error.message, "error"); else renderCupones();
    });
  };
  window.MA_adminCuponBorrar = function (cod) {
    if (!confirm("¿Borrar el cupón " + cod + "? Si ya se usó, mejor pausalo para conservar el registro.")) return;
    sb().from("cupones").delete().eq("codigo", cod).then(function (r) {
      if (r.error) toast(r.error.message, "error"); else { toast("Cupón borrado", "ok"); renderCupones(); }
    });
  };

  // ── ✉️ Correos ────────────────────────────────────────────────
  async function llamar(accion, extra) {
    var s = await window.MA_SUPABASE.sbSesion();
    if (!s || !s.access_token) throw new Error("Iniciá sesión de nuevo");
    var res = await fetch(URL_FN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.access_token },
      body: JSON.stringify(Object.assign({ accion: accion }, extra || {}))
    });
    var d = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(d.error || ("Error " + res.status + (res.status === 404 ? " (falta publicar la función correos)" : "")));
    return d;
  }
  async function renderCorreos() {
    var c = document.getElementById("admin-correos-cont"); if (!c) return;
    c.innerHTML = '<p class="ax-cargando">Consultando…</p>';
    var d;
    try { d = await llamar("estado"); }
    catch (e) { c.innerHTML = '<p class="ax-aviso">No se pudo consultar el servicio de correos: ' + esc(e.message) + "</p>"; return; }
    var s = d.simulacion || {};
    c.innerHTML =
      '<div class="ax-resumen"><div><b>' + (d.resend ? "✅" : "⚠️") + "</b><span>" + (d.resend ? "Resend conectado" : "Falta la clave de Resend") + "</span></div>" +
      "<div><b>" + (d.enviados || 0) + "</b><span>correos enviados</span></div>" +
      "<div><b>" + ((s.vencimiento || 0) + (s.bienvenida || 0) + (s.errores || 0)) + "</b><span>saldrían hoy</span></div></div>" +
      '<p class="ax-nota">Remitente: <b>' + esc(d.desde) + "</b>. Todos los días a las 9:00 se envían: avisos de vencimiento (3 días antes), " +
      "la bienvenida con novedades a quien se registró hace 3-4 días y el resumen de errores para vos. Hoy saldrían: " +
      (s.vencimiento || 0) + " de vencimiento, " + (s.bienvenida || 0) + " de bienvenida y " + (s.errores || 0) + " de errores.</p>" +
      '<div class="ax-acciones"><button type="button" class="ax-btn" onclick="MA_adminVista(\'bienvenida\')">👁️ Bienvenida</button>' +
      '<button type="button" class="ax-btn" onclick="MA_adminVista(\'vencimiento\')">👁️ Vencimiento</button>' +
      '<button type="button" class="ax-btn" onclick="MA_adminVista(\'errores\')">👁️ Resumen de errores</button></div>' +
      '<div class="ax-acciones"><button type="button" class="ax-btn ax-principal" onclick="MA_adminPrueba(this)"' + (d.resend ? "" : " disabled") + '>📨 Enviarme las 3 pruebas a mi correo</button>' +
      '<button type="button" class="ax-btn" onclick="MA_adminEjecutar(this)"' + (d.resend ? "" : " disabled") + ">▶️ Hacer el envío de hoy ahora</button></div>" +
      '<div id="ax-vista"></div>' +
      (d.ultimos && d.ultimos.length ? "<h4>Últimos enviados</h4><ul class=\"ax-lista\">" + d.ultimos.map(function (u) {
        return "<li><span>" + esc(u.asunto || u.tipo) + "</span><small>" + cuando(u.enviado_en) + "</small></li>";
      }).join("") + "</ul>" : "");
  }
  window.MA_adminVista = async function (tipo) {
    var v = document.getElementById("ax-vista"); if (!v) return;
    v.innerHTML = '<p class="ax-cargando">Cargando vista previa…</p>';
    try {
      var d = await llamar("vista", { tipo: tipo });
      v.innerHTML = '<p class="ax-nota"><b>Asunto:</b> ' + esc(d.asunto) + '</p><iframe class="ax-iframe" title="Vista previa del correo" sandbox=""></iframe>';
      v.querySelector("iframe").srcdoc = d.html;
    } catch (e) { v.innerHTML = '<p class="ax-aviso">' + esc(e.message) + "</p>"; }
  };
  window.MA_adminPrueba = async function (btn) {
    btn.disabled = true;
    try {
      var d = await llamar("prueba");
      toast(d.ok ? "Listo: revisá tu correo " + d.para + " (y la carpeta Spam) 📨" : "Hubo un problema: " + JSON.stringify(d.resultados), d.ok ? "ok" : "warn");
    } catch (e) { toast(e.message, "error"); }
    btn.disabled = false;
  };
  window.MA_adminEjecutar = async function (btn) {
    if (!confirm("¿Hacer ahora el envío de hoy? Se manda solo a quien le corresponde y nunca dos veces el mismo correo.")) return;
    btn.disabled = true;
    try {
      var d = await llamar("ejecutar");
      toast("Enviados: " + d.vencimiento + " vencimiento, " + d.bienvenida + " bienvenida, " + d.errores + " errores" + (d.fallidos && d.fallidos.length ? " · fallaron " + d.fallidos.length : ""), "ok");
      renderCorreos();
    } catch (e) { toast(e.message, "error"); btn.disabled = false; }
  };


  // ── 📈 Visitas (estadísticas propias, sin datos personales) ──────
  var _diasVisitas = 30;
  var NOMBRE_MATERIA = { algebra: "Álgebra", aritmetica: "Aritmética", geometria: "Geometría", trigonometria: "Trigonometría",
    calculo: "Cálculo", estadistica: "Estadística", razonamiento: "Razonamiento" };
  function nombrePagina(p) {
    if (!p || p === "/") return "Inicio";
    if (/^\/calculadora/.test(p)) return "Calculadora paso a paso";
    if (/^\/docentes\/?$/.test(p)) return "Docentes (biblioteca)";
    var m = p.match(/^\/materias\/([^/]+)\//); if (m) return "Materia: " + (NOMBRE_MATERIA[m[1].toLowerCase()] || m[1]);
    var ult = p.split("/").filter(Boolean).pop() || p;
    return ult.replace(/\.html$/, "").replace(/[-_]/g, " ");
  }
  function fechaCorta(d) { var x = String(d).split("-"); return x[2] + "/" + x[1]; }
  function fmt(n) { return Number(n || 0).toLocaleString("es-AR"); }
  function pct(a, b) { return b ? (Math.round(a * 1000 / b) / 10).toLocaleString("es-AR") + " %" : "–"; }
  function barras(lista, campo, etiqueta) {
    if (!lista || !lista.length) return '<p class="ax-nota">Todavía no hay datos.</p>';
    var max = Math.max.apply(null, lista.map(function (x) { return x[campo]; })) || 1;
    return '<ul class="vx-barras">' + lista.map(function (x) {
      return '<li><span class="vx-nom" title="' + esc(etiqueta(x)) + '">' + esc(etiqueta(x)) + '</span><span class="vx-pista"><i style="width:' +
        Math.max(2, Math.round(x[campo] * 100 / max)) + '%"></i></span><b>' + fmt(x[campo]) + "</b></li>";
    }).join("") + "</ul>";
  }
  function grafico(datos, campo, etiquetaX, unidad, anchoCaja) {
    var W = Math.max(300, Math.min(900, anchoCaja || 640)), H = 170, izq = 30, abajo = 22, arriba = 10, n = datos.length;
    var max = Math.max.apply(null, datos.map(function (d) { return d[campo]; }));
    var tope = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
    var ancho = (W - izq) / n, barra = Math.max(2, ancho - 2);
    var y = function (v) { return arriba + (H - arriba - abajo) * (1 - v / tope); };
    var svg = '<svg class="vx-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Gráfico de ' + esc(unidad) + '">';
    [0, tope / 2, tope].forEach(function (v) {
      svg += '<line x1="' + izq + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '" class="vx-grilla"/><text x="' + (izq - 5) + '" y="' + (y(v) + 4) + '" class="vx-eje" text-anchor="end">' + v + "</text>";
    });
    datos.forEach(function (d, i) {
      var x = izq + i * ancho + 1, v = d[campo], top = y(v), alto = (H - abajo) - top;
      if (v > 0) svg += '<path class="vx-barra" d="M' + x + "," + (H - abajo) + "V" + (top + Math.min(4, alto)) + "q0,-" + Math.min(4, alto) + " " + Math.min(4, alto) + ",-" + Math.min(4, alto) +
        "H" + (x + barra - Math.min(4, alto)) + "q" + Math.min(4, alto) + ",0 " + Math.min(4, alto) + "," + Math.min(4, alto) + "V" + (H - abajo) + 'Z"/>';
      svg += '<rect class="vx-hit" x="' + (izq + i * ancho) + '" y="0" width="' + ancho + '" height="' + (H - abajo) + '" data-t="' + esc(etiquetaX(d, true) + ": " + fmt(v) + " " + unidad) + '"/>';
      var cada = Math.ceil(n / Math.max(3, Math.floor(W / 80)));
      if (i % cada === 0 || (i === n - 1 && (n - 1) % cada >= cada / 2)) svg += '<text x="' + (i === n - 1 ? x + barra : x + barra / 2) + '" y="' + (H - 6) + '" class="vx-eje" text-anchor="' + (i === n - 1 ? "end" : i === 0 ? "start" : "middle") + '">' + esc(etiquetaX(d)) + "</text>";
    });
    return '<div class="vx-graf">' + svg + '</svg><div class="vx-tip" hidden></div></div>';
  }
  function activarTooltips(c) {
    c.querySelectorAll(".vx-graf").forEach(function (g) {
      var tip = g.querySelector(".vx-tip");
      g.querySelectorAll(".vx-hit").forEach(function (r) {
        function mostrar() {
          g.querySelectorAll(".vx-hit.on").forEach(function (o) { o.classList.remove("on"); });
          r.classList.add("on"); tip.textContent = r.getAttribute("data-t"); tip.hidden = false;
          var gb = g.getBoundingClientRect(), rb = r.getBoundingClientRect();
          tip.style.left = Math.min(Math.max(0, rb.left - gb.left + rb.width / 2 - tip.offsetWidth / 2), gb.width - tip.offsetWidth) + "px";
        }
        r.addEventListener("mouseenter", mostrar); r.addEventListener("click", mostrar);
      });
      g.addEventListener("mouseleave", function () { tip.hidden = true; g.querySelectorAll(".vx-hit.on").forEach(function (o) { o.classList.remove("on"); }); });
    });
  }
  async function renderVisitas() {
    var c = document.getElementById("admin-visitas-cont"); if (!c) return;
    c.innerHTML = '<p class="ax-cargando">Cargando…</p>';
    var r = await sb().rpc("estadisticas_visitas", { p_dias: _diasVisitas });
    if (r.error) {
      c.innerHTML = /does not exist|schema cache|Could not find/i.test(r.error.message || "") ?
        '<p class="ax-aviso">Falta correr el archivo <b>APLICAR-VISITAS-16-10-EN-SUPABASE.sql</b> en Supabase.</p>' :
        '<p class="ax-aviso">' + esc(r.error.message) + "</p>";
      return;
    }
    var d = r.data || {}, per = d.periodo || {}, disp = d.dispositivos || {};
    var totDisp = (disp.movil || 0) + (disp.tablet || 0) + (disp.pc || 0) + (disp.otro || 0);
    var excluido = window.MA_VISITA && window.MA_VISITA.excluido();
    c.innerHTML =
      '<div class="ax-acciones vx-periodo" role="group" aria-label="Período">' + [7, 30, 90].map(function (n) {
        return '<button type="button" class="ax-btn' + (n === _diasVisitas ? " ax-principal" : "") + '" onclick="MA_adminVisitasDias(' + n + ')">Últimos ' + n + " días</button>";
      }).join("") + "</div>" +
      '<div class="ax-resumen vx-4"><div><b>' + fmt((d.hoy || {}).visitantes) + "</b><span>visitantes hoy<br><small>ayer: " + fmt((d.ayer || {}).visitantes) + "</small></span></div>" +
      "<div><b>" + fmt(per.visitantes) + "</b><span>visitantes en " + d.dias + " días<br><small>" + fmt(per.nuevos) + " nuevos</small></span></div>" +
      "<div><b>" + fmt(per.visitas) + "</b><span>páginas vistas</span></div>" +
      "<div><b>" + fmt(per.temas_abiertos) + "</b><span>temas leídos</span></div></div>" +
      '<p class="ax-nota vx-embudo">De <b>' + fmt(per.visitantes) + "</b> visitantes, <b>" + fmt(d.registros) + "</b> se registraron (" + pct(d.registros || 0, per.visitantes) +
      ") y hubo <b>" + fmt(d.pagos) + "</b> pagos (" + pct(d.pagos || 0, per.visitantes) + ").</p>" +
      "<h4>Visitantes por día</h4>" + grafico(d.por_dia || [], "visitantes", function (x) { return fechaCorta(x.dia); }, "visitantes", c.clientWidth) +
      "<h4>¿A qué hora entran?</h4>" + grafico(d.por_hora || [], "visitas", function (x, largo) { return largo ? x.hora + ":00 a " + x.hora + ":59" : x.hora + "h"; }, "páginas vistas", c.clientWidth) +
      '<div class="vx-cols"><section><h4>Temas más leídos</h4>' + barras(d.temas, "visitantes", function (x) { return x.nombre + (x.materia ? " · " + (NOMBRE_MATERIA[x.materia] || x.materia) : ""); }) + "</section>" +
      "<section><h4>De dónde llegan</h4>" + barras(d.origenes, "visitantes", function (x) { return x.nombre; }) + "</section>" +
      "<section><h4>Páginas más vistas</h4>" + barras(d.paginas, "visitas", function (x) { return nombrePagina(x.nombre); }) + "</section>" +
      "<section><h4>Desde qué aparato</h4>" + (totDisp ? '<ul class="vx-barras">' + [["movil", "📱 Celular"], ["pc", "💻 Computadora"], ["tablet", "📟 Tablet"]].map(function (k) {
        var v = disp[k[0]] || 0;
        return "<li><span class=\"vx-nom\">" + k[1] + '</span><span class="vx-pista"><i style="width:' + Math.max(2, Math.round(v * 100 / totDisp)) + '%"></i></span><b>' + pct(v, totDisp) + "</b></li>";
      }).join("") + "</ul>" : '<p class="ax-nota">Todavía no hay datos.</p>') + "</section></div>" +
      '<label class="ax-check vx-excluir"><input type="checkbox" ' + (excluido ? "checked" : "") + ' onchange="MA_adminNoContarme(this.checked)"> No contar mis propias visitas desde este aparato</label>' +
      '<p class="ax-nota">“Visitante” = un navegador distinto (sin datos personales: no se guarda IP, nombre ni correo). Se cuentan solo las visitas al sitio real, no a tu compu ni a los robots de Google.</p>';
    activarTooltips(c);
  }
  window.MA_adminVisitasDias = function (n) { _diasVisitas = n; renderVisitas(); };
  window.MA_adminNoContarme = function (si) {
    if (window.MA_VISITA) window.MA_VISITA.noContarme(si);
    toast(si ? "Listo: tus visitas desde este aparato ya no se cuentan." : "Tus visitas desde este aparato se vuelven a contar.", "ok");
  };

  // ── Integración con adminTab() de scripts.js ───────────────────
  var EXTRA = { errores: renderErrores, cupones: renderCupones, correos: renderCorreos, visitas: renderVisitas };
  if (typeof window.adminTab === "function") {
    var original = window.adminTab;
    window.adminTab = function (tab) {
      Object.keys(EXTRA).forEach(function (t) { var el = document.getElementById("admin-tab-" + t); if (el) el.style.display = t === tab ? "block" : "none"; });
      original.apply(this, arguments);
      if (EXTRA[tab]) EXTRA[tab]();
    };
  }
})();
