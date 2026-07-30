import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.warn("Missing RESEND_API_KEY, logging email approval fallback:", email);
      return new Response(
        JSON.stringify({ success: true, warning: "RESEND_API_KEY missing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>VIP Access Unlocked</title>
      </head>
      <body style="background-color: #020617; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; margin: 0;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #0f172a; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.1); padding: 40px 32px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          
          <!-- Logo -->
          <div style="margin-bottom: 32px;">
            <img src="https://wwdfagjgnliwraqrwusc.supabase.co/storage/v1/object/public/assets/image.png" alt="CAVIOS" style="max-height: 52px; width: auto; object-fit: contain; filter: drop-shadow(0 0 15px rgba(34, 211, 238, 0.3));" />
          </div>

          <!-- Badge -->
          <div style="display: inline-block; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 9999px; padding: 6px 16px; margin-bottom: 24px;">
            <span style="color: #22d3ee; font-size: 12px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">Exklusiver VIP-Zugang</span>
          </div>

          <!-- Heading -->
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0 0 16px 0;">
            Du wurdest freigeschaltet! 🚀
          </h1>

          <!-- Body -->
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;">
            Gute Nachrichten: Dein Zugang für die exklusive Closed Beta von <strong>CAVIOS</strong> wurde offiziell von unserem Team freigeschaltet.
          </p>

          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0; text-align: left;">
            Du kannst dich ab sofort auf unserer Plattform anmelden und dein digitales Profil einrichten.
          </p>

          <!-- Call To Action Button -->
          <div style="margin-bottom: 36px;">
            <a href="https://cavios.de/?login=true&beta=CAVIOS-vip" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #ffffff; font-weight: 800; font-size: 15px; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 0 25px rgba(34, 211, 238, 0.4);">
              Jetzt bei CAVIOS anmelden &rarr;
            </a>
          </div>

          <!-- Login Tips -->
          <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px 20px; margin-bottom: 32px; text-align: left;">
            <p style="color: #cbd5e1; font-size: 13px; font-weight: 700; margin: 0 0 6px 0;">💡 So meldest du dich an:</p>
            <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">
              Klicke einfach auf den Button oben und wähle <strong>„Mit Google anmelden“</strong> oder nutze deine E-Mail-Adresse <code style="color: #22d3ee;">${email}</code>.
            </p>
          </div>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 28px 0;" />
          
          <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
            Willkommen an Bord.<br>
            <strong style="color: #94a3b8;">Das CAVIOS Team</strong>
          </p>

        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CAVIOS <auth@cavios.de>",
        to: [email],
        subject: "Dein exklusiver CAVIOS VIP-Zugang ist freigeschaltet! 🚀",
        html: htmlContent,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Resend API failed:", responseData);
      throw new Error(`Resend API failed: ${JSON.stringify(responseData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, id: responseData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("VIP Approval Email Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
