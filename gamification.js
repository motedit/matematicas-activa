// ================================================================
//  MATEMÁTICAS ACTIVA — gamification.js
//  Features: Celebraciones, Vidas, Meta Diaria XP, Ligas
// ================================================================

(function() {
'use strict';

// ===================== CONFIGURACIÓN =====================
const VIDAS_MAX = 5;
const VIDAS_REGEN_MIN = 30; // minutos para regenerar 1 vida
const COMBO_CONFETTI_MIN = 3; // aciertos seguidos para confetti extra
const META_NIVELES = { casual: 10, regular: 30, intenso: 50 };
const LIGAS = [
    { nombre: 'Bronce', icono: '🥉', color: '#cd7f32', min: 0 },
    { nombre: 'Plata', icono: '🥈', color: '#c0c0c0', min: 50 },
    { nombre: 'Oro', icono: '🥇', color: '#ffd700', min: 150 },
    { nombre: 'Diamante', icono: '💎', color: '#b9f2ff', min: 300 },
    { nombre: 'Campeón', icono: '👑', color: '#ff6b6b', min: 500 },
];

// ===================== ESTADO =====================
let _combo = 0;
let _vidasState = { vidas: VIDAS_MAX, ultimaRecarga: Date.now() };
let _metaDiaria = { meta: 30, xpHoy: 0, fecha: new Date().toISOString().slice(0,10) };
let _confettiLoaded = false;

// ===================== 1. CELEBRACIONES ANIMADAS =====================

function cargarConfetti() {
    if (_confettiLoaded) return Promise.resolve();
    return new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
        s.onload = () => { _confettiLoaded = true; resolve(); };
        s.onerror = () => resolve();
        document.head.appendChild(s);
    });
}

function lanzarConfetti(tipo) {
    if (typeof confetti !== 'function') return;
    switch(tipo) {
        case 'correcto':
            confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: ['#16a34a','#22c55e','#4ade80'] });
            break;
        case 'combo':
            confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 }, colors: ['#f59e0b','#ef4444','#8b5cf6','#06b6d4'] });
            setTimeout(() => confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0 } }), 200);
            setTimeout(() => confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1 } }), 400);
            break;
        case 'meta_cumplida':
            const duration = 2000;
            const end = Date.now() + duration;
            (function frame() {
                confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#2563eb','#7c3aed'] });
                confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#2563eb','#7c3aed'] });
                if (Date.now() < end) requestAnimationFrame(frame);
            })();
            break;
        case 'logro':
            confetti({ particleCount: 120, spread: 160, origin: { y: 0.5 }, colors: ['#ffd700','#ff6b6b','#8b5cf6','#06b6d4','#16a34a'] });
            break;
    }
}

function mostrarXPPopup(puntos, esCombo) {
    const popup = document.createElement('div');
    popup.className = 'xp-popup' + (esCombo ? ' combo' : '');
    popup.innerHTML = esCombo
        ? `<span class="xp-combo-label">🔥 COMBO x${_combo}!</span><span class="xp-amount">+${puntos} XP</span>`
        : `<span class="xp-amount">+${puntos} XP</span>`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('visible'));
    setTimeout(() => {
        popup.classList.remove('visible');
        setTimeout(() => popup.remove(), 300);
    }, 1500);
}

function mostrarComboIndicador() {
    let indicador = document.getElementById('combo-indicador');
    if (!indicador) {
        indicador = document.createElement('div');
        indicador.id = 'combo-indicador';
        document.body.appendChild(indicador);
    }
    indicador.innerHTML = `<span class="combo-fire">🔥</span><span class="combo-num">${_combo}</span><span class="combo-text">combo</span>`;
    indicador.className = 'combo-indicador visible';
    if (_combo >= 5) indicador.classList.add('mega');
    clearTimeout(indicador._timer);
    indicador._timer = setTimeout(() => indicador.classList.remove('visible'), 3000);
}

// ===================== 2. SISTEMA DE VIDAS =====================

