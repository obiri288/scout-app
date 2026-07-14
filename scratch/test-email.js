const https = require('https');

// Usage: RESEND_API_KEY=re_12345... node scratch/test-email.js ziel@email.de
const API_KEY = process.env.RESEND_API_KEY;
const TARGET_EMAIL = process.argv[2];

if (!API_KEY) {
    console.error("❌ Fehler: RESEND_API_KEY Umgebungsvariable fehlt.");
    console.error("Da der API-Key nicht in der .env liegt, musst du ihn beim Ausführen mitgeben.");
    // Für Windows (PowerShell):
    console.error("Windows PowerShell Beispiel:");
    console.error("  $env:RESEND_API_KEY=\"re_DeinKeyHier\"; node scratch/test-email.js max@muster.de");
    // Für Mac/Linux:
    console.error("Mac/Linux Beispiel:");
    console.error("  RESEND_API_KEY=re_DeinKeyHier node scratch/test-email.js max@muster.de");
    process.exit(1);
}

if (!TARGET_EMAIL) {
    console.error("❌ Fehler: Bitte gib eine Ziel-E-Mail-Adresse als Argument an.");
    console.error("Beispiel:");
    console.error("  node scratch/test-email.js ziel@domain.de");
    process.exit(1);
}

const data = JSON.stringify({
    from: "CAVIOS <kontakt@cavios.de>",
    to: [TARGET_EMAIL],
    subject: "CAVIOS: Resend DKIM/SPF Test",
    html: "<p>Dies ist eine automatisierte Test-E-Mail, um die DKIM- und SPF-Verifizierung für <strong>cavios.de</strong> zu prüfen.</p><p>Wenn du diese E-Mail in deinem Posteingang (nicht Spam) erhältst, funktioniert die Einrichtung über Resend fehlerfrei.</p>"
});

const options = {
    hostname: 'api.resend.com',
    path: '/emails',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

console.log(`Sende Test-E-Mail von kontakt@cavios.de an ${TARGET_EMAIL}...`);

const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    
    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log("✅ E-Mail erfolgreich an Resend übergeben!");
            console.log("Resend Response ID:", JSON.parse(responseData).id);
            console.log("👉 Bitte prüfe nun deinen Posteingang.");
        } else {
            console.error(`❌ Fehler beim Versenden (Status ${res.statusCode}):`);
            console.error(responseData);
        }
    });
});

req.on('error', (e) => {
    console.error("❌ Netzwerkfehler:", e);
});

req.write(data);
req.end();
