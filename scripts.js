// ================================================================
//  MATEMÁTICAS ACTIVA — scripts.js v3 (Supabase + features)
// ================================================================

const PRECIO_SUSCRIPCION = "$ 10.000";
const MONEDA             = "ARS / mes";
const DURACION_DIAS      = 30;
const LINKS_PAGO = {
    "basico-mp":  "https://mpago.li/2VeUpTC",     // Plan Básico $7.000
    "premium-mp": "https://mpago.li/1dLanPi",     // Plan Premium $12.000
};

const SEG = { SESION_TIMEOUT_MIN: 30, PASS_MIN_LENGTH: 6 };
const MAX_ARCHIVOS_GRATIS  = 3;  // Por semana (7 días), se reinicia cada lunes
const PERIODO_GRATIS_DIAS   = 7;   // días antes de reiniciar la cuota
const MAX_FILE_SIZE       = 2 * 1024 * 1024 * 1024; // 2 GB (requiere Supabase Pro)
const MATERIAS = {
    general:"General", algebra:"Álgebra", aritmetica:"Aritmética",
    geometria:"Geometría", estadistica:"Estadística", trigonometria:"Trigonometría",
    calculo:"Cálculo", razonamiento:"Razonamiento Mat.", juegos:"Juegos Matemáticos"
};

let appState = {
    perfilActual: null,
    archivos: [],         // todos los archivos visibles (públicos + mis personales si soy user; todo si soy admin)
    archivosPublicos: [], // solo públicos
    misArchivos: [],      // solo del usuario logueado
    perfiles: [],
};

const MA = () => window.MA_SUPABASE;

// ============ UTILS ============
function sanitizar(s) {
    return String(s).replace(/[<>"'`]/g, "").replace(/javascript:/gi,"").replace(/on\w+=/gi,"").trim().substring(0,200);
}
function validarUsuario(n) { return /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]{3,40}$/.test(n); }
function validarEmail(e)   { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function formatearFecha(ts){ if(!ts)return"—"; return new Date(ts).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function formatearFechaHora(ts){ if(!ts)return"—"; return new Date(ts).toLocaleString("es-AR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}); }
function formatearTamano(b){ if(!b)return""; if(b<1024)return b+" B"; if(b<1024**2)return(b/1024).toFixed(1)+" KB"; if(b<1024**3)return(b/1024**2).toFixed(1)+" MB"; return(b/1024**3).toFixed(2)+" GB"; }

// ============ TOAST ============
function mostrarToast(msg, tipo = "info") {
    let t = document.getElementById("ma-toast");
    if (!t) {
        t = document.createElement("div"); t.id = "ma-toast";
        t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,.25);transition:opacity .3s,transform .3s;opacity:0;transform:translateY(12px);font-family:'Inter',sans-serif;`;
        document.body.appendChild(t);
    }
    const c = {info:"background:#1e293b;color:white;", ok:"background:#16a34a;color:white;", warn:"background:#f59e0b;color:#1a1a1a;", error:"background:#dc2626;color:white;"};
    t.style.cssText += c[tipo] || c.info;
    t.textContent = msg;
    t.style.opacity = "1"; t.style.transform = "translateY(0)";
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity="0"; t.style.transform="translateY(12px)"; }, 4000);
}

// ============ TIMEOUT INACTIVIDAD ============
let _sesionTimer=null, _warnTimer=null, _warnInterval=null;
function ocultarWarning(){ clearInterval(_warnInterval); _warnInterval=null; const w=document.getElementById('ma-timeout-modal'); if(w) w.style.display='none'; }
function mostrarWarningTimeout(){
    let m = document.getElementById('ma-timeout-modal');
    if(!m){
        m = document.createElement('div'); m.id='ma-timeout-modal';
        m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px';
        m.innerHTML = `<div style="background:white;border-radius:16px;padding:32px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)"><div style="font-size:48px;margin-bottom:12px">⏱️</div><h3 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 8px">¿Seguís ahí?</h3><p style="font-size:14px;color:#64748b;margin:0 0 16px">Tu sesión se cerrará en <strong id="ma-countdown" style="color:#dc2626;font-size:20px">15</strong> segundos.</p><button type="button" onclick="resetSesionTimer()" style="width:100%;padding:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">✅ Seguir</button><button type="button" onclick="cerrarSesion()" style="width:100%;padding:10px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer;margin-top:8px">Cerrar sesión</button></div>`;
        document.body.appendChild(m);
    }
    m.style.display='flex';
    let c=15; clearInterval(_warnInterval);
    _warnInterval = setInterval(()=>{ c--; const el=document.getElementById('ma-countdown'); if(el) el.textContent=c; if(c<=0) clearInterval(_warnInterval); },1000);
}
function resetSesionTimer(){
    if(!appState.perfilActual) return;
    ocultarWarning(); clearTimeout(_sesionTimer); clearTimeout(_warnTimer);
    const t = SEG.SESION_TIMEOUT_MIN*60*1000;
    _warnTimer = setTimeout(mostrarWarningTimeout, t-15000);
    _sesionTimer = setTimeout(async()=>{ if(appState.perfilActual){ await cerrarSesion(); mostrarToast("⏱️ Sesión cerrada por inactividad","warn"); } }, t);
}
function iniciarMonitoreoSesion(){
    ["click","keydown","scroll","mousemove","touchstart"].forEach(ev=>
        document.addEventListener(ev, ()=>{ if(appState.perfilActual) resetSesionTimer(); }, {passive:true})
    );
}

// ============ BÚSQUEDA ============
const MATERIA_RUTA = {
    algebra:"materias/Algebra/Algebra.html", aritmetica:"materias/Aritmetica/Aritmetica.html",
    geometria:"materias/Geometria/Geometria.html", estadistica:"materias/Estadistica/Estadistica.html",
    trigonometria:"materias/Trigonometria/Trigonometria.html", calculo:"materias/Calculo/Calculo.html",
    razonamiento:"materias/Razonamiento/Razonamiento.html", juegos:"materias/Juegos/Juegos.html",
};
let todosLosTemas = [];
async function cargarTodosLosTemas() {
    if (!MA()?.sb) return;
    try { todosLosTemas = await MA().sbListarTemas(); } catch(e) { todosLosTemas = []; }
}
// Debounce para búsqueda
let _busquedaTimer = null;
function buscarContenido(src) {
    clearTimeout(_busquedaTimer);
    _busquedaTimer = setTimeout(() => _ejecutarBusqueda(src), 300);
}

function _ejecutarBusqueda(src) {
    const inpId = src === "nav" ? "buscador-nav" : "buscador";
    const cajaId = src === "nav" ? "buscador-resultados-nav" : "buscador-resultados";
    const inp = document.getElementById(inpId);
    if (!inp) return;
    const input = sanitizar(inp.value).toLowerCase().trim();

    // Filtrar lista rápida de materias (solo buscador principal)
    if (src !== "nav") {
        const cont = document.getElementById("lista-contenidos");
        if (cont) [...cont.getElementsByTagName("a")].forEach(a => {
            const visible = !input || a.innerText.toLowerCase().includes(input);
            const t = a.parentElement?.tagName === "LI" ? a.parentElement : a;
            t.style.display = visible ? "" : "none";
        });
    }
    const caja = document.getElementById(cajaId);
    if (!caja) return;
    if (input.length < 2) { caja.classList.remove("activo"); caja.innerHTML = ""; return; }

    // ── Resultados de TEMAS (tabla temas) ──
    const matchesTemas = todosLosTemas.filter(t =>
        (t.nombre||"").toLowerCase().includes(input) ||
        (t.categoria||"").toLowerCase().includes(input) ||
        (MATERIAS[t.materia]||"").toLowerCase().includes(input)
    ).slice(0, 7);

    // ── Resultados de ARCHIVOS (videos, PDFs, premium) ──
    const matchesArchivos = (appState.archivosPublicos || []).filter(a =>
        (a.titulo||"").toLowerCase().includes(input) ||
        (a.descripcion||"").toLowerCase().includes(input) ||
        (MATERIAS[a.materia]||"").toLowerCase().includes(input)
    ).slice(0, 7);

    if (!matchesTemas.length && !matchesArchivos.length) {
        caja.innerHTML = `<div style="padding:14px 16px;color:#94a3b8;font-size:13px;text-align:center">Sin resultados para "${esc(input)}". Probá con otra palabra.</div>`;
        caja.classList.add("activo");
        return;
    }

    const iconos = {video:"🎬", pdf:"📄", premium:"⭐", imagen:"🖼", texto:"📝"};
    let html = "";

    if (matchesTemas.length) {
        html += `<div style="padding:6px 14px 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Temas</div>`;
        html += matchesTemas.map(t => `
            <a class="buscador-res-item" href="${MATERIA_RUTA[t.materia] || "#"}">
                <span class="buscador-res-mat">${esc(MATERIAS[t.materia] || t.materia)}</span>
                <span style="flex:1;min-width:0">${esc(t.nombre)}</span>
                <span class="buscador-res-nivel">Nivel ${t.nivel}</span>
            </a>`).join("");
    }

    if (matchesArchivos.length) {
        html += `<div style="padding:6px 14px 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;border-top:${matchesTemas.length?'1px solid #f1f5f9':'none'};margin-top:${matchesTemas.length?'4px':'0'}">Contenido</div>`;
        html += matchesArchivos.map(a => `
            <a class="buscador-res-item" href="#" onclick="event.preventDefault();document.querySelector('.buscador-resultados.activo')?.classList.remove('activo');verContenido('${a.id}')">
                <span style="font-size:18px">${iconos[a.seccion]||"📦"}</span>
                <span class="buscador-res-mat">${esc(MATERIAS[a.materia]||a.materia)}</span>
                <span style="flex:1;min-width:0">${esc(a.titulo)}</span>
                <span class="buscador-res-nivel">${esc(a.seccion)}</span>
            </a>`).join("");
    }

    caja.innerHTML = html;
    caja.classList.add("activo");
}
document.addEventListener("click", function(e){
    document.querySelectorAll(".buscador-resultados").forEach(caja => {
        const wrap = caja.closest(".buscador-wrap, .navbar-search");
        if (wrap && !wrap.contains(e.target)) caja.classList.remove("activo");
    });
});

// ============ PLANES helpers (gratis / basico / premium) ============
// Fuente de verdad: perfiles.plan + perfiles.plan_hasta (mismos campos que usa
// el RPC plan_vigente() en la base). premium_hasta queda deprecado — no se lee más acá.
// Nivel real: seguridad reforzada en RLS de "archivos" y Storage (nivel_permite() +
// puede_ver_archivo_storage() en Supabase). Esto de acá es la copia en pantalla.
const NIVEL_RANGO = { gratis: 0, basico: 1, premium: 2 };

function nivelDe(p) {
    if (!p?.plan || p.plan === "gratis") return "gratis";
    if (!p.plan_hasta || new Date(p.plan_hasta).getTime() <= Date.now()) return "gratis";
    return p.plan; // "basico" | "premium"
}
function nivelPermite(nivelUsuario, nivelRequerido) {
    return (NIVEL_RANGO[nivelUsuario] ?? 0) >= (NIVEL_RANGO[nivelRequerido] ?? 0);
}
// "¿tiene algún plan pago activo?" (básico o premium) — se usa para mensajes generales
function esPremiumActivo(p) { return nivelDe(p) !== "gratis"; }

// Verificación server-side del plan
async function verificarPremiumServer() {
    if (!MA()?.sb) return false;
    try {
        const { data: perfil } = await MA().sb
            .from("perfiles")
            .select("plan, plan_hasta")
            .eq("id", (await MA().sbUsuario())?.id)
            .single();
        return nivelDe(perfil) !== "gratis";
    } catch(e) { return false; }
}
function diasRestantes(p) {
    if (nivelDe(p) === "gratis" || !p?.plan_hasta) return 0;
    const ms = new Date(p.plan_hasta).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 86400000) : 0;
}

// ============ ESTADO ============
async function refrescarEstado() {
    if (!MA()?.sb) { appState = { perfilActual:null, archivos:[], archivosPublicos:[], misArchivos:[], perfiles:[] }; return; }
    appState.perfilActual = await MA().sbPerfil();
    appState.archivos     = await MA().sbListarArchivos();
    appState.archivosPublicos = appState.archivos.filter(a => !a.es_personal);
    appState.misArchivos  = appState.perfilActual
        ? appState.archivos.filter(a => a.es_personal && a.creado_por === appState.perfilActual.id)
        : [];
    if (appState.perfilActual?.rol === "admin") appState.perfiles = await MA().sbListarPerfiles();
    else appState.perfiles = [];
}


// ============ CARGA DINÁMICA DE TEMAS ============
async function cargarTemasParaMateria(materiaSelectId, temaSelectId) {
    const matSel = document.getElementById(materiaSelectId);
    const temSel = document.getElementById(temaSelectId);
    if (!matSel || !temSel) return;
    const materia = matSel.value;
    temSel.innerHTML = '<option value="">— Sin tema específico —</option>';
    if (!MA()?.sb) return;
    const temas = await MA().sbListarTemas(materia);
    // Agrupar por categoría
    const porCategoria = {};
    temas.forEach(t => {
        if (!porCategoria[t.categoria]) porCategoria[t.categoria] = [];
        porCategoria[t.categoria].push(t);
    });
    Object.entries(porCategoria).forEach(([cat, lista]) => {
        const og = document.createElement("optgroup");
        og.label = "Nivel " + lista[0].nivel + " — " + cat;
        lista.forEach(t => {
            const op = document.createElement("option");
            op.value = t.id;
            op.textContent = t.nombre;
            og.appendChild(op);
        });
        temSel.appendChild(og);
    });
}
async function initSelectoresTemas() {
    // Admin upload
    const admMat = document.getElementById("su-materia");
    if (admMat) {
        admMat.addEventListener("change", () => cargarTemasParaMateria("su-materia", "su-tema"));
        await cargarTemasParaMateria("su-materia", "su-tema");
    }
    // Mi upload
    const miMat = document.getElementById("mu-materia");
    if (miMat) {
        miMat.addEventListener("change", () => cargarTemasParaMateria("mu-materia", "mu-tema"));
        await cargarTemasParaMateria("mu-materia", "mu-tema");
    }
}

async function inicializarSistema() {
    await detectarRecuperacionPassword();
    await refrescarEstado();
    await cargarTodosLosTemas();
    actualizarNavbar();
    renderSeccionVideos();
    renderSeccionPDFs();
    renderSeccionPremium();
    renderSeccionMisArchivos();
    renderRankingPublico();
    if (appState.perfilActual) {
        resetSesionTimer();
        // Verificar logros al iniciar sesión (en background)
        setTimeout(() => verificarYNotificarLogros(), 2000);
    }
    accesoAdminPorHash();
    initSelectoresTemas();
    // cargarTestimoniosDinamicos(); // sección de testimonios eliminada
    verificarRetornoPago(); // feedback al volver de MercadoPago

    MA()?.sb?.auth.onAuthStateChange(async (event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
            await refrescarEstado();
            actualizarNavbar();
            renderSeccionVideos(); renderSeccionPDFs(); renderSeccionPremium();
            renderSeccionMisArchivos(); renderRankingPublico();
        }
    });
}

// ============ Recuperación de password ============
async function detectarRecuperacionPassword() {
    // Si la URL viene de un link de recovery (#access_token=...&type=recovery), abrimos el modal
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery")) {
        // Esperamos a que Supabase detecte la sesión
        setTimeout(() => {
            document.getElementById("modal-recovery").style.display = "flex";
        }, 600);
    }
}

async function setearPasswordRecovery() {
    const p1 = document.getElementById("rec-pass").value;
    const p2 = document.getElementById("rec-pass2").value;
    if (p1.length < SEG.PASS_MIN_LENGTH) return mostrarError("rec-error", `Mínimo ${SEG.PASS_MIN_LENGTH} caracteres.`);
    if (p1 !== p2) return mostrarError("rec-error", "Las contraseñas no coinciden.");
    const { error } = await MA().sbSetPasswordEnRecovery(p1);
    if (error) return mostrarError("rec-error", traducirError(error.message));
    mostrarToast("✅ Contraseña actualizada. Iniciá sesión con la nueva.", "ok");
    document.getElementById("modal-recovery").style.display = "none";
    history.replaceState(null, "", window.location.pathname);
    await MA().sbLogout();
}

// ============ NAVBAR ============
function actualizarNavbar() {
    const p = appState.perfilActual;
    const lbl = document.getElementById("nav-cuenta-label");
    const navAdmin = document.getElementById("nav-admin-link");
    const navSalir = document.getElementById("nav-salir-link");
    const navPerfil = document.getElementById("nav-perfil-link");
    const navPuntos = document.getElementById("nav-puntos");
    const navMisArchivos = document.getElementById("nav-mis-archivos-link");
    const navHistorias = document.getElementById("nav-historias-link");

    if (lbl) lbl.textContent = p ? (p.username || "Mi cuenta") : "Ingresar";
    if (navAdmin)  navAdmin.style.display  = (p?.rol === "admin") ? "inline" : "none";
    if (navSalir)  navSalir.style.display  = p ? "inline" : "none";
    if (navPerfil) navPerfil.style.display = p ? "inline" : "none";
    if (navMisArchivos) navMisArchivos.style.display = p ? "inline" : "none";
    if (navHistorias) navHistorias.style.display = p ? "inline" : "none";
    const navDiag = document.getElementById("nav-diagnostico-link");
    if (navDiag) navDiag.style.display = "inline"; // siempre visible
    const diagSection = document.getElementById("diagnostico");
    if (diagSection) diagSection.style.display = "block"; // siempre visible
    if (navPuntos) {
        navPuntos.style.display = p ? "inline-flex" : "none";
        navPuntos.innerHTML = p ? `⭐ ${p.puntos || 0} · 🔥 ${p.racha || 0}` : "";
    }
}

// ============ OVERLAYS / FORMS ============
function abrirAuth(e) {
    if (e) e.preventDefault();
    if (appState.perfilActual) return mostrarToast(`Ya estás logueado como ${appState.perfilActual.username}`, "info");
    document.getElementById("overlay-auth").style.display = "flex";
    mostrarForm("auth-selector");
}
function abrirAdmin(e) {
    if (e) e.preventDefault();
    if (appState.perfilActual?.rol !== "admin") return mostrarToast("Solo el admin puede ver este panel", "warn");
    document.getElementById("overlay-admin").style.display = "flex";
    adminTab("archivos");
}
function abrirHistorias(e) {
    // Sección "Historias Matemáticas": oculta del home por defecto (opcional, no invasiva).
    // Solo se muestra bajo demanda para usuarios logueados, vía el botón chico del menú.
    if (e) e.preventDefault();
    if (!appState.perfilActual) return abrirAuth();
    const sec = document.getElementById("historias");
    if (!sec) return;
    sec.style.display = "block";
    sec.scrollIntoView({ behavior: "smooth", block: "start" });
}

function abrirPerfil(e) {
    if (e) e.preventDefault();
    if (!appState.perfilActual) return abrirAuth();
    document.getElementById("perfil-username").value = appState.perfilActual.username || "";
    document.getElementById("perfil-email-display").textContent = (appState.perfilActual.id ? "ID: " + appState.perfilActual.id.slice(0,8) + "..." : "");
    document.getElementById("perfil-puntos-display").textContent = `⭐ ${appState.perfilActual.puntos || 0} puntos · 🔥 racha ${appState.perfilActual.racha || 0} días`;
    document.getElementById("pf-error").textContent = "";
    document.getElementById("pf-success").textContent = "";
    document.getElementById("modal-perfil").style.display = "flex";
    // Cargar logros y config de notificaciones
    renderLogrosEnPerfil();
    cargarNotifConfig();
}
function abrirMisArchivos(e) {
    if (e) e.preventDefault();
    if (!appState.perfilActual) return abrirAuth();
    renderSeccionMisArchivos();
    document.getElementById("mis-archivos-section")?.scrollIntoView({ behavior: "smooth" });
}
function cerrarOverlaySiClick(e, id) { if (e.target.id === id) document.getElementById(id).style.display = "none"; }
function mostrarForm(id) {
    ["auth-selector","form-login","form-registro","form-registro-ok","form-admin","form-olvide"].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.style.display = (f === id) ? "block" : "none";
    });
    ["li-error","re-error","ad-error","re-success","ol-error","ol-success"].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = "";
    });
}
function mostrarError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
function mostrarExito(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }

