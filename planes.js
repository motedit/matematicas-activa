// ================================================================
//  MATEMÁTICAS ACTIVAS — planes.js
//  Tarjetas de los 4 planes + configurador del "Plan a Medida".
//  Los precios del Plan a Medida se repiten en el servidor
//  (backend/supabase/functions/crear-preferencia/index.ts → MODULOS).
//  Si cambiás un precio acá, cambialo también allá: el que cobra es el servidor.
// ================================================================
(function () {
    "use strict";

    const DIAS_MEDIDA = 30;

    // Módulos que se pueden elegir en el Plan a Medida
    const MODULOS = [
        { id: "calculadora",   grupo: "herramientas", ico: "🧮", nombre: "Calculadora Inteligente", desc: "Ilimitada en todas las áreas, con pasos, graficador y fichas", precio: 6000 },
        { id: "pizarra",       grupo: "herramientas", ico: "🖍️", nombre: "Pizarra virtual",         desc: "Ecuaciones, símbolos, escritura a mano y lista de alumnos",   precio: 5000 },
        { id: "juegos",        grupo: "herramientas", ico: "🎮", nombre: "Juegos matemáticos",      desc: "Todo el contenido premium de Juegos",                          precio: 2000 },
        { id: "aritmetica",    grupo: "materias",     ico: "🔢", nombre: "Aritmética",              desc: "Videos, PDFs y ejercicios premium",                             precio: 3000 },
        { id: "algebra",       grupo: "materias",     ico: "📐", nombre: "Álgebra",                 desc: "Videos, PDFs y ejercicios premium",                             precio: 3000 },
        { id: "geometria",     grupo: "materias",     ico: "△",  nombre: "Geometría",               desc: "Videos, PDFs y ejercicios premium",                             precio: 3000 },
        { id: "trigonometria", grupo: "materias",     ico: "θ",  nombre: "Trigonometría",           desc: "Videos, PDFs y ejercicios premium",                             precio: 3000 },
        { id: "calculo",       grupo: "materias",     ico: "∫",  nombre: "Cálculo",                 desc: "Videos, PDFs y ejercicios premium",                             precio: 3000 },
        { id: "estadistica",   grupo: "materias",     ico: "📊", nombre: "Estadística",             desc: "Videos, PDFs y ejercicios premium",                             precio: 3000 },
        { id: "razonamiento",  grupo: "materias",     ico: "🧠", nombre: "Razonamiento",            desc: "Curiosidades, paradojas y desafíos premium",                    precio: 3000 },
    ];

    // Descuento por cantidad de módulos
    function descuentoPorc(cant) { return cant >= 5 ? 20 : cant >= 3 ? 10 : 0; }

    // Sugerencias rápidas según quién compra
    const PRESETS = {
        alumno:  ["calculadora", "algebra"],
        docente: ["pizarra", "calculadora", "juegos"],
    };

    const PRECIO_PREMIUM = 16000;
    const fmt = n => "$ " + n.toLocaleString("es-AR");
    const estado = {};   // por contexto ("home" | "modal"): { tipo, sel:Set }

    function calcular(sel) {
        const items = MODULOS.filter(m => sel.has(m.id));
        const subtotal = items.reduce((s, m) => s + m.precio, 0);
        const porc = descuentoPorc(items.length);
        const total = Math.round(subtotal * (100 - porc) / 100 / 100) * 100;
        return { items, subtotal, porc, total };
    }

    function itemHtml(ctx, m) {
        return `<label class="pm-item">
            <input type="checkbox" value="${m.id}" onchange="pmToggle('${ctx}')">
            <span class="pm-ico" aria-hidden="true">${m.ico}</span>
            <span class="pm-txt"><strong>${m.nombre}</strong><small>${m.desc}</small></span>
            <span class="pm-precio">${fmt(m.precio)}</span>
        </label>`;
    }

    function configuradorHtml(ctx) {
        const herramientas = MODULOS.filter(m => m.grupo === "herramientas").map(m => itemHtml(ctx, m)).join("");
        const materias = MODULOS.filter(m => m.grupo === "materias").map(m => itemHtml(ctx, m)).join("");
        return `
        <div class="plan-medida" id="pm-${ctx}">
            <div class="pm-cab">
                <div>
                    <h3>🧩 Armá tu Plan a Medida</h3>
                    <p>Pagás solo lo que vas a usar, por ${DIAS_MEDIDA} días. Con 3 o más opciones tenés 10% de descuento, y con 5 o más, 20%.</p>
                </div>
                <div class="pm-quien" role="group" aria-label="¿Quién lo va a usar?">
                    <button type="button" data-tipo="alumno" onclick="pmPerfil('${ctx}','alumno')">🎒 Soy alumno/a</button>
                    <button type="button" data-tipo="docente" onclick="pmPerfil('${ctx}','docente')">👩‍🏫 Soy docente</button>
                </div>
            </div>
            <p class="pm-sugerencia" id="pm-sug-${ctx}">Elegí si sos alumno/a o docente para ver una sugerencia, o marcá directamente lo que quieras.</p>
            <div class="pm-cuerpo">
                <div class="pm-listas">
                    <h4>Herramientas</h4><div class="pm-grid">${herramientas}</div>
                    <h4>Materias</h4><div class="pm-grid">${materias}</div>
                </div>
                <aside class="pm-resumen" aria-live="polite">
                    <h4>Tu plan</h4>
                    <ul id="pm-items-${ctx}"><li class="pm-vacio">Todavía no elegiste nada</li></ul>
                    <div class="pm-linea"><span>Subtotal</span><span id="pm-sub-${ctx}">$ 0</span></div>
                    <div class="pm-linea pm-desc" id="pm-desc-fila-${ctx}" hidden><span id="pm-desc-txt-${ctx}"></span><span id="pm-desc-${ctx}"></span></div>
                    <div class="pm-total"><span>Total · ${DIAS_MEDIDA} días</span><strong id="pm-total-${ctx}">$ 0</strong></div>
                    <p class="pm-aviso" id="pm-aviso-${ctx}" hidden></p>
                    <button type="button" class="plan-btn plan-btn-medida" id="pm-pagar-${ctx}" onclick="pmPagar('${ctx}', this)" disabled>💳 Pagar con MercadoPago</button>
                </aside>
            </div>
        </div>`;
    }

    function tarjetasHtml(ctx) {
        return `
        <div class="planes-grid planes-grid-4">
            <div class="plan-card">
                <div class="plan-tag" style="background:#94a3b8">GRATIS</div>
                <h3>Plan Gratis</h3>
                <p class="plan-precio">$ 0</p>
                <p class="plan-sub">Para siempre</p>
                <ul class="plan-features">
                    <li>✅ 3 archivos públicos por semana</li>
                    <li>✅ Calculadora Inteligente: 3 ejercicios por día</li>
                    <li>✅ Acceso al ranking</li>
                    <li>⏱️ Los archivos se renuevan cada 7 días</li>
                    <li>❌ Sin archivos premium</li>
                </ul>
                <button type="button" class="plan-btn plan-btn-gratis" disabled>Plan por defecto</button>
            </div>
            <div class="plan-card plan-card-popular">
                <div class="plan-tag" style="background:linear-gradient(135deg,#2563eb,#7c3aed)">BÁSICO</div>
                <h3>Plan Básico</h3>
                <p class="plan-precio">$ 8.000</p>
                <p class="plan-sub">23 días de acceso</p>
                <p class="plan-contexto">Ideal para estudiar y repasar todas las materias</p>
                <ul class="plan-features">
                    <li>✅ <strong>Todo el material premium</strong> de todas las materias: videos, PDFs y ejercicios</li>
                    <li>✅ <strong>Sin límite de archivos</strong> por semana</li>
                    <li>✅ Puntos y ranking</li>
                    <li>🧮 Calculadora Inteligente: 3 ejercicios gratis por día</li>
                </ul>
                <button type="button" class="plan-btn plan-btn-basico" onclick="iniciarPagoMP('basico', this)">💳 Pagar con MercadoPago</button>
            </div>
            <div class="plan-card plan-card-premium">
                <div class="plan-tag" style="background:linear-gradient(135deg,#f59e0b,#dc2626)">⭐ PREMIUM</div>
                <h3>Plan Premium</h3>
                <p class="plan-precio">$ 16.000</p>
                <p class="plan-sub">30 días de acceso completo</p>
                <p class="plan-contexto">Menos de $550 por día</p>
                <ul class="plan-features">
                    <li>✅ <strong>Todo lo del plan Básico</strong>, por 30 días</li>
                    <li class="feature-destacada">🧮 <strong>Calculadora Inteligente ilimitada</strong>: todas las áreas, paso a paso, graficador, fichas y exportar a Word/PDF</li>
                    <li class="feature-destacada">✅ <strong>Soporte personalizado</strong>: consultás dudas directamente con el profe</li>
                </ul>
                <button type="button" class="plan-btn plan-btn-premium" onclick="iniciarPagoMP('premium', this)">💳 Pagar con MercadoPago</button>
            </div>
            <div class="plan-card plan-card-medida">
                <div class="plan-tag" style="background:linear-gradient(135deg,#0d9488,#0e7490)">🧩 A MEDIDA</div>
                <h3>Plan a Medida</h3>
                <p class="plan-precio"><small>desde</small> $ 2.000</p>
                <p class="plan-sub">30 días · elegís vos</p>
                <p class="plan-contexto">Para alumnos y docentes</p>
                <ul class="plan-features">
                    <li>✅ Elegí <strong>solo lo que necesitás</strong>: calculadora, pizarra, juegos o materias sueltas</li>
                    <li>✅ <strong>Docentes:</strong> Pizarra + Calculadora + Juegos para el aula</li>
                    <li>✅ <strong>Alumnos:</strong> la Calculadora y la materia que estés cursando</li>
                    <li>✅ 10% de descuento con 3 opciones y 20% con 5 o más</li>
                </ul>
                <button type="button" class="plan-btn plan-btn-medida" onclick="pmIrA('${ctx}')">🧩 Armar mi plan</button>
            </div>
        </div>
        ${configuradorHtml(ctx)}`;
    }

    function pintar(ctx) {
        const st = estado[ctx]; if (!st) return;
        const raiz = document.getElementById("pm-" + ctx); if (!raiz) return;
        raiz.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = st.sel.has(cb.value);
            cb.closest(".pm-item").classList.toggle("activo", cb.checked);
        });
        raiz.querySelectorAll(".pm-quien button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tipo === st.tipo ? "true" : "false"));

        const r = calcular(st.sel);
        const ul = document.getElementById("pm-items-" + ctx);
        ul.innerHTML = r.items.length
            ? r.items.map(m => `<li><span>${m.ico} ${m.nombre}</span><span>${fmt(m.precio)}</span></li>`).join("")
            : `<li class="pm-vacio">Todavía no elegiste nada</li>`;
        document.getElementById("pm-sub-" + ctx).textContent = fmt(r.subtotal);
        const filaDesc = document.getElementById("pm-desc-fila-" + ctx);
        filaDesc.hidden = !r.porc;
        if (r.porc) {
            document.getElementById("pm-desc-txt-" + ctx).textContent = `Descuento ${r.porc}%`;
            document.getElementById("pm-desc-" + ctx).textContent = "− " + fmt(r.subtotal - r.total);
        }
        document.getElementById("pm-total-" + ctx).textContent = fmt(r.total);
        document.getElementById("pm-pagar-" + ctx).disabled = !r.items.length;

        const aviso = document.getElementById("pm-aviso-" + ctx);
        const sinPizarra = !st.sel.has("pizarra");
        if (r.total >= PRECIO_PREMIUM && sinPizarra) {
            aviso.hidden = false;
            aviso.innerHTML = `💡 Con este total te conviene el <strong>Plan Premium</strong> (${fmt(PRECIO_PREMIUM)}): incluye todas las materias y la Calculadora ilimitada.`;
        } else {
            aviso.hidden = true;
        }
    }

    function asegurar(ctx) {
        if (!estado[ctx]) estado[ctx] = { tipo: null, sel: new Set() };
        return estado[ctx];
    }

    window.pmToggle = function (ctx) {
        const st = asegurar(ctx);
        const raiz = document.getElementById("pm-" + ctx);
        st.sel = new Set([...raiz.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value));
        pintar(ctx);
    };

    window.pmPerfil = function (ctx, tipo) {
        const st = asegurar(ctx);
        st.tipo = tipo;
        st.sel = new Set(PRESETS[tipo] || []);
        const sug = document.getElementById("pm-sug-" + ctx);
        sug.textContent = tipo === "docente"
            ? "Sugerencia para docentes: Pizarra + Calculadora + Juegos, para dar clase y armar fichas. Podés sumar o sacar lo que quieras."
            : "Sugerencia para alumnos: la Calculadora y la materia que estás cursando. Cambiá Álgebra por tu materia o sumá más.";
        pintar(ctx);
    };

    window.pmIrA = function (ctx) {
        const el = document.getElementById("pm-" + ctx);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    window.pmPagar = function (ctx, btn) {
        const st = asegurar(ctx);
        const modulos = [...st.sel];
        if (!modulos.length) return;
        window.iniciarPagoMP("medida", btn, modulos);
    };

    // Llamar después de insertar el HTML en la página
    window.pmInit = function (ctx) {
        asegurar(ctx); pintar(ctx);
        // Enlaces directos: index.html#plan-docente (desde Docentes) e index.html#plan-pizarra (desde la Pizarra)
        if (ctx === "home" && !estado[ctx].tipo && !estado[ctx].sel.size) {
            if (location.hash === "#plan-docente") {
                window.pmPerfil(ctx, "docente");
                setTimeout(function () { window.pmIrA(ctx); }, 300);
            } else if (location.hash === "#plan-pizarra") {
                estado[ctx].sel = new Set(["pizarra"]);
                pintar(ctx);
                setTimeout(function () { window.pmIrA(ctx); }, 300);
            }
        }
    };

    window.MA_PLANES = { MODULOS, DIAS_MEDIDA, descuentoPorc, calcular, tarjetasHtml };
})();
