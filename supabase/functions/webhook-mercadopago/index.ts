// Edge Function: webhook-mercadopago
// Recibe notificaciones de MercadoPago cuando un pago se aprueba
// y activa automáticamente el plan del usuario en Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLANS: Record<string, { plan: string; dias: number }> = {
  "7000":  { plan: "basico",  dias: 23 },
  "12000": { plan: "premium", dias: 30 },
};

Deno.serve(async (req) => {
  // Solo POST
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();

    // MercadoPago envía { action, type, data: { id } }
    // Solo nos interesan notificaciones de pago
    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), { status: 400 });
    }

    // Consultar la API de MercadoPago para obtener detalles del pago
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) {
      console.error("MP_ACCESS_TOKEN no configurado");
      return new Response(JSON.stringify({ error: "Config error" }), { status: 500 });
    }

    const paymentRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${mpToken}` } }
    );

    if (!paymentRes.ok) {
      console.error("Error consultando pago:", paymentRes.status);
      return new Response(JSON.stringify({ error: "MP API error" }), { status: 502 });
    }

    const payment = await paymentRes.json();

    // Solo procesar pagos aprobados
    if (payment.status !== "approved") {
      console.log(`Pago ${paymentId} status: ${payment.status} — ignorado`);
      return new Response(JSON.stringify({ ok: true, status: payment.status }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // external_reference contiene el user_id de Supabase
    const userId = payment.external_reference;
    if (!userId) {
      console.error("Pago aprobado sin external_reference:", paymentId);
      return new Response(JSON.stringify({ error: "No user reference" }), { status: 400 });
    }

    // Determinar plan por monto
    const monto = String(Math.round(payment.transaction_amount));
    const planInfo = PLANS[monto];
    if (!planInfo) {
      console.error(`Monto no reconocido: ${monto} (pago ${paymentId})`);
      return new Response(JSON.stringify({ error: "Unknown amount" }), { status: 400 });
    }

    // Conectar a Supabase con service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar que no procesamos este pago antes (idempotencia)
    const { data: existente } = await supabase
      .from("historial_pagos")
      .select("id")
      .eq("mp_payment_id", String(paymentId))
      .maybeSingle();

    if (existente) {
      console.log(`Pago ${paymentId} ya procesado — ignorado`);
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Activar plan: calcular nueva fecha de expiración.
    // Fuente de verdad: perfiles.plan + perfiles.plan_hasta (mismos campos que usa
    // el RPC plan_vigente() / admin_activar_plan() en la base). Antes esto solo
    // tocaba premium_hasta y no distinguía basico de premium — se corrige acá.
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("plan, plan_hasta")
      .eq("id", userId)
      .maybeSingle();

    if (!perfil) {
      console.error("Usuario no encontrado:", userId);
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const ahora = Date.now();
    const planVigente = (perfil.plan && perfil.plan !== "gratis" && perfil.plan_hasta && new Date(perfil.plan_hasta).getTime() > ahora)
      ? perfil.plan
      : "gratis";
    // Si renueva el mismo nivel que ya tenía activo, suma días. Si upgradea/baja de nivel
    // o no tenía nada activo, arranca el conteo desde ahora con el nuevo nivel.
    const base = (planVigente === planInfo.plan && perfil.plan_hasta)
      ? new Date(perfil.plan_hasta).getTime()
      : ahora;
    const nuevoHasta = new Date(base + planInfo.dias * 86400000).toISOString();

    // Actualizar perfil (plan_hasta = fuente real; premium_hasta se mantiene en
    // espejo por compatibilidad con código viejo que todavía pudiera leerlo)
    const { error: errPerfil } = await supabase
      .from("perfiles")
      .update({ plan: planInfo.plan, plan_hasta: nuevoHasta, premium_hasta: nuevoHasta })
      .eq("id", userId);

    if (errPerfil) {
      console.error("Error actualizando perfil:", errPerfil);
      return new Response(JSON.stringify({ error: "DB update failed" }), { status: 500 });
    }

    // Registrar en historial_pagos.
    // OJO: la columna "tipo" solo acepta 'activacion' o 'renovacion' — el valor
    // "mercadopago_webhook" que había antes violaba ese check y el insert fallaba
    // en silencio (nunca quedaba registrado el pago). Se corrige acá.
    const { error: errHistorial } = await supabase.from("historial_pagos").insert({
      usuario_id: userId,
      monto: `$ ${payment.transaction_amount}`,
      moneda: "ARS",
      dias_activados: planInfo.dias,
      tipo: planVigente === planInfo.plan ? "renovacion" : "activacion",
      mp_payment_id: String(paymentId),
    });
    if (errHistorial) console.error("Error registrando historial_pagos:", errHistorial);

    console.log(`✅ Plan ${planInfo.plan} activado para ${userId} hasta ${nuevoHasta} (pago ${paymentId})`);

    return new Response(
      JSON.stringify({ ok: true, plan: planInfo.plan, hasta: nuevoHasta }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
