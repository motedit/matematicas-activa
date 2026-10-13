#!/usr/bin/env node
/* =======================================================================
 * ARMAR LA VERSIÓN PARA PUBLICAR (sección 3 · punto 14)
 * Crea la carpeta  publicar/  lista para subir a tu web:
 *   · junta los scripts que se cargan siempre en uno solo (js/app.min.js)
 *     y achica (minifica) todos los JS y CSS;
 *   · saca lo que no hace falta en la web (pruebas, herramientas, servidor,
 *     fuentes .woff viejas de KaTeX);
 *   · rehace la lista del modo sin internet (sw.js) con una versión nueva;
 *   · agrega .htaccess (compresión gzip/brotli y caché) para Apache/LiteSpeed.
 * Uso, desde la carpeta Calculadora (con Node instalado):
 *   npm install esbuild        (solo la primera vez)
 *   node herramientas/armar-publicacion.mjs
 * Los archivos originales no se tocan: seguí editando esos y volvé a armar.
 * ===================================================================== */
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';
let esbuild; try { esbuild = await import('esbuild'); } catch (e) { console.error('Falta esbuild. Instalalo con:  npm install esbuild'); process.exit(1); }
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SALIDA = path.join(RAIZ, 'publicar'), HTML = 'Matemática paso a paso.html';
const EXCLUIR = /^(publicar|pruebas|herramientas|servidor|node_modules)(\/|$)|^LEEME\.md$|^package(-lock)?\.json$|^lib\/katex\/fonts\/.*\.(woff|ttf)$|(^|\/)\.[^/]+$/;
const todos = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => { const r = path.join(d, e.name); return e.isDirectory() ? todos(r) : [r]; });
const rel = f => path.relative(RAIZ, f).split(path.sep).join('/');
const kb = n => (n / 1024).toFixed(0) + ' KB', gz = b => zlib.gzipSync(b, { level: 9 }).length;

fs.rmSync(SALIDA, { recursive: true, force: true });
const archivos = todos(RAIZ).map(rel).filter(f => !EXCLUIR.test(f));

