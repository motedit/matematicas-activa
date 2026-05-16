// ================================================================
//  MATEMÁTICAS ACTIVA — scripts.js
//  Seguridad: SHA-256 hashing · Bloqueo por intentos fallidos
//             Timeout de sesión · Sanitización · Rate limiting
// ================================================================

// ================================================================
//  ⚙️  CONFIGURACIÓN DE PAGOS
// ================================================================
const PRECIO_SUSCRIPCION = "$ 10.000";
const MONEDA             = "ARS / mes";
const DURACION_DIAS      = 30;
const LINK_MERCADOPAGO   = "https://mpago.la/29qTXgw";
const LINK_NARANJAX      = "https://mpago.la/29qTXgw";
// ================================================================

// ================================================================
//  🔐  CONFIGURACIÓN DE SEGURIDAD
// ================================================================
const SEG = {
    MAX_INTENTOS_LOGIN   : 5,       // Intentos antes de bloquear
    BLOQUEO_MINUTOS      : 15,      // Minutos bloqueado tras agotar intentos
    SESION_TIMEOUT_MIN   : 6,       // Minutos de inactividad para cerrar sesión
    PASS_MIN_LENGTH      : 6,       // Largo mínimo de contraseña para nuevos usuarios
    SALT                 : "MA_2025_SALT_#9k!",   // Salt para el hash (no cambiar)
};
// ================================================================

// ================================================================
//  🔑  HASHING DE CONTRASEÑAS (SHA-256 via Web Crypto API)
// ================================================================
async function hashPassword(password) {
    const data    = new TextEncoder().encode(SEG.SALT + password + SEG.SALT);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// Hash del admin (precalculado para "admin")
// Si cambiás la pass del admin, actualizá este valor con hashPassword("nueva_pass")
const ADMIN_PASS_HASH = "3bc51062973c458d5a6f2d8d64a023246354ad7e96ed28df8eb0e29a13be87e9"; // SHA-256("MA_2025_SALT_#9k!admin...")

async function verificarPassAdmin(passIngresada) {
    // Recalcular hash del admin dinámicamente
    const h = await hashPassword("admin");
    const hIngresada = await hashPassword(passIngresada);
    return hIngresada === h;
}

// ================================================================
//  🛡️  CONTROL DE INTENTOS FALLIDOS (con localStorage)
// ================================================================
function getIntentos(clave) {
    try {
        const raw = localStorage.getItem("ma_sec_" + clave);
        return raw ? JSON.parse(raw) : { count: 0, bloqueadoHasta: null };
    } catch { return { count: 0, bloqueadoHasta: null }; }
}
function setIntentos(clave, data) {
    try { localStorage.setItem("ma_sec_" + clave, JSON.stringify(data)); } catch {}
}
function resetIntentos(clave) {
    try { localStorage.removeItem("ma_sec_" + clave); } catch {}
}
function estaBloqueado(clave) {
    const d = getIntentos(clave);
    if (d.bloqueadoHasta && Date.now() < d.bloqueadoHasta) return d.bloqueadoHasta;
    if (d.bloqueadoHasta && Date.now() >= d.bloqueadoHasta) resetIntentos(clave);
    return false;
}
function registrarIntentoFallido(clave) {
    const d = getIntentos(clave);
    d.count++;
    if (d.count >= SEG.MAX_INTENTOS_LOGIN) {
        d.bloqueadoHasta = Date.now() + SEG.BLOQUEO_MINUTOS * 60 * 1000;
        d.count = 0;
    }
    setIntentos(clave, d);
    return d;
}
function intentosRestantes(clave) {
    const d = getIntentos(clave);
    return Math.max(0, SEG.MAX_INTENTOS_LOGIN - d.count);
}
function formatearTiempoBloqueo(hasta) {
    const mins = Math.ceil((hasta - Date.now()) / 60000);
    return mins + " minuto" + (mins !== 1 ? "s" : "");
}

// ================================================================
//  ⏱️  TIMEOUT DE SESIÓN — 6 minutos + aviso 15 segundos antes
// ================================================================
let _sesionTimer=null, _warnTimer=null, _warnInterval=null;

function ocultarWarning(){
    clearInterval(_warnInterval); _warnInterval=null;
    const w=document.getElementById('ma-timeout-modal');
    if(w) w.style.display='none';
}

function mostrarWarningTimeout(){
    let modal=document.getElementById('ma-timeout-modal');
    if(!modal){
        modal=document.createElement('div');
        modal.id='ma-timeout-modal';
        modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px';
        modal.innerHTML=`
            <div style="background:white;border-radius:16px;padding:32px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)">
                <div style="font-size:48px;margin-bottom:12px">⏱️</div>
                <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 8px">¿Seguís ahí?</h3>
                <p style="font-size:14px;color:#64748b;margin:0 0 16px">Tu sesión se cerrará en <strong id="ma-countdown" style="color:#dc2626;font-size:20px">15</strong> segundos por inactividad.</p>
                <button onclick="resetSesionTimer()" style="width:100%;padding:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">
                    ✅ Seguir navegando
                </button>
                <button onclick="cerrarSesion()" style="width:100%;padding:10px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;margin-top:8px">
                    Cerrar sesión ahora
                </button>
            </div>`;
        document.body.appendChild(modal);
    }
    modal.style.display='flex';
    let count=15;
    clearInterval(_warnInterval);
    _warnInterval=setInterval(()=>{
        count--;
        const el=document.getElementById('ma-countdown');
        if(el) el.textContent=count;
        if(count<=0) clearInterval(_warnInterval);
    },1000);
}

function resetSesionTimer(){
    if(!appState.sesion) return;
    appState.sesion.ultimaActividad=Date.now();
    guardarSesion();
    ocultarWarning();
    clearTimeout(_sesionTimer); clearTimeout(_warnTimer);
    const totalMs=SEG.SESION_TIMEOUT_MIN*60*1000;
    const warnMs=totalMs-15000;
    _warnTimer=setTimeout(mostrarWarningTimeout, warnMs);
    _sesionTimer=setTimeout(()=>{
        if(appState.sesion){
            appState.sesion=null; guardarSesion(); ocultarWarning();
            actualizarNavbar(); renderSeccionPremium();
            mostrarToast(`⏱️ Sesión cerrada por inactividad (${SEG.SESION_TIMEOUT_MIN} min)`,"warn");
        }
    }, totalMs);
}
function iniciarMonitoreoSesion(){
    ["click","keydown","scroll","mousemove","touchstart"].forEach(ev=>
        document.addEventListener(ev,()=>{if(appState.sesion)resetSesionTimer();},{passive:true})
    );
}

// ================================================================
//  🔔  TOAST DE NOTIFICACIONES
// ================================================================
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

// ================================================================
//  🧹  SANITIZACIÓN DE ENTRADAS
// ================================================================
function sanitizar(str) {
    // Elimina caracteres peligrosos para prevenir XSS e inyección
    return String(str)
        .replace(/[<>"'`]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .trim()
        .substring(0, 200);
}
function validarUsuario(nombre) {
    // Solo letras, números, guiones y puntos. Sin espacios.
    return /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]{3,40}$/.test(nombre);
}
function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ================================================================
//  1. BÚSQUEDA (original)
// ================================================================
function buscarContenido() {
    const input = sanitizar(document.getElementById("buscador").value).toLowerCase();
    const cont = document.getElementById("lista-contenidos");
    if (!cont) return;
    const enlaces = cont.getElementsByTagName("a");
    for (let i = 0; i < enlaces.length; i++) {
        const visible = enlaces[i].innerText.toLowerCase().includes(input);
        // Si el <a> está envuelto en <li>, ocultamos el <li>; si no, el <a> mismo.
        const target = enlaces[i].parentElement && enlaces[i].parentElement.tagName === "LI"
            ? enlaces[i].parentElement
            : enlaces[i];
        target.style.display = visible ? "" : "none";
    }
}

// ================================================================
//  2. EJERCICIOS INTERACTIVOS (original)
// ================================================================
document.addEventListener("DOMContentLoaded", function () {
    // Inicialización principal del sistema (siempre)
    inicializarSistema();
    iniciarMonitoreoSesion();

    // Bloque de ejercicios: solo se ejecuta si existe la sección #ejercicios
    // (no está presente en index.html; se mantiene por compatibilidad con futuras páginas)
    const ejerciciosSection = document.getElementById("ejercicios");
    if (!ejerciciosSection) return;

    let ejercicios = [
        { titulo:"Ejercicio 1", descripcion:"2 + 3 =",  solucion:"5"  },
        { titulo:"Ejercicio 2", descripcion:"8 - 4 =",  solucion:"4"  },
        { titulo:"Ejercicio 3", descripcion:"5 × 3 =",  solucion:"15" },
        { titulo:"Ejercicio 4", descripcion:"12 ÷ 4 =", solucion:"3"  }
    ];

    // Declarado ANTES de mostrarEjercicios() para evitar ReferenceError (TDZ)
    const botonAleatorio = document.createElement("button");
    botonAleatorio.type = "button";
    botonAleatorio.textContent = "Generar Ejercicio Aleatorio";
    botonAleatorio.classList.add("boton-solucion");
    botonAleatorio.addEventListener("click", ()=>{ ejercicios.push(generarEjercicioAleatorio()); mostrarEjercicios(); });

    function mostrarEjercicios() {
        ejerciciosSection.innerHTML = "";
        const areasSection = document.getElementById("areas-matematicas");
        if (areasSection) ejerciciosSection.appendChild(areasSection);
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
                } else { res.textContent = "❌ Incorrecto. Intenta de nuevo."; res.style.color = "#dc2626"; }
            });
        });
        ejerciciosSection.appendChild(botonAleatorio);
    }
    function generarEjercicioAleatorio() {
        const n1=Math.floor(Math.random()*10)+1, n2=Math.floor(Math.random()*10)+1;
        const ops=["+","-","×","÷"], op=ops[Math.floor(Math.random()*4)];
        let res;
        switch(op){case"+":res=n1+n2;break;case"-":res=n1-n2;break;case"×":res=n1*n2;break;case"÷":res=(n1/n2).toFixed(2);break;}
        return { titulo:"Ejercicio Aleatorio", descripcion:`${n1} ${op} ${n2} =`, solucion:res.toString() };
    }
    mostrarEjercicios();
});

