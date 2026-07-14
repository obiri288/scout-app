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

    // Supabase Webhook sends the record inside the 'record' object (on INSERT/UPDATE)
    const record = payload.record || payload;
    const email = record.email;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email address in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CAVIOS Premium HTML Mail Template (Dark Mode, Cyan Accents)
    const htmlContent = `
      <div style="background-color: #020617; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; line-height: 1.6; text-align: center;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #0f172a; padding: 40px; border-radius: 16px; border: 1px solid #1e293b; text-align: left; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);">
          
          <!-- Logo Section -->
          <div style="text-align: center; margin-bottom: 35px;">
            <img src="https://wwdfagjgnliwraqrwusc.supabase.co/storage/v1/object/public/assets/image.png" alt="CAVIOS" style="max-height: 50px; width: auto; object-fit: contain; filter: drop-shadow(0 2px 10px rgba(34, 211, 238, 0.25));" />
          </div>

          <!-- Header -->
          <h2 style="color: #f8fafc; font-size: 22px; font-weight: 700; margin-bottom: 24px; text-align: center; background: linear-gradient(to right, #22d3ee, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Willkommen im exklusiven CAVIOS-Netzwerk
          </h2>

          <!-- Content -->
          <p style="font-size: 16px; margin-bottom: 20px; color: #cbd5e1;">Hallo,</p>
          
          <p style="font-size: 15px; margin-bottom: 20px; color: #94a3b8; line-height: 1.7;">
            deine Registrierung war erfolgreich. <strong>Du stehst offiziell auf der VIP-Warteliste.</strong>
          </p>

          <p style="font-size: 15px; margin-bottom: 24px; color: #94a3b8; line-height: 1.7;">
            CAVIOS schafft eine exklusive, datenbasierte Infrastruktur für modernes Scouting. Hier verbinden wir verifizierte Leistungsdaten, Karriereprofile und professionelle Scouts auf höchstem Niveau.
          </p>

          <!-- Call to Action -->
          <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; border: 1px dashed #334155; margin-bottom: 30px; text-align: center;">
            <p style="font-size: 15px; margin-bottom: 16px; color: #38bdf8; font-weight: 600;">Verpasse keine Updates bis zum offiziellen Launch!</p>
            <a href="https://instagram.com/cavios.de" target="_blank" style="display: inline-block; background-color: #22d3ee; color: #020617; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 14px rgba(34, 211, 238, 0.3); transition: all 0.2s ease;">
              Folge uns auf Instagram @cavios.de
            </a>
          </div>

          <!-- Divider -->
          <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;" />

          <!-- Footer -->
          <p style="font-size: 14px; color: #94a3b8; margin-bottom: 0;">
            Sportliche Grüße,<br>
            <strong style="color: #f8fafc;">Das CAVIOS Team</strong>
          </p>
          
          <p style="font-size: 11px; color: #64748b; margin-top: 25px; text-align: center; line-height: 1.4;">
            Du erhältst diese E-Mail, weil du dich auf cavios.de eingetragen hast.<br>
            &copy; 2026 CAVIOS. Alle Rechte vorbehalten.
          </p>
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
        subject: "Willkommen im exklusiven CAVIOS-Netzwerk 🚀",
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
