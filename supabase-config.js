// ================================================================
//  MATEMÁTICAS ACTIVA — Configuración de Supabase (v3 con features)
//  Credenciales del proyecto: matematicas-activa (region sa-east-1)
// ================================================================

const SUPABASE_URL      = "https://yidrpuizgtqpswefwdaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHJwdWl6Z3RxcHN3ZWZ3ZGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzk4MTcsImV4cCI6MjA5NDYxNTgxN30.kRuZoCIkvXhDNdlfumkWY7JK2qsU1nObr6eegBboFds";

const sb = (typeof supabase !== "undefined" && supabase.createClient)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
    : null;
if (!sb) console.error("Supabase SDK no se cargó.");

// ============================ AUTH ==============================
async function sbRegistro({ email, password, username, nombreCompleto }) {
    const { data, error } = await sb.auth.signUp({
        email, password,
        options: {
            data: { username, nombre_completo: nombreCompleto || null },
            emailRedirectTo: window.location.origin + window.location.pathname
        }
    });
    return { data, error };
}
async function sbLogin({ email, password }) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
        await sb.from("perfiles").update({ ultimo_login: new Date().toISOString() }).eq("id", data.user.id);
        try { await sb.rpc("registrar_visita_diaria"); } catch(e) {}
    }
    return { data, error };
}
async function sbLogout()  { return await sb.auth.signOut(); }
async function sbSesion()  { const { data: { session } } = await sb.auth.getSession(); return session; }
async function sbUsuario() { const { data: { user } } = await sb.auth.getUser(); return user; }
async function sbPerfil(userId) {
    const id = userId || (await sbUsuario())?.id;
    if (!id) return null;
    const { data, error } = await sb.from("perfiles").select("*").eq("id", id).single();
    if (error) { console.warn("Error leyendo perfil:", error); return null; }
    return data;
}
async function sbEsAdmin() { const p = await sbPerfil(); return p?.rol === "admin"; }

// ============== Cambiar password / username =====================
async function sbCambiarPassword(passwordActual, passwordNuevo) {
    // Re-autenticar primero verificando la actual
    const u = await sbUsuario();
    if (!u) return { error: { message: "No hay sesión activa" } };
    const { error: e1 } = await sb.auth.signInWithPassword({ email: u.email, password: passwordActual });
    if (e1) return { error: { message: "La contraseña actual no es correcta" } };
    const { error: e2 } = await sb.auth.updateUser({ password: passwordNuevo });
    return { error: e2 };
}
async function sbCambiarUsername(nuevoUsername) {
    const u = await sbUsuario();
    if (!u) return { error: { message: "No hay sesión activa" } };
    const { data, error } = await sb.from("perfiles")
        .update({ username: nuevoUsername }).eq("id", u.id).select().single();
    return { data, error };
}
async function sbOlvidePassword(email) {
    // Manda mail con link de reset a la URL actual
    const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
    });
    return { error };
}
async function sbSetPasswordEnRecovery(nuevoPassword) {
    // Se llama después de que el usuario llegó al sitio con el link de recovery
    const { error } = await sb.auth.updateUser({ password: nuevoPassword });
    return { error };
}

// ====================== ARCHIVOS ================================
async function sbListarArchivos(filtros = {}) {
    let q = sb.from("archivos").select("*").order("creado_en", { ascending: false });
    if (filtros.solo_publicos)  q = q.eq("es_personal", false);
    if (filtros.solo_personales) q = q.eq("es_personal", true);
    if (filtros.materia)         q = q.eq("materia", filtros.materia);
    const { data, error } = await q;
    if (error) { console.warn("Error listando archivos:", error); return []; }
    return data || [];
}
async function sbCrearArchivo(meta) { return await sb.from("archivos").insert(meta).select().single(); }
async function sbActualizarArchivo(id, cambios) {
    return await sb.from("archivos").update(cambios).eq("id", id).select().single();
}
async function sbBorrarArchivo(id, storagePath) {
    if (storagePath) await sb.storage.from("archivos").remove([storagePath]);
    return await sb.from("archivos").delete().eq("id", id);
}
async function sbSubirBlob(path, blob, contentType) {
    return await sb.storage.from("archivos").upload(path, blob, { contentType, upsert: false });
}
async function sbUrlFirmada(path, expiresInSeconds = 3600) {
    const { data, error } = await sb.storage.from("archivos").createSignedUrl(path, expiresInSeconds);
    if (error) { console.warn("Error URL firmada:", error); return null; }
    return data?.signedUrl || null;
}
async function sbDescargarBlob(path) {
    const { data, error } = await sb.storage.from("archivos").download(path);
    if (error) { console.warn("Error descargando blob:", error); return null; }
    return data;
}

