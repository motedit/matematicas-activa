// ================================================================
//  MATEMÁTICAS ACTIVA — materia.js (v2 con Supabase backend)
//  Páginas individuales de materia con suscripción premium
// ================================================================

(function () {
    const MAX_ARCHIVOS_GRATIS = 3;
    const body       = document.body;
    const MATERIA_ID = body.getAttribute("data-materia") || "general";
    const NOMBRE     = body.getAttribute("data-nombre")  || "Matemáticas";
    const EMOJI      = body.getAttribute("data-emoji")   || "📚";

    const PRECIO_SUSCRIPCION = "$ 10.000";
    const LINK_MERCADOPAGO   = "https://mpago.la/29qTXgw";
    const LINK_NARANJAX      = "https://mpago.la/29qTXgw";

    // Estado en memoria
    let perfilActual = null;     // perfil del usuario logueado (o null)
    let archivos     = [];       // archivos de esta materia
    let ejerciciosMateria = [];  // ejercicios interactivos de esta materia
    const MA = () => window.MA_SUPABASE;

    // ---- Timeout (mismo patrón que scripts.js) ----
    const TIMEOUT_MS = 30 * 60 * 1000;
    const WARN_MS    = TIMEOUT_MS - 15000;
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
                    <button type="button" onclick="window._materia.resetTimer()" style="width:100%;padding:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">✅ Seguir navegando</button>
                    <button type="button" onclick="window._materia.salir()" style="width:100%;padding:10px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;margin-top:8px">Cerrar sesión ahora</button>
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
        if (!perfilActual) return;
        ocultarWarning();
        clearTimeout(_sesTimer); clearTimeout(_warnTimer);
        _warnTimer = setTimeout(mostrarWarningTimeout, WARN_MS);
        _sesTimer  = setTimeout(async () => {
            await salir();
            const t = document.createElement('div');
            t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#f59e0b;color:#1a1a1a;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,.25)';
            t.textContent = '⏱️ Sesión cerrada por inactividad';
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 4000);
        }, TIMEOUT_MS);
    }

    function iniciarTimer() {
        if (!perfilActual) return;
        ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach(ev =>
            document.addEventListener(ev, () => { if (perfilActual) resetTimer(); }, { passive: true })
        );
        resetTimer();
    }

    // ---- Carga desde Supabase (con timeout y retry) ----
    let temasMateria = [];
    function _conTimeout(promise, ms) {
        return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    }
    async function _conRetry(fn, ms, intentos) {
        for (let i = 0; i < intentos; i++) {
            try { return await _conTimeout(fn(), ms); } catch(e) { if (i === intentos - 1) throw e; }
        }
    }
    async function cargar() {
        if (!MA()?.sb) { perfilActual = null; archivos = []; temasMateria = []; return; }
        // Cargar temas (retry 2 veces, 20s cada intento — cold start Supabase free)
        try { temasMateria = await _conRetry(() => MA().sbListarTemas(MATERIA_ID), 20000, 2); } catch(e) { temasMateria = []; console.warn('Error cargando temas:', e); }
        // Perfil y archivos
        try { perfilActual = await _conTimeout(MA().sbPerfil(), 15000); } catch(e) { perfilActual = null; }
        try {
            const todos = await _conTimeout(MA().sbListarArchivos(), 15000);
            archivos = todos.filter(a => (a.materia || "general") === MATERIA_ID);
        } catch(e) { archivos = []; }
        // Ejercicios interactivos
        try { ejerciciosMateria = await _conRetry(() => MA().sbListarEjercicios(MATERIA_ID), 15000, 2); } catch(e) { ejerciciosMateria = []; }
    }

    // ---- Planes helpers (gratis / basico / premium) ----
    // Misma fuente de verdad que scripts.js: perfiles.plan + perfiles.plan_hasta
    const NIVEL_RANGO = { gratis: 0, basico: 1, premium: 2 };
    function nivelDe(p) {
        if (!p?.plan || p.plan === "gratis") return "gratis";
        if (!p.plan_hasta || new Date(p.plan_hasta).getTime() <= Date.now()) return "gratis";
        return p.plan;
    }
    function nivelPermite(nivelUsuario, nivelRequerido) {
        return (NIVEL_RANGO[nivelUsuario] ?? 0) >= (NIVEL_RANGO[nivelRequerido] ?? 0);
    }
    function esPremiumActivo(p) { return nivelDe(p) !== "gratis"; }
    function diasRestantes(p) {
        if (nivelDe(p) === "gratis" || !p?.plan_hasta) return 0;
        const ms = new Date(p.plan_hasta).getTime() - Date.now();
        return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
    }
    function formatearFecha(ts) {
        if (!ts) return "—";
        return new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    // ---- Utilidades ----
    function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function formatearTamano(b) {
        if (!b) return "";
        if (b < 1024) return b + " B";
        if (b < 1024**2) return (b/1024).toFixed(1) + " KB";
        if (b < 1024**3) return (b/1024**2).toFixed(1) + " MB";
        return (b/1024**3).toFixed(2) + " GB";
    }
    function youtubeEmbed(url) {
        if (!url) return null;
        const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return m ? "https://www.youtube.com/embed/" + m[1] + "?rel=0" : null;
    }
    function vimeoEmbed(url) {
        if (!url) return null;
        const m = url.match(/vimeo\.com\/(\d+)/);
        return m ? "https://player.vimeo.com/video/" + m[1] : null;
    }
    function etiquetaSeccion(s) { return ({video:"🎬 Video",pdf:"📄 PDF",premium:"⭐ Premium",imagen:"🖼 Imagen",texto:"📝 Texto"})[s] || s; }
    function bgSeccion(s)    { return ({video:"#fff3cd",pdf:"#fde8e8",premium:"#fef9e7",imagen:"#e8f5e9",texto:"#ede7f6"})[s] || "#f1f5f9"; }
    function colorSeccion(s) { return ({video:"#856404",pdf:"#922b21",premium:"#7d6608",imagen:"#1a5e34",texto:"#4a235a"})[s] || "#1e293b"; }

    function miniPreview(a) {
        if (a.miniatura) return `<img src="${a.miniatura}" alt="${esc(a.titulo)}" class="mat-thumb-img">`;
        const map = { video:["▶","background:#111;color:#fff;font-size:28px"], pdf:["📄","background:#fde8e8"], premium:["⭐",""], imagen:["🖼️",""], texto:["",""] };
        if (a.seccion === "texto") return `<div class="mat-thumb-text">${esc((a.contenido_texto || "")).substring(0,100)}</div>`;
        const [icon, style] = map[a.seccion] || ["📁",""];
        return `<div class="mat-thumb-icon" style="${style}">${icon}</div>`;
    }

    // ---- VISOR ----
    async function verContenido(id) {
        const a = archivos.find(x => x.id === id);
        if (!a) return;
        const overlay   = document.getElementById("mat-visor-overlay");
        const panel     = overlay?.querySelector(".mat-visor-panel");
        const tituloEl  = document.getElementById("mat-visor-titulo");
        const cuerpoEl  = document.getElementById("mat-visor-cuerpo");
        tituloEl.textContent = "⏳ Cargando...";
        cuerpoEl.innerHTML = `<div style="text-align:center;padding:3rem;color:#888"><div style="font-size:36px;margin-bottom:12px">⏳</div>Preparando visualización...</div>`;
        overlay.style.display = "flex";

        let cuerpo = "";
        try {
            if (a.tipo === "texto") {
                if (panel) panel.style.maxWidth = "720px";
                tituloEl.textContent = a.titulo;
                cuerpo = `<div style="background:#f8f9fa;border-radius:10px;padding:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;max-height:65vh;overflow-y:auto;border:1px solid #e0e0e0">${esc(a.contenido_texto || "")}</div>`;
            } else if (a.tipo === "url-video") {
                if (panel) panel.style.maxWidth = "860px";
                tituloEl.textContent = a.titulo;
                const em = youtubeEmbed(a.url_video) || vimeoEmbed(a.url_video);
                cuerpo = em
                    ? `<div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000"><iframe src="${em}" style="position:absolute;inset:0;width:100%;height:100%;border:none" allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe></div>`
                    : `<div style="text-align:center;padding:2rem"><div style="font-size:48px">🔗</div><p>${esc(a.url_video || "")}</p></div>`;
            } else {
                // tipo archivo: pedir URL firmada al storage
                if (!a.storage_path) throw new Error("Archivo no disponible.");
                const url = await MA().sbUrlFirmada(a.storage_path, 3600);
                if (!url) throw new Error("No se pudo obtener el archivo.");
                tituloEl.textContent = a.titulo;
                const mt = a.mime_type || "";
                if (mt.startsWith("image/") || a.seccion === "imagen") {
                    if (panel) panel.style.maxWidth = "880px";
                    cuerpo = `<div style="text-align:center"><img src="${url}" alt="${esc(a.titulo)}" style="max-width:100%;max-height:72vh;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15)"></div>`;
                } else if (mt.startsWith("video/")) {
                    if (panel) panel.style.maxWidth = "900px";
                    cuerpo = `<video src="${url}" controls controlsList="nodownload" oncontextmenu="return false" style="width:100%;border-radius:10px;background:#000;max-height:72vh" preload="metadata">Tu navegador no soporta video.</video>${a.tamano_bytes ? `<p style="font-size:12px;color:#888;text-align:right;margin-top:6px">📦 ${formatearTamano(a.tamano_bytes)}</p>` : ""}`;
                } else if (mt === "application/pdf") {
                    if (panel) panel.style.maxWidth = "960px";
                    cuerpo = `<div style="width:100%;height:74vh;border-radius:10px;overflow:hidden;border:1px solid #ddd"><iframe src="${url}" style="width:100%;height:100%;border:none" title="${esc(a.titulo)}"></iframe></div><p style="font-size:12px;color:#888;margin-top:8px;text-align:center">📄 ${esc(a.nombre_archivo || a.titulo)}</p>`;
                } else {
                    if (panel) panel.style.maxWidth = "480px";
                    const ext = (a.nombre_archivo || a.titulo).split(".").pop().toUpperCase();
                    const iconos = { ZIP:"🗜️", RAR:"🗜️", DOC:"📝", DOCX:"📝", XLS:"📊", XLSX:"📊", PPT:"📋", PPTX:"📋", TXT:"📄" };
                    cuerpo = `<div style="text-align:center;padding:2.5rem 1rem"><div style="font-size:64px">${iconos[ext] || "📁"}</div><p style="font-weight:bold;font-size:16px;margin:14px 0 6px">${esc(a.nombre_archivo || a.titulo)}</p>${a.tamano_bytes ? `<p style="font-size:13px;color:#555;margin-top:10px">📦 ${formatearTamano(a.tamano_bytes)}</p>` : ""}<a href="${url}" download="${esc(a.nombre_archivo || a.titulo)}" style="display:inline-block;margin-top:16px;background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">⬇ Descargar</a></div>`;
                }
            }
        } catch (err) {
            tituloEl.textContent = "Error";
            cuerpo = `<div style="text-align:center;padding:2rem;color:#c0392b"><div style="font-size:48px">⚠️</div><p style="margin-top:1rem">${esc(err.message || "No se pudo cargar.")}</p></div>`;
        }
        cuerpoEl.innerHTML = cuerpo;
    }

    // ---- Tarjeta ----
    function tarjeta(a, accion) {
        return `<div class="mat-card">${miniPreview(a)}<span style="font-size:11px;font-weight:bold;padding:2px 8px;border-radius:4px;background:${bgSeccion(a.seccion)};color:${colorSeccion(a.seccion)};align-self:flex-start">${etiquetaSeccion(a.seccion)}</span><p class="mat-card-titulo">${esc(a.titulo)}</p>${a.descripcion ? `<p class="mat-card-desc">${esc(a.descripcion)}</p>` : ""}${a.tamano_bytes ? `<p style="font-size:11px;color:#888">📦 ${formatearTamano(a.tamano_bytes)}</p>` : ""}${accion}</div>`;
    }

    // ---- Render público (acordeón) ----
    function toggleAcordeon(id) {
        const panel = document.getElementById('acc-panel-' + id);
        const pill  = document.getElementById('acc-pill-' + id);
        if (!panel) return;
        const abierto = panel.classList.toggle('acc-abierto');
        pill?.classList.toggle('acc-activo', abierto);
        // Cerrar los demás
        document.querySelectorAll('.acc-panel.acc-abierto').forEach(p => {
            if (p.id !== 'acc-panel-' + id) { p.classList.remove('acc-abierto'); }
        });
        document.querySelectorAll('.acc-pill.acc-activo').forEach(p => {
            if (p.id !== 'acc-pill-' + id) { p.classList.remove('acc-activo'); }
        });
    }
    window._materia_toggleAcc = toggleAcordeon;

    function renderPublicos() {
        const lista = archivos.filter(a => a.seccion !== "premium");
        const grid = document.getElementById("mat-publicos-grid");
        if (!grid) return;

        const temasSec = temasMateria.filter(t => t.nivel === 1).sort((a,b) => a.orden - b.orden);
        const temasUni = temasMateria.filter(t => t.nivel === 2).sort((a,b) => a.orden - b.orden);

        if (temasSec.length === 0 && temasUni.length === 0 && lista.length === 0) {
            grid.innerHTML = `<p class="mat-vacio">El administrador publicará contenido de ${esc(NOMBRE)} pronto.</p>`;
            return;
        }

        function renderTemaCard(t) {
            const key = _norm(t.nombre);
            const desc = TEMA_DESC[key] || '';
            const tieneArch = archivos.some(a => a.tema_id === t.id);
            return `<div class="tema-card" onclick="window._materia.abrirSubtema('${t.id}')">
                <div class="tema-card-top">
                    <h4 class="tema-card-nombre">${esc(t.nombre)}</h4>
                    <span class="tema-card-arrow">→</span>
                </div>
                ${desc ? `<p class="tema-card-desc">${esc(desc)}</p>` : ''}
                ${tieneArch ? '<span class="tema-card-badge has-content">📂 Con material</span>' : ''}
            </div>`;
        }

        let html = '';
        if (temasSec.length) {
            html += `<div class="nivel-section">
                <div class="nivel-header sec"><span class="nivel-icon">🎓</span> Nivel Secundario</div>
                <div class="temas-list">${temasSec.map(renderTemaCard).join('')}</div>
            </div>`;
        }
        if (temasUni.length) {
            html += `<div class="nivel-section">
                <div class="nivel-header uni"><span class="nivel-icon">🏛</span> Nivel Universitario / Avanzado</div>
                <div class="temas-list">${temasUni.map(renderTemaCard).join('')}</div>
            </div>`;
        }

        // Archivos sin tema asignado
        const archivosSinTema = lista.filter(a => !a.tema_id || !temasMateria.some(t => t.id === a.tema_id));
        if (archivosSinTema.length > 0) {
            html += `<div class="nivel-section">
                <div class="nivel-header otros"><span class="nivel-icon">📁</span> Otros contenidos</div>
                <div class="mat-grid">${archivosSinTema.map(a => tarjeta(a, `<button type="button" class="mat-btn" onclick="window._materia.ver('${a.id}')">Ver →</button>`)).join("")}</div>
            </div>`;
        }

        grid.innerHTML = html;
    }

    // ---- Render premium ----
    function renderPremium() {
        const premBlock  = document.getElementById("mat-premium-bloque");
        const loginBlock = document.getElementById("mat-premium-login");
        // Contenido restringido: cualquier nivel que no sea gratis (basico o premium)
        const lista = archivos.filter(a => (a.plan_minimo || "gratis") !== "gratis");

        if (!perfilActual) { premBlock.style.display = "none"; loginBlock.style.display = "block"; return; }
        premBlock.style.display = "block"; loginBlock.style.display = "none";

        const premiumActivo = esPremiumActivo(perfilActual);
        const vistos = perfilActual.vistos || [], cuota = vistos.length;

        let estadoHtml = "";
        if (premiumActivo) {
            const nivelActual = nivelDe(perfilActual);
            const dias = diasRestantes(perfilActual), vence = formatearFecha(perfilActual.plan_hasta);
            estadoHtml = `<div class="mat-estado-activa"><span>⭐ Suscripción ${nivelActual === "premium" ? "Premium" : "Básica"} activa</span><span style="font-size:12px;opacity:.85">Vence el ${vence} · ${dias} día${dias !== 1 ? "s" : ""}</span></div>`;
        } else {
            estadoHtml = `<div class="mat-estado-inactiva">
                <div><p style="font-weight:bold;margin:0;font-size:14px">Plan gratuito — ${cuota}/${MAX_ARCHIVOS_GRATIS} archivos</p>${perfilActual.plan_hasta ? `<p style="font-size:12px;color:#b55b00;margin:3px 0 0">Suscripción vencida el ${formatearFecha(perfilActual.plan_hasta)}</p>` : ""}</div>
                <button type="button" class="mat-btn mat-btn-premium" onclick="window._materia.abrirPago()">⭐ Suscribirse — ${PRECIO_SUSCRIPCION}/mes</button>
            </div>
            <div style="margin:8px 0 16px"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:7px;background:#e0e0e0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round((cuota / MAX_ARCHIVOS_GRATIS) * 100)}%;background:#197ce6;border-radius:4px"></div></div><span style="font-size:12px;color:#555">${cuota}/${MAX_ARCHIVOS_GRATIS}</span></div>${cuota >= MAX_ARCHIVOS_GRATIS ? `<p style="font-size:12px;color:#b55b00;margin-top:5px">⚠️ Límite gratuito alcanzado.</p>` : ""}</div>`;
        }

        let gridHtml = "";
        if (!lista.length) {
            gridHtml = `<p class="mat-vacio">No hay contenido premium de ${esc(NOMBRE)} aún.</p>`;
        } else {
            const nivelUsuario = nivelDe(perfilActual);
            gridHtml = lista.map(a => {
                // Cada archivo pide su propio nivel (basico o premium) — no todo el
                // contenido restringido pide lo mismo, y no todos los planes ven lo mismo.
                const requerido = a.plan_minimo || "premium";
                if (nivelPermite(nivelUsuario, requerido)) return tarjeta(a, `<button type="button" class="mat-btn" onclick="window._materia.ver('${a.id}')">Ver →</button>`);
                const yaVisto = vistos.includes(a.id);
                const bloqueado = !yaVisto && cuota >= MAX_ARCHIVOS_GRATIS;
                const accion = yaVisto
                    ? `<button type="button" class="mat-btn" onclick="window._materia.ver('${a.id}')">Ver de nuevo ✓</button>`
                    : bloqueado
                        ? `<div><p style="font-size:12px;color:#999;margin:0 0 6px">🔒 Límite alcanzado</p><button type="button" class="mat-btn mat-btn-premium" onclick="window._materia.abrirPago()">Suscribirse →</button></div>`
                        : `<button type="button" class="mat-btn mat-btn-premium" onclick="window._materia.verPremium('${a.id}')">Desbloquear →</button>`;
                return tarjeta(a, accion);
            }).join("");
        }
        document.getElementById("mat-cuota-info").innerHTML = estadoHtml;
        document.getElementById("mat-premium-grid").innerHTML = gridHtml;
    }

    // ---- Navbar ----
    function renderNavbar() {
        const nb = document.getElementById("mat-navbar-sesion");
        if (!nb) return;
        if (!perfilActual) {
            nb.innerHTML = `<a href="../../index.html#suscripcion" class="mat-nav-btn">🔐 Ingresar</a>`;
            const pts = document.getElementById("mat-nav-puntos");
            if (pts) pts.style.display = "none";
            return;
        }
        const activo = esPremiumActivo(perfilActual);
        const puntos = perfilActual.puntos || 0;
        nb.innerHTML = `
            <a href="#" class="mat-nav-btn" onclick="event.preventDefault();window.location.href='../../index.html#suscripcion'" style="font-size:12px">📋 Planes</a>
            <span style="font-size:13px">${activo ? "⭐" : "👤"} ${esc(perfilActual.username)}</span>
            <button type="button" class="mat-nav-btn" onclick="window._materia.salir()" style="color:#f87171">Salir</button>`;
        const pts = document.getElementById("mat-nav-puntos");
        if (pts) { pts.textContent = "🏆 " + puntos + " pts"; pts.style.display = "inline-flex"; }
    }

    // ---- Sesión ----
    function abrirLogin() {
        // Redirigimos al index donde está el formulario de login
        window.location.href = "../../index.html#suscripcion";
    }
    async function salir() {
        clearTimeout(_sesTimer); clearTimeout(_warnTimer); ocultarWarning();
        if (MA()?.sb) await MA().sbLogout();
        perfilActual = null;
        renderNavbar(); renderPremium();
    }

    // ---- Pago ----
    function abrirPago() { document.getElementById("mat-pago-overlay").style.display = "flex"; }

    // ---- Ver premium ----
    async function verPremium(id) {
        if (!perfilActual) return abrirLogin();
        if (esPremiumActivo(perfilActual)) return verContenido(id);
        const vistos = perfilActual.vistos || [];
        if (vistos.includes(id)) return verContenido(id);
        if (vistos.length >= MAX_ARCHIVOS_GRATIS) return abrirPago();
        const r = await MA().sbAgregarVisto(id);
        if (r) perfilActual = r;
        renderPremium();
        await verContenido(id);
    }

    // ---- Construir página ----
    function construirPagina() {
        document.title = NOMBRE + " — Matemáticas Activa";
        document.body.innerHTML = `
            <header class="mat-header">
                <a href="../../index.html" class="mat-brand" title="Volver al inicio">
                    <span class="mat-brand-icon" aria-hidden="true">∑</span>
                    <span class="mat-brand-text">Matemáticas<strong>Activa</strong></span>
                </a>
                <h1>${EMOJI} ${esc(NOMBRE)}</h1>
                <div class="mat-header-right">
                    <div class="mat-search-wrap" role="search">
                        <span class="mat-search-icon" aria-hidden="true">🔍</span>
                        <input type="search" id="mat-buscador" placeholder="Buscar tema…" aria-label="Buscar tema o subtema" autocomplete="off">
                        <div id="mat-buscador-resultados" class="mat-buscador-resultados"></div>
                    </div>
                    <span id="mat-nav-puntos" class="mat-nav-puntos" style="display:none"></span>
                    <div id="mat-navbar-sesion"></div>
                    <button type="button" id="dark-mode-toggle" class="dark-toggle" onclick="window.toggleDarkMode()" title="Modo oscuro">${document.body.classList.contains('dark') ? '☀️' : '🌙'}</button>
                </div>
            </header>
            <main class="mat-main">
                <section class="mat-section">
                    <h2 class="mat-section-title">📂 Material de ${esc(NOMBRE)}</h2>
                    <p class="mat-section-desc">Videos, PDFs, ejercicios e imágenes de ${esc(NOMBRE)}.</p>
                    <div id="mat-publicos-grid" class="mat-grid"></div>
                </section>
                <section class="mat-section" id="mat-ejercicios-section">
                    <h2 class="mat-section-title">✏️ Ejercicios Interactivos</h2>
                    <p class="mat-section-desc">Resolvé ejercicios y sumá puntos al ranking.</p>
                    <div id="mat-ejercicios-filtros" class="mat-ejercicios-filtros"></div>
                    <div id="mat-ejercicios-grid" class="mat-ejercicios-grid"></div>
                    <div id="mat-ejercicios-admin" style="display:none"></div>
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
                            <p>🔐 Iniciá sesión para acceder al contenido premium de ${esc(NOMBRE)}.</p>
                            <a href="../../index.html#suscripcion" class="mat-btn mat-btn-premium" style="display:inline-block;text-decoration:none">Iniciar sesión</a>
                        </div>
                    </div>
                    <div id="mat-premium-bloque" style="display:none">
                        <div id="mat-cuota-info" style="margin-bottom:14px"></div>
                        <div id="mat-premium-grid" class="mat-grid"></div>
                    </div>
                </section>
            </main>
            <footer class="mat-footer">
                <div class="mat-footer-contacto">
                    <a href="https://wa.me/5493827654154?text=Hola%21%20Te%20escribo%20desde%20Matem%C3%A1ticas%20Activa.%20" target="_blank" rel="noopener" class="mat-footer-link wa">
                        💚 WhatsApp · +54 9 3827 65-4154
                    </a>
                    <a href="https://www.instagram.com/matematicas_activa?igsh=MXVsOHhxZ3owNWNtZA%3D%3D&utm_source=qr" target="_blank" rel="noopener" class="mat-footer-link ig">
                        📷 Instagram · @matematicas_activa
                    </a>
                </div>
                <div class="mat-footer-links">
                    <a href="../../index.html#materias">Materias</a>
                    <a href="../../index.html#suscripcion">Planes</a>
                    <a href="../../index.html#ranking">Ranking</a>
                    <a href="../../politica-privacidad.html">Privacidad</a>
                    <a href="../../terminos-servicio.html">Términos</a>
                </div>
                <p>Copyright © 2025 Matemáticas Activa · Todos los derechos reservados</p>
            </footer>

            <!-- VISOR -->
            <div id="mat-visor-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);align-items:center;justify-content:center;z-index:1000;padding:1rem" role="dialog" aria-modal="true" aria-labelledby="mat-visor-titulo" onclick="if(event.target.id==='mat-visor-overlay')this.style.display='none'">
                <div class="mat-visor-panel" style="background:white;border-radius:14px;padding:24px;width:100%;max-width:860px;max-height:92vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,.25)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px">
                        <h3 id="mat-visor-titulo" style="margin:0;font-size:17px;flex:1;padding-right:12px"></h3>
                        <button type="button" aria-label="Cerrar" onclick="document.getElementById('mat-visor-overlay').style.display='none'" style="background:#f5f5f5;border:none;font-size:14px;cursor:pointer;color:#444;border-radius:6px;padding:5px 12px;flex-shrink:0">✕ Cerrar</button>
                    </div>
                    <div id="mat-visor-cuerpo"></div>
                </div>
            </div>

            <!-- MODAL DE PAGO -->
            <div id="mat-pago-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);align-items:center;justify-content:center;z-index:1000;padding:1rem" role="dialog" aria-modal="true" onclick="if(event.target.id==='mat-pago-overlay')this.style.display='none'">
                <div style="background:white;border-radius:14px;padding:28px;width:100%;max-width:480px;box-shadow:0 10px 40px rgba(0,0,0,.2)">
                    <div style="text-align:center;margin-bottom:20px">
                        <div style="font-size:40px">⭐</div>
                        <h2 style="margin:8px 0 4px;font-size:20px">Suscripción Premium</h2>
                        <div style="font-size:28px;font-weight:bold;color:#197ce6">${PRECIO_SUSCRIPCION} <span style="font-size:14px;color:#888;font-weight:normal">ARS / mes</span></div>
                    </div>
                    <ul style="list-style:none;padding:16px;margin:0 0 20px;background:#f8fbff;border-radius:10px">
                        <li style="padding:5px 0;font-size:14px">✅ Acceso ilimitado a todos los archivos</li>
                        <li style="padding:5px 0;font-size:14px">✅ Videos, PDFs y ejercicios sin restricciones</li>
                        <li style="padding:5px 0;font-size:14px">✅ 30 días de acceso completo</li>
                        <li style="padding:5px 0;font-size:14px">✅ Todas las materias incluidas</li>
                    </ul>
                    <p style="font-size:13px;font-weight:bold;color:#333;margin-bottom:10px">Elegí tu método de pago:</p>
                    <a href="${LINK_MERCADOPAGO}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#009ee3;color:white;border-radius:10px;padding:14px;text-decoration:none;font-weight:bold;font-size:15px;margin-bottom:10px">💳 Pagar con MercadoPago</a>
                    <a href="${LINK_NARANJAX}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#ff6600;color:white;border-radius:10px;padding:14px;text-decoration:none;font-weight:bold;font-size:15px;margin-bottom:20px">🟠 Pagar con Naranja X</a>
                    <div style="background:#fff8e1;border-radius:10px;padding:14px;font-size:13px;color:#5d4037">
                        <p style="font-weight:bold;margin:0 0 6px">📋 ¿Qué hacer después de pagar?</p>
                        <ol style="margin:0;padding-left:18px;line-height:1.8">
                            <li>Completá el pago en la plataforma</li>
                            <li>Guardá el comprobante</li>
                            <li>Enviánoslo al administrador</li>
                            <li>¡Tu acceso se activa en menos de 24 hs!</li>
                        </ol>
                    </div>
                    <button type="button" onclick="document.getElementById('mat-pago-overlay').style.display='none'" style="width:100%;margin-top:16px;padding:10px;background:#f0f0f0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:14px">Cerrar</button>
                </div>
            </div>
        `;
        document.getElementById("mat-visor-overlay").style.display = "none";
    }

    window._materia = { ver: verContenido, verPremium, abrirLogin, salir, abrirPago, resetTimer, abrirSubtema, toggleEditor, insertarImagenQuill, guardarContenido, filtrarEjercicios, responderEjercicio, abrirFormEjercicio, editarEjercicio, eliminarEjercicio, _toggleOpcionesForm, ejecutarBusqueda };

    // ============ DESCRIPCIONES DE TEMAS (mapa curricular) ============
    function _norm(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim(); }
    // TEMA_DESC: descripción del mapa curricular por tema normalizado
    const TEMA_DESC = {
        "numeros naturales n":"Divisibilidad, criterios, MCM, MCD, descomposición factorial.",
        "numeros enteros z":"Operaciones, regla de signos, representación en recta numérica.",
        "numeros racionales q":"Fracciones, decimales, porcentajes, proporcionalidad directa e inversa, razones.",
        "numeros irracionales y reales r":"√2, π, densidad de Q, conmensurabilidad, notación científica.",
        "calculo mental y estimacion":"Estrategias de cálculo, potenciación y radicación, jerarquía de operaciones.",
        "teoria de numeros":"Teorema fundamental de la aritmética, números primos, criba de Eratóstenes.",
        "numeros complejos c":"Forma binómica, polar y exponencial, operaciones, módulo y argumento.",
        "aritmetica modular":"Congruencias, criptografía básica, teorema de Fermat.",
        "sucesiones y series":"Sucesiones aritméticas y geométricas, series convergentes, noción de límite.",
        "expresiones algebraicas":"Factor común, cuadrado del binomio, diferencia de cuadrados, productos notables.",
        "ecuaciones e inecuaciones lineales":"1 variable, 2 variables, sistemas de ecuaciones.",
        "funcion lineal y cuadratica":"Pendiente, ordenada al origen, parábola, vértice, eje de simetría, ceros.",
        "funcion exponencial y logaritmica":"Propiedades, graficación, ecuaciones exponenciales y logarítmicas.",
        "combinatoria basica":"Variaciones, permutaciones, combinaciones simples y con repetición.",
        "algebra lineal":"Vectores, matrices, determinantes, espacios vectoriales, transformaciones lineales.",
        "polinomios y teoria de ecuaciones":"División de polinomios, teorema del resto, raíces complejas.",
        "funciones avanzadas":"Parte entera, valor absoluto, funciones definidas por partes, inversas, composición.",
        "programacion lineal":"Modelización con restricciones, función objetivo, vértices del polígono.",
        "figuras planas":"Triángulos, cuadriláteros, polígonos regulares: propiedades, congruencia, semejanza.",
        "transformaciones isometricas":"Simetrías, traslaciones, rotaciones, homotecia.",
        "teoremas fundamentales":"Pitágoras, Thales, criterios de congruencia y semejanza.",
        "circunferencia y circulo":"Arco, sector circular, ángulos inscriptos, figuras inscriptas y circunscriptas.",
        "cuerpos geometricos":"Prismas, pirámides, cilindro, cono, esfera: áreas y volúmenes.",
        "lugar geometrico":"Mediatriz, bisectriz, circunferencia como LG, construcciones con regla y compás.",
        "geometria analitica conicas":"Circunferencia, parábola, elipse, hipérbola como LG.",
        "ecuacion de la recta":"Formas explícita e implícita, distancia punto-recta, paralelas y perpendiculares.",
        "vectores en el plano y espacio":"Operaciones vectoriales, producto escalar, producto vectorial.",
        "geometria deductiva":"Encadenamientos deductivos, demostraciones formales, axiomas.",
        "geometria diferencial introductoria":"Curvas en el plano, longitud de arco, curvatura.",
        "razones trigonometricas basicas":"Seno, coseno, tangente en triángulo rectángulo.",
        "aplicaciones en triangulos":"Distancias inaccesibles, ángulos de elevación y depresión.",
        "teoremas del seno y del coseno":"Resolución de triángulos cualesquiera (oblicuángulos).",
        "razones de angulos especiales":"0°, 30°, 45°, 60°, 90°; ángulos complementarios y suplementarios.",
        "circunferencia trigonometrica":"Razones para cualquier ángulo, medida en radianes, periodicidad.",
        "funciones trigonometricas":"Seno, coseno y tangente como funciones; dominio, imagen, período.",
        "identidades trigonometricas":"Identidad pitagórica, ángulo doble, ángulo suma/diferencia.",
        "ecuaciones trigonometricas":"Resolución analítica y gráfica, conjuntos solución en R.",
        "funciones inversas arcoseno arccoseno":"Dominio restringido, aplicaciones en física e ingeniería.",
        "nocion de limite":"Convergencia de sucesiones, tendencia de funciones, asíntotas.",
        "comportamiento de funciones":"Crecimiento, decrecimiento, máximos y mínimos.",
        "introduccion a la derivada":"Tasa de variación, recta tangente, optimización simple.",
        "limites y continuidad":"Definición formal ε-δ, límites laterales, discontinuidades.",
        "derivadas":"Reglas de derivación, regla de la cadena, derivadas implícitas.",
        "aplicaciones de la derivada":"Máximos, mínimos, concavidad, inflexión, regla de L'Hôpital.",
        "integral definida e indefinida":"Antiderivadas, teorema fundamental del cálculo, técnicas de integración.",
        "aplicaciones de la integral":"Área entre curvas, volumen de revolución, longitud de arco.",
        "calculo multivariable introductorio":"Funciones de varias variables, derivadas parciales, gradiente.",
        "estadistica descriptiva":"Variables, tablas de frecuencia, gráficos estadísticos.",
        "medidas de posicion":"Media, mediana, moda, cuartiles y percentiles.",
        "medidas de dispersion":"Varianza, desviación estándar, rango.",
        "probabilidad basica":"Espacio muestral, fórmula de Laplace, sucesos simples y compuestos.",
        "probabilidad condicionada":"Eventos dependientes e independientes, pruebas de Bernoulli.",
        "correlacion lineal":"Nube de puntos, recta de regresión, ajuste lineal.",
        "distribuciones de probabilidad":"Binomial, Poisson, Normal (Gauss), estandarización con Z.",
        "inferencia estadistica":"Intervalos de confianza, tamaño de muestra.",
        "pruebas de hipotesis":"Hipótesis nula y alternativa, errores tipo I y II, p-valor.",
        "regresion y correlacion avanzada":"Regresión lineal múltiple, R², análisis residual.",
        "variable aleatoria y esperanza":"Valor esperado, varianza, momentos.",
        "estadistica bayesiana introductoria":"Teorema de Bayes, probabilidades a priori y a posteriori.",
        "permutaciones y combinatoria":"Variaciones, permutaciones y combinaciones con y sin repetición.",
        "criptografia y ciencia de datos":"Cifrado, hashing, análisis de datos, modelos predictivos.",
        "logica proposicional":"Proposiciones, conectivos, tablas de verdad, razonamiento deductivo.",
        "teoria de conjuntos":"Operaciones, diagramas de Venn, cardinalidad, conjuntos numéricos.",
        "sucesiones numericas":"Patrones, sucesiones aritméticas y geométricas, Fibonacci.",
        "problemas de ingenio":"Acertijos lógicos, puzzles matemáticos y desafíos de pensamiento lateral.",
        "paradojas matematicas":"Paradoja de Zenón, del barbero, de Banach-Tarski y más.",
        "trucos y patrones numericos":"Trucos de cálculo rápido, curiosidades numéricas y patrones ocultos.",
        "matematicas en la vida cotidiana":"Aplicaciones reales: finanzas, deportes, cocina, arquitectura.",
        "acertijos y desafios logicos":"Problemas de pensamiento lateral y razonamiento lógico.",
        "historia de los numeros":"Del sistema babilónico al binario: cómo evolucionó contar.",
        "grandes matematicos de la historia":"Euclides, Arquímedes, Euler, Gauss, Ramanujan y más.",
        "problemas famosos sin resolver":"Hipótesis de Riemann, P vs NP, conjetura de Goldbach.",
        "ilusiones geometricas y fractales":"Figuras imposibles, fractales, dimensión fraccionaria.",
        "matematicas en el arte y la musica":"Proporción áurea, simetría, escalas musicales, Escher.",
        "evolucion del algebra y el calculo":"De Al-Juarismi a Newton y Leibniz: la historia del cálculo.",
    };
    const PDF_MANIFEST = {}; // Sin PDFs por ahora
    const PDF_RUTA = "../../";

    const _subtemaPlanesCache = { plan: null };
    async function obtenerPlan(){
        if (_subtemaPlanesCache.plan) return _subtemaPlanesCache.plan;
        try {
            const p = await MA()?.sbPlanVigente?.();
            _subtemaPlanesCache.plan = p || "gratis";
        } catch(e){ _subtemaPlanesCache.plan = "gratis"; }
        return _subtemaPlanesCache.plan;
    }

    function _bloque(base, tipo, plan){
        const accesos = { apunte: ["gratis","basico","premium"], problemas: ["basico","premium"], soluciones: ["premium"] };
        const meta = ({
            apunte:    {icon:"📘", titulo:"Apunte teorico",            sub:"Teoria, ejemplos y ejercicios para nivel Secundario y Universitario.", file:"Apunte-"+base+".pdf",     badgeCls:""},
            problemas: {icon:"📝", titulo:"15 problemas para resolver", sub:"Situaciones problematicas con espacio para escribir el procedimiento.", file:"Problemas-"+base+".pdf",  badgeCls:"basico"},
            soluciones:{icon:"✅", titulo:"Soluciones desarrolladas",   sub:"Resolucion paso a paso de los 15 problemas.",                          file:"Soluciones-"+base+".pdf", badgeCls:"premium"},
        })[tipo];
        const ok = accesos[tipo].includes(plan);
        const planLabel = { apunte:"Gratis", problemas:"Basico", soluciones:"Premium" }[tipo];
        const badge = `<span class="subtema-plan-badge ${meta.badgeCls}">${planLabel}</span>`;
        if (ok) {
            return `<div class="subtema-archivo disponible" onclick="window.open('${PDF_RUTA}${meta.file}','_blank','noopener')">
                <div class="subtema-archivo-icon">${meta.icon}</div>
                <div class="subtema-archivo-body">
                    <p class="subtema-archivo-titulo">${meta.titulo} ${badge}</p>
                    <p class="subtema-archivo-sub">${meta.sub}</p>
                </div>
                <a class="subtema-archivo-cta abrir" href="${PDF_RUTA}${meta.file}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Abrir →</a>
            </div>`;
        }
        const planReq = tipo === "problemas" ? "Basico" : "Premium";
        return `<div class="subtema-archivo bloqueado">
            <div class="subtema-archivo-icon">🔒</div>
            <div class="subtema-archivo-body">
                <p class="subtema-archivo-titulo">${meta.titulo} ${badge}</p>
                <p class="subtema-archivo-sub">Requiere plan <strong>${planReq}</strong>. ${meta.sub}</p>
            </div>
            <a class="subtema-archivo-cta bloqueado" href="../../index.html#suscripcion" onclick="event.stopPropagation()">Desbloquear</a>
        </div>`;
    }

    function _asegurarOverlay(){
        let ov = document.getElementById("subtema-overlay");
        if (ov) return ov;
        ov = document.createElement("div");
        ov.id = "subtema-overlay";
        ov.className = "subtema-overlay";
        ov.addEventListener("click", e => { if (e.target === ov) ov.classList.remove("activo"); });
        document.body.appendChild(ov);
        return ov;
    }

    // Contenido explicativo breve por subtema (keys = _norm del nombre del tema)
    const SUBTEMA_CONTENIDO = {
        "divisibilidad y criterios": {
            intro: "La divisibilidad estudia cuándo un número se puede dividir exactamente por otro, sin resto.",
            puntos: ["Criterios de divisibilidad: por 2, 3, 4, 5, 6, 9, 10, 11","Múltiplos y divisores","Relación con la factorización en primos","Aplicaciones: simplificación de fracciones"],
            tip: "Un número es divisible por 3 si la suma de sus cifras es múltiplo de 3."
        },
        "mcm y mcd": {
            intro: "El MCD (máximo común divisor) y el MCM (mínimo común múltiplo) son herramientas esenciales para trabajar con fracciones.",
            puntos: ["MCD: el mayor número que divide a ambos","MCM: el menor múltiplo común a ambos","Método de factorización en primos","Algoritmo de Euclides para el MCD"],
            tip: "Relación clave: MCD(a,b) × MCM(a,b) = a × b"
        },
        "descomposicion factorial": {
            intro: "Descomponer un número en factores primos permite encontrar todos sus divisores y trabajar con MCD y MCM.",
            puntos: ["Número primo: tiene exactamente 2 divisores","Criba de Eratóstenes: método para encontrar primos","Teorema fundamental: la factorización es única","Aplicaciones: criptografía, MCD y MCM"],
            tip: "El 1 no es primo ni compuesto. El 2 es el único primo par."
        },
        "operaciones con enteros": {
            intro: "Los números enteros (ℤ) amplían los naturales incluyendo los negativos y el cero.",
            puntos: ["Opuesto de un número: a y −a","Valor absoluto: distancia al cero en la recta","Suma y resta de enteros","Multiplicación y división con signos"],
            tip: "La regla de los signos: (+)(+) = + , (−)(−) = + , (+)(−) = − , (−)(+) = −"
        },
        "regla de signos": {
            intro: "La regla de los signos permite determinar el signo del resultado al multiplicar o dividir enteros.",
            puntos: ["Signos iguales → resultado positivo","Signos diferentes → resultado negativo","Se aplica también a fracciones y decimales","Es fundamental para resolver ecuaciones"],
            tip: "(+)(+) = + , (−)(−) = + , (+)(−) = − , (−)(+) = −"
        },
        "fracciones": {
            intro: "Una fracción representa una parte de un todo. Se escribe como a/b donde a es el numerador y b el denominador.",
            puntos: ["Fracciones equivalentes: representan el mismo valor","Operaciones: suma, resta, multiplicación y división","Simplificación: dividir numerador y denominador por su MCD","Fracciones mixtas: número entero + fracción propia"],
            tip: "Para sumar fracciones con distinto denominador, primero encontrá el MCM."
        },
        "decimales": {
            intro: "Los números decimales son otra forma de representar fracciones, usando el sistema posicional con la coma decimal.",
            puntos: ["Decimales exactos: cantidad finita de cifras","Decimales periódicos: se repite un patrón","Conversión: de fracción a decimal y viceversa","Operaciones: mismas reglas, cuidando la coma"],
            tip: "Todo decimal periódico se puede escribir como fracción — es un número racional."
        },
        "porcentajes": {
            intro: "Un porcentaje expresa una proporción como una fracción de 100.",
            puntos: ["Fórmula: porcentaje = (parte / total) × 100","Aumentos y descuentos","Porcentaje de un porcentaje","Gráficos de torta"],
            tip: "Un aumento del 50% seguido de un descuento del 50% NO te deja en el valor original."
        },
        "proporcionalidad directa e inversa": {
            intro: "La proporcionalidad estudia la relación entre magnitudes que crecen o decrecen de manera constante.",
            puntos: ["Directamente proporcional: si una crece, la otra también","Inversamente proporcional: si una crece, la otra decrece","Regla de tres: simple y compuesta","Constante de proporcionalidad"],
            tip: "En una proporción a/b = c/d, se cumple que a×d = b×c (productos cruzados)."
        },
        "conjuntos numericos": {
            intro: "Los conjuntos numéricos organizan todos los tipos de números: naturales, enteros, racionales, reales y complejos.",
            puntos: ["Naturales (ℕ): 0, 1, 2, 3…","Enteros (ℤ): …−2, −1, 0, 1, 2…","Racionales (ℚ): fracciones a/b","Reales (ℝ): todos los de la recta","Complejos (ℂ): incluyen i"],
            tip: "Cada conjunto está contenido en el siguiente: ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ ⊂ ℂ"
        },
        "potenciacion y radicacion": {
            intro: "La potenciación es una multiplicación repetida y la radicación es su operación inversa.",
            puntos: ["Potencia: aⁿ = a × a × … × a (n veces)","Propiedades: producto, cociente, potencia de potencia","Raíz n-ésima: el número que elevado a n da el radicando","Racionalización del denominador"],
            tip: "Toda raíz se puede escribir como potencia fraccionaria: ⁿ√a = a^(1/n)."
        },
        "jerarquia de operaciones": {
            intro: "La jerarquía de operaciones establece el orden en que se resuelven las expresiones matemáticas.",
            puntos: ["1° Paréntesis","2° Potencias y raíces","3° Multiplicación y división","4° Suma y resta"],
            tip: "Regla mnemotécnica: Pa-Po-Mu-Di-Su-Re (Paréntesis, Potencias, Multiplicación, División, Suma, Resta)."
        },
    };

    // ---- Quill editor (carga lazy) con KaTeX para fórmulas ----
    let _quillLoaded = false;
    function cargarQuill() {
        if (_quillLoaded) return Promise.resolve();
        return new Promise(resolve => {
            // KaTeX CSS (para fórmulas matemáticas)
            const katexCss = document.createElement('link');
            katexCss.rel = 'stylesheet';
            katexCss.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
            document.head.appendChild(katexCss);
            // KaTeX JS
            const katexJs = document.createElement('script');
            katexJs.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
            document.head.appendChild(katexJs);
            // Quill CSS
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css';
            document.head.appendChild(css);
            // Quill JS
            const js = document.createElement('script');
            js.src = 'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js';
            js.onload = () => { _quillLoaded = true; resolve(); };
            document.head.appendChild(js);
        });
    }

    let _quillInstance = null;
    async function initQuillEditor(temaId, contenidoActual) {
        await cargarQuill();
        const editorWrap = document.getElementById('subtema-editor-wrap');
        if (!editorWrap) return;

        editorWrap.innerHTML = `
            <div class="subtema-editor-toolbar">
                <button type="button" class="subtema-editor-toggle" id="btn-toggle-editor" onclick="window._materia.toggleEditor()">✏️ Editar contenido</button>
                <button type="button" class="subtema-editor-save" id="btn-save-editor" style="display:none" onclick="window._materia.guardarContenido('${temaId}')">💾 Guardar</button>
                <span id="subtema-editor-status" style="font-size:12px;color:#94a3b8;margin-left:8px"></span>
            </div>
            <div id="subtema-quill-container" style="display:none">
                <div id="subtema-quill-editor"></div>
            </div>`;

        // Inicializar Quill cuando se abra
        editorWrap._temaId = temaId;
        editorWrap._contenido = contenidoActual;
        _quillInstance = null;
    }

    function toggleEditor() {
        const container = document.getElementById('subtema-quill-container');
        const btnToggle = document.getElementById('btn-toggle-editor');
        const btnSave = document.getElementById('btn-save-editor');
        if (!container) return;

        const visible = container.style.display !== 'none';
        if (visible) {
            container.style.display = 'none';
            btnToggle.textContent = '✏️ Editar contenido';
            btnSave.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        btnToggle.textContent = '✕ Cerrar editor';
        btnSave.style.display = 'inline-block';

        if (!_quillInstance) {
            // Registrar tamaños de fuente personalizados
            const SizeStyle = Quill.import('attributors/style/size');
            SizeStyle.whitelist = ['10px','12px','14px','16px','18px','20px','24px','28px','32px','36px','48px'];
            Quill.register(SizeStyle, true);

            // Registrar familias tipográficas
            const FontStyle = Quill.import('attributors/style/font');
            FontStyle.whitelist = ['serif','monospace','Arial','Georgia','Times New Roman','Courier New','Verdana','Poppins'];
            Quill.register(FontStyle, true);

            // Colores predefinidos para matemáticas (incluye purples del contenido)
            const mathColors = [
                '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#efefef','#f3f3f3','#ffffff',
                '#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff','#9900ff',
                '#e6b8af','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e0e3','#c9daf8','#cfe2f3','#d9d2e9',
                '#dd7e6b','#ea9999','#f9cb9c','#ffe599','#b6d7a8','#a2c4c9','#a4c2f4','#9fc5e8','#b4a7d6',
                '#cc4125','#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6d9eeb','#6fa8dc','#8e7cc3',
                '#a61c00','#cc0000','#e69138','#f1c232','#6aa84f','#45818e','#3c78d8','#3d85c6','#674ea7',
                '#85200c','#990000','#b45f06','#bf9000','#38761d','#134f5c','#1155cc','#0b5394','#351c75',
                '#5b0f00','#660000','#783f04','#7f6000','#274e13','#0c343d','#1c4587','#073763','#20124d',
                // Purples del contenido de la plataforma
                '#6b24b2','#c285ff','#7c3aed','#a855f7','#d8b4fe','#ede9fe',
                // Extras útiles para educación
                '#f472b6','#fb923c','#facc15','#4ade80','#22d3ee','#60a5fa','#a78bfa','#e879f9'
            ];

            _quillInstance = new Quill('#subtema-quill-editor', {
                theme: 'snow',
                placeholder: 'Escribí el contenido del tema acá...',
                modules: {
                    toolbar: {
                        container: [
                            // Fila 1: Estructura
                            [{ header: [1, 2, 3, 4, false] }],
                            [{ font: FontStyle.whitelist }, { size: SizeStyle.whitelist }],
                            // Fila 2: Formato texto
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ script: 'sub' }, { script: 'super' }],
                            // Fila 3: Colores
                            [{ color: mathColors }, { background: mathColors }],
                            // Fila 4: Párrafo
                            [{ list: 'ordered' }, { list: 'bullet' }],
                            [{ indent: '-1' }, { indent: '+1' }],
                            [{ align: [] }],
                            [{ direction: 'rtl' }],
                            // Fila 5: Bloques e inserciones
                            ['blockquote', 'code-block'],
                            ['link', 'image', 'video', 'formula'],
                            // Fila 6: Tablas y utilidades
                            ['table-insert', 'table-delete-row', 'table-delete-col', 'table-delete', 'divider'],
                            ['clean']
                        ],
                        handlers: {
                            image: function() { window._materia.insertarImagenQuill(); },
                            'table-insert': function() { _insertarTabla(); },
                            'table-delete-row': function() { _tablaEliminarFila(); },
                            'table-delete-col': function() { _tablaEliminarColumna(); },
                            'table-delete': function() { _tablaEliminar(); },
                            'divider': function() { _insertarDivider(); },
                            'formula': function() { _insertarFormula(); }
                        }
                    }
                }
            });

            // Personalizar botones custom en la toolbar
            const toolbar = document.querySelector('#subtema-quill-container .ql-toolbar');
            if (toolbar) {
                const tableBtn = toolbar.querySelector('.ql-table-insert');
                if (tableBtn) { tableBtn.innerHTML = '<svg viewBox="0 0 18 18"><rect x="1" y="1" width="16" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="7" x2="17" y2="7" stroke="currentColor" stroke-width="1"/><line x1="1" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1"/><line x1="7" y1="1" x2="7" y2="17" stroke="currentColor" stroke-width="1"/><line x1="12" y1="1" x2="12" y2="17" stroke="currentColor" stroke-width="1"/></svg>'; tableBtn.title = 'Insertar tabla'; }

                const delRowBtn = toolbar.querySelector('.ql-table-delete-row');
                if (delRowBtn) { delRowBtn.innerHTML = '<svg viewBox="0 0 18 18"><rect x="1" y="5" width="16" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="7" x2="14" y2="11" stroke="#e53e3e" stroke-width="1.8"/><line x1="14" y1="7" x2="4" y2="11" stroke="#e53e3e" stroke-width="1.8"/></svg>'; delRowBtn.title = 'Eliminar fila'; }

                const delColBtn = toolbar.querySelector('.ql-table-delete-col');
                if (delColBtn) { delColBtn.innerHTML = '<svg viewBox="0 0 18 18"><rect x="5" y="1" width="8" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="7" y1="4" x2="11" y2="14" stroke="#e53e3e" stroke-width="1.8"/><line x1="11" y1="4" x2="7" y2="14" stroke="#e53e3e" stroke-width="1.8"/></svg>'; delColBtn.title = 'Eliminar columna'; }

                const delTableBtn = toolbar.querySelector('.ql-table-delete');
                if (delTableBtn) { delTableBtn.innerHTML = '<svg viewBox="0 0 18 18"><rect x="1" y="1" width="16" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="1" y1="7" x2="17" y2="7" stroke="currentColor" stroke-width="0.8"/><line x1="7" y1="1" x2="7" y2="17" stroke="currentColor" stroke-width="0.8"/><line x1="3" y1="3" x2="15" y2="15" stroke="#e53e3e" stroke-width="2"/><line x1="15" y1="3" x2="3" y2="15" stroke="#e53e3e" stroke-width="2"/></svg>'; delTableBtn.title = 'Eliminar tabla completa'; }

                const divBtn = toolbar.querySelector('.ql-divider');
                if (divBtn) { divBtn.innerHTML = '<svg viewBox="0 0 18 18"><line x1="1" y1="9" x2="17" y2="9" stroke="currentColor" stroke-width="2"/></svg>'; divBtn.title = 'Línea separadora'; }
                const formulaBtn = toolbar.querySelector('.ql-formula');
                if (formulaBtn) { formulaBtn.title = 'Insertar fórmula matemática (LaTeX)'; }
            }

            const wrap = document.getElementById('subtema-editor-wrap');
            if (wrap?._contenido) {
                _quillInstance.root.innerHTML = wrap._contenido;
            }

            // Fix: reposicionar dropdowns del color picker usando position:fixed
            // para que no queden clipados por el overflow-y:auto del overlay
            _fixQuillPickerOverflow(document.getElementById('subtema-quill-container'));
        }
    }

    function _fixQuillPickerOverflow(container) {
        if (!container) return;

        // Inyectar CSS para que la grilla de colores muestre todos los swatches
        if (!document.getElementById('quill-color-fix-css')) {
            const style = document.createElement('style');
            style.id = 'quill-color-fix-css';
            style.textContent = `
                .ql-picker.ql-color .ql-picker-options,
                .ql-picker.ql-background .ql-picker-options {
                    width: 216px !important;
                    min-width: 216px !important;
                    padding: 4px 6px 4px 6px !important;
                    flex-wrap: wrap !important;
                    gap: 0px !important;
                }
                .ql-picker.ql-expanded.ql-color .ql-picker-options,
                .ql-picker.ql-expanded.ql-background .ql-picker-options {
                    display: flex !important;
                }
                .ql-picker.ql-color .ql-picker-options .ql-picker-item,
                .ql-picker.ql-background .ql-picker-options .ql-picker-item {
                    width: 20px !important;
                    height: 20px !important;
                    margin: 1px !important;
                    padding: 0 !important;
                    border-radius: 3px !important;
                }
                .ql-picker.ql-color .ql-picker-options .ql-picker-item:hover,
                .ql-picker.ql-background .ql-picker-options .ql-picker-item:hover {
                    transform: scale(1.25);
                    box-shadow: 0 0 3px rgba(0,0,0,.4);
                    z-index: 1;
                }
            `;
            document.head.appendChild(style);
        }

        const obs = new MutationObserver(mutations => {
            mutations.forEach(m => {
                if (m.type !== 'attributes' || m.attributeName !== 'class') return;
                const picker = m.target;
                if (!picker.classList.contains('ql-picker')) return;
                const opts = picker.querySelector('.ql-picker-options');
                if (!opts) return;
                if (picker.classList.contains('ql-expanded')) {
                    const rect = picker.getBoundingClientRect();
                    opts.style.position   = 'fixed';
                    opts.style.top        = (rect.bottom + 4) + 'px';
                    opts.style.left       = rect.left + 'px';
                    opts.style.zIndex     = '99999';
                    opts.style.maxHeight  = 'none';
                    opts.style.overflow   = 'visible';
                    // ajuste: si se sale por la derecha o abajo
                    requestAnimationFrame(() => {
                        const or = opts.getBoundingClientRect();
                        if (or.right > window.innerWidth - 8) {
                            opts.style.left = Math.max(8, window.innerWidth - or.width - 8) + 'px';
                        }
                        if (or.left < 8) opts.style.left = '8px';
                        if (or.bottom > window.innerHeight - 8) {
                            opts.style.top = (rect.top - or.height - 4) + 'px';
                        }
                    });
                } else {
                    opts.style.position  = '';
                    opts.style.top       = '';
                    opts.style.left      = '';
                    opts.style.zIndex    = '';
                    opts.style.maxHeight = '';
                    opts.style.overflow  = '';
                }
            });
        });
        container.querySelectorAll('.ql-picker').forEach(p => obs.observe(p, { attributes: true }));
    }

    // -- Insertar tabla en el editor --
    function _insertarTabla() {
        if (!_quillInstance) return;
        const rows = prompt('¿Cuántas filas?', '3');
        const cols = prompt('¿Cuántas columnas?', '3');
        if (!rows || !cols) return;
        const r = Math.min(parseInt(rows) || 3, 20);
        const c = Math.min(parseInt(cols) || 3, 10);
        let html = '<table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr>';
        for (let j = 0; j < c; j++) html += '<th style="border:1.5px solid #cbd5e1;padding:8px 12px;background:#f1f5f9;font-weight:700;text-align:left">Encabezado</th>';
        html += '</tr></thead><tbody>';
        for (let i = 0; i < r - 1; i++) {
            html += '<tr>';
            for (let j = 0; j < c; j++) html += '<td style="border:1px solid #e2e8f0;padding:8px 12px">&nbsp;</td>';
            html += '</tr>';
        }
        html += '</tbody></table><p><br></p>';
        const range = _quillInstance.getSelection(true);
        _quillInstance.clipboard.dangerouslyPasteHTML(range.index, html);
    }

    // -- Helpers: encontrar tabla/celda en la selección actual --
    function _encontrarTablaDesdeSeleccion() {
        if (!_quillInstance) return null;
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return null;
        let node = sel.anchorNode;
        while (node && node !== _quillInstance.root) {
            if (node.nodeName === 'TD' || node.nodeName === 'TH') return node;
            node = node.parentNode;
        }
        return null;
    }

    // -- Eliminar fila --
    function _tablaEliminarFila() {
        const cell = _encontrarTablaDesdeSeleccion();
        if (!cell) { alert('Colocá el cursor dentro de una tabla primero.'); return; }
        const row = cell.closest('tr');
        const table = cell.closest('table');
        if (!row || !table) return;
        const rows = table.querySelectorAll('tr');
        if (rows.length <= 1) {
            // Si es la última fila, eliminar toda la tabla
            table.remove();
        } else {
            row.remove();
        }
        _quillInstance.update();
    }

    // -- Eliminar columna --
    function _tablaEliminarColumna() {
        const cell = _encontrarTablaDesdeSeleccion();
        if (!cell) { alert('Colocá el cursor dentro de una tabla primero.'); return; }
        const table = cell.closest('table');
        if (!table) return;
        const colIndex = Array.from(cell.parentNode.children).indexOf(cell);
        const allRows = table.querySelectorAll('tr');
        const totalCols = allRows[0] ? allRows[0].children.length : 0;
        if (totalCols <= 1) {
            // Si es la última columna, eliminar toda la tabla
            table.remove();
        } else {
            allRows.forEach(row => {
                if (row.children[colIndex]) row.children[colIndex].remove();
            });
        }
        _quillInstance.update();
    }

    // -- Eliminar tabla completa --
    function _tablaEliminar() {
        const cell = _encontrarTablaDesdeSeleccion();
        if (!cell) { alert('Colocá el cursor dentro de una tabla primero.'); return; }
        const table = cell.closest('table');
        if (!table) return;
        if (confirm('¿Eliminar la tabla completa?')) {
            table.remove();
            _quillInstance.update();
        }
    }

    // -- Insertar línea separadora --
    function _insertarDivider() {
        if (!_quillInstance) return;
        const range = _quillInstance.getSelection(true);
        _quillInstance.clipboard.dangerouslyPasteHTML(range.index, '<hr style="border:none;border-top:2px solid #e2e8f0;margin:20px 0"><p><br></p>');
    }

    // -- Insertar fórmula matemática (KaTeX) --
    function _insertarFormula() {
        if (!_quillInstance) return;
        const latex = prompt(
            'Escribí tu fórmula en LaTeX:\n\nEjemplos:\n  x^2 + y^2 = z^2\n  \\frac{a}{b}\n  \\sqrt{x}\n  \\int_0^1 f(x)dx\n  \\sum_{i=1}^{n} i',
            'x^2 + y^2 = z^2'
        );
        if (!latex) return;
        try {
            if (typeof katex !== 'undefined') {
                const html = katex.renderToString(latex, { throwOnError: false, displayMode: true });
                const range = _quillInstance.getSelection(true);
                _quillInstance.clipboard.dangerouslyPasteHTML(range.index,
                    `<div class="math-formula" style="text-align:center;margin:16px 0;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">${html}</div><p><br></p>`
                );
            } else {
                // Fallback si KaTeX no cargó: insertar como código
                const range = _quillInstance.getSelection(true);
                _quillInstance.clipboard.dangerouslyPasteHTML(range.index,
                    `<pre class="math-formula-code" style="text-align:center;margin:16px 0;padding:12px;background:#f8fafc;border-radius:8px;font-family:monospace;font-size:18px">${latex}</pre><p><br></p>`
                );
            }
        } catch (e) {
            console.error('Error renderizando fórmula:', e);
            alert('Error en la fórmula LaTeX. Revisá la sintaxis.');
        }
    }

    function insertarImagenQuill() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            const status = document.getElementById('subtema-editor-status');
            if (status) status.textContent = '⏳ Subiendo imagen...';
            const wrap = document.getElementById('subtema-editor-wrap');
            const temaId = wrap?._temaId;
            try {
                const result = await MA().sbSubirImagenTema(file, temaId);
                if (result.error) throw result.error;
                const range = _quillInstance.getSelection(true);
                _quillInstance.insertEmbed(range.index, 'image', result.url);
                _quillInstance.setSelection(range.index + 1);
                if (status) status.textContent = '✅ Imagen insertada';
                setTimeout(() => { if (status) status.textContent = ''; }, 2000);
            } catch (err) {
                if (status) status.textContent = '❌ Error: ' + (err.message || err);
            }
        };
        input.click();
    }

    async function guardarContenido(temaId) {
        if (!_quillInstance) return;
        const status = document.getElementById('subtema-editor-status');
        if (status) status.textContent = '⏳ Guardando...';
        const html = _quillInstance.root.innerHTML;
        const result = await MA().sbGuardarContenidoTema(temaId, html);
        if (result.error) {
            if (status) status.textContent = '❌ Error: ' + (result.error.message || result.error);
        } else {
            if (status) status.textContent = '✅ Guardado';
            // Actualizar la vista de lectura
            const viewer = document.getElementById('subtema-contenido-viewer');
            if (viewer) { viewer.innerHTML = html; viewer.style.display = html.trim() ? 'block' : 'none'; }
            setTimeout(() => { if (status) status.textContent = ''; }, 2000);
        }
    }

    async function abrirSubtema(temaId, nombre){
        const ov = _asegurarOverlay();
        const tema = temasMateria.find(t => t.id === temaId);
        const titulo = nombre || tema?.nombre || "Subtema";
        const cat = tema?.categoria || "";
        const nivel = tema?.nivel ? `Nivel ${tema.nivel}` : "";
        const key = _norm(titulo);
        const desc = TEMA_DESC[key] || '';
        const nivelTag = tema?.nivel === 1 ? '🎓 Secundario' : tema?.nivel === 2 ? '🏛 Universitario' : '';
        const esAdmin = perfilActual?.rol === 'admin';

        ov.innerHTML = `<div class="subtema-panel" onclick="event.stopPropagation()">
            <button type="button" class="subtema-close" aria-label="Cerrar" onclick="document.getElementById('subtema-overlay').classList.remove('activo')">✕</button>
            <div class="subtema-header-row">
                <p class="subtema-eyebrow">${esc(NOMBRE)}</p>
                ${nivelTag ? `<span class="subtema-nivel-tag nivel-${tema?.nivel}">${nivelTag}</span>` : ''}
            </div>
            <h2 class="subtema-titulo">${esc(titulo)}</h2>
            ${desc ? `<p class="subtema-desc-curricular">${esc(desc)}</p>` : ''}
            <div id="subtema-contenido-viewer" class="subtema-contenido-viewer" style="display:none"></div>
            <div id="subtema-contenido-fallback"></div>
            ${esAdmin ? '<div id="subtema-editor-wrap" class="subtema-editor-wrap"></div>' : ''}
            <p class="subtema-archivos-titulo">📁 Material disponible</p>
            <div class="subtema-archivos" id="subtema-archivos-cont"><p style="padding:16px;color:#94a3b8;text-align:center">Cargando…</p></div>
        </div>`;
        ov.classList.add("activo");

        // Cargar contenido de la DB
        const contenidoDB = await MA()?.sbObtenerContenidoTema?.(temaId);
        const viewer = document.getElementById('subtema-contenido-viewer');
        const fallback = document.getElementById('subtema-contenido-fallback');

        if (contenidoDB?.contenido_html?.trim()) {
            // Mostrar contenido escrito por el admin
            if (viewer) { viewer.innerHTML = contenidoDB.contenido_html; viewer.style.display = 'block'; }
        } else {
            // Fallback: mostrar contenido hardcoded si existe
            const contenido = SUBTEMA_CONTENIDO[key];
            if (contenido && fallback) {
                fallback.innerHTML = `
                    <div class="subtema-explicacion">
                        <p class="subtema-intro">${esc(contenido.intro)}</p>
                        <div class="subtema-puntos-clave">
                            <h4>📌 Puntos clave</h4>
                            <ul>${contenido.puntos.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
                        </div>
                        ${contenido.tip ? `<div class="subtema-tip"><span class="subtema-tip-icon">💡</span><span>${esc(contenido.tip)}</span></div>` : ""}
                    </div>`;
            }
        }

        // Editor para admin
        if (esAdmin) {
            initQuillEditor(temaId, contenidoDB?.contenido_html || '');
        }

        // Archivos
        const plan = await obtenerPlan();
        const cont = document.getElementById("subtema-archivos-cont");

        let htmlArchivos = "";

        const archivosPublicos = archivos.filter(a => a.tema_id === temaId && (a.plan_minimo || "gratis") === "gratis");
        if (archivosPublicos.length > 0) {
            htmlArchivos += `<p style="font-size:13px;font-weight:700;color:#334155;margin:16px 0 8px;padding-top:12px;border-top:1px solid #e2e8f0">📂 Contenido cargado</p>`;
            htmlArchivos += archivosPublicos.map(a => `
                <div class="subtema-archivo disponible" onclick="window._materia.ver('${a.id}')">
                    <div class="subtema-archivo-icon">${({video:"🎬",pdf:"📄",imagen:"🖼️",texto:"📝"})[a.seccion] || "📁"}</div>
                    <div class="subtema-archivo-body">
                        <p class="subtema-archivo-titulo">${esc(a.titulo || 'Archivo')}</p>
                        <p class="subtema-archivo-sub">${esc(a.descripcion || 'Material del equipo.')}</p>
                    </div>
                    <button type="button" class="subtema-archivo-cta abrir" onclick="event.stopPropagation();window._materia.ver('${a.id}')">Ver →</button>
                </div>`).join("");
        }

        const archivosPremium = archivos.filter(a => a.tema_id === temaId && (a.plan_minimo || "gratis") !== "gratis");
        if (archivosPremium.length > 0) {
            htmlArchivos += `<p style="font-size:13px;font-weight:700;color:#92400e;margin:16px 0 8px;padding-top:12px;border-top:1px solid #fde68a">⭐ Contenido restringido</p>`;
            const nivelUsuario = perfilActual ? nivelDe(perfilActual) : "gratis";
            htmlArchivos += archivosPremium.map(a => {
                const requerido = a.plan_minimo || "premium";
                const etiqueta = requerido === "premium" ? "Premium" : "Básico";
                if (nivelPermite(nivelUsuario, requerido)) {
                    return `<div class="subtema-archivo disponible" onclick="window._materia.ver('${a.id}')">
                        <div class="subtema-archivo-icon">⭐</div>
                        <div class="subtema-archivo-body">
                            <p class="subtema-archivo-titulo">${esc(a.titulo || 'Archivo')}</p>
                            <p class="subtema-archivo-sub">${esc(a.descripcion || 'Contenido exclusivo.')}</p>
                        </div>
                        <button type="button" class="subtema-archivo-cta abrir" onclick="event.stopPropagation();window._materia.ver('${a.id}')">Ver →</button>
                    </div>`;
                }
                return `<div class="subtema-archivo bloqueado">
                    <div class="subtema-archivo-icon">🔒</div>
                    <div class="subtema-archivo-body">
                        <p class="subtema-archivo-titulo">${esc(a.titulo || 'Archivo')}</p>
                        <p class="subtema-archivo-sub">Requiere suscripción ${etiqueta}. ${esc(a.descripcion || '')}</p>
                    </div>
                    <a class="subtema-archivo-cta bloqueado" href="../../index.html#suscripcion" onclick="event.stopPropagation()">Desbloquear</a>
                </div>`;
            }).join("");
        }

        if (!htmlArchivos) {
            htmlArchivos = `<div class="subtema-archivo pendiente">
                <div class="subtema-archivo-icon">🕒</div>
                <div class="subtema-archivo-body">
                    <p class="subtema-archivo-titulo">Material en preparacion</p>
                    <p class="subtema-archivo-sub">Estamos preparando la teoria y los problemas de este subtema. Volve pronto.</p>
                </div>
                <button type="button" class="subtema-archivo-cta">Pronto</button>
            </div>`;
        }

        cont.innerHTML = htmlArchivos;
    }

    // ---- Buscador Mejorado ----
    let _busqTimer = null;
    const BUSQ_HISTORIAL_KEY = 'ma_busquedas_' + MATERIA_ID;

    function _getBusqHistorial() {
        try { return JSON.parse(localStorage.getItem(BUSQ_HISTORIAL_KEY) || '[]'); } catch(e) { return []; }
    }
    function _addBusqHistorial(q) {
        let h = _getBusqHistorial().filter(x => x !== q);
        h.unshift(q);
        if (h.length > 8) h = h.slice(0, 8);
        try { localStorage.setItem(BUSQ_HISTORIAL_KEY, JSON.stringify(h)); } catch(e) {}
    }

    function initBuscador() {
        const inp = document.getElementById("mat-buscador");
        const caja = document.getElementById("mat-buscador-resultados");
        if (!inp || !caja) return;

        inp.addEventListener("focus", function() {
            if (!inp.value.trim()) mostrarHistorial(caja);
        });
        inp.addEventListener("input", function() {
            clearTimeout(_busqTimer);
            const q = (inp.value || "").trim();
            if (!q) { mostrarHistorial(caja); return; }
            if (q.length < 2) { caja.classList.remove("activo"); caja.innerHTML = ""; return; }
            _busqTimer = setTimeout(() => ejecutarBusqueda(q, caja), 300);
        });
        document.addEventListener("click", function(e) {
            if (!e.target.closest(".mat-search-wrap")) caja.classList.remove("activo");
        });
    }

    function mostrarHistorial(caja) {
        const h = _getBusqHistorial();
        if (!h.length) { caja.classList.remove("activo"); return; }
        caja.innerHTML = `<div class="busq-seccion-titulo">🕒 Búsquedas recientes</div>` +
            h.map(q => `<a class="mat-buscador-item busq-historial" href="#" onclick="event.preventDefault();document.getElementById('mat-buscador').value='${esc(q)}';window._materia.ejecutarBusqueda('${esc(q)}',document.getElementById('mat-buscador-resultados'))">
                <span class="busq-hist-icon">↩</span><span style="flex:1">${esc(q)}</span>
            </a>`).join("") +
            `<a class="mat-buscador-item busq-limpiar" href="#" onclick="event.preventDefault();localStorage.removeItem('${BUSQ_HISTORIAL_KEY}');document.getElementById('mat-buscador-resultados').classList.remove('activo')">
                <span style="color:#94a3b8;font-size:12px">Limpiar historial</span>
            </a>`;
        caja.classList.add("activo");
    }

    function ejecutarBusqueda(q, caja) {
        if (!caja) caja = document.getElementById("mat-buscador-resultados");
        const ql = q.toLowerCase();
        _addBusqHistorial(q);

        // Buscar en temas
        const hitsTemas = temasMateria.filter(t =>
            (t.nombre||"").toLowerCase().includes(ql) ||
            (t.categoria||"").toLowerCase().includes(ql)
        ).slice(0, 6);

        // Buscar en archivos (PDFs, videos, etc)
        const hitsArchivos = archivos.filter(a =>
            (a.titulo||"").toLowerCase().includes(ql) ||
            (a.descripcion||"").toLowerCase().includes(ql)
        ).slice(0, 4);

        // Buscar en ejercicios
        const hitsEjercicios = ejerciciosMateria.filter(e =>
            (e.titulo||"").toLowerCase().includes(ql) ||
            (e.enunciado||"").toLowerCase().includes(ql)
        ).slice(0, 4);

        // Buscar en contenido hardcoded
        const hitsPDF = Object.entries(PDF_MANIFEST).filter(([key]) => key.includes(ql)).slice(0, 3);

        const totalHits = hitsTemas.length + hitsArchivos.length + hitsEjercicios.length + hitsPDF.length;

        if (!totalHits) {
            // Sugerencias: mostrar categorías similares
            const categorias = [...new Set(temasMateria.map(t => t.categoria))];
            const sugerencias = categorias.filter(c => c.toLowerCase().includes(ql.substring(0, 3))).slice(0, 3);
            caja.innerHTML = `<div class="busq-sin-resultado">
                <span style="font-size:24px">🔍</span>
                <p>Sin resultados para "${esc(q)}"</p>
                ${sugerencias.length ? `<p style="font-size:12px;color:#64748b;margin-top:4px">¿Quisiste decir: ${sugerencias.map(s => `<a href="#" class="busq-sugerencia" onclick="event.preventDefault();document.getElementById('mat-buscador').value='${esc(s)}';window._materia.ejecutarBusqueda('${esc(s)}')">${esc(s)}</a>`).join(", ")}?</p>` : ''}
            </div>`;
            caja.classList.add("activo");
            return;
        }

        let html = '';
        if (hitsTemas.length) {
            html += `<div class="busq-seccion-titulo">📚 Temas</div>`;
            html += hitsTemas.map(t => `
                <a class="mat-buscador-item" href="#" onclick="event.preventDefault();window._materia.abrirSubtema('${t.id}');document.getElementById('mat-buscador-resultados').classList.remove('activo')">
                    <span class="busq-badge tema">Nivel ${t.nivel}</span>
                    <span style="flex:1;min-width:0">${_resaltar(t.nombre, ql)}</span>
                    <span style="font-size:11px;color:#94a3b8">${esc(t.categoria)}</span>
                </a>`).join("");
        }
        if (hitsArchivos.length) {
            html += `<div class="busq-seccion-titulo">📁 Archivos</div>`;
            html += hitsArchivos.map(a => `
                <a class="mat-buscador-item" href="#" onclick="event.preventDefault();window._materia.ver('${a.id}');document.getElementById('mat-buscador-resultados').classList.remove('activo')">
                    <span class="busq-badge ${a.seccion}">${etiquetaSeccion(a.seccion)}</span>
                    <span style="flex:1;min-width:0">${_resaltar(a.titulo, ql)}</span>
                </a>`).join("");
        }
        if (hitsEjercicios.length) {
            html += `<div class="busq-seccion-titulo">✏️ Ejercicios</div>`;
            html += hitsEjercicios.map(e => `
                <a class="mat-buscador-item" href="#" onclick="event.preventDefault();document.getElementById('ej-card-${e.id}')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('mat-buscador-resultados').classList.remove('activo')">
                    <span class="busq-badge ej">${e.dificultad}</span>
                    <span style="flex:1;min-width:0">${_resaltar(e.titulo, ql)}</span>
                </a>`).join("");
        }
        if (hitsPDF.length) {
            html += `<div class="busq-seccion-titulo">📄 PDFs</div>`;
            html += hitsPDF.map(([key, m]) => `
                <a class="mat-buscador-item" href="#" onclick="event.preventDefault();window.open('../../Apunte-${m.b}.pdf','_blank');document.getElementById('mat-buscador-resultados').classList.remove('activo')">
                    <span class="busq-badge pdf">PDF</span>
                    <span style="flex:1;min-width:0">${_resaltar(key, ql)}</span>
                </a>`).join("");
        }

        caja.innerHTML = html;
        caja.classList.add("activo");
    }

    function _resaltar(texto, busqueda) {
        if (!busqueda) return esc(texto);
        const idx = (texto||"").toLowerCase().indexOf(busqueda);
        if (idx === -1) return esc(texto);
        const antes = texto.substring(0, idx);
        const match = texto.substring(idx, idx + busqueda.length);
        const despues = texto.substring(idx + busqueda.length);
        return esc(antes) + '<mark class="busq-mark">' + esc(match) + '</mark>' + esc(despues);
    }

    // ============ EJERCICIOS INTERACTIVOS ============
    let _ejFiltroSubtema = null;
    let _ejFiltroDificultad = null;
    let _ejRespuestas = {}; // { ejercicioId: { respuesta, correcto } }

    function renderEjerciciosFiltros() {
        const cont = document.getElementById("mat-ejercicios-filtros");
        if (!cont) return;
        // Subtemas con ejercicios
        const subtemasConEj = [...new Set(ejerciciosMateria.filter(e => e.subtema_id).map(e => e.subtema_id))];
        const subtemasInfo = subtemasConEj.map(sid => temasMateria.find(t => t.id === sid)).filter(Boolean);
        cont.innerHTML = `
            <div class="ej-filtros-row">
                <select id="ej-filtro-subtema" onchange="window._materia.filtrarEjercicios()">
                    <option value="">Todos los subtemas</option>
                    ${subtemasInfo.map(t => `<option value="${t.id}">${esc(t.nombre)}</option>`).join("")}
                </select>
                <select id="ej-filtro-dificultad" onchange="window._materia.filtrarEjercicios()">
                    <option value="">Toda dificultad</option>
                    <option value="facil">Fácil</option>
                    <option value="medio">Medio</option>
                    <option value="dificil">Difícil</option>
                </select>
            </div>`;
    }

    function filtrarEjercicios() {
        _ejFiltroSubtema = document.getElementById("ej-filtro-subtema")?.value || null;
        _ejFiltroDificultad = document.getElementById("ej-filtro-dificultad")?.value || null;
        renderEjerciciosGrid();
    }

    async function renderEjercicios() {
        const section = document.getElementById("mat-ejercicios-section");
        if (!section) return;
        if (ejerciciosMateria.length === 0) { section.style.display = "none"; return; }
        section.style.display = "block";
        // Cargar respuestas previas del usuario
        if (perfilActual) {
            const ids = ejerciciosMateria.map(e => e.id);
            const resps = await MA().sbObtenerRespuestasEjercicios(ids);
            _ejRespuestas = {};
            resps.forEach(r => { _ejRespuestas[r.ejercicio_id] = r; });
        }
        renderEjerciciosFiltros();
        renderEjerciciosGrid();
        // Admin: botón para agregar
        if (perfilActual?.rol === 'admin') {
            const adminCont = document.getElementById("mat-ejercicios-admin");
            if (adminCont) {
                adminCont.style.display = "block";
                adminCont.innerHTML = `<button type="button" class="mat-btn" onclick="window._materia.abrirFormEjercicio()" style="margin-top:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border:none;padding:10px 20px;border-radius:10px;font-weight:700;cursor:pointer">➕ Nuevo Ejercicio</button>`;
            }
        }
    }

    function renderEjerciciosGrid() {
        const grid = document.getElementById("mat-ejercicios-grid");
        if (!grid) return;
        let lista = ejerciciosMateria.filter(e => e.activo);
        if (_ejFiltroSubtema) lista = lista.filter(e => e.subtema_id === _ejFiltroSubtema);
        if (_ejFiltroDificultad) lista = lista.filter(e => e.dificultad === _ejFiltroDificultad);

        if (!lista.length) {
            grid.innerHTML = '<p class="mat-vacio">No hay ejercicios con estos filtros.</p>';
            return;
        }

        // Check premium
        const premiumActivo = perfilActual && esPremiumActivo(perfilActual);

        grid.innerHTML = lista.map(ej => {
            if (ej.es_premium && !premiumActivo) {
                return `<div class="ej-card bloqueado">
                    <div class="ej-card-header"><span class="ej-badge ${ej.dificultad}">${ej.dificultad}</span><span class="ej-badge premium">⭐ Premium</span></div>
                    <h4 class="ej-titulo">${esc(ej.titulo)}</h4>
                    <p class="ej-enunciado">${esc(ej.enunciado).substring(0,80)}…</p>
                    <a href="../../index.html#suscripcion" class="ej-btn bloqueado">🔒 Desbloquear</a>
                </div>`;
            }
            const resp = _ejRespuestas[ej.id];
            const yaRespondio = !!resp;
            const statusClass = yaRespondio ? (resp.correcto ? 'correcto' : 'incorrecto') : '';
            const statusIcon = yaRespondio ? (resp.correcto ? '✅' : '❌') : '';
            return `<div class="ej-card ${statusClass}" id="ej-card-${ej.id}">
                <div class="ej-card-header">
                    <span class="ej-badge ${ej.dificultad}">${ej.dificultad}</span>
                    ${ej.es_premium ? '<span class="ej-badge premium">⭐</span>' : ''}
                    ${yaRespondio ? `<span class="ej-status">${statusIcon}</span>` : ''}
                </div>
                <h4 class="ej-titulo">${esc(ej.titulo)}</h4>
                <p class="ej-enunciado">${esc(ej.enunciado)}</p>
                ${renderEjercicioOpciones(ej, resp)}
                <div id="ej-feedback-${ej.id}" class="ej-feedback" style="display:${yaRespondio ? 'block' : 'none'}">
                    ${yaRespondio ? (resp.correcto
                        ? '<p class="ej-feedback-ok">✅ ¡Correcto! +5 puntos</p>'
                        : `<p class="ej-feedback-mal">❌ Incorrecto. Respuesta: ${esc(ej.respuesta_correcta)}</p>`)
                    : ''}
                    ${yaRespondio && ej.explicacion ? `<p class="ej-explicacion">${esc(ej.explicacion)}</p>` : ''}
                </div>
                ${!yaRespondio ? `<button type="button" class="ej-btn responder" onclick="window._materia.responderEjercicio('${ej.id}')">Verificar</button>` : ''}
                ${perfilActual?.rol === 'admin' ? `<div class="ej-admin-actions"><button type="button" onclick="window._materia.editarEjercicio('${ej.id}')" class="ej-btn-sm">✏️</button><button type="button" onclick="window._materia.eliminarEjercicio('${ej.id}')" class="ej-btn-sm del">🗑️</button></div>` : ''}
            </div>`;
        }).join("");
    }

    function renderEjercicioOpciones(ej, resp) {
        const yaRespondio = !!resp;
        if (ej.tipo === 'opcion_multiple') {
            const opciones = ej.opciones || [];
            return `<div class="ej-opciones" id="ej-opciones-${ej.id}">${opciones.map((op, i) => {
                const sel = yaRespondio && resp.respuesta === op;
                const esCorrecta = op === ej.respuesta_correcta;
                let cls = 'ej-opcion';
                if (yaRespondio) { if (esCorrecta) cls += ' correcta'; else if (sel) cls += ' incorrecta'; cls += ' disabled'; }
                return `<label class="${cls}"><input type="radio" name="ej-${ej.id}" value="${esc(op)}" ${yaRespondio ? 'disabled' : ''} ${sel ? 'checked' : ''}><span>${esc(op)}</span></label>`;
            }).join("")}</div>`;
        }
        if (ej.tipo === 'verdadero_falso') {
            return `<div class="ej-opciones" id="ej-opciones-${ej.id}">
                <label class="ej-opcion${yaRespondio ? ' disabled' : ''}${yaRespondio && ej.respuesta_correcta === 'Verdadero' ? ' correcta' : ''}${yaRespondio && resp?.respuesta === 'Verdadero' && !resp.correcto ? ' incorrecta' : ''}"><input type="radio" name="ej-${ej.id}" value="Verdadero" ${yaRespondio ? 'disabled' : ''} ${resp?.respuesta === 'Verdadero' ? 'checked' : ''}><span>Verdadero</span></label>
                <label class="ej-opcion${yaRespondio ? ' disabled' : ''}${yaRespondio && ej.respuesta_correcta === 'Falso' ? ' correcta' : ''}${yaRespondio && resp?.respuesta === 'Falso' && !resp.correcto ? ' incorrecta' : ''}"><input type="radio" name="ej-${ej.id}" value="Falso" ${yaRespondio ? 'disabled' : ''} ${resp?.respuesta === 'Falso' ? 'checked' : ''}><span>Falso</span></label>
            </div>`;
        }
        // completar
        return `<div class="ej-opciones" id="ej-opciones-${ej.id}">
            <input type="text" class="ej-input-completar" id="ej-input-${ej.id}" placeholder="Tu respuesta…" value="${yaRespondio ? esc(resp.respuesta) : ''}" ${yaRespondio ? 'disabled' : ''}>
        </div>`;
    }

    async function responderEjercicio(ejId) {
        if (!perfilActual) { window.location.href = "../../index.html#suscripcion"; return; }
        // Verificar vidas disponibles
        if (window.MA_GAME && !window.MA_GAME.puedeResponder()) return;
        const ej = ejerciciosMateria.find(e => e.id === ejId);
        if (!ej) return;
        let respuesta = '';
        if (ej.tipo === 'completar') {
            respuesta = (document.getElementById('ej-input-' + ejId)?.value || '').trim();
        } else {
            const checked = document.querySelector(`input[name="ej-${ejId}"]:checked`);
            if (!checked) return;
            respuesta = checked.value;
        }
        if (!respuesta) return;
        const correcto = respuesta.toLowerCase().trim() === (ej.respuesta_correcta || '').toLowerCase().trim();
        const result = await MA().sbResponderEjercicioInteractivo(ejId, respuesta, correcto);
        if (result.error) { console.warn("Error respondiendo:", result.error); return; }
        _ejRespuestas[ejId] = { ejercicio_id: ejId, respuesta, correcto };
        // Actualizar puntos en navbar
        if (correcto && perfilActual) { perfilActual.puntos = (perfilActual.puntos || 0) + 5; renderNavbar(); }
        // Gamificación: celebraciones, vidas, XP
        if (window.MA_GAME) window.MA_GAME.onRespuestaEjercicio(correcto, 5);
        renderEjerciciosGrid();
    }

    // ---- Admin: formulario de ejercicio ----
    function abrirFormEjercicio(editId) {
        const ej = editId ? ejerciciosMateria.find(e => e.id === editId) : null;
        const ov = _asegurarOverlay();
        const subtemasOpts = temasMateria.map(t => `<option value="${t.id}" ${ej?.subtema_id === t.id ? 'selected' : ''}>${esc(t.nombre)} (${esc(t.categoria)})</option>`).join("");
        ov.innerHTML = `<div class="subtema-panel" onclick="event.stopPropagation()" style="max-width:600px">
            <button type="button" class="subtema-close" onclick="document.getElementById('subtema-overlay').classList.remove('activo')">✕</button>
            <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">${ej ? 'Editar' : 'Nuevo'} Ejercicio</h2>
            <form id="form-ejercicio" style="display:flex;flex-direction:column;gap:12px">
                <input type="text" id="ej-f-titulo" placeholder="Título" value="${esc(ej?.titulo || '')}" required style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
                <textarea id="ej-f-enunciado" placeholder="Enunciado del ejercicio" rows="3" required style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;resize:vertical">${esc(ej?.enunciado || '')}</textarea>
                <select id="ej-f-tipo" onchange="window._materia._toggleOpcionesForm()" style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
                    <option value="opcion_multiple" ${ej?.tipo === 'opcion_multiple' ? 'selected' : ''}>Opción múltiple</option>
                    <option value="verdadero_falso" ${ej?.tipo === 'verdadero_falso' ? 'selected' : ''}>Verdadero/Falso</option>
                    <option value="completar" ${ej?.tipo === 'completar' ? 'selected' : ''}>Completar</option>
                </select>
                <div id="ej-f-opciones-wrap">
                    <label style="font-size:13px;font-weight:600;color:#475569">Opciones (una por línea):</label>
                    <textarea id="ej-f-opciones" rows="4" placeholder="Opción A&#10;Opción B&#10;Opción C&#10;Opción D" style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">${(ej?.opciones || []).join('\n')}</textarea>
                </div>
                <input type="text" id="ej-f-respuesta" placeholder="Respuesta correcta (exacta)" value="${esc(ej?.respuesta_correcta || '')}" required style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
                <textarea id="ej-f-explicacion" placeholder="Explicación (opcional)" rows="2" style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;resize:vertical">${esc(ej?.explicacion || '')}</textarea>
                <select id="ej-f-subtema" style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
                    <option value="">Sin subtema</option>
                    ${subtemasOpts}
                </select>
                <select id="ej-f-dificultad" style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
                    <option value="facil" ${ej?.dificultad === 'facil' ? 'selected' : ''}>Fácil</option>
                    <option value="medio" ${!ej || ej?.dificultad === 'medio' ? 'selected' : ''}>Medio</option>
                    <option value="dificil" ${ej?.dificultad === 'dificil' ? 'selected' : ''}>Difícil</option>
                </select>
                <label style="display:flex;align-items:center;gap:8px;font-size:14px"><input type="checkbox" id="ej-f-premium" ${ej?.es_premium ? 'checked' : ''}> Es premium</label>
                <div style="display:flex;gap:8px">
                    <button type="submit" style="flex:1;padding:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:15px">${ej ? '💾 Guardar' : '➕ Crear'}</button>
                    <button type="button" onclick="document.getElementById('subtema-overlay').classList.remove('activo')" style="padding:12px 20px;background:#f1f5f9;border:none;border-radius:10px;cursor:pointer;font-size:14px">Cancelar</button>
                </div>
                <p id="ej-f-status" style="font-size:13px;text-align:center;color:#94a3b8"></p>
            </form>
        </div>`;
        ov.classList.add("activo");
        _toggleOpcionesForm();
        document.getElementById("form-ejercicio").onsubmit = async (e) => {
            e.preventDefault();
            await guardarEjercicioForm(editId);
        };
    }

    function _toggleOpcionesForm() {
        const tipo = document.getElementById("ej-f-tipo")?.value;
        const wrap = document.getElementById("ej-f-opciones-wrap");
        if (wrap) wrap.style.display = tipo === 'opcion_multiple' ? 'block' : 'none';
        // Auto-fill respuesta for V/F
        if (tipo === 'verdadero_falso') {
            const resp = document.getElementById("ej-f-respuesta");
            if (resp && !resp.value) resp.placeholder = "Verdadero o Falso";
        }
    }

    async function guardarEjercicioForm(editId) {
        const status = document.getElementById("ej-f-status");
        if (status) status.textContent = "⏳ Guardando...";
        const tipo = document.getElementById("ej-f-tipo").value;
        const opcionesRaw = document.getElementById("ej-f-opciones").value.split('\n').map(s => s.trim()).filter(Boolean);
        const obj = {
            titulo: document.getElementById("ej-f-titulo").value.trim(),
            enunciado: document.getElementById("ej-f-enunciado").value.trim(),
            tipo,
            opciones: tipo === 'opcion_multiple' ? opcionesRaw : null,
            respuesta_correcta: document.getElementById("ej-f-respuesta").value.trim(),
            explicacion: document.getElementById("ej-f-explicacion").value.trim() || null,
            materia: MATERIA_ID,
            subtema_id: document.getElementById("ej-f-subtema").value || null,
            dificultad: document.getElementById("ej-f-dificultad").value,
            es_premium: document.getElementById("ej-f-premium").checked,
        };
        let result;
        if (editId) {
            result = await MA().sbActualizarEjercicioInteractivo(editId, obj);
        } else {
            result = await MA().sbCrearEjercicioInteractivo(obj);
        }
        if (result.error) {
            if (status) status.textContent = "❌ " + (result.error.message || result.error);
            return;
        }
        document.getElementById('subtema-overlay').classList.remove('activo');
        // Recargar ejercicios
        try { ejerciciosMateria = await MA().sbListarEjercicios(MATERIA_ID); } catch(e) {}
        renderEjercicios();
    }

    function editarEjercicio(id) { abrirFormEjercicio(id); }
    async function eliminarEjercicio(id) {
        if (!confirm("¿Eliminar este ejercicio?")) return;
        await MA().sbBorrarEjercicioInteractivo(id);
        ejerciciosMateria = ejerciciosMateria.filter(e => e.id !== id);
        renderEjerciciosGrid();
    }

    // ============ INIT ============
    (async function () {
        construirPagina();
        await cargar();
        renderNavbar();
        renderPublicos();
        renderPremium();
        await renderEjercicios();
        initBuscador();
        if (perfilActual) iniciarTimer();
        MA()?.sb?.auth.onAuthStateChange(async (event) => {
            if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
                await cargar();
                renderNavbar();
                renderPublicos();
                renderPremium();
                await renderEjercicios();
            }
        });
    })();

    // ---- Modulos interactivos por materia ----
    // GeoGebra está embebido en el contenido de cada tema, no se necesita graficador/funciones aparte
    if (['algebra', 'aritmetica'].includes(MATERIA_ID)) {
        const sc = document.createElement('script');
        sc.src = '../../calculadora.js';
        sc.onload = () => { if (window.initCalculadora) window.initCalculadora(MATERIA_ID); };
        document.head.appendChild(sc);
    }
})();