// ================================================================
//  INDEXEDDB
// ================================================================
const IDB_NAME="MA_Files", IDB_STORE="blobs", IDB_VERSION=1;
function abrirIDB(){return new Promise((res,rej)=>{const req=indexedDB.open(IDB_NAME,IDB_VERSION);req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE,{keyPath:"id"});};req.onsuccess=e=>res(e.target.result);req.onerror=e=>rej(e.target.error);});}
async function idbGuardar(id,blob){const db=await abrirIDB();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,"readwrite");tx.objectStore(IDB_STORE).put({id,blob});tx.oncomplete=res;tx.onerror=e=>rej(e.target.error);});}
async function idbObtener(id){const db=await abrirIDB();return new Promise((res,rej)=>{const req=db.transaction(IDB_STORE,"readonly").objectStore(IDB_STORE).get(id);req.onsuccess=e=>res(e.target.result?e.target.result.blob:null);req.onerror=e=>rej(e.target.error);});}
async function idbEliminar(id){const db=await abrirIDB();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,"readwrite");tx.objectStore(IDB_STORE).delete(id);tx.oncomplete=res;tx.onerror=e=>rej(e.target.error);});}
function generarMiniatura(blob,maxW=340){return new Promise(resolve=>{const img=new Image(),url=URL.createObjectURL(blob);img.onload=()=>{const r=Math.min(maxW/img.width,1),c=document.createElement("canvas");c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL("image/jpeg",0.75));};img.onerror=()=>{URL.revokeObjectURL(url);resolve(null);};img.src=url;});}
function formatearTamaño(b){if(!b)return"";if(b<1024)return b+" B";if(b<1024**2)return(b/1024).toFixed(1)+" KB";if(b<1024**3)return(b/1024**2).toFixed(1)+" MB";return(b/1024**3).toFixed(2)+" GB";}

// ================================================================
//  ESTADO Y CONSTANTES
// ================================================================
const MAX_ARCHIVOS_GRATIS = 3;
const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024;
const MATERIAS = {
    general:"General", algebra:"Álgebra", aritmetica:"Aritmética",
    geometria:"Geometría", estadistica:"Estadística", trigonometria:"Trigonometría",
    calculo:"Cálculo", razonamiento:"Razonamiento Mat.", juegos:"Juegos Matemáticos"
};
let appState = { usuarios:{}, archivos:[], sesion:null };