// ==================== PERFILES ==================================
async function sbListarPerfiles() {
    const { data, error } = await sb.from("perfiles").select("*").order("creado_en", { ascending: false });
    if (error) { console.warn("Error listando perfiles:", error); return []; }
    return data || [];
}
async function sbActualizarPerfil(userId, cambios) {
    return await sb.from("perfiles").update(cambios).eq("id", userId).select().single();
}
async function sbAgregarVisto(archivoId) {
    const u = await sbUsuario(); if (!u) return;
    const p = await sbPerfil(u.id); if (!p) return;
    if (p.vistos?.includes(archivoId)) return p;
    const nuevos = [...(p.vistos || []), archivoId];
    const { data } = await sbActualizarPerfil(u.id, { vistos: nuevos });
    return data;
}

// =================== PREMIUM ====================================
async function sbActivarPremium(usuarioId, diasExtra = 30, tipo = "activacion") {
    const p = await sbPerfil(usuarioId);
    if (!p) return { error: "Usuario no encontrado" };
    const base = (p.premium_hasta && new Date(p.premium_hasta) > new Date())
        ? new Date(p.premium_hasta).getTime() : Date.now();
    const nuevoHasta = new Date(base + diasExtra * 86400000);
    const { error: e1 } = await sbActualizarPerfil(usuarioId, { premium_hasta: nuevoHasta.toISOString() });
    if (e1) return { error: e1 };
    const { error: e2 } = await sb.from("historial_pagos").insert({
        usuario_id: usuarioId, monto: window.PRECIO_SUSCRIPCION || "$ 10.000",
        moneda: "ARS", dias_activados: diasExtra, tipo,
    });
    return { error: e2, nuevoHasta };
}
async function sbDesactivarPremium(usuarioId) {
    return await sbActualizarPerfil(usuarioId, { premium_hasta: null });
}

// ===================== PUNTOS / RACHA ===========================
async function sbSumarPuntos(cantidad) {
    const { data, error } = await sb.rpc("sumar_puntos", { cantidad });
    if (error) console.warn("Error sumando puntos:", error);
    return data;
}
async function sbRegistrarVisitaDiaria() {
    const { data, error } = await sb.rpc("registrar_visita_diaria");
    if (error) console.warn("Error registrando visita:", error);
    return data?.[0];
}
async function sbRanking() {
    const { data, error } = await sb.from("ranking_semanal").select("*");
    if (error) { console.warn("Error ranking:", error); return []; }
    return data || [];
}

// ===================== COMENTARIOS ==============================
async function sbListarComentarios(archivoId) {
    const { data, error } = await sb.from("comentarios")
        .select("id, texto, creado_en, usuario_id, perfiles:usuario_id(username, rol)")
        .eq("archivo_id", archivoId)
        .order("creado_en", { ascending: true });
    if (error) { console.warn("Error comentarios:", error); return []; }
    return data || [];
}
async function sbCrearComentario(archivoId, texto) {
    const u = await sbUsuario(); if (!u) return { error: { message: "Necesitás login" } };
    return await sb.from("comentarios").insert({
        archivo_id: archivoId, usuario_id: u.id, texto
    }).select().single();
}
async function sbBorrarComentario(id) {
    return await sb.from("comentarios").delete().eq("id", id);
}

// ===================== EJERCICIOS DIARIOS =======================
async function sbEjercicioDeHoy() {
    const hoy = new Date().toISOString().slice(0, 10);
    // Primero buscar uno fijado para hoy
    let { data } = await sb.from("ejercicios_diarios").select("*").eq("fecha", hoy).maybeSingle();
    if (data) return data;
    // Si no hay, devolver uno aleatorio del catálogo
    const { data: lista } = await sb.from("ejercicios_diarios").select("*").is("fecha", null);
    if (!lista?.length) return null;
    const idx = Math.floor(Math.random() * lista.length);
    return lista[idx];
}
async function sbResponderEjercicio(fecha, correcto) {
    const u = await sbUsuario(); if (!u) return;
    await sb.from("ejercicios_respondidos").insert({ usuario_id: u.id, fecha, correcto });
    if (correcto) await sbSumarPuntos(10);
}
async function sbYaRespondioHoy() {
    const u = await sbUsuario(); if (!u) return false;
    const hoy = new Date().toISOString().slice(0, 10);
    const { data } = await sb.from("ejercicios_respondidos")
        .select("correcto").eq("usuario_id", u.id).eq("fecha", hoy).maybeSingle();
    return data;
}
async function sbCrearEjercicio(pregunta, respuesta, pista, dificultad) {
    return await sb.from("ejercicios_diarios").insert({
        pregunta, respuesta, pista, dificultad: dificultad || "medio"
    }).select().single();
}

