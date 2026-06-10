// ================================================================
//  MATEMÁTICAS ACTIVA — historias.js
//  Historias Matemáticas: narrativas interactivas estilo Duolingo
// ================================================================

(function() {
'use strict';

const HISTORIAS = [
    {
        id: 'pizza_fracciones',
        titulo: 'La pizzería de fracciones',
        materia: 'aritmetica',
        icono: '🍕',
        color: '#ef4444',
        dificultad: 'facil',
        xp: 30,
        escenas: [
            { tipo: 'narrativa', texto: 'Marcos trabaja en una pizzería. Hoy llegaron 3 amigos que quieren repartirse 2 pizzas en partes iguales.', imagen: '🍕🍕' },
            { tipo: 'pregunta', texto: '¿Qué fracción de pizza le toca a cada amigo?', opciones: ['2/3', '3/2', '1/2', '1/3'], correcta: 0, explicacion: 'Si dividimos 2 pizzas entre 3 personas: 2 ÷ 3 = 2/3 de pizza para cada uno.' },
            { tipo: 'narrativa', texto: 'Uno de los amigos no tiene hambre y le da su porción a los otros dos. Ahora quedan 2 personas repartiéndose las 2 pizzas.', imagen: '🤝' },
            { tipo: 'pregunta', texto: 'Si cada amigo ya tenía 2/3, ¿cuánto tiene ahora cada uno al sumar la mitad de 2/3?', opciones: ['1 pizza', '5/6', '2/3', '4/3'], correcta: 0, explicacion: '2/3 + (2/3 ÷ 2) = 2/3 + 1/3 = 3/3 = 1 pizza entera.' },
            { tipo: 'narrativa', texto: '¡Cada amigo se queda con una pizza completa! Las fracciones nos ayudan a repartir de forma justa.', imagen: '🎉' },
        ]
    },
    {
        id: 'viaje_porcentajes',
        titulo: 'El viaje de los porcentajes',
        materia: 'aritmetica',
        icono: '✈️',
        color: '#2563eb',
        dificultad: 'medio',
        xp: 40,
        escenas: [
            { tipo: 'narrativa', texto: 'Lucía quiere comprar un pasaje de avión que cuesta $100.000. Encontró un cupón de descuento del 20%.', imagen: '✈️💳' },
            { tipo: 'pregunta', texto: '¿Cuánto ahorra Lucía con el cupón del 20%?', opciones: ['$20.000', '$10.000', '$25.000', '$80.000'], correcta: 0, explicacion: '20% de $100.000 = 0.20 × 100.000 = $20.000' },
            { tipo: 'narrativa', texto: 'Después del descuento, el precio queda en $80.000. Pero hay un impuesto del 10% sobre el precio con descuento.', imagen: '🏦' },
            { tipo: 'pregunta', texto: '¿Cuánto paga Lucía en total con el impuesto?', opciones: ['$88.000', '$90.000', '$80.000', '$100.000'], correcta: 0, explicacion: '10% de $80.000 = $8.000 de impuesto. Total: $80.000 + $8.000 = $88.000' },
            { tipo: 'pregunta', texto: '¿Qué porcentaje del precio original terminó pagando Lucía?', opciones: ['88%', '80%', '90%', '78%'], correcta: 0, explicacion: '$88.000 / $100.000 × 100 = 88%. ¡Cuidado! Descuento 20% + impuesto 10% no es -10%, porque se aplican sobre diferentes montos.' },
            { tipo: 'narrativa', texto: '¡Lucía aprendió que los porcentajes no siempre se suman directamente! Cada uno se calcula sobre una base diferente.', imagen: '🧠✨' },
        ]
    },
    {
        id: 'puente_geometria',
        titulo: 'El puente del triángulo',
        materia: 'geometria',
        icono: '🌉',
        color: '#16a34a',
        dificultad: 'medio',
        xp: 40,
        escenas: [
            { tipo: 'narrativa', texto: 'Una ingeniera necesita calcular la altura de un puente triangular. La base mide 10 metros y los lados iguales miden 13 metros cada uno.', imagen: '🌉📐' },
            { tipo: 'pregunta', texto: 'Si trazamos la altura desde el vértice superior, ¿en cuántas partes divide la base?', opciones: ['2 partes iguales de 5m', '2 partes de 3m y 10m', 'No la divide', '3 partes iguales'], correcta: 0, explicacion: 'En un triángulo isósceles, la altura desde el vértice opuesto a la base bisecta (divide en 2 partes iguales) la base.' },
            { tipo: 'pregunta', texto: 'Usando Pitágoras con el triángulo rectángulo formado (hipotenusa=13, cateto=5), ¿cuánto mide la altura?', opciones: ['12 m', '8 m', '10 m', '15 m'], correcta: 0, explicacion: 'h² + 5² = 13² → h² = 169 - 25 = 144 → h = 12 metros' },
            { tipo: 'narrativa', texto: '¡El puente tiene 12 metros de altura! El teorema de Pitágoras es una herramienta fundamental en ingeniería.', imagen: '🏗️✅' },
        ]
    },
    {
        id: 'tienda_ecuaciones',
        titulo: 'La tienda de ecuaciones',
        materia: 'algebra',
        icono: '🏪',
        color: '#7c3aed',
        dificultad: 'facil',
        xp: 30,
        escenas: [
            { tipo: 'narrativa', texto: 'En una tienda, Ana compra 3 remeras iguales y una gorra de $500. En total paga $2.600.', imagen: '🏪👕' },
            { tipo: 'pregunta', texto: '¿Qué ecuación representa la situación si x es el precio de cada remera?', opciones: ['3x + 500 = 2600', 'x + 500 = 2600', '3x = 2600', '3x - 500 = 2600'], correcta: 0, explicacion: '3 remeras a precio x cada una + 1 gorra de $500 = $2.600 total → 3x + 500 = 2600' },
            { tipo: 'pregunta', texto: '¿Cuánto cuesta cada remera?', opciones: ['$700', '$500', '$866', '$600'], correcta: 0, explicacion: '3x + 500 = 2600 → 3x = 2100 → x = 700' },
            { tipo: 'narrativa', texto: 'Ana descubre que las remeras estaban en oferta: ¡el precio normal era $900 cada una! Consiguió un gran descuento.', imagen: '🎉💰' },
            { tipo: 'pregunta', texto: '¿Qué porcentaje de descuento obtuvo Ana respecto al precio normal?', opciones: ['≈ 22%', '≈ 30%', '≈ 15%', '≈ 50%'], correcta: 0, explicacion: 'Descuento = $900 - $700 = $200. Porcentaje = (200/900) × 100 ≈ 22.2%' },
            { tipo: 'narrativa', texto: '¡Las ecuaciones nos ayudan a descifrar problemas cotidianos como ir de compras!', imagen: '🛍️🧮' },
        ]
    },
    {
        id: 'estadio_estadistica',
        titulo: 'El estadio de las estadísticas',
        materia: 'estadistica',
        icono: '⚽',
        color: '#f59e0b',
        dificultad: 'medio',
        xp: 40,
        escenas: [
            { tipo: 'narrativa', texto: 'Un equipo de fútbol anotó estos goles en 5 partidos: 2, 0, 3, 1, 4.', imagen: '⚽📊' },
            { tipo: 'pregunta', texto: '¿Cuál es el promedio (media) de goles por partido?', opciones: ['2', '3', '2.5', '1'], correcta: 0, explicacion: 'Media = (2+0+3+1+4) / 5 = 10/5 = 2 goles por partido' },
            { tipo: 'pregunta', texto: 'Si ordenamos los datos (0,1,2,3,4), ¿cuál es la mediana?', opciones: ['2', '3', '1', '2.5'], correcta: 0, explicacion: 'Con 5 datos ordenados, la mediana es el valor central (posición 3): 0, 1, [2], 3, 4' },
            { tipo: 'narrativa', texto: 'El DT necesita predecir cuántos goles harán en el próximo partido para planificar su estrategia.', imagen: '📋🤔' },
            { tipo: 'pregunta', texto: 'Si la desviación estándar es ≈ 1.4, ¿qué rango de goles es más probable?', opciones: ['Entre 1 y 3 goles', 'Exactamente 2', 'Más de 4', 'Menos de 0'], correcta: 0, explicacion: 'Media ± 1 desviación = 2 ± 1.4, es decir entre 0.6 y 3.4 → probablemente entre 1 y 3 goles.' },
            { tipo: 'narrativa', texto: '¡La estadística ayuda al DT a tomar decisiones basadas en datos reales!', imagen: '🏆📈' },
        ]
    },
];

let _historiaActual = null;
let _escenaIdx = 0;
let _xpGanado = 0;
let _erroresHistoria = 0;

function getHistoriasCompletadas() {
    try {
        const saved = localStorage.getItem('ma_historias_completadas');
        return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
}

function marcarHistoriaCompletada(id) {
    const completadas = getHistoriasCompletadas();
    if (!completadas.includes(id)) {
        completadas.push(id);
        try { localStorage.setItem('ma_historias_completadas', JSON.stringify(completadas)); } catch(e) {}
    }
}

function renderHistoriasLista(containerId) {
    const cont = document.getElementById(containerId);
    if (!cont) return;
    const completadas = getHistoriasCompletadas();
    const dificColor = { facil: '#16a34a', medio: '#f59e0b', dificil: '#ef4444' };
    const dificLabel = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };

    cont.innerHTML = HISTORIAS.map(h => {
        const done = completadas.includes(h.id);
        return `<div class="historia-card ${done ? 'completada' : ''}" onclick="window.MA_HISTORIAS.iniciarHistoria('${h.id}')" style="--hist-color:${h.color}">
            <div class="historia-icono">${h.icono}</div>
            <div class="historia-info">
                <span class="historia-titulo">${h.titulo}</span>
                <span class="historia-meta">
                    <span class="historia-dif" style="color:${dificColor[h.dificultad]}">${dificLabel[h.dificultad]}</span>
                    · <span class="historia-xp">+${h.xp} XP</span>
                    ${done ? ' · <span class="historia-check">✅</span>' : ''}
                </span>
            </div>
            <div class="historia-arrow">${done ? '🔄' : '→'}</div>
        </div>`;
    }).join('');
}

function iniciarHistoria(id) {
    const historia = HISTORIAS.find(h => h.id === id);
    if (!historia) return;
    _historiaActual = historia;
    _escenaIdx = 0;
    _xpGanado = 0;
    _erroresHistoria = 0;
    renderEscena();
}

function renderEscena() {
    if (!_historiaActual) return;

    let overlay = document.getElementById('historia-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'historia-overlay';
        overlay.className = 'historia-overlay';
        document.body.appendChild(overlay);
    }

    const escena = _historiaActual.escenas[_escenaIdx];
    const progreso = Math.round(((_escenaIdx) / _historiaActual.escenas.length) * 100);
    const esUltima = _escenaIdx >= _historiaActual.escenas.length;

    if (esUltima) {
        renderResultadoHistoria(overlay);
        return;
    }

    let contenido = '';
    if (escena.tipo === 'narrativa') {
        contenido = `
            <div class="historia-narrativa">
                ${escena.imagen ? `<div class="historia-img">${escena.imagen}</div>` : ''}
                <p class="historia-texto">${escena.texto}</p>
                <button class="historia-btn-continuar" onclick="window.MA_HISTORIAS.avanzar()">Continuar →</button>
            </div>`;
    } else {
        contenido = `
            <div class="historia-pregunta">
                <p class="historia-texto">${escena.texto}</p>
                <div class="historia-opciones" id="hist-opciones">
                    ${escena.opciones.map((op, i) => `<button class="historia-opcion" data-idx="${i}" onclick="window.MA_HISTORIAS.responder(${i})">${op}</button>`).join('')}
                </div>
                <div class="historia-feedback" id="hist-feedback" style="display:none"></div>
            </div>`;
    }

    overlay.innerHTML = `
        <div class="historia-modal" style="--hist-color:${_historiaActual.color}">
            <div class="historia-header">
                <button class="historia-cerrar" onclick="window.MA_HISTORIAS.cerrar()">✕</button>
                <span class="historia-titulo-header">${_historiaActual.icono} ${_historiaActual.titulo}</span>
                <div class="historia-progress-bar"><div class="historia-progress-fill" style="width:${progreso}%"></div></div>
            </div>
            <div class="historia-body">${contenido}</div>
        </div>`;
    overlay.classList.add('activo');
}

function responder(idx) {
    const escena = _historiaActual.escenas[_escenaIdx];
    const botones = document.querySelectorAll('#hist-opciones .historia-opcion');
    const feedback = document.getElementById('hist-feedback');
    const correcto = idx === escena.correcta;

    botones.forEach((btn, i) => {
        btn.disabled = true;
        if (i === escena.correcta) btn.classList.add('correcta');
        if (i === idx && !correcto) btn.classList.add('incorrecta');
    });

    if (correcto) {
        const xpEscena = Math.round(_historiaActual.xp / _historiaActual.escenas.filter(e => e.tipo === 'pregunta').length);
        _xpGanado += xpEscena;
        feedback.innerHTML = `<div class="fb-correcto">✅ ¡Correcto! +${xpEscena} XP<p class="fb-explicacion">${escena.explicacion}</p></div>`;
        if (window.MA_GAME) window.MA_GAME.onRespuestaEjercicio(true, xpEscena);
    } else {
        _erroresHistoria++;
        feedback.innerHTML = `<div class="fb-incorrecto">❌ Incorrecto<p class="fb-explicacion">${escena.explicacion}</p></div>`;
        if (window.MA_GAME) window.MA_GAME.onRespuestaEjercicio(false, 0);
    }
    feedback.style.display = 'block';

    setTimeout(() => {
        const btnCont = document.createElement('button');
        btnCont.className = 'historia-btn-continuar';
        btnCont.textContent = 'Continuar →';
        btnCont.onclick = () => window.MA_HISTORIAS.avanzar();
        feedback.appendChild(btnCont);
    }, 800);
}

function avanzar() {
    _escenaIdx++;
    renderEscena();
}

function renderResultadoHistoria(overlay) {
    const preguntas = _historiaActual.escenas.filter(e => e.tipo === 'pregunta').length;
    const aciertos = preguntas - _erroresHistoria;
    const pct = Math.round((aciertos / preguntas) * 100);
    const estrellas = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;

    marcarHistoriaCompletada(_historiaActual.id);

    if (window.MA_GAME && pct >= 60) window.MA_GAME.lanzarConfetti('logro');

    overlay.innerHTML = `
        <div class="historia-modal" style="--hist-color:${_historiaActual.color}">
            <div class="historia-resultado">
                <div class="historia-estrellas">${'⭐'.repeat(estrellas)}${'☆'.repeat(3 - estrellas)}</div>
                <h2>¡Historia completada!</h2>
                <p class="historia-titulo-res">${_historiaActual.icono} ${_historiaActual.titulo}</p>
                <div class="historia-stats">
                    <div class="hist-stat"><span class="hist-stat-num">${aciertos}/${preguntas}</span><span class="hist-stat-label">Correctas</span></div>
                    <div class="hist-stat"><span class="hist-stat-num">+${_xpGanado}</span><span class="hist-stat-label">XP ganado</span></div>
                </div>
                <button class="historia-btn-continuar" onclick="window.MA_HISTORIAS.cerrar()">Volver</button>
            </div>
        </div>`;
}

function cerrar() {
    const overlay = document.getElementById('historia-overlay');
    if (overlay) {
        overlay.classList.remove('activo');
        setTimeout(() => overlay.remove(), 300);
    }
    _historiaActual = null;
    // Refresh lista si existe
    renderHistoriasLista('historias-grid');
}

// Inyectar CSS
function initCSS() {
    if (document.getElementById('historias-css')) return;
    const style = document.createElement('style');
    style.id = 'historias-css';
    style.textContent = `
        .historia-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);
            display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s}
        .historia-overlay.activo{opacity:1;pointer-events:auto}
        .historia-modal{background:white;border-radius:20px;max-width:520px;width:calc(100% - 32px);max-height:85vh;overflow-y:auto;
            box-shadow:0 24px 64px rgba(0,0,0,.2);animation:hist-slide-up .3s ease}
        @keyframes hist-slide-up{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
        .historia-header{padding:16px 20px 12px;border-bottom:1px solid #f1f5f9}
        .historia-cerrar{position:absolute;right:16px;top:12px;background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;
            width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .historia-cerrar:hover{background:#f1f5f9;color:#0f172a}
        .historia-titulo-header{font-weight:700;font-size:15px;color:#0f172a;font-family:'Poppins',sans-serif}
        .historia-progress-bar{height:6px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-top:10px}
        .historia-progress-fill{height:100%;background:var(--hist-color,#2563eb);border-radius:99px;transition:width .5s ease}
        .historia-body{padding:24px 20px 28px}
        .historia-img{font-size:48px;text-align:center;margin-bottom:16px}
        .historia-texto{font-size:16px;line-height:1.6;color:#1e293b;margin:0 0 20px}
        .historia-btn-continuar{display:block;width:100%;background:var(--hist-color,#2563eb);color:white;border:none;border-radius:12px;
            padding:14px;font-size:16px;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit;margin-top:12px}
        .historia-btn-continuar:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .historia-opciones{display:flex;flex-direction:column;gap:8px}
        .historia-opcion{background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:14px 16px;font-size:15px;
            cursor:pointer;transition:all .2s;text-align:left;font-family:inherit;color:#1e293b}
        .historia-opcion:hover:not(:disabled){border-color:var(--hist-color,#2563eb);background:#eff6ff}
        .historia-opcion.correcta{border-color:#16a34a;background:#dcfce7;color:#15803d}
        .historia-opcion.incorrecta{border-color:#dc2626;background:#fef2f2;color:#dc2626}
        .historia-opcion:disabled{cursor:default;opacity:.8}
        .historia-feedback{margin-top:16px}
        .fb-correcto{background:#dcfce7;border:1px solid #bbf7d0;border-radius:12px;padding:14px;color:#15803d;font-weight:600}
        .fb-incorrecto{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;color:#dc2626;font-weight:600}
        .fb-explicacion{font-weight:400;font-size:14px;margin-top:6px;opacity:.85;line-height:1.5}
        .historia-resultado{text-align:center;padding:32px 20px}
        .historia-estrellas{font-size:40px;margin-bottom:12px}
        .historia-resultado h2{font-family:'Poppins',sans-serif;font-size:22px;font-weight:800;color:#0f172a;margin:0 0 4px}
        .historia-titulo-res{font-size:15px;color:#64748b;margin:0 0 20px}
        .historia-stats{display:flex;justify-content:center;gap:32px;margin-bottom:24px}
        .hist-stat{display:flex;flex-direction:column;align-items:center}
        .hist-stat-num{font-size:24px;font-weight:800;color:#0f172a;font-family:'Poppins',sans-serif}
        .hist-stat-label{font-size:12px;color:#94a3b8}

        /* Cards lista */
        .historia-card{display:flex;align-items:center;gap:12px;padding:14px 16px;background:white;border:1px solid #e2e8f0;
            border-radius:14px;cursor:pointer;transition:all .2s;margin-bottom:8px;border-left:4px solid var(--hist-color)}
        .historia-card:hover{border-color:var(--hist-color);box-shadow:0 4px 16px rgba(0,0,0,.06);transform:translateY(-1px)}
        .historia-card.completada{opacity:.75}
        .historia-icono{font-size:28px;flex-shrink:0}
        .historia-info{flex:1;display:flex;flex-direction:column;gap:2px}
        .historia-titulo{font-weight:700;font-size:14px;color:#0f172a}
        .historia-meta{font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:4px}
        .historia-dif{font-weight:600}
        .historia-xp{color:#7c3aed;font-weight:600}
        .historia-arrow{font-size:18px;color:#94a3b8}

        /* Dark mode */
        [data-theme="dark"] .historia-modal{background:#1e293b}
        [data-theme="dark"] .historia-texto{color:#e2e8f0}
        [data-theme="dark"] .historia-header{border-color:#334155}
        [data-theme="dark"] .historia-opcion{background:#0f172a;border-color:#334155;color:#e2e8f0}
        [data-theme="dark"] .historia-card{background:#1e293b;border-color:#334155}
        [data-theme="dark"] .historia-titulo,.historia-resultado h2{color:#f1f5f9}
    `;
    document.head.appendChild(style);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCSS);
} else {
    initCSS();
}

window.MA_HISTORIAS = {
    HISTORIAS,
    renderHistoriasLista,
    iniciarHistoria,
    avanzar,
    responder,
    cerrar,
    getHistoriasCompletadas,
};

})();
