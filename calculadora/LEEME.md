# Matemática paso a paso · Matemáticas Activa

## Estructura

```
Calculadora/
├── Matemática paso a paso.html   ← la página (solo estructura)
├── css/
│   └── estilos.css               ← colores, tipografía y estilos de los gráficos
├── datos/
│   ├── ejemplos.json             ← ejemplos, tips y textos de ayuda de cada área
│   └── ejemplos.js               ← copia del .json para abrir la página con doble clic
└── js/
    ├── motor-aritmetica.js       ← base: racionales exactos, analizador, pasos
    ├── motor-algebra.js
    ├── motor-geometria-analitica.js
    ├── motor-trigonometria.js
    ├── motor-calculo-diferencial.js
    ├── motor-calculo-integral.js
    ├── motor-estadistica.js
    ├── aprendizaje.js            ← ¿Por qué?, comprobar respuesta, práctica, teclados (sección 2)
    ├── interfaz.js               ← botones, pista, resultado, enlace, historial, voz, PDF, modo clase
    ├── docente.js                ← imagen, "A la pizarra", progreso y fichas (sección 3)
    ├── plataforma.js             ← versión gratuita/completa, clases y foto (sección 5)
    ├── nube.js                   ← progreso compartido y códigos validados en el servidor
    ├── estadisticas.js           ← estadísticas de uso anónimas
    ├── asistente.js              ← “No entiendo este paso” (IA)
    ├── escritura.js              ← escribir el ejercicio a mano (modelo en lib/escritura)
    ├── voz.js                    ← dictar el ejercicio por voz
    └── trabajador.js             ← resuelve en segundo plano (Web Worker)
```

## Cómo abrirla

- **Doble clic en el HTML:** funciona. Los ejemplos salen de `datos/ejemplos.js`.
- **En un servidor** (tu web, o “Live Server” de VS Code): los ejemplos se leen de `datos/ejemplos.json`.

Los navegadores no dejan leer un `.json` desde una página abierta con doble clic; por eso existe la copia `.js`.

## Qué tocar para cada cosa

| Quiero…                         | Archivo |
|---------------------------------|---------|
| Cambiar colores o tipografía    | `css/estilos.css` (variables de `:root`) |
| Agregar o cambiar ejemplos/tips | `datos/ejemplos.json` **y** `datos/ejemplos.js` (mismo contenido) |
| Cambiar textos de la página     | `Matemática paso a paso.html` |
| Corregir o ampliar un tema      | el `js/motor-….js` del área |
| Cambiar cómo se muestran pasos  | `js/interfaz.js` |

## Reglas importantes

- **El orden de los `<script>` importa:** cada motor usa funciones de los anteriores (todos usan la aritmética; integral y estadística usan cálculo diferencial).
- Los motores no tocan la página: reciben un texto y devuelven `{ tema, metodo, pasos, resultado, alternativas }`.

## Área nueva

1. Botón en el HTML con `data-area="clave"`.
2. Su motor en `js/` y su `<script>` en el HTML (después de los que use).
3. Su entrada en `datos/ejemplos.json` (y en la copia `.js`).
4. Una rama en `temasArea`, `resolverArea` y `detectarArea` de `js/interfaz.js`.

## Sin internet, instalable y pruebas (sección 4)

- `lib/` tiene KaTeX, MathLive, las tipografías y el lector de fotos: no hace falta internet.
- Cada motor se carga recién cuando se elige su área (`js/interfaz.js` → `DEPENDE`).
- Publicada en un servidor (http/https) se puede instalar como app y funciona sin conexión
  (`manifest.webmanifest`, `sw.js`). Si cambiás archivos, subí `VERSION` en `sw.js`.
- `pruebas/pruebas.html`: abrilo (doble clic) después de cambiar un motor. Resuelve todos los
  ejemplos y casos de control, y te marca lo que falle.

## Plataforma (sección 5) · datos/plataforma.json (y la copia plataforma.js)

- `planes.activo`: `false` = todo gratis; `true` = versión gratuita con límite diario y funciones
  de la versión completa con candado. `enlaceSuscripcion`: tu página de pago.
- `planes.codigos`: huellas de los códigos de activación. Generalas con `pruebas/codigos.html`.
- `clases.baseUrl` o `clases.porTema`: enlaces “Ver la clase de este tema”.
- `foto.proveedor`: `tesseract` (gratis, en el navegador) o `mathpix` (pago; poné app_id y app_key).

## Servidor (Supabase) · opcional

1. Creá un proyecto en supabase.com y pegá `servidor/supabase.sql` en el SQL Editor (Run).
2. Creá tu curso y cargá códigos con los ejemplos que están al final de ese archivo
   (`pruebas/codigos.html` te arma las líneas de los códigos).
3. En `datos/plataforma.json` (y `plataforma.js`) completá `nube.url` y `nube.clave` (anon key).

Con eso: el progreso de cada alumno llega al docente desde cualquier dispositivo, y los códigos
de la versión completa se validan en el servidor (no quedan en la página).