// ============ REGISTRO / LOGIN / LOGOUT ============
async function usuarioRegistro() {
    mostrarError("re-error",""); mostrarExito("re-success","");
    const nombreCompleto = sanitizar(document.getElementById("re-nombre").value);
    const username = sanitizar(document.getElementById("re-user").value);
    const email    = sanitizar(document.getElementById("re-email").value);
    const pass     = document.getElementById("re-pass").value;
    const pass2    = document.getElementById("re-pass2").value;
    if (!nombreCompleto || nombreCompleto.length < 3) return mostrarError("re-error","Ingresá tu nombre completo.");
    if (!validarUsuario(username)) return mostrarError("re-error","Usuario 3-40 caracteres alfanuméricos.");
    if (!validarEmail(email))      return mostrarError("re-error","Email inválido.");
    if (pass.length < SEG.PASS_MIN_LENGTH) return mostrarError("re-error",`Contraseña mínimo ${SEG.PASS_MIN_LENGTH} caracteres.`);
    if (pass !== pass2)            return mostrarError("re-error","Las contraseñas no coinciden.");
    if (!document.getElementById("re-acepto")?.checked) return mostrarError("re-error","Tenés que aceptar los Términos y Condiciones para registrarte.");
    if (!MA()?.sb)                 return mostrarError("re-error","Supabase no configurado.");
    const { data, error } = await MA().sbRegistro({ email, password: pass, username, nombreCompleto });
    if (error) return mostrarError("re-error", traducirError(error.message));
    // Limpiar campos y mostrar la pantalla de confirmación por email
    ["re-nombre","re-user","re-email","re-pass","re-pass2"].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=""; });
    const chk=document.getElementById("re-acepto"); if(chk) chk.checked=false;
    mostrarForm("form-registro-ok");
}

