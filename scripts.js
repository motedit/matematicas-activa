// ================================================================
//  MATEMÁTICAS ACTIVA — scripts.js (v2 con Supabase backend)
//  Auth + DB + Storage server-side. Sin contraseñas en el cliente.
// ================================================================

// ----------------------------------------------------------------
//  ⚙️  CONFIGURACIÓN
// ----------------------------------------------------------------
const PRECIO_SUSCRIPCION = "$ 10.000";
const MONEDA             = "ARS / mes";
const DURACION_DIAS      = 30;
const LINK_MERCADOPAGO   = "https://mpago.la/29qTXgw";
const LINK_NARANJAX      = "https://mpago.la/29qTXgw";
window.PRECIO_SUSCRIPCION = PRECIO_SUSCRIPCION;

const SEG = {
    SESION_TIMEOUT_MIN : 30,   // Supabase ya maneja JWT; este es el timeout adicional por inactividad
    PASS_MIN_LENGTH    : 6,
};

const MAX_ARCHIVOS_GRATIS = 3;
const MAX_FILE_SIZE       = 50 * 1024 * 1024; // 50 MB (límite del free tier de Supabase Storage)
const MATERIAS = {
    general:"General", algebra:"Álgebra", aritmetica:"Aritmética",
    geometria:"Geometría", estadistica:"Estadística", trigonometria:"Trigonometría",
    calculo:"Cálculo", razonamiento:"Razonamiento Mat.", juegos:"Juegos Matemáticos"
};

// Cache local (se refresca después de cada operación que cambia datos)
let appState = {
    perfilActual: null,    // perfil del usuario logueado (o null)
    archivos:     [],      // lista de archivos cacheada
    perfiles:     [],      // (solo admin) lista de usuarios
};

// Alias rápidos al SDK helper
const MA = () => window.MA_SUPABASE;

// ----------------------------------------------------------------
//  🧹 SANITIZACIÓN
// ----------------------------------------------------------------
function sanitizar(str) {
    return String(str)
        .replace(/[<>"'`]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .trim()
        .substring(0, 200);
}
function validarUsuario(nombre) {
    return /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]{3,40}$/.test(nombre);
}
function validarEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function esc(s) {
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ----------------------------------------------------------------
//  🔔 TOAST
// ----------------------------------------------------------------
function mostrarToast(msg, tipo = "info") {
    let t = document.getElementById("ma-toast");
    if (!t) {
        t = document.createElement("div");
        t.id = "ma-toast";
        t.style.cssText = `
            position:fixed;bottom:24px;right:24px;z-index:9999;
            padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;
            max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,.25);
            transition:opacity .3s,transform .3s;opacity:0;transform:translateY(12px);
            font-family:'Inter',sans-serif;
        `;
        document.body.appendChild(t);
    }
    const colores = {
        info  : "background:#1e293b;color:white;",
        ok    : "background:#16a34a;color:white;",
        warn  : "background:#f59e0b;color:#1a1a1a;",
        error : "background:#dc2626;color:white;",
    };
    t.style.cssText += colores[tipo] || colores.info;
    t.textContent = msg;
    t.style.opacity = "1"; t.style.transform = "translateY(0)";
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity="0"; t.style.transform="translateY(12px)"; }, 4000);
}

// ----------------------------------------------------------------
//  ⏱️ TIMEOUT DE INACTIVIDAD (capa adicional al JWT de Supabase)
// ----------------------------------------------------------------
let _sesionTimer = null, _warnTimer = null, _warnInterval = null;

function ocultarWarning() {
    clearInterval(_warnInterval); _warnInterval = null;
    const w = document.getElementById('ma-timeout-modal');
    if (w) w.style.display = 'none';
}