/* 1. Scripts que carga la página siempre → un solo archivo (en el mismo orden que el HTML) */
let html = fs.readFileSync(path.join(RAIZ, HTML), 'utf8');
const PROPIOS = [...html.matchAll(/<script src="(js\/[^"]+\.js)"><\/script>/g)].map(m => m[1]);
const app = PROPIOS.map(f => `;/* ${f} */\n` + fs.readFileSync(path.join(RAIZ, f), 'utf8')).join('\n');
const appMin = (await esbuild.transform(app, { minify: true, loader: 'js', target: 'es2020', legalComments: 'none' })).code;
html = html.replace(/(<!--[^>]*-->\s*)?<script src="js\/[^"]+\.js"><\/script>\s*/g, (m, c, k) => '');
html = html.replace('</body>', '<script src="js/app.min.js"></script>\n</body>');
html = html.replace(/<script src="datos\/ejemplos\.js"><\/script>\s*/, '');      // en la web los ejemplos se leen de datos/ejemplos.json (ejemplos.js es para el doble clic)
html = html.replace(/<!--(?!\s*\/?DATOS-BUSCADORES)[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\n{2,}/g, '\n');   // sin comentarios ni espacios entre etiquetas

/* 2. Copiar y achicar */
const antes = { total: 0, gz: 0 }, despues = { total: 0, gz: 0 }, escribir = (f, datos) => { const d = path.join(SALIDA, f); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, datos); };
for (const f of archivos) {
  const origen = fs.readFileSync(path.join(RAIZ, f)); let datos = origen;
  if (f === HTML) datos = Buffer.from(html);
  else if (PROPIOS.includes(f) && !/^js\/motor-/.test(f)) continue;            // va dentro de app.min.js (los motores también quedan sueltos para el trabajador)
  else if (/\.js$/.test(f) && !/\.min\.js$/.test(f) && !/^lib\//.test(f)) datos = Buffer.from((await esbuild.transform(origen.toString(), { minify: true, loader: 'js', target: 'es2020', legalComments: 'none' })).code);
  else if (/\.css$/.test(f) && !/\.min\.css$/.test(f)) datos = Buffer.from((await esbuild.transform(origen.toString(), { minify: true, loader: 'css' })).code);
  else if (/\.json$|\.webmanifest$/.test(f)) { try { datos = Buffer.from(JSON.stringify(JSON.parse(origen.toString()))); } catch (e) { /* se copia igual */ } }
  else if (/\.html$/.test(f)) datos = Buffer.from(origen.toString().replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><'));
  escribir(f, datos);
}
escribir('js/app.min.js', appMin);

/* 3. Lista del modo sin internet (sw.js) */
const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), version = 'mpp-' + new Date().toISOString().slice(0, 16).replace(/\D/g, '');
const enCache = todos(SALIDA).map(f => path.relative(SALIDA, f).split(path.sep).join('/'))
  .filter(f => !/^lib\/tesseract\/|^temas\/|^sitemap\.xml$|^robots\.txt$|^sw\.js$|^\.htaccess$|^iconos\/icono-maskable|^iconos\/capturas\//.test(f)).sort();
const lista = ["'./'", ...enCache.map(f => `'./${encodeURI(f)}'`)].join(',\n  ');
const swNuevo = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`).replace(/const ARCHIVOS = \[[\s\S]*?\];/, `const ARCHIVOS = [\n  ${lista}\n];`);
escribir('sw.js', (await esbuild.transform(swNuevo, { minify: true, loader: 'js' })).code);

/* 4. .htaccess (Apache / LiteSpeed, como Hostinger): compresión y caché */
escribir('.htaccess', `# Matemática paso a paso · compresión y caché
AddType application/manifest+json .webmanifest
AddType font/woff2 .woff2
AddDefaultCharset utf-8
<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/html text/css application/javascript text/javascript application/json application/manifest+json image/svg+xml
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript application/json application/manifest+json image/svg+xml
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType application/json "access plus 0 seconds"
  ExpiresByType text/css "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType image/png "access plus 30 days"
</IfModule>
<Files "sw.js">
  <IfModule mod_headers.c>
    Header set Cache-Control "no-cache"
  </IfModule>
</Files>
`);

/* 5. Resumen: lo que baja un celular la primera vez (página + estilos + scripts + área inicial) */
const inicial = (raiz, propios) => [HTML, 'css/estilos.css', 'lib/fuentes/fuentes.css', 'lib/katex/katex.min.css', 'lib/katex/katex.min.js', 'lib/mathlive/mathlive.min.js', ...(raiz === RAIZ ? ['datos/ejemplos.js'] : ['datos/ejemplos.json']), 'datos/plataforma.js', 'js/motor-estadistica.js', ...propios]
  .map(f => fs.readFileSync(path.join(raiz, f))).reduce((a, b) => ({ total: a.total + b.length, gz: a.gz + gz(b) }), { total: 0, gz: 0 });
const a = inicial(RAIZ, PROPIOS), d = inicial(SALIDA, ['js/app.min.js']);
const propiosAntes = [...PROPIOS, ...archivos.filter(f => /^js\/(motor-|trabajador)/.test(f) && !PROPIOS.includes(f))].map(f => fs.readFileSync(path.join(RAIZ, f))), propiosDespues = ['js/app.min.js', ...archivos.filter(f => /^js\/(motor-|trabajador)/.test(f) && !PROPIOS.includes(f))].map(f => fs.readFileSync(path.join(SALIDA, f)));
const suma = l => l.reduce((x, b) => ({ total: x.total + b.length, gz: x.gz + gz(b) }), { total: 0, gz: 0 }), pa = suma(propiosAntes), pd = suma(propiosDespues);
console.log(`Listo: carpeta publicar/ (${enCache.length} archivos en el modo sin internet, versión ${version}).`);
console.log(`Código propio (scripts y motores): ${kb(pa.total)} → ${kb(pd.total)}  ·  comprimido al bajar: ${kb(pa.gz)} → ${kb(pd.gz)}`);
console.log(`Primera visita (página, estilos, librerías y área inicial): ${kb(a.total)} → ${kb(d.total)}  ·  comprimido: ${kb(a.gz)} → ${kb(d.gz)}  ·  pedidos de scripts propios: ${PROPIOS.length + 1} → 2`);