async function usuarioLogin() {
    mostrarError("li-error","");
    const email = sanitizar(document.getElementById("li-user").value);
    const pass  = document.getElementById("li-pass").value;
    if (!validarEmail(email)) return mostrarError("li-error","Email inválido.");
    if (!pass)                return mostrarError("li-error","Ingresá tu contraseña.");
    const { data, error } = await MA().sbLogin({ email, password: pass });
    if (error) return mostrarError("li-error", traducirError(error.message));
    mostrarToast(`¡Hola ${data.user.user_metadata?.username || data.user.email}!`, "ok");
    document.getElementById("overlay-auth").style.display = "none";
    document.getElementById("li-user").value = ""; document.getElementById("li-pass").value = "";
}

async function adminLogin() {
    mostrarError("ad-error","");
    const email = sanitizar(document.getElementById("ad-user").value);
    const pass  = document.getElementById("ad-pass").value;
    if (!validarEmail(email)) return mostrarError("ad-error","Email del admin.");
    if (!pass)                return mostrarError("ad-error","Ingresá la contraseña.");
    const { error } = await MA().sbLogin({ email, password: pass });
    if (error) return mostrarError("ad-error", traducirError(error.message));
    await refrescarEstado();
    if (appState.perfilActual?.rol !== "admin") {
        await MA().sbLogout();
        return mostrarError("ad-error","Esta cuenta no es admin.");
    }
    mostrarToast("👋 Bienvenido administrador","ok");
    document.getElementById("overlay-auth").style.display = "none";
}

async function cerrarSesion(e) {
    if (e) e.preventDefault();
    clearTimeout(_sesionTimer); clearTimeout(_warnTimer); ocultarWarning();
    if (MA()?.sb) await MA().sbLogout();
    appState.perfilActual = null;
    actualizarNavbar(); renderSeccionPremium(); renderSeccionMisArchivos();
    mostrarToast("Sesión cerrada","info");
}

// ============ OLVIDÉ CONTRASEÑA ============
async function enviarOlvideContrasena() {
    const email = sanitizar(document.getElementById("ol-email").value);
    if (!validarEmail(email)) return mostrarError("ol-error","Ingresá un email válido.");
    const { error } = await MA().sbOlvidePassword(email);
    if (error) return mostrarError("ol-error", traducirError(error.message));
    mostrarExito("ol-success","✅ Si el email está registrado, vas a recibir un link en breve.");
}

// ============ MI PERFIL ============
async function guardarUsername() {
    mostrarError("pf-error",""); mostrarExito("pf-success","");
    const nuevo = sanitizar(document.getElementById("perfil-username").value);
    if (!validarUsuario(nuevo)) return mostrarError("pf-error","Usuario 3-40 caracteres alfanuméricos.");
    const { error } = await MA().sbCambiarUsername(nuevo);
    if (error) return mostrarError("pf-error", error.message);
    appState.perfilActual.username = nuevo;
    actualizarNavbar();
    mostrarExito("pf-success","✅ Nombre de usuario actualizado.");
}

async function cambiarMiPassword() {
    mostrarError("pf-error",""); mostrarExito("pf-success","");
    const actual = document.getElementById("perfil-pass-actual").value;
    const nueva  = document.getElementById("perfil-pass-nueva").value;
    const nueva2 = document.getElementById("perfil-pass-nueva2").value;
    if (!actual) return mostrarError("pf-error","Ingresá tu contraseña actual.");
    if (nueva.length < SEG.PASS_MIN_LENGTH) return mostrarError("pf-error",`Nueva contraseña mínimo ${SEG.PASS_MIN_LENGTH} caracteres.`);
    if (nueva !== nueva2) return mostrarError("pf-error","Las contraseñas nuevas no coinciden.");
    const { error } = await MA().sbCambiarPassword(actual, nueva);
    if (error) return mostrarError("pf-error", error.message);
    ["perfil-pass-actual","perfil-pass-nueva","perfil-pass-nueva2"].forEach(id=>document.getElementById(id).value="");
    mostrarExito("pf-success","✅ Contraseña cambiada exitosamente.");
}

// ============ ADMIN ============
function adminTab(tab) {
    ["archivos","usuarios","subir","ejercicios"].forEach(t => {
        const el = document.getElementById("admin-tab-"+t);
        if (el) el.style.display = (t===tab) ? "block" : "none";
    });
    document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("active"));
    const btn = [...document.querySelectorAll(".admin-tab")].find(b => b.textContent.toLowerCase().includes(tab));
    if (btn) btn.classList.add("active");
    if (tab==="archivos") renderAdminArchivos();
    if (tab==="usuarios") renderAdminUsuarios();
    if (tab==="ejercicios") renderAdminEjercicios();
}