function mostrarWarningTimeout() {
    let modal = document.getElementById('ma-timeout-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ma-timeout-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px';
        modal.innerHTML = `
            <div style="background:white;border-radius:16px;padding:32px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)">
                <div style="font-size:48px;margin-bottom:12px">⏱️</div>
                <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 8px">¿Seguís ahí?</h3>
                <p style="font-size:14px;color:#64748b;margin:0 0 16px">Tu sesión se cerrará en <strong id="ma-countdown" style="color:#dc2626;font-size:20px">15</strong> segundos por inactividad.</p>
                <button type="button" onclick="resetSesionTimer()" style="width:100%;padding:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">✅ Seguir navegando</button>
                <button type="button" onclick="cerrarSesion()" style="width:100%;padding:10px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;margin-top:8px">Cerrar sesión ahora</button>
            </div>`;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    let count = 15;
    clearInterval(_warnInterval);
    _warnInterval = setInterval(() => {
        count--;
        const el = document.getElementById('ma-countdown');
        if (el) el.textContent = count;
        if (count <= 0) clearInterval(_warnInterval);
    }, 1000);
}

function resetSesionTimer() {
    if (!appState.perfilActual) return;
    ocultarWarning();
    clearTimeout(_sesionTimer); clearTimeout(_warnTimer);
    const totalMs = SEG.SESION_TIMEOUT_MIN * 60 * 1000;
    const warnMs = totalMs - 15000;
    _warnTimer  = setTimeout(mostrarWarningTimeout, warnMs);
    _sesionTimer = setTimeout(async () => {
        if (appState.perfilActual) {
            await cerrarSesion();
            mostrarToast(`⏱️ Sesión cerrada por inactividad`, "warn");
        }
    }, totalMs);
}

function iniciarMonitoreoSesion() {
    ["click", "keydown", "scroll", "mousemove", "touchstart"].forEach(ev =>
        document.addEventListener(ev, () => { if (appState.perfilActual) resetSesionTimer(); }, { passive: true })
    );
}

// ----------------------------------------------------------------
//  🔍 BÚSQUEDA (lista rápida en el index)
// ----------------------------------------------------------------
function buscarContenido() {
    const input = sanitizar(document.getElementById("buscador").value).toLowerCase();
    const cont = document.getElementById("lista-contenidos");
    if (!cont) return;
    const enlaces = cont.getElementsByTagName("a");
    for (let i = 0; i < enlaces.length; i++) {
        const visible = enlaces[i].innerText.toLowerCase().includes(input);
        const target = enlaces[i].parentElement?.tagName === "LI" ? enlaces[i].parentElement : enlaces[i];
        target.style.display = visible ? "" : "none";
    }
}

// ----------------------------------------------------------------
//  🎯 EJERCICIOS (solo si existe el contenedor)
// ----------------------------------------------------------------
function inicializarEjercicios() {
    const ejerciciosSection = document.getElementById("ejercicios");
    if (!ejerciciosSection) return;

    let ejercicios = [
        { titulo: "Ejercicio 1", descripcion: "2 + 3 =",  solucion: "5"  },
        { titulo: "Ejercicio 2", descripcion: "8 - 4 =",  solucion: "4"  },
        { titulo: "Ejercicio 3", descripcion: "5 × 3 =",  solucion: "15" },
        { titulo: "Ejercicio 4", descripcion: "12 ÷ 4 =", solucion: "3"  }
    ];

    const botonAleatorio = document.createElement("button");
    botonAleatorio.type = "button";
    botonAleatorio.textContent = "Generar Ejercicio Aleatorio";
    botonAleatorio.classList.add("boton-solucion");
    botonAleatorio.addEventListener("click", () => { ejercicios.push(generarEjercicioAleatorio()); mostrarEjercicios(); });

    function mostrarEjercicios() {
        ejerciciosSection.innerHTML = "";
        ejercicios.forEach((ej, index) => {
            const div = document.createElement("div");
            div.classList.add("ejercicio");
            div.innerHTML = `<h3>${esc(ej.titulo)}</h3><p>${esc(ej.descripcion)}</p>
                <label for="respuesta-${index}" class="sr-only">Respuesta del ${esc(ej.titulo)}</label>
                <input type="text" id="respuesta-${index}" placeholder="Tu respuesta" autocomplete="off">
                <button type="button" class="boton-verificar" data-index="${index}">Verificar</button>
                <p class="resultado" id="resultado-${index}" role="status" aria-live="polite"></p>`;
            ejerciciosSection.appendChild(div);
        });
        document.querySelectorAll(".boton-verificar").forEach(btn => {
            btn.addEventListener("click", function () {
                const i = this.getAttribute("data-index");
                const res = document.getElementById(`resultado-${i}`);
                const val = sanitizar(document.getElementById(`respuesta-${i}`).value);
                if (val === ejercicios[i].solucion) {
                    res.textContent = "✅ ¡Correcto!"; res.style.color = "#16a34a";
                } else {
                    res.textContent = "❌ Incorrecto. Intenta de nuevo."; res.style.color = "#dc2626";
                }
            });
        });
        ejerciciosSection.appendChild(botonAleatorio);
    }
    function generarEjercicioAleatorio() {
        const n1 = Math.floor(Math.random()*10)+1, n2 = Math.floor(Math.random()*10)+1;
        const ops = ["+","-","×","÷"], op = ops[Math.floor(Math.random()*4)];
        let res;
        switch (op) { case "+": res = n1+n2; break; case "-": res = n1-n2; break; case "×": res = n1*n2; break; case "÷": res = (n1/n2).toFixed(2); break; }
        return { titulo: "Ejercicio Aleatorio", descripcion: `${n1} ${op} ${n2} =`, solucion: res.toString() };
    }
    mostrarEjercicios();
}

// ----------------------------------------------------------------
//  💎 PREMIUM helpers
// ----------------------------------------------------------------
function esPremiumActivo(perfil) {
    if (!perfil?.premium_hasta) return false;
    return new Date(perfil.premium_hasta).getTime() > Date.now();
}
function diasRestantes(perfil) {
    if (!perfil?.premium_hasta) return 0;
    const ms = new Date(perfil.premium_hasta).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / (1000*60*60*24)) : 0;
}
function formatearFecha(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" });
}
function formatearTamano(b) {
    if (!b) return "";
    if (b < 1024) return b + " B";
    if (b < 1024**2) return (b/1024).toFixed(1) + " KB";
    if (b < 1024**3) return (b/1024**2).toFixed(1) + " MB";
    return (b/1024**3).toFixed(2) + " GB";
}

