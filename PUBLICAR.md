# Cómo publicar Matemáticas Activa en GitHub Pages

**Tiempo total: ~10 minutos. No necesitás instalar nada.**

Ya te preparé un archivo `matematicas-activa.zip` en esta misma carpeta con todo lo necesario. Solo seguí estos pasos:

---

## Paso 1 — Crear cuenta de GitHub (3 min)

1. Entrá a https://github.com/signup
2. Ingresá tu email (podés usar `marcos_diaz_97@hotmail.com`).
3. Elegí una contraseña segura.
4. Elegí un nombre de usuario corto y en minúscula. **Importante:** este nombre va a aparecer en la URL final del sitio. Ejemplo: si elegís `marcosdiaz97`, tu sitio va a quedar en:
   ```
   https://marcosdiaz97.github.io/matematicas-activa/
   ```
5. Verificá tu email haciendo clic en el link que GitHub te envía.
6. Cuando te pregunte "How many team members?" elegí "Just me" (o cualquier opción, no importa).
7. En "Are you a student or a teacher?" elegí cualquier respuesta y seguí.
8. Listo, ya tenés cuenta.

---

## Paso 2 — Descomprimir el ZIP (1 min)

1. Abrí el Explorador de Windows en `C:\Users\marco\OneDrive\Desktop\MA_Proyecto`.
2. Vas a ver el archivo `matematicas-activa.zip`.
3. Clic derecho sobre él → **Extraer todo...** → **Extraer**.
4. Se creará una carpeta `matematicas-activa` con todos los archivos del sitio.

---

## Paso 3 — Crear el repositorio (2 min)

1. Entrá a https://github.com/new (tenés que estar logueado).
2. **Repository name:** escribí `matematicas-activa` (igual a la carpeta, en minúscula y con guión).
3. **Description (opcional):** "Plataforma educativa de matemáticas".
4. Marcá la opción **Public** (necesario para que GitHub Pages funcione gratis).
5. **NO marques** "Add a README", "Add .gitignore" ni "Choose a license" — todo eso ya viene en el ZIP.
6. Clic en **Create repository** (botón verde abajo).

---

## Paso 4 — Subir los archivos al repo (3 min)

1. Apenas creés el repo vas a ver una pantalla con título "Quick setup". Buscá el link azul que dice **uploading an existing file** (está en la parte de "...or push an existing repository from the command line").

   Si no lo ves, también funciona: arriba a la izquierda hay un botón **Add file → Upload files**.

2. Vas a entrar a la pantalla de carga. Vas a ver un cuadro grande gris que dice "Drag files here to add them to your repository".

3. Volvé al Explorador de Windows, abrí la carpeta `matematicas-activa` que descomprimiste en el Paso 2.

4. **Importante:** seleccioná todo el **contenido** de la carpeta (no la carpeta entera). Usá `Ctrl+A` dentro de la carpeta para seleccionar:
   - `index.html`, `styles.css`, `scripts.js`, `materia.css`, `materia.js`
   - `calculadora.js`, `funciones.js`, `graficadora.js`
   - `.nojekyll`, `.gitignore`, `PUBLICAR.md`
   - las carpetas `img/` y `materias/`

5. Arrastrá todo eso al cuadro gris de GitHub. Vas a ver que aparecen los archivos en una lista (esto puede tardar 1-2 minutos por las imágenes).

6. Cuando termine la carga, bajá hasta abajo de la página. Vas a ver:
   - Una caja "Commit changes" con un mensaje por defecto. Dejalo así.
   - Clic en el botón verde **Commit changes**.

7. GitHub procesa por ~30 segundos y te lleva a la página principal del repo. Vas a ver todos tus archivos listados.

---

## Paso 5 — Activar GitHub Pages (1 min)

1. En tu repo, clic en **Settings** (engranaje, arriba a la derecha de la barra de pestañas).
2. En el menú lateral izquierdo, scroll hasta encontrar la sección "Code and automation".
3. Clic en