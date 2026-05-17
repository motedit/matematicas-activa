// ================================================================
//  MATEMÁTICAS ACTIVA — Configuración de Supabase
// ----------------------------------------------------------------
//  1) Crea tu proyecto en https://app.supabase.com
//  2) Settings → API → copiá "Project URL" y "anon public" key
//  3) Reemplazá los dos valores de abajo
//
//  IMPORTANTE: la "anon key" es pública y segura para incluir en
//  el front-end. La seguridad real la garantizan las políticas RLS
//  definidas en supabase-schema.sql.
//  NUNCA pongas acá la "service_role" key.
// ================================================================

const SUPABASE_URL      = "PEGA_AQUI_TU_PROJECT_URL";     // ej: https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_ANON_PUBLIC_KEY"; // ej: eyJhbGciOiJIUzI1NiIsInR5...

// Validación temprana: si no se configuraron las claves, avisamos en consola
if (SUPABASE_URL.includes("PEGA_AQUI") || SUPABASE_ANON_KEY.includes("PEGA_AQUI")) {
    console.error(
        "%c⚠️ Supabase no está configurado.",
        "background:#dc2626;color:white;padding:4px 8px;border-radius:4px;font-weight:bold",
        "\nAbrí supabase-config.js y reemplazá SUPABASE_URL y SUPABASE_ANON_KEY con los valores de tu proyecto.\nMientras tanto el sitio NO va a poder registrar usuarios ni subir archivos."
    );
}

// Crea el cliente global de Supabase (el SDK lo carga el <script> CDN en index.html)
const sb = (typeof supabase !== "undefined" && supabase.createClient)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,           // mantiene la sesión entre recargas
            autoRefreshToken: true,         // refresca el JWT antes de expirar
            detectSessionInUrl: true,       // soporta confirmaciones por email
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
    // Supabase Auth maneja el hashing de contraseñas en su servidor (bcrypt).
    // El trigger handle_new_user crea automáticamente el perfil en public.perfiles.
    const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
            data: { username },             // se guarda en user_metadata
            emailRedirectTo: window.location.origin + window.location.pathname,
        }
    });
    return { data, error };
}

async function sbLogin({ email, password }) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
        // Actualizar ultimo_login en el perfil
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
    // URL temporal para acceder a un archivo del bucket privado
    const { data, error } = await sb.storage.from("archivos")
        .createSignedUrl(path, expiresInSeconds);
    if (error) { console.warn("Error generando URL firmada:", error); return null; }
    return data?.signedUrl || null;
}

async function sbDescargarBlob(path) {
    const { data, error } = await sb.storage.from("archivos").download(path);
    if (error) { console.warn("Error descargando blob:", error); return null; }
    return data; // Blob
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
    // Agrega el archivo al array "vistos" del usuario actual (idempotente)
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
    // Suma días al premium_hasta actual (o desde ahora si no tenía)
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
//  Expuesto globalmente para uso desde scripts.js / materia.js
// ----------------------------------------------------------------
window.MA_SUPABASE = {
    sb,
    // auth
    sbRegistro, sbLogin, sbLogout, sbSesion, sbUsuario, sbPerfil, sbEsAdmin,
    // archivos
    sbListarArchivos, sbCrearArchivo, sbActualizarArchivo, sbBorrarArchivo,
    sbSubirBlob, sbUrlFirmada, sbDescargarBlob,
    // perfiles
    sbListarPerfiles, sbActualizarPerfil, sbAgregarVisto,
    // premium
    sbActivarPremium, sbDesactivarPremium,
};