// ----------------------------------------------------------------
//  🔄 ESTADO: carga/refresco
// ----------------------------------------------------------------
async function refrescarEstado() {
    if (!MA()?.sb) {
        appState.perfilActual = null;
        appState.archivos = [];
        appState.perfiles = [];
        return;
    }
    appState.perfilActual = await MA().sbPerfil();
    appState.archivos     = await MA().sbListarArchivos();
    if (appState.perfilActual?.rol === "admin") {
        appState.perfiles = await MA().sbListarPerfiles();
    } else {
        appState.perfiles = [];
    }
}

async function inicializarSistema() {
    await refrescarEstado();
    actualizarNavbar();
    renderSeccionVideos();
    renderSeccionPDFs();
    renderSeccionPremium();
    if (appState.perfilActual) resetSesionTimer();

    // Escuchar cambios de auth (login/logout/refresh)
    MA()?.sb?.auth.onAuthStateChange(async (event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
            await refrescarEstado();
            actualizarNavbar();
            renderSeccionVideos();
            renderSeccionPDFs();
            renderSeccionPremium();
        }
    });
}

// ----------------------------------------------------------------
//  🧭 NAVBAR
// ----------------------------------------------------------------
function actualizarNavbar() {
    const p = appState.perfilActual;
    const lbl = document.getElementById("nav-cuenta-label");
    const navAdmin = document.getElementById("nav-admin-link");
    const navSalir = document.getElementById("nav-salir-link");
    if (lbl) lbl.textContent = p ? (p.username || "Mi cuenta") : "Ingresar";
    if (navAdmin) navAdmin.style.display = (p?.rol === "admin") ? "inline" : "none";
    if (navSalir) navSalir.style.display = p ? "inline" : "none";
}

// ----------------------------------------------------------------
//  🔐 OVERLAYS / FORMULARIOS
// ----------------------------------------------------------------
function abrirAuth(e) {
    if (e) e.preventDefault();
    if (appState.perfilActual) {
        // Si ya está logueado, mostrar info (o redirigir a perfil)
        mostrarToast(`Ya estás logueado como ${appState.perfilActual.username}`, "info");
        return;
    }
    document.getElementById("overlay-auth").style.display = "flex";
    mostrarForm("auth-selector");
}

function abrirAdmin(e) {
    if (e) e.preventDefault();
    if (appState.perfilActual?.rol !== "admin") {
        mostrarToast("Solo el administrador puede ver este panel", "warn");
        return;
    }
    document.getElementById("overlay-admin").style.display = "flex";
    adminTab("archivos");
}

function cerrarOverlaySiClick(e, id) {
    if (e.target.id === id) document.getElementById(id).style.display = "none";
}

function mostrarForm(id) {
    ["auth-selector", "form-login", "form-registro", "form-admin"].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.style.display = (f === id) ? "block" : "none";
    });
    ["li-error", "re-error", "ad-error", "re-success"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "";
    });
}

function mostrarError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}
function mostrarExito(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}

// ----------------------------------------------------------------
//  👤 REGISTRO
// ----------------------------------------------------------------
async function usuarioRegistro() {
    mostrarError("re-error", "");
    mostrarExito("re-success", "");

    const username = sanitizar(document.getElementById("re-user").value);
    const email    = sanitizar(document.getElementById("re-email").value);
    const pass     = document.getElementById("re-pass").value;
    const pass2    = document.getElementById("re-pass2").value;

    if (!validarUsuario(username)) return mostrarError("re-error", "El usuario debe tener 3-40 caracteres alfanuméricos.");
    if (!validarEmail(email))      return mostrarError("re-error", "Email inválido.");
    if (pass.length < SEG.PASS_MIN_LENGTH) return mostrarError("re-error", `La contraseña debe tener al menos ${SEG.PASS_MIN_LENGTH} caracteres.`);
    if (pass !== pass2)            return mostrarError("re-error", "Las contraseñas no coinciden.");
    if (!MA()?.sb)                 return mostrarError("re-error", "Supabase no está configurado. Avisá al administrador.");

    const { data, error } = await MA().sbRegistro({ email, password: pass, username });
    if (error) return mostrarError("re-error", traducirError(error.message));

    // Según la configuración de Supabase puede pedir confirmación por email
    if (data?.user && !data?.session) {
        mostrarExito("re-success", "✅ Cuenta creada. Revisá tu email para confirmar la dirección antes de iniciar sesión.");
    } else {
        mostrarExito("re-success", "✅ Cuenta creada e iniciada sesión.");
        setTimeout(() => document.getElementById("overlay-auth").style.display = "none", 1500);
    }
    document.getElementById("re-user").value  = "";
    document.getElementById("re-email").value = "";
    document.getElementById("re-pass").value  = "";
    document.getElementById("re-pass2").value = "";
}