async function renderAdminArchivos() {
    const grid = document.getElementById("admin-archivos-grid"); if (!grid) return;
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b">Cargando...</p>`;
    appState.archivos = await MA().sbListarArchivos();
    const fSec = document.getElementById("filtro-seccion")?.value || "";
    const fMat = document.getElementById("filtro-materia")?.value || "";
    const fNivel = document.getElementById("filtro-nivel")?.value || "";
    const lista = appState.archivos.filter(a => (!fSec || a.seccion===fSec) && (!fMat || a.materia===fMat) && (!fNivel || (a.plan_minimo||"gratis")===fNivel));
    if (!lista.length) { grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:40px">No hay archivos.</p>`; return; }
    grid.innerHTML = lista.map(a => `
        <div class="admin-card">
            <div class="admin-card-mini">${miniPreview(a)}</div>
            <div class="admin-card-body">
                <span class="seccion-tag seccion-${a.seccion}">${etiquetaSeccion(a.seccion)}</span>
                <span class="nivel-tag nivel-${a.plan_minimo||"gratis"}">${etiquetaNivel(a.plan_minimo)}</span>
                <span class="materia-tag">${esc(MATERIAS[a.materia]||a.materia)}</span>
                ${a.es_personal ? '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">PERSONAL</span>' : ""}
                <h4>${esc(a.titulo)}</h4>
                ${a.descripcion ? `<p>${esc(a.descripcion)}</p>` : ""}
                <p style="font-size:11px;color:#94a3b8">${formatearFecha(a.creado_en)} · ${formatearTamano(a.tamano_bytes)}</p>
                <div class="admin-card-actions">
                    <button type="button" onclick="verContenido('${a.id}')">👁 Ver</button>
                    <button type="button" onclick="abrirEdicion('${a.id}')">✏ Editar</button>
                    <button type="button" onclick="eliminarArchivo('${a.id}')" class="btn-rojo">🗑</button>
                </div>
            </div>
        </div>`).join("");
}

function etiquetaSeccion(s){ return ({video:"🎬 Video",pdf:"📄 PDF",premium:"⭐ Premium",imagen:"🖼 Imagen",texto:"📝 Texto"})[s]||s; }
function etiquetaNivel(n){ return ({gratis:"🆓 Gratis",basico:"🔷 Básico",premium:"⭐ Premium"})[n||"gratis"]; }
function miniPreview(a) {
    if (a.miniatura) return `<img src="${a.miniatura}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px">`;
    const i = ({video:"🎬",pdf:"📄",premium:"⭐",imagen:"🖼",texto:"📝"})[a.seccion] || "📦";
    return `<div style="display:flex;align-items:center;justify-content:center;height:120px;background:#f1f5f9;border-radius:8px;font-size:48px">${i}</div>`;
}

async function renderAdminUsuarios() {
    const cont = document.getElementById("admin-usuarios-lista"); if (!cont) return;
    cont.innerHTML = `<p style="text-align:center;color:#64748b">Cargando...</p>`;
    appState.perfiles = await MA().sbListarPerfiles();
    if (!appState.perfiles.length) { cont.innerHTML = `<p style="text-align:center;color:#64748b;padding:40px">No hay usuarios.</p>`; return; }
    cont.innerHTML = appState.perfiles.map(p => {
        const nivel = nivelDe(p);
        const dias = diasRestantes(p);
        const etiquetaNivel = { basico: "🔷 Básico", premium: "⭐ Premium" }[nivel] || "🆓 Plan gratis";
        return `<div class="usuario-card">
            <div class="usuario-info">
                <h4>👤 ${esc(p.username||"(sin username)")} ${p.rol==="admin"?'<span style="background:#7c3aed;color:white;padding:2px 8px;border-radius:99px;font-size:11px">ADMIN</span>':""}</h4>
                <p style="font-size:12px;color:#64748b">Creado: ${formatearFecha(p.creado_en)} · ⭐ ${p.puntos||0} pts · 🔥 racha ${p.racha||0}</p>
                <p style="font-size:13px">${nivel !== "gratis" ? `${etiquetaNivel} · ${dias} días (hasta ${formatearFecha(p.plan_hasta)})` : etiquetaNivel}</p>
            </div>
            <div class="usuario-actions">
                ${nivel === "gratis"
                    ? `<button type="button" onclick="activarPlan('${p.id}','basico')">🔷 Activar Básico</button>
                       <button type="button" onclick="activarPlan('${p.id}','premium')">⭐ Activar Premium</button>`
                    : `<button type="button" onclick="activarPlan('${p.id}','${nivel}')">🔁 Renovar +${nivel==='premium'?30:23}d</button>
                       ${nivel === "basico" ? `<button type="button" onclick="activarPlan('${p.id}','premium')">⬆️ Pasar a Premium</button>` : ""}
                       <button type="button" onclick="desactivarSuscripcion('${p.id}')" class="btn-rojo">❌ Desactivar</button>`}
                <button type="button" onclick="adminResetPassword('${p.id}')">🔑 Reset password</button>
                <button type="button" onclick="adminAsignarPasswordTemp('${p.id}', '${esc(p.username)}')">🎟️ Asignar temporal</button>
                ${p.rol !== "admin" ? `<button type="button" onclick="eliminarUsuario('${p.id}', '${esc(p.username)}')" class="btn-rojo">🗑 Eliminar</button>` : ""}
            </div>
        </div>`;
    }).join("");
}

async function adminResetPassword(usuarioId) {
    const p = appState.perfiles.find(x => x.id === usuarioId); if (!p) return;
    const email = prompt(`Vamos a mandar un email de reset a "${p.username}".\nIngresá su email (lo encontrás en Supabase Dashboard → Authentication → Users):`);
    if (!email) return;
    const { error } = await MA().sbOlvidePassword(sanitizar(email));
    if (error) return mostrarToast("Error: " + error.message, "error");
    mostrarToast("✅ Email de reset enviado", "ok");
}

async function adminAsignarPasswordTemp(usuarioId, nombre) {
    mostrarToast(`Para asignar una contraseña temporal al usuario "${nombre}" abrí Supabase Dashboard → Authentication → Users → click en el usuario → "Reset password". Esa opción te permite setear una password directamente.`, "info");
    // Razón: cambiar password de OTRO usuario requiere service_role key (admin API),
    // que no está disponible en el front-end por seguridad.
    setTimeout(() => {
        window.open(`https://supabase.com/dashboard/project/yidrpuizgtqpswefwdaa/auth/users`, "_blank");
    }, 600);
}

// ============ SUBIR CONTENIDO ============
function actualizarCampoArchivo() {
    const tipo = document.getElementById("su-tipo").value;
    document.getElementById("su-archivo-wrap").style.display = tipo==="archivo" ? "block" : "none";
    document.getElementById("su-texto-wrap").style.display   = tipo==="texto" ? "block" : "none";
    document.getElementById("su-url-wrap").style.display     = tipo==="url-video" ? "block" : "none";
}

async function subirContenido() {
    mostrarError("su-error",""); mostrarExito("su-success","");
    if (appState.perfilActual?.rol !== "admin") return mostrarError("su-error","Solo el admin.");
    await _subirArchivoComun({
        prefixIds: { titulo:"su-titulo", desc:"su-desc", tipo:"su-tipo", texto:"su-texto", url:"su-url", archivo:"su-archivo",
                     materia:"su-materia", seccion:"su-seccion", nivel:"su-nivel", tema:"su-tema", error:"su-error", success:"su-success", progress:"su-progress", progressFill:"su-progress-fill" },
        esPersonal: false,
    });
    renderSeccionVideos(); renderSeccionPDFs(); renderSeccionPremium(); renderAdminArchivos();
}

async function subirMiArchivo() {
    mostrarError("mu-error",""); mostrarExito("mu-success","");
    if (!appState.perfilActual) return mostrarError("mu-error","Necesitás iniciar sesión.");
    await _subirArchivoComun({
        prefixIds: { titulo:"mu-titulo", desc:"mu-desc", tipo:"mu-tipo", texto:"mu-texto", url:"mu-url", archivo:"mu-archivo",
                     materia:"mu-materia", seccion:"mu-seccion", tema:"mu-tema", error:"mu-error", success:"mu-success", progress:"mu-progress", progressFill:"mu-progress-fill" },
        esPersonal: true,
    });
    renderSeccionMisArchivos();
}

async function _subirArchivoComun({ prefixIds, esPersonal }) {
    const get = id => document.getElementById(id);
    const titulo = sanitizar(get(prefixIds.titulo).value);
    const desc   = sanitizar(get(prefixIds.desc).value);
    const tipo   = get(prefixIds.tipo).value;
    const materia = get(prefixIds.materia)?.value || "general";
    const seccion = get(prefixIds.seccion)?.value || "pdf";
    // Nivel de acceso: solo aplica a contenido público (admin). Los archivos personales
    // no usan este campo — se filtran por dueño, no por plan.
    const plan_minimo = esPersonal ? "gratis" : (get(prefixIds.nivel)?.value || "gratis");
    if (!titulo) return mostrarError(prefixIds.error, "Ingresá un título.");
    const tema_id = get(prefixIds.tema)?.value || null;
    let meta = { titulo, descripcion:desc, materia, seccion, tipo, plan_minimo, creado_por: appState.perfilActual.id, es_personal: esPersonal };
    if (tema_id) meta.tema_id = tema_id;
    if (tipo === "texto") {
        const t = get(prefixIds.texto).value.trim();
        if (!t) return mostrarError(prefixIds.error,"Ingresá el contenido.");
        meta.contenido_texto = t;
    } else if (tipo === "url-video") {
        const u = get(prefixIds.url).value.trim();
        if (!u) return mostrarError(prefixIds.error,"Ingresá la URL.");
        meta.url_video = u;
    } else {
        const file = get(prefixIds.archivo).files[0];
        if (!file) return mostrarError(prefixIds.error,"Seleccioná un archivo.");
        if (file.size > MAX_FILE_SIZE) return mostrarError(prefixIds.error,`Máx ${formatearTamano(MAX_FILE_SIZE)}.`);
        get(prefixIds.progress).style.display = "block";
        const fill = get(prefixIds.progressFill); if (fill) fill.style.width = "30%";
        const ext  = file.name.split(".").pop().toLowerCase();
        const carpeta = esPersonal ? `personales/${appState.perfilActual.id}` : materia;
        const path = `${carpeta}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error: eUp } = await MA().sbSubirBlob(path, file, file.type);
        if (eUp) { get(prefixIds.progress).style.display="none"; return mostrarError(prefixIds.error,"Error: "+eUp.message); }
        if (fill) fill.style.width = "70%";
        meta.storage_path  = path;
        meta.nombre_archivo = file.name;
        meta.mime_type     = file.type;
        meta.tamano_bytes  = file.size;
        if (file.type.startsWith("image/")) meta.miniatura = await generarMiniaturaDesdeBlob(file);
    }
    const { error } = await MA().sbCrearArchivo(meta);
    get(prefixIds.progress).style.display = "none";
    if (error) return mostrarError(prefixIds.error,"Error: "+error.message);
    mostrarExito(prefixIds.success,"✅ Publicado.");
    [prefixIds.titulo, prefixIds.desc, prefixIds.texto, prefixIds.url, prefixIds.archivo].forEach(id => { if (get(id)) get(id).value=""; });
    await refrescarEstado();
    setTimeout(() => mostrarExito(prefixIds.success,""), 3000);
}

function generarMiniaturaDesdeBlob(blob, maxW=340) {
    return new Promise(resolve => {
        const img = new Image(), url = URL.createObjectURL(blob);
        img.onload = () => {
            const r = Math.min(maxW/img.width, 1);
            const c = document.createElement("canvas");
            c.width=Math.round(img.width*r); c.height=Math.round(img.height*r);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

// ============ EDITAR / BORRAR ============
function abrirEdicion(id) {
    const a = appState.archivos.find(x => x.id===id); if (!a) return;
    document.getElementById("ed-id").value=a.id;
    document.getElementById("ed-titulo").value=a.titulo||"";
    document.getElementById("ed-desc").value=a.descripcion||"";
    document.getElementById("ed-materia").value=a.materia||"general";
    document.getElementById("ed-seccion").value=(a.seccion==="premium" ? "pdf" : a.seccion) || "video";
    document.getElementById("ed-nivel").value=a.plan_minimo || (a.seccion==="premium" ? "premium" : "gratis");
    const w = document.getElementById("ed-texto-wrap");
    if (a.tipo==="texto") { w.style.display="block"; document.getElementById("ed-texto").value=a.contenido_texto||""; }
    else w.style.display="none";
    document.getElementById("modal-editar").style.display="flex";
}
async function guardarEdicion() {
    const id = document.getElementById("ed-id").value;
    const cambios = {
        titulo: sanitizar(document.getElementById("ed-titulo").value),
        descripcion: sanitizar(document.getElementById("ed-desc").value),
        materia: document.getElementById("ed-materia").value,
        seccion: document.getElementById("ed-seccion").value,
        plan_minimo: document.getElementById("ed-nivel").value,
    };
    const a = appState.archivos.find(x => x.id===id);
    if (a?.tipo==="texto") cambios.contenido_texto = document.getElementById("ed-texto").value;
    const { error } = await MA().sbActualizarArchivo(id, cambios);
    if (error) return mostrarError("ed-error", error.message);
    document.getElementById("modal-editar").style.display="none";
    mostrarToast("✅ Guardado","ok");
    await refrescarEstado();
    renderAdminArchivos(); renderSeccionVideos(); renderSeccionPDFs(); renderSeccionPremium();
}
async function eliminarArchivo(id) {
    const a = appState.archivos.find(x => x.id===id); if (!a) return;
    if (!confirm(`¿Borrar "${a.titulo}"?`)) return;
    const { error } = await MA().sbBorrarArchivo(id, a.storage_path);
    if (error) return mostrarToast("Error: "+error.message,"error");
    mostrarToast("🗑 Borrado","ok");
    await refrescarEstado();
    renderAdminArchivos(); renderSeccionVideos(); renderSeccionPDFs(); renderSeccionPremium(); renderSeccionMisArchivos();
}
async function eliminarUsuario(usuarioId, nombre) {
    if (!confirm(`¿Eliminar a "${nombre}"?\nNota: borra el perfil pero la cuenta de Auth queda en Supabase.`)) return;
    const { error } = await MA().sb.from("perfiles").delete().eq("id", usuarioId);
    if (error) return mostrarToast("Error: "+error.message,"error");
    mostrarToast("🗑 Eliminado","ok"); renderAdminUsuarios();
}

// ============ PLANES (acciones admin) ============
// Duración estándar por nivel (misma que usa el webhook de MercadoPago)
const DIAS_POR_PLAN = { basico: 23, premium: 30 };

async function activarPlan(uid, plan) {
    const dias = DIAS_POR_PLAN[plan] || DURACION_DIAS;
    const { error } = await MA().sbAdminActivarPlan(uid, plan, dias);
    if (error) return mostrarToast("Error: "+(error.message||error),"error");
    mostrarToast(`${plan === "premium" ? "⭐" : "🔷"} ${plan === "premium" ? "Premium" : "Básico"} +${dias}d`,"ok");
    renderAdminUsuarios();
}
async function desactivarSuscripcion(uid) {
    if (!confirm("¿Desactivar el plan pago? Vuelve a Gratis.")) return;
    const { error } = await MA().sbAdminActivarPlan(uid, "gratis", 0);
    if (error) return mostrarToast("Error: "+(error.message||error),"error");
    mostrarToast("❌ Desactivado — vuelve a Plan gratis","ok"); renderAdminUsuarios();
}

// ============ VISOR ============
async function verContenido(id) {
    const a = appState.archivos.find(x => x.id===id); if (!a) return;
    // 🆕 GATE DE QUOTA: si el usuario está logueado y NO es admin, registrar uso
    if (appState.perfilActual && appState.perfilActual.rol !== "admin" && !a.es_personal) {
        const c = await MA().sbRegistrarUso("archivo");
        if (c === -1) {
            mostrarBannerQuota("archivo");
            return;
        }
    }
    document.getElementById("visor-titulo").textContent = a.titulo;
    const body = document.getElementById("visor-cuerpo");
    body.innerHTML = `<p style="text-align:center;color:#64748b;padding:40px">Cargando...</p>`;
    document.getElementById("modal-visor").style.display = "flex";
    // Marca de agua disuasiva en archivos admin (con username)
    if (appState.perfilActual && !a.es_personal && a.seccion !== "texto") {
        const wm = document.getElementById("modal-visor");
        const txt = `© Matemáticas Activa · ${appState.perfilActual.username || "usuario"} · ${new Date().toLocaleDateString("es-AR")}`;
        wm.dataset.watermark = txt;
        wm.classList.add("con-marca-agua");
    } else {
        document.getElementById("modal-visor").classList.remove("con-marca-agua");
    }
    let contenidoHtml = "";
    if (a.tipo === "texto") {
        contenidoHtml = `<div style="white-space:pre-wrap;line-height:1.6;padding:1rem">${esc(a.contenido_texto||"")}</div>`;
    } else if (a.tipo === "url-video") {
        const em = parseEmbedUrl(a.url_video);
        contenidoHtml = em
            ? `<div style="position:relative;padding-top:56.25%"><iframe src="${em}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`
            : `<p style="text-align:center"><a href="${esc(a.url_video)}" target="_blank" rel="noopener">Abrir video</a></p>`;
    } else if (a.storage_path) {
        const url = await MA().sbUrlFirmada(a.storage_path, 3600);
        if (!url) contenidoHtml = `<p style="text-align:center;color:#dc2626;padding:40px">No se pudo obtener el archivo.</p>`;
        else {
            const mt = a.mime_type || "";
            if (mt.startsWith("image/")) {
                const proteg = !a.es_personal ? ' oncontextmenu="return false" draggable="false" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;user-select:none;-webkit-user-drag:none;pointer-events:none"' : ' style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px"';
                contenidoHtml = `<img src="${url}" alt="${esc(a.titulo)}"${proteg}>`;
            }
            else if (mt.startsWith("video/")) {
                const noDl = !a.es_personal ? ' controlsList="nodownload nofullscreen noremoteplayback" disablepictureinpicture oncontextmenu="return false"' : '';
                contenidoHtml = `<video src="${url}" controls${noDl} style="width:100%;border-radius:8px"></video>`;
            }
            else if (mt === "application/pdf") {
                // PDFs: iframe con #toolbar=0 para ocultar botón de descarga
                const sufijo = !a.es_personal ? "#toolbar=0&navpanes=0" : "";
                contenidoHtml = `<iframe src="${url}${sufijo}" style="width:100%;height:70vh;border:0;border-radius:8px" sandbox="allow-same-origin allow-scripts"></iframe>${!a.es_personal?'<p style=\"font-size:11px;color:#94a3b8;text-align:center;margin-top:6px\">📌 Material protegido — solo lectura online</p>':''}`;
            }
            else {
                // Para archivos del admin, no permitir descarga directa
                if (!a.es_personal) contenidoHtml = `<p style="text-align:center;padding:30px"><div style="font-size:48px">📁</div><p style="margin:14px 0;color:#64748b">${esc(a.nombre_archivo||a.titulo)}</p><p style="font-size:13px;color:#dc2626">Este archivo solo se visualiza online — no descargable.</p></p>`;
                else contenidoHtml = `<p style="text-align:center;padding:20px"><a href="${url}" download="${esc(a.nombre_archivo||a.titulo)}" class="btn-pago-mp" style="display:inline-block">⬇ Descargar ${esc(a.nombre_archivo||a.titulo)}</a><p style="font-size:11px;color:#94a3b8;margin-top:8px">(Tus archivos personales sí podés descargarlos)</p></p>`;
            }
        }
    } else {
        contenidoHtml = `<p style="text-align:center;color:#dc2626;padding:40px">Archivo no disponible.</p>`;
    }
    // Sumar puntos por ver contenido (1 punto por archivo, una vez)
    if (appState.perfilActual && !appState.perfilActual.vistos?.includes(id)) {
        await MA().sbSumarPuntos(2);
        await MA().sbAgregarVisto(id);
        await refrescarEstado(); actualizarNavbar();
    }
    // Renderizar visor + sección de comentarios
    body.innerHTML = contenidoHtml + `<div id="visor-comentarios" style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px"></div>`;
    renderComentarios(id);
}

function parseEmbedUrl(url) {
    if (!url) return null;
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
    return null;
}

// ============ COMENTARIOS ============
async function renderComentarios(archivoId) {
    const cont = document.getElementById("visor-comentarios"); if (!cont) return;
    const lista = await MA().sbListarComentarios(archivoId);
    const formHtml = appState.perfilActual
        ? `<div style="display:flex;gap:8px;margin-top:12px">
                <input type="text" id="com-texto" placeholder="Escribí un comentario..." maxlength="1000" style="flex:1;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
                <button type="button" onclick="enviarComentario('${archivoId}')" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer">Enviar</button>
            </div>`
        : `<p style="font-size:13px;color:#64748b;text-align:center;margin-top:12px"><a href="#" onclick="abrirAuth(event)" style="color:#2563eb">Iniciá sesión</a> para comentar.</p>`;
    cont.innerHTML = `
        <h4 style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 12px">💬 Comentarios (${lista.length})</h4>
        <div id="lista-coms" style="max-height:280px;overflow-y:auto">
            ${lista.length
                ? lista.map(c => `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9">
                    <p style="font-size:13px;margin:0 0 4px"><strong style="color:#2563eb">${esc(c.perfiles?.username||"Usuario")}</strong> ${c.perfiles?.rol==="admin"?'<span style="background:#7c3aed;color:white;padding:1px 6px;border-radius:99px;font-size:10px">ADMIN</span>':""} <span style="font-size:11px;color:#94a3b8">· ${formatearFechaHora(c.creado_en)}</span></p>
                    <p style="font-size:14px;margin:0;line-height:1.4">${esc(c.texto)}</p>
                    ${(appState.perfilActual && (c.usuario_id===appState.perfilActual.id || appState.perfilActual.rol==="admin"))
                        ? `<button type="button" onclick="borrarComentario('${c.id}','${archivoId}')" style="background:none;border:none;color:#dc2626;font-size:11px;cursor:pointer;padding:0;margin-top:4px">🗑 Borrar</button>` : ""}
                </div>`).join("")
                : `<p style="font-size:13px;color:#94a3b8;text-align:center;padding:12px">Aún no hay comentarios.</p>`}
        </div>
        ${formHtml}`;
}
async function enviarComentario(archivoId) {
    const inp = document.getElementById("com-texto"); if (!inp) return;
    const texto = inp.value.trim();
    if (!texto) return;
    const { error } = await MA().sbCrearComentario(archivoId, texto);
    if (error) return mostrarToast("Error: "+error.message,"error");
    inp.value = "";
    await MA().sbSumarPuntos(1);
    await refrescarEstado(); actualizarNavbar();
    renderComentarios(archivoId);
}
async function borrarComentario(id, archivoId) {
    if (!confirm("¿Borrar este comentario?")) return;
    const { error } = await MA().sbBorrarComentario(id);
    if (error) return mostrarToast("Error: "+error.message,"error");
    renderComentarios(archivoId);
}

// ============ USUARIO VE ARCHIVO (cuota premium) ============
async function usuarioVerArchivo(id) {
    if (!appState.perfilActual) { abrirAuth(); return; }
    const a = appState.archivos.find(x => x.id===id); if (!a) return;
    const requerido = a.plan_minimo || (a.seccion === "premium" ? "premium" : "gratis");
    if (requerido !== "gratis") {
        if (nivelPermite(nivelDe(appState.perfilActual), requerido)) return verContenido(id);
        const vistos = appState.perfilActual.vistos || [];
        if (vistos.includes(id)) return verContenido(id);
        if (vistos.length >= MAX_ARCHIVOS_GRATIS) return abrirModalPago();
        return verContenido(id);
    }
    return verContenido(id);
}
function abrirModalPago() { document.getElementById("modal-pago").style.display = "flex"; }

// ============ RENDER PÚBLICO ============
function tarjetaPublica(a, esPremium) {
    const ic = ({video:"🎬",pdf:"📄",premium:"⭐",imagen:"🖼",texto:"📝"})[a.seccion] || "📦";
    return `<article class="contenido-card" onclick="${esPremium?`usuarioVerArchivo('${a.id}')`:`verContenido('${a.id}')`}">
        <div class="contenido-thumb">${a.miniatura?`<img src="${a.miniatura}" alt="">`:`<span style="font-size:64px">${ic}</span>`}</div>
        <div class="contenido-body">
            <span class="materia-tag">${esc(MATERIAS[a.materia]||a.materia)}</span>
            <h4>${esc(a.titulo)}</h4>
            ${a.descripcion?`<p>${esc(a.descripcion)}</p>`:""}
        </div>
    </article>`;
}
function renderSeccionVideos() {
    const g = document.getElementById("videos-grid"); if (!g) return;
    const v = appState.archivosPublicos.filter(a => a.seccion==="video" || a.tipo==="url-video");
    g.innerHTML = v.length ? v.map(a => tarjetaPublica(a, false)).join("") : `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:32px">Aún no hay videos.</p>`;
}
function renderSeccionPDFs() {
    const g = document.getElementById("pdfs-grid"); if (!g) return;
    const p = appState.archivosPublicos.filter(a => a.seccion==="pdf");
    g.innerHTML = p.length ? p.map(a => tarjetaPublica(a, false)).join("") : `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:32px">Aún no hay PDFs.</p>`;
}
function renderSeccionPremium() {
    const info = document.getElementById("suscripcion-info");
    const cont = document.getElementById("suscripcion-contenido");
    const cuota = document.getElementById("premium-cuota-info");
    const grid  = document.getElementById("premium-grid");
    if (!info || !cont) return;

    const p = appState.perfilActual;

    // === Banner de estado del usuario actual ===
    let banner = "";
    if (!p) {
        banner = `<div class="premium-banner-estado banner-gratis">
            <h3 style="color:#fbbf24;margin:0 0 6px">👋 ¡Hola! Ingresá para acceder a más contenido</h3>
            <p style="color:rgba(255,255,255,.85);margin:0 0 12px">Creá una cuenta gratis y empezá a usar la plataforma.</p>
            <button type="button" class="btn-hero-main" onclick="abrirAuth(event)" style="margin:0">Registrarme gratis</button>
        </div>`;
    } else if (esPremiumActivo(p)) {
        const nivel = nivelDe(p);
        const nombreNivel = nivel === "premium" ? "PREMIUM" : "BÁSICO";
        banner = `<div class="premium-banner-estado banner-activo">
            <h3 style="color:#fde68a;margin:0 0 6px">⭐ Sos usuario ${nombreNivel}</h3>
            <p style="color:rgba(255,255,255,.9);margin:0">Te quedan <strong>${diasRestantes(p)} días</strong> de acceso ${nivel === "premium" ? "completo" : "Básico"} (hasta ${formatearFecha(p.plan_hasta)}).</p>
        </div>`;
    } else {
        const v = (p.vistos||[]).length;
        banner = `<div class="premium-banner-estado banner-gratis">
            <h3 style="color:#fbbf24;margin:0 0 6px">🆓 Estás en el plan Gratis</h3>
            <p style="color:rgba(255,255,255,.85);margin:0">Tenés acceso limitado a 3 archivos/día. ¿Querés más? Elegí un plan abajo.</p>
        </div>`;
    }

    // === Cards de los 3 planes (siempre visibles en la home) ===
    const planesHtml = `
    <div class="planes-grid planes-home">
        <div class="plan-card">
            <div class="plan-tag" style="background:#94a3b8">GRATIS</div>
            <h3>Plan Gratis</h3>
            <p class="plan-precio">$ 0</p>
            <p class="plan-sub">Para siempre</p>
            <ul class="plan-features">
                <li>✅ 3 archivos públicos por semana</li>
                <li>✅ 3 usos de calculadora/graficadora por semana</li>
                <li>✅ Acceso al ranking</li>
                <li>⏱️ Renovación cada 7 días</li>
                <li>❌ Sin archivos premium</li>
                <li>❌ Sin subir archivos personales</li>
            </ul>
            <button type="button" class="plan-btn plan-btn-gratis" disabled>Plan por defecto</button>
        </div>
        <div class="plan-card plan-card-popular">
            <div class="plan-tag" style="background:linear-gradient(135deg,#2563eb,#7c3aed)">BÁSICO</div>
            <h3>Plan Básico</h3>
            <p class="plan-precio">$ 7.000</p>
            <p class="plan-sub">23 días de acceso</p>
            <p class="plan-contexto">Menos que una clase particular</p>
            <ul class="plan-features">
                <li>✅ <strong>Acceso ilimitado</strong> a archivos premium</li>
                <li>✅ <strong>Calculadora/graficadora sin límite</strong></li>
                <li>✅ Sistema de puntos y ranking</li>
                <li>❌ No podés subir archivos personales</li>
            </ul>
            <button type="button" class="plan-btn plan-btn-basico" onclick="iniciarPagoMP('basico', this)">💳 Pagar con MercadoPago</button>
        </div>
        <div class="plan-card plan-card-premium">
            <div class="plan-tag" style="background:linear-gradient(135deg,#f59e0b,#dc2626)">⭐ PREMIUM</div>
            <h3>Plan Premium</h3>
            <p class="plan-precio">$ 12.000</p>
            <p class="plan-sub">30 días de acceso completo</p>
            <p class="plan-contexto">Menos de $400 por día</p>
            <ul class="plan-features">
                <li>✅ <strong>Todo lo del plan Básico</strong></li>
                <li>✅ <strong>30 días</strong> (vs 23 del básico)</li>
                <li>✅ <strong>Cargar tus propios PDFs y videos</strong></li>
                <li>✅ Carpeta personal ilimitada</li>
                <li class="feature-destacada">✅ <strong>Soporte personalizado</strong> — consultás dudas directamente con el profe</li>
            </ul>
            <button type="button" class="plan-btn plan-btn-premium" onclick="iniciarPagoMP('premium', this)">💳 Pagar con MercadoPago</button>
        </div>
    </div>
    <div class="pago-timeline">
        <div class="pago-step"><span class="pago-step-icon">💳</span><span class="pago-step-text">Pagás</span></div>
        <div class="pago-step-arrow">→</div>
        <div class="pago-step"><span class="pago-step-icon">✅</span><span class="pago-step-text">Se confirma</span></div>
        <div class="pago-step-arrow">→</div>
        <div class="pago-step"><span class="pago-step-icon">🚀</span><span class="pago-step-text">Acceso activado</span></div>
    </div>
    `;

    info.innerHTML = banner + planesHtml;

    // === Grid de contenido premium (solo si hay) ===
    const premium = appState.archivosPublicos.filter(a => (a.plan_minimo || "gratis") !== "gratis");
    if (premium.length > 0) {
        cont.style.display = "block";
        if (cuota && p && !esPremiumActivo(p)) {
            const v = (p.vistos||[]).length;
            cuota.style.display = "block";
            cuota.innerHTML = `Tu cuota: <strong>${v}/${MAX_ARCHIVOS_GRATIS}</strong> archivos premium ya vistos`;
        } else if (cuota) {
            cuota.style.display = "none";
        }
        grid.innerHTML = premium.map(a => tarjetaPublica(a, true)).join("");
    } else {
        cont.style.display = "none";
    }
}

// ============ MIS ARCHIVOS (sección personal) ============
function renderSeccionMisArchivos() {
    const sec = document.getElementById("mis-archivos-section");
    if (!sec) return;
    if (!appState.perfilActual) { sec.style.display = "none"; return; }
    sec.style.display = "block";
    const grid = document.getElementById("mis-archivos-grid");
    if (!appState.misArchivos.length) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:24px">Aún no subiste ningún archivo. Usá el formulario de arriba.</p>`;
        return;
    }
    grid.innerHTML = appState.misArchivos.map(a => `
        <article class="contenido-card">
            <div class="contenido-thumb" onclick="verContenido('${a.id}')">${a.miniatura?`<img src="${a.miniatura}" alt="">`:`<span style="font-size:64px">${({video:"🎬",pdf:"📄",premium:"⭐",imagen:"🖼",texto:"📝"})[a.seccion]||"📦"}</span>`}</div>
            <div class="contenido-body">
                <span class="materia-tag">${esc(MATERIAS[a.materia]||a.materia)}</span>
                <h4>${esc(a.titulo)}</h4>
                ${a.descripcion?`<p>${esc(a.descripcion)}</p>`:""}
                <p style="font-size:11px;color:#94a3b8">${formatearFecha(a.creado_en)} · ${formatearTamano(a.tamano_bytes)}</p>
                <div style="display:flex;gap:6px;margin-top:8px">
                    <button type="button" onclick="verContenido('${a.id}')" style="flex:1;padding:6px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer">👁 Ver</button>
                    <button type="button" onclick="eliminarArchivo('${a.id}')" style="padding:6px 10px;background:#dc2626;color:white;border:none;border-radius:6px;cursor:pointer">🗑</button>
                </div>
            </div>
        </article>`).join("");
}

