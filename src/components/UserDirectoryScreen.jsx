import React, { useState, useEffect, useCallback } from 'react';
import { 
    Search, User, Shield, ArrowLeft, Menu, 
    ShieldAlert, Flag, ExternalLink, Clock, 
    ShieldCheck, CheckCircle2, XCircle, Loader2, X, Trash2, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

const FILTERS = [
    { id: 'all', label: 'Alle' },
    { id: 'verified', label: 'Verifiziert' },
    { id: 'coach', label: 'Trainer' },
    { id: 'scout', label: 'Scouts' },
    { id: 'manager', label: 'Manager' },
];

const UserDirectoryScreen = ({ currentUserProfile, onUserClick, onBack, onMenuOpen }) => {
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, confirmText, confirmClass, onConfirm }

    const isAdmin = currentUserProfile?.role === 'admin';

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('players_master')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (searchQuery.trim() !== '') {
                query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
            }

            if (activeFilter === 'verified') {
                query = query.eq('is_verified', true);
            } else if (['coach', 'scout', 'manager'].includes(activeFilter)) {
                query = query.eq('role', activeFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users for directory:", error);
            addToast("Fehler beim Laden der Nutzer", "error");
        } finally {
            setLoading(false);
        }
    }, [searchQuery, activeFilter, addToast]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [fetchUsers]);

    const handleUserClick = (user) => {
        if (isAdmin) {
            setSelectedUser(user);
            setShowActionSheet(true);
        } else {
            onUserClick && onUserClick(user);
        }
    };

    const handleAdminAction = async (action) => {
        if (!selectedUser) return;
        let updates = {};

        const showConfirm = (opts) => setConfirmDialog(opts);

        if (action === 'revoke_verification') {
            showConfirm({
                title: 'Verifizierung entziehen?',
                message: `Möchtest du ${selectedUser.full_name} die Verifizierung wirklich entziehen?`,
                confirmText: 'Ja, entziehen',
                confirmClass: 'bg-amber-600',
                onConfirm: async () => {
                    updates = { is_verified: false, verification_status: 'unverified' };
                    await execAction(updates, 'Verifizierung entzogen');
                }
            });
        } else if (action === 'ban_account') {
            showConfirm({
                title: 'Account sperren?',
                message: `Möchtest du ${selectedUser.full_name} wirklich sperren? Der Account wird als "banned" markiert.`,
                confirmText: 'Ja, sperren',
                confirmClass: 'bg-red-600',
                onConfirm: async () => {
                    updates = { is_banned: true };
                    await execAction(updates, 'Account gesperrt');
                }
            });
        } else if (action === 'unban_account') {
            showConfirm({
                title: 'Account freischalten?',
                message: `Möchtest du ${selectedUser.full_name} wieder freischalten?`,
                confirmText: 'Ja, freischalten',
                confirmClass: 'bg-emerald-600',
                onConfirm: async () => {
                    updates = { is_banned: false };
                    await execAction(updates, 'Account freigeschaltet');
                }
            });
        } else if (action === 'delete_account') {
            showConfirm({
                title: '⚠️ Account löschen?',
                message: `ACHTUNG: Möchtest du den Account von ${selectedUser.full_name} UNWIDERRUFLICH löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
                confirmText: 'Ja, unwiderruflich löschen',
                confirmClass: 'bg-red-700',
                onConfirm: async () => {
                    setIsActionInProgress(true);
                    try {
                        const { error } = await supabase.from('players_master').delete().eq('id', selectedUser.id);
                        if (error) throw error;
                        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
                        addToast('Account unwiderruflich gelöscht', 'success');
                        setShowActionSheet(false);
                        setSelectedUser(null);
                    } catch (err) {
                        addToast('Löschen fehlgeschlagen', 'error');
                    } finally {
                        setIsActionInProgress(false);
                        setConfirmDialog(null);
                    }
                }
            });
        }
    };

    const execAction = async (updates, successMsg) => {
        setIsActionInProgress(true);
        try {
            const { error } = await supabase.from('players_master').update(updates).eq('id', selectedUser.id);
            if (error) throw error;
            addToast(successMsg, 'success');
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...updates } : u));
            setShowActionSheet(false);
            setSelectedUser(null);
        } catch (err) {
            addToast('Aktion fehlgeschlagen', 'error');
        } finally {
            setIsActionInProgress(false);
            setConfirmDialog(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background min-h-screen pt-16 sm:pt-20 pb-24">
            {/* Header Sticky Container */}
            <div className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-10 flex flex-col gap-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {currentUserProfile?.role === 'admin' && (
                            <button onClick={onMenuOpen} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition text-foreground">
                                <Menu size={20} />
                            </button>
                        )}
                        <h1 className="text-2xl font-bold text-foreground">Nutzer-Verzeichnis</h1>
                    </div>
                    <button onClick={onBack} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-muted-foreground">
                        <ArrowLeft size={20} />
                    </button>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input 
                        type="text" 
                        placeholder="Nutzer suchen (Name oder Username)..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-border rounded-2xl py-3 pl-10 pr-4 text-foreground focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                activeFilter === f.id
                                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                                    : 'bg-white/5 text-muted-foreground border-transparent hover:bg-white/10'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-3 mt-4">
                {loading && users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="text-cyan-500 animate-spin" size={32} />
                        <p className="text-muted-foreground animate-pulse">Suche Nutzer...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12 bg-white/5 rounded-3xl border border-dashed border-border flex flex-col items-center gap-3">
                        <Search size={40} className="text-muted-foreground/30" />
                        <p className="font-medium">Keine Nutzer gefunden.</p>
                    </div>
                ) : (
                    users.map(user => (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={user.id} 
                            onClick={() => handleUserClick(user)}
                            className={`bg-card border border-border rounded-3xl p-4 flex items-center gap-4 cursor-pointer hover:border-cyan-500/50 transition-all group ${user.is_banned ? 'opacity-50 grayscale' : ''}`}
                        >
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/5 shadow-inner">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                    ) : (
                                        <User size={28} className="text-muted-foreground" />
                                    )}
                                </div>
                                {user.is_verified && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-background rounded-full p-0.5">
                                        <CheckCircle2 size={16} className="text-cyan-400 fill-cyan-400/20" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-foreground truncate">{user.full_name || 'Unbekannt'}</h3>
                                    {user.is_banned && <ShieldAlert size={14} className="text-red-500" />}
                                </div>
                                <p className="text-xs font-bold text-muted-foreground truncate tracking-tight">@{user.username || '-'}</p>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border shadow-sm ${
                                    user.role === 'scout' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    user.role === 'coach' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    user.role === 'manager' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    'bg-white/5 text-muted-foreground border-white/5'
                                }`}>
                                    {user.role === 'scout' ? 'Scout' : 
                                     user.role === 'coach' ? 'Trainer' : 
                                     user.role === 'manager' ? 'Manager' : 'Spieler'}
                                </span>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Admin Action Sheet */}
            <AnimatePresence>
                {showActionSheet && selectedUser && (
                    <div className="fixed inset-0 z-[10005] flex items-end justify-center sm:items-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isActionInProgress && setShowActionSheet(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            {/* Drag Handle */}
                            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
                            
                            <div className="p-8 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-3xl bg-white/5 overflow-hidden border border-white/10 shadow-xl">
                                            {selectedUser.avatar_url ? (
                                                <img src={selectedUser.avatar_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <User size={32} className="text-zinc-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-foreground">{selectedUser.full_name}</h2>
                                            <p className="text-sm font-bold text-muted-foreground">@{selectedUser.username}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowActionSheet(false)}
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-muted-foreground"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                                        <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-1">Dabei seit</p>
                                        <div className="flex items-center gap-2 text-foreground font-bold">
                                            <Clock size={14} className="text-cyan-400" />
                                            {new Date(selectedUser.created_at).toLocaleDateString('de-DE')}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                                        <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-1">Rolle</p>
                                        <div className="flex items-center gap-2 text-foreground font-bold">
                                            <Shield size={14} className="text-amber-400" />
                                            {selectedUser.role || 'Spieler'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-4">Aktionen</p>
                                    
                                    <button 
                                        onClick={() => {
                                            onUserClick && onUserClick(selectedUser);
                                            setShowActionSheet(false);
                                        }}
                                        className="w-full flex items-center justify-between px-6 py-4 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-cyan-500/10 rounded-xl group-hover:scale-110 transition">
                                                <ExternalLink size={20} className="text-cyan-400" />
                                            </div>
                                            <span className="font-bold">Zum Profil</span>
                                        </div>
                                        <ArrowLeft className="rotate-180 text-muted-foreground" size={16} />
                                    </button>

                                    {isAdmin && (
                                        <div className="space-y-3 pt-2">
                                            <p className="text-[10px] uppercase tracking-widest font-black text-red-500/60 ml-4">Gefahrenzone (CRM)</p>
                                            
                                            <div className="grid grid-cols-1 gap-2">
                                                {selectedUser.is_verified && (
                                                    <button 
                                                        disabled={isActionInProgress}
                                                        onClick={() => handleAdminAction('revoke_verification')}
                                                        className="w-full flex items-center gap-3 p-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-2xl transition-all font-bold text-left disabled:opacity-50"
                                                    >
                                                        <ShieldAlert size={20} />
                                                        {isActionInProgress ? 'Verarbeite...' : 'Verifizierung entziehen'}
                                                    </button>
                                                )}

                                                {selectedUser.is_banned ? (
                                                    <button 
                                                        disabled={isActionInProgress}
                                                        onClick={() => handleAdminAction('unban_account')}
                                                        className="w-full flex items-center gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-2xl transition-all font-bold text-left disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 size={20} />
                                                        {isActionInProgress ? 'Verarbeite...' : 'Account freischalten'}
                                                    </button>
                                                ) : (
                                                    <button 
                                                        disabled={isActionInProgress}
                                                        onClick={() => handleAdminAction('ban_account')}
                                                        className="w-full flex items-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all font-bold text-left disabled:opacity-50"
                                                    >
                                                        <XCircle size={20} />
                                                        {isActionInProgress ? 'Verarbeite...' : 'Account sperren (Ban)'}
                                                    </button>
                                                )}

                                                <div className="h-px bg-white/5 my-2" />

                                                <button 
                                                    disabled={isActionInProgress}
                                                    onClick={() => handleAdminAction('delete_account')}
                                                    className="w-full flex items-center gap-3 p-4 bg-black/40 hover:bg-red-950/40 text-red-400 border border-red-500/20 rounded-2xl transition-all font-bold text-left disabled:opacity-50"
                                                >
                                                    <Trash2 size={20} />
                                                    {isActionInProgress ? 'Lösche...' : 'Account löschen'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 text-center space-y-4">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <AlertTriangle className="text-red-500" size={32} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-foreground">{confirmDialog.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{confirmDialog.message}</p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setConfirmDialog(null)}
                                        disabled={isActionInProgress}
                                        className="flex-1 py-3 px-4 rounded-xl border border-border font-bold text-sm hover:bg-white/5 transition disabled:opacity-50"
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        onClick={confirmDialog.onConfirm}
                                        disabled={isActionInProgress}
                                        className={`flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition active:scale-95 disabled:opacity-50 ${confirmDialog.confirmClass}`}
                                    >
                                        {isActionInProgress ? <Loader2 size={16} className="animate-spin mx-auto" /> : confirmDialog.confirmText}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserDirectoryScreen;