// ----------------------------------------------------------------
//  🔑 LOGIN (usuario normal)
// ----------------------------------------------------------------
async function usuarioLogin() {
    mostrarError("li-error", "");
    const email = sanitizar(document.getElementById("li-user").value);
    const pass  = document.getElementById("li-pass").value;

    if (!validarEmail(email)) return mostrarError("li-error", "Ingresá un email válido.");
    if (!pass)                return mostrarError("li-error", "Ingresá tu contraseña.");
    if (!MA()?.sb)            return mostrarError("li-error", "Supabase no está configurado.");

    const { data, error } = await MA().sbLogin({ email, password: pass });
    if (error) return mostrarError("li-error", traducirError(error.message));

    mostrarToast(`¡Hola ${data.user.user_metadata?.username || data.user.email}!`, "ok");
    document.getElementById("overlay-auth").style.display = "none";
    document.getElementById("li-user").value = "";
    document.getElementById("li-pass").value = "";
}

// ----------------------------------------------------------------
//  🔐 LOGIN ADMIN — usa el mismo Supabase Auth + check de rol
// ----------------------------------------------------------------
async function adminLogin() {
    mostrarError("ad-error", "");
    const email = sanitizar(document.getElementById("ad-user").value);
    const pass  = document.getElementById("ad-pass").value;

    if (!validarEmail(email)) return mostrarError("ad-error", "Ingresá el email del administrador.");
    if (!pass)                return mostrarError("ad-error", "Ingresá la contraseña.");
    if (!MA()?.sb)            return mostrarError("ad-error", "Supabase no está configurado.");

    const { error } = await MA().sbLogin({ email, password: pass });
    if (error) return mostrarError("ad-error", traducirError(error.message));

    await refrescarEstado();
    if (appState.perfilActual?.rol !== "admin") {
        await MA().sbLogout();
        return mostrarError("ad-error", "Esta cuenta no tiene permisos de administrador.");
    }
    mostrarToast("👋 Bienvenido administrador", "ok");
    document.getElementById("overlay-auth").style.display = "none";
    document.getElementById("ad-user").value = "";
    document.getElementById("ad-pass").value = "";
}

// ----------------------------------------------------------------
//  🚪 LOGOUT
// ----------------------------------------------------------------
async function cerrarSesion(e) {
    if (e) e.preventDefault();
    clearTimeout(_sesionTimer); clearTimeout(_warnTimer); ocultarWarning();
    if (MA()?.sb) await MA().sbLogout();
    appState.perfilActual = null;
    actualizarNavbar();
    renderSeccionPremium();
    mostrarToast("Sesión cerrada", "info");
}

// ----------------------------------------------------------------
//  🛠️ ADMIN — TABS
// ----------------------------------------------------------------
function adminTab(tab) {
    ["archivos", "usuarios", "subir"].forEach(t => {
        const el = document.getElementById("admin-tab-" + t);
        if (el) el.style.display = (t === tab) ? "block" : "none";
    });
    document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("active"));
    const btn = [...document.querySelectorAll(".admin-tab")].find(b => b.textContent.toLowerCase().includes(tab));
    if (btn) btn.classList.add("active");
    if (tab === "archivos") renderAdminArchivos();
    if (tab === "usuarios") renderAdminUsuarios();
}

// ----------------------------------------------------------------
//  📁 ADMIN — LISTA DE ARCHIVOS
// ----------------------------------------------------------------
async function renderAdminArchivos() {
    const grid = document.getElementById("admin-archivos-grid");
    if (!grid) return;
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b">Cargando...</p>`;
    appState.archivos = await MA().sbListarArchivos();
    const fSec = document.getElementById("filtro-seccion")?.value || "";
    const fMat = document.getElementById("filtro-materia")?.value || "";
    const lista = appState.archivos.filter(a =>
        (!fSec || a.seccion === fSec) && (!fMat || a.materia === fMat)
    );
    if (!lista.length) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:40px">No hay archivos para mostrar.</p>`;
        return;
    }
    grid.innerHTML = lista.map(a => `
        <div class="admin-card">
            <div class="admin-card-mini">${miniPreview(a)}</div>
            <div class="admin-card-body">
                <span class="seccion-tag seccion-${a.seccion}">${etiquetaSeccion(a.seccion)}</span>
                <span class="materia-tag">${esc(MATERIAS[a.materia] || a.materia)}</span>
                <h4>${esc(a.titulo)}</h4>
                ${a.descripcion ? `<p>${esc(a.descripcion)}</p>` : ""}
                <p style="font-size:11px;color:#94a3b8">${formatearFecha(a.creado_en)} · ${formatearTamano(a.tamano_bytes)}</p>
                <div class="admin-card-actions">
                    <button type="button" onclick="verContenido('${a.id}')">👁 Ver</button>
                    <button type="button" onclick="abrirEdicion('${a.id}')">✏ Editar</button>
                    <button type="button" onclick="eliminarArchivo('${a.id}')" class="btn-rojo">🗑 Borrar</button>
                </div>
            </div>
        </div>
    `).join("");
}

function etiquetaSeccion(s) {
    return ({video:"🎬 Video", pdf:"📄 PDF", premium:"⭐ Premium", imagen:"🖼 Imagen", texto:"📝 Texto"})[s] || s;
}