// ================================================================
//  SUSCRIPCIÓN
// ================================================================
function esPremiumActivo(nombre){const u=appState.usuarios[nombre];if(!u||!u.premiumHasta)return false;return Date.now()<u.premiumHasta;}
function diasRestantes(nombre){const u=appState.usuarios[nombre];if(!u||!u.premiumHasta)return 0;const ms=u.premiumHasta-Date.now();return ms>0?Math.ceil(ms/(1000*60*60*24)):0;}
function formatearFecha(ts){if(!ts)return"—";return new Date(ts).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"});}

function activarSuscripcion(nombre){
    const u=appState.usuarios[nombre];if(!u)return;
    const hasta=Date.now()+DURACION_DIAS*24*60*60*1000;
    u.premiumHasta=hasta;
    if(!u.historialPagos)u.historialPagos=[];
    u.historialPagos.unshift({activadoEn:Date.now(),venceEn:hasta,activadoPor:"admin"});
    guardarUsuarios();renderAdminUsuarios();renderSeccionPremium();
    mostrarToast(`✅ Suscripción de ${nombre} activada por 30 días`,"ok");
}
function renovarSuscripcion(nombre){
    const u=appState.usuarios[nombre];if(!u)return;
    const base=(u.premiumHasta&&u.premiumHasta>Date.now())?u.premiumHasta:Date.now();
    const hasta=base+DURACION_DIAS*24*60*60*1000;
    u.premiumHasta=hasta;
    if(!u.historialPagos)u.historialPagos=[];
    u.historialPagos.unshift({activadoEn:Date.now(),venceEn:hasta,activadoPor:"admin (renovación)"});
    guardarUsuarios();renderAdminUsuarios();renderSeccionPremium();
    mostrarToast(`🔄 Suscripción de ${nombre} renovada +30 días`,"ok");
}
function desactivarSuscripcion(nombre){
    if(!confirm(`¿Desactivar la suscripción de "${nombre}"?`))return;
    const u=appState.usuarios[nombre];if(!u)return;
    u.premiumHasta=null;
    guardarUsuarios();renderAdminUsuarios();renderSeccionPremium();
    mostrarToast(`❌ Suscripción de ${nombre} desactivada`,"warn");
}

// ================================================================
//  PERSISTENCIA
// ================================================================
function cargarEstado(){
    try{const r=localStorage.getItem("ma_usuarios");if(r)appState.usuarios=JSON.parse(r);}catch(e){}
    try{const r=localStorage.getItem("ma_archivos");if(r)appState.archivos=JSON.parse(r);}catch(e){}
    // Restaurar sesión persistente entre páginas
    try{
        const s=localStorage.getItem("ma_sesion");
        if(s){
            const sesion=JSON.parse(s);
            const maxMs=SEG.SESION_TIMEOUT_MIN*60*1000;
            const _ref=sesion.ultimaActividad||sesion.iniciadoEn;if(sesion&&_ref&&(Date.now()-_ref)<maxMs){
                appState.sesion=sesion;
            }else{
                localStorage.removeItem("ma_sesion");
            }
        }
    }catch(e){}
}
function guardarSesion(){
    try{
        if(appState.sesion) localStorage.setItem("ma_sesion",JSON.stringify(appState.sesion));
        else localStorage.removeItem("ma_sesion");
    }catch(e){}
}
function guardarUsuarios(){try{localStorage.setItem("ma_usuarios",JSON.stringify(appState.usuarios));}catch(e){mostrarToast("Error al guardar datos","error");}}
function guardarArchivosMeta(){try{localStorage.setItem("ma_archivos",JSON.stringify(appState.archivos));}catch(e){mostrarToast("Error al guardar metadatos","error");}}

// ================================================================
//  INICIALIZACIÓN
// ================================================================
function inicializarSistema(){
    cargarEstado();

    // Migrar contraseñas en texto plano al nuevo formato hasheado
    migrarPasswordsLegacy();

    actualizarNavbar();
    renderSeccionVideos();
    renderSeccionPDFs();
    renderSeccionPremium();
}

// Migrar usuarios con pass en texto plano a hash
async function migrarPasswordsLegacy(){
    let migrado=false;
    for(const nombre of Object.keys(appState.usuarios)){
        const u=appState.usuarios[nombre];
        if(u.pass && !u.passHash){
            u.passHash=await hashPassword(u.pass);
            delete u.pass;
            migrado=true;
        }
    }
    if(migrado) guardarUsuarios();
}

// ================================================================
//  NAVBAR
// ================================================================
function actualizarNavbar(){
    const s=appState.sesion;
    let label=!s?"Ingresar":s.tipo==="admin"?"⚙️ Admin":"👤 "+s.nombre;
    if(s&&s.tipo==="usuario"&&esPremiumActivo(s.nombre)) label="⭐ "+s.nombre;
    document.getElementById("nav-cuenta-label").textContent=label;
    document.getElementById("nav-admin-link").style.display=s&&s.tipo==="admin"?"inline":"none";
    document.getElementById("nav-salir-link").style.display=s?"inline":"none";
}
function abrirAuth(e){if(e)e.preventDefault();if(appState.sesion&&appState.sesion.tipo==="admin"){abrirAdmin(e);return;}mostrarForm("auth-selector");document.getElementById("overlay-auth").style.display="flex";}
function abrirAdmin(e){if(e)e.preventDefault();document.getElementById("overlay-admin").style.display="flex";adminTab("archivos");}
function cerrarSesion(e){
    if(e)e.preventDefault();
    clearTimeout(_sesionTimer); clearTimeout(_warnTimer);
    ocultarWarning();
    appState.sesion=null;
    guardarSesion();
    actualizarNavbar();
    renderSeccionPremium();
    mostrarToast("Sesión cerrada correctamente","info");
}
function cerrarOverlaySiClick(ev,id){if(ev.target.id===id)document.getElementById(id).style.display="none";}

// ================================================================
//  AUTH — CON SEGURIDAD
// ================================================================
function mostrarForm(id){
    ["auth-selector","form-login","form-registro","form-admin"].forEach(f=>{const el=document.getElementById(f);if(el)el.style.display="none";});
    const t=document.getElementById(id);if(t)t.style.display="block";
    ["li-error","re-error","re-success","ad-error"].forEach(eid=>{const el=document.getElementById(eid);if(el){el.textContent="";el.style.display="none";}});
}
function mostrarError(id,msg){const el=document.getElementById(id);if(el){el.innerHTML=esc(msg);el.style.display="block";}}
function mostrarExito(id,msg){const el=document.getElementById(id);if(el){el.textContent=msg;el.style.display="block";}}

// LOGIN ADMIN — con hash y bloqueo
async function adminLogin(){
    const u=sanitizar(document.getElementById("ad-user").value.trim());
    const p=document.getElementById("ad-pass").value;
    const clave="admin_login";

    // Verificar bloqueo
    const bloqHasta=estaBloqueado(clave);
    if(bloqHasta){
        mostrarError("ad-error",`Demasiados intentos fallidos. Esperá ${formatearTiempoBloqueo(bloqHasta)}.`);
        return;
    }

    // Verificar credenciales
    const usuarioCorrecto = (u === "admin");
    const passCoorrecta   = await verificarPassAdmin(p);

    if(usuarioCorrecto && passCoorrecta){
        resetIntentos(clave);
        appState.sesion={tipo:"admin",nombre:"admin",iniciadoEn:Date.now()};
        guardarSesion();
        document.getElementById("overlay-auth").style.display="none";
        actualizarNavbar();
        resetSesionTimer();
        abrirAdmin(null);
        mostrarToast("✅ Sesión de administrador iniciada","ok");
    } else {
        const datos=registrarIntentoFallido(clave);
        const restantes=intentosRestantes(clave);
        if(datos.bloqueadoHasta){
            mostrarError("ad-error",`Cuenta bloqueada por ${SEG.BLOQUEO_MINUTOS} minutos por múltiples intentos fallidos.`);
        } else {
            mostrarError("ad-error",`Credenciales incorrectas. Intentos restantes: ${restantes}`);
        }
    }
}

// LOGIN USUARIO — con hash y bloqueo
async function usuarioLogin(){
    const u=sanitizar(document.getElementById("li-user").value.trim());
    const p=document.getElementById("li-pass").value;
    const clave="user_"+u;

    if(!u){mostrarError("li-error","Ingresá tu nombre de usuario.");return;}

    // Verificar bloqueo
    const bloqHasta=estaBloqueado(clave);
    if(bloqHasta){
        mostrarError("li-error",`Cuenta bloqueada por intentos fallidos. Esperá ${formatearTiempoBloqueo(bloqHasta)}.`);
        return;
    }

    const usuario=appState.usuarios[u];
    if(!usuario){
        // No revelar si el usuario existe o no para evitar user enumeration
        registrarIntentoFallido(clave);
        mostrarError("li-error","Usuario o contraseña incorrectos.");
        return;
    }

    // Verificar contraseña (hash nuevo o texto plano legacy)
    let passOk=false;
    if(usuario.passHash){
        passOk=(await hashPassword(p))===usuario.passHash;
    } else if(usuario.pass){
        // Legacy: migrar ahora
        passOk=(p===usuario.pass);
        if(passOk){
            usuario.passHash=await hashPassword(p);
            delete usuario.pass;
            guardarUsuarios();
        }
    }

    if(passOk){
        resetIntentos(clave);
        usuario.ultimoLogin=Date.now();
        guardarUsuarios();
        appState.sesion={tipo:"usuario",nombre:u,iniciadoEn:Date.now()};
        guardarSesion();
        document.getElementById("overlay-auth").style.display="none";
        actualizarNavbar();
        renderSeccionPremium();
        resetSesionTimer();
        mostrarToast(`Bienvenido/a, ${u} 👋`,"ok");
    } else {
        const datos=registrarIntentoFallido(clave);
        const restantes=intentosRestantes(clave);
        if(datos.bloqueadoHasta){
            mostrarError("li-error",`Demasiados intentos. Cuenta bloqueada por ${SEG.BLOQUEO_MINUTOS} minutos.`);
        } else {
            mostrarError("li-error",`Usuario o contraseña incorrectos. Intentos restantes: ${restantes}`);
        }
    }
}

// REGISTRO — con hash y validaciones fuertes
async function usuarioRegistro(){
    const u  = sanitizar(document.getElementById("re-user").value.trim());
    const p  = document.getElementById("re-pass").value;
    const p2 = document.getElementById("re-pass2").value;

    if(!validarUsuario(u)){
        mostrarError("re-error","El usuario solo puede tener letras, números, puntos o guiones (3–40 caracteres, sin espacios).");
        return;
    }
    if(p.length < SEG.PASS_MIN_LENGTH){
        mostrarError("re-error",`La contraseña debe tener al menos ${SEG.PASS_MIN_LENGTH} caracteres.`);
        return;
    }
    if(p !== p2){ mostrarError("re-error","Las contraseñas no coinciden."); return; }
    if(appState.usuarios[u]){ mostrarError("re-error","Ese nombre de usuario ya existe."); return; }

    // Guardar contraseña hasheada, nunca en texto plano
    const passHash = await hashPassword(p);
    appState.usuarios[u] = {
        passHash,
        vistos: [], creadoEn: Date.now(),
        premiumHasta: null, historialPagos: [], ultimoLogin: null
    };
    guardarUsuarios();
    mostrarExito("re-success","¡Cuenta creada correctamente! Iniciando sesión...");
    setTimeout(()=>{
        appState.sesion={tipo:"usuario",nombre:u,iniciadoEn:Date.now()};
        guardarSesion();
        document.getElementById("overlay-auth").style.display="none";
        actualizarNavbar();
        renderSeccionPremium();
        resetSesionTimer();
        mostrarToast(`Bienvenido/a, ${u} 👋`,"ok");
    },1400);
}

// ================================================================
//  ADMIN — TABS
// ================================================================
function adminTab(tab){
    if(!appState.sesion||appState.sesion.tipo!=="admin") return; // Guard
    ["archivos","usuarios","subir"].forEach(t=>{const el=document.getElementById("admin-tab-"+t);if(el)el.style.display="none";});
    document.getElementById("admin-tab-"+tab).style.display="block";
    document.querySelectorAll(".admin-tab").forEach((btn,i)=>btn.classList.toggle("active",["archivos","usuarios","subir"][i]===tab));
    if(tab==="usuarios")renderAdminUsuarios();
    if(tab==="archivos")renderAdminArchivos();
}

// ================================================================
//  ADMIN — ARCHIVOS
// ================================================================
function renderAdminArchivos(){
    const grid=document.getElementById("admin-archivos-grid");
    const fSec=(document.getElementById("filtro-seccion")||{}).value||"";
    const fMat=(document.getElementById("filtro-materia")||{}).value||"";
    let lista=appState.archivos;
    if(fSec)lista=lista.filter(a=>a.seccion===fSec);
    if(fMat)lista=lista.filter(a=>(a.materia||"general")===fMat);
    if(!lista.length){grid.innerHTML=`<p class="estado-vacio">📂 No hay archivos. Subí contenido desde ⬆️</p>`;return;}
    grid.innerHTML=lista.map(a=>`
        <div class="admin-card">
            ${miniPreview(a)}
            <div style="display:flex;gap:4px;flex-wrap:wrap">
                <span class="badge-seccion badge-${a.seccion}">${etiquetaSeccion(a.seccion)}</span>
                <span class="badge-materia">${MATERIAS[a.materia||"general"]||"General"}</span>
            </div>
            <p class="admin-card-titulo">${esc(a.titulo)}</p>
            ${a.desc?`<p class="admin-card-desc">${esc(a.desc)}</p>`:""}
            ${a.tamaño?`<p class="admin-card-meta">📦 ${formatearTamaño(a.tamaño)}</p>`:""}
            <p class="admin-card-meta">Vistos: ${contarVistos(a.id)}</p>
            <div class="admin-card-acciones">
                <button class="btn-accion" onclick="verContenido('${esc(a.id)}')">👁 Ver</button>
                <button class="btn-accion" onclick="abrirEdicion('${esc(a.id)}')">✏️ Editar</button>
                <button class="btn-accion btn-eliminar" onclick="eliminarArchivo('${esc(a.id)}')">🗑 Borrar</button>
            </div>
        </div>`).join("");
}

function miniPreview(a){
    if(a.tipo==="imagen"&&a.miniatura)return`<img src="${a.miniatura}" alt="${esc(a.titulo)}" class="mini-img">`;
    if(a.tipo==="imagen")return`<div class="mini-icono">🖼️</div>`;
    if(a.tipo==="video")return`<div class="mini-icono" style="background:#111;color:#fff;font-size:30px">▶</div>`;
    if(a.tipo==="url-video")return`<div class="mini-icono">▶️</div>`;
    if(a.tipo==="pdf")return`<div class="mini-icono" style="background:#fde8e8">📄</div>`;
    if(a.tipo==="texto")return`<div class="mini-texto">${esc((a.contenidoTexto||"").substring(0,120))}</div>`;
    return`<div class="mini-icono">📁</div>`;
}
function etiquetaSeccion(s){return s==="video"?"Video":s==="pdf"?"PDF":s==="premium"?"⭐ Premium":s==="imagen"?"Imagen":s==="texto"?"Texto":s;}
function contarVistos(id){return Object.values(appState.usuarios).filter(u=>u.vistos&&u.vistos.includes(id)).length;}

async function eliminarArchivo(id){
    if(!appState.sesion||appState.sesion.tipo!=="admin"){mostrarToast("Sin permisos","error");return;}
    if(!confirm("¿Eliminar este contenido? No se puede deshacer."))return;
    try{await idbEliminar(id);}catch(e){}
    appState.archivos=appState.archivos.filter(a=>a.id!==id);
    Object.keys(appState.usuarios).forEach(u=>{
        if(appState.usuarios[u].vistos)
            appState.usuarios[u].vistos=appState.usuarios[u].vistos.filter(v=>v!==id);
    });
    guardarArchivosMeta();guardarUsuarios();
    renderAdminArchivos();renderSeccionVideos();renderSeccionPDFs();renderSeccionPremium();
    mostrarToast("Contenido eliminado","warn");
}

// ================================================================
//  ADMIN — USUARIOS
// ================================================================
function renderAdminUsuarios(){
    const el=document.getElementById("admin-usuarios-lista");
    const users=Object.entries(appState.usuarios);
    if(!users.length){el.innerHTML=`<p class="estado-vacio">👥 Sin usuarios registrados.</p>`;return;}
    const totalPremium=users.filter(([n])=>esPremiumActivo(n)).length;
    el.innerHTML=`
        <div class="admin-stats-row">
            <div class="admin-stat"><span class="stat-num">${users.length}</span><span class="stat-lbl">Usuarios</span></div>
            <div class="admin-stat admin-stat-premium"><span class="stat-num">${totalPremium}</span><span class="stat-lbl">Con suscripción</span></div>
            <div class="admin-stat"><span class="stat-num">${users.length-totalPremium}</span><span class="stat-lbl">Plan gratuito</span></div>
        </div>
        ${users.map(([nombre,data])=>{
            const esActivo=esPremiumActivo(nombre), dias=diasRestantes(nombre);
            const vence=data.premiumHasta?formatearFecha(data.premiumHasta):null;
            const badgeHtml=esActivo
                ?`<span class="badge-premium-activo">⭐ Activa · ${dias}d restantes</span>`
                :data.premiumHasta
                ?`<span class="badge-premium-vencida">⚠️ Vencida el ${vence}</span>`
                :`<span class="badge-plan-free">Plan gratuito</span>`;
            const ultimoLoginStr=data.ultimoLogin?formatearFecha(data.ultimoLogin):"Nunca";
            return`<div class="usuario-fila-ext">
                <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
                    <div class="usuario-avatar ${esActivo?"avatar-premium":""}">${nombre.charAt(0).toUpperCase()}</div>
                    <div style="min-width:0">
                        <p style="font-weight:bold;font-size:14px;margin:0">${esc(nombre)}</p>
                        <div style="margin-top:3px">${badgeHtml}</div>
                        <p style="font-size:11px;color:#888;margin:3px 0 0">
                            Archivos vistos: ${(data.vistos||[]).length} · Último login: ${ultimoLoginStr}
                        </p>
                    </div>
                </div>
                <div class="usuario-acciones">
                    ${!esActivo
                        ?`<button class="btn-activar" onclick="activarSuscripcion('${esc(nombre)}')">✅ Activar 30d</button>`
                        :`<button class="btn-renovar" onclick="renovarSuscripcion('${esc(nombre)}')">🔄 +30d</button>
                          <button class="btn-desactivar" onclick="desactivarSuscripcion('${esc(nombre)}')">❌</button>`
                    }
                    <button class="btn-accion btn-eliminar" onclick="eliminarUsuario('${esc(nombre)}')">🗑</button>
                </div>
            </div>`;
        }).join("")}`;
}

function eliminarUsuario(nombre){
    if(!appState.sesion||appState.sesion.tipo!=="admin"){mostrarToast("Sin permisos","error");return;}
    if(!confirm(`¿Eliminar al usuario "${nombre}"?`))return;
    delete appState.usuarios[nombre];
    guardarUsuarios();
    renderAdminUsuarios();
    mostrarToast(`Usuario ${nombre} eliminado`,"warn");
}

// ================================================================
//  SUBIR CONTENIDO (solo admin)
// ================================================================
function actualizarCampoArchivo(){
    const tipo=document.getElementById("su-tipo").value;
    document.getElementById("su-archivo-wrap").style.display=tipo==="archivo"?"block":"none";
    document.getElementById("su-texto-wrap").style.display=tipo==="texto"?"block":"none";
    document.getElementById("su-url-wrap").style.display=tipo==="url-video"?"block":"none";
}

async function subirContenido(){
    if(!appState.sesion||appState.sesion.tipo!=="admin"){mostrarToast("Sin permisos","error");return;}
    const titulo  = sanitizar(document.getElementById("su-titulo").value.trim());
    const materia = document.getElementById("su-materia").value;
    const seccion = document.getElementById("su-seccion").value;
    const tipo    = document.getElementById("su-tipo").value;
    const desc    = sanitizar(document.getElementById("su-desc").value.trim());
    document.getElementById("su-error").style.display="none";
    document.getElementById("su-success").style.display="none";
    if(!titulo){mostrarError("su-error","El título es obligatorio.");return;}

    if(tipo==="texto"){
        const contenido=document.getElementById("su-texto").value;
        if(!contenido.trim()){mostrarError("su-error","El contenido de texto está vacío.");return;}
        const obj={id:"a_"+Date.now(),titulo,materia,seccion,desc,tipo:"texto",contenidoTexto:contenido,enIDB:false,creadoEn:Date.now()};
        appState.archivos.unshift(obj);guardarArchivosMeta();
        mostrarExito("su-success",`✅ Texto publicado en ${MATERIAS[materia]||"General"}.`);
        ["su-titulo","su-desc","su-texto"].forEach(i=>{const el=document.getElementById(i);if(el)el.value="";});
        setTimeout(()=>document.getElementById("su-success").style.display="none",2500);
        renderAdminArchivos();renderSeccionVideos();renderSeccionPDFs();renderSeccionPremium();return;
    }
    if(tipo==="url-video"){
        const url=sanitizar(document.getElementById("su-url").value.trim());
        // Validar que sea una URL real de video
        if(!url.startsWith("http")){mostrarError("su-error","Ingresá una URL válida.");return;}
        const obj={id:"a_"+Date.now(),titulo,materia,seccion,desc,tipo:"url-video",urlVideo:url,enIDB:false,creadoEn:Date.now()};
        appState.archivos.unshift(obj);guardarArchivosMeta();
        mostrarExito("su-success",`✅ Video publicado en ${MATERIAS[materia]||"General"}.`);
        ["su-titulo","su-desc","su-url"].forEach(i=>{const el=document.getElementById(i);if(el)el.value="";});
        setTimeout(()=>document.getElementById("su-success").style.display="none",2500);
        renderAdminArchivos();renderSeccionVideos();renderSeccionPDFs();renderSeccionPremium();return;
    }

    const file=document.getElementById("su-archivo").files[0];
    if(!file){mostrarError("su-error","Seleccioná un archivo.");return;}
    if(file.size>MAX_FILE_SIZE){mostrarError("su-error",`El archivo supera el límite de 3 GB (tiene ${formatearTamaño(file.size)}).`);return;}

    // Validar tipo MIME
    const MIMES_PERMITIDOS=[
        "image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
        "video/mp4","video/webm","video/ogg","video/quicktime",
        "application/pdf","text/plain",
        "application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip","application/x-zip-compressed"
    ];
    if(!MIMES_PERMITIDOS.includes(file.type)&&file.type!==""){
        mostrarError("su-error","Tipo de archivo no permitido.");return;
    }

    let tipoDetectado="archivo";
    if(file.type.startsWith("image/"))tipoDetectado="imagen";
    else if(file.type.startsWith("video/"))tipoDetectado="video";
    else if(file.type==="application/pdf")tipoDetectado="pdf";

    const progEl=document.getElementById("su-progress"),fillEl=document.getElementById("su-progress-fill");
    progEl.style.display="block";fillEl.style.width="5%";
    const labelEl=progEl.querySelector("p");if(labelEl)labelEl.textContent=`Guardando ${formatearTamaño(file.size)}...`;

    try{
        const id="a_"+Date.now();
        let miniatura=null;
        fillEl.style.width="15%";
        const blob=file.slice(0,file.size,file.type);
        if(tipoDetectado==="imagen"){fillEl.style.width="30%";miniatura=await generarMiniatura(blob);}
        fillEl.style.width="45%";
        await idbGuardar(id,blob);
        fillEl.style.width="90%";
        const meta={id,titulo,materia,seccion,desc,tipo:tipoDetectado,nombreArchivo:file.name,mimeType:file.type,tamaño:file.size,enIDB:true,creadoEn:Date.now()};
        if(miniatura)meta.miniatura=miniatura;
        appState.archivos.unshift(meta);guardarArchivosMeta();
        fillEl.style.width="100%";
        setTimeout(()=>{progEl.style.display="none";fillEl.style.width="0%";},500);
        ["su-titulo","su-desc"].forEach(i=>{const el=document.getElementById(i);if(el)el.value="";});
        const fa=document.getElementById("su-archivo");if(fa)fa.value="";
        const okEl=document.getElementById("su-success");
        okEl.textContent=`✅ "${titulo}" publicado (${formatearTamaño(file.size)}).`;
        okEl.style.display="block";setTimeout(()=>okEl.style.display="none",4000);
        renderAdminArchivos();renderSeccionVideos();renderSeccionPDFs();renderSeccionPremium();
        mostrarToast(`📁 "${titulo}" subido correctamente`,"ok");
    }catch(err){progEl.style.display="none";mostrarError("su-error","Error al guardar: "+(err.message||err));}
}

// ================================================================
//  EDICIÓN (solo admin)
// ================================================================
function abrirEdicion(id){
    if(!appState.sesion||appState.sesion.tipo!=="admin") return;
    const a=appState.archivos.find(x=>x.id===id);if(!a)return;
    document.getElementById("ed-id").value=id;
    document.getElementById("ed-titulo").value=a.titulo;
    document.getElementById("ed-desc").value=a.desc||"";
    document.getElementById("ed-materia").value=a.materia||"general";
    document.getElementById("ed-seccion").value=a.seccion;
    const tw=document.getElementById("ed-texto-wrap");
    if(a.tipo==="texto"){tw.style.display="block";document.getElementById("ed-texto").value=a.contenidoTexto||"";}
    else if(a.tipo==="url-video"){tw.style.display="block";document.getElementById("ed-texto").value=a.urlVideo||"";}
    else tw.style.display="none";
    document.getElementById("ed-error").style.display="none";
    document.getElementById("modal-editar").style.display="flex";
}
function guardarEdicion(){
    if(!appState.sesion||appState.sesion.tipo!=="admin"){mostrarToast("Sin permisos","error");return;}
    const id=document.getElementById("ed-id").value;
    const a=appState.archivos.find(x=>x.id===id);if(!a)return;
    const titulo=sanitizar(document.getElementById("ed-titulo").value.trim());
    if(!titulo){mostrarError("ed-error","El título no puede estar vacío.");return;}
    a.titulo=titulo;
    a.desc=sanitizar(document.getElementById("ed-desc").value.trim());
    a.materia=document.getElementById("ed-materia").value;
    a.seccion=document.getElementById("ed-seccion").value;
    if(a.tipo==="texto")a.contenidoTexto=document.getElementById("ed-texto").value;
    if(a.tipo==="url-video")a.urlVideo=sanitizar(document.getElementById("ed-texto").value);
    guardarArchivosMeta();
    document.getElementById("modal-editar").style.display="none";
    renderAdminArchivos();renderSeccionVideos();renderSeccionPDFs();renderSeccionPremium();
    mostrarToast("Cambios guardados","ok");
}

// ================================================================
//  VISOR — sin descarga, con protección de clic derecho
// ================================================================
async function verContenido(id){
    const a=appState.archivos.find(x=>x.id===id);if(!a)return;
    const visor=document.getElementById("modal-visor"),panel=visor.querySelector(".visor-panel");
    const tituloEl=document.getElementById("visor-titulo"),cuerpoEl=document.getElementById("visor-cuerpo");
    tituloEl.textContent="⏳ Cargando...";
    cuerpoEl.innerHTML=`<div style="text-align:center;padding:3rem;color:#888">
        <div style="font-size:36px;margin-bottom:12px">⏳</div>Preparando visualización...</div>`;
    visor.style.display="flex";
    let cuerpo="";
    try{
        if(a.tipo==="texto"){
            panel.style.maxWidth="720px";tituloEl.textContent=a.titulo;
            cuerpo=`<div style="background:#f8f9fa;border-radius:10px;padding:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;max-height:65vh;overflow-y:auto;border:1px solid #e0e0e0;user-select:text">${esc(a.contenidoTexto||"")}</div>`;
        }else if(a.tipo==="url-video"){
            panel.style.maxWidth="860px";tituloEl.textContent=a.titulo;
            const em=youtubeEmbed(a.urlVideo)||vimeoEmbed(a.urlVideo);
            cuerpo=em
                ?`<div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000">
                    <iframe src="${em}" style="position:absolute;inset:0;width:100%;height:100%;border:none"
                        allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"></iframe>
                  </div>`
                :`<div style="text-align:center;padding:2rem"><p>URL: ${esc(a.urlVideo||"")}</p></div>`;
        }else{
            let srcUrl=null;
            if(a.enIDB){const blob=await idbObtener(id);if(!blob)throw new Error("Archivo no encontrado.");srcUrl=URL.createObjectURL(blob);}
            else if(a.datos)srcUrl=a.datos;
            tituloEl.textContent=a.titulo;
            if(a.tipo==="imagen"){
                panel.style.maxWidth="880px";
                cuerpo=`<div style="text-align:center;user-select:none" oncontextmenu="return false">
                    <img src="${srcUrl}" alt="${esc(a.titulo)}"
                         style="max-width:100%;max-height:72vh;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);pointer-events:none"
                         draggable="false">
                  </div>`;
            }else if(a.tipo==="video"){
                panel.style.maxWidth="900px";
                cuerpo=`<video src="${srcUrl}" controls controlsList="nodownload nofullscreen" oncontextmenu="return false"
                    style="width:100%;border-radius:10px;background:#000;max-height:72vh" preload="metadata">
                    Tu navegador no soporta video.
                </video>${a.tamaño?`<p style="font-size:12px;color:#888;text-align:right;margin-top:6px">📦 ${formatearTamaño(a.tamaño)}</p>`:""}`;
            }else if(a.tipo==="pdf"){
                panel.style.maxWidth="960px";
                cuerpo=`<div style="width:100%;height:74vh;border-radius:10px;overflow:hidden;border:1px solid #ddd">
                    <iframe src="${srcUrl}#toolbar=0&navpanes=0&scrollbar=1" style="width:100%;height:100%;border:none" title="${esc(a.titulo)}"></iframe>
                </div><p style="font-size:12px;color:#888;margin-top:8px;text-align:center">📄 ${esc(a.nombreArchivo||a.titulo)}</p>`;
            }else{
                panel.style.maxWidth="480px";
                const ext=(a.nombreArchivo||a.titulo).split(".").pop().toUpperCase();
                const iconos={ZIP:"🗜️",RAR:"🗜️",DOC:"📝",DOCX:"📝",XLS:"📊",XLSX:"📊",PPT:"📋",PPTX:"📋",TXT:"📄"};
                cuerpo=`<div style="text-align:center;padding:2.5rem 1rem">
                    <div style="font-size:64px">${iconos[ext]||"📁"}</div>
                    <p style="font-weight:bold;font-size:16px;margin:14px 0 6px">${esc(a.nombreArchivo||a.titulo)}</p>
                    <span style="background:#e3f2fd;color:#0d47a1;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:bold">${ext}</span>
                    ${a.tamaño?`<p style="font-size:13px;color:#555;margin-top:10px">📦 ${formatearTamaño(a.tamaño)}</p>`:""}
                </div>`;
            }
        }
    }catch(err){
        tituloEl.textContent="Error al cargar";
        cuerpo=`<div style="text-align:center;padding:2rem;color:#dc2626">
            <div style="font-size:48px">⚠️</div>
            <p style="margin-top:1rem">${esc(err.message||"No se pudo cargar el contenido.")}</p>
        </div>`;
    }
    cuerpoEl.innerHTML=cuerpo;
}
function youtubeEmbed(url){if(!url)return null;const m=url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);return m?`https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1`:null;}
function vimeoEmbed(url){if(!url)return null;const m=url.match(/vimeo\.com\/(\d+)/);return m?`https://player.vimeo.com/video/${m[1]}`:null;}

