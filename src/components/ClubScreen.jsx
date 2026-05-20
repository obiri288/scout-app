import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Users, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardStyle } from '../lib/styles';
import { formatPosition } from '../lib/utils';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

export const ClubScreen = ({ club, onBack, onUserClick }) => {
    const [players, setPlayers] = useState([]);
    const [verifyingId, setVerifyingId] = useState(null);
    const { currentUserProfile } = useUser();
    const { addToast } = useToast();

    const isClubAdmin = currentUserProfile?.role === 'admin' || (currentUserProfile?.is_official && currentUserProfile?.club_id === club.id);

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const { data } = await supabase.from('players_master').select('*, career_history(*)').eq('club_id', club.id).eq('is_deactivated', false);
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
                    {players.map(p => {
                        const isCaptain = p.career_history?.some(c => c.is_captain && !c.end_date && c.verification_status === 'approved') ?? false;
                        return (
                            <div key={p.id} onClick={() => onUserClick(p)} className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition ${cardStyle} ${isCaptain ? 'border-l-2 border-yellow-500/80' : ''}`}>
                                <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-white/10 flex-shrink-0">
                                    {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <img src="/cavio-icon.png" className="w-full h-full object-contain p-3 opacity-60" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-white text-sm flex flex-wrap items-center gap-1.5 leading-tight">
                                        {p.full_name}
                                        {p.is_nat_2_verified && (
                                            <span className="text-[9px] text-green-500 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wide flex items-center gap-0.5 shrink-0">
                                                <CheckCircle size={8} /> 2. Nat. verifiziert
                                            </span>
                                        )}
                                    </h4>
                                    <span className="bg-gray-800 rounded px-1.5 py-0.5 text-[10px] text-white/90 font-medium inline-flex items-center mt-1">
                                        {formatPosition(p.position_primary)}
                                        {isCaptain && <span className="text-yellow-500/90 font-bold ml-1">• ©</span>}
                                    </span>
                                </div>
                                {isClubAdmin && p.nationality_2 && !p.is_nat_2_verified && (
                                    <button 
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setVerifyingId(p.id);
                                            try {
                                                const { error } = await supabase.from('nationality_verifications').insert({
                                                    user_id: p.user_id,
                                                    nationality: p.nationality_2,
                                                    status: 'approved',
                                                    verification_type: 'club_admin',
                                                    verified_by: currentUserProfile.id
                                                });
                                                if (error) throw error;
                                                
                                                const { error: profileErr } = await supabase.from('players_master').update({
                                                    is_nat_2_verified: true
                                                }).eq('id', p.id);
                                                if (profileErr) throw profileErr;

                                                setPlayers(prev => prev.map(pl => pl.id === p.id ? { ...pl, is_nat_2_verified: true } : pl));
                                                addToast("Zweite Nationalität erfolgreich verifiziert! ✅", 'success');
                                            } catch (err) {
                                                console.error("Verification failed:", err);
                                                addToast("Fehler bei Verifizierung: " + err.message, 'error');
                                            } finally {
                                                setVerifyingId(null);
                                            }
                                        }}
                                        disabled={verifyingId === p.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/25 disabled:opacity-50 text-green-400 border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0"
                                    >
                                        {verifyingId === p.id ? <Loader2 size={12} className="animate-spin" /> : "Nat. 2 verifizieren"}
                                    </button>
                                )}
                                <ChevronRight size={16} className="text-zinc-600 shrink-0" />
                            </div>
                        );
                    })}
                    {players.length === 0 && <p className="text-zinc-500 text-sm">Keine Spieler gefunden.</p>}
                </div>
            </div>
        </div>
    );
};
