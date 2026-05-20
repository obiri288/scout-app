import React, { useState, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, Users, Shield, Search, Loader2, CheckCircle, ShieldAlert, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useUser } from '../contexts/UserContext';
import { VerificationBadge } from './VerificationBadge';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const ITEMS_PER_PAGE = 50;

// Role labels helper
const getRoleLabel = (role) => {
    const labels = {
        player: 'Spieler',
        coach: 'Trainer',
        scout: 'Scout',
        admin: 'Admin',
        system: 'System'
    };
    return labels[role] || role;
};

export const AdminUserIntelligence = ({ onBack, onUserClick }) => {
    const { addToast } = useToast();
    const { currentUserProfile } = useUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    
    // Pagination & Error states
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState(null);

    // Confirmation Modal state
    const [pendingRoleChange, setPendingRoleChange] = useState(null);

    const fetchUsers = useCallback(async (targetPage, isReset = false) => {
        setLoading(true);
        if (isReset) {
            setError(null);
        }
        try {
            const from = targetPage * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase
                .from('players_master')
                .select('id, user_id, full_name, email, username, avatar_url, role, created_at, is_verified, verification_status, is_official', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (searchQuery.trim() !== '') {
                query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
            }

            const { data, error: fetchErr, count } = await query;
            if (fetchErr) throw fetchErr;

            const fetchedData = data || [];
            
            setUsers(prev => isReset ? fetchedData : [...prev, ...fetchedData]);
            setHasMore(fetchedData.length === ITEMS_PER_PAGE && (count === null || (targetPage * ITEMS_PER_PAGE + fetchedData.length) < count));
            setPage(targetPage);
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(err?.message || "Nutzerdaten konnten nicht geladen werden.");
            addToast("Nutzer konnten nicht geladen werden.", "error");
        } finally {
            setLoading(false);
        }
    }, [searchQuery, addToast]);

    // Initial load and debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUsers(0, true);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleRoleChange = async (userId, previousRole, newRole) => {
        if (userId === currentUserProfile?.id) {
            addToast("Du kannst deine eigene Admin-Rolle nicht ändern, um Lockout zu vermeiden.", "warning");
            return;
        }

        setUpdatingId(userId);
        // Optimistic UI update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

        try {
            const { error: updateErr } = await supabase
                .from('players_master')
                .update({ role: newRole })
                .eq('id', userId);
            
            if (updateErr) throw updateErr;

            addToast(`Rolle erfolgreich auf "${getRoleLabel(newRole)}" aktualisiert.`, 'success');
        } catch (err) {
            console.error("Error updating role:", err);
            // Revert state on failure
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: previousRole } : u));
            addToast("Rolle konnte nicht geändert werden. Aktion abgebrochen.", "error");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-md z-20 py-2">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <button onClick={onBack} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors shrink-0">
                        <ChevronLeft size={16} />
                    </button>
                    <Users size={16} className="text-cyan-500 shrink-0" />
                    User Intelligence
                </h3>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input 
                    type="text" 
                    placeholder="Suche nach Name, @Username oder E-Mail..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
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
                            onClick={() => fetchUsers(0, true)} 
                            className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            <RefreshCw size={12} /> Erneut versuchen
                        </button>
                    </div>
                ) : loading && users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-cyan-500 mb-2" size={32} />
                        <p className="text-zinc-500">Lade Nutzerdaten...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                        <Users size={40} className="text-zinc-700 mb-4" />
                        <h3 className="text-lg font-black text-white mb-2">Keine Nutzer gefunden</h3>
                        <p className="text-sm text-zinc-500">Es wurden keine Nutzer mit diesem Suchbegriff gefunden.</p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-6">
                        {users.map(user => {
                            const fullName = user?.full_name ?? 'Unbekannter Nutzer';
                            const userName = user?.username ? `@${user.username}` : '@-';
                            const email = user?.email ?? 'Keine E-Mail';
                            const role = user?.role ?? 'player';
                            const avatarUrl = user?.avatar_url;
                            const createdAt = user?.created_at;

                            // Self-Lockout check: disable if row is the logged-in admin
                            const isSelf = user?.id === currentUserProfile?.id || user?.user_id === currentUserProfile?.user_id;

                            return (
                                <div key={user?.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-[#111] border border-white/5 rounded-2xl hover:border-white/10 transition-colors group">
                                    
                                    <div className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer" onClick={() => onUserClick && onUserClick(user)}>
                                        <div className="w-12 h-12 rounded-xl bg-zinc-900 overflow-hidden flex items-center justify-center border border-white/5 shrink-0">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <span className="text-sm font-black text-zinc-500">
                                                    {fullName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-white text-base truncate">{fullName}</h4>
                                                {((user?.verification_status && user?.verification_status !== 'unverified') || user?.is_official) && (
                                                    <VerificationBadge size={14} status={user?.verification_status} verificationStatus={user?.verification_status} isOfficial={user?.is_official} />
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                                                {userName} • {email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-white/5">
                                        <div className="text-xs font-medium text-zinc-500 shrink-0">
                                            {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: de }) : '-'}
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {updatingId === user?.id && (
                                                <Loader2 size={12} className="animate-spin text-cyan-500 shrink-0" />
                                            )}
                                            
                                            <select
                                                value={role}
                                                disabled={updatingId === user?.id || isSelf}
                                                onChange={(e) => {
                                                    setPendingRoleChange({
                                                        userId: user?.id,
                                                        previousRole: role,
                                                        newRole: e.target.value,
                                                        userName: fullName
                                                    });
                                                }}
                                                className={`bg-zinc-900 border border-white/10 text-white rounded-xl px-2.5 py-1 text-xs font-bold uppercase tracking-wider focus:border-cyan-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                                    role === 'admin' 
                                                        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' 
                                                        : 'text-zinc-400 bg-white/5 border-white/5'
                                                }`}
                                            >
                                                <option value="player" className="bg-[#111] text-white">Spieler</option>
                                                <option value="coach" className="bg-[#111] text-white">Trainer</option>
                                                <option value="scout" className="bg-[#111] text-white">Scout</option>
                                                <option value="admin" className="bg-[#111] text-amber-500 font-bold">Admin</option>
                                                <option value="system" className="bg-[#111] text-white">System</option>
                                            </select>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}

                        {/* Pagination Trigger */}
                        {hasMore && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={() => fetchUsers(page + 1, false)}
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

            {/* Custom Confirmation Modal */}
            {pendingRoleChange && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                        {/* Elegant background blur details */}
                        <div className="absolute -top-12 -left-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="p-6 relative z-10 space-y-6">
                            <div className="text-center space-y-4">
                                <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto border border-cyan-500/20">
                                    <ShieldAlert className="text-cyan-400" size={28} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black text-white tracking-tight">Rollenänderung bestätigen</h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed px-2">
                                        Möchtest du die Rolle von <span className="text-white font-bold">{pendingRoleChange.userName}</span> wirklich von <span className="text-zinc-500 font-bold uppercase">{getRoleLabel(pendingRoleChange.previousRole)}</span> auf <span className="text-cyan-400 font-black uppercase tracking-wider">{getRoleLabel(pendingRoleChange.newRole)}</span> ändern?
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setPendingRoleChange(null)}
                                    className="flex-1 py-3 px-4 rounded-xl border border-white/5 bg-white/5 font-bold text-xs uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition"
                                >
                                    Abbrechen
                                </button>
                                <button 
                                    onClick={async () => {
                                        const { userId, previousRole, newRole } = pendingRoleChange;
                                        setPendingRoleChange(null);
                                        await handleRoleChange(userId, previousRole, newRole);
                                    }}
                                    className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black font-black text-xs uppercase tracking-widest transition flex items-center justify-center gap-2"
                                >
                                    Bestätigen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserIntelligence;
