/* =======================================================================
 * PREPARAR LA APP PARA GOOGLE PLAY (Trusted Web Activity con Bubblewrap)
 * Uso:
 *   node herramientas/play-store/preparar.mjs https://tusitio.com/calculadora/ [huella SHA-256]
 * Escribe, en esta misma carpeta:
 *   · twa-manifest.json  → lo usa "bubblewrap init" / "bubblewrap build"
 *   · assetlinks.json    → se sube a https://tusitio.com/.well-known/assetlinks.json
 *                           (en la RAÍZ del dominio, no dentro de /calculadora/)
 * La huella SHA-256 la da "bubblewrap fingerprint" o Play Console
 * (Configuración → Integridad de la app → Certificado de firma de la app).
 * Ver GUIA-PLAY-STORE.md.
 * ===================================================================== */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const [url = 'https://matematicasactiva.com/calculadora/', huella = 'PEGAR:LA:HUELLA:SHA256:DE:LA:CLAVE:DE:FIRMA'] = process.argv.slice(2);
const u = new URL(url.endsWith('/') ? url : url + '/'), base = u.pathname;
const PAQUETE = 'com.matematicasactiva.pasoapaso';
const twa = {
  packageId: PAQUETE,
  host: u.host,
  name: 'Matemática paso a paso',
  launcherName: 'Paso a paso',
  display: 'standalone',
  orientation: 'default',
  themeColor: '#0D1B2A',
  themeColorDark: '#0D1B2A',
  navigationColor: '#0D1B2A',
  navigationColorDark: '#0D1B2A',
  navigationDividerColor: '#0D1B2A',
  navigationDividerColorDark: '#0D1B2A',
  backgroundColor: '#EEF3F8',
  enableNotifications: false,
  startUrl: base + 'Matem%C3%A1tica%20paso%20a%20paso.html',
  iconUrl: u.origin + base + 'iconos/icono-512.png',
  maskableIconUrl: u.origin + base + 'iconos/icono-maskable-512.png',
  splashScreenFadeOutDuration: 300,
  signingKey: { path: './android.keystore', alias: 'android' },
  appVersionName: '1.0.0',
  appVersionCode: 1,
  shortcuts: [
    { name: 'Álgebra', shortName: 'Álgebra', url: base + 'Matem%C3%A1tica%20paso%20a%20paso.html?area=alg', chosenIconUrl: u.origin + base + 'iconos/icono-192.png' },
    { name: 'Graficador', shortName: 'Graficador', url: base + 'Matem%C3%A1tica%20paso%20a%20paso.html?graficador', chosenIconUrl: u.origin + base + 'iconos/icono-192.png' }
  ],
  generatorApp: 'bubblewrap-cli',
  webManifestUrl: u.origin + base + 'manifest.webmanifest',
  fallbackType: 'customtabs',
  features: {},
  alphaDependencies: { enabled: false },
  enableSiteSettingsShortcut: true,
  isChromeOSOnly: false,
  isMetaQuest: false,
  fullScopeUrl: u.origin + base,
  minSdkVersion: 21
};
const assetlinks = [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: PAQUETE, sha256_cert_fingerprints: [huella.toUpperCase()] } }];
fs.writeFileSync(path.join(AQUI, 'twa-manifest.json'), JSON.stringify(twa, null, 2) + '\n');
fs.writeFileSync(path.join(AQUI, 'assetlinks.json'), JSON.stringify(assetlinks, null, 2) + '\n');
console.log(`Listo para ${u.origin}${base}\n  · twa-manifest.json (paquete ${PAQUETE})\n  · assetlinks.json → subir a ${u.origin}/.well-known/assetlinks.json` + (/PEGAR/.test(huella) ? '\n  ! Falta la huella SHA-256: volvé a correr esto cuando la tengas.' : ''));
