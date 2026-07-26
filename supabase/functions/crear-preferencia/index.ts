// Edge Function: crear-preferencia
// Genera un link de pago de MercadoPago con el user_id como external_reference
// para que el webhook pueda asociar el pago con el usuario.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLANES: Record<string, { title: string; price: number; dias: number }> = {
  basico:  { title: "Plan Básico — Matemáticas Activa",  price: 7000,  dias: 23 },
  premium: { title: "Plan Premium — Matemáticas Activa", price: 12000, dias: 30 },
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
  }

  try {
    // Verificar que el usuario está autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonRes({ error: "No auth" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    // Obtener plan solicitado
    const { plan } = await req.json();
    const planInfo = PLANES[plan];
    if (!planInfo) {
      return jsonRes({ error: "Plan inválido. Usar: basico o premium" }, 400);
    }

    // Obtener username para mostrar en MercadoPago
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) {
      return jsonRes({ error: "Config error" }, 500);
    }

    // Crear preferencia en MercadoPago
    const preference = {
      items: [{
        title: planInfo.title,
        quantity: 1,
        unit_price: planInfo.price,
        currency_id: "ARS",
      }],
      external_reference: user.id,  // Clave: asocia pago → usuario
      metadata: {
        user_id: user.id,
        username: perfil?.username || "",
        plan: plan,
        dias: planInfo.dias,
      },
      back_urls: {
        success: "https://matematicasactivas.com/?pago=ok",
        failure: "https://matematicasactivas.com/?pago=error",
        pending: "https://matematicasactivas.com/?pago=pendiente",
      },
      auto_return: "approved",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-mercadopago`,
      statement_descriptor: "MATEMATICAS ACTIVA",
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24hs
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const errBody = await mpRes.text();
      console.error("Error MP:", mpRes.status, errBody);
      return jsonRes({ error: "MercadoPago error" }, 502);
    }

    const mpData = await mpRes.json();

    return jsonRes({
      ok: true,
      init_point: mpData.init_point,        // URL de pago
      sandbox_init_point: mpData.sandbox_init_point,
      id: mpData.id,
    });

  } catch (err) {
    console.error("Error crear-preferencia:", err);
    return jsonRes({ error: "Internal error" }, 500);
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}
