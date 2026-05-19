# Guía Legal — Matemáticas Activa (Argentina)

> ⚠️ **DESCARGO:** este documento NO es asesoramiento legal. Es una guía técnica preparada por una IA. **Antes de publicar contenido pago debés consultar con un abogado y/o contador matriculado.**

---

## 1. Copyright y Propiedad Intelectual en Argentina

### Marco legal aplicable

| Norma | Qué regula |
|---|---|
| **Ley 11.723** (Régimen Legal de la Propiedad Intelectual) | Protección de obras literarias, científicas, didácticas, software, etc. |
| **Ley 25.036** | Incorpora explícitamente el software como obra protegida |
| **Decreto 165/94** | Reglamenta el registro de obras digitales |
| **Convenio de Berna** | Argentina es parte → protección automática internacional |

### ✅ Tus protecciones automáticas

**No necesitás registrar nada** para tener copyright. Por la Ley 11.723, cualquier obra original (incluyendo tu código, diseño, textos del sitio) **está protegida desde el momento en que la creás**, durante toda tu vida + 70 años después.

### Lo que TENÉS que mostrar en el sitio

1. **Aviso de copyright** (ya lo tenés en el footer):
   ```
   Copyright © 2025 Matemáticas Activa · Todos los derechos reservados
   ```
   Esto es declarativo, NO da derechos extra, pero **disuade** infractores y prueba la fecha.

2. **Términos de Servicio** (te los preparé en `terminos-servicio.html`) — define qué pueden y qué NO pueden hacer los usuarios con tu contenido.

3. **Política de Privacidad** (te la preparé en `politica-privacidad.html`) — obligatoria por Ley 25.326 si guardás datos personales (emails, usernames).

### 💡 Registro opcional (recomendado)

Para tener prueba fechada y oficial podés registrar tu obra en la **DNDA (Dirección Nacional del Derecho de Autor)**:
- Online: https://www.argentina.gob.ar/justicia/derechodeautor
- Costo: ~$3.000-$5.000 ARS (2026)
- Trámite: subís el código fuente comprimido + datos + pagás
- Beneficio: si alguien te plagia, tenés constancia oficial con fecha

---

## 2. Protección de Datos Personales

### Ley 25.326 (Protección de Datos Personales)

Cualquier sitio que guarde datos personales (emails, usernames, contraseñas, datos de pago) **está obligado** a:

| Obligación | Cómo se cumple |
|---|---|
| **Política de Privacidad visible** | ✅ Te la preparé, enlazada desde el footer |
| **Consentimiento explícito** | ✅ El usuario acepta al registrarse |
| **Permitir borrar la cuenta** | ⚠️ Por implementar — botón "Eliminar mi cuenta" en perfil |
| **Permitir exportar datos** | ⚠️ Por implementar — botón "Descargar mis datos" |
| **Inscribir base de datos en AAIP** | ✅ Gratis, online, obligatorio si >50 usuarios. Te explico abajo |

### Inscripción AAIP (Agencia de Acceso a la Información Pública)

Si tenés más de 50 usuarios registrados, tenés que inscribir tu base de datos:
1. https://www.argentina.gob.ar/aaip/datospersonales/inscripcion
2. Trámite gratuito 100% online
3. Te dan un número de inscripción que ponés en la política de privacidad
4. Renovación anual

**Si tenés <50 usuarios podés saltar este paso por ahora**, pero anotalo en pendientes.

---

## 3. Responsabilidad por contenido subido

### El problema

Si un usuario sube un PDF con copyright ajeno (un libro pirateado, por ejemplo), **vos podés ser responsable** por el contenido alojado en tu sitio.

### Solución: cláusula de "Notice & Takedown" (estilo DMCA Argentina)

Ya está incluida en los Términos de Servicio que te preparé. Establece:

1. Vos NO sos responsable de lo que los usuarios suben hasta que tengas conocimiento.
2. Si alguien reclama derechos, tenés 48hs para eliminar el contenido.
3. El usuario que subió es el único responsable.

Esto se conoce como **"safe harbor"** y la jurisprudencia argentina lo acepta (caso Cuevana vs. Yahoo, fallo Belén Rodríguez vs. Google).

### Buenas prácticas

- ✅ Los archivos personales subidos por usuarios son **privados** (RLS de Supabase ya garantiza esto).
- ✅ Solo el dueño y vos como admin los ven.
- ⚠️ Como admin, debés moderar contenido reportado en menos de 48hs.

---

## 4. Cobros y aspectos fiscales

### Si vas a recibir pagos por suscripciones

**Necesitás estar inscripto en AFIP** (no opcional, es ley):