// ============ RANKING ============
async function renderRankingPublico() {
    const cont = document.getElementById("ranking-grid"); if (!cont) return;
    // Mostrar skeletons mientras carga
    cont.innerHTML = Array(5).fill('<div class="skeleton" style="height:64px;margin-bottom:8px;border-radius:12px"></div>').join("");
    const lista = await MA().sbRanking();
    if (!lista.length) { cont.innerHTML = `<p style="text-align:center;color:#64748b">Aún no hay usuarios en el ranking.</p>`; return; }
    cont.innerHTML = lista.map((u, i) => {
        const medalla = i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
        return `<div style="display:flex;align-items:center;gap:14px;padding:12px;background:white;border-radius:12px;margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,.05)">
            <div style="font-size:24px;min-width:48px;text-align:center">${medalla}</div>
            <div style="flex:1">
                <h4 style="margin:0;font-size:15px;color:#0f172a">${esc(u.username||"(sin nombre)")}${u.es_premium?' <span style="font-size:11px;color:#f59e0b">⭐</span>':""}</h4>
                <p style="margin:2px 0 0;font-size:12px;color:#64748b">🔥 racha ${u.racha} días</p>
            </div>
            <div style="font-size:18px;font-weight:700;color:#2563eb">${u.puntos} pts</div>
        </div>`;
    }).join("");
}

