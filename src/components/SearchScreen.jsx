import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Shield, ChevronRight, User, Filter, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, cardStyle, glassHeader } from '../lib/styles';
import { SearchSkeleton } from './SkeletonScreens';

const PAGE_SIZE = 15;

// Available skill tags for filtering
const SKILL_FILTER_TAGS = ['Schnelligkeit', 'Beidfüßig', 'Kopfball', 'Technik', 'Spielverständnis', 'Dribbling', 'Schusskraft'];

export const SearchScreen = ({ onUserClick }) => {
    const [query, setQuery] = useState('');
    const [res, setRes] = useState([]);
    const [pos, setPos] = useState('Alle');
    const [status, setStatus] = useState('Alle');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showTagFilter, setShowTagFilter] = useState(false);
    const [selectedTag, setSelectedTag] = useState(null);
    const sentinelRef = useRef(null);

    const fetchResults = useCallback(async (offset = 0, reset = false) => {
        try {
            let q = supabase.from('players_master').select('*, clubs(*)');
            if (query) q = q.ilike('full_name', `%${query}%`);
            if (pos !== 'Alle') q = q.eq('position_primary', pos);
            if (status !== 'Alle') q = q.eq('transfer_status', status);
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
    }, [query, pos, status]);

    // Reset and refetch when filters change
    useEffect(() => {
        setLoading(true);
        setHasMore(true);
        const t = setTimeout(() => {
            fetchResults(0, true);
        }, 300);
        return () => clearTimeout(t);
    }, [query, pos, status]);

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

    const FilterChip = ({ label, active, onClick }) => (
        <button onClick={onClick} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${active ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>{label}</button>
    );

    return (
        <div className="pb-24 max-w-md mx-auto min-h-screen bg-black">
            <div className={glassHeader}><h2 className="text-2xl font-black text-white">Scouting</h2></div>
            <div className="px-4 mt-4">
                <div className="relative mb-6"><Search className="absolute left-4 top-4 text-zinc-500" size={20} /><input placeholder="Suche..." value={query} onChange={e => setQuery(e.target.value)} className={`${inputStyle} pl-12`} /></div>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">{['Alle', 'Suche Verein', 'Vertrag läuft aus', 'Gebunden'].map(s => <FilterChip key={s} label={s === 'Alle' ? 'Status: Alle' : s} active={status === s} onClick={() => setStatus(s)} />)}</div>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">{['Alle', 'ST', 'ZOM', 'ZM', 'IV', 'TW'].map(p => <FilterChip key={p} label={p === 'Alle' ? 'Pos: Alle' : p} active={pos === p} onClick={() => setPos(p)} />)}</div>

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

                {loading ? <SearchSkeleton /> : (
                    <div className="space-y-3">
                        {res.map(p => (
                            <div key={p.id} onClick={() => onUserClick(p)} className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition ${cardStyle}`}>
                                <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10 relative">{p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <User size={24} className="text-zinc-600 m-4" />}</div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center"><h3 className="font-bold text-white text-base">{p.full_name}</h3><span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-300">{p.position_primary}</span></div>
                                    <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400"><Shield size={10} /> {p.clubs?.name || "Vereinslos"}</div>
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