| Tu situación | Categoría sugerida |
|---|---|
| Hasta ~$10M ARS/año facturación | Monotributo **A o B** |
| Más de eso | Categorías superiores o responsable inscripto |

**Cómo inscribirte (gratis, online):**
1. https://serviciosweb.afip.gob.ar/genericos/formularios/F184/F184.aspx
2. Necesitás CUIL + clave fiscal nivel 2
3. Te dan CUIT y categoría
4. Cada mes pagás el monotributo (~$8.000-$15.000 ARS según categoría)

### Mientras NO estés inscripto

⚠️ Cobrar y no facturar es **evasión fiscal**. Riesgos:
- AFIP puede multarte (multas mínimas $50.000 + intereses)
- MercadoPago/Naranja X reportan operaciones grandes
- Imposible legalizar el dinero después

**Mi recomendación:** mientras no tengas monotributo, **NO cobres por la plataforma**. Mantené todo gratuito. Cuando tengas la inscripción (puede ser en 1 día online), activás los planes pagos.

Como alternativa: pedí "donaciones" voluntarias por cafecito.app (Mercado Pago las trata como "donaciones" y simplifica el tema fiscal).

---

## 5. Riesgos específicos de tu plataforma

| Riesgo | Mitigación |
|---|---|
| Usuario sube contenido con copyright ajeno | Términos de Servicio (te los hice) + sistema de reportes (pendiente) |
| Usuario sube contenido inapropiado para menores | Moderación admin + advertencia de edad mínima |
| Filtración de la base de datos | ✅ Supabase tiene RLS + bcrypt + backups diarios |
| Reclamo por uso de fotos sin licencia | Verificá que `img/*.jpg` sean tuyas o de bancos libres (Unsplash, Pexels) |
| MercadoPago cierra tu cuenta por "infracción" | Sin AFIP, riesgo alto. Con AFIP, bajísimo |

### Verificación urgente: tus imágenes

Las 10 imágenes en `img/` (Algebra.jpg, Geometria.jpg, etc.) — ¿son tuyas? Si las bajaste de Google sin verificar la licencia, podrías recibir reclamo. **Recomendación:** reemplazalas por fotos de https://unsplash.com (totalmente gratis y sin atribución obligatoria) o https://www.pexels.com.

---

## 6. Checklist final antes de publicar

### Mínimo legal indispensable
- [ ] Política de Privacidad publicada y enlazada en el footer
- [ ] Términos de Servicio publicados y enlazados en el footer
- [ ] Aviso de copyright en el footer (ya tenés ✅)
- [ ] Aviso de cookies (innecesario si no usás cookies de tracking — Supabase usa localStorage, no requiere aviso)

### Si vas a cobrar
- [ ] Inscripción en AFIP (monotributo)
- [ ] Aviso de "Defensa del Consumidor" (Ley 24.240): link al organismo

### Cuando crezcas
- [ ] Inscripción AAIP cuando pases 50 usuarios
- [ ] Considerar registro DNDA de la obra
- [ ] Considerar marca registrada en INPI ("Matemáticas Activa")

---

## 7. Mientras tanto — cómo arrancar legalmente

**Mi recomendación práctica:**

1. **Mantené el sitio gratuito** hasta que te inscribas en AFIP (puede ser hoy mismo, online).
2. **Mostrá los planes "Próximamente disponible"** en el sitio.
3. Una vez que tengas el CUIT, **activá los pagos** modificando el archivo `scripts.js` (cambiando una constante `PLANES_ACTIVOS = false` → `true`).
4. Generá factura electrónica desde Mis Comprobantes (AFIP) por cada pago.

Esto te permite **empezar a usar la plataforma con usuarios reales sin riesgo fiscal**.

---

## 8. Recursos útiles

- **Lectura completa Ley 25.326:** https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790
- **AAIP - Datos personales:** https://www.argentina.gob.ar/aaip
- **DNDA - Registro de obras:** https://www.argentina.gob.ar/justicia/derechodeautor
- **INPI - Marcas:** https://www.inpi.gob.ar/
- **Defensa del Consumidor:** https://www.argentina.gob.ar/produccion/consumidor
- **AFIP - Monotributo:** https://monotributo.afip.gob.ar/

**Abogados especializados en internet/datos en Argentina** (no es recomendación personal, solo búsqueda en Google):
- Estudio Beccar Varela (corporativo grande)
- Estudio Marval, O'Farrell & Mairal
- Para presupuesto chico: buscá "abogado tecnología derecho informático" en tu ciudad

---

**Última actualización del documento:** mayo 2026.
Algunas regulaciones cambian — verificá las leyes vigentes antes de tomar decisiones importantes.