// ============ EJERCICIOS DIARIOS (admin) ============
let _adminEjEditId = null;
async function renderAdminEjercicios() {
    const cont = document.getElementById("admin-ejercicios-lista"); if (!cont) return;
    const lista = await MA().sbListarTodosEjercicios();
    const materiaOpts = Object.entries(MATERIAS).map(([k,v]) => `<option value="${k}">${v}</option>`).join('');
    cont.innerHTML = `
        <div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;border-radius:12px">
            <h4 style="margin:0 0 12px;font-size:14px;color:#0f172a" id="ej-form-titulo">➕ Nuevo ejercicio</h4>
            <div class="form-group"><label for="ej-titulo">Título</label><input type="text" id="ej-titulo" placeholder="Ej: Suma de fracciones"></div>
            <div class="form-group"><label for="ej-enunciado">Enunciado</label><textarea id="ej-enunciado" rows="2" placeholder="Ej: ¿Cuánto es 1/2 + 1/3?"></textarea></div>
            <div class="form-group"><label for="ej-tipo">Tipo</label><select id="ej-tipo" onchange="window._toggleEjOpcionesAdmin()"><option value="opcion_multiple">Opción múltiple</option><option value="verdadero_falso">Verdadero/Falso</option><option value="completar">Completar</option></select></div>
            <div class="form-group" id="ej-opciones-wrap"><label for="ej-opciones">Opciones (una por línea)</label><textarea id="ej-opciones" rows="3" placeholder="Opción A&#10;Opción B&#10;Opción C&#10;Opción D"></textarea></div>
            <div class="form-group"><label for="ej-respuesta">Respuesta correcta</label><input type="text" id="ej-respuesta" placeholder="Debe coincidir exactamente con una opción"></div>
            <div class="form-group"><label for="ej-explicacion">Explicación (opcional)</label><textarea id="ej-explicacion" rows="2" placeholder="Se muestra después de responder"></textarea></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <div class="form-group"><label for="ej-materia">Materia</label><select id="ej-materia">${materiaOpts}</select></div>
                <div class="form-group"><label for="ej-dif">Dificultad</label><select id="ej-dif"><option value="facil">Fácil</option><option value="medio" selected>Medio</option><option value="dificil">Difícil</option></select></div>
            </div>
            <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="ej-premium"> Es premium</label></div>
            <div style="display:flex;gap:8px">
                <button type="button" class="btn-subir" onclick="adminGuardarEjercicio()" id="ej-btn-guardar">➕ Crear ejercicio</button>
                <button type="button" class="btn-subir" onclick="adminCancelarEdicion()" id="ej-btn-cancelar" style="display:none;background:#94a3b8">Cancelar</button>
            </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <h4 style="font-size:14px;margin:0">Catálogo (${lista?.length||0} ejercicios)</h4>
            <select id="ej-filtro-materia-admin" onchange="renderAdminEjercicios()" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px">
                <option value="">Todas las materias</option>
                ${materiaOpts}
            </select>
        </div>
        <div id="ej-lista-admin"></div>`;
    // Render lista filtrada
    const filtro = document.getElementById("ej-filtro-materia-admin")?.value || '';
    const filtrada = filtro ? lista.filter(e => e.materia === filtro) : lista;
    const listaDiv = document.getElementById("ej-lista-admin");
    if (listaDiv) {
        listaDiv.innerHTML = filtrada.length ? filtrada.map(e => `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;background:white">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                <div style="flex:1;min-width:0">
                    <p style="font-size:14px;font-weight:700;margin:0 0 4px;color:#0f172a">${esc(e.titulo)}</p>
                    <p style="font-size:13px;margin:0 0 4px;color:#475569">${esc(e.enunciado)}</p>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
                        <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#eff6ff;color:#2563eb;font-weight:600">${MATERIAS[e.materia]||e.materia}</span>
                        <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#f1f5f9;color:#475569">${e.tipo}</span>
                        <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${e.dificultad==='facil'?'#dcfce7;color:#166534':e.dificultad==='medio'?'#fef9c3;color:#854d0e':'#fee2e2;color:#991b1b'}">${e.dificultad}</span>
                        ${e.es_premium?'<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#fef3c7;color:#92400e">⭐ Premium</span>':''}
                    </div>
                    <p style="font-size:11px;color:#16a34a;margin:4px 0 0">✓ Respuesta: ${esc(e.respuesta_correcta)}</p>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
                    <button type="button" onclick="adminEditarEjercicio('${e.id}')" style="padding:6px 12px;border:1px solid #e2e8f0;background:white;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#2563eb">✏️ Editar</button>
                    <button type="button" onclick="adminEliminarEjercicio('${e.id}')" style="padding:6px 12px;border:1px solid #fca5a5;background:#fef2f2;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#dc2626">🗑️ Eliminar</button>
                </div>
            </div>
        </div>`).join('') : '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:16px">No hay ejercicios. Creá el primero arriba.</p>';
    }
    window._toggleEjOpcionesAdmin();
}

window._toggleEjOpcionesAdmin = function() {
    const tipo = document.getElementById("ej-tipo")?.value;
    const wrap = document.getElementById("ej-opciones-wrap");
    if (wrap) wrap.style.display = tipo === 'opcion_multiple' ? 'block' : 'none';
};

