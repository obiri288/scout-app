import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Shield, ChevronRight, User, Filter, Loader2, MapPin, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, cardStyle, glassHeader } from '../lib/styles';
import { SearchSkeleton } from './SkeletonScreens';

const PAGE_SIZE = 15;

const SKILL_FILTER_TAGS = ['Schnelligkeit', 'Beidfüßig', 'Kopfball', 'Technik', 'Spielverständnis', 'Dribbling', 'Schusskraft'];

export const SearchScreen = ({ onUserClick }) => {
    const [query, setQuery] = useState('');
    const [cityQuery, setCityQuery] = useState('');
    const [clubQuery, setClubQuery] = useState('');
    const [res, setRes] = useState([]);
    const [pos, setPos] = useState('Alle');
    const [status, setStatus] = useState('Alle');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showTagFilter, setShowTagFilter] = useState(false);
    const [selectedTag, setSelectedTag] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const sentinelRef = useRef(null);

    // Fetch clubs matching clubQuery for client-side filtering
    const [matchingClubIds, setMatchingClubIds] = useState(null);

    // When clubQuery changes, look up matching club IDs
    useEffect(() => {
        if (!clubQuery || clubQuery.length < 2) {
            setMatchingClubIds(null);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const { data } = await supabase.from('clubs').select('id').ilike('name', `%${clubQuery}%`);
                setMatchingClubIds((data || []).map(c => c.id));
            } catch (e) {
                setMatchingClubIds([]);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [clubQuery]);

    const fetchResults = useCallback(async (offset = 0, reset = false) => {
        try {
            let q = supabase.from('players_master').select('*, clubs(*)');
            if (query) q = q.ilike('full_name', `%${query}%`);
            if (pos !== 'Alle') q = q.eq('position_primary', pos);
            if (status !== 'Alle') q = q.eq('transfer_status', status);
            if (cityQuery) q = q.or(`city.ilike.%${cityQuery}%,zip_code.ilike.%${cityQuery}%`);
            if (matchingClubIds !== null) {
                if (matchingClubIds.length === 0) {
                    // No clubs match → no results
                    if (reset) setRes([]);
                    setHasMore(false);
                    setLoading(false);
                    setLoadingMore(false);
                    return;
                }
                q = q.in('club_id', matchingClubIds);
            }
            const { data } = await q.range(offset, offset + PAGE_SIZE - 1);

            const newItems = data || [];
            if (reset) {
                setRes(newItems);
            } else {
                setRes(prev => [...prev, ...newItems]);
            }
            setHasMore(newItems.length === PAGE_SIZE);
        } catch (e) {
            console.error("Search error:", e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [query, pos, status, cityQuery, matchingClubIds]);

    // Reset and refetch when filters change
    useEffect(() => {
        setLoading(true);
        setHasMore(true);
        const t = setTimeout(() => {
            fetchResults(0, true);
        }, 300);
        return () => clearTimeout(t);
    }, [query, pos, status, cityQuery, matchingClubIds]);

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !loadingMore && !loading && hasMore) {
                setLoadingMore(true);
                fetchResults(res.length);
            }
        }, { rootMargin: '400px' });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [res.length, hasMore, loadingMore, loading, fetchResults]);

    const activeFilterCount = [
        pos !== 'Alle',
        status !== 'Alle',
        cityQuery,
        clubQuery,
        selectedTag
    ].filter(Boolean).length;

    const clearAllFilters = () => {
        setQuery('');
        setCityQuery('');
        setClubQuery('');
        setPos('Alle');
        setStatus('Alle');
        setSelectedTag(null);
        setShowAdvanced(false);
    };

    const FilterChip = ({ label, active, onClick }) => (
        <button onClick={onClick} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${active ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>{label}</button>
    );

    return (
        <div className="pb-24 max-w-md mx-auto min-h-screen bg-black">
            <div className={glassHeader}><h2 className="text-2xl font-black text-white">Scouting</h2></div>
            <div className="px-4 mt-4">
                {/* Main search */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-4 text-zinc-500" size={20} />
                    <input placeholder="Spieler suchen..." value={query} onChange={e => setQuery(e.target.value)} className={`${inputStyle} pl-12 pr-12`} />
                    {query && (
                        <button onClick={() => setQuery('')} className="absolute right-4 top-4 text-zinc-500 hover:text-white">
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Advanced search toggle */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition mb-4 ${showAdvanced || activeFilterCount > 0
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                            : 'bg-zinc-900/50 text-zinc-500 border border-white/5 hover:border-white/10'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Filter size={14} />
                        Erweiterte Suche
                        {activeFilterCount > 0 && (
                            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{activeFilterCount}</span>
                        )}
                    </span>
                    <span>{showAdvanced ? '▲' : '▼'}</span>
                </button>

                {/* Advanced search panel */}
                {showAdvanced && (
                    <div className="space-y-4 mb-6 bg-zinc-900/30 p-4 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-2">
                        {/* City / PLZ search */}
                        <div>
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1 mb-1 block">Stadt / PLZ</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3.5 text-zinc-500" size={16} />
                                <input
                                    placeholder="z.B. Berlin, 10115..."
                                    value={cityQuery}
                                    onChange={e => setCityQuery(e.target.value)}
                                    className={`${inputStyle} pl-10 !py-3 text-sm`}
                                />
                                {cityQuery && (
                                    <button onClick={() => setCityQuery('')} className="absolute right-3 top-3.5 text-zinc-500 hover:text-white"><X size={14} /></button>
                                )}
                            </div>
                        </div>

                        {/* Club search */}
                        <div>
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1 mb-1 block">Verein</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-3.5 text-zinc-500" size={16} />
                                <input
                                    placeholder="z.B. FC Bayern, BVB..."
                                    value={clubQuery}
                                    onChange={e => setClubQuery(e.target.value)}
                                    className={`${inputStyle} pl-10 !py-3 text-sm`}
                                />
                                {clubQuery && (
                                    <button onClick={() => setClubQuery('')} className="absolute right-3 top-3.5 text-zinc-500 hover:text-white"><X size={14} /></button>
                                )}
                            </div>
                        </div>

                        {/* Clear all */}
                        {activeFilterCount > 0 && (
                            <button onClick={clearAllFilters} className="w-full text-xs text-zinc-500 hover:text-white transition py-2">
                                Alle Filter zurücksetzen
                            </button>
                        )}
                    </div>
                )}

                {/* Quick filter chips */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">{['Alle', 'Suche Verein', 'Vertrag läuft aus', 'Gebunden'].map(s => <FilterChip key={s} label={s === 'Alle' ? 'Status: Alle' : s} active={status === s} onClick={() => setStatus(s)} />)}</div>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">{['Alle', 'ST', 'ZOM', 'ZM', 'ZDM', 'IV', 'RV', 'LV', 'RA', 'LA', 'TW'].map(p => <FilterChip key={p} label={p === 'Alle' ? 'Pos: Alle' : p} active={pos === p} onClick={() => setPos(p)} />)}</div>

                {/* Skill tag filter */}
                <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide border-b border-white/5 mb-4">
                    <button
                        onClick={() => setShowTagFilter(!showTagFilter)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${selectedTag ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                        <Filter size={12} /> {selectedTag || 'Skill-Filter'}
                    </button>
                    {showTagFilter && SKILL_FILTER_TAGS.map(tag => (
                        <FilterChip
                            key={tag}
                            label={tag}
                            active={selectedTag === tag}
                            onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setShowTagFilter(false); }}
                        />
                    ))}
                </div>

                {/* Active filter summary */}
                {(cityQuery || clubQuery) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {cityQuery && (
                            <span className="bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                                <MapPin size={10} /> {cityQuery}
                                <button onClick={() => setCityQuery('')} className="ml-1 hover:text-white"><X size={12} /></button>
                            </span>
                        )}
                        {clubQuery && (
                            <span className="bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                                <Shield size={10} /> {clubQuery}
                                <button onClick={() => setClubQuery('')} className="ml-1 hover:text-white"><X size={12} /></button>
                            </span>
                        )}
                    </div>
                )}

                {loading ? <SearchSkeleton /> : (
                    <div className="space-y-3">
                        {res.map(p => (
                            <div key={p.id} onClick={() => onUserClick(p)} className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition ${cardStyle}`}>
                                <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10 relative">{p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <User size={24} className="text-zinc-600 m-4" />}</div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center"><h3 className="font-bold text-white text-base">{p.full_name}</h3><span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-300">{p.position_primary}</span></div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                                        <span className="flex items-center gap-1"><Shield size={10} /> {p.clubs?.name || "Vereinslos"}</span>
                                        {p.city && <span className="flex items-center gap-1"><MapPin size={10} /> {p.city}</span>}
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-zinc-600" />
                            </div>
                        ))}
                        {res.length === 0 && <div className="text-center py-20 text-zinc-600"><Search size={48} className="mx-auto mb-4 opacity-20" /><p>Keine Ergebnisse</p></div>}

                        {/* Infinite scroll sentinel */}
                        {hasMore && (
                            <div ref={sentinelRef} className="flex justify-center py-6">
                                {loadingMore && <Loader2 className="animate-spin text-zinc-500" size={24} />}
                            </div>
                        )}
                        {!hasMore && res.length > 0 && (
                            <div className="text-center text-zinc-700 text-xs py-6">Alle Ergebnisse geladen.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