function miniPreview(a) {
    if (a.miniatura) return `<img src="${a.miniatura}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px">`;
    const icono = ({video:"🎬", pdf:"📄", premium:"⭐", imagen:"🖼", texto:"📝"})[a.seccion] || "📦";
    return `<div style="display:flex;align-items:center;justify-content:center;height:120px;background:#f1f5f9;border-radius:8px;font-size:48px">${icono}</div>`;
}

// ----------------------------------------------------------------
//  👥 ADMIN — LISTA DE USUARIOS
// ----------------------------------------------------------------
async function renderAdminUsuarios() {
    const cont = document.getElementById("admin-usuarios-lista");
    if (!cont) return;
    cont.innerHTML = `<p style="text-align:center;color:#64748b">Cargando...</p>`;
    appState.perfiles = await MA().sbListarPerfiles();
    if (!appState.perfiles.length) {
        cont.innerHTML = `<p style="text-align:center;color:#64748b;padding:40px">Aún no hay usuarios registrados.</p>`;
        return;
    }
    cont.innerHTML = appState.perfiles.map(p => {
        const premium = esPremiumActivo(p);
        const dias    = diasRestantes(p);
        return `
        <div class="usuario-card">
            <div class="usuario-info">
                <h4>👤 ${esc(p.username || "(sin username)")} ${p.rol === "admin" ? '<span style="background:#7c3aed;color:white;padding:2px 8px;border-radius:99px;font-size:11px">ADMIN</span>' : ""}</h4>
                <p style="font-size:12px;color:#64748b">Creado: ${formatearFecha(p.creado_en)} · Último login: ${formatearFecha(p.ultimo_login)}</p>
                <p style="font-size:13px">${premium ? `⭐ Premium activo · ${dias} días restantes (hasta ${formatearFecha(p.premium_hasta)})` : "🆓 Plan gratis"}</p>
            </div>
            <div class="usuario-actions">
                ${premium
                    ? `<button type="button" onclick="renovarSuscripcion('${p.id}')">🔁 Renovar +30d</button>
                       <button type="button" onclick="desactivarSuscripcion('${p.id}')" class="btn-rojo">❌ Desactivar</button>`
                    : `<button type="button" onclick="activarSuscripcion('${p.id}')">⭐ Activar Premium</button>`}
                ${p.rol !== "admin" ? `<button type="button" onclick="eliminarUsuario('${p.id}', '${esc(p.username)}')" class="btn-rojo">🗑 Eliminar</button>` : ""}
            </div>
        </div>`;
    }).join("");
}

// ----------------------------------------------------------------
//  ⬆️ ADMIN — SUBIR CONTENIDO
// ----------------------------------------------------------------
function actualizarCampoArchivo() {
    const tipo = document.getElementById("su-tipo").value;
    document.getElementById("su-archivo-wrap").style.display = tipo === "archivo" ? "block" : "none";
    document.getElementById("su-texto-wrap").style.display   = tipo === "texto"   ? "block" : "none";
    document.getElementById("su-url-wrap").style.display     = tipo === "url-video" ? "block" : "none";
}

