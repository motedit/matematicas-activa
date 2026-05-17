// ================================================================
//  MATEMÁTICAS ACTIVA — Configuración de Supabase
//  Credenciales del proyecto: matematicas-activa (region sa-east-1)
//  La "anon key" es pública y segura para incluir en el front-end.
//  La seguridad real la garantizan las políticas RLS de supabase-schema.sql.
//  NUNCA pongas acá la "service_role" key.
// ================================================================

const SUPABASE_URL      = "https://yidrpuizgtqpswefwdaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHJwdWl6Z3RxcHN3ZWZ3ZGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzk4MTcsImV4cCI6MjA5NDYxNTgxN30.kRuZoCIkvXhDNdlfumkWY7JK2qsU1nObr6eegBboFds";

// Crea el cliente global de Supabase
const sb = (typeof supabase !== "undefined" && supabase.createClient)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        }
    })
    : null;

if (!sb) {
    console.error("Supabase SDK no se cargó. Verificá el <script> CDN en index.html.");
}

// ----------------------------------------------------------------
//  HELPERS DE AUTH
// ----------------------------------------------------------------
async function sbRegistro({ email, password, username }) {
    const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
            data: { username },
            emailRedirectTo: window.location.origin + window.location.pathname,
        }
    });
    return { data, error };
}

async function sbLogin({ email, password }) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
        await sb.from("perfiles")
            .update({ ultimo_login: new Date().toISOString() })
            .eq("id", data.user.id);
    }
    return { data, error };
}

async function sbLogout() {
    return await sb.auth.signOut();
}

async function sbSesion() {
    const { data: { session } } = await sb.auth.getSession();
    return session;
}

async function sbUsuario() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
}

async function sbPerfil(userId) {
    const id = userId || (await sbUsuario())?.id;
    if (!id) return null;
    const { data, error } = await sb.from("perfiles").select("*").eq("id", id).single();
    if (error) { console.warn("Error leyendo perfil:", error); return null; }
    return data;
}

async function sbEsAdmin() {
    const p = await sbPerfil();
    return p?.rol === "admin";
}

// ----------------------------------------------------------------
//  HELPERS DE ARCHIVOS (metadata + Storage)
// ----------------------------------------------------------------
async function sbListarArchivos() {
    const { data, error } = await sb.from("archivos")
        .select("*")
        .order("creado_en", { ascending: false });
    if (error) { console.warn("Error listando archivos:", error); return []; }
    return data || [];
}

async function sbCrearArchivo(meta) {
    const { data, error } = await sb.from("archivos").insert(meta).select().single();
    return { data, error };
}

async function sbActualizarArchivo(id, cambios) {
    const { data, error } = await sb.from("archivos")
        .update(cambios).eq("id", id).select().single();
    return { data, error };
}

async function sbBorrarArchivo(id, storagePath) {
    if (storagePath) {
        await sb.storage.from("archivos").remove([storagePath]);
    }
    const { error } = await sb.from("archivos").delete().eq("id", id);
    return { error };
}

async function sbSubirBlob(path, blob, contentType) {
    const { data, error } = await sb.storage.from("archivos")
        .upload(path, blob, { contentType, upsert: false });
    return { data, error };
}

async function sbUrlFirmada(path, expiresInSeconds = 3600) {
    const { data, error } = await sb.storage.from("archivos")
        .createSignedUrl(path, expiresInSeconds);
    if (error) { console.warn("Error generando URL firmada:", error); return null; }
    return data?.signedUrl || null;
}

async function sbDescargarBlob(path) {
    const { data, error } = await sb.storage.from("archivos").download(path);
    if (error) { console.warn("Error descargando blob:", error); return null; }
    return data;
}

// ----------------------------------------------------------------
//  HELPERS DE PERFILES (usuarios)
// ----------------------------------------------------------------
async function sbListarPerfiles() {
    const { data, error } = await sb.from("perfiles")
        .select("*").order("creado_en", { ascending: false });
    if (error) { console.warn("Error listando perfiles:", error); return []; }
    return data || [];
}

async function sbActualizarPerfil(userId, cambios) {
    const { data, error } = await sb.from("perfiles")
        .update(cambios).eq("id", userId).select().single();
    return { data, error };
}

async function sbAgregarVisto(archivoId) {
    const u = await sbUsuario();
    if (!u) return;
    const p = await sbPerfil(u.id);
    if (!p) return;
    if (p.vistos?.includes(archivoId)) return p;
    const nuevos = [...(p.vistos || []), archivoId];
    const { data } = await sbActualizarPerfil(u.id, { vistos: nuevos });
    return data;
}

// ----------------------------------------------------------------
//  HELPERS DE PAGOS / PREMIUM
// ----------------------------------------------------------------
async function sbActivarPremium(usuarioId, diasExtra = 30, tipo = "activacion") {
    const p = await sbPerfil(usuarioId);
    if (!p) return { error: "Usuario no encontrado" };
    const base = (p.premium_hasta && new Date(p.premium_hasta) > new Date())
        ? new Date(p.premium_hasta).getTime()
        : Date.now();
    const nuevoHasta = new Date(base + diasExtra * 24 * 60 * 60 * 1000);

    const { error: e1 } = await sbActualizarPerfil(usuarioId, {
        premium_hasta: nuevoHasta.toISOString()
    });
    if (e1) return { error: e1 };

    const { error: e2 } = await sb.from("historial_pagos").insert({
        usuario_id: usuarioId,
        monto: window.PRECIO_SUSCRIPCION || "$ 10.000",
        moneda: "ARS",
        dias_activados: diasExtra,
        tipo,
    });
    return { error: e2, nuevoHasta };
}

async function sbDesactivarPremium(usuarioId) {
    return await sbActualizarPerfil(usuarioId, { premium_hasta: null });
}

// ----------------------------------------------------------------
//  Expuesto globalmente
// ----------------------------------------------------------------
window.MA_SUPABASE = {
    sb,
    sbRegistro, sbLogin, sbLogout, sbSesion, sbUsuario, sbPerfil, sbEsAdmin,
    sbListarArchivos, sbCrearArchivo, sbActualizarArchivo, sbBorrarArchivo,
    sbSubirBlob, sbUrlFirmada, sbDescargarBlob,
    sbListarPerfiles, sbActualizarPerfil, sbAgregarVisto,
    sbActivarPremium, sbDesactivarPremium,
};