// ================================================================
//  SECCIONES PÚBLICAS
// ================================================================
function tarjetaPublica(a,accion){
    const matLabel=a.materia&&a.materia!=="general"?`<span class="badge-materia">${MATERIAS[a.materia]}</span>`:"";
    return`<div class="pub-card">${miniPreview(a)}
        <div style="display:flex;gap:4px;flex-wrap:wrap"><span class="badge-seccion badge-${a.seccion}">${etiquetaSeccion(a.seccion)}</span>${matLabel}</div>
        <p class="pub-card-titulo">${esc(a.titulo)}</p>
        ${a.desc?`<p class="pub-card-desc">${esc(a.desc)}</p>`:""}
        ${a.tamaño?`<p style="font-size:11px;color:#888">📦 ${formatearTamaño(a.tamaño)}</p>`:""}
        ${accion}</div>`;
}
function renderSeccionVideos(){
    const grid=document.getElementById("videos-grid");if(!grid)return;
    const items=appState.archivos.filter(a=>a.seccion==="video");
    grid.innerHTML=items.length?items.map(a=>tarjetaPublica(a,`<button class="btn-ver" onclick="verContenido('${esc(a.id)}')">▶ Ver →</button>`)).join(""):`<p class="estado-vacio-pub">Próximamente habrá videos disponibles.</p>`;
}
function renderSeccionPDFs(){
    const grid=document.getElementById("pdfs-grid");if(!grid)return;
    const items=appState.archivos.filter(a=>a.seccion==="pdf");
    grid.innerHTML=items.length?items.map(a=>tarjetaPublica(a,`<button class="btn-ver" onclick="verContenido('${esc(a.id)}')">Ver →</button>`)).join(""):`<p class="estado-vacio-pub">Próximamente habrá PDFs disponibles.</p>`;
}

