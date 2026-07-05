import React, { useState, useEffect, useCallback } from 'react';
import { 
    Building, ArrowLeft, Menu, Users, Shield, Search, Loader2, 
    ChevronRight, Plus, X, LogOut, CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { useEcosystem } from '../contexts/EcosystemContext';

const AGE_CATEGORIES = ['Senioren', 'U19', 'U18', 'U17', 'U16', 'U15', 'U14'];
const GENDERS = ['Männlich', 'Weiblich', 'Mixed'];

const TeamsScreen = ({ currentUserProfile, onBack, onMenuOpen, onUserClick }) => {
    const { refreshProfile, updateProfile } = useUser();
    const { addToast } = useToast();
    const { themeColors } = useEcosystem();

    // Current team info
    const [currentTeam, setCurrentTeam] = useState(null);
    const [teammates, setTeammates] = useState([]);
    const [loadingTeam, setLoadingTeam] = useState(true);

    // Join/Create flow
    const [showJoinFlow, setShowJoinFlow] = useState(false);
    const [clubSearch, setClubSearch] = useState('');
    const [clubResults, setClubResults] = useState([]);
    const [selectedClubName, setSelectedClubName] = useState('');
    const [selectedAge, setSelectedAge] = useState('Senioren');
    const [selectedGender, setSelectedGender] = useState('Männlich');
    const [joining, setJoining] = useState(false);
    const [searchingClubs, setSearchingClubs] = useState(false);

    // Leaving flow
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [leaving, setLeaving] = useState(false);

    // Fetch current team info
    const fetchCurrentTeam = useCallback(async () => {
        if (!currentUserProfile?.current_team_id) {
            setCurrentTeam(null);
            setTeammates([]);
            setLoadingTeam(false);
            return;
        }

        setLoadingTeam(true);
        try {
            // Fetch team with club data
            const { data: team } = await supabase
                .from('club_teams')
                .select('*, clubs(*)')
                .eq('id', currentUserProfile.current_team_id)
                .single();

            setCurrentTeam(team);

            // Fetch teammates
            if (team) {
                const members = await api.fetchTeamMembers(team.id);
                setTeammates(members.filter(m => m.id !== currentUserProfile.id));
            }
        } catch (e) {
            console.error("Failed to fetch team:", e);
        } finally {
            setLoadingTeam(false);
        }
    }, [currentUserProfile?.current_team_id, currentUserProfile?.id]);

    useEffect(() => {
        fetchCurrentTeam();
    }, [fetchCurrentTeam]);

    // Club search debounce
    useEffect(() => {
        if (!clubSearch.trim()) {
            setClubResults([]);
            return;
        }
        const timeout = setTimeout(async () => {
            setSearchingClubs(true);
            try {
                const results = await api.searchClubs(clubSearch, 8);
                setClubResults(results);
            } catch (e) {
                console.error("Club search failed:", e);
            } finally {
                setSearchingClubs(false);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [clubSearch]);

    // Join or create team
    const handleJoinTeam = async () => {
        if (!selectedClubName.trim()) {
            addToast("Bitte gib einen Vereinsnamen ein.", "warning");
            return;
        }

        setJoining(true);
        try {
            const result = await api.joinOrCreateTeam(selectedClubName, selectedAge, selectedGender);
            addToast(`Erfolgreich dem Team beigetreten: ${result.club_name} – ${result.age_category} (${result.gender})`, 'success');
            
            // Refresh profile to get updated team data
            await refreshProfile();
            
            // Reset and close join flow
            setShowJoinFlow(false);
            setClubSearch('');
            setSelectedClubName('');
            setSelectedAge('Senioren');
            setSelectedGender('Männlich');
            setClubResults([]);
            
            // Refresh team display
            fetchCurrentTeam();
        } catch (err) {
            console.error("Join team failed:", err);
            addToast("Fehler beim Beitreten: " + err.message, 'error');
        } finally {
            setJoining(false);
        }
    };

    // Leave team
    const handleLeaveTeam = async () => {
        if (!currentUserProfile?.id) return;
        setLeaving(true);
        try {
            await api.leaveTeam(currentUserProfile.id);
            addToast("Team erfolgreich verlassen.", 'success');
            setShowLeaveConfirm(false);
            setCurrentTeam(null);
            setTeammates([]);
            await refreshProfile();
        } catch (err) {
            console.error("Leave team failed:", err);
            addToast("Fehler beim Verlassen: " + err.message, 'error');
        } finally {
            setLeaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background min-h-screen pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-20 pb-24">
            {/* Header */}
            <div className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-10 flex items-center justify-between pt-[env(safe-area-inset-top)] border-b border-white/5">
                <div className="flex items-center gap-3">
                    {currentUserProfile?.role === 'admin' && (
                        <button onClick={onMenuOpen} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition text-foreground">
                            <Menu size={20} />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-foreground">Meine Teams</h1>
                </div>
                <button onClick={onBack} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-muted-foreground">
                    <ArrowLeft size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                {loadingTeam ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin text-cyan-500" />
                    </div>
                ) : currentTeam ? (
                    /* ═══ Current Team Card ═══ */
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Team Info Card */}
                        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.01]">
                            {/* Glow */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none" />
                            
                            <div className="p-6 space-y-4">
                                {/* Club header */}
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-white/10 shadow-xl">
                                        {currentTeam.clubs?.logo_url ? (
                                            <img src={currentTeam.clubs.logo_url} className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <Shield size={28} className="text-zinc-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-black text-white truncate">{currentTeam.clubs?.name || 'Unbekannter Verein'}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                                                currentTeam.gender === 'Weiblich' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                                currentTeam.gender === 'Mixed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                            }`}>
                                                {currentTeam.age_category}
                                            </span>
                                            <span className="text-xs text-zinc-500 font-medium">{currentTeam.gender}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats row */}
                                <div className="flex gap-4">
                                    <div className="flex-1 text-center p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                                        <p className="text-2xl font-black text-white">{teammates.length + 1}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Kadergröße</p>
                                    </div>
                                    <div className="flex-1 text-center p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                                        <p className="text-2xl font-black text-white">{currentTeam.age_category}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Altersklasse</p>
                                    </div>
                                    <div className="flex-1 text-center p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                                        <p className="text-2xl font-black text-white">{currentTeam.gender === 'Männlich' ? '♂' : currentTeam.gender === 'Weiblich' ? '♀' : '⚥'}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">{currentTeam.gender}</p>
                                    </div>
                                </div>

                                {/* Leave button */}
                                <button
                                    onClick={() => setShowLeaveConfirm(true)}
                                    className="w-full py-3 px-4 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/10 hover:border-red-500/20 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <LogOut size={14} /> Team verlassen
                                </button>
                            </div>
                        </div>

                        {/* Teammates List */}
                        <div>
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                <Users size={14} className="text-cyan-500" />
                                Teamkollegen ({teammates.length})
                            </h3>
                            
                            {teammates.length === 0 ? (
                                <div className="text-center py-8 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                                    <Users size={28} className="text-zinc-700 mx-auto mb-2" />
                                    <p className="text-sm text-zinc-500">Noch keine Teamkollegen.</p>
                                    <p className="text-xs text-zinc-600 mt-1">Teile den Vereinsnamen, damit andere beitreten können.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {teammates.map(mate => (
                                        <div
                                            key={mate.id}
                                            onClick={() => onUserClick?.(mate)}
                                            className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden border border-white/10 shrink-0">
                                                {mate.avatar_url ? (
                                                    <img src={mate.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src="/cavios-icon.png" className="w-full h-full object-contain p-2.5 opacity-50" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white truncate">{mate.full_name || mate.username}</h4>
                                                {mate.position_primary && (
                                                    <span className="text-[10px] text-zinc-500 font-medium">{mate.position_primary}</span>
                                                )}
                                            </div>
                                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ═══ No Team - Show Join CTA ═══ */
                    <>
                        {!showJoinFlow ? (
                            <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 animate-in fade-in duration-300">
                                <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full flex items-center justify-center border border-cyan-500/20 shadow-xl shadow-cyan-500/5">
                                    <Shield size={44} className="text-cyan-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white mb-2">Team beitreten</h2>
                                    <p className="text-muted-foreground max-w-sm leading-relaxed text-sm">
                                        Tritt deinem Verein bei und verbinde dich mit deinen Teamkollegen. Wähle deinen Klub, Altersklasse und Geschlecht.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowJoinFlow(true)}
                                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                                >
                                    <Plus size={18} /> Jetzt beitreten
                                </button>
                            </div>
                        ) : (
                            /* ═══ Join Flow ═══ */
                            <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-black text-white">Team beitreten</h2>
                                    <button onClick={() => { setShowJoinFlow(false); setClubSearch(''); setSelectedClubName(''); setClubResults([]); }} className="p-2 hover:bg-white/5 rounded-full transition text-zinc-500">
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Step 1: Club Name */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">1. Vereinsname</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                                        <input
                                            type="text"
                                            value={clubSearch || selectedClubName}
                                            onChange={(e) => {
                                                setClubSearch(e.target.value);
                                                setSelectedClubName(e.target.value);
                                            }}
                                            placeholder="Vereinsname eingeben oder suchen..."
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-zinc-600"
                                        />
                                        {searchingClubs && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" />}
                                    </div>
                                    {selectedClubName && !clubSearch && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                                            <CheckCircle size={14} className="text-cyan-400" />
                                            <span className="text-sm font-bold text-cyan-400">{selectedClubName}</span>
                                            <button onClick={() => { setSelectedClubName(''); setClubSearch(''); }} className="ml-auto p-1 hover:bg-white/5 rounded-full">
                                                <X size={12} className="text-zinc-500" />
                                            </button>
                                        </div>
                                    )}
                                    {clubResults.length > 0 && clubSearch && (
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {clubResults.map(club => (
                                                <div
                                                    key={club.id}
                                                    onClick={() => {
                                                        setSelectedClubName(club.name);
                                                        setClubSearch('');
                                                        setClubResults([]);
                                                    }}
                                                    className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] cursor-pointer transition"
                                                >
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                                        {club.logo_url ? (
                                                            <img src={club.logo_url} className="w-full h-full object-contain p-1" />
                                                        ) : (
                                                            <Building size={14} className="text-zinc-500" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold text-white truncate">{club.name}</span>
                                                    {club.is_verified && <CheckCircle size={12} className="text-blue-400 shrink-0" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {clubSearch && clubResults.length === 0 && !searchingClubs && (
                                        <p className="text-xs text-zinc-500 italic px-1">
                                            Kein bekannter Verein gefunden – „{clubSearch}" wird als neuer Klub erstellt.
                                        </p>
                                    )}
                                </div>

                                {/* Step 2: Age Category */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">2. Altersklasse</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {AGE_CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedAge(cat)}
                                                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                                                    selectedAge === cat
                                                        ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                                                        : 'bg-white/[0.02] text-zinc-400 border-white/5 hover:bg-white/[0.05] hover:text-white'
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 3: Gender */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">3. Geschlecht</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {GENDERS.map(g => (
                                            <button
                                                key={g}
                                                onClick={() => setSelectedGender(g)}
                                                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                                                    selectedGender === g
                                                        ? g === 'Weiblich' ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                                                        : g === 'Mixed' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                                        : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                                                        : 'bg-white/[0.02] text-zinc-400 border-white/5 hover:bg-white/[0.05]'
                                                }`}
                                            >
                                                {g === 'Männlich' ? '♂' : g === 'Weiblich' ? '♀' : '⚥'} {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary & Submit */}
                                {selectedClubName && (
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 animate-in fade-in">
                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Zusammenfassung</h4>
                                        <div className="flex items-center gap-3">
                                            <Shield size={20} className="text-cyan-500" />
                                            <div>
                                                <p className="text-sm font-bold text-white">{selectedClubName}</p>
                                                <p className="text-xs text-zinc-500">{selectedAge} – {selectedGender}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleJoinTeam}
                                    disabled={!selectedClubName.trim() || joining}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-cyan-500/30 active:scale-[0.98]"
                                >
                                    {joining ? (
                                        <><Loader2 size={18} className="animate-spin" /> Wird verarbeitet...</>
                                    ) : (
                                        <><CheckCircle size={18} /> Team beitreten</>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Leave Team Confirmation Modal */}
            {showLeaveConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-red-500/20 w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-3">
                            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
                                <LogOut size={24} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-black text-white">Team verlassen?</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                Du wirst aus <strong className="text-white">{currentTeam?.clubs?.name}</strong> ({currentTeam?.age_category} – {currentTeam?.gender}) entfernt. Du kannst jederzeit wieder beitreten.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLeaveConfirm(false)}
                                className="flex-1 py-3 bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleLeaveTeam}
                                disabled={leaving}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                                Verlassen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamsScreen;