function cargarVidas() {
    try {
        const saved = localStorage.getItem('ma_vidas');
        if (saved) _vidasState = JSON.parse(saved);
    } catch(e) {}
    regenerarVidas();
}

function guardarVidas() {
    try { localStorage.setItem('ma_vidas', JSON.stringify(_vidasState)); } catch(e) {}
}

function regenerarVidas() {
    if (_vidasState.vidas >= VIDAS_MAX) return;
    const ahora = Date.now();
    const minutos = (ahora - _vidasState.ultimaRecarga) / 60000;
    const vidasRegen = Math.floor(minutos / VIDAS_REGEN_MIN);
    if (vidasRegen > 0) {
        _vidasState.vidas = Math.min(VIDAS_MAX, _vidasState.vidas + vidasRegen);
        _vidasState.ultimaRecarga = ahora;
        guardarVidas();
    }
}

function perderVida() {
    regenerarVidas();
    if (_vidasState.vidas > 0) {
        _vidasState.vidas--;
        if (_vidasState.vidas < VIDAS_MAX && _vidasState.ultimaRecarga === 0) {
            _vidasState.ultimaRecarga = Date.now();
        }
        guardarVidas();
        animarPerdidaVida();
    }
    renderVidasUI();
    return _vidasState.vidas;
}

function ganarVida() {
    if (_vidasState.vidas < VIDAS_MAX) {
        _vidasState.vidas++;
        guardarVidas();
        renderVidasUI();
    }
}

function tieneVidas() {
    regenerarVidas();
    return _vidasState.vidas > 0;
}

function animarPerdidaVida() {
    const hearts = document.querySelectorAll('.vida-heart.active');
    const last = hearts[hearts.length - 1];
    if (last) {
        last.classList.add('breaking');
        setTimeout(() => {
            last.classList.remove('active', 'breaking');
            last.classList.add('empty');
        }, 500);
    }
}

function renderVidasUI() {
    regenerarVidas();
    let container = document.getElementById('vidas-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'vidas-container';
        container.className = 'vidas-container';
        // Insertar en la navbar o donde corresponda
        const nav = document.querySelector('.navbar-inner') || document.querySelector('nav');
        if (nav) nav.appendChild(container);
    }
    let html = '<div class="vidas-hearts">';
    for (let i = 0; i < VIDAS_MAX; i++) {
        html += `<span class="vida-heart ${i < _vidasState.vidas ? 'active' : 'empty'}">❤️</span>`;
    }
    html += '</div>';
    if (_vidasState.vidas < VIDAS_MAX) {
        const minRest = Math.max(0, VIDAS_REGEN_MIN - Math.floor((Date.now() - _vidasState.ultimaRecarga) / 60000) % VIDAS_REGEN_MIN);
        html += `<span class="vidas-timer">+1 en ${minRest}min</span>`;
    }
    if (_vidasState.vidas === 0) {
        html += '<div class="vidas-agotadas">Sin vidas — esperá o mirá un tip para recuperar</div>';
    }
    container.innerHTML = html;
}

function mostrarSinVidas() {
    if (typeof mostrarToast === 'function') {
        mostrarToast('❤️ Sin vidas — esperá 30 min o mirá un tip para recuperar una', 'warn');
    }
}

// ===================== 3. META DIARIA DE XP =====================

function cargarMetaDiaria() {
    try {
        const saved = localStorage.getItem('ma_meta_diaria');
        if (saved) _metaDiaria = JSON.parse(saved);
        const hoy = new Date().toISOString().slice(0,10);
        if (_metaDiaria.fecha !== hoy) {
            _metaDiaria.xpHoy = 0;
            _metaDiaria.fecha = hoy;
            guardarMetaDiaria();
        }
    } catch(e) {}
}

function guardarMetaDiaria() {
    try { localStorage.setItem('ma_meta_diaria', JSON.stringify(_metaDiaria)); } catch(e) {}
}

function setMetaDiaria(nivel) {
    _metaDiaria.meta = META_NIVELES[nivel] || 30;
    guardarMetaDiaria();
    renderMetaDiariaUI();
}

