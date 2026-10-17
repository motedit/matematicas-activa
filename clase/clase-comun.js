// Modo clase en vivo (tipo concurso): lo común entre la pantalla del profe y la del alumno.
// La conexión en vivo usa los canales de Supabase Realtime (broadcast + presencia): no guarda nada en la base de datos.
(function () {
  "use strict";
  const A = window.ARCADE;

  // Las 4 respuestas: color + forma (para que se distingan también sin color)
  const FORMAS = [
    { color: "#e11d48", oscuro: "#9f1239", nombre: "triángulo", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 22 20H2z" fill="currentColor"/></svg>' },
    { color: "#2563eb", oscuro: "#1e40af", nombre: "rombo", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 22 12 12 22 2 12z" fill="currentColor"/></svg>' },
    { color: "#d97706", oscuro: "#92400e", nombre: "círculo", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>' },
    { color: "#059669", oscuro: "#065f46", nombre: "cuadrado", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/></svg>' },
  ];

  // Preguntas automáticas a partir de los temas de los juegos arcade (siempre 4 opciones)
  function generarPreguntas(tema, nivel, cantidad) {
    const lista = [], vistas = new Set();
    for (let k = 0; lista.length < cantidad && k < cantidad * 20; k++) {
      const c = A.cuenta(tema, nivel);
      if (vistas.has(c.txt)) continue; vistas.add(c.txt);
      const ops = [...c.opciones];
      const extra = A.distractores(c.r, [c.r + 3, c.r - 3, c.r * 2, c.r + 5]).filter((v) => !ops.includes(v));
      let v = extra[0]; while (v === undefined || ops.includes(v) || v < 0) v = c.r + A.azar(-9, 9);
      ops.push(v);
      const opciones = A.mezclar(ops).map(String);
      lista.push({ txt: c.txt + " = ?", opciones, correcta: opciones.indexOf(String(c.r)) });
    }
    return lista;
  }

  // Preguntas propias del profe, una por línea:  pregunta | correcta | incorrecta | incorrecta | incorrecta
  function parsearPropias(texto) {
    const lista = [], errores = [];
    texto.split(/\r?\n/).forEach((linea, i) => {
      if (!linea.trim()) return;
      const p = linea.split("|").map((s) => s.trim()).filter(Boolean);
      if (p.length < 3) { errores.push(`Línea ${i + 1}: hacen falta la pregunta, la respuesta correcta y al menos una incorrecta.`); return; }
      const correcta = p[1], resto = p.slice(2, 5);
      const opciones = A.mezclar([correcta, ...resto]).map((s) => s.slice(0, 60));
      lista.push({ txt: p[0].slice(0, 200), opciones, correcta: opciones.indexOf(correcta.slice(0, 60)) });
    });
    return { lista, errores };
  }

  // Puntaje: acertar da entre 500 y 1000 según la rapidez, más un bonus por racha
  function puntaje(ok, msUsados, msTotal, racha) {
    if (!ok) return 0;
    const rapidez = 1 - Math.min(1, Math.max(0, msUsados / msTotal)) / 2;
    return Math.round(1000 * rapidez) + Math.min(500, Math.max(0, racha - 1) * 100);
  }

  const MALAS = ["puto", "puta", "pija", "verga", "concha", "culo", "mierda", "boludo", "pelotudo", "forro", "trolo", "sexo", "nazi", "idiota", "tarado", "mogolico", "mogólico", "choto", "garcha"];
  function apodoValido(a) {
    const s = (a || "").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (s.length < 2) return "El apodo tiene que tener al menos 2 letras.";
    if (MALAS.some((m) => s.replace(/[^a-z]/g, "").includes(m.normalize("NFD").replace(/[̀-ͯ]/g, "")))) return "Elegí otro apodo, por favor.";
    return "";
  }
  const limpiarTexto = (t) => String(t ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  // Canal en vivo
  function conectar(pin, clave, datosPresencia, alCambiarEstado) {
    const api = window.MA_SUPABASE;
    if (!api || !api.sb) throw new Error("sin conexión");
    const ch = api.sb.channel("ma-clase-" + pin, { config: { broadcast: { self: false, ack: false }, presence: { key: clave } } });
    const escuchas = [];
    const obj = {
      canal: ch,
      on(evento, fn) { ch.on("broadcast", { event: evento }, ({ payload }) => fn(payload || {})); return obj; },
      presencia(fn) { ch.on("presence", { event: "sync" }, () => fn(ch.presenceState())); return obj; },
      enviar(evento, payload) { return ch.send({ type: "broadcast", event: evento, payload }); },
      abrir() {
        ch.subscribe(async (estado) => {
          if (estado === "SUBSCRIBED" && datosPresencia) { try { await ch.track(datosPresencia); } catch (e) {} }
          alCambiarEstado && alCambiarEstado(estado);
        });
        return obj;
      },
      cerrar() { try { api.sb.removeChannel(ch); } catch (e) {} },
    };
    return obj;
  }

  window.CLASE = { FORMAS, generarPreguntas, parsearPropias, puntaje, apodoValido, limpiarTexto, conectar };
})();
