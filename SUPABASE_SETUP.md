# Setup de Supabase — Matemáticas Activa

**Tiempo total: ~20 minutos.** Solo necesitás un navegador. Vas a configurar la base de datos, el almacenamiento de archivos y la autenticación segura.

---

## Por qué Supabase

Con esto vas a tener:
- ✅ Usuarios reales compartidos entre todos los dispositivos.
- ✅ Archivos del admin visibles para todos los visitantes.
- ✅ Suscripciones premium sincronizadas.
- ✅ **Contraseñas almacenadas seguras en el servidor** (bcrypt) — nadie puede robarlas viendo el código fuente.
- ✅ Plan gratis suficiente para empezar: 50.000 usuarios/mes, 500 MB DB, 1 GB storage.

---

## Paso 1 — Crear cuenta y proyecto en Supabase (5 min)

1. Andá a https://app.supabase.com y registrate (podés usar tu cuenta de GitHub que ya tenés).
2. Después del login vas a ver el dashboard. Hacé clic en **New project** (botón verde arriba a la derecha).
3. Si te pide elegir una organización, dejá la que tiene tu nombre (es la "Personal Org").
4. Completá:
   - **Name:** `matematicas-activa`
   - **Database password:** Generá una contraseña fuerte y **guardala** (la podés perder si no la copiás; no la vas a necesitar día a día pero sí si querés acceder a la DB desde otra herramienta).
   - **Region:** elegí la más cercana a vos. Para Argentina: `South America (São Paulo)`.
   - **Pricing plan:** dejá **Free** (lo seleccionado por defecto).
5. Clic en **Create new project**. Vas a esperar ~2 minutos mientras Supabase aprovisiona la base de datos. Te aparece una pantalla "Setting up your project".

---

## Paso 2 — Ejecutar el SQL del esquema (3 min)

Mientras esperás (o cuando termine):

1. En el menú lateral izquierdo de tu proyecto, hacé clic en **SQL Editor** (icono de terminal).
2. Clic en **+ New query** (arriba a la izquierda).
3. Abrí el archivo `supabase-schema.sql` que está en tu carpeta `MA_Proyecto` (con Bloc de notas o cualquier editor).
4. Copiá **todo** el contenido (Ctrl+A → Ctrl+C).
5. Pegalo en el editor SQL de Supabase.
6. Clic en **Run** (abajo a la derecha, o `Ctrl+Enter`).
7. Vas a ver un mensaje verde "Success. No rows returned". Si ves errores, mandame una captura.

Esto crea las tablas `perfiles`, `archivos`, `historial_pagos`, los triggers y las políticas de seguridad.

---

## Paso 3 — Crear el bucket de Storage (2 min)

El SQL no crea el bucket de Storage (Supabase no lo permite por SQL todavía).

1. Menú lateral → **Storage** (icono de carpeta).
2. Clic en **New bucket**.
3. Completá:
   - **Name:** `archivos` (exactamente así, en minúscula).
   - **Public bucket:** dejá **OFF** (apagado).
   - **Additional configuration → File size limit:** poné `50` MB (el máximo del plan gratis).
   - **Allowed MIME types:** dejalo vacío (acepta todo).
4. Clic en **Create bucket**.

Las políticas de acceso al bucket ya las creó el SQL del Paso 2, así que solo authenticated users pueden ver archivos y solo admins pueden subir.

---

## Paso 4 — Copiar las credenciales a tu proyecto (2 min)

1. Menú lateral → **Settings** (icono de engranaje, abajo a la izquierda) → **API**.
2. Vas a ver dos cosas que necesitás:
   - **Project URL** — algo como `https://abcdefghijklmno.supabase.co`.
   - **Project API keys → anon public** — un texto largo que empieza con `eyJhbGc...`.
3. Abrí el archivo `supabase-config.js` de tu carpeta `MA_Proyecto` con Bloc de notas.
4. Reemplazá las dos líneas de arriba:
   ```javascript
   const SUPABASE_URL      = "PEGA_AQUI_TU_PROJECT_URL";
   const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_ANON_PUBLIC_KEY";
   ```
   Por las tuyas, por ejemplo:
   ```javascript
   const SUPABASE_URL      = "https://abcdefghijklmno.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZ...";
   ```
5. Guardá el archivo (Ctrl+S).

> ⚠️ La `anon public` key **es segura** para incluirla en el front-end (es de uso público). La seguridad real la dan las políticas RLS que ya configuraste en el Paso 2. **NUNCA** pegues la `service_role` key acá.

---

## Paso 5 — Configurar el comportamiento de la auth (2 min)

1. Menú lateral → **Authentication** → **Providers**.
2. Asegurate de que **Email** esté ON.
3. Menú lateral → **Authentication** → **URL Configuration**.
4. En **Site URL**, ingresá la URL de tu sitio: `https://motedit.github.io/matematicas-activa/`
5. En **Redirect URLs**, agregá la misma URL.
6. Clic en **Save**.

**Opcional — Desactivar confirmación por email (recomendado para empezar):**

Si querés que los usuarios entren de una sin confirmar el email:
1. Menú lateral → **Authentication** → **Sign In / Providers** → **Email**.
2. Buscá **Confirm email** y desactivalo.
3. Save.

Si lo dejás activado, los usuarios reciben un email de Supabase y tienen que clickear el link antes de poder entrar.

---

## Paso 6 — Subir los archivos nuevos a GitHub (3 min)