function agregarXPDiario(xp) {
    const antes = _metaDiaria.xpHoy;
    _metaDiaria.xpHoy += xp;
    guardarMetaDiaria();
    renderMetaDiariaUI();
    // Check si justo cumplió la meta
    if (antes < _metaDiaria.meta && _metaDiaria.xpHoy >= _metaDiaria.meta) {
        lanzarConfetti('meta_cumplida');
        if (typeof mostrarToast === 'function') {
            mostrarToast('🎯 ¡Meta diaria cumplida! Seguí así', 'ok');
        }
    }
}

function renderMetaDiariaUI() {
    let widget = document.getElementById('meta-diaria-widget');
    if (!widget) return;
    const { meta, xpHoy } = _metaDiaria;
    const pct = Math.min(100, Math.round((xpHoy / meta) * 100));
    const cumplida = xpHoy >= meta;
    const nivelActual = Object.entries(META_NIVELES).find(([,v]) => v === meta)?.[0] || 'regular';

    widget.innerHTML = `
        <div class="meta-header">
            <span class="meta-label">🎯 Meta diaria</span>
            <div class="meta-selector">
                <button class="meta-btn ${nivelActual === 'casual' ? 'active' : ''}" onclick="window.MA_GAME.setMetaDiaria('casual')">Casual</button>
                <button class="meta-btn ${nivelActual === 'regular' ? 'active' : ''}" onclick="window.MA_GAME.setMetaDiaria('regular')">Regular</button>
                <button class="meta-btn ${nivelActual === 'intenso' ? 'active' : ''}" onclick="window.MA_GAME.setMetaDiaria('intenso')">Intenso</button>
            </div>
        </div>
        <div class="meta-progress-wrap">
            <div class="meta-progress-bar">
                <div class="meta-progress-fill ${cumplida ? 'completa' : ''}" style="width:${pct}%"></div>
            </div>
            <span class="meta-progress-text">${xpHoy}/${meta} XP ${cumplida ? '✅' : ''}</span>
        </div>`;
}

// ===================== 4. LIGAS SEMANALES =====================

function getLigaActual(xpSemanal) {
    let liga = LIGAS[0];
    for (const l of LIGAS) {
        if (xpSemanal >= l.min) liga = l;
    }
    return liga;
}

function renderLigaUI() {
    let widget = document.getElementById('liga-widget');
    if (!widget) return;
    // XP semanal: suma del XP de esta semana (simplificado con localStorage)
    let xpSemanal = 0;
    try {
        const saved = localStorage.getItem('ma_xp_semanal');
        if (saved) {
            const data = JSON.parse(saved);
            const hoy = new Date();
            const lunes = new Date(hoy);
            lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
            const lunesStr = lunes.toISOString().slice(0,10);
            if (data.semana === lunesStr) {
                xpSemanal = data.xp;
            } else {
                localStorage.setItem('ma_xp_semanal', JSON.stringify({ semana: lunesStr, xp: 0 }));
            }
        }
    } catch(e) {}

    const liga = getLigaActual(xpSemanal);
    const nextLiga = LIGAS[LIGAS.indexOf(liga) + 1];
    const progreso = nextLiga ? Math.min(100, Math.round(((xpSemanal - liga.min) / (nextLiga.min - liga.min)) * 100)) : 100;

    widget.innerHTML = `
        <div class="liga-card">
            <div class="liga-icon-big">${liga.icono}</div>
            <div class="liga-info">
                <span class="liga-nombre" style="color:${liga.color}">${liga.nombre}</span>
                <span class="liga-xp">${xpSemanal} XP esta semana</span>
            </div>
            ${nextLiga ? `
            <div class="liga-progress-wrap">
                <div class="liga-progress-bar">
                    <div class="liga-progress-fill" style="width:${progreso}%;background:${nextLiga.color}"></div>
                </div>
                <span class="liga-next">${nextLiga.icono} ${nextLiga.nombre}: ${nextLiga.min} XP</span>
            </div>` : '<span class="liga-max">🏆 ¡Liga máxima!</span>'}
        </div>`;
}

