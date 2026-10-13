/* Calculadora Inteligente · conexión con la cuenta de Matemáticas Activas
 *
 * - Comparte la sesión del sitio (mismo dominio, mismo almacenamiento de Supabase).
 * - Plan GRATIS: los ejercicios de álgebra, geometría, trigonometría, cálculo y estadística se resuelven en el
 *   servidor (función resolver-calculadora). El navegador nunca descarga esos motores. Límite: 3 por día.
 * - Plan COMPLETO (Premium o calculadora por 7 días): el servidor entrega los motores (función entregar-motores)
 *   y se resuelve en el dispositivo, sin límite.
 * - La aritmética es pública y gratis: se resuelve siempre en el dispositivo.
 */
(function () {
  "use strict";
  const URL_API = "https://yidrpuizgtqpswefwdaa.supabase.co";
  const CLAVE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHJwdWl6Z3RxcHN3ZWZ3ZGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzk4MTcsImV4cCI6MjA5NDYxNTgxN30.kRuZoCIkvXhDNdlfumkWY7JK2qsU1nObr6eegBboFds";
  const SERVIDOR = ["alg", "geo", "trig", "calc", "integ", "est"];
  const SITIO = "../";

  const M = { estado: null, listo: false, cargados: {}, enCurso: {}, blobs: [], trab: null };
  window.MA_PLENO = false;
  window.MA_USADOS = 0;

  let cliente = null;
  function sb() {
    if (cliente) return cliente;
    if (window.supabase && window.supabase.createClient) {
      cliente = window.supabase.createClient(URL_API, CLAVE, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });
    }
    return cliente;
  }

  async function token() {
    const c = sb();
    if (!c) return null;
    try {
      const { data } = await c.auth.getSession();
      return data && data.session ? data.session.access_token : null;
    } catch { return null; }
  }

  function aplicarEstado(est) {
    M.estado = est || { acceso: "sin_sesion" };
    window.MA_PLENO = M.estado.acceso === "pleno";
    window.MA_USADOS = M.estado.usados || 0;
    if (typeof pintarPlan === "function") try { pintarPlan(); } catch { /* aún no cargó */ }
  }

  async function refrescar() {
    const c = sb();
    if (!c || !(await token())) { aplicarEstado({ acceso: "sin_sesion" }); return M.estado; }
    try {
      const { data, error } = await c.rpc("calculadora_estado");
      aplicarEstado(error ? { acceso: "sin_sesion" } : data);
    } catch { aplicarEstado({ acceso: "sin_sesion" }); }
    return M.estado;
  }

  M.lista = (async () => {
    // El cliente de Supabase llega por un <script> con defer; esperamos a que esté.
    for (let i = 0; i < 50 && !(window.supabase && window.supabase.createClient); i++) await new Promise(r => setTimeout(r, 100));
    await refrescar();
    M.listo = true;
  })();

  async function llamar(funcion, cuerpo) {
    const t = await token();
    if (!t) {
      const e = new Error("Iniciá sesión en Matemáticas Activas para usar esta área (3 ejercicios gratis por día).");
      e.codigo = "sin_sesion";
      if (typeof abrirPlan === "function") abrirPlan(e.message);
      throw e;
    }
    let r, j;
    try {
      r = await fetch(URL_API + "/functions/v1/" + funcion, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + t, apikey: CLAVE },
        body: JSON.stringify(cuerpo),
      });
      j = await r.json();
    } catch {
      throw new Error("No pude conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
    }
    if (!r.ok || j.ok === false) {
      const e = new Error(j.error || "Error del servidor");
      e.codigo = j.codigo || "http_" + r.status;
      if (j.estado) aplicarEstado(j.estado);
      if ((e.codigo === "limite" || e.codigo === "sin_sesion") && typeof abrirPlan === "function") abrirPlan(e.message);
      throw e;
    }
    return j;
  }

  function inyectar(codigo) {
    const s = document.createElement("script");
    s.textContent = codigo;
    document.head.appendChild(s);
    s.remove();
  }

  function enviarAlTrabajador() {
    if (M.trab && M.blobs.length) { try { M.trab.postMessage({ cargarBlobs: M.blobs }); } catch { /* terminado */ } }
  }

  const API = {
    servidor: SERVIDOR,
    esServidor: a => SERVIDOR.includes(a),
    modoServidor: a => SERVIDOR.includes(a) && !window.MA_PLENO,

    // ¿Está lista el área? (gratis: nada que cargar; completo: motores ya entregados)
    listo: a => M.listo && (!window.MA_PLENO || !!M.cargados[a]),

    preparar(a) {
      if (M.enCurso[a]) return M.enCurso[a];   // evita pedir dos veces el mismo motor
      M.enCurso[a] = (async () => {
        await M.lista;
        if (!window.MA_PLENO || M.cargados[a]) return;
        const j = await llamar("entregar-motores", { area: a });
        for (const f of j.archivos) {
          if (M.cargados[f.k]) continue;
          inyectar(f.codigo);
          try { M.blobs.push({ k: f.k, url: URL.createObjectURL(new Blob([f.codigo], { type: "text/javascript" })) }); } catch { /* sin trabajador: se resuelve en la página */ }
          M.cargados[f.k] = true;
        }
        enviarAlTrabajador();
      })().finally(() => { delete M.enCurso[a]; });
      return M.enCurso[a];
    },

    // Resolución en el servidor (plan gratis)
    async resolver(area, texto, tema, metodo) {
      await M.lista;
      const j = await llamar("resolver-calculadora", { area, texto, tema: tema || null, metodo });
      if (j.estado) aplicarEstado(j.estado);
      return j.r;
    },

    alTrabajador(w) { M.trab = w; enviarAlTrabajador(); },

    // Funciones que necesitan el motor completo en el dispositivo (graficador, comprobar respuesta)
    soloPleno(nombre) {
      if (window.MA_PLENO) return true;
      if (typeof abrirPlan === "function") abrirPlan("Para usar " + nombre + " necesitás la calculadora completa (Premium o la calculadora por 7 días).");
      return false;
    },

    // Ajustes del cuadro de planes: sin códigos de activación; el botón lleva al sitio
    alAbrirPlan() {
      const cod = document.getElementById("planCodigo");
      if (cod) {
        const fila = cod.closest(".fila");
        if (fila) fila.hidden = true;
        const et = document.querySelector('label[for="planCodigo"]');
        if (et) et.hidden = true;
      }
      const b = document.getElementById("planSuscribir");
      if (b) {
        const sinSesion = !M.estado || M.estado.acceso === "sin_sesion";
        b.hidden = false;
        b.textContent = sinSesion ? "Iniciar sesión en Matemáticas Activas" : "Ver planes y precios";
        b.href = sinSesion ? SITIO : SITIO + "#suscripcion";
        b.removeAttribute("target");
      }
    },

    refrescar,
    estado: () => M.estado,
  };
  window.MA_CALC = API;

  // Si el usuario inicia sesión o compra en otra pestaña, al volver se actualiza el estado.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refrescar(); });
})();
