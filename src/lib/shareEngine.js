export const generateShareText = ({ role, isCreator = false, playerName, tags = [] }) => {
    const displayTags = tags.slice(0, 2);
    const tagString = displayTags.join(" & ");
    const hasTags = displayTags.length > 0;

    const fallback = `Sieh dir das Profil von ${playerName} auf CAVIO an.`;

    // Pools with tags
    const pools = {
        scout: [
            `Spannendes Material von ${playerName}. Starke Ansätze bei ${tagString}.`,
            `Profil von ${playerName} gesichert. Lohnt einen Blick, speziell wegen ${tagString}.`,
            `${playerName} ist auf dem Radar. Gutes Profil mit Fokus auf ${tagString}.`
        ],
        player_creator: [
            `Neues Tape ist online! 🎥 Fokus auf ${tagString} heute. Check mein Profil auf CAVIO ab.`,
            `Work in progress. ⏳ Guck dir meine neueste Session auf dem Platz an.`,
            `${playerName} ist live auf CAVIO. ⚽️ Lass ein Feedback da.`
        ],
        player_viewer: [
            `Starkes Highlight von ${playerName} gesehen! 🎥 Fokus auf ${tagString}.`,
            `Sieh dir dieses Tape von ${playerName} auf CAVIO an. Fokus liegt auf ${tagString}.`,
            `Krasses Material von ${playerName} ⚽️ Guck mal rein.`
        ]
    };

    // Fallback pools if no tags are available
    const fallbackPools = {
        scout: [
            `Interessantes Videomaterial zu ${playerName}. Er bringt genau die Attribute mit, die wir aktuell suchen. Sollten wir im Auge behalten.`,
            `Bin auf CAVIO auf ${playerName} aufmerksam geworden. Ein sehr sauberes Profil, das eine genauere Analyse wert ist. Lass uns das bei Gelegenheit besprechen.`,
            `Ich habe ${playerName} auf unsere Watchlist gesetzt. Die aktuellen Aufnahmen machen einen extrem vielversprechenden Eindruck.`
        ],
        player_creator: [
            `Neues Tape ist online! 🎥 Check mein Profil auf CAVIO ab.`,
            `Work in progress. ⏳ Guck dir meine neueste Session auf dem Platz an.`,
            `${playerName} ist live auf CAVIO. ⚽️ Lass ein Feedback da.`
        ],
        player_viewer: [
            `Starkes Highlight von ${playerName} auf CAVIO gesehen! 🎥`,
            `Sieh dir dieses Tape von ${playerName} auf CAVIO an.`,
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