async function adminGuardarEjercicio() {
    const titulo = sanitizar(document.getElementById("ej-titulo")?.value);
    const enunciado = sanitizar(document.getElementById("ej-enunciado")?.value);
    const tipo = document.getElementById("ej-tipo")?.value;
    const opcionesRaw = (document.getElementById("ej-opciones")?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
    const respuesta = sanitizar(document.getElementById("ej-respuesta")?.value);
    const explicacion = sanitizar(document.getElementById("ej-explicacion")?.value) || null;
    const materia = document.getElementById("ej-materia")?.value;
    const dif = document.getElementById("ej-dif")?.value;
    const premium = document.getElementById("ej-premium")?.checked || false;
    if (!titulo || !enunciado || !respuesta || !materia) return mostrarToast("Completá título, enunciado, respuesta y materia","warn");
    const obj = { titulo, enunciado, tipo, opciones: tipo==='opcion_multiple'?opcionesRaw:null, respuesta_correcta: respuesta, explicacion, materia, dificultad: dif, es_premium: premium };
    let result;
    if (_adminEjEditId) {
        result = await MA().sbActualizarEjercicioInteractivo(_adminEjEditId, obj);
    } else {
        result = await MA().sbCrearEjercicioInteractivo(obj);
    }
    if (result.error) return mostrarToast("Error: "+(result.error.message||result.error),"error");
    mostrarToast(_adminEjEditId ? "✅ Ejercicio actualizado" : "✅ Ejercicio creado","ok");
    _adminEjEditId = null;
    renderAdminEjercicios();
}

async function adminEditarEjercicio(id) {
    const todos = await MA().sbListarTodosEjercicios();
    const ej = todos.find(e => e.id === id);
    if (!ej) return;
    _adminEjEditId = id;
    document.getElementById("ej-titulo").value = ej.titulo || '';
    document.getElementById("ej-enunciado").value = ej.enunciado || '';
    document.getElementById("ej-tipo").value = ej.tipo || 'opcion_multiple';
    document.getElementById("ej-opciones").value = (ej.opciones||[]).join('\n');
    document.getElementById("ej-respuesta").value = ej.respuesta_correcta || '';
    document.getElementById("ej-explicacion").value = ej.explicacion || '';
    document.getElementById("ej-materia").value = ej.materia || '';
    document.getElementById("ej-dif").value = ej.dificultad || 'medio';
    document.getElementById("ej-premium").checked = ej.es_premium || false;
    document.getElementById("ej-form-titulo").textContent = '✏️ Editando ejercicio';
    document.getElementById("ej-btn-guardar").textContent = '💾 Guardar cambios';
    document.getElementById("ej-btn-cancelar").style.display = 'inline-block';
    window._toggleEjOpcionesAdmin();
    document.getElementById("ej-titulo").scrollIntoView({behavior:'smooth'});
}

function adminCancelarEdicion() {
    _adminEjEditId = null;
    document.getElementById("ej-form-titulo").textContent = '➕ Nuevo ejercicio';
    document.getElementById("ej-btn-guardar").textContent = '➕ Crear ejercicio';
    document.getElementById("ej-btn-cancelar").style.display = 'none';
    ['ej-titulo','ej-enunciado','ej-opciones','ej-respuesta','ej-explicacion'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
}

async function adminEliminarEjercicio(id) {
    if (!confirm("¿Eliminar este ejercicio?")) return;
    await MA().sbBorrarEjercicioInteractivo(id);
    mostrarToast("🗑️ Ejercicio eliminado","ok");
    renderAdminEjercicios();
}

// ============ TRADUCCIÓN ERRORES ============
function traducirError(msg) {
    if (!msg) return "Error desconocido.";
    const m = msg.toLowerCase();
    if (m.includes("invalid login")) return "Email o contraseña incorrectos.";
    if (m.includes("email not confirmed")) return "Confirmá tu email primero.";
    if (m.includes("user already registered")) return "Ese email ya está registrado.";
    if (m.includes("password should be at least")) return "Contraseña muy corta.";
    if (m.includes("rate limit")) return "Demasiados intentos. Esperá unos minutos.";
    if (m.includes("network")) return "Error de red.";
    return msg;
}


// ============ TESTIMONIOS (ELIMINADO) ============

// ============ BOOT ============
document.addEventListener("DOMContentLoaded", function () {
    iniciarMonitoreoSesion();
    inicializarSistema();
    // Contador dinámico de estudiantes
    (async function(){
        try {
            const { count } = await MA().sb.from("perfiles").select("*", { count: "exact", head: true });
            const el = document.getElementById("stat-estudiantes");
            if (el && count) el.textContent = count + "+";
        } catch(e){}
    })();

    // ── Detectar retorno desde MercadoPago ──
    const _urlParams = new URLSearchParams(window.location.search);
    const _estadoPago = _urlParams.get("pago");
    const _planPago   = _urlParams.get("plan");
    if (_estadoPago === "ok") {
        history.replaceState({}, "", window.location.pathname);
        setTimeout(async () => {
            await inicializarSistema();
            mostrarToast(
                `🎉 ¡Plan ${_planPago === "premium" ? "Premium" : "Básico"} activado! Ya tenés acceso completo.`,
                "ok"
            );
        }, 2500);
    } else if (_estadoPago === "pendiente") {
        mostrarToast("⏳ Tu pago está pendiente de acreditación. Se activará automáticamente.", "info");
    } else if (_estadoPago === "error") {
        mostrarToast("❌ El pago no se completó. Podés intentarlo de nuevo.", "error");
    }
});



// ============ BANNER DE QUOTA EXCEDIDA ============
function mostrarBannerQuota(tipo) {
    const modal = document.getElementById("modal-visor");
    document.getElementById("visor-titulo").textContent = "Llegaste al límite diario";
    const tipoTxt = tipo === "archivo" ? "archivos públicos" : "usos de la calculadora";
    document.getElementById("visor-cuerpo").innerHTML = `
        <div class="quota-banner">
            <h4>⏱️ Llegaste al límite gratuito de hoy</h4>
            <p>Como usuario gratis podés ver hasta <strong>3 ${tipoTxt} por semana</strong>. Se reinicia automáticamente cada 7 días.</p>
            <p><strong>¿Querés acceso ilimitado ahora?</strong></p>
            <button type="button" onclick="document.getElementById('modal-visor').style.display='none';abrirModalPago()" style="background:linear-gradient(135deg,#f59e0b,#dc2626);color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">⭐ Ver planes</button>
        </div>`;
    modal.style.display = "flex";
}

// ============ FAB DE CONTACTO ============
function toggleFabContacto() {
    const btn  = document.getElementById("fab-contacto-btn");
    const menu = document.getElementById("fab-menu-contacto");
    if (!btn || !menu) return;
    const abierto = menu.classList.toggle("open");
    btn.classList.toggle("abierto", abierto);
    btn.textContent = abierto ? "✕" : "💬";
}
// Cerrar el FAB al clickear fuera
document.addEventListener("click", (e) => {
    const menu = document.getElementById("fab-menu-contacto");
    const btn  = document.getElementById("fab-contacto-btn");
    if (!menu || !btn) return;
    if (!menu.contains(e.target) && !btn.contains(e.target) && menu.classList.contains("open")) {
        menu.classList.remove("open");
        btn.classList.remove("abierto");
        btn.textContent = "💬";
    }
});


// ============ BLOQUEAR Ctrl+S / Ctrl+P / clic derecho cuando hay modal visor abierto ============
function bloquearAtajosImpresion(e) {
    const visorAbierto = document.getElementById("modal-visor")?.style.display === "flex";
    if (!visorAbierto) return;
    // Solo si el archivo en visor no es personal (creado por el propio user)
    if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.key === "p" || e.key === "P")) {
        e.preventDefault();
        mostrarToast("🔒 Este contenido no se puede guardar ni imprimir", "warn");
    }
}
document.addEventListener("keydown", bloquearAtajosImpresion);
document.addEventListener("contextmenu", function(e){
    // Bloquear clic derecho dentro del visor cuando hay marca de agua activa
    const visor = document.getElementById("modal-visor");
    if (visor && visor.classList.contains("con-marca-agua") && visor.contains(e.target)) {
        e.preventDefault();
        mostrarToast("🔒 Contenido protegido", "warn");
    }
}, true);


async function iniciarPagoMP(plan, btn) {
    // Verificar que el usuario está logueado
    if (!appState.perfilActual) {
        mostrarToast("Iniciá sesión primero para poder pagar", "warn");
        document.getElementById("overlay-auth").style.display = "flex";
        return;
    }

    // Deshabilitar botón mientras se genera el link
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Generando link de pago..."; }

    try {
        // Intentar generar link dinámico (asocia pago → usuario automáticamente)
        const res = await window.MA_SUPABASE.sbCrearPreferencia(plan);

        if (res.init_point) {
            window.open(res.init_point, "_blank", "noopener");
            mostrarToast("Tu plan se activará automáticamente cuando se confirme el pago ✅", "ok");
        } else {
            console.warn("Preferencia fallida:", res.error);
            mostrarToast("Error generando el link de pago. Probá de nuevo.", "warn");
        }
    } catch (err) {
        console.error("Error en pago:", err);
        mostrarToast("Error al procesar el pago. Probá de nuevo.", "warn");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "💳 Pagar con MercadoPago";
        }
    }
}


function verificarRetornoPago() {
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    if (!pago) return;
    // Limpiar URL sin recargar
    history.replaceState({}, "", window.location.pathname + window.location.hash);
    if (pago === "ok") {
        mostrarToast("¡Pago recibido! Tu plan se activará en unos segundos ✅", "ok");
        // Refrescar estado tras unos segundos para que el webhook haya procesado
        setTimeout(async () => {
            await refrescarEstado();
            actualizarNavbar();
            renderSeccionPremium();
            mostrarToast("Plan activado. ¡Disfrutá de Matemáticas Activa! 🎉", "ok");
        }, 5000);
    } else if (pago === "error") {
        mostrarToast("Hubo un problema con el pago. Intentá de nuevo.", "warn");
    } else if (pago === "pendiente") {
        mostrarToast("Tu pago está pendiente de acreditación. Te activamos el plan cuando se confirme ⏳", "info");
    }
}

function accesoAdminPorHash() {
    const h = (location.hash||"").toLowerCase();
    if (h!=="#admin" && h!=="#panel") return;
    if (appState.perfilActual?.rol==="admin") {
        abrirAdmin();
    } else if (!appState.perfilActual) {
        document.getElementById("overlay-auth").style.display="flex";
        mostrarForm("form-admin");
    } else {
        mostrarToast("Esta cuenta no tiene permisos de administrador","warn");
    }
}
window.addEventListener("hashchange", accesoAdminPorHash);

// ============ EXAMEN DE DIAGNÓSTICO ============
let _diagState = { preguntas: [], actual: 0, respuestas: [], activo: false };

async function iniciarDiagnostico(e) {
    if (e) e.preventDefault();
    if (!appState.perfilActual) { abrirAuth(); return; }
    const section = document.getElementById("diagnostico");
    const cont = document.getElementById("diagnostico-container");
    if (!section || !cont) return;
    section.style.display = "block";
    section.scrollIntoView({ behavior: "smooth" });
    cont.innerHTML = '<p style="text-align:center;padding:2rem;color:#64748b">⏳ Cargando preguntas...</p>';

    // Cargar ejercicios de todas las materias
    const todos = await MA().sbListarTodosEjercicios();
    if (todos.length < 5) {
        cont.innerHTML = '<p style="text-align:center;padding:2rem;color:#dc2626">No hay suficientes ejercicios para el diagnóstico. El admin debe cargar ejercicios primero.</p>';
        return;
    }
    // Seleccionar 20 aleatorias (o todas si hay menos)
    const shuffled = todos.sort(() => Math.random() - 0.5);
    const preguntas = shuffled.slice(0, Math.min(20, shuffled.length));
    _diagState = { preguntas, actual: 0, respuestas: [], activo: true };
    renderDiagPregunta();
}

