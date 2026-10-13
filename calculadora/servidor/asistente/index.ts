// =======================================================================
// ASISTENTE CON IA · Función de borde de Supabase ("asistente")
// Recibe la duda del alumno sobre UN paso de la resolución y responde con
// Claude. La clave de la API nunca llega al navegador: vive como secreto.
//
// Publicar (con la CLI de Supabase, desde la carpeta Calculadora):
//   supabase functions deploy asistente --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      (obligatorio)
//   supabase secrets set LIMITE_DIARIO=30                  (consultas por día y por persona; opcional)
//   supabase secrets set ORIGENES=https://tusitio.com      (desde dónde se puede usar; opcional)
//   supabase secrets set MODELO=claude-haiku-5-5           (opcional)
// Después, en datos/plataforma.json → asistente.url poné
//   https://<proyecto>.supabase.co/functions/v1/asistente
// =======================================================================

const MODELO = Deno.env.get('MODELO') || 'claude-haiku-5-5';
const LIMITE = Number(Deno.env.get('LIMITE_DIARIO') || 30);
const ORIGENES = (Deno.env.get('ORIGENES') || '*').split(',').map((s) => s.trim());
const API = Deno.env.get('ANTHROPIC_URL') || 'https://api.anthropic.com/v1/messages';

const SISTEMA = `Sos un tutor de matemática de Matemáticas Activa (Argentina). Hablás en español rioplatense, con voseo, de forma clara, cálida y breve.
Un alumno está mirando la resolución paso a paso de un ejercicio y no entiende UN paso. Tu tarea:
- Explicá solo ese paso: de dónde sale, qué regla o propiedad se usa y por qué se hace.
- Usá palabras simples y, si ayuda, un ejemplo chiquito con otros números.
- Escribí las fórmulas en LaTeX entre signos $…$ (por ejemplo $x^2-4=(x-2)(x+2)$). No uses $$.
- Respuestas cortas: 3 a 8 oraciones, o una lista breve con guiones. Sin títulos.
- No resuelvas otros ejercicios distintos ni hagas la tarea del alumno: si te pide eso, guialo con una pregunta o una pista.
- Si la pregunta no es de matemática, decí amablemente que solo podés ayudar con este ejercicio.
- Si notás que la resolución tiene un error, decilo con claridad.`;

const cors = (origen) => ({
  'Access-Control-Allow-Origin': ORIGENES.includes('*') ? '*' : (ORIGENES.includes(origen || '') ? origen : ORIGENES[0]),
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const responder = (cuerpo, estado, origen) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json', ...cors(origen) } });
const recortar = (s, n) => String(s ?? '').slice(0, n);

async function huella(texto) {
  const datos = new TextEncoder().encode(texto + (Deno.env.get('SAL') || 'mpp'));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', datos))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
// Límite diario por persona (huella de la IP), con la tabla uso_asistente (servidor/supabase.sql)
async function dentroDelLimite(req) {
  const url = Deno.env.get('SUPABASE_URL'), clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave || !LIMITE) return true;
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sin-ip';
  try {
    const r = await fetch(`${url}/rest/v1/rpc/sumar_uso_asistente`, { method: 'POST', headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_quien: await huella(ip), p_limite: LIMITE }) });
    return r.ok ? await r.json() : true;
  } catch (_e) { return true; }
}

Deno.serve(async (req) => {
  const origen = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origen) });
  if (req.method !== 'POST') return responder({ error: 'Usá POST.' }, 405, origen);
  if (!ORIGENES.includes('*') && origen && !ORIGENES.includes(origen)) return responder({ error: 'Origen no permitido.' }, 403, origen);
  const claveApi = Deno.env.get('ANTHROPIC_API_KEY'); if (!claveApi) return responder({ error: 'Falta configurar ANTHROPIC_API_KEY.' }, 500, origen);
  let d; try { d = await req.json(); } catch (_e) { return responder({ error: 'Pedido inválido.' }, 400, origen); }
  const pregunta = recortar(d.pregunta, 500).trim(); if (!pregunta) return responder({ error: 'Escribí tu pregunta.' }, 400, origen);
  if (!(await dentroDelLimite(req))) return responder({ error: `Llegaste al límite de ${LIMITE} preguntas por hoy. Mañana podés seguir.` }, 429, origen);

  const pasos = (Array.isArray(d.pasos) ? d.pasos : []).slice(0, 25).map((p, i) => `Paso ${i + 1}: ${recortar(p.titulo, 120)}. ${recortar(p.texto, 400)} ${(Array.isArray(p.mates) ? p.mates : []).slice(0, 4).map((m) => '$' + recortar(m, 300) + '$').join(' ')}`);
  const n = Math.max(0, Math.min(pasos.length - 1, Number(d.paso) || 0));
  const contexto = `Ejercicio: ${recortar(d.ejercicio, 300)}\nTema: ${recortar(d.nombreTema || d.tema, 80)} (${recortar(d.area, 40)})\nNivel del alumno: ${d.nivel === 'universidad' ? 'universidad' : 'secundaria'}\n\nResolución completa:\n${pasos.join('\n')}\nResultado: $${recortar(d.resultado, 300)}$\n\nEl alumno pregunta sobre el PASO ${n + 1}: ${pasos[n] || ''}`;
  // Conversación: lo anterior (alumno / asistente) + la pregunta nueva, alternando roles; el contexto va en el primer mensaje
  const turnos = [...(Array.isArray(d.historial) ? d.historial : []).slice(-6), { rol: 'alumno', texto: pregunta }]
    .map((m) => ({ role: m.rol === 'asistente' ? 'assistant' : 'user', content: recortar(m.texto, 1500) })).filter((m) => m.content);
  while (turnos.length && turnos[0].role !== 'user') turnos.shift();
  const mensajes = [];
  for (const m of turnos) { const ult = mensajes[mensajes.length - 1]; if (ult && ult.role === m.role) ult.content += '\n\n' + m.content; else mensajes.push({ ...m }); }
  mensajes[0].content = contexto + '\n\nPregunta del alumno: ' + mensajes[0].content;

  try {
    const r = await fetch(API, { method: 'POST', headers: { 'x-api-key': claveApi, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: MODELO, max_tokens: 700, system: SISTEMA, messages: mensajes }) });
    const j = await r.json();
    if (!r.ok) return responder({ error: 'El asistente no está disponible en este momento.', detalle: j?.error?.type }, 502, origen);
    const texto = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return responder({ texto: texto || 'No pude armar una respuesta. Probá preguntarlo de otra forma.' }, 200, origen);
  } catch (_e) { return responder({ error: 'No pude conectarme con el asistente.' }, 502, origen); }
});
