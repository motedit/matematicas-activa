# Guía de publicación — Matemáticas Activa

Sitio estático listo para publicarse en cualquier hosting de archivos estáticos (GitHub Pages, Netlify, Vercel, etc.).

## Opción recomendada: GitHub Pages (gratis y simple)

### 1) Crear cuenta y repositorio
1. Andá a https://github.com y creá una cuenta si no tenés.
2. Clic en el botón verde **New** (o https://github.com/new) para crear un nuevo repositorio.
3. Nombre sugerido: `matematicas-activa` (todo en minúscula, sin espacios).
4. Marcá **Public**.
5. **No** marques "Add a README", "Add .gitignore" ni "Choose a license" (ya están en el proyecto).
6. Clic en **Create repository**.

### 2) Subir los archivos (sin terminal — desde el navegador)
1. En la pantalla del repo recién creado, hacé clic en **uploading an existing file** (link azul).
2. Abrí la carpeta `MA_Proyecto` en el Explorador de Windows.
3. Seleccioná **todos** los archivos y carpetas (Ctrl+A) y arrastralos a la ventana de GitHub.
   - Incluí: `index.html`, `styles.css`, `scripts.js`, `materia.js`, `materia.css`, `calculadora.js`, `funciones.js`, `graficadora.js`, la carpeta `img/`, la carpeta `materias/`, `.nojekyll` y `.gitignore`.
   - **No** subas la carpeta `docs/` si querés mantenerla privada (es opcional).
4. Esperá a que termine la subida (la barra azul al pie).
5. En el campo "Commit changes" abajo, dejá el mensaje por defecto y clic en **Commit changes**.

### 3) Activar GitHub Pages
1. En el repo, clic en la pestaña **Settings** (engranaje, arriba a la derecha).
2. En el menú lateral izquierdo, clic en **Pages**.
3. En **Source**, elegí **Deploy from a branch**.
4. En **Branch**, elegí `main` y carpeta `/ (root)`. Clic en **Save**.
5. Esperá ~1-2 minutos. GitHub te mostrará la URL del sitio arriba, algo así como:
   ```
   https://TU-USUARIO.github.io/matematicas-activa/
   ```
6. ¡Listo! Compartí ese link.

### 4) Actualizar el sitio en el futuro
Cada vez que modifiques un archivo:
1. Entrá al repo en GitHub → abrí el archivo → clic en el lápiz ✏️ → editá → **Commit changes**.
2. O subí archivos nuevos con **Add file → Upload files**.
3. El sitio se republica solo en ~30 segundos.

---

## Opción alternativa: Netlify (drag-and-drop)
1. https://app.netlify.com/drop
2. Arrastrá la carpeta `MA_Proyecto` entera.
3. En segundos te da una URL `https://nombre-random.netlify.app`. Podés cambiar el nombre desde "Site settings".

---

## Consideraciones de seguridad

El proyecto guarda usuarios/contraseñas (hash SHA-256) en `localStorage` del navegador. Esto significa:
- Los datos viven **en el navegador de cada visitante**, no en un servidor.
- Cada navegador/dispositivo ve sus propios usuarios (no se comparten).
- Para una versión multi-usuario real, harían falta backend + base de datos (Firebase, Supabase, etc.).

Para el panel de administración, la contraseña por defecto es `admin`. **Cambiala** antes de publicar editando en `scripts.js` la función `verificarPassAdmin` o el valor de `ADMIN_PASS_HASH`.

---

## Comprobaciones antes de publicar
- [x] Errores HTML corregidos (`<a>` envueltos en `<li>`, atributos sintácticos válidos).
- [x] Accesibilidad mejorada (`label for=`, `aria-label`, `role` en modales, `noscript` en páginas de materia).
- [x] Bug crítico de `scripts.js` resuelto (referencia a `#ejercicios` inexistente).
- [x] CSS duplicado limpiado.
- [x] Meta tags SEO (description, theme-color, favicon) agregados.
- [x] Archivo `.nojekyll` presente.
