import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Menu, X, Shield, MoreVertical, Loader2, UserCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const ROLES = ['Alle', 'trainer', 'scout', 'manager', 'player'];

const ROLE_LABELS = {
    trainer: 'Trainer',
    scout: 'Scout',
    manager: 'Manager',
    player: 'Spieler',
};

const ROLE_COLORS = {
    trainer: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    scout: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    manager: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    player: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

const useDebounce = (callback, delay) => {
    const timeoutRef = useRef(null);
    return useCallback((...args) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
};

const ActiveAccountsScreen = ({ currentUserProfile, onMenuOpen, onClose, onUserClick }) => {
    const { addToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRole, setActiveRole] = useState('Alle');

    const fetchUsers = async (query, role) => {
        setLoading(true);
        try {
            let req = supabase
                .from('players_master')
                .select('id, full_name, username, role, avatar_url, updated_at')
                .eq('is_verified', true)
                .order('updated_at', { ascending: false })
                .limit(50);

            if (query) {
                req = req.ilike('full_name', `%${query}%`);
            }
            if (role && role !== 'Alle') {
                req = req.eq('role', role);
            }

            const { data, error } = await req;
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Fetch Error Active Accounts:", error);
            addToast("Fehler beim Laden der Konten.", "error");
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = useDebounce((q, r) => fetchUsers(q, r), 400);

    useEffect(() => {
        debouncedFetch(searchQuery, activeRole);
    }, [searchQuery, activeRole, debouncedFetch]);

    if (currentUserProfile?.role !== 'admin') {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md">
                <div className="bg-card border border-red-500/30 p-8 rounded-3xl flex flex-col items-center">
                    <Shield size={48} className="text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-foreground">Zugriff verweigert</h2>
                    <button onClick={onClose} className="mt-6 px-6 py-2 bg-muted text-foreground rounded-full hover:bg-muted/80 transition">Schließen</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-3xl h-[90vh] bg-card border border-border shadow-2xl flex flex-col sm:rounded-3xl animate-in slide-in-from-bottom-8 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-5 bg-black/20 shrink-0 border-b border-border">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onMenuOpen}
                            className="p-2 -ml-2 bg-black/20 hover:bg-black/40 rounded-xl transition text-foreground hover:text-cyan-400"
                        >
                            <Menu size={22} />
                        </button>
                        <UserCheck className="text-cyan-500 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" size={24} />
                        <h2 className="text-lg font-bold text-foreground">Aktive Konten</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition text-muted-foreground hover:text-foreground shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="p-6 border-b border-border bg-black/10 shrink-0 space-y-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder="Nutzer suchen (Name)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-black/20 border border-border rounded-2xl text-foreground focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                    </div>
                    
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                        {ROLES.map(role => (
                            <button
                                key={role}
                                onClick={() => setActiveRole(role)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                                    activeRole === role 
                                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                                    : 'bg-black/20 text-muted-foreground border-border hover:bg-white/5 hover:text-foreground'
                                }`}
                            >
                                {role === 'Alle' ? 'Alle Rollen' : ROLE_LABELS[role] || role}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 size={32} className="text-cyan-500 animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-3xl bg-black/10">
                            <Search size={48} className="text-muted-foreground mb-4 opacity-50" />
                            <p className="text-lg font-bold text-foreground">Keine aktiven Konten gefunden</p>
                            <p className="text-sm text-muted-foreground mt-2">Versuche einen anderen Suchbegriff oder Filter.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {users.map(user => {
                                const roleStyle = ROLE_COLORS[user.role] || 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
                                return (
                                    <div key={user.id} className="flex items-center gap-4 p-4 bg-black/20 border border-border hover:border-cyan-500/30 rounded-2xl transition-all group">
                                        <div 
                                            className="w-14 h-14 rounded-full bg-black/40 border border-border overflow-hidden shrink-0 cursor-pointer"
                                            onClick={() => { onUserClick(user); onClose(); }}
                                        >
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold uppercase">
                                                    {user.full_name?.charAt(0) || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 
                                                className="font-bold text-foreground truncate cursor-pointer hover:text-cyan-400 transition-colors"
                                                onClick={() => { onUserClick(user); onClose(); }}
                                            >
                                                {user.full_name}
                                                <CheckCircle2 size={14} className="inline-block ml-1.5 text-cyan-400 mb-0.5" />
                                            </h3>
                                            <p className="text-xs text-muted-foreground truncate mb-1">@{user.username || 'unbekannt'}</p>
                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${roleStyle}`}>
                                                {ROLE_LABELS[user.role] || user.role}
                                            </span>
                                        </div>
                                        <button className="p-2 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0">
                                            <MoreVertical size={20} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActiveAccountsScreen;