Estos son los archivos que cambiaron o son nuevos:
- `index.html` ⚠️ (modificado)
- `scripts.js` ⚠️ (reescrito)
- `materia.js` ⚠️ (reescrito)
- `supabase-config.js` 🆕 (nuevo, ya con tus credenciales adentro)
- `materias/Algebra/Algebra.html` y los otros 7 HTML de materias ⚠️ (modificados: incluyen el SDK)
- `supabase-schema.sql` 🆕 (referencia, no se ejecuta en producción)

Subir a GitHub:
1. Entrá a https://github.com/motedit/matematicas-activa
2. Por cada archivo modificado: abrí el archivo en GitHub, clic en el lápiz ✏️, borrá todo el contenido, pegá el nuevo, scroll abajo, **Commit changes**.
3. Para archivos nuevos: **Add file → Upload files** → arrastrá.

**Atajo más rápido:** subí toda la carpeta de nuevo:
1. **Add file → Upload files** desde la raíz del repo.
2. Arrastrá todos los archivos modificados y los nuevos.
3. Marcá la casilla "Replace existing files".
4. Commit.

Esperá ~30 segundos y entrá a https://motedit.github.io/matematicas-activa/ — vas a ver tu sitio funcionando con Supabase.

---

## Paso 7 — Crear tu cuenta de administrador (3 min)

Esto es el reemplazo del antiguo "contraseña hardcodeada `admin`":

1. Abrí https://motedit.github.io/matematicas-activa/
2. Clic en **Ingresar** (arriba a la derecha).
3. Clic en **Crear cuenta gratis**.
4. Completá:
   - **Nombre de usuario:** lo que vos quieras (ej: `marcos`)
   - **Email:** tu email real (vas a recibir confirmación si dejaste esa opción activa)
   - **Contraseña:** una fuerte (mínimo 6 caracteres)
5. **Registrarme**.
6. Si activaste confirmación por email, revisá tu casilla y clickeá el link. Si no, ya quedaste logueado.

Ahora promovés esa cuenta a admin:

1. Volvé al dashboard de Supabase → **SQL Editor** → **+ New query**.
2. Pegá esto, **reemplazando** `tu@email.com` por el email con el que te registraste:
   ```sql
   update public.perfiles
   set rol = 'admin'
   where id = (select id from auth.users where email = 'tu@email.com');
   ```
3. Clic en **Run**.
4. Volvé a tu sitio. Recargá la página (`F5`). Ahora vas a ver el botón **⚙️ Admin** en la navbar y podés entrar al panel.

---

## ¡Listo! Cómo se ve ahora todo

| Antes (localStorage) | Ahora (Supabase) |
|---|---|
| Cada navegador veía sus propios usuarios | Todos los usuarios compartidos |
| Archivos solo en IndexedDB del admin | Archivos visibles para todos los visitantes |
| Contraseña admin `admin` en el código | Cuenta admin real con email/contraseña en servidor |
| Hash en cliente (inseguro) | bcrypt en servidor (estándar de la industria) |
| Sin emails de confirmación | Opcional: confirmación por email |
| Sin recuperación de contraseña | Disponible vía Supabase (mandar email reset) |

---

## Problemas comunes

### "Supabase no está configurado" en la consola
- Verificá que `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `supabase-config.js` no tengan el texto "PEGA_AQUI" todavía.
- Verificá que subiste el archivo modificado a GitHub.

### Después de registrarme no me deja entrar como admin
- ¿Ejecutaste el SQL del Paso 7 con tu email real? Verificá en Supabase → **Authentication** → **Users** que tu usuario esté.
- En **Table Editor** → `perfiles`, abrí tu fila y verificá que `rol` diga `admin`.

### El sitio carga pero ningún archivo aparece
- Es normal al principio: aún no subiste contenido. Entrá como admin → ⚙️ Admin → ⬆️ Subir → cargá videos/PDFs.

### Subo un archivo y no se sube
- Verificá que el bucket `archivos` exista en Storage.
- Verificá que el archivo pese menos de 50 MB.
- Mirá la consola del navegador (F12 → Console) por errores.

### Error "Email not confirmed"
- Andá a tu email y clickeá el link de confirmación de Supabase.
- O desactivá la confirmación (Paso 5 opcional).

### Quiero hacer back-up de la DB
- Dashboard → **Database** → **Backups** (en plan gratis hay backups automáticos diarios por 7 días).

---

## Límites del plan gratis y cómo escalar

| Recurso | Free | Cuándo migrar a Pro ($25/mes) |
|---|---|---|
| Usuarios activos/mes | 50.000 | Cuando crezcas mucho |
| Storage | 1 GB | Si subís muchos videos pesados |
| Base de datos | 500 MB | Mucho contenido |
| Bandwidth | 5 GB/mes | Mucho tráfico de descargas |
| File upload | 50 MB | Necesitás videos más largos |

Para sitios educativos pequeños/medianos el plan gratis suele alcanzar.

---

## Seguridad — checklist final

- ✅ La `anon key` es la única credencial expuesta (es segura y de uso público).
- ✅ La `service_role key` **nunca** debe estar en el front-end (yo no la uso en ningún archivo).
- ✅ Las políticas RLS protegen: solo admin puede subir, editar, borrar archivos y promover usuarios.
- ✅ Las contraseñas viven hasheadas con bcrypt en el servidor de Supabase, no en tu sitio.
- ✅ Los JWTs expiran automáticamente y se refrescan.
- ⚠️ Cualquier persona con cuenta puede ver la metadata de los archivos (eso es por diseño — son contenido educativo público). El gating premium es solo de UX, no de seguridad real.
- ⚠️ Si necesitás que los archivos premium sean inaccesibles para no-premium incluso vía URL directa, hay que agregar lógica server-side adicional (Supabase Edge Functions).