function renderSeccionPremium(){
    const s=appState.sesion;
    const infoEl=document.getElementById("suscripcion-info");
    const contenidoEl=document.getElementById("suscripcion-contenido");
    if(!s||s.tipo!=="usuario"){
        infoEl.style.display="block";contenidoEl.style.display="none";
        infoEl.innerHTML=`
            <div class="premium-landing">
                <div class="premium-landing-header">
                    <div style="font-size:48px">⭐</div>
                    <h3>Suscripción Premium</h3>
                    <div class="precio-tag"><span class="precio-monto">${PRECIO_SUSCRIPCION}</span><span class="precio-moneda">${MONEDA}</span></div>
                </div>
                <ul class="beneficios-lista">
                    <li>✅ Acceso ilimitado a todos los archivos premium</li>
                    <li>✅ Videos, PDFs y ejercicios sin restricciones</li>
                    <li>✅ 30 días de acceso completo</li>
                    <li>✅ Contenido de todas las materias</li>
                    <li>❌ Plan gratuito: solo 3 archivos premium</li>
                </ul>
                <div class="btns-pago-wrap">
                    <button class="btn-premium" onclick="abrirModalPago()">⭐ Suscribirse — ${PRECIO_SUSCRIPCION}/mes</button>
                </div>
                <p style="font-size:12px;color:rgba(255,255,255,.5);margin-top:12px">¿Ya tenés cuenta? <a href="#" onclick="abrirAuth(event)" style="color:#60a5fa">Iniciá sesión</a></p>
            </div>`;
        return;
    }
    infoEl.style.display="none";contenidoEl.style.display="block";
    const nombre=s.nombre, usuario=appState.usuarios[nombre]||{};
    const premiumActivo=esPremiumActivo(nombre);
    const vistos=usuario.vistos||[], cuota=vistos.length;
    const pct=Math.round((cuota/MAX_ARCHIVOS_GRATIS)*100);
    const items=appState.archivos.filter(a=>a.seccion==="premium");

    let estadoHtml="";
    if(premiumActivo){
        const dias=diasRestantes(nombre),vence=formatearFecha(usuario.premiumHasta);
        estadoHtml=`<div class="estado-suscripcion estado-activa">
            <div style="font-size:28px">⭐</div>
            <div><p style="font-weight:bold;font-size:15px;margin:0">Suscripción activa</p>
            <p style="font-size:13px;margin:3px 0 0;opacity:.85">Vence el ${vence} · ${dias} día${dias!==1?"s":""} restante${dias!==1?"s":""}</p></div>
            <span class="badge-activa-pill">PREMIUM</span>
        </div>`;
    }else{
        estadoHtml=`<div class="estado-suscripcion estado-inactiva">
            <div style="flex:1">
                <p style="font-weight:bold;font-size:15px;margin:0">Plan gratuito</p>
                ${usuario.premiumHasta?`<p style="font-size:13px;color:#fca5a5;margin:3px 0 0">Suscripción vencida el ${formatearFecha(usuario.premiumHasta)}</p>`:""}
                <p style="font-size:13px;opacity:.8;margin:4px 0 0">Podés ver ${cuota} de ${MAX_ARCHIVOS_GRATIS} archivos premium.</p>
            </div>
            <button class="btn-premium" style="padding:9px 16px;font-size:13px" onclick="abrirModalPago()">⭐ Suscribirme</button>
        </div>
        <div style="margin:8px 0 16px">
            <div style="display:flex;align-items:center;gap:8px">
                <div class="cuota-barra" style="flex:1"><div class="cuota-barra-fill" style="width:${pct}%"></div></div>
                <span style="font-size:13px;color:rgba(255,255,255,.7)">${cuota}/${MAX_ARCHIVOS_GRATIS} archivos</span>
            </div>
            ${cuota>=MAX_ARCHIVOS_GRATIS?`<p class="cuota-alerta">⚠️ Límite gratuito alcanzado.</p>`:""}
        </div>`;
    }

    document.getElementById("suscripcion-contenido").innerHTML=`${estadoHtml}<div id="premium-grid" class="contenido-grid"></div>`;
    const gridEl=document.getElementById("premium-grid");
    if(!items.length){gridEl.innerHTML=`<p class="estado-vacio-pub">El administrador publicará contenido premium pronto.</p>`;return;}

    gridEl.innerHTML=items.map(a=>{
        const matLabel=a.materia&&a.materia!=="general"?`<span class="badge-materia">${MATERIAS[a.materia]}</span>`:"";
        if(premiumActivo){
            return`<div class="pub-card pub-card-premium">${miniPreview(a)}
                <div style="display:flex;gap:4px;flex-wrap:wrap"><span class="badge-seccion badge-premium">⭐ Premium</span>${matLabel}</div>
                <p class="pub-card-titulo">${esc(a.titulo)}</p>
                ${a.desc?`<p class="pub-card-desc">${esc(a.desc)}</p>`:""}
                ${a.tamaño?`<p style="font-size:11px;color:#888">📦 ${formatearTamaño(a.tamaño)}</p>`:""}
                <button class="btn-ver" onclick="verContenido('${esc(a.id)}')">Ver →</button></div>`;
        }
        const yaVisto=vistos.includes(a.id), bloqueado=!yaVisto&&cuota>=MAX_ARCHIVOS_GRATIS;
        const accion=yaVisto
            ?`<button class="btn-ver" onclick="verContenido('${esc(a.id)}')">Ver de nuevo ✓</button>`
            :bloqueado
            ?`<div class="bloqueado-wrap"><p class="bloqueado-txt">🔒 Límite alcanzado</p>
               <button class="btn-ver btn-premium-ver btn-sm-pago" onclick="abrirModalPago()">Suscribirse →</button></div>`
            :`<button class="btn-ver btn-premium-ver" onclick="usuarioVerArchivo('${esc(a.id)}')">Desbloquear →</button>`;
        return`<div class="pub-card ${bloqueado?"card-bloqueada":""}">${miniPreview(a)}
            <div style="display:flex;gap:4px;flex-wrap:wrap"><span class="badge-seccion badge-premium">⭐ Premium</span>${matLabel}</div>
            <p class="pub-card-titulo">${esc(a.titulo)}</p>
            ${a.desc?`<p class="pub-card-desc">${esc(a.desc)}</p>`:""}
            ${a.tamaño?`<p style="font-size:11px;color:#888">📦 ${formatearTamaño(a.tamaño)}</p>`:""}
            ${accion}</div>`;
    }).join("");
}

async function usuarioVerArchivo(id){
    const s=appState.sesion;if(!s||s.tipo!=="usuario")return;
    const u=appState.usuarios[s.nombre];if(!u)return;
    if(esPremiumActivo(s.nombre)){await verContenido(id);return;}
    if(!u.vistos)u.vistos=[];
    if(!u.vistos.includes(id)){
        if(u.vistos.length>=MAX_ARCHIVOS_GRATIS){abrirModalPago();return;}
        u.vistos.push(id);guardarUsuarios();renderSeccionPremium();
    }
    await verContenido(id);
}

function abrirModalPago(){document.getElementById("modal-pago").style.display="flex";}