async function subirContenido() {
    mostrarError("su-error", ""); mostrarExito("su-success", "");
    if (appState.perfilActual?.rol !== "admin") return mostrarError("su-error", "Solo el admin puede subir contenido.");

    const titulo  = sanitizar(document.getElementById("su-titulo").value);
    const materia = document.getElementById("su-materia").value;
    const seccion = document.getElementById("su-seccion").value;
    const tipo    = document.getElementById("su-tipo").value;
    const desc    = sanitizar(document.getElementById("su-desc").value);

    if (!titulo) return mostrarError("su-error", "Ingresá un título.");

    let meta = { titulo, descripcion: desc, materia, seccion, tipo, creado_por: appState.perfilActual.id };

    if (tipo === "texto") {
        const texto = document.getElementById("su-texto").value.trim();
        if (!texto) return mostrarError("su-error", "Ingresá el contenido.");
        meta.contenido_texto = texto;
    } else if (tipo === "url-video") {
        const url = document.getElementById("su-url").value.trim();
        if (!url) return mostrarError("su-error", "Ingresá la URL del video.");
        meta.url_video = url;
    } else if (tipo === "archivo") {
        const file = document.getElementById("su-archivo").files[0];
        if (!file) return mostrarError("su-error", "Seleccioná un archivo.");
        if (file.size > MAX_FILE_SIZE) return mostrarError("su-error", `Archivo muy grande. Máx ${formatearTamano(MAX_FILE_SIZE)}.`);

        document.getElementById("su-progress").style.display = "block";
        const fill = document.getElementById("su-progress-fill");
        if (fill) fill.style.width = "30%";

        // Subir a Storage con nombre único
        const ext  = file.name.split(".").pop().toLowerCase();
        const path = `${materia}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error: errUp } = await MA().sbSubirBlob(path, file, file.type);
        if (errUp) {
            document.getElementById("su-progress").style.display = "none";
            return mostrarError("su-error", "Error al subir: " + errUp.message);
        }
        if (fill) fill.style.width = "70%";

        meta.storage_path  = path;
        meta.nombre_archivo = file.name;
        meta.mime_type     = file.type;
        meta.tamano_bytes  = file.size;

        // Miniatura para imágenes
        if (file.type.startsWith("image/")) {
            meta.miniatura = await generarMiniaturaDesdeBlob(file);
        }
    }

    const { error } = await MA().sbCrearArchivo(meta);
    document.getElementById("su-progress").style.display = "none";
    if (error) return mostrarError("su-error", "Error al guardar: " + error.message);

    mostrarExito("su-success", "✅ Contenido publicado correctamente.");
    document.getElementById("su-titulo").value = "";
    document.getElementById("su-desc").value   = "";
    document.getElementById("su-texto").value  = "";
    document.getElementById("su-url").value    = "";
    document.getElementById("su-archivo").value = "";
    setTimeout(() => mostrarExito("su-success", ""), 3000);
    renderAdminArchivos();
    renderSeccionVideos(); renderSeccionPDFs(); renderSeccionPremium();
}

function generarMiniaturaDesdeBlob(blob, maxW = 340) {
    return new Promise(resolve => {
        const img = new Image(), url = URL.createObjectURL(blob);
        img.onload = () => {
            const r = Math.min(maxW / img.width, 1);
            const c = document.createElement("canvas");
            c.width  = Math.round(img.width * r);
            c.height = Math.round(img.height * r);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

// ----------------------------------------------------------------
//  ✏️ EDITAR archivo
// ----------------------------------------------------------------
function abrirEdicion(id) {
    const a = appState.archivos.find(x => x.id === id);
    if (!a) return;
    document.getElementById("ed-id").value      = a.id;
    document.getElementById("ed-titulo").value  = a.titulo || "";
    document.getElementById("ed-desc").value    = a.descripcion || "";
    document.getElementById("ed-materia").value = a.materia || "general";
    document.getElementById("ed-seccion").value = a.seccion || "video";
    const wrapT = document.getElementById("ed-texto-wrap");
    if (a.tipo === "texto") { wrapT.style.display = "block"; document.getElementById("ed-texto").value = a.contenido_texto || ""; }
    else { wrapT.style.display = "none"; }
    document.getElementById("modal-editar").style.display = "flex";
}

async function guardarEdicion() {
    const id     = document.getElementById("ed-id").value;
    const titulo = sanitizar(document.getElementById("ed-titulo").value);
    const desc   = sanitizar(document.getElementById("ed-desc").value);
    const materia = document.getElementById("ed-materia").value;
    const seccion = document.getElementById("ed-seccion").value;
    const cambios = { titulo, descripcion: desc, materia, seccion };
    const a = appState.archivos.find(x => x.id === id);
    if (a?.tipo === "texto") cambios.contenido_texto = document.getElementById("ed-texto").value;
    const { error } = await MA().sbActualizarArchivo(id, cambios);
    if (error) return mostrarError("ed-error", error.message);
    document.getElementById("modal-editar").style.display = "none";
    mostrarToast("✅ Cambios guardados", "ok");
    renderAdminArchivos(); renderSeccionVideos(); renderSeccionPDFs(); renderSeccionPremium();
}

// ----------------------------------------------------------------
//  🗑 BORRAR archivo / usuario
// ----------------------------------------------------------------
async function eliminarArchivo(id) {
    const a = appState.archivos.find(x => x.id === id);
    if (!a) return;
    if (!confirm(`¿Borrar "${a.titulo}"?`)) return;
    const { error } = await MA().sbBorrarArchivo(id, a.storage_path);
    if (error) return mostrarToast("Error al borrar: " + error.message, "error");
    mostrarToast("🗑 Archivo borrado", "ok");
    renderAdminArchivos(); renderSeccionVideos(); renderSeccionPDFs(); renderSeccionPremium();
}

async function eliminarUsuario(usuarioId, nombre) {
    if (!confirm(`¿Eliminar al usuario "${nombre}"?\n\nNOTA: esto borra su perfil pero la cuenta de Auth queda en Supabase (debés borrarla desde el Dashboard si querés liberar el email).`)) return;
    const { error } = await MA().sb.from("perfiles").delete().eq("id", usuarioId);
    if (error) return mostrarToast("Error: " + error.message, "error");
    mostrarToast("🗑 Perfil eliminado", "ok");
    renderAdminUsuarios();
}

// ----------------------------------------------------------------
//  💎 PREMIUM (acciones admin)
// ----------------------------------------------------------------
async function activarSuscripcion(usuarioId) {
    const { error } = await MA().sbActivarPremium(usuarioId, DURACION_DIAS, "activacion");
    if (error) return mostrarToast("Error: " + (error.message || error), "error");
    mostrarToast(`⭐ Premium activado (+${DURACION_DIAS} días)`, "ok");
    renderAdminUsuarios();
}
async function renovarSuscripcion(usuarioId) {
    const { error } = await MA().sbActivarPremium(usuarioId, DURACION_DIAS, "renovacion");
    if (error) return mostrarToast("Error: " + (error.message || error), "error");
    mostrarToast(`🔁 Premium renovado (+${DURACION_DIAS} días)`, "ok");
    renderAdminUsuarios();
}
async function desactivarSuscripcion(usuarioId) {
    if (!confirm("¿Desactivar el premium de este usuario?")) return;
    const { error } = await MA().sbDesactivarPremium(usuarioId);
    if (error) return mostrarToast("Error: " + (error.message || error), "error");
    mostrarToast("❌ Premium desactivado", "ok");
    renderAdminUsuarios();
}

// ----------------------------------------------------------------
//  👁 VISOR de contenido
// ----------------------------------------------------------------
async function verContenido(id) {
    const a = appState.archivos.find(x => x.id === id);
    if (!a) return;
    document.getElementById("visor-titulo").textContent = a.titulo;
    const body = document.getElementById("visor-cuerpo");
    body.innerHTML = `<p style="text-align:center;color:#64748b;padding:40px">Cargando...</p>`;
    document.getElementById("modal-visor").style.display = "flex";

    if (a.tipo === "texto") {
        body.innerHTML = `<div style="white-space:pre-wrap;line-height:1.6;padding:1rem">${esc(a.contenido_texto || "")}</div>`;
        return;
    }
    if (a.tipo === "url-video") {
        const embed = parseEmbedUrl(a.url_video);
        body.innerHTML = embed
            ? `<div style="position:relative;padding-top:56.25%"><iframe src="${embed}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`
            : `<p style="text-align:center"><a href="${esc(a.url_video)}" target="_blank" rel="noopener">Abrir video</a></p>`;
        return;
    }
    // tipo archivo
    if (!a.storage_path) { body.innerHTML = `<p style="text-align:center;color:#dc2626;padding:40px">Archivo no disponible.</p>`; return; }
    const url = await MA().sbUrlFirmada(a.storage_path, 3600);
    if (!url) { body.innerHTML = `<p style="text-align:center;color:#dc2626;padding:40px">No se pudo obtener el archivo.</p>`; return; }
    const mt = a.mime_type || "";
    if (mt.startsWith("image/"))   body.innerHTML = `<img src="${url}" alt="${esc(a.titulo)}" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px">`;
    else if (mt.startsWith("video/")) body.innerHTML = `<video src="${url}" controls style="width:100%;border-radius:8px"></video>`;
    else if (mt === "application/pdf") body.innerHTML = `<iframe src="${url}" style="width:100%;height:70vh;border:0;border-radius:8px"></iframe>`;
    else body.innerHTML = `<p style="text-align:center;padding:20px"><a href="${url}" download="${esc(a.nombre_archivo || a.titulo)}" class="btn-pago-mp" style="display:inline-block">⬇ Descargar ${esc(a.nombre_archivo || a.titulo)}</a></p>`;
}

