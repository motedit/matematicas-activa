// ================================================================
//  MATEMÁTICAS ACTIVA — materia.js
//  Páginas individuales de materia con suscripción premium
// ================================================================

(function () {
    const MAX_ARCHIVOS_GRATIS = 3;
    const body       = document.body;
    const MATERIA_ID = body.getAttribute("data-materia") || "general";
    const NOMBRE     = body.getAttribute("data-nombre")  || "Matemáticas";
    const EMOJI      = body.getAttribute("data-emoji")   || "📚";

    // Config de pagos (sincronizada con scripts.js)
    const PRECIO_SUSCRIPCION = "$ 10.000";
    const LINK_MERCADOPAGO   = "https://mpago.la/29qTXgw";
    const LINK_NARANJAX      = "https://mpago.la/29qTXgw";

    let usuarios = {}, archivos = [], sesion = null;

    // ---- Timeout warning (15 seg antes de cerrar sesión) ----
    const TIMEOUT_MS = 6 * 60 * 1000;   // 6 minutos total
    const WARN_MS    = TIMEOUT_MS - 15000;  // aviso a los 5:45
    let _sesTimer = null, _warnTimer = null, _warnInterval = null;

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
                    <button onclick="window._materia.resetTimer()" style="width:100%;padding:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">
                        ✅ Seguir navegando
                    </button>
                    <button onclick="window._materia.salir()" style="width:100%;padding:10px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;margin-top:8px">
                        Cerrar sesión ahora
                    </button>
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

    function resetTimer() {
        if (!sesion) return;
        sesion.ultimaActividad = Date.now();
        guardarSesion();
        ocultarWarning();
        clearTimeout(_sesTimer); clearTimeout(_warnTimer);
        _warnTimer = setTimeout(mostrarWarningTimeout, WARN_MS);
        _sesTimer  = setTimeout(() => {
            sesion = null; guardarSesion(); ocultarWarning();
            renderNavbar(); renderPremium();
            const t = document.createElement('div');
            t.style.cssText='position:fixed;bottom:24px;right:24px;z-index:9999;background:#f59e0b;color:#1a1a1a;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,.25)';
            t.textContent='⏱️ Sesión cerrada por inactividad';
            document.body.appendChild(t);
            setTimeout(()=>t.remove(), 4000);
        }, TIMEOUT_MS);
    }

    function iniciarTimer() {
        if (!sesion) return;
        ['click','keydown','scroll','mousemove','touchstart'].forEach(ev =>
            document.addEventListener(ev, () => { if(sesion) resetTimer(); }, { passive: true })
        );
        resetTimer();
    }

    // ---- IndexedDB ----
    const IDB_NAME = "MA_Files", IDB_STORE = "blobs", IDB_VERSION = 1;
    function abrirIDB(){return new Promise((res,rej)=>{const req=indexedDB.open(IDB_NAME,IDB_VERSION);req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE,{keyPath:"id"});};req.onsuccess=e=>res(e.target.result);req.onerror=e=>rej(e.target.error);});}
    async function idbObtener(id){const db=await abrirIDB();return new Promise((res,rej)=>{const req=db.transaction(IDB_STORE,"readonly").objectStore(IDB_STORE).get(id);req.onsuccess=e=>res(e.target.result?e.target.result.blob:null);req.onerror=e=>rej(e.target.error);});}

    // ---- Persistencia ----
    function cargar(){
        try{const r=localStorage.getItem("ma_usuarios");if(r)usuarios=JSON.parse(r);}catch(e){}
        try{const r=localStorage.getItem("ma_archivos");if(r)archivos=JSON.parse(r);}catch(e){}
        // Restaurar sesión compartida con index.html
        try{
            const s=localStorage.getItem("ma_sesion");
            if(s){
                const sesionGuardada=JSON.parse(s);
                const maxMs=6*60*1000; // 6 minutos
                const ref=sesionGuardada.ultimaActividad||sesionGuardada.iniciadoEn;
                if(sesionGuardada&&ref&&(Date.now()-ref)<maxMs){
                    sesion=sesionGuardada;
                }else{
                    localStorage.removeItem("ma_sesion");
                }
            }
        }catch(e){}
    }
    function guardarSesion(){
        try{
            if(sesion) localStorage.setItem("ma_sesion",JSON.stringify(sesion));
            else localStorage.removeItem("ma_sesion");
        }catch(e){}
    }
    function guardarUsuarios(){try{localStorage.setItem("ma_usuarios",JSON.stringify(usuarios));}catch(e){}}

    // ---- Suscripción ----
    function esPremiumActivo(nombre){const u=usuarios[nombre];if(!u||!u.premiumHasta)return false;return Date.now()<u.premiumHasta;}
    function diasRestantes(nombre){const u=usuarios[nombre];if(!u||!u.premiumHasta)return 0;const ms=u.premiumHasta-Date.now();return ms>0?Math.ceil(ms/(1000*60*60*24)):0;}
    function formatearFecha(ts){if(!ts)return"—";return new Date(ts).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"});}

    // ---- Filtrar ----
    function archivosDeMate(){return archivos.filter(a=>(a.materia||"general")===MATERIA_ID);}

    // ---- Utilidades ----
    function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
    function formatearTamaño(b){if(!b)return"";if(b<1024)return b+" B";if(b<1024**2)return(b/1024).toFixed(1)+" KB";if(b<1024**3)return(b/1024**2).toFixed(1)+" MB";return(b/1024**3).toFixed(2)+" GB";}
    function youtubeEmbed(url){if(!url)return null;const m=url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);return m?"https://www.youtube.com/embed/"+m[1]+"?rel=0":null;}
    function vimeoEmbed(url){if(!url)return null;const m=url.match(/vimeo\.com\/(\d+)/);return m?"https://player.vimeo.com/video/"+m[1]:null;}
    function etiquetaSeccion(s){return s==="video"?"🎬 Video":s==="pdf"?"📄 PDF":s==="premium"?"⭐ Premium":s==="imagen"?"🖼 Imagen":"📝 Texto";}
    function bgSeccion(s){return s==="video"?"#fff3cd":s==="pdf"?"#fde8e8":s==="premium"?"#fef9e7":s==="imagen"?"#e8f5e9":"#ede7f6";}
    function colorSeccion(s){return s==="video"?"#856404":s==="pdf"?"#922b21":s==="premium"?"#7d6608":s==="imagen"?"#1a5e34":"#4a235a";}

    function miniPreview(a){
        if(a.tipo==="imagen"&&a.miniatura)return`<img src="${a.miniatura}" alt="${esc(a.titulo)}" class="mat-thumb-img">`;
        if(a.tipo==="imagen")return`<div class="mat-thumb-icon">🖼️</div>`;
        if(a.tipo==="video")return`<div class="mat-thumb-icon" style="background:#111;color:#fff;font-size:28px">▶</div>`;
        if(a.tipo==="url-video")return`<div class="mat-thumb-icon">▶️</div>`;
        if(a.tipo==="pdf")return`<div class="mat-thumb-icon" style="background:#fde8e8">📄</div>`;
        if(a.tipo==="texto")return`<div class="mat-thumb-text">${esc((a.contenidoTexto||"")).substring(0,100)}</div>`;
        return`<div class="mat-thumb-icon">📁</div>`;
    }

    // ---- VISOR ----
    async function verContenido(id){
        const a=archivos.find(x=>x.id===id);if(!a)return;
        const overlay=document.getElementById("mat-visor-overlay");
        const panel=overlay?overlay.querySelector(".mat-visor-panel"):null;
        const tituloEl=document.getElementById("mat-visor-titulo");
        const cuerpoEl=document.getElementById("mat-visor-cuerpo");
        tituloEl.textContent="⏳ Cargando...";
        cuerpoEl.innerHTML=`<div style="text-align:center;padding:3rem;color:#888"><div style="font-size:36px;margin-bottom:12px">⏳</div>Preparando visualización...</div>`;
        overlay.style.display="flex";
        let cuerpo="";
        try{
            if(a.tipo==="texto"){if(panel)panel.style.maxWidth="720px";tituloEl.textContent=a.titulo;cuerpo=`<div style="background:#f8f9fa;border-radius:10px;padding:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;max-height:65vh;overflow-y:auto;border:1px solid #e0e0e0">${esc(a.contenidoTexto||"")}</div>`;}
            else if(a.tipo==="url-video"){if(panel)panel.style.maxWidth="860px";tituloEl.textContent=a.titulo;const em=youtubeEmbed(a.urlVideo)||vimeoEmbed(a.urlVideo);cuerpo=em?`<div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000"><iframe src="${em}" style="position:absolute;inset:0;width:100%;height:100%;border:none" allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe></div>`:`<div style="text-align:center;padding:2rem"><div style="font-size:48px">🔗</div><p>${esc(a.urlVideo||"")}</p></div>`;}
            else{
                let srcUrl=null;
                if(a.enIDB){const blob=await idbObtener(id);if(!blob)throw new Error("Archivo no encontrado.");srcUrl=URL.createObjectURL(blob);}
                else if(a.datos)srcUrl=a.datos;
                tituloEl.textContent=a.titulo;
                if(a.tipo==="imagen"){if(panel)panel.style.maxWidth="880px";cuerpo=`<div style="text-align:center"><img src="${srcUrl}" alt="${esc(a.titulo)}" style="max-width:100%;max-height:72vh;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15)"></div>`;}
                else if(a.tipo==="video"){if(panel)panel.style.maxWidth="900px";cuerpo=`<video src="${srcUrl}" controls controlsList="nodownload" oncontextmenu="return false" style="width:100%;border-radius:10px;background:#000;max-height:72vh" preload="metadata">Tu navegador no soporta video.</video>${a.tamaño?`<p style="font-size:12px;color:#888;text-align:right;margin-top:6px">📦 ${formatearTamaño(a.tamaño)}</p>`:""}`;}
                else if(a.tipo==="pdf"){if(panel)panel.style.maxWidth="960px";cuerpo=`<div style="width:100%;height:74vh;border-radius:10px;overflow:hidden;border:1px solid #ddd"><iframe src="${srcUrl}" style="width:100%;height:100%;border:none" title="${esc(a.titulo)}"></iframe></div><p style="font-size:12px;color:#888;margin-top:8px;text-align:center">📄 ${esc(a.nombreArchivo||a.titulo)}</p>`;}
                else{if(panel)panel.style.maxWidth="480px";const ext=(a.nombreArchivo||a.titulo).split(".").pop().toUpperCase();const iconos={ZIP:"🗜️",RAR:"🗜️",DOC:"📝",DOCX:"📝",XLS:"📊",XLSX:"📊",PPT:"📋",PPTX:"📋",TXT:"📄"};cuerpo=`<div style="text-align:center;padding:2.5rem 1rem"><div style="font-size:64px">${iconos[ext]||"📁"}</div><p style="font-weight:bold;font-size:16px;margin:14px 0 6px">${esc(a.nombreArchivo||a.titulo)}</p>${a.tamaño?`<p style="font-size:13px;color:#555;margin-top:10px">📦 ${formatearTamaño(a.tamaño)}</p>`:""}</div>`;}
            }
        }catch(err){tituloEl.textContent="Error";cuerpo=`<div style="text-align:center;padding:2rem;color:#c0392b"><div style="font-size:48px">⚠️</div><p style="margin-top:1rem">${esc(err.message||"No se pudo cargar.")}</p></div>`;}
        cuerpoEl.innerHTML=cuerpo;
    }

    // ---- Tarjeta ----
    function tarjeta(a,accion){
        return`<div class="mat-card">${miniPreview(a)}<span style="font-size:11px;font-weight:bold;padding:2px 8px;border-radius:4px;background:${bgSeccion(a.seccion)};color:${colorSeccion(a.seccion)};align-self:flex-start">${etiquetaSeccion(a.seccion)}</span><p class="mat-card-titulo">${esc(a.titulo)}</p>${a.desc?`<p class="mat-card-desc">${esc(a.desc)}</p>`:""}${a.tamaño?`<p style="font-size:11px;color:#888">📦 ${formatearTamaño(a.tamaño)}</p>`:""}${accion}</div>`;
    }

    // ---- Render público ----
    function renderPublicos(){
        const lista=archivosDeMate().filter(a=>a.seccion!=="premium");
        const grid=document.getElementById("mat-publicos-grid");
        grid.innerHTML=lista.length?lista.map(a=>tarjeta(a,`<button class="mat-btn" onclick="window._materia.ver('${a.id}')">Ver →</button>`)).join(""):`<p class="mat-vacio">El administrador publicará contenido de ${NOMBRE} pronto.</p>`;
    }

    // ---- Render premium con suscripción ----
    function renderPremium(){
        const premBlock=document.getElementById("mat-premium-bloque");
        const loginBlock=document.getElementById("mat-premium-login");
        const lista=archivosDeMate().filter(a=>a.seccion==="premium");

        if(!sesion||sesion.tipo!=="usuario"){premBlock.style.display="none";loginBlock.style.display="block";return;}
        premBlock.style.display="block";loginBlock.style.display="none";

        const nombre=sesion.nombre, u=usuarios[nombre]||{};
        const premiumActivo=esPremiumActivo(nombre);
        const vistos=u.vistos||[], cuota=vistos.length;

        // Estado de suscripción
        let estadoHtml="";
        if(premiumActivo){
            const dias=diasRestantes(nombre), vence=formatearFecha(u.premiumHasta);
            estadoHtml=`<div class="mat-estado-activa"><span>⭐ Suscripción activa</span><span style="font-size:12px;opacity:.85">Vence el ${vence} · ${dias} día${dias!==1?"s":""}</span></div>`;
        }else{
            estadoHtml=`<div class="mat-estado-inactiva">
                <div><p style="font-weight:bold;margin:0;font-size:14px">Plan gratuito — ${cuota}/${MAX_ARCHIVOS_GRATIS} archivos</p>${u.premiumHasta?`<p style="font-size:12px;color:#b55b00;margin:3px 0 0">Suscripción vencida el ${formatearFecha(u.premiumHasta)}</p>`:""}</div>
                <button class="mat-btn mat-btn-premium" onclick="window._materia.abrirPago()">⭐ Suscribirse — ${PRECIO_SUSCRIPCION}/mes</button>
            </div>
            <div style="margin:8px 0 16px"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:7px;background:#e0e0e0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round((cuota/MAX_ARCHIVOS_GRATIS)*100)}%;background:#197ce6;border-radius:4px"></div></div><span style="font-size:12px;color:#555">${cuota}/${MAX_ARCHIVOS_GRATIS}</span></div>${cuota>=MAX_ARCHIVOS_GRATIS?`<p style="font-size:12px;color:#b55b00;margin-top:5px">⚠️ Límite gratuito alcanzado.</p>`:""}</div>`;
        }

        let gridHtml="";
        if(!lista.length){gridHtml=`<p class="mat-vacio">No hay contenido premium de ${NOMBRE} aún.</p>`;}
        else{
            gridHtml=lista.map(a=>{
                if(premiumActivo){return tarjeta(a,`<button class="mat-btn" onclick="window._materia.ver('${a.id}')">Ver →</button>`);}
                const yaVisto=vistos.includes(a.id), bloqueado=!yaVisto&&cuota>=MAX_ARCHIVOS_GRATIS;
                const accion=yaVisto?`<button class="mat-btn" onclick="window._materia.ver('${a.id}')">Ver de nuevo ✓</button>`
                    :bloqueado?`<div><p style="font-size:12px;color:#999;margin:0 0 6px">🔒 Límite alcanzado</p><button class="mat-btn mat-btn-premium" onclick="window._materia.abrirPago()">Suscribirse →</button></div>`
                    :`<button class="mat-btn mat-btn-premium" onclick="window._materia.verPremium('${a.id}')">Desbloquear →</button>`;
                return tarjeta(a,accion);
            }).join("");
        }

        document.getElementById("mat-cuota-info").innerHTML=estadoHtml;
        document.getElementById("mat-premium-grid").innerHTML=gridHtml;
    }

    // ---- Navbar ----
    function renderNavbar(){
        const nb=document.getElementById("mat-navbar-sesion");if(!nb)return;
        if(!sesion){nb.innerHTML=`<button class="mat-nav-btn" onclick="window._materia.abrirLogin()">🔐 Ingresar</button>`;return;}
        const activo=esPremiumActivo(sesion.nombre);
        nb.innerHTML=`<span style="font-size:13px">${activo?"⭐":"👤"} ${esc(sesion.nombre)}</span><button class="mat-nav-btn" onclick="window._materia.salir()">Salir</button>`;
    }

    // ---- Login ----
    function abrirLogin(){document.getElementById("mat-login-overlay").style.display="flex";const e=document.getElementById("mat-login-error");if(e){e.textContent="";e.style.display="none";}}
    function loginUsuario(){
        const u=document.getElementById("mat-login-user").value.trim(),p=document.getElementById("mat-login-pass").value,err=document.getElementById("mat-login-error");
        if(!usuarios[u]){err.textContent="Usuario no encontrado.";err.style.display="block";return;}
        if(usuarios[u].pass!==p){err.textContent="Contraseña incorrecta.";err.style.display="block";return;}
        sesion={tipo:"usuario",nombre:u,iniciadoEn:Date.now(),ultimaActividad:Date.now()};
        guardarSesion();
        document.getElementById("mat-login-overlay").style.display="none";renderNavbar();renderPremium();
        iniciarTimer();
    }
    function salir(){sesion=null;guardarSesion();renderNavbar();renderPremium();}

    // ---- Modal de pago ----
    function abrirPago(){document.getElementById("mat-pago-overlay").style.display="flex";}

    // ---- Ver premium ----
    async function verPremium(id){
        const u=usuarios[sesion.nombre];if(!u)return;
        if(esPremiumActivo(sesion.nombre)){await verContenido(id);return;}
        if(!u.vistos)u.vistos=[];
        if(!u.vistos.includes(id)){
            if(u.vistos.length>=MAX_ARCHIVOS_GRATIS){abrirPago();return;}
            u.vistos.push(id);guardarUsuarios();renderPremium();
        }
        await verContenido(id);
    }

    // ---- Construir página ----
    function construirPagina(){
        document.title=NOMBRE+" — Matemáticas Activa";
        document.body.innerHTML=`
            <header class="mat-header">
                <a href="../../index.html" class="mat-back" onclick="window._materia.volverInicio()">← Inicio</a>
                <h1>${EMOJI} ${NOMBRE}</h1>
                <div id="mat-navbar-sesion"></div>
            </header>
            <main class="mat-main">
                <section class="mat-section">
                    <h2 class="mat-section-title">📂 Material de ${NOMBRE}</h2>
                    <p class="mat-section-desc">Videos, PDFs, ejercicios e imágenes de ${NOMBRE}.</p>
                    <div id="mat-publicos-grid" class="mat-grid"></div>
                </section>
                <section class="mat-section" id="mat-calc-section" style="display:none">
                    <h2 class="mat-section-title">🧮 Calculadora de Ejercicios</h2>
                    <p class="mat-section-desc">Ejercicios aleatorios con corrección automática y solución paso a paso.</p>
                    <div id="mat-calc-container"></div>
                </section>

                <section class="mat-section mat-premium-section">
                    <h2 class="mat-section-title">⭐ Contenido Premium</h2>
                    <div id="mat-premium-login">
                        <div class="mat-premium-banner">
                            <p>🔐 Iniciá sesión para acceder al contenido premium de ${NOMBRE}.</p>
                            <button class="mat-btn mat-btn-premium" onclick="window._materia.abrirLogin()">Iniciar sesión</button>
                        </div>
                    </div>
                    <div id="mat-premium-bloque" style="display:none">
                        <div id="mat-cuota-info" style="margin-bottom:14px"></div>
                        <div id="mat-premium-grid" class="mat-grid"></div>
                    </div>
                </section>
            </main>
            <footer class="mat-footer">
                <p>Copyright © 2025 Matemáticas Activa. Todos los derechos reservados.</p>
            </footer>

            <!-- VISOR -->
            <div id="mat-visor-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);align-items:center;justify-content:center;z-index:1000;padding:1rem" onclick="if(event.target.id==='mat-visor-overlay')this.style.display='none'">
                <div class="mat-visor-panel" style="background:white;border-radius:14px;padding:24px;width:100%;max-width:860px;max-height:92vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,.25)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px">
                        <h3 id="mat-visor-titulo" style="margin:0;font-size:17px;flex:1;padding-right:12px"></h3>
                        <button onclick="document.getElementById('mat-visor-overlay').style.display='none'" style="background:#f5f5f5;border:none;font-size:14px;cursor:pointer;color:#444;border-radius:6px;padding:5px 12px;flex-shrink:0">✕ Cerrar</button>
                    </div>
                    <div id="mat-visor-cuerpo"></div>
                </div>
            </div>

            <!-- LOGIN -->
            <div id="mat-login-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);align-items:center;justify-content:center;z-index:1000;padding:1rem" onclick="if(event.target.id==='mat-login-overlay')this.style.display='none'">
                <div style="background:white;border-radius:14px;padding:28px;width:100%;max-width:380px;box-shadow:0 10px 40px rgba(0,0,0,.2)">
                    <h2 style="margin:0 0 20px;font-size:18px;text-align:center">🔐 Iniciar sesión</h2>
                    <div style="margin-bottom:14px"><label style="font-size:13px;color:#555;display:block;margin-bottom:4px">Usuario</label><input type="text" id="mat-login-user" placeholder="Tu nombre de usuario" style="width:100%;padding:9px 12px;border:1px solid #ccc;border-radius:7px;font-size:14px;box-sizing:border-box"></div>
                    <div style="margin-bottom:14px"><label style="font-size:13px;color:#555;display:block;margin-bottom:4px">Contraseña</label><input type="password" id="mat-login-pass" placeholder="••••••" style="width:100%;padding:9px 12px;border:1px solid #ccc;border-radius:7px;font-size:14px;box-sizing:border-box"></div>
                    <div id="mat-login-error" style="color:#c0392b;font-size:13px;background:#fdf2f2;border-radius:6px;padding:7px 10px;margin-bottom:10px;display:none"></div>
                    <button onclick="window._materia.loginUsuario()" style="width:100%;padding:11px;background:#197ce6;color:white;border:none;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer">Ingresar</button>
                    <p style="text-align:center;font-size:12px;color:#999;margin-top:12px">¿No tenés cuenta? <a href="../../index.html#suscripcion" style="color:#197ce6">Registrate en el inicio</a></p>
                </div>
            </div>

            <!-- MODAL DE PAGO -->
            <div id="mat-pago-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);align-items:center;justify-content:center;z-index:1000;padding:1rem" onclick="if(event.target.id==='mat-pago-overlay')this.style.display='none'">
                <div style="background:white;border-radius:14px;padding:28px;width:100%;max-width:480px;box-shadow:0 10px 40px rgba(0,0,0,.2)">
                    <div style="text-align:center;margin-bottom:20px">
                        <div style="font-size:40px">⭐</div>
                        <h2 style="margin:8px 0 4px;font-size:20px">Suscripción Premium</h2>
                        <div style="font-size:28px;font-weight:bold;color:#197ce6">${PRECIO_SUSCRIPCION} <span style="font-size:14px;color:#888;font-weight:normal">ARS / mes</span></div>
                    </div>
                    <ul style="list-style:none;padding:0;margin:0 0 20px;background:#f8fbff;border-radius:10px;padding:16px">
                        <li style="padding:5px 0;font-size:14px">✅ Acceso ilimitado a todos los archivos</li>
                        <li style="padding:5px 0;font-size:14px">✅ Videos, PDFs y ejercicios sin restricciones</li>
                        <li style="padding:5px 0;font-size:14px">✅ 30 días de acceso completo</li>
                        <li style="padding:5px 0;font-size:14px">✅ Todas las materias incluidas</li>
                    </ul>
                    <p style="font-size:13px;font-weight:bold;color:#333;margin-bottom:10px">Elegí tu método de pago:</p>
                    <a href="${LINK_MERCADOPAGO}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#009ee3;color:white;border-radius:10px;padding:14px;text-decoration:none;font-weight:bold;font-size:15px;margin-bottom:10px">
                        💳 Pagar con MercadoPago
                    </a>
                    <a href="${LINK_NARANJAX}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#ff6600;color:white;border-radius:10px;padding:14px;text-decoration:none;font-weight:bold;font-size:15px;margin-bottom:20px">
                        🟠 Pagar con Naranja X
                    </a>
                    <div style="background:#fff8e1;border-radius:10px;padding:14px;font-size:13px;color:#5d4037">
                        <p style="font-weight:bold;margin:0 0 6px">📋 ¿Qué hacer después de pagar?</p>
                        <ol style="margin:0;padding-left:18px;line-height:1.8">
                            <li>Completá el pago en la plataforma</li>
                            <li>Guardá el comprobante</li>
                            <li>Enviánoslo por ${LINK_MERCADOPAGO.includes("REEMPLAZAR")?"WhatsApp o email (completar contacto)":"nuestro contacto"}</li>
                            <li>¡Tu acceso se activa en menos de 24 hs!</li>
                        </ol>
                    </div>
                    <button onclick="document.getElementById('mat-pago-overlay').style.display='none'" style="width:100%;margin-top:16px;padding:10px;background:#f0f0f0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:14px">Cerrar</button>
                </div>
            </div>
        `;
        document.getElementById("mat-visor-overlay").style.display="none";
    }

    function volverInicio() {
        // Actualizar timestamp antes de salir para que index no expire la sesión
        if (sesion) {
            sesion.ultimaActividad = Date.now();
            guardarSesion();
        }
        // La navegación sigue normalmente por el href del link
    }
    window._materia={ ver:verContenido, verPremium, abrirLogin, loginUsuario, salir, abrirPago, resetTimer, volverInicio };

    cargar();
    construirPagina();
    renderNavbar();
    renderPublicos();
    renderPremium();
    if (sesion) iniciarTimer();
    // Cargar módulo interactivo según la materia
    if (MATERIA_ID === 'calculo') {
        // Cálculo: calculadora y graficadora de funciones
        const sf = document.createElement('script');
        sf.src = '../../funciones.js';
        sf.onload = () => { if (window.initFunciones) window.initFunciones(); };
        document.head.appendChild(sf);
    } else if (['geometria', 'estadistica'].includes(MATERIA_ID)) {
        // Geometría y Estadística: graficadora interactiva
        const sg = document.createElement('script');
        sg.src = '../../graficadora.js';
        sg.onload = () => { if (window.initGraficadora) window.initGraficadora(MATERIA_ID); };
        document.head.appendChild(sg);
    } else if (['algebra', 'aritmetica', 'trigonometria'].includes(MATERIA_ID)) {
        // Álgebra, Aritmética y Trigonometría: calculadora de ejercicios
        const sc = document.createElement('script');
        sc.src = '../../calculadora.js';
        sc.onload = () => { if (window.initCalculadora) window.initCalculadora(MATERIA_ID); };
        document.head.appendChild(sc);
    }
})();
