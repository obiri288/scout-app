import { createClient } from '@supabase/supabase-js';

// Konfiguration lesen (z.B. aus .env oder hardcoded für den Test)
const SUPABASE_URL = 'https://wwdfagjgnliwraqrwusc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZGZhZ2pnbmxpd3JhcXJ3dXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MjIwOTksImV4cCI6MjA4MTI5ODA5OX0.CqYfeZG_qrqeHE5PvqVviA-XYMcO0DhG51sKdIKAmJM';

async function main() {
    const supabase = createClient(SUPABASE_URL, ANON_KEY);
    console.log("🚀 Starte Core User Journey Simulation...\n");

    const ts = Date.now();
    const playerEmail = `player_${ts}@test.com`;
    const scoutEmail = `scout_${ts}@test.com`;
    const pass = 'TestPass123!';

    console.log(`[0] Erstelle Test-User: Player (${playerEmail}) und Scout (${scoutEmail})`);

    // Auth - Player
    const { data: authPlayer, error: errPlayer } = await supabase.auth.signUp({ email: playerEmail, password: pass });
    if (errPlayer) throw new Error("Player Auth fehlgeschlagen: " + errPlayer.message);
    const playerId = authPlayer.user.id;

    // Auth - Scout
    const { data: authScout, error: errScout } = await supabase.auth.signUp({ email: scoutEmail, password: pass });
    if (errScout) throw new Error("Scout Auth fehlgeschlagen: " + errScout.message);
    const scoutId = authScout.user.id;

    let successCount = 0;

    // LOG IN AS PLAYER
    await supabase.auth.signInWithPassword({ email: playerEmail, password: pass });

    try {
        // Schritt 1: Onboarding
        console.log(`\n▶️ Schritt 1: Onboarding & Profil-Erstellung (Player UID: ${playerId})`);
        const { data: profile, error: err1 } = await supabase.from('players_master').insert({
            user_id: playerId,
            full_name: 'Max Testspieler',
            primary_position: 'ST',
            date_of_birth: '2005-01-01',
            is_scout: false
        }).select().single();

        if (err1) throw err1;
        console.log(`🟢 Bestanden: Profil erstellt in players_master (ID: ${profile.id})`);
        successCount++;

        // Schritt 2: Content-Erstellung
        console.log(`\n▶️ Schritt 2: Content-Erstellung (Video Upload)`);
        const { data: video, error: err2 } = await supabase.from('media_highlights').insert({
            user_id: playerId,
            video_url: 'https://test.com/video.mp4',
            title: 'Insane Golazo',
            is_public: true
        }).select().single();

        if (err2) throw err2;
        console.log(`🟢 Bestanden: Video in media_highlights eingetragen (ID: ${video.id})`);
        successCount++;

        // LOG IN AS SCOUT
        await supabase.auth.signInWithPassword({ email: scoutEmail, password: pass });

        // Scout Profile
        await supabase.from('players_master').insert({
            user_id: scoutId, full_name: 'Scout Pro', is_scout: true
        });

        // Schritt 3: Watchlist
        console.log(`\n▶️ Schritt 3: Scout-Interaktion (Watchlist)`);
        const { error: err3 } = await supabase.from('scout_watchlist').insert({
            scout_id: scoutId,
            player_id: profile.id
        });

        if (err3) throw err3;
        console.log(`🟢 Bestanden: Spieler auf scout_watchlist gesetzt.`);
        successCount++;

        // Schritt 4: Retention & Ego-Trigger
        // Die Notification wird vom Client API aufgerufen, nicht per DB-Trigger (ausser es gibt einen Trigger).
        // Wir testen hier den API call des Frontends.
        console.log(`\n▶️ Schritt 4: Retention (Notification auslösen)`);
        const { data: notif, error: err4 } = await supabase.from('notifications').insert({
            receiver_id: playerId,
            actor_id: scoutId,
            type: 'watchlist_add',
            read: false
        }).select().single();

        if (err4) throw err4;
        console.log(`🟢 Bestanden: Notification in DB gespeichert (ID: ${notif.id})`);
        successCount++;

        // Schritt 5: Kontaktaufnahme
        console.log(`\n▶️ Schritt 5: Kontaktaufnahme (Direct Message)`);
        const { data: msg, error: err5 } = await supabase.from('direct_messages').insert({
            sender_id: scoutId,
            receiver_id: playerId, // receiver_id is the user_id (UUID)
            content: 'Hallo Max, tolles Video!'
        }).select().single();

        if (err5) throw err5;
        console.log(`🟢 Bestanden: DM in direct_messages gesendet (ID: ${msg.id})`);
        successCount++;

    } catch (e) {
        console.error(`\n🔴 Fehlgeschlagen: ${e.message}`);
    }

    console.log(`\n🏁 Fazit: ${successCount} von 5 Schritten in der DB erfolgreich.`);
}

main().catch(e => console.error("Script Fehler:", e));
