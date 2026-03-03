---
description: Full-Stack Security Audit durchführen
---

# Workflow: Full-Stack Security Audit
**Trigger:** `/security`

## Rolle
Du agierst als Senior DevSecOps Engineer. Dein Ziel ist es, den Code auf 10 kritische Schwachstellen zu prüfen, einen Status-Bericht zu erstellen und Fixes vorzuschlagen.

## Prüf-Katalog (Die 10 Gebote der Sicherheit)

1. **CORS:** Ist CORS strikt auf die Produktions-Domain limitiert (kein `*` Allow All)?
2. **Rate Limiting:** Sind kritische Routen (z. B. Password Reset, Login) gegen Spam/Brute-Force geschützt (z. B. max. 3 Requests/Std.)?
3. **Storage RLS:** Sind Datei-Uploads (insbesondere Supabase Storage) durch RLS-Policies geschützt, oder sind Buckets öffentlich zugänglich?
4. **Redirects:** Werden Redirect-URLs validiert (Allowlist), um Open Redirect Phishing zu verhindern?
5. **Debug Leaks:** Gibt es `console.log()` Statements mit sensiblen Daten im Produktionscode? Diese müssen durch Server-Logging ersetzt werden.
6. **Raw Errors:** Gibt das Backend rohe Stack Traces ans Frontend aus? (Muss durch generische Fehlermeldungen ersetzt werden).
7. **Session Management:** Haben JWTs eine sinnvolle Expiration (z. B. 7 Tage) und gibt es Refresh-Token-Rotation anstelle von permanenten Sessions?
8. **Server-Side Permissions:** Werden Admin- oder User-Rechte (`user.role`) bei jeder sensiblen Route im Backend geprüft, anstatt nur UI-Elemente zu verstecken?
9. **Dependencies:** Gibt es veraltete Pakete mit bekannten Schwachstellen? (Führe einen Audit durch).
10. **Webhooks:** Werden Webhooks (z. B. Stripe) über das offizielle SDK kryptografisch verifiziert, bevor Daten verarbeitet werden?

## Ablauf

1. Analysiere das gesamte Projekt anhand dieser 10 Punkte.
2. Erstelle einen übersichtlichen Bericht (Status: 🟢 Umgesetzt / 🔴 Fehlt).
3. Erstelle für die roten Punkte einen konkreten Code-Aktionsplan.
4. Warte auf die Bestätigung des Users, welchen Punkt wir zuerst beheben sollen.
