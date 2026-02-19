import React, { useState, useEffect } from 'react';
import { User, Shield, ChevronRight, Sparkles, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateAge } from '../lib/helpers';

/**
 * Shows similar players based on:
 * 1. Same position (highest weight)
 * 2. Same city/region
 * 3. Similar age (±3 years)
 * 4. Same league level
 */
export const SimilarPlayers = ({ player, onUserClick }) => {
    const [similar, setSimilar] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!player) return;

        const findSimilar = async () => {
            try {
                // Fetch candidates: same position OR same city
                const { data } = await supabase.from('players_master')
                    .select('*, clubs(*)')
                    .neq('id', player.id)
                    .limit(100);

                if (!data) { setLoading(false); return; }

                const playerAge = player.birth_date ? calculateAge(player.birth_date) : null;

                // Score each candidate
                const scored = data.map(p => {
                    let score = 0;

                    // Position match (strongest signal)
                    if (p.position_primary === player.position_primary) score += 5;
                    if (p.position_secondary === player.position_primary) score += 2;
                    if (player.position_secondary && p.position_primary === player.position_secondary) score += 2;

                    // City match
                    if (player.city && p.city && p.city.toLowerCase() === player.city.toLowerCase()) score += 4;

                    // Same region (zip prefix match)
                    if (player.zip_code && p.zip_code && p.zip_code.substring(0, 2) === player.zip_code.substring(0, 2)) score += 2;

                    // Age similarity (±3 years)
                    if (playerAge && p.birth_date) {
                        const pAge = calculateAge(p.birth_date);
                        const ageDiff = Math.abs(playerAge - pAge);
                        if (ageDiff <= 1) score += 3;
                        else if (ageDiff <= 3) score += 2;
                        else if (ageDiff <= 5) score += 1;
                    }

                    // Same league level
                    if (player.clubs?.league && p.clubs?.league && p.clubs.league === player.clubs.league) score += 2;

                    // Same transfer status
                    if (player.transfer_status && p.transfer_status === player.transfer_status) score += 1;

                    // Same strong foot
                    if (player.strong_foot && p.strong_foot === player.strong_foot) score += 1;

                    // Same nationality
                    if (player.nationality && p.nationality === player.nationality) score += 1;

                    return { ...p, _score: score };
                });

                // Sort by score, take top 6
                const top = scored
                    .filter(p => p._score >= 3) // Minimum relevance
                    .sort((a, b) => b._score - a._score)
                    .slice(0, 6);

                setSimilar(top);
            } catch (e) {
                console.warn("Similar players error:", e);
            } finally {
                setLoading(false);
            }
        };

        findSimilar();
    }, [player]);

    if (loading || similar.length === 0) return null;

    return (
        <div className="px-4 py-6 border-t border-white/5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" /> Ähnliche Spieler
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {similar.map(p => (
                    <div
                        key={p.id}
                        onClick={() => onUserClick(p)}
                        className="shrink-0 w-28 flex flex-col items-center text-center cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden border-2 border-white/10 mb-2 group-hover:border-blue-500 transition shadow-lg">
                            {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <User size={24} className="text-zinc-500 m-5" />}
                        </div>
                        <div className="text-xs font-bold text-white truncate w-full group-hover:text-blue-400 transition">{p.full_name}</div>
                        <div className="text-[10px] text-zinc-500 truncate w-full flex items-center justify-center gap-1 mt-0.5">
                            <Shield size={8} /> {p.clubs?.name || 'Vereinslos'}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-300 font-bold">{p.position_primary}</span>
                            {p.city && <span className="text-[9px] text-zinc-600 flex items-center gap-0.5"><MapPin size={7} />{p.city}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
