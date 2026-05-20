<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Matemáticas Activa — Plataforma educativa de matemáticas</title>
    <meta name="description" content="Plataforma educativa de matemáticas con videos, ejercicios y PDFs de Álgebra, Aritmética, Geometría, Estadística, Trigonometría, Cálculo, Razonamiento y Juegos.">
    <meta name="theme-color" content="#2563eb">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta name="referrer" content="no-referrer">
    <link rel="icon" href="img/descarga.png" type="image/png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <style>
      .nav-puntos{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#f59e0b,#dc2626);color:white;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:700;margin-left:6px}
      .perfil-section{margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:10px}
      .perfil-section h4{margin:0 0 10px;font-size:14px;color:#0f172a}
    </style>
</head>
<body>

    <header>
    <nav class="navbar" aria-label="Navegación principal">
        <div class="navbar-inner">
            <a class="navbar-brand" href="#">
                <span class="brand-icon" aria-hidden="true">∑</span>
                <span>Matemáticas<strong>Activa</strong></span>
            </a>
            <button type="button" class="menu-toggle" aria-label="Abrir menú" aria-expanded="false" onclick="(function(b){var l=document.getElementById('navbar-links');l.classList.toggle('open');b.setAttribute('aria-expanded',l.classList.contains('open'));})(this)">☰</button>
            <ul class="navbar-links" id="navbar-links">
                <li><a href="#materias">Materias</a></li>
                <li><a href="#videos">Videos</a></li>
                <li><a href="#PDFs">PDFs</a></li>
                <li><a href="#ranking">🏆 Ranking</a></li>
                <li><a href="#suscripcion">Premium</a></li>
                <li id="nav-admin-link" style="display:none"><a href="#" onclick="abrirAdmin(event)" class="nav-admin-btn">⚙️ Admin</a></li>
                <li id="nav-mis-archivos-link" style="display:none"><a href="#" onclick="abrirMisArchivos(event)">📁 Mis archivos</a></li>
                <li id="nav-perfil-link" style="display:none"><a href="#" onclick="abrirPerfil(event)">👤 Mi perfil</a></li>
                <li id="nav-salir-link" style="display:none"><a href="#" onclick="cerrarSesion(event)" class="nav-salir-btn">Salir</a></li>
                <li><a href="#" onclick="abrirAuth(event)" class="nav-cta-btn"><span id="nav-cuenta-label">Ingresar</span></a></li>
                <li><span id="nav-puntos" class="nav-puntos" style="display:none"></span></li>
            </ul>
        </div>
    </nav>
    </header>
    <main>

    <section class="hero">
        <div class="hero-shapes">
            <span class="shape s1">π</span><span class="shape s2">∞</span>
            <span class="shape s3">√</span><span class="shape s4">∑</span>
            <span class="shape s5">Δ</span><span class="shape s6">θ</span>
            <span class="shape s7">∫</span><span class="shape s8">÷</span>
        </div>
        <div class="hero-content">
            <div class="hero-badge">📚 Plataforma educativa</div>
            <h1 class="hero-title">Aprende Matemáticas<br><span class="hero-gradient">de forma diferente</span></h1>
            <p class="hero-sub">Videos, ejercicios, PDFs y contenido premium para secundaria y universidad. Ganá puntos, subí tus propios archivos y competí en el ranking.</p>
            <div class="hero-btns">
                <a href="#materias" class="btn-hero-main">Explorar materias →</a>
                <a href="#" onclick="abrirAuth(event)" class="btn-hero-sec">Crear cuenta gratis</a>
            </div>
            <div class="hero-stats">
                <div class="hero-stat"><strong>8</strong><span>Materias</span></div>
                <div class="hero-stat-sep"></div>
                <div class="hero-stat"><strong>100%</strong><span>Online</span></div>
                <div class="hero-stat-sep"></div>
                <div class="hero-stat"><strong>🏆</strong><span>Ranking activo</span></div>
            </div>
        </div>
    </section>

    <div class="buscador-wrap">
        <div class="buscador-inner">
            <span class="buscador-icon" aria-hidden="true">🔍</span>
            <label for="buscador" class="sr-only">Buscar materia</label>
            <input type="search" id="buscador" placeholder="Buscar materia..." aria-label="Buscar materia" onkeyup="buscarContenido()">
        </div>
    </div>

    <section class="section" id="materias">
        <div class="section-inner">
            <div class="section-header">
                <h2 class="section-title">Explorá las Materias</h2>
                <p class="section-sub">Seleccioná tu área y accedé a todo el contenido</p>
            </div>
            <ul id="lista-contenidos" class="lista-materias-rapida" aria-label="Accesos rápidos">
                <li><a href="materias/Algebra/Algebra.html">Álgebra</a></li>
                <li><a href="materias/Aritmetica/Aritmetica.html">Aritmética</a></li>
                <li><a href="materias/Geometria/Geometria.html">Geometría</a></li>
                <li><a href="materias/Estadistica/Estadistica.html">Estadística</a></li>
                <li><a href="materias/Trigonometria/Trigonometria.html">Trigonometría</a></li>
                <li><a href="materias/Calculo/Calculo.html">Cálculo</a></li>
                <li><a href="materias/Razonamiento/Razonamiento.html">Razonamiento Matemático</a></li>
                <li><a href="materias/Juegos/Juegos.html">Juegos Matemáticos</a></li>
            </ul>
            <div class="materias-grid" id="areas-matematicas">
                <a href="materias/Algebra/Algebra.html" class="materia-card" data-color="purple">
                    <div class="materia-img-wrap"><img src="img/Algebra.jpg" alt="Álgebra" loading="lazy"><div class="materia-overlay"></div><span class="materia-emoji">𝑥²</span></div>
                    <div class="materia-info"><h3>Álgebra</h3><p>Ecuaciones, polinomios y funciones</p><span class="materia-arrow">→</span></div>
                </a>
                <a href="materias/Aritmetica/Aritmetica.html" class="materia-card" data-color="blue">
                    <div class="materia-img-wrap"><img src="img/Aritmetica.jpg" alt="Aritmética" loading="lazy"><div class="materia-overlay"></div><span class="materia-emoji">123</span></div>
                    <div class="materia-info"><h3>Aritmética</h3><p>Fundamentos esenciales</p><span class="materia-arrow">→</span></div>
                </a>
                <a href="materias/Geometria/Geometria.html" class="materia-card" data-color="teal">
                    <div class="materia-img-wrap"><img src="img/Geometria.jpg" alt="Geometría" loading="lazy"><div class="materia-overlay"></div><span class="materia-emoji">△</span></div>
                    <div class="materia-info"><h3>Geometría</h3><p>Figuras, áreas y sólidos</p><span class="materia-arrow">→</span></div>
                </a>
                <a href="materias/Estadistica/Estadistica.html" class="materia-card" data-color="orange">
                    <div class="materia-img-wrap"><img src="img/Estadistica.jpg" alt="Estadística" loading="lazy"><div class="materia-overlay"></div><span class="materia-emoji">📊</span></div>
                    <div class="materia-info"><h3>Estadística</h3><p>Probabilidad y distribuciones</p><span class="materia-arrow">→</span></div>
                </a>
                <a href="materias/Trigonometria/Trigonometria.html" class="materia-card" data-color="red">
                    <div class="materia-img-wrap"><img src="img/Trigonometria.jpg" alt="Trigonometría" loading="lazy"><div class="materia-overlay"></div><span class="materia-emoji">θ</span></div>
                    <div class="materia-info"><h3>Trigonometría</h3><p>Seno, coseno y tangente</p><span class="materia-arrow">→</span></div>
                </a>
                <a href="materias/Calculo/Calculo.html" class="materia-card" data-color="indigo">
                    <div class="materia-img-wrap"><img src="img/Calculo.jpg" alt="Cálculo" loading="lazy"><div class="materia-overlay"></div><span class="materia-emoji">∫</span></div>
                    <div class="materia-info"><h3>Cálculo</h3><p>Funciones, análisis y graficadora</p><span class="materia-arrow">→</span></div>
                </a>
                <a href="materias/Razonamiento/Razonamiento.html" class="materia-card" data-color="green">
                    <div class="materia-img-wrap"><img src="img/Razonamiento.jpg" alt="Razonamiento" loading="lazy"><div class="materia-overlay"></div><span class="materia-emoji">🧠</span></div>
                    <div class="materia-info"><h3>Razonamiento</h3><p>Lógica y resolución de problemas</p><span class="materia-arrow">→</span></div>
                </a>
                <a href="materias/Juegos/Juegos.html" class="materia-card" data-color="pink">
                    <div class="materia-img-wrap"><img src="img/Juegos.jpg" alt="Juegos" loading="lazy"><div class="materia-overlay"></div><span class="materia-emoji">🎮</span></div>
                    <div class="materia-info"><h3>Juegos</h3><p>Aprendé matemáticas jugando</p><span class="materia-arrow">→</span></div>
                </a>
            </div>
        </div>
    </section>

    <section class="section" id="videos">
        <div class="section-inner">
            <div class="section-header">
                <div class="section-icon video-icon">▶</div>
                <h2 class="section-title">Videos Explicativos</h2>
                <p class="section-sub">Explicaciones paso a paso</p>
            </div>
            <div id="videos-grid" class="contenido-grid"></div>
        </div>
    </section>

    <section class="section section-alt" id="PDFs">
        <div class="section-inner">
            <div class="section-header">
                <div class="section-icon pdf-icon">📄</div>
                <h2 class="section-title">Guías y PDFs</h2>
                <p class="section-sub">Material para estudiar cuando quieras</p>
            </div>
            <div id="pdfs-grid" class="contenido-grid"></div>
        </div>
    </section>

    <!-- 🆕 MIS ARCHIVOS (solo para usuarios logueados) -->
    <section class="section" id="mis-archivos-section" style="display:none">
        <div class="section-inner">
            <div class="section-header">
                <div class="section-icon" style="background:linear-gradient(135deg,#10b981,#059669)">📁</div>
                <h2 class="section-title">Mis Archivos</h2>
                <p class="section-sub">Subí tus PDFs, Word, imágenes — son privados, solo vos los ves (el admin puede verlos para moderar)</p>
            </div>
            <div style="max-width:640px;margin:0 auto 24px;padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
                <h4 style="margin:0 0 14px;font-size:15px;color:#0f172a">➕ Subir un archivo nuevo</h4>
                <div class="form-group"><label for="mu-titulo">Título *</label><input type="text" id="mu-titulo" placeholder="Mi resumen de álgebra"></div>
                <div class="form-group"><label for="mu-materia">📚 Materia</label><select id="mu-materia"><option value="general">General</option><option value="algebra">Álgebra</option><option value="aritmetica">Aritmética</option><option value="geometria">Geometría</option><option value="estadistica">Estadística</option><option value="trigonometria">Trigonometría</option><option value="calculo">Cálculo</option><option value="razonamiento">Razonamiento</option><option value="juegos">Juegos</option></select></div>
                <div class="form-group"><label for="mu-tema">🎯 Tema de la ruta (opcional)</label><select id="mu-tema"><option value="">— Sin tema específico —</option></select></div>
                <div class="form-group"><label for="mu-seccion">📂 Tipo de contenido</label><select id="mu-seccion"><option value="pdf">PDF</option><option value="imagen">Imagen</option><option value="texto">Nota de texto</option><option value="video">Video</option></select></div>
                <div class="form-group"><label for="mu-tipo">Formato</label><select id="mu-tipo" onchange="(function(){var t=document.getElementById('mu-tipo').value;document.getElementById('mu-archivo-wrap').style.display=t==='archivo'?'block':'none';document.getElementById('mu-texto-wrap').style.display=t==='texto'?'block':'none';document.getElementById('mu-url-wrap').style.display=t==='url-video'?'block':'none';})()"><option value="archivo">Subir archivo (PDF, Word, imagen, etc.)</option><option value="texto">Nota de texto</option><option value="url-video">URL de video (YouTube/Vimeo)</option></select></div>
                <div id="mu-archivo-wrap" class="form-group"><label for="mu-archivo">Archivo (máx. 2 GB)</label><input type="file" id="mu-archivo" accept=".pdf,.doc,.docx,.txt,image/*,video/*"></div>
                <div id="mu-texto-wrap" class="form-group" style="display:none"><label for="mu-texto">Texto</label><textarea id="mu-texto" rows="5" placeholder="Tu nota..."></textarea></div>
                <div id="mu-url-wrap" class="form-group" style="display:none"><label for="mu-url">URL</label><input type="url" id="mu-url" placeholder="https://youtube.com/..."></div>
                <div class="form-group"><label for="mu-desc">Descripción (opcional)</label><input type="text" id="mu-desc" placeholder="Breve descripción"></div>
                <div id="mu-progress" style="display:none;margin:.5rem 0"><div class="progress-bar-wrap"><div class="progress-bar-fill" id="mu-progress-fill"></div></div><p style="font-size:12px;color:#666;margin-top:4px">Subiendo...</p></div>
                <div id="mu-error" class="form-error" role="alert"></div>
                <div id="mu-success" class="form-success" role="status"></div>
                <button type="button" class="btn-subir" onclick="subirMiArchivo()">⬆️ Subir mi archivo</button>
            </div>
            <div id="mis-archivos-grid" class="contenido-grid"></div>
        </div>
    </section>

    <!-- 🆕 RANKING SEMANAL -->
    <section class="section section-alt" id="ranking">
        <div class="section-inner">
            <div class="section-header">
                <div class="section-icon" style="background:linear-gradient(135deg,#f59e0b,#dc2626)">🏆</div>
                <h2 class="section-title">Ranking de Estudiantes</h2>
                <p class="section-sub">Top 10 por puntos · Ganás puntos viendo contenido, comentando y manteniendo tu racha diaria</p>
            </div>
            <div id="ranking-grid" style="max-width:560px;margin:0 auto"></div>
        </div>
    </section>

    <section class="section premium-section" id="suscripcion">
        <div class="section-inner">
            <div class="section-header">
                <h2 class="section-title light">Contenido Premium ⭐</h2>
                <p class="section-sub light">Accedé a todo el material exclusivo sin límites</p>
            </div>
            <div id="suscripcion-info"></div>
            <div id="suscripcion-contenido" style="display:none">
                <div id="premium-cuota-info" class="cuota-info"></div>
                <div id="premium-grid" class="contenido-grid"></div>
            </div>
        </div>
    </section>

    </main>

    <footer class="footer">
        <div class="footer-inner">
            <div class="footer-brand">
                <span class="brand-icon">∑</span>
                <span>Matemáticas<strong>Activa</strong></span>
            </div>
            <p class="footer-copy">Copyright © 2025 Matemáticas Activa · Todos los derechos reservados</p>
            <div class="footer-links">
                <a href="#materias">Materias</a>
                <a href="#videos">Videos</a>
                <a href="#ranking">Ranking</a>
                <a href="#suscripcion">Premium</a>
                <a href="politica-privacidad.html">Política de Privacidad</a>
                <a href="terminos-servicio.html">Términos de Servicio</a>
                <a href="guia-pago.html">Guía de pago</a>
            </div>
        </div>
    </footer>

    <!-- OVERLAY AUTH -->
    <div id="overlay-auth" class="overlay" style="display:none" role="dialog" aria-modal="true" aria-labelledby="auth-titulo" onclick="cerrarOverlaySiClick(event,'overlay-auth')">
        <div class="overlay-panel">
            <button type="button" class="overlay-close" aria-label="Cerrar" onclick="document.getElementById('overlay-auth').style.display='none'">✕</button>
            <div id="auth-selector">
                <div class="auth-logo-sym" aria-hidden="true">∑</div>
                <h2 id="auth-titulo">Bienvenido/a</h2>
                <p style="color:#666;font-size:14px;margin-bottom:1.5rem">Ingresá o creá tu cuenta para acceder al contenido premium.</p>
                <button type="button" class="btn-auth btn-primary" onclick="mostrarForm('form-login')">Iniciar sesión</button>
                <button type="button" class="btn-auth btn-secondary" onclick="mostrarForm('form-registro')">Crear cuenta gratis</button>
                <hr style="margin:1.2rem 0;border:none;border-top:1px solid #eee">
                <p style="font-size:12px;color:#999">¿Sos administrador? <a href="#" onclick="mostrarForm('form-admin')" style="color:#2563eb">Acceder aquí</a></p>
            </div>
            <div id="form-login" style="display:none">
                <button type="button" class="back-btn" onclick="mostrarForm('auth-selector')">← Volver</button>
                <div class="auth-logo" aria-hidden="true">👤</div><h2>Iniciar sesión</h2>
                <div class="form-group"><label for="li-user">Email</label><input type="email" id="li-user" placeholder="tu@email.com" autocomplete="email"></div>
                <div class="form-group"><label for="li-pass">Contraseña</label><input type="password" id="li-pass" placeholder="••••••" autocomplete="current-password"></div>
                <div id="li-error" class="form-error" role="alert" aria-live="polite"></div>
                <button type="button" class="btn-auth btn-primary" onclick="usuarioLogin()">Ingresar</button>
                <p style="font-size:13px;margin-top:.8rem;text-align:center">¿No tenés cuenta? <a href="#" onclick="mostrarForm('form-registro')" style="color:#2563eb">Registrate</a></p>
                <p style="font-size:13px;text-align:center;margin-top:6px"><a href="#" onclick="mostrarForm('form-olvide')" style="color:#7c3aed">Olvidé mi contraseña</a></p>
            </div>
            <div id="form-registro" style="display:none">
                <button type="button" class="back-btn" onclick="mostrarForm('auth-selector')">← Volver</button>
                <div class="auth-logo" aria-hidden="true">✏️</div><h2>Crear cuenta</h2>
                <div class="form-group"><label for="re-user">Nombre de usuario</label><input type="text" id="re-user" placeholder="Como querés que te llamen" autocomplete="username"></div>
                <div class="form-group"><label for="re-email">Email</label><input type="email" id="re-email" placeholder="tu@email.com" autocomplete="email"></div>
                <div class="form-group"><label for="re-pass">Contraseña</label><input type="password" id="re-pass" placeholder="Mínimo 6 caracteres" autocomplete="new-password"></div>
                <div class="form-group"><label for="re-pass2">Confirmar contraseña</label><input type="password" id="re-pass2" placeholder="Repetí la contraseña" autocomplete="new-password"></div>
                <div class="form-group" style="display:flex;align-items:flex-start;gap:8px;background:#f8fafc;padding:10px 12px;border-radius:8px;margin:8px 0">
                    <input type="checkbox" id="re-acepto" style="margin-top:3px;cursor:pointer;width:18px;height:18px;flex-shrink:0">
                    <label for="re-acepto" style="font-size:13px;color:#475569;line-height:1.4;cursor:pointer">
                        Acepto los <a href="terminos-servicio.html" target="_blank" rel="noopener" style="color:#2563eb;font-weight:600">Términos y Condiciones</a> y la <a href="politica-privacidad.html" target="_blank" rel="noopener" style="color:#2563eb;font-weight:600">Política de Privacidad</a> de Matemáticas Activa.
                    </label>
                </div>
                <div id="re-error" class="form-error" role="alert" aria-live="polite"></div>
                <div id="re-success" class="form-success" role="status" aria-live="polite"></div>
                <button type="button" class="btn-auth btn-primary" onclick="usuarioRegistro()">Registrarme</button>
            </div>
            <div id="form-admin" style="display:none">
                <button type="button" class="back-btn" onclick="mostrarForm('auth-selector')">← Volver</button>
                <div class="auth-logo" aria-hidden="true">🔐</div><h2>Acceso administrador</h2>
                <div class="form-group"><label for="ad-user">Email del admin</label><input type="email" id="ad-user" placeholder="admin@..." autocomplete="email"></div>
                <div class="form-group"><label for="ad-pass">Contraseña</label><input type="password" id="ad-pass" placeholder="••••••" autocomplete="current-password"></div>
                <div id="ad-error" class="form-error" role="alert" aria-live="polite"></div>
                <button type="button" class="btn-auth btn-primary" onclick="adminLogin()">Ingresar como admin</button>
            </div>
            <div id="form-olvide" style="display:none">
                <button type="button" class="back-btn" onclick="mostrarForm('form-login')">← Volver</button>
                <div class="auth-logo" aria-hidden="true">🔑</div><h2>Olvidé mi contraseña</h2>
                <p style="font-size:13px;color:#666;margin-bottom:14px">Te enviamos un link a tu email para que crees una nueva.</p>
                <div class="form-group"><label for="ol-email">Email</label><input type="email" id="ol-email" placeholder="tu@email.com"></div>
                <div id="ol-error" class="form-error" role="alert"></div>
                <div id="ol-success" class="form-success" role="status"></div>
                <button type="button" class="btn-auth btn-primary" onclick="enviarOlvideContrasena()">Enviar link</button>
            </div>
        </div>
    </div>

    <!-- 🆕 MODAL MI PERFIL -->
    <div id="modal-perfil" class="overlay" style="display:none" role="dialog" aria-modal="true" onclick="cerrarOverlaySiClick(event,'modal-perfil')">
        <div class="overlay-panel" style="max-width:480px">
            <button type="button" class="overlay-close" aria-label="Cerrar" onclick="document.getElementById('modal-perfil').style.display='none'">✕</button>
            <div class="auth-logo" aria-hidden="true">👤</div>
            <h2 style="margin-bottom:6px">Mi Perfil</h2>
            <p id="perfil-puntos-display" style="font-size:13px;color:#7c3aed;font-weight:600;margin:0 0 4px"></p>
            <p id="perfil-email-display" style="font-size:11px;color:#94a3b8;margin:0 0 16px"></p>

            <div class="perfil-section">
                <h4>📝 Cambiar nombre de usuario</h4>
                <div class="form-group"><label for="perfil-username">Nuevo nombre</label><input type="text" id="perfil-username" placeholder="Ej: marcos.99"></div>
                <button type="button" class="btn-auth btn-primary" onclick="guardarUsername()" style="margin-top:6px">💾 Guardar nombre</button>
            </div>

            <div class="perfil-section">
                <h4>🔑 Cambiar contraseña</h4>
                <p style="font-size:12px;color:#94a3b8;margin:0 0 10px">Por seguridad necesitamos tu contraseña actual. <strong>Nadie (ni siquiera el admin) puede ver tu contraseña</strong> — están cifradas con bcrypt.</p>
                <div class="form-group"><label for="perfil-pass-actual">Contraseña actual</label><input type="password" id="perfil-pass-actual" autocomplete="current-password"></div>
                <div class="form-group"><label for="perfil-pass-nueva">Contraseña nueva</label><input type="password" id="perfil-pass-nueva" autocomplete="new-password" placeholder="Mínimo 6 caracteres"></div>
                <div class="form-group"><label for="perfil-pass-nueva2">Confirmar nueva</label><input type="password" id="perfil-pass-nueva2" autocomplete="new-password"></div>
                <button type="button" class="btn-auth btn-primary" onclick="cambiarMiPassword()" style="margin-top:6px">🔒 Cambiar contraseña</button>
            </div>

            <div id="pf-error" class="form-error" role="alert"></div>
            <div id="pf-success" class="form-success" role="status"></div>
        </div>
    </div>

    <!-- 🆕 MODAL RECOVERY (cuando llega del email de reset) -->
    <div id="modal-recovery" class="overlay" style="display:none" role="dialog" aria-modal="true">
        <div class="overlay-panel" style="max-width:420px">
            <div class="auth-logo" aria-hidden="true">🔑</div>
            <h2 style="margin-bottom:6px">Nueva contraseña</h2>
            <p style="font-size:13px;color:#666;margin-bottom:14px">Llegaste desde el link de recuperación. Definí tu nueva contraseña:</p>
            <div class="form-group"><label for="rec-pass">Nueva contraseña</label><input type="password" id="rec-pass" placeholder="Mínimo 6 caracteres" autocomplete="new-password"></div>
            <div class="form-group"><label for="rec-pass2">Confirmar</label><input type="password" id="rec-pass2" autocomplete="new-password"></div>
            <div id="rec-error" class="form-error" role="alert"></div>
            <button type="button" class="btn-auth btn-primary" onclick="setearPasswordRecovery()">Guardar y volver</button>
        </div>
    </div>

    <!-- OVERLAY ADMIN -->
    <div id="overlay-admin" class="overlay" style="display:none" role="dialog" aria-modal="true" onclick="cerrarOverlaySiClick(event,'overlay-admin')">
        <div class="overlay-panel admin-panel">
            <button type="button" class="overlay-close" aria-label="Cerrar" onclick="document.getElementById('overlay-admin').style.display='none'">✕</button>
            <div class="admin-header">
                <span class="admin-logo" aria-hidden="true">⚙️</span>
                <div><h2 style="margin:0;font-size:18px">Panel de administración</h2><p style="margin:0;font-size:12px;color:#888">Matemáticas Activa</p></div>
            </div>
            <div class="admin-tabs" role="tablist">
                <button type="button" class="admin-tab active" onclick="adminTab('archivos')">📁 Archivos</button>
                <button type="button" class="admin-tab" onclick="adminTab('usuarios')">👥 Usuarios</button>
                <button type="button" class="admin-tab" onclick="adminTab('subir')">⬆️ Subir</button>
                <button type="button" class="admin-tab" onclick="adminTab('ejercicios')">🎯 Ejercicios</button>
            </div>
            <div id="admin-tab-archivos">
                <div class="tab-toolbar">
                    <span style="font-size:13px;color:#666">Contenido publicado</span>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                        <select id="filtro-seccion" onchange="renderAdminArchivos()"><option value="">Todas las secciones</option><option value="video">Videos</option><option value="pdf">PDFs</option><option value="premium">Premium</option><option value="imagen">Imágenes</option><option value="texto">Texto</option></select>
                        <select id="filtro-materia" onchange="renderAdminArchivos()"><option value="">Todas las materias</option><option value="algebra">Álgebra</option><option value="aritmetica">Aritmética</option><option value="geometria">Geometría</option><option value="estadistica">Estadística</option><option value="trigonometria">Trigonometría</option><option value="calculo">Cálculo</option><option value="razonamiento">Razonamiento</option><option value="juegos">Juegos</option><option value="general">General</option></select>
                    </div>
                </div>
                <div id="admin-archivos-grid" class="admin-grid"></div>
            </div>
            <div id="admin-tab-usuarios" style="display:none"><div id="admin-usuarios-lista"></div></div>
            <div id="admin-tab-subir" style="display:none">
                <div class="subir-form">
                    <div class="form-group"><label for="su-titulo">Título *</label><input type="text" id="su-titulo" placeholder="Nombre del contenido"></div>
                    <div class="form-group"><label for="su-materia">📚 Materia *</label><select id="su-materia"><option value="general">General</option><option value="algebra">Álgebra</option><option value="aritmetica">Aritmética</option><option value="geometria">Geometría</option><option value="estadistica">Estadística</option><option value="trigonometria">Trigonometría</option><option value="calculo">Cálculo</option><option value="razonamiento">Razonamiento</option><option value="juegos">Juegos</option></select></div>
                    <div class="form-group"><label for="su-tema">🎯 Tema (opcional, ruta de aprendizaje)</label><select id="su-tema"><option value="">— Sin tema específico —</option></select></div>
                    <div class="form-group"><label for="su-seccion">📂 Sección *</label><select id="su-seccion"><option value="video">Videos</option><option value="pdf">PDFs</option><option value="premium">Premium</option><option value="imagen">Imagen</option><option value="texto">Texto</option></select></div>
                    <div class="form-group"><label for="su-tipo">Tipo *</label><select id="su-tipo" onchange="actualizarCampoArchivo()"><option value="archivo">Archivo</option><option value="texto">Texto</option><option value="url-video">URL de video</option></select></div>
                    <div id="su-archivo-wrap" class="form-group"><label for="su-archivo">Archivo (máx. 2 GB)</label><input type="file" id="su-archivo" accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"></div>
                    <div id="su-texto-wrap" class="form-group" style="display:none"><label for="su-texto">Contenido</label><textarea id="su-texto" rows="5" placeholder="Escribí el contenido..."></textarea></div>
                    <div id="su-url-wrap" class="form-group" style="display:none"><label for="su-url">URL del video</label><input type="url" id="su-url" placeholder="https://youtube.com/..."></div>
                    <div class="form-group"><label for="su-desc">Descripción</label><input type="text" id="su-desc" placeholder="Breve descripción"></div>
                    <div id="su-progress" style="display:none;margin:.5rem 0"><div class="progress-bar-wrap"><div class="progress-bar-fill" id="su-progress-fill"></div></div><p style="font-size:12px;color:#666;margin-top:4px">Procesando...</p></div>
                    <div id="su-error" class="form-error" role="alert"></div>
                    <div id="su-success" class="form-success" role="status"></div>
                    <button type="button" class="btn-subir" onclick="subirContenido()">⬆️ Publicar contenido</button>
                </div>
            </div>
            <div id="admin-tab-ejercicios" style="display:none"><div id="admin-ejercicios-lista"></div></div>
        </div>
    </div>

    <!-- MODAL VISOR -->
    <div id="modal-visor" class="overlay" style="display:none" role="dialog" aria-modal="true" aria-labelledby="visor-titulo" onclick="cerrarOverlaySiClick(event,'modal-visor')">
        <div class="overlay-panel visor-panel" style="max-width:860px">
            <div class="visor-header">
                <h3 id="visor-titulo"></h3>
                <button type="button" class="overlay-close" aria-label="Cerrar visor" style="position:static;background:#f1f5f9;border-radius:8px;padding:5px 14px;font-size:13px;font-weight:600" onclick="document.getElementById('modal-visor').style.display='none'">✕ Cerrar</button>
            </div>
            <div id="visor-cuerpo"></div>
        </div>
    </div>

    <!-- MODAL EDITAR -->
    <div id="modal-editar" class="overlay" style="display:none" role="dialog" aria-modal="true" onclick="cerrarOverlaySiClick(event,'modal-editar')">
        <div class="overlay-panel" style="max-width:480px">
            <button type="button" class="overlay-close" aria-label="Cerrar" onclick="document.getElementById('modal-editar').style.display='none'">✕</button>
            <h2 style="margin-bottom:1rem;font-size:18px">✏️ Editar contenido</h2>
            <input type="hidden" id="ed-id">
            <div class="form-group"><label for="ed-titulo">Título</label><input type="text" id="ed-titulo"></div>
            <div class="form-group"><label for="ed-desc">Descripción</label><input type="text" id="ed-desc"></div>
            <div class="form-group"><label for="ed-materia">Materia</label><select id="ed-materia"><option value="general">General</option><option value="algebra">Álgebra</option><option value="aritmetica">Aritmética</option><option value="geometria">Geometría</option><option value="estadistica">Estadística</option><option value="trigonometria">Trigonometría</option><option value="calculo">Cálculo</option><option value="razonamiento">Razonamiento</option><option value="juegos">Juegos</option></select></div>
            <div class="form-group"><label for="ed-seccion">Sección</label><select id="ed-seccion"><option value="video">Videos</option><option value="pdf">PDFs</option><option value="premium">Premium</option><option value="imagen">Imagen</option><option value="texto">Texto</option></select></div>
            <div id="ed-texto-wrap" class="form-group" style="display:none"><label for="ed-texto">Contenido</label><textarea id="ed-texto" rows="5"></textarea></div>
            <div id="ed-error" class="form-error" role="alert"></div>
            <div style="display:flex;gap:8px;margin-top:1rem">
                <button type="button" class="btn-subir" onclick="guardarEdicion()">✔ Guardar</button>
                <button type="button" class="btn-cancelar" onclick="document.getElementById('modal-editar').style.display='none'">Cancelar</button>
            </div>
        </div>
    </div>

    <!-- MODAL PAGO -->
    <div id="modal-pago" class="overlay" style="display:none" role="dialog" aria-modal="true" onclick="cerrarOverlaySiClick(event,'modal-pago')">
        <div class="overlay-panel pago-panel">
            <button type="button" class="overlay-close" aria-label="Cerrar" onclick="document.getElementById('modal-pago').style.display='none'">✕</button>
            <div class="pago-header">
                <div style="font-size:48px" aria-hidden="true">⭐</div>
                <h2>Suscripción Premium</h2>
                <div class="precio-grande">$ 10.000 <span class="precio-sub">ARS / mes</span></div>
            </div>
            <ul class="beneficios-lista">
                <li>✅ Acceso ilimitado a todos los archivos premium</li>
                <li>✅ Videos, PDFs y ejercicios sin restricciones</li>
                <li>✅ 30 días de acceso completo</li>
                <li>✅ Contenido de todas las materias</li>
                <li>✅ Subida ilimitada en tu carpeta personal</li>
            </ul>
            <p style="font-size:13px;font-weight:600;margin:16px 0 10px">Elegí tu método de pago:</p>
            <a href="https://mpago.la/29qTXgw" target="_blank" rel="noopener" class="btn-pago-mp">💳 Pagar con MercadoPago</a>
            <a href="https://mpago.la/29qTXgw" target="_blank" rel="noopener" class="btn-pago-nx">🟠 Pagar con Naranja X</a>
            <div class="pago-instrucciones">
                <p style="font-weight:700;margin:0 0 8px">📋 ¿Qué hacer después?</p>
                <ol><li>Completá el pago</li><li>Guardá el comprobante</li><li>Enviánoslo al administrador</li><li>Acceso premium en menos de 24hs</li></ol>
            </div>
        </div>
    </div>

        <!-- MODAL PAGO con 3 planes -->
    <div id="modal-pago" class="overlay" style="display:none" role="dialog" aria-modal="true" onclick="cerrarOverlaySiClick(event,'modal-pago')">
        <div class="overlay-panel" style="max-width:920px;padding:32px 28px">
            <button type="button" class="overlay-close" aria-label="Cerrar" onclick="document.getElementById('modal-pago').style.display='none'">✕</button>
            <div style="text-align:center;margin-bottom:24px">
                <h2 style="font-size:24px;margin:0 0 6px">Elegí tu plan</h2>
                <p style="color:#64748b;font-size:14px;margin:0">Mejorá tu experiencia y accedé a más contenido</p>
            </div>

            <div class="planes-grid">
                <!-- PLAN GRATIS -->
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
                    <button type="button" class="plan-btn plan-btn-gratis" disabled>Tu plan actual por defecto</button>
                </div>

                <!-- PLAN BÁSICO -->
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
                    <a class="plan-btn plan-btn-basico" href="https://wa.me/5493827654154?text=Hola%21%20Quiero%20suscribirme%20al%20PLAN%20B%C3%81SICO%20%28%247.000%29%20de%20Matem%C3%A1ticas%20Activa.%20Mi%20usuario%20es%3A%20" target="_blank" rel="noopener">📩 Pedir información por WhatsApp</a>
                    <p style="font-size:11px;color:#64748b;text-align:center;margin:8px 0 0">Pagás por MercadoPago/Naranja X y nos enviás el comprobante</p>
                </div>

                <!-- PLAN PREMIUM -->
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
                    <a class="plan-btn plan-btn-premium" href="https://wa.me/5493827654154?text=Hola%21%20Quiero%20suscribirme%20al%20PLAN%20PREMIUM%20%28%2412.000%29%20de%20Matem%C3%A1ticas%20Activa.%20Mi%20usuario%20es%3A%20" target="_blank" rel="noopener">⭐ Pedir información por WhatsApp</a>
                    <p style="font-size:11px;color:#64748b;text-align:center;margin:8px 0 0">Activación en pocos minutos tras enviar comprobante</p>
                </div>
            </div>

            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-top:20px">
                <h4 style="margin:0 0 8px;font-size:14px;color:#92400e">📋 Cómo funciona el pago:</h4>
                <ol style="margin:0;padding-left:20px;font-size:13px;color:#78350f;line-height:1.7">
                    <li>Hacé clic en "Pedir información" del plan que querés.</li>
                    <li>Te abre WhatsApp con un mensaje predefinido — solo agregás tu nombre de usuario.</li>
                    <li>Te enviamos los datos para pagar por MercadoPago o Naranja X.</li>
                    <li>Realizás el pago y nos enviás el comprobante por WhatsApp.</li>
                    <li>Tu plan se activa en pocos minutos.</li>
                </ol>
                <p style="font-size:12px;color:#92400e;margin:10px 0 0"><a href="guia-pago.html" target="_blank" style="color:#92400e;font-weight:600">📖 Ver guía detallada de pago</a></p>
            </div>
        </div>
    </div>

    <!-- 🆕 BOTÓN FLOTANTE DE CONTACTO -->
    <button type="button" class="fab-contacto" id="fab-contacto-btn" aria-label="Contactanos" onclick="toggleFabContacto()">💬</button>
    <div class="fab-menu" id="fab-menu-contacto" role="dialog" aria-label="Opciones de contacto">
        <h4>¿Necesitás ayuda?</h4>
        <p>Mandanos tu comprobante de pago o consulta:</p>
        <a class="fab-opcion wa" href="https://wa.me/5493827654154?text=Hola%21%20Te%20escribo%20desde%20Matem%C3%A1ticas%20Activa.%20" target="_blank" rel="noopener">
            <span class="fab-opcion-icon">💚</span>
            <div>
                <div>WhatsApp</div>
                <div style="font-size:11px;opacity:.9;font-weight:400">Comprobante o consultas</div>
            </div>
        </a>
        <a class="fab-opcion ig" href="https://instagram.com/CAMBIAR_USUARIO" target="_blank" rel="noopener">
            <span class="fab-opcion-icon">📷</span>
            <div>
                <div>Instagram</div>
                <div style="font-size:11px;opacity:.9;font-weight:400">Seguinos para novedades</div>
            </div>
        </a>
    </div>

    <!-- Supabase SDK + config + scripts -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="supabase-config.js"></script>
    <script src="scripts.js"></script>
</body>
</html>
