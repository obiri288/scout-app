import React, { useState, useEffect } from 'react';
import { X, Search, User, Shield, ChevronRight, ArrowLeftRight, Plus, Crown, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, cardStyle } from '../lib/styles';
import { calculateAge } from '../lib/helpers';

export const CompareModal = ({ onClose, initialPlayer }) => {
    const [playerA, setPlayerA] = useState(initialPlayer || null);
    const [playerB, setPlayerB] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectingSlot, setSelectingSlot] = useState(initialPlayer ? 'B' : 'A');
    const [highlightsA, setHighlightsA] = useState([]);
    const [highlightsB, setHighlightsB] = useState([]);

    // Search for players
    useEffect(() => {
        if (searchQuery.length < 2) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const { data } = await supabase.from('players_master')
                    .select('*, clubs(*)')
                    .ilike('full_name', `%${searchQuery}%`)
                    .limit(8);
                setSearchResults(data || []);
            } catch (e) { /* silent */ }
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Load highlight counts
    useEffect(() => {
        if (playerA) {
            supabase.from('media_highlights').select('id', { count: 'exact', head: true }).eq('player_id', playerA.id)
                .then(({ count }) => setHighlightsA(count || 0));
        }
        if (playerB) {
            supabase.from('media_highlights').select('id', { count: 'exact', head: true }).eq('player_id', playerB.id)
                .then(({ count }) => setHighlightsB(count || 0));
        }
    }, [playerA, playerB]);

    const selectPlayer = (p) => {
        if (selectingSlot === 'A') setPlayerA(p);
        else setPlayerB(p);
        setSearchQuery('');
        setSearchResults([]);
        setSelectingSlot(null);
    };

    const swapPlayers = () => {
        const tmp = playerA;
        setPlayerA(playerB);
        setPlayerB(tmp);
        const tmpH = highlightsA;
        setHighlightsA(highlightsB);
        setHighlightsB(tmpH);
    };

    const bothSelected = playerA && playerB;

    // Comparison row helper
    const CompareRow = ({ label, valA, valB, highlight }) => {
        const better = highlight && valA !== valB && valA !== '-' && valB !== '-';
        return (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2.5 border-b border-white/5 last:border-0">
                <div className={`text-sm text-right font-medium ${better && valA > valB ? 'text-emerald-400' : 'text-white'}`}>{valA || '-'}</div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider w-20 text-center">{label}</div>
                <div className={`text-sm text-left font-medium ${better && valB > valA ? 'text-emerald-400' : 'text-white'}`}>{valB || '-'}</div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 pt-12 border-b border-white/5">
                <h2 className="text-xl font-black text-white flex items-center gap-2"><ArrowLeftRight size={22} className="text-blue-500" /> Vergleich</h2>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"><X size={20} className="text-white" /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Player slots */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 p-4">
                    <PlayerSlot
                        player={playerA}
                        label="Spieler A"
                        onSelect={() => { setSelectingSlot('A'); setSearchQuery(''); }}
                        onClear={() => setPlayerA(null)}
                    />
                    <div className="pt-12">
                        {bothSelected && (
                            <button onClick={swapPlayers} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                                <ArrowLeftRight size={16} className="text-zinc-400" />
                            </button>
                        )}
                        {!bothSelected && <div className="text-zinc-700 font-bold text-xl">VS</div>}
                    </div>
                    <PlayerSlot
                        player={playerB}
                        label="Spieler B"
                        onSelect={() => { setSelectingSlot('B'); setSearchQuery(''); }}
                        onClear={() => setPlayerB(null)}
                    />
                </div>

                {/* Search panel */}
                {selectingSlot && (
                    <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-zinc-900 rounded-2xl border border-white/10 p-4">
                            <p className="text-xs text-zinc-500 font-bold mb-3">Spieler {selectingSlot} wählen:</p>
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-3.5 text-zinc-500" size={16} />
                                <input
                                    placeholder="Name suchen..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className={`${inputStyle} pl-10 !py-3 text-sm`}
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {searchResults.map(p => (
                                    <div key={p.id} onClick={() => selectPlayer(p)} className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl cursor-pointer transition">
                                        <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden border border-white/10 shrink-0">
                                            {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <User size={16} className="text-zinc-500 m-2" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{p.full_name}</div>
                                            <div className="text-[10px] text-zinc-500 flex items-center gap-1"><Shield size={8} /> {p.clubs?.name || 'Vereinslos'}</div>
                                        </div>
                                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-zinc-300 font-bold">{p.position_primary}</span>
                                    </div>
                                ))}
                                {searchQuery.length >= 2 && searchResults.length === 0 && (
                                    <div className="text-center text-zinc-600 text-xs py-4">Keine Spieler gefunden.</div>
                                )}
                            </div>
                            <button onClick={() => setSelectingSlot(null)} className="w-full mt-3 text-xs text-zinc-500 hover:text-white transition py-2">Abbrechen</button>
                        </div>
                    </div>
                )}

                {/* Comparison table */}
                {bothSelected && (
                    <div className="px-4 pb-24 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4 mt-2">
                            <h3 className="text-xs text-zinc-500 font-bold uppercase tracking-wider text-center mb-4">Vergleich</h3>
                            <CompareRow label="Position" valA={playerA.position_primary} valB={playerB.position_primary} />
                            <CompareRow label="Alter" valA={playerA.birth_date ? `${calculateAge(playerA.birth_date)}` : '-'} valB={playerB.birth_date ? `${calculateAge(playerB.birth_date)}` : '-'} />
                            <CompareRow label="Größe" valA={playerA.height_user ? `${playerA.height_user} cm` : '-'} valB={playerB.height_user ? `${playerB.height_user} cm` : '-'} highlight />
                            <CompareRow label="Gewicht" valA={playerA.weight ? `${playerA.weight} kg` : '-'} valB={playerB.weight ? `${playerB.weight} kg` : '-'} />
                            <CompareRow label="Fuß" valA={playerA.strong_foot} valB={playerB.strong_foot} />
                            <CompareRow label="Nr." valA={playerA.jersey_number ? `#${playerA.jersey_number}` : '-'} valB={playerB.jersey_number ? `#${playerB.jersey_number}` : '-'} />
                            <CompareRow label="Verein" valA={playerA.clubs?.name || 'Vereinslos'} valB={playerB.clubs?.name || 'Vereinslos'} />
                            <CompareRow label="Liga" valA={playerA.clubs?.league || '-'} valB={playerB.clubs?.league || '-'} />
                            <CompareRow label="Status" valA={playerA.transfer_status} valB={playerB.transfer_status} />
                            <CompareRow label="Follower" valA={playerA.followers_count || 0} valB={playerB.followers_count || 0} highlight />
                            <CompareRow label="Clips" valA={highlightsA} valB={highlightsB} highlight />
                            <CompareRow label="Verifiziert" valA={playerA.is_verified ? '✓' : '✗'} valB={playerB.is_verified ? '✓' : '✗'} />
                            <CompareRow label="Nationalität" valA={playerA.nationality || '-'} valB={playerB.nationality || '-'} />
                            <CompareRow label="Stadt" valA={playerA.city || '-'} valB={playerB.city || '-'} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Player slot card
const PlayerSlot = ({ player, label, onSelect, onClear }) => (
    <div className="flex flex-col items-center">
        {player ? (
            <div className="flex flex-col items-center text-center group relative">
                <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden border-2 border-white/10 mb-2 shadow-lg">
                    {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : <User size={32} className="text-zinc-500 m-5" />}
                </div>
                <div className="text-sm font-bold text-white truncate max-w-[120px] flex items-center gap-1">
                    {player.full_name}
                    {player.is_verified && <CheckCircle size={12} className="text-blue-500 shrink-0" />}
                </div>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                    <Shield size={8} /> {player.clubs?.name || 'Vereinslos'}
                </div>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-zinc-300 font-bold mt-1">{player.position_primary}</span>
                <button onClick={onClear} className="mt-2 text-[10px] text-zinc-600 hover:text-red-400 transition">Entfernen</button>
            </div>
        ) : (
            <button onClick={onSelect} className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-500/5 transition mb-2 group">
                <Plus size={24} className="text-zinc-600 group-hover:text-blue-400 transition" />
            </button>
        )}
        {!player && <span className="text-[10px] text-zinc-600 font-bold">{label}</span>}
    </div>
);
