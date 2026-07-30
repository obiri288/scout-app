/**
 * Generates share text for transfer ("Next Chapter") posts.
 * Uses player name, old club, and new club to produce dynamic, modern messages.
 */
export const generateTransferShareText = ({ playerName, oldClub, newClub }) => {
    const name = playerName || 'Ein Spieler';
    const from = oldClub || 'seinem bisherigen Verein';
    const to = newClub || 'einem neuen Verein';

    const templates = [
        `NEXT CHAPTER ⚽ ${name} wechselt von ${from} zu ${to}. Neues Kapitel, neue Ziele! Verfolge den Weg auf CAVIOS.`,
        `Neues Kapitel für ${name}! 🚀 Der Wechsel von ${from} zu ${to} ist offiziell. Alle Details auf CAVIOS.`,
        `${name} schlägt ein neues Kapitel auf. ✍️ ${from} ➜ ${to}. Schau dir das Profil auf CAVIOS an!`,
        `NEXT CHAPTER: ${name} unterschreibt bei ${to}! ⚽ Kommt von ${from}. Jetzt auf CAVIOS entdecken.`,
        `Offiziell: ${name} startet sein nächstes Kapitel bei ${to}. 🏟️ Alle Infos auf CAVIOS.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
};

export const generateShareText = ({ role, isCreator = false, playerName, tags = [] }) => {
    const displayTags = tags.slice(0, 2);
    const tagString = displayTags.join(" & ");
    const hasTags = displayTags.length > 0;

    const fallback = `Sieh dir das Profil von ${playerName} auf CAVIOS an.`;

    // Pools with tags
    const pools = {
        scout: [
            `Spannendes Material von ${playerName}. Starke Ansätze bei ${tagString}.`,
            `Profil von ${playerName} gesichert. Lohnt einen Blick, speziell wegen ${tagString}.`,
            `${playerName} ist auf dem Radar. Gutes Profil mit Fokus auf ${tagString}.`
        ],
        player_creator: [
            `Neues Tape ist online! 🎥 Fokus auf ${tagString} heute. Check mein Profil auf CAVIOS ab.`,
            `Work in progress. ⏳ Guck dir meine neueste Session auf dem Platz an.`,
            `${playerName} ist live auf CAVIOS. ⚽️ Lass ein Feedback da.`
        ],
        player_viewer: [
            `Starkes Highlight von ${playerName} gesehen! 🎥 Fokus auf ${tagString}.`,
            `Sieh dir dieses Tape von ${playerName} auf CAVIOS an. Fokus liegt auf ${tagString}.`,
            `Krasses Material von ${playerName} ⚽️ Guck mal rein.`
        ]
    };

    // Fallback pools if no tags are available
    const fallbackPools = {
        scout: [
            `Interessantes Videomaterial zu ${playerName}. Er bringt genau die Attribute mit, die wir aktuell suchen. Sollten wir im Auge behalten.`,
            `Bin auf CAVIOS auf ${playerName} aufmerksam geworden. Ein sehr sauberes Profil, das eine genauere Analyse wert ist. Lass uns das bei Gelegenheit besprechen.`,
            `Ich habe ${playerName} auf unsere Watchlist gesetzt. Die aktuellen Aufnahmen machen einen extrem vielversprechenden Eindruck.`
        ],
        player_creator: [
            `Neues Tape ist online! 🎥 Check mein Profil auf CAVIOS ab.`,
            `Work in progress. ⏳ Guck dir meine neueste Session auf dem Platz an.`,
            `${playerName} ist live auf CAVIOS. ⚽️ Lass ein Feedback da.`
        ],
        player_viewer: [
            `Starkes Highlight von ${playerName} auf CAVIOS gesehen! 🎥`,
            `Sieh dir dieses Tape von ${playerName} auf CAVIOS an.`,
            `Krasses Material von ${playerName} ⚽️ Guck mal rein.`
        ]
    };

    let resolvedRole = role;
    if (role === 'player') {
        resolvedRole = isCreator ? 'player_creator' : 'player_viewer';
    }

    const currentPool = hasTags ? pools[resolvedRole] || pools.scout : fallbackPools[resolvedRole] || fallbackPools.scout;

    if (currentPool && currentPool.length > 0) {
        const randomIndex = Math.floor(Math.random() * currentPool.length);
        return currentPool[randomIndex];
    }

    return fallback;
};
