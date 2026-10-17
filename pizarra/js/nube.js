/* =================================================================
   Pizarra · alumnos y materiales en la nube (Supabase)
   - Si el docente tiene la Pizarra (o es admin) y las tablas existen, la lista de alumnos,
     sus códigos y los materiales se guardan en internet: el alumno entra desde su celular.
   - Si algo falla (sin internet, sin las tablas), sigue funcionando como antes, en este navegador.
   - La primera vez sube lo que estaba guardado en este navegador.
   ================================================================= */
(function () {
  "use strict";
  const BUCKET = "pizarra";
  const N = { activa: false, sb: null, uid: null, alumnosPrevios: new Set(), archivosPrevios: new Map(), cola: Promise.resolve() };
  window.PZ_NUBE = N;

  const urlPublica = (ruta) => `${window.PZ_ACCESO.URL_API}/storage/v1/object/public/${BUCKET}/${ruta}`;
  const encolar = (fn) => (N.cola = N.cola.then(fn).catch((e) => { console.warn("Pizarra nube:", e); aviso("No se pudo guardar en la nube. Revisá tu conexión."); }));
  let tAviso = 0;
  function aviso(t) { if (Date.now() - tAviso > 8000) { tAviso = Date.now(); try { toast(t); } catch (e) {} } }
  function estado(texto, ok) {
    let el = document.getElementById("pzNube");
    if (!el) {
      el = document.createElement("div"); el.id = "pzNube";
      el.style.cssText = "font:600 12px Inter,system-ui,sans-serif;padding:6px 10px;margin:0 0 10px;border-radius:8px;display:flex;align-items:center;gap:6px";
      const panel = document.querySelector(".panel-body"); if (panel) panel.prepend(el);
    }
    el.style.background = ok ? "#ecfdf5" : "#fff7ed"; el.style.color = ok ? "#047857" : "#9a3412";
    el.textContent = texto;
  }

  // ── Conversión entre el formato de la pizarra y el de la base ──
  const aFila = (s) => ({ id: s.id, nombre: s.name, curso: s.curso || "", escuela: s.escuela || "", codigo: s.code, color: s.color || "#1f5f8b" });
  const deFila = (r) => ({ id: r.id, name: r.nombre, curso: r.curso, escuela: r.escuela, code: r.codigo, color: r.color });
  const deArchivo = (r) => ({ id: r.id, name: r.nombre, type: r.tipo, data: urlPublica(r.ruta), ruta: r.ruta, mime: r.tipo === "pdf" ? "application/pdf" : "image/png", ts: new Date(r.creado_en).getTime(), access: r.acceso });

  async function dataUrlABlob(d) { return await (await fetch(d)).blob(); }

  // ── Arranque: cuando el control de acceso confirma que tiene la Pizarra ──
  window.addEventListener("pz-acceso", async (e) => {
    if (!e.detail || !e.detail.completa || !e.detail.usuarioId) return;
    const sb = await window.PZ_ACCESO.cliente(); if (!sb) return;
    N.sb = sb; N.uid = e.detail.usuarioId;
    const [ra, rf] = await Promise.all([
      sb.from("pizarra_alumnos").select("*").order("creado_en"),
      sb.from("pizarra_archivos").select("*").order("creado_en", { ascending: false }),
    ]);
    if (ra.error || rf.error) { console.warn("Pizarra nube no disponible:", ra.error || rf.error); estado("💾 Guardado en este navegador", false); return; }
    N.activa = true;
    const locAlumnos = students.slice(), locArchivos = files.slice();
    students = ra.data.map(deFila);
    files = rf.data.map(deArchivo);
    N.alumnosPrevios = new Set(students.map((s) => s.id));
    N.archivosPrevios = new Map(files.map((f) => [f.id, f.ruta]));
    // Subir lo que estaba solo en este navegador (una sola vez)
    const nuevosA = locAlumnos.filter((s) => !N.alumnosPrevios.has(s.id));
    const nuevosF = locArchivos.filter((f) => !N.archivosPrevios.has(f.id) && String(f.data || "").startsWith("data:"));
    if (nuevosA.length || nuevosF.length) {
      students = students.concat(nuevosA); files = nuevosF.concat(files);
      estado("☁️ Subiendo lo que tenías en esta compu…", false);
      await sincronizarAlumnos(); await sincronizarArchivos();
      try { toast(`Pasamos ${nuevosA.length} alumno(s) y ${nuevosF.length} material(es) a la nube`); } catch (e2) {}
    }
    guardarCopiaLocal();
    renderStudents(); renderFiles();
    estado("☁️ Guardado en la nube · tus alumnos entran desde su celular", true);
  });

  function guardarCopiaLocal() {
    // copia liviana (sin imágenes pesadas) por si un día no hay internet
    try { Store.set("pd_students", students); Store.set("pd_files", files.map((f) => ({ ...f, data: String(f.data).startsWith("data:") ? f.data : f.data }))); } catch (e) {}
  }

  async function sincronizarAlumnos() {
    if (!N.activa) return;
    const filas = students.map(aFila);
    if (filas.length) {
      let { error } = await N.sb.from("pizarra_alumnos").upsert(filas);
      if (error && error.code === "23505") {   // código repetido con otro docente: se genera uno nuevo
        for (const s of students) if (!N.alumnosPrevios.has(s.id)) s.code = code6();
        ({ error } = await N.sb.from("pizarra_alumnos").upsert(students.map(aFila)));
        renderStudents();
      }
      if (error) throw error;
    }
    const actuales = new Set(students.map((s) => s.id));
    const borrar = [...N.alumnosPrevios].filter((id) => !actuales.has(id));
    if (borrar.length) { const { error } = await N.sb.from("pizarra_alumnos").delete().in("id", borrar); if (error) throw error; }
    N.alumnosPrevios = actuales;
  }

  async function sincronizarArchivos() {
    if (!N.activa) return;
    for (const f of files) {
      if (!String(f.data || "").startsWith("data:")) continue;
      const blob = await dataUrlABlob(f.data);
      const ext = f.type === "pdf" ? "pdf" : (blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png");
      const ruta = `${N.uid}/${f.id}.${ext}`;
      const { error } = await N.sb.storage.from(BUCKET).upload(ruta, blob, { contentType: blob.type || f.mime, upsert: true });
      if (error) throw error;
      f.ruta = ruta; f.data = urlPublica(ruta);
    }
    const filas = files.map((f) => ({ id: f.id, nombre: f.name, tipo: f.type, ruta: f.ruta, acceso: f.access === "all" ? "all" : (f.access || []) }));
    if (filas.length) { const { error } = await N.sb.from("pizarra_archivos").upsert(filas); if (error) throw error; }
    const actuales = new Map(files.map((f) => [f.id, f.ruta]));
    const borrar = [...N.archivosPrevios.keys()].filter((id) => !actuales.has(id));
    if (borrar.length) {
      const rutas = borrar.map((id) => N.archivosPrevios.get(id)).filter(Boolean);
      const { error } = await N.sb.from("pizarra_archivos").delete().in("id", borrar); if (error) throw error;
      if (rutas.length) await N.sb.storage.from(BUCKET).remove(rutas);
    }
    N.archivosPrevios = actuales;
    guardarCopiaLocal(); renderFiles();
  }

  // ── Reemplazos de las funciones de guardado de la pizarra ──
  const guardarAlumnosLocal = window.saveStudents, guardarArchivosLocal = window.saveFiles;
  window.saveStudents = function () {
    if (!N.activa) return guardarAlumnosLocal();
    guardarCopiaLocal(); encolar(sincronizarAlumnos);
  };
  window.saveFiles = function () {
    if (!N.activa) return guardarArchivosLocal();
    encolar(sincronizarArchivos);
  };

  // Subir archivos: en la nube se aceptan hasta 10 MB
  const subirOriginal = window.handleUpload;
  window.handleUpload = function (e) {
    if (!N.activa) return subirOriginal(e);
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast("Archivo muy grande (máximo 10 MB)"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      pendingFile = { type: file.type.includes("pdf") ? "pdf" : "image", data: reader.result, mime: file.type };
      document.getElementById("saveFileName").value = file.name.replace(/\.[^.]+$/, "");
      saveAccessMode = "all"; saveAccessIds = [];
      document.querySelectorAll("#accessSeg button").forEach((b) => b.classList.toggle("active", b.dataset.access === "all"));
      document.getElementById("saveCheckWrap").style.display = "none";
      showModal("saveModal");
    };
    reader.readAsDataURL(file); e.target.value = "";
  };

  // ── Ingreso del alumno: primero en este navegador; si no está, en la nube ──
  let archivosDocente = null;
  const loginLocal = window.studentLogin, logoutOriginal = window.studentLogout;
  window.studentLogin = async function () {
    const code = document.getElementById("codeInput").value.trim().toUpperCase();
    const err = document.getElementById("loginErr");
    if (students.some((x) => x.code === code)) return loginLocal();
    if (!/^[A-Z0-9]{6}$/.test(code)) { err.textContent = "El código tiene 6 letras o números."; return; }
    err.textContent = "Buscando…";
    try {
      const sb = await window.PZ_ACCESO.cliente(); if (!sb) throw new Error("sin conexión");
      const { data, error } = await sb.rpc("pizarra_materiales_alumno", { p_codigo: code });
      if (error) throw error;
      if (!data) { err.textContent = "Código incorrecto. Revisalo con tu profe."; return; }
      err.textContent = "";
      archivosDocente = archivosDocente || files;
      files = (data.archivos || []).map((r) => ({ ...deArchivo({ ...r, acceso: "all" }) }));
      const a = data.alumno;
      currentStudent = { id: a.id, name: a.nombre, curso: a.curso, escuela: a.escuela, color: a.color, code };
      renderGallery();
      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("studentGallery").style.display = "block";
    } catch (e) { err.textContent = "No hay conexión. Revisá internet y probá de nuevo."; }
  };
  window.studentLogout = function () {
    if (archivosDocente) { files = archivosDocente; archivosDocente = null; }
    return logoutOriginal();
  };
})();
