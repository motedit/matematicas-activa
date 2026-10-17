// Base común de los juegos arcade de Matemáticas Activas (Turbo Mate, Defensa Galáctica, Ninja de Números, Suma Exacta).
// Generador de cuentas, sonidos sintetizados, récords y puntos para el ranking.
(function () {
  "use strict";
  const azar = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const elegir = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const mezclar = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  // ───────────────────────── Temas y generación de cuentas ─────────────────────────
  const TEMAS = {
    sumas:      { ico: "➕", nombre: "Sumas y restas", desc: "De 1 a 3 cifras" },
    tablas:     { ico: "✖️", nombre: "Tablas", desc: "Multiplicar y dividir" },
    mezcla:     { ico: "🎲", nombre: "Las 4 operaciones", desc: "Un poco de todo" },
    potencias:  { ico: "🚀", nombre: "Potencias y raíces", desc: "Cuadrados, cubos, √" },
    ecuaciones: { ico: "🔍", nombre: "Ecuaciones", desc: "¿Cuánto vale x?" },
    porcentajes:{ ico: "🍕", nombre: "Fracciones y %", desc: "La mitad, el 25 %…" },
  };

  function distractores(r, extra) {
    const set = new Set();
    const cand = [r + 1, r - 1, r + 2, r - 2, r + 10, r - 10, ...(extra || [])];
    mezclar(cand);
    for (const c of cand) if (Number.isInteger(c) && c >= 0 && c !== r) set.add(c);
    while (set.size < 2) { const c = r + azar(-5, 5); if (c >= 0 && c !== r) set.add(c); }
    return [...set].slice(0, 2);
  }

  function cuenta(tema, nivel) {
    const d = Math.min(nivel, 6);
    const t = tema === "mezcla" ? elegir(["sumas", "tablas", "sumas", "tablas", "division"]) : tema;
    let txt, r, extra = [];
    switch (t) {
      case "sumas": {
        const max = [0, 20, 50, 100, 200, 500, 999][d];
        let a = azar(2, max), b = azar(2, max);
        if (Math.random() < 0.5) { txt = `${a} + ${b}`; r = a + b; extra = [a + b + 10, Math.abs(a - b)]; }
        else { if (b > a) [a, b] = [b, a]; txt = `${a} − ${b}`; r = a - b; extra = [a + b, r + 10]; }
        break;
      }
      case "tablas": case "division": {
        const tope = [0, 5, 7, 10, 10, 12, 12][d];
        const a = azar(2, tope), b = azar(2, 10);
        if (t === "division" || (d >= 3 && Math.random() < 0.35)) { txt = `${a * b} ÷ ${a}`; r = b; extra = [b + 1, a]; }
        else { txt = `${a} × ${b}`; r = a * b; extra = [a * (b + 1), a * (b - 1), a + b]; }
        break;
      }
      case "potencias": {
        const tipo = elegir(d < 2 ? ["cuad", "cuad", "raiz"] : ["cuad", "cubo", "raiz", "pot2", "raiz"]);
        if (tipo === "cuad") { const a = azar(2, d < 3 ? 10 : 15); txt = `${a}²`; r = a * a; extra = [a * 2, (a + 1) * (a + 1)]; }
        else if (tipo === "cubo") { const a = azar(2, 6); txt = `${a}³`; r = a ** 3; extra = [a * 3, a * a]; }
        else if (tipo === "pot2") { const n = azar(3, 8 + d); txt = `2^${n}`; r = 2 ** n; extra = [2 * n, 2 ** (n - 1)]; }
        else { const a = azar(2, d < 3 ? 10 : 15); txt = `√${a * a}`; r = a; extra = [a * a / 2 | 0, a + 1]; }
        break;
      }
      case "ecuaciones": {
        const x = azar(1, d < 3 ? 10 : 15);
        const tipo = elegir(d < 2 ? ["suma", "resta"] : d < 4 ? ["suma", "mult", "resta"] : ["mult", "lineal", "lineal", "suma"]);
        if (tipo === "suma") { const a = azar(2, 20); txt = `x + ${a} = ${x + a}`; r = x; extra = [x + a + a, x + 1]; }
        else if (tipo === "resta") { const a = azar(2, 20); txt = `x − ${a} = ${x}`; r = x + a; extra = [x, Math.max(0, x - a), x + a + 1]; }
        else if (tipo === "mult") { const a = azar(2, 9); txt = `${a}x = ${a * x}`; r = x; extra = [a * x - a, x + a]; }
        else { const a = azar(2, 6), b = azar(1, 12); txt = `${a}x + ${b} = ${a * x + b}`; r = x; extra = [x + 1, (a * x + b) - b]; }
        break;
      }
      case "porcentajes": {
        const tipo = elegir(d < 2 ? ["mitad", "cuarto", "p10"] : ["mitad", "cuarto", "p10", "p25", "p50", "tres4", "p20"]);
        if (tipo === "mitad") { const n = azar(2, 40) * 2; txt = `½ de ${n}`; r = n / 2; extra = [n * 2, n / 2 + 2]; }
        else if (tipo === "cuarto") { const n = azar(2, 25) * 4; txt = `¼ de ${n}`; r = n / 4; extra = [n / 2, n / 4 + 4]; }
        else if (tipo === "tres4") { const n = azar(2, 20) * 4; txt = `¾ de ${n}`; r = n * 3 / 4; extra = [n / 4, n * 3 / 4 + 3]; }
        else if (tipo === "p10") { const n = azar(2, 50) * 10; txt = `10 % de ${n}`; r = n / 10; extra = [n / 100 | 0, n / 10 + 10]; }
        else if (tipo === "p20") { const n = azar(2, 25) * 10; txt = `20 % de ${n}`; r = n / 5; extra = [n / 10, n / 5 + 5]; }
        else if (tipo === "p25") { const n = azar(2, 25) * 4; txt = `25 % de ${n}`; r = n / 4; extra = [n / 2, n / 4 + 5]; }
        else { const n = azar(2, 50) * 2; txt = `50 % de ${n}`; r = n / 2; extra = [n / 5 | 0, n / 2 + 10]; }
        break;
      }
    }
    const opciones = mezclar([r, ...distractores(r, extra)]);
    return { txt, r, opciones, correcta: opciones.indexOf(r) };
  }

  // ───────────────────────── Sonido (sintetizado, sin archivos) ─────────────────────────
  let ac = null, sonido = leer("arcade_sonido") !== "0" && leer("turbo_sonido") !== "0";
  function nota(f, t0, dur, tipo, vol) {
    if (!sonido) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + t0;
      o.type = tipo || "sine"; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  const SFX = {
    bien: () => { nota(660, 0, .12, "triangle"); nota(990, .08, .18, "triangle"); },
    mal: () => { nota(180, 0, .28, "sawtooth", .12); nota(120, .1, .3, "sawtooth", .1); },
    moneda: () => { nota(1320, 0, .07, "square", .05); nota(1760, .05, .1, "square", .05); },
    nivel: () => [523, 659, 784, 1047].forEach((f, i) => nota(f, i * .08, .2, "triangle", .13)),
    carril: () => nota(420, 0, .05, "sine", .05),
    fin: () => [392, 330, 262].forEach((f, i) => nota(f, i * .15, .3, "triangle", .12)),
  };

  function activarAudio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume && ac.resume(); } catch (e) {} }

  // Botón de sonido: le pone el ícono y lo alterna (se recuerda para todos los juegos)
  function botonSonido(btn) {
    const pintar = () => { btn.textContent = sonido ? "🔊" : "🔇"; };
    btn.onclick = () => { sonido = !sonido; guardar("arcade_sonido", sonido ? "1" : "0"); guardar("turbo_sonido", sonido ? "1" : "0"); pintar(); };
    pintar();
  }

  // Récord por juego y tema. Devuelve { antes, nuevo }.
  function record(juego, tema, puntos) {
    const clave = `${juego}_record_${tema}`, antes = +leer(clave) || 0;
    if (puntos > antes) guardar(clave, puntos);
    return { antes, nuevo: puntos > antes && puntos > 0 };
  }
  const verRecord = (juego, tema) => +leer(`${juego}_record_${tema}`) || 0;

  // Suma los puntos al ranking (mismo sistema que el resto del sitio; el servidor pone el tope diario)
  // y deja el mensaje en el elemento `el`.
  async function enviarPuntos(juego, puntosJuego, datos, el) {
    const pts = Math.min(100, Math.round(puntosJuego / 10));
    if (el) el.textContent = "";
    try {
      const api = window.MA_SUPABASE;
      const u = api && api.sb ? await api.sbUsuario() : null;
      if (u) {
        api.sbRegistrarEvento("juego_jugado", Object.assign({ juego, puntos: puntosJuego }, datos || {}));
        if (pts > 0) { await api.sbSumarPuntos(pts); if (el) el.innerHTML = `Sumaste <b>+${pts} puntos</b> al ranking semanal.`; }
      } else if (api && api.sb && el) {
        el.innerHTML = `<a href="../../../index.html" style="color:#a5f3fc;font-weight:800">Iniciá sesión</a> para sumar tus puntos al ranking semanal.`;
      }
    } catch (e) {}
  }

  window.ARCADE = { azar, elegir, mezclar, guardar, leer, TEMAS, cuenta, distractores, SFX, nota, activarAudio, botonSonido, record, verRecord, enviarPuntos,
    get sonido() { return sonido; } };
})();