function renderDiagPregunta() {
    const cont = document.getElementById("diagnostico-container");
    const { preguntas, actual } = _diagState;
    if (actual >= preguntas.length) { finalizarDiagnostico(); return; }
    const ej = preguntas[actual];
    const total = preguntas.length;
    const progreso = Math.round((actual / total) * 100);
    const matNombre = MATERIAS[ej.materia] || ej.materia;

    cont.innerHTML = `
        <div class="diag-progress-wrap">
            <div class="diag-progress-bar" style="width:${progreso}%"></div>
        </div>
        <p class="diag-counter">${actual + 1} de ${total} · <span class="diag-materia-tag">${esc(matNombre)}</span></p>
        <div class="diag-card">
            <span class="diag-dificultad ${ej.dificultad}">${ej.dificultad}</span>
            <h3 class="diag-titulo">${esc(ej.titulo)}</h3>
            <p class="diag-enunciado">${esc(ej.enunciado)}</p>
            <div class="diag-opciones" id="diag-opciones">
                ${renderDiagOpciones(ej)}
            </div>
            <button type="button" class="diag-btn-siguiente" id="diag-btn-next" onclick="window.diagSiguiente()">Siguiente →</button>
        </div>`;
}

function renderDiagOpciones(ej) {
    if (ej.tipo === 'opcion_multiple') {
        return (ej.opciones || []).map((op, i) =>
            `<label class="diag-opcion"><input type="radio" name="diag-resp" value="${esc(op)}"><span>${esc(op)}</span></label>`
        ).join("");
    }
    if (ej.tipo === 'verdadero_falso') {
        return `<label class="diag-opcion"><input type="radio" name="diag-resp" value="Verdadero"><span>Verdadero</span></label>
                <label class="diag-opcion"><input type="radio" name="diag-resp" value="Falso"><span>Falso</span></label>`;
    }
    return `<input type="text" class="diag-input" id="diag-input-completar" placeholder="Tu respuesta…">`;
}

function diagSiguiente() {
    const ej = _diagState.preguntas[_diagState.actual];
    let respuesta = '';
    if (ej.tipo === 'completar') {
        respuesta = (document.getElementById('diag-input-completar')?.value || '').trim();
    } else {
        const checked = document.querySelector('input[name="diag-resp"]:checked');
        if (!checked) { mostrarToast("Seleccioná una respuesta", "warn"); return; }
        respuesta = checked.value;
    }
    if (!respuesta) { mostrarToast("Escribí tu respuesta", "warn"); return; }
    const correcto = respuesta.toLowerCase().trim() === (ej.respuesta_correcta || '').toLowerCase().trim();
    _diagState.respuestas.push({ ejercicio_id: ej.id, materia: ej.materia, respuesta, correcto });
    // Gamificación: celebraciones, vidas, XP
    if (window.MA_GAME) window.MA_GAME.onRespuestaEjercicio(correcto, 10);
    _diagState.actual++;
    renderDiagPregunta();
}

async function finalizarDiagnostico() {
    const cont = document.getElementById("diagnostico-container");
    const { preguntas, respuestas } = _diagState;
    _diagState.activo = false;

    // Calcular resultados por materia
    const porMateria = {};
    respuestas.forEach(r => {
        if (!porMateria[r.materia]) porMateria[r.materia] = { total: 0, correctas: 0 };
        porMateria[r.materia].total++;
        if (r.correcto) porMateria[r.materia].correctas++;
    });
    Object.keys(porMateria).forEach(m => {
        const d = porMateria[m];
        d.porcentaje = Math.round((d.correctas / d.total) * 100);
        d.nivel = d.porcentaje >= 80 ? 'avanzado' : d.porcentaje >= 50 ? 'intermedio' : 'básico';
    });
    const totalCorrectas = respuestas.filter(r => r.correcto).length;
    const porcentaje = Math.round((totalCorrectas / preguntas.length) * 100);
    const nivelGeneral = porcentaje >= 80 ? 'avanzado' : porcentaje >= 50 ? 'intermedio' : 'básico';
    const resultado = { materias: porMateria, nivel_general: nivelGeneral };

    // Guardar en Supabase
    await MA().sbGuardarDiagnostico(respuestas, resultado, preguntas.length, totalCorrectas, porcentaje);
    // Verificar logros post-diagnóstico
    setTimeout(() => verificarYNotificarLogros(), 500);

    // Render resultado
    const nivelesEmoji = { avanzado: '🟢', intermedio: '🟡', 'básico': '🔴' };
    const materiasHtml = Object.entries(porMateria).sort((a,b) => b[1].porcentaje - a[1].porcentaje).map(([m, d]) => {
        const nombre = MATERIAS[m] || m;
        return `<div class="diag-materia-row">
            <span class="diag-materia-nombre">${nombre}</span>
            <div class="diag-materia-bar-wrap"><div class="diag-materia-bar" style="width:${d.porcentaje}%;background:${d.porcentaje >= 80 ? '#16a34a' : d.porcentaje >= 50 ? '#f59e0b' : '#dc2626'}"></div></div>
            <span class="diag-materia-pct">${d.porcentaje}%</span>
            <span class="diag-materia-nivel">${nivelesEmoji[d.nivel]} ${d.nivel}</span>
        </div>`;
    }).join("");

    const fuertes = Object.entries(porMateria).filter(([,d]) => d.nivel === 'avanzado').map(([m]) => MATERIAS[m] || m);
    const reforzar = Object.entries(porMateria).filter(([,d]) => d.nivel === 'básico').map(([m]) => MATERIAS[m] || m);

    cont.innerHTML = `
        <div class="diag-resultado">
            <div class="diag-resultado-header">
                <div class="diag-resultado-score">${porcentaje}%</div>
                <div>
                    <h3>Nivel general: <span class="diag-nivel-tag ${nivelGeneral}">${nivelesEmoji[nivelGeneral]} ${nivelGeneral.charAt(0).toUpperCase() + nivelGeneral.slice(1)}</span></h3>
                    <p>${totalCorrectas} de ${preguntas.length} correctas</p>
                </div>
            </div>
            <h4 style="margin:20px 0 10px;font-size:15px;font-weight:700">Resultado por materia</h4>
            <div class="diag-materias-grid">${materiasHtml}</div>
            ${fuertes.length ? `<div class="diag-resumen fuertes"><strong>💪 Materias fuertes:</strong> ${fuertes.join(", ")}</div>` : ''}
            ${reforzar.length ? `<div class="diag-resumen reforzar"><strong>📖 A reforzar:</strong> ${reforzar.join(", ")}</div>` : ''}
            <button type="button" class="diag-btn-repetir" onclick="window.iniciarDiagnostico()">🔄 Repetir diagnóstico</button>
        </div>`;
}

// ============ LOGROS / INSIGNIAS ============
async function renderLogrosEnPerfil() {
    const grid = document.getElementById("perfil-logros-grid");
    if (!grid) return;
    grid.innerHTML = '<p style="font-size:13px;color:#94a3b8;text-align:center">Cargando...</p>';

    const [todosLogros, misLogros] = await Promise.all([
        MA().sbListarLogros(),
        MA().sbObtenerLogrosUsuario()
    ]);
    const desbloqueadosSet = new Set(misLogros.map(l => l.logro_id));

    if (!todosLogros.length) {
        grid.innerHTML = '<p style="font-size:13px;color:#94a3b8;text-align:center">No hay logros disponibles aún.</p>';
        return;
    }

    grid.innerHTML = todosLogros.map(logro => {
        const desbloqueado = desbloqueadosSet.has(logro.id);
        const fecha = misLogros.find(l => l.logro_id === logro.id)?.desbloqueado_en;
        return `<div class="logro-card ${desbloqueado ? 'desbloqueado' : 'bloqueado'}">
            <span class="logro-icono">${logro.icono}</span>
            <strong class="logro-nombre">${esc(logro.nombre)}</strong>
            <small class="logro-desc">${esc(logro.descripcion)}</small>
            ${desbloqueado ? `<span class="logro-fecha">${formatearFecha(fecha)}</span>` : '<span class="logro-lock">🔒</span>'}
            ${logro.puntos_bonus > 0 ? `<span class="logro-bonus">+${logro.puntos_bonus} pts</span>` : ''}
        </div>`;
    }).join("");
}

async function cargarNotifConfig() {
    const config = await MA().sbObtenerNotifConfig();
    if (config) {
        document.getElementById("notif-inactividad").checked = config.email_inactividad;
        document.getElementById("notif-logros").checked = config.email_logros;
        document.getElementById("notif-novedades").checked = config.email_novedades;
    }
}

async function guardarNotifConfig() {
    const config = {
        email_inactividad: document.getElementById("notif-inactividad").checked,
        email_logros: document.getElementById("notif-logros").checked,
        email_novedades: document.getElementById("notif-novedades").checked
    };
    const { error } = await MA().sbGuardarNotifConfig(config);
    if (error) { mostrarToast("Error guardando preferencias", "error"); return; }
    mostrarToast("Preferencias guardadas ✓", "ok");
}

function mostrarLogroPopup(logroUsuario) {
    const logro = logroUsuario.logros;
    if (!logro) return;
    const popup = document.getElementById("logro-popup");
    if (!popup) return;
    document.getElementById("logro-popup-icon").textContent = logro.icono;
    document.getElementById("logro-popup-nombre").textContent = logro.nombre;
    document.getElementById("logro-popup-desc").textContent = logro.descripcion;
    popup.style.display = "flex";
    popup.classList.add("logro-animando");
    // Auto-cerrar en 5 segundos
    clearTimeout(popup._timer);
    popup._timer = setTimeout(() => {
        popup.classList.remove("logro-animando");
        popup.style.display = "none";
    }, 5000);
}

async function verificarYNotificarLogros() {
    if (!appState.perfilActual) return;
    try {
        const nuevos = await MA().sbVerificarLogros();
        if (nuevos?.length) {
            // Mostrar popup para el primer logro nuevo
            mostrarLogroPopup(nuevos[0]);
            // Actualizar puntos en perfil
            await refrescarEstado();
            actualizarNavbar();
        }
    } catch (e) { console.warn("Error verificando logros:", e); }
}

// ============ HOOK: verificar logros después de acciones clave ============
const _origResponderEj = window.MA_SUPABASE?.sbResponderEjercicioInteractivo;
// Se hookea después del login y tras cada acción relevante

// Expose
Object.assign(window, {
    buscarContenido, resetSesionTimer, cerrarSesion, abrirAuth, abrirAdmin, abrirPerfil, abrirMisArchivos,
    mostrarForm, usuarioLogin, usuarioRegistro, adminLogin, enviarOlvideContrasena, setearPasswordRecovery,
    guardarUsername, cambiarMiPassword,
    adminTab, actualizarCampoArchivo, subirContenido, subirMiArchivo,
    verContenido, abrirEdicion, guardarEdicion, eliminarArchivo, eliminarUsuario,
    activarPlan, desactivarSuscripcion,
    usuarioVerArchivo, abrirModalPago,
    enviarComentario, borrarComentario,
    adminResetPassword, adminAsignarPasswordTemp,
    adminGuardarEjercicio, adminEditarEjercicio, adminEliminarEjercicio, adminCancelarEdicion,
    iniciarPagoMP, toggleFabContacto, cerrarOverlaySiClick,
    iniciarDiagnostico, diagSiguiente,
    renderLogrosEnPerfil, guardarNotifConfig, verificarYNotificarLogros
});
