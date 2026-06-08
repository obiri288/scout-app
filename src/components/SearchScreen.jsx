import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Shield, ChevronRight, User, Filter, Loader2, MapPin, 
    X, Map, List, Trash2, Clock, Crosshair, Play, Menu 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, cardStyle, glassHeader } from '../lib/styles';
import { formatPosition } from '../lib/utils';
import { SearchSkeleton } from './SkeletonScreens';
import { MapScreen } from './MapScreen';
import { useUser } from '../contexts/UserContext';
import { useEcosystem } from '../contexts/EcosystemContext';
import { VerificationBadge } from './VerificationBadge';
import { getClubDisplay } from '../lib/helpers';
import { useSearchHistory } from '../hooks/useSearchHistory';

const PAGE_SIZE = 15;

const SKILL_FILTER_TAGS = ['Schnelligkeit', 'Beidfüßig', 'Kopfball', 'Technik', 'Spielverständnis', 'Dribbling', 'Schusskraft'];

const ACTION_FILTER_TAGS = ['Traumpass', 'Dribbling', 'Abschluss', 'Flanke', 'Zweikampf', 'Balleroberung', 'Speed', 'Ballkontrolle', 'Einsatz', 'Parade'];
const ARCHETYPE_FILTER_TAGS = ['Spielmacher', 'Flügelflitzer', 'Knipser', 'Zerstörer', 'Wandspieler', 'Box-to-Box', 'Modern Defender', 'Sweeper Keeper'];

// Stagger animation variants for results list
const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.05,
        },
    },
};

const listItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: "easeOut" },
    },
};

const RECENT_SEARCHES_KEY = 'scout_recent_searches';
const getRecentSearches = () => {
    try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || []; } catch { return []; }
};

