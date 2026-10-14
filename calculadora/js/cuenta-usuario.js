/* =================================================================
   Matemáticas Activas — Cuenta de usuario en la Calculadora
   - Usa el MISMO proyecto de Supabase que la página principal.
   - Si el usuario ya inició sesión en la página principal (mismo sitio),
     la calculadora lo reconoce sola.
   - También permite crear una cuenta solo para la calculadora
     (queda marcada con origen = "calculadora" en los datos del usuario).
   ================================================================= */
(function () {
  "use strict";

  var SUPABASE_URL = "https://yidrpuizgtqpswefwdaa.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHJwdWl6Z3RxcHN3ZWZ3ZGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzk4MTcsImV4cCI6MjA5NDYxNTgxN30.kRuZoCIkvXhDNdlfumkWY7JK2qsU1nObr6eegBboFds";

  var sb = null;
  var $ = function (id) { return document.getElementById(id); };

  // Usa el MISMO cliente que js/cuenta.js (la conexión de la calculadora protegida),
  // así hay una sola sesión y la calculadora se entera al instante de que el usuario ingresó.
  function iniciarCliente() {
    if (sb) return sb;
    if (window.MA_CALC && typeof window.MA_CALC.cliente === "function") {
      sb = window.MA_CALC.cliente();
      if (sb) return sb;
    }
    if (typeof supabase === "undefined" || !supabase.createClient) return null;
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return sb;
  }

  // Avisa a la calculadora que cambió la sesión (actualiza el plan: gratis / completo)
  function avisarCalculadora() {
    try { if (window.MA_CALC && window.MA_CALC.refrescar) window.MA_CALC.refrescar(); } catch (e) {}
  }

  // Espera a que llegue el SDK de Supabase (se carga con defer)
  function esperarSdk(intentos) {
    return new Promise(function (ok) {
      (function probar(n) {
        if (window.supabase && window.supabase.createClient) return ok(true);
        if (n <= 0) return ok(false);
        setTimeout(function () { probar(n - 1); }, 100);
      })(intentos);
    });
  }

  function mensaje(texto, tipo) {
    var m = $("cuentaMensaje");
    m.textContent = texto || "";
    m.className = "cuenta-mensaje" + (tipo ? " " + tipo : "");
  }

  function mostrarVista(nombre) {
    ["cuentaVistaIngresar", "cuentaVistaCrear", "cuentaVistaRecuperar", "cuentaVistaPerfil"].forEach(function (id) {
      $(id).hidden = (id !== nombre);
    });
    var pestanas = $("cuentaPestanas");
    pestanas.hidden = (nombre === "cuentaVistaPerfil" || nombre === "cuentaVistaRecuperar");
    pestanas.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-selected", b.dataset.vista === nombre ? "true" : "false");
    });
    mensaje("");
  }

  function traducirError(error) {
    var t = (error && error.message) || "";
    if (/Invalid login credentials/i.test(t)) return "El correo o la contraseña no son correctos.";
    if (/Email not confirmed/i.test(t)) return "Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.";
    if (/already registered|already been registered/i.test(t)) return "Ya existe una cuenta con ese correo. Usá “Ingresar”.";
    if (/Password should be at least/i.test(t)) return "La contraseña tiene que tener al menos 6 caracteres.";
    if (/rate limit/i.test(t)) return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
    if (/Failed to fetch|NetworkError/i.test(t)) return "No hay conexión con el servidor. Revisá tu internet.";
    return t || "Ocurrió un error. Probá de nuevo.";
  }

  async function nombreYPlan(user) {
    var nombre = (user.user_metadata && (user.user_metadata.nombre_completo || user.user_metadata.username)) || user.email;
    var plan = "gratis";
    try {
      var p = await sb.from("perfiles").select("username").eq("id", user.id).single();
      if (p.data && p.data.username) nombre = p.data.username;
    } catch (e) {}
    try {
      var r = await sb.rpc("plan_vigente", { usuario_id: user.id });
      if (!r.error && r.data) plan = r.data;
    } catch (e) {}
    return { nombre: nombre, plan: plan };
  }

  async function actualizarBarra(session) {
    var etiqueta = $("botonCuentaTexto");
    if (!session || !session.user) {
      etiqueta.textContent = "Ingresar";
      $("botonCuenta").classList.remove("conectado");
      return;
    }
    var info = await nombreYPlan(session.user);
    etiqueta.textContent = info.nombre;
    $("botonCuenta").classList.add("conectado");
    $("perfilNombre").textContent = info.nombre;
    $("perfilCorreo").textContent = session.user.email;
    $("perfilPlan").textContent = info.plan === "gratis" ? "Plan gratis" : "Plan " + info.plan;
    var origen = session.user.user_metadata && session.user.user_metadata.origen;
    $("perfilOrigen").textContent = origen === "calculadora"
      ? "Cuenta creada desde la calculadora. También sirve para entrar en la página principal."
      : "Cuenta de Matemáticas Activas (la misma de la página principal).";
  }

  async function abrir() {
    var dlg = $("dlgCuenta");
    if (!iniciarCliente()) {
      mostrarVista("cuentaVistaIngresar");
      mensaje("No se pudo cargar el sistema de cuentas. Revisá tu conexión a internet.", "error");
    } else {
      var s = (await sb.auth.getSession()).data.session;
      mostrarVista(s ? "cuentaVistaPerfil" : "cuentaVistaIngresar");
    }
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  }

  function cerrar() {
    var dlg = $("dlgCuenta");
    if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
  }

  async function ingresar(ev) {
    ev.preventDefault();
    if (!iniciarCliente()) return mensaje("No hay conexión con el servidor.", "error");
    var email = $("ingEmail").value.trim(), pass = $("ingPass").value;
    if (!email || !pass) return mensaje("Completá el correo y la contraseña.", "error");
    mensaje("Ingresando…");
    var r = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (r.error) return mensaje(traducirError(r.error), "error");
    try {
      await sb.from("perfiles").update({ ultimo_login: new Date().toISOString() }).eq("id", r.data.user.id);
      await sb.rpc("registrar_visita_diaria");
    } catch (e) {}
    $("ingPass").value = "";
    avisarCalculadora();
    mostrarVista("cuentaVistaPerfil");
    mensaje("¡Listo! Ya ingresaste.", "ok");
  }

  async function crear(ev) {
    ev.preventDefault();
    if (!iniciarCliente()) return mensaje("No hay conexión con el servidor.", "error");
    var nombre = $("creNombre").value.trim(), email = $("creEmail").value.trim(), pass = $("crePass").value;
    if (!nombre || !email || !pass) return mensaje("Completá todos los campos.", "error");
    if (pass.length < 6) return mensaje("La contraseña tiene que tener al menos 6 caracteres.", "error");
    mensaje("Creando tu cuenta…");
    var destino = /^https?:/.test(location.protocol) ? new URL("../index.html", location.href).href : undefined;  // la página principal procesa el enlace del correo
    var r = await sb.auth.signUp({
      email: email, password: pass,
      options: {
        data: (function () {
          var d = { username: nombre, nombre_completo: nombre, origen: "calculadora" };
          try {   // código de quien lo invitó (link matematicasactivas.com/?ref=CODIGO)
            var r = JSON.parse(localStorage.getItem("ma-ref") || "null");
            if (r && r.c && Date.now() - r.t < 30 * 86400000) d.ref = r.c;
          } catch (e) {}
          return d;
        })(),
        emailRedirectTo: destino
      }
    });
    if (r.error) return mensaje(traducirError(r.error), "error");
    if (r.data.session) {
      avisarCalculadora();
      mostrarVista("cuentaVistaPerfil");
      mensaje("¡Cuenta creada! Ya podés usar la calculadora con tu cuenta.", "ok");
    } else {
      mostrarVista("cuentaVistaIngresar");
      $("ingEmail").value = email;
      mensaje("Te mandamos un correo para confirmar la cuenta. Después ingresá desde acá.", "ok");
    }
  }

  async function recuperar(ev) {
    ev.preventDefault();
    if (!iniciarCliente()) return mensaje("No hay conexión con el servidor.", "error");
    var email = $("recEmail").value.trim();
    if (!email) return mensaje("Escribí tu correo.", "error");
    var destino = /^https?:/.test(location.protocol) ? new URL("../index.html", location.href).href : undefined;
    var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: destino });
    if (r.error) return mensaje(traducirError(r.error), "error");
    mensaje("Si el correo está registrado, te llega un enlace para cambiar la contraseña.", "ok");
  }

  async function salir() {
    if (!iniciarCliente()) return;
    await sb.auth.signOut();
    avisarCalculadora();
    mostrarVista("cuentaVistaIngresar");
    mensaje("Cerraste sesión.", "ok");
  }

  function conectar() {
    $("botonCuenta").addEventListener("click", abrir);
    $("cerrarCuenta").addEventListener("click", cerrar);
    $("dlgCuenta").addEventListener("click", function (e) { if (e.target === this) cerrar(); });
    $("cuentaPestanas").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-vista]");
      if (b) mostrarVista(b.dataset.vista);
    });
    $("formIngresar").addEventListener("submit", ingresar);
    $("formCrear").addEventListener("submit", crear);
    $("formRecuperar").addEventListener("submit", recuperar);
    $("linkOlvide").addEventListener("click", function () { mostrarVista("cuentaVistaRecuperar"); });
    $("linkVolverIngresar").addEventListener("click", function () { mostrarVista("cuentaVistaIngresar"); });
    $("botonSalirCuenta").addEventListener("click", salir);

    // El botón del cuadro "Versión completa" que decía "Iniciar sesión en Matemáticas Activas"
    // ahora abre este mismo diálogo en lugar de mandar a la página principal.
    var botonPlan = $("planSuscribir");
    if (botonPlan) botonPlan.addEventListener("click", function (e) {
      if (/Iniciar sesi/i.test(botonPlan.textContent)) {
        e.preventDefault();
        var dlgPlan = $("dlgPlan");
        if (dlgPlan && dlgPlan.open && dlgPlan.close) dlgPlan.close();
        abrir();
      }
    });

    instalarRegistroCurso();

    esperarSdk(50).then(function () {
      if (!iniciarCliente()) return;
      sb.auth.onAuthStateChange(function (_evento, session) { actualizarBarra(session); });
      sb.auth.getSession().then(function (r) { actualizarBarra(r.data.session); });
    });
  }

  /* ---------- Panel "Mi curso": cada ejercicio resuelto se envía al curso del alumno ----------
     La calculadora ya envía las respuestas "comprobadas" (plan completo). Esto suma los ejercicios
     resueltos por cualquier alumno, también con la versión gratis, para que el docente vea la actividad. */
  var ultimosEnviados = {};
  function cursoDelAlumno() {
    var q = new URLSearchParams(location.search), al = {};
    try { al = JSON.parse(localStorage.getItem("mpp-alumno") || "{}") || {}; } catch (e) {}
    return {
      curso: String(q.get("curso") || al.curso || "").trim().toUpperCase(),
      nombre: q.get("nombre") || al.nombre || null,
      codigo: q.get("alumno") || al.codigo || null
    };
  }
  function enviarResuelto(r, opciones) {
    var cfg = (window.DATOS_PLATAFORMA || {}).nube || {};
    if (!cfg.url || !cfg.clave || !r) return;
    var al = cursoDelAlumno();
    if (!al.curso) return;
    var areaActual = null, entrada = "", nombreTema = null;
    try { areaActual = area; } catch (e) {}
    try { entrada = String(ultimaEntrada || ""); } catch (e) {}
    try { nombreTema = (temasArea()[r.tema]) || r.tema || null; } catch (e) { nombreTema = r.tema || null; }
    var clave = areaActual + "|" + entrada;
    if (ultimosEnviados[clave] && Date.now() - ultimosEnviados[clave] < 120000) return;  // evita repetir el mismo ejercicio
    ultimosEnviados[clave] = Date.now();
    fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/progreso", {
      method: "POST",
      headers: { apikey: cfg.clave, Authorization: "Bearer " + cfg.clave, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify([{
        curso_id: al.curso, alumno_codigo: al.codigo, alumno_nombre: al.nombre ? String(al.nombre).slice(0, 60) : null,
        area: areaActual, tema: r.tema ? String(r.tema).slice(0, 40) : null,
        nombre_tema: nombreTema ? String(nombreTema).slice(0, 120) : null,
        ejercicio: entrada.slice(0, 300), correcto: null, practica: !!(opciones && opciones.practica), tipo: "resuelto"
      }])
    }).catch(function () {});
  }
  function instalarRegistroCurso() {
    var original = window.mostrarResolucion;
    if (typeof original !== "function") return;
    window.mostrarResolucion = function (r, opciones) {
      var salida = original.apply(this, arguments);
      try { enviarResuelto(r, opciones); } catch (e) {}
      return salida;
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", conectar);
  else conectar();
})();

/* Altura real de la barra superior (en celular ocupa dos filas) para que la fila de áreas quede pegada debajo */
(function () {
  function medir() {
    var barra = document.querySelector(".topbar");
    if (!barra) return;
    var alto = Math.round(barra.getBoundingClientRect().height);
    if (alto > 0) document.documentElement.style.setProperty("--alto-barra", alto + "px");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", medir); else medir();
  window.addEventListener("resize", medir);
  window.addEventListener("load", medir);
  try { new ResizeObserver(medir).observe(document.querySelector(".topbar")); } catch (e) {}
})();
