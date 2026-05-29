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

    // ---- Carga desde Supabase ----
    let temasMateria = [];
    async function cargar() {
        if (!MA()?.sb) { perfilActual = null; archivos = []; temasMateria = []; return; }
        perfilActual = await MA().sbPerfil();
        const todos = await MA().sbListarArchivos();
        archivos = todos.filter(a => (a.materia || "general") === MATERIA_ID);
        temasMateria = await MA().sbListarTemas(MATERIA_ID);
    }

    // ---- Premium helpers ----
    function esPremiumActivo(p) {
        if (!p?.premium_hasta) return false;
        return new Date(p.premium_hasta).getTime() > Date.now();
    }
    function diasRestantes(p) {
        if (!p?.premium_hasta) return 0;
        const ms = new Date(p.premium_hasta).getTime() - Date.now();
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

    // ---- Render público ----
    function renderPublicos() {
        const lista = archivos.filter(a => a.seccion !== "premium");
        const grid = document.getElementById("mat-publicos-grid");
        if (!grid) return;

        // Ruta de aprendizaje: mostrar las categorías incluso si no hay archivos
        const categorias = {};
        temasMateria.forEach(t => {
            if (!categorias[t.categoria]) categorias[t.categoria] = { nivel: t.nivel, temas: [], archivos: [] };
            categorias[t.categoria].temas.push(t);
        });
        // Asignar archivos a su tema correspondiente
        const archivosSinTema = [];
        lista.forEach(a => {
            let asignado = false;
            if (a.tema_id) {
                for (const cat in categorias) {
                    if (categorias[cat].temas.some(t => t.id === a.tema_id)) {
                        categorias[cat].archivos.push(a);
                        asignado = true;
                        break;
                    }
                }
            }
            if (!asignado) archivosSinTema.push(a);
        });

        let html = "";
        // Renderizar cada categoría con sus archivos y los temas pendientes
        const orden = Object.entries(categorias).sort((a,b)=>a[1].nivel - b[1].nivel);
        if (orden.length === 0 && lista.length === 0) {
            grid.innerHTML = `<p class="mat-vacio">El administrador publicará contenido de ${esc(NOMBRE)} pronto.</p>`;
            return;
        }
        orden.forEach(([cat, data]) => {
            html += `<div class="mat-categoria">
                <h3 class="mat-categoria-titulo">📚 Nivel ${data.nivel} — ${esc(cat)}</h3>
                <ul class="mat-categoria-temas">${data.temas.map(t=>{
                    const tieneArch = data.archivos.some(a=>a.tema_id===t.id);
                    const enManifest = !!PDF_MANIFEST[_norm(t.nombre)];
                    const disp = tieneArch || enManifest;
                    const marca = disp ? '<span style="color:#16a34a">✓</span>' : '<span style="color:#94a3b8;font-size:11px">próximamente</span>';
                    return `<li class="tema-clickable" onclick="window._materia.abrirSubtema('${t.id}')">${esc(t.nombre)} ${marca}<span class="tema-flecha">›</span></li>`;
                }).join("")}</ul>
                ${data.archivos.length > 0
                    ? '<div class="mat-grid">' + data.archivos.map(a => tarjeta(a, `<button type="button" class="mat-btn" onclick="window._materia.ver('${a.id}')">Ver →</button>`)).join("") + '</div>'
                    : '<p style="text-align:center;color:#94a3b8;font-size:13px;padding:12px 0">Aún no hay material publicado en esta categoría.</p>'}
            </div>`;
        });
        if (archivosSinTema.length > 0) {
            html += `<div class="mat-categoria">
                <h3 class="mat-categoria-titulo">📌 Otros contenidos</h3>
                <div class="mat-grid">${archivosSinTema.map(a => tarjeta(a, `<button type="button" class="mat-btn" onclick="window._materia.ver('${a.id}')">Ver →</button>`)).join("")}</div>
            </div>`;
        }
        grid.innerHTML = html;
    }

    // ---- Render premium ----
    function renderPremium() {
        const premBlock  = document.getElementById("mat-premium-bloque");
        const loginBlock = document.getElementById("mat-premium-login");
        const lista = archivos.filter(a => a.seccion === "premium");

        if (!perfilActual) { premBlock.style.display = "none"; loginBlock.style.display = "block"; return; }
        premBlock.style.display = "block"; loginBlock.style.display = "none";

        const premiumActivo = esPremiumActivo(perfilActual);
        const vistos = perfilActual.vistos || [], cuota = vistos.length;

        let estadoHtml = "";
        if (premiumActivo) {
            const dias = diasRestantes(perfilActual), vence = formatearFecha(perfilActual.premium_hasta);
            estadoHtml = `<div class="mat-estado-activa"><span>⭐ Suscripción activa</span><span style="font-size:12px;opacity:.85">Vence el ${vence} · ${dias} día${dias !== 1 ? "s" : ""}</span></div>`;
        } else {
            estadoHtml = `<div class="mat-estado-inactiva">
                <div><p style="font-weight:bold;margin:0;font-size:14px">Plan gratuito — ${cuota}/${MAX_ARCHIVOS_GRATIS} archivos</p>${perfilActual.premium_hasta ? `<p style="font-size:12px;color:#b55b00;margin:3px 0 0">Suscripción vencida el ${formatearFecha(perfilActual.premium_hasta)}</p>` : ""}</div>
                <button type="button" class="mat-btn mat-btn-premium" onclick="window._materia.abrirPago()">⭐ Suscribirse — ${PRECIO_SUSCRIPCION}/mes</button>
            </div>
            <div style="margin:8px 0 16px"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:7px;background:#e0e0e0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round((cuota / MAX_ARCHIVOS_GRATIS) * 100)}%;background:#197ce6;border-radius:4px"></div></div><span style="font-size:12px;color:#555">${cuota}/${MAX_ARCHIVOS_GRATIS}</span></div>${cuota >= MAX_ARCHIVOS_GRATIS ? `<p style="font-size:12px;color:#b55b00;margin-top:5px">⚠️ Límite gratuito alcanzado.</p>` : ""}</div>`;
        }

        let gridHtml = "";
        if (!lista.length) {
            gridHtml = `<p class="mat-vacio">No hay contenido premium de ${esc(NOMBRE)} aún.</p>`;
        } else {
            gridHtml = lista.map(a => {
                if (premiumActivo) return tarjeta(a, `<button type="button" class="mat-btn" onclick="window._materia.ver('${a.id}')">Ver →</button>`);
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
                </div>
            </header>
            <main class="mat-main">
                <section class="mat-section">
                    <h2 class="mat-section-title">📂 Material de ${esc(NOMBRE)}</h2>
                    <p class="mat-section-desc">Videos, PDFs, ejercicios e imágenes de ${esc(NOMBRE)}.</p>
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

    window._materia = { ver: verContenido, verPremium, abrirLogin, salir, abrirPago, resetTimer, abrirSubtema };

    // ============ MANIFIESTO DE PDF POR SUBTEMA ============
    // Mapeo nombre de subtema normalizado -> archivos disponibles
    function _norm(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim(); }
    const PDF_RUTA = "../../"; // los PDF estan en la raiz del sitio
    const PDF_MANIFEST = {
        "conjuntos numericos":                  {b:"Conjuntos-Numericos",   d:"Repaso de los conjuntos numericos N, Z, Q, R y C, con explicacion intuitiva y formal."},
        "suma resta multiplicacion y division": {b:"Operaciones-Basicas",   d:"Las cuatro operaciones basicas y sus propiedades, con ejemplos y demostraciones."},
        "operaciones basicas":                  {b:"Operaciones-Basicas",   d:"Las cuatro operaciones basicas y sus propiedades, con ejemplos y demostraciones."},
        "fracciones":                           {b:"Fracciones",            d:"Propiedades, operaciones y representacion de las fracciones, con graficos."},
        "decimales":                            {b:"Decimales",             d:"Operaciones y representacion de los numeros decimales, con grillas y la recta numerica."},
        "numeros decimales":                    {b:"Decimales",             d:"Operaciones y representacion de los numeros decimales, con grillas y la recta numerica."},
        "porcentajes":                          {b:"Porcentajes",           d:"Tipos de casos, formula, aumentos y descuentos, graficos de torta."},
        "potencias y raices":                   {b:"Potencias-y-Raices",    d:"Potenciacion, radicacion y sus propiedades, con visualizaciones geometricas."},
        "numeros naturales":                    {b:"Numeros-Naturales",     d:"El conjunto N, valor posicional, operaciones, pares e impares, multiplos y divisores."},
        "numeros enteros":                      {b:"Numeros-Enteros",       d:"El conjunto Z, opuestos, valor absoluto, orden y la regla de los signos."},
        "divisibilidad":                        {b:"Divisibilidad",         d:"Multiplos, divisores y los criterios de divisibilidad, con demostraciones."},
        "numeros primos":                       {b:"Numeros-Primos",        d:"Primos y compuestos, criba de Eratostenes, factorizacion en primos y aplicaciones."},
        "mcd y mcm":                            {b:"MCD-y-MCM",             d:"Maximo comun divisor y minimo comun multiplo, con metodos de calculo y el algoritmo de Euclides."},
        "proporcionalidad":                     {b:"Proporcionalidad",      d:"Razones, proporciones, magnitudes directa e inversamente proporcionales."},
    };

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

    // Contenido explicativo breve por subtema
    const SUBTEMA_CONTENIDO = {
        "conjuntos numericos": {
            intro: "Los conjuntos numéricos organizan todos los tipos de números que usamos en matemática: naturales, enteros, racionales, reales y complejos.",
            puntos: ["Naturales (ℕ): 0, 1, 2, 3…","Enteros (ℤ): …−2, −1, 0, 1, 2…","Racionales (ℚ): fracciones a/b","Reales (ℝ): todos los números de la recta","Complejos (ℂ): incluyen la unidad imaginaria i"],
            tip: "Cada conjunto está contenido en el siguiente: ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ ⊂ ℂ"
        },
        "suma resta multiplicacion y division": {
            intro: "Las cuatro operaciones fundamentales son la base de toda la aritmética y se aplican en cada rama de la matemática.",
            puntos: ["Suma y resta: operaciones inversas entre sí","Multiplicación: suma abreviada","División: operación inversa de la multiplicación","Propiedades: conmutativa, asociativa, distributiva"],
            tip: "La división por cero no está definida — es uno de los errores más comunes."
        },
        "operaciones basicas": {
            intro: "Las cuatro operaciones fundamentales son la base de toda la aritmética y se aplican en cada rama de la matemática.",
            puntos: ["Suma y resta: operaciones inversas entre sí","Multiplicación: suma abreviada","División: operación inversa de la multiplicación","Propiedades: conmutativa, asociativa, distributiva"],
            tip: "La división por cero no está definida — es uno de los errores más comunes."
        },
        "fracciones": {
            intro: "Una fracción representa una parte de un todo. Se escribe como a/b donde a es el numerador y b el denominador.",
            puntos: ["Fracciones equivalentes: representan el mismo valor","Operaciones: suma, resta, multiplicación y división","Simplificación: dividir numerador y denominador por su MCD","Fracciones mixtas: número entero + fracción propia"],
            tip: "Para sumar fracciones con distinto denominador, primero encontrá el MCM."
        },
        "decimales": {
            intro: "Los números decimales son otra forma de representar fracciones, usando el sistema posicional con la coma decimal.",
            puntos: ["Decimales exactos: tienen una cantidad finita de cifras","Decimales periódicos: se repite un patrón infinitamente","Conversión: de fracción a decimal y viceversa","Operaciones: mismas reglas que con enteros, cuidando la coma"],
            tip: "Todo decimal periódico se puede escribir como fracción — es un número racional."
        },
        "numeros decimales": {
            intro: "Los números decimales son otra forma de representar fracciones, usando el sistema posicional con la coma decimal.",
            puntos: ["Decimales exactos: tienen una cantidad finita de cifras","Decimales periódicos: se repite un patrón infinitamente","Conversión: de fracción a decimal y viceversa","Operaciones: mismas reglas que con enteros, cuidando la coma"],
            tip: "Todo decimal periódico se puede escribir como fracción — es un número racional."
        },
        "porcentajes": {
            intro: "Un porcentaje expresa una proporción como una fracción de 100. Es fundamental en finanzas, estadística y la vida diaria.",
            puntos: ["Fórmula básica: porcentaje = (parte / total) × 100","Aumentos y descuentos: aplicar porcentajes sobre un valor","Porcentaje de un porcentaje: composición de tasas","Gráficos de torta: representación visual de porcentajes"],
            tip: "Un aumento del 50% seguido de un descuento del 50% NO te deja en el valor original."
        },
        "potencias y raices": {
            intro: "La potenciación es una multiplicación repetida y la radicación es su operación inversa.",
            puntos: ["Potencia: aⁿ = a × a × … × a (n veces)","Propiedades: producto, cociente y potencia de potencia","Raíz n-ésima: el número que elevado a n da el radicando","Racionalización: eliminar raíces del denominador"],
            tip: "Toda raíz se puede escribir como potencia con exponente fraccionario: ⁿ√a = a^(1/n)."
        },
        "numeros naturales": {
            intro: "Los números naturales (ℕ) son los primeros que aprendemos: sirven para contar y ordenar.",
            puntos: ["Valor posicional: cada cifra vale según su posición","Pares e impares: divisibles o no por 2","Múltiplos y divisores: relaciones entre números","Operaciones fundamentales dentro de ℕ"],
            tip: "ℕ es cerrado para la suma y la multiplicación, pero no para la resta ni la división."
        },
        "numeros enteros": {
            intro: "Los números enteros (ℤ) amplían los naturales incluyendo los negativos y el cero.",
            puntos: ["Opuesto de un número: a y −a","Valor absoluto: distancia al cero en la recta","Regla de los signos para multiplicar y dividir","Orden: todo negativo es menor que todo positivo"],
            tip: "La regla de los signos: (+)(+) = + , (−)(−) = + , (+)(−) = − , (−)(+) = −"
        },
        "divisibilidad": {
            intro: "La divisibilidad estudia cuándo un número se puede dividir exactamente por otro, sin resto.",
            puntos: ["Criterios de divisibilidad: por 2, 3, 4, 5, 6, 9, 10, 11","Múltiplos y divisores","Relación con la factorización en primos","Aplicaciones: simplificación de fracciones"],
            tip: "Un número es divisible por 3 si la suma de sus cifras es múltiplo de 3."
        },
        "numeros primos": {
            intro: "Un número primo tiene exactamente dos divisores: 1 y sí mismo. Son los ladrillos de los números naturales.",
            puntos: ["Criba de Eratóstenes: método para encontrar primos","Factorización en primos: descomponer un número","Teorema fundamental de la aritmética: la factorización es única","Aplicaciones: criptografía, MCD y MCM"],
            tip: "El 1 no es primo ni compuesto. El 2 es el único primo par."
        },
        "mcd y mcm": {
            intro: "El MCD (máximo común divisor) y el MCM (mínimo común múltiplo) son herramientas esenciales para trabajar con fracciones.",
            puntos: ["MCD: el mayor número que divide a ambos","MCM: el menor múltiplo común a ambos","Método de factorización en primos","Algoritmo de Euclides para el MCD"],
            tip: "Relación clave: MCD(a,b) × MCM(a,b) = a × b"
        },
        "proporcionalidad": {
            intro: "La proporcionalidad estudia la relación entre magnitudes que crecen o decrecen de manera constante.",
            puntos: ["Razón y proporción: conceptos básicos","Directamente proporcional: si una crece, la otra también","Inversamente proporcional: si una crece, la otra decrece","Regla de tres: simple y compuesta"],
            tip: "En una proporción a/b = c/d, se cumple que a×d = b×c (productos cruzados)."
        },
    };

    async function abrirSubtema(temaId, nombre){
        const ov = _asegurarOverlay();
        const tema = temasMateria.find(t => t.id === temaId);
        const titulo = nombre || tema?.nombre || "Subtema";
        const cat = tema?.categoria || "";
        const nivel = tema?.nivel ? `Nivel ${tema.nivel}` : "";
        const key = _norm(titulo);
        const m = PDF_MANIFEST[key];
        const contenido = SUBTEMA_CONTENIDO[key];

        // Construir sección explicativa
        let explicacionHtml = "";
        if (contenido) {
            explicacionHtml = `
                <div class="subtema-explicacion">
                    <p class="subtema-intro">${esc(contenido.intro)}</p>
                    <div class="subtema-puntos-clave">
                        <h4>📌 Puntos clave</h4>
                        <ul>${contenido.puntos.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
                    </div>
                    ${contenido.tip ? `<div class="subtema-tip"><span class="subtema-tip-icon">💡</span><span>${esc(contenido.tip)}</span></div>` : ""}
                </div>`;
        }

        ov.innerHTML = `<div class="subtema-panel" onclick="event.stopPropagation()">
            <button type="button" class="subtema-close" aria-label="Cerrar" onclick="document.getElementById('subtema-overlay').classList.remove('activo')">✕</button>
            <p class="subtema-eyebrow">${esc(NOMBRE)} · ${esc(cat)} ${nivel ? '· '+nivel : ''}</p>
            <h2 class="subtema-titulo">${esc(titulo)}</h2>
            <p class="subtema-desc">${esc(m?.d || "Este subtema todavia no tiene material publicado. Cuando este disponible, vas a encontrar aca la teoria, los problemas y las soluciones desarrolladas.")}</p>
            ${explicacionHtml}
            <p class="subtema-archivos-titulo">📁 Material disponible</p>
            <div class="subtema-archivos" id="subtema-archivos-cont"><p style="padding:16px;color:#94a3b8;text-align:center">Cargando…</p></div>
        </div>`;
        ov.classList.add("activo");

        const plan = await obtenerPlan();
        const cont = document.getElementById("subtema-archivos-cont");

        // Archivos del manifiesto (PDFs estáticos)
        let htmlArchivos = "";
        if (m) {
            htmlArchivos += _bloque(m.b, "apunte", plan) + _bloque(m.b, "problemas", plan) + _bloque(m.b, "soluciones", plan);
        }

        // Archivos cargados en Supabase para este tema (públicos)
        const archivosPublicos = archivos.filter(a => a.tema_id === temaId && a.seccion !== "premium");
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

        // Archivos premium para este tema
        const archivosPremium = archivos.filter(a => a.tema_id === temaId && a.seccion === "premium");
        if (archivosPremium.length > 0) {
            htmlArchivos += `<p style="font-size:13px;font-weight:700;color:#92400e;margin:16px 0 8px;padding-top:12px;border-top:1px solid #fde68a">⭐ Contenido Premium</p>`;
            const premiumActivo = perfilActual && esPremiumActivo(perfilActual);
            htmlArchivos += archivosPremium.map(a => {
                if (premiumActivo) {
                    return `<div class="subtema-archivo disponible" onclick="window._materia.ver('${a.id}')">
                        <div class="subtema-archivo-icon">⭐</div>
                        <div class="subtema-archivo-body">
                            <p class="subtema-archivo-titulo">${esc(a.titulo || 'Archivo premium')}</p>
                            <p class="subtema-archivo-sub">${esc(a.descripcion || 'Contenido exclusivo.')}</p>
                        </div>
                        <button type="button" class="subtema-archivo-cta abrir" onclick="event.stopPropagation();window._materia.ver('${a.id}')">Ver →</button>
                    </div>`;
                }
                return `<div class="subtema-archivo bloqueado">
                    <div class="subtema-archivo-icon">🔒</div>
                    <div class="subtema-archivo-body">
                        <p class="subtema-archivo-titulo">${esc(a.titulo || 'Archivo premium')}</p>
                        <p class="subtema-archivo-sub">Requiere suscripción Premium. ${esc(a.descripcion || '')}</p>
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

    // ---- Buscador de subtemas dentro de la materia ----
    function initBuscador() {
        const inp = document.getElementById("mat-buscador");
        const caja = document.getElementById("mat-buscador-resultados");
        if (!inp || !caja) return;
        inp.addEventListener("input", function() {
            const q = (inp.value || "").toLowerCase().trim();
            if (q.length < 2) { caja.classList.remove("activo"); caja.innerHTML = ""; return; }
            const hits = temasMateria.filter(t =>
                (t.nombre||"").toLowerCase().includes(q) ||
                (t.categoria||"").toLowerCase().includes(q)
            ).slice(0, 10);
            if (!hits.length) {
                caja.innerHTML = '<div style="padding:12px 16px;color:#94a3b8;font-size:13px;text-align:center">Sin resultados</div>';
                caja.classList.add("activo"); return;
            }
            caja.innerHTML = hits.map(t => `
                <a class="mat-buscador-item" href="#" onclick="event.preventDefault();window._materia.abrirSubtema('${t.id}');document.getElementById('mat-buscador-resultados').classList.remove('activo')">
                    <span style="font-size:11px;color:#2563eb;font-weight:700;background:#eff6ff;padding:2px 8px;border-radius:99px;white-space:nowrap">Nivel ${t.nivel}</span>
                    <span style="flex:1;min-width:0">${esc(t.nombre)}</span>
                    <span style="font-size:11px;color:#94a3b8">${esc(t.categoria)}</span>
                </a>`).join("");
            caja.classList.add("activo");
        });
        document.addEventListener("click", function(e) {
            if (!e.target.closest(".mat-search-wrap")) caja.classList.remove("activo");
        });
    }

    // ============ INIT ============
    (async function () {
        await cargar();
        renderNavbar();
        renderPublicos();
        renderPremium();
        initBuscador();
        if (perfilActual) iniciarTimer();
        MA()?.sb?.auth.onAuthStateChange(async (event) => {
            if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
                await cargar();
                renderNavbar();
                renderPublicos();
                renderPremium();
            }
        });
    })();

    // ---- Modulos interactivos por materia ----
    if (MATERIA_ID === 'calculo') {
        const sf = document.createElement('script');
        sf.src = '../../funciones.js';
        sf.onload = () => { if (window.initFunciones) window.initFunciones(); };
        document.head.appendChild(sf);
    } else if (['geometria', 'estadistica'].includes(MATERIA_ID)) {
        const sg = document.createElement('script');
        sg.src = '../../graficadora.js';
        sg.onload = () => { if (window.initGraficadora) window.initGraficadora(MATERIA_ID); };
        document.head.appendChild(sg);
    } else if (['algebra', 'aritmetica', 'trigonometria'].includes(MATERIA_ID)) {
        const sc = document.createElement('script');
        sc.src = '../../calculadora.js';
        sc.onload = () => { if (window.initCalculadora) window.initCalculadora(MATERIA_ID); };
        document.head.appendChild(sc);
    }
})();