## Parte docente (para más adelante)

`docente.activo` en `datos/plataforma.json`: con `false` (como está ahora) se ocultan Fichas,
Modo clase y el envío del progreso a un curso. Cuando armes la parte para docentes, ponelo en `true`.
Abierta desde tu Pizarra Docente, la calculadora muestra esas herramientas igual.

## Buscadores (sección 4 · punto 15)

- `node herramientas/generar-paginas.js https://tusitio.com/calculadora/` crea `temas/` (una página
  por tema con sus ejemplos resueltos), `sitemap.xml`, `robots.txt` y agrega a la calculadora los
  datos para Google (MathSolver). Volvé a correrlo cuando agregues ejemplos o temas.
- La calculadora acepta `?e=ejercicio` (y `?q=`) sin área: la detecta sola. Así la usa Google.
- `robots.txt` solo vale en la raíz del dominio: si la calculadora va en una subcarpeta, copiá
  sus líneas al `robots.txt` principal del sitio.

## Estadísticas de uso (punto 16)

- `js/estadisticas.js` registra el uso sin datos personales. Siempre queda en el navegador; con
  `estadisticas.url` y `clave` en `datos/plataforma.json` también se manda a Supabase.
- Panel: `herramientas/estadisticas.html` (este navegador, archivo exportado o servidor).
- Para ver las del servidor, guardá la clave con la línea de ejemplo de `servidor/supabase.sql`.

## Asistente con IA (punto 17)

- `servidor/asistente/index.ts` es una función de Supabase que llama a Claude (la clave de la API
  queda en el servidor). Las instrucciones para publicarla están al principio del archivo.
- Poné su dirección en `datos/plataforma.json → asistente.url` y aparece “No entiendo este paso”.
- Con los planes activos es parte de la versión completa. Límite diario por persona: `LIMITE_DIARIO`.

## Escritura a mano, dictado y segundo plano (sección 3)

- **A mano:** usa el mismo reconocedor de la Pizarra Docente (`lib/escritura/modelo.js`, se carga
  al abrir). Reconoce números, x, + − × ÷ = ( ) √ % π, exponentes y fracciones con raya.
- **Dictar:** reconocimiento de voz del navegador (Chrome, Edge, Safari, Android). `vozATexto()` en
  `js/voz.js` traduce las palabras ("x al cuadrado menos cinco x…") a símbolos.
- **Segundo plano:** publicada en http/https, la calculadora resuelve en `js/trabajador.js`: no se
  congela, muestra “Resolviendo…” con Cancelar y corta a los 20 segundos. Con doble clic resuelve
  como siempre.

## Versión para publicar (punto 14)

- `node herramientas/armar-publicacion.mjs` (con `npm install esbuild` la primera vez) crea
  `publicar/`: scripts juntos y achicados, sin pruebas ni herramientas, `.htaccess` con compresión y
  caché, y la lista del modo sin internet actualizada. Subí el contenido de `publicar/` a tu web.
- Seguí editando los archivos originales y volvé a armar.

## Problemas con enunciado
- Álgebra → tema **Problemas con enunciado** (`js/motor-algebra.js`, sección A24). Plantillas: un número (“el doble de un número aumentado en 7 es 25”), consecutivos, dos números, edades (hoy, dentro de / hace N años), rectángulo (perímetro o área), compras, porcentaje (precio original), encuentro de dos móviles y trabajo conjunto (canillas).
- Pasos: incógnita → traducción (tabla) → ecuación → resolución → descarte de soluciones sin sentido → verificación en el enunciado → respuesta con una oración.
- Si se escribe un problema en otra área, se pasa solo a Álgebra (`pareceProblema` en `js/interfaz.js`).
- Plantilla nueva: agregar un objeto a `PLANTILLAS_PB` con `leer(t)` que devuelva `{ incog, porQue, trad, eq, valida, motivo, verif, resp }`.

## Comparar métodos y “¿Te sirvió?” (js/comparar.js)
- **Comparar métodos**: aparece cuando el ejercicio tiene otros métodos (“Ver con…”). Columnas lado a lado, “Más corto” y control de que el resultado coincida.
- **¿Te sirvió?** 👍/👎 en cada paso; con 👎 se elige el motivo. Se guarda como evento `opinion` y se ve en `herramientas/estadisticas.html` → **Explicaciones a revisar**.

## Exportar a Word y LaTeX (js/exportar.js)
- **Word**: `.docx` armado en el navegador, con ecuaciones de Word editables, tablas y gráficos como imagen.
- **LaTeX**: `.tex` que compila con pdflatex u Overleaf (se probó con los 423 ejemplos).

## Google Play (herramientas/play-store/)
- `GUIA-PLAY-STORE.md` (pasos), `FICHA-PLAY-STORE.md` (textos de la ficha), `preparar.mjs` (genera `twa-manifest.json` y `assetlinks.json` con tu dirección), gráfico destacado y capturas (`iconos/capturas/`).