// ================ EJERCICIOS INTERACTIVOS ======================
async function sbListarEjercicios(materia, subtemaId) {
    let q = sb.from("ejercicios_interactivos").select("*").eq("activo", true).order("creado_en", { ascending: false });
    if (materia) q = q.eq("materia", materia);
    if (subtemaId) q = q.eq("subtema_id", subtemaId);
    const { data, error } = await q;
    if (error) { console.warn("Error ejercicios:", error); return []; }
    return data || [];
}
async function sbCrearEjercicioInteractivo(ej) {
    const u = await sbUsuario(); if (!u) return { error: { message: "Sin sesión" } };
    return await sb.from("ejercicios_interactivos").insert({ ...ej, creado_por: u.id }).select().single();
}
async function sbActualizarEjercicioInteractivo(id, cambios) {
    return await sb.from("ejercicios_interactivos").update(cambios).eq("id", id).select().single();
}
async function sbBorrarEjercicioInteractivo(id) {
    return await sb.from("ejercicios_interactivos").delete().eq("id", id);
}
async function sbResponderEjercicioInteractivo(ejercicioId, respuesta, correcto) {
    const u = await sbUsuario(); if (!u) return { error: { message: "Necesitás login" } };
    const { data, error } = await sb.from("ejercicios_interactivos_respuestas")
        .upsert({ usuario_id: u.id, ejercicio_id: ejercicioId, respuesta, correcto }, { onConflict: "usuario_id,ejercicio_id" })
        .select().single();
    if (!error && correcto) await sbSumarPuntos(5);
    return { data, error };
}
async function sbObtenerRespuestasEjercicios(ejercicioIds) {
    const u = await sbUsuario(); if (!u) return [];
    const { data, error } = await sb.from("ejercicios_interactivos_respuestas")
        .select("ejercicio_id, respuesta, correcto").eq("usuario_id", u.id).in("ejercicio_id", ejercicioIds);
    if (error) { console.warn("Error respuestas:", error); return []; }
    return data || [];
}

// ====================== EXPOSE ==================================

// ===================== PLANES (v4) ==============================
async function sbPlanVigente() {
    const u = await sbUsuario(); if (!u) return 'gratis';
    const { data, error } = await sb.rpc('plan_vigente', { usuario_id: u.id });
    if (error) { console.warn(error); return 'gratis'; }
    return data || 'gratis';
}
async function sbRegistrarUso(accion) {
    const { data, error } = await sb.rpc('registrar_uso', { accion });
    if (error) { console.warn(error); return -1; }
    return data;
}
async function sbVerQuotaHoy() {
    const { data, error } = await sb.rpc('ver_quota_hoy');
    if (error) { console.warn(error); return null; }
    return data?.[0];
}
async function sbAdminActivarPlan(usuarioId, plan, dias) {
    const { data, error } = await sb.rpc('admin_activar_plan', { usuario_id: usuarioId, nuevo_plan: plan, dias });
    return { data, error };
}


// ===================== TEMAS (ruta de aprendizaje) ==============
async function sbListarTemas(materia) {
    let q = sb.from("temas").select("*").order("nivel").order("categoria").order("orden");
    if (materia) q = q.eq("materia", materia);
    const { data, error } = await q;
    if (error) { console.warn("Error temas:", error); return []; }
    return data || [];
}

// ===================== CONTENIDO DE TEMAS =======================
async function sbObtenerContenidoTema(temaId) {
    const { data, error } = await sb.from("temas_contenido")
        .select("*").eq("tema_id", temaId).maybeSingle();
    if (error) { console.warn("Error contenido tema:", error); return null; }
    return data;
}
async function sbGuardarContenidoTema(temaId, contenidoHtml) {
    const u = await sbUsuario(); if (!u) return { error: "Sin sesión" };
    // Upsert: insertar o actualizar
    const { data, error } = await sb.from("temas_contenido")
        .upsert({
            tema_id: temaId,
            contenido_html: contenidoHtml,
            actualizado_en: new Date().toISOString(),
            actualizado_por: u.id
        }, { onConflict: "tema_id" })
        .select().single();
    return { data, error };
}
async function sbSubirImagenTema(file, temaId) {
    const ext = file.name.split('.').pop();
    const path = `temas/${temaId}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("archivos").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { error };
    const { data: urlData } = sb.storage.from("archivos").getPublicUrl(path);
    return { url: urlData?.publicUrl, path };
}

window.MA_SUPABASE = {
    sb,
    sbRegistro, sbLogin, sbLogout, sbSesion, sbUsuario, sbPerfil, sbEsAdmin,
    sbCambiarPassword, sbCambiarUsername, sbOlvidePassword, sbSetPasswordEnRecovery,
    sbListarArchivos, sbCrearArchivo, sbActualizarArchivo, sbBorrarArchivo,
    sbSubirBlob, sbUrlFirmada, sbDescargarBlob,
    sbListarPerfiles, sbActualizarPerfil, sbAgregarVisto,
    sbActivarPremium, sbDesactivarPremium,
    sbPlanVigente, sbRegistrarUso, sbVerQuotaHoy, sbAdminActivarPlan,
    sbListarTemas,
    sbSumarPuntos, sbRegistrarVisitaDiaria, sbRanking,
    sbListarComentarios, sbCrearComentario, sbBorrarComentario,
    sbEjercicioDeHoy, sbResponderEjercicio, sbYaRespondioHoy, sbCrearEjercicio,
    sbObtenerContenidoTema, sbGuardarContenidoTema, sbSubirImagenTema,
    sbListarEjercicios, sbCrearEjercicioInteractivo, sbActualizarEjercicioInteractivo,
    sbBorrarEjercicioInteractivo, sbResponderEjercicioInteractivo, sbObtenerRespuestasEjercicios,
};