function parseEmbedUrl(url) {
    if (!url) return null;
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
    return null;
}

// ----------------------------------------------------------------
//  👁 USUARIO ve archivo (consume cuota gratis o premium)
// ----------------------------------------------------------------
async function usuarioVerArchivo(id) {
    if (!appState.perfilActual) { abrirAuth(); return; }
    const a = appState.archivos.find(x => x.id === id);
    if (!a) return;
    if (a.seccion === "premium") {
        if (esPremiumActivo(appState.perfilActual)) return verContenido(id);
        const vistos = appState.perfilActual.vistos || [];
        if (vistos.includes(id)) return verContenido(id);
        if (vistos.length >= MAX_ARCHIVOS_GRATIS) return abrirModalPago();
        const r = await MA().sbAgregarVisto(id);
        if (r) appState.perfilActual = r;
        return verContenido(id);
    }
    return verContenido(id);
}

function abrirModalPago() {
    document.getElementById("modal-pago").style.display = "flex";
}

// ----------------------------------------------------------------
//  📺 RENDER PÚBLICO: videos, pdfs, premium
// ----------------------------------------------------------------
function tarjetaPublica(a, esPremium) {
    const tipoIcon = ({video:"🎬", pdf:"📄", premium:"⭐", imagen:"🖼", texto:"📝"})[a.seccion] || "📦";
    return `
        <article class="contenido-card" onclick="${esPremium ? `usuarioVerArchivo('${a.id}')` : `verContenido('${a.id}')`}">
            <div class="contenido-thumb">${a.miniatura ? `<img src="${a.miniatura}" alt="">` : `<span style="font-size:64px">${tipoIcon}</span>`}</div>
            <div class="contenido-body">
                <span class="materia-tag">${esc(MATERIAS[a.materia] || a.materia)}</span>
                <h4>${esc(a.titulo)}</h4>
                ${a.descripcion ? `<p>${esc(a.descripcion)}</p>` : ""}
            </div>
        </article>`;
}

function renderSeccionVideos() {
    const g = document.getElementById("videos-grid");
    if (!g) return;
    const videos = appState.archivos.filter(a => a.seccion === "video" || a.tipo === "url-video");
    g.innerHTML = videos.length
        ? videos.map(a => tarjetaPublica(a, false)).join("")
        : `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:32px">Aún no hay videos publicados.</p>`;
}

