import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Users, User, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardStyle } from '../lib/styles';
import { formatPosition } from '../lib/utils';

export const ClubScreen = ({ club, onBack, onUserClick }) => {
    const [players, setPlayers] = useState([]);
    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const { data } = await supabase.from('players_master').select('*').eq('club_id', club.id).eq('is_deactivated', false);
                setPlayers(data || []);
            } catch (e) {
                console.error("Failed loading club players:", e);
            }
        };
        fetchPlayers();
    }, [club]);

    return (
        <div className="min-h-screen bg-black pb-32 animate-in slide-in-from-right">
            <div className="relative h-40 bg-zinc-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black"></div>
                {club.logo_url && <img src={club.logo_url} className="w-full h-full object-cover opacity-30 blur-sm" />}
                <button onClick={onBack} className="absolute top-[calc(1.5rem+env(safe-area-inset-top))] left-6 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition z-10"><ArrowLeft size={20} /></button>
            </div>
            <div className="px-6 -mt-12 relative z-10">
                <div className="w-24 h-24 bg-zinc-900 rounded-2xl p-1 border border-zinc-800 shadow-2xl mb-4">
                    {club.logo_url ? <img src={club.logo_url} className="w-full h-full object-contain rounded-xl" /> : <Shield size={40} className="text-zinc-600 m-6" />}
                </div>
                <h1 className="text-3xl font-black text-white mb-1">{club.name}</h1>
                <p className="text-zinc-400 text-sm font-medium mb-6">{club.league}</p>

                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500" /> Kader ({players.length})</h3>
                <div className="space-y-3">
                    {players.map(p => (
                        <div key={p.id} onClick={() => onUserClick(p)} className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition ${cardStyle}`}>
                            <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                                {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <img src="/cavio-icon.png" className="w-full h-full object-contain p-3 opacity-60" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">{p.full_name}</h4>
                                <span className="bg-gray-800 rounded px-1.5 py-0.5 text-[10px] text-white/90 font-medium">{formatPosition(p.position_primary)}</span>
                            </div>
                            <ChevronRight size={16} className="ml-auto text-zinc-600" />
                        </div>
                    ))}
                    {players.length === 0 && <p className="text-zinc-500 text-sm">Keine Spieler gefunden.</p>}
                </div>
            </div>
        </div>
    );
};
