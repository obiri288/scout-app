import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Users, ChevronRight, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { cardStyle } from '../lib/styles';
import { formatPosition } from '../lib/utils';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { useEcosystem } from '../contexts/EcosystemContext';

const AGE_ORDER = { 'Senioren': 0, 'U19': 1, 'U18': 2, 'U17': 3, 'U16': 4, 'U15': 5, 'U14': 6 };

export const ClubScreen = ({ club, onBack, onUserClick }) => {
    const [teams, setTeams] = useState([]);
    const [playersByTeam, setPlayersByTeam] = useState({});
    const [unassignedPlayers, setUnassignedPlayers] = useState([]);
    const [expandedTeams, setExpandedTeams] = useState({});
    const [verifyingId, setVerifyingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const { currentUserProfile } = useUser();
    const { addToast } = useToast();
    const { activeEcosystem } = useEcosystem();

    const isClubAdmin = currentUserProfile?.role === 'admin' || (currentUserProfile?.is_official && currentUserProfile?.club_id === club.id);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all teams for this club
                const { data: clubTeams } = await supabase
                    .from('club_teams')
                    .select('*')
                    .eq('club_id', club.id)
                    .order('age_category');

                // Fetch all players linked to this club (both via current_team_id and legacy club_id)
                let q = supabase
                    .from('players_master')
                    .select('*, career_history(*)')
                    .eq('is_deactivated', false)
                    .or(`club_id.eq.${club.id},current_team_id.not.is.null`);
                q = q.in('ecosystem', [activeEcosystem, 'all']);
                const { data: allPlayers } = await q;

                // Filter players that actually belong to this club
                const relevantPlayers = (allPlayers || []).filter(p => {
                    if (p.club_id === club.id) return true;
                    // Check if player's team belongs to this club
                    if (p.current_team_id && clubTeams?.some(t => t.id === p.current_team_id)) return true;
                    return false;
                });

                // Group players by team
                const grouped = {};
                const unassigned = [];

                relevantPlayers.forEach(player => {
                    if (player.current_team_id) {
                        if (!grouped[player.current_team_id]) {
                            grouped[player.current_team_id] = [];
                        }
                        grouped[player.current_team_id].push(player);
                    } else {
                        unassigned.push(player);
                    }
                });

                setTeams(clubTeams || []);
                setPlayersByTeam(grouped);
                setUnassignedPlayers(unassigned);

                // Auto-expand first team and any teams with players
                const expanded = {};
                (clubTeams || []).forEach((t, i) => {
                    if (i === 0 || (grouped[t.id] && grouped[t.id].length > 0)) {
                        expanded[t.id] = true;
                    }
                });
                if (unassigned.length > 0) expanded['unassigned'] = true;
                setExpandedTeams(expanded);

            } catch (e) {
                console.error("Failed loading club data:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [club, activeEcosystem]);

    const toggleTeam = (teamId) => {
        setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
    };

    const sortedTeams = [...teams].sort((a, b) => (AGE_ORDER[a.age_category] ?? 99) - (AGE_ORDER[b.age_category] ?? 99));
    const totalPlayers = Object.values(playersByTeam).reduce((s, arr) => s + arr.length, 0) + unassignedPlayers.length;

    const renderPlayer = (p) => {
        const isCaptain = p.career_history?.some(c => c.is_captain && !c.end_date && c.verification_status === 'approved') ?? false;
        return (
            <div key={p.id} onClick={() => onUserClick(p)} className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition ${cardStyle} ${isCaptain ? 'border-l-2 border-yellow-500/80' : ''}`}>
                <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-white/10 flex-shrink-0">
                    {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <img src="/cavios-icon.png" className="w-full h-full object-contain p-3 opacity-60" />}
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

                                // Update local state
                                const updatePlayerInState = (players) => players.map(pl => pl.id === p.id ? { ...pl, is_nat_2_verified: true } : pl);
                                setPlayersByTeam(prev => {
                                    const updated = {};
                                    for (const [key, arr] of Object.entries(prev)) {
                                        updated[key] = updatePlayerInState(arr);
                                    }
                                    return updated;
                                });
                                setUnassignedPlayers(prev => updatePlayerInState(prev));
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
    };

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

                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Users size={18} className="text-blue-500" /> Kader ({totalPlayers})
                </h3>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-zinc-500" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Team Sections */}
                        {sortedTeams.map(team => {
                            const teamPlayers = playersByTeam[team.id] || [];
                            const isExpanded = expandedTeams[team.id];
                            
                            return (
                                <div key={team.id} className="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01]">
                                    {/* Team Header */}
                                    <button
                                        onClick={() => toggleTeam(team.id)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                                                team.gender === 'Weiblich' ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' :
                                                team.gender === 'Mixed' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                                'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                                            }`}>
                                                {team.age_category === 'Senioren' ? 'SR' : team.age_category}
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-sm font-bold text-white">{team.age_category} – {team.gender}</h4>
                                                <p className="text-xs text-zinc-500">{teamPlayers.length} Spieler</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">{teamPlayers.length}</span>
                                            {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                                        </div>
                                    </button>

                                    {/* Team Players */}
                                    {isExpanded && (
                                        <div className="border-t border-white/5 space-y-1 p-2">
                                            {teamPlayers.length > 0 ? (
                                                teamPlayers.map(renderPlayer)
                                            ) : (
                                                <p className="text-zinc-600 text-xs text-center py-4 italic">Noch keine Spieler in diesem Team.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Unassigned Players (legacy club_id without team) */}
                        {unassignedPlayers.length > 0 && (
                            <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01]">
                                <button
                                    onClick={() => toggleTeam('unassigned')}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                            <Users size={14} className="text-zinc-500" />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-sm font-bold text-zinc-400">Nicht zugeordnet</h4>
                                            <p className="text-xs text-zinc-600">{unassignedPlayers.length} Spieler ohne Team-Zuweisung</p>
                                        </div>
                                    </div>
                                    {expandedTeams['unassigned'] ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                                </button>
                                {expandedTeams['unassigned'] && (
                                    <div className="border-t border-white/5 space-y-1 p-2">
                                        {unassignedPlayers.map(renderPlayer)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Empty State */}
                        {totalPlayers === 0 && sortedTeams.length === 0 && (
                            <p className="text-zinc-500 text-sm">Keine Spieler gefunden.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