function agregarXPSemanal(xp) {
    try {
        const hoy = new Date();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
        const lunesStr = lunes.toISOString().slice(0,10);
        let data = { semana: lunesStr, xp: 0 };
        const saved = localStorage.getItem('ma_xp_semanal');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.semana === lunesStr) data = parsed;
        }
        data.xp += xp;
        localStorage.setItem('ma_xp_semanal', JSON.stringify(data));
        renderLigaUI();
    } catch(e) {}
}

// ===================== HOOK PRINCIPAL =====================

function onRespuestaEjercicio(correcto, puntos) {
    if (correcto) {
        _combo++;
        const esCombo = _combo >= COMBO_CONFETTI_MIN;
        if (esCombo) {
            lanzarConfetti('combo');
            mostrarComboIndicador();
        } else {
            lanzarConfetti('correcto');
        }
        mostrarXPPopup(puntos, esCombo);
        agregarXPDiario(puntos);
        agregarXPSemanal(puntos);
    } else {
        _combo = 0;
        perderVida();
        // Eliminar combo indicador
        const indicador = document.getElementById('combo-indicador');
        if (indicador) indicador.classList.remove('visible');
    }
}

function puedeResponder() {
    if (!tieneVidas()) {
        mostrarSinVidas();
        return false;
    }
    return true;
}

// ===================== INIT =====================

