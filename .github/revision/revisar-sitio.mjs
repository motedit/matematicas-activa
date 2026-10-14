// Revisión automática del sitio (corre en GitHub antes/después de cada publicación).
// Uso local:  node .github/revision/revisar-sitio.mjs
// Sale con código 1 si encuentra un error grave. Las advertencias no frenan la publicación.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, extname, sep } from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = process.cwd();
const IGNORAR_DIR = new Set([".git", "node_modules", ".github", "_revisar", "backend"]);
const errores = [];
const avisos = [];
const err = (m) => errores.push(m);
const aviso = (m) => avisos.push(m);

function recorrer(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (IGNORAR_DIR.has(n)) continue;
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) recorrer(p, out);
    else out.push(p);
  }
  return out;
}
const archivos = recorrer(RAIZ);
const rel = (p) => relative(RAIZ, p).split(sep).join("/");

// 1) La calculadora protegida: los motores NO pueden estar públicos (solo aritmética)
for (const p of archivos) {
  const r = rel(p);
  if (/^calculadora\/js\/motor-[^/]+\.js$/.test(r) && r !== "calculadora/js/motor-aritmetica.js") {
    err(`MOTOR PÚBLICO: ${r} no debe publicarse (la calculadora se copió desde una versión sin proteger).`);
  }
}

// 2) Claves secretas que nunca deben estar en el sitio
const PATRONES_SECRETOS = [
  [/APP_USR-\d{6,}-\d{6}-[0-9a-f]{20,}/i, "token de MercadoPago (APP_USR-…)"],
  [/TEST-\d{6,}-\d{6}-[0-9a-f]{20,}/i, "token de prueba de MercadoPago"],
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{10,}/, "clave de Resend (re_…)"],
  [/sk_live_[A-Za-z0-9]{10,}/, "clave secreta (sk_live_…)"],
  [/-----BEGIN (RSA |EC )?PRIVATE KEY-----/, "clave privada"],
  [/postgres(ql)?:\/\/[^\s'"]+:[^\s'"@]+@/, "contraseña de la base de datos"],
];
function esServiceRole(jwt) {
  try {
    const pl = JSON.parse(Buffer.from(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    return pl.role === "service_role";
  } catch { return false; }
}
const TEXTO = new Set([".html", ".js", ".mjs", ".css", ".json", ".txt", ".xml", ".webmanifest", ".md", ".ts", ".sql"]);
for (const p of archivos) {
  if (!TEXTO.has(extname(p).toLowerCase())) continue;
  const t = readFileSync(p, "utf8");
  for (const [re, nombre] of PATRONES_SECRETOS) if (re.test(t)) err(`SECRETO: posible ${nombre} en ${rel(p)}`);
  for (const m of t.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    if (esServiceRole(m[0])) err(`SECRETO: clave service_role de Supabase en ${rel(p)} (da acceso total a la base)`);
  }
}

// 3) JSON válidos
for (const p of archivos.filter((p) => /\.(json|webmanifest)$/i.test(p))) {
  try { JSON.parse(readFileSync(p, "utf8")); } catch (e) { err(`JSON ROTO: ${rel(p)} → ${e.message}`); }
}

// 4) JavaScript sin errores de sintaxis (no se revisan librerías de terceros)
for (const p of archivos.filter((p) => /\.(m?js)$/i.test(p) && !/\/lib\//.test(rel(p)) && !/\.min\.js$/.test(p))) {
  try { execFileSync(process.execPath, ["--check", p], { stdio: "pipe" }); }
  catch (e) { err(`JS ROTO: ${rel(p)} → ${String(e.stderr || e.message).split("\n").filter(Boolean).slice(0, 4).join(" | ")}`); }
}

// 5) Enlaces internos y recursos que no existen
const EXTERNO = /^(https?:|mailto:|tel:|javascript:|data:|blob:|whatsapp:|#|\/\/|\{|\$)/i;
function existeDestino(desde, url) {
  let u = url.trim();
  if (!u || EXTERNO.test(u)) return true;
  if (u.includes("${") || u.includes("{{") || u.includes("' +") || u.includes("\" +")) return true;
  u = u.split("#")[0].split("?")[0];
  if (!u) return true;
  try { u = decodeURIComponent(u); } catch { /* deja u como está */ }
  const destino = u.startsWith("/") ? join(RAIZ, u) : join(dirname(desde), u);
  if (existsSync(destino)) {
    if (statSync(destino).isDirectory()) return existsSync(join(destino, "index.html"));
    return true;
  }
  return false;
}
for (const p of archivos.filter((p) => /\.html?$/i.test(p))) {
  const t = readFileSync(p, "utf8").replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, "");
  for (const m of t.matchAll(/\b(href|src)\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const url = m[3] ?? m[4] ?? "";
    if (!existeDestino(p, url)) {
      const tag = t.slice(Math.max(0, t.lastIndexOf("<", m.index)), m.index + 1).slice(0, 8).toLowerCase();
      const grave = m[1].toLowerCase() === "src" || /<link/.test(tag);
      (grave ? err : aviso)(`${grave ? "RECURSO FALTANTE" : "ENLACE ROTO"}: ${rel(p)} → ${url}`);
    }
  }
}

// 6) Archivos que guarda la calculadora para usar sin internet (sw.js) deben existir
const sw = join(RAIZ, "calculadora/sw.js");
if (existsSync(sw)) {
  const m = readFileSync(sw, "utf8").match(/ARCHIVOS=\[([^\]]*)\]/);
  if (m) for (const a of m[1].match(/"[^"]*"/g) || []) {
    const ruta = decodeURIComponent(a.slice(1, -1)).replace(/^\.\//, "");
    if (ruta && !existsSync(join(RAIZ, "calculadora", ruta))) err(`CALCULADORA SIN INTERNET: falta calculadora/${ruta} (listado en sw.js)`);
  }
}

// 7) El dominio propio no se puede perder
if (!existsSync(join(RAIZ, "CNAME")) || !/matematicasactivas\.com/.test(readFileSync(join(RAIZ, "CNAME"), "utf8"))) {
  err("CNAME: falta el archivo CNAME con matematicasactivas.com (el sitio dejaría de verse en tu dominio)");
}

// Resultado
const total = archivos.length;
console.log(`Revisados ${total} archivos.`);
if (avisos.length) { console.log(`\n⚠️  ${avisos.length} advertencia(s):`); avisos.forEach((a) => console.log("  - " + a)); }
if (errores.length) {
  console.log(`\n❌ ${errores.length} error(es) que hay que corregir:`); errores.forEach((e) => console.log("  - " + e));
  process.exit(1);
}
console.log("\n✅ Todo en orden.");