function renderSeccionPDFs() {
    const g = document.getElementById("pdfs-grid");
    if (!g) return;
    const pdfs = appState.archivos.filter(a => a.seccion === "pdf");
    g.innerHTML = pdfs.length
        ? pdfs.map(a => tarjetaPublica(a, false)).join("")
        : `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:32px">Aún no hay PDFs publicados.</p>`;
}

function renderSeccionPremium() {
    const info = document.getElementById("suscripcion-info");
    const cont = document.getElementById("suscripcion-contenido");
    const cuota = document.getElementById("premium-cuota-info");
    const grid  = document.getElementById("premium-grid");
    if (!info || !cont) return;

    const p = appState.perfilActual;
    if (!p) {
        info.innerHTML = `
            <div class="premium-cta">
                <h3>Accedé al contenido premium</h3>
                <p>Creá una cuenta gratis y desbloqueá los primeros ${MAX_ARCHIVOS_GRATIS} archivos. Por ${PRECIO_SUSCRIPCION} ${MONEDA} accedés a todo sin límites por ${DURACION_DIAS} días.</p>
                <button type="button" class="btn-hero-main" onclick="abrirAuth(event)">Ingresar / Registrarme</button>
            </div>`;
        cont.style.display = "none";
        return;
    }
    if (esPremiumActivo(p)) {
        info.innerHTML = `
            <div class="premium-activo">
                <h3>⭐ Sos premium</h3>
                <p>Te quedan <strong>${diasRestantes(p)} días</strong> (hasta ${formatearFecha(p.premium_hasta)}). Accedés a todo el contenido sin restricciones.</p>
            </div>`;
        if (cuota) cuota.style.display = "none";
    } else {
        const vistos = (p.vistos || []).length;
        const rest   = Math.max(0, MAX_ARCHIVOS_GRATIS - vistos);
        info.innerHTML = `
            <div class="premium-cta">
                <h3>Plan gratis</h3>
                <p>Llevás ${vistos}/${MAX_ARCHIVOS_GRATIS} archivos premium. Te quedan <strong>${rest}</strong>.</p>
                <button type="button" class="btn-hero-main" onclick="abrirModalPago()">⭐ Suscribirme (${PRECIO_SUSCRIPCION} ${MONEDA})</button>
            </div>`;
        if (cuota) cuota.style.display = "block", cuota.innerHTML = `Cuota gratuita: <strong>${vistos}/${MAX_ARCHIVOS_GRATIS}</strong>`;
    }
    cont.style.display = "block";
    const premium = appState.archivos.filter(a => a.seccion === "premium");
    grid.innerHTML = premium.length
        ? premium.map(a => tarjetaPublica(a, true)).join("")
        : `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:32px">Aún no hay contenido premium publicado.</p>`;
}

// ----------------------------------------------------------------
//  🌐 Traducción de errores comunes de Supabase
// ----------------------------------------------------------------
function traducirError(msg) {
    if (!msg) return "Error desconocido.";
    const m = msg.toLowerCase();
    if (m.includes("invalid login"))            return "Email o contraseña incorrectos.";
    if (m.includes("email not confirmed"))      return "Confirmá tu email antes de iniciar sesión (revisá tu casilla).";
    if (m.includes("user already registered"))  return "Ese email ya está registrado.";
    if (m.includes("password should be at least")) return "La contraseña es muy corta.";
    if (m.includes("rate limit"))               return "Demasiados intentos. Esperá unos minutos.";
    if (m.includes("network"))                  return "Error de red. Verificá tu conexión.";
    return msg;
}

// ----------------------------------------------------------------
//  🚀 BOOT
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    inicializarEjercicios();
    iniciarMonitoreoSesion();
    inicializarSistema();
});

// Exponer al scope global (HTML onclick=)
window.buscarContenido = buscarContenido;
window.resetSesionTimer = resetSesionTimer;
window.cerrarSesion = cerrarSesion;
window.abrirAuth = abrirAuth;
window.abrirAdmin = abrirAdmin;
window.mostrarForm = mostrarForm;
window.usuarioLogin = usuarioLogin;
window.usuarioRegistro = usuarioRegistro;
window.adminLogin = adminLogin;
window.adminTab = adminTab;
window.actualizarCampoArchivo = actualizarCampoArchivo;
window.subirContenido = subirContenido;
window.verContenido = verContenido;
window.abrirEdicion = abrirEdicion;
window.guardarEdicion = guardarEdicion;
window.eliminarArchivo = eliminarArchivo;
window.eliminarUsuario = eliminarUsuario;
window.activarSuscripcion = activarSuscripcion;
window.renovarSuscripcion = renovarSuscripcion;
window.desactivarSuscripcion = desactivarSuscripcion;
window.usuarioVerArchivo = usuarioVerArchivo;
window.abrirModalPago = abrirModalPago;
window.cerrarOverlaySiClick = cerrarOverlaySiClick;
