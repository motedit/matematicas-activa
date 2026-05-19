// ================================================================
//  MATEMÁTICAS ACTIVA — scripts.js v3 (Supabase + features)
// ================================================================

const PRECIO_SUSCRIPCION = "$ 10.000";
const MONEDA             = "ARS / mes";
const DURACION_DIAS      = 30;
const LINK_MERCADOPAGO   = "https://mpago.la/29qTXgw";
const LINK_NARANJAX      = "https://mpago.la/29qTXgw";
window.PRECIO_SUSCRIPCION = PRECIO_SUSCRIPCION;

const SEG = { SESION_TIMEOUT_MIN: 30, PASS_MIN_LENGTH: 6 };
const MAX_ARCHIVOS_GRATIS = 3;
const MAX_FILE_SIZE       = 50 * 1024 * 1024;
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
function buscarContenido() {
    const input = sanitizar(document.getElementById("buscador").value).toLowerCase();
    const cont = document.getElementById("lista-contenidos"); if (!cont) return;
    [...cont.getElementsByTagName("a")].forEach(a => {
        const visible = a.innerText.toLowerCase().includes(input);
        const t = a.parentElement?.tagName === "LI" ? a.parentElement : a;
        t.style.display = visible ? "" : "none";
    });
}

// ============ PREMIUM helpers ============
function esPremiumActivo(p) { return p?.premium_hasta && new Date(p.premium_hasta).getTime() > Date.now(); }
function diasRestantes(p) {
    if (!p?.premium_hasta) return 0;
    const ms = new Date(p.premium_hasta).getTime() - Date.now();
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
    actualizarNavbar();
    renderSeccionVideos();
    renderSeccionPDFs();
    renderSeccionPremium();
    renderSeccionMisArchivos();
    renderRankingPublico();
    if (appState.perfilActual) resetSesionTimer();
    initSelectoresTemas();

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

    if (lbl) lbl.textContent = p ? (p.username || "Mi cuenta") : "Ingresar";
    if (navAdmin)  navAdmin.style.display  = (p?.rol === "admin") ? "inline" : "none";
    if (navSalir)  navSalir.style.display  = p ? "inline" : "none";
    if (navPerfil) navPerfil.style.display = p ? "inline" : "none";
    if (navMisArchivos) navMisArchivos.style.display = p ? "inline" : "none";
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
function abrirPerfil(e) {
    if (e) e.preventDefault();
    if (!appState.perfilActual) return abrirAuth();
    document.getElementById("perfil-username").value = appState.perfilActual.username || "";
    document.getElementById("perfil-email-display").textContent = (appState.perfilActual.id ? "ID: " + appState.perfilActual.id.slice(0,8) + "..." : "");
    document.getElementById("perfil-puntos-display").textContent = `⭐ ${appState.perfilActual.puntos || 0} puntos · 🔥 racha ${appState.perfilActual.racha || 0} días`;
    document.getElementById("pf-error").textContent = "";
    document.getElementById("pf-success").textContent = "";
    document.getElementById("modal-perfil").style.display = "flex";
}
function abrirMisArchivos(e) {
    if (e) e.preventDefault();
    if (!appState.perfilActual) return abrirAuth();
    renderSeccionMisArchivos();
    document.getElementById("mis-archivos-section")?.scrollIntoView({ behavior: "smooth" });
}
function cerrarOverlaySiClick(e, id) { if (e.target.id === id) document.getElementById(id).style.display = "none"; }
function mostrarForm(id) {
    ["auth-selector","form-login","form-registro","form-admin","form-olvide"].forEach(f => {
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
    const username = sanitizar(document.getElementById("re-user").value);
    const email    = sanitizar(document.getElementById("re-email").value);
    const pass     = document.getElementById("re-pass").value;
    const pass2    = document.getElementById("re-pass2").value;
    if (!validarUsuario(username)) return mostrarError("re-error","Usuario 3-40 caracteres alfanuméricos.");
    if (!validarEmail(email))      return mostrarError("re-error","Email inválido.");
    if (pass.length < SEG.PASS_MIN_LENGTH) return mostrarError("re-error",`Contraseña mínimo ${SEG.PASS_MIN_LENGTH} caracteres.`);
    if (pass !== pass2)            return mostrarError("re-error","Las contraseñas no coinciden.");
    if (!MA()?.sb)                 return mostrarError("re-error","Supabase no configurado.");
    const { data, error } = await MA().sbRegistro({ email, password: pass, username });
    if (error) return mostrarError("re-error", traducirError(error.message));
    if (data?.user && !data?.session) mostrarExito("re-success","✅ Cuenta creada. Revisá tu email para confirmar.");
    else { mostrarExito("re-success","✅ Cuenta creada."); setTimeout(()=>document.getElementById("overlay-auth").style.display="none", 1500); }
    ["re-user","re-email","re-pass","re-pass2"].forEach(id=>document.getElementById(id).value="");
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
    const lista = appState.archivos.filter(a => (!fSec || a.seccion===fSec) && (!fMat || a.materia===fMat));
    if (!lista.length) { grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:40px">No hay archivos.</p>`; return; }
    grid.innerHTML = lista.map(a => `
        <div class="admin-card">
            <div class="admin-card-mini">${miniPreview(a)}</div>
            <div class="admin-card-body">
                <span class="seccion-tag seccion-${a.seccion}">${etiquetaSeccion(a.seccion)}</span>
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
        const premium = esPremiumActivo(p);
        const dias = diasRestantes(p);
        return `<div class="usuario-card">
            <div class="usuario-info">
                <h4>👤 ${esc(p.username||"(sin username)")} ${p.rol==="admin"?'<span style="background:#7c3aed;color:white;padding:2px 8px;border-radius:99px;font-size:11px">ADMIN</span>':""}</h4>
                <p style="font-size:12px;color:#64748b">Creado: ${formatearFecha(p.creado_en)} · ⭐ ${p.puntos||0} pts · 🔥 racha ${p.racha||0}</p>
                <p style="font-size:13px">${premium ? `⭐ Premium · ${dias} días (hasta ${formatearFecha(p.premium_hasta)})` : "🆓 Plan gratis"}</p>
            </div>
            <div class="usuario-actions">
                ${premium
                    ? `<button type="button" onclick="renovarSuscripcion('${p.id}')">🔁 Renovar +30d</button>
                       <button type="button" onclick="desactivarSuscripcion('${p.id}')" class="btn-rojo">❌ Desactivar</button>`
                    : `<button type="button" onclick="activarSuscripcion('${p.id}')">⭐ Activar Premium</button>`}
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
                     materia:"su-materia", seccion:"su-seccion", tema:"su-tema", error:"su-error", success:"su-success", progress:"su-progress", progressFill:"su-progress-fill" },
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
    if (!titulo) return mostrarError(prefixIds.error, "Ingresá un título.");
    const tema_id = get(prefixIds.tema)?.value || null;
    let meta = { titulo, descripcion:desc, materia, seccion, tipo, creado_por: appState.perfilActual.id, es_personal: esPersonal };
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
    document.getElementById("ed-seccion").value=a.seccion||"video";
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

// ============ PREMIUM (acciones) ============
async function activarSuscripcion(uid) {
    const { error } = await MA().sbActivarPremium(uid, DURACION_DIAS, "activacion");
    if (error) return mostrarToast("Error: "+(error.message||error),"error");
    mostrarToast(`⭐ Premium +${DURACION_DIAS}d`,"ok"); renderAdminUsuarios();
}
async function renovarSuscripcion(uid) {
    const { error } = await MA().sbActivarPremium(uid, DURACION_DIAS, "renovacion");
    if (error) return mostrarToast("Error: "+(error.message||error),"error");
    mostrarToast(`🔁 Renovado +${DURACION_DIAS}d`,"ok"); renderAdminUsuarios();
}
async function desactivarSuscripcion(uid) {
    if (!confirm("¿Desactivar premium?")) return;
    const { error } = await MA().sbDesactivarPremium(uid);
    if (error) return mostrarToast("Error: "+(error.message||error),"error");
    mostrarToast("❌ Desactivado","ok"); renderAdminUsuarios();
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
            if (mt.startsWith("image/")) contenidoHtml = `<img src="${url}" alt="${esc(a.titulo)}" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px">`;
            else if (mt.startsWith("video/")) contenidoHtml = `<video src="${url}" controls style="width:100%;border-radius:8px"></video>`;
            else if (mt === "application/pdf") contenidoHtml = `<iframe src="${url}" style="width:100%;height:70vh;border:0;border-radius:8px"></iframe>`;
            else contenidoHtml = `<p style="text-align:center;padding:20px"><a href="${url}" download="${esc(a.nombre_archivo||a.titulo)}" class="btn-pago-mp" style="display:inline-block">⬇ Descargar ${esc(a.nombre_archivo||a.titulo)}</a></p>`;
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
    if (a.seccion === "premium") {
        if (esPremiumActivo(appState.perfilActual)) return verContenido(id);
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
        banner = `<div class="premium-banner-estado banner-activo">
            <h3 style="color:#fde68a;margin:0 0 6px">⭐ Sos usuario PREMIUM</h3>
            <p style="color:rgba(255,255,255,.9);margin:0">Te quedan <strong>${diasRestantes(p)} días</strong> de acceso completo (hasta ${formatearFecha(p.premium_hasta)}).</p>
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
                <li>✅ 3 archivos públicos por día</li>
                <li>✅ 3 usos de calculadora/graficadora por día</li>
                <li>✅ Acceso al ranking</li>
                <li>⏱️ Renovación cada 24hs</li>
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
            <ul class="plan-features">
                <li>✅ <strong>Acceso ilimitado</strong> a archivos premium</li>
                <li>✅ <strong>Calculadora/graficadora sin límite</strong></li>
                <li>✅ Sistema de puntos y ranking</li>
                <li>✅ Comentarios en todo el contenido</li>
                <li>❌ No podés subir archivos personales</li>
            </ul>
            <a class="plan-btn plan-btn-basico" href="https://wa.me/5493827654154?text=Hola%21%20Quiero%20suscribirme%20al%20PLAN%20B%C3%81SICO%20%28%247.000%29%20de%20Matem%C3%A1ticas%20Activa.%20Mi%20usuario%20es%3A%20" target="_blank" rel="noopener">📩 Suscribirme por WhatsApp</a>
        </div>
        <div class="plan-card plan-card-premium">
            <div class="plan-tag" style="background:linear-gradient(135deg,#f59e0b,#dc2626)">⭐ PREMIUM</div>
            <h3>Plan Premium</h3>
            <p class="plan-precio">$ 12.000</p>
            <p class="plan-sub">30 días de acceso completo</p>
            <ul class="plan-features">
                <li>✅ <strong>Todo lo del plan Básico</strong></li>
                <li>✅ <strong>30 días</strong> (vs 23 del básico)</li>
                <li>✅ <strong>Cargar tus propios PDFs y videos</strong></li>
                <li>✅ Carpeta personal ilimitada</li>
                <li>✅ Soporte prioritario</li>
            </ul>
            <a class="plan-btn plan-btn-premium" href="https://wa.me/5493827654154?text=Hola%21%20Quiero%20suscribirme%20al%20PLAN%20PREMIUM%20%28%2412.000%29%20de%20Matem%C3%A1ticas%20Activa.%20Mi%20usuario%20es%3A%20" target="_blank" rel="noopener">⭐ Suscribirme por WhatsApp</a>
        </div>
    </div>
    <div style="background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.4);border-radius:12px;padding:14px 18px;margin-top:18px;text-align:center;color:#fde68a">
        <p style="margin:0;font-size:13px"><strong>📋 ¿Cómo suscribirte?</strong> Apretá "Suscribirme por WhatsApp" del plan que quieras. Te pasamos los datos para pagar y, una vez hecho el pago, mandás el comprobante con tu nombre de usuario. La activación es en pocos minutos. <a href="guia-pago.html" target="_blank" style="color:#fde68a;text-decoration:underline">Ver guía completa →</a></p>
    </div>
    `;

    info.innerHTML = banner + planesHtml;

    // === Grid de contenido premium (solo si hay) ===
    const premium = appState.archivosPublicos.filter(a => a.seccion==="premium");
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
async function renderAdminEjercicios() {
    const cont = document.getElementById("admin-ejercicios-lista"); if (!cont) return;
    const { data: lista } = await MA().sb.from("ejercicios_diarios").select("*").order("creado_en", { ascending: false });
    cont.innerHTML = `
        <div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:10px">
            <h4 style="margin:0 0 12px;font-size:14px;color:#0f172a">➕ Agregar ejercicio</h4>
            <div class="form-group"><label for="ej-pregunta">Pregunta</label><input type="text" id="ej-pregunta" placeholder="Ej: ¿Cuánto es 12 × 7?"></div>
            <div class="form-group"><label for="ej-respuesta">Respuesta correcta</label><input type="text" id="ej-respuesta" placeholder="Ej: 84"></div>
            <div class="form-group"><label for="ej-pista">Pista (opcional)</label><input type="text" id="ej-pista" placeholder="Ej: descomponé en 10×7 + 2×7"></div>
            <div class="form-group"><label for="ej-dif">Dificultad</label><select id="ej-dif"><option value="facil">Fácil</option><option value="medio" selected>Medio</option><option value="dificil">Difícil</option></select></div>
            <button type="button" class="btn-subir" onclick="adminCrearEjercicio()">➕ Crear ejercicio</button>
        </div>
        <h4 style="font-size:14px;margin:0 0 8px">Catálogo (${lista?.length||0} ejercicios)</h4>
        ${(lista||[]).map(e => `<div style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px">
            <p style="font-size:13px;margin:0 0 4px"><strong>${esc(e.pregunta)}</strong> → <span style="color:#16a34a">${esc(e.respuesta)}</span></p>
            <p style="font-size:11px;color:#64748b;margin:0">Dificultad: ${e.dificultad}${e.pista?" · Pista: "+esc(e.pista):""}</p>
        </div>`).join("") || "<p style='color:#94a3b8;font-size:13px'>Aún no hay ejercicios. Agregá el primero arriba.</p>"}`;
}
async function adminCrearEjercicio() {
    const pregunta = sanitizar(document.getElementById("ej-pregunta").value);
    const respuesta = sanitizar(document.getElementById("ej-respuesta").value);
    const pista = sanitizar(document.getElementById("ej-pista").value);
    const dif = document.getElementById("ej-dif").value;
    if (!pregunta || !respuesta) return mostrarToast("Completá pregunta y respuesta","warn");
    const { error } = await MA().sbCrearEjercicio(pregunta, respuesta, pista, dif);
    if (error) return mostrarToast("Error: "+error.message,"error");
    mostrarToast("✅ Ejercicio creado","ok");
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

// ============ BOOT ============
document.addEventListener("DOMContentLoaded", function () {
    iniciarMonitoreoSesion();
    inicializarSistema();
});



// ============ BANNER DE QUOTA EXCEDIDA ============
function mostrarBannerQuota(tipo) {
    const modal = document.getElementById("modal-visor");
    document.getElementById("visor-titulo").textContent = "Llegaste al límite diario";
    const tipoTxt = tipo === "archivo" ? "archivos públicos" : "usos de la calculadora";
    document.getElementById("visor-cuerpo").innerHTML = `
        <div class="quota-banner">
            <h4>⏱️ Llegaste al límite gratuito de hoy</h4>
            <p>Como usuario gratis podés ver hasta <strong>3 ${tipoTxt} por día</strong>. Se reinicia automáticamente en las próximas 24hs.</p>
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

// Expose
Object.assign(window, {
    buscarContenido, resetSesionTimer, cerrarSesion, abrirAuth, abrirAdmin, abrirPerfil, abrirMisArchivos,
    mostrarForm, usuarioLogin, usuarioRegistro, adminLogin, enviarOlvideContrasena, setearPasswordRecovery,
    guardarUsername, cambiarMiPassword,
    adminTab, actualizarCampoArchivo, subirContenido, subirMiArchivo,
    verContenido, abrirEdicion, guardarEdicion, eliminarArchivo, eliminarUsuario,
    activarSuscripcion, renovarSuscripcion, desactivarSuscripcion,
    usuarioVerArchivo, abrirModalPago, cerrarOverlaySiClick, toggleFabContacto, mostrarBannerQuota, cargarTemasParaMateria,
    enviarComentario, borrarComentario,
    adminResetPassword, adminAsignarPasswordTemp, adminCrearEjercicio,
});
