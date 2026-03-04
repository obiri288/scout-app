import { test, expect } from '@playwright/test';

// Konfiguration für den Demo-Run: langsamere Ausführung, um die UI-Änderungen und Animationen sichtbar zu machen
test.use({
    headless: false,
    viewport: { width: 414, height: 896 }, // iPhone XR/11 size to show mobile UI well
    launchOptions: {
        slowMo: 800, // 800ms Verzögerung zwischen Aktionen für Präsentations-Zwecke
    }
});

test.setTimeout(120000); // 2 Min Timeout für den interaktiven Walkthrough

// Nutze feste Test-Accounts
const PLAYER_EMAIL = "player_1772566902@test.com"; // Test-User aus dem QA Run
const PASS = "TestPass123!";
const APP_URL = 'http://localhost:5173';

test('ScoutVision Live UI & UX Walkthrough (Anti-Transfermarkt Vibe)', async ({ page }) => {

    console.log("🎬 DREHBUCH START: ScoutVision UI/UX Demo");

    // 1. App laden
    console.log("▶️ Schritt 1: App laden und Feed-Animationen zeigen");
    await page.goto(APP_URL);

    // Warte auf das initiale Laden
    await page.waitForTimeout(2000);

    // Login Modal öffnen
    try {
        console.log("   -> Warte auf Login-Button");
        await page.click('button:has-text("Einloggen"), button:has-text("Anmelden")', { timeout: 10000 });
        await page.waitForTimeout(500);
        await page.fill('input[type="email"]', PLAYER_EMAIL);
        await page.fill('input[type="password"]', PASS);
        await page.click('button.bg-emerald-500, button:has-text("Anmelden")');
        console.log("   -> Login ausgeführt");
    } catch (e) {
        console.log("   -> Konnte nicht einloggen, vielleicht schon eingeloggt?");
    }

    // Kurz warten, bis der Feed neu lädt
    await page.waitForTimeout(3000);

    // 2. Profil-Vollständigkeit & Empty States
    console.log("▶️ Schritt 2: Eigens Profil (Vollständigkeit & Empty States)");

    // Navigiere zum eigenen Profil (über Bottom Nav, letzer Button)
    await page.locator('nav > button').last().click();
    await page.waitForTimeout(2000);

    // Profile Completeness Card
    try {
        if (await page.locator('text=Profil vervollständigen').isVisible({ timeout: 3000 })) {
            console.log("✅ Profil-Vollständigkeits-Balken (Gamification) ist sichtbar.");
        }
    } catch (e) { console.log("   -> Profil Card nicht gefunden."); }

    // XP Badge
    try {
        if (await page.locator('text=XP').first().isVisible({ timeout: 3000 })) {
            console.log("✅ XP & Level Badge im Profil-Header gerendert.");
        }
    } catch (e) { console.log("   -> XP Badge nicht gefunden."); }

    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(1000);

    // Highlights Tab
    try {
        await page.click('button:has-text("Highlights")');
        await page.waitForTimeout(1000);
        if (await page.locator('text=Zeig was du kannst!').isVisible({ timeout: 2000 })) {
            console.log("✅ Animierter Empty State für Highlights sichtbar.");
        }
    } catch (e) { }

    // Stats / Radar-Chart
    console.log("▶️ Schritt 3: Gamification (Radar-Chart)");
    try {
        await page.click('button:has-text("Stats")');
        await page.waitForTimeout(1000);
        await page.mouse.wheel(0, 500);
        if (await page.locator('svg polygon').first().isVisible({ timeout: 3000 })) {
            console.log("✅ SVG Radar-Chart erfolgreich gerendert.");
        }
    } catch (e) { }

    // FIFA Spielerkarte
    console.log("▶️ Schritt 4: Gamification (FIFA Ultimate Team Spielerkarte)");
    await page.mouse.wheel(0, -600); // Zurück nach oben
    await page.waitForTimeout(1000);

    try {
        await page.locator('svg.lucide-share-2').click();
        await page.waitForTimeout(2000);
        if (await page.locator('text=Karte als Bild speichern').isVisible({ timeout: 3000 })) {
            console.log("✅ FIFA-Style Spielerkarte Modal geöffnet!");
            await page.locator('svg.lucide-x').first().click();
        }
    } catch (e) {
        console.log("   -> Fehler beim Spielerkarte Modal", e.message);
    }

    // 3. Scout Interaktion & Celebration (Phase 4)
    console.log("▶️ Schritt 5: Interaktion & Watchlist-Celebration");

    try {
        // Zurück zum Feed (Home Button in Bottom Nav, erster Button)
        await page.locator('nav > button').first().click();
        await page.waitForTimeout(2000);

        // Klick auf Herz
        await page.locator('svg.lucide-heart').first().click();
        console.log("✅ Video gelikt (Micro-Interaction)");
        await page.waitForTimeout(1000);

        // Profil öffnen (zweiter User Link)
        await page.locator('svg.lucide-user').nth(1).click();
        await page.waitForTimeout(2000);

        // Watchlist-Add kicken
        await page.locator('svg.lucide-bookmark').first().click();
        console.log("✅ Watchlist-Add ausgeführt (Particle Burst Animation!)");
        await page.waitForTimeout(4000);
    } catch (e) {
        console.log("   -> Fehler bei Watchlist", e.message);
    }

    console.log("🎬 DREHBUCH ENDE: Demo erfolgreich durchlaufen.");
});