export const SearchScreen = ({ onUserClick, onMenuOpen }) => {
    const [searchMode, setSearchMode] = useState('athletes'); // 'athletes' | 'clubs'
    const [query, setQuery] = useState('');
    const [cityQuery, setCityQuery] = useState('');
    const [clubQuery, setClubQuery] = useState('');
    const [res, setRes] = useState([]);
    const [clubRes, setClubRes] = useState([]);
    const [pos, setPos] = useState('Alle');
    const [status, setStatus] = useState('Alle');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [clubHasMore, setClubHasMore] = useState(true);
    const [showTagFilter, setShowTagFilter] = useState(false);
    const [selectedTag, setSelectedTag] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState(getRecentSearches);
    const { recentProfiles, removeProfile: removeRecentProfile, clearAll: clearRecentProfiles } = useSearchHistory();
    const [showActionFilter, setShowActionFilter] = useState(false);
    const [selectedActionTag, setSelectedActionTag] = useState(null);
    const [actionVideos, setActionVideos] = useState([]);
    const [loadingAction, setLoadingAction] = useState(false);
    const [showArchetypeFilter, setShowArchetypeFilter] = useState(false);
    const [selectedArchetype, setSelectedArchetype] = useState(null);
    const sentinelRef = useRef(null);

    // Save search to recent history
    const saveRecentSearch = useCallback((term) => {
        if (!term || term.trim().length < 2) return;
        const trimmed = term.trim();
        const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }, [recentSearches]);

    const saveRecentProfile = useCallback((profile) => {
        // Profile saving is now handled by useSearchHistory via the profileVisited event
        // dispatched from useAppState.loadProfile(). No manual save needed here.
    }, []);

    const clearRecentHistory = () => {
        setRecentSearches([]);
        clearRecentProfiles();
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    const handleUserClick = (profile) => {
        onUserClick(profile);
    };

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

    const { currentUserProfile: userFromContext, hiddenUserIds } = useUser();
    const { activeEcosystem } = useEcosystem();

    const fetchResults = useCallback(async (offset = 0, reset = false) => {
        if (searchMode === 'clubs') {
            try {
                let q = supabase.from('clubs').select('id, name, logo_url, is_verified, club_teams(count)').ilike('name', `%${query}%`);
                const { data } = await q.range(offset, offset + PAGE_SIZE - 1);
                
                const newItems = data || [];
                if (reset) setClubRes(newItems);
                else setClubRes(prev => [...prev, ...newItems]);
                setClubHasMore(newItems.length === PAGE_SIZE);
            } catch (e) {
                console.error("Club search error:", e);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
            return;
        }

        try {
            let q = supabase.from('players_master').select('*, clubs(*), career_history(*)').eq('is_deactivated', false).eq('is_under_review', false);
            if (activeEcosystem !== 'all' && !query) {
                q = q.eq('ecosystem', activeEcosystem);
            }
            if (query) q = q.ilike('full_name', `%${query}%`);
            if (pos !== 'Alle') q = q.eq('position_primary', pos);
            if (status !== 'Alle') q = q.eq('transfer_status', status);
            if (selectedArchetype) q = q.eq('player_archetype', selectedArchetype);
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
            
            // Client-side filtering for hidden profiles
            const hiddenProfiles = userFromContext?.hidden_profiles || [];
            const hiddens = hiddenUserIds || [];
            const filteredItems = newItems.filter(p => !hiddenProfiles.includes(p.id) && !hiddens.includes(p.id));

            if (reset) {
                setRes(filteredItems);
            } else {
                setRes(prev => [...prev, ...filteredItems]);
            }
            setHasMore(newItems.length === PAGE_SIZE);
        } catch (e) {
            console.error("Search error:", e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [query, pos, status, cityQuery, matchingClubIds, userFromContext, selectedArchetype, activeEcosystem, searchMode]);

    // Reset and refetch when filters change
    useEffect(() => {
        setLoading(true);
        setHasMore(true);
        setClubHasMore(true);
        const t = setTimeout(() => {
            fetchResults(0, true);
            if (query && query.trim().length >= 2) saveRecentSearch(query);
        }, 500);
        return () => clearTimeout(t);
    }, [query, pos, status, cityQuery, matchingClubIds, selectedArchetype, activeEcosystem, searchMode]);

    // Fetch videos when action tag is selected
    useEffect(() => {
        if (!selectedActionTag) { setActionVideos([]); return; }
        setLoadingAction(true);
        const fetchActionVideos = async () => {
            try {
                let actionQ = supabase
                    .from('media_highlights')
                    .select('*, players_master!inner(*, clubs(name), career_history(*))')
                    .eq('players_master.is_deactivated', false)
                    .eq('is_under_review', false)
                    .contains('action_tags', [selectedActionTag])
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (activeEcosystem !== 'all') {
                    actionQ = actionQ.in('players_master.ecosystem', [activeEcosystem, 'all']);
                }
                const { data } = await actionQ;

                // Client-side filtering for hidden videos/profiles
                const hiddenVideos = userFromContext?.hidden_videos || [];
                const hiddenProfiles = userFromContext?.hidden_profiles || [];
                const hiddens = hiddenUserIds || [];
                
                const filteredActionVideos = (data || []).filter(v => 
                    !hiddenVideos.includes(v.id) && 
                    !hiddenProfiles.includes(v.players_master?.id) &&
                    !hiddens.includes(v.players_master?.id)
                );

                setActionVideos(filteredActionVideos);
            } catch (e) {
                console.error('Action filter error:', e);
            } finally {
                setLoadingAction(false);
            }
        };
        fetchActionVideos();
    }, [selectedActionTag, activeEcosystem]);

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        const currentHasMore = searchMode === 'clubs' ? clubHasMore : hasMore;
        if (!sentinelRef.current || !currentHasMore) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !loadingMore && !loading && currentHasMore) {
                setLoadingMore(true);
                fetchResults(searchMode === 'clubs' ? clubRes.length : res.length);
            }
        }, { rootMargin: '400px' });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [res.length, clubRes.length, hasMore, clubHasMore, loadingMore, loading, fetchResults, searchMode]);

    const activeFilterCount = [
        pos !== 'Alle',
        status !== 'Alle',
        cityQuery,
        clubQuery,
        selectedTag,
        selectedActionTag,
        selectedArchetype
    ].filter(Boolean).length;

    const clearAllFilters = () => {
        setQuery('');
        setCityQuery('');
        setClubQuery('');
        setPos('Alle');
        setStatus('Alle');
        setSelectedTag(null);
        setSelectedActionTag(null);
        setSelectedArchetype(null);
        setShowAdvanced(false);
    };

    const FilterChip = ({ label, active, onClick }) => (
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick} className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 ease-out border ${active ? 'bg-gradient-to-r from-indigo-600 to-cyan-400 text-white border-transparent shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20 hover:text-white shadow-inner'}`}>{label}</motion.button>
    );

    return (
        <div className="pb-32 max-w-md mx-auto min-h-screen bg-background">
            <div className={`${glassHeader} flex items-center gap-3`}>
                <button
                    onClick={onMenuOpen}
                    className="p-1 text-muted-foreground hover:text-white transition active:scale-95"
                    aria-label="Menü öffnen"
                >
                    <Menu size={24} />
                </button>
                <h2 className="text-2xl font-black text-foreground tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">Scouting</h2>
            </div>
            <div className="px-4 mt-6 relative">
                {/* Search Mode Toggle */}
                <div className="flex bg-slate-900/50 p-1 rounded-full mb-4 border border-white/5 shadow-inner">
                    <button 
                        onClick={() => setSearchMode('athletes')}
                        className={`flex-1 text-sm font-bold py-2 rounded-full transition-all ${searchMode === 'athletes' ? 'bg-slate-800 text-cyan-400 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Athleten
                    </button>
                    <button 
                        onClick={() => setSearchMode('clubs')}
                        className={`flex-1 text-sm font-bold py-2 rounded-full transition-all ${searchMode === 'clubs' ? 'bg-slate-800 text-cyan-400 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Vereine
                    </button>
                </div>

                {/* Main search and Map Toggle */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1 z-50">
                        <Search className="absolute left-4 top-4 text-muted-foreground" size={20} />
                        <input 
                            placeholder={searchMode === 'clubs' ? "Verein suchen..." : "Spieler suchen..."} 
                            value={query} 
                            onChange={e => setQuery(e.target.value)} 
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && query.trim()) {
                                    saveRecentSearch(query);
                                    setIsSearchFocused(false);
                                }
                            }}
                            className={`${inputStyle} pl-12 pr-12 bg-white/5 focus:bg-white/10 transition-colors`} 
                        />
                        {query && (
                            <button onClick={() => { setQuery(''); setIsSearchFocused(true); }} className="absolute right-4 top-4 text-muted-foreground hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        )}

                        {/* Search History Empty State Dropdown */}
                        {!query && isSearchFocused && viewMode === 'list' && (recentSearches.length > 0 || recentProfiles.length > 0) && (
                            <div className="absolute top-full left-0 right-0 mt-2 p-4 rounded-2xl bg-slate-900/95 border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-top-2">
                                
                                {recentSearches.length > 0 && (
                                    <div className="mb-5">
                                        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-bold">Zuletzt gesucht</h4>
                                        <ul className="space-y-1">
                                            {recentSearches.map(term => (
                                                <li key={term} onClick={() => { setQuery(term); setIsSearchFocused(false); }} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-cyan-400 hover:bg-white/5 cursor-pointer transition-colors group">
                                                    <Clock size={14} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                                    <span>{term}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {recentProfiles.length > 0 && (
                                    <div>
                                        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-bold">Zuletzt besucht</h4>
                                        <div className="space-y-1">
                                            <AnimatePresence mode="popLayout">
                                                {recentProfiles.map(p => (
                                                    <motion.div
                                                        key={p.id}
                                                        layout
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                                                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                                                    >
                                                        <div
                                                            onClick={() => handleUserClick(p)}
                                                            className="flex items-center gap-3 flex-1 min-w-0"
                                                        >
                                                            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all bg-slate-800 flex-shrink-0">
                                                                {p.avatar_url ? (
                                                                    <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.full_name} />
                                                                ) : (
                                                                    <img src="/cavio-icon.png" className="w-full h-full object-contain p-2.5 opacity-60" alt={p.full_name} />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-slate-200 group-hover:text-cyan-400 truncate transition-colors">{p.full_name}</p>
                                                                <p className="text-[10px] text-slate-500 truncate">
                                                                    {p.club_name || (p.role === 'scout' ? 'Scout' : 'Spieler')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeRecentProfile(p.id);
                                                            }}
                                                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-full hover:bg-red-500/10 flex-shrink-0"
                                                            title="Aus Verlauf entfernen"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                        <button
                                            onClick={clearRecentHistory}
                                            className="w-full text-center text-[10px] text-slate-600 hover:text-red-400 transition-colors mt-3 py-1.5 uppercase tracking-wider font-bold"
                                        >
                                            Verlauf löschen
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {searchMode === 'athletes' && (
                        <button
                            onClick={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}
                            className="h-14 w-14 shrink-0 bg-white/5 border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-95 shadow-inner z-40"
                        >
                            {viewMode === 'list' ? <Map size={24} /> : <List size={24} />}
                        </button>
                    )}
                </div>

                {viewMode === 'map' ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <MapScreen onClose={() => setViewMode('list')} onUserClick={onUserClick} />
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        {searchMode === 'athletes' && (
                            <>
                        {/* Advanced search toggle */}
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 ease-out mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-95 ${showAdvanced || activeFilterCount > 0
                                ? 'bg-indigo-500/10 text-cyan-400 border border-indigo-500/30 shadow-[inner_0_0_20px_rgba(0,240,255,0.1)]'
                                : 'bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20 hover:text-white backdrop-blur-md'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Filter size={14} />
                                Erweiterte Suche
                                {activeFilterCount > 0 && (
                                    <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{activeFilterCount}</span>
                                )}
                            </span>
                            <span>{showAdvanced ? '▲' : '▼'}</span>
                        </button>

                        {/* Advanced search panel */}
                        {showAdvanced && (
                            <div className="space-y-4 mb-6 bg-white/5 p-5 rounded-3xl border border-border shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2">
                                {/* City / PLZ search */}
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider ml-1 mb-1.5 block">Stadt / PLZ</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3.5 text-muted-foreground" size={16} />
                                        <input
                                            placeholder="z.B. Berlin, 10115..."
                                            value={cityQuery}
                                            onChange={e => setCityQuery(e.target.value)}
                                            className={`${inputStyle} pl-10 !py-3 text-sm`}
                                        />
                                        {cityQuery && (
                                            <button onClick={() => setCityQuery('')} className="absolute right-3 top-3.5 text-muted-foreground hover:text-white"><X size={14} /></button>
                                        )}
                                    </div>
                                </div>

                                {/* Club search */}
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider ml-1 mb-1.5 block">Verein</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-3.5 text-muted-foreground" size={16} />
                                        <input
                                            placeholder="z.B. FC Bayern, BVB..."
                                            value={clubQuery}
                                            onChange={e => setClubQuery(e.target.value)}
                                            className={`${inputStyle} pl-10 !py-3 text-sm`}
                                        />
                                        {clubQuery && (
                                            <button onClick={() => setClubQuery('')} className="absolute right-3 top-3.5 text-muted-foreground hover:text-white"><X size={14} /></button>
                                        )}
                                    </div>
                                </div>

                                {/* Clear all */}
                                {activeFilterCount > 0 && (
                                    <button onClick={clearAllFilters} className="w-full text-xs text-muted-foreground hover:text-white transition py-2">
                                        Alle Filter zurücksetzen
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Quick filter chips */}
                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">{['Alle', 'Suche Verein', 'Vertrag läuft aus', 'Gebunden'].map(s => <FilterChip key={s} label={s === 'Alle' ? 'Status: Alle' : s} active={status === s} onClick={() => setStatus(s)} />)}</div>
                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">{['Alle', 'ST', 'ZOM', 'ZM', 'ZDM', 'IV', 'RV', 'LV', 'RA', 'LA', 'TW'].map(p => <FilterChip key={p} label={p === 'Alle' ? 'Pos: Alle' : p} active={pos === p} onClick={() => setPos(p)} />)}</div>

                        {/* Skill tag filter */}
                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">
                            <button
                                onClick={() => setShowTagFilter(!showTagFilter)}
                                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 ease-out border flex items-center gap-1.5 ${selectedTag ? 'bg-gradient-to-r from-indigo-600 to-cyan-400 text-white border-transparent shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 shadow-inner'}`}
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

                        {/* Archetype filter (Player Scouting) */}
                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">
                            <button
                                onClick={() => setShowArchetypeFilter(!showArchetypeFilter)}
                                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 ease-out border flex items-center gap-1.5 ${selectedArchetype ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 shadow-inner'}`}
                            >
                                <User size={12} /> {selectedArchetype || 'Spielertyp'}
                            </button>
                            {showArchetypeFilter && ARCHETYPE_FILTER_TAGS.map(tag => (
                                <FilterChip
                                    key={tag}
                                    label={tag}
                                    active={selectedArchetype === tag}
                                    onClick={() => { setSelectedArchetype(selectedArchetype === tag ? null : tag); setShowArchetypeFilter(false); }}
                                />
                            ))}
                        </div>

                        {/* Action tag filter (Video Scouting) */}
                        <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide border-b border-border mb-4 px-1">
                            <button
                                onClick={() => setShowActionFilter(!showActionFilter)}
                                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 ease-out border flex items-center gap-1.5 ${selectedActionTag ? 'bg-gradient-to-r from-amber-500 to-cyan-400 text-white border-transparent shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 shadow-inner'}`}
                            >
                                <Crosshair size={12} /> {selectedActionTag || 'Video-Highlights'}
                            </button>
                            {showActionFilter && ACTION_FILTER_TAGS.map(tag => (
                                <FilterChip
                                    key={tag}
                                    label={tag}
                                    active={selectedActionTag === tag}
                                    onClick={() => { setSelectedActionTag(selectedActionTag === tag ? null : tag); setShowActionFilter(false); }}
                                />
                            ))}
                        </div>

                        {/* Active filter summary */}
                        {(cityQuery || clubQuery) && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {cityQuery && (
                                    <span className="bg-indigo-600/20 text-cyan-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                                        <MapPin size={10} /> {cityQuery}
                                        <button onClick={() => setCityQuery('')} className="ml-1 hover:text-white"><X size={12} /></button>
                                    </span>
                                )}
                                {clubQuery && (
                                    <span className="bg-indigo-600/20 text-cyan-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                                        <Shield size={10} /> {clubQuery}
                                        <button onClick={() => setClubQuery('')} className="ml-1 hover:text-white"><X size={12} /></button>
                                    </span>
                                )}
                            </div>
                        )}
                            </>
                        )}

                        {/* Results: Action Videos OR Player Search OR Club Search */}
                        {searchMode === 'clubs' ? (
                            <div className="space-y-3 animate-in fade-in">
                                {loading ? <SearchSkeleton /> : (
                                    <motion.div variants={listContainerVariants} initial="hidden" animate="visible" className="space-y-3">
                                        {clubRes.map(club => (
                                            <motion.div 
                                                key={club.id} 
                                                variants={listItemVariants} 
                                                whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.07)" }} 
                                                whileTap={{ scale: 0.98 }} 
                                                onClick={() => window.location.hash = `#club/${club.id}`} 
                                                className={`flex items-center gap-4 p-3 cursor-pointer group ${cardStyle}`}
                                            >
                                                <div className="w-14 h-14 rounded-2xl bg-slate-900 flex-shrink-0 overflow-hidden border border-white/10 flex items-center justify-center relative shadow-inner group-hover:border-cyan-500/50 transition-colors duration-300">
                                                    {club.logo_url ? <img src={club.logo_url} className="w-full h-full object-cover" /> : <Shield size={24} className="text-slate-500" />}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <h3 className="font-bold text-foreground text-base tracking-tight truncate">{club.name}</h3>
                                                        {club.is_verified && <VerificationBadge size={14} status="approved" />}
                                                    </div>
                                                    {club.club_teams && club.club_teams.length > 0 && club.club_teams[0].count > 0 && (
                                                        <div className="mt-1">
                                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-slate-800/50 border border-slate-700 px-2 py-0.5 rounded-md">
                                                                {club.club_teams[0].count} aktive Kader
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <ChevronRight size={18} className="text-muted-foreground group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                                            </motion.div>
                                        ))}
                                        {clubRes.length === 0 && <div className="text-center py-20 text-muted-foreground"><Shield size={48} className="mx-auto mb-4 opacity-20" /><p>Keine Vereine gefunden</p></div>}
                                        
                                        {/* Infinite scroll sentinel */}
                                        {clubHasMore && (
                                            <div ref={sentinelRef} className="flex justify-center py-6">
                                                {loadingMore && <Loader2 className="animate-spin text-muted-foreground" size={24} />}
                                            </div>
                                        )}
                                        {!clubHasMore && clubRes.length > 0 && (
                                            <div className="text-center text-muted-foreground text-xs py-6">Alle Ergebnisse geladen.</div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        ) : selectedActionTag ? (
                            // Action Video Results
                            <div className="space-y-3 animate-in fade-in">
                                <div className="flex items-center gap-2 mb-2">
                                    <Crosshair size={14} className="text-amber-400" />
                                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Video Scouting: {selectedActionTag}</span>
                                    <button onClick={() => setSelectedActionTag(null)} className="ml-auto text-[10px] text-muted-foreground hover:text-white transition">
                                        <X size={14} />
                                    </button>
                                </div>
                                {loadingAction ? <SearchSkeleton /> : (
                                    <motion.div variants={listContainerVariants} initial="hidden" animate="visible" className="space-y-3">
                                        {actionVideos.map(v => {
                                            const isCaptain = v.players_master?.career_history?.some(c => c.is_captain && !c.end_date && c.verification_status === 'approved') ?? false;
                                            return (
                                                <motion.div key={v.id} variants={listItemVariants} whileHover={{ y: -2 }} className={`${cardStyle} overflow-hidden cursor-pointer group ${isCaptain ? 'border-l-2 border-yellow-500/80' : ''}`} onClick={() => handleUserClick(v.players_master)}>
                                                    <div className="flex gap-3 p-3">
                                                        <div className="w-28 h-20 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative border border-white/10">
                                                            {v.thumbnail_url ? (
                                                                <img src={v.thumbnail_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center"><Play size={20} className="text-muted-foreground" /></div>
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                            <div>
                                                                <h4 className="font-bold text-foreground text-sm truncate flex items-center gap-1.5">
                                                                    <span className="truncate">{v.players_master?.full_name}</span>
                                                                    {((v.players_master?.verification_status && v.players_master?.verification_status !== 'unverified') || v.players_master?.is_official) && (
                                                                        <VerificationBadge 
                                                                            size={12} 
                                                                            status={v.players_master?.verification_status} 
                                                                            verificationStatus={v.players_master?.verification_status} 
                                                                            isOfficial={v.players_master?.is_official} 
                                                                        />
                                                                    )}
                                                                </h4>
                                                                {!(v.players_master?.email === 'kontakt@cavio.me' || v.players_master?.is_official || v.players_master?.role === 'system') && (
                                                                    <div className="flex flex-row items-center gap-3 mt-1">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1 min-w-0">
                                                                            <Shield size={9} className="text-cyan-400 shrink-0" />
                                                                            <span className="truncate">{getClubDisplay(v.players_master)}</span>
                                                                        </div>
                                                                        <span className="bg-gray-800 rounded-md px-2 py-0.5 text-[10px] text-white/90 font-medium shrink-0 flex items-center">
                                                                            {formatPosition(v.players_master?.position_primary)}
                                                                            {isCaptain && <span className="text-yellow-500/90 font-bold ml-1">• ©</span>}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                                {(v.action_tags || []).slice(0, 3).map(tag => (
                                                                    <span key={tag} className="bg-white/10 backdrop-blur-xl border border-white/20 text-cyan-400 text-[9px] font-bold px-2 py-0.5 rounded-full">{tag}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                        {actionVideos.length === 0 && (
                                            <div className="text-center py-20 text-muted-foreground">
                                                <Crosshair size={48} className="mx-auto mb-4 opacity-20" />
                                                <p>Keine Videos mit "{selectedActionTag}" gefunden.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            // Player Search Results
                            <>
                                {loading ? <SearchSkeleton /> : (
                                    <motion.div
                                        variants={listContainerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="space-y-3"
                                    >
                                        {res.map(p => {
                                            const isCaptain = p.career_history?.some(c => c.is_captain && !c.end_date && c.verification_status === 'approved') ?? false;
                                            return (
                                                <motion.div key={p.id} variants={listItemVariants} whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.07)" }} whileTap={{ scale: 0.98 }} onClick={() => handleUserClick(p)} className={`flex items-center gap-4 p-3 cursor-pointer group ${cardStyle} ${isCaptain ? 'border-l-2 border-yellow-500/80' : ''}`}>
                                                    <div className="w-14 h-14 rounded-2xl bg-card flex-shrink-0 overflow-hidden border border-border relative shadow-inner group-hover:border-cyan-500/50 transition-colors duration-300">{p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <img src="/cavio-icon.png" className="w-full h-full object-contain p-4 opacity-60" />}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-foreground text-base tracking-tight truncate flex items-center gap-1.5">
                                                            <span className="truncate">{p.full_name}</span>
                                                            {((p.verification_status && p.verification_status !== 'unverified') || p.is_official) && (
                                                                <VerificationBadge 
                                                                    size={14} 
                                                                    status={p.verification_status} 
                                                                    verificationStatus={p.verification_status} 
                                                                    isOfficial={p.is_official} 
                                                                />
                                                            )}
                                                        </h3>
                                                        {!(p.email === 'kontakt@cavio.me' || p.is_official || p.role === 'system') && (
                                                            <div className="flex flex-row items-center gap-3 mt-1">
                                                                <div className="text-sm text-gray-400 flex items-center gap-1 min-w-0">
                                                                    <Shield size={10} className="text-cyan-400 shrink-0" />
                                                                    <span className="truncate">{getClubDisplay(p)}</span>
                                                                </div>
                                                                <span className="bg-gray-800 rounded-md px-2 py-0.5 text-xs text-white/90 font-medium shrink-0 flex items-center">
                                                                    {formatPosition(p.position_primary)}
                                                                    {isCaptain && <span className="text-yellow-500/90 font-bold ml-1">• ©</span>}
                                                                </span>
                                                                {p.city && (
                                                                    <span className="flex items-center gap-1 text-xs text-gray-500 truncate">
                                                                        <MapPin size={10} className="shrink-0" />
                                                                        <span className="truncate">{p.city}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ChevronRight size={18} className="text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                                                </motion.div>
                                            );
                                        })}
                                        {res.length === 0 && <div className="text-center py-20 text-muted-foreground"><Search size={48} className="mx-auto mb-4 opacity-20" /><p>Keine Ergebnisse</p></div>}

                                        {/* Infinite scroll sentinel */}
                                        {hasMore && (
                                            <div ref={sentinelRef} className="flex justify-center py-6">
                                                {loadingMore && <Loader2 className="animate-spin text-muted-foreground" size={24} />}
                                            </div>
                                        )}
                                        {!hasMore && res.length > 0 && (
                                            <div className="text-center text-muted-foreground text-xs py-6">Alle Ergebnisse geladen.</div>
                                        )}
                                    </motion.div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
