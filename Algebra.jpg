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
                <ul class="mat-categoria-temas">${data.temas.map(t=>`<li>${esc(t.nombre)}${data.archivos.some(a=>a.tema_id===t.id)?' <span style="color:#16a34a">✓</span>':' <span style="color:#94a3b8;font-size:11px">(pendiente)</span>'}</li>`).join("")}</ul>
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
        if (!perfilActual) { nb.innerHTML = `<a href="../../index.html#suscripcion" class="mat-nav-btn">🔐 Ingresar</a>`; return; }
        const activo = esPremiumActivo(perfilActual);
        nb.innerHTML = `<span style="font-size:13px">${activo ? "⭐" : "👤"} ${esc(perfilActual.username)}</span><button type="button" class="mat-nav-btn" onclick="window._materia.salir()">Salir</button>`;
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
                <a href="../../index.html" class="mat-back">← Inicio</a>
                <h1>${EMOJI} ${esc(NOMBRE)}</h1>
                <div id="mat-navbar-sesion"></div>
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
                <p>Copyright © 2025 Matemáticas Activa. Todos los derechos reservados.</p>
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

    window._materia = { ver: verContenido, verPremium, abrirLogin, salir, abrirPago, resetTimer };

    // ---- Boot ----
    construirPagina();

    (async () => {
        await cargar();
        renderNavbar();
        renderPublicos();
        renderPremium();
        if (perfilActual) iniciarTimer();
        // Escuchar cambios de auth
        MA()?.sb?.auth.onAuthStateChange(async (event) => {
            if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
                await cargar();
                renderNavbar();
                renderPremium();
            }
        });
    })();

    // ---- Módulos interactivos por materia ----
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
