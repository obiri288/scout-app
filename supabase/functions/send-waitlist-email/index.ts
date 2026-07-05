import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS Preflight Request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const reqSecret = req.headers.get("x-webhook-secret");
    if (!WEBHOOK_SECRET || reqSecret !== WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }

    const payload = await req.json();
    console.log("Received Webhook Payload:", JSON.stringify(payload, null, 2));

    // Supabase Webhook sends the record inside the 'record' object
    // For direct invocations, we support fallback directly to root 'email'
    const record = payload.record || payload;
    const email = record.email;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email address in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CAVIOS Premium HTML Mail Template
    const htmlContent = `
      <div style="background-color: #020617; color: #e2e8f0; font-family: Arial, sans-serif; padding: 40px 20px; line-height: 1.6; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; padding: 40px; border-radius: 12px; border: 1px solid #1e293b;">
          <img src="https://wwdfagjgnliwraqrwusc.supabase.co/storage/v1/object/public/assets/image.png" alt="CAVIOS" style="max-height: 55px; width: auto; object-fit: contain; margin-bottom: 30px; display: inline-block; filter: drop-shadow(0 2px 8px rgba(34, 211, 238, 0.15));" />
          <h2 style="color: #f8fafc; font-size: 20px; margin-bottom: 24px;">Deine Position auf der CAVIOS Warteliste ist bestätigt.</h2>
          <p style="text-align: left; margin-bottom: 16px;">Deine E-Mail-Adresse wurde erfolgreich in unserem System hinterlegt.</p>
          <p style="text-align: left; margin-bottom: 16px;">CAVIOS ist kein gewöhnliches Netzwerk. Wir bauen die exklusivste digitale Infrastruktur für modernes Scouting – eine Plattform, auf der Leistungsdaten, verifizierte Karrierestationen und professionelle Verbindungen die Währung sind.</p>
          <p style="text-align: left; margin-bottom: 16px;">Um die höchste Qualität und Performance unseres Ökosystems zu garantieren, gewähren wir den Zugang zum Launch nur in streng limitierten Wellen.</p>
          <p style="text-align: left; margin-bottom: 24px;">Deine Position auf der Warteliste ist gesichert. Sobald dein Profil zur Verifizierung freigeschaltet werden kann, benachrichtigen wir dich als Ersten.</p>
          <p style="text-align: left; margin-bottom: 32px; font-weight: bold; color: #22d3ee;">Bereite dich vor. Die Zukunft des Scoutings beginnt bald.</p>
          <p style="text-align: left; font-size: 14px; color: #94a3b8;">Sportliche Grüße,<br><strong style="color: #f8fafc;">Das CAVIOS Team</strong></p>
        </div>
      </div>
    `;

    // Resend API Request
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CAVIOS <kontakt@cavios.de>",
        to: [email],
        subject: "Status: Bestätigt. Deine Position auf der CAVIOS Warteliste.",
        html: htmlContent,
      }),
    });

    const responseData = await response.json();
    console.log("Resend API response:", JSON.stringify(responseData));

    if (!response.ok) {
      throw new Error(`Resend API failed: ${JSON.stringify(responseData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, id: responseData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing request:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
