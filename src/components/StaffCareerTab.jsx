import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    List, GitCommit, Sparkles, Plus, Check, Award, Briefcase, 
    Activity, Calendar, MapPin, X, Trash2, Loader2, Save, 
    Globe, Search, Shield, Clock 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { btnPrimary, inputStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';
import { EmptyState } from './EmptyState';

// Dummy deriveInsights
const deriveInsights = (stations, role) => {
    if (!stations || stations.length === 0) return null;
    
    if (role === 'scout') {
        const regions = stations.map(s => s.metadata?.focus_region).filter(Boolean);
        if (regions.length > 0) {
            // Count occurrences
            const counts = regions.reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
            const topRegion = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            return `Netzwerk-Spezialist: ${topRegion}`;
        }
        return 'Aufstrebendes Scout-Talent';
    } else if (role === 'coach') {
        const avgPPS = stations.reduce((acc, s) => acc + parseFloat(s.metadata?.pps || 0), 0) / stations.length;
        if (avgPPS > 1.8) return 'Erfolgsgarant (PPS > 1.8)';
        if (avgPPS > 1.5) return 'Solider Punktesammler';
        return 'Taktik-Fokus';
    }
    return 'Karriere-Insights generiert';
};

export const StaffCareerTab = ({ profile, isOwnProfile, onUpdate }) => {
    const role = profile?.role || 'coach'; // 'coach' or 'scout'
    const { addToast } = useToast();
    
    const [careerStations, setCareerStations] = useState([]);
    const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'list'
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isElite, setIsElite] = useState(false);

    const [formData, setFormData] = useState({
        club_name: '',
        league: '',
        start_date: '',
        end_date: '',
        is_current: false,
        position: '',
        departure_type: '',
        // Coach specific
        matches_played: '',
        wins: '',
        draws: '',
        losses: '',
        pps: '',
        preferred_system: '',
        achievements: '',
        // Scout specific
        focus_region: '',
        network_strength: '',
        club_id: null,
        squad_category: 'mens'
    });

    // Club Search States
    const [clubSearchTerm, setClubSearchTerm] = useState('');
    const [clubResults, setClubResults] = useState([]);
    const [showClubDropdown, setShowClubDropdown] = useState(false);
    const [isSearchingClubs, setIsSearchingClubs] = useState(false);

    useEffect(() => {
        if (!profile?.user_id) return;
        loadStations();
    }, [profile?.user_id]);

    // Club Search Effect
    useEffect(() => {
        if (clubSearchTerm.length < 2) {
            setClubResults([]);
            return;
        }
        const searchClubs = async () => {
            setIsSearchingClubs(true);
            try {
                const { data } = await supabase
                    .from('clubs')
                    .select('*, leagues(name)')
                    .ilike('name', `%${clubSearchTerm}%`)
                    .limit(5);
                setClubResults(data || []);
                setShowClubDropdown(true);
            } catch (e) {
                console.error("Club search failed:", e);
            } finally {
                setIsSearchingClubs(false);
            }
        };
        const timer = setTimeout(searchClubs, 300);
        return () => clearTimeout(timer);
    }, [clubSearchTerm]);

    const loadStations = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('career_history')
                .select('*')
                .eq('user_id', profile.user_id)
                .order('start_date', { ascending: false });

            if (!isOwnProfile) {
                query = query.eq('verification_status', 'approved');
            }

            const { data, error } = await query;
            if (error) throw error;
            setCareerStations(data || []);
        } catch (e) {
            console.warn('Career fetch failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const checkIfElite = (data) => {
        const coachKeywords = ['uefa pro', 'uefa a', 'bundesliga', '1. liga'];
        const scoutKeywords = ['profi', '1. liga', '2. liga', 'fifa', 'international'];

        const input = `${data.league} ${data.club_name} ${data.achievements || ''} ${data.network_strength || ''}`.toLowerCase();
        
        if (role === 'coach') {
            return coachKeywords.some(kw => input.includes(kw));
        }
        if (role === 'scout') {
            return scoutKeywords.some(kw => input.includes(kw));
        }
        return false;
    };

    // Recalculate Elite status when formData changes
    useEffect(() => {
        setIsElite(checkIfElite(formData));
        
        // Auto-calc PPS for coach
        if (role === 'coach') {
            const w = parseInt(formData.wins) || 0;
            const d = parseInt(formData.draws) || 0;
            const l = parseInt(formData.losses) || 0;
            const totalMatches = w + d + l;
            if (totalMatches > 0) {
                const calculatedPps = ((w * 3) + (d * 1)) / totalMatches;
                if (Math.abs(parseFloat(formData.pps) - calculatedPps) > 0.01) {
                    setFormData(prev => ({ ...prev, pps: calculatedPps.toFixed(2), matches_played: totalMatches.toString() }));
                }
            }
        }
    }, [formData, role]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.club_name || !formData.start_date) {
            addToast('Verein und Startdatum sind Pflichtfelder', 'error');
            return;
        }

        setLoading(true);
        try {
            // Ensure club exists if not already linked by club_id
            let finalClubId = formData.club_id;
            let finalClubName = formData.club_name;

            if (!finalClubId && finalClubName) {
                // Check if club already exists exactly
                const { data: existingClub } = await supabase
                    .from('clubs')
                    .select('id, name')
                    .ilike('name', finalClubName.trim())
                    .maybeSingle();

                if (existingClub) {
                    finalClubId = existingClub.id;
                } else {
                    // Create new club on the fly
                    const { data: newClub, error: clubError } = await supabase
                        .from('clubs')
                        .insert({ name: finalClubName.trim(), is_verified: false })
                        .select()
                        .single();
                    if (!clubError && newClub) {
                        finalClubId = newClub.id;
                    }
                }
            }
            const payload = {
                user_id: profile.user_id,
                club_id: finalClubId,
                club_name: finalClubName.trim(),
                league: formData.league.trim() || null,
                start_date: formData.start_date,
                end_date: formData.is_current ? null : (formData.end_date || null),
                position: formData.position,
                departure_type: formData.departure_type,
                verification_status: 'pending',
                // Coach specific
                matches_played: role === 'coach' ? parseInt(formData.matches_played) || 0 : null,
                wins: role === 'coach' ? parseInt(formData.wins) || 0 : null,
                draws: role === 'coach' ? parseInt(formData.draws) || 0 : null,
                losses: role === 'coach' ? parseInt(formData.losses) || 0 : null,
                pps: role === 'coach' ? parseFloat(formData.pps) || 0 : null,
                preferred_system: role === 'coach' ? formData.preferred_system : null,
                achievements: role === 'coach' ? formData.achievements : null,
                // Scout specific
                focus_region: role === 'scout' ? formData.focus_region : null,
                network_strength: role === 'scout' ? formData.network_strength : null,
                squad_category: formData.squad_category || 'mens'
            };

            const { data, error } = await supabase.from('career_history').insert(payload).select().single();
            if (error) throw error;
            
            setCareerStations(prev => [data, ...prev]);
            addToast('Eintrag gespeichert! Deine Station wird geprüft und erscheint auf deinem Profil, sobald sie verifiziert wurde.', 'success');
            setShowForm(false);
            setClubSearchTerm('');
            setFormData({
                club_name: '', league: '', start_date: '', end_date: '', is_current: false, position: '', departure_type: '',
                matches_played: '', wins: '', draws: '', losses: '', pps: '', preferred_system: '', achievements: '',
                focus_region: '', network_strength: '',
                club_id: null,
                squad_category: 'mens'
            });
        } catch (e) {
            addToast(e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const insights = deriveInsights(careerStations, role);

    return (
        <div className="w-full animate-in fade-in pb-12">
            {/* Header / Toggle */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-foreground">Karriere-Verlauf</h3>
                <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
                    <button 
                        onClick={() => setViewMode('timeline')}
                        className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-500' : 'text-muted-foreground'}`}
                        title="Timeline Ansicht"
                    >
                        <GitCommit size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-500' : 'text-muted-foreground'}`}
                        title="Listen Ansicht"
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {/* CAVIO Insights */}
            {careerStations.length > 0 && insights && (
                <div className="mb-6 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">CAVIO Insights</h4>
                        <p className="text-sm font-bold text-foreground mt-0.5">{insights}</p>
                    </div>
                </div>
            )}

            {/* Form Toggle Button */}
            {isOwnProfile && !showForm && (
                <button 
                    onClick={() => setShowForm(true)}
                    className="w-full mb-8 py-3 rounded-xl border-2 border-dashed border-cyan-500/30 text-cyan-500 font-bold hover:bg-cyan-500/5 transition flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> Station hinzufügen
                </button>
            )}

            {/* The Input Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-8"
                    >
                        <form onSubmit={handleSave} className="bg-slate-50 dark:bg-slate-900 border border-border p-5 rounded-2xl space-y-5">
                            <div className="flex justify-between items-center pb-2 border-b border-border">
                                <h4 className="font-bold text-foreground flex items-center gap-2">
                                    <Briefcase size={16} className="text-cyan-500" />
                                    Neue Station eintragen
                                </h4>
                                <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                            </div>

                            {/* Base Fields */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Verein/Organisation *</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                            <input 
                                                required 
                                                value={clubSearchTerm || formData.club_name} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setClubSearchTerm(val);
                                                    setFormData({...formData, club_name: val});
                                                    if (val.length < 2) setShowClubDropdown(false);
                                                }} 
                                                onFocus={() => { if (clubResults.length > 0) setShowClubDropdown(true); }}
                                                className={`${inputStyle} pl-10`} 
                                                placeholder="z.B. FC Beispiel" 
                                            />
                                        </div>

                                        {/* Autocomplete Dropdown */}
                                        {showClubDropdown && clubResults.length > 0 && (
                                            <div className="absolute z-50 w-full bg-white dark:bg-zinc-900 border border-border rounded-xl mt-1 overflow-hidden shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                                {clubResults.map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                club_name: c.name,
                                                                club_id: c.id,
                                                                league: c.leagues?.name || c.league || formData.league
                                                            });
                                                            setClubSearchTerm(c.name);
                                                            setShowClubDropdown(false);
                                                        }}
                                                        className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer text-foreground border-b border-border flex items-center gap-3 transition"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                            {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover" /> : <Shield size={14} className="text-slate-400" />}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-bold truncate">{c.name}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.leagues?.name || c.league || 'Amateurliga'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Create New Club Option */}
                                        {clubSearchTerm.length > 2 && clubResults.length === 0 && !isSearchingClubs && (
                                            <div className="absolute z-50 w-full bg-white dark:bg-zinc-900 border border-border rounded-xl mt-1 overflow-hidden shadow-xl p-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="p-3 bg-cyan-500/10 text-cyan-400 font-bold text-xs flex items-center gap-2 rounded-lg">
                                                    <Plus size={14} /> "{clubSearchTerm}" wird als neuer Verein angelegt
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Liga</label>
                                        <input value={formData.league} onChange={e => setFormData({...formData, league: e.target.value})} className={inputStyle} placeholder="z.B. Regionalliga" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 w-full">
                                     <div className="w-full">
                                         <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Von *</label>
                                         <div className="relative">
                                             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                                             <input 
                                                 required 
                                                 type="date" 
                                                 value={formData.start_date} 
                                                 onChange={e => setFormData({...formData, start_date: e.target.value})} 
                                                 className={`${inputStyle} w-full pl-9 [color-scheme:dark]`} 
                                             />
                                         </div>
                                     </div>
                                     <div className="w-full">
                                         <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Bis</label>
                                         <div className="relative">
                                             <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${formData.is_current ? 'opacity-30' : ''}`} size={14} />
                                             <input 
                                                 disabled={formData.is_current} 
                                                 type="date" 
                                                 min={formData.start_date}
                                                 value={formData.end_date} 
                                                 onChange={e => setFormData({...formData, end_date: e.target.value})} 
                                                 className={`${inputStyle} w-full pl-9 [color-scheme:dark] ${formData.is_current ? 'opacity-50 cursor-not-allowed bg-slate-200/10' : ''}`} 
                                             />
                                         </div>
                                     </div>
                                 </div>
                                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                    <input type="checkbox" checked={formData.is_current} onChange={e => setFormData({...formData, is_current: e.target.checked, end_date: ''})} className="rounded text-cyan-500" />
                                    Bis heute (Aktuelle Station)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Genaue Position</label>
                                        <input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className={inputStyle} placeholder="z.B. Chefscout / Co-Trainer" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Art des Abgangs</label>
                                        <select value={formData.departure_type} onChange={e => setFormData({...formData, departure_type: e.target.value})} className={inputStyle}>
                                            <option value="">Auswählen</option>
                                            <option value="Vertragsende">Vertragsende</option>
                                            <option value="Beurlaubung">Beurlaubung</option>
                                            <option value="Auf eigenen Wunsch">Auf eigenen Wunsch</option>
                                            <option value="Wechsel">Wechsel (Ablöse)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Ökosystem</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setFormData({...formData, squad_category: 'mens'})} className={`py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${formData.squad_category === 'mens' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500' : 'border-border text-muted-foreground'}`}>Herren ⚽</button>
                                        <button type="button" onClick={() => setFormData({...formData, squad_category: 'womens'})} className={`py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${formData.squad_category === 'womens' ? 'border-violet-500 bg-violet-500/10 text-violet-500' : 'border-border text-muted-foreground'}`}>Damen ⚽</button>
                                    </div>
                                </div>
                            </div>

                            {/* Coach Fields */}
                            {role === 'coach' && (
                                <div className="space-y-4 pt-4 border-t border-border">
                                    <h5 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Trainer-Spezifisch</h5>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-muted-foreground font-bold block">Siege</label>
                                            <input type="number" min="0" value={formData.wins} onChange={e => setFormData({...formData, wins: e.target.value})} className={inputStyle} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-muted-foreground font-bold block">Unentsch.</label>
                                            <input type="number" min="0" value={formData.draws} onChange={e => setFormData({...formData, draws: e.target.value})} className={inputStyle} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-muted-foreground font-bold block">Niederl.</label>
                                            <input type="number" min="0" value={formData.losses} onChange={e => setFormData({...formData, losses: e.target.value})} className={inputStyle} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-muted-foreground font-bold block text-cyan-500">PPS</label>
                                            <input readOnly value={formData.pps} className={`${inputStyle} bg-cyan-500/10 text-cyan-500 font-bold border-cyan-500/30`} placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Bevorzugtes System</label>
                                            <input value={formData.preferred_system} onChange={e => setFormData({...formData, preferred_system: e.target.value})} className={inputStyle} placeholder="z.B. 4-2-3-1" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Erfolge</label>
                                            <input value={formData.achievements} onChange={e => setFormData({...formData, achievements: e.target.value})} className={inputStyle} placeholder="z.B. Meister, Aufstieg" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Scout Fields */}
                            {role === 'scout' && (
                                <div className="space-y-4 pt-4 border-t border-border">
                                    <h5 className="text-[10px] font-black uppercase text-violet-500 tracking-wider">Scout-Spezifisch</h5>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Fokus-Region/Liga</label>
                                            <input value={formData.focus_region} onChange={e => setFormData({...formData, focus_region: e.target.value})} className={inputStyle} placeholder="z.B. Südamerika" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Netzwerk-Stärke</label>
                                            <select value={formData.network_strength} onChange={e => setFormData({...formData, network_strength: e.target.value})} className={inputStyle}>
                                                <option value="">Auswählen</option>
                                                <option value="Regional">Regional</option>
                                                <option value="National">National</option>
                                                <option value="International">International</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Elite Banner */}
                            {isElite && (
                                <div className="bg-emerald-500/10 border border-emerald-500 p-4 rounded-xl flex items-start gap-3">
                                    <Award size={20} className="text-emerald-500 mt-0.5 shrink-0" />
                                    <div>
                                        <h5 className="font-bold text-emerald-500 text-sm">Premium-Station erkannt</h5>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-1">Diese Station qualifiziert sich als Elite-Referenz und wird nach Speicherung durch das CAVIO-Team verifiziert.</p>
                                    </div>
                                </div>
                            )}

                            <button disabled={loading} className={`${btnPrimary} w-full flex items-center justify-center gap-2`}>
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Station speichern
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Display Mode: TIMELINE */}
            {viewMode === 'timeline' && (
                <div className="relative pl-6 space-y-6">
                    <div className="absolute top-2 bottom-0 left-[11px] w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                    
                    {careerStations.map(station => {
                        const m = station.metadata || {};
                        return (
                            <div key={station.id} className="relative">
                                {/* Dot */}
                                <div className={`absolute top-5 -left-[22px] w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${!station.end_date ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-400 dark:bg-slate-600'}`}></div>
                                
                                <div className="bg-white dark:bg-slate-900 border border-border p-4 rounded-2xl shadow-sm hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-black text-foreground text-base">{station.club_name}</h4>
                                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                <span>{new Date(station.start_date).getFullYear()} – {station.end_date ? new Date(station.end_date).getFullYear() : 'Heute'}</span>
                                                <span className="w-1 h-1 rounded-full bg-border"></span>
                                                <span className="text-cyan-600 dark:text-cyan-400">{m.position || station.league || 'Trainer'}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            {station.verification_status === 'pending' && (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-widest rounded border border-amber-500/20" title="Station wird von Admins geprüft">
                                                    <Clock size={10} />
                                                    Wird geprüft
                                                </span>
                                            )}
                                            {station.requires_verification && station.verification_status === 'approved' && (
                                                <div className="bg-emerald-500/10 text-emerald-500 p-1.5 rounded-lg" title="Elite Station">
                                                    <Award size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bento Badges for Stats */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {role === 'coach' ? (
                                            <>
                                                {m.pps && (
                                                    <div className="bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                                                        <span className="text-[10px] text-cyan-500 uppercase font-black block">PPS</span>
                                                        <span className="text-sm font-bold text-foreground">{m.pps}</span>
                                                    </div>
                                                )}
                                                {m.matches_played && (
                                                    <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-black block">Spiele</span>
                                                        <span className="text-sm font-bold text-foreground">{m.matches_played}</span>
                                                    </div>
                                                )}
                                                {(m.wins || m.draws || m.losses) && (
                                                    <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-black block">S-U-N</span>
                                                        <span className="text-sm font-bold text-foreground">{m.wins||0}-{m.draws||0}-{m.losses||0}</span>
                                                    </div>
                                                )}
                                                {m.preferred_system && (
                                                    <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-black block">System</span>
                                                        <span className="text-sm font-bold text-foreground">{m.preferred_system}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {m.focus_region && (
                                                    <div className="bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg">
                                                        <span className="text-[10px] text-violet-500 uppercase font-black block">Fokus</span>
                                                        <span className="text-sm font-bold text-foreground">{m.focus_region}</span>
                                                    </div>
                                                )}
                                                {m.top_discoveries?.length > 0 && (
                                                    <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-black block">Entdeckungen</span>
                                                        <span className="text-sm font-bold text-foreground">{m.top_discoveries.join(', ')}</span>
                                                    </div>
                                                )}
                                                {m.network_strength && (
                                                    <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-black block">Netzwerk</span>
                                                        <span className="text-sm font-bold text-foreground">{m.network_strength}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Display Mode: LIST */}
            {viewMode === 'list' && (
                <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Station</th>
                                    <th className="px-4 py-3">Zeitraum</th>
                                    {role === 'coach' ? (
                                        <>
                                            <th className="px-4 py-3 text-center">Spiele</th>
                                            <th className="px-4 py-3 text-center">PPS</th>
                                            <th className="px-4 py-3">Erfolge</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-4 py-3 text-left">Position</th>
                                            <th className="px-4 py-3 text-left">Fokus</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {careerStations.map(station => {
                                    const m = station.metadata || {};
                                    return (
                                        <tr key={station.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                            <td className="px-4 py-3 font-bold">
                                                {station.club_name}
                                                <div className="text-[10px] text-muted-foreground font-normal">{station.league || m.position}</div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {new Date(station.start_date).getFullYear()} - {station.end_date ? new Date(station.end_date).getFullYear() : 'Heute'}
                                            </td>
                                            {role === 'coach' ? (
                                                <>
                                                    <td className="px-4 py-3 text-center">{station.matches_played || m.matches_played || '-'}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-cyan-600 dark:text-cyan-400">{station.pps || m.pps || '-'}</td>
                                                    <td className="px-4 py-3 text-xs">{station.achievements || m.achievements || '-'}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 text-xs">{station.position || m.position || '-'}</td>
                                                    <td className="px-4 py-3 text-xs">{station.focus_region || m.focus_region || '-'}</td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {careerStations.length === 0 && !loading && !showForm && (
                <EmptyState icon={Briefcase} title="Keine Stationen" description="Es wurden noch keine Karrierestationen hinterlegt." />
            )}
        </div>
    );
};
