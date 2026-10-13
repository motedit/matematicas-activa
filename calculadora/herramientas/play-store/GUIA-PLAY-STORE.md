# Publicar “Matemática paso a paso” en Google Play

La app de Android es la misma calculadora web, abierta a pantalla completa con Chrome
(**Trusted Web Activity**). No hay que programar nada nuevo: cada cambio que subas a la web
aparece en la app sin publicar una versión nueva.

## Lo que ya está listo en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `preparar.mjs` | Genera `twa-manifest.json` y `assetlinks.json` con tu dirección real. |
| `twa-manifest.json` | Configuración de Bubblewrap (paquete `com.matematicasactiva.pasoapaso`, colores, íconos, accesos directos). |
| `assetlinks.json` | Prueba de que la web y la app son tuyas (sin esto aparece la barra de Chrome arriba). |
| `FICHA-PLAY-STORE.md` | Textos de la ficha: título, descripciones, categoría, seguridad de los datos. |
| `graficos/grafico-destacado-1024x500.png` | Gráfico destacado que pide Play. |
| `../../iconos/icono-512.png` | Ícono de la ficha (512 × 512). |
| `../../iconos/capturas/` | 5 capturas de celular (1080 × 1920) y 1 de computadora. |

El `manifest.webmanifest` de la calculadora ya tiene `id`, categorías, capturas y accesos
directos (Álgebra y Graficador).

## Pasos

1. **Publicá la web** (carpeta `publicar/`, armada con `herramientas/armar-publicacion.mjs`) en
   tu dominio con **https**. Ejemplo: `https://matematicasactiva.com/calculadora/`.
2. **Generá la configuración con tu dirección**:
   ```
   node herramientas/play-store/preparar.mjs https://matematicasactiva.com/calculadora/
   ```
3. **Instalá Bubblewrap** (necesita Node 18 o más nuevo; la primera vez descarga solo Java y el SDK de Android):
   ```
   npm install -g @bubblewrap/cli
   ```
4. **Creá el proyecto de Android** en una carpeta nueva, usando la configuración:
   ```
   mkdir app-android && cd app-android
   copy ..\herramientas\play-store\twa-manifest.json .      (en Mac/Linux: cp ../herramientas/play-store/twa-manifest.json .)
   bubblewrap update
   bubblewrap build
   ```
   La primera vez pide crear la **clave de firma** (`android.keystore`). Anotá las contraseñas
   y **guardá una copia de ese archivo**: sin él no vas a poder actualizar la app.
   El resultado es `app-release-bundle.aab` (lo que se sube a Play) y `app-release-signed.apk`
   (para probar en tu celular).
5. **Huella digital**: en Play Console → tu app → *Configuración → Integridad de la app →
   Firma de apps*, copiá la **huella del certificado SHA-256** (la de “clave de firma de apps”).
   Después:
   ```
   node herramientas/play-store/preparar.mjs https://matematicasactiva.com/calculadora/ AA:BB:CC:…
   ```
   y subí `assetlinks.json` a `https://matematicasactiva.com/.well-known/assetlinks.json`
   (en la raíz del dominio). Si probás el `.apk` antes de subirlo a Play, agregá también la
   huella de tu clave (`bubblewrap fingerprint`); el archivo admite varias huellas.
6. **Play Console** (<https://play.google.com/console>, cuenta de desarrollador: pago único de
   USD 25; las cuentas personales nuevas tienen que hacer una prueba cerrada con al menos 12
   testers durante 14 días antes de publicar):
   - Crear app → nombre, idioma español (Latinoamérica), App, Gratis.
   - Ficha de Play Store → copiar los textos de `FICHA-PLAY-STORE.md`, ícono, gráfico destacado y capturas.
   - Política de privacidad → la dirección de `privacidad.html` publicada.
   - Seguridad de los datos, clasificación de contenido y público objetivo → respuestas en `FICHA-PLAY-STORE.md`.
   - Versiones → Prueba cerrada (o Producción) → subir `app-release-bundle.aab`.
7. **Actualizaciones**: los cambios de la calculadora se publican subiendo la web. Solo hay que
   generar un `.aab` nuevo si cambian el nombre, los colores, el ícono o la dirección (subí
   `appVersionCode` en `twa-manifest.json` antes de `bubblewrap build`).

## Comprobaciones

- Abrí `https://tu-dominio/.well-known/assetlinks.json`: tiene que verse el JSON (no una página de error).
- Si la app muestra la barra con la dirección arriba, la huella de `assetlinks.json` no coincide
  con la de Play Console.
- La calculadora funciona sin internet una vez abierta (modo sin conexión de `sw.js`), así que la
  app también.
