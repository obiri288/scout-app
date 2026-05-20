import React, { useState, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, ShieldCheck, Search, Loader2, Building, Edit3, Merge, Plus, X, GitMerge, AlertTriangle, ShieldAlert, RefreshCw, Sparkles, Trash2, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const ITEMS_PER_PAGE = 50;

export const AdminClubAuthority = ({ onBack }) => {
    const { addToast } = useToast();
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Pagination & Error states
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState(null);

    // Merge Tool States
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [masterClub, setMasterClub] = useState(null);
    const [selectedDuplicates, setSelectedDuplicates] = useState([]);
    const [isMerging, setIsMerging] = useState(false);

    const [masterSearchQuery, setMasterSearchQuery] = useState('');
    const [dupSearchQuery, setDupSearchQuery] = useState('');
    const [masterSearchResults, setMasterSearchResults] = useState([]);
    const [dupSearchResults, setDupSearchResults] = useState([]);

    const [showSafetyConfirm, setShowSafetyConfirm] = useState(false);
    const [affectedCounts, setAffectedCounts] = useState({ players: 0, stations: 0 });

    // AI Duplicate Detector States
    const [showScanModal, setShowScanModal] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanResults, setScanResults] = useState([]);

    const fetchClubs = useCallback(async (targetPage, isReset = false) => {
        setLoading(true);
        if (isReset) {
            setError(null);
        }
        try {
            const from = targetPage * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase
                .from('clubs')
                .select('*', { count: 'exact' })
                .order('name', { ascending: true })
                .range(from, to);

            if (searchQuery.trim() !== '') {
                query = query.ilike('name', `%${searchQuery}%`);
            }

            const { data, error: fetchErr, count } = await query;
            if (fetchErr) throw fetchErr;

            const fetchedData = data || [];
            
            setClubs(prev => isReset ? fetchedData : [...prev, ...fetchedData]);
            setHasMore(fetchedData.length === ITEMS_PER_PAGE && (count === null || (targetPage * ITEMS_PER_PAGE + fetchedData.length) < count));
            setPage(targetPage);
        } catch (err) {
            console.error("Error fetching clubs:", err);
            setError(err?.message || "Vereinsdaten konnten nicht geladen werden.");
            addToast("Vereine konnten nicht geladen werden.", "error");
        } finally {
            setLoading(false);
        }
    }, [searchQuery, addToast]);

    // Initial load and debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchClubs(0, true);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Real-time matching for search queries inside the merge modal
    const searchClubsForMerge = async (queryText, isMaster = true) => {
        if (!queryText.trim()) {
            if (isMaster) setMasterSearchResults([]);
            else setDupSearchResults([]);
            return;
        }
        try {
            const { data, error: sErr } = await supabase
                .from('clubs')
                .select('id, name, logo_url, league, city')
                .ilike('name', `%${queryText}%`)
                .limit(8);
            if (sErr) throw sErr;
            if (isMaster) setMasterSearchResults(data || []);
            else setDupSearchResults(data || []);
        } catch (err) {
            console.error("Error searching clubs for merge:", err);
        }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            searchClubsForMerge(masterSearchQuery, true);
        }, 250);
        return () => clearTimeout(delayDebounce);
    }, [masterSearchQuery]);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            searchClubsForMerge(dupSearchQuery, false);
        }, 250);
        return () => clearTimeout(delayDebounce);
    }, [dupSearchQuery]);

    // Check affected counts before performing high-risk deletion/migration
    const prepareMerge = async () => {
        if (!masterClub) {
            addToast("Bitte wähle zuerst einen Master-Verein aus.", "warning");
            return;
        }
        if (selectedDuplicates.length === 0) {
            addToast("Bitte wähle mindestens eine Dublette zum Zusammenführen aus.", "warning");
            return;
        }

        setIsMerging(true);
        try {
            const duplicateIds = selectedDuplicates.map(d => d.id);
            
            // Get players master count
            const { count: pCount, error: pErr } = await supabase
                .from('players_master')
                .select('id', { count: 'exact', head: true })
                .in('club_id', duplicateIds);
            if (pErr) throw pErr;

            // Get career history count
            const { count: cCount, error: cErr } = await supabase
                .from('career_history')
                .select('id', { count: 'exact', head: true })
                .in('club_id', duplicateIds);
            if (cErr) throw cErr;

            setAffectedCounts({ players: pCount || 0, stations: cCount || 0 });
            setShowSafetyConfirm(true);
        } catch (err) {
            console.error("Error calculating affected counts:", err);
            addToast("Datenprüfung vor dem Merge fehlgeschlagen.", "error");
        } finally {
            setIsMerging(false);
        }
    };

    // Execute sequential duplicate resolution migration & cleanup
    const handleMergeClubs = async () => {
        setIsMerging(true);
        setShowSafetyConfirm(false);
        try {
            const duplicateIds = selectedDuplicates.map(d => d.id);
            const masterId = masterClub.id;
            const masterName = masterClub.name;

            // 1. Update players_master primary club reference
            const { error: p1Err } = await supabase
                .from('players_master')
                .update({ club_id: masterId })
                .in('club_id', duplicateIds);
            if (p1Err) throw p1Err;

            // 2. Update players_master pending club reference
            const { error: p2Err } = await supabase
                .from('players_master')
                .update({ pending_club_id: masterId })
                .in('pending_club_id', duplicateIds);
            if (p2Err) throw p2Err;

            // 3. Update career_history club reference & sync text name
            const { error: cErr } = await supabase
                .from('career_history')
                .update({ club_id: masterId, club_name: masterName })
                .in('club_id', duplicateIds);
            if (cErr) throw cErr;

            // 4. Migrate club_claims, club_events, club_news (non-fatal catch)
            await supabase.from('club_claims').update({ club_id: masterId }).in('club_id', duplicateIds);
            await supabase.from('club_events').update({ club_id: masterId }).in('club_id', duplicateIds);
            await supabase.from('club_news').update({ club_id: masterId }).in('club_id', duplicateIds);

            // 5. Delete obsolete duplicates from clubs table
            const { error: delErr } = await supabase
                .from('clubs')
                .delete()
                .in('id', duplicateIds);
            if (delErr) throw delErr;

            addToast("Vereine erfolgreich zusammengeführt & Dubletten gelöscht!", "success");
            
            // Reset states
            setShowMergeModal(false);
            setMasterClub(null);
            setSelectedDuplicates([]);
            setMasterSearchQuery('');
            setDupSearchQuery('');
            setMasterSearchResults([]);
            setDupSearchResults([]);

            // Refresh parent list
            fetchClubs(0, true);
        } catch (err) {
            console.error("Merge transaction failure:", err);
            addToast("Kritischer Fehler beim Merge. Vorgang abgebrochen.", "error");
        } finally {
            setIsMerging(false);
        }
    };

    // AI Duplicate Scanner Call
    const handleDuplicateScan = async () => {
        setScanning(true);
        setShowScanModal(true);
        setScanResults([]);
        try {
            // A threshold of 0.55 triggers solid trigram fuzzy matches
            const { data, error: scanErr } = await supabase
                .rpc('find_duplicate_clubs', { threshold: 0.55 });
            if (scanErr) throw scanErr;
            setScanResults(data || []);
        } catch (err) {
            console.error("Fuzzy duplicate scan failure:", err);
            addToast("Fuzzy KI-Scan konnte nicht abgeschlossen werden.", "error");
        } finally {
            setScanning(false);
        }
    };

    const triggerMergeFromSuggestion = (clubA, clubB) => {
        // Pre-fill Master and Duplicate Selection in State
        setMasterClub({
            id: clubA.id,
            name: clubA.name,
            logo_url: clubA.logo,
            city: clubA.city
        });
        setSelectedDuplicates([{
            id: clubB.id,
            name: clubB.name,
            logo_url: clubB.logo,
            city: clubB.city
        }]);
        setShowScanModal(false);
        setShowMergeModal(true);
    };

    const handleIgnoreSuggestion = (clubAId, clubBId) => {
        setScanResults(prev => prev.filter(item => !(item.club_a_id === clubAId && item.club_b_id === clubBId)));
        addToast("Vorschlag ignoriert.", "info");
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-md z-20 py-2">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <button onClick={onBack} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors shrink-0">
                        <ChevronLeft size={16} />
                    </button>
                    <ShieldCheck size={16} className="text-indigo-500 shrink-0" />
                    Club Authority (SSOT)
                </h3>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleDuplicateScan}
                        disabled={scanning}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-500/20 hover:text-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Sparkles size={14} className="text-indigo-400" />
                        KI-Scan
                    </button>
                    <button 
                        onClick={() => setShowMergeModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"
                    >
                        <GitMerge size={14} /> Merge Tool
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input 
                    type="text" 
                    placeholder="Suche nach Vereinsname..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
            </div>

            {/* Table/List */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
                {error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-red-500/20 rounded-3xl bg-red-500/[0.02] p-6 animate-in fade-in">
                        <ShieldAlert className="text-red-500 mb-4 animate-pulse" size={44} />
                        <h3 className="text-lg font-black text-white mb-2">Fehler beim Laden der Daten</h3>
                        <p className="text-sm text-zinc-500 max-w-xs mb-6">{error}</p>
                        <button 
                            onClick={() => fetchClubs(0, true)} 
                            className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            <RefreshCw size={12} /> Erneut versuchen
                        </button>
                    </div>
                ) : loading && clubs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                        <p className="text-zinc-500">Lade Vereinsdatenbank...</p>
                    </div>
                ) : clubs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                        <Building size={40} className="text-zinc-700 mb-4" />
                        <h3 className="text-lg font-black text-white mb-2">Keine Vereine gefunden</h3>
                        <p className="text-sm text-zinc-500">Es wurden keine Vereine mit diesem Namen gefunden.</p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-6">
                        {clubs.map(club => {
                            const name = club?.name ?? 'Unbenannter Verein';
                            const logoUrl = club?.logo_url;
                            const id = club?.id ?? '-';
                            const isVerified = club?.is_verified;
                            const createdAt = club?.created_at;

                            return (
                                <div key={club?.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-[#111] border border-white/5 rounded-2xl hover:border-white/10 transition-colors group">
                                    
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-white/5">
                                            {logoUrl ? (
                                                <img src={logoUrl} alt={name} className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <Building size={24} className="text-zinc-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-white text-base truncate">{name}</h4>
                                                {isVerified && (
                                                    <ShieldCheck size={14} className="text-blue-500" />
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                                                ID: {id}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-white/5">
                                        {createdAt && (
                                            <div className="text-xs font-medium text-zinc-500 mr-2 hidden md:block">
                                                Erstellt: {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: de })}
                                            </div>
                                        )}
                                        
                                        <button 
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
                                            onClick={() => addToast("Bearbeitungs-Modus wird in Kürze freigeschaltet", "info")}
                                        >
                                            <Edit3 size={12} />
                                            Bearbeiten
                                        </button>
                                        
                                        <button 
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all"
                                            onClick={() => {
                                                setMasterClub(null);
                                                setSelectedDuplicates([club]);
                                                setShowMergeModal(true);
                                            }}
                                        >
                                            <Merge size={12} />
                                            Mergen
                                        </button>
                                    </div>

                                </div>
                            );
                        })}

                        {/* Pagination Trigger */}
                        {hasMore && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={() => fetchClubs(page + 1, false)}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" /> Lade...
                                        </>
                                    ) : (
                                        "Mehr laden"
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Merge Tool Dialog Modal */}
            {showMergeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-white/10 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Glow Details */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/[0.03] rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />

                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur-md z-30">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <GitMerge size={18} className="text-indigo-400" />
                                    Vereins-Merge-Werkzeug (SSOT)
                                </h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Dubletten zusammenführen und Referenzen migrieren.</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowMergeModal(false);
                                    setMasterClub(null);
                                    setSelectedDuplicates([]);
                                }}
                                className="p-1.5 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 min-h-0">
                            {/* Left Pane: Master Selection */}
                            <div className="space-y-4">
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-1">1. Master-Verein (Target)</h4>
                                    <p className="text-xs text-zinc-400 leading-normal">
                                        Dieser Eintrag bleibt erhalten. Alle Spieler-Profile und Karriere-Stationen werden dorthin verschoben.
                                    </p>
                                </div>

                                {masterClub ? (
                                    <div className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl animate-in zoom-in-95">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                                                {masterClub.logo_url ? (
                                                    <img src={masterClub.logo_url} className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <Building size={20} className="text-zinc-500" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="font-bold text-white text-sm truncate">{masterClub.name}</h5>
                                                <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest mt-0.5">Ausgewählt</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setMasterClub(null)}
                                            className="p-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Master-Verein suchen..." 
                                                value={masterSearchQuery}
                                                onChange={e => setMasterSearchQuery(e.target.value)}
                                                className="w-full bg-[#111] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>

                                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar">
                                            {masterSearchResults.map(club => (
                                                <div 
                                                    key={club.id} 
                                                    onClick={() => {
                                                        setMasterClub(club);
                                                        setMasterSearchResults([]);
                                                        setMasterSearchQuery('');
                                                    }}
                                                    className="flex items-center justify-between p-2.5 bg-[#111] hover:bg-white/[0.04] border border-white/5 rounded-xl cursor-pointer transition"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                                                            {club.logo_url ? (
                                                                <img src={club.logo_url} className="w-full h-full object-contain p-0.5" />
                                                            ) : (
                                                                <Building size={16} className="text-zinc-600" />
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-white text-xs truncate">{club.name}</span>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Wählen</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Pane: Duplicate Selection */}
                            <div className="space-y-4">
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <h4 className="text-xs font-black uppercase text-red-400 tracking-wider mb-1">2. Zu eliminierende Dubletten</h4>
                                    <p className="text-xs text-zinc-400 leading-normal">
                                        Diese Einträge werden vollständig gelöscht. Ihre verknüpften Mitglieder wechseln zum Master-Verein.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Nach Dubletten suchen & hinzufügen..." 
                                            value={dupSearchQuery}
                                            onChange={e => setDupSearchQuery(e.target.value)}
                                            className="w-full bg-[#111] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-red-500"
                                        />
                                    </div>

                                    {/* Duplicates search results dropdown */}
                                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                                        {dupSearchResults.filter(club => club.id !== masterClub?.id && !selectedDuplicates.some(sd => sd.id === club.id)).map(club => (
                                            <div 
                                                key={club.id} 
                                                onClick={() => {
                                                    setSelectedDuplicates(prev => [...prev, club]);
                                                    setDupSearchResults([]);
                                                    setDupSearchQuery('');
                                                }}
                                                className="flex items-center justify-between p-2 bg-[#111] hover:bg-white/[0.04] border border-white/5 rounded-xl cursor-pointer transition animate-in fade-in"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0 overflow-hidden">
                                                        {club.logo_url ? (
                                                            <img src={club.logo_url} className="w-full h-full object-contain p-0.5" />
                                                        ) : (
                                                            <Building size={12} className="text-zinc-600" />
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-white text-[11px] truncate">{club.name}</span>
                                                </div>
                                                <Plus size={14} className="text-red-400 shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Active duplicates list */}
                                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                                    <h5 className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Dubletten-Queue ({selectedDuplicates.length})</h5>
                                    {selectedDuplicates.length === 0 ? (
                                        <p className="text-xs text-zinc-600 italic">Noch keine Dubletten ausgewählt.</p>
                                    ) : (
                                        selectedDuplicates.map(club => (
                                            <div key={club.id} className="flex items-center justify-between p-3 bg-red-500/[0.03] border border-red-500/10 rounded-xl animate-in zoom-in-95">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                                                        {club.logo_url ? (
                                                            <img src={club.logo_url} className="w-full h-full object-contain p-0.5" />
                                                        ) : (
                                                            <Building size={16} className="text-zinc-500" />
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-white text-xs truncate">{club.name}</span>
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedDuplicates(prev => prev.filter(p => p.id !== club.id))}
                                                    className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-full transition shrink-0"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-white/5 flex gap-4 bg-zinc-950/90 z-20">
                            <button
                                onClick={() => {
                                    setShowMergeModal(false);
                                    setMasterClub(null);
                                    setSelectedDuplicates([]);
                                }}
                                className="flex-1 py-3 px-4 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={prepareMerge}
                                disabled={!masterClub || selectedDuplicates.length === 0 || isMerging}
                                className="flex-1 py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                            >
                                {isMerging ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Merge wird vorbereitet...
                                    </>
                                ) : (
                                    <>
                                        <GitMerge size={14} /> Merge validieren
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom High-Risk Transaction Alert Dialog */}
            {showSafetyConfirm && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-red-500/20 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 p-6 space-y-6">
                        {/* High-Risk Red Glow detail */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none" />

                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-white tracking-tight uppercase">Kritischer Merge-Eingriff</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    Du stehst kurz davor, <span className="text-white font-black">{affectedCounts.players}</span> Profile und <span className="text-white font-black">{affectedCounts.stations}</span> Karriere-Stationen unwiderruflich zum Master-Verein <span className="text-indigo-400 font-black">"{masterClub?.name}"</span> zu verschieben.
                                </p>
                                <p className="text-xs text-red-400 font-bold bg-red-500/5 border border-red-500/10 rounded-xl p-3 leading-relaxed mt-4">
                                    Die Dubletten ({selectedDuplicates.length} Vereine) werden anschließend dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSafetyConfirm(false)}
                                className="flex-1 py-3 px-4 bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleMergeClubs}
                                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-black font-black text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/20"
                            >
                                <GitMerge size={14} /> Merge Ausführen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Duplicate Scanner Modal */}
            {showScanModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-white/10 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />

                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur-md z-30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white uppercase tracking-widest">
                                        KI-Dubletten-Erkennung
                                    </h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">Automatisches Fuzzy Matching trigrambasierter Vereinsnamen.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowScanModal(false)}
                                className="p-1.5 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar relative z-10 min-h-0 space-y-4">
                            {scanning ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="relative flex items-center justify-center">
                                        <Loader2 size={48} className="animate-spin text-indigo-500" />
                                        <Sparkles size={16} className="text-indigo-400 absolute animate-pulse" />
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-sm">Fuzzy Matching wird ausgeführt...</h4>
                                        <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                                            Wir analysieren die Vereinsnamen auf Schreibfehler, Abkürzungen und ungenaue Übereinstimmungen.
                                        </p>
                                    </div>
                                </div>
                            ) : scanResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01] p-6">
                                    <ShieldCheck size={36} className="text-emerald-500 mb-3" />
                                    <h4 className="font-bold text-white text-sm">Keine Dubletten gefunden</h4>
                                    <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                                        Hervorragend! Auf Basis der Trigram-Ähnlichkeitsanalyse wurden derzeit keine potenziellen Vereins-Dubletten in der Datenbank entdeckt.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-black px-1">
                                        <span>Erkannte Übereinstimmungen</span>
                                        <span>Übereinstimmungs-Score</span>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {scanResults.map((item, idx) => {
                                            const scorePercent = Math.round(item.similarity_score * 100);
                                            
                                            // Format colors based on score similarity
                                            let scoreColorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
                                            if (scorePercent < 70) {
                                                scoreColorClass = "text-amber-400 bg-amber-500/10 border-amber-500/25";
                                            } else if (scorePercent >= 90) {
                                                scoreColorClass = "text-cyan-400 bg-cyan-500/10 border-cyan-500/25";
                                            }

                                            const clubA = { id: item.club_a_id, name: item.club_a_name, logo: item.club_a_logo, city: item.club_a_city };
                                            const clubB = { id: item.club_b_id, name: item.club_b_name, logo: item.club_b_logo, city: item.club_b_city };

                                            return (
                                                <div 
                                                    key={`${item.club_a_id}-${item.club_b_id}-${idx}`}
                                                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl transition animate-in fade-in"
                                                >
                                                    <div className="flex flex-1 items-center justify-between gap-4 min-w-0">
                                                        {/* Club A */}
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                                                                {item.club_a_logo ? (
                                                                    <img src={item.club_a_logo} className="w-full h-full object-contain p-0.5" />
                                                                ) : (
                                                                    <Building size={16} className="text-zinc-500" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-white text-xs block truncate">{item.club_a_name}</span>
                                                                <span className="text-[10px] text-zinc-500 truncate block mt-0.5">
                                                                    {item.club_a_city ?? 'Keine Stadt'} • ID: {item.club_a_id}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Divider Icon */}
                                                        <div className="flex flex-col items-center justify-center shrink-0 px-2">
                                                            <ArrowRight size={14} className="text-zinc-600" />
                                                            <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-wider mt-0.5">vs</span>
                                                        </div>

                                                        {/* Club B */}
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                                                                {item.club_b_logo ? (
                                                                    <img src={item.club_b_logo} className="w-full h-full object-contain p-0.5" />
                                                                ) : (
                                                                    <Building size={16} className="text-zinc-500" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-white text-xs block truncate">{item.club_b_name}</span>
                                                                <span className="text-[10px] text-zinc-500 truncate block mt-0.5">
                                                                    {item.club_b_city ?? 'Keine Stadt'} • ID: {item.club_b_id}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Rating Score & Action Buttons */}
                                                    <div className="flex items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-0 border-white/5">
                                                        <div className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg border shrink-0 text-center ${scoreColorClass}`}>
                                                            {scorePercent}% Match
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => handleIgnoreSuggestion(item.club_a_id, item.club_b_id)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all shrink-0"
                                                            >
                                                                Ignorieren
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={() => triggerMergeFromSuggestion(clubA, clubB)}
                                                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-500 text-white hover:bg-indigo-600 transition-all shrink-0 shadow-lg shadow-indigo-500/10"
                                                            >
                                                                <GitMerge size={12} />
                                                                Zusammenführen
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-white/5 flex bg-zinc-950/90 z-20">
                            <button
                                onClick={() => setShowScanModal(false)}
                                className="flex-1 py-3 px-4 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition"
                            >
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminClubAuthority;