async function init() {
    await cargarConfetti();
    cargarVidas();
    cargarMetaDiaria();

    // Inyectar CSS de gamificación
    if (!document.getElementById('gamification-css')) {
        const style = document.createElement('style');
        style.id = 'gamification-css';
        style.textContent = `
            /* XP Popup */
            .xp-popup{position:fixed;top:30%;left:50%;transform:translate(-50%,-50%) scale(0.5);opacity:0;z-index:99999;
                background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;padding:12px 24px;border-radius:16px;
                font-family:'Poppins',sans-serif;font-weight:700;font-size:20px;pointer-events:none;
                transition:all .3s cubic-bezier(.34,1.56,.64,1);text-align:center;box-shadow:0 8px 32px rgba(37,99,235,.4)}
            .xp-popup.visible{opacity:1;transform:translate(-50%,-50%) scale(1)}
            .xp-popup.combo{background:linear-gradient(135deg,#f59e0b,#ef4444);font-size:24px;box-shadow:0 8px 32px rgba(245,158,11,.5)}
            .xp-combo-label{display:block;font-size:14px;opacity:.9;margin-bottom:2px}
            .xp-amount{font-size:inherit}

            /* Combo indicador */
            .combo-indicador{position:fixed;top:20px;right:20px;z-index:99998;
                background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;padding:8px 18px;border-radius:99px;
                font-family:'Poppins',sans-serif;font-weight:700;display:flex;align-items:center;gap:6px;
                opacity:0;transform:scale(0.5);transition:all .3s cubic-bezier(.34,1.56,.64,1);pointer-events:none;
                box-shadow:0 4px 16px rgba(245,158,11,.4)}
            .combo-indicador.visible{opacity:1;transform:scale(1)}
            .combo-indicador.mega{animation:combo-pulse .5s ease infinite alternate;font-size:18px}
            .combo-fire{font-size:20px}
            .combo-num{font-size:24px}
            .combo-text{font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:1px}
            @keyframes combo-pulse{0%{transform:scale(1)}100%{transform:scale(1.08)}}

            /* Vidas */
            .vidas-container{display:flex;align-items:center;gap:4px;margin-left:auto;padding:4px 10px;
                background:rgba(255,255,255,.1);border-radius:99px;font-size:14px}
            .vidas-hearts{display:flex;gap:2px}
            .vida-heart{font-size:16px;transition:all .3s}
            .vida-heart.empty{filter:grayscale(1);opacity:.3}
            .vida-heart.breaking{animation:heart-break .5s ease}
            .vidas-timer{font-size:11px;color:rgba(255,255,255,.6);margin-left:4px}
            .vidas-agotadas{font-size:11px;color:#fca5a5;margin-left:4px}
            @keyframes heart-break{0%{transform:scale(1)}30%{transform:scale(1.3)}60%{transform:scale(0.8) rotate(-15deg)}100%{transform:scale(0) rotate(-30deg);opacity:0}}

            /* Meta diaria */
            #meta-diaria-widget{background:var(--color-bg,white);border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-bottom:16px}
            .meta-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px}
            .meta-label{font-weight:700;font-size:15px;color:#0f172a}
            .meta-selector{display:flex;gap:4px}
            .meta-btn{background:#f1f5f9;border:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:600;padding:4px 12px;
                border-radius:99px;cursor:pointer;transition:all .2s;font-family:inherit}
            .meta-btn:hover{background:#e2e8f0}
            .meta-btn.active{background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border-color:transparent}
            .meta-progress-wrap{display:flex;align-items:center;gap:10px}
            .meta-progress-bar{flex:1;height:12px;background:#f1f5f9;border-radius:99px;overflow:hidden}
            .meta-progress-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#2563eb,#7c3aed);
                transition:width .5s cubic-bezier(.34,1.56,.64,1)}
            .meta-progress-fill.completa{background:linear-gradient(90deg,#16a34a,#22c55e);animation:meta-glow 1s ease infinite alternate}
            .meta-progress-text{font-size:13px;font-weight:700;color:#475569;white-space:nowrap}
            @keyframes meta-glow{0%{box-shadow:0 0 4px rgba(22,163,106,.3)}100%{box-shadow:0 0 12px rgba(22,163,106,.6)}}

            /* Liga */
            #liga-widget{margin-bottom:16px}
            .liga-card{background:var(--color-bg,white);border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;
                display:flex;align-items:center;gap:12px;flex-wrap:wrap}
            .liga-icon-big{font-size:36px}
            .liga-info{display:flex;flex-direction:column}
            .liga-nombre{font-weight:800;font-size:18px;font-family:'Poppins',sans-serif}
            .liga-xp{font-size:13px;color:#64748b}
            .liga-progress-wrap{flex:1;min-width:150px}
            .liga-progress-bar{height:8px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-bottom:4px}
            .liga-progress-fill{height:100%;border-radius:99px;transition:width .5s ease}
            .liga-next{font-size:11px;color:#94a3b8}
            .liga-max{font-size:14px;font-weight:700;color:#f59e0b}

            /* Dark mode overrides */
            [data-theme="dark"] #meta-diaria-widget,
            [data-theme="dark"] .liga-card{background:#1e293b;border-color:#334155}
            [data-theme="dark"] .meta-label{color:#f1f5f9}
            [data-theme="dark"] .meta-progress-text{color:#94a3b8}
            [data-theme="dark"] .meta-btn{background:#334155;border-color:#475569;color:#94a3b8}
            [data-theme="dark"] .meta-progress-bar,
            [data-theme="dark"] .liga-progress-bar{background:#334155}
        `;
        document.head.appendChild(style);
    }

    // Renderizar si los contenedores existen
    renderVidasUI();
    renderMetaDiariaUI();
    renderLigaUI();

    // Timer para regenerar vidas cada minuto
    setInterval(() => {
        regenerarVidas();
        renderVidasUI();
    }, 60000);
}

// Auto-init cuando DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ===================== EXPORT =====================
window.MA_GAME = {
    onRespuestaEjercicio,
    puedeResponder,
    lanzarConfetti,
    perderVida,
    ganarVida,
    tieneVidas,
    renderVidasUI,
    setMetaDiaria,
    agregarXPDiario,
    renderMetaDiariaUI,
    renderLigaUI,
    agregarXPSemanal,
    getLigaActual,
    getCombo: () => _combo,
    getVidas: () => _vidasState.vidas,
    getMeta: () => _metaDiaria,
    LIGAS,
};

})();
