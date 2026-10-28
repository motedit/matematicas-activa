/* ================================================================
   MATEMÁTICAS ACTIVAS — Diagnóstico de nivel (20 preguntas, adaptativo)
   - Banco propio: no depende de ejercicios cargados en la base de datos.
   - 6 materias × 3 niveles: 1 = ciclo básico (1.º–2.º año), 2 = ciclo orientado (3.º–5.º año),
     3 = inicio universitario. En cada materia, si acierta sube de nivel y si se equivoca baja.
   - Resultado: nivel general, nivel por materia y temas a repasar.
   - Si el alumno tiene código de curso, el resultado le llega al docente en "Mi curso".
   - Si tiene cuenta iniciada, se guarda también en su cuenta.
================================================================ */
(function () {
  "use strict";

  /* ---------- banco de preguntas ---------- */
  // m: materia · n: nivel · q: pregunta · o: opciones (la primera es la correcta; se mezclan al mostrar) · t: tema
  const B = [
    // ── Aritmética ──
    { m: "aritmetica", n: 1, t: "Jerarquía de las operaciones", q: "¿Cuánto es 3 + 4 · 5 − 6 : 2?", o: ["20", "32", "14,5", "17"] },
    { m: "aritmetica", n: 1, t: "Números enteros", q: "Resolvé: −8 + 5 − (−3)", o: ["0", "−6", "−16", "6"] },
    { m: "aritmetica", n: 1, t: "Fracciones", q: "¿Cuánto es 2/3 + 1/4?", o: ["11/12", "3/7", "3/12", "2/12"] },
    { m: "aritmetica", n: 1, t: "Porcentaje", q: "¿Cuál es el 15 % de 240?", o: ["36", "24", "16", "160"] },
    { m: "aritmetica", n: 1, t: "Múltiplos y divisores", q: "El mínimo común múltiplo de 12 y 18 es…", o: ["36", "6", "216", "72"] },
    { m: "aritmetica", n: 2, t: "Potenciación", q: "Simplificá: (2³ · 2⁻⁵) : 2⁻⁴", o: ["4", "1/4", "1/16", "2"] },
    { m: "aritmetica", n: 2, t: "Radicación", q: "√50 + √18 es igual a…", o: ["8√2", "√68", "2√17", "15√2"] },
    { m: "aritmetica", n: 2, t: "Porcentaje", q: "Un precio de $8000 aumenta un 25 % y después baja un 20 %. ¿Cuál es el precio final?", o: ["$8000", "$8400", "$8200", "$7600"] },
    { m: "aritmetica", n: 2, t: "Notación científica", q: "En notación científica, 0,00045 se escribe…", o: ["4,5 × 10⁻⁴", "4,5 × 10⁻⁵", "45 × 10⁻³", "4,5 × 10⁴"] },
    { m: "aritmetica", n: 2, t: "Proporcionalidad", q: "3 obreros hacen una obra en 12 días. ¿Cuántos días tardan 4 obreros trabajando al mismo ritmo?", o: ["9", "16", "10", "8"] },
    { m: "aritmetica", n: 3, t: "Logaritmos", q: "¿Cuál es el valor de log₂ 32 − log₃ (1/9)?", o: ["7", "3", "5", "−7"] },
    { m: "aritmetica", n: 3, t: "Racionalización", q: "Racionalizando, 6/√3 es igual a…", o: ["2√3", "3√2", "6√3", "√3/2"] },
    { m: "aritmetica", n: 3, t: "Matemática financiera", q: "Un capital de $10 000 se coloca al 10 % anual con interés compuesto durante 2 años. ¿En cuánto se convierte?", o: ["$12 100", "$12 000", "$12 200", "$11 000"] },
    { m: "aritmetica", n: 3, t: "Números complejos", q: "Sabiendo que i² = −1, (1 + i)² es igual a…", o: ["2i", "2", "0", "2 + 2i"] },
    { m: "aritmetica", n: 3, t: "Valor absoluto", q: "¿Cuánto es |−7| − |3 − 10|?", o: ["0", "−14", "14", "−4"] },
    // ── Álgebra ──
    { m: "algebra", n: 1, t: "Ecuaciones de primer grado", q: "Resolvé: 3x − 7 = 11", o: ["x = 6", "x = 4/3", "x = 18", "x = 4"] },
    { m: "algebra", n: 1, t: "Valor numérico", q: "Si x = −2, ¿cuánto vale 2x² − x?", o: ["10", "6", "−6", "14"] },
    { m: "algebra", n: 1, t: "Términos semejantes", q: "Reducí: 5a − 2b + 3a + 4b", o: ["8a + 2b", "8a − 6b", "10ab", "2a + 2b"] },
    { m: "algebra", n: 1, t: "Problemas con enunciado", q: "El doble de un número, más 5, es 17. ¿Cuál es el número?", o: ["6", "11", "24", "8,5"] },
    { m: "algebra", n: 1, t: "Ecuaciones de primer grado", q: "Resolvé: x/4 + 2 = 5", o: ["x = 12", "x = 28", "x = 3/4", "x = 7"] },
    { m: "algebra", n: 2, t: "Ecuaciones de segundo grado", q: "Las soluciones de x² − 5x + 6 = 0 son…", o: ["x = 2 y x = 3", "x = −2 y x = −3", "x = 1 y x = 6", "x = −1 y x = 6"] },
    { m: "algebra", n: 2, t: "Sistemas de ecuaciones", q: "Resolvé el sistema: x + y = 10 ; x − y = 4", o: ["x = 7, y = 3", "x = 3, y = 7", "x = 6, y = 4", "x = 5, y = 5"] },
    { m: "algebra", n: 2, t: "Factorización", q: "Factorizá: x² − 9", o: ["(x − 3)(x + 3)", "(x − 3)²", "(x + 9)(x − 1)", "x(x − 9)"] },
    { m: "algebra", n: 2, t: "Productos notables", q: "Desarrollá: (2x + 3)²", o: ["4x² + 12x + 9", "4x² + 9", "2x² + 6x + 9", "4x² + 6x + 9"] },
    { m: "algebra", n: 2, t: "Inecuaciones", q: "Resolvé: 2x − 3 > 7", o: ["x > 5", "x < 5", "x > 2", "x > 10"] },
    { m: "algebra", n: 3, t: "Teorema del resto", q: "El resto de dividir P(x) = x³ − 2x + 4 por (x − 2) es…", o: ["8", "0", "4", "−8"] },
    { m: "algebra", n: 3, t: "Ecuaciones exponenciales", q: "La solución de 2ˣ⁺¹ = 16 es…", o: ["x = 3", "x = 4", "x = 7", "x = 8"] },
    { m: "algebra", n: 3, t: "Fracciones algebraicas", q: "Simplificá: (x² − 4) / (x² + 4x + 4)", o: ["(x − 2)/(x + 2)", "−1", "(x + 2)/(x − 2)", "1/(x + 2)"] },
    { m: "algebra", n: 3, t: "Matrices", q: "El determinante de la matriz [2 1 ; 3 4] es…", o: ["5", "11", "−5", "2"] },
    { m: "algebra", n: 3, t: "Progresiones", q: "La suma de los 10 primeros términos de la progresión aritmética 3, 7, 11, … es…", o: ["210", "39", "190", "420"] },
    // ── Geometría ──
    { m: "geometria", n: 1, t: "Áreas", q: "El área de un triángulo de base 8 cm y altura 5 cm es…", o: ["20 cm²", "40 cm²", "13 cm²", "26 cm²"] },
    { m: "geometria", n: 1, t: "Ángulos", q: "Los ángulos interiores de un triángulo suman…", o: ["180°", "360°", "90°", "270°"] },
    { m: "geometria", n: 1, t: "Perímetros", q: "El perímetro de un rectángulo de 7 cm por 3 cm es…", o: ["20 cm", "21 cm", "10 cm", "24 cm"] },
    { m: "geometria", n: 1, t: "Ángulos", q: "Dos ángulos son complementarios y uno mide 35°. ¿Cuánto mide el otro?", o: ["55°", "145°", "65°", "35°"] },
    { m: "geometria", n: 2, t: "Teorema de Pitágoras", q: "Los catetos de un triángulo rectángulo miden 6 cm y 8 cm. La hipotenusa mide…", o: ["10 cm", "14 cm", "√28 cm", "48 cm"] },
    { m: "geometria", n: 2, t: "Círculo", q: "El área de un círculo de radio 3 cm es…", o: ["9π cm²", "6π cm²", "3π cm²", "18π cm²"] },
    { m: "geometria", n: 2, t: "Distancia entre puntos", q: "La distancia entre A(1; 2) y B(4; 6) es…", o: ["5", "7", "√7", "25"] },
    { m: "geometria", n: 2, t: "Recta", q: "La pendiente de la recta que pasa por (0; 1) y (2; 7) es…", o: ["3", "1/3", "4", "6"] },
    { m: "geometria", n: 3, t: "Volúmenes", q: "El volumen de un cono de radio 3 y altura 4 es…", o: ["12π", "36π", "4π", "15π"] },
    { m: "geometria", n: 3, t: "Circunferencia", q: "El centro y el radio de (x − 2)² + (y + 1)² = 9 son…", o: ["C(2; −1) y r = 3", "C(−2; 1) y r = 3", "C(2; −1) y r = 9", "C(−2; 1) y r = 9"] },
    { m: "geometria", n: 3, t: "Rectas perpendiculares", q: "La recta perpendicular a y = 2x + 1 que pasa por el origen es…", o: ["y = −½x", "y = −2x", "y = ½x", "y = 2x − 1"] },
    { m: "geometria", n: 3, t: "Cónicas", q: "En la elipse x²/25 + y²/9 = 1, el semieje mayor mide…", o: ["5", "25", "3", "9"] },
    // ── Trigonometría ──
    { m: "trigonometria", n: 1, t: "Ángulos", q: "Un ángulo llano mide…", o: ["180°", "90°", "360°", "270°"] },
    { m: "trigonometria", n: 1, t: "Triángulo rectángulo", q: "En un triángulo rectángulo, el lado opuesto al ángulo recto se llama…", o: ["hipotenusa", "cateto opuesto", "cateto adyacente", "altura"] },
    { m: "trigonometria", n: 1, t: "Ángulos", q: "¿Cuánto mide el ángulo suplementario de 120°?", o: ["60°", "30°", "240°", "80°"] },
    { m: "trigonometria", n: 1, t: "Triángulo rectángulo", q: "Un triángulo rectángulo tiene un ángulo agudo de 40°. ¿Cuánto mide el otro ángulo agudo?", o: ["50°", "140°", "40°", "60°"] },
    { m: "trigonometria", n: 2, t: "Razones trigonométricas", q: "En un triángulo rectángulo, sen α = cateto opuesto dividido…", o: ["la hipotenusa", "el cateto adyacente", "el cateto opuesto", "el perímetro"] },
    { m: "trigonometria", n: 2, t: "Valores notables", q: "sen 30° es igual a…", o: ["1/2", "√3/2", "√2/2", "1"] },
    { m: "trigonometria", n: 2, t: "Resolución de triángulos", q: "Una escalera de 10 m apoyada en una pared forma 60° con el piso. ¿A qué altura toca la pared?", o: ["5√3 m ≈ 8,66 m", "5 m", "10√3 m", "20 m"] },
    { m: "trigonometria", n: 2, t: "Radianes", q: "180° expresado en radianes es…", o: ["π", "2π", "π/2", "180π"] },
    { m: "trigonometria", n: 3, t: "Identidades", q: "sen²x + cos²x es igual a…", o: ["1", "0", "tg x", "2"] },
    { m: "trigonometria", n: 3, t: "Ecuaciones trigonométricas", q: "Las soluciones de sen x = 1/2 en [0°; 360°) son…", o: ["30° y 150°", "30° y 330°", "60° y 120°", "30° y 210°"] },
    { m: "trigonometria", n: 3, t: "Teorema del coseno", q: "En un triángulo, a = 7, b = 5 y el ángulo entre ellos mide 60°. El tercer lado mide…", o: ["√39", "√74", "√109", "39"] },
    { m: "trigonometria", n: 3, t: "Funciones trigonométricas", q: "El período de f(x) = sen(2x) es…", o: ["π", "2π", "π/2", "4π"] },
    // ── Estadística y probabilidad ──
    { m: "estadistica", n: 1, t: "Promedio", q: "El promedio de 4, 6, 8 y 10 es…", o: ["7", "28", "6", "8"] },
    { m: "estadistica", n: 1, t: "Moda", q: "La moda de 2, 3, 3, 5, 7, 3, 5 es…", o: ["3", "5", "4", "7"] },
    { m: "estadistica", n: 1, t: "Probabilidad", q: "Al tirar un dado, la probabilidad de sacar un número par es…", o: ["1/2", "1/6", "1/3", "2/3"] },
    { m: "estadistica", n: 1, t: "Mediana", q: "La mediana de 9, 2, 5, 7, 4 es…", o: ["5", "7", "5,4", "4"] },
    { m: "estadistica", n: 2, t: "Probabilidad", q: "Se tiran dos monedas. La probabilidad de que salgan dos caras es…", o: ["1/4", "1/2", "1/3", "3/4"] },
    { m: "estadistica", n: 2, t: "Probabilidad", q: "En una urna hay 3 bolillas rojas y 5 azules. Se saca una al azar. ¿Cuál es la probabilidad de que sea roja?", o: ["3/8", "3/5", "5/8", "1/3"] },
    { m: "estadistica", n: 2, t: "Medidas de dispersión", q: "El rango de los datos 12, 7, 20, 15, 9 es…", o: ["13", "12,6", "12", "20"] },
    { m: "estadistica", n: 2, t: "Combinatoria", q: "¿Cuántos números de 3 cifras distintas se pueden formar con 1, 2, 3 y 4?", o: ["24", "64", "12", "4"] },
    { m: "estadistica", n: 3, t: "Varianza", q: "La varianza poblacional de los datos 2, 4 y 6 es…", o: ["8/3", "4", "2", "8"] },
    { m: "estadistica", n: 3, t: "Sucesos independientes", q: "Si P(A) = 0,5, P(B) = 0,4 y A y B son independientes, P(A ∩ B) es…", o: ["0,2", "0,9", "0,1", "0,45"] },
    { m: "estadistica", n: 3, t: "Distribución binomial", q: "En una binomial con n = 3 y p = 0,5, P(X = 3) es…", o: ["0,125", "0,5", "0,375", "0,25"] },
    { m: "estadistica", n: 3, t: "Distribución normal", q: "En una distribución normal, ¿qué porcentaje aproximado de los datos está entre μ − σ y μ + σ?", o: ["68 %", "95 %", "99,7 %", "50 %"] },
    // ── Funciones y cálculo ──
    { m: "calculo", n: 1, t: "Proporcionalidad directa", q: "Si 3 kg de pan cuestan $4500, ¿cuánto cuestan 5 kg?", o: ["$7500", "$9000", "$6500", "$2700"] },
    { m: "calculo", n: 1, t: "Funciones", q: "Si f(x) = 2x + 1, ¿cuánto vale f(3)?", o: ["7", "9", "6", "5"] },
    { m: "calculo", n: 1, t: "Función lineal", q: "¿Cuál de estos puntos pertenece a la recta y = x + 2?", o: ["(1; 3)", "(3; 1)", "(2; 0)", "(0; −2)"] },
    { m: "calculo", n: 1, t: "Proporcionalidad directa", q: "En una proporcionalidad directa, si x se duplica, entonces y…", o: ["se duplica", "se reduce a la mitad", "no cambia", "se cuadruplica"] },
    { m: "calculo", n: 2, t: "Función lineal", q: "La raíz (cero) de f(x) = 3x − 12 es…", o: ["x = 4", "x = −12", "x = 12", "x = −4"] },
    { m: "calculo", n: 2, t: "Función cuadrática", q: "El vértice de f(x) = x² − 4x + 3 es…", o: ["(2; −1)", "(−2; 15)", "(4; 3)", "(1; 0)"] },
    { m: "calculo", n: 2, t: "Dominio", q: "El dominio de f(x) = 1/(x − 5) es…", o: ["ℝ − {5}", "ℝ", "x > 5", "ℝ − {0}"] },
    { m: "calculo", n: 2, t: "Función exponencial", q: "Si f(x) = 2ˣ, ¿cuánto vale f(−1)?", o: ["1/2", "−2", "2", "−1/2"] },
    { m: "calculo", n: 3, t: "Límites", q: "¿Cuánto vale el límite de (x² − 4)/(x − 2) cuando x tiende a 2?", o: ["4", "0", "No existe", "2"] },
    { m: "calculo", n: 3, t: "Derivadas", q: "La derivada de f(x) = 3x² − 5x es…", o: ["6x − 5", "3x − 5", "6x² − 5", "6x"] },
    { m: "calculo", n: 3, t: "Integrales", q: "∫ 2x dx es igual a…", o: ["x² + C", "2x² + C", "2 + C", "x²/2 + C"] },
    { m: "calculo", n: 3, t: "Recta tangente", q: "La pendiente de la recta tangente a f(x) = x³ en x = 1 es…", o: ["3", "1", "0", "6"] },
  ];
  B.forEach((p, i) => { p.id = "d" + (i + 1); });

  const MATERIAS = [
    { k: "aritmetica", nombre: "Aritmética", n: 4, url: "materias/Aritmetica/Aritmetica.html" },
    { k: "algebra", nombre: "Álgebra", n: 4, url: "materias/Algebra/Algebra.html" },
    { k: "geometria", nombre: "Geometría", n: 3, url: "materias/Geometria/Geometria.html" },
    { k: "trigonometria", nombre: "Trigonometría", n: 3, url: "materias/Trigonometria/Trigonometria.html" },
    { k: "estadistica", nombre: "Estadística y probabilidad", n: 3, url: "materias/Estadistica/Estadistica.html" },
    { k: "calculo", nombre: "Funciones y cálculo", n: 3, url: "materias/Calculo/Calculo.html" },
  ];
  const NIVELES = {
    0: { nombre: "Inicial", desc: "Conviene repasar los contenidos del ciclo básico.", color: "#dc2626" },
    1: { nombre: "Ciclo básico", desc: "Domina los contenidos de 1.º y 2.º año.", color: "#d97706" },
    2: { nombre: "Ciclo orientado", desc: "Domina los contenidos de 3.º a 5.º año.", color: "#1d4ed8" },
    3: { nombre: "Inicio universitario", desc: "Está listo para los primeros años de la universidad.", color: "#0e7490" },
  };
  const ETAPAS = [
    { v: 1, t: "Secundaria · ciclo básico (1.º y 2.º año)" },
    { v: 2, t: "Secundaria · ciclo orientado (3.º a 5.º año)" },
    { v: 3, t: "Universidad o profesorado" },
    { v: 2, t: "No sé / prefiero no decir", def: true },
  ];

  /* ---------- utilidades ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mezclar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const raiz = () => document.body.dataset.raiz || "";
  function leerAlumno() {
    const q = new URLSearchParams(location.search); let al = {};
    try { al = JSON.parse(localStorage.getItem("mpp-alumno") || "{}") || {}; } catch (e) {}
    return { curso: String(q.get("curso") || al.curso || "").trim().toUpperCase(), nombre: q.get("nombre") || al.nombre || "", codigo: al.codigo || "" };
  }
  function guardarAlumno(al) { try { const prev = JSON.parse(localStorage.getItem("mpp-alumno") || "{}") || {}; localStorage.setItem("mpp-alumno", JSON.stringify(Object.assign(prev, al))); } catch (e) {} }
  function nube() {
    try { if (typeof SUPABASE_URL !== "undefined" && typeof SUPABASE_ANON_KEY !== "undefined") return { url: SUPABASE_URL, clave: SUPABASE_ANON_KEY }; } catch (e) {}
    const d = (window.DATOS_PLATAFORMA || {}).nube || {};
    return d.url ? { url: d.url, clave: d.clave } : null;
  }

  /* ---------- estado ---------- */
  let E = null;   // { orden:[materias], porMateria:{k:{nivel, hechas:[]}}, actual, usadas:Set, respuestas:[] }
  let cont = null;

  /* ---------- pantallas ---------- */
  function pantallaInicio() {
    const al = leerAlumno();
    cont.innerHTML = `
      <div class="dg-card dg-inicio">
        <div class="dg-inicio-cab">
          <div>
            <h3>Diagnóstico de nivel</h3>
            <p>20 preguntas de Aritmética, Álgebra, Geometría, Trigonometría, Estadística y Funciones. Las preguntas se adaptan: si acertás, la siguiente es más difícil; si no, más fácil. Tardás unos 15 minutos.</p>
          </div>
          <ul class="dg-datos"><li><b>20</b><span>preguntas</span></li><li><b>6</b><span>materias</span></li><li><b>3</b><span>niveles</span></li></ul>
        </div>
        <form class="dg-form" id="dgForm">
          <label>¿En qué etapa estás?
            <select id="dgEtapa">${ETAPAS.map((e, i) => `<option value="${i}"${e.def ? " selected" : ""}>${esc(e.t)}</option>`).join("")}</select>
          </label>
          <label>Tu nombre <small>(para que tu profe vea el resultado)</small>
            <input id="dgNombre" maxlength="60" autocomplete="name" placeholder="Ej.: Camila Suárez" value="${esc(al.nombre)}">
          </label>
          <label>Código de curso <small>(opcional, te lo da tu profe)</small>
            <input id="dgCurso" maxlength="20" autocapitalize="characters" placeholder="Ej.: 3B-MATE" value="${esc(al.curso)}">
          </label>
          <button type="submit" class="dg-btn">Empezar el diagnóstico</button>
          <p class="dg-nota">Respondé sin calculadora ni ayuda: así el resultado muestra tu nivel real. Si no sabés una respuesta, elegí «No lo sé».</p>
        </form>
      </div>`;
    cont.querySelector("#dgForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const etapa = ETAPAS[+cont.querySelector("#dgEtapa").value] || ETAPAS[3];
      const nombre = cont.querySelector("#dgNombre").value.trim().slice(0, 60);
      const curso = cont.querySelector("#dgCurso").value.trim().toUpperCase().slice(0, 20);
      const al2 = leerAlumno();
      let codigo = al2.codigo;
      if (!codigo) { codigo = "al-" + Math.random().toString(36).slice(2, 10); }
      guardarAlumno({ nombre, curso, codigo });
      const inicio = Math.min(3, Math.max(1, etapa.v));
      E = { orden: mezclar(MATERIAS).flatMap((m) => Array(m.n).fill(m.k)), porMateria: {}, usadas: new Set(), respuestas: [], alumno: { nombre, curso, codigo }, etapa: etapa.t, inicio: Date.now() };
      // repartimos las materias para que no queden todas juntas (cada materia mantiene su orden adaptativo)
      E.orden = intercalar(E.orden);
      MATERIAS.forEach((m) => { E.porMateria[m.k] = { nivel: inicio, hechas: [] }; });
      pantallaPregunta();
    });
  }
  function intercalar(lista) {
    // reparte las materias para que no se repitan seguidas
    const c = {}; lista.forEach((k) => (c[k] = (c[k] || 0) + 1));
    const out = []; let ult = null;
    while (out.length < lista.length) {
      const opciones = Object.keys(c).filter((k) => c[k] > 0 && k !== ult).sort((a, b) => c[b] - c[a]);
      const k = opciones.length ? opciones[Math.floor(Math.random() * Math.min(2, opciones.length))] : Object.keys(c).find((x) => c[x] > 0);
      out.push(k); c[k]--; ult = k;
    }
    return out;
  }

  function pantallaPregunta() {
    const total = E.orden.length, nro = E.respuestas.length;
    if (nro >= total) return pantallaResultado();
    // la materia de esta pregunta es E.orden[nro]
    const k = E.orden[nro], pm = E.porMateria[k];
    const pool = B.filter((p) => p.m === k && p.n === pm.nivel && !E.usadas.has(p.id));
    const resto = B.filter((p) => p.m === k && !E.usadas.has(p.id)).sort((a, b) => Math.abs(a.n - pm.nivel) - Math.abs(b.n - pm.nivel));
    const p = pool.length ? pool[Math.floor(Math.random() * pool.length)] : resto[0];
    if (!p) { E.respuestas.push(null); return pantallaPregunta(); }
    E.usadas.add(p.id); E.actual = p;
    const ops = mezclar(p.o.map((t, i) => ({ t, ok: i === 0 })));
    const mat = MATERIAS.find((m) => m.k === k);
    cont.innerHTML = `
      <div class="dg-card">
        <div class="dg-progreso"><i style="width:${Math.round((nro / total) * 100)}%"></i></div>
        <p class="dg-contador">Pregunta ${nro + 1} de ${total} <span class="dg-chip">${esc(mat.nombre)}</span></p>
        <h3 class="dg-pregunta">${esc(p.q)}</h3>
        <div class="dg-opciones" role="radiogroup" aria-label="Opciones">
          ${ops.map((o, i) => `<button type="button" class="dg-op" role="radio" aria-checked="false" data-i="${i}"><span class="dg-letra">${"ABCD"[i]}</span><span>${esc(o.t)}</span></button>`).join("")}
          <button type="button" class="dg-op dg-nose" role="radio" aria-checked="false" data-i="-1"><span class="dg-letra">?</span><span>No lo sé</span></button>
        </div>
        <div class="dg-acciones"><button type="button" class="dg-btn" id="dgSig" disabled>${nro + 1 === total ? "Ver mi resultado" : "Siguiente"}</button></div>
      </div>`;
    let elegida = null;
    cont.querySelectorAll(".dg-op").forEach((b) => b.addEventListener("click", () => {
      cont.querySelectorAll(".dg-op").forEach((x) => { x.classList.remove("sel"); x.setAttribute("aria-checked", "false"); });
      b.classList.add("sel"); b.setAttribute("aria-checked", "true");
      elegida = +b.dataset.i; cont.querySelector("#dgSig").disabled = false;
    }));
    cont.querySelector("#dgSig").addEventListener("click", () => {
      if (elegida === null) return;
      const ok = elegida >= 0 && ops[elegida].ok;
      E.respuestas.push({ id: p.id, materia: k, nivel: p.n, tema: p.t, correcto: ok, nose: elegida < 0 });
      pm.hechas.push({ nivel: p.n, ok, tema: p.t });
      pm.nivel = Math.max(1, Math.min(3, pm.nivel + (ok ? 1 : -1)));
      pantallaPregunta();
      const tope = cont.getBoundingClientRect().top;
      if (tope < 70) window.scrollBy({ top: tope - 90, behavior: "smooth" });
    });
  }

  function nivelDe(hechas) {
    let mejor = 0;
    [1, 2, 3].forEach((L) => {
      const en = hechas.filter((h) => h.nivel === L), bien = en.filter((h) => h.ok).length;
      if (bien >= 1 && bien >= en.length - bien) mejor = L;
    });
    return mejor;
  }
  function calcular() {
    const porMateria = {};
    let suma = 0, peso = 0;
    MATERIAS.forEach((m) => {
      const h = E.porMateria[m.k].hechas, nivel = nivelDe(h), bien = h.filter((x) => x.ok).length;
      porMateria[m.k] = { nivel, nombre_nivel: NIVELES[nivel].nombre, correctas: bien, total: h.length, repasar: [...new Set(h.filter((x) => !x.ok).map((x) => x.tema))] };
      suma += nivel * h.length; peso += h.length;
    });
    const prom = peso ? suma / peso : 0;
    const general = prom < 0.75 ? 0 : prom < 1.75 ? 1 : prom < 2.5 ? 2 : 3;
    const correctas = E.respuestas.filter((r) => r && r.correcto).length;
    return { porMateria, general, promedio: Math.round(prom * 100) / 100, correctas, total: E.respuestas.length, porcentaje: Math.round((correctas * 100) / Math.max(1, E.respuestas.length)) };
  }

  function pantallaResultado() {
    const R = calcular(), G = NIVELES[R.general], pre = raiz();
    const filas = MATERIAS.map((m) => {
      const d = R.porMateria[m.k], N = NIVELES[d.nivel];
      return `<div class="dg-fila">
        <div class="dg-fila-cab"><a href="${pre}${m.url}">${esc(m.nombre)}</a><span class="dg-nivel" style="--c:${N.color}">${esc(N.nombre)}</span></div>
        <div class="dg-barra"><i style="width:${Math.max(6, (d.nivel / 3) * 100)}%;background:${N.color}"></i></div>
        <small>${d.correctas} de ${d.total} correctas${d.repasar.length ? " · Repasar: " + d.repasar.map(esc).join(", ") : ""}</small>
      </div>`;
    }).join("");
    const repasar = MATERIAS.filter((m) => R.porMateria[m.k].repasar.length);
    cont.innerHTML = `
      <div class="dg-card dg-resultado">
        <div class="dg-res-cab">
          <div class="dg-res-nivel" style="--c:${G.color}"><small>Nivel general</small><b>${esc(G.nombre)}</b></div>
          <div><h3>${E.alumno.nombre ? esc(E.alumno.nombre) + ", este" : "Este"} es tu resultado</h3><p>${esc(G.desc)} Respondiste bien ${R.correctas} de ${R.total} preguntas (${R.porcentaje} %).</p></div>
        </div>
        <h4>Nivel por materia</h4>
        <div class="dg-filas">${filas}</div>
        ${repasar.length ? `<div class="dg-recom"><b>Por dónde seguir:</b> repasá los temas marcados en cada materia. En <a href="${pre}calculadora/temas/index.html">Ejercicios resueltos</a> tenés cada tema explicado paso a paso, y en la <a href="${pre}calculadora/index.html">Calculadora Inteligente</a> podés practicarlos.</div>` : `<div class="dg-recom"><b>¡Excelente!</b> Respondiste todo bien. Podés seguir con los temas del nivel siguiente en <a href="${pre}calculadora/temas/index.html">Ejercicios resueltos</a>.</div>`}
        <p class="dg-envio" id="dgEnvio" role="status" aria-live="polite"></p>
        <div class="dg-acciones"><button type="button" class="dg-btn dg-btn-borde" id="dgRepetir">Hacer el diagnóstico de nuevo</button></div>
      </div>`;
    cont.querySelector("#dgRepetir").addEventListener("click", pantallaInicio);
    guardar(R);
  }

  /* ---------- guardar: curso del docente y cuenta del alumno ---------- */
  async function guardar(R) {
    const msj = [], out = cont.querySelector("#dgEnvio");
    const al = E.alumno, cfg = nube();
    if (al.curso && cfg) {
      const filas = MATERIAS.map((m) => {
        const d = R.porMateria[m.k];
        return { curso_id: al.curso, alumno_codigo: al.codigo, alumno_nombre: al.nombre || null, area: "diagnostico", tema: m.k, nombre_tema: ("Diagnóstico · " + m.nombre + ": " + d.nombre_nivel).slice(0, 120), ejercicio: (d.correctas + " de " + d.total + " correctas" + (d.repasar.length ? " · Repasar: " + d.repasar.join(", ") : "")).slice(0, 300), correcto: null, practica: false, tipo: "resuelto" };
      });
      filas.push({ curso_id: al.curso, alumno_codigo: al.codigo, alumno_nombre: al.nombre || null, area: "diagnostico", tema: "general", nombre_tema: ("Diagnóstico · Nivel general: " + NIVELES[R.general].nombre).slice(0, 120), ejercicio: (R.correctas + " de " + R.total + " correctas (" + R.porcentaje + " %) · Etapa: " + E.etapa).slice(0, 300), correcto: null, practica: false, tipo: "resuelto" });
      try {
        const r = await fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/progreso", { method: "POST", headers: { apikey: cfg.clave, Authorization: "Bearer " + cfg.clave, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(filas) });
        msj.push(r.ok ? `✓ Tu resultado le llegó a tu profe (curso ${esc(al.curso)}).` : `No encontramos el curso «${esc(al.curso)}». Revisá el código con tu profe y hacé el diagnóstico de nuevo.`);
      } catch (e) { msj.push("No se pudo enviar el resultado a tu profe: revisá la conexión."); }
    }
    try {
      const ma = window.MA_SUPABASE;
      let ap = null; try { ap = (typeof appState !== "undefined") ? appState : null; } catch (e) {}
      if (ap && ap.perfilActual && ma && typeof ma.sbGuardarDiagnostico === "function") {
        const porMateria = {}; Object.entries(R.porMateria).forEach(([k, d]) => { porMateria[k] = { total: d.total, correctas: d.correctas, porcentaje: Math.round((d.correctas * 100) / Math.max(1, d.total)), nivel: d.nombre_nivel }; });
        await ma.sbGuardarDiagnostico(E.respuestas.filter(Boolean).map((r) => ({ ejercicio_id: r.id, materia: r.materia, nivel: r.nivel, correcto: r.correcto })), { materias: porMateria, nivel_general: NIVELES[R.general].nombre, etapa: E.etapa }, R.total, R.correctas, R.porcentaje);
        msj.push("✓ Se guardó en tu cuenta.");
      } else if (!al.curso) {
        msj.push("Si querés que tu profe vea este resultado, pedile el código de su curso y hacé el diagnóstico con ese código.");
      }
    } catch (e) {}
    if (out) out.innerHTML = msj.join(" ");
  }

  /* ---------- arranque ---------- */
  function montar(el) { cont = el; pantallaInicio(); }
  window.MA_DIAGNOSTICO = { montar, banco: B, materias: MATERIAS, niveles: NIVELES };
  // reemplaza el diagnóstico viejo (dependía de ejercicios cargados en la base)
  window.iniciarDiagnostico = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const sec = document.getElementById("diagnostico"), c = document.getElementById("diagnostico-container");
    if (!c) { location.href = raiz() + "diagnostico/"; return; }
    if (sec) { sec.style.display = "block"; sec.scrollIntoView({ behavior: "smooth" }); }
    if (!c.querySelector(".dg-card")) montar(c);
  };
  function auto() { const c = document.getElementById("diagnostico-container"); if (c && !c.querySelector(".dg-card")) montar(c); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
