/**
 * test-rls.js
 * 
 * Testet, ob die Supabase RLS-Policies unauthentifizierte Leseoperationen
 * blockieren. Verwendet NUR den anon-key (kein Auth-Token).
 */

const SUPABASE_URL = 'https://wwdfagjgnliwraqrwusc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZGZhZ2pnbmxpd3JhcXJ3dXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MjIwOTksImV4cCI6MjA4MTI5ODA5OX0.CqYfeZG_qrqeHE5PvqVviA-XYMcO0DhG51sKdIKAmJM';

const TABLES_TO_TEST = [
    'players_master',
    'direct_messages',
    'scout_watchlist',
    'notifications',
    'media_highlights',
    'blocked_users',
];

async function testTable(tableName) {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=5`;
    const res = await fetch(url, {
        headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
        },
    });

    const body = await res.text();
    let parsed;
    try {
        parsed = JSON.parse(body);
    } catch {
        parsed = body;
    }

    const rowCount = Array.isArray(parsed) ? parsed.length : null;
    const blocked = res.status === 200 && rowCount === 0;
    const forbidden = res.status === 401 || res.status === 403;

    return {
        table: tableName,
        status: res.status,
        rowsReturned: rowCount,
        rlsBlocked: blocked || forbidden,
        detail: forbidden
            ? `HTTP ${res.status} – Zugriff verweigert`
            : blocked
                ? '0 Zeilen zurückgegeben – RLS blockiert Lesezugriff'
                : `⚠️  ${rowCount} Zeilen zurückgegeben – Daten sind öffentlich lesbar!`,
    };
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   RLS-Policy Test – Unauthentifizierter Zugriff        ║');
    console.log('║   (nur anon-key, kein User-Token)                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log();

    const results = [];

    for (const table of TABLES_TO_TEST) {
        const result = await testTable(table);
        results.push(result);

        const icon = result.rlsBlocked ? '✅' : '❌';
        console.log(`${icon}  ${result.table.padEnd(20)} → ${result.detail}`);
    }

    console.log();
    console.log('─'.repeat(58));

    const allBlocked = results.every((r) => r.rlsBlocked);
    if (allBlocked) {
        console.log('✅  ERGEBNIS: Alle getesteten Tabellen sind durch RLS geschützt.');
    } else {
        const leaky = results.filter((r) => !r.rlsBlocked).map((r) => r.table);
        console.log(`❌  WARNUNG: Folgende Tabellen sind NICHT geschützt: ${leaky.join(', ')}`);
    }
}

main().catch(console.error);
