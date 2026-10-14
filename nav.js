// ================================================================
//  MATEMÁTICAS ACTIVAS — nav.js
//  Menús desplegables del navbar ("Herramientas" y la cuenta).
//  En la computadora se abren al pasar el mouse o al hacer clic;
//  en el celular (menú ☰) se muestran desplegados como lista.
// ================================================================
(function () {
    "use strict";
    function cerrarTodos(excepto) {
        document.querySelectorAll(".nav-dd.abierto").forEach(function (dd) {
            if (dd === excepto) return;
            dd.classList.remove("abierto");
            var b = dd.querySelector(".nav-dd-btn");
            if (b) b.setAttribute("aria-expanded", "false");
        });
    }
    function alternar(dd) {
        var abierto = !dd.classList.contains("abierto");
        cerrarTodos(dd);
        dd.classList.toggle("abierto", abierto);
        var b = dd.querySelector(".nav-dd-btn");
        if (b) b.setAttribute("aria-expanded", abierto ? "true" : "false");
    }
    // Botón "Herramientas"
    window.navDesplegar = function (e, id) {
        if (e) e.preventDefault();
        var dd = document.getElementById(id);
        if (dd) alternar(dd);
    };
    // Botón de la cuenta: sin sesión abre "Ingresar"; con sesión despliega el menú de la cuenta
    window.navCuentaClick = function (e) {
        if (e) e.preventDefault();
        var conSesion = document.getElementById("nav-cuenta").classList.contains("con-sesion");
        if (!conSesion) { if (typeof window.abrirAuth === "function") window.abrirAuth(e); return; }
        alternar(document.getElementById("nav-cuenta"));
    };
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".nav-dd")) cerrarTodos(null);
        // En el celular, al tocar un enlace del menú se cierra el ☰
        var a = e.target.closest("#navbar-links a");
        if (a && !a.classList.contains("nav-dd-btn")) {
            var l = document.getElementById("navbar-links");
            if (l && l.classList.contains("open")) {
                l.classList.remove("open");
                var t = document.querySelector(".menu-toggle");
                if (t) t.setAttribute("aria-expanded", "false");
            }
            cerrarTodos(null);
        }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarTodos(null); });
})();
